import { describe, it } from 'vitest'
import * as fc from 'fast-check'
import { normalizeUrl } from '@shared/urls/normalizeUrl'
import { planImport } from '@shared/import/pipeline'
import { buildBackup, parseBackup } from '@shared/import/backup'
import { selectRediscover } from '@client/features/rediscover/rediscover'
import { fixedClock } from '@client/features/rediscover/clock'
import type { Item, Source } from '@shared/models/types'

// ---------- generators ----------

const schemeArb = fc.constantFrom('http', 'https')
const hostArb = fc.constantFrom('example.org', 'Example.ORG', 'www.example.org', 'sub.example.org')
const pathArb = fc.constantFrom('', '/', '/a', '/a/', '/A/B', '/a b', '/a%20b')
const paramKeyArb = fc.constantFrom('id', 'tag', 'utm_source', 'utm_medium', 'fbclid', 'gclid', 'q')
const paramValueArb = fc.constantFrom('1', '42', 'x', 'hello world', '中文')

const urlArb: fc.Arbitrary<string> = fc
  .tuple(
    schemeArb,
    hostArb,
    pathArb,
    fc.array(fc.tuple(paramKeyArb, paramValueArb), { maxLength: 4 }),
    fc.option(fc.constantFrom('frag', 'section'), { nil: undefined }),
    fc.option(fc.nat({ max: 1000 }), { nil: undefined }),
  )
  .map(([scheme, host, path, params, frag, port]) => {
    const query = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
    const portPart = port != null ? `:${port}` : ''
    const queryPart = query ? `?${query}` : ''
    const fragPart = frag != null ? `#${frag}` : ''
    return `${scheme}://${host}${portPart}${path || '/'}${queryPart}${fragPart}`
  })

const dateArb = fc
  .integer({ min: 1_577_836_800_000, max: 1_800_000_000_000 })
  .map((ms) => new Date(ms).toISOString())

const itemArb = (sourceIds: fc.Arbitrary<string[]>): fc.Arbitrary<Item> =>
  fc
    .tuple(
      fc.uuid(),
      fc.constantFrom('bookmark', 'article', 'note') as fc.Arbitrary<Item['kind']>,
      fc.string({ minLength: 1, maxLength: 60 }).filter((s) => s.trim().length > 0),
      fc.option(fc.constantFrom('https://example.org/a', 'https://example.org/b', 'https://example.org/c'), { nil: undefined }),
      fc.array(fc.string({ minLength: 1, maxLength: 12 }).filter((s) => s.trim().length > 0), { maxLength: 4 }),
      sourceIds,
      dateArb,
      fc.option(dateArb, { nil: null }),
      fc.boolean(),
      fc.boolean(),
    )
    .map(([id, kind, title, url, tags, srcIds, savedAt, readAt, starred, isSample]) => ({
      id,
      kind,
      title: title.trim(),
      originalUrl: url,
      canonicalUrl: url,
      tags,
      sourceIds: srcIds,
      createdAt: savedAt,
      updatedAt: savedAt,
      savedAt,
      readAt,
      starred,
      isSample,
      dateSource: 'original' as const,
    }))

const sourceArb: fc.Arbitrary<Source> = fc
  .tuple(fc.uuid(), fc.constantFrom('bookmark-file', 'feed', 'note-file', 'manual', 'demo', 'backup') as fc.Arbitrary<Source['kind']>, fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0))
  .map(([id, kind, name]) => ({ id, kind, name }))

const libraryArb = fc
  .array(sourceArb, { minLength: 1, maxLength: 5 })
  .chain((sources) => {
    const ids = sources.map((s) => s.id)
    const sourceIdsArb = fc.array(fc.constantFrom(...ids), { minLength: 1, maxLength: 2 })
    return fc.tuple(fc.array(itemArb(sourceIdsArb), { maxLength: 12 }), fc.constant(sources))
  })

// ---------- Property 1: URL normalization is idempotent ----------

describe('Property: normalize(normalize(url)) = normalize(url)', () => {
  it('holds for generated http/https URLs', () => {
    fc.assert(
      fc.property(urlArb, (url) => {
        const once = normalizeUrl(url)
        if (once == null) return true
        return normalizeUrl(once) === once
      }),
      { numRuns: 500 },
    )
  })
})

// ---------- Property 2: re-importing the same batch creates nothing new ----------

describe('Property: import is idempotent', () => {
  it('planning the same bookmark file twice yields zero new items the second time', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
            fc.constantFrom('https://example.org/x', 'https://example.org/y', 'https://example.org/z?utm_source=n'),
          ),
          { minLength: 1, maxLength: 8 },
        ),
        async (entries) => {
          const anchors = entries
            .map(
              ([title, url]) =>
                `<DT><A HREF="${url}" ADD_DATE="1718000000">${title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</A>`,
            )
            .join('\n')
          const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><p>${anchors}</DL><p>`

          const first = await planImport('f.html', html, [], [], new Date('2026-01-01T00:00:00.000Z'))
          if (!first.ok) return false
          const afterFirst = first.plan.createItems

          const second = await planImport('f.html', html, afterFirst, first.plan.createSources, new Date('2026-01-02T00:00:00.000Z'))
          if (!second.ok) return false

          // Second run must create nothing and mark every previously parsed
          // record (new or in-batch duplicate) as a duplicate.
          const parsedRecords =
            first.plan.summary.valid + first.plan.summary.duplicates
          return (
            second.plan.createItems.length === 0 &&
            second.plan.summary.invalid === first.plan.summary.invalid &&
            second.plan.summary.duplicates === parsedRecords
          )
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ---------- Property 3: backup round-trip preserves data ----------

describe('Property: export then import preserves items and sources', () => {
  it('parseBackup(buildBackup(x)) deep-equals x', () => {
    fc.assert(
      fc.property(libraryArb, ([items, sources]) => {
        const restored = parseBackup(buildBackup(items, sources, new Date('2026-01-01T00:00:00.000Z')))
        if (!restored.ok) return false
        return (
          JSON.stringify(restored.items) === JSON.stringify(items) &&
          JSON.stringify(restored.sources) === JSON.stringify(sources)
        )
      }),
      { numRuns: 200 },
    )
  })
})

// ---------- Property 4: Rediscover only returns unread, always sorted ----------

describe('Property: Rediscover rule consistency', () => {
  it('results are always unread and sorted by savedAt ascending', () => {
    fc.assert(
      fc.property(
        libraryArb.map(([items]) => items),
        dateArb,
        (items, nowIso) => {
          const result = selectRediscover(items, fixedClock(new Date(nowIso)))
          const allUnread = result.items.every((i) => i.readAt == null)
          const sorted = result.items.every(
            (item, idx, arr) => idx === 0 || arr[idx - 1].savedAt <= item.savedAt,
          )
          const emptyConsistency = result.rule === 'empty' ? result.items.length === 0 : true
          return allUnread && sorted && emptyConsistency
        },
      ),
      { numRuns: 300 },
    )
  })
})

// ---------- Property 5: folder batches create the same items as one import ----------

describe('Property: importing by folder batches equals importing at once', () => {
  it('creates each canonical URL exactly once, whatever the batch split', async () => {
    const recordArb = fc.record({
      title: fc.constantFrom('One', 'Two', 'Three', '四'),
      url: fc.constantFrom(
        'https://example.org/a',
        'https://example.org/b',
        'https://example.org/c?utm_source=x',
        'https://example.org/c',
        'javascript:void(0)',
      ),
    })
    const anchor = (r: { title: string; url: string }) => `<DT><A HREF="${r.url}">${r.title}</A>`

    await fc.assert(
      fc.asyncProperty(
        fc.array(recordArb, { maxLength: 4 }),
        fc
          .uniqueArray(fc.constantFrom('Alpha', 'Beta', 'Gamma', '研究'), { minLength: 1, maxLength: 4 })
          .chain((names) =>
            fc.tuple(
              fc.constant(names),
              fc.array(fc.array(recordArb, { maxLength: 5 }), {
                minLength: names.length,
                maxLength: names.length,
              }),
            ),
          ),
        fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 5, maxLength: 5 }),
        async (rootRecords, [names, folderRecords], assignment) => {
          const folders = names
            .map((name, i) => `<DT><H3>${name}</H3><DL><p>${folderRecords[i].map(anchor).join('')}</DL><p>`)
            .join('')
          const html = `<DL><p>${rootRecords.map(anchor).join('')}${folders}</DL><p>`
          const now = new Date('2026-01-01T00:00:00.000Z')

          const once = await planImport('f.html', html, [], [], now)
          if (!once.ok) return false

          const keys: string[][] = [[], ...names.map((name) => [name])]
          let library: Item[] = []
          for (let batch = 0; batch <= 2; batch += 1) {
            const selection = keys
              .filter((_, i) => assignment[i] === batch)
              .map((path) => ({ path, scope: 'direct' as const }))
            if (selection.length === 0) continue
            const result = await planImport('f.html', html, library, [], now, { folders: selection })
            if (!result.ok) return false
            library = [...library, ...result.plan.createItems]
          }

          const urls = (items: Item[]) => items.map((item) => item.canonicalUrl ?? '').sort()
          return JSON.stringify(urls(library)) === JSON.stringify(urls(once.plan.createItems))
        },
      ),
      { numRuns: 100 },
    )
  })
})