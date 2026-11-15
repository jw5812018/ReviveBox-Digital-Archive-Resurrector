import { getDatabase } from '@client/storage/db'
import { buildDemoData } from './demoData'

/**
 * Demo library lifecycle (R1 AC2, AC5, AC6).
 * Demo data lives only in the 'echoshelf-demo' IndexedDB database.
 */

/** Seeds the demo database when empty; returns the number of items present. */
export async function initializeDemoLibrary(): Promise<number> {
  const db = getDatabase('demo')
  const existing = await db.items.count()
  if (existing > 0) return existing
  const { sources, items } = buildDemoData()
  await db.transaction('rw', db.items, db.sources, async () => {
    await db.sources.bulkAdd(sources)
    await db.items.bulkAdd(items)
  })
  return items.length
}

/** Clears the demo database and re-seeds it. Never touches personal data. */
export async function resetDemoLibrary(): Promise<void> {
  const db = getDatabase('demo')
  await db.transaction('rw', db.items, db.sources, async () => {
    await db.items.clear()
    await db.sources.clear()
  })
  const { sources, items } = buildDemoData()
  await db.transaction('rw', db.items, db.sources, async () => {
    await db.sources.bulkAdd(sources)
    await db.items.bulkAdd(items)
  })
}