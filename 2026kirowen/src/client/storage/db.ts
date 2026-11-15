import Dexie, { type Table } from 'dexie'
import type { Item, Source } from '@shared/models/types'

/**
 * Database names: demo and personal libraries are fully isolated (R1 AC5).
 */
export const PERSONAL_DB_NAME = 'echoshelf-user'
export const DEMO_DB_NAME = 'echoshelf-demo'

export type LibraryMode = 'personal' | 'demo'

export class EchoShelfDB extends Dexie {
  items!: Table<Item, string>
  sources!: Table<Source, string>

  constructor(name: string) {
    super(name)
    // Schema v1. Indexes cover lookup (canonicalUrl), sorting (savedAt),
    // and the R6 filters (kind, starred, readAt, tags).
    this.version(1).stores({
      items:
        'id, kind, savedAt, canonicalUrl, starred, readAt, *tags, *sourceIds',
      sources: 'id, kind, feedUrl',
    })
  }
}

const instances = new Map<LibraryMode, EchoShelfDB>()

/** Returns the database for the given library mode (memoized per name). */
export function getDatabase(mode: LibraryMode): EchoShelfDB {
  const existing = instances.get(mode)
  if (existing) return existing
  const db = new EchoShelfDB(
    mode === 'demo' ? DEMO_DB_NAME : PERSONAL_DB_NAME,
  )
  instances.set(mode, db)
  return db
}

/** Test helper: close and forget memoized connections. */
export async function closeAllDatabases(): Promise<void> {
  for (const db of instances.values()) {
    db.close()
  }
  instances.clear()
}