import type { Item } from '@shared/models/types'
import type { ViewKind } from '@client/app/Sidebar'

const fold = (s: string): string => s.normalize('NFC').toLowerCase()

function matchesQuery(item: Item, query: string): boolean {
  const q = fold(query.trim())
  if (q.length === 0) return true
  const haystacks = [
    item.title,
    item.body ?? '',
    item.originalUrl ?? '',
    item.canonicalUrl ?? '',
    ...item.tags,
  ]
  return haystacks.some((h) => fold(h).includes(q))
}

/**
 * Applies the current view and search query (R6).
 * Interim Rediscover rule: unread items, oldest first; the 30-day rule
 * with explicit reasons lands in task 11.
 */
export function filterItems(
  items: Item[],
  view: ViewKind,
  query: string,
): Item[] {
  let result = items.filter((item) => matchesQuery(item, query))
  switch (view) {
    case 'bookmark':
    case 'article':
    case 'note':
      result = result.filter((item) => item.kind === view)
      break
    case 'starred':
      result = result.filter((item) => item.starred)
      break
    case 'rediscover':
      break
    case 'all':
      break
  }
  return [...result].sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}