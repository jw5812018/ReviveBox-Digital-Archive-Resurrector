import { getDatabase, type LibraryMode } from './db'
import type { Item } from '@shared/models/types'

export async function getItemById(
  id: string,
  mode: LibraryMode = 'personal',
): Promise<Item | undefined> {
  return getDatabase(mode).items.get(id)
}

export async function getAllItems(
  mode: LibraryMode = 'personal',
): Promise<Item[]> {
  return getDatabase(mode).items.toArray()
}

export async function addItem(
  item: Item,
  mode: LibraryMode = 'personal',
): Promise<void> {
  await getDatabase(mode).items.add(item)
}

export async function updateItem(
  id: string,
  updates: Partial<Item>,
  mode: LibraryMode = 'personal',
): Promise<void> {
  const patch: Partial<Item> = {
    ...updates,
    updatedAt: updates.updatedAt ?? new Date().toISOString(),
  }
  await getDatabase(mode).items.update(id, patch)
}

export async function deleteItem(
  id: string,
  mode: LibraryMode = 'personal',
): Promise<void> {
  await getDatabase(mode).items.delete(id)
}