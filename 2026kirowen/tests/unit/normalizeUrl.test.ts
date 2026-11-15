import { describe, expect, it } from 'vitest'
import { normalizeUrl } from '@shared/urls/normalizeUrl'

describe('normalizeUrl', () => {
  it('lowercases scheme and host', () => {
    expect(normalizeUrl('HTTPS://Example.ORG/Path')).toBe('https://example.org/Path')
  })

  it('removes default ports only', () => {
    expect(normalizeUrl('https://example.org:443/a')).toBe('https://example.org/a')
    expect(normalizeUrl('http://example.org:80/a')).toBe('http://example.org/a')
    expect(normalizeUrl('https://example.org:8443/a')).toBe('https://example.org:8443/a')
  })

  it('removes fragments', () => {
    expect(normalizeUrl('https://example.org/a#section')).toBe('https://example.org/a')
  })

  it('removes tracking params but keeps meaningful ones', () => {
    expect(
      normalizeUrl('https://example.org/a?utm_source=x&id=42&fbclid=abc&gclid=def'),
    ).toBe('https://example.org/a?id=42')
  })

  it('keeps duplicate non-tracking params', () => {
    expect(normalizeUrl('https://example.org/a?tag=x&tag=y')).toBe(
      'https://example.org/a?tag=x&tag=y',
    )
  })

  it('does NOT merge http with https, www with apex, or trailing slashes', () => {
    expect(normalizeUrl('http://example.org/a')).not.toBe(normalizeUrl('https://example.org/a'))
    expect(normalizeUrl('https://www.example.org/a')).toBe('https://www.example.org/a')
    expect(normalizeUrl('https://example.org/a/')).toBe('https://example.org/a/')
  })

  it('keeps path case', () => {
    expect(normalizeUrl('https://example.org/CamelCase/Path')).toBe(
      'https://example.org/CamelCase/Path',
    )
  })

  it('rejects non-http(s) protocols and garbage', () => {
    expect(normalizeUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeUrl('data:text/html,x')).toBeNull()
    expect(normalizeUrl('file:///etc/passwd')).toBeNull()
    expect(normalizeUrl('not a url')).toBeNull()
  })

  it('is idempotent', () => {
    const url = 'https://EXAMPLE.org:443/a/?utm_source=x&id=1#frag'
    const once = normalizeUrl(url)
    expect(once).not.toBeNull()
    expect(normalizeUrl(once!)).toBe(once)
  })
})