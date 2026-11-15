interface DashboardProps {
  onTryDemo: () => void
  onImport: () => void
}

/** First-run entry: demo vs import, no login (R1 AC1), with downloadable sample files. */
export function Dashboard({ onTryDemo, onImport }: DashboardProps) {
  return (
    <div className="dashboard">
      <h1 className="dashboard-brand">EchoShelf</h1>
      <p className="dashboard-tagline">
        EchoShelf brings your forgotten web back into view.
      </p>
      <p className="dashboard-sub">
        Your bookmarks, feeds and notes — searchable, browsable, rediscoverable.
        Everything stays in this browser; no account needed.
      </p>
      <div className="dashboard-actions">
        <button type="button" className="btn-primary btn-large" onClick={onTryDemo}>
          Try the demo
        </button>
        <button type="button" className="btn-secondary btn-large" onClick={onImport}>
          Import your collection
        </button>
      </div>
      <p className="dashboard-samples">
        Sample files to try importing:{' '}
        <a href="demo/sample-bookmarks.html" download>bookmarks.html</a>
        {' · '}
        <a href="demo/sample-subscriptions.opml" download>subscriptions.opml</a>
        {' · '}
        <a href="demo/sample-feed.xml" download>feed.xml</a>
        {' · '}
        <a href="demo/sample-note.md" download>note.md</a>
      </p>
    </div>
  )
}