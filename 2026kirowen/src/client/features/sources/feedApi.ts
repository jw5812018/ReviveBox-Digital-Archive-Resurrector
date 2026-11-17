import type { FeedFetchState } from '@shared/models/types'
import type { FetchedArticle } from '@shared/import/pipeline'

/**
 * Client for the feed service (Requirement 9 AC13-15, Requirement 10 AC10).
 * VITE_FEED_API_URL points at a separately hosted service; when it is unset
 * the app calls same-origin /api (local dev proxy and `npm start`).
 */
export const FEED_API_BASE = (import.meta.env.VITE_FEED_API_URL ?? '').trim().replace(/\/+$/, '')

const WAKE_BUDGET_MS = 90_000
const HEALTH_ATTEMPT_MS = 15_000
const HEALTH_RETRY_DELAY_MS = 3_000
const FETCH_TIMEOUT_MS = 30_000

export type FeedServiceStage = 'waking' | 'fetching'

export type FeedServiceResult =
  | { ok: true; articles: FetchedArticle[]; truncated: boolean }
  | { ok: false; state: FeedFetchState; detail: string }

interface ServicePayload {
  ok?: boolean
  code?: string
  message?: string
  articles?: FetchedArticle[]
  truncated?: boolean
  retryAfterSeconds?: number
}

function endpoint(path: string): string {
  return `${FEED_API_BASE}${path}`
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function isHealthy(ms: number): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(endpoint('/api/health'), { method: 'GET' }, ms)
    if (!response.ok) return false
    const payload = (await response.json()) as ServicePayload
    return payload.ok === true
  } catch {
    // Network error, CORS-less loading page, timeout or non-JSON body.
    return false
  }
}

/**
 * Free hosting sleeps when idle and takes about a minute to wake. Poll the
 * health endpoint for up to 90 seconds, reporting the waking stage once.
 * Same-origin setups have no cold start, so they skip this step.
 */
async function wakeService(onStage: (stage: FeedServiceStage) => void): Promise<boolean> {
  if (FEED_API_BASE === '') return true
  const deadline = Date.now() + WAKE_BUDGET_MS
  let announced = false
  while (Date.now() < deadline) {
    if (await isHealthy(Math.min(HEALTH_ATTEMPT_MS, Math.max(1, deadline - Date.now())))) {
      return true
    }
    if (!announced) {
      announced = true
      onStage('waking')
    }
    await sleep(HEALTH_RETRY_DELAY_MS)
  }
  return false
}

function stateForCode(code: string | undefined): FeedFetchState {
  switch (code) {
    case 'timeout':
      return 'timeout'
    case 'http-error':
      return 'http-error'
    case 'invalid-format':
      return 'invalid-format'
    case 'redirect-limit':
      return 'redirect-limit'
    case 'too-large':
      return 'too-large'
    case 'invalid-url':
    case 'blocked-target':
      return 'blocked'
    case 'rate-limited':
      return 'rate-limited'
    default:
      return 'network-error'
  }
}

/** Asks the feed service to fetch one feed URL. Never throws. */
export async function fetchFeedFromService(
  feedUrl: string,
  onStage: (stage: FeedServiceStage) => void = () => {},
): Promise<FeedServiceResult> {
  if (!(await wakeService(onStage))) {
    return {
      ok: false,
      state: 'network-error',
      detail: 'The feed service did not wake up within 90 seconds. Try again shortly.',
    }
  }

  onStage('fetching')
  let response: Response
  try {
    response = await fetchWithTimeout(
      endpoint('/api/feeds/fetch'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: feedUrl }),
      },
      FETCH_TIMEOUT_MS,
    )
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError'
    return aborted
      ? { ok: false, state: 'timeout', detail: 'The feed service did not answer within 30 seconds.' }
      : { ok: false, state: 'network-error', detail: 'Could not reach the feed service.' }
  }

  let payload: ServicePayload
  try {
    payload = JSON.parse(await response.text()) as ServicePayload
  } catch {
    return {
      ok: false,
      state: 'network-error',
      detail: `The feed service returned an unexpected response (HTTP ${response.status}).`,
    }
  }

  if (response.ok && payload.ok === true && Array.isArray(payload.articles)) {
    return { ok: true, articles: payload.articles, truncated: payload.truncated === true }
  }

  if (response.status === 429 || payload.code === 'rate-limited') {
    const minutes = Math.max(1, Math.ceil((payload.retryAfterSeconds ?? 60) / 60))
    return {
      ok: false,
      state: 'rate-limited',
      detail: `Too many refreshes from this network. Try again in about ${minutes} min.`,
    }
  }

  return {
    ok: false,
    state: stateForCode(payload.code),
    detail: payload.message ?? `The feed service returned HTTP ${response.status}.`,
  }
}