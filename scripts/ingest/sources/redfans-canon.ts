/**
 * ויקיפועל → קנון — turn a stored corpus into canonical rows.
 *
 * This is the step the pipeline was missing. `sources/wiki-corpus.ts` fetches the wiki
 * into `data/wiki-corpus/pages/*.json` and stops there; `parse/index.ts` can read a
 * player page but has no idea which pages exist. Nothing connected the two, so the
 * corpus was an archive nobody could turn into facts.
 *
 * The design point: **this reads only what is already on disk.** No network, ever. A
 * parser change re-runs over the stored corpus for free, and a fact is always traceable
 * to the exact revision it came from (`sourceForPage` pins the revision id).
 *
 * Routing is by title, because on this wiki the title states the shape:
 *
 *   `לוח משחקים (כדורגל) 1980/81`              → schedule table  → matches + goals
 *   `קטגוריה:סגל הפועל ת"א (כדורגל) 1980/81`   → category members → squad membership
 *   `עונת 1980/81 (כדורגל) מחזור 12`           → per-round page   → one match
 *   `עונת 1980/81 (כדורגל)`                    → season page      → the season row
 *   a page in a squad category                 → player infobox   → a person
 *
 * Every route runs behind the football gate (`acceptFootballPage`), so rule 6 holds
 * unchanged: a page that is not provably football enters nothing.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import type { WikiPageRecord } from '../adapters/mediawiki'
import { CORPUS_PAGES_DIR, recordFromStored, type StoredCorpusPage } from './wiki-corpus'
import { acceptFootballPage, parsePlayerPage, parseSeasonPage } from '../parse'
import {
  matchContextFromTitle,
  parseSchedulePage,
  parseSquadCategory,
  seasonFromTitle,
} from '../parse/redfans'
import { parseMatchPage } from '../parse'
import { mintMatchId, type MintResult } from '../lib/matchIds'
import { loadRegistry } from '../lib/matchIds'
import type { MatchIdEntry, MatchNaturalKey } from '@/lib/canon/matchId'
import { IngestReport } from '@/scripts/ingest/lib/report'
import { emptyBundle, type RawPage, type StagedBundle } from '@/scripts/ingest/lib/types'

/** The competition a league round belongs to when the page does not name one. */
const DEFAULT_LEAGUE_SLUG = 'ליגה-לאומית'

export type PageShape =
  | 'schedule'
  | 'squad-category'
  | 'match-round'
  | 'season'
  | 'player'
  | 'other'

/**
 * Which parser a page belongs to, from its title alone.
 *
 * Order matters: a squad category and a schedule both name a season, and a per-round
 * page is a season page with a stage on the end. The most specific test runs first.
 */
export function classifyPage(title: string): PageShape {
  if (/^קטגוריה:/u.test(title)) {
    return /סגל/u.test(title) && seasonFromTitle(title) ? 'squad-category' : 'other'
  }
  if (/לוח\s*משחקים/u.test(title)) return 'schedule'
  if (/^עונת\s/u.test(title)) {
    // `עונת 1980/81 (כדורגל)` is the season; anything after the sport marker is a round.
    return /\(כדורגל\)\s*\S/u.test(title) ? 'match-round' : 'season'
  }
  return 'other'
}

/**
 * A corpus record, narrowed to the document the parsers read.
 *
 * `WikiPageRecord` IS a `RawPage` plus the wiki's own metadata — categories, links, the
 * revision's author — none of which a parser is allowed to want. This drops that half
 * and hands over the document alone, which is why a parser cannot start depending on
 * something only MediaWiki can supply.
 */
export function toRawPage(record: WikiPageRecord): RawPage {
  return {
    pageId: record.pageId,
    title: record.title,
    namespace: record.namespace,
    revisionId: record.revisionId,
    sourceText: record.sourceText,
    format: record.format,
    contentHash: record.contentHash,
    fetchedAt: record.fetchedAt,
    url: record.url,
  }
}

/**
 * The corpus on disk, decoded.
 *
 * What the dry run writes is a `StoredCorpusPage` — the table's own column names — and
 * this used to CAST the parsed JSON to `WikiPageRecord` and read it as though the two
 * shapes were one. They never were: `content_hash` is not `contentHash`, so every page
 * the canon build read arrived with no hash, no fetch time, no revision id and no page
 * id, and rule 2's provenance was dropped on the floor where nothing could fail. The
 * text survived only because `toRawPage` reached for the provider's own word for it,
 * which is the same drift wearing the opposite mask. Decoding it is one call, and the
 * compiler now holds both shapes.
 */
export function readCorpus(root: string): WikiPageRecord[] {
  const dir = join(root, CORPUS_PAGES_DIR)
  if (!existsSync(dir)) return []
  const out: WikiPageRecord[] = []
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json')) continue
    try {
      const stored = JSON.parse(readFileSync(join(dir, name), 'utf8')) as Partial<StoredCorpusPage>
      out.push(recordFromStored(stored))
    } catch {
      // a half-written file from a killed run is not a fatal error for a read pass
    }
  }
  return out
}

export type CanonOptions = {
  /** Only these seasons. Empty means every season the corpus covers. */
  seasons?: string[]
  root?: string
  /** Pre-loaded registry, so a caller can inspect what was minted. */
  registry?: MatchIdEntry[]
}

export type CanonResult = {
  bundle: StagedBundle
  report: IngestReport
  registry: MatchIdEntry[]
  /** canonical id per match natural key — what a Life AnchorRef will point at */
  matchIds: Map<string, string>
  minted: number
  shapes: Record<PageShape, number>
}

/**
 * Build canonical rows from a corpus already on disk.
 *
 * Squad categories need their membership, which a category page's own wikitext does not
 * contain — it is the `links` the API returned for that page. The corpus stores those,
 * so the membership is read from the stored record rather than re-requested.
 */
export function canonFromCorpus(
  pages: readonly WikiPageRecord[],
  options: CanonOptions = {},
): CanonResult {
  const report = new IngestReport('redfans_canon')
  const bundle = emptyBundle()
  const registry = options.registry ?? (options.root ? loadRegistry(options.root) : [])
  const matchIds = new Map<string, string>()
  const shapes: Record<PageShape, number> = {
    schedule: 0,
    'squad-category': 0,
    'match-round': 0,
    season: 0,
    player: 0,
    other: 0,
  }
  let minted = 0

  const wanted = new Set(options.seasons ?? [])
  const inScope = (title: string): boolean => {
    if (wanted.size === 0) return true
    const season = seasonFromTitle(title)
    return season !== null && wanted.has(season)
  }

  // Player pages are recognised by membership of a squad category rather than by their
  // own title, so the squad pass runs first and collects the names it saw.
  const playerTitles = new Set<string>()

  for (const record of pages) {
    const shape = classifyPage(record.title)
    if (shape === 'other') {
      shapes.other += 1
      continue
    }
    if (!inScope(record.title)) {
      shapes.other += 1
      continue
    }

    const page = toRawPage(record)

    // Rule 6 runs BEFORE every route, including the squad categories.
    //
    // The first version gated the schedule, season and round pages and let squad
    // categories through unchecked, on the reasoning that a category has no body to
    // classify. A synthetic corpus containing `קטגוריה:סגל הפועל ת"א (כדורסל) 1980/81`
    // walked straight past it and put a basketball player into the football squad —
    // exactly the contamination the rule exists to stop, and it took eleven characters
    // in a page title to do it. The gate classifies on the title too, so it catches this.
    if (!acceptFootballPage(page, report)) continue

    if (shape === 'squad-category') {
      shapes['squad-category'] += 1
      const members = record.links ?? []
      for (const member of members) playerTitles.add(member)
      bundle.squadMemberships.push(...parseSquadCategory(page, members, report))
      continue
    }

    if (shape === 'season') {
      shapes.season += 1
      const season = parseSeasonPage(page, report)
      if (season) bundle.seasons.push(season)
      continue
    }

    if (shape === 'schedule') {
      shapes.schedule += 1
      const result = parseSchedulePage(page, report, {
        defaultCompetitionSlug: DEFAULT_LEAGUE_SLUG,
      })
      bundle.matches.push(...result.matches)
      bundle.matchEvents.push(...result.events)
      continue
    }

    if (shape === 'match-round') {
      shapes['match-round'] += 1
      const context = matchContextFromTitle(record.title, DEFAULT_LEAGUE_SLUG)
      if (!context) {
        report.skipped.push({
          entity: 'matches',
          key: record.title,
          reason: 'round page has no season in its title',
        })
        continue
      }
      const match = parseMatchPage(page, context, report)
      if (match) bundle.matches.push(match)
    }
  }

  // The player pass. A page is a player when a squad category listed it.
  for (const record of pages) {
    if (!playerTitles.has(record.title)) continue
    shapes.player += 1
    const person = parsePlayerPage(toRawPage(record), report)
    if (person) bundle.people.push(person)
  }

  // Mint a stable id for every match — the handle a saved life will point at, and the
  // one thing in this pipeline that must survive a correction to the record.
  for (const match of bundle.matches) {
    const result: MintResult = mintMatchId(
      registry,
      match.naturalKey as MatchNaturalKey,
      'football',
    )
    matchIds.set(match.naturalKey, result.id)
    if (result.minted) minted += 1
  }

  report.imported.set('matches', bundle.matches.length)
  report.imported.set('matchEvents', bundle.matchEvents.length)
  report.imported.set('squadMemberships', bundle.squadMemberships.length)
  report.imported.set('people', bundle.people.length)
  report.imported.set('seasons', bundle.seasons.length)

  return { bundle, report, registry, matchIds, minted, shapes }
}
