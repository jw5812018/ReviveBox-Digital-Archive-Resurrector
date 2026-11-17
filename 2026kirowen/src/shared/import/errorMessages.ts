import { ImportErrorType } from '@shared/models/types'

const MESSAGES: Record<ImportErrorType, string> = {
  [ImportErrorType.MissingTitle]: 'This entry has no title.',
  [ImportErrorType.MissingUrl]: 'This entry has no link.',
  [ImportErrorType.MissingField]: 'A required field is missing.',
  [ImportErrorType.TitleTooLong]: 'The title is longer than 255 characters.',
  [ImportErrorType.UrlTooLong]: 'The link is longer than 2,048 characters.',
  [ImportErrorType.InvalidUrlProtocol]: 'Only http and https links can be imported.',
  [ImportErrorType.FileTooLarge]: 'The file is larger than 5 MiB.',
  [ImportErrorType.TooManyRecords]: 'More than 1,000 records in one batch.',
  [ImportErrorType.InvalidDate]: 'The date could not be read, so the import date is used.',
  [ImportErrorType.ContentTruncated]: 'The text was shortened to 100,000 characters.',
  [ImportErrorType.MalformedXml]: 'The file is not valid XML.',
  [ImportErrorType.SecurityViolation]:
    'The file declares a DOCTYPE, which is not accepted for security reasons.',
  [ImportErrorType.ParserTimeout]: 'Reading the file took too long.',
}

/**
 * Readable English reason for an import problem (Requirement 5 AC11).
 * Error codes stay in ImportDetail.errorType; users only see this text.
 */
export function describeImportError(type: ImportErrorType, rawUrl?: string): string {
  const base = MESSAGES[type]
  if (type === ImportErrorType.InvalidUrlProtocol && rawUrl) {
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(rawUrl.trim())?.[1]
    if (scheme) return `${base.slice(0, -1)} (this one uses ${scheme.toLowerCase()}:).`
  }
  return base
}