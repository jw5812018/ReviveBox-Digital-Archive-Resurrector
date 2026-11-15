/**
 * URL normalization for deduplication (guide section 4.2).
 *
 * Rules applied:
 * - lowercase scheme and host (standard normalization)
 * - remove default ports (80 for http, 443 for https)
 * - remove the fragment
 * - remove tracking params: utm_*, fbclid, gclid
 *
 * Rules intentionally NOT applied (guide 4.2):
 * - http and https are NOT merged
 * - different www subdomains are NOT merged
 * - trailing slashes are preserved
 * - path case and meaningful query params/duplicates are preserved
 *
 * Property: normalizeUrl(normalizeUrl(u)) === normalizeUrl(u) (idempotent).
 */
export function normalizeUrl(raw: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(raw.trim())
  } catch {
    return null
  }
  const protocol = parsed.protocol.toLowerCase()
  if (protocol !== 'http:' && protocol !== 'https:') return null

  parsed.protocol = protocol
  parsed.hostname = parsed.hostname.toLowerCase()
  if (
    (protocol === 'http:' && parsed.port === '80') ||
    (protocol === 'https:' && parsed.port === '443')
  ) {
    parsed.port = ''
  }
  parsed.hash = ''

  if (parsed.search) {
    const kept = new URLSearchParams()
    for (const [key, value] of parsed.searchParams) {
      const lowerKey = key.toLowerCase()
      if (
        lowerKey.startsWith('utm_') ||
        lowerKey === 'fbclid' ||
        lowerKey === 'gclid'
      ) {
        continue
      }
      kept.append(key, value)
    }
    const query = kept.toString()
    parsed.search = query ? `?${query}` : ''
  }

  return parsed.toString()
}