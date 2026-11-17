import { ImportErrorType } from '@shared/models/types'
import { validateUrl } from '@shared/urls/validateUrl'
import { validateTitle } from '@shared/import/limits'

/** One bookmark record extracted from a Netscape bookmark file. */
export interface ParsedBookmark {
  title: string
  url: string
  /** Folder path from the file root, e.g. ["Dev", "Docs"]. */
  folderPath: string[]
  /** ISO UTC timestamp from ADD_DATE / LAST_MODIFIED, or null when absent/invalid. */
  savedAt: string | null
  /** TAGS attribute entries plus the direct parent folder (R2 AC5). */
  tags: string[]
}

export type BookmarkParseOutcome =
  | { ok: true; record: ParsedBookmark }
  | {
      ok: false
      error: ImportErrorType
      rawTitle: string
      rawUrl?: string
      /** Kept for invalid records too, so folder counts include them (R2 AC8). */
      folderPath: string[]
    }

/**
 * Parses a numeric UNIX-seconds string or an RFC 3339 date string into an
 * ISO UTC timestamp. Returns null when neither parses (R2 AC4).
 */
export function parseSavedDate(value: string | null): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  let date: Date
  if (/^\d+$/.test(trimmed)) {
    date = new Date(Number(trimmed) * 1000)
  } else {
    date = new Date(trimmed)
  }
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * Parses Netscape Bookmark Exchange Format HTML (R2 AC1).
 * H3 elements are folders, A elements are bookmarks. A 30-second budget
 * applies to the overall import pipeline; DOMParser itself is synchronous.
 */
export function parseBookmarkHtml(html: string): BookmarkParseOutcome[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const outcomes: BookmarkParseOutcome[] = []
  for (const anchor of Array.from(doc.querySelectorAll('a'))) {
    outcomes.push(toOutcome(anchor, folderPathFor(anchor)))
  }
  return outcomes
}

/**
 * Computes the folder path of a bookmark by walking up the DOM:
 * a DL nested inside a DT belongs to the folder named by that DT's H3.
 */
function folderPathFor(anchor: Element): string[] {
  const path: string[] = []
  let dl = anchor.closest('dl')
  while (dl != null) {
    const ownerDt = dl.parentElement?.tagName === 'DT' ? dl.parentElement : null
    const heading = ownerDt
      ? Array.from(ownerDt.children).find((el) => el.tagName === 'H3')
      : undefined
    const name = heading?.textContent?.trim()
    if (name) path.unshift(name)
    dl = dl.parentElement?.closest('dl') ?? null
  }
  return path
}

function toOutcome(anchor: Element, folderPath: string[]): BookmarkParseOutcome {
  const rawUrl = anchor.getAttribute('href') ?? ''
  const rawTitle = (anchor.textContent ?? '').trim()

  const titleCheck = validateTitle(rawTitle)
  if (!titleCheck.ok) {
    return { ok: false, error: titleCheck.error, rawTitle, rawUrl, folderPath }
  }
  const urlCheck = validateUrl(rawUrl)
  if (!urlCheck.ok) {
    return { ok: false, error: urlCheck.error, rawTitle, rawUrl, folderPath }
  }

  const tagsAttr = anchor.getAttribute('tags') ?? ''
  const tags = tagsAttr
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
  const parentFolder = folderPath[folderPath.length - 1]
  if (parentFolder && !tags.includes(parentFolder)) {
    tags.push(parentFolder)
  }

  const savedAt =
    parseSavedDate(anchor.getAttribute('add_date')) ??
    parseSavedDate(anchor.getAttribute('last_modified'))

  return {
    ok: true,
    record: { title: rawTitle, url: urlCheck.url, folderPath, savedAt, tags },
  }
}