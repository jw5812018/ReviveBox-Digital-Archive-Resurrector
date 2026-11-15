import { useRef, useState } from 'react'
import type { Item, Source } from '@shared/models/types'
import { planImport, type ImportPlan } from '@shared/import/pipeline'
import { parseBackup } from '@shared/import/backup'
import { validateFileSize } from '@shared/import/limits'
import { getDatabase, type LibraryMode } from '@client/storage/db'

interface ImportModalProps {
  mode: LibraryMode
  items: Item[]
  sources: Source[]
  onDone: () => void
  onCancel: () => void
}

type Phase =
  | { step: 'pick' }
  | { step: 'preview'; plan: ImportPlan; fileName: string }
  | { step: 'restore'; items: Item[]; sources: Source[]; fileName: string }
  | { step: 'error'; message: string }

/** Import flow: file → parse → preview → confirm writes in a transaction (R5, R7 AC6-7). */
export function ImportModal({ mode, items, sources, onDone, onCancel }: ImportModalProps) {
  const [phase, setPhase] = useState<Phase>({ step: 'pick' })
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    const sizeCheck = validateFileSize(file.size)
    if (!sizeCheck.ok) {
      setPhase({ step: 'error', message: 'File is too large. The limit is 5 MiB.' })
      return
    }
    const content = await file.text()
    if (file.name.toLowerCase().endsWith('.json')) {
      const backup = parseBackup(content)
      if (!backup.ok) {
        setPhase({ step: 'error', message: backup.message })
        return
      }
      setPhase({ step: 'restore', items: backup.items, sources: backup.sources, fileName: file.name })
      return
    }
    const result = await planImport(file.name, content, items, sources)
    if (!result.ok) {
      setPhase({ step: 'error', message: result.message })
      return
    }
    setPhase({ step: 'preview', plan: result.plan, fileName: file.name })
  }

  const confirmPlan = async (plan: ImportPlan) => {
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
      onDone()
    } catch {
      setPhase({ step: 'error', message: 'Import failed while writing. Nothing was saved.' })
      setBusy(false)
    }
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
    <div className="modal-backdrop" role="presentation">
      <div className="modal modal-wide" role="dialog" aria-modal="true" aria-label="Import">
        {phase.step === 'pick' && (
          <div className="modal-form">
            <h2>Import your collection</h2>
            <p className="form-hint-left">
              Bookmarks (.html), subscriptions (.opml), feeds (.xml/.rss/.atom),
              notes (.txt/.md), or an EchoShelf backup (.json). Max 5 MiB, 1,000 records.
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

        {phase.step === 'preview' && (
          <div className="modal-form">
            <h2>Import preview</h2>
            <p className="form-hint-left">{phase.fileName}</p>
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
              <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={busy || (phase.plan.summary.valid === 0 && phase.plan.merges.length === 0)}
                onClick={() => void confirmPlan(phase.plan)}
              >
                {busy ? 'Importing…' : 'Confirm import'}
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
      </div>
    </div>
  )
}