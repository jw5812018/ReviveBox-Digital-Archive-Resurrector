import { describe, expect, it } from 'vitest'
import { parseOpml } from '@shared/import/opmlParser'
import { ImportErrorType } from '@shared/models/types'

describe('parseOpml', () => {
  it('extracts feed subscriptions with title and xmlUrl', () => {
    const xml = `<?xml version="1.0"?>
    <opml version="2.0"><body>
      <outline text="Tech">
        <outline text="Dev Blog" title="Dev Blog" type="rss" xmlUrl="https://example.org/dev.xml"/>
        <outline text="News" title="News" type="rss" xmlUrl="https://example.org/news.xml"/>
      </outline>
    </body></opml>`
    const result = parseOpml(xml)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const valid = result.outcomes.filter((o) => o.ok)
      expect(valid).toHaveLength(2)
      if (valid[0].ok) {
        expect(valid[0].record.title).toBe('Dev Blog')
        expect(valid[0].record.feedUrl).toBe('https://example.org/dev.xml')
      }
    }
  })

  it('marks outlines missing a title as invalid', () => {
    const xml = `<opml version="2.0"><body><outline type="rss" xmlUrl="https://example.org/x.xml"/></body></opml>`
    const result = parseOpml(xml)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.outcomes[0].ok).toBe(false)
      if (!result.outcomes[0].ok) {
        expect(result.outcomes[0].error).toBe(ImportErrorType.MissingTitle)
      }
    }
  })

  it('rejects DOCTYPE declarations (XXE defense)', () => {
    const xml = `<!DOCTYPE opml [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><opml version="2.0"><body/></opml>`
    const result = parseOpml(xml)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe(ImportErrorType.SecurityViolation)
  })

  it('rejects malformed XML', () => {
    const result = parseOpml('<opml><body><unclosed>')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe(ImportErrorType.MalformedXml)
  })
})