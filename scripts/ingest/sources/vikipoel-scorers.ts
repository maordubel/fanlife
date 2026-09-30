/**
 * The scorer holdings — `comments` on the ויקיפועל `Games` rows, read off disk.
 *
 * NO NETWORK (rule 64 §7). Every byte this module reads is already in the repository:
 * `content/raw/vikipoel-games.json` is the record of what the owner's browser downloaded
 * on 17.9.2026, so a parser change re-runs for free and every holding stays traceable to
 * the row it came from. A source that was read once and not saved is a source nobody can
 * check.
 *
 * Three jobs, in this order, and the boundaries between them are the point:
 *
 *  1. **Filter by sport.** `department` IS the sport, stated by the wiki on every row
 *     (rules 6 and 38). This walk accepts `כדורגל` and nothing else. `comments` is a
 *     FOOTBALL convention — reading it as scorers in the basketball rows once invented
 *     twenty goals in a sport that does not record them that way — so the filter runs
 *     before the parser and `assertFootballDepartment` is the second lock behind it.
 *  2. **Parse.** `lib/scorers.ts` does it and is pure. A row it cannot prove yields no
 *     holding and one line in `refused` with the raw text and the reason (rule 11).
 *  3. **Check against the score, and resolve the names.** Both below.
 *
 * ---------------------------------------------------------------------------
 * THE VALIDATOR THE ROW CARRIES ITSELF
 * ---------------------------------------------------------------------------
 *
 * `homescore`, `awayscore` and the side Hapoel is NAMED on say how many goals Hapoel
 * scored. The scorer line says who scored them. Two independent statements by the same
 * source, in two different columns, about one number — so where they agree the holding
 * has earned something neither reading could earn alone, and it takes `confidence: 2`.
 * Where they disagree the holding is KEPT, marked, and given `confidence: 1`, with both
 * numbers written into a conflict row: rule 60 §3 records a contradiction and never
 * resolves it, and rule 2 then keeps the row out of the trivia generator until a person
 * has looked at it.
 *
 * **`homegame: 'x'` needed no special case, and working out why is the useful part.**
 * Rule 36 reads `homegame` (`1` / `0` / `x`) for one thing only: `x` means the tie was
 * played on NEITHER ground. The temptation is to use the same column to decide which of
 * `homescore`/`awayscore` is ours — and on an `x` row that question looks unanswerable.
 * It is answerable, because it was never `homegame`'s question: `host` and `oponent`
 * NAME both sides, and on all 2,290 football rows carrying a comment exactly one of the
 * two resolves to the club `clubs.json` flags `isUs` — through its own alias list
 * (rule 7), never by looking like it. `host` pairs with `homescore` and `oponent` with
 * `awayscore` regardless of where the match was played. So the 53 `x` rows are read like
 * any other row, keep `neutralGround: true`, and are neither refused nor special-cased.
 * A row where the naming test does NOT yield exactly one of us is refused and counted —
 * which is the check that makes the sentence above a measurement rather than a belief.
 *
 * ---------------------------------------------------------------------------
 * NAMES
 * ---------------------------------------------------------------------------
 *
 * Rule 7: matched through aliases, never fuzzily. A scorer token resolves when it EQUALS
 * a name the archive already holds — `personNameHe` in `player-facts.json`, or a
 * `fullNameHe`/`aliases` entry in `players-roster.json`. There is no edit distance, no
 * prefix rule and no "same surname" rule in this file.
 *
 * **A surname on its own is not enough, and that is a measured decision, not caution.**
 * Rule 64 §5: surname-only bridging was measured at ~50% error and DELETED rather than
 * tuned. `מאיר/?` is a surname; the archive holds `מאיר לוי` and `מרדכי מאיר`, and
 * picking either is a coin toss dressed as a resolution. So an unresolved token keeps the
 * SOURCE's own string, takes `playerSlug: null`, and is counted in the report by name and
 * frequency — which is how somebody adds the alias later, out loud, in `players-roster.json`
 * where aliases belong.
 */

import { readFileSync } from 'node:fs'

import {
  assertFootballDepartment,
  parseScorerLine,
  type ParsedGoal,
  type ScorerRefusalCode,
} from '@/scripts/ingest/lib/scorers'
import {
  canonicalSeasonOrNull,
  cleanText,
  decodeEntities,
  deriveSlug,
  neutralGroundFrom,
  playedOnFrom,
  type AliasedRecord,
  type VikipoelGameRow,
} from '@/scripts/ingest/sources/vikipoel-cargo'

/* ------------------------------------------------------------------- source */

/**
 * Rule 2, on every holding. The citation names the COLUMN, not just the table.
 *
 * `sources/vikipoel-cargo.ts` cites `Games` for the match rows. A scorer holding is a
 * different claim read out of a different column of the same export, and a source line
 * that does not say which column it came from is a citation somebody cannot check.
 */
export const VIKIPOEL_SCORERS_SOURCE_TITLE =
  'ויקיפועל — טבלת Games, עמודת comments (Special:CargoExport), נקרא 17.9.2026'
export const VIKIPOEL_SCORERS_SOURCE_URL =
  'https://wiki.red-fans.com/index.php?title=Special:CargoTables/Games'

/** Rule 6 / 38, as a constant. The wiki writes three values; exactly one is this walk's. */
export const FOOTBALL_DEPARTMENT = 'כדורגל'

/* ------------------------------------------------------------------- shapes */

/** One goal, resolved. Every field the source did not state is `null` or `false`. */
export type ScorerHolding = {
  /** the name exactly as ויקיפועל wrote it, or `null` where it wrote `?` or nothing */
  scorerNameHe: string | null
  /** the archive's own person slug, or `null` — never a near miss (rules 7, 64 §5) */
  playerSlug: string | null
  /** which file knew the name; `null` when nothing did */
  resolvedFrom: 'player-facts' | 'roster' | null
  /** the bracketed alias the source wrote beside the name — a hint, not the name */
  nicknameHe: string | null
  minute: number | null
  stoppage: number | null
  penalty: boolean
  ownGoal: boolean
  /** the source named two candidates. Recorded, never resolved (rule 60 §3) */
  scorerDisputed: boolean
  /** the source named two minutes */
  minuteDisputed: boolean
}

/** One match's scorer line, read. */
export type MatchScorersRecord = {
  /** rule 35's natural key, or `null` when the archive cannot express this row's season */
  matchKey: string | null
  seasonLabel: string | null
  /** the source's own season string, always — so a row with no canonical label still says when */
  seasonRaw: string | null
  competitionHe: string | null
  stage: string | null
  playedOn: string | null
  homeClubHe: string
  awayClubHe: string
  homeScore: number | null
  awayScore: number | null
  /** which named side is us — decided by the NAME, never by `homegame` */
  hapoelSide: 'home' | 'away'
  /** Hapoel's goals as the SCORE states them */
  hapoelGoalsFromScore: number | null
  /** Hapoel's goals as the SCORER LINE states them */
  goalsParsed: number
  /** `true` both numbers agree · `false` they do not · `null` the row has no readable score */
  agreesWithScore: boolean | null
  /** rule 36: `true` only where `homegame` said `x`; `null` where it said nothing readable */
  neutralGround: boolean | null
  goals: ScorerHolding[]
  confidence: 1 | 2
  /** present only when the two numbers disagree — it states BOTH and decides neither */
  conflictNoteHe?: string
  sourceTitle: string
  sourceUrl: string
}

/** A row that produced nothing, with the source's own words and why (rule 11). */
export type RefusedRow = {
  key: string
  code: ScorerRefusalCode | 'no-hapoel-side' | 'duplicate-key'
  reason: string
  /** what the source actually wrote, so a person can see it without opening the export */
  raw: string
  seasonRaw: string | null
}

/** A token nothing in the archive knew, and how often it appears. */
export type UnresolvedToken = { nameHe: string; goals: number; matches: number }

/** The `content/manual/fact-conflicts.json` shape, as the archive already writes it. */
export type ScorerConflict = {
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

export type ScorersReport = {
  rowsRead: number
  byDepartment: Record<string, number>
  footballRows: number
  footballRowsWithComments: number
  rowsParsed: number
  rowsRefused: number
  refusalsByCode: Record<string, number>
  goalsHeld: number
  /** the number the whole ingest is measured by */
  agreement: { agreed: number; disagreed: number; unscored: number; rate: number }
  confidenceCounts: Record<string, number>
  neutralGroundRows: number
  neutralGroundUnrecorded: number
  undatedRows: number
  rowsWithoutCanonicalSeason: number
  names: {
    goalsTotal: number
    named: number
    unnamedInSource: number
    disputed: number
    resolved: number
    resolvedFromPlayerFacts: number
    resolvedFromRoster: number
    unresolved: number
    rate: number
    topUnresolved: UnresolvedToken[]
  }
  notes: string[]
}

export type ScorersResult = {
  records: MatchScorersRecord[]
  refused: RefusedRow[]
  conflicts: ScorerConflict[]
  unresolved: UnresolvedToken[]
  report: ScorersReport
}

/* --------------------------------------------------------------- the reading */

/** `readFileSync` + `JSON.parse`, and nothing else. The only impure function here. */
export function readGamesFile(path: string): VikipoelGameRow[] {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error(`${path} אינו מערך`)
  return parsed as VikipoelGameRow[]
}

/** A person the archive already holds, for the alias index. */
export type NamedPerson = { slug?: string | null; name: string; aliases?: readonly string[] | null }

export type NameIndex = {
  playerFacts: ReadonlyMap<string, string>
  roster: ReadonlyMap<string, string>
}

/**
 * Rule 7's index: name → slug, by EQUALITY only.
 *
 * Both sides are whitespace-normalised and entity-decoded, which is comparing like with
 * like rather than fuzziness. Nothing else is done to either side — no stripping of
 * gershayim, no folding of spelling variants, no first-word rule. A name that is not in
 * one of these maps does not resolve, and that is the intended answer.
 *
 * A name that two different people answer to is dropped from the index rather than given
 * to whichever arrived first. `players-roster.json` already states this policy for its
 * own file ("an ambiguous alias is refused by the importer rather than assigned by
 * guesswork") and it is the same policy here: an ambiguous alias resolves to nobody.
 */
export function buildNameIndex(
  playerFacts: readonly NamedPerson[],
  roster: readonly NamedPerson[],
): NameIndex {
  return { playerFacts: indexOf(playerFacts), roster: indexOf(roster) }
}

function indexOf(people: readonly NamedPerson[]): ReadonlyMap<string, string> {
  const byName = new Map<string, string>()
  const ambiguous = new Set<string>()
  for (const person of people) {
    const slug = cleanText(person.slug ?? null) ?? deriveSlug(person.name)
    for (const candidate of [person.name, ...(person.aliases ?? [])]) {
      const key = cleanText(candidate)
      if (!key) continue
      const seen = byName.get(key)
      if (seen !== undefined && seen !== slug) ambiguous.add(key)
      else byName.set(key, slug)
    }
  }
  for (const key of ambiguous) byName.delete(key)
  return byName
}

/** Exact, in `player-facts.json` first because that is the file the archive cites. */
export function resolveScorer(
  index: NameIndex,
  nameHe: string | null,
): { slug: string | null; from: 'player-facts' | 'roster' | null } {
  if (nameHe === null) return { slug: null, from: null }
  const key = cleanText(nameHe)
  if (!key) return { slug: null, from: null }
  const fromFacts = index.playerFacts.get(key)
  if (fromFacts !== undefined) return { slug: fromFacts, from: 'player-facts' }
  const fromRoster = index.roster.get(key)
  if (fromRoster !== undefined) return { slug: fromRoster, from: 'roster' }
  return { slug: null, from: null }
}

/* ---------------------------------------------------------------- the walk */

export type ScorersInput = {
  games: readonly VikipoelGameRow[]
  clubs: readonly AliasedRecord[]
  playerFacts: readonly NamedPerson[]
  roster: readonly NamedPerson[]
}

/** Every alias of every football club the archive flags `isUs`. */
function usNames(clubs: readonly AliasedRecord[]): ReadonlySet<string> {
  const names = new Set<string>()
  for (const club of clubs) {
    const record = club as AliasedRecord & { isUs?: boolean }
    if (record.isUs !== true) continue
    if ((club.sport ?? 'football') !== 'football') continue
    for (const candidate of [club.slug, club.nameHe, club.nameEn, ...(club.aliases ?? [])]) {
      const key = cleanText(candidate ?? null)
      if (key) names.add(key)
    }
  }
  return names
}

function intOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const text = cleanText(value)
  if (text === null) return null
  return /^-?\d+$/u.test(text) ? Number(text) : null
}

export function parseFootballScorers(input: ScorersInput): ScorersResult {
  const us = usNames(input.clubs)
  const index = buildNameIndex(input.playerFacts, input.roster)

  const report: ScorersReport = {
    rowsRead: input.games.length,
    byDepartment: {},
    footballRows: 0,
    footballRowsWithComments: 0,
    rowsParsed: 0,
    rowsRefused: 0,
    refusalsByCode: {},
    goalsHeld: 0,
    agreement: { agreed: 0, disagreed: 0, unscored: 0, rate: 0 },
    confidenceCounts: {},
    neutralGroundRows: 0,
    neutralGroundUnrecorded: 0,
    undatedRows: 0,
    rowsWithoutCanonicalSeason: 0,
    names: {
      goalsTotal: 0,
      named: 0,
      unnamedInSource: 0,
      disputed: 0,
      resolved: 0,
      resolvedFromPlayerFacts: 0,
      resolvedFromRoster: 0,
      unresolved: 0,
      rate: 0,
      topUnresolved: [],
    },
    notes: [],
  }

  const records: MatchScorersRecord[] = []
  const refused: RefusedRow[] = []
  const conflicts: ScorerConflict[] = []
  const unresolvedTally = new Map<string, { goals: number; matches: Set<string> }>()
  const seenKeys = new Map<string, string>()

  for (const [position, row] of input.games.entries()) {
    const declared = cleanText(row.department) ?? '(אין ערך)'
    report.byDepartment[declared] = (report.byDepartment[declared] ?? 0) + 1
    if (declared !== FOOTBALL_DEPARTMENT) continue
    report.footballRows += 1

    // Rule 38's second lock. The filter above already did it; this throws if it ever
    // stops doing it, because the failure is silent and the cost is invented goals.
    assertFootballDepartment(declared)

    // ONE decode, here, for the whole row. `lib/scorers.ts` refuses text that still
    // carries an entity rather than decoding a second time — a double-unescape is its
    // own bug and the way to make it impossible is to have exactly one place that does it.
    const rawComment = row.comments === null || row.comments === undefined
      ? ''
      : decodeEntities(String(row.comments)).replace(/\s+/gu, ' ').trim()
    if (rawComment === '') continue
    report.footballRowsWithComments += 1

    const key = `games#${position + 1}`
    const seasonRaw = cleanText(row.ona)

    const hostName = cleanText(row.host)
    const awayName = cleanText(row.oponent)
    if (!hostName || !awayName) {
      refused.push({
        key,
        code: 'no-hapoel-side',
        reason: `השורה אינה נוקבת בשני הצדדים (host=${hostName ?? 'null'}, oponent=${awayName ?? 'null'})`,
        raw: rawComment,
        seasonRaw,
      })
      report.rowsRefused += 1
      report.refusalsByCode['no-hapoel-side'] = (report.refusalsByCode['no-hapoel-side'] ?? 0) + 1
      continue
    }

    // Which named side is us. The NAME decides it, through `clubs.json`'s own alias list
    // — never `homegame`, which answers a different question (rule 36 and the note above).
    const hostIsUs = us.has(hostName)
    const awayIsUs = us.has(awayName)
    if (hostIsUs === awayIsUs) {
      refused.push({
        key,
        code: 'no-hapoel-side',
        reason: hostIsUs
          ? `שני הצדדים נפתרים להפועל ת"א (${hostName} / ${awayName}) — הצד שלנו אינו יחיד`
          : `אף צד אינו נפתר להפועל ת"א (${hostName} / ${awayName}) דרך הכינויים ב-clubs.json`,
        raw: rawComment,
        seasonRaw,
      })
      report.rowsRefused += 1
      report.refusalsByCode['no-hapoel-side'] = (report.refusalsByCode['no-hapoel-side'] ?? 0) + 1
      continue
    }

    const parsed = parseScorerLine(rawComment)
    if (parsed.refusals.length > 0) {
      const refusal = parsed.refusals[0]
      const code = refusal?.code ?? 'prose'
      refused.push({
        key,
        code,
        reason: refusal?.reason ?? 'לא נקרא',
        raw: rawComment,
        seasonRaw,
      })
      report.rowsRefused += 1
      report.refusalsByCode[code] = (report.refusalsByCode[code] ?? 0) + 1
      continue
    }

    const homeScore = intOrNull(row.homescore)
    const awayScore = intOrNull(row.awayscore)
    const hapoelSide: 'home' | 'away' = hostIsUs ? 'home' : 'away'
    const hapoelGoalsFromScore = hapoelSide === 'home' ? homeScore : awayScore

    const goalsParsed = parsed.goals.length
    const agreesWithScore =
      hapoelGoalsFromScore === null ? null : goalsParsed === hapoelGoalsFromScore
    const confidence: 1 | 2 = agreesWithScore === true ? 2 : 1

    const seasonLabel = seasonRaw === null ? null : canonicalSeasonOrNull(seasonRaw)
    if (seasonLabel === null) report.rowsWithoutCanonicalSeason += 1

    const competitionHe = cleanText(row.mifal)
    const stage = cleanText(row.stage)
    const playedOn = playedOnFrom(row)
    if (playedOn === null) report.undatedRows += 1

    const neutralGround = neutralGroundFrom(row.homegame)
    if (neutralGround === true) report.neutralGroundRows += 1
    if (neutralGround === null) report.neutralGroundUnrecorded += 1

    // Rule 35: the natural key, and `sport` leads it because a club slug is unique only
    // within a sport. It is `null` where the archive cannot express the season label,
    // because a key built on a label `matches.json` refuses would join to nothing.
    const matchKey =
      seasonLabel === null || competitionHe === null
        ? null
        : [
            'football',
            seasonLabel,
            deriveSlug(competitionHe),
            deriveSlug(hostName),
            deriveSlug(awayName),
            stage ?? '',
          ].join('|')

    if (matchKey !== null) {
      const earlier = seenKeys.get(matchKey)
      if (earlier !== undefined) {
        refused.push({
          key,
          code: 'duplicate-key',
          reason: `כפילות של ${earlier} — אותו מפתח טבעי: ${matchKey}`,
          raw: rawComment,
          seasonRaw,
        })
        report.rowsRefused += 1
        report.refusalsByCode['duplicate-key'] = (report.refusalsByCode['duplicate-key'] ?? 0) + 1
        continue
      }
      seenKeys.set(matchKey, key)
    }

    const goals = parsed.goals.map((goal) => toHolding(goal, index))
    for (const [offset, goal] of goals.entries()) {
      report.names.goalsTotal += 1
      const source = parsed.goals[offset]
      if (goal.scorerNameHe === null) report.names.unnamedInSource += 1
      else report.names.named += 1
      if (source?.scorerDisputed === true) report.names.disputed += 1
      if (goal.resolvedFrom === 'player-facts') {
        report.names.resolved += 1
        report.names.resolvedFromPlayerFacts += 1
      } else if (goal.resolvedFrom === 'roster') {
        report.names.resolved += 1
        report.names.resolvedFromRoster += 1
      } else if (goal.scorerNameHe !== null) {
        report.names.unresolved += 1
        const tally = unresolvedTally.get(goal.scorerNameHe) ?? { goals: 0, matches: new Set<string>() }
        tally.goals += 1
        tally.matches.add(key)
        unresolvedTally.set(goal.scorerNameHe, tally)
      }
    }

    const record: MatchScorersRecord = {
      matchKey,
      seasonLabel,
      seasonRaw,
      competitionHe,
      stage,
      playedOn,
      homeClubHe: hostName,
      awayClubHe: awayName,
      homeScore,
      awayScore,
      hapoelSide,
      hapoelGoalsFromScore,
      goalsParsed,
      agreesWithScore,
      neutralGround,
      goals,
      confidence,
      sourceTitle: VIKIPOEL_SCORERS_SOURCE_TITLE,
      sourceUrl: VIKIPOEL_SCORERS_SOURCE_URL,
    }

    if (agreesWithScore === false) {
      const note =
        `רשימת הכובשים מונה ${goalsParsed} שערים; התוצאה באותה שורה אומרת ${hapoelGoalsFromScore} להפועל ` +
        `(${hostName} ${homeScore ?? '?'}:${awayScore ?? '?'} ${awayName}). שתי הטענות נשמרות כפי שהן.`
      record.conflictNoteHe = note
      conflicts.push({
        entityTable: 'match_scorers',
        entityKey: matchKey ?? `${seasonRaw ?? '?'}|${hostName}|${awayName}|${stage ?? ''}`,
        field: 'goals',
        claimA: `comments: ${goalsParsed} שערים — ${rawComment}`,
        claimB: `homescore/awayscore: ${hapoelGoalsFromScore} שערים להפועל`,
        sourceAUrl: VIKIPOEL_SCORERS_SOURCE_URL,
        sourceBUrl: VIKIPOEL_SCORERS_SOURCE_URL,
        noteHe: note,
        resolution: null,
      })
    } else if (agreesWithScore === null) {
      record.conflictNoteHe =
        'אין תוצאה קריאה בשורה, ולכן אי אפשר להצליב את מספר השערים — נאמר ולא הונח.'
    }

    records.push(record)
    report.rowsParsed += 1
    report.goalsHeld += goalsParsed
    report.confidenceCounts[String(confidence)] =
      (report.confidenceCounts[String(confidence)] ?? 0) + 1
    if (agreesWithScore === true) report.agreement.agreed += 1
    else if (agreesWithScore === false) report.agreement.disagreed += 1
    else report.agreement.unscored += 1
  }

  const checked = report.agreement.agreed + report.agreement.disagreed
  report.agreement.rate = checked === 0 ? 0 : report.agreement.agreed / checked

  const unresolved: UnresolvedToken[] = [...unresolvedTally]
    .map(([nameHe, tally]) => ({ nameHe, goals: tally.goals, matches: tally.matches.size }))
    .sort((a, b) => b.goals - a.goals || a.nameHe.localeCompare(b.nameHe, 'he'))
  report.names.topUnresolved = unresolved.slice(0, 40)
  const attributable = report.names.resolved + report.names.unresolved
  report.names.rate = attributable === 0 ? 0 : report.names.resolved / attributable

  report.notes.push(
    'הענף נקרא מ-department ולא מנוסח — כלל 6 / 38. comments היא מוסכמה של כדורגל, ולכן השורות של שאר הענפים לא נקראו כלל.',
    'הצד שלנו נקבע לפי השם ב-host / oponent דרך הכינויים ב-clubs.json (כלל 7), ולא לפי homegame. לכן homegame="x" אינו מקרה מיוחד: הוא נרשם כ-neutralGround בלבד (כלל 36).',
    'שורה שלא הוכחה במלואה אינה מניבה שער אחד — כלל 11. הטקסט הגולמי והסיבה נשמרים ב-refused.',
    'הצלבה מול התוצאה באותה שורה קובעת confidence: 2 בהסכמה, 1 בסתירה, והסתירה נרשמת ואינה מוכרעת (כלל 60 §3, כלל 2).',
    'מעבר שם-משפחה בלבד לא נעשה — נמדד ב-~50% טעויות ונמחק (כלל 64 §5). טוקן שלא נפתר נשאר כלשון המקור עם playerSlug: null ומוצג בדוח.',
  )

  return { records, refused, conflicts, unresolved, report }
}

function toHolding(goal: ParsedGoal, index: NameIndex): ScorerHolding {
  // A disputed scorer (`מאיר או בוצ'קה`) is never resolved to a person: the source states
  // two candidates and rule 60 §3 records both rather than picking. The GOAL is kept,
  // because the source is certain a goal was scored — only its author is in question.
  const resolution = goal.scorerDisputed
    ? { slug: null, from: null as 'player-facts' | 'roster' | null }
    : resolveScorer(index, goal.scorerNameHe)
  return {
    scorerNameHe: goal.scorerNameHe,
    playerSlug: resolution.slug,
    resolvedFrom: resolution.from,
    nicknameHe: goal.nicknameHe,
    minute: goal.minute,
    stoppage: goal.stoppage,
    penalty: goal.penalty,
    ownGoal: goal.ownGoal,
    scorerDisputed: goal.scorerDisputed,
    minuteDisputed: goal.minuteDisputed,
  }
}
