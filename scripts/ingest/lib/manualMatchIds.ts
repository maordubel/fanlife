import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { fold } from '@/lib/game/roster-search'
import {
  idForNaturalKey,
  matchNaturalKey,
  type CanonicalMatchId,
  type MatchDialectKey,
  type MatchIdEntry,
  type MatchNaturalKey,
  type Sport,
} from '@/lib/canon/matchId'
import { mintMatchId } from './matchIds'
import { byCodePoint } from './playerIds'

/**
 * The first mint over the CURATED archive (21.9.2026, Maor's OK — "one-way, mint now").
 *
 * `canon-cli`'s corpus mode mints from `data/wiki-corpus`, which the repo does not ship;
 * the archive every gate reads is `content/manual/matches.json`. This plans the registry
 * from that file (and `basketball-matches.json`, sport-scoped — rule 6), then attaches
 * every OTHER key dialect a file already uses for the same match, so a reader holding any
 * of them reaches one id:
 *
 *   events · scorers · lineup · conflict · timeline · euro-leg   (see `MatchKeyDialect`)
 *
 * Pure over the files and the registry it is given; `mintedOn` is the only input that
 * is not a file, and it is written once per entry. Running it again over the registry it
 * produced changes nothing — `tests/match-ids.test.ts` proves it on every run.
 */

type MatchRow = {
  sport?: Sport
  seasonLabel: string
  competitionSlug: string
  stage: string | null
  playedOn: string | null
  homeClubSlug: string
  awayClubSlug: string
  homeScore: number | null
  awayScore: number | null
  confidence?: number
  sourceTitle?: string
  sourceUrl?: string | null
}

export type KeyedMatch = MatchRow & { sport: Sport; naturalKey: MatchNaturalKey; file: string; index: number }

/**
 * Owner decisions to treat two natural keys as ONE match (Maor, 21.9.2026).
 *
 * The Salzburg play-off: the second leg is the same natural key twice (24.8 and 25.8 —
 * one entry by construction, both dates kept as claims). The first leg is two keys,
 * because the two readings disagree on who was at home; the data shows one match — same
 * season, same competition, the same "משחק 1" of a two-legged tie, the same 3:2 to
 * Hapoel, dates a day apart — so it is one id with the other key as an alias. The row
 * that is listed FIRST in `matches.json` supplies `naturalKey`; that is file order, not a
 * verdict: both claims live in `fact-conflicts.json` and in the match master's `claims`.
 */
export const REVIEWED_MATCH_MERGES: { keys: [string, string]; note: string }[] = [
  {
    keys: [
      'football|2010/11|ליגת-האלופות|הפועל-תל-אביב|זלצבורג|פלייאוף משחק 1',
      'football|2010/11|ליגת-האלופות|זלצבורג|הפועל-תל-אביב|פלייאוף משחק 1',
    ],
    note:
      'Maor, 21.9.2026: one match. Two readings of ויקיפועל (research doc 1.9.2026: 17.8 at home 3:2; ' +
      'Games table 17.9.2026: 18.8 away 2:3) agree on the result and disagree on the day and the home ' +
      'side — kept as claims, see fact-conflicts.json.',
  },
  {
    keys: [
      'football|2010/11|ליגת-האלופות|הפועל-תל-אביב|זלצבורג|פלייאוף משחק 2',
      'football|2010/11|ליגת-האלופות|הפועל-תל-אביב|זלצבורג|פלייאוף משחק 2',
    ],
    note:
      'Maor, 21.9.2026: one match. matches.json holds this key twice (25.8.2010 with Bloomfield and ' +
      'the research doc; 24.8.2010 from the Games table) — one id, both dates kept as claims.',
  },
]

/**
 * `lineups.json` slugs → the match they record. Curated because two of the records carry
 * no date; every entry is cross-checked against the record's own subtitle by the match
 * master's test. `2000-01-documented-xi` names a season, not a match, and has no entry.
 */
export const LINEUP_MATCH_KEYS: Record<string, string> = {
  '2001-02-uefa-r2-chelsea': 'football|2001/02|גביע-אופא|הפועל-תל-אביב|צלסי|סיבוב 2 משחק 1',
  '2001-02-uefa-r2-chelsea-away': 'football|2001/02|גביע-אופא|צלסי|הפועל-תל-אביב|סיבוב 2 משחק 2',
  '2001-02-uefa-qf-milan': 'football|2001/02|גביע-אופא|הפועל-תל-אביב|מילאן|רבע גמר משחק 1',
  '2010-11-ucl-po-salzburg-1': 'football|2010/11|ליגת-האלופות|הפועל-תל-אביב|זלצבורג|פלייאוף משחק 1',
  '2010-11-ucl-po-salzburg-2': 'football|2010/11|ליגת-האלופות|הפועל-תל-אביב|זלצבורג|פלייאוף משחק 2',
  '1985-86-league-final-haifa': 'football|1985/86|ליגת-העל|הפועל-תל-אביב|מכבי-חיפה|מחזור אחרון',
}

const read = (root: string, file: string): any => JSON.parse(readFileSync(join(root, file), 'utf8'))

/** Our club's slug in both sports' match files. */
export const US = 'הפועל-תל-אביב'

/** Every match row of both sports, keyed, in file order. */
export function keyedMatches(root: string): KeyedMatch[] {
  const out: KeyedMatch[] = []
  const files: [string, Sport][] = [
    ['content/manual/matches.json', 'football'],
    ['content/manual/basketball-matches.json', 'basketball'],
    // A second reading of the Asian rows (RSSSF · Wildstat · Wikipedia, 24.9.2026). Same
    // natural keys as matches.json, so it mints nothing: it adds sources, and where it
    // disagrees (the 1970 semi-final was a walkover) the match master carries a claim.
    ['content/manual/asian-competition-matches.json', 'football'],
    // The ויקיפועל season schedules (delta 89, 25.9.2026): the 1954/55 and 1966–68 rows the
    // Games ingest could not label. New natural keys — `canon:ids -- --write-ids` mints them.
    ['content/manual/matches-vikipoel-2026-09-25.json', 'football'],
  ]
  for (const [file, sport] of files) {
    const doc = read(root, file) as { confidence: number; records: MatchRow[] }
    doc.records.forEach((row, index) => {
      const rowSport = row.sport ?? sport
      if (rowSport !== sport) return // rule 6 — a row in the wrong sport file enters neither
      out.push({
        ...row,
        confidence: typeof row.confidence === 'number' ? row.confidence : doc.confidence,
        sport,
        file,
        index,
        naturalKey: matchNaturalKey({
          sport,
          seasonLabel: row.seasonLabel,
          competitionSlug: row.competitionSlug,
          homeClubSlug: row.homeClubSlug,
          awayClubSlug: row.awayClubSlug,
          stage: row.stage,
        }),
      })
    })
  }
  return out
}

export type DialectReport = {
  dialect: MatchDialectKey['dialect']
  key: string
  reason: string
}

export type MatchPlan = {
  records: MatchIdEntry[]
  minted: number
  dialectsAdded: number
  unresolvedDialects: DialectReport[]
  /** pairs of rows that look like one match but are not a reviewed merge — reported only */
  suspectedDuplicates: { a: string; b: string; why: string }[]
}

/** Club display names (and aliases) → slug, football only. Exact after `fold`. */
function clubResolver(root: string): (name: string) => string | null {
  const clubs = read(root, 'content/manual/clubs.json').records as {
    slug: string
    nameHe: string
    sport?: string
    aliases?: string[]
  }[]
  const index = new Map<string, Set<string>>()
  for (const club of clubs) {
    if (club.sport && club.sport !== 'football') continue
    for (const name of [club.slug, club.nameHe, ...(club.aliases ?? [])]) {
      const key = fold(name)
      const set = index.get(key) ?? new Set<string>()
      set.add(club.slug)
      index.set(key, set)
    }
  }
  return (name) => {
    const set = index.get(fold(name))
    return set && set.size === 1 ? ([...set][0] as string) : null
  }
}

/**
 * Plan the registry. Returns a NEW list — the input is never mutated — so a dry run and
 * the idempotency test can both call it freely.
 */
export function planMatchRegistry(
  root: string,
  registry: readonly MatchIdEntry[],
  now = new Date().toISOString().slice(0, 10),
): MatchPlan {
  const records: MatchIdEntry[] = registry.map((entry) => ({
    ...entry,
    aliases: [...entry.aliases],
    ...(entry.dialects ? { dialects: entry.dialects.map((d) => ({ ...d })) } : {}),
  }))
  const before = records.length
  const matches = keyedMatches(root)

  // 1. ids — reviewed merges first, so the secondary key becomes an alias, not a mint.
  for (const merge of REVIEWED_MATCH_MERGES) {
    const [primary, secondary] = merge.keys as [MatchNaturalKey, MatchNaturalKey]
    const row = matches.find((match) => match.naturalKey === primary)
    if (!row) continue
    const { id } = mintMatchId(records, primary, row.sport, now)
    const entry = records.find((candidate) => candidate.id === id) as MatchIdEntry
    if (secondary !== primary && idForNaturalKey(records, secondary) === null) entry.aliases.push(secondary)
    if (!entry.mergeNote) entry.mergeNote = merge.note
  }
  for (const match of matches) mintMatchId(records, match.naturalKey, match.sport, now)
  const minted = records.length - before

  // 2. dialects
  const byId = new Map(records.map((entry) => [entry.id, entry]))
  let dialectsAdded = 0
  const unresolvedDialects: DialectReport[] = []
  const add = (id: CanonicalMatchId | null, dialect: MatchDialectKey['dialect'], key: string, why: string) => {
    if (!key) return
    if (id === null) {
      unresolvedDialects.push({ dialect, key, reason: why })
      return
    }
    const entry = byId.get(id) as MatchIdEntry
    const list = (entry.dialects ??= [])
    if (list.some((row) => row.dialect === dialect && row.key === key)) return
    list.push({ dialect, key })
    dialectsAdded += 1
  }
  const idOf = (key: string) => idForNaturalKey(records, key as MatchNaturalKey)
  const byDate = new Map<string, KeyedMatch[]>()
  for (const match of matches) {
    if (match.sport !== 'football' || !match.playedOn) continue
    const list = byDate.get(match.playedOn) ?? []
    list.push(match)
    byDate.set(match.playedOn, list)
  }

  // events / moments — the 5-part key without the sport
  const eventKeys = new Set<string>()
  for (const row of read(root, 'content/manual/match-events.json').records as { matchNaturalKey: string }[]) {
    eventKeys.add(row.matchNaturalKey)
  }
  for (const row of read(root, 'content/manual/moments.json').records as { matchNaturalKey?: string | null }[]) {
    if (row.matchNaturalKey) eventKeys.add(row.matchNaturalKey)
  }
  const pending: [CanonicalMatchId | null, MatchDialectKey['dialect'], string, string][] = []
  for (const key of eventKeys) pending.push([idOf(`football|${key}`), 'events', key, 'no football match with this key'])

  // scorers — display-name keys, joined on date + our club, score and clubs to break a tie
  const club = clubResolver(root)
  const ours = (date: string) =>
    (byDate.get(date) ?? []).filter((match) => match.homeClubSlug === US || match.awayClubSlug === US)
  for (const row of read(root, 'content/manual/match-scorers.json').records as {
    matchKey: string
    playedOn: string | null
    homeScore: number | null
    awayScore: number | null
    homeClubHe: string
    awayClubHe: string
  }[]) {
    if (!row.matchKey) continue
    if (!row.playedOn) {
      pending.push([null, 'scorers', row.matchKey, 'the scorer row carries no date'])
      continue
    }
    // Hapoel plays once a day: the date and the club are the join. The score is the
    // cross-check, and a disagreement is REPORTED (the match master shows it), not a
    // reason to leave the key orphaned.
    let found = ours(row.playedOn)
    if (found.length > 1) {
      found = found.filter((match) => match.homeScore === row.homeScore && match.awayScore === row.awayScore)
    }
    if (found.length > 1) {
      const home = club(row.homeClubHe)
      const away = club(row.awayClubHe)
      found = found.filter((match) => match.homeClubSlug === home || match.awayClubSlug === away)
    }
    const ids = [...new Set(found.map((match) => idOf(match.naturalKey)))]
    pending.push([
      ids.length === 1 ? (ids[0] as CanonicalMatchId) : null,
      'scorers',
      row.matchKey,
      ids.length === 0 ? 'no Hapoel match on that date' : 'more than one Hapoel match on that date',
    ])
  }

  // lineups — curated
  for (const [slug, key] of Object.entries(LINEUP_MATCH_KEYS)) pending.push([idOf(key), 'lineup', slug, 'lineup key not in matches.json'])

  // fact-conflicts — the entityKey dialects the archive grew
  for (const row of read(root, 'content/manual/fact-conflicts.json').records as {
    entityTable: string
    entityKey: string | null
  }[]) {
    if (row.entityTable !== 'match' || !row.entityKey) continue
    const [id, why] = resolveConflictKey(row.entityKey, matches, idOf)
    pending.push([id, 'conflict', row.entityKey, why])
  }

  // gate 13's internal keys (timeline cards) — the matches it deals: confidence ≥ 2, dated
  for (const match of matches) {
    if (match.sport !== 'football' || !match.playedOn || (match.confidence ?? 0) < 2) continue
    pending.push([
      idOf(match.naturalKey),
      'timeline',
      `match:${match.seasonLabel}:${match.homeClubSlug}:${match.awayClubSlug}:${match.playedOn}`,
      '',
    ])
  }

  // European ties — one key per leg, joined on date + score
  for (const tie of read(root, 'content/manual/euro-ties.json').records as {
    slug: string
    legs: { playedOn: string | null; home: boolean | null; forHapoel: number | null; against: number | null }[]
  }[]) {
    for (const leg of tie.legs) {
      if (!leg.playedOn) continue
      const key = `euro:${tie.slug}:${leg.playedOn}`
      const ids = [...new Set(ours(leg.playedOn).map((match) => idOf(match.naturalKey)))]
      pending.push([
        ids.length === 1 ? (ids[0] as CanonicalMatchId) : null,
        'euro-leg',
        key,
        ids.length === 0 ? 'no Hapoel match on that date' : 'more than one Hapoel match on that date',
      ])
    }
  }

  // Deterministic order for the first write; later runs only append.
  pending.sort((a, b) => byCodePoint(a[1], b[1]) || byCodePoint(a[2], b[2]))
  for (const [id, dialect, key, why] of pending) add(id, dialect, key, why)

  // 3. suspected duplicates — same tie, same stage, clubs swapped, or the same pair on
  // consecutive days. Never merged here; printed so an owner can decide (rule 35).
  const suspectedDuplicates: MatchPlan['suspectedDuplicates'] = []
  const seen = new Map<string, KeyedMatch>()
  for (const match of matches) {
    if (match.sport !== 'football') continue
    const pair = [match.homeClubSlug, match.awayClubSlug].sort(byCodePoint).join('~')
    const tieKey = `${match.seasonLabel}|${match.competitionSlug}|${match.stage ?? ''}|${pair}`
    const other = seen.get(tieKey)
    if (other && other.naturalKey !== match.naturalKey && idOf(other.naturalKey) !== idOf(match.naturalKey)) {
      suspectedDuplicates.push({ a: other.naturalKey, b: match.naturalKey, why: 'same season, competition, stage and clubs; home side differs' })
    }
    if (!other) seen.set(tieKey, match)
  }

  return { records, minted, dialectsAdded, unresolvedDialects, suspectedDuplicates }
}

/**
 * `fact-conflicts.json` wrote match keys four ways over time. Each is resolved to an id
 * only where exactly one match fits; anything else is reported, never guessed.
 */
function resolveConflictKey(
  entityKey: string,
  matches: readonly KeyedMatch[],
  idOf: (key: string) => CanonicalMatchId | null,
): [CanonicalMatchId | null, string] {
  const one = (all: KeyedMatch[], why: string): [CanonicalMatchId | null, string] => {
    // Every conflict in the file is about one of Hapoel's matches, so where a date holds
    // two rows (12.5.1990 also carries the day's other game) ours is the one meant.
    const found = all.length > 1 ? all.filter((row) => row.homeClubSlug === US || row.awayClubSlug === US) : all
    const ids = [...new Set(found.map((match) => idOf(match.naturalKey)))]
    return ids.length === 1 ? [ids[0] as CanonicalMatchId, ''] : [null, ids.length ? `ambiguous: ${why}` : `no match: ${why}`]
  }
  let m: RegExpMatchArray | null
  // "1995-08-08 הפועל-תל-אביב — זימברו-קישינב"
  if ((m = entityKey.match(/^(\d{4}-\d{2}-\d{2}) (.+?) — (.+)$/))) {
    const [, date, home, away] = m as unknown as [string, string, string, string]
    const exact = matches.filter((row) => row.playedOn === date && row.homeClubSlug === home && row.awayClubSlug === away)
    if (exact.length) return one(exact, 'date and clubs')
    return one(
      matches.filter(
        (row) => row.playedOn === date && [row.homeClubSlug, row.awayClubSlug].sort(byCodePoint).join('~') === [home, away].sort(byCodePoint).join('~'),
      ),
      'date and clubs (either side at home)',
    )
  }
  // "2010/11 ליגת-האלופות · פלייאוף משחק 1 · הפועל-תל-אביב — זלצבורג"
  if ((m = entityKey.match(/^(\d{4}\/\d{2}) (.+?) · (.+?) · (.+?) — (.+)$/))) {
    const [, season, competition, stage, home, away] = m as unknown as [string, string, string, string, string, string]
    const key = `football|${season}|${competition}|${home}|${away}|${stage}`
    const id = idOf(key)
    return id ? [id, ''] : [null, 'no match with that season, competition, stage and clubs']
  }
  // "1989/90|ליגה-ארצית|1990-05-12"
  if ((m = entityKey.match(/^(\d{4}\/\d{2})\|(.+?)\|(\d{4}-\d{2}-\d{2})$/))) {
    const [, season, competition, date] = m as unknown as [string, string, string, string]
    return one(
      matches.filter((row) => row.seasonLabel === season && row.competitionSlug === competition && row.playedOn === date),
      'season, competition and date',
    )
  }
  return [null, 'key names no date or stage (free text)']
}
