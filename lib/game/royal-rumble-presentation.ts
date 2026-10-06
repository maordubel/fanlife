/**
 * The match as a SHOW — derived, never decided (Royal Rumble match experience, delta 99).
 *
 * The server owns the result: score, winner and the list of goals (who, when, on whose
 * side). This file only dresses it — the non-goal moments, Man of the Match, the two-line
 * story — deterministically from that result and the round seed. It reads nothing hidden:
 * no rating is on the public players, so none can leak into an event.
 *
 * Invariants, all asserted in tests/royal-rumble-presentation.test.ts:
 *   · goal events === result.scoreFor + result.scoreAgainst, on the right sides
 *   · 5–9 moments, minutes strictly increasing, never on top of each other
 *   · both fives are GK / DF / MF / MF / FW
 *   · skipping is just reading `script.final` — nothing is re-simulated.
 */

import { eventLine, type GoalStyle } from '../royal-rumble/commentary'
import type { Position, RoyalRumbleOffer, RoyalRumblePublicPlayer } from './royal-rumble-public'
import type { RoyalRumbleResult } from './royal-rumble'

export type RumbleSide = 'us' | 'them'

export type RumbleVisualPlayer = {
  slug: string
  nameHe: string
  position: Position
  side: RumbleSide
  /** the slot on a vertical pitch, 0–100, attacking UP */
  x: number
  y: number
  player: RoyalRumblePublicPlayer
}

export type PublicRumbleEvent = {
  id: string
  type: 'goal' | 'save' | 'chance' | 'miss' | 'block'
  minute: number
  side: RumbleSide
  playerSlug: string
  assistPlayerId?: string
  goalkeeperSlug?: string
  style?: GoalStyle
  scoreAfter: { us: number; them: number }
  textHe: string
}

export type RumbleMatchScript = {
  us: RumbleVisualPlayer[]
  them: RumbleVisualPlayer[]
  events: PublicRumbleEvent[]
  final: { us: number; them: number; winner: 'us' | 'them' | 'draw' }
  manOfTheMatch: { slug: string; nameHe: string; side: RumbleSide; reasonHe: string }
  summaryHe: string
  /** how long the show runs at normal speed, in ms — 20–40 s */
  durationMs: number
}

/** the clock runs 0→90 in this long; every moment then holds the picture for a beat */
export const RUN_MS = 12000
export const GOAL_HOLD_MS = 2400
export const MOMENT_HOLD_MS = 1400

/** the fixed shape: GK, DF, MF, MF, FW — no flex */
export const RUMBLE_SLOTS: readonly { position: Position; x: number; y: number }[] = [
  { position: 'GK', x: 50, y: 84 },
  { position: 'DF', x: 50, y: 65 },
  { position: 'MF', x: 34, y: 43 },
  { position: 'MF', x: 66, y: 43 },
  { position: 'FW', x: 50, y: 20 },
]

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

export function lineUp(offers: readonly RoyalRumbleOffer[], side: RumbleSide): RumbleVisualPlayer[] {
  const pool = [...offers]
  const out: RumbleVisualPlayer[] = []
  for (const slot of RUMBLE_SLOTS) {
    const at = pool.findIndex((offer) => offer.offeredAs === slot.position)
    const offer = at >= 0 ? pool.splice(at, 1)[0]! : pool.shift()
    if (!offer) continue
    out.push({ slug: offer.player.slug, nameHe: offer.player.nameHe, position: slot.position, side, x: slot.x, y: slot.y, player: offer.player })
  }
  return out
}

const STYLES_BY_POSITION: Record<Position, readonly GoalStyle[]> = {
  FW: ['close-finish', 'header', 'rebound', 'solo', 'combination', 'counter'],
  MF: ['long-shot', 'combination', 'counter', 'set-piece', 'solo'],
  DF: ['header', 'set-piece', 'rebound'],
  GK: ['close-finish'],
}

export const SHOW_MINUTES = 1.5

function compact(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.length > 1 ? parts[parts.length - 1]! : name
}

export function buildRumbleScript(input: { result: RoyalRumbleResult; ours: readonly RoyalRumbleOffer[]; seed: number }): RumbleMatchScript {
  const { result, ours } = input
  const us = lineUp(ours, 'us')
  const them = lineUp(result.opponent, 'them')
  const everyone = [...us, ...them]
  // the same man can stand in both fives, so a slug is only unique within a side
  const lookup = (side: RumbleSide, slug: string) => (side === 'us' ? us : them).find((p) => p.slug === slug)
  const seed = (input.seed ^ hash(everyone.map((p) => p.slug).join('|') + result.goals.map((g) => `${g.side}${g.scorerSlug}${g.minute}`).join(','))) >>> 0
  const random = mulberry32(seed)

  const shown = (minute: number) => Math.max(2, Math.min(88, Math.round(minute * SHOW_MINUTES)))
  const goalMinutes = result.goals.map((g) => shown(g.minute))
  // no two goals in the same minute, however the scaling rounds
  for (let i = 1; i < goalMinutes.length; i += 1) if (goalMinutes[i]! <= goalMinutes[i - 1]!) goalMinutes[i] = goalMinutes[i - 1]! + 1

  type Draft = { minute: number; goal: (typeof result.goals)[number] | null; side: RumbleSide; type: PublicRumbleEvent['type'] }
  const drafts: Draft[] = result.goals.map((goal, i) => ({ minute: goalMinutes[i]!, goal, side: goal.side, type: 'goal' as const }))

  const total = Math.max(5, Math.min(9, result.goals.length + 3))
  const taken = [...goalMinutes]
  const kinds: PublicRumbleEvent['type'][] = ['save', 'chance', 'miss', 'block', 'save']
  let guard = 0
  while (drafts.length < total && guard < 200) {
    guard += 1
    const minute = 4 + Math.floor(random() * 82)
    if (taken.some((m) => Math.abs(m - minute) < 5)) continue
    taken.push(minute)
    drafts.push({ minute, goal: null, side: random() < 0.5 ? 'us' : 'them', type: kinds[Math.floor(random() * kinds.length)]! })
  }
  drafts.sort((a, b) => a.minute - b.minute)

  const score = { us: 0, them: 0 }
  const saves = new Map<string, number>()
  const goalsBy = new Map<string, number>()
  const assistsBy = new Map<string, number>()

  const events: PublicRumbleEvent[] = drafts.map((draft, index) => {
    const attackers = draft.side === 'us' ? us : them
    const defenders = draft.side === 'us' ? them : us
    const keeper = defenders.find((p) => p.position === 'GK') ?? defenders[0]!
    if (draft.goal) {
      const scorer = lookup(draft.side, draft.goal.scorerSlug) ?? attackers[attackers.length - 1]!
      const assist = draft.goal.assistSlug ? lookup(draft.side, draft.goal.assistSlug) : undefined
      const styles = STYLES_BY_POSITION[scorer.position]
      const style = styles[Math.floor(random() * styles.length)]!
      score[draft.side] += 1
      goalsBy.set(scorer.side + scorer.slug, (goalsBy.get(scorer.side + scorer.slug) ?? 0) + 1)
      if (assist) assistsBy.set(assist.side + assist.slug, (assistsBy.get(assist.side + assist.slug) ?? 0) + 1)
      return {
        id: `g${index}`,
        type: 'goal' as const,
        minute: draft.minute,
        side: draft.side,
        playerSlug: scorer.slug,
        ...(assist ? { assistPlayerId: assist.slug } : {}),
        style,
        scoreAfter: { ...score },
        textHe: eventLine({ kind: 'goal', style, index, seed, name: compact(scorer.nameHe) }),
      }
    }
    // an outfield man takes the shot — a keeper never does
    const outfield = attackers.filter((p) => p.position !== 'GK')
    const shooter = outfield[Math.floor(random() * outfield.length)]!
    const blocker = defenders.filter((p) => p.position !== 'GK' && p.position !== 'FW')[0] ?? keeper
    if (draft.type === 'save') saves.set(keeper.side + keeper.slug, (saves.get(keeper.side + keeper.slug) ?? 0) + 1)
    return {
      id: `e${index}`,
      type: draft.type,
      minute: draft.minute,
      side: draft.side,
      playerSlug: shooter.slug,
      ...(draft.type === 'save' ? { goalkeeperSlug: keeper.slug } : {}),
      scoreAfter: { ...score },
      textHe: eventLine({ kind: draft.type, index, seed, name: compact(shooter.nameHe), keeper: compact(keeper.nameHe), other: compact(blocker.nameHe) }),
    }
  })

  const final = { us: result.scoreFor, them: result.scoreAgainst, winner: result.winner }

  // איש המשחק: what happened on the pitch — goals, the move before them, saves. Never a rating.
  const merit = (p: RumbleVisualPlayer) =>
    (goalsBy.get(p.side + p.slug) ?? 0) * 3 + (assistsBy.get(p.side + p.slug) ?? 0) * 1.5 + (saves.get(p.side + p.slug) ?? 0) * 1.2
  const favoured: RumbleSide | null = final.winner === 'draw' ? null : final.winner
  const pool = everyone.filter((p) => favoured === null || p.side === favoured)
  const ranked = [...pool].sort((a, b) => merit(b) - merit(a) || hash(`${a.slug}${seed}`) - hash(`${b.slug}${seed}`))
  const mvp = ranked[0]!
  const g = goalsBy.get(mvp.side + mvp.slug) ?? 0
  const s = saves.get(mvp.side + mvp.slug) ?? 0
  const reasonHe =
    g >= 2 ? `${g} שערים` : g === 1 ? 'שער ותרומה במהלך' : s > 0 ? `${s} הצלות` : (assistsBy.get(mvp.side + mvp.slug) ?? 0) > 0 ? 'בישל ושלט במרכז' : 'שלט במגרש'

  const scorers = events.filter((e) => e.type === 'goal')
  const first = scorers[0]
  const last = scorers[scorers.length - 1]
  const sentence1 =
    !first
      ? 'שני שוערים, אפס שערים — קרב של עצבים.'
      : final.winner === 'draw'
        ? `${compact(lookup(first.side, first.playerSlug)!.nameHe)} פתח ב־${first.minute}׳, והקרב נסגר ב־${final.us}:${final.them}.`
        : `${compact(lookup(last!.side, last!.playerSlug)!.nameHe)} הכריע ב־${last!.minute}׳ — ${final.us}:${final.them}.`
  const sentence2 = `איש המשחק: ${compact(mvp.nameHe)}, ${reasonHe}.`
  const goalsN = events.filter((e) => e.type === 'goal').length
  const durationMs = Math.min(40000, RUN_MS + goalsN * GOAL_HOLD_MS + (events.length - goalsN) * MOMENT_HOLD_MS)

  return {
    us,
    them,
    events,
    final,
    manOfTheMatch: { slug: mvp.slug, nameHe: mvp.nameHe, side: mvp.side, reasonHe },
    summaryHe: `${sentence1} ${sentence2}`,
    durationMs,
  }
}
