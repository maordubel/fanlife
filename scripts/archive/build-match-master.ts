/**
 * npm run matches:master — the Match / Moment Master (21.9.2026).
 *
 * Every match the archive holds, under the `m_…` id minted into
 * `content/manual/match-ids.json` (rule 35), with every key any file uses for it; and
 * every moment — `goal:<goalId>` from `goals.json`, `moment:<slug>` from `moments.json` —
 * joined to its match, its scorer's `p_…` id and its sources. What disagrees is carried
 * as `claims` and `conflictRefs` (rule 60 §3); what cannot be joined is in `unresolved`,
 * never guessed.
 *
 * **This builder never mints.** A match row whose key is not in the registry is a build
 * error: run `npm run canon:ids -- --write-ids` first (one-way; Maor's OK on 21.9.2026).
 *
 * Consumers read it through `lib/archive/match-master.ts` (server-only). Gates 2, 3, 8,
 * 9, 10, 12 and 13 are the intended readers; `usable.{replay,trivia,archive}` is the
 * contract they respect — a moment with an open conflict on a field a surface uses is
 * `false` for that surface, and says why in `usableWhy`.
 *
 * Deterministic; `inputsSha` fingerprints the inputs, and `tests/match-master.test.ts`
 * fails when the committed file is stale.
 */

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { idForNaturalKey, matchKeyResolver, type MatchIdEntry } from '@/lib/canon/matchId'
import {
  buildIdentityIndex,
  type PlayerIdEntry,
  type PlayerMasterV2File,
  type PlayerMasterV2Record,
} from '@/lib/archive/player-identity'
import type {
  ActorKind,
  CrossCheck,
  MatchDecision,
  MatchMasterFile,
  MatchRecord,
  MomentRecord,
  MatchRelation,
  ResearchItem,
  ScorerEntry,
  UnresolvedItem,
} from '@/lib/archive/match-master-types'
import { fold } from '@/lib/game/roster-search'
import { keyedMatches, planMatchRegistry, US, type KeyedMatch } from '@/scripts/ingest/lib/manualMatchIds'
import { byCodePoint } from '@/scripts/ingest/lib/playerIds'

const OUT = 'content/generated/match-master.json'
const CONFIDENCE_FLOOR = 2
const SECONDARY_INTL = 'content/manual/intl-redfans-2026-09-24.json'
const ASIAN_FILE = 'content/manual/asian-competition-matches.json'
/** the ויקיפועל season schedules (delta 89) — rows carry their own `scorers` (the `comments` line) */
const SCHEDULES_FILE = 'content/manual/matches-vikipoel-2026-09-25.json'
const INTL_COMPETITIONS = new Set(['גביע-אלופות-אסיה', 'גביע-אסיה', 'גביע-האינטרטוטו', 'גביע-אופא', 'הליגה-האירופית', 'ליגת-האלופות', 'קונפרנס-ליג'])
/** the enrichment's competition names → the archive's slugs */
const SECONDARY_COMPETITION: Record<string, string[]> = {
  'גביע אסיה': ['גביע-אסיה', 'גביע-אלופות-אסיה'],
  'גביע אינטרטוטו': ['גביע-האינטרטוטו'],
  'גביע אופ"א': ['גביע-אופא'],
  'ליגת האלופות': ['ליגת-האלופות'],
  'הליגה האירופית': ['הליגה-האירופית'],
  'ליגת הועידה': ['קונפרנס-ליג'],
}
type SecondaryScorer = { nameHe: string | null; minute: number | null; stoppage: number | null; penalty: boolean; ownGoal: boolean; confidence: number | null; sourceUrl: string | null }
type SecondaryRow = {
  playedOn: string
  competitionHe: string
  stageHe: string | null
  side: 'HOME' | 'AWAY' | 'NEUTRAL' | null
  opponentHe: string | null
  opponentLatin: string | null
  scoreFor: number | null
  scoreAgainst: number | null
  physicalPlayed: false | null
  venueText: string | null
  independentFields: string[]
  echoesRepo: boolean
  sources: { title: string; url: string; confidence: number; fields: string[] }[]
  scorerCoverage: string
  scorers: SecondaryScorer[]
  conflicts: { field: string; values: { value: unknown; source: string }[]; note: string | null }[]
  notes: string[]
}

/** Every file the master reads. Append, never re-sort — the order is the fingerprint's. */
export const MATCH_MASTER_INPUTS = [
  'content/manual/match-ids.json',
  'content/manual/matches.json',
  'content/manual/basketball-matches.json',
  'content/manual/match-scorers.json',
  'content/manual/match-events.json',
  'content/manual/moments.json',
  'content/manual/goals.json',
  'content/manual/lineups.json',
  'content/manual/euro-ties.json',
  'content/manual/fact-conflicts.json',
  'content/manual/clubs.json',
  'content/manual/player-ids.json',
  'content/generated/player-master.json',
  'content/manual/asian-competition-matches.json',
  'content/manual/intl-redfans-2026-09-24.json',
  'content/manual/matches-vikipoel-2026-09-25.json',
] as const

export function matchInputsSha(root: string, inputs: readonly string[] = MATCH_MASTER_INPUTS): string {
  const hash = createHash('sha256')
  for (const file of inputs) {
    hash.update(`${file}\n${createHash('sha256').update(readFileSync(join(root, file))).digest('hex')}\n`)
  }
  return hash.digest('hex')
}

/** Competitions that make a goal a European night for the research queue. */
const EUROPE = new Set(['גביע-אופא', 'הליגה-האירופית', 'ליגת-האלופות', 'קונפרנס-ליג', 'גביע-האינטרטוטו'])

/**
 * `goals.json` actor strings that are not a Hapoel player, read one by one (replay.md §3).
 * A thing (the ball) is `unnamed`; the other side's keeper is `opponent`. Nothing here is
 * a person in the Player Master, and nothing here gets a `p_` id.
 */
const ACTOR_KINDS: Record<string, { kind: Exclude<ActorKind, 'player'>; noteHe: string }> = {
  הכדור: { kind: 'unnamed', noteHe: 'הדיווח אינו נוקב במוסר — "הכדור עבר את ההגנה"' },
  השוער: { kind: 'opponent', noteHe: 'שוער היריבה שהדף' },
  'השוער הרוש': { kind: 'opponent', noteHe: 'שוער היריבה שהדף' },
}

/**
 * Two slugs clubs.json files for one club — a reviewed equivalence for the cross-check
 * ONLY; it is not an alias and changes no club row. `בית"ר י-ם` is the Games table's
 * abbreviation (י-ם = ירושלים) and `בית"ר ירושלים` the curated record; the 15.5.2010
 * championship row at טדי carries the first, the goal record the second.
 */
const SAME_CLUB: [string, string][] = [
  ['בית"ר-ירושלים', 'בית"ר-י-ם'],
  // FC Ararat Yerevan, 2001/02 UEFA Cup qualifier: the Games table spells the away leg
  // `אררט-ירבאן` and the research doc the home leg `ארארט-ירוואן` — one club (Wildstat
  // ARM_Ararat_Erevan holds both legs, 9.8 and 23.8.2001). Cross-check only, as above.
  ['אררט-ירבאן', 'ארארט-ירוואן'],
]

type Row = Record<string, any>
let ROOT = process.cwd()
const read = (file: string): any => JSON.parse(readFileSync(join(ROOT, file), 'utf8'))
const confidenceOf = (row: Row, doc: any): number =>
  typeof row.confidence === 'number' ? row.confidence : typeof doc?.confidence === 'number' ? doc.confidence : 0

/* ---------------------------------------------------------------------- sources */

/** A short, stable, readable id for a source — `ynet:L-1216728`, `walla:1723442`, … */
function sourceIdOf(url: string | null | undefined, title: string | null | undefined): string {
  const u = url ?? ''
  let m: RegExpMatchArray | null
  if ((m = u.match(/ynet\.co\.il\/articles\/[\d,]+,L-(\d+)/))) return `ynet:L-${m[1]}`
  if ((m = u.match(/walla\.co\.il\/item\/(\d+)/))) return `walla:${m[1]}`
  if ((m = u.match(/one\.co\.il\/Article\/(\d+)/))) return `one:${m[1]}`
  if (u === 'https://wiki.red-fans.com/index.php?title=Special:CargoTables/Games') return 'vikipoel:games'
  const host = u.match(/^https?:\/\/(?:www\.)?([^/]+)/)?.[1] ?? 'src'
  const label = host.includes('red-fans') ? 'vikipoel' : (host.split('.').slice(0, -1).join('.') || host)
  return `${label}:${createHash('sha1').update(`${title ?? ''}|${u}`).digest('hex').slice(0, 8)}`
}

/* ---------------------------------------------------------------------- build */

export function buildMatchMaster(root = process.cwd()): { out: MatchMasterFile; problems: string[] } {
  ROOT = root
  const problems: string[] = []
  const registry = (read('content/manual/match-ids.json') as { records: MatchIdEntry[] }).records
  const resolveMatch = matchKeyResolver(registry)

  // The registry must already hold every match — this builder never mints.
  const plan = planMatchRegistry(root, registry, '0000-00-00')
  if (plan.minted > 0 || plan.dialectsAdded > 0) {
    problems.push(`match-ids.json is behind the archive (${plan.minted} unminted, ${plan.dialectsAdded} dialect keys) — run npm run canon:ids -- --write-ids`)
  }

  const sources = new Map<string, { title: string; url: string | null }>()
  const cite = (url: string | null | undefined, title: string | null | undefined): string => {
    const id = sourceIdOf(url, title)
    const found = sources.get(id)
    const next = { title: title ?? '', url: url ?? null }
    if (!found || (next.title && next.title < found.title) || (!found.title && next.title)) sources.set(id, next)
    return id
  }

  /* ---- people */
  const players = read('content/generated/player-master.json') as PlayerMasterV2File
  const personById = new Map(players.players.map((p) => [p.id, p]))
  const identity = buildIdentityIndex((read('content/manual/player-ids.json') as { records: PlayerIdEntry[] }).records)
  const personOf = (q: string | null | undefined): PlayerMasterV2Record | null => {
    const hit = identity.resolve(q)
    return hit ? (personById.get(hit.id) ?? null) : null
  }

  /* ---- clubs */
  const clubs = read('content/manual/clubs.json').records as Row[]
  const clubName = new Map<string, string>()
  const clubIndex = new Map<string, Set<string>>()
  for (const club of clubs) {
    if (club.sport && club.sport !== 'football') continue
    if (!clubName.has(club.slug)) clubName.set(club.slug, club.nameHe)
    for (const name of [club.slug, club.nameHe, ...(club.aliases ?? [])]) {
      const set = clubIndex.get(fold(name)) ?? new Set<string>()
      set.add(club.slug)
      clubIndex.set(fold(name), set)
    }
  }
  const clubOf = (name: string): string | null => {
    const set = clubIndex.get(fold(name))
    return set && set.size === 1 ? ([...set][0] as string) : null
  }
  const sameClub = (a: string | null, b: string | null): boolean =>
    a !== null && b !== null && (a === b || SAME_CLUB.some(([x, y]) => (a === x && b === y) || (a === y && b === x)))

  /* ---- conflicts, by what they are about */
  const conflictRows = read('content/manual/fact-conflicts.json').records as Row[]
  const conflictKey = (row: Row) => [row.entityTable, row.entityKey ?? '', row.field].join('|')
  const conflictsByMatch = new Map<string, Row[]>()
  const conflictsByGoal = new Map<string, Row[]>()
  type Decision = { matchId: string; field: string; value: unknown; winningSourceUrl: string; winningSourceTitle: string; decidedOn?: string }
  const decisionsByMatch = new Map<string, { row: Row; d: Decision }[]>()
  for (const row of conflictRows) {
    const list = (row.decisions ?? []) as Decision[]
    if (list.length && (row.resolution === null || row.resolution === undefined)) {
      problems.push(`decisions on an unresolved conflict: ${conflictKey(row)}`)
      continue
    }
    for (const d of list) {
      if (!registry.some((e) => e.id === d.matchId)) {
        problems.push(`decision ${conflictKey(row)} names no registry match: ${d.matchId}`)
        continue
      }
      if (!d.winningSourceUrl) problems.push(`decision ${conflictKey(row)} has no winning source`)
      decisionsByMatch.set(d.matchId, [...(decisionsByMatch.get(d.matchId) ?? []), { row, d }])
    }
  }
  for (const row of conflictRows) {
    if (row.resolution !== null && row.resolution !== undefined) continue // settled by a named person
    if (row.entityTable === 'match' && row.entityKey) {
      const id = resolveMatch(row.entityKey)
      if (id) conflictsByMatch.set(id, [...(conflictsByMatch.get(id) ?? []), row])
    }
    if (row.entityTable === 'goal' && row.entityKey) {
      conflictsByGoal.set(row.entityKey, [...(conflictsByGoal.get(row.entityKey) ?? []), row])
    }
  }

  /* ---- matches */
  const rows = keyedMatches(root)
  const rowsById = new Map<string, KeyedMatch[]>()
  for (const row of rows) {
    const id = idForNaturalKey(registry, row.naturalKey)
    if (!id) {
      problems.push(`no registry id for ${row.naturalKey}`)
      continue
    }
    rowsById.set(id, [...(rowsById.get(id) ?? []), row])
  }

  /* ---- the secondary international reading (ויקיפועל via the owner's enrichment, 24.9.2026) */
  // Joined to canonical matches by date + competition (+ opponent); it mints nothing and
  // carries none of its own ids. Only the fields its own pages state (`independentFields`)
  // may disagree with the archive — the rest of a row echoes euro-ties.json and is not a
  // second source. A disagreement becomes a claim; nothing is overwritten.
  const secondaryDoc = read(SECONDARY_INTL) as { records: SecondaryRow[] }
  const secondaryUnjoined: UnresolvedItem[] = []
  const secondaryOpponent = new Map<string, SecondaryRow>()
  const secondaryById = new Map<string, SecondaryRow>()
  const intlGroups = [...rowsById.entries()].filter(([, group]) =>
    group.some((row) => row.sport === 'football' && (row.homeClubSlug === US || row.awayClubSlug === US) && INTL_COMPETITIONS.has(row.competitionSlug)),
  )
  const dayDiff = (a: string, b: string) => Math.abs(Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86400000
  for (const row of secondaryDoc.records) {
    const slugs = SECONDARY_COMPETITION[row.competitionHe] ?? []
    const opp = row.opponentHe ? clubOf(row.opponentHe) : null
    const inComp = intlGroups.filter(([, group]) => slugs.includes((group[0] as KeyedMatch).competitionSlug))
    const oppOf = (group: KeyedMatch[]) => {
      const first = group[0] as KeyedMatch
      return first.homeClubSlug === US ? first.awayClubSlug : first.homeClubSlug
    }
    let hits = inComp.filter(([, group]) => group.some((r) => r.playedOn === row.playedOn))
    if (hits.length > 1 && opp) hits = hits.filter(([, group]) => sameClub(oppOf(group), opp))
    let how = 'date'
    if (hits.length === 0 && opp) {
      const sideOf = (group: KeyedMatch[]) => ((group[0] as KeyedMatch).homeClubSlug === US ? 'HOME' : 'AWAY')
      hits = inComp.filter(
        ([, group]) =>
          sameClub(oppOf(group), opp) &&
          (row.side === 'NEUTRAL' || sideOf(group) === row.side) &&
          group.some((r) => r.playedOn && dayDiff(r.playedOn, row.playedOn) <= 45),
      )
      how = 'opponent+side ±45 days'
    }
    const key = `${row.playedOn} ${row.competitionHe} ${row.opponentHe ?? '?'}`
    if (hits.length !== 1) {
      secondaryUnjoined.push({ kind: 'secondary-row', file: SECONDARY_INTL, key, reason: hits.length ? `ambiguous (${hits.length} matches, ${how})` : 'no canonical match on that date / against that club' })
      continue
    }
    const [id, group] = hits[0] as [string, KeyedMatch[]]
    if (secondaryById.has(id)) {
      secondaryUnjoined.push({ kind: 'secondary-row', file: SECONDARY_INTL, key, reason: `a second row for ${id}` })
      continue
    }
    secondaryById.set(id, row)
    const base = group[0] as KeyedMatch
    const ours = oppOf(group)
    if (opp && !sameClub(ours, opp)) secondaryOpponent.set(id, row)
    // a second reading of the core fields — only those the red-fans page itself states
    const own = new Set(row.independentFields)
    if (row.physicalPlayed === false || !(own.has('date') || own.has('score') || own.has('home_away'))) continue
    const src = row.sources.find((s) => s.fields.some((f) => ['date', 'score', 'home_away'].includes(f))) ?? row.sources[0]
    const usHome = row.side === 'HOME' || (row.side === 'NEUTRAL' && base.homeClubSlug === US)
    const pseudo: KeyedMatch = {
      ...base,
      file: SECONDARY_INTL,
      index: -1,
      playedOn: own.has('date') ? row.playedOn : base.playedOn,
      homeClubSlug: own.has('home_away') && row.side !== 'NEUTRAL' ? (usHome ? US : ours) : base.homeClubSlug,
      awayClubSlug: own.has('home_away') && row.side !== 'NEUTRAL' ? (usHome ? ours : US) : base.awayClubSlug,
      homeScore: base.homeScore,
      awayScore: base.awayScore,
      confidence: 2,
      sourceUrl: src?.url ?? null,
      sourceTitle: src?.title ?? 'ויקיפועל',
    }
    ;(pseudo as Row).venueSlug = (base as Row).venueSlug ?? null
    ;(pseudo as Row).neutralGround = (base as Row).neutralGround === true || row.side === 'NEUTRAL'
    if (own.has('score') && row.scoreFor !== null && row.scoreAgainst !== null) {
      const home = pseudo.homeClubSlug === US
      pseudo.homeScore = home ? row.scoreFor : row.scoreAgainst
      pseudo.awayScore = home ? row.scoreAgainst : row.scoreFor
    }
    rowsById.set(id, [...group, pseudo])
  }

  // scorer rows, by match id
  const scorerDoc = read('content/manual/match-scorers.json')
  const scorersById = new Map<string, Row[]>()
  const unresolvedScorerNames = new Map<string, number>()
  for (const row of scorerDoc.records as Row[]) {
    const id = row.matchKey ? resolveMatch(row.matchKey) : null
    if (!id) continue
    scorersById.set(id, [...(scorersById.get(id) ?? []), row])
  }
  // events, by match id
  const eventsById = new Map<string, Row[]>()
  for (const row of read('content/manual/match-events.json').records as Row[]) {
    const id = resolveMatch(row.matchNaturalKey)
    if (id) eventsById.set(id, [...(eventsById.get(id) ?? []), row])
  }
  // lineups, by match id
  const lineupDoc = read('content/manual/lineups.json')
  const lineupById = new Map<string, Row>()
  for (const lineup of lineupDoc.records as Row[]) {
    const id = resolveMatch(lineup.matchId)
    if (id) lineupById.set(id, lineup)
  }

  const matches: MatchRecord[] = []
  const matchById = new Map<string, MatchRecord>()
  for (const entry of [...registry].sort((a, b) => byCodePoint(a.id, b.id))) {
    const group = rowsById.get(entry.id) ?? []
    if (group.length === 0) {
      problems.push(`registry id ${entry.id} has no match row`)
      continue
    }
    const first = group[0] as KeyedMatch
    const distinct = <T,>(pick: (row: KeyedMatch) => T) => [...new Set(group.map((row) => JSON.stringify(pick(row))))]
    const claims: MatchRecord['claims'] = []
    const claim = (field: string, pick: (row: KeyedMatch) => unknown) => {
      if (distinct(pick).length < 2) return false
      claims.push({
        field,
        values: group.map((row) => ({
          value: pick(row) as string | number | null,
          sourceId: cite(row.sourceUrl, row.sourceTitle),
          file: row.file,
        })),
      })
      return true
    }
    const datesDisputed = claim('playedOn', (row) => row.playedOn)
    const homeDisputed = claim('home', (row) => row.homeClubSlug)
    claim('venue', (row) => (row as Row).venueSlug ?? null)
    const ours = (row: KeyedMatch) => (row.homeClubSlug === US ? 'home' : row.awayClubSlug === US ? 'away' : null)
    const result = (row: KeyedMatch) => {
      const side = ours(row)
      if (side === null || row.homeScore === null || row.awayScore === null) return null
      return side === 'home' ? { hapoel: row.homeScore, opponent: row.awayScore } : { hapoel: row.awayScore, opponent: row.homeScore }
    }
    claim('result', (row) => result(row))
    const side = homeDisputed ? null : ours(first)
    const opponentSlug = ours(first) === null ? null : ours(first) === 'home' ? first.awayClubSlug : first.homeClubSlug
    const res = distinct((row) => result(row)).length === 1 ? result(first) : null

    const scorerRows = scorersById.get(entry.id) ?? []
    const scorers: ScorerEntry[] = []
    for (const row of scorerRows) {
      const sourceId = cite(row.sourceUrl, row.sourceTitle)
      for (const goal of (row.goals ?? []) as Row[]) {
        const person = personOf(goal.playerSlug) ?? personOf(goal.scorerNameHe)
        if (!person && goal.scorerNameHe) {
          unresolvedScorerNames.set(goal.scorerNameHe, (unresolvedScorerNames.get(goal.scorerNameHe) ?? 0) + 1)
        }
        scorers.push({
          playerId: person?.id ?? null,
          nameHe: goal.scorerNameHe ?? null,
          minute: goal.minute ?? null,
          stoppage: goal.stoppage ?? null,
          penalty: goal.penalty === true,
          ownGoal: goal.ownGoal === true,
          sourceId,
          confidence: confidenceOf(row, scorerDoc),
        })
      }
    }
    // second and third readings of the scorers: the red-fans pages, and the Asian file's RSSSF line
    const readings: { label: string; sourceId: string; file: string; list: ScorerEntry[] }[] = []
    if (scorers.length > 0) {
      readings.push({ label: 'archive', sourceId: scorers[0]?.sourceId as string, file: 'content/manual/match-scorers.json', list: scorers })
    }
    const toEntry = (g: SecondaryScorer | Row, fallbackUrl: string | null, fallbackTitle: string, conf: number): ScorerEntry => {
      const person = g.ownGoal ? null : personOf(g.nameHe)
      if (!person && !g.ownGoal && g.nameHe) unresolvedScorerNames.set(g.nameHe, (unresolvedScorerNames.get(g.nameHe) ?? 0) + 1)
      return {
        playerId: person?.id ?? null,
        nameHe: g.nameHe ?? null,
        minute: g.minute ?? null,
        stoppage: g.stoppage ?? null,
        penalty: g.penalty === true,
        ownGoal: g.ownGoal === true,
        sourceId: cite(g.sourceUrl ?? fallbackUrl, g.sourceUrl ? 'ויקיפועל — עמוד המשחק / לוח המשחקים' : fallbackTitle),
        confidence: typeof g.confidence === 'number' ? Math.min(g.confidence, 3) : conf,
      }
    }
    const secondary = secondaryById.get(entry.id)
    if (secondary && secondary.physicalPlayed !== false && secondary.scorers.length > 0) {
      const list = secondary.scorers.map((g) => toEntry(g, secondary.sources[0]?.url ?? null, 'ויקיפועל', 2))
      readings.push({ label: 'red-fans', sourceId: list[0]?.sourceId as string, file: SECONDARY_INTL, list })
    }
    for (const row of group) {
      if ((row.file !== ASIAN_FILE && row.file !== SCHEDULES_FILE) || !Array.isArray((row as Row).scorers)) continue
      const list = ((row as Row).scorers as Row[]).map((g) => toEntry(g, row.sourceUrl ?? null, row.sourceTitle ?? '', row.confidence ?? 2))
      readings.push({ label: row.file === ASIAN_FILE ? 'asia' : 'schedules', sourceId: cite(row.sourceUrl, row.sourceTitle), file: row.file, list })
    }
    let scorerIdentityDisputed = false
    if (scorers.length === 0 && readings.length > 0) scorers.push(...(readings[0] as { list: ScorerEntry[] }).list)
    if (readings.length > 1) {
      // Names are compared only through the Player Master (rule 7 — never fuzzily): two
      // spellings of one unresolved name are not a disagreement, two different people are.
      // A goal is placed by its total minute (minute + stoppage), so 90+4 and 94 agree.
      const at = (g: ScorerEntry) => (g.minute === null ? null : g.minute + (g.stoppage ?? 0))
      const say = (list: ScorerEntry[]) =>
        list.map((g) => `${g.nameHe ?? '?'}${g.ownGoal ? ' (עצמי)' : ''}${g.minute !== null ? ` ${g.minute}${g.stoppage ? `+${g.stoppage}` : ''}` : ''}${g.penalty ? ' (פנדל)' : ''}`).join(' · ')
      const ids = (list: ScorerEntry[]) => list.filter((g) => !g.ownGoal && g.playerId).map((g) => g.playerId as string).sort(byCodePoint)
      const disagree = (a: ScorerEntry[], b: ScorerEntry[]): 'scorers' | 'scorers.minute' | null => {
        if (a.length !== b.length) return 'scorers'
        if (a.filter((g) => g.ownGoal).length !== b.filter((g) => g.ownGoal).length) return 'scorers'
        const timed = a.every((g) => at(g) !== null) && b.every((g) => at(g) !== null)
        if (timed) {
          const ma = [...a].sort((x, y) => (at(x) as number) - (at(y) as number))
          const mb = [...b].sort((x, y) => (at(x) as number) - (at(y) as number))
          const sameMinutes = ma.every((g, i) => at(g) === at(mb[i] as ScorerEntry))
          if (sameMinutes) {
            const clash = ma.some((g, i) => {
              const h = mb[i] as ScorerEntry
              return g.ownGoal !== h.ownGoal || (!g.ownGoal && g.playerId && h.playerId && g.playerId !== h.playerId)
            })
            return clash ? 'scorers' : null
          }
        }
        // minutes differ (or are missing): the people must still be the same people
        const ia = ids(a)
        const ib = ids(b)
        const comparable = ia.length === a.filter((g) => !g.ownGoal).length && ib.length === b.filter((g) => !g.ownGoal).length
        if (comparable && ia.join() !== ib.join()) return 'scorers'
        return timed ? 'scorers.minute' : null
      }
      const first = readings[0] as (typeof readings)[number]
      const verdicts = readings.slice(1).map((r) => disagree(first.list, r.list))
      const field = verdicts.includes('scorers') ? 'scorers' : verdicts.includes('scorers.minute') ? 'scorers.minute' : null
      if (field) {
        claims.push({ field, values: readings.map((r) => ({ value: say(r.list), sourceId: r.sourceId, file: r.file })) })
        scorerIdentityDisputed = field === 'scorers'
      }
    }
    // the conflicts the enrichment itself preserved — kept as claims, not decided
    if (secondary) {
      for (const c of secondary.conflicts) {
        const field = c.field === 'date' ? 'playedOn' : c.field === 'venue' ? 'venue' : null
        if (!field || claims.some((x) => x.field === field)) continue
        claims.push({
          field,
          values: c.values.map((v) => ({
            value: typeof v.value === 'string' || typeof v.value === 'number' ? v.value : JSON.stringify(v.value),
            sourceId: cite(/^https?:/.test(v.source) ? v.source : null, /^https?:/.test(v.source) ? 'ויקיפועל' : v.source),
            file: SECONDARY_INTL,
          })),
        })
      }
      const other = secondaryOpponent.get(entry.id)
      if (other && !claims.some((x) => x.field === 'opponent')) {
        claims.push({
          field: 'opponent',
          values: [
            { value: first.homeClubSlug === US ? first.awayClubSlug : first.homeClubSlug, sourceId: cite(first.sourceUrl, first.sourceTitle), file: first.file },
            { value: other.opponentHe, sourceId: cite(other.sources[0]?.url ?? null, other.sources[0]?.title ?? 'ויקיפועל'), file: SECONDARY_INTL },
          ],
        })
      }
    }
    const notPlayed =
      secondary?.physicalPlayed === false || group.some((row) => (row as Row).status === 'walkover')
        ? {
            reason: 'walkover — the fixture was not played; a technical result, no match on a pitch',
            sourceIds: [
              ...new Set([
                ...group.filter((row) => (row as Row).status === 'walkover').map((row) => cite(row.sourceUrl, row.sourceTitle)),
                ...(secondary?.physicalPlayed === false && secondary.sources[0] ? [cite(secondary.sources[0].url, secondary.sources[0].title)] : []),
              ]),
            ].sort(byCodePoint),
          }
        : null
    // a claim the enrichment preserved disputes the field exactly as two archive rows would
    const dateClaimed = datesDisputed || claims.some((c) => c.field === 'playedOn')
    const venueClaimed = claims.some((c) => c.field === 'venue')

    const events = (eventsById.get(entry.id) ?? []).map((row) => ({
      seq: row.seq ?? null,
      type: row.type,
      minute: row.minute ?? null,
      minuteExtra: row.minuteExtra ?? null,
      clubSlug: row.clubSlug ?? null,
      playerId: personOf(row.personSlug)?.id ?? null,
      relatedPlayerId: personOf(row.relatedPersonSlug)?.id ?? null,
      sourceId: cite(row.sourceUrl, row.sourceTitle),
    }))
    const conflictRefs = (conflictsByMatch.get(entry.id) ?? []).map(conflictKey).sort(byCodePoint)

    const record: MatchRecord = {
      matchId: entry.id,
      sport: entry.sport,
      aliases: [
        ...new Set([entry.naturalKey, ...entry.aliases, ...(entry.dialects ?? []).map((d) => d.key)]),
      ],
      playedOn: dateClaimed
        ? { value: null, precision: 'disputed' }
        : first.playedOn
          ? { value: first.playedOn, precision: 'day' }
          : { value: null, precision: 'unknown' },
      season: first.seasonLabel,
      competition: first.competitionSlug,
      stage: first.stage,
      clubs: [first.homeClubSlug, first.awayClubSlug].sort(byCodePoint) as [string, string],
      home: homeDisputed ? null : first.homeClubSlug,
      away: homeDisputed ? null : first.awayClubSlug,
      hapoelSide: side,
      opponent: opponentSlug,
      score:
        homeDisputed || first.homeScore === null || first.awayScore === null || distinct((r) => [r.homeScore, r.awayScore]).length > 1
          ? null
          : { home: first.homeScore, away: first.awayScore },
      result: res,
      neutralGround: group.some((row) => (row as Row).neutralGround === true),
      venue: !venueClaimed && distinct((row) => (row as Row).venueSlug ?? null).length === 1 ? ((first as Row).venueSlug ?? null) : null,
      claims,
      conflictRefs,
      scorers,
      scorersDisputed: scorerIdentityDisputed || scorerRows.some((row) => confidenceOf(row, scorerDoc) < CONFIDENCE_FLOOR),
      events,
      lineupRef: lineupById.get(entry.id)?.matchId ?? null,
      momentIds: [],
      sourceIds: [...new Set(group.map((row) => cite(row.sourceUrl, row.sourceTitle)))].sort(byCodePoint),
      confidence: Math.max(...group.map((row) => row.confidence ?? 0)),
      mergeNote: entry.mergeNote ?? null,
      ...(notPlayed ? { notPlayed } : {}),
    }
    // decisions (delta 89): a fact-conflicts row that a named person resolved, carrying the
    // structured `decisions` — the claim leaves `claims` for `decided`, where every reading
    // it had stays (losing provenance is never deleted), and the field takes the winner.
    for (const { row: conflictRow, d } of decisionsByMatch.get(entry.id) ?? []) {
      const field = d.field
      const taken = record.claims.filter((c) => c.field === field || (field === 'scorers' && c.field === 'scorers.minute'))
      record.claims = record.claims.filter((c) => !taken.includes(c))
      const sourceId = cite(d.winningSourceUrl, d.winningSourceTitle)
      const decided: MatchDecision = {
        field,
        value: (d.value ?? null) as MatchDecision['value'],
        sourceId,
        conflict: conflictKey(conflictRow),
        resolutionHe: String(conflictRow.resolution),
        decidedBy: String(conflictRow.resolvedBy ?? ''),
        decidedOn: String(d.decidedOn ?? ''),
        overruled: taken.flatMap((c) => c.values),
      }
      record.decided = [...(record.decided ?? []), decided]
      if (!record.sourceIds.includes(sourceId)) record.sourceIds = [...record.sourceIds, sourceId].sort(byCodePoint)
      const scoreFrom = () => {
        if (!record.result || record.hapoelSide === null) return null
        return record.hapoelSide === 'home'
          ? { home: record.result.hapoel, away: record.result.opponent }
          : { home: record.result.opponent, away: record.result.hapoel }
      }
      if (field === 'playedOn') {
        record.playedOn = typeof d.value === 'string' ? { value: d.value, precision: 'day' } : { value: null, precision: 'unknown' }
      } else if (field === 'home') {
        const home = String(d.value)
        if (!record.clubs.includes(home)) problems.push(`decision ${decided.conflict}: home ${home} is not a club of ${entry.id}`)
        record.home = home
        record.away = record.clubs.find((c) => c !== home) ?? null
        record.hapoelSide = home === US ? 'home' : record.away === US ? 'away' : null
        record.score = scoreFrom()
      } else if (field === 'result') {
        const v = d.value as { hapoel: number; opponent: number } | null
        record.result = v && typeof v.hapoel === 'number' ? { hapoel: v.hapoel, opponent: v.opponent } : null
        record.score = scoreFrom()
      } else if (field === 'venue') {
        record.venue = typeof d.value === 'string' ? d.value : null
      } else if (field === 'stage') {
        record.stage = typeof d.value === 'string' ? d.value : record.stage
      } else if (field === 'scorers') {
        const reading = readings.find((r) => r.file.endsWith(String(d.value)))
        if (!reading) problems.push(`decision ${decided.conflict}: no scorer reading from ${d.value} on ${entry.id}`)
        else {
          record.scorers = reading.list
          record.scorersDisputed = reading.list.some((g) => g.confidence < CONFIDENCE_FLOOR)
        }
      } else if (field !== 'opponent') {
        problems.push(`decision ${decided.conflict}: unknown field ${field}`)
      }
    }
    matches.push(record)
    matchById.set(record.matchId, record)
  }

  /* ---- moments */
  const hapoelOn = new Map<string, MatchRecord[]>()
  for (const match of matches) {
    if (match.sport !== 'football') continue
    const dates = match.claims.find((c) => c.field === 'playedOn')?.values.map((v) => v.value as string) ?? [match.playedOn.value]
    if (!match.clubs.includes(US)) continue
    for (const date of dates) if (date) hapoelOn.set(date, [...(hapoelOn.get(date) ?? []), match])
  }
  const datesOf = (match: MatchRecord): string[] =>
    (match.claims.find((c) => c.field === 'playedOn')?.values.map((v) => v.value as string) ?? [match.playedOn.value]).filter(
      (d): d is string => Boolean(d),
    )
  const shiftDay = (date: string, days: number) => {
    const d = new Date(`${date}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
  }

  const moments: MomentRecord[] = []
  const crossChecks: CrossCheck[] = []
  const unresolved: UnresolvedItem[] = []
  const goalsDoc = read('content/manual/goals.json')

  for (const goal of goalsDoc.records as Row[]) {
    const momentId = `goal:${goal.goalId}`
    const sourceId = cite(goal.sourceUrl, goal.sourceTitle)
    const confidence = confidenceOf(goal, goalsDoc)
    const opponentSlug = clubOf(goal.opponentHe)

    // the match: our match on that date; otherwise the adjacent day against the same club
    let match: MatchRecord | null = null
    let matchLink: MomentRecord['matchLink'] = null
    const onDay = hapoelOn.get(goal.playedOn) ?? []
    if (onDay.length === 1) {
      match = onDay[0] as MatchRecord
      matchLink = 'date'
    } else if (onDay.length === 0) {
      const near = [...(hapoelOn.get(shiftDay(goal.playedOn, -1)) ?? []), ...(hapoelOn.get(shiftDay(goal.playedOn, 1)) ?? [])].filter(
        (m) => sameClub(m.opponent, opponentSlug),
      )
      if (near.length === 1) {
        match = near[0] as MatchRecord
        matchLink = 'date±1'
      }
    }
    const matchUnresolved: MomentRecord['matchUnresolved'] = match ? null : onDay.length > 1 ? 'ambiguous' : 'not-in-archive'
    if (!match) unresolved.push({ kind: 'moment-match', momentId, reason: matchUnresolved as string })

    // the minute the record states
    const mm = String(goal.subtitleHe ?? '').match(/דקה (\d+)(?:\+(\d+))?/)
    const minute = mm ? Number(mm[1]) : null
    const stoppage = mm?.[2] ? Number(mm[2]) : null
    const total = minute === null ? null : minute + (stoppage ?? 0)

    // touches — actors resolved exactly, or said to be something else, or reported
    const season = match?.season ?? null
    const touches = (goal.sequence as Row[]).map((touch) => {
      const special = ACTOR_KINDS[touch.actorHe]
      const person = special ? null : personOf(touch.actorHe)
      let kind: ActorKind = special ? special.kind : 'player'
      let resolution: 'exact' | 'unresolved' | 'not-a-person' = special ? 'not-a-person' : person ? 'exact' : 'unresolved'
      if (person && person.kind !== 'player') {
        kind = 'opponent'
        resolution = 'exact'
      }
      if (!special && !person) {
        // A family name alone — one word, or the tail of somebody's full name (`דה רידר`).
        const tail = ` ${fold(touch.actorHe)}`
        const bearers = players.players.filter((p) => p.kind === 'player' && ` ${fold(p.displayName)}`.endsWith(tail))
        const surnameOnly = fold(touch.actorHe).split(' ').length === 1 || bearers.length > 0
        const candidates = bearers
          .filter((p) => season !== null && p.spells.some((s) => s.seasons.includes(season)))
          .map((p) => {
            const scored = match?.scorers.some((s) => s.playerId === p.id && (s.minute ?? 0) + (s.stoppage ?? 0) === total)
            return {
              playerId: p.id,
              evidence:
                `family name '${touch.actorHe}' · squads.json places ${p.displayName} in ${season}` +
                (scored ? ` · the archive's scorer row for this match names him at the same minute` : ''),
            }
          })
        unresolved.push({
          kind: 'actor',
          momentId,
          step: touch.step,
          nameHe: touch.actorHe,
          reason: surnameOnly ? 'surname-only (rule 64 §5 — a person decides, per occurrence)' : 'no person',
          ...(candidates.length ? { candidates } : {}),
        })
      }
      return {
        step: touch.step,
        actor: { kind, playerId: person?.id ?? null, nameHe: touch.actorHe, resolution },
        action: touch.action,
        zone: touch.zone,
        positionHe: touch.positionHe,
        noteHe: touch.noteHe ?? null,
      }
    })
    const last = touches[touches.length - 1]
    const scorerActor = last?.actor ?? null
    const scorer = scorerActor
      ? {
          playerId: scorerActor.playerId,
          nameHe: scorerActor.nameHe,
          resolution: scorerActor.playerId ? ('exact' as const) : ('unresolved' as const),
        }
      : null

    // what the rest of the archive says about the same goal
    // Per source, the one reading nearest to this goal — a man who scored twice in the
    // match has two rows, and the other goal is not a claim about this one.
    const minuteClaims: MomentRecord['minuteClaims'] = []
    if (match && scorer?.playerId && total !== null) {
      const readings = [
        ...match.scorers
          .filter((s) => s.playerId === scorer.playerId && s.minute !== null && !s.ownGoal)
          .map((s) => ({ minute: s.minute as number, stoppage: s.stoppage, sourceId: s.sourceId })),
        ...match.events
          .filter((e) => String(e.type).includes('goal') && e.playerId === scorer.playerId && e.minute !== null)
          .map((e) => ({ minute: e.minute as number, stoppage: e.minuteExtra, sourceId: e.sourceId })),
      ]
      const bySource = new Map<string, (typeof readings)[number]>()
      for (const reading of readings) {
        const held = bySource.get(reading.sourceId)
        const distance = (r: (typeof readings)[number]) => Math.abs(r.minute + (r.stoppage ?? 0) - total)
        if (!held || distance(reading) < distance(held)) bySource.set(reading.sourceId, reading)
      }
      minuteClaims.push(...[...bySource.values()].sort((a, b) => byCodePoint(a.sourceId, b.sourceId)))
    }

    // cross-checks against the match record
    const goalConflicts = conflictsByGoal.get(goal.goalId) ?? []
    const matchConflicts = match ? (conflictsByMatch.get(match.matchId) ?? []) : []
    const refFor = (rowsIn: Row[], fields: string[]) =>
      rowsIn.filter((row) => fields.includes(row.field)).map(conflictKey)[0] ?? null
    if (match) {
      const dates = datesOf(match)
      const dateOk = dates.includes(goal.playedOn)
      crossChecks.push({
        momentId,
        field: 'playedOn',
        record: goal.playedOn,
        archive: dates.join(' | '),
        status: dateOk ? 'agree' : 'disagree',
        conflictRef: dateOk ? null : refFor(matchConflicts, ['played_on', 'played_on_and_home_away']),
      })
      const oppOk = opponentSlug !== null ? sameClub(opponentSlug, match.opponent) : false
      crossChecks.push({
        momentId,
        field: 'opponent',
        record: goal.opponentHe,
        archive: match.opponent ? (clubName.get(match.opponent) ?? match.opponent) : '',
        status: oppOk ? 'agree' : 'disagree',
        conflictRef: oppOk ? null : refFor(matchConflicts, ['opponent_club']),
      })
      const sm = String(goal.scoreHe ?? '').match(/(\d+):(\d+)(?:\s+(ל\S+))?/)
      if (sm && match.result) {
        const a = Number(sm[1])
        const b = Number(sm[2])
        const forUs = sm[3] === 'להפועל'
        const recordResult = a === b ? { hapoel: a, opponent: b } : forUs ? { hapoel: Math.max(a, b), opponent: Math.min(a, b) } : { hapoel: Math.min(a, b), opponent: Math.max(a, b) }
        const scoreOk = recordResult.hapoel === match.result.hapoel && recordResult.opponent === match.result.opponent
        crossChecks.push({
          momentId,
          field: 'result',
          record: `${recordResult.hapoel}:${recordResult.opponent}`,
          archive: `${match.result.hapoel}:${match.result.opponent}`,
          status: scoreOk ? 'agree' : 'disagree',
          conflictRef: scoreOk ? null : refFor(matchConflicts, ['score']),
        })
      }
      if (total !== null && minuteClaims.length) {
        crossChecks.push({
          momentId,
          field: 'minute',
          record: `${minute}${stoppage ? `+${stoppage}` : ''}`,
          archive: minuteClaims.map((c) => `${c.minute}${c.stoppage ? `+${c.stoppage}` : ''}`).join(' | '),
          status: minuteClaims.every((c) => c.minute + (c.stoppage ?? 0) === total) ? 'agree' : 'disagree',
          conflictRef: minuteClaims.every((c) => c.minute + (c.stoppage ?? 0) === total) ? null : refFor(goalConflicts, ['minute']),
        })
      }
    }

    // what each surface may use (replay.md §3)
    const allConflicts = [...goalConflicts, ...matchConflicts]
    const why: string[] = []
    if (confidence < CONFIDENCE_FLOOR) why.push(`confidence ${confidence}`)
    // Replay is blocked only where THIS record and the archive disagree on which match the
    // move belongs to — the goal names another opponent. A naming conflict inside the
    // archive (בנפיקה / בנפיקה ליסבון, ליגת העל / הליגה הלאומית in 1986) does not move the
    // goal to another match; trivia, which would ask about the name, stays off for it.
    const identityBreaks = crossChecks.filter((c) => c.momentId === momentId && c.field === 'opponent' && c.status === 'disagree')
    const replayWhy = [
      ...why,
      ...identityBreaks.map((c) => `conflict ${c.conflictRef ?? 'unlisted'} (record: ${c.record}; archive: ${c.archive})`),
      ...(match ? [] : ['no match']),
    ]
    const triviaWhy = [
      ...why,
      ...allConflicts.map((row) => `conflict ${conflictKey(row)}`),
      ...(scorer?.playerId ? [] : ['scorer unresolved']),
      ...(match ? [] : ['no match']),
      ...(matchLink === 'date±1' ? ['match linked across a disputed date'] : []),
    ]

    const moment: MomentRecord = {
      momentId,
      kind: 'goal',
      category: 'goal',
      titleHe: goal.titleHe,
      matchId: match?.matchId ?? null,
      matchUnresolved,
      matchLink,
      playedOn: goal.playedOn,
      season,
      minute,
      stoppage,
      minuteClaims,
      scorer,
      move: { touches },
      text: { he: goal.narrativeHe ?? null, kind: 'paraphrase' },
      sourceId,
      sourceUrl: goal.sourceUrl ?? null,
      confidence,
      conflictRefs: [...new Set(allConflicts.map(conflictKey))].sort(byCodePoint),
      usable: { replay: replayWhy.length === 0, trivia: triviaWhy.length === 0, archive: confidence >= CONFIDENCE_FLOOR },
      usableWhy: { replay: replayWhy, trivia: [...new Set(triviaWhy)] },
    }
    moments.push(moment)
    if (match) match.momentIds.push(momentId)
  }

  const momentsDoc = read('content/manual/moments.json')
  for (const row of momentsDoc.records as Row[]) {
    const momentId = `moment:${row.slug}`
    const confidence = confidenceOf(row, momentsDoc)
    const id = row.matchNaturalKey ? resolveMatch(row.matchNaturalKey) : null
    const match = id ? (matchById.get(id) ?? null) : null
    if (row.matchNaturalKey && !match) unresolved.push({ kind: 'moment-match', momentId, reason: 'key not in the registry' })
    const matchConflicts = match ? (conflictsByMatch.get(match.matchId) ?? []) : []
    if (match && row.happenedOn) {
      const dates = datesOf(match)
      const ok = dates.includes(row.happenedOn)
      crossChecks.push({
        momentId,
        field: 'playedOn',
        record: row.happenedOn,
        archive: dates.join(' | '),
        status: ok ? 'agree' : 'disagree',
        conflictRef: ok ? null : (matchConflicts.filter((c) => c.field.startsWith('played_on')).map(conflictKey)[0] ?? null),
      })
    }
    const triviaWhy = [
      ...(confidence < CONFIDENCE_FLOOR ? [`confidence ${confidence}`] : []),
      ...matchConflicts.map((c) => `conflict ${conflictKey(c)}`),
    ]
    moments.push({
      momentId,
      kind: 'moment',
      category: row.category ?? null,
      titleHe: row.titleHe,
      matchId: match?.matchId ?? null,
      matchUnresolved: match ? null : 'no-match-named',
      matchLink: match ? 'key' : null,
      playedOn: row.happenedOn ?? null,
      season: row.seasonLabel ?? match?.season ?? null,
      minute: null,
      stoppage: null,
      minuteClaims: [],
      scorer: null,
      move: null,
      text: { he: row.bodyHe ?? null, kind: 'summary' },
      sourceId: cite(row.sourceUrl, row.sourceTitle),
      sourceUrl: row.sourceUrl ?? null,
      confidence,
      conflictRefs: matchConflicts.map(conflictKey).sort(byCodePoint),
      usable: { replay: false, trivia: triviaWhy.length === 0, archive: confidence >= CONFIDENCE_FLOOR },
      usableWhy: { replay: ['no move on record'], trivia: triviaWhy },
    })
    if (match) match.momentIds.push(momentId)
  }
  moments.sort((a, b) => byCodePoint(a.momentId, b.momentId))
  for (const match of matches) match.momentIds.sort(byCodePoint)

  /* ---- relations (the graph's edges that are not already a field) */
  const relations: MatchRelation[] = []
  for (const moment of moments) {
    if (moment.matchId) relations.push({ type: 'happened_in', from: moment.momentId, to: moment.matchId, sourceIds: [moment.sourceId], confidence: moment.confidence })
    if (moment.season) relations.push({ type: 'in_season', from: moment.momentId, to: `season:${moment.season}`, sourceIds: [moment.sourceId], confidence: moment.confidence })
    if (moment.scorer?.playerId) relations.push({ type: 'scored', from: moment.scorer.playerId, to: moment.momentId, sourceIds: [moment.sourceId], confidence: moment.confidence })
  }
  for (const match of matches) {
    const byPlayer = new Map<string, { count: number; sourceIds: Set<string>; confidence: number }>()
    for (const s of match.scorers) {
      if (!s.playerId || s.ownGoal) continue
      const found = byPlayer.get(s.playerId) ?? { count: 0, sourceIds: new Set<string>(), confidence: 0 }
      found.count += 1
      found.sourceIds.add(s.sourceId)
      found.confidence = Math.max(found.confidence, s.confidence)
      byPlayer.set(s.playerId, found)
    }
    for (const [playerId, v] of byPlayer) {
      relations.push({ type: 'scored', from: playerId, to: match.matchId, sourceIds: [...v.sourceIds].sort(byCodePoint), confidence: v.confidence, count: v.count })
    }
    for (const e of match.events) {
      if (String(e.type).includes('goal') && e.relatedPlayerId) {
        relations.push({ type: 'assisted', from: e.relatedPlayerId, to: match.matchId, sourceIds: [e.sourceId], confidence: 2 })
      }
    }
    for (const alias of match.aliases) {
      const m = alias.match(/^euro:(.+):\d{4}-\d{2}-\d{2}$/)
      if (m) relations.push({ type: 'leg_of', from: match.matchId, to: `tie:${m[1]}`, sourceIds: match.sourceIds, confidence: match.confidence })
    }
  }
  for (const lineup of lineupDoc.records as Row[]) {
    const id = resolveMatch(lineup.matchId)
    if (!id || confidenceOf(lineup, lineupDoc) < CONFIDENCE_FLOOR) continue
    const sourceId = cite(lineup.sourceUrl, lineup.sourceTitle)
    for (const name of Object.values(lineup.xi as Record<string, string>)) {
      const p = personOf(name)
      if (p) relations.push({ type: 'started_in', from: p.id, to: id, sourceIds: [sourceId], confidence: confidenceOf(lineup, lineupDoc) })
    }
    for (const raw of (lineup.benchHe ?? []) as string[]) {
      const p = personOf(raw.replace(/\s*\(.*$/, ''))
      if (p) relations.push({ type: 'came_on_in', from: p.id, to: id, sourceIds: [sourceId], confidence: confidenceOf(lineup, lineupDoc) })
    }
  }
  const seenRel = new Set<string>()
  const uniqueRelations = relations
    .filter((r) => {
      const key = `${r.type}|${r.from}|${r.to}`
      if (seenRel.has(key)) return false
      seenRel.add(key)
      return true
    })
    .sort((a, b) => byCodePoint(a.type, b.type) || byCodePoint(a.from, b.from) || byCodePoint(a.to, b.to))

  /* ---- the research queue: goals worth sourcing as moves, never coordinates */
  const researchQueue: ResearchItem[] = []
  const covered = new Set(
    moments.filter((m) => m.kind === 'goal' && m.matchId && m.scorer?.playerId).map((m) => `${m.matchId}|${m.scorer?.playerId}|${(m.minute ?? 0) + (m.stoppage ?? 0)}`),
  )
  const derbyRival = new Set(clubs.filter((c) => c.isDerbyRival && (!c.sport || c.sport === 'football')).map((c) => c.slug as string))
  for (const match of matches) {
    if (match.sport !== 'football' || match.season < '2000/01' || !match.clubs.includes(US)) continue
    const why: ResearchItem['why'][] = []
    if (EUROPE.has(match.competition)) why.push('europe')
    if (match.competition === 'גביע-המדינה' && match.stage === 'גמר') why.push('cup-final')
    if (match.opponent && derbyRival.has(match.opponent)) why.push('derby')
    if (why.length === 0) continue
    for (const s of match.scorers) {
      if (s.ownGoal || s.minute === null || s.confidence < CONFIDENCE_FLOOR) continue
      const key = `${match.matchId}|${s.playerId}|${s.minute + (s.stoppage ?? 0)}`
      if (s.playerId && covered.has(key)) continue
      researchQueue.push({
        matchId: match.matchId,
        playedOn: match.playedOn.value,
        season: match.season,
        why: why[0] as ResearchItem['why'],
        scorer: { playerId: s.playerId, nameHe: s.nameHe },
        minute: s.minute,
        stoppage: s.stoppage,
        status: 'needs-a-sourced-move',
      })
    }
  }
  researchQueue.sort((a, b) => byCodePoint(a.playedOn ?? '', b.playedOn ?? '') || (a.minute ?? 0) - (b.minute ?? 0))

  /* ---- what could not be joined */
  unresolved.push(...secondaryUnjoined)
  for (const d of plan.unresolvedDialects) unresolved.push({ kind: 'dialect', dialect: d.dialect, key: d.key, reason: d.reason })
  for (const pair of plan.suspectedDuplicates) unresolved.push({ kind: 'suspected-duplicate', a: pair.a, b: pair.b, reason: pair.why })
  for (const lineup of lineupDoc.records as Row[]) {
    if (!resolveMatch(lineup.matchId)) unresolved.push({ kind: 'lineup', key: lineup.matchId, reason: 'the record names a season, not a match' })
  }
  for (const [nameHe, count] of [...unresolvedScorerNames].sort((a, b) => b[1] - a[1] || byCodePoint(a[0], b[0]))) {
    unresolved.push({ kind: 'scorer-name', nameHe, count, reason: 'no person answers to this spelling (see match-scorers.json unknown)' })
  }
  for (const check of crossChecks) {
    if (check.status === 'disagree' && !check.conflictRef) problems.push(`unlisted disagreement: ${check.momentId} ${check.field} (${check.record} ≠ ${check.archive})`)
  }

  const inputs = [...MATCH_MASTER_INPUTS]
  const out: MatchMasterFile = {
    schemaVersion: 1,
    inputsSha: matchInputsSha(root, inputs),
    inputs,
    counts: {
      matches: matches.length,
      football: matches.filter((m) => m.sport === 'football').length,
      basketball: matches.filter((m) => m.sport === 'basketball').length,
      withClaims: matches.filter((m) => m.claims.length > 0).length,
      withConflicts: matches.filter((m) => m.conflictRefs.length > 0).length,
      withScorers: matches.filter((m) => m.scorers.length > 0).length,
      scorerEntries: matches.reduce((sum, m) => sum + m.scorers.length, 0),
      scorerEntriesResolved: matches.reduce((sum, m) => sum + m.scorers.filter((s) => s.playerId).length, 0),
      moments: moments.length,
      goals: moments.filter((m) => m.kind === 'goal').length,
      momentsWithMatch: moments.filter((m) => m.matchId).length,
      usableReplay: moments.filter((m) => m.usable.replay).length,
      usableTrivia: moments.filter((m) => m.usable.trivia).length,
      relations: uniqueRelations.length,
      researchQueue: researchQueue.length,
      unresolved: unresolved.length,
      crossChecks: crossChecks.length,
      crossCheckDisagreements: crossChecks.filter((c) => c.status === 'disagree').length,
    },
    sources: Object.fromEntries([...sources].sort((a, b) => byCodePoint(a[0], b[0]))),
    matches,
    moments,
    relations: uniqueRelations,
    crossChecks,
    researchQueue,
    unresolved,
  }
  return { out, problems }
}

/**
 * One element of every top-level list per line: readable diffs, a third of the bytes of
 * an indented file.
 */
export function serialiseMatchMaster(out: MatchMasterFile): string {
  const lines: string[] = ['{']
  const entries = Object.entries(out)
  entries.forEach(([key, value], index) => {
    const comma = index < entries.length - 1 ? ',' : ''
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${JSON.stringify(key)}:[]${comma}`)
        return
      }
      lines.push(`${JSON.stringify(key)}:[`)
      value.forEach((item, i) => lines.push(`${JSON.stringify(item)}${i < value.length - 1 ? ',' : ''}`))
      lines.push(`]${comma}`)
    } else {
      lines.push(`${JSON.stringify(key)}:${JSON.stringify(value)}${comma}`)
    }
  })
  lines.push('}')
  return `${lines.join('\n')}\n`
}

function main(): void {
  const { out, problems } = buildMatchMaster(process.cwd())
  if (problems.length > 0) {
    for (const problem of problems) console.error(`PROBLEM: ${problem}`)
    process.exitCode = 1
    return
  }
  const path = join(process.cwd(), OUT)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, serialiseMatchMaster(out), 'utf8')
  console.log(JSON.stringify(out.counts))
}

if (process.argv[1] && /build-match-master\.ts$/.test(process.argv[1])) main()
