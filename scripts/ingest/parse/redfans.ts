/**
 * Red-Fans page shapes the narrow parsers do not read.
 *
 * `parse/index.ts` reads a player infobox, a season title and a squad TABLE. Maor's
 * research brief shows the wiki does not mostly work that way, and the three shapes it
 * does use are the three that carry the 1980–82 window:
 *
 *   1. **`לוח משחקים (כדורגל) 1980/81`** — a season's whole schedule as one wikitable:
 *      date, competition, round, home, away, result, scorers. This is the single
 *      highest-yield page in the wiki for this project, and nothing read it.
 *   2. **`קטגוריה:סגל הפועל ת"א (כדורגל) 1980/81`** — a squad is a CATEGORY whose
 *      members are player pages, not a table of rows. The existing squad parser expects
 *      a table and would report every one of the 98 squad categories as unreadable.
 *   3. **`עונת 1996/97 (כדורגל) מחזור 1`** — a per-round match page. The existing match
 *      parser needs the caller to hand it the season, competition and stage, which means
 *      it cannot be driven from a corpus walk at all. The title already contains all
 *      three.
 *
 * Everything here is pure: wikitext in, staged rows out, no network and no database, so
 * every parser is testable against a fixture. Nothing invents. A column that is not
 * there is null, a row that cannot be read is reported with a reason, and a page whose
 * sport cannot be proven is refused by the caller's gate before it arrives here.
 */

import { extractTableRows } from '../adapters/mediawiki'
import {
  canonicalSeasonLabel,
  parseIsoDate,
  parseScore,
  slugify,
} from '@/scripts/ingest/lib/normalize'
import type { IngestReport } from '@/scripts/ingest/lib/report'
import type {
  Confidence,
  RawPage,
  StagedMatch,
  StagedMatchEvent,
  StagedSquadMembership,
} from '@/scripts/ingest/lib/types'
import { matchNaturalKey } from '@/lib/canon/matchId'

import { HAPOEL_CLUB_SLUG, sourceForPage } from './index'

/** One wiki page is one source, unverified until a human raises it (rule 2). */
const WIKI_CONFIDENCE: Confidence = 1

/* ------------------------------------------------------------------ titles */

/**
 * The season a page is about, read from its own title.
 *
 * Every Red-Fans page that belongs to a season names it: `לוח משחקים (כדורגל) 1980/81`,
 * `עונת 1996/97 (כדורגל) מחזור 1`, `קטגוריה:סגל הפועל ת"א (כדורגל) 1990/91`. Reading it
 * from the title is what lets a corpus walk route pages without a hand-written index.
 */
export function seasonFromTitle(title: string): string | null {
  const raw = /(\d{4}\s*[/\-–—]\s*\d{2,4})/.exec(title)?.[1]
  if (!raw) return null
  try {
    return canonicalSeasonLabel(raw).label
  } catch {
    return null
  }
}

/**
 * The stage, read from the title of a per-round page.
 *
 * `מחזור 1`, `רבע גמר`, `גמר`, `1/8 גמר משחק 2`. Kept as the source's own words rather
 * than mapped onto a vocabulary of ours: the stage is part of the match's natural key,
 * and normalising it would silently merge two different matches.
 */
export function stageFromTitle(title: string): string | null {
  const after = title.replace(/^.*\(כדורגל\)\s*/u, '').trim()
  if (after === '' || after === title.trim()) return null
  return after
}

/* --------------------------------------------------------- schedule page */

/** Column headers a season schedule uses, in the order the parser looks for them. */
const COLUMNS = {
  date: ['תאריך'],
  competition: ['מפעל', 'תחרות', 'מסגרת'],
  stage: ['מחזור', 'שלב', 'סיבוב'],
  home: ['בית', 'קבוצה ביתית', 'מארחת'],
  away: ['חוץ', 'קבוצה אורחת', 'אורחת'],
  opponent: ['יריבה', 'יריב', 'נגד'],
  score: ['תוצאה'],
  scorers: ['מבקיעים', 'שערים', 'כובשים'],
  venue: ['אצטדיון', 'מגרש', 'מקום'],
} as const

function columnIndex(header: readonly string[], names: readonly string[]): number {
  return header.findIndex((cell) => names.some((name) => cell.includes(name)))
}

export type ScheduleResult = {
  matches: StagedMatch[]
  events: StagedMatchEvent[]
}

/**
 * A season's schedule table.
 *
 * Columns are resolved by HEADER TEXT, never by position — a source that inserts a
 * column would otherwise shift every value by one, which is the failure mode that makes
 * a scraped table quietly wrong rather than loudly broken. The existing squad parser
 * already works this way and it is the right precedent.
 *
 * **Home and away are derived, not assumed.** Some schedules name both clubs; others
 * name only the opponent and mark home or away with a letter or a symbol. Both shapes
 * are read, and a row that supports neither is reported rather than guessed — putting
 * Hapoel at home by default would invent a fact in the field that decides the match's
 * identity.
 */
export function parseSchedulePage(
  page: RawPage,
  report: IngestReport,
  options: { defaultCompetitionSlug?: string } = {},
): ScheduleResult {
  const empty: ScheduleResult = { matches: [], events: [] }

  const seasonLabel = seasonFromTitle(page.title)
  if (!seasonLabel) {
    report.skipped.push({
      entity: 'matches',
      key: page.title,
      reason: 'schedule page has no season label in its title',
    })
    return empty
  }

  const rows = extractTableRows(page.sourceText)
  if (rows.length < 2) {
    report.skipped.push({ entity: 'matches', key: page.title, reason: 'no schedule table' })
    return empty
  }

  const header = (rows[0] ?? []).map((cell) => cell.trim())
  const col = {
    date: columnIndex(header, COLUMNS.date),
    competition: columnIndex(header, COLUMNS.competition),
    stage: columnIndex(header, COLUMNS.stage),
    home: columnIndex(header, COLUMNS.home),
    away: columnIndex(header, COLUMNS.away),
    opponent: columnIndex(header, COLUMNS.opponent),
    score: columnIndex(header, COLUMNS.score),
    scorers: columnIndex(header, COLUMNS.scorers),
    venue: columnIndex(header, COLUMNS.venue),
  }

  const namesBothClubs = col.home !== -1 && col.away !== -1
  if (!namesBothClubs && col.opponent === -1) {
    report.rejected.push({
      entity: 'matches',
      key: page.title,
      reason: `schedule table names no clubs (header: ${header.join(' / ')})`,
    })
    return empty
  }

  const source = sourceForPage(page)
  const out: ScheduleResult = { matches: [], events: [] }

  for (const [index, row] of rows.slice(1).entries()) {
    const rowKey = `${page.title}#${index + 1}`
    const cell = (at: number): string | null => (at === -1 ? null : row[at]?.trim() || null)

    // A repeated header mid-table is a real pattern in a hand-maintained source.
    if (col.date !== -1 && row[col.date]?.trim() === header[col.date]) {
      report.skipped.push({ entity: 'matches', key: rowKey, reason: 'repeated header row' })
      continue
    }

    let home: string | null = null
    let away: string | null = null

    if (namesBothClubs) {
      home = cell(col.home)
      away = cell(col.away)
    } else {
      const opponent = cell(col.opponent)
      const venueHint = `${cell(col.venue) ?? ''} ${row.join(' ')}`
      const atHome = homeMarker(venueHint)
      if (opponent && atHome !== null) {
        home = atHome ? 'הפועל תל אביב' : opponent
        away = atHome ? opponent : 'הפועל תל אביב'
      }
    }

    if (!home || !away) {
      report.skipped.push({
        entity: 'matches',
        key: rowKey,
        reason: 'row does not establish both clubs, and home/away was not marked',
      })
      continue
    }

    const competitionSlug = slugify(cell(col.competition) ?? options.defaultCompetitionSlug ?? '')
    if (!competitionSlug) {
      report.skipped.push({
        entity: 'matches',
        key: rowKey,
        reason: 'no competition on the row and no default supplied',
      })
      continue
    }

    const stage = cell(col.stage)
    const homeSlug = slugify(home)
    const awaySlug = slugify(away)
    const score = parseScore(cell(col.score))

    let playedOn: string | null = null
    try {
      playedOn = parseIsoDate(cell(col.date))
    } catch {
      // A bad date must not delete a match — the row is kept and the loss is named.
      report.skipped.push({
        entity: 'matches',
        key: rowKey,
        reason: `date dropped, row kept: ${cell(col.date) ?? ''}`,
      })
    }

    const naturalKey = matchNaturalKey({
      sport: 'football',
      seasonLabel,
      competitionSlug,
      homeClubSlug: homeSlug,
      awayClubSlug: awaySlug,
      stage,
    })

    out.matches.push({
      naturalKey,
      seasonLabel,
      competitionSlug,
      stage,
      playedOn,
      kickoffConfirmed: false,
      homeClubSlug: homeSlug,
      awayClubSlug: awaySlug,
      venueSlug: cell(col.venue) ? slugify(cell(col.venue) as string) : null,
      homeScore: score?.home ?? null,
      awayScore: score?.away ?? null,
      attendance: null,
      attendanceDisputed: false,
      travellingSupporters: null,
      noteHe: null,
      status: score ? 'played' : 'unknown',
      wikiPage: page.title,
      source,
      confidence: WIKI_CONFIDENCE,
    })

    for (const event of parseScorerCell(cell(col.scorers), naturalKey, source)) {
      out.events.push(event)
    }
  }

  return out
}

/**
 * Is Hapoel at home on this row?
 *
 * Only when the source says so. `בית`/`ב'` and `חוץ`/`ח'` are the markers a Hebrew
 * schedule uses. Anything else returns null and the row is skipped — a default would
 * make up the half of a match's identity that decides which fixture it even is.
 */
function homeMarker(text: string): boolean | null {
  if (/(^|\s)(בית|ביתי|ב')(\s|$)/u.test(text)) return true
  if (/(^|\s)(חוץ|חוצה|ח')(\s|$)/u.test(text)) return false
  return null
}

/**
 * Scorers, from a schedule cell.
 *
 * The shape a Hebrew schedule uses is a comma-separated list, each entry optionally
 * carrying a minute (`שבתאי לוי 34'`) and optionally a multiplier (`אלי כהן (4)`).
 * Only what is written is read:
 *
 *  · a name with no minute becomes a goal with `minute: null`, not a guessed minute;
 *  · `(4)` produces four goal rows, because four goals is what it says;
 *  · the club is left NULL. A schedule cell headed "מבקיעים" does not state whose
 *    scorers they are, and assuming Hapoel's would be wrong the moment a source lists
 *    both sides.
 */
export function parseScorerCell(
  cellText: string | null,
  matchNaturalKeyValue: string,
  source: StagedMatchEvent['source'],
): StagedMatchEvent[] {
  if (!cellText) return []
  const out: StagedMatchEvent[] = []
  let seq = 0

  for (const chunk of cellText.split(/[,،;·]/)) {
    const piece = chunk.trim()
    if (!piece) continue

    const times = Number(/\((\d+)\)/.exec(piece)?.[1] ?? '1')
    const minute = Number(/(\d{1,3})\s*'/.exec(piece)?.[1] ?? '') || null
    const name = piece
      .replace(/\(\d+\)/g, '')
      .replace(/\d{1,3}\s*'/g, '')
      .replace(/[()]/g, '')
      .trim()
    if (!name || /^\d+$/.test(name)) continue

    for (let copy = 0; copy < Math.max(1, Math.min(times, 9)); copy += 1) {
      seq += 1
      out.push({
        matchNaturalKey: matchNaturalKeyValue,
        seq,
        minute,
        minuteExtra: null,
        type: 'goal',
        clubSlug: null,
        personSlug: slugify(name),
        relatedPersonSlug: null,
        source,
        confidence: WIKI_CONFIDENCE,
      })
    }
  }

  return out
}

/* --------------------------------------------------- squad CATEGORY page */

/**
 * A squad, from a category's membership.
 *
 * The brief's headline discovery is that the squad hierarchy holds 98 season
 * subcategories — which means a squad on this wiki is a SET OF PAGES, not a table. Each
 * member title is a player. That is all a category states, so that is all this returns:
 * a person and a season. Shirt number, position, appearances and goals are null here and
 * come from the player's own page or a schedule, never from a guess.
 */
export function parseSquadCategory(
  page: RawPage,
  memberTitles: readonly string[],
  report: IngestReport,
): StagedSquadMembership[] {
  const seasonLabel = seasonFromTitle(page.title)
  if (!seasonLabel) {
    report.skipped.push({
      entity: 'squadMemberships',
      key: page.title,
      reason: 'squad category has no season label in its title',
    })
    return []
  }

  const source = sourceForPage(page)
  const out: StagedSquadMembership[] = []
  const seen = new Set<string>()

  for (const title of memberTitles) {
    // A category holds sub-categories and File: pages alongside its players.
    if (/^(קטגוריה|Category|קובץ|File|תבנית|Template):/u.test(title)) {
      report.skipped.push({
        entity: 'squadMemberships',
        key: title,
        reason: 'category member is not a player page',
      })
      continue
    }
    const slug = slugify(title)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)

    out.push({
      personSlug: slug,
      seasonLabel,
      clubSlug: HAPOEL_CLUB_SLUG,
      shirtNumber: null,
      position: 'UNK',
      onLoan: false,
      appearances: null,
      goals: null,
      source,
      confidence: WIKI_CONFIDENCE,
    })
  }

  return out
}

/* ------------------------------------------------------ per-round match page */

/**
 * A per-round match page, with its context read from its own title.
 *
 * `parseMatchPage` in `parse/index.ts` requires the caller to supply the season, the
 * competition and the stage, which makes it unusable from a corpus walk — nothing in the
 * walk knows those. `עונת 1996/97 (כדורגל) מחזור 1` states two of the three, and the
 * competition falls back to a caller default only when the page itself does not name one.
 */
export function matchContextFromTitle(
  title: string,
  fallbackCompetitionSlug: string,
): { seasonLabel: string; competitionSlug: string; stage: string | null } | null {
  const seasonLabel = seasonFromTitle(title)
  if (!seasonLabel) return null
  const stage = stageFromTitle(title)
  const named = /גביע המדינה|גביע אופ|גביע הטוטו|אינטרטוטו|ליגת האלופות|אירופה/u.exec(title)?.[0]
  return {
    seasonLabel,
    competitionSlug: named ? slugify(named) : fallbackCompetitionSlug,
    stage,
  }
}
