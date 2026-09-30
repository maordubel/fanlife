/**
 * Where imported wiki pages land.
 *
 * Two sinks behind one interface, because the importer should not know or care:
 *
 *  · **Supabase** — the real one. One row per page, keyed on the wiki's own `page_id`,
 *    upserted. Running the import twice produces the same rows; running it after an
 *    editor changes a page produces one changed row.
 *  · **The filesystem** — the dry run. Same records, same decisions, written as JSON
 *    under `data/wiki-corpus/pages`, so the whole import can be exercised end to end
 *    with no database and no credentials.
 *
 * The idempotency is not a convention here, it is the table's: `raw_wiki_page` has a
 * unique index on `page_id`, so a second insert of the same page is a conflict the
 * database resolves by updating. A bug in this file cannot produce duplicates; it can
 * only fail loudly.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { WikiPageRecord } from '../adapters/mediawiki'
import {
  CORPUS_PAGES_DIR,
  type CorpusSink,
  type PageOutcome,
  type StoredCorpusPage,
} from '../sources/wiki-corpus'

type Counts = Record<PageOutcome, number>

const EMPTY: Counts = { inserted: 0, updated: 0, unchanged: 0, failed: 0 }

/** Chunked, because a single request carrying 6,000 pages of wikitext is a timeout. */
const WRITE_CHUNK = 50

/**
 * Declared as `StoredCorpusPage` plus the columns only the writer knows about, so the
 * encoder here and `recordFromStored` on the reading side cannot drift: renaming a field
 * on one end now fails to compile on the other.
 */
function row(
  page: WikiPageRecord,
  sourceHost: string,
  runId: string | null,
): StoredCorpusPage & {
  source_host: string
  last_seen_at: string
  last_changed_at: string
  import_run_id: string | null
} {
  return {
    page_id: page.pageId,
    title: page.title,
    namespace: page.namespace,
    revision_id: page.revisionId,
    // the complete original, byte for byte — nothing is normalised on the way in
    wikitext: page.sourceText,
    content_hash: page.contentHash,
    fetched_at: page.fetchedAt,
    source_host: sourceHost,
    url: page.url,
    content_model: page.contentModel,
    is_redirect: page.isRedirect,
    redirect_to: page.redirectTo,
    byte_size: page.byteSize,
    categories: page.categories,
    links: page.links,
    images: page.images,
    rev_timestamp: page.revTimestamp,
    rev_user: page.revUser,
    rev_comment: page.revComment,
    last_seen_at: new Date().toISOString(),
    last_changed_at: new Date().toISOString(),
    import_run_id: runId,
  }
}

export function supabaseCorpusSink(
  db: SupabaseClient,
  sourceHost: string,
  runId: string | null = null,
): CorpusSink {
  return {
    async known() {
      // Only the id and the hash are read back. Pulling the wikitext to decide whether
      // to write the wikitext would download the entire corpus on every run.
      const out = new Map<number, string>()
      const PAGE = 1000
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await db
          .from('raw_wiki_page')
          .select('page_id, content_hash')
          .not('page_id', 'is', null)
          .range(from, from + PAGE - 1)
        if (error) throw new Error(`reading known pages: ${error.message}`)
        for (const record of data ?? []) {
          const id = (record as { page_id: number | null }).page_id
          const hash = (record as { content_hash: string }).content_hash
          if (id !== null) out.set(id, hash)
        }
        if (!data || data.length < PAGE) break
      }
      return out
    },

    async write(pages) {
      const counts: Counts = { ...EMPTY }
      const before = await this.known()

      for (let index = 0; index < pages.length; index += WRITE_CHUNK) {
        const chunk = pages.slice(index, index + WRITE_CHUNK)
        const { error } = await db
          .from('raw_wiki_page')
          .upsert(
            chunk.map((page) => row(page, sourceHost, runId)),
            { onConflict: 'page_id' },
          )
        if (error) {
          counts.failed += chunk.length
          throw new Error(`upserting ${chunk.length} pages: ${error.message}`)
        }
        for (const page of chunk) {
          if (page.pageId !== null && before.has(page.pageId)) counts.updated += 1
          else counts.inserted += 1
        }
      }
      return counts
    },

    async touch(pageIds) {
      // Seen but unchanged. One statement, no content, so a no-op run stays a no-op.
      const stamp = new Date().toISOString()
      for (let index = 0; index < pageIds.length; index += 500) {
        const chunk = pageIds.slice(index, index + 500)
        const { error } = await db
          .from('raw_wiki_page')
          .update({ last_seen_at: stamp })
          .in('page_id', chunk as number[])
        if (error) throw new Error(`touching ${chunk.length} pages: ${error.message}`)
      }
    },
  }
}

/* ------------------------------------------------------------ the dry run */

export function fileCorpusSink(root: string, sourceHost: string): CorpusSink {
  const dir = join(root, CORPUS_PAGES_DIR)

  const pathFor = (page: WikiPageRecord): string =>
    join(dir, `${page.pageId ?? page.title.replace(/[^\p{L}\p{N}]+/gu, '_')}.json`)

  return {
    async known() {
      const out = new Map<number, string>()
      if (!existsSync(dir)) return out
      for (const name of readdirSync(dir)) {
        if (!name.endsWith('.json')) continue
        try {
          const stored = JSON.parse(readFileSync(join(dir, name), 'utf8')) as {
            page_id?: number
            content_hash?: string
          }
          if (typeof stored.page_id === 'number' && typeof stored.content_hash === 'string') {
            out.set(stored.page_id, stored.content_hash)
          }
        } catch {
          // a half-written file from a killed run is re-fetched, not fatal
        }
      }
      return out
    },

    async write(pages) {
      mkdirSync(dir, { recursive: true })
      const counts: Counts = { ...EMPTY }
      for (const page of pages) {
        const path = pathFor(page)
        const existed = existsSync(path)
        writeFileSync(path, JSON.stringify(row(page, sourceHost, null), null, 2), 'utf8')
        if (existed) counts.updated += 1
        else counts.inserted += 1
      }
      return counts
    },

    async touch() {
      // A file sink has nothing to touch: the record on disk already carries the run's
      // own `last_seen_at`, and rewriting every unchanged file to bump a timestamp is
      // exactly the write this design exists to avoid.
    },
  }
}
