import type { ImportDetail } from '@shared/models/types'

/** Aggregate counts shown in the import preview (R5 AC2). */
export interface ImportSummary {
  total: number
  valid: number
  duplicates: number
  invalid: number
  details: ImportDetail[]
}

/** Builds preview statistics from per-record outcomes. */
export function buildImportSummary(details: ImportDetail[]): ImportSummary {
  let valid = 0
  let duplicates = 0
  let invalid = 0
  for (const detail of details) {
    if (detail.status === 'new') valid += 1
    else if (detail.status === 'duplicate') duplicates += 1
    else invalid += 1
  }
  return { total: details.length, valid, duplicates, invalid, details }
}