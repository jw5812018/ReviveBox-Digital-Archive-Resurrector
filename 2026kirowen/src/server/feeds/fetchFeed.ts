import { request } from 'node:https'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { gunzipSync, inflateSync, brotliDecompressSync } from 'node:zlib'

/**
 * Server-side feed fetching with strict egress rules (guide section 7):
 * - HTTPS only, standard port, no credentials in the URL
 * - DNS results validated; the connection is pinned to a validated address
 *   (no validate-then-re-resolve gap)
 * - at most 3 redirects, each target re-validated
 * - 8s overall timeout, 2 MiB decompressed cap
 */

export const FEED_FETCH_TIMEOUT_MS = 8000
export const FEED_MAX_BYTES = 2 * 1024 * 1024
export const FEED_MAX_REDIRECTS = 3
/** Hard intake cap for compressed data (zip-bomb defense). */
const COMPRESSED_MAX_BYTES = 16 * 1024 * 1024

export type FetchErrorCode =
  | 'invalid-url'
  | 'blocked-target'
  | 'timeout'
  | 'too-large'
  | 'redirect-limit'
  | 'http-error'
  | 'network-error'

export type FeedFetchResult =
  | { ok: true; status: number; body: string; finalUrl: string }
  | { ok: false; code: FetchErrorCode; message: string; httpStatus?: number }

interface ValidatedTarget {
  url: URL
  address: string
  family: number
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true
  }
  const [a, b] = parts
  if (a === 0 || a === 10 || a === 127) return true // 0/8, 10/8, loopback
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  if (a === 169 && b === 254) return true // link-local
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16/12
  if (a === 192 && b === 168) return true
  if (a === 192 && b === 0) return true // 192.0.0/24 and 192.0.2/24
  if (a === 198 && (b === 18 || b === 19)) return true // benchmarking
  if (a === 198 && b === 51) return true // doc
  if (a === 203 && b === 0) return true // doc
  if (a >= 224) return true // multicast + reserved
  return false
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === '::' || lower === '::1') return true
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true // ULA
  if (/^fe[89ab]/.test(lower)) return true // link-local fe80::/10
  if (lower.startsWith('ff')) return true // multicast
  if (lower.startsWith('2001:db8')) return true // documentation
  const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateIpv4(mapped[1])
  return false
}

/** Rejects non-public IP literals and DNS results (SSRF guard). */
function isPublicAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 4) return !isPrivateIpv4(address)
  if (family === 6) return !isPrivateIpv6(address)
  return false
}

async function validateTarget(rawUrl: string): Promise<ValidatedTarget | { error: FetchErrorCode; message: string }> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { error: 'invalid-url', message: 'The URL is not well-formed.' }
  }
  if (url.protocol !== 'https:') {
    return { error: 'invalid-url', message: 'Only HTTPS URLs are allowed.' }
  }
  if (url.username !== '' || url.password !== '') {
    return { error: 'invalid-url', message: 'Credentials in URLs are not allowed.' }
  }
  if (url.port !== '' && url.port !== '443') {
    return { error: 'invalid-url', message: 'Only the standard HTTPS port is allowed.' }
  }
  const hostname = url.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return { error: 'blocked-target', message: 'Local targets are not allowed.' }
  }

  // Literal IP host: validate directly, no DNS needed.
  const literalFamily = isIP(hostname)
  if (literalFamily !== 0) {
    if (!isPublicAddress(hostname)) {
      return { error: 'blocked-target', message: 'This address is not a public target.' }
    }
    return { url, address: hostname, family: literalFamily }
  }

  // DNS resolution: every returned address must be public.
  let addresses
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true })
  } catch {
    return { error: 'network-error', message: 'DNS resolution failed.' }
  }
  if (addresses.length === 0) {
    return { error: 'network-error', message: 'DNS returned no addresses.' }
  }
  for (const entry of addresses) {
    if (!isPublicAddress(entry.address)) {
      return { error: 'blocked-target', message: 'This host resolves to a non-public address.' }
    }
  }
  const first = addresses[0]
  return { url, address: first.address, family: first.family }
}

function requestOnce(
  target: ValidatedTarget,
  deadline: number,
): Promise<
  | { ok: true; status: number; headers: Record<string, unknown>; body: Buffer }
  | { ok: false; code: FetchErrorCode; message: string; httpStatus?: number }
> {
  return new Promise((resolve) => {
    const req = request(
      {
        // Connect directly to the DNS-validated address (no re-resolution);
        // SNI and certificate verification still use the real hostname.
        host: target.address,
        servername: target.url.hostname,
        path: `${target.url.pathname}${target.url.search}`,
        method: 'GET',
        headers: {
          Host: target.url.host,
          Accept:
            'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.1',
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent': 'EchoShelf/0.1 (personal archive; feed fetch)',
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        let received = 0
        res.on('data', (chunk: Buffer) => {
          received += chunk.length
          if (received > COMPRESSED_MAX_BYTES) {
            req.destroy()
            resolve({ ok: false, code: 'too-large', message: 'Response exceeds the size limit.' })
            return
          }
          chunks.push(chunk)
        })
        res.on('end', () => {
          resolve({
            ok: true,
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks),
          })
        })
        res.on('error', () => {
          resolve({ ok: false, code: 'network-error', message: 'Connection failed while reading.' })
        })
      },
    )
    const remaining = deadline - Date.now()
    req.setTimeout(Math.max(1, remaining), () => {
      req.destroy()
      resolve({ ok: false, code: 'timeout', message: 'Request timed out.' })
    })
    req.on('error', (err) => {
      resolve({
        ok: false,
        code: 'network-error',
        message: err.message || 'Connection failed.',
      })
    })
    req.end()
  })
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

function decompress(body: Buffer, encoding: string | undefined): Buffer | null {
  try {
    switch ((encoding ?? '').toLowerCase()) {
      case 'gzip':
        return gunzipSync(body)
      case 'deflate':
        return inflateSync(body)
      case 'br':
        return brotliDecompressSync(body)
      case '':
      case 'identity':
        return body
      default:
        return null
    }
  } catch {
    return null
  }
}

/** Fetches a feed URL with full validation, redirect and size rules. */
export async function fetchFeed(rawUrl: string): Promise<FeedFetchResult> {
  const deadline = Date.now() + FEED_FETCH_TIMEOUT_MS
  let current = rawUrl

  for (let redirect = 0; redirect <= FEED_MAX_REDIRECTS; redirect += 1) {
    const target = await validateTarget(current)
    if ('error' in target) {
      return { ok: false, code: target.error, message: target.message }
    }
    const response = await requestOnce(target, deadline)
    if (!response.ok) {
      return response
    }
    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.location
      if (typeof location !== 'string' || location.length === 0) {
        return { ok: false, code: 'http-error', message: 'Redirect without a location.', httpStatus: response.status }
      }
      if (redirect === FEED_MAX_REDIRECTS) {
        return { ok: false, code: 'redirect-limit', message: 'Too many redirects (limit: 3).' }
      }
      current = new URL(location, target.url).toString()
      continue
    }
    if (response.status < 200 || response.status >= 300) {
      return {
        ok: false,
        code: 'http-error',
        message: `The server returned HTTP ${response.status}.`,
        httpStatus: response.status,
      }
    }
    const encoding = response.headers['content-encoding']
    const body = decompress(
      response.body,
      typeof encoding === 'string' ? encoding : undefined,
    )
    if (body == null) {
      return { ok: false, code: 'network-error', message: 'Unsupported content encoding.' }
    }
    if (body.length > FEED_MAX_BYTES) {
      return { ok: false, code: 'too-large', message: 'Response exceeds the 2 MiB limit.' }
    }
    return {
      ok: true,
      status: response.status,
      body: body.toString('utf8'),
      finalUrl: target.url.toString(),
    }
  }
  return { ok: false, code: 'redirect-limit', message: 'Too many redirects (limit: 3).' }
}