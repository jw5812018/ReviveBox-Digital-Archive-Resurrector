import { useState } from 'react'
import { BODY_MAX_LENGTH } from '@shared/import/limits'

interface AddNoteFormProps {
  onSave: (title: string, body: string) => Promise<void>
  onCancel: () => void
}

/** Note creation form (R4 AC1-2, AC7). */
export function AddNoteForm({ onSave, onCancel }: AddNoteFormProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim().length === 0) {
      setError('Please enter a title.')
      return
    }
    if (body.length > BODY_MAX_LENGTH) {
      setError('Note content is too long (max 100,000 characters).')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(title.trim(), body)
    } catch {
      setError('Saving failed. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form className="modal-form" onSubmit={handleSubmit}>
      <h2>Add note</h2>
      <label>
        Title
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </label>
      <label>
        Note
        <textarea
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <p className="form-hint">
        {body.length.toLocaleString()} / {BODY_MAX_LENGTH.toLocaleString()} characters
      </p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save note'}
        </button>
      </div>
    </form>
  )
}