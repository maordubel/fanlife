/**
 * Wiki source: discovery -> raw store -> parsers.
 *
 * Fetching and parsing are separate steps on purpose. Pages are written to the raw
 * store exactly once, pinned to their revision id, and every later parse reads from
 * disk. A parser change never re-hits the wiki, and a fact can always be traced back
 * to the exact revision it came from.
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

import { MediaWikiAdapter, type MediaWikiConfig } from '../adapters/mediawiki'
import { HAPOEL_CLUB_SLUG, parsePlayerPage, parseSeasonPage, parseSquadPage } from '../parse'
import type { IngestReport } from '@/scripts/ingest/lib/report'
import { emptyBundle, type RawPage, type StagedBundle } from '@/scripts/ingest/lib/types'

export const RAW_DIR = 'data/raw'

/**
 * The small, verified starting scope. Deliberately not the whole wiki: a narrow
 * scope that is fully correct is worth more than a broad one that is half wrong.
 */
export const DISCOVERY = {
  playerCategory: 'קטגוריה:שחקני הפועל תל אביב (כדורגל)',
  seasonCategory: 'קטגוריה:עונות (כדורגל)',
  /** Squad categories follow `קטגוריה:סגל הפועל ת"א (כדורגל) <season>`. */
  squadCategoryTemplate: 'קטגוריה:סגל הפועל ת"א (כדורגל) {season}',
  /** Hard ceiling for the first run. Raise deliberately, not by accident. */
  maxPlayers: 40,
  maxSeasons: 10,
} as const

export function adapterFromEnv(overrides: Partial<MediaWikiConfig> = {}): MediaWikiAdapter {
  return new MediaWikiAdapter({
    baseUrl: process.env.WIKI_BASE_URL ?? 'https://wiki.red-fans.com',
    delayMs: Number(process.env.WIKI_DELAY_MS ?? 1200),
    userAgent:
      process.env.WIKI_USER_AGENT ??
      'TheWorker/0.1 (Hapoel Tel Aviv history project; contact via DubelTeam.com)',
    maxPages: Number(process.env.WIKI_MAX_PAGES ?? 200),
    ...overrides,
  })
}

/* ---------------------------------------------------------------- raw store */

function rawPath(root: string, page: RawPage): string {
  const safe = page.title.replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 120)
  return join(root, RAW_DIR, `${safe}@${page.revisionId ?? page.contentHash.slice(0, 12)}.json`)
}

export function writeRawPages(root: string, pages: readonly RawPage[]): number {
  mkdirSync(join(root, RAW_DIR), { recursive: true })
  let written = 0
  for (const page of pages) {
    const path = rawPath(root, page)
    // Idempotent: the same revision is never written twice.
    if (existsSync(path)) continue
    writeFileSync(path, JSON.stringify(page, null, 2), 'utf8')
    written += 1
  }
  return written
}

export function readRawPages(root: string): RawPage[] {
  const dir = join(root, RAW_DIR)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(readFileSync(join(dir, name), 'utf8')) as RawPage)
}

/* ----------------------------------------------------------------- fetching */

export async function fetchScope(
  root: string,
  adapter: MediaWikiAdapter,
  report: IngestReport,
): Promise<{ fetched: number; written: number }> {
  const playerTitles = (await adapter.listCategoryMembers(DISCOVERY.playerCategory)).slice(
    0,
    DISCOVERY.maxPlayers,
  )
  const seasonTitles = (await adapter.listCategoryMembers(DISCOVERY.seasonCategory)).slice(
    0,
    DISCOVERY.maxSeasons,
  )

  report.countDiscovered('wiki:player pages', playerTitles.length)
  report.countDiscovered('wiki:season pages', seasonTitles.length)

  const pages = await adapter.fetchPages([...playerTitles, ...seasonTitles])
  const written = writeRawPages(root, pages)
  for (const page of pages) {
    report.addSource({
      naturalKey: `wiki:${page.title}@${page.revisionId ?? page.contentHash.slice(0, 12)}`,
      kind: 'wiki',
      title: page.title,
      url: page.url,
      pageTitle: page.title,
      revisionId: page.revisionId,
      retrievedAt: page.fetchedAt,
      note: null,
    })
  }
  return { fetched: pages.length, written }
}

/* ------------------------------------------------------------------ parsing */

/** Classify a stored page by its title, then run the matching parser. */
export function parseRawPages(pages: readonly RawPage[], report: IngestReport): StagedBundle {
  const bundle = emptyBundle()
  report.countDiscovered('wiki:raw pages on disk', pages.length)

  for (const page of pages) {
    const squadSeason = seasonFromSquadTitle(page.title)
    if (squadSeason) {
      bundle.squadMemberships.push(...parseSquadPage(page, squadSeason, report))
      continue
    }
    if (/^עונת\s/.test(page.title) || /קטגוריה:עונות/.test(page.title)) {
      const season = parseSeasonPage(page, report)
      if (season) bundle.seasons.push(season)
      continue
    }
    const person = parsePlayerPage(page, report)
    if (person) bundle.people.push(person)
  }

  // Every squad row implies the club it belongs to; nothing else is inferred.
  if (bundle.squadMemberships.length > 0) {
    report.note(
      `squad rows reference club "${HAPOEL_CLUB_SLUG}" — it must exist in the manual club file`,
    )
  }
  return bundle
}

function seasonFromSquadTitle(title: string): string | null {
  const match = /סגל[^\d]*(\d{4}\s*[/\-–—]\s*\d{2,4})/.exec(title)
  return match?.[1] ?? null
}
