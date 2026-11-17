import { describe, expect, it } from 'vitest'
import {
  analyzeBookmarkFile,
  coverageByFolder,
  describeSelection,
  folderKey,
  selectOutcomes,
} from '@shared/import/bookmarkFolders'
import { planImport } from '@shared/import/pipeline'
import { ImportErrorType } from '@shared/models/types'

const SAMPLE = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><A HREF="https://example.org/loose-1">Loose 1</A>
  <DT><A HREF="https://example.org/loose-2">Loose 2</A>
  <DT><H3>Alpha</H3>
  <DL><p>
    <DT><A HREF="https://example.org/a1">A1</A>
    <DT><A HREF="https://example.org/a2">A2</A>
    <DT><A HREF="javascript:alert(1)">Bad link</A>
    <DT><H3>Beta</H3>
    <DL><p>
      <DT><A HREF="https://example.org/b1">B1</A>
      <DT><A HREF="https://example.org/b2">B2</A>
    </DL><p>
  </DL><p>
  <DT><H3>Gamma</H3>
  <DL><p>
    <DT><A HREF="https://example.org/g1">G1</A>
  </DL><p>
</DL><p>`

function bigFile(counts: Record<string, number>): string {
  const sections = Object.entries(counts).map(([name, n]) => {
    const anchors = Array.from(
      { length: n },
      (_, i) => `<DT><A HREF="https://example.org/${name}/${i}">${name} ${i}</A>`,
    ).join('\n')
    return `<DT><H3>${name}</H3>\n<DL><p>\n${anchors}\n</DL><p>`
  })
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<DL><p>\n${sections.join('\n')}\n</DL><p>`
}

describe('analyzeBookmarkFile', () => {
  const { tree, total } = analyzeBookmarkFile(SAMPLE)
  const alpha = tree.children.find((c) => c.name === 'Alpha')
  const beta = alpha?.children.find((c) => c.name === 'Beta')

  it('counts records directly in and below each folder, invalid ones included', () => {
    expect(total).toBe(8)
    expect(tree.direct).toBe(2)
    expect(tree.total).toBe(8)
    expect(alpha?.direct).toBe(3)
    expect(alpha?.total).toBe(5)
    expect(beta?.path).toEqual(['Alpha', 'Beta'])
    expect(beta?.total).toBe(2)
  })
})

describe('selectOutcomes', () => {
  const { outcomes } = analyzeBookmarkFile(SAMPLE)

  it('selects a folder with everything below it', () => {
    expect(selectOutcomes(outcomes, [{ path: ['Alpha'], scope: 'subtree' }])).toHaveLength(5)
  })
  it('selects only the records directly inside a folder', () => {
    expect(selectOutcomes(outcomes, [{ path: ['Alpha'], scope: 'direct' }])).toHaveLength(3)
  })
  it('counts overlapping entries once', () => {
    const selection = [
      { path: ['Alpha'], scope: 'subtree' as const },
      { path: ['Alpha', 'Beta'], scope: 'subtree' as const },
    ]
    expect(selectOutcomes(outcomes, selection)).toHaveLength(5)
  })
  it('selects bookmarks outside any folder', () => {
    expect(selectOutcomes(outcomes, [{ path: [], scope: 'direct' }])).toHaveLength(2)
  })
  it('selects nothing for an empty selection', () => {
    expect(selectOutcomes(outcomes, [])).toHaveLength(0)
  })
})

describe('coverageByFolder', () => {
  const { outcomes } = analyzeBookmarkFile(SAMPLE)
  it('reports covered records per folder and for its ancestors', () => {
    const coverage = coverageByFolder(outcomes, [{ path: ['Alpha', 'Beta'], scope: 'subtree' }])
    expect(coverage.get(folderKey(['Alpha', 'Beta']))).toEqual({ direct: 2, total: 2 })
    expect(coverage.get(folderKey(['Alpha']))).toEqual({ direct: 0, total: 2 })
    expect(coverage.get('')).toEqual({ direct: 0, total: 2 })
    expect(coverage.get(folderKey(['Gamma']))).toBeUndefined()
  })
})

describe('describeSelection', () => {
  it('names folders and summarizes long selections', () => {
    expect(describeSelection([{ path: ['Alpha'], scope: 'subtree' }])).toBe('Alpha')
    expect(describeSelection([{ path: [], scope: 'direct' }])).toBe('Outside folders')
    expect(
      describeSelection(['A', 'B', 'C', 'D', 'E'].map((n) => ({ path: [n], scope: 'subtree' as const }))),
    ).toBe('A, B, C +2 more')
  })
})

describe('planImport with folder batches', () => {
  const BIG = bigFile({ Alpha: 700, Beta: 500 })
  const now = new Date('2026-01-01T00:00:00.000Z')
  const alpha = [{ path: ['Alpha'], scope: 'subtree' as const }]
  const beta = [{ path: ['Beta'], scope: 'subtree' as const }]

  it('rejects the whole file when no folders are chosen', async () => {
    const result = await planImport('big.html', BIG, [], [], now)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe(ImportErrorType.TooManyRecords)
  })

  it('rejects a selection over 1,000 records', async () => {
    const result = await planImport('big.html', BIG, [], [], now, { folders: [...alpha, ...beta] })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('Choose fewer folders')
  })

  it('imports folder by folder and dedupes against earlier batches', async () => {
    const first = await planImport('big.html', BIG, [], [], now, { folders: alpha })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.plan.createItems).toHaveLength(700)
    expect(first.plan.createSources[0].name).toBe('big.html (Alpha)')

    const second = await planImport('big.html', BIG, first.plan.createItems, [], now, { folders: beta })
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.plan.createItems).toHaveLength(500)

    const library = [...first.plan.createItems, ...second.plan.createItems]
    const again = await planImport('big.html', BIG, library, [], now, { folders: alpha })
    expect(again.ok).toBe(true)
    if (!again.ok) return
    expect(again.plan.createItems).toHaveLength(0)
    expect(again.plan.summary.duplicates).toBe(700)
  })
})