import type { Item, Source, FeedFetchState } from '@shared/models/types'
import { planFetchedArticles } from '@shared/import/pipeline'
import { getDatabase, type LibraryMode } from '@client/storage/db'
import { fetchFeedFromService, type FeedServiceStage } from './feedApi'

export interface RefreshOutcome {
  ok: boolean
  state: FeedFetchState
  detail?: string
  added: number
  merged: number
}

/**
 * Manual feed refresh (Requirement 9): asks the feed service to fetch the
 * feed, then writes new articles through the same dedupe rules as file
 * imports. Every failure is recorded on the source; saved items are never
 * changed by a failed refresh. Never throws.
 */
export async function refreshFeed(
  source: Source,
  mode: LibraryMode,
  existingItems: Item[],
  onStage: (stage: FeedServiceStage) => void = () => {},
): Promise<RefreshOutcome> {
  const db = getDatabase(mode)
  const recordStatus = async (state: FeedFetchState, detail?: string) => {
    const fetchedAt = new Date().toISOString()
    try {
      await db.sources.update(source.id, {
        lastFetchedAt: fetchedAt,
        lastFetchStatus: { state, fetchedAt, detail },
      })
    } catch {
      // Status is informational; a failed status write must not mask the result.
    }
  }

  if (!source.feedUrl) {
    await recordStatus('network-error', 'This subscription has no feed URL.')
    return { ok: false, state: 'network-error', detail: 'No feed URL.', added: 0, merged: 0 }
  }

  const result = await fetchFeedFromService(source.feedUrl, onStage)
  if (!result.ok) {
    await recordStatus(result.state, result.detail)
    return { ok: false, state: result.state, detail: result.detail, added: 0, merged: 0 }
  }

  const plan = planFetchedArticles(result.articles, source.id, existingItems)
  try {
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
  } catch {
    const detail = 'Fetched, but saving the articles in this browser failed. Nothing was changed.'
    await recordStatus('save-failed', detail)
    return { ok: false, state: 'save-failed', detail, added: 0, merged: 0 }
  }

  const summary = `${plan.summary.valid} new, ${plan.summary.duplicates} already saved`
  await recordStatus(
    'ok',
    result.truncated ? `${summary}; the feed had more items than the 200-item limit` : summary,
  )
  return { ok: true, state: 'ok', added: plan.summary.valid, merged: plan.summary.duplicates }
}