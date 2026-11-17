import { describe, expect, it } from 'vitest'
import { createRateLimiter } from '@server/feeds/rateLimit'

describe('createRateLimiter', () => {
  it('allows the limit per window, then reports when to retry', () => {
    const limiter = createRateLimiter(3, 10_000)
    expect(limiter.take('a', 0)).toEqual({ allowed: true })
    expect(limiter.take('a', 100)).toEqual({ allowed: true })
    expect(limiter.take('a', 200)).toEqual({ allowed: true })
    expect(limiter.take('a', 1_000)).toEqual({ allowed: false, retryAfterSeconds: 9 })
  })

  it('keeps separate windows per key', () => {
    const limiter = createRateLimiter(1, 10_000)
    expect(limiter.take('a', 0).allowed).toBe(true)
    expect(limiter.take('b', 0).allowed).toBe(true)
    expect(limiter.take('a', 1).allowed).toBe(false)
  })

  it('starts a new window once the old one has passed', () => {
    const limiter = createRateLimiter(1, 10_000)
    expect(limiter.take('a', 0).allowed).toBe(true)
    expect(limiter.take('a', 9_999).allowed).toBe(false)
    expect(limiter.take('a', 10_000).allowed).toBe(true)
  })

  it('rejects invalid settings', () => {
    expect(() => createRateLimiter(0, 1000)).toThrow()
    expect(() => createRateLimiter(1, 0)).toThrow()
  })
})