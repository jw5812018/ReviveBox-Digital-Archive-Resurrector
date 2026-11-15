import type { Source, FeedFetchState } from '@shared/models/types'

interface SubscriptionsProps {
  feeds: Source[]
  refreshingId: string | null
  onRefresh: (source: Source) => void
}

const STATE_TEXT: Record<FeedFetchState, string> = {
  ok: 'Up to date',
  timeout: 'Timed out',
  'http-error': 'Server error',
  'invalid-format': 'Invalid feed format',
  'redirect-limit': 'Too many redirects',
  'network-error': 'Network error',
}

/** Subscriptions with manual refresh and per-feed status (R9 AC4, AC9). */
export function Subscriptions({ feeds, refreshingId, onRefresh }: SubscriptionsProps) {
  if (feeds.length === 0) return null
  return (
    <section className="subscriptions" aria-label="Subscriptions">
      <h2 className="subscriptions-title">Subscriptions</h2>
      <ul className="subscriptions-list">
        {feeds.map((feed) => {
          const status = feed.lastFetchStatus
          return (
            <li key={feed.id} className="subscriptions-row">
              <div className="subscriptions-info">
                <span className="subscriptions-name">{feed.name}</span>
                <span className={`subscriptions-status${status && status.state !== 'ok' ? ' is-error' : ''}`}>
                  {status
                    ? `${STATE_TEXT[status.state]}${status.detail ? ` — ${status.detail}` : ''}`
                    : 'Not fetched yet'}
                </span>
              </div>
              <button
                type="button"
                className="btn-secondary btn-small"
                disabled={refreshingId === feed.id}
                onClick={() => onRefresh(feed)}
              >
                {refreshingId === feed.id ? 'Refreshing…' : 'Refresh'}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}