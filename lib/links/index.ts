import 'server-only'

import { entity } from '@/lib/archive/graph'
import { matchById, momentForGoal } from '@/lib/archive/match-master'
import { playerById } from '@/lib/archive/player-master'
import { awayDaysMaster } from '@/lib/away-days/data'
import { BANK } from '@/lib/game/blind-cow/bank'
import { lineupYears } from '@/lib/game/lineup'
import { GATES, isOpen } from '@/lib/gates'
import type { OpenClue } from '@/lib/game/blind-cow/types'
import { goalYears } from '@/lib/game/goal'

import { KIT_COLLECTION_HREF, type CrossLink, type CrossLinkKind } from './types'

/**
 * קישורים בין שערים — where else does this player, this match, live? (delta 89)
 *
 * Maor, 25.9.2026: "ממשחק שנפתר בפרה עיוורת אפשר לקשר לתחנה שלו במפה, ומהתחנה במפה לכרטיס
 * המשחק בארכיון. כך אותו שחקן ואותו משחק מופיעים בכמה שערים."
 *
 * One resolver, four gates. Every answer is CHECKED against the gate that would receive it
 * — an archive card only for an id the Entity Graph resolves, an AWAY DAYS stop only for a
 * match that is a published (VERIFIED) visit, a gate-8 replay only for a goal the gate
 * actually deals — so a chip can never open on "not found". The screens get `CrossLink[]`
 * and draw chips; none of them builds a URL.
 *
 * Deep links the receiving gates read:
 *   /archive?at=<id>          gate 12 opens that entity's drawer (m_…, p_…, goal:…)
 *   /away-days?visit=<m_…>    AWAY DAYS opens that stop in journey mode
 *   /away-days?venue=<id>     AWAY DAYS opens the ground's sheet in explore mode
 *   /goal?g=<goalId>          gate 8 deals that goal first
 */

const MAX = 5

const visitByMatch = new Map(awayDaysMaster.visits.map((visit) => [visit.matchId, visit]))
const venueIds = new Set(awayDaysMaster.venues.map((venue) => venue.id))

let goalIndex: { byMatch: Map<string, string[]>; byScorer: Map<string, string[]>; matchOf: Map<string, string> } | null = null
function goals() {
  if (goalIndex) return goalIndex
  const byMatch = new Map<string, string[]>()
  const byScorer = new Map<string, string[]>()
  const matchOf = new Map<string, string>()
  for (const { id } of goalYears()) {
    const moment = momentForGoal(id)
    if (!moment) continue
    if (moment.matchId) {
      byMatch.set(moment.matchId, [...(byMatch.get(moment.matchId) ?? []), id])
      matchOf.set(id, moment.matchId)
    }
    const scorer = moment.scorer?.playerId
    if (scorer) byScorer.set(scorer, [...(byScorer.get(scorer) ?? []), id])
  }
  goalIndex = { byMatch, byScorer, matchOf }
  return goalIndex
}

/* ------------------------------------------------------------------ single doors */

/** `/archive?at=<id>` — only when the Entity Graph resolves the id (legacy ids included). */
export function archiveHref(anyId: string | null | undefined): string | null {
  const e = entity(anyId)
  return e ? `/archive?at=${encodeURIComponent(e.id)}` : null
}

/** `/away-days?visit=<matchId>` — only for a match that is a published stop of the journey. */
export function awayHref(matchId: string | null | undefined): string | null {
  return matchId && visitByMatch.has(matchId) ? `/away-days?visit=${encodeURIComponent(matchId)}` : null
}

/** `/away-days?venue=<id>` — only for a ground of the registry that the journey ships. */
export function venueHref(venueId: string | null | undefined): string | null {
  return venueId && venueIds.has(venueId) ? `/away-days?venue=${encodeURIComponent(venueId)}` : null
}

/** The playable gate-8 goals of a match (`/goal?g=`), oldest id order. */
export function goalIdsOfMatch(matchId: string | null | undefined): string[] {
  return matchId ? [...(goals().byMatch.get(matchId) ?? [])].sort() : []
}

/** The playable gate-8 goals a man scored. */
export function goalIdsOfScorer(playerId: string | null | undefined): string[] {
  return playerId ? [...(goals().byScorer.get(playerId) ?? [])].sort() : []
}

/** The match a gate-8 goal was scored in, when the master links it. */
export function matchOfGoal(goalId: string | null | undefined): string | null {
  return goalId ? (goals().matchOf.get(goalId) ?? null) : null
}

export function goalHref(goalId: string): string {
  return `/goal?g=${encodeURIComponent(goalId)}`
}

/* ------------------------------------------------------------------ gate doors (28.9.2026) */

/**
 * A whole gate's front door, by its number on the wall — only when the gate is open
 * (`href` non-null in `lib/gates.ts`). The Universal Exit's "עוד משהו טבעי" reaches other
 * gates through this and nothing else, so a closed plate can never be recommended.
 */
export function gateHref(gateNumber: number): string | null {
  const gate = GATES.find((g) => g.number === gateNumber)
  return gate && isOpen(gate) ? (gate.href.split('?')[0] ?? null) : null
}

/** Gate 5's "full collection": the Archive's shelf of every canonical kit. */
export function kitCollectionHref(): string {
  return KIT_COLLECTION_HREF
}

/** AWAY DAYS' front door — the journey itself, not a stop on it. */
export function awayDaysHref(): string {
  return '/away-days'
}

/** A goal gate 8 actually deals — the id checked against the deck, or null. */
export function playableGoalHref(goalId: string | null | undefined): string | null {
  return goalId && goalYears().some((g) => g.id === goalId) ? goalHref(goalId) : null
}

let lineupMatches: Set<string> | null = null
/**
 * Gate 3's door for a match — only when that match is one of the verified XIs the gate
 * deals. The gate reads `?seed=` only, so the door is the gate itself; the check is what
 * keeps "נסה את ההרכב" from being offered for a match nobody can assemble.
 */
export function lineupHref(matchId: string | null | undefined): string | null {
  if (!matchId) return null
  lineupMatches ??= new Set(lineupYears().map((row) => row.id))
  return lineupMatches.has(matchId) ? gateHref(3) : null
}

/**
 * LIFE's door — only for a chapter the caller says is unlocked (§23.2: never reveal future
 * LIFE content, never spoil). It opens the LIFE landing, never the middle of a chapter:
 * the landing is the one return point that is always safe.
 */
export function lifeHref(chapterId: string | null | undefined, unlocked: (chapterId: string) => boolean): string | null {
  if (!chapterId) return null
  try {
    return unlocked(chapterId) ? '/life' : null
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ subjects */

/** "צ'לסי 2001" — the opponent and the year, as the archive's graph names the match. */
export function matchSubject(matchId: string): string | null {
  const e = entity(matchId)
  if (!e || e.type !== 'match') return null
  const attrs = (e.attrs ?? {}) as { homeHe?: string; awayHe?: string; hapoelSide?: string }
  const opponent = attrs.hapoelSide === 'away' ? attrs.homeHe : attrs.awayHe
  const year = e.year ? ` ${e.year}` : ''
  return opponent ? `${opponent}${year}` : e.titleHe
}

export function playerSubject(playerId: string): string | null {
  return playerById(playerId)?.displayName ?? entity(playerId)?.titleHe ?? null
}

/* ------------------------------------------------------------------ sets */

function push(out: CrossLink[], link: CrossLink | null) {
  if (!link || out.some((have) => have.href === link.href)) return
  out.push(link)
}

function door(kind: CrossLinkKind, href: string | null, subject: string | null, target: string): CrossLink | null {
  return href ? { kind, href, subject, target } : null
}

/**
 * Every other door of a match. `omit` is the gate asking (AWAY DAYS does not link to
 * itself). With `subject`, each chip names the match — for a list that mixes matches.
 */
export function linksForMatch(
  matchId: string,
  options: { omit?: readonly CrossLinkKind[]; subject?: boolean; scorers?: boolean } = {},
): CrossLink[] {
  const omit = new Set(options.omit ?? [])
  const subject = options.subject ? matchSubject(matchId) : null
  const out: CrossLink[] = []
  if (!omit.has('archive')) push(out, door('archive', archiveHref(matchId), subject, matchId))
  if (!omit.has('away')) push(out, door('away', awayHref(matchId), subject, matchId))
  if (!omit.has('goal')) {
    const [first] = goalIdsOfMatch(matchId)
    if (first) push(out, door('goal', goalHref(first), subject, first))
  }
  if (options.scorers) {
    const visit = visitByMatch.get(matchId)
    // the same guard AWAY DAYS prints scorers under: every Hapoel goal a resolved entry
    if (visit?.scorers?.length) {
      for (const id of scorerIds(matchId)) push(out, door('archive', archiveHref(id), playerSubject(id), id))
    }
  }
  return out.slice(0, MAX)
}

/** Every other door of a man: his archive card, and the gate-8 goals he scored. */
export function linksForPlayer(playerId: string, options: { omit?: readonly CrossLinkKind[] } = {}): CrossLink[] {
  const omit = new Set(options.omit ?? [])
  const out: CrossLink[] = []
  if (!omit.has('archive')) push(out, door('archive', archiveHref(playerId), playerSubject(playerId), playerId))
  if (!omit.has('goal')) {
    for (const goalId of goalIdsOfScorer(playerId).slice(0, 2)) {
      const match = matchOfGoal(goalId)
      push(out, door('goal', goalHref(goalId), match ? matchSubject(match) : null, goalId))
    }
  }
  return out.slice(0, MAX)
}

/** The resolved scorers of a match, by Player Master id, in the order the master lists them. */
function scorerIds(matchId: string): string[] {
  const match = matchById(matchId)
  if (!match) return []
  const ids: string[] = []
  for (const row of match.scorers) {
    if (row.ownGoal || !row.playerId || row.confidence < 2 || ids.includes(row.playerId)) continue
    ids.push(row.playerId)
  }
  return ids
}

/* ------------------------------------------------------------------ gate 10 */

const CLUE_MATCH = /^match-master:(m_[0-9a-f]{12})#/
const MATCH_CLUES = new Set(['match', 'goal', 'moment', 'lineup'])

/**
 * The one match a clue speaks of — only when every source line of the clue names the SAME
 * match. "כבש שער במפעל אירופי" rests on six matches and points at none of them.
 */
export function matchOfClue(playerId: string, clue: Pick<OpenClue, 'valueHe' | 'type'>): string | null {
  if (!MATCH_CLUES.has(clue.type)) return null
  for (const q of BANK.questions) {
    if (q.targetPlayerId !== playerId) continue
    for (const id of q.clueIds) {
      const c = BANK.clues[id]
      if (!c || c.valueHe !== clue.valueHe) continue
      const matches = new Set(c.sourceRefs.map((ref) => CLUE_MATCH.exec(ref)?.[1]).filter((m): m is string => Boolean(m)))
      if (matches.size === 1) return [...matches][0] as string
      return null
    }
  }
  return null
}

/**
 * פרה עיוורת, after the whistle: his archive card, then the matches of his match/goal
 * clues — the AWAY DAYS stop where the match was abroad, the archive card otherwise.
 * Only the clues he OPENED (or all of them after a give-up, which shows the whole file).
 */
export function blindCowLinks(playerId: string, clues: readonly OpenClue[]): CrossLink[] {
  const out: CrossLink[] = []
  push(out, door('archive', archiveHref(playerId), playerSubject(playerId), playerId))
  for (const clue of clues) {
    const match = matchOfClue(playerId, clue)
    if (!match) continue
    const away = awayHref(match)
    push(out, away ? door('away', away, matchSubject(match), match) : door('archive', archiveHref(match), matchSubject(match), match))
  }
  for (const goalId of goalIdsOfScorer(playerId).slice(0, 1)) {
    const match = matchOfGoal(goalId)
    push(out, door('goal', goalHref(goalId), match ? matchSubject(match) : null, goalId))
  }
  return out.slice(0, MAX)
}

/** Gate 8, after a goal: the match's archive card, its stop if abroad, and the scorer's card. */
export function goalLinks(goalId: string): CrossLink[] {
  const out: CrossLink[] = []
  const match = matchOfGoal(goalId)
  const scorer = momentForGoal(goalId)?.scorer?.playerId ?? null
  if (match) {
    push(out, door('archive', archiveHref(match), matchSubject(match), match))
    push(out, door('away', awayHref(match), matchSubject(match), match))
  }
  if (scorer) push(out, door('archive', archiveHref(scorer), playerSubject(scorer), scorer))
  return out.slice(0, MAX)
}

/* ------------------------------------------------------------------ gate 12 */

/**
 * The archive drawer's "גם בשערים אחרים": a match → its AWAY DAYS stop ("על המפה") when it
 * was played abroad, and its gate-8 goal ("בשער 8") when the move is sourced; a man → the
 * gate-8 goals he scored; a goal moment → its replay and its match's stop.
 */
export function linksForEntity(anyId: string): CrossLink[] {
  const e = entity(anyId)
  if (!e) return []
  if (e.type === 'match') return linksForMatch(e.id, { omit: ['archive'] })
  if (e.type === 'person') return linksForPlayer(e.id, { omit: ['archive'] })
  if (e.type === 'moment' && e.id.startsWith('goal:')) {
    const goalId = e.id.slice('goal:'.length)
    const out: CrossLink[] = []
    if (goalYears().some((g) => g.id === goalId)) push(out, door('goal', goalHref(goalId), null, goalId))
    const match = momentForGoal(goalId)?.matchId ?? null
    if (match) push(out, door('away', awayHref(match), matchSubject(match), match))
    return out
  }
  return []
}
