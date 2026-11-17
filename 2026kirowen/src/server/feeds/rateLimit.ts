/**
 * Fixed-window rate limiter keyed by client IP (Requirement 9 AC12).
 * In memory: correct for a single server instance, which is how the free
 * hosting plan runs. Pure apart from the injected clock.
 */
export type RateDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number }

export interface RateLimiter {
  take(key: string, now?: number): RateDecision
}

const PRUNE_THRESHOLD = 1000

export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('limit must be a positive integer')
  if (!(windowMs > 0)) throw new Error('windowMs must be positive')
  const windows = new Map<string, { start: number; count: number }>()

  const prune = (now: number) => {
    if (windows.size < PRUNE_THRESHOLD) return
    for (const [key, entry] of windows) {
      if (now - entry.start >= windowMs) windows.delete(key)
    }
  }

  return {
    take(key: string, now: number = Date.now()): RateDecision {
      const entry = windows.get(key)
      if (entry == null || now - entry.start >= windowMs) {
        prune(now)
        windows.set(key, { start: now, count: 1 })
        return { allowed: true }
      }
      if (entry.count < limit) {
        entry.count += 1
        return { allowed: true }
      }
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.start + windowMs - now) / 1000)),
      }
    },
  }
}