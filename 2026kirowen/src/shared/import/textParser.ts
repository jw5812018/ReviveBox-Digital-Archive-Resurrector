import { ImportErrorType } from '@shared/models/types'
import { validateFileSize, BODY_MAX_LENGTH } from '@shared/import/limits'

/** One note extracted from a .txt / .md file (R4 AC8-10). */
export interface ParsedNote {
  title: string
  body: string
  truncated: boolean
}

export type TextParseOutcome =
  | { ok: true; record: ParsedNote }
  | { ok: false; error: ImportErrorType }

/**
 * Treats a plain-text / markdown file as a single note. The file name
 * (without extension) becomes the title; the full content is the body.
 * Markdown is kept as raw text, never rendered (R4 AC6 in requirements).
 */
export function parseTextFile(
  fileName: string,
  content: string,
  sizeBytes: number,
): TextParseOutcome {
  const sizeCheck = validateFileSize(sizeBytes)
  if (!sizeCheck.ok) {
    return { ok: false, error: sizeCheck.error }
  }
  const title = fileName.replace(/\.[^.]+$/, '').trim() || fileName
  const body = content.replace(/\r\n/g, '\n')
  if (body.length > BODY_MAX_LENGTH) {
    return {
      ok: true,
      record: {
        title,
        body: body.slice(0, BODY_MAX_LENGTH),
        truncated: true,
      },
    }
  }
  return { ok: true, record: { title, body, truncated: false } }
}