import { describe, expect, it } from 'vitest'
import { parseFeed, parseFeedDate } from '@shared/import/feedParser'
import { ImportErrorType } from '@shared/models/types'

const RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Test Feed</title>
  <item>
    <title>Article one</title>
    <link>https://example.org/one</link>
    <description>&lt;p&gt;Hello &lt;b&gt;world&lt;/b&gt;&lt;/p&gt;</description>
    <pubDate>Mon, 02 Jan 2023 04:05:06 GMT</pubDate>
  </item>
  <item>
    <title>Broken link</title>
    <link>ftp://example.org/two</link>
    <pubDate>Mon, 02 Jan 2023 04:05:06 GMT</pubDate>
  </item>
</channel></rss>`

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <entry>
    <title>Atom entry</title>
    <link rel="alternate" href="https://example.org/atom-entry"/>
    <summary>Summary text</summary>
    <published>2023-05-04T03:02:01Z</published>
  </entry>
</feed>`

describe('parseFeed (RSS 2.0)', () => {
  const result = parseFeed(RSS)
  it('parses valid items and reports invalid ones per record', () => {
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const valid = result.outcomes.filter((o) => o.ok)
    const invalid = result.outcomes.filter((o) => !o.ok)
    expect(valid).toHaveLength(1)
    expect(invalid).toHaveLength(1)
    if (!invalid[0].ok) expect(invalid[0].error).toBe(ImportErrorType.InvalidUrlProtocol)
  })

  it('converts RFC 822 pubDate to UTC ISO', () => {
    if (!result.ok) return
    const first = result.outcomes[0]
    if (first.ok) expect(first.record.savedAt).toBe('2023-01-02T04:05:06.000Z')
  })

  it('strips HTML from bodies, keeping displayable text only', () => {
    if (!result.ok) return
    const first = result.outcomes[0]
    if (first.ok) {
      expect(first.record.body).toBe('Hello world')
      expect(first.record.body).not.toContain('<')
    }
  })
})

describe('parseFeed (Atom)', () => {
  it('parses entries with alternate link and published date', () => {
    const result = parseFeed(ATOM)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const first = result.outcomes[0]
    if (first.ok) {
      expect(first.record.title).toBe('Atom entry')
      expect(first.record.url).toBe('https://example.org/atom-entry')
      expect(first.record.savedAt).toBe('2023-05-04T03:02:01.000Z')
      expect(first.record.body).toBe('Summary text')
    }
  })
})

describe('parseFeed defenses', () => {
  it('rejects DOCTYPE (XXE)', () => {
    const result = parseFeed('<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss version="2.0"><channel/></rss>')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe(ImportErrorType.SecurityViolation)
  })
  it('rejects non-feed XML', () => {
    const result = parseFeed('<html><body>not a feed</body></html>')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe(ImportErrorType.MalformedXml)
  })
})

describe('parseFeedDate', () => {
  it('handles RFC 3339, ISO 8601, RFC 822 and unix seconds', () => {
    expect(parseFeedDate('2023-01-02T04:05:06Z')).toBe('2023-01-02T04:05:06.000Z')
    expect(parseFeedDate('2023-01-02T04:05:06+00:00')).toBe('2023-01-02T04:05:06.000Z')
    expect(parseFeedDate('Mon, 02 Jan 2023 04:05:06 GMT')).toBe('2023-01-02T04:05:06.000Z')
    expect(parseFeedDate('1672632306')).toBe('2023-01-02T04:05:06.000Z')
  })
})