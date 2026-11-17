import { parseBookmarkHtml, type BookmarkParseOutcome } from './bookmarkParser'

/**
 * Folder batch import for bookmark files over the 1,000-record cap
 * (Requirement 2 AC8, AC11-13). Pure functions: no DOM writes, no storage.
 */

export interface FolderNode {
  /** Stable key for the folder path; the root (outside any folder) is ''. */
  key: string
  /** Folder name; '' for the root. */
  name: string
  path: string[]
  /** Records directly inside this folder. */
  direct: number
  /** Records in this folder and all of its subfolders. */
  total: number
  children: FolderNode[]
}

/** 'subtree' = the folder with everything below it; 'direct' = only records directly inside. */
export type FolderScope = 'subtree' | 'direct'

export interface FolderSelection {
  path: string[]
  scope: FolderScope
}

export interface BookmarkFileAnalysis {
  outcomes: BookmarkParseOutcome[]
  tree: FolderNode
  total: number
}

const SEPARATOR = '\u001f'

export function folderKey(path: string[]): string {
  return path.join(SEPARATOR)
}

export function selectionKey(selection: FolderSelection): string {
  return `${selection.scope}:${folderKey(selection.path)}`
}

export function outcomeFolderPath(outcome: BookmarkParseOutcome): string[] {
  return outcome.ok ? outcome.record.folderPath : outcome.folderPath
}

/** Builds the folder tree with direct and subtree record counts. Valid and invalid records both count. */
export function buildFolderTree(outcomes: BookmarkParseOutcome[]): FolderNode {
  const root: FolderNode = { key: '', name: '', path: [], direct: 0, total: 0, children: [] }
  const index = new Map<string, FolderNode>([['', root]])

  const ensure = (path: string[]): FolderNode => {
    const key = folderKey(path)
    const existing = index.get(key)
    if (existing) return existing
    const parent = ensure(path.slice(0, -1))
    const node: FolderNode = {
      key,
      name: path[path.length - 1],
      path,
      direct: 0,
      total: 0,
      children: [],
    }
    parent.children.push(node)
    index.set(key, node)
    return node
  }

  for (const outcome of outcomes) {
    const path = outcomeFolderPath(outcome)
    ensure(path).direct += 1
    for (let depth = 0; depth <= path.length; depth += 1) {
      const ancestor = index.get(folderKey(path.slice(0, depth)))
      if (ancestor) ancestor.total += 1
    }
  }
  return root
}

/** Parses a bookmark file once and returns its records plus the folder tree. */
export function analyzeBookmarkFile(html: string): BookmarkFileAnalysis {
  const outcomes = parseBookmarkHtml(html)
  return { outcomes, tree: buildFolderTree(outcomes), total: outcomes.length }
}

function startsWith(path: string[], prefix: string[]): boolean {
  return prefix.length <= path.length && prefix.every((segment, i) => path[i] === segment)
}

/** True when a record at `path` is covered by any selection entry. */
export function matchesSelection(path: string[], selections: FolderSelection[]): boolean {
  return selections.some((selection) =>
    selection.scope === 'direct'
      ? folderKey(path) === folderKey(selection.path)
      : startsWith(path, selection.path),
  )
}

/** Records covered by the selection. Overlapping entries count each record once. */
export function selectOutcomes(
  outcomes: BookmarkParseOutcome[],
  selections: FolderSelection[],
): BookmarkParseOutcome[] {
  return outcomes.filter((outcome) => matchesSelection(outcomeFolderPath(outcome), selections))
}

export interface FolderCoverage {
  direct: number
  total: number
}

/**
 * Per folder key: how many of its records (directly inside, and in the whole
 * subtree) the selections cover. Used to mark folders already imported in
 * this session (Requirement 2 AC12). One pass over the records.
 */
export function coverageByFolder(
  outcomes: BookmarkParseOutcome[],
  selections: FolderSelection[],
): Map<string, FolderCoverage> {
  const coverage = new Map<string, FolderCoverage>()
  const bump = (key: string, field: keyof FolderCoverage) => {
    const entry = coverage.get(key) ?? { direct: 0, total: 0 }
    entry[field] += 1
    coverage.set(key, entry)
  }
  if (selections.length === 0) return coverage
  for (const outcome of outcomes) {
    const path = outcomeFolderPath(outcome)
    if (!matchesSelection(path, selections)) continue
    bump(folderKey(path), 'direct')
    for (let depth = 0; depth <= path.length; depth += 1) {
      bump(folderKey(path.slice(0, depth)), 'total')
    }
  }
  return coverage
}
/** Short label for a batch source, e.g. "Research, Tools +2 more". */
export function describeSelection(selections: FolderSelection[]): string {
  const names = selections.map((selection) => {
    const name = selection.path[selection.path.length - 1] ?? 'Outside folders'
    return selection.scope === 'direct' && selection.path.length > 0 ? `${name} (direct)` : name
  })
  if (names.length <= 3) return names.join(', ')
  return `${names.slice(0, 3).join(', ')} +${names.length - 3} more`
}