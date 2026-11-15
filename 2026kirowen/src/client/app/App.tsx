import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Item, Source } from '@shared/models/types'
import { addItem, getAllItems, updateItem } from '@client/storage/itemService'
import { getAllSources } from '@client/storage/sourceService'
import type { LibraryMode } from '@client/storage/db'
import { normalizeUrl } from '@shared/urls/normalizeUrl'
import { buildBackup } from '@shared/import/backup'
import { Layout } from './Layout'
import { Modal } from './Modal'
import { ErrorCard } from './States'
import { Header } from './Header'
import { Dashboard } from './Dashboard'
import { Sidebar, type ViewKind } from './Sidebar'
import { filterItems } from '@client/features/library/filterItems'
import { ItemList } from '@client/features/library/ItemList'
import { ItemDetail } from '@client/features/library/ItemDetail'
import { RediscoverPanel } from '@client/features/rediscover/RediscoverPanel'
import { selectRediscover } from '@client/features/rediscover/rediscover'
import { refreshFeed } from '@client/features/sources/feedRefresh'
import { AddNoteForm } from '@client/features/library/AddNoteForm'
import { AddBookmarkForm } from '@client/features/library/AddBookmarkForm'
import { ImportModal } from '@client/features/import/ImportModal'
import { ensureManualSource } from '@client/features/library/manualSource'
import {
  initializeDemoLibrary,
  resetDemoLibrary,
} from '@client/features/library/demoLibrary'

type Modal = 'note' | 'bookmark' | 'import' | null

export default function App() {
  const [mode, setMode] = useState<LibraryMode>(() => {
    // Persist library mode so a refresh stays on the same shelf.
    return localStorage.getItem('echoshelf-mode') === 'demo' ? 'demo' : 'personal'
  })
  const [view, setView] = useState<ViewKind>('all')
  const [items, setItems] = useState<Item[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<Modal>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [refreshingFeedId, setRefreshingFeedId] = useState<string | null>(null)
  const lastRefreshAt = useRef<Map<string, number>>(new Map())

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [loadedItems, loadedSources] = await Promise.all([
        getAllItems(mode),
        getAllSources(mode),
      ])
      setItems(loadedItems)
      setSources(loadedSources)
    } catch {
      setError('Could not load the library. Check browser storage access.')
    } finally {
      setLoading(false)
    }
  }, [mode])

  useEffect(() => {
    // Defer the async load past the effect body: IndexedDB is an external
    // system, so the state update must not run synchronously in the effect.
    const id = queueMicrotask(() => void reload())
    return () => {
      // queueMicrotask has no cancel API; reload is idempotent so this is safe.
      void id
    }
  }, [reload])

  useEffect(() => {
    localStorage.setItem('echoshelf-mode', mode)
  }, [mode])

  const rediscover = useMemo(() => selectRediscover(items), [items])

  const visibleItems = useMemo(
    () => filterItems(items, view, query),
    [items, view, query],
  )

  const rediscoverItems = useMemo(() => {
    const q = query.trim().normalize('NFC').toLowerCase()
    if (q.length === 0) return rediscover.items
    return rediscover.items.filter((item) =>
      [item.title, item.body ?? '', ...item.tags].some((text) =>
        text.normalize('NFC').toLowerCase().includes(q),
      ),
    )
  }, [rediscover, query])

  const counts = useMemo(
    () => ({
      all: items.length,
      bookmark: items.filter((i) => i.kind === 'bookmark').length,
      article: items.filter((i) => i.kind === 'article').length,
      note: items.filter((i) => i.kind === 'note').length,
      starred: items.filter((i) => i.starred).length,
    }),
    [items],
  )

  const demoStats = useMemo(
    () => ({
      bookmarks: items.filter((i) => i.kind === 'bookmark').length,
      feeds: sources.filter((s) => s.kind === 'feed').length,
      articles: items.filter((i) => i.kind === 'article').length,
    }),
    [items, sources],
  )

  const selectedItem = selectedId
    ? items.find((i) => i.id === selectedId)
    : undefined

  const showDashboard =
    mode === 'personal' && !loading && items.length === 0 && error == null

  const handleSelect = (id: string) => {
    setSelectedId((current) => (current === id ? null : id))
  }

  const handleRediscoverSelect = (id: string) => {
    const item = items.find((i) => i.id === id)
    setSelectedId((current) => (current === id ? null : id))
    if (item && item.readAt == null) {
      void updateItem(
        item.id,
        { readAt: new Date().toISOString() },
        mode,
      ).then(() => reload())
    }
  }

  const handleToggleRead = async (item: Item) => {
    await updateItem(
      item.id,
      { readAt: item.readAt == null ? new Date().toISOString() : null },
      mode,
    )
    await reload()
  }

  const handleToggleStar = async (item: Item) => {
    await updateItem(item.id, { starred: !item.starred }, mode)
    await reload()
  }

  const handleAddNote = async (title: string, body: string) => {
    const source = await ensureManualSource(mode)
    const now = new Date().toISOString()
    const item: Item = {
      id: crypto.randomUUID(),
      kind: 'note',
      title,
      body,
      tags: [],
      sourceIds: [source.id],
      createdAt: now,
      updatedAt: now,
      savedAt: now,
      readAt: null,
      starred: false,
      isSample: mode === 'demo',
      dateSource: 'original',
    }
    await addItem(item, mode)
    setModal(null)
    await reload()
    setSelectedId(item.id)
  }

  const handleAddBookmark = async (title: string, url: string) => {
    const source = await ensureManualSource(mode)
    const now = new Date().toISOString()
    const item: Item = {
      id: crypto.randomUUID(),
      kind: 'bookmark',
      title,
      originalUrl: url,
      canonicalUrl: normalizeUrl(url) ?? undefined,
      tags: [],
      sourceIds: [source.id],
      createdAt: now,
      updatedAt: now,
      savedAt: now,
      readAt: null,
      starred: false,
      isSample: mode === 'demo',
      dateSource: 'original',
    }
    await addItem(item, mode)
    setModal(null)
    await reload()
    setSelectedId(item.id)
  }

  const handleTryDemo = async () => {
    await initializeDemoLibrary()
    setMode('demo')
    setView('all')
    setSelectedId(null)
  }

  const handleResetDemo = async () => {
    await resetDemoLibrary()
    setSelectedId(null)
    await reload()
  }

  const handleLeaveDemo = () => {
    setMode('personal')
    setView('all')
    setSelectedId(null)
  }

  const handleRefreshFeed = async (source: Source) => {
    // Client-side debounce: ignore repeat clicks within 5 seconds (R9 AC9).
    const now = Date.now()
    const last = lastRefreshAt.current.get(source.id) ?? 0
    if (now - last < 5000 || refreshingFeedId != null) return
    lastRefreshAt.current.set(source.id, now)
    setRefreshingFeedId(source.id)
    try {
      await refreshFeed(source, mode, items)
    } finally {
      setRefreshingFeedId(null)
      await reload()
    }
  }

  const handleExport = async () => {
    const json = buildBackup(items, sources)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `echoshelf-backup-${mode}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Layout
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
        sidebar={
          <Sidebar
            view={view}
            counts={counts}
            onSelect={(next) => {
              setView(next)
              setSelectedId(null)
              setSidebarOpen(false)
            }}
            onImport={() => setModal('import')}
            onExport={() => void handleExport()}
            feeds={sources.filter((s) => s.kind === 'feed' && s.feedUrl != null)}
            refreshingFeedId={refreshingFeedId}
            onRefreshFeed={(source) => void handleRefreshFeed(source)}
            onTryDemo={() => void handleTryDemo()}
          />
        }
        header={
          <Header
            query={query}
            onQueryChange={setQuery}
            onAddNote={() => setModal('note')}
            onAddBookmark={() => setModal('bookmark')}
            onToggleSidebar={() => setSidebarOpen((open) => !open)}
          />
        }
        main={
          error ? (
            <ErrorCard message={error} onRetry={() => void reload()} />
          ) : showDashboard ? (
            <Dashboard
              onTryDemo={() => void handleTryDemo()}
              onImport={() => setModal('import')}
            />
          ) : (
            <>
              {mode === 'demo' && (
                <div className="demo-banner" role="status">
                  <span>
                    Sample data generated for this demo — {demoStats.bookmarks}{' '}
                    bookmarks, {demoStats.feeds} feeds, {demoStats.articles}{' '}
                    articles. Your personal library is untouched.
                  </span>
                  <span className="demo-banner-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => void handleResetDemo()}
                    >
                      Reset demo
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleLeaveDemo}
                    >
                      Back to personal
                    </button>
                  </span>
                </div>
              )}
              {view === 'rediscover' ? (
                <RediscoverPanel
                  items={rediscoverItems}
                  rule={rediscover.rule}
                  selectedId={selectedId}
                  onSelect={handleRediscoverSelect}
                />
              ) : (
                <ItemList
                  items={visibleItems}
                  loading={loading}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                />
              )}
            </>
          )
        }
        detailOpen={selectedItem != null}
        detail={
          selectedItem ? (
            <ItemDetail
              item={selectedItem}
              sources={sources}
              onToggleRead={(i) => void handleToggleRead(i)}
              onToggleStar={(i) => void handleToggleStar(i)}
              onClose={() => setSelectedId(null)}
            />
          ) : null
        }
      />
      {modal === 'note' && (
        <Modal label="Add note" onClose={() => setModal(null)}>
          <AddNoteForm onSave={handleAddNote} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'bookmark' && (
        <Modal label="Add bookmark" onClose={() => setModal(null)}>
          <AddBookmarkForm onSave={handleAddBookmark} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'import' && (
        <Modal label="Import" wide onClose={() => setModal(null)}>
          <ImportModal
            mode={mode}
            items={items}
            sources={sources}
            onDone={() => {
              setModal(null)
              void reload()
            }}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </>
  )
}