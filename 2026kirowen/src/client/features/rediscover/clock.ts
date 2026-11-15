/** Clock abstraction so date rules are deterministic in tests (R8 AC8). */
export interface Clock {
  now(): Date
}

/** Production clock backed by the system time. */
export const realClock: Clock = {
  now: () => new Date(),
}

/** Test clock pinned to a fixed instant. */
export function fixedClock(instant: Date): Clock {
  return { now: () => new Date(instant.getTime()) }
}