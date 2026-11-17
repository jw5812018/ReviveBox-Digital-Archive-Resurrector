import { describe, expect, it } from 'vitest'
import { checkNewFeedUrl, isSampleFeedUrl } from '@shared/urls/feedUrls'

describe('isSampleFeedUrl', () => {
  it('flags reserved example domains', () => {
    expect(isSampleFeedUrl('https://example.org/feeds/dev.xml')).toBe(true)
    expect(isSampleFeedUrl('https://www.example.com/rss')).toBe(true)
    expect(isSampleFeedUrl('https://feeds.test/rss')).toBe(true)
  })
  it('does not flag real or look-alike domains', () => {
    expect(isSampleFeedUrl('https://hnrss.org/frontpage')).toBe(false)
    expect(isSampleFeedUrl('https://notexample.org/rss')).toBe(false)
    expect(isSampleFeedUrl(undefined)).toBe(false)
    expect(isSampleFeedUrl('not a url')).toBe(false)
  })
})

describe('checkNewFeedUrl', () => {
  it('accepts a new https feed', () => {
    expect(checkNewFeedUrl(' https://hnrss.org/frontpage ', [])).toEqual({
      ok: true,
      url: 'https://hnrss.org/frontpage',
    })
  })
  it('rejects http, other schemes and duplicates', () => {
    expect(checkNewFeedUrl('http://hnrss.org/frontpage', [])).toEqual({
      ok: false,
      message: 'Feed addresses must use https.',
    })
    expect(checkNewFeedUrl('javascript:alert(1)', []).ok).toBe(false)
    expect(checkNewFeedUrl('https://hnrss.org/frontpage', ['https://HNRSS.org/frontpage#top'])).toEqual({
      ok: false,
      message: 'You already follow this feed.',
    })
  })
})