import type { Item } from '@shared/models/types'
import { realClock, type Clock } from './clock'

/** Default Rediscover rule: saved more than 30 days ago and unread (R8 AC1). */
export const REDISCOVER_AGE_DAYS = 30

const DAY_MS = 86_400_000

export type RediscoverRule = 'older-than-30-days' | 'oldest-unread' | 'empty'

export interface RediscoverResult {
  items: Item[]
  rule: RediscoverRule
}

const bySavedAtAsc = (a: Item, b: Item): number =>
  a.savedAt.localeCompare(b.savedAt)

/**
 * Rediscover selection (R8 AC1-2, AC7):
 * 1. unread items saved more than REDISCOVER_AGE_DAYS ago, oldest first;
 * 2. fallback to all unread items, oldest first;
 * 3. empty state when there is nothing unread.
 */
export function selectRediscover(
  items: Item[],
  clock: Clock = realClock,
): RediscoverResult {
  const cutoff = clock.now().getTime() - REDISCOVER_AGE_DAYS * DAY_MS
  const unread = items.filter((item) => item.readAt == null)

  const old = unread
    .filter((item) => new Date(item.savedAt).getTime() < cutoff)
    .sort(bySavedAtAsc)
  if (old.length > 0) {
    return { items: old, rule: 'older-than-30-days' }
  }

  const fallback = [...unread].sort(bySavedAtAsc)
  if (fallback.length > 0) {
    return { items: fallback, rule: 'oldest-unread' }
  }

  return { items: [], rule: 'empty' }
}

/** "Saved X ago" label for the recommendation reason (R8 AC3). */
export function formatSavedAgo(savedAt: string, clock: Clock = realClock): string {
  const days = Math.max(
    0,
    Math.floor((clock.now().getTime() - new Date(savedAt).getTime()) / DAY_MS),
  )
  if (days >= 30) {
    const months = Math.floor(days / 30)
    return `Saved ${months} ${months === 1 ? 'month' : 'months'} ago`
  }
  return `Saved ${days} ${days === 1 ? 'day' : 'days'} ago`
}