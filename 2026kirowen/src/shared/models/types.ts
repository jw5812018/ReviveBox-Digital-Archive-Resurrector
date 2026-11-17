/**
 * Shared data model types for EchoShelf.
 * Dates are stored as ISO 8601 strings in UTC so they sort lexicographically
 * in IndexedDB and serialize losslessly in JSON exports.
 */

export type ItemKind = 'bookmark' | 'article' | 'note'

export type SourceKind =
  | 'bookmark-file'
  | 'feed'
  | 'note-file'
  | 'manual'
  | 'demo'
  | 'backup'

/** Where the savedAt value came from (R3 AC8 requires surfacing this). */
export type DateSource = 'original' | 'imported'

/** Result of the most recent manual feed fetch (R9). */
export type FeedFetchState =
  | 'ok'
  | 'timeout'
  | 'http-error'
  | 'invalid-format'
  | 'redirect-limit'
  | 'too-large'
  /** Rejected by the fetch safety rules (non-public target, non-HTTPS, credentials). */
  | 'blocked'
  | 'rate-limited'
  /** Fetched, but writing the articles to this browser failed; nothing changed. */
  | 'save-failed'
  | 'network-error'

export interface Item {
  id: string
  kind: ItemKind
  title: string
  /** URL exactly as imported/entered, before normalization. */
  originalUrl?: string
  /** Normalized URL used for deduplication (http/https only). */
  canonicalUrl?: string
  /** Saved body text: note content or article summary/body. */
  body?: string
  tags: string[]
  sourceIds: string[]
  createdAt: string
  updatedAt: string
  savedAt: string
  readAt: string | null
  starred: boolean
  /** SHA-256 fingerprint for notes (notes only; R5 AC9). */
  noteFingerprint?: string
  /** True for demo-library entries (R1 AC4). */
  isSample: boolean
  dateSource: DateSource
}

export interface FeedFetchStatus {
  state: FeedFetchState
  fetchedAt: string
  /** HTTP status code or machine-readable error detail, when available. */
  detail?: string
}

export interface Source {
  id: string
  kind: SourceKind
  name: string
  feedUrl?: string
  lastFetchedAt?: string | null
  lastFetchStatus?: FeedFetchStatus | null
}

/** Combined search + filter state for the item list (R6). */
export interface FilterState {
  query: string
  kind: ItemKind | 'all'
  /** Multiple tags combine with OR logic (R6 AC7). */
  tags: string[]
  starredOnly: boolean
  unreadOnly: boolean
}

/** Machine-readable parse/validation error codes (R2 AC6, R3 AC1-7). */
export enum ImportErrorType {
  MissingTitle = 'MissingTitle',
  MissingUrl = 'MissingUrl',
  MissingField = 'MissingField',
  TitleTooLong = 'TitleTooLong',
  UrlTooLong = 'UrlTooLong',
  InvalidUrlProtocol = 'InvalidUrlProtocol',
  FileTooLarge = 'FileTooLarge',
  TooManyRecords = 'TooManyRecords',
  InvalidDate = 'InvalidDate',
  ContentTruncated = 'ContentTruncated',
  MalformedXml = 'MalformedXml',
  SecurityViolation = 'SecurityViolation',
  ParserTimeout = 'ParserTimeout',
}

/** Per-record outcome shown in the import preview (R5 AC3-4). */
export interface ImportDetail {
  /** Raw title as parsed, or empty string when unavailable. */
  title: string
  url?: string
  status: 'new' | 'duplicate' | 'invalid'
  /** Present when status is 'invalid' or a warning like truncation applies. */
  errorType?: ImportErrorType
  /** Human-readable reason shown in the preview list. */
  message?: string
}