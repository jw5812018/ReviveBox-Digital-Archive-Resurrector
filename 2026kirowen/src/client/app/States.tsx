/** Empty state with honest guidance (R10 AC8). */
export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="state-block">
      <p className="state-title">{title}</p>
      <p className="state-hint">{hint}</p>
    </div>
  )
}

/** Error state with retry (R10 AC7). */
export function ErrorCard({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="state-block" role="alert">
      <p className="state-title">Something went wrong</p>
      <p className="state-hint">{message}</p>
      <button type="button" className="btn-primary" onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}

/** Loading indicator honoring reduced-motion via CSS (R10 AC6). */
export function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state-block" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}