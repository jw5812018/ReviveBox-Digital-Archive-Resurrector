import type { Item, Source } from '@shared/models/types'
import { validateUrl } from '@shared/urls/validateUrl'

/** Backup schema version; only v1 is readable (R7 AC6-7). */
export const BACKUP_SCHEMA_VERSION = '1'

export interface BackupFile {
  schemaVersion: string
  exportedAt: string
  items: Item[]
  sources: Source[]
}

/** Serializes the full library to a versioned JSON backup (R7 AC4-5). */
export function buildBackup(
  items: Item[],
  sources: Source[],
  now: Date = new Date(),
): string {
  const backup: BackupFile = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    items,
    sources,
  }
  return JSON.stringify(backup, null, 2)
}

const ITEM_KINDS = new Set(['bookmark', 'article', 'note'])
const SOURCE_KINDS = new Set(['bookmark-file', 'feed', 'note-file', 'manual', 'demo', 'backup'])

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isValidItem(v: unknown): v is Item {
  if (!isRecord(v)) return false
  if (typeof v.id !== 'string' || v.id.length === 0) return false
  if (typeof v.kind !== 'string' || !ITEM_KINDS.has(v.kind)) return false
  if (typeof v.title !== 'string' || v.title.length === 0 || v.title.length > 255) return false
  if (!Array.isArray(v.tags) || !v.tags.every((t) => typeof t === 'string')) return false
  if (!Array.isArray(v.sourceIds) || !v.sourceIds.every((s) => typeof s === 'string')) return false
  if (typeof v.savedAt !== 'string' || Number.isNaN(new Date(v.savedAt).getTime())) return false
  if (v.readAt != null && typeof v.readAt !== 'string') return false
  if (typeof v.starred !== 'boolean') return false
  for (const key of ['originalUrl', 'canonicalUrl'] as const) {
    const url = v[key]
    if (url != null) {
      if (typeof url !== 'string') return false
      const check = validateUrl(url)
      if (!check.ok) return false
    }
  }
  return true
}

function isValidSource(v: unknown): v is Source {
  if (!isRecord(v)) return false
  if (typeof v.id !== 'string' || v.id.length === 0) return false
  if (typeof v.kind !== 'string' || !SOURCE_KINDS.has(v.kind)) return false
  if (typeof v.name !== 'string' || v.name.length === 0) return false
  if (v.feedUrl != null && typeof v.feedUrl !== 'string') return false
  return true
}

export type BackupParseResult =
  | { ok: true; items: Item[]; sources: Source[] }
  | { ok: false; message: string }

/**
 * Validates a backup file before anything is written (R7 AC6-7):
 * version, structure, field types, URL protocols, and referential integrity.
 */
export function parseBackup(json: string): BackupParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { ok: false, message: 'The backup file is not valid JSON.' }
  }
  if (!isRecord(raw)) {
    return { ok: false, message: 'The backup file has an unexpected structure.' }
  }
  if (raw.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    return { ok: false, message: 'Unsupported backup version. This build reads v1 backups.' }
  }
  if (!Array.isArray(raw.items) || !Array.isArray(raw.sources)) {
    return { ok: false, message: 'The backup is missing items or sources.' }
  }
  const items = raw.items as unknown[]
  const sources = raw.sources as unknown[]
  if (!items.every(isValidItem) || !sources.every(isValidSource)) {
    return { ok: false, message: 'The backup contains invalid records.' }
  }
  const sourceIds = new Set((sources as Source[]).map((s) => s.id))
  for (const item of items as Item[]) {
    if (!item.sourceIds.every((id) => sourceIds.has(id))) {
      return { ok: false, message: 'The backup has items pointing to missing sources.' }
    }
  }
  return { ok: true, items: items as Item[], sources: sources as Source[] }
}