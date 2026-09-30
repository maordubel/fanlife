/**
 * ויקיפועל — import the whole wiki, not a scope.
 *
 * `sources/wiki.ts` reads a deliberately narrow slice: a few categories, a hard
 * ceiling, enough to build the first questions from. This is the other job — every
 * page, complete content, full metadata, run again tomorrow and it updates rather than
 * duplicates.
 *
 * Four things make it correct rather than merely working:
 *
 *  1. **It streams.** Discovery is an async generator and content is fetched as titles
 *     arrive, so memory is flat whether the wiki has 300 pages or 300,000, and the
 *     first rows land in the database while discovery is still running.
 *  2. **It checkpoints.** Every batch writes its position. A run that dies at page
 *     4,000 of 6,000 — network, laptop lid, anything — resumes there instead of
 *     starting again, which is the difference between an importer you run and one you
 *     are afraid to run.
 *  3. **It compares before it writes.** A page whose content hash is unchanged has its
 *     `last_seen_at` touched and nothing else. The second run of an unchanged wiki
 *     writes no content at all, and says so.
 *  4. **It never invents.** A page that comes back empty is stored empty and counted,
 *     not skipped (rule 11). The corpus count has to be able to disagree with the
 *     wiki's own — that disagreement is the signal something went wrong.
 *
 * **On what gets asked later.** The wiki's richest material is the songs, and a song
 * page is mostly lyrics. The raw text is stored because provenance and idempotency
 * both need the original, but the question generator must ask about a song through its
 * METADATA — its title, the tune it is set to, who it is about — and must never print
 * verses into a question or a share card. The templates in `lib/game/trivia.ts` are
 * built that way and should stay that way.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import {
  MediaWikiAccessError,
  MediaWikiAdapter,
  parseXmlDump,
  type AllPagesEntry,
  type WikiPageRecord,
} from '../adapters/mediawiki'

export const CORPUS_CHECKPOINT = 'data/wiki-corpus/checkpoint.json'
export const CORPUS_PAGES_DIR = 'data/wiki-corpus/pages'

/**
 * A corpus page AS IT IS STORED — the `raw_wiki_page` column shape, which is also the
 * JSON the dry run writes under `CORPUS_PAGES_DIR`.
 *
 * It is deliberately NOT a `WikiPageRecord`. The sink converts one into the other on the
 * way out (`row()` in `load/wiki-corpus.ts`); anything reading the corpus back off disk
 * has to convert the other way. `readCorpus` in `sources/redfans-canon.ts` did not — it
 * cast, and a cast is not a conversion. It worked for exactly the fields whose column
 * name happens to equal the record's (`title`, `url`, `namespace`, `links`) and silently
 * produced `undefined` for every field renamed on the way to the table: `page_id`,
 * `revision_id`, `content_hash`, `fetched_at`. So every page the canon build ever read
 * arrived with no id, no revision, no hash and no fetch time, and the rows it produced
 * lost the provenance rule 2 exists to carry — with nothing anywhere able to fail.
 * Declaring the stored shape once, beside the directory it lives in and imported by both
 * ends, is what stops the two drifting apart again.
 */
export type StoredCorpusPage = {
  page_id: number | null
  title: string
  namespace: number
  revision_id: number | null
  /** the complete original, byte for byte — `WikiPageRecord.sourceText` */
  wikitext: string
  content_hash: string
  fetched_at: string
  url: string
  content_model: string
  is_redirect: boolean
  redirect_to: string | null
  byte_size: number | null
  categories: string[]
  links: string[]
  images: string[]
  rev_timestamp: string | null
  rev_user: string | null
  rev_comment: string | null
}

/**
 * A stored row, back in the shape the adapter produces and the parsers read.
 *
 * A half-written file from a killed run can be missing anything, so every field is
 * defended — but nothing is INVENTED (rule 11): a missing hash reads as an empty string
 * and a missing id as null, which is what those fields already mean elsewhere, rather
 * than as a value somebody could mistake for provenance.
 */
export function recordFromStored(stored: Partial<StoredCorpusPage>): WikiPageRecord {
  return {
    pageId: stored.page_id ?? null,
    title: stored.title ?? '',
    namespace: stored.namespace ?? 0,
    revisionId: stored.revision_id ?? null,
    sourceText: stored.wikitext ?? '',
    format: 'wikitext',
    contentHash: stored.content_hash ?? '',
    fetchedAt: stored.fetched_at ?? '',
    url: stored.url ?? '',
    contentModel: stored.content_model ?? 'wikitext',
    isRedirect: stored.is_redirect ?? false,
    redirectTo: stored.redirect_to ?? null,
    byteSize: stored.byte_size ?? null,
    revTimestamp: stored.rev_timestamp ?? null,
    revUser: stored.rev_user ?? null,
    revComment: stored.rev_comment ?? null,
    categories: stored.categories ?? [],
    links: stored.links ?? [],
    images: stored.images ?? [],
  }
}

/** Where a page ends up. The importer reports these counts rather than a total. */
export type PageOutcome = 'inserted' | 'updated' | 'unchanged' | 'failed'

export type CorpusSink = {
  /** Content hashes already stored, so an unchanged page can be skipped cheaply. */
  known(): Promise<Map<number, string>>
  write(pages: readonly WikiPageRecord[]): Promise<Record<PageOutcome, number>>
  /** Touch the pages we saw but did not rewrite, so staleness is measurable. */
  touch(pageIds: readonly number[]): Promise<void>
}

export type CorpusOptions = {
  adapter: MediaWikiAdapter
  sink: CorpusSink
  /** Which namespaces to walk. Empty means "ask the wiki and take them all". */
  namespaces?: number[]
  batchSize?: number
  root?: string
  resume?: boolean
  /** Stop after this many pages. For a smoke test only — never for a real import. */
  limit?: number
  log?: (line: string) => void
}

export type CorpusResult = {
  discovered: number
  inserted: number
  updated: number
  unchanged: number
  failed: number
  namespaces: number[]
  failures: Array<{ title: string; reason: string }>
  startedAt: string
  finishedAt: string
}

type Checkpoint = {
  /** page ids already written, so a resumed run does not re-fetch them */
  done: number[]
  namespaces: number[]
  startedAt: string
}

/* ------------------------------------------------------------------ the run */

export async function importCorpus(options: CorpusOptions): Promise<CorpusResult> {
  const {
    adapter,
    sink,
    batchSize = 20,
    root = process.cwd(),
    resume = true,
    limit,
  } = options
  const log = options.log ?? ((line: string) => process.stdout.write(`${line}\n`))
  const startedAt = new Date().toISOString()

  const namespaces =
    options.namespaces && options.namespaces.length > 0
      ? options.namespaces
      : (await adapter.listNamespaces()).map((ns) => ns.id)

  const info = await adapter.siteInfo()
  log(`wiki: ${info.sitename} (${info.generator}) — ${info.articles} articles reported`)
  log(`namespaces: ${namespaces.join(', ')}`)

  const checkpoint = resume ? readCheckpoint(root) : null
  const done = new Set<number>(checkpoint?.done ?? [])
  if (done.size > 0) log(`resuming — ${done.size} pages already imported`)

  const known = await sink.known()
  log(`sink holds ${known.size} pages`)

  const counts: Record<PageOutcome, number> = {
    inserted: 0,
    updated: 0,
    unchanged: 0,
    failed: 0,
  }
  const failures: Array<{ title: string; reason: string }> = []
  const seenUnchanged: number[] = []
  let discovered = 0
  let batch: AllPagesEntry[] = []

  const flush = async (): Promise<void> => {
    if (batch.length === 0) return
    const titles = batch.map((entry) => entry.title)
    try {
      const pages = await adapter.fetchPagesFull(titles)

      // Split before writing: a page whose hash is unchanged never reaches the sink's
      // write path at all, which is what makes a no-op run cost almost nothing.
      const changed: WikiPageRecord[] = []
      for (const page of pages) {
        const id = page.pageId
        if (id !== null && known.get(id) === page.contentHash) {
          counts.unchanged += 1
          seenUnchanged.push(id)
          continue
        }
        changed.push(page)
      }

      if (changed.length > 0) {
        const written = await sink.write(changed)
        counts.inserted += written.inserted
        counts.updated += written.updated
        counts.unchanged += written.unchanged
        counts.failed += written.failed
      }

      // Anything the API did not return is a page that vanished between discovery and
      // fetch — reported, never silently dropped.
      const returned = new Set(pages.map((page) => page.title))
      for (const title of titles) {
        if (!returned.has(title)) {
          counts.failed += 1
          failures.push({ title, reason: 'not returned by the API' })
        }
      }

      for (const entry of batch) done.add(entry.pageId)
      writeCheckpoint(root, { done: [...done], namespaces, startedAt })
    } catch (cause) {
      // A whole batch failing is recorded per title, so the report names the pages that
      // are missing rather than a batch number nobody can act on.
      const reason =
        cause instanceof MediaWikiAccessError ? cause.message : String(cause)
      for (const entry of batch) {
        counts.failed += 1
        failures.push({ title: entry.title, reason })
      }
      log(`batch failed (${batch.length} pages): ${reason}`)
    }
    batch = []
  }

  for await (const entry of adapter.listAllPages(namespaces)) {
    discovered += 1
    if (done.has(entry.pageId)) continue
    batch.push(entry)

    if (batch.length >= batchSize) {
      await flush()
      const total = counts.inserted + counts.updated + counts.unchanged
      log(
        `${total}/${discovered} · +${counts.inserted} new · ~${counts.updated} changed · ` +
          `=${counts.unchanged} same · !${counts.failed} failed`,
      )
    }
    if (limit && discovered >= limit) break
  }
  await flush()

  if (seenUnchanged.length > 0) await sink.touch(seenUnchanged)

  const result: CorpusResult = {
    discovered,
    inserted: counts.inserted,
    updated: counts.updated,
    unchanged: counts.unchanged,
    failed: counts.failed,
    namespaces,
    failures,
    startedAt,
    finishedAt: new Date().toISOString(),
  }
  log(summarise(result))
  return result
}

/**
 * The same import, from a `Special:Export` XML file instead of the API.
 *
 * Everything downstream is identical — same records, same sink, same idempotency — so
 * a wiki whose API is closed is a slower import, not a missing one.
 */
export async function importFromDump(
  xmlPath: string,
  sink: CorpusSink,
  baseUrl: string,
  log: (line: string) => void = (line) => process.stdout.write(`${line}\n`),
): Promise<CorpusResult> {
  const startedAt = new Date().toISOString()
  const xml = readFileSync(xmlPath, 'utf8')
  const pages = parseXmlDump(xml, baseUrl)
  log(`dump: ${pages.length} pages in ${xmlPath}`)

  const known = await sink.known()
  const changed = pages.filter(
    (page) => page.pageId === null || known.get(page.pageId) !== page.contentHash,
  )
  const unchangedIds = pages
    .filter((page) => page.pageId !== null && known.get(page.pageId) === page.contentHash)
    .map((page) => page.pageId as number)

  const written =
    changed.length > 0
      ? await sink.write(changed)
      : { inserted: 0, updated: 0, unchanged: 0, failed: 0 }
  if (unchangedIds.length > 0) await sink.touch(unchangedIds)

  const result: CorpusResult = {
    discovered: pages.length,
    inserted: written.inserted,
    updated: written.updated,
    unchanged: written.unchanged + unchangedIds.length,
    failed: written.failed,
    namespaces: [...new Set(pages.map((page) => page.namespace))].sort((a, b) => a - b),
    failures: [],
    startedAt,
    finishedAt: new Date().toISOString(),
  }
  log(summarise(result))
  return result
}

export function summarise(result: CorpusResult): string {
  return [
    '',
    '─── ויקיפועל · import complete ───',
    `discovered   ${result.discovered}`,
    `inserted     ${result.inserted}`,
    `updated      ${result.updated}`,
    `unchanged    ${result.unchanged}`,
    `failed       ${result.failed}`,
    `namespaces   ${result.namespaces.join(', ')}`,
    result.failures.length > 0
      ? `failures:\n${result.failures.slice(0, 20).map((f) => `  · ${f.title} — ${f.reason}`).join('\n')}`
      : 'failures:    none',
  ].join('\n')
}

/* ------------------------------------------------------------- checkpointing */

function checkpointPath(root: string): string {
  return join(root, CORPUS_CHECKPOINT)
}

export function readCheckpoint(root: string): Checkpoint | null {
  const path = checkpointPath(root)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Checkpoint
  } catch {
    // A corrupt checkpoint must not stop an import — the worst case is re-fetching
    // pages that are already stored, and the sink is idempotent.
    return null
  }
}

export function writeCheckpoint(root: string, checkpoint: Checkpoint): void {
  const path = checkpointPath(root)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(checkpoint), 'utf8')
}

export function clearCheckpoint(root: string): void {
  const path = checkpointPath(root)
  if (existsSync(path)) writeFileSync(path, JSON.stringify({ done: [], namespaces: [], startedAt: '' }), 'utf8')
}
