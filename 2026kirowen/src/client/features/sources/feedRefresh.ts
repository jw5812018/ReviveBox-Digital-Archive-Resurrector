import type { Item, Source, FeedFetchState } from '@shared/models/types'
import { planFetchedArticles, type FetchedArticle } from '@shared/import/pipeline'
import { getDatabase, type LibraryMode } from '@client/storage/db'

interface FetchFeedResponse {
  ok: boolean
  code?: string
  message?: string
  articles?: FetchedArticle[]
  truncated?: boolean
}

export interface RefreshOutcome {
  ok: boolean
  state: FeedFetchState
  detail?: string
  added: number
  merged: number
}

function mapErrorCode(code: string | undefined): FeedFetchState {
  switch (code) {
    case 'timeout':
      return 'timeout'
    case 'http-error':
      return 'http-error'
    case 'invalid-format':
      return 'invalid-format'
    case 'redirect-limit':
      return 'redirect-limit'
    default:
      return 'network-error'
  }
}

/**
 * Manual feed refresh (R9): asks the server to fetch the feed, then writes
 * new articles through the same dedupe rules as file imports. Failures
 * update the source status but never touch saved items.
 */
export async function refreshFeed(
  source: Source,
  mode: LibraryMode,
  existingItems: Item[],
): Promise<RefreshOutcome> {
  if (!source.feedUrl) {
    return { ok: false, state: 'network-error', detail: 'No feed URL on this source.', added: 0, merged: 0 }
  }

  const db = getDatabase(mode)
  const recordStatus = async (state: FeedFetchState, detail?: string) => {
    await db.sources.update(source.id, {
      lastFetchedAt: new Date().toISOString(),
      lastFetchStatus: { state, fetchedAt: new Date().toISOString(), detail },
    })
  }

  let response: Response
  try {
    response = await fetch('/api/feeds/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: source.feedUrl }),
    })
  } catch {
    await recordStatus('network-error', 'Could not reach the local fetch service.')
    return { ok: false, state: 'network-error', detail: 'Fetch service unreachable.', added: 0, merged: 0 }
  }

  const payload = (await response.json()) as FetchFeedResponse
  if (!response.ok || !payload.ok || !payload.articles) {
    const state = mapErrorCode(payload.code)
    const detail = payload.message ?? `HTTP ${response.status}`
    await recordStatus(state, detail)
    return { ok: false, state, detail, added: 0, merged: 0 }
  }

  const plan = planFetchedArticles(payload.articles, source.id, existingItems)
  await db.transaction('rw', db.items, db.sources, async () => {
    for (const merge of plan.merges) {
      const target = await db.items.get(merge.targetId)
      if (!target) continue
      await db.items.update(merge.targetId, {
        sourceIds: Array.from(new Set([...target.sourceIds, merge.addSourceId])),
        updatedAt: new Date().toISOString(),
      })
    }
    await db.items.bulkAdd(plan.createItems)
  })
  await recordStatus(
    'ok',
    payload.truncated ? `Hit ${plan.articleCount}-item processing limit` : undefined,
  )
  return {
    ok: true,
    state: 'ok',
    added: plan.summary.valid,
    merged: plan.summary.duplicates,
  }
}