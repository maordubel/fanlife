/**
 * ויקיפועל's match table, read as a table.
 *
 * The wiki runs Cargo. `תבנית:שליפת טבלת משחקים פשוטה` is a `#cargo_query` over
 * `tables=Games`, which means a page called "לוח משחקי ליגה (כדורגל) 1980/81" contains
 * no fixtures at all — it contains a WHERE clause. Every fixture in the club's history
 * lives in one table with one row per match, and `Special:CargoExport` hands that table
 * to any reader with a browser as JSON.
 *
 * So this file is not a parser in the wikitext sense. It is a reader for structured rows
 * the source itself calls a database, and it exists because the alternative — parsing
 * rendered schedule tables — was reading the output of this table through two layers of
 * template and losing a field at every one.
 *
 * The source's own columns, unrenamed:
 *   day month year   the kickoff date, 0 where the source does not have one
 *   stage            "מחזור 12", "1/8 גמר" — the source's words, never normalised
 *   host oponent     club names (the misspelling is the wiki's; it is a column name)
 *   homescore awayscore
 *   ona              season label
 *   department       THE SPORT, stated per row
 *   mifal            competition
 *   liga             1 when the row is a league fixture, stated by the source
 *   shootout         "3:4 בפנדלים"
 *   result           1 win / 0 loss / x draw — HAPOEL-RELATIVE, and after penalties
 *   comments         free text; usually the scorers, sometimes a note
 *
 * `department` is what makes rule 6 mechanical here. Sport is not inferred from a title
 * or guessed from a category — the wiki wrote it on every row, so the football walk
 * filters on `department === 'כדורגל'` and a row that says anything else, or says
 * nothing, enters nothing.
 */

import { readFileSync } from 'node:fs'

import { matchNaturalKey, type MatchNaturalKey } from '@/lib/canon/matchId'
import {
  IngestValueError,
  canonicalSeasonLabel,
  slugify,
} from '@/scripts/ingest/lib/normalize'
import type { IngestReport } from '@/scripts/ingest/lib/report'
import type {
  Confidence,
  SourceRef,
  Sport,
  StagedClub,
  StagedCompetition,
  StagedMatch,
  StagedMatchEvent,
  StagedSeason,
  StagedVenue,
} from '@/scripts/ingest/lib/types'

/** One export file, one source. Confidence 1: a single source, unreviewed. */
const CARGO_CONFIDENCE: Confidence = 1

/**
 * The wiki's own names for each sport, as written in `department`.
 *
 * Football is one value. Basketball is TWO, and the second is not an inference:
 * `תבנית:שליפת טבלת משחקים פשוטה` queries basketball as
 * `department='כדורסל' OR department='הפועל אוסישקין'`, so the source itself states that
 * Hapoel Ussishkin's fixtures belong to the basketball walk. Rule 6 is satisfied because
 * the value is explicit on every row — what it must never accept is a row that declares
 * nothing.
 */
export const DEPARTMENT: Readonly<Record<Sport, readonly string[]>> = {
  football: ['כדורגל'],
  basketball: ['כדורסל', 'הפועל אוסישקין'],
}

export type CargoRow = {
  day: number | string | null
  month: number | string | null
  year: number | string | null
  stage: string | null
  host: string | null
  oponent: string | null
  homescore: number | string | null
  awayscore: number | string | null
  ona: string | null
  department: string | null
  mifal: string | null
  shootout: string | null
  comments: string | null
  liga: number | string | null
  result: number | string | null
  /** 1 our home, 0 our away, x a neutral ground. Present only in a 26-field export. */
  homegame?: number | string | null
  stadium?: string | null
  hour?: string | null
  coach?: string | null
  ref?: string | null
  shofet1?: string | null
  shofet2?: string | null
  shofet3?: string | null
  shidur?: string | null
  monthname?: string | null
  mifalname?: string | null
}

/* ---------------------------------------------------------------- the file */

/**
 * Read an export file into rows.
 *
 * Two things about the real download that a strict `JSON.parse` does not survive, and
 * both are the operator doing nothing wrong:
 *  · Saving two queries into one file yields two top-level arrays back to back.
 *  · Cargo emits HTML entities inside JSON strings, so `הפועל ת&quot;א` is what arrives
 *    and `הפועל ת"א` is what the club is called. Left alone it is a different club.
 */
export function readCargoJson(text: string): CargoRow[] {
  const rows: CargoRow[] = []
  let cursor = 0
  while (cursor < text.length) {
    while (cursor < text.length && /\s/.test(text[cursor] ?? '')) cursor += 1
    if (cursor >= text.length) break
    if (text[cursor] !== '[') {
      // Not an array here: either trailing noise or a page that is not an export.
      break
    }
    const end = matchingBracket(text, cursor)
    if (end === -1) break
    rows.push(...(JSON.parse(text.slice(cursor, end + 1)) as CargoRow[]))
    cursor = end + 1
  }
  return rows.map(unescapeRow)
}

export function readCargoFile(path: string): CargoRow[] {
  return readCargoJson(readFileSync(path, 'utf8'))
}

function matchingBracket(text: string, open: number): number {
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = open; index < text.length; index += 1) {
    const char = text[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') inString = true
    else if (char === '[') depth += 1
    else if (char === ']') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

const ENTITIES: Readonly<Record<string, string>> = {
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
}

export function unescapeEntities(value: string): string {
  return value.replace(/&(?:quot|apos|amp|lt|gt|nbsp|#39);/g, (found) => ENTITIES[found] ?? found)
}

function unescapeRow(row: CargoRow): CargoRow {
  const out = { ...row } as Record<string, unknown>
  for (const [key, value] of Object.entries(out)) {
    if (typeof value === 'string') out[key] = unescapeEntities(value).trim()
  }
  return out as CargoRow
}

/* -------------------------------------------------------------- the fields */

/**
 * A text field, whatever JSON type it arrived as.
 *
 * `ona` is a string on almost every row and a NUMBER on the handful of single-year
 * seasons, so `row.ona?.trim()` threw on the real file. A column's JSON type is the
 * exporter's business; the reader's business is the value.
 */
function text(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const asText = typeof value === 'string' ? value : String(value)
  const trimmed = asText.trim()
  // `?` — and `???` — is this table's own word for "not known". It appears in
  // `result`, in the scores, in `homegame`, and in the 26-field export in club and
  // venue names too. Treating it as a value produced `slugify: empty input`.
  return trimmed === '' || /^\?+$/.test(trimmed) ? null : trimmed
}

/** A count the source states, or null. `'?'`, `''` and 0-as-missing never become a number. */
function intOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed === '' || trimmed === '?') return null
  return /^-?\d+$/.test(trimmed) ? Number(trimmed) : null
}

/**
 * The date, or null.
 *
 * The source writes `0` into day, month and year for a fixture whose date it does not
 * hold — 38 rows in the football table. Zero is not a date and must not become one:
 * `0000-00-00` would sort, format and compare like a real value.
 */
export function playedOnFrom(row: CargoRow): string | null {
  const year = intOrNull(row.year)
  const month = intOrNull(row.month)
  const day = intOrNull(row.day)
  if (!year || !month || !day) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * `result` is Hapoel's outcome, and it is the outcome AFTER a shootout.
 *
 * Checked rather than assumed: across all 3,193 football rows it agrees with the
 * scoreline 3,163 times. Of the 29 disagreements, 28 are drawn scorelines that carry a
 * `shootout` value — a cup tie where the source records who went through. So the field
 * is not wrong and the score is not wrong; they answer different questions.
 * The 29th disagrees with no shootout to explain it, and that one is REPORTED as a
 * conflict rather than resolved. Deciding it here would be inventing.
 */
export type ResultCode = 'win' | 'loss' | 'draw' | null

export function resultCode(value: unknown): ResultCode {
  const raw = String(value ?? '').trim().toLowerCase()
  if (raw === '1') return 'win'
  if (raw === '0') return 'loss'
  if (raw === 'x') return 'draw'
  return null
}

/**
 * Competition type, mapped only from names the source actually writes.
 *
 * `liga` is the source's own flag and is trusted for league. Everything else is matched
 * against exact strings; an unmapped name becomes `other` AND is reported, so a new
 * competition surfaces as a question instead of being silently filed as miscellaneous.
 */
const COMPETITION_TYPES: ReadonlyArray<readonly [string, StagedCompetition['type']]> = [
  ['גביע המדינה', 'national_cup'],
  ['גביע ארץ ישראל', 'national_cup'],
  ['גביע האיגוד', 'national_cup'],
  ['גביע הטוטו', 'league_cup'],
  ['גביע הטוטו לאומית', 'league_cup'],
  ['גביע האינטרטוטו', 'europe'],
  ['גביע אסיה לאלופות', 'europe'],
  ['גביע אירופה לאלופות', 'europe'],
  ['גביע אופא', 'europe'],
  ['הליגה האירופית', 'europe'],
  ['ליגת האלופות', 'europe'],
  ['גביע אלוף האלופים', 'other'],
  ['גביע שפירא', 'other'],
  ['גביע ליליאן', 'other'],
]

export function competitionType(
  nameHe: string,
  isLeague: boolean,
): { type: StagedCompetition['type']; mapped: boolean } {
  if (isLeague) return { type: 'league', mapped: true }
  const found = COMPETITION_TYPES.find(([name]) => name === nameHe)
  return found ? { type: found[1], mapped: true } : { type: 'other', mapped: false }
}

/* ------------------------------------------------------------ club identity */

/**
 * Club names arrive as the wiki writes them — `הפועל ת"א` on one row and
 * `הפועל תל אביב` on another — so a slug alone would split one club in two. The manual
 * club file already carries the aliases, and it stays the authority: it owns `isUs` and,
 * per rule 13, `isDerbyRival`. A name the file does not know is slugged, emitted for
 * review, and never flagged as anything.
 */
export type ClubResolver = (nameHe: string) => string | null

export function resolverFromRecords(
  records: ReadonlyArray<{ slug: string; nameHe: string; aliases?: string[]; sport?: string }>,
  sport: Sport,
): ClubResolver {
  const index = new Map<string, string>()
  for (const record of records) {
    if (record.sport && record.sport !== sport) continue
    for (const name of [record.nameHe, ...(record.aliases ?? [])]) {
      const key = normaliseName(name)
      if (key) index.set(key, record.slug)
    }
  }
  return (nameHe) => index.get(normaliseName(nameHe)) ?? null
}

function normaliseName(value: string): string {
  return value
    .replace(/\s*\((?:כדורגל|כדורסל)\)\s*$/u, '')
    .replace(/[־–—]/gu, '-')
    .replace(/\s+/gu, ' ')
    .trim()
}

/* ---------------------------------------------------------------- the walk */

export type CargoOptions = {
  sport: Sport
  /** Seasons to keep. Empty means every season in the file. */
  seasons?: readonly string[]
  resolveClub?: ClubResolver
  /** The club this project is about. Goals in `comments` belong to it, and its own
   *  goal count is what bounds how many the text may name. Never guessed here. */
  usClubSlug?: string
  source: SourceRef
}

/**
 * `homegame` is the source's own home/away marker, and rule 36 says that half of a
 * match's identity is never defaulted. Here it does not have to be: `host` and `oponent`
 * already state it, so `homegame` is read for the ONE thing they cannot say — a `x`,
 * meaning the tie was played on neither club's ground. A final at a neutral venue that
 * looked like a home game is exactly the kind of quiet error this catches.
 */
export type Ground = 'home' | 'away' | 'neutral' | null

export function groundFrom(value: unknown): Ground {
  const raw = String(value ?? '').trim().toLowerCase()
  if (raw === '1') return 'home'
  if (raw === '0') return 'away'
  if (raw === 'x') return 'neutral'
  return null
}

export type CargoResult = {
  matches: StagedMatch[]
  matchEvents: StagedMatchEvent[]
  venues: StagedVenue[]
  /** Who managed us, per match. The source states it; nothing here builds spells. */
  coaches: Array<{ matchNaturalKey: MatchNaturalKey; nameHe: string }>
  /** Referees, in the order the source lists them. */
  officials: Array<{ matchNaturalKey: MatchNaturalKey; nameHe: string; seq: number }>
  clubs: StagedClub[]
  competitions: StagedCompetition[]
  seasons: StagedSeason[]
  /** natural key -> the row it came from, so a caller can mint ids without re-reading */
  keys: MatchNaturalKey[]
  unmappedCompetitions: string[]
  unknownClubs: string[]
}

export function cargoToStaged(
  rows: readonly CargoRow[],
  options: CargoOptions,
  report: IngestReport,
): CargoResult {
  const wanted = new Set(options.seasons ?? [])
  const accepted = new Set(DEPARTMENT[options.sport])
  const resolve = options.resolveClub ?? (() => null)

  const matches: StagedMatch[] = []
  const matchEvents: StagedMatchEvent[] = []
  const keys: MatchNaturalKey[] = []
  const clubs = new Map<string, StagedClub>()
  const competitions = new Map<string, StagedCompetition>()
  const seasons = new Map<string, StagedSeason>()
  const venues = new Map<string, StagedVenue>()
  const coaches: CargoResult['coaches'] = []
  const officials: CargoResult['officials'] = []
  const unmappedCompetitions = new Set<string>()
  const unknownClubs = new Set<string>()
  const seenKeys = new Set<string>()

  for (const [index, row] of rows.entries()) {
    const rowKey = `cargo#${index + 1}`

    // Rule 6, and it is a filter rather than a judgement because the source states it.
    const declared = text(row.department)
    if (declared === null || !accepted.has(declared)) {
      report.rejected.push({
        entity: 'matches',
        key: rowKey,
        reason: `department is ${declared ?? 'missing'}, not one of ${[...accepted].join(' / ')}`,
      })
      continue
    }

    const seasonLabel = text(row.ona)
    if (!seasonLabel) {
      report.skipped.push({ entity: 'matches', key: rowKey, reason: 'row has no season' })
      continue
    }
    if (wanted.size > 0 && !wanted.has(seasonLabel)) continue

    const hostName = text(row.host)
    const awayName = text(row.oponent)
    if (!hostName || !awayName) {
      report.skipped.push({
        entity: 'matches',
        key: rowKey,
        reason: 'row does not name both clubs',
      })
      continue
    }

    const competitionName = text(row.mifal)
    if (!competitionName) {
      report.skipped.push({ entity: 'matches', key: rowKey, reason: 'row has no competition' })
      continue
    }

    const homeClubSlug = clubSlug(hostName, options.sport, resolve, clubs, unknownClubs, options.source)
    const awayClubSlug = clubSlug(awayName, options.sport, resolve, clubs, unknownClubs, options.source)
    const competitionSlug = slugify(competitionName)
    // The stage is the source's own words. Normalising "מחזור 12" would throw away the
    // only thing that separates two meetings of the same pair in the same season.
    const stage = text(row.stage)

    const key = matchNaturalKey({
      sport: options.sport,
      seasonLabel,
      competitionSlug,
      homeClubSlug,
      awayClubSlug,
      stage,
    })

    if (seenKeys.has(key)) {
      report.skipped.push({
        entity: 'matches',
        key: rowKey,
        reason: `duplicate of an earlier row with the same key: ${key}`,
      })
      continue
    }
    seenKeys.add(key)

    const homeScore = intOrNull(row.homescore)
    const awayScore = intOrNull(row.awayscore)
    const played = homeScore !== null && awayScore !== null
    const shootout = text(row.shootout)

    // The one thing worth flagging: the source's verdict disagrees with its own score
    // and there is no shootout to explain it. Both values are kept; neither is chosen.
    const verdict = resultCode(row.result)
    if (verdict && played && !shootout) {
      const scoreVerdict = homeScore === awayScore ? 'draw' : null
      if (scoreVerdict === 'draw' && verdict !== 'draw') {
        report.note(
          `${key}: source records "${verdict}" on a ${homeScore}:${awayScore} scoreline with no shootout — kept as stated, unresolved`,
        )
      }
    }

    // Scorers, bounded by the scoreline. `usClubSlug` decides which side we are on;
    // without it the bound cannot be computed and the cell is kept as a note instead.
    const usIsHome = options.usClubSlug ? homeClubSlug === options.usClubSlug : null
    const usIsAway = options.usClubSlug ? awayClubSlug === options.usClubSlug : null
    const ourGoals =
      usIsHome === true ? homeScore : usIsAway === true ? awayScore : null
    // `comments` holds OUR goalscorers — a football convention. In the basketball rows
    // the same column is a note, and reading it as scorers produced twenty "goals" in a
    // sport that does not record them that way. The column is kept as a note there.
    const scorers =
      options.sport === 'football'
        ? readScorers(text(row.comments), ourGoals)
        : { events: [], notes: [text(row.comments) ?? ''].filter(Boolean), refused: null }
    if (scorers.refused) {
      report.skipped.push({
        entity: 'matchEvents',
        key: `${key}`,
        reason: `scorer cell refused, match kept: ${scorers.refused}`,
      })
    }
    if (options.usClubSlug && usIsHome === false && usIsAway === false) {
      report.note(`${key}: neither club is ${options.usClubSlug} — scorers not attributed`)
    }
    const attributedTo =
      usIsHome === true || usIsAway === true ? (options.usClubSlug ?? null) : null
    matchEvents.push(...scorerEvents(key, scorers, attributedTo, options.source))

    const noteParts = [shootout, ...scorers.notes].filter(Boolean)

    // Fields present only in the full 26-column export. A file without them yields null
    // everywhere here and nothing else changes.
    const ground = groundFrom(row.homegame)
    if (ground === 'neutral') noteParts.push('מגרש ניטרלי')

    const venueName = text(row.stadium)
    let venueSlug: string | null = null
    if (venueName) {
      venueSlug = slugify(venueName)
      if (!venues.has(venueSlug)) {
        venues.set(venueSlug, {
          slug: venueSlug,
          nameHe: venueName,
          city: null,
          sport: options.sport,
          aliases: [venueName],
          source: options.source,
          confidence: CARGO_CONFIDENCE,
        })
      }
    }

    const coachName = text(row.coach)
    if (coachName) coaches.push({ matchNaturalKey: key, nameHe: coachName })

    for (const [offset, official] of [row.shofet1, row.shofet2, row.shofet3].entries()) {
      const name = text(official)
      if (name) officials.push({ matchNaturalKey: key, nameHe: name, seq: offset + 1 })
    }

    // A kickoff time is confirmed only when the source writes one (rule: never invent).
    const kickoff = text(row.hour)

    matches.push({
      naturalKey: key,
      seasonLabel,
      competitionSlug,
      stage,
      playedOn: playedOnFrom(row),
      kickoffConfirmed: kickoff !== null,
      homeClubSlug,
      awayClubSlug,
      venueSlug,
      homeScore,
      awayScore,
      attendance: null,
      attendanceDisputed: false,
      travellingSupporters: null,
      noteHe: noteParts.length > 0 ? noteParts.join(' · ') : null,
      status: played ? 'played' : 'unknown',
      wikiPage: null,
      source: options.source,
      confidence: CARGO_CONFIDENCE,
    })
    keys.push(key)

    if (!seasons.has(seasonLabel)) {
      seasons.set(seasonLabel, stagedSeason(seasonLabel, options.source, report, rowKey))
    }

    if (!competitions.has(competitionSlug)) {
      const { type, mapped } = competitionType(competitionName, intOrNull(row.liga) === 1)
      if (!mapped) unmappedCompetitions.add(competitionName)
      competitions.set(competitionSlug, {
        slug: competitionSlug,
        nameHe: competitionName,
        type,
        sport: options.sport,
        tier: null,
        aliases: [competitionName],
        source: options.source,
        confidence: CARGO_CONFIDENCE,
      })
    }
  }

  const cleanSeasons = [...seasons.values()].filter((season): season is StagedSeason => season !== null)

  return {
    matches,
    matchEvents,
    venues: [...venues.values()],
    coaches,
    officials,
    clubs: [...clubs.values()],
    competitions: [...competitions.values()],
    seasons: cleanSeasons,
    keys,
    unmappedCompetitions: [...unmappedCompetitions],
    unknownClubs: [...unknownClubs],
  }
}

function clubSlug(
  nameHe: string,
  sport: Sport,
  resolve: ClubResolver,
  clubs: Map<string, StagedClub>,
  unknown: Set<string>,
  source: SourceRef,
): string {
  const known = resolve(nameHe)
  if (known) return known
  const slug = slugify(normaliseName(nameHe))
  unknown.add(nameHe)
  if (!clubs.has(slug)) {
    clubs.set(slug, {
      slug,
      nameHe: normaliseName(nameHe),
      nameEn: null,
      city: null,
      sport,
      // Never set here. `isUs` and `isDerbyRival` belong to the manual club file (rule 13).
      isUs: false,
      isDerbyRival: false,
      aliases: [nameHe],
      source,
      confidence: CARGO_CONFIDENCE,
    })
  }
  return slug
}

function stagedSeason(
  label: string,
  source: SourceRef,
  report: IngestReport,
  rowKey: string,
): StagedSeason {
  try {
    const canonical = canonicalSeasonLabel(label)
    return {
      label: canonical.label,
      startYear: canonical.startYear,
      endYear: canonical.endYear,
      eraSlug: null,
      aliases: [label],
      source,
      confidence: CARGO_CONFIDENCE,
    }
  } catch (error) {
    // The table holds a few spans the canonical form does not cover ("1966-68").
    // The label is kept exactly as written and the years are left unknown.
    report.skipped.push({
      entity: 'seasons',
      key: `${rowKey}:${label}`,
      reason: `season label kept as written, years unknown: ${
        error instanceof IngestValueError || error instanceof Error ? error.message : String(error)
      }`,
    })
    const years = [...label.matchAll(/\d{4}/g)].map((found) => Number(found[0]))
    const startYear = years[0] ?? 0
    return {
      label,
      startYear,
      endYear: startYear,
      eraSlug: null,
      aliases: [label],
      source,
      confidence: CARGO_CONFIDENCE,
    }
  }
}

/* --------------------------------------------------------------- scorers */

/**
 * `comments` is free text and it is mostly the scorers.
 *
 * Mostly is the problem. The column holds `רפעת טורק, שבתאי לוי`, and `צמד שבתאי לוי`
 * (a brace), and `משה סיני (55, פנדל)`, and `[[אלי כהן]] (5)`, and also
 * `ניצחון טכני`, and also a whole sentence about three players being sent off. A parser
 * confident enough to read the first four will read the last two as goals.
 *
 * So extraction is deliberately conservative AND it is checked against arithmetic the
 * row already carries: **the goals read out of the text may never exceed the goals the
 * scoreline gives Hapoel.** If they do, the read is wrong — not partly wrong, wrong —
 * and the whole cell is dropped with a reason rather than contributing invented goals.
 * Fewer is normal and is left alone: a source that names two of three scorers is being
 * incomplete, not being false.
 */
const MULTIPLIER: ReadonlyArray<readonly [RegExp, number]> = [
  [/^צמד\s+/u, 2],
  [/^שלושער\s+/u, 3],
  [/^רביעייה\s+/u, 4],
]

/** A segment that is a plain personal name, optionally with minutes attached. */
const NAME = /^[֐-׿'"’\-\s.]+$/u
/** Phrases that mean the segment is a note about the match, not a scorer. */
const NOT_A_SCORER =
  /נצח|נצחון|ניצחון|הפסד|בפנדלים|הורחק|בוטל|נדחה|משחק שני|טכני|זכתה|עלתה|ירדה|ללא קהל|דלתיים/u

/**
 * Function words. A personal name does not contain one, and a sentence cannot avoid them.
 *
 * This list is what separates `אלי כהן (23)` from
 * `לא נערך בתאריך המקורי (19.2.83) עקב תנאי המגרש` — which, before it existed, was read
 * as three scorers in a match Hapoel won 1:0. The arithmetic guard below caught it and
 * threw the cell away, taking the one real scorer with it; catching it here keeps him.
 */
const FUNCTION_WORDS = new Set(
  (
    'לא נערך נערכה נדחה בתאריך המקורי עקב תנאי המגרש בגלל בשל לאחר אחרי לפני היה היתה ' +
    'הייתה שוחק שוחקה של עם על ללא בין גם כל אך אבל וכן או כי אשר זה זו הוא היא הם הן ' +
    'כאשר בעקבות למרות כדי מול נגד יותר פחות רק עדיין כבר שוב פעם אין יש היום אתמול'
  ).split(' '),
)

function looksLikeSentence(name: string): boolean {
  return name
    .split(' ')
    .some((word) => FUNCTION_WORDS.has(word.replace(/["'’.]/gu, '')))
}

export type ScorerRead = {
  events: Array<{ personName: string; goals: number; minute: number | null }>
  /** Segments that were not read as scorers, kept verbatim for the match note. */
  notes: string[]
  /** Set when the whole cell was refused because it named more goals than were scored. */
  refused: string | null
}

export function readScorers(comments: string | null, hapoelGoals: number | null): ScorerRead {
  const out: ScorerRead = { events: [], notes: [], refused: null }
  const text = comments?.trim()
  if (!text) return out

  for (const rawSegment of text.split(/[,.]\s+|(?<=\))\s+/u)) {
    const segment = rawSegment.trim().replace(/^[.,\s]+|[.,\s]+$/gu, '')
    if (!segment) continue

    if (NOT_A_SCORER.test(segment)) {
      out.notes.push(segment)
      continue
    }

    // minutes: "(76)", "(55, פנדל)", "/76", "/40"
    const minuteMatch = /\((\d{1,3})[^)]*\)\s*$/u.exec(segment) ?? /\/\s*(\d{1,3})/u.exec(segment)
    const minute = minuteMatch ? Number(minuteMatch[1]) : null

    let name = segment
      .replace(/\([^)]*\)/gu, ' ')
      .replace(/\/[\d,\s]+/gu, ' ')
      .replace(/\[\[|\]\]/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim()

    let goals = 1
    for (const [pattern, count] of MULTIPLIER) {
      if (pattern.test(name)) {
        goals = count
        name = name.replace(pattern, '').trim()
        break
      }
    }

    // A scorer is a name: Hebrew letters and separators, two words or more, and short.
    const words = name.split(' ').filter(Boolean)
    if (
      !NAME.test(name) ||
      words.length < 2 ||
      words.length > 4 ||
      name.length > 40 ||
      looksLikeSentence(name)
    ) {
      out.notes.push(segment)
      continue
    }

    out.events.push({ personName: name, goals, minute })
  }

  const claimed = out.events.reduce((total, event) => total + event.goals, 0)
  if (hapoelGoals !== null && claimed > hapoelGoals) {
    out.refused = `text names ${claimed} goals, the scoreline gives ${hapoelGoals}`
    return { events: [], notes: [text], refused: out.refused }
  }
  return out
}

/**
 * Turn the scorer reads into match events, in the order the source wrote them.
 *
 * `clubSlug` is the club the goals belong to — always the club this project is about,
 * because the column only ever records our own scorers. It is passed in rather than
 * assumed, so nothing here decides who "we" are.
 */
export function scorerEvents(
  matchKey: MatchNaturalKey,
  read: ScorerRead,
  clubSlug: string | null,
  source: SourceRef,
): StagedMatchEvent[] {
  const events: StagedMatchEvent[] = []
  let seq = 0
  for (const entry of read.events) {
    for (let copy = 0; copy < entry.goals; copy += 1) {
      seq += 1
      events.push({
        matchNaturalKey: matchKey,
        seq,
        // A brace with one minute names one minute; the second goal's is unknown.
        minute: copy === 0 ? entry.minute : null,
        minuteExtra: null,
        type: 'goal',
        clubSlug,
        personSlug: slugify(entry.personName),
        relatedPersonSlug: null,
        source,
        confidence: CARGO_CONFIDENCE,
      })
    }
  }
  return events
}
