import { useState } from 'react'
import type { Source, FeedFetchState } from '@shared/models/types'
import { isSampleFeedUrl } from '@shared/urls/feedUrls'
import { FEED_REFRESH_AVAILABLE, type FeedServiceStage } from './feedApi'

interface SubscriptionsProps {
  feeds: Source[]
  refreshingId: string | null
  refreshStage: FeedServiceStage | null
  onRefresh: (source: Source) => void
  /** Returns an error message, or null when the feed was added. */
  onAddFeed: (url: string) => Promise<string | null>
}

const STATE_TEXT: Record<FeedFetchState, string> = {
  ok: 'Up to date',
  timeout: 'Timed out',
  'http-error': 'Server error',
  'invalid-format': 'Invalid feed format',
  'redirect-limit': 'Too many redirects',
  'too-large': 'Feed too large',
  blocked: 'Blocked by safety rules',
  'rate-limited': 'Rate limited',
  'save-failed': 'Saving failed',
  'network-error': 'Network error',
}

const STAGE_TEXT: Record<FeedServiceStage, string> = {
  waking: 'Waking the feed service (free hosting sleeps when idle; this can take about a minute)…',
  fetching: 'Fetching…',
}

/** Subscriptions: add by URL, manual refresh and per-feed status (Requirement 9). */
export function Subscriptions({
  feeds,
  refreshingId,
  refreshStage,
  onRefresh,
  onAddFeed,
}: SubscriptionsProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault()
    const submitted = url
    setAdding(true)
    const message = await onAddFeed(submitted)
    setAdding(false)
    setError(message)
    // Keep anything typed while the save was running.
    if (message == null) setUrl((current) => (current === submitted ? '' : current))
  }

  return (
    <section className="subscriptions" aria-label="Subscriptions">
      <h2 className="subscriptions-title">Subscriptions</h2>
      {feeds.length > 0 && (
        <ul className="subscriptions-list">
          {feeds.map((feed) => {
            const status = feed.lastFetchStatus
            const sample = isSampleFeedUrl(feed.feedUrl)
            const refreshing = refreshingId === feed.id
            let statusText = 'Not fetched yet'
            if (sample) statusText = 'Sample feed (example domain, not fetchable)'
            else if (refreshing && refreshStage) statusText = STAGE_TEXT[refreshStage]
            else if (status) {
              statusText = `${STATE_TEXT[status.state]}${status.detail ? ` — ${status.detail}` : ''}`
            }
            const isError = !sample && !refreshing && status != null && status.state !== 'ok'
            return (
              <li key={feed.id} className="subscriptions-row">
                <div className="subscriptions-info">
                  <span className="subscriptions-name">{feed.name}</span>
                  <span
                    className={`subscriptions-status${isError ? ' is-error' : ''}`}
                    aria-live={refreshing ? 'polite' : undefined}
                  >
                    {statusText}
                  </span>
                </div>
                {!sample && FEED_REFRESH_AVAILABLE && (
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    disabled={refreshingId != null}
                    onClick={() => onRefresh(feed)}
                    aria-label={`Refresh ${feed.name}`}
                  >
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {!FEED_REFRESH_AVAILABLE && (
        <p className="subscriptions-note">
          Refreshing subscriptions online needs a separately deployed feed service, or run the
          local version (npm run dev).
        </p>
      )}
      <form className="subscriptions-add" onSubmit={(event) => void handleAdd(event)}>
        <label className="subscriptions-add-label" htmlFor="add-feed-url">
          Follow a feed
        </label>
        <div className="subscriptions-add-row">
          <input
            id="add-feed-url"
            type="url"
            inputMode="url"
            placeholder="https://site/feed.xml"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <button type="submit" className="btn-secondary btn-small" disabled={adding || url.trim() === ''}>
            Add
          </button>
        </div>
        {error && (
          <p className="subscriptions-add-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  )
}