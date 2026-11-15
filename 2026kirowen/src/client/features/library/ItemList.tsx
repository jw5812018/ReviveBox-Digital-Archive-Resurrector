import type { Item } from '@shared/models/types'
import { EmptyState, LoadingSpinner } from '@client/app/States'

interface ItemListProps {
  items: Item[]
  loading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
}

/** Item list with saved date, tags, read/star state (R6, R10 AC6/AC8). */
export function ItemList({ items, loading, selectedId, onSelect }: ItemListProps) {
  if (loading) {
    return <LoadingSpinner label="Loading your shelf…" />
  }
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing here yet"
        hint="Add a bookmark or note, or adjust your search and filters."
      />
    )
  }
  return (
    <ul className="item-list">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={`item-row${selectedId === item.id ? ' is-selected' : ''}`}
            onClick={() => onSelect(item.id)}
          >
            <span className="item-row-top">
              <span className="item-title">{item.title}</span>
              {item.isSample && (
                <span className="item-sample">Sample</span>
              )}
              {item.starred && (
                <span className="item-flag" title="Starred" aria-label="Starred">★</span>
              )}
              {item.readAt == null && (
                <span className="item-unread" aria-label="Unread" />
              )}
            </span>
            <span className="item-meta">
              <span className="item-kind">{item.kind}</span>
              <time dateTime={item.savedAt}>
                {new Date(item.savedAt).toLocaleDateString()}
              </time>
              {item.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="item-tag">{tag}</span>
              ))}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}