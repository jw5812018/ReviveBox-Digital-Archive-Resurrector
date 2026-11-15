import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { DOMParser } from 'linkedom'
import { fetchFeed, FEED_MAX_REDIRECTS } from '@server/feeds/fetchFeed.ts'
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
const app = express()
app.use(express.json({ limit: '4kb' }))

/** Server-side concurrency limit for outbound fetches (R9 AC8). */
const MAX_CONCURRENT_FETCHES = 5
let inFlight = 0
const queue: Array<() => void> = []

async function withFetchSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_CONCURRENT_FETCHES) {
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
  const url = (req.body as { url?: unknown })?.url
  if (typeof url !== 'string' || url.length === 0 || url.length > 2048) {
    res.status(400).json({ ok: false, code: 'invalid-url', message: 'A valid url string is required.' })
    return
  }
  // Never log the URL: query strings may contain private tokens.

  const result = await withFetchSlot(() => fetchFeed(url))
  if (!result.ok) {
    const status = result.code === 'http-error' ? 502 : result.code === 'blocked-target' || result.code === 'invalid-url' ? 400 : 502
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

// In production, serve the built client from the same Node process.
const distDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../dist',
)
app.use(express.static(distDir))
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`EchoShelf server listening on http://localhost:${PORT}`)
  console.log(`Feed rules: https-only, public targets, ${FEED_MAX_REDIRECTS} redirects max`)
})