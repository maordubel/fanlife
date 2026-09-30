/**
 * ויקיפועל, read off disk — the `Games` Cargo table and the player pages' own categories.
 *
 * NO NETWORK (rule 36). The three raw exports in `content/raw/` are the record of what
 * was read on 17.9.2026 through the owner's browser; everything in this file is a pass
 * over those bytes, so a parser change re-runs for free and every canonical row stays
 * traceable to the file it came from. `sources/redfans-cargo.ts` stages the same table
 * for the Supabase pipeline and stays where it is; this module produces the CANONICAL
 * rows in `content/manual/*.json` that the game archive reads, which is a different
 * destination with a different schema, and merging the two would make one file answer to
 * two contracts.
 *
 * What the rules make mechanical here:
 *
 *  · **Rule 6 / rule 38 — sport isolation is a FILTER, not a judgement.** `department` IS
 *    the sport and the wiki wrote it on every row (`כדורגל`, `כדורסל`,
 *    `הפועל אוסישקין`). The football walk accepts `כדורגל` and nothing else; a row that
 *    declares another sport, or declares nothing, is COUNTED in the report and enters no
 *    football table. Rule 14 follows from it: a football question cannot draw a
 *    basketball fact because no basketball row is ever in the file it reads.
 *  · **Rule 11 — the ingestion layer never invents.** An unreadable field is `null`, an
 *    unusable row is reported with a reason. Nothing here is dropped silently and
 *    nothing is guessed: a date with a `0` in it does not become a date, an unmarked
 *    ground does not become "not neutral", and a club the archive does not know does not
 *    become a club the archive does know.
 *  · **Rule 36 — home and away are never defaulted.** `host` and `oponent` already name
 *    both sides, so `homegame` is read for the one thing they cannot say: `x`, a tie
 *    played on neither ground.
 *  · **Rule 7 — Hebrew names are matched through aliases, never fuzzily.** A `host` is
 *    compared against `clubs.json`'s `slug`, `nameHe`, `nameEn` and `aliases`, decoded
 *    and whitespace-normalised. Nothing else. A near miss is a MINT, not a merge.
 *  · **Rule 2 — every fact carries a source and a confidence.** Both are on every row
 *    this module emits, and the confidence rule is stated at {@link matchConfidence}.
 *  · **Rule 60 §3 — contradictions are kept, not decided.** A curated row always wins
 *    the slot; where the wiki disagrees with it the disagreement becomes a
 *    `fact-conflicts.json` row, and this module never picks a side.
 *  · **Rule 37 — a squad is read from the PLAYER.** The season comes off the player
 *    page's own `סגל הפועל ת"א (<ענף>) <עונה>` categories, so the sport is INSIDE the
 *    string that carries the season and rule 6 is enforced by the same read.
 *
 * Every exported function is pure apart from the two named `read*File` helpers, which do
 * nothing but `readFileSync` + `JSON.parse`.
 */

import { readFileSync } from 'node:fs'

import { canonicalSeasonLabel, slugify } from '@/scripts/ingest/lib/normalize'

/* ------------------------------------------------------------------- source */

/**
 * Rule 2, on every row this module emits. One source, named, with the date it was read —
 * the export is a file the OWNER downloaded in his own browser (rule 11: the wiki is
 * behind Cloudflare and is not circumvented), so the citation is the table, not a fetch.
 */
export const VIKIPOEL_SOURCE_TITLE =
  'ויקיפועל — טבלת Games (Special:CargoExport), נקרא 17.9.2026'
export const VIKIPOEL_SOURCE_URL =
  'https://wiki.red-fans.com/index.php?title=Special:CargoTables/Games'

/**
 * The squads did not come from `Games` and must not say they did.
 *
 * A squad row is read from the PLAYER page's own categories (rule 37), which is a
 * different export — `api.php`, 641 pages — from the Cargo table that holds the matches.
 * Citing the match table on a squad row would name a source that does not contain the
 * fact, which is the small dishonesty rule 2 exists to prevent. Two reads, two sources.
 */
export const VIKIPOEL_SQUADS_SOURCE_TITLE =
  'ויקיפועל — קטגוריות דפי השחקנים (api.php), נקרא 17.9.2026'
export const VIKIPOEL_SQUADS_SOURCE_URL =
  'https://wiki.red-fans.com/api.php?action=query&prop=categories'

/** The club this archive is about. Resolved from `clubs.json`'s own `isUs` flag. */
export const DEFAULT_US_SLUG = 'הפועל-תל-אביב'

/**
 * Rule 6 and rule 38 in one constant. The wiki writes three values in `department`;
 * exactly one of them is this walk's, and the other two are counted and left alone.
 */
export const FOOTBALL_DEPARTMENT = 'כדורגל'

/* ------------------------------------------------------------ the raw shapes */

/** One row of `Games`, as `Special:CargoExport` writes it. 26 columns. */
export type VikipoelGameRow = {
  page?: string | null
  ona?: string | number | null
  homegame?: string | number | null
  host?: string | null
  oponent?: string | null
  mifal?: string | null
  liga?: string | number | null
  department?: string | null
  homescore?: string | number | null
  awayscore?: string | number | null
  shootout?: string | null
  result?: string | number | null
  day?: string | number | null
  month?: string | number | null
  year?: string | number | null
  stage?: string | null
  stadium?: string | null
  hour?: string | null
  coach?: string | null
  shofet1?: string | null
  shofet2?: string | null
  shofet3?: string | null
  comments?: string | null
  monthname?: string | null
  mifalname?: string | null
  ref?: string | null
  shidur?: string | null
}

/** One player page with the categories `api.php` resolved for it. */
export type VikipoelPlayerPage = {
  pageid?: number
  ns?: number
  title: string
  categories?: Array<{ ns?: number; title: string }>
}

/* -------------------------------------------------------- decoding, ONE place */

/**
 * The export carries HTML entities inside its JSON strings — `&quot;`, `&amp;`,
 * `&#039;`. `הפועל ת&quot;א` left alone is a DIFFERENT club from `הפועל ת"א`, so the
 * decode happens once, here, and every comparison in this file runs on the decoded form.
 */
const ENTITIES: Readonly<Record<string, string>> = {
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&#039;': "'",
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
}

export function decodeEntities(raw: string): string {
  return raw.replace(/&(?:quot|apos|amp|lt|gt|nbsp|#0?39);/g, (found) => ENTITIES[found] ?? found)
}

/**
 * A text cell, whatever JSON type it arrived as.
 *
 * `ona` is a string on almost every row and a NUMBER on the single-year seasons, and
 * `?` — the table's own word for "not known" — appears in `homegame`, in `result` and in
 * names. Neither is a value, so both answer `null` and the caller reports it.
 */
export function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const decoded = decodeEntities(typeof value === 'string' ? value : String(value))
  const collapsed = decoded.replace(/\s+/gu, ' ').trim()
  return collapsed === '' || /^\?+$/.test(collapsed) ? null : collapsed
}

/**
 * The slug convention of `content/manual/*.json`: the name, with its spaces replaced by
 * hyphens. NOT `lib/normalize.slugify()` — that strips gershayim, and the curated file
 * writes `בית"ר-ירושלים` with them. Reading a file means using the file's convention.
 */
export function deriveSlug(name: string): string {
  return (cleanText(name) ?? '').replace(/ /gu, '-')
}

/** An integer the source states, or null. `0`, `''` and `'?'` never become a number. */
function intOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const text = cleanText(value)
  if (text === null) return null
  return /^-?\d+$/.test(text) ? Number(text) : null
}

/* --------------------------------------------------------------------- dates */

/**
 * The date, or null — and `0` is not a date.
 *
 * `day`, `month` and `year` are integers and the source writes `0` into the ones it does
 * not hold. A row missing any of the three has NO date: `1928-00-00` would sort, format
 * and compare like a real value, and picking a day of the month would be inventing the
 * one field the source explicitly declined to write.
 */
export function playedOnFrom(row: VikipoelGameRow): string | null {
  const year = intOrNull(row.year)
  const month = intOrNull(row.month)
  const day = intOrNull(row.day)
  if (!year || !month || !day) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Rule 36, exactly as far as it goes.
 *
 * `host` and `oponent` state home and away, so nothing here has to default them. What
 * they cannot state is a tie played on NEITHER ground, and `homegame` can: `1` our home,
 * `0` our away, `x` neutral. `true` means the source said `x`; `false` means it said `1`
 * or `0`; `null` means it wrote `?` or nothing, and that is reported rather than read as
 * "not neutral" — an unreadable field is null (rule 11), not the convenient value.
 */
export function neutralGroundFrom(value: unknown): boolean | null {
  const raw = cleanText(value)
  if (raw === null) return null
  const lowered = raw.toLowerCase()
  if (lowered === 'x') return true
  if (lowered === '1' || lowered === '0') return false
  return null
}

/* -------------------------------------------------------------------- seasons */

/**
 * The label if the archive can hold it, otherwise null — and NEVER a rewrite.
 *
 * `canonicalSeasonLabel` is the repo's own canonicaliser and the seed importer runs it
 * over every `seasonLabel` in `content/manual`, so a label it cannot read is a row that
 * fails to load. This gate is that gate, applied here, so an unusable label is reported
 * by name instead of reaching the file and breaking the loader for everything after it.
 *
 * The test is equality with the canonical form, not "did it throw": a value the
 * canonicaliser would REWRITE is also refused, because rewriting is the one thing this
 * layer may not do (rule 11, and rule 37's precedent — `1967/98` is reported and left
 * alone, not corrected).
 *
 * Two labels in the ויקיפועל table fail it, and neither is a typo:
 *  · `1955` — a calendar-year season. `seasons.json` documents a convention that renders
 *    a bare year as `YYYY/YY` of the following year, but that convention is a LABELLING
 *    decision somebody made for the curated pass, and applying it here would have this
 *    parser decide which season 28 fixtures belong to.
 *  · `1966-68` — the Israeli league season that ran across two calendar years. The
 *    canonicaliser's rule is "exactly one year boundary", so the archive's label cannot
 *    express it at all. That is a schema question for a human, documented rather than
 *    substituted (rule 11), not something a parser resolves by picking a half.
 */
export function canonicalSeasonOrNull(raw: string): string | null {
  try {
    const { label } = canonicalSeasonLabel(raw)
    return label === raw ? label : null
  } catch {
    return null
  }
}

/* ----------------------------------------------------------- alias resolution */

/** The subset of a `clubs.json` / `competitions.json` row this module needs. */
export type AliasedRecord = {
  slug: string
  nameHe?: string | null
  nameEn?: string | null
  aliases?: string[] | null
  sport?: string | null
}

export type AliasIndex = {
  /** normalised name → slug */
  byName: ReadonlyMap<string, string>
  /** every slug already in the file, for the slug-form comparison below */
  slugs: ReadonlySet<string>
}

/**
 * Rule 7: matched through aliases, never fuzzily.
 *
 * A name resolves when, decoded and whitespace-normalised, it EQUALS the row's `slug`,
 * `nameHe`, `nameEn` or one of its `aliases`. There is no edit distance, no prefix rule
 * and no "same first word" rule anywhere in this file.
 *
 * The one transform applied to both sides is the slug convention itself: the archive
 * writes `בני-יהודה` and the wiki writes `בני יהודה`, which differ only by the
 * space→hyphen substitution that DEFINES a slug here. Applying the same deterministic
 * function to both sides of an equality is not fuzziness; it is comparing like with
 * like, and it is why `בני יהודה` joins the club the archive already has instead of
 * minting a second one beside it.
 */
export function buildAliasIndex(
  records: readonly AliasedRecord[],
  sport: string,
): AliasIndex {
  const byName = new Map<string, string>()
  const slugs = new Set<string>()
  for (const record of records) {
    if ((record.sport ?? sport) !== sport) continue
    slugs.add(record.slug)
    for (const name of [record.slug, record.nameHe, record.nameEn, ...(record.aliases ?? [])]) {
      const key = name === null || name === undefined ? null : cleanText(name)
      if (key) byName.set(key, record.slug)
    }
  }
  return { byName, slugs }
}

/** Every slug `clubs.json` already uses for a club of a DIFFERENT sport. */
export function slugsOfOtherSports(
  records: readonly AliasedRecord[],
  sport: string,
): ReadonlySet<string> {
  const out = new Set<string>()
  for (const record of records) if ((record.sport ?? sport) !== sport) out.add(record.slug)
  return out
}

/**
 * The suffix that keeps a minted football club off another sport's slug.
 *
 * `clubs.json` already does this: the basketball club is `הפועל-תל-אביב-כדורסל`, named
 * apart from the football club that holds `הפועל-תל-אביב`. The wiki's `הפועל גבעתיים`
 * plays 37 football fixtures and `הפועל-גבעתיים` is already a BASKETBALL row, so minting
 * it bare would put a football fixture's club and a basketball club on one slug — and
 * `scripts/ingest/pipeline.ts` merges clubs on the slug alone, so the two would become
 * one row of one sport. Rule 6 forbids exactly that, and `tests/seed.test.ts` caught it.
 *
 * The suffix is not a claim that these are different organisations. It is a slug, chosen
 * so that nothing merges them by accident, and it is reported so somebody can decide
 * out loud whether the archive should hold one club with two sport rows instead.
 */
export const FOOTBALL_SLUG_SUFFIX = '-כדורגל'

export type Resolution = {
  slug: string
  /** the name exactly as the wiki wrote it, decoded */
  nameHe: string
  /** false means nothing in the manual file knew this name — it is a MINT */
  resolved: boolean
  /** true when the mint had to be suffixed off another sport's slug */
  slugSuffixed?: boolean
}

export function resolveAgainst(
  index: AliasIndex,
  rawName: string,
  takenByOtherSports?: ReadonlySet<string>,
): Resolution | null {
  const nameHe = cleanText(rawName)
  if (!nameHe) return null
  const direct = index.byName.get(nameHe)
  if (direct) return { slug: direct, nameHe, resolved: true }
  const slug = deriveSlug(nameHe)
  if (index.slugs.has(slug)) return { slug, nameHe, resolved: true }
  if (takenByOtherSports?.has(slug)) {
    return { slug: `${slug}${FOOTBALL_SLUG_SUFFIX}`, nameHe, resolved: false, slugSuffixed: true }
  }
  return { slug, nameHe, resolved: false }
}

/* ---------------------------------------------------------------- the report */

export type SkipRecord = { key: string; reason: string }
export type MintedName = { slug: string; nameHe: string; rows: number }
export type CompetitionMapping = {
  nameHe: string
  slug: string
  resolved: boolean
  rows: number
  /** the source's own `liga` flag, on every row of this competition */
  leagueOnEveryRow: boolean
}

export type MatchIngestReport = {
  rowsRead: number
  byDepartment: Record<string, number>
  footballRows: number
  /** rows that produced no canonical row, each with the reason it did not */
  skipped: SkipRecord[]
  /** kept, but with `playedOn: null` — the source never wrote a full date */
  undated: SkipRecord[]
  /** kept, but `neutralGround: null` — `homegame` was `?` or empty */
  groundUnrecorded: SkipRecord[]
  /** wiki rows dropped because a curated row already holds that match */
  curatedWins: SkipRecord[]
  /** ties the source records a penalty shootout for — see the note at the write site */
  shootoutNotIngested: number
  statusCounts: Record<string, number>
  confidenceCounts: Record<string, number>
  clubsResolved: MintedName[]
  clubsMinted: MintedName[]
  competitions: CompetitionMapping[]
  columnsNotIngested: string[]
  notes: string[]
}

export type SquadIngestReport = {
  pagesRead: number
  squadCategories: number
  /** every `(ענף)` the squad categories declared, and how many carried it */
  bySport: Record<string, number>
  footballCategories: number
  skipped: SkipRecord[]
  /** already in `squads.json` from the curated 2026/27 sheet — not written twice */
  alreadyCurated: SkipRecord[]
  playersWithFacts: number
  playersWithoutFacts: string[]
  /** resolved against `players-roster.json` / `people.json` by name, alias or slug */
  playersResolved: number
  playersMinted: Array<{ slug: string; fullNameHe: string; rows: number }>
  seasons: number
  notes: string[]
}

/* ------------------------------------------------------------ canonical rows */

/** The `content/manual/matches.json` shape, as the curated 33 rows already write it. */
export type CanonicalMatch = {
  seasonLabel: string
  competitionSlug: string
  stage: string | null
  playedOn: string | null
  homeClubSlug: string
  awayClubSlug: string
  homeScore: number | null
  awayScore: number | null
  venueSlug: string | null
  status: 'played' | 'abandoned' | 'postponed' | 'awarded' | 'unknown'
  confidence: number
  sourceUrl: string | null
  sourceTitle: string
  /** `true` only when `homegame` said `x`; `null` when it said nothing readable */
  neutralGround?: boolean | null
  noteHe?: string | null
}

export type MintedClub = {
  slug: string
  nameHe: string
  sport: 'football'
  aliases: string[]
  confidence: 1
  sourceUrl: string
  sourceTitle: string
}

export type MintedCompetition = {
  slug: string
  nameHe: string
  type?: 'league'
  sport: 'football'
  aliases: string[]
  confidence: 1
  sourceUrl: string
  sourceTitle: string
}

/** The `content/manual/fact-conflicts.json` shape. */
export type FactConflict = {
  entityTable: string
  entityKey: string
  field: string
  claimA: string
  claimB: string
  sourceAUrl: string | null
  sourceBUrl: string | null
  noteHe: string
  resolution: null
}

/** The `content/manual/squads.json` shape, as the curated 2026/27 rows already write it. */
export type CanonicalSquadRow = {
  personName: string
  /** the archive's own slug for this person, so the row is never a dangling reference */
  personSlug: string
  seasonLabel: string
  clubSlug: string
  shirtNumber: null
  position: string | null
  nationalityHe: string | null
  confidence: number
  sourceUrl: string
  sourceTitle: string
}

/* ------------------------------------------------------------- confidence */

/**
 * **A wiki match row is `confidence: 2` only when it is COMPLETE.**
 *
 * Complete means all four of: a full date (day, month and year, none of them `0`), both
 * clubs resolved or minted, both scores present, and a competition resolved or minted.
 * Anything short of any one of them is `confidence: 1`.
 *
 * The reason is rule 2's reason. `confidence >= 2` is what may feed the trivia
 * generator, and a question built on a row with a hole in it either cannot be asked or
 * is asked wrong — "מי הייתה היריבה במחזור 12" off a row with no opponent, "כמה שערים"
 * off a row with no score. The completeness of the ROW is the thing the floor is
 * actually protecting, so it is the thing the confidence states.
 */
export function matchConfidence(input: {
  playedOn: string | null
  homeClubSlug: string | null
  awayClubSlug: string | null
  homeScore: number | null
  awayScore: number | null
  competitionSlug: string | null
}): 1 | 2 {
  const complete =
    input.playedOn !== null &&
    input.homeClubSlug !== null &&
    input.awayClubSlug !== null &&
    input.homeScore !== null &&
    input.awayScore !== null &&
    input.competitionSlug !== null
  return complete ? 2 : 1
}

/* ------------------------------------------------------------------- the walk */

/** The subset of a curated `matches.json` row the overlap check needs. */
export type CuratedMatch = {
  seasonLabel: string
  competitionSlug: string
  stage: string | null
  playedOn: string | null
  homeClubSlug: string
  awayClubSlug: string
  homeScore: number | null
  awayScore: number | null
  sourceUrl?: string | null
  sourceTitle?: string
}

export type MatchIngestInput = {
  games: readonly VikipoelGameRow[]
  clubs: readonly AliasedRecord[]
  competitions: readonly AliasedRecord[]
  curated: readonly CuratedMatch[]
  usClubSlug?: string
}

export type MatchIngestResult = {
  matches: CanonicalMatch[]
  mintedClubs: MintedClub[]
  mintedCompetitions: MintedCompetition[]
  conflicts: FactConflict[]
  report: MatchIngestReport
}

/**
 * Columns the `Games` table holds and this delta does NOT write into a canonical row.
 * Named rather than quietly ignored (rule 11): `stadium` needs `venues.json` rows and
 * `coach`/`shofet1..3` need `people.json` rows, and minting those is a different pass
 * with a different review. Nothing about them is lost — the raw export is in the repo.
 */
const COLUMNS_NOT_INGESTED = [
  'stadium — a venue row is a `venues.json` mint, not part of this pass',
  'shootout — `3:4 בפנדלים` is a bare separator score, which this archive forbids in Hebrew prose; writing it team-adjacent needs an order the table does not state',
  'hour — a kickoff time is never asserted by this archive (`matches.json` says so)',
  'coach · shofet1 · shofet2 · shofet3 — person rows, a separate pass',
  'comments — the scorer convention; `match-events.json` is its destination',
  'ref · shidur · monthname · mifalname — provenance and rendering, not facts',
]

export function parseFootballMatches(input: MatchIngestInput): MatchIngestResult {
  const clubIndex = buildAliasIndex(input.clubs, 'football')
  const clubSlugsElsewhere = slugsOfOtherSports(input.clubs, 'football')
  const competitionIndex = buildAliasIndex(input.competitions, 'football')
  const competitionSlugsElsewhere = slugsOfOtherSports(input.competitions, 'football')
  const usSlug = input.usClubSlug ?? DEFAULT_US_SLUG

  const report: MatchIngestReport = {
    rowsRead: input.games.length,
    byDepartment: {},
    footballRows: 0,
    skipped: [],
    undated: [],
    groundUnrecorded: [],
    curatedWins: [],
    shootoutNotIngested: 0,
    statusCounts: {},
    confidenceCounts: {},
    clubsResolved: [],
    clubsMinted: [],
    competitions: [],
    columnsNotIngested: COLUMNS_NOT_INGESTED,
    notes: [],
  }

  /* ---- rule 6: the sport is a field the wiki wrote, so the gate is a filter ---- */
  const football: Array<{ row: VikipoelGameRow; key: string }> = []
  for (const [index, row] of input.games.entries()) {
    const declared = cleanText(row.department) ?? '(אין ערך)'
    report.byDepartment[declared] = (report.byDepartment[declared] ?? 0) + 1
    if (declared !== FOOTBALL_DEPARTMENT) continue
    football.push({ row, key: `games#${index + 1}` })
  }
  report.footballRows = football.length

  /* ---------------------------- pass one: read every football row into a draft */
  type Draft = {
    key: string
    row: VikipoelGameRow
    seasonLabel: string
    competition: Resolution
    home: Resolution
    away: Resolution
    stage: string | null
    playedOn: string | null
    homeScore: number | null
    awayScore: number | null
    neutralGround: boolean | null
    shootout: string | null
  }

  const clubUse = new Map<
    string,
    { nameHe: string; rows: number; resolved: boolean; suffixed: boolean }
  >()
  const competitionUse = new Map<
    string,
    { nameHe: string; slug: string; resolved: boolean; rows: number; leagueRows: number }
  >()
  const drafts: Draft[] = []
  const seenKeys = new Map<string, string>()

  for (const { row, key } of football) {
    const seasonRaw = cleanText(row.ona)
    if (!seasonRaw) {
      report.skipped.push({ key, reason: 'השורה אינה נושאת עונה (ona)' })
      continue
    }
    const seasonLabel = canonicalSeasonOrNull(seasonRaw)
    if (!seasonLabel) {
      report.skipped.push({
        key,
        reason: `תווית עונה שהארכיון אינו יכול להחזיק: "${seasonRaw}" — נרשמת ואינה מתוקנת`,
      })
      continue
    }

    // Rule 36: both sides come from the source's own two columns. A row that names one
    // side names half a fixture, and the missing half is never supplied from homegame.
    const hostName = cleanText(row.host)
    const awayName = cleanText(row.oponent)
    if (!hostName || !awayName) {
      report.skipped.push({
        key,
        reason: `השורה אינה נוקבת בשני הצדדים (host=${hostName ?? 'null'}, oponent=${awayName ?? 'null'})`,
      })
      continue
    }

    const competitionName = cleanText(row.mifal)
    if (!competitionName) {
      report.skipped.push({ key, reason: 'השורה אינה נושאת מפעל (mifal)' })
      continue
    }

    const home = resolveAgainst(clubIndex, hostName, clubSlugsElsewhere) as Resolution
    const away = resolveAgainst(clubIndex, awayName, clubSlugsElsewhere) as Resolution
    const competition = resolveAgainst(
      competitionIndex,
      competitionName,
      competitionSlugsElsewhere,
    ) as Resolution

    for (const side of [home, away]) {
      const seen =
        clubUse.get(side.slug) ??
        { nameHe: side.nameHe, rows: 0, resolved: side.resolved, suffixed: side.slugSuffixed === true }
      seen.rows += 1
      clubUse.set(side.slug, seen)
    }
    const compSeen =
      competitionUse.get(competition.slug) ??
      {
        nameHe: competition.nameHe,
        slug: competition.slug,
        resolved: competition.resolved,
        rows: 0,
        leagueRows: 0,
      }
    compSeen.rows += 1
    if (intOrNull(row.liga) === 1) compSeen.leagueRows += 1
    competitionUse.set(competition.slug, compSeen)

    const stage = cleanText(row.stage)
    const playedOn = playedOnFrom(row)
    if (playedOn === null) {
      report.undated.push({
        key,
        reason: `אין תאריך מלא במקור (day=${row.day ?? 'null'}, month=${row.month ?? 'null'}, year=${row.year ?? 'null'}) — playedOn נשאר null`,
      })
    }

    const neutralGround = neutralGroundFrom(row.homegame)
    if (neutralGround === null) {
      report.groundUnrecorded.push({
        key,
        reason: `homegame=${JSON.stringify(row.homegame ?? null)} — לא 1, לא 0 ולא x, ולכן neutralGround נשאר null`,
      })
    }

    // Rule 35: the natural key deduplicates, and `sport` leads it because a club slug is
    // unique only within a sport. Two rows with the same key are the same fixture twice.
    const naturalKey = [
      'football',
      seasonLabel,
      competition.slug,
      home.slug,
      away.slug,
      stage ?? '',
    ].join('|')
    const earlier = seenKeys.get(naturalKey)
    if (earlier !== undefined) {
      report.skipped.push({ key, reason: `כפילות של ${earlier} — אותו מפתח טבעי: ${naturalKey}` })
      continue
    }
    seenKeys.set(naturalKey, key)

    drafts.push({
      key,
      row,
      seasonLabel,
      competition,
      home,
      away,
      stage,
      playedOn,
      homeScore: intOrNull(row.homescore),
      awayScore: intOrNull(row.awayscore),
      neutralGround,
      shootout: cleanText(row.shootout),
    })

  }

  /* ------------------------------------------ pass two: the curated rows WIN */
  const conflicts = compareWithCurated(drafts, input.curated, usSlug, report)
  const dropped = conflicts.dropped

  /* ------------------------------------------------ pass three: canonical rows */
  const matches: CanonicalMatch[] = []
  for (const draft of drafts) {
    if (dropped.has(draft.key)) continue
    const confidence = matchConfidence({
      playedOn: draft.playedOn,
      homeClubSlug: draft.home.slug,
      awayClubSlug: draft.away.slug,
      homeScore: draft.homeScore,
      awayScore: draft.awayScore,
      competitionSlug: draft.competition.slug,
    })
    const status: CanonicalMatch['status'] =
      draft.homeScore !== null && draft.awayScore !== null ? 'played' : 'unknown'
    report.statusCounts[status] = (report.statusCounts[status] ?? 0) + 1
    report.confidenceCounts[String(confidence)] = (report.confidenceCounts[String(confidence)] ?? 0) + 1

    const match: CanonicalMatch = {
      seasonLabel: draft.seasonLabel,
      competitionSlug: draft.competition.slug,
      stage: draft.stage,
      playedOn: draft.playedOn,
      homeClubSlug: draft.home.slug,
      awayClubSlug: draft.away.slug,
      homeScore: draft.homeScore,
      awayScore: draft.awayScore,
      // A venue row is a mint this pass does not make; the column is named in the report
      // instead of being guessed into a slug that points at nothing.
      venueSlug: null,
      status,
      confidence,
      sourceUrl: VIKIPOEL_SOURCE_URL,
      sourceTitle: VIKIPOEL_SOURCE_TITLE,
    }
    if (draft.neutralGround === true) match.neutralGround = true
    if (draft.neutralGround === null) match.neutralGround = null
    // `shootout` is NOT written into `noteHe`. The cell reads `3:4 בפנדלים` — a bare
    // separator score, which `tests/seed.test.ts` refuses in Hebrew prose because in an
    // RTL line it cannot say whose number is whose (the same reason `components/ui/Num`
    // exists). Writing it team-adjacent needs to know which side the `3` belongs to, and
    // the table does not state that — so the column is named in the report as
    // not-ingested rather than guessed into a sentence a player would read backwards.
    if (draft.shootout) report.shootoutNotIngested += 1
    matches.push(match)
  }

  matches.sort(compareMatches)

  /* ------------------------------------------------------ mints and the report */
  const mintedClubs: MintedClub[] = []
  for (const [slug, use] of [...clubUse.entries()].sort((a, b) => b[1].rows - a[1].rows)) {
    const row: MintedName = { slug, nameHe: use.nameHe, rows: use.rows }
    if (use.resolved) report.clubsResolved.push(row)
    else {
      report.clubsMinted.push(row)
      mintedClubs.push({
        slug,
        nameHe: use.nameHe,
        sport: 'football',
        // Its own name as an alias, so the next run RESOLVES it instead of minting a
        // second copy beside it. That is what makes this script idempotent.
        aliases: [use.nameHe],
        // Rule 38's precedent: one source, read off a table, not reviewed. Rule 2 then
        // keeps it out of the trivia generator until somebody checks it.
        confidence: 1,
        sourceUrl: VIKIPOEL_SOURCE_URL,
        sourceTitle: VIKIPOEL_SOURCE_TITLE,
      })
    }
  }

  const mintedCompetitions: MintedCompetition[] = []
  for (const use of [...competitionUse.values()].sort((a, b) => b.rows - a.rows)) {
    report.competitions.push({
      nameHe: use.nameHe,
      slug: use.slug,
      resolved: use.resolved,
      rows: use.rows,
      leagueOnEveryRow: use.leagueRows === use.rows,
    })
    if (use.resolved) continue
    const minted: MintedCompetition = {
      slug: use.slug,
      nameHe: use.nameHe,
      sport: 'football',
      aliases: [use.nameHe],
      confidence: 1,
      sourceUrl: VIKIPOEL_SOURCE_URL,
      sourceTitle: VIKIPOEL_SOURCE_TITLE,
    }
    // `type` is the source's own `liga` flag, not a reading of the name. It is set only
    // when the flag is `1` on EVERY row of that competition; a cup's subtype is never
    // guessed from its Hebrew name, so an unflagged competition gets no `type` at all.
    if (use.leagueRows === use.rows && use.rows > 0) minted.type = 'league'
    mintedCompetitions.push(minted)
  }

  report.notes.push(
    'ליגה לאומית לא מקופלת לתוך ליגת-העל. אלה שתי תחרויות בשתי תקופות, ומיזוגן היה הופך' +
      ' את "כמה אליפויות" לשאלה שאי אפשר לענות עליה. היא נטבעת כשורה חדשה בוודאות 1.',
  )
  const suffixed = [...clubUse.entries()].filter(([, use]) => use.suffixed)
  for (const [slug, use] of suffixed) {
    report.notes.push(
      `"${use.nameHe}" נטבע כ-${slug} ולא כ-${slug.slice(0, -FOOTBALL_SLUG_SUFFIX.length)}:` +
        ' הסלאג הזה כבר שייך למועדון כדורסל בקובץ, ומיזוג בין ענפים אסור (כלל 6).' +
        ' זו הכרעה על סלאג, לא טענה שאלה שני ארגונים.',
    )
  }
  report.notes.push(
    `${report.clubsMinted.length} שמות מועדונים נטבעו. רבים מהם הם קיצורים שהוויקי כותב` +
      ' (ת"א, פ"ת, י-ם, ב"ש) של מועדונים שייתכן שכבר קיימים בארכיון תחת השם המלא. איחוד' +
      ' כזה הוא החלטת אדם על כינויים בקובץ, לא התאמה מקורבת בשכבת הקליטה (כלל 7).',
  )

  return { matches, mintedClubs, mintedCompetitions, conflicts: conflicts.rows, report }
}

/** Stable, deterministic order. An undated row sorts after every dated one. */
function compareMatches(a: CanonicalMatch, b: CanonicalMatch): number {
  const byDate = (a.playedOn ?? '9999-99-99').localeCompare(b.playedOn ?? '9999-99-99')
  if (byDate !== 0) return byDate
  const bySeason = a.seasonLabel.localeCompare(b.seasonLabel)
  if (bySeason !== 0) return bySeason
  const byCompetition = a.competitionSlug.localeCompare(b.competitionSlug)
  if (byCompetition !== 0) return byCompetition
  const byStage = (a.stage ?? '').localeCompare(b.stage ?? '')
  if (byStage !== 0) return byStage
  const byHome = a.homeClubSlug.localeCompare(b.homeClubSlug)
  if (byHome !== 0) return byHome
  return a.awayClubSlug.localeCompare(b.awayClubSlug)
}

/* ------------------------------------------------- curated rows win the slot */

type CuratedComparison = { dropped: Set<string>; rows: FactConflict[] }

/**
 * **A curated row always wins, and a disagreement is RECORDED, not resolved** (rule 60
 * §3). `matches.json` holds 33 hand-sourced rows, most at confidence 2 with a real
 * `sourceUrl`; a wiki row describing the same match is dropped in favour of it, and
 * where the two disagree the disagreement becomes a `fact-conflicts.json` row. Nothing
 * here picks a side, including where the wiki looks more likely to be right.
 *
 * Two joins, and the second one is a fact about football rather than a fuzzy match:
 *
 *  1. **date + both club slugs**, unordered — the same fixture however the two files
 *     ordered its two sides.
 *  2. **date alone, when both rows name this club** — a club plays at most one match on
 *     a calendar day. This is what catches 13.10.1962: the wiki writes `שמשון ת"א` and
 *     the archive writes `שמשון-תל-אביב`, so join (1) cannot see them as the same match,
 *     and without join (2) the archive would end up holding the opening night of
 *     Bloomfield twice under two different opponents. It is applied ONLY where the date
 *     carries exactly one wiki row and exactly one curated row, so it can never guess
 *     which of two same-day fixtures it is looking at. The disagreement about the
 *     opponent's identity is then itself recorded as a conflict.
 */
function compareWithCurated(
  drafts: ReadonlyArray<{
    key: string
    seasonLabel: string
    competition: Resolution
    home: Resolution
    away: Resolution
    stage: string | null
    playedOn: string | null
    homeScore: number | null
    awayScore: number | null
  }>,
  curated: readonly CuratedMatch[],
  usSlug: string,
  report: MatchIngestReport,
): CuratedComparison {
  const dropped = new Set<string>()
  const rows: FactConflict[] = []

  const pairKey = (date: string, a: string, b: string) => `${date}|${[a, b].sort().join('~')}`

  const curatedByPair = new Map<string, CuratedMatch[]>()
  const curatedByDate = new Map<string, CuratedMatch[]>()
  for (const row of curated) {
    if (!row.playedOn) continue
    const pair = pairKey(row.playedOn, row.homeClubSlug, row.awayClubSlug)
    curatedByPair.set(pair, [...(curatedByPair.get(pair) ?? []), row])
    if (row.homeClubSlug === usSlug || row.awayClubSlug === usSlug) {
      curatedByDate.set(row.playedOn, [...(curatedByDate.get(row.playedOn) ?? []), row])
    }
  }

  const draftsByDate = new Map<string, number>()
  for (const draft of drafts) {
    if (draft.playedOn) draftsByDate.set(draft.playedOn, (draftsByDate.get(draft.playedOn) ?? 0) + 1)
  }

  const used = new Set<CuratedMatch>()

  for (const draft of drafts) {
    if (!draft.playedOn) continue
    const byPair = curatedByPair.get(pairKey(draft.playedOn, draft.home.slug, draft.away.slug)) ?? []
    let partner = byPair.find((row) => !used.has(row)) ?? null

    if (!partner) {
      const sameDate = curatedByDate.get(draft.playedOn) ?? []
      const weAreIn = draft.home.slug === usSlug || draft.away.slug === usSlug
      if (weAreIn && sameDate.length === 1 && draftsByDate.get(draft.playedOn) === 1) {
        const only = sameDate[0] as CuratedMatch
        if (!used.has(only)) partner = only
      }
    }
    if (!partner) continue

    used.add(partner)
    dropped.add(draft.key)
    report.curatedWins.push({
      key: draft.key,
      reason: `${draft.playedOn} — שורה מתועדת קיימת (${partner.homeClubSlug} ${partner.homeScore}:${partner.awayScore} ${partner.awayClubSlug}); שורת הוויקי נופלת לטובתה`,
    })

    rows.push(...conflictsBetween(draft, partner))
  }

  return { dropped, rows }
}

function conflictsBetween(
  draft: {
    seasonLabel: string
    competition: Resolution
    home: Resolution
    away: Resolution
    stage: string | null
    playedOn: string | null
    homeScore: number | null
    awayScore: number | null
  },
  curatedRow: CuratedMatch,
): FactConflict[] {
  const out: FactConflict[] = []
  const entityKey = `${curatedRow.playedOn} ${curatedRow.homeClubSlug} — ${curatedRow.awayClubSlug}`
  const base = {
    entityTable: 'match',
    entityKey,
    sourceAUrl: curatedRow.sourceUrl ?? null,
    sourceBUrl: VIKIPOEL_SOURCE_URL,
    resolution: null,
  } as const

  const sameOrientation =
    curatedRow.homeClubSlug === draft.home.slug && curatedRow.awayClubSlug === draft.away.slug
  const swapped =
    curatedRow.homeClubSlug === draft.away.slug && curatedRow.awayClubSlug === draft.home.slug

  // The clubs themselves disagree — the two files file the same opponent under two
  // different slugs. That is a fact about the archive and it is stated, not merged.
  if (!sameOrientation && !swapped) {
    out.push({
      ...base,
      field: 'opponent_club',
      claimA: `${curatedRow.homeClubSlug} מול ${curatedRow.awayClubSlug} — ${curatedRow.sourceTitle ?? 'הארכיון המתועד'}`,
      claimB: `${draft.home.nameHe} מול ${draft.away.nameHe} — ויקיפועל`,
      noteHe:
        'אותו תאריך, אותו מועדון, שם יריבה שונה בין שני המקורות. לא אוחד: איחוד כינויים' +
        ' הוא החלטה על קובץ המועדונים, לא התאמה מקורבת בשכבת הקליטה (כלל 7).',
    })
  }

  if (swapped) {
    out.push({
      ...base,
      field: 'home_away',
      claimA: `בית: ${curatedRow.homeClubSlug} — ${curatedRow.sourceTitle ?? 'הארכיון המתועד'}`,
      claimB: `בית: ${draft.home.nameHe} — ויקיפועל`,
      noteHe: 'שני המקורות מסכימים על הזוג ועל התאריך וחלוקים על מי אירח. שניהם נשמרים.',
    })
  }

  // Scores, aligned to the curated row's orientation before they are compared — an
  // unaligned comparison would report every swapped leg as a score disagreement too.
  const wikiHome = swapped ? draft.awayScore : draft.homeScore
  const wikiAway = swapped ? draft.homeScore : draft.awayScore
  if (
    (curatedRow.homeScore !== null || wikiHome !== null) &&
    (curatedRow.homeScore !== wikiHome || curatedRow.awayScore !== wikiAway)
  ) {
    out.push({
      ...base,
      field: 'score',
      claimA: `${curatedRow.homeScore}:${curatedRow.awayScore} — ${curatedRow.sourceTitle ?? 'הארכיון המתועד'}`,
      claimB: `${wikiHome}:${wikiAway} — ויקיפועל`,
      noteHe: `${curatedRow.playedOn} · ${curatedRow.homeClubSlug} מול ${curatedRow.awayClubSlug}. שתי התוצאות נשמרות; אין הכרעה.`,
    })
  }

  if (curatedRow.competitionSlug !== draft.competition.slug) {
    out.push({
      ...base,
      field: 'competition',
      claimA: `${curatedRow.competitionSlug} — ${curatedRow.sourceTitle ?? 'הארכיון המתועד'}`,
      claimB: `${draft.competition.nameHe} — ויקיפועל`,
      noteHe:
        'שני המקורות מתעדים את אותו משחק תחת מפעל אחר. ליגה לאומית וליגת העל אינן אותה' +
        ' תחרות ואינן מקופלות זו לזו — הסתירה נרשמת.',
    })
  }

  return out
}

/* -------------------------------------------------------------------- squads */

/**
 * Rule 37: the season comes off the PLAYER page.
 *
 * `קטגוריה:סגל הפועל ת"א (<ענף>) <עונה>` carries the sport INSIDE the string that
 * carries the season, so rule 6 is enforced by the same read that finds the season — a
 * `(כדורסל)` category cannot walk into a football squad because the pattern that
 * extracts the season also extracts the branch, and the branch is checked.
 */
const SQUAD_CATEGORY = /^קטגוריה:סגל הפועל ת"א \(([^)]+)\)\s+(.+)$/u

export type SquadIngestInput = {
  players: readonly VikipoelPlayerPage[]
  curated: ReadonlyArray<{ personName: string; seasonLabel: string; clubSlug: string }>
  /**
   * `players-roster.json` + `people.json` — who the archive already knows.
   *
   * A squad row names a PERSON, and a membership pointing at somebody no person row
   * describes is a dangling reference: `tests/seed.test.ts` refuses it, and it is the
   * same defect as a match pointing at a club nobody defined. So the name is resolved
   * the way a club name is (rule 7: slug, name and aliases, nothing fuzzy), and a name
   * the archive does not hold is MINTED as a roster row rather than dropped.
   *
   * The roster's slugs are `lib/normalize.slugify()` — `בן ציון צין (צינוביץ')` is
   * `בן-ציון-צין-צינוביץ` there — which is why the slug is looked up rather than derived:
   * deriving it would have produced `בן-ציון-צין` and pointed the row at nobody.
   */
  people: ReadonlyArray<{ slug: string; fullNameHe: string; aliases?: string[] | null }>
  /** `player-facts.json` records, matched by exact Hebrew name */
  playerFacts: ReadonlyArray<{
    personNameHe: string
    position?: string | null
    nationalityHe?: string | null
    sport?: string | null
  }>
  clubSlug?: string
}

/** The `content/manual/players-roster.json` shape. Names only — the file says so. */
export type MintedPerson = {
  slug: string
  fullNameHe: string
  aliases: string[]
  confidence: 1
  sourceUrl: string
  sourceTitle: string
}

export type SquadIngestResult = {
  squads: CanonicalSquadRow[]
  mintedPeople: MintedPerson[]
  report: SquadIngestReport
}

export function parseSquads(input: SquadIngestInput): SquadIngestResult {
  const clubSlug = input.clubSlug ?? DEFAULT_US_SLUG
  const report: SquadIngestReport = {
    pagesRead: input.players.length,
    squadCategories: 0,
    bySport: {},
    footballCategories: 0,
    skipped: [],
    alreadyCurated: [],
    playersWithFacts: 0,
    playersWithoutFacts: [],
    playersResolved: 0,
    playersMinted: [],
    seasons: 0,
    notes: [],
  }

  const facts = new Map<string, { position?: string | null; nationalityHe?: string | null }>()
  for (const fact of input.playerFacts) {
    if (fact.sport && fact.sport !== 'football') continue
    facts.set(fact.personNameHe, fact)
  }

  const curatedKeys = new Set(
    input.curated.map((row) => `${row.personName}|${row.seasonLabel}|${row.clubSlug}`),
  )

  // Rule 7, for people. Slug, name and aliases — nothing fuzzy, no surname-only pass
  // (rule 64 §5 measured that at ~50% wrong and deleted it).
  const personBySlug = new Map<string, string>()
  const personIndex = new Map<string, string>()
  for (const person of input.people) {
    personBySlug.set(person.slug, person.fullNameHe)
    personIndex.set(person.slug, person.slug)
    for (const name of [person.fullNameHe, ...(person.aliases ?? [])]) {
      const key = cleanText(name)
      if (key) personIndex.set(key, person.slug)
    }
  }
  const mintedPeople = new Map<string, MintedPerson & { rows: number }>()
  const refusedPeople = new Set<string>()

  function personSlugFor(name: string): string | null {
    const found = personIndex.get(name)
    if (found) return found
    const minted = mintedPeople.get(name)
    if (minted) return minted.slug
    const slug = slugify(name)
    // A slug already spoken for by a DIFFERENT name is not this person's. Two people
    // reduced to one row is the worst outcome here, so the row is refused and reported
    // rather than merged (`players-roster.json`'s own note: an ambiguous alias is
    // refused by the importer rather than assigned by guesswork).
    if (personBySlug.has(slug) && personBySlug.get(slug) !== name) {
      refusedPeople.add(name)
      return null
    }
    mintedPeople.set(name, {
      slug,
      fullNameHe: name,
      aliases: [name],
      confidence: 1,
      sourceUrl: VIKIPOEL_SQUADS_SOURCE_URL,
      sourceTitle: VIKIPOEL_SQUADS_SOURCE_TITLE,
      rows: 0,
    })
    return slug
  }

  const seasons = new Set<string>()
  const seen = new Set<string>()
  const squads: CanonicalSquadRow[] = []
  const playersSeen = new Set<string>()

  for (const page of input.players) {
    for (const category of page.categories ?? []) {
      const found = SQUAD_CATEGORY.exec(category.title)
      if (!found) continue
      report.squadCategories += 1
      const branch = found[1] as string
      const seasonLabel = (found[2] as string).trim()
      report.bySport[branch] = (report.bySport[branch] ?? 0) + 1

      // Rule 6, at the only gate that matters: eleven characters in a page title put a
      // basketball player into a football squad once, and this is where that is stopped.
      if (branch !== FOOTBALL_DEPARTMENT) continue
      report.footballCategories += 1

      // The same gate the match walk uses, and for the same reason. Rule 37's precedent
      // is `1967/98` — a label the source got wrong is REPORTED and left alone, never
      // corrected here — and it is one of the three this refuses.
      if (canonicalSeasonOrNull(seasonLabel) === null) {
        report.skipped.push({
          key: `${page.title} · ${category.title}`,
          reason: `תווית עונה שהארכיון אינו יכול להחזיק: "${seasonLabel}" — נרשמת ואינה מתוקנת`,
        })
        continue
      }

      seasons.add(seasonLabel)
      playersSeen.add(page.title)

      const key = `${page.title}|${seasonLabel}|${clubSlug}`
      if (curatedKeys.has(key)) {
        report.alreadyCurated.push({ key, reason: 'שורה מתועדת קיימת ב-squads.json — לא נכתבת פעמיים' })
        continue
      }
      if (seen.has(key)) continue
      seen.add(key)

      const personSlug = personSlugFor(page.title)
      if (personSlug === null) {
        report.skipped.push({
          key,
          reason: `הסלאג של "${page.title}" כבר שייך לאדם אחר בארכיון — לא מוזג, לא נטבע`,
        })
        continue
      }
      const minted = mintedPeople.get(page.title)
      if (minted) minted.rows += 1

      const fact = facts.get(page.title)
      squads.push({
        personName: page.title,
        personSlug,
        seasonLabel,
        clubSlug,
        // Rule 37: `מספר בהפועל` is ONE value on a page covering many seasons — the
        // number the player is remembered by, not a per-season shirt. Writing it into
        // every season would state many facts from one and would let two players "share"
        // a number they never shared. It stays null here and lives in `shirt-numbers`.
        shirtNumber: null,
        position: fact?.position ?? null,
        // `player-facts.json` records `origin` (`israeli` / `foreign`), which is not a
        // nationality — so unless that file grows a `nationalityHe`, this is null for
        // every wiki row rather than a country inferred from a gentilic category.
        nationalityHe: fact?.nationalityHe ?? null,
        confidence: 1,
        sourceUrl: VIKIPOEL_SQUADS_SOURCE_URL,
        sourceTitle: VIKIPOEL_SQUADS_SOURCE_TITLE,
      })
    }
  }

  for (const name of playersSeen) {
    if (facts.has(name)) report.playersWithFacts += 1
    else report.playersWithoutFacts.push(name)
  }
  report.playersResolved = [...playersSeen].filter((name) => personIndex.has(name)).length
  report.playersMinted = [...mintedPeople.values()].map((person) => ({
    slug: person.slug,
    fullNameHe: person.fullNameHe,
    rows: person.rows,
  }))
  for (const name of refusedPeople) {
    report.notes.push(`"${name}" סורב: הסלאג שלו כבר שייך לאדם אחר. סירוב הוא תשובה (כלל 64 §0).`)
  }
  report.seasons = seasons.size
  report.notes.push(
    'shirtNumber נשאר null בכל שורה שנקראה מהוויקי — כלל 37. מקור העמדה הוא' +
      ' player-facts.json לפי שם עברי מדויק; אין שם שדה לאום, ולכן nationalityHe הוא null.',
  )

  squads.sort(
    (a, b) =>
      a.seasonLabel.localeCompare(b.seasonLabel) || a.personName.localeCompare(b.personName),
  )
  return {
    squads,
    mintedPeople: [...mintedPeople.values()].map(({ rows: _rows, ...person }) => person),
    report,
  }
}

/* ------------------------------------------------------------------ the files */

/** The only I/O in this module: read bytes, parse JSON. No network (rule 36). */
export function readGamesFile(path: string): VikipoelGameRow[] {
  return JSON.parse(readFileSync(path, 'utf8')) as VikipoelGameRow[]
}

export function readPlayerCategoriesFile(path: string): VikipoelPlayerPage[] {
  return JSON.parse(readFileSync(path, 'utf8')) as VikipoelPlayerPage[]
}
