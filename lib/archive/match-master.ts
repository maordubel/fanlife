import 'server-only'

import masterJson from '@/content/generated/match-master.json'
import type {
  MatchMasterFile,
  MatchRecord,
  MatchRelation,
  MomentRecord,
  ResearchItem,
  UnresolvedItem,
} from '@/lib/archive/match-master-types'

/**
 * The Match / Moment Master reader (21.9.2026) — server-only; hand a screen a projection.
 *
 * Every match under its minted `m_…` id, every goal and moment under `goal:<goalId>` /
 * `moment:<slug>`, every key a file has ever used for a match resolving to the same id.
 * Built by `npm run matches:master` (`scripts/archive/build-match-master.ts`) from the
 * registry `npm run canon:ids` writes — this module derives no id, it only looks them up.
 *
 * The contract for a surface: read `usable.replay` / `usable.trivia` / `usable.archive`
 * and nothing else to decide whether a moment may be dealt. An open conflict on a field a
 * surface uses turns that surface off, and `usableWhy` says which row of
 * `fact-conflicts.json` did it (rule 60 §3: kept, not decided).
 */

export type {
  MatchMasterFile,
  MatchRecord,
  MatchRelation,
  MomentRecord,
  ResearchItem,
  UnresolvedItem,
} from '@/lib/archive/match-master-types'

export const matchMaster = masterJson as unknown as MatchMasterFile

const matchIndex = new Map<string, MatchRecord>()
const keyIndex = new Map<string, string>()
for (const match of matchMaster.matches) {
  matchIndex.set(match.matchId, match)
  keyIndex.set(match.matchId, match.matchId)
  for (const alias of match.aliases) if (!keyIndex.has(alias)) keyIndex.set(alias, match.matchId)
}
const momentIndex = new Map<string, MomentRecord>(matchMaster.moments.map((m) => [m.momentId, m]))
const relationsFrom = new Map<string, MatchRelation[]>()
const relationsTo = new Map<string, MatchRelation[]>()
for (const relation of matchMaster.relations) {
  relationsFrom.set(relation.from, [...(relationsFrom.get(relation.from) ?? []), relation])
  relationsTo.set(relation.to, [...(relationsTo.get(relation.to) ?? []), relation])
}

/* ------------------------------------------------------------------ matches */

export function allMatches(): readonly MatchRecord[] {
  return matchMaster.matches
}

export function matchById(matchId: string | null | undefined): MatchRecord | null {
  return matchId ? (matchIndex.get(matchId) ?? null) : null
}

/**
 * Any key a file uses for a match → its id: the id itself, a natural key (current or
 * superseded), `match-events`' key without the sport, a `match-scorers` display key, a
 * `lineups.json` slug, a `fact-conflicts` entityKey, gate 13's `match:…` / `euro:…`.
 */
export function resolveMatchId(anyKey: string | null | undefined): string | null {
  return anyKey ? (keyIndex.get(anyKey) ?? null) : null
}

export function resolveMatch(anyKey: string | null | undefined): MatchRecord | null {
  return matchById(resolveMatchId(anyKey))
}

/** Is this field of the match disputed — a claim or an open conflict? (`playedOn`, `home`, `result`, …) */
export function isDisputed(match: MatchRecord, field: string): boolean {
  if (match.claims.some((claim) => claim.field === field)) return true
  const conflictField: Record<string, string[]> = {
    playedOn: ['played_on', 'played_on_and_home_away'],
    home: ['home_away', 'played_on_and_home_away'],
    result: ['score'],
    opponent: ['opponent_club'],
    competition: ['competition'],
    scorers: ['scorers'],
  }
  const fields = conflictField[field] ?? [field]
  return match.conflictRefs.some((ref) => fields.includes(ref.split('|').at(-1) as string))
}

/* ------------------------------------------------------------------ moments */

export function allMoments(): readonly MomentRecord[] {
  return matchMaster.moments
}

/** `goal:<goalId>` or `moment:<slug>` */
export function momentById(momentId: string | null | undefined): MomentRecord | null {
  return momentId ? (momentIndex.get(momentId) ?? null) : null
}

/** The moment for a `goals.json` goalId — the id trivia and Revenge already persist. */
export function momentForGoal(goalId: string): MomentRecord | null {
  return momentById(`goal:${goalId}`)
}

export function momentsOfMatch(matchId: string): MomentRecord[] {
  return (matchById(matchId)?.momentIds ?? []).map((id) => momentIndex.get(id)).filter((m): m is MomentRecord => Boolean(m))
}

export type Surface = 'replay' | 'trivia' | 'archive'

/** The moments a surface may deal. The ONLY gate on conflicted material a surface should need. */
export function usableMoments(surface: Surface): MomentRecord[] {
  return matchMaster.moments.filter((moment) => moment.usable[surface])
}

export function isUsable(momentId: string, surface: Surface): boolean {
  return momentById(momentId)?.usable[surface] ?? false
}

/* ------------------------------------------------------------------ graph */

/** Every relation that starts or ends at an id (`p_…`, `m_…`, `goal:…`, `moment:…`, `season:…`, `tie:…`). */
export function relationsOf(id: string): MatchRelation[] {
  return [...(relationsFrom.get(id) ?? []), ...(relationsTo.get(id) ?? [])]
}

/** A player's documented matches — scored in, started, came on — by `p_…` id. */
export function matchesOfPlayer(playerId: string): { matchId: string; type: MatchRelation['type']; count?: number }[] {
  return (relationsFrom.get(playerId) ?? [])
    .filter((relation) => relation.to.startsWith('m_'))
    .map((relation) => ({ matchId: relation.to, type: relation.type, ...(relation.count ? { count: relation.count } : {}) }))
}

export function sourceOf(sourceId: string): { title: string; url: string | null } | null {
  return matchMaster.sources[sourceId] ?? null
}

/* ------------------------------------------------------------------ the work left */

/** Goals since 2000 in derbies, cup finals and European nights with a minute and a match — to be sourced as moves. */
export function researchQueue(): readonly ResearchItem[] {
  return matchMaster.researchQueue
}

export function unresolvedItems(): readonly UnresolvedItem[] {
  return matchMaster.unresolved
}
