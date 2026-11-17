import { useMemo } from 'react'
import { MAX_IMPORT_RECORDS } from '@shared/import/limits'
import {
  coverageByFolder,
  folderKey,
  selectOutcomes,
  selectionKey,
  type BookmarkFileAnalysis,
  type FolderNode,
  type FolderScope,
  type FolderSelection,
} from '@shared/import/bookmarkFolders'

interface FolderPickerProps {
  fileName: string
  analysis: BookmarkFileAnalysis
  selected: FolderSelection[]
  /** Selections already written in this session. */
  imported: FolderSelection[]
  onChange: (selected: FolderSelection[]) => void
  onContinue: () => void
  onCancel: () => void
}

const MAX = MAX_IMPORT_RECORDS
const fmt = (n: number) => n.toLocaleString('en-US')

function isAncestor(prefix: string[], path: string[]): boolean {
  return prefix.length < path.length && prefix.every((segment, i) => path[i] === segment)
}

/**
 * Folder chooser for bookmark files over 1,000 records (Requirement 2 AC8,
 * AC11, AC12). Selecting a folder includes everything below it; a folder's
 * own bookmarks can be selected separately to split large folders.
 */
export function FolderPicker({
  fileName,
  analysis,
  selected,
  imported,
  onChange,
  onContinue,
  onCancel,
}: FolderPickerProps) {
  const selectedCount = useMemo(
    () => selectOutcomes(analysis.outcomes, selected).length,
    [analysis, selected],
  )
  const importedCoverage = useMemo(
    () => coverageByFolder(analysis.outcomes, imported),
    [analysis, imported],
  )
  const remaining = analysis.total - (importedCoverage.get('')?.total ?? 0)
  const selectedKeys = new Set(selected.map(selectionKey))

  const coveredByParent = (path: string[]) =>
    selected.some((s) => s.scope === 'subtree' && isAncestor(s.path, path))

  const toggle = (path: string[], scope: FolderScope, checked: boolean) => {
    const key = selectionKey({ path, scope })
    if (!checked) {
      onChange(selected.filter((s) => selectionKey(s) !== key))
      return
    }
    // A subtree entry replaces any entries inside it, keeping the selection tidy.
    const kept =
      scope === 'subtree'
        ? selected.filter(
            (s) =>
              !isAncestor(path, s.path) &&
              !(s.scope === 'direct' && folderKey(s.path) === folderKey(path)),
          )
        : selected
    onChange([...kept, { path, scope }])
  }

  const importedBadge = (count: number, of: number) => {
    if (count === 0) return null
    return (
      <span className="folder-badge">{count >= of ? 'Imported' : `${fmt(count)} imported`}</span>
    )
  }

  const renderRow = (
    path: string[],
    scope: FolderScope,
    label: string,
    count: number,
    importedCount: number,
    tooLargeNote: string | null,
  ) => {
    const key = selectionKey({ path, scope })
    const inherited =
      coveredByParent(path) ||
      (scope === 'direct' && selectedKeys.has(selectionKey({ path, scope: 'subtree' })))
    const tooLarge = count > MAX
    return (
      <div className="folder-row">
        <label className={`folder-label${tooLarge ? ' is-disabled' : ''}`}>
          <input
            type="checkbox"
            checked={inherited || selectedKeys.has(key)}
            disabled={inherited || tooLarge}
            onChange={(event) => toggle(path, scope, event.target.checked)}
          />
          <span className="folder-name">{label}</span>
          <span className="folder-count">{fmt(count)}</span>
        </label>
        {importedBadge(importedCount, count)}
        {tooLarge && tooLargeNote && <span className="folder-note">{tooLargeNote}</span>}
      </div>
    )
  }

  const renderNode = (node: FolderNode) => {
    const coverage = importedCoverage.get(node.key)
    const hasChildren = node.children.length > 0
    const subtreeNote = hasChildren
      ? 'Too large for one batch. Choose its subfolders instead.'
      : 'More than 1,000 bookmarks directly in this folder. Split it in your browser and export again.'
    return (
      <li key={node.key}>
        {renderRow(node.path, 'subtree', node.name, node.total, coverage?.total ?? 0, subtreeNote)}
        {hasChildren && (
          <ul className="folder-tree">
            {node.direct > 0 && (
              <li>
                {renderRow(
                  node.path,
                  'direct',
                  `Bookmarks directly in ${node.name}`,
                  node.direct,
                  coverage?.direct ?? 0,
                  'More than 1,000 bookmarks directly in this folder. Split it in your browser and export again.',
                )}
              </li>
            )}
            {node.children.map(renderNode)}
          </ul>
        )}
      </li>
    )
  }

  const root = analysis.tree
  const rootCoverage = importedCoverage.get('')
  const overLimit = selectedCount > MAX

  return (
    <div className="modal-form">
      <h2>Choose folders to import</h2>
      <p className="form-hint-left">
        {fileName} has {fmt(analysis.total)} bookmarks, more than the {fmt(MAX)} that can be
        imported at once. Pick folders for this batch; you can import the rest right after.
        {imported.length > 0 && ` ${fmt(remaining)} not imported yet.`}
      </p>
      <ul className="folder-tree folder-tree-root">
        {root.direct > 0 && (
          <li>
            {renderRow(
              [],
              'direct',
              'Bookmarks outside any folder',
              root.direct,
              rootCoverage?.direct ?? 0,
              'More than 1,000 bookmarks outside folders. Move some into folders in your browser and export again.',
            )}
          </li>
        )}
        {root.children.map(renderNode)}
      </ul>
      <p className={`folder-total${overLimit ? ' is-error' : ''}`} role="status" aria-live="polite">
        {fmt(selectedCount)} of {fmt(MAX)} selected
        {overLimit && ' — too many for one batch. Deselect some folders.'}
      </p>
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={selectedCount === 0 || overLimit}
          onClick={onContinue}
        >
          Continue
        </button>
      </div>
    </div>
  )
}