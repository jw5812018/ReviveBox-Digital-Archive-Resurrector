import { ImportErrorType } from '@shared/models/types'

/** Import file size cap: 5 MiB (R2 AC7, R3 AC1/AC3, R4 AC10). */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

/** Max records processed per import batch (R2 AC8, R5 AC10). */
export const MAX_IMPORT_RECORDS = 1000

/** Imported titles: 1-255 chars (R2 AC2, R3 AC2). */
export const TITLE_MAX_IMPORT = 255

/** Manual bookmark form title: 1-200 chars (R4 AC11). */
export const TITLE_MAX_FORM = 200

/** Note body / article body cap: 100,000 chars (R3 AC6, R4 AC7). */
export const BODY_MAX_LENGTH = 100_000

export type LengthCheck =
  | { ok: true }
  | { ok: false; error: ImportErrorType }

/** Returns FileTooLarge when the byte size exceeds the 5 MiB cap. */
export function validateFileSize(sizeBytes: number): LengthCheck {
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: ImportErrorType.FileTooLarge }
  }
  return { ok: true }
}

/**
 * Validates a trimmed title against [1, maxLength].
 * Missing/empty maps to MissingTitle; over-length maps to TitleTooLong.
 */
export function validateTitle(
  raw: string | undefined | null,
  maxLength: number = TITLE_MAX_IMPORT,
): LengthCheck {
  if (raw == null) return { ok: false, error: ImportErrorType.MissingTitle }
  const title = raw.trim()
  if (title.length === 0) {
    return { ok: false, error: ImportErrorType.MissingTitle }
  }
  if (title.length > maxLength) {
    return { ok: false, error: ImportErrorType.TitleTooLong }
  }
  return { ok: true }
}

/** Validates note/article body length (over-limit is handled by callers as truncation or rejection). */
export function validateBodyLength(raw: string | undefined | null): LengthCheck {
  if (raw != null && raw.length > BODY_MAX_LENGTH) {
    return { ok: false, error: ImportErrorType.ContentTruncated }
  }
  return { ok: true }
}