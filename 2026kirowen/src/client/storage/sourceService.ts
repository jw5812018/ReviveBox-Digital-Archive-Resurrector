import { getDatabase, type LibraryMode } from './db'
import type { Source } from '@shared/models/types'

export async function getSourceById(
  id: string,
  mode: LibraryMode = 'personal',
): Promise<Source | undefined> {
  return getDatabase(mode).sources.get(id)
}

export async function getAllSources(
  mode: LibraryMode = 'personal',
): Promise<Source[]> {
  return getDatabase(mode).sources.toArray()
}

export async function addSource(
  source: Source,
  mode: LibraryMode = 'personal',
): Promise<void> {
  await getDatabase(mode).sources.add(source)
}

export async function updateSource(
  id: string,
  updates: Partial<Source>,
  mode: LibraryMode = 'personal',
): Promise<void> {
  await getDatabase(mode).sources.update(id, updates)
}