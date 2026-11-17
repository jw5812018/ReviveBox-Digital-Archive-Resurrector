interface HeaderProps {
  query: string
  onQueryChange: (query: string) => void
  onAddNote: () => void
  onAddBookmark: () => void
  onToggleSidebar: () => void
}

/** Top bar: sidebar toggle (narrow screens), search, add actions. */
export function Header({
  query,
  onQueryChange,
  onAddNote,
  onAddBookmark,
  onToggleSidebar,
}: HeaderProps) {
  return (
    <div className="header">
      <button
        type="button"
        className="header-menu"
        aria-label="Open menu"
        onClick={onToggleSidebar}
      >
        ☰
      </button>
      <div className="header-search-wrap">
        <svg
          className="header-search-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <line
            x1="16.5"
            y1="16.5"
            x2="21"
            y2="21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <input
          type="search"
          className="header-search"
          placeholder="Search title, body, tags, URL…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label="Search items"
        />
      </div>
      <div className="header-actions">
        <button type="button" className="btn-secondary" onClick={onAddNote}>
          Add note
        </button>
        <button type="button" className="btn-primary" onClick={onAddBookmark}>
          Add bookmark
        </button>
      </div>
    </div>
  )
}