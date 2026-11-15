import { describe, expect, it } from 'vitest'
import { parseBookmarkHtml, parseSavedDate } from '@shared/import/bookmarkParser'
import { ImportErrorType } from '@shared/models/types'

const SAMPLE = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><H3>Research</H3>
  <DL><p>
    <DT><A HREF="https://example.org/a?utm_source=x" ADD_DATE="1718000000" TAGS="web,tools">Valid bookmark</A>
    <DT><A HREF="https://example.org/b" ADD_DATE="not-a-date">Bad date bookmark</A>
  </DL><p>
  <DT><A HREF="javascript:alert(1)">Evil</A>
  <DT><A HREF="https://example.org/c"></A>
</DL><p>`

describe('parseBookmarkHtml', () => {
  const outcomes = parseBookmarkHtml(SAMPLE)
  const okRecords = outcomes.filter((o) => o.ok)
  const invalid = outcomes.filter((o) => !o.ok)

  it('extracts valid bookmarks with title, url, tags', () => {
    expect(okRecords).toHaveLength(2)
    const first = okRecords[0]
    if (first.ok) {
      expect(first.record.title).toBe('Valid bookmark')
      expect(first.record.url).toBe('https://example.org/a?utm_source=x')
      expect(first.record.tags).toContain('web')
      expect(first.record.tags).toContain('tools')
    }
  })

  it('adds the direct parent folder as a tag', () => {
    const first = okRecords[0]
    if (first.ok) expect(first.record.tags).toContain('Research')
  })

  it('parses ADD_DATE unix timestamps to UTC ISO', () => {
    const first = okRecords[0]
    if (first.ok) expect(first.record.savedAt).toBe('2024-06-10T06:13:20.000Z')
  })

  it('returns null savedAt for unparseable dates (fallback is caller-side)', () => {
    const second = okRecords[1]
    if (second.ok) expect(second.record.savedAt).toBeNull()
  })

  it('rejects dangerous protocols with InvalidUrlProtocol', () => {
    expect(
      invalid.some((o) => !o.ok && o.error === ImportErrorType.InvalidUrlProtocol),
    ).toBe(true)
  })

  it('rejects empty titles with MissingTitle', () => {
    expect(invalid.some((o) => !o.ok && o.error === ImportErrorType.MissingTitle)).toBe(true)
  })
})

describe('parseSavedDate', () => {
  it('handles RFC 3339 and unix seconds', () => {
    expect(parseSavedDate('2024-06-10T06:13:20Z')).toBe('2024-06-10T06:13:20.000Z')
    expect(parseSavedDate('1718000000')).toBe('2024-06-10T06:13:20.000Z')
  })
  it('returns null for missing/garbage input', () => {
    expect(parseSavedDate(null)).toBeNull()
    expect(parseSavedDate('')).toBeNull()
    expect(parseSavedDate('yesterday')).toBeNull()
  })
})