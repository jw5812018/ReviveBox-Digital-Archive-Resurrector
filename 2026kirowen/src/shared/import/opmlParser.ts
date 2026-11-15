import { ImportErrorType } from '@shared/models/types'
import { validateTitle } from '@shared/import/limits'

/** One feed subscription extracted from an OPML file. */
export interface ParsedFeed {
  feedUrl: string
  title: string
}

export type OpmlParseOutcome =
  | { ok: true; record: ParsedFeed }
  | { ok: false; error: ImportErrorType; rawTitle: string; rawUrl?: string }

export type OpmlParseResult =
  | { ok: true; outcomes: OpmlParseOutcome[] }
  | { ok: false; error: ImportErrorType.MalformedXml | ImportErrorType.SecurityViolation }

/**
 * Parses OPML subscription lists (R3 AC1-2). DOMParser does not resolve
 * external entities or DTDs; files declaring a DOCTYPE are rejected
 * outright as a defensive measure.
 */
export function parseOpml(xml: string): OpmlParseResult {
  if (/<!doctype/i.test(xml)) {
    return { ok: false, error: ImportErrorType.SecurityViolation }
  }
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  if (doc.querySelector('parsererror')) {
    return { ok: false, error: ImportErrorType.MalformedXml }
  }
  const outcomes: OpmlParseOutcome[] = []
  for (const outline of Array.from(doc.querySelectorAll('outline[xmlUrl]'))) {
    const rawUrl = outline.getAttribute('xmlUrl') ?? ''
    const rawTitle = (
      outline.getAttribute('title') ??
      outline.getAttribute('text') ??
      ''
    ).trim()

    const titleCheck = validateTitle(rawTitle)
    if (!titleCheck.ok) {
      outcomes.push({ ok: false, error: titleCheck.error, rawTitle, rawUrl })
      continue
    }
    if (rawUrl.trim().length === 0) {
      outcomes.push({
        ok: false,
        error: ImportErrorType.MissingUrl,
        rawTitle,
        rawUrl,
      })
      continue
    }
    outcomes.push({ ok: true, record: { feedUrl: rawUrl.trim(), title: rawTitle } })
  }
  return { ok: true, outcomes }
}