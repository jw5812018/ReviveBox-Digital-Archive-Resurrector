import type { ItemKind, Source } from '@shared/models/types'
import { Subscriptions } from '@client/features/sources/Subscriptions'

export type ViewKind = 'all' | ItemKind | 'starred' | 'rediscover'

interface SidebarProps {
  view: ViewKind
  counts: Record<'all' | ItemKind | 'starred', number>
  onSelect: (view: ViewKind) => void
  onImport: () => void
  onExport: () => void
  feeds: Source[]
  refreshingFeedId: string | null
  onRefreshFeed: (source: Source) => void
  onTryDemo: () => void
}

const NAV_ITEMS: Array<{ id: ViewKind; label: string }> = [
  { id: 'all', label: 'All items' },
  { id: 'bookmark', label: 'Bookmarks' },
  { id: 'article', label: 'Articles' },
  { id: 'note', label: 'Notes' },
  { id: 'starred', label: 'Starred' },
  { id: 'rediscover', label: 'Rediscover' },
]

/** Primary navigation with real counts plus import/export actions. */
export function Sidebar({ view, counts, onSelect, onImport, onExport, feeds, refreshingFeedId, onRefreshFeed, onTryDemo }: SidebarProps) {
  return (
    <nav className="sidebar" aria-label="Library views">
      <div className="sidebar-brand">
        <span className="sidebar-logo" aria-hidden="true">E</span>
        <span className="sidebar-title">EchoShelf</span>
      </div>
      <ul className="sidebar-list">
        {NAV_ITEMS.map((item) => {
          const count = item.id === 'rediscover' ? null : counts[item.id]
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`sidebar-item${view === item.id ? ' is-active' : ''}`}
                aria-current={view === item.id ? 'page' : undefined}
                onClick={() => onSelect(item.id)}
              >
                <span>{item.label}</span>
                {count != null && <span className="sidebar-count">{count}</span>}
              </button>
            </li>
          )
        })}
      </ul>
      <Subscriptions
        feeds={feeds}
        refreshingId={refreshingFeedId}
        onRefresh={onRefreshFeed}
      />
      <div className="sidebar-footer">
        <button type="button" className="btn-tertiary btn-block" onClick={onTryDemo}>
          Try the demo
        </button>
        <button type="button" className="btn-secondary btn-block" onClick={onImport}>
          Import
        </button>
        <button type="button" className="btn-secondary btn-block" onClick={onExport}>
          Export data
        </button>
      </div>
    </nav>
  )
}