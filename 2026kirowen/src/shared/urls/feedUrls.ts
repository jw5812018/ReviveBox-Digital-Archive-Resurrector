import { validateUrl } from './validateUrl'
import { normalizeUrl } from './normalizeUrl'

/** Reserved example domains (RFC 2606 / RFC 6761) used by the sample files. */
const SAMPLE_DOMAINS = ['example.org', 'example.com', 'example.net']
const SAMPLE_SUFFIXES = ['.example', '.test', '.invalid', '.localhost']

/**
 * True for feeds on reserved example domains. They are never presented as
 * fetchable sources (Requirement 9 AC17, guide section 3.3).
 */
export function isSampleFeedUrl(url: string | undefined): boolean {
  if (!url) return false
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return false
  }
  return (
    SAMPLE_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`)) ||
    SAMPLE_SUFFIXES.some((suffix) => host.endsWith(suffix))
  )
}

export type FeedUrlCheck = { ok: true; url: string } | { ok: false; message: string }

/**
 * Validates a feed URL typed by the user before a subscription is created
 * (Requirement 9 AC16): https only, length-bounded, not already subscribed.
 */
export function checkNewFeedUrl(raw: string, existingFeedUrls: string[]): FeedUrlCheck {
  const check = validateUrl(raw)
  if (!check.ok) {
    return { ok: false, message: 'Enter a full feed address starting with https://.' }
  }
  if (!check.url.toLowerCase().startsWith('https://')) {
    return { ok: false, message: 'Feed addresses must use https.' }
  }
  const normalized = normalizeUrl(check.url)
  const duplicate = existingFeedUrls.some(
    (existing) => normalizeUrl(existing) === normalized,
  )
  if (duplicate) {
    return { ok: false, message: 'You already follow this feed.' }
  }
  return { ok: true, url: check.url }
}