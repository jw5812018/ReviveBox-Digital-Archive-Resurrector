import { useRef, useState } from 'react'
import type { Item, Source } from '@shared/models/types'
import { planImport, type ImportPlan } from '@shared/import/pipeline'
import { parseBackup } from '@shared/import/backup'
import { MAX_IMPORT_RECORDS, validateFileSize } from '@shared/import/limits'
import {
  analyzeBookmarkFile,
  selectionKey,
  type BookmarkFileAnalysis,
  type FolderSelection,
} from '@shared/import/bookmarkFolders'
import { getDatabase, type LibraryMode } from '@client/storage/db'
import { getAllItems } from '@client/storage/itemService'
import { getAllSources } from '@client/storage/sourceService'
import { FolderPicker } from './FolderPicker'

interface ImportModalProps {
  mode: LibraryMode
  /** Called after each written batch so the library list stays current. */
  onImported: () => void
  /** Called when the whole import flow is finished. */
  onDone: () => void
  onCancel: () => void
}

/** A large bookmark file being imported folder by folder (Requirement 2 AC8, AC12). */
interface BatchContext {
  fileName: string
  content: string
  analysis: BookmarkFileAnalysis
  imported: FolderSelection[]
}

type Phase =
  | { step: 'pick' }
  | { step: 'folders'; batch: BatchContext; selected: FolderSelection[] }
  | {
      step: 'preview'
      plan: ImportPlan
      fileName: string
      batch?: BatchContext
      selected?: FolderSelection[]
    }
  | { step: 'batch-done'; batch: BatchContext; added: number; merged: number }
  | { step: 'restore'; items: Item[]; sources: Source[]; fileName: string }
  | { step: 'error'; message: string }

function mergeSelections(a: FolderSelection[], b: FolderSelection[]): FolderSelection[] {
  const byKey = new Map<string, FolderSelection>()
  for (const s of [...a, ...b]) byKey.set(selectionKey(s), s)
  return [...byKey.values()]
}

/** Import flow: file → (folders) → preview → confirm writes in a transaction (R2, R5, R7 AC6-7). */
export function ImportModal({ mode, onImported, onDone, onCancel }: ImportModalProps) {
  const [phase, setPhase] = useState<Phase>({ step: 'pick' })
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Dedupe always runs against the current library, including earlier batches.
  const planAndPreview = async (
    fileName: string,
    content: string,
    batch?: BatchContext,
    selected?: FolderSelection[],
  ) => {
    let items: Item[]
    let sources: Source[]
    try {
      ;[items, sources] = await Promise.all([getAllItems(mode), getAllSources(mode)])
    } catch {
      setPhase({ step: 'error', message: 'Could not read your library in this browser.' })
      return
    }
    const result = await planImport(
      fileName,
      content,
      items,
      sources,
      new Date(),
      selected ? { folders: selected } : {},
    )
    if (!result.ok) {
      setPhase({ step: 'error', message: result.message })
      return
    }
    setPhase({ step: 'preview', plan: result.plan, fileName, batch, selected })
  }

  const handleFile = async (file: File) => {
    const sizeCheck = validateFileSize(file.size)
    if (!sizeCheck.ok) {
      setPhase({ step: 'error', message: 'File is too large. The limit is 5 MiB.' })
      return
    }
    const content = await file.text()
    const lower = file.name.toLowerCase()
    if (lower.endsWith('.json')) {
      const backup = parseBackup(content)
      if (!backup.ok) {
        setPhase({ step: 'error', message: backup.message })
        return
      }
      setPhase({ step: 'restore', items: backup.items, sources: backup.sources, fileName: file.name })
      return
    }
    if (lower.endsWith('.html') || lower.endsWith('.htm')) {
      const analysis = analyzeBookmarkFile(content)
      if (analysis.total > MAX_IMPORT_RECORDS) {
        setPhase({
          step: 'folders',
          batch: { fileName: file.name, content, analysis, imported: [] },
          selected: [],
        })
        return
      }
    }
    await planAndPreview(file.name, content)
  }

  const confirmPlan = async (plan: ImportPlan, batch?: BatchContext, selected?: FolderSelection[]) => {
    setBusy(true)
    try {
      const db = getDatabase(mode)
      await db.transaction('rw', db.items, db.sources, async () => {
        await db.sources.bulkAdd(plan.createSources)
        for (const merge of plan.merges) {
          const target = await db.items.get(merge.targetId)
          if (!target) continue
          await db.items.update(merge.targetId, {
            sourceIds: Array.from(new Set([...target.sourceIds, merge.addSourceId])),
            tags: Array.from(new Set([...target.tags, ...merge.addTags])),
            updatedAt: new Date().toISOString(),
          })
        }
        await db.items.bulkAdd(plan.createItems)
      })
    } catch {
      setPhase({ step: 'error', message: 'Import failed while writing. Nothing was saved.' })
      setBusy(false)
      return
    }
    setBusy(false)
    if (batch && selected) {
      onImported()
      setPhase({
        step: 'batch-done',
        batch: { ...batch, imported: mergeSelections(batch.imported, selected) },
        added: plan.summary.valid,
        merged: plan.summary.duplicates,
      })
      return
    }
    onDone()
  }

  const confirmRestore = async (restoreItems: Item[], restoreSources: Source[]) => {
    setBusy(true)
    try {
      const db = getDatabase(mode)
      await db.transaction('rw', db.items, db.sources, async () => {
        await db.sources.bulkPut(restoreSources)
        await db.items.bulkPut(restoreItems)
      })
      onDone()
    } catch {
      setPhase({ step: 'error', message: 'Restore failed while writing. Nothing was saved.' })
      setBusy(false)
    }
  }

  return (
    <>
      {phase.step === 'pick' && (
        <div className="modal-form">
          <h2>Import your collection</h2>
          <p className="form-hint-left">
            Bookmarks (.html), subscriptions (.opml), feeds (.xml/.rss/.atom),
            notes (.txt/.md), or an EchoShelf backup (.json). Max 5 MiB. Up to 1,000
            records per import; larger bookmark files are imported folder by folder.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".html,.htm,.opml,.xml,.rss,.atom,.txt,.md,.json"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
            }}
          />
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase.step === 'folders' && (
        <FolderPicker
          fileName={phase.batch.fileName}
          analysis={phase.batch.analysis}
          selected={phase.selected}
          imported={phase.batch.imported}
          onChange={(selected) => setPhase({ ...phase, selected })}
          onContinue={() =>
            void planAndPreview(phase.batch.fileName, phase.batch.content, phase.batch, phase.selected)
          }
          onCancel={phase.batch.imported.length > 0 ? onDone : onCancel}
        />
      )}

      {phase.step === 'preview' && (
        <div className="modal-form">
          <h2>Import preview</h2>
          <p className="form-hint-left">{phase.plan.createSources[0]?.name ?? phase.fileName}</p>
          <div className="preview-stats">
            <span><strong>{phase.plan.summary.valid}</strong> new</span>
            <span><strong>{phase.plan.summary.duplicates}</strong> duplicates</span>
            <span><strong>{phase.plan.summary.invalid}</strong> invalid</span>
            {phase.plan.subscriptionCount > 0 && (
              <span><strong>{phase.plan.subscriptionCount}</strong> subscriptions</span>
            )}
            {phase.plan.articleCount > 0 && (
              <span><strong>{phase.plan.articleCount}</strong> articles</span>
            )}
          </div>
          <ul className="preview-list">
            {phase.plan.summary.details.map((d, i) => (
              <li key={i} className={`preview-row preview-${d.status}`}>
                <span className="preview-title">{d.title}</span>
                <span className="preview-status">{d.status}</span>
                {d.message && <span className="preview-message">{d.message}</span>}
              </li>
            ))}
          </ul>
          <div className="form-actions">
            {phase.batch ? (
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() =>
                  phase.batch &&
                  setPhase({ step: 'folders', batch: phase.batch, selected: phase.selected ?? [] })
                }
              >
                Back to folders
              </button>
            ) : (
              <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
                Cancel
              </button>
            )}
            <button
              type="button"
              className="btn-primary"
              disabled={busy || (phase.plan.summary.valid === 0 && phase.plan.merges.length === 0)}
              onClick={() => void confirmPlan(phase.plan, phase.batch, phase.selected)}
            >
              {busy ? 'Importing…' : 'Confirm import'}
            </button>
          </div>
        </div>
      )}

      {phase.step === 'batch-done' && (
        <div className="modal-form">
          <h2>Batch imported</h2>
          <p className="form-hint-left" role="status">
            {phase.added.toLocaleString('en-US')} new,{' '}
            {phase.merged.toLocaleString('en-US')} already in your library.
          </p>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onDone}>
              Done
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setPhase({ step: 'folders', batch: phase.batch, selected: [] })}
            >
              Choose more folders
            </button>
          </div>
        </div>
      )}

      {phase.step === 'restore' && (
        <div className="modal-form">
          <h2>Restore backup</h2>
          <p className="form-hint-left">
            {phase.fileName}: {phase.items.length} items, {phase.sources.length} sources.
            Records are merged by id; existing items with the same id are replaced.
          </p>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => void confirmRestore(phase.items, phase.sources)}
            >
              {busy ? 'Restoring…' : 'Restore'}
            </button>
          </div>
        </div>
      )}

      {phase.step === 'error' && (
        <div className="modal-form">
          <h2>Import failed</h2>
          <p className="form-error" role="alert">{phase.message}</p>
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPhase({ step: 'pick' })}
            >
              Choose another file
            </button>
            <button type="button" className="btn-primary" onClick={onCancel}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}