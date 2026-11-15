import type { Item } from '@shared/models/types'

/**
 * URL-based dedup (R5 AC6/AC8): an incoming record duplicates an existing
 * item when their normalized canonical URLs match.
 */
export function findDuplicateByUrl(
  items: Item[],
  canonicalUrl: string,
): Item | undefined {
  return items.find((item) => item.canonicalUrl === canonicalUrl)
}

/**
 * Content-based dedup for notes without URLs (R5 AC9): matches on the
 * SHA-256 fingerprint of normalized title + body.
 */
export function findDuplicateByFingerprint(
  items: Item[],
  fingerprint: string,
): Item | undefined {
  return items.find((item) => item.noteFingerprint === fingerprint)
}