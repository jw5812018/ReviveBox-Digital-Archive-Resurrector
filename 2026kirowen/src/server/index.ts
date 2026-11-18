import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express, { type NextFunction, type Request, type Response } from 'express'
import { DOMParser } from 'linkedom'
import { fetchFeed, FEED_MAX_REDIRECTS } from '@server/feeds/fetchFeed.ts'
import { createRateLimiter } from '@server/feeds/rateLimit.ts'
import { parseFeed } from '@shared/import/feedParser.ts'
import { FEED_MAX_ITEMS } from './feeds/limits.ts'

// Shared parsers expect a DOM implementation; linkedom provides one in Node.
// DTDs are rejected by parseFeed before parsing, and linkedom does not
// resolve external entities.
const globalScope = globalThis as { DOMParser?: unknown }
if (typeof globalScope.DOMParser === 'undefined') {
  globalScope.DOMParser = DOMParser
}

const PORT = Number(process.env.PORT ?? 3001)
/** Exact origins allowed to call the API cross-origin (Requirement 9 AC11). */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0)
/** Proxy hops in front of the server; 0 locally, 1 behind a hosting proxy. */
const TRUST_PROXY_HOPS = Number(process.env.TRUST_PROXY_HOPS ?? 0)
/** Feed fetches per client IP per 10 minutes (Requirement 9 AC12). */
const RATE_LIMIT = Number(process.env.FEED_RATE_LIMIT ?? 20)
const RATE_WINDOW_MS = 10 * 60 * 1000
/** Server-side concurrency limit for outbound fetches (Requirement 9 AC8). */
const MAX_CONCURRENT_FETCHES = 5
/** Requests allowed to wait for a slot before the server answers 503. */
const MAX_QUEUED_FETCHES = 20

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', TRUST_PROXY_HOPS)
const limiter = createRateLimiter(RATE_LIMIT, RATE_WINDOW_MS)

function isSameOrigin(req: Request, origin: string): boolean {
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

// CORS before body parsing, so preflights and error responses carry headers.
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin
  res.setHeader('Vary', 'Origin')
  const allowed = origin != null && ALLOWED_ORIGINS.includes(origin)
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Max-Age', '600')
  }
  if (req.method === 'OPTIONS') {
    res.status(allowed ? 204 : 403).end()
    return
  }
  if (origin != null && !allowed && !isSameOrigin(req, origin)) {
    res.status(403).json({ ok: false, code: 'origin-not-allowed', message: 'This site may not use the feed service.' })
    return
  }
  next()
})

// Debug: log all requests
app.use((req, res, next) => {
  console.log('[DEBUG] Request: ' + req.method + ' ' + req.originalUrl);
  next();
})

app.use(express.json({ limit: '4kb' }))

let inFlight = 0
const queue: Array<() => void> = []

/** Runs fn within the concurrency limit; returns null when the queue is full. */
async function withFetchSlot<T>(fn: () => Promise<T>): Promise<T | null> {
  if (inFlight >= MAX_CONCURRENT_FETCHES) {
    if (queue.length >= MAX_QUEUED_FETCHES) return null
    await new Promise<void>((resolve) => queue.push(resolve))
  }
  inFlight += 1
  try {
    return await fn()
  } finally {
    inFlight -= 1
    queue.shift()?.()
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/feeds/fetch', async (req, res) => {
  const url = (req.body as { url?: unknown } | undefined)?.url
  if (typeof url !== 'string' || url.length === 0 || url.length > 2048) {
    res.status(400).json({ ok: false, code: 'invalid-url', message: 'A valid url string is required.' })
    return
  }
  // Never log the URL: query strings may contain private tokens.

  const decision = limiter.take(req.ip ?? 'unknown')
  if (!decision.allowed) {
    res.setHeader('Retry-After', String(decision.retryAfterSeconds))
    res.status(429).json({
      ok: false,
      code: 'rate-limited',
      message: 'Too many refreshes from this network.',
      retryAfterSeconds: decision.retryAfterSeconds,
    })
    return
  }

  const result = await withFetchSlot(() => fetchFeed(url))
  if (result == null) {
    res.status(503).json({ ok: false, code: 'busy', message: 'The feed service is busy. Try again shortly.' })
    return
  }
  if (!result.ok) {
    const status = result.code === 'blocked-target' || result.code === 'invalid-url' ? 400 : 502
    res.status(status).json({ ok: false, code: result.code, message: result.message, httpStatus: result.httpStatus })
    return
  }

  const parsed = parseFeed(result.body)
  if (!parsed.ok) {
    res.status(422).json({
      ok: false,
      code: 'invalid-format',
      message: 'The response is not a valid RSS/Atom feed.',
    })
    return
  }

  const articles: Array<{
    title: string
    url: string
    body?: string
    savedAt: string | null
    truncated: boolean
  }> = []
  let invalidCount = 0
  for (const outcome of parsed.outcomes) {
    if (!outcome.ok) {
      invalidCount += 1
      continue
    }
    if (articles.length >= FEED_MAX_ITEMS) break
    articles.push({
      title: outcome.record.title,
      url: outcome.record.url,
      body: outcome.record.body,
      savedAt: outcome.record.savedAt,
      truncated: outcome.record.truncated,
    })
  }

  res.json({
    ok: true,
    finalUrl: result.finalUrl,
    articles,
    totalParsed: parsed.outcomes.length,
    returned: articles.length,
    itemLimit: FEED_MAX_ITEMS,
    truncated: parsed.outcomes.length - invalidCount > articles.length,
    invalidCount,
  })
})

// Malformed or oversized JSON bodies get a JSON error instead of an HTML page.
app.use('/api', (error: unknown, _req: Request, res: Response, next: NextFunction) => {
  const type = (error as { type?: string } | null)?.type
  if (type === 'entity.parse.failed' || type === 'entity.too.large') {
    res.status(400).json({ ok: false, code: 'invalid-request', message: 'The request body must be small JSON.' })
    return
  }
  next(error)
})

// Serve the built client only when it exists; on the API host there is none.
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist')
const serveClient = existsSync(path.join(distDir, 'index.html'))
if (serveClient) {
  app.use(express.static(distDir))
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`EchoShelf server listening on port ${PORT}`)
  console.log(`Feed rules: https-only, public targets, ${FEED_MAX_REDIRECTS} redirects max`)
  console.log(
    `Client: ${serveClient ? 'served from dist/' : 'not served (API only)'}; ` +
      `CORS origins: ${ALLOWED_ORIGINS.length}; rate limit: ${RATE_LIMIT}/10 min per IP`,
  )
})
