import { addSource, getAllSources } from '@client/storage/sourceService'
import type { LibraryMode } from '@client/storage/db'
import type { Source } from '@shared/models/types'

const MANUAL_SOURCE_NAME = 'Manual entry'

/**
 * Returns the per-library "manual" source, creating it on first use.
 * Manually added notes/bookmarks reference this source (R4).
 */
export async function ensureManualSource(mode: LibraryMode): Promise<Source> {
  const existing = (await getAllSources(mode)).find(
    (s) => s.kind === 'manual',
  )
  if (existing) return existing
  const source: Source = {
    id: crypto.randomUUID(),
    kind: 'manual',
    name: MANUAL_SOURCE_NAME,
  }
  await addSource(source, mode)
  return source
}