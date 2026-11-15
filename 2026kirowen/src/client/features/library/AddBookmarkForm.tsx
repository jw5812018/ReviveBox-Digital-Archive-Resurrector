import { useState } from 'react'
import { validateUrl } from '@shared/urls/validateUrl'
import { validateTitle, TITLE_MAX_FORM } from '@shared/import/limits'
import { ImportErrorType } from '@shared/models/types'

interface AddBookmarkFormProps {
  onSave: (title: string, url: string) => Promise<void>
  onCancel: () => void
}

const ERROR_TEXT: Partial<Record<ImportErrorType, string>> = {
  [ImportErrorType.MissingUrl]: 'Please enter a URL.',
  [ImportErrorType.UrlTooLong]: `URL must be at most 2,048 characters.`,
  [ImportErrorType.InvalidUrlProtocol]:
    'URL must use http or https. Dangerous protocols are not allowed.',
  [ImportErrorType.MissingTitle]: 'Please enter a title.',
  [ImportErrorType.TitleTooLong]: `Title must be 1-${TITLE_MAX_FORM} characters.`,
}

/** Bookmark creation form with inline validation (R4 AC3-6, AC11-12). */
export function AddBookmarkForm({ onSave, onCancel }: AddBookmarkFormProps) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const titleCheck = validateTitle(title, TITLE_MAX_FORM)
    if (!titleCheck.ok) {
      setError(ERROR_TEXT[titleCheck.error] ?? 'Invalid title.')
      return
    }
    const urlCheck = validateUrl(url)
    if (!urlCheck.ok) {
      setError(ERROR_TEXT[urlCheck.error] ?? 'Invalid URL.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(title.trim(), urlCheck.url)
    } catch {
      setError('Saving failed. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form className="modal-form" onSubmit={handleSubmit}>
      <h2>Add bookmark</h2>
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
        URL
        <input
          type="url"
          placeholder="https://example.org/article"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save bookmark'}
        </button>
      </div>
    </form>
  )
}