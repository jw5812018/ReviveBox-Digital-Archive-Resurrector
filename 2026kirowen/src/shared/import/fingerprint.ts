/**
 * Content fingerprint for notes without URLs (R5 AC9).
 * SHA-256 over NFC-normalized, newline-unified, trimmed title + body.
 * Uses Web Crypto (available in browsers and Node.js >= 20).
 */
export async function computeNoteFingerprint(
  title: string,
  body: string,
): Promise<string> {
  const normalize = (s: string): string =>
    s.replace(/\r\n/g, '\n').normalize('NFC').trim()
  const payload = `${normalize(title)}\n\n${normalize(body)}`
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(payload),
  )
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}