import type { Item, Source } from '@shared/models/types'

interface ItemDetailProps {
  item: Item
  sources: Source[]
  onToggleRead: (item: Item) => void
  onToggleStar: (item: Item) => void
  onClose: () => void
}

/** Detail panel: full record, read/star actions, safe external link (R6 AC9-10). */
export function ItemDetail({
  item,
  sources,
  onToggleRead,
  onToggleStar,
  onClose,
}: ItemDetailProps) {
  const sourceNames = item.sourceIds
    .map((id) => sources.find((s) => s.id === id)?.name)
    .filter((n): n is string => Boolean(n))

  return (
    <div className="detail" role="region" aria-label="Item details">
      <div className="detail-header">
        <button type="button" className="detail-close" aria-label="Close details" onClick={onClose}>
          ×
        </button>
      </div>
      <h2 className="detail-title">{item.title}</h2>
      <dl className="detail-meta">
        <div>
          <dt>Type</dt>
          <dd>{item.kind}</dd>
        </div>
        <div>
          <dt>Saved</dt>
          <dd>
            <time dateTime={item.savedAt}>
              {new Date(item.savedAt).toLocaleString()}
            </time>
            {item.dateSource === 'imported' && ' (import date)'}
          </dd>
        </div>
        {sourceNames.length > 0 && (
          <div>
            <dt>Sources</dt>
            <dd>{sourceNames.join(', ')}</dd>
          </div>
        )}
        {item.tags.length > 0 && (
          <div>
            <dt>Tags</dt>
            <dd>
              {item.tags.map((tag) => (
                <span key={tag} className="item-tag">{tag}</span>
              ))}
            </dd>
          </div>
        )}
      </dl>
      {item.body != null && item.body !== '' && (
        <section className="detail-body">
          <h3>Saved text</h3>
          <pre>{item.body}</pre>
        </section>
      )}
      {item.originalUrl && (
        <p>
          <a
            href={item.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="detail-link"
          >
            Open original
          </a>
        </p>
      )}
      <div className="detail-actions">
        <button type="button" className="btn-secondary" onClick={() => onToggleRead(item)}>
          {item.readAt == null ? 'Mark as read' : 'Mark as unread'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => onToggleStar(item)}>
          {item.starred ? 'Unstar' : 'Star'}
        </button>
      </div>
    </div>
  )
}