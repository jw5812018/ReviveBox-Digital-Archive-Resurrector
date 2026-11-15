import { describe, expect, it } from 'vitest'
import { filterItems } from '@client/features/library/filterItems'
import type { Item } from '@shared/models/types'

function makeItem(partial: Partial<Item>): Item {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: crypto.randomUUID(),
    kind: 'bookmark',
    title: 'untitled',
    tags: [],
    sourceIds: [],
    createdAt: now,
    updatedAt: now,
    savedAt: now,
    readAt: null,
    starred: false,
    isSample: false,
    dateSource: 'original',
    ...partial,
  }
}

const ITEMS: Item[] = [
  makeItem({ kind: 'bookmark', title: 'CSS Grid guide', savedAt: '2026-01-03T00:00:00.000Z', tags: ['css'] }),
  makeItem({ kind: 'article', title: '订阅协议的历史', body: '开放订阅协议仍在使用', savedAt: '2026-01-02T00:00:00.000Z', tags: ['rss'] }),
  makeItem({ kind: 'note', title: '读书笔记', body: '关于记忆与检索', savedAt: '2026-01-01T00:00:00.000Z', starred: true }),
  makeItem({ kind: 'bookmark', title: 'Read later', savedAt: '2025-12-31T00:00:00.000Z', readAt: '2026-01-01T12:00:00.000Z' }),
]

describe('filterItems', () => {
  it('filters by kind', () => {
    expect(filterItems(ITEMS, 'bookmark', '')).toHaveLength(2)
    expect(filterItems(ITEMS, 'article', '')).toHaveLength(1)
    expect(filterItems(ITEMS, 'note', '')).toHaveLength(1)
  })

  it('filters starred only', () => {
    const result = filterItems(ITEMS, 'starred', '')
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('读书笔记')
  })

  it('searches Chinese text in title and body (continuous text, no tokenization)', () => {
    expect(filterItems(ITEMS, 'all', '订阅')).toHaveLength(1)
    expect(filterItems(ITEMS, 'all', '检索')).toHaveLength(1)
    expect(filterItems(ITEMS, 'all', '记忆')).toHaveLength(1)
  })

  it('searches tags and URLs case-insensitively', () => {
    expect(filterItems(ITEMS, 'all', 'CSS')).toHaveLength(1)
    expect(filterItems(ITEMS, 'all', 'css')).toHaveLength(1)
  })

  it('empty query matches everything, sorted newest first', () => {
    const result = filterItems(ITEMS, 'all', '')
    expect(result).toHaveLength(4)
    expect(result[0].savedAt >= result[1].savedAt).toBe(true)
  })

  it('no-match query returns empty', () => {
    expect(filterItems(ITEMS, 'all', 'zzz-no-such-thing')).toHaveLength(0)
  })

  it('combines kind view with query', () => {
    expect(filterItems(ITEMS, 'bookmark', 'css')).toHaveLength(1)
    expect(filterItems(ITEMS, 'note', 'css')).toHaveLength(0)
  })
})