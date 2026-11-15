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
      <input
        type="search"
        className="header-search"
        placeholder="Search title, body, tags, URL…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        aria-label="Search items"
      />
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