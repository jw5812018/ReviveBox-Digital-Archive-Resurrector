import { describe, expect, it } from 'vitest'
import { selectRediscover, formatSavedAgo } from '@client/features/rediscover/rediscover'
import { fixedClock } from '@client/features/rediscover/clock'
import type { Item } from '@shared/models/types'

const NOW = new Date('2026-11-15T00:00:00.000Z')
const clock = fixedClock(NOW)

function makeItem(partial: Partial<Item>): Item {
  return {
    id: crypto.randomUUID(),
    kind: 'bookmark',
    title: 't',
    tags: [],
    sourceIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    savedAt: '2026-01-01T00:00:00.000Z',
    readAt: null,
    starred: false,
    isSample: false,
    dateSource: 'original',
    ...partial,
  }
}

describe('selectRediscover', () => {
  it('prefers unread items older than 30 days, oldest first', () => {
    const items = [
      makeItem({ title: 'recent unread', savedAt: '2026-11-10T00:00:00.000Z' }),
      makeItem({ title: 'older unread', savedAt: '2026-03-01T00:00:00.000Z' }),
      makeItem({ title: 'oldest unread', savedAt: '2026-01-15T00:00:00.000Z' }),
      makeItem({ title: 'old but read', savedAt: '2026-02-01T00:00:00.000Z', readAt: '2026-03-01T00:00:00.000Z' }),
    ]
    const result = selectRediscover(items, clock)
    expect(result.rule).toBe('older-than-30-days')
    expect(result.items.map((i) => i.title)).toEqual(['oldest unread', 'older unread'])
  })

  it('falls back to oldest unread when nothing is older than 30 days', () => {
    const items = [
      makeItem({ title: 'b', savedAt: '2026-11-05T00:00:00.000Z' }),
      makeItem({ title: 'a', savedAt: '2026-11-01T00:00:00.000Z' }),
    ]
    const result = selectRediscover(items, clock)
    expect(result.rule).toBe('oldest-unread')
    expect(result.items.map((i) => i.title)).toEqual(['a', 'b'])
  })

  it('returns empty when everything is read', () => {
    const items = [
      makeItem({ readAt: '2026-01-02T00:00:00.000Z' }),
    ]
    const result = selectRediscover(items, clock)
    expect(result.rule).toBe('empty')
    expect(result.items).toHaveLength(0)
  })
})

describe('formatSavedAgo', () => {
  it('formats months for >= 30 days, days otherwise', () => {
    expect(formatSavedAgo('2026-08-15T00:00:00.000Z', clock)).toBe('Saved 3 months ago')
    expect(formatSavedAgo('2026-11-01T00:00:00.000Z', clock)).toBe('Saved 14 days ago')
    expect(formatSavedAgo('2026-11-14T00:00:00.000Z', clock)).toBe('Saved 1 day ago')
  })
})