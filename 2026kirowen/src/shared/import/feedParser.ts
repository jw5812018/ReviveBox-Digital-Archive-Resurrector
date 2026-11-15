import { ImportErrorType } from '@shared/models/types'
import { validateUrl } from '@shared/urls/validateUrl'
import { validateTitle, BODY_MAX_LENGTH } from '@shared/import/limits'

/** One article extracted from an RSS 2.0 or Atom document. */
export interface ParsedArticle {
  title: string
  url: string
  /** Summary or body text, truncated at BODY_MAX_LENGTH. */
  body?: string
  /** ISO UTC timestamp, or null when absent/unparseable. */
  savedAt: string | null
  /** True when the body was cut to BODY_MAX_LENGTH (ContentTruncated). */
  truncated: boolean
}

export type FeedParseOutcome =
  | { ok: true; record: ParsedArticle }
  | { ok: false; error: ImportErrorType; rawTitle: string; rawUrl?: string }

export type FeedParseResult =
  | { ok: true; outcomes: FeedParseOutcome[] }
  | { ok: false; error: ImportErrorType.MalformedXml | ImportErrorType.SecurityViolation }

/**
 * Date priority (R3 AC5): RFC 3339, then ISO 8601, then UNIX seconds,
 * normalized to UTC. Date.parse additionally covers RSS's RFC 822 pubDate.
 * Returns null when nothing parses (caller applies import-time fallback).
 */
export function parseFeedDate(value: string | null): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  if (/^\d+$/.test(trimmed)) {
    const date = new Date(Number(trimmed) * 1000)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * Extracts displayable text from feed bodies (guide section 7): source HTML
 * is parsed but never rendered — only its text content is kept. DOMParser
 * never executes scripts in parsed documents.
 */
function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const raw = doc.documentElement?.textContent ?? doc.body?.textContent ?? ''
  return raw.replace(/\s+/g, ' ').trim()
}

function truncateBody(text: string | null): { body?: string; truncated: boolean } {
  if (text == null) return { truncated: false }
  const plain = text.includes('<') ? htmlToText(text) : text.trim()
  if (plain.length === 0) return { truncated: false }
  if (plain.length > BODY_MAX_LENGTH) {
    return { body: plain.slice(0, BODY_MAX_LENGTH), truncated: true }
  }
  return { body: plain, truncated: false }
}

function toOutcome(
  rawTitle: string,
  rawUrl: string,
  rawBody: string | null,
  rawDate: string | null,
): FeedParseOutcome {
  const titleCheck = validateTitle(rawTitle)
  if (!titleCheck.ok) {
    return { ok: false, error: titleCheck.error, rawTitle, rawUrl }
  }
  const urlCheck = validateUrl(rawUrl)
  if (!urlCheck.ok) {
    return { ok: false, error: urlCheck.error, rawTitle, rawUrl }
  }
  const { body, truncated } = truncateBody(rawBody)
  const savedAt = parseFeedDate(rawDate)
  return {
    ok: true,
    record: { title: rawTitle.trim(), url: urlCheck.url, body, savedAt, truncated },
  }
}

/**
 * Parses RSS 2.0 or Atom XML into article records (R3 AC3-7).
 * DOCTYPE declarations are rejected (XXE defense); DOMParser never
 * resolves external entities. Body text is extracted as plain text only.
 */
export function parseFeed(xml: string): FeedParseResult {
  if (/<!doctype/i.test(xml)) {
    return { ok: false, error: ImportErrorType.SecurityViolation }
  }
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  if (doc.querySelector('parsererror')) {
    return { ok: false, error: ImportErrorType.MalformedXml }
  }

  const outcomes: FeedParseOutcome[] = []
  const rssItems = Array.from(doc.querySelectorAll('channel > item'))
  if (rssItems.length > 0) {
    for (const item of rssItems) {
      const text = (sel: string): string | null =>
        item.querySelector(sel)?.textContent ?? null
      // content:encoded is namespaced; getElementsByTagName handles the colon
      // form in browsers, happy-dom and linkedom (CSS selectors do not).
      const contentEncoded =
        item.getElementsByTagName('content:encoded')[0]?.textContent ?? null
      outcomes.push(
        toOutcome(
          (text('title') ?? '').trim(),
          (text('link') ?? '').trim(),
          text('description') ?? contentEncoded,
          text('pubDate') ?? text('date'),
        ),
      )
    }
    return { ok: true, outcomes }
  }

  const atomEntries = Array.from(doc.querySelectorAll('feed > entry'))
  for (const entry of atomEntries) {
    const text = (sel: string): string | null =>
      entry.querySelector(sel)?.textContent ?? null
    const link =
      entry.querySelector('link[rel="alternate"]')?.getAttribute('href') ??
      entry.querySelector('link')?.getAttribute('href') ??
      ''
    outcomes.push(
      toOutcome(
        (text('title') ?? '').trim(),
        link.trim(),
        text('summary') ?? text('content'),
        text('published') ?? text('updated'),
      ),
    )
  }
  if (outcomes.length === 0) {
    return { ok: false, error: ImportErrorType.MalformedXml }
  }
  return { ok: true, outcomes }
}