import type { Item, Source, ImportDetail } from '@shared/models/types'
import { ImportErrorType } from '@shared/models/types'
import { normalizeUrl } from '@shared/urls/normalizeUrl'
import { parseBookmarkHtml } from './bookmarkParser'
import { selectOutcomes, describeSelection, type FolderSelection } from './bookmarkFolders'
import { describeImportError } from './errorMessages'
import { parseOpml } from './opmlParser'
import { parseFeed } from './feedParser'
import { parseTextFile } from './textParser'
import { computeNoteFingerprint } from './fingerprint'
import { findDuplicateByUrl, findDuplicateByFingerprint } from './dedupe'
import { buildImportSummary, type ImportSummary } from './importResult'
import { MAX_IMPORT_RECORDS } from './limits'

/** A merge: append source/tags to an existing item (R5 AC6). */
export interface MergeAction {
  targetId: string
  addSourceId: string
  addTags: string[]
}

export interface ImportPlan {
  summary: ImportSummary
  createItems: Item[]
  createSources: Source[]
  merges: MergeAction[]
  /** Feed subscriptions created (OPML); shown separately from articles (R3 AC10). */
  subscriptionCount: number
  articleCount: number
}

export type PlanResult =
  | { ok: true; plan: ImportPlan }
  | { ok: false; error: ImportErrorType; message: string }

export interface PlanOptions {
  /** Bookmark files only: import just these folders (Requirement 2 AC8). */
  folders?: FolderSelection[]
}

interface Ctx {
  existingItems: Item[]
  existingSources: Source[]
  now: Date
  details: ImportDetail[]
  createItems: Item[]
  createSources: Source[]
  merges: MergeAction[]
}

function newItem(
  partial: Pick<Item, 'kind' | 'title'> & Partial<Item>,
  sourceId: string,
  savedAt: string | null,
  now: Date,
): Item {
  const nowIso = now.toISOString()
  return {
    id: crypto.randomUUID(),
    tags: [],
    isSample: false,
    readAt: null,
    starred: false,
    sourceIds: [sourceId],
    createdAt: nowIso,
    updatedAt: nowIso,
    savedAt: savedAt ?? nowIso,
    dateSource: savedAt != null ? 'original' : 'imported',
    ...partial,
  }
}

/** Adds a url-based record, deduping against existing + in-batch items. */
function addUrlRecord(
  ctx: Ctx,
  fields: { kind: 'bookmark' | 'article'; title: string; url: string; body?: string; savedAt: string | null; tags: string[] },
  sourceId: string,
): void {
  const canonical = normalizeUrl(fields.url)
  if (canonical == null) {
    ctx.details.push({
      title: fields.title,
      url: fields.url,
      status: 'invalid',
      errorType: ImportErrorType.InvalidUrlProtocol,
      message: 'URL could not be normalized.',
    })
    return
  }
  // Duplicate within this batch: fold tags into the pending item directly
  // (the source id is already attached since it is the same file).
  const pending = findDuplicateByUrl(ctx.createItems, canonical)
  if (pending) {
    pending.tags = Array.from(new Set([...pending.tags, ...fields.tags]))
    ctx.details.push({
      title: fields.title,
      url: fields.url,
      status: 'duplicate',
      message: 'Duplicate within this import; tags merged into the new record.',
    })
    return
  }
  const existing = findDuplicateByUrl(ctx.existingItems, canonical)
  if (existing) {
    ctx.merges.push({ targetId: existing.id, addSourceId: sourceId, addTags: fields.tags })
    ctx.details.push({
      title: fields.title,
      url: fields.url,
      status: 'duplicate',
      message: 'Already in your library; source and tags will be merged.',
    })
    return
  }
  const item = newItem(
    {
      kind: fields.kind,
      title: fields.title,
      originalUrl: fields.url,
      canonicalUrl: canonical,
      body: fields.body,
      tags: fields.tags,
    },
    sourceId,
    fields.savedAt,
    ctx.now,
  )
  ctx.createItems.push(item)
  ctx.details.push({ title: fields.title, url: fields.url, status: 'new' })
}

/**
 * Plans an import without writing anything (R5 AC1/AC7).
 * Detects the file type, parses, validates, dedupes, and returns the full
 * write plan plus per-record preview details.
 */
export async function planImport(
  fileName: string,
  content: string,
  existingItems: Item[],
  existingSources: Source[],
  now: Date = new Date(),
  options: PlanOptions = {},
): Promise<PlanResult> {
  const lower = fileName.toLowerCase()
  const folders = options.folders
  const ctx: Ctx = {
    existingItems,
    existingSources,
    now,
    details: [],
    createItems: [],
    createSources: [],
    merges: [],
  }

  const finish = (): PlanResult => {
    if (ctx.details.length > MAX_IMPORT_RECORDS) {
      return {
        ok: false,
        error: ImportErrorType.TooManyRecords,
        message: folders
          ? `This batch has more than ${MAX_IMPORT_RECORDS.toLocaleString('en-US')} records. Choose fewer folders.`
          : `This file has more than ${MAX_IMPORT_RECORDS.toLocaleString('en-US')} records. Split it into smaller files.`,
      }
    }
    const articleCount = ctx.createItems.filter((i) => i.kind === 'article').length
    const subscriptionCount = ctx.createSources.filter((s) => s.kind === 'feed').length
    return {
      ok: true,
      plan: {
        summary: buildImportSummary(ctx.details),
        createItems: ctx.createItems,
        createSources: ctx.createSources,
        merges: ctx.merges,
        subscriptionCount,
        articleCount,
      },
    }
  }

  // --- Netscape bookmark HTML ---
  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    const name = folders ? `${fileName} (${describeSelection(folders)})` : fileName
    const source: Source = { id: crypto.randomUUID(), kind: 'bookmark-file', name }
    ctx.createSources.push(source)
    const parsed = parseBookmarkHtml(content)
    for (const outcome of folders ? selectOutcomes(parsed, folders) : parsed) {
      if (!outcome.ok) {
        ctx.details.push({
          title: outcome.rawTitle || '(untitled)',
          url: outcome.rawUrl,
          status: 'invalid',
          errorType: outcome.error,
          message: describeImportError(outcome.error, outcome.rawUrl),
        })
        continue
      }
      const r = outcome.record
      addUrlRecord(ctx, { kind: 'bookmark', title: r.title, url: r.url, savedAt: r.savedAt, tags: r.tags }, source.id)
    }
    return finish()
  }

  // --- OPML subscriptions (feeds only, never articles; guide 3.1) ---
  if (lower.endsWith('.opml')) {
    const result = parseOpml(content)
    if (!result.ok) {
      return { ok: false, error: result.error, message: 'The OPML file could not be parsed.' }
    }
    for (const outcome of result.outcomes) {
      if (!outcome.ok) {
        ctx.details.push({
          title: outcome.rawTitle || '(untitled feed)',
          url: outcome.rawUrl,
          status: 'invalid',
          errorType: outcome.error,
          message: describeImportError(outcome.error, outcome.rawUrl),
        })
        continue
      }
      const feed = outcome.record
      const known = [...ctx.existingSources, ...ctx.createSources]
      if (known.some((s) => s.kind === 'feed' && s.feedUrl === feed.feedUrl)) {
        ctx.details.push({
          title: feed.title,
          url: feed.feedUrl,
          status: 'duplicate',
          message: 'Subscription already exists.',
        })
        continue
      }
      ctx.createSources.push({
        id: crypto.randomUUID(),
        kind: 'feed',
        name: feed.title,
        feedUrl: feed.feedUrl,
        lastFetchedAt: null,
        lastFetchStatus: null,
      })
      ctx.details.push({ title: feed.title, url: feed.feedUrl, status: 'new' })
    }
    return finish()
  }

  // --- RSS 2.0 / Atom XML ---
  if (lower.endsWith('.xml') || lower.endsWith('.rss') || lower.endsWith('.atom')) {
    const result = parseFeed(content)
    if (!result.ok) {
      return { ok: false, error: result.error, message: 'The feed file could not be parsed.' }
    }
    const source: Source = { id: crypto.randomUUID(), kind: 'feed', name: fileName }
    ctx.createSources.push(source)
    for (const outcome of result.outcomes) {
      if (!outcome.ok) {
        ctx.details.push({
          title: outcome.rawTitle || '(untitled article)',
          url: outcome.rawUrl,
          status: 'invalid',
          errorType: outcome.error,
          message: describeImportError(outcome.error, outcome.rawUrl),
        })
        continue
      }
      const r = outcome.record
      addUrlRecord(ctx, { kind: 'article', title: r.title, url: r.url, body: r.body, savedAt: r.savedAt, tags: [] }, source.id)
      if (r.truncated) {
        ctx.details[ctx.details.length - 1].message =
          'Body truncated to 100,000 characters.'
      }
    }
    return finish()
  }

  // --- Plain text / markdown notes ---
  if (lower.endsWith('.txt') || lower.endsWith('.md')) {
    const outcome = parseTextFile(fileName, content, new TextEncoder().encode(content).length)
    if (!outcome.ok) {
      return {
        ok: false,
        error: outcome.error,
        message: 'The text file could not be imported.',
      }
    }
    const source: Source = { id: crypto.randomUUID(), kind: 'note-file', name: fileName }
    ctx.createSources.push(source)
    const fingerprint = await computeNoteFingerprint(outcome.record.title, outcome.record.body)
    const pendingNote = findDuplicateByFingerprint(ctx.createItems, fingerprint)
    if (pendingNote) {
      ctx.details.push({
        title: outcome.record.title,
        status: 'duplicate',
        message: 'Duplicate within this import; only the first copy is kept.',
      })
      return finish()
    }
    const existingNote = findDuplicateByFingerprint(ctx.existingItems, fingerprint)
    if (existingNote) {
      ctx.merges.push({ targetId: existingNote.id, addSourceId: source.id, addTags: [] })
      ctx.details.push({
        title: outcome.record.title,
        status: 'duplicate',
        message: 'Identical note already exists; source will be merged.',
      })
    } else {
      ctx.createItems.push(
        newItem(
          {
            kind: 'note',
            title: outcome.record.title,
            body: outcome.record.body,
            noteFingerprint: fingerprint,
          },
          source.id,
          null,
          ctx.now,
        ),
      )
      ctx.details.push({
        title: outcome.record.title,
        status: 'new',
        message: outcome.record.truncated ? 'Content truncated to 100,000 characters.' : undefined,
      })
    }
    return finish()
  }

  return {
    ok: false,
    error: ImportErrorType.MalformedXml,
    message: 'Unsupported file type. Choose .html, .opml, .xml/.rss/.atom, .txt or .md.',
  }
}
/** One article as returned by the server's /api/feeds/fetch endpoint. */
export interface FetchedArticle {
  title: string
  url: string
  body?: string
  savedAt: string | null
  truncated: boolean
}

/**
 * Plans writing freshly fetched feed articles (R9 AC3): the same
 * normalization + dedupe + merge rules as file imports.
 */
export function planFetchedArticles(
  articles: FetchedArticle[],
  feedSourceId: string,
  existingItems: Item[],
  now: Date = new Date(),
): ImportPlan {
  const ctx: Ctx = {
    existingItems,
    existingSources: [],
    now,
    details: [],
    createItems: [],
    createSources: [],
    merges: [],
  }
  for (const article of articles) {
    addUrlRecord(
      ctx,
      {
        kind: 'article',
        title: article.title,
        url: article.url,
        body: article.body,
        savedAt: article.savedAt,
        tags: [],
      },
      feedSourceId,
    )
  }
  const articleCount = ctx.createItems.filter((i) => i.kind === 'article').length
  return {
    summary: buildImportSummary(ctx.details),
    createItems: ctx.createItems,
    createSources: [],
    merges: ctx.merges,
    subscriptionCount: 0,
    articleCount,
  }
}