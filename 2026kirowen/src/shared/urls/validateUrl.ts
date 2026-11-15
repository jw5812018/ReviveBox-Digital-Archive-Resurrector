import { ImportErrorType } from '@shared/models/types'

export const URL_MAX_LENGTH = 2048

/** Protocols explicitly rejected (R2 AC9). */
export const BLOCKED_PROTOCOLS = [
  'javascript:',
  'data:',
  'file:',
  'ftp:',
  'mailto:',
  'tel:',
  'ssh:',
] as const

export type UrlValidation =
  | { ok: true; url: string }
  | { ok: false; error: ImportErrorType }

/**
 * Validates a content URL: required, length-bounded, http/https only
 * (R2 AC3, R2 AC9, R4 AC4-6).
 */
export function validateUrl(raw: string | undefined | null): UrlValidation {
  if (raw == null) return { ok: false, error: ImportErrorType.MissingUrl }
  const url = raw.trim()
  if (url.length === 0) return { ok: false, error: ImportErrorType.MissingUrl }
  if (url.length > URL_MAX_LENGTH) {
    return { ok: false, error: ImportErrorType.UrlTooLong }
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, error: ImportErrorType.InvalidUrlProtocol }
  }
  const protocol = parsed.protocol.toLowerCase()
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { ok: false, error: ImportErrorType.InvalidUrlProtocol }
  }
  return { ok: true, url }
}