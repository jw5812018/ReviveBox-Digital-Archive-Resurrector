import type { ReactNode } from 'react'

interface LayoutProps {
  sidebar: ReactNode
  header: ReactNode
  main: ReactNode
  detail: ReactNode
  detailOpen: boolean
  sidebarOpen: boolean
  onCloseSidebar: () => void
}

/** App shell: sidebar / header+main / detail panel (R10 AC1-2). */
export function Layout({
  sidebar,
  header,
  main,
  detail,
  detailOpen,
  sidebarOpen,
  onCloseSidebar,
}: LayoutProps) {
  return (
    <div className="layout">
      <button
        type="button"
        className={`sidebar-backdrop${sidebarOpen ? ' is-open' : ''}`}
        aria-label="Close menu"
        onClick={onCloseSidebar}
        tabIndex={sidebarOpen ? 0 : -1}
      />
      <aside className={`layout-sidebar${sidebarOpen ? ' is-open' : ''}`}>
        {sidebar}
      </aside>
      <div className="layout-body">
        <header className="layout-header">{header}</header>
        <main className="layout-main">{main}</main>
      </div>
      <aside
        className={`layout-detail${detailOpen ? ' is-open' : ''}`}
        aria-hidden={!detailOpen}
      >
        {detail}
      </aside>
    </div>
  )
}