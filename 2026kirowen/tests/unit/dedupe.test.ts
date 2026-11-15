import { describe, expect, it } from 'vitest'
import { computeNoteFingerprint } from '@shared/import/fingerprint'
import { findDuplicateByUrl, findDuplicateByFingerprint } from '@shared/import/dedupe'
import type { Item } from '@shared/models/types'

function makeItem(partial: Partial<Item>): Item {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    kind: 'bookmark',
    title: 't',
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

describe('findDuplicateByUrl', () => {
  it('matches on canonicalUrl only', () => {
    const items = [makeItem({ canonicalUrl: 'https://example.org/a' })]
    expect(findDuplicateByUrl(items, 'https://example.org/a')).toBe(items[0])
    expect(findDuplicateByUrl(items, 'https://example.org/b')).toBeUndefined()
  })
})

describe('computeNoteFingerprint', () => {
  it('is stable across newline styles and NFC normalization', async () => {
    const a = await computeNoteFingerprint('标题', '第一行\r\n第二行')
    const b = await computeNoteFingerprint('标题', '第一行\n第二行')
    expect(a).toBe(b)
  })

  it('ignores leading/trailing whitespace', async () => {
    const a = await computeNoteFingerprint(' title ', ' body ')
    const b = await computeNoteFingerprint('title', 'body')
    expect(a).toBe(b)
  })

  it('differs for different content', async () => {
    const a = await computeNoteFingerprint('title', 'body')
    const b = await computeNoteFingerprint('title', 'other body')
    expect(a).not.toBe(b)
  })

  it('finds duplicates by fingerprint', async () => {
    const fp = await computeNoteFingerprint('n', 'b')
    const items = [makeItem({ kind: 'note', noteFingerprint: fp })]
    expect(findDuplicateByFingerprint(items, fp)).toBe(items[0])
    expect(findDuplicateByFingerprint(items, 'different')).toBeUndefined()
  })
})