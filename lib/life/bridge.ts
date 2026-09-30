import 'server-only'

import { entity } from '@/lib/archive/graph'
import { allMatches } from '@/lib/archive/match-master'
import { playerById } from '@/lib/archive/player-master'
import { archiveHref, goalIdsOfMatch, playableGoalHref } from '@/lib/links'
import { eraTriviaHref } from '@/lib/links/eraTrivia'

import {
  resolveChapterAnchor,
  resolvePrologueAnchor,
  resolveStageBAnchor,
  resolveStageBAnchors,
  resolveUssishkinAnchor,
} from './anchor-server'
import type { HistoricalAnchor } from './anchors'
import { CHAPTERS, anchorOwner } from './content/chapters'
import type { LifeArchiveBridge, LifeDoor } from './memoryPassport'

export type { LifeArchiveBridge, LifeDoor } from './memoryPassport'

/**
 * הגשר — LIFE ↔ ARCHIVE (ONE RED WORLD §23, §47). Server-only.
 *
 * A registry of `{ chapterId, entityIds, matchIds, kitIds, goalIds, playerIds,
 * safeReturnPoint }`, DERIVED — never typed. Each chapter's history already hangs on one
 * anchor that `anchor-server.ts` resolves from the curated archive (the only reader of it
 * LIFE has); this file maps that resolved anchor onto the canonical ids the masters mint:
 *
 *   anchor.match (sport + the day it was played)  →  the Match Master's `m_…`, when exactly
 *                                                    one match of that sport was played that day
 *   the match's scorers (confidence ≥ 2, resolved) →  `p_…`
 *   gate 8's deck                                  →  the goals of that match it deals
 *   the season                                     →  `season:<label>` and that season's shirts
 *
 * The rules that keep fiction and fact apart:
 *
 *   · Only a chapter whose anchor is a real sourced row (confidence ≥ 2, no placeholder)
 *     gets an entry. Fiction with nothing under it has no row, rather than a guessed one.
 *   · A shared anchor belongs to ONE chapter (`anchorOwner`): the match is lived in the
 *     chapter named for it, not in the six Stage A days that lead up to it.
 *   · Every id is checked against the Entity Graph and must carry the anchor's sport
 *     (rule 6) — a basketball night never names a football season.
 *   · No LIFE character is ever an entity here. The ids come from the masters only.
 */

const MAX_PLAYERS = 6

function allAnchors(): Record<string, HistoricalAnchor> {
  return {
    prologue: resolvePrologueAnchor(),
    '1986': resolveChapterAnchor(),
    '1990': resolveStageBAnchor(),
    '1991': resolveUssishkinAnchor(),
    ...resolveStageBAnchors(),
  }
}

/** The one canonical match an anchor's match names: same sport, same day, Hapoel on the sheet. */
function masterMatchOf(anchor: HistoricalAnchor): string | null {
  const day = anchor.match?.playedOn
  if (!day) return null
  const hits = allMatches().filter(
    (m) => m.sport === anchor.sport && m.playedOn.precision === 'day' && m.playedOn.value === day && m.hapoelSide !== null && !m.notPlayed,
  )
  if (hits.length !== 1) return null
  const id = hits[0]!.matchId
  return sameSport(id, anchor.sport) ? id : null
}

function sameSport(id: string, sport: HistoricalAnchor['sport']): boolean {
  const e = entity(id)
  return Boolean(e && e.sport === sport)
}

function scorersOf(matchId: string): string[] {
  const match = allMatches().find((m) => m.matchId === matchId)
  if (!match) return []
  const out: string[] = []
  for (const row of match.scorers) {
    if (row.ownGoal || !row.playerId || row.confidence < 2 || out.includes(row.playerId)) continue
    if (!playerById(row.playerId) || !entity(row.playerId)) continue
    out.push(row.playerId)
  }
  return out.slice(0, MAX_PLAYERS)
}

const VARIANTS = ['home', 'away', 'third', 'gk'] as const

function seasonKits(seasonLabel: string, sport: HistoricalAnchor['sport']): string[] {
  if (sport !== 'football') return []
  const stem = `kit-${seasonLabel.replace('/', '-')}`
  return VARIANTS.map((v) => `${stem}-${v}`).filter((id) => entity(id)?.type === 'kit')
}

function rowFor(chapterId: string, anchor: HistoricalAnchor): LifeArchiveBridge | null {
  if (anchor.confidence < 2 || anchor.placeholder) return null
  const matchId = masterMatchOf(anchor)
  const seasonId = `season:${anchor.seasonLabel}`
  const season = sameSport(seasonId, anchor.sport) && entity(seasonId)?.type === 'season' ? seasonId : null
  const playerIds = matchId ? scorersOf(matchId) : []
  const goalIds = matchId ? goalIdsOfMatch(matchId).filter((id) => playableGoalHref(id) !== null) : []
  const kitIds = seasonKits(anchor.seasonLabel, anchor.sport)
  const entityIds = [...new Set([matchId, season, ...playerIds, ...kitIds].filter((id): id is string => Boolean(id)))]
  if (entityIds.length === 0) return null
  return {
    chapterId,
    entityIds,
    matchIds: matchId ? [matchId] : [],
    kitIds,
    goalIds,
    playerIds,
    safeReturnPoint: '/life',
  }
}

let cached: LifeArchiveBridge[] | null = null

/** Every chapter that has a sourced anchor, as a bridge row. Playable chapters only. */
export function lifeBridge(): LifeArchiveBridge[] {
  if (cached) return cached
  const anchors = allAnchors()
  const out: LifeArchiveBridge[] = []
  for (const def of CHAPTERS) {
    if (!def.playable || anchorOwner(def.anchorKey) !== def.id) continue
    const anchor = anchors[def.anchorKey]
    if (!anchor) continue
    const row = rowFor(def.id, anchor)
    if (row) out.push(row)
  }
  cached = out
  return out
}

export function bridgeOf(chapterId: string): LifeArchiveBridge | null {
  return lifeBridge().find((row) => row.chapterId === chapterId) ?? null
}

/** The chapters an archive id is lived in — what the archive asks before it offers LIFE. */
export function chaptersOfEntity(anyId: string): string[] {
  const id = entity(anyId)?.id ?? anyId
  return lifeBridge()
    .filter((row) => row.entityIds.includes(id) || row.goalIds.includes(id))
    .map((row) => row.chapterId)
}

/**
 * LIFE → gates (§23.1). At most TWO doors for the recap of a finished chapter, derived
 * here and handed down; the shell never builds one. "מה באמת קרה" opens the anchor's match
 * in the archive, and "את השער הזה כבר חיית" replays its goal in gate 8 — only when the
 * gate actually deals that goal.
 */
export function lifeDoors(): Record<string, LifeDoor[]> {
  const out: Record<string, LifeDoor[]> = {}
  for (const row of lifeBridge()) {
    const doors: LifeDoor[] = []
    const match = row.matchIds[0] ?? null
    const archive = archiveHref(match ?? row.entityIds[0])
    if (archive) doors.push({ kind: 'archive', href: archive, label: 'bridge.door.truth' })
    const goal = row.goalIds.map((id) => playableGoalHref(id)).find((href): href is string => Boolean(href))
    if (goal) doors.push({ kind: 'goal', href: goal, label: 'bridge.door.goal' })
    if (doors.length) out[row.chapterId] = doors.slice(0, 2)
  }
  return out
}

/**
 * §11 — the chapter recap's quiet question, "רוצה לבדוק מה נשאר מהשנה הזאת?", as a door
 * into an ERA round of gate 2. Kept apart from `lifeDoors()` (those stay at most two, and
 * are about the moment; this is about the years). Offered only for a chapter with a real
 * sourced anchor — a bridge row — and only when the trivia gate can deal a full round of
 * that decade (`eraTriviaHref`, the same check the Cross Gate Router uses). Never a quiz
 * that pops: it is a link on the card, after the story is told.
 */
export function lifeTriviaDoors(): Record<string, LifeDoor> {
  const out: Record<string, LifeDoor> = {}
  for (const row of lifeBridge()) {
    const anchorId = row.matchIds[0] ?? row.entityIds.find((id) => id.startsWith('season:')) ?? null
    const e = anchorId ? entity(anchorId) : null
    if (!e || e.sport !== 'football') continue
    const href = eraTriviaHref(e.year)
    if (href) out[row.chapterId] = { kind: 'trivia', href, label: 'redworld.recap.trivia' }
  }
  return out
}
