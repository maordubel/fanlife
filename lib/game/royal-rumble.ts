import 'server-only'

import { createHmac } from 'node:crypto'

import { allPlayers, namesOf, type PlayerMasterRecord } from '@/lib/archive/player-master'
import { t as rumbleText } from '@/lib/royal-rumble/i18n'
import { voiceAction } from '@/lib/voice'

import { archive } from './archive'
import { ROYAL_RUMBLE_CANONICAL_FIVES, ROYAL_RUMBLE_FIVE_COUNT, ROYAL_RUMBLE_PRICE_OVERRIDES } from './royal-rumble-prices'
import { eraOf, rateAll, type RatingConfidence, type RatingEvidence, type RatingFactors } from './royal-rumble-rating'
import {
  formationOf,
  minimumCompletionCost,
  ROYAL_RUMBLE_BALANCE_VERSION,
  ROYAL_RUMBLE_BUDGET,
  ROYAL_RUMBLE_DRAFT_SLOTS,
  ROYAL_RUMBLE_LINEUP_SIZE,
  ROYAL_RUMBLE_OFFERS_PER_SLOT,
  slotAdmits,
  type Position,
  type RoyalRumbleDraft,
  type RoyalRumbleDraftSlot,
  type RoyalRumbleFormation,
  type RoyalRumbleOffer,
  type RoyalRumblePrice,
  type RoyalRumblePublicPlayer,
  type RoyalRumbleSelection,
  type RoyalRumbleSlotRule,
} from './royal-rumble-public'
import { alternateRoyalRumbleOfferSeed, royalRumbleMatchSeed, royalRumbleRoundSeed } from './royal-rumble-seeds'

export {
  ROYAL_RUMBLE_BALANCE_VERSION,
  ROYAL_RUMBLE_BUDGET,
  ROYAL_RUMBLE_DRAFT_SLOTS,
  ROYAL_RUMBLE_LINEUP_SIZE,
  ROYAL_RUMBLE_OFFERS_PER_SLOT,
} from './royal-rumble-public'
export type {
  Position,
  RoyalRumbleDraft,
  RoyalRumbleDraftSlot,
  RoyalRumbleFormation,
  RoyalRumbleOffer,
  RoyalRumblePrice,
  RoyalRumblePublicPlayer,
  RoyalRumbleSelection,
  RoyalRumbleSlotRule,
} from './royal-rumble-public'

export type RoyalRumblePitchPlayer = {
  slug: string
  nameHe: string
  /** the RESOLVED position — what he plays as in this five, not his display value */
  position: Position
  x: number
  y: number
}

export type RoyalRumbleFrame = {
  at: number
  scoreFor: number
  scoreAgainst: number
  commentaryHe: string
  ball: { x: number; y: number }
  us: RoyalRumblePitchPlayer[]
  them: RoyalRumblePitchPlayer[]
}

/** one public-safe line about the five, decided on the server (§50–§52): no rating crosses */
export type RoyalRumbleHighlight = {
  slug: string
  kind: 'value' | 'star' | 'matchHero'
  textHe: string
}

/** one goal as the server decided it — public: names and minutes, never a rating */
export type RoyalRumbleGoal = {
  side: 'us' | 'them'
  minute: number
  scorerSlug: string
  /** only when the simulation really had a second man in the move */
  assistSlug: string | null
}

export type RoyalRumbleResult = {
  opponent: RoyalRumbleOffer[]
  formation: RoyalRumbleFormation
  opponentFormation: RoyalRumbleFormation
  scoreFor: number
  scoreAgainst: number
  winner: 'us' | 'them' | 'draw'
  frames: RoyalRumbleFrame[]
  /** the goals in order; length === scoreFor + scoreAgainst */
  goals: RoyalRumbleGoal[]
  highlight?: RoyalRumbleHighlight
}

type RatedPlayer = RoyalRumblePublicPlayer & {
  /** SERVER ONLY. Never return this object through a server action. */
  rating: number
}

/** a validated pick: the man, and the position he plays in this five */
type ValidatedRoyalRumblePick = { player: RatedPlayer; offeredAs: Position }

/* ------------------------------------------------------------------ pricing */

/**
 * The V1 bands, kept as the SUGGESTED price of a bare rating (step two of the pipeline,
 * §12) and as the public explanation of what a price is: a coarse zone, never the score.
 *  9-29 => €1m, 30-49 => €2m, 50-64 => €3m, 65-79 => €4m, 80-99 => €5m.
 */
export function priceForRating(rating: number): RoyalRumblePrice {
  if (rating >= 80) return 5
  if (rating >= 65) return 4
  if (rating >= 50) return 3
  if (rating >= 30) return 2
  return 1
}

/**
 * The AUTOMATED ladder as cumulative shares — €1 15% · €2 25% · €3 32% · €4 28% (V3). It stops
 * at €4 on purpose: €5 is the ten canonical players and nothing a percentile can reach, so no
 * rebalance can ever mint an eleventh. €4 is the large elite tier.
 */
const PRICE_CUMULATIVE: readonly number[] = [0.15, 0.4, 0.72, 1]

/** the floor of the elite tier: below this hidden rating a man is never an automated €4 */
export const MIN_RATING_FOR_FOUR = 45

function priceForPercentile(percentile: number): RoyalRumblePrice {
  for (let tier = 0; tier < PRICE_CUMULATIVE.length; tier += 1) {
    if (percentile < (PRICE_CUMULATIVE[tier] ?? 1)) return (tier + 1) as RoyalRumblePrice
  }
  return 4
}

/**
 * A tiny keyed nudge prevents the public repository from being an exact lookup table
 * for the 9-99 score. It is deliberately only +/-2: history decides the rating; the
 * key only breaks ties inside that historical estimate.
 *
 * Production should set ROYAL_RUMBLE_RATING_KEY to a private Vercel/Supabase secret.
 * The fallback keeps local/test builds deterministic without changing the public UI.
 */
function privateNudge(slug: string): number {
  const key = process.env.ROYAL_RUMBLE_RATING_KEY ?? 'royal-rumble-local-development'
  const hex = createHmac('sha256', key).update(slug).digest('hex').slice(0, 8)
  return (Number.parseInt(hex, 16) % 5) - 2
}

function countSongs(names: readonly string[]): number {
  const set = new Set(names)
  return archive.songs.filter((row) => typeof row.personNameHe === 'string' && set.has(row.personNameHe) && row.sport !== 'basketball').length
}

function countRecordedBigMoments(slugs: readonly string[], names: readonly string[]): number {
  const slugSet = new Set(slugs)
  const nameSet = new Set(names)
  const events = archive.matchEvents.filter(
    (row) => (row.personSlug !== null && slugSet.has(row.personSlug)) || (typeof row.relatedPersonSlug === 'string' && slugSet.has(row.relatedPersonSlug)),
  ).length
  const rebuiltGoals = archive.goals.reduce(
    (sum, goal) => sum + goal.sequence.filter((step) => nameSet.has(step.actorHe)).length,
    0,
  )
  return events + rebuiltGoals
}

/** the evidence one rating is built from — printed by the audit, never by a screen */
export type RoyalRumbleEvidence = {
  seasons: number
  titles: number
  goals: number
  lineups: number
  shirtSeasons: number
  songs: number
  moments: number
  /** the current squad's captain — also read by the owner report */
  captain: boolean
}

/**
 * The evidence of one man and his FAME (the market's reading, which sets the price ladder).
 * The hidden RATING is no longer computed here: it is `rateAll` in `royal-rumble-rating.ts`,
 * position-normalized over the whole pool (Gate 9 V3). Fame keeps its V2 shape — the years,
 * the honours and the songs — so price and rating stay two readings of the same evidence.
 */
function evidenceOf(player: PlayerMasterRecord, position: Position): { fame: number; evidence: RoyalRumbleEvidence; input: RatingEvidence } {
  const names = namesOf(player)
  const slugs = [player.slug, ...player.slugAliases]
  const spellSeasons = player.spells.reduce((sum, spell) => sum + spell.seasons.length, 0)
  const span =
    player.years.from !== null && player.years.to !== null && player.years.to >= player.years.from
      ? player.years.to - player.years.from + 1
      : 0
  const seasons = Math.max(spellSeasons, Math.min(span, 3))
  const titles = player.spells.reduce((sum, spell) => sum + spell.titles.length, 0)
  const goals = player.archiveGoals?.documentedGoals ?? 0
  const lineups = player.lineups.length
  const shirtSeasons = player.shirtNumbers.length
  const songs = countSongs(names)
  const moments = countRecordedBigMoments(slugs, names)

  const goalScale = position === 'FW' ? 0.55 : position === 'MF' ? 0.85 : position === 'DF' ? 1.6 : 0
  const positionBalance = position === 'GK' ? 5 : position === 'DF' ? 2 : 0
  const nudge = privateNudge(player.slug)
  /*
   * The PRICE is a market, and a market remembers differently from a record (§9: "how hard
   * it is to get him into the five", not "his score"). Fame leans on the years, the
   * honours and the songs; the rating leans on position-normalized impact. A short-peak
   * scorer therefore rates above his price — the bargain a supporter's memory finds.
   */
  const fame =
    9 +
    Math.min(45, seasons * 4.5) +
    Math.min(20, titles * 5) +
    Math.min(15, Math.min(8, songs * 6) + (player.clubNumbersUndated.length > 0 ? 3 : 0) + (player.currentSquad?.captain ? 2 : 0) + Math.min(2, shirtSeasons)) +
    Math.min(12, goals * goalScale * 0.4) +
    Math.min(5, moments * 2) +
    positionBalance +
    nudge
  return {
    fame,
    evidence: { seasons, titles, goals, lineups, shirtSeasons, songs, moments, captain: Boolean(player.currentSquad?.captain) },
    input: {
      slug: player.slug,
      position,
      fromYear: player.years.from,
      seasons,
      titles,
      goals,
      lineups,
      shirtSeasons,
      songs,
      moments,
      captain: Boolean(player.currentSquad?.captain),
      numberHolding: player.clubNumbersUndated.length > 0,
    },
  }
}

type PoolRow = RatedPlayer & {
  fame: number
  evidence: RoyalRumbleEvidence
  factors: RatingFactors
  confidence: RatingConfidence
  suggested: RoyalRumblePrice
  calibrated: RoyalRumblePrice
  overridden: boolean
  overrideReasonHe: string | null
}

let poolCache: PoolRow[] | null = null

/** average-rank percentile (ties share a rank, so two equal men never get two prices) */
function percentiles(rows: readonly { slug: string; rating: number }[]): Map<string, number> {
  const sorted = [...rows].sort((a, b) => a.rating - b.rating)
  const out = new Map<string, number>()
  let index = 0
  while (index < sorted.length) {
    let end = index
    while (end + 1 < sorted.length && sorted[end + 1]!.rating === sorted[index]!.rating) end += 1
    const middle = (index + end) / 2
    for (let at = index; at <= end; at += 1) out.set(sorted[at]!.slug, (middle + 0.5) / sorted.length)
    index = end + 1
  }
  return out
}

/**
 * The pool: every Player Master man with a documented position, rated, then priced by
 * the pipeline of §12 — suggested from the pool-wide percentile, calibrated against his
 * own position's pool (§15: every position needs depth at €1…€5), then the canonical
 * override. Ratings never leave this module.
 */
function pool(): PoolRow[] {
  if (poolCache) return poolCache

  const fives = new Map(ROYAL_RUMBLE_CANONICAL_FIVES.map((row) => [row.slug, row.reasonHe]))
  const stray = Object.entries(ROYAL_RUMBLE_PRICE_OVERRIDES).filter(([, price]) => price === 5)
  if (stray.length > 0) throw new Error(`Royal Rumble: a €5 override is not allowed — ${stray.map(([slug]) => slug).join(', ')} belongs in ROYAL_RUMBLE_CANONICAL_FIVES`)

  const base: Array<{ slug: string; nameHe: string; position: Position; positions: Position[]; fromYear: number | null; toYear: number | null; fame: number; evidence: RoyalRumbleEvidence; input: RatingEvidence }> = []
  for (const player of allPlayers()) {
    if (player.kind !== 'player') continue
    const position = player.positions.codes[0]
    if (!position) continue
    const { fame, evidence, input } = evidenceOf(player, position)
    base.push({
      slug: player.slug,
      nameHe: player.displayName,
      position,
      positions: [...player.positions.codes],
      fromYear: player.years.from,
      toYear: player.years.to,
      fame,
      evidence,
      input,
    })
  }

  // hidden strength: position-normalized over the whole pool, then spread over 9–99 (V3)
  const ratings = rateAll(base.map((row) => row.input), privateNudge)

  // the price ladder is FAME's, not the rating's (see `evidenceOf`)
  const famed = base.map((row) => ({ slug: row.slug, rating: row.fame, position: row.position }))
  const global = percentiles(famed)
  const byPosition = new Map<Position, Map<string, number>>()
  for (const position of POSITIONS) {
    byPosition.set(position, percentiles(famed.filter((row) => row.position === position)))
  }
  // no era is premium by longevity alone: fame is also ranked among his own era's men (V3)
  const byEra = new Map<string, Map<string, number>>()
  for (const era of ['early', 'middle', 'late'] as const) {
    byEra.set(era, percentiles(famed.filter((row) => eraOf(base.find((b) => b.slug === row.slug)?.fromYear ?? null) === era)))
  }

  poolCache = base.map((row) => {
    const rated = ratings.get(row.slug)!
    const suggested = priceForPercentile(global.get(row.slug) ?? 0)
    const positional = byPosition.get(row.position)?.get(row.slug) ?? global.get(row.slug) ?? 0
    const within = byEra.get(eraOf(row.fromYear))?.get(row.slug) ?? global.get(row.slug) ?? 0
    // position calibration (§15) and era balance (V3): his own position's ladder, his own era's, a little of the pool's
    const ladder = priceForPercentile(0.15 * (global.get(row.slug) ?? 0) + 0.5 * positional + 0.35 * within)
    // economy adjustment: fame may over-read a long squad-row career — a €4 must also play like one
    const calibrated: RoyalRumblePrice = ladder === 4 && rated.rating < MIN_RATING_FOR_FOUR ? 3 : ladder
    const canonical = fives.get(row.slug)
    const override = ROYAL_RUMBLE_PRICE_OVERRIDES[row.slug]
    const price: RoyalRumblePrice = canonical !== undefined ? 5 : ((override ?? calibrated) as RoyalRumblePrice)
    return {
      slug: row.slug,
      nameHe: row.nameHe,
      position: row.position,
      positions: row.positions,
      fromYear: row.fromYear,
      toYear: row.toYear,
      rating: rated.rating,
      fame: row.fame,
      evidence: row.evidence,
      factors: rated.factors,
      confidence: rated.confidence,
      suggested,
      calibrated,
      price,
      overridden: canonical !== undefined || override !== undefined,
      overrideReasonHe: canonical !== undefined ? `€5 קנוני — ${canonical}` : override !== undefined ? `נעילה ידנית ל-€${override}` : null,
    }
  })
  const fiveCount = poolCache.filter((row) => row.price === 5).length
  if (fiveCount !== ROYAL_RUMBLE_FIVE_COUNT) {
    const missing = [...fives.keys()].filter((slug) => !poolCache!.some((row) => row.slug === slug))
    poolCache = null
    throw new Error(`Royal Rumble: exactly ${ROYAL_RUMBLE_FIVE_COUNT} players cost €5, found ${fiveCount}${missing.length ? ` — not in the pool: ${missing.join(', ')}` : ''}`)
  }
  poolsByWindow.clear()
  return poolCache
}

/** The public price of one man — the whole pipeline, by slug. `null` when the pool has no such man. */
export function priceForPlayer(slug: string): RoyalRumblePrice | null {
  return pool().find((row) => row.slug === slug)?.price ?? null
}

function publicPlayer(player: RatedPlayer): RoyalRumblePublicPlayer {
  return {
    slug: player.slug,
    nameHe: player.nameHe,
    position: player.position,
    positions: player.positions,
    price: player.price,
    fromYear: player.fromYear,
    toYear: player.toYear,
  }
}

/* ------------------------------------------------------------------ randomness */

function mulberry32(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** a sub-seed: the seed, a salt, and the balance version, so V3 boards are other boards (§59) */
function subSeed(seed: number, salt: number): number {
  let value = (seed >>> 0) ^ Math.imul(salt + ROYAL_RUMBLE_BALANCE_VERSION * 0x2545f491, 0x9e3779b1)
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b)
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35)
  return (value ^ (value >>> 16)) >>> 0
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items]
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    ;[out[index], out[swap]] = [out[swap] as T, out[index] as T]
  }
  return out
}

function pickOne<T>(items: readonly T[], random: () => number): T | undefined {
  return items[Math.floor(random() * items.length)]
}

/**
 * A two-way man sits in two pools and was dealt twice as often as anyone (§64 —
 * "multi-position advantage"). Each candidate weighs `1 / positions`, so he is dealt as
 * often as a one-position man is, split across the positions he can be offered as.
 */
function pickWeighted(items: readonly RatedPlayer[], random: () => number): RatedPlayer | undefined {
  if (items.length === 0) return undefined
  const total = items.reduce((sum, player) => sum + 1 / player.positions.length, 0)
  let at = random() * total
  for (const player of items) {
    at -= 1 / player.positions.length
    if (at <= 0) return player
  }
  return items[items.length - 1]
}

/* ------------------------------------------------------------------ pools & windows */

/**
 * חלון של חיים (21.9.2026, `lib/mechanics/types.ts`) — the pack of cards Ofir deals on the
 * pitch in THE WORKER LIFE holds only men who had played for the club before `before`,
 * on both sides of the dare. Absent, the pools are the gate's.
 */
export type RumbleWindow = {
  before?: number
  /**
   * "השנים שחיית עד עכשיו" (ONE RED WORLD §18, 28.9.2026) — a themed draft over the men of
   * the LIFE chapters this device has finished, by slug. Built ONLY on the server
   * (`lib/life/livedPool.ts`); a client-sent window is cut to `before` by the action. It is
   * a separate mode with its own seed namespace (`royalRumbleLivedSeed`), so the canonical
   * board of any seed is untouched — `tests/life-payoffs.test.ts` holds the hashes.
   */
  only?: readonly string[]
}

const onlySets = new WeakMap<readonly string[], Set<string>>()
function onlySet(only: readonly string[]): Set<string> {
  let set = onlySets.get(only)
  if (!set) {
    set = new Set(only)
    onlySets.set(only, set)
  }
  return set
}

function inWindow(player: RatedPlayer, window?: RumbleWindow): boolean {
  if (!window) return true
  if (typeof window.before === 'number' && !(player.fromYear !== null && player.fromYear < window.before)) return false
  if (window.only && !onlySet(window.only).has(player.slug)) return false
  return true
}

function windowKey(window?: RumbleWindow): string {
  if (!window) return ''
  return `${window.before ?? ''}|${window.only ? [...window.only].sort().join(',') : ''}`
}

const POSITIONS: readonly Position[] = ['GK', 'DF', 'MF', 'FW']

type PositionPool = { all: RatedPlayer[]; byPrice: Map<RoyalRumblePrice, RatedPlayer[]> }
const poolsByWindow = new Map<string, PositionPool>()

/** the men who can be dealt AS this position over this window, bucketed by price — built once */
function positionPool(position: Position, window?: RumbleWindow): PositionPool {
  const key = `${position}|${windowKey(window)}`
  const cached = poolsByWindow.get(key)
  if (cached) return cached
  const all = pool().filter((player) => player.positions.includes(position) && inWindow(player, window))
  const byPrice = new Map<RoyalRumblePrice, RatedPlayer[]>()
  for (const player of all) byPrice.set(player.price, [...(byPrice.get(player.price) ?? []), player])
  const built = { all, byPrice }
  // a lived-years window is one per device's set of chapters: bound the memo, never the gate's own
  if (poolsByWindow.size > 96) for (const k of [...poolsByWindow.keys()]) if (k.endsWith('|') === false) poolsByWindow.delete(k)
  poolsByWindow.set(key, built)
  return built
}

function poolFor(position: Position, window?: RumbleWindow): RatedPlayer[] {
  return positionPool(position, window).all
}

/** how many cards a window holds at the thinnest position — the life asks before it deals */
export function rumbleDepth(window: RumbleWindow): number {
  return Math.min(...POSITIONS.map((position) => poolFor(position, window).length))
}

/**
 * Can a board be composed at all over this window (§32)? Three men per fixed position,
 * and enough DISTINCT defenders and midfielders for DF · MF · MF to be nine different
 * cards — a two-way man counts once.
 */
export function canDealRoyalRumble(window?: RumbleWindow): boolean {
  if (POSITIONS.some((position) => poolFor(position, window).length < ROYAL_RUMBLE_OFFERS_PER_SLOT)) return false
  const middle = new Set([...poolFor('DF', window), ...poolFor('MF', window)].map((player) => player.slug))
  return middle.size >= ROYAL_RUMBLE_OFFERS_PER_SLOT * 3
}

export function royalRumblePlayerCount(): number {
  return pool().length
}

/* ------------------------------------------------------------------ the board composer */

export type RoyalRumbleBoardMood = 'balanced' | 'star-heavy' | 'value' | 'tight' | 'wild'
type SlotKind = Position
type PriceProfile = readonly [RoyalRumblePrice, RoyalRumblePrice, RoyalRumblePrice]

const MOODS: readonly RoyalRumbleBoardMood[] = ['balanced', 'balanced', 'star-heavy', 'value', 'tight', 'wild']

/**
 * Offer price profiles per slot character (§17–§18). Internal, never shown. GK is value ·
 * solid · premium; DF balanced; MF temptation (both midfield slots); FW the
 * emotional squeeze at the end of the money.
 */
const PROFILES: Record<RoyalRumbleBoardMood, Record<SlotKind, readonly PriceProfile[]>> = {
  balanced: {
    GK: [[1, 3, 4], [2, 3, 4], [1, 2, 4], [2, 3, 5]],
    DF: [[2, 3, 4], [2, 3, 3], [1, 3, 4], [2, 4, 4]],
    MF: [[2, 3, 4], [1, 3, 5], [2, 4, 4], [3, 3, 4]],
    FW: [[1, 3, 5], [2, 4, 5], [2, 3, 4], [3, 4, 4]],
  },
  'star-heavy': {
    GK: [[1, 3, 5], [2, 4, 5], [1, 3, 4]],
    DF: [[1, 4, 5], [2, 4, 4], [1, 3, 5]],
    MF: [[2, 4, 5], [1, 3, 5], [1, 4, 4]],
    FW: [[2, 4, 5], [1, 3, 5], [2, 4, 4]],
  },
  value: {
    GK: [[1, 2, 4], [1, 3, 5], [1, 2, 3]],
    DF: [[1, 3, 4], [1, 2, 4], [2, 2, 5]],
    MF: [[1, 4, 5], [1, 3, 4], [2, 2, 5]],
    FW: [[1, 3, 5], [1, 4, 4], [2, 2, 5]],
  },
  tight: {
    GK: [[2, 3, 4], [3, 3, 4], [2, 2, 4]],
    DF: [[2, 3, 4], [3, 3, 4], [2, 4, 4]],
    MF: [[3, 3, 4], [2, 4, 4], [2, 3, 5]],
    FW: [[3, 3, 4], [2, 4, 4], [3, 4, 5]],
  },
  wild: {
    GK: [[1, 3, 5], [1, 2, 5], [1, 4, 4]],
    DF: [[1, 3, 5], [1, 2, 4], [1, 4, 5]],
    MF: [[1, 3, 5], [2, 2, 5], [1, 4, 4]],
    FW: [[1, 2, 5], [1, 3, 5], [2, 2, 4]],
  },
}

export type RoyalRumbleBoardQuality = {
  legalLineups: number
  legalRatio: number
  cheapest: number
  dearest: number
  premiumCards: number
  valueCards: number
  fiveCards: number
  samePriceSlots: number
  deadPrefixes: number
  /** of the stages after the first pick, the share where two or more cards still lead somewhere */
  openShare: number
  score: number
}

type Board = { slots: RoyalRumbleDraftSlot[]; mood: RoyalRumbleBoardMood }

function offerPrice(slot: RoyalRumbleDraftSlot, index: number): number {
  return slot.offers[index]?.player.price ?? Number.POSITIVE_INFINITY
}

/**
 * Enumerate every one of the 3^5 lineups (§22) and read the board's character off them.
 * A "dead prefix" is the trap §24 names: a partial five that naive budgeting says is
 * still affordable (a euro per slot left) but that no card can finish. A "narrow" one
 * is a legal prefix where only one card of the next three still leads somewhere.
 */
export function evaluateRoyalRumbleBoard(slots: readonly RoyalRumbleDraftSlot[], budget = ROYAL_RUMBLE_BUDGET): RoyalRumbleBoardQuality {
  const size = slots.length
  // suffix minima: the least a five can still cost from slot `from` on
  const suffixMin = new Array<number>(size + 1).fill(0)
  for (let index = size - 1; index >= 0; index -= 1) {
    const slot = slots[index]!
    suffixMin[index] = (suffixMin[index + 1] ?? 0) + (slot.offers.length === 0 ? 0 : Math.min(...slot.offers.map((offer) => offer.player.price)))
  }
  const cheapestFrom = (from: number): number => suffixMin[from] ?? 0

  let legalLineups = 0
  let total = 0
  let cheapest = Number.POSITIVE_INFINITY
  let dearest = 0
  const walk = (index: number, spent: number, gk: number, df: number, mf: number, fw: number): void => {
    if (index === size) {
      total += 1
      cheapest = Math.min(cheapest, spent)
      dearest = Math.max(dearest, spent)
      if (spent <= budget && size === ROYAL_RUMBLE_LINEUP_SIZE && gk === 1 && fw === 1) {
        legalLineups += 1
      }
      return
    }
    const slot = slots[index]!
    for (const card of slot.offers) {
      const as = card.offeredAs
      walk(index + 1, spent + card.player.price, gk + (as === 'GK' ? 1 : 0), df + (as === 'DF' ? 1 : 0), mf + (as === 'MF' ? 1 : 0), fw + (as === 'FW' ? 1 : 0))
    }
  }
  walk(0, 0, 0, 0, 0, 0)

  // what a supporter budgets per slot before looking: the board's own floor price (§24's
  // forbidden state is "€2 left, the strikers cost 3/4/5" — a board whose floor is €2 is
  // read as €2 a slot, one whose floor is €1 as €1 a slot)
  const floorPrice = Math.min(5, ...slots.flatMap((slot) => slot.offers.map((offer) => offer.player.price)))
  let deadPrefixes = 0
  let stages = 0
  let openStages = 0
  const prefixes = (index: number, spent: number): void => {
    if (index >= size) return
    const slot = slots[index]!
    let alive = 0
    for (const card of slot.offers) {
      const next = spent + card.player.price
      const remaining = size - index - 1
      const completable = next + cheapestFrom(index + 1) <= budget
      const naive = next + remaining * floorPrice <= budget
      if (completable) alive += 1
      else if (naive && next <= budget) deadPrefixes += 1
      if (completable) prefixes(index + 1, next)
    }
    // a stage is a legal prefix with a card still to pick; it is open when two or more of
    // the three cards lead somewhere (§24's "preferred") — the very first pick always is
    if (index > 0) {
      stages += 1
      if (alive >= 2) openStages += 1
    }
  }
  prefixes(0, 0)
  const openShare = stages === 0 ? 0 : openStages / stages

  const cards = slots.flatMap((slot) => slot.offers)
  const premiumCards = cards.filter((card) => card.player.price >= 4).length
  const valueCards = cards.filter((card) => card.player.price <= 2).length
  const fiveCards = cards.filter((card) => card.player.price === 5).length
  const samePriceSlots = slots.filter(
    (slot) => slot.offers.length > 0 && slot.offers.every((card) => card.player.price === offerPrice(slot, 0)),
  ).length
  const legalRatio = total === 0 ? 0 : legalLineups / total

  // the soft targets of §23 — a board that meets them all is what the composer stops at
  let score = 0
  if (legalRatio >= 0.3 && legalRatio <= 0.65) score += 1
  if (legalRatio >= 0.36 && legalRatio <= 0.6) score += 1
  if (premiumCards >= 3 && premiumCards <= 6) score += 1
  if (valueCards >= 4 && valueCards <= 7) score += 1
  if (fiveCards >= 1 && fiveCards <= 3) score += 1
  if (samePriceSlots <= 1) score += 1
  if (deadPrefixes === 0) score += 1
  if (openShare >= 0.6) score += 1

  return {
    legalLineups,
    legalRatio,
    cheapest: Number.isFinite(cheapest) ? cheapest : 0,
    dearest,
    premiumCards,
    valueCards,
    fiveCards,
    samePriceSlots,
    deadPrefixes,
    openShare,
    score,
  }
}

const BEST_SCORE = 8

/** the hard rules of §23; `strict` also asks for the 30–65% legal ratio */
function acceptable(quality: RoyalRumbleBoardQuality, slots: readonly RoyalRumbleDraftSlot[], strict: boolean): boolean {
  if (slots.length !== ROYAL_RUMBLE_LINEUP_SIZE) return false
  if (slots.some((slot) => slot.offers.length !== ROYAL_RUMBLE_OFFERS_PER_SLOT)) return false
  const slugs = slots.flatMap((slot) => slot.offers.map((offer) => offer.player.slug))
  if (new Set(slugs).size !== slugs.length) return false
  if (slots.some((slot) => slot.offers.some((offer) => !slotAdmits(slot.rule, offer.offeredAs)))) return false
  if (quality.cheapest > ROYAL_RUMBLE_BUDGET) return false
  if (quality.legalLineups < 1) return false
  if (quality.deadPrefixes > 0) return false
  if (strict && (quality.legalRatio < 0.3 || quality.legalRatio > 0.65)) return false
  return true
}

/**
 * One man at (about) one price. The exact tier first; when a thin historical window has
 * nobody there, the nearest tier that has somebody — never a guess, never past the cutoff.
 */
function takeAt(
  candidates: PositionPool,
  price: RoyalRumblePrice,
  used: Set<string>,
  random: () => number,
): RatedPlayer | undefined {
  for (const distance of [0, 1, 2, 3, 4]) {
    const near: RatedPlayer[] = []
    for (const tier of [price - distance, price + distance]) {
      if (tier < 1 || tier > 5 || (distance === 0 && tier !== price)) continue
      for (const player of candidates.byPrice.get(tier as RoyalRumblePrice) ?? []) if (!used.has(player.slug)) near.push(player)
    }
    const chosen = pickWeighted(near, random)
    if (chosen) return chosen
  }
  return undefined
}

/** one candidate board, from one attempt's sub-seed — profiles, cards */
function composeOnce(seed: number, attempt: number, window: RumbleWindow | undefined, simple: boolean, mood: RoyalRumbleBoardMood): Board | null {
  const random = mulberry32(subSeed(seed, 0x1009 + attempt * 7919))
  const used = new Set<string>()
  const slots: RoyalRumbleDraftSlot[] = []

  for (let index = 0; index < ROYAL_RUMBLE_DRAFT_SLOTS.length; index += 1) {
    const rule = ROYAL_RUMBLE_DRAFT_SLOTS[index]!
    const kind: SlotKind = rule.position
    const profiles = simple ? [[1, 2, 3] as const, [1, 3, 4] as const, [2, 3, 4] as const] : PROFILES[mood][kind]
    const profile = pickOne(profiles, random) ?? ([1, 3, 4] as const)
    const prices = shuffle(profile, random)
    const positions: Position[] = [rule.position, rule.position, rule.position]
    const offers: RoyalRumbleOffer[] = []
    for (let card = 0; card < ROYAL_RUMBLE_OFFERS_PER_SLOT; card += 1) {
      const offeredAs = positions[card]!
      // only ten men cost €5, so a profile's "5" is a chance of one of them, not a promise —
      // otherwise the same ten headline every board
      const wanted = prices[card]!
      const tier: RoyalRumblePrice = wanted === 5 && random() >= FIVE_SHARE ? 4 : wanted
      const player = takeAt(positionPool(offeredAs, window), tier, used, random)
      if (!player) return null
      used.add(player.slug)
      offers.push({ player: publicPlayer(player), offeredAs })
    }
    slots.push({ index, rule, offers })
  }
  return { slots, mood }
}

const ATTEMPTS = 40

/** how often a profile's €5 slot is really a €5 — the ten are rare on purpose */
const FIVE_SHARE = 0.45

/**
 * The board of one seed (§16, §25): choose a profile · build every slot · evaluate the
 * whole board · accept or reject, all from the seed. The first attempt that meets every
 * soft target wins; otherwise the best-scoring acceptable one of forty; with a thin
 * historical window the ladder relaxes — first the legal ratio, then the mood profiles
 * (simple ones only), and as the last rung the cheapest completable board. Once a board
 * is dealt it is immutable: nothing here ever looks at a pick.
 */
export function composeRoyalRumbleBoard(
  seed: number,
  window?: RumbleWindow,
  /** the audit only: hold the mood, to measure how each one fares against the acceptance rules */
  only?: RoyalRumbleBoardMood,
): { slots: RoyalRumbleDraftSlot[]; quality: RoyalRumbleBoardQuality; mood: RoyalRumbleBoardMood; attempt: number } {
  // the mood is the seed's (§20): one personality per board, the attempts vary its cards
  const moodRandom = mulberry32(subSeed(seed, 0x0a0d))
  const seedMood = only ?? pickOne(MOODS, moodRandom) ?? 'balanced'
  let best: { board: Board; quality: RoyalRumbleBoardQuality; attempt: number } | null = null
  for (const [strict, simple, mood] of [
    [true, false, seedMood],
    [true, false, 'balanced'],
    [false, false, seedMood],
    [false, true, 'balanced'],
  ] as const) {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const board = composeOnce(seed, attempt + (simple ? 1000 : 0), window, simple, mood)
      if (!board) continue
      const quality = evaluateRoyalRumbleBoard(board.slots)
      if (!acceptable(quality, board.slots, strict)) continue
      if (quality.score >= BEST_SCORE) return { slots: board.slots, quality, mood: board.mood, attempt }
      if (!best || quality.score > best.quality.score) best = { board, quality, attempt }
    }
    if (best) return { slots: best.board.slots, quality: best.quality, mood: best.board.mood, attempt: best.attempt }
  }
  // the last rung: a board that can at least be finished, even if nothing about it is good
  for (let attempt = 0; attempt < ATTEMPTS * 2; attempt += 1) {
    const board = composeOnce(seed, 2000 + attempt, window, true, 'balanced')
    if (!board) continue
    const quality = evaluateRoyalRumbleBoard(board.slots)
    if (quality.cheapest <= ROYAL_RUMBLE_BUDGET) return { slots: board.slots, quality, mood: board.mood, attempt }
  }
  return { slots: [], quality: evaluateRoyalRumbleBoard([]), mood: 'balanced', attempt: -1 }
}

/**
 * Five slots, three cards each, dealt before the supporter picks, so the server can later
 * validate that every submitted card really was on their screen. Pure in the seed (and
 * the window): the same call reproduces the same board for validation.
 */
export function dealRoyalRumbleDraft(seed: number, window?: RumbleWindow): RoyalRumbleDraft {
  const { slots } = composeRoyalRumbleBoard(seed, window)
  return { seed: seed >>> 0, budget: ROYAL_RUMBLE_BUDGET, version: ROYAL_RUMBLE_BALANCE_VERSION, slots }
}

function usable(draft: RoyalRumbleDraft): boolean {
  return (
    draft.slots.length === ROYAL_RUMBLE_LINEUP_SIZE &&
    draft.slots.every((slot) => slot.offers.length === ROYAL_RUMBLE_OFFERS_PER_SLOT) &&
    minimumCompletionCost(draft, draft.slots.map(() => null)) <= draft.budget
  )
}

/** how many cards of `b` are new against `a` (of 15), and the least new per slot (of 3) — §28 */
export function draftDistance(a: RoyalRumbleDraft, b: RoyalRumbleDraft): { cards: number; perSlot: number } {
  let cards = 0
  let perSlot = ROYAL_RUMBLE_OFFERS_PER_SLOT
  for (let index = 0; index < b.slots.length; index += 1) {
    const before = new Set(a.slots[index]?.offers.map((offer) => offer.player.slug) ?? [])
    const fresh = (b.slots[index]?.offers ?? []).filter((offer) => !before.has(offer.player.slug)).length
    cards += fresh
    perSlot = Math.min(perSlot, fresh)
  }
  return { cards, perSlot }
}

const DISTANCE_PREFERRED = 12
const DISTANCE_MINIMUM = 10

/**
 * Two usable drafts for one visit — the dealt one and the one the single shuffle swaps in
 * (§30). The pair is rigid — B's seed is A's under the shuffle mask, which is what the
 * Live room's `BAD_SEED_PAIR` check holds — so the search walks A's seed until both boards
 * are usable and B is meaningfully different: twelve new cards of fifteen and two per slot
 * when the pool allows it, ten when it does not, and the widest gap found otherwise.
 * It lived in `app/royal-rumble/page.tsx` until THE WORKER LIFE needed the same pair over
 * a window (21.9.2026); one helper, both callers (rule 59).
 */
export function pairedRoyalRumbleDrafts(
  seed: number,
  window?: RumbleWindow,
): { draft: RoyalRumbleDraft; shuffleDraft: RoyalRumbleDraft } {
  let fallback: { draft: RoyalRumbleDraft; shuffleDraft: RoyalRumbleDraft; cards: number } | null = null
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const offerSeed = (seed + attempt * 7919) >>> 0
    const draft = dealRoyalRumbleDraft(offerSeed, window)
    const shuffleDraft = dealRoyalRumbleDraft(alternateRoyalRumbleOfferSeed(offerSeed), window)
    if (!usable(draft) || !usable(shuffleDraft)) continue
    const distance = draftDistance(draft, shuffleDraft)
    if (distance.cards >= DISTANCE_PREFERRED && distance.perSlot >= 2) return { draft, shuffleDraft }
    if (!fallback || distance.cards > fallback.cards) fallback = { draft, shuffleDraft, cards: distance.cards }
    if (attempt >= 8 && fallback.cards >= DISTANCE_MINIMUM) break
  }
  if (fallback) return { draft: fallback.draft, shuffleDraft: fallback.shuffleDraft }
  const draft = dealRoyalRumbleDraft(seed >>> 0, window)
  return { draft, shuffleDraft: dealRoyalRumbleDraft(alternateRoyalRumbleOfferSeed(draft.seed), window) }
}

/**
 * The pair a ROUND deals — `?seed=` and `?r=` folded once (`royalRumbleRoundSeed`), then the
 * usual paired search. The route calls this and nothing else, so the draft, the shuffle,
 * the opponent, the match and the validation all follow the cursor together (ONE RED
 * WORLD §18).
 */
export function royalRumbleRoundDrafts(
  seed: number,
  cursor: number,
  window?: RumbleWindow,
): { draft: RoyalRumbleDraft; shuffleDraft: RoyalRumbleDraft } {
  return pairedRoyalRumbleDrafts(royalRumbleRoundSeed(seed, cursor), window)
}

/* ------------------------------------------------------------------ validation */

/**
 * The eight rules of §6, against the board re-dealt from the seed: the slug was on that
 * slot, at that offered position; the slot admits it; the man is documented there; no
 * duplicate; the money fits; the five resolves to one of the two formations.
 */
function validateSelection(
  seed: number,
  selection: readonly RoyalRumbleSelection[],
  window?: RumbleWindow,
): ValidatedRoyalRumblePick[] | null {
  if (selection.length !== ROYAL_RUMBLE_LINEUP_SIZE) return null
  if (new Set(selection.map((pick) => pick.slug)).size !== selection.length) return null

  const draft = dealRoyalRumbleDraft(seed, window)
  const bySlug = new Map(pool().map((player) => [player.slug, player]))
  const selected: ValidatedRoyalRumblePick[] = []

  for (let index = 0; index < draft.slots.length; index += 1) {
    const pick = selection[index]
    const slot = draft.slots[index]
    if (!pick || !slot) return null
    if (!slot.offers.some((offer) => offer.player.slug === pick.slug && offer.offeredAs === pick.offeredAs)) return null
    if (!slotAdmits(slot.rule, pick.offeredAs)) return null
    const player = bySlug.get(pick.slug)
    if (!player || !player.positions.includes(pick.offeredAs)) return null
    selected.push({ player, offeredAs: pick.offeredAs })
  }

  const cost = selected.reduce((sum, pick) => sum + pick.player.price, 0)
  if (cost > ROYAL_RUMBLE_BUDGET) return null
  return resolveFormation(selected) ? selected : null
}

/** the five as positions, in slot order, and the formation they make (§7) */
export function resolveFormation(selected: readonly { offeredAs: Position }[]): RoyalRumbleFormation | null {
  return formationOf(selected.map((pick) => pick.offeredAs))
}

/* ------------------------------------------------------------------ the opponent */

const OPPONENT_CANDIDATES = 24

function composeOpponentCandidate(random: () => number, window?: RumbleWindow): ValidatedRoyalRumblePick[] | null {
  const used = new Set<string>()
  const team: ValidatedRoyalRumblePick[] = []
  let spent = 0
  for (let index = 0; index < ROYAL_RUMBLE_DRAFT_SLOTS.length; index += 1) {
    const rule = ROYAL_RUMBLE_DRAFT_SLOTS[index]!
    const position = rule.position
    const remainingSlots = ROYAL_RUMBLE_DRAFT_SLOTS.length - index - 1
    const maxPrice = ROYAL_RUMBLE_BUDGET - spent - remainingSlots
    const legal = poolFor(position, window).filter((player) => !used.has(player.slug) && player.price <= maxPrice)
    const player = pickOne(legal, random)
    if (!player) return null
    used.add(player.slug)
    team.push({ player, offeredAs: position })
    spent += player.price
  }
  return spent <= ROYAL_RUMBLE_BUDGET && resolveFormation(team) ? team : null
}

function hiddenPower(team: readonly ValidatedRoyalRumblePick[]): number {
  return team.reduce((sum, pick) => sum + pick.player.rating, 0)
}

/**
 * The opponent is determined from the round seed alone — never from the supporter's
 * picks. Two dozen legal candidate fives (each with a seeded formation) are ranked by
 * hidden power and the seed picks one from the 45th–70th percentile (§35–§36): a real
 * opponent, not the strongest one the archive can field, and never a counter-pick.
 */
function dealOpponent(seed: number, window?: RumbleWindow): ValidatedRoyalRumblePick[] {
  const random = mulberry32(subSeed(seed ^ 0x51f15e, 0x0b0b))
  const candidates: ValidatedRoyalRumblePick[][] = []
  for (let index = 0; index < OPPONENT_CANDIDATES * 3 && candidates.length < OPPONENT_CANDIDATES; index += 1) {
    const team = composeOpponentCandidate(random, window)
    if (team) candidates.push(team)
  }
  if (candidates.length === 0) return []
  candidates.sort((a, b) => hiddenPower(a) - hiddenPower(b))
  const percentile = 0.45 + random() * 0.25
  const index = Math.min(candidates.length - 1, Math.floor(candidates.length * percentile))
  return candidates[index] ?? []
}

/** the audit's view of the opponent composer — the whole ladder, never through an action */
export function auditOpponent(seed: number, window?: RumbleWindow): { cost: number; power: number; formation: RoyalRumbleFormation | null; candidatePowers: number[] } {
  const random = mulberry32(subSeed(seed ^ 0x51f15e, 0x0b0b))
  const candidates: ValidatedRoyalRumblePick[][] = []
  for (let index = 0; index < OPPONENT_CANDIDATES * 3 && candidates.length < OPPONENT_CANDIDATES; index += 1) {
    const team = composeOpponentCandidate(random, window)
    if (team) candidates.push(team)
  }
  const chosen = dealOpponent(seed, window)
  return {
    cost: chosen.reduce((sum, pick) => sum + pick.player.price, 0),
    power: hiddenPower(chosen),
    formation: resolveFormation(chosen),
    candidatePowers: candidates.map(hiddenPower).sort((a, b) => a - b),
  }
}

/* ------------------------------------------------------------------ the match */

/** one shape on the grass: 1-1-2-1 */
function baseShape(side: 'us' | 'them', team: readonly ValidatedRoyalRumblePick[], formation: RoyalRumbleFormation): RoyalRumblePitchPlayer[] {
  void formation
  const spots: Record<Position, Array<{ x: number; y: number }>> = {
    GK: [{ x: 10, y: 50 }],
    DF: [{ x: 28, y: 50 }],
    MF: [{ x: 47, y: 34 }, { x: 47, y: 66 }],
    FW: [{ x: 70, y: 50 }],
  }
  const taken: Record<Position, number> = { GK: 0, DF: 0, MF: 0, FW: 0 }
  return team.map(({ player, offeredAs }) => {
    const spot = spots[offeredAs][taken[offeredAs]] ?? { x: 50, y: 50 }
    taken[offeredAs] += 1
    return {
      slug: player.slug,
      nameHe: player.nameHe,
      position: offeredAs,
      x: side === 'us' ? spot.x : 100 - spot.x,
      y: spot.y,
    }
  })
}

function moveShape(
  shape: RoyalRumblePitchPlayer[],
  random: () => number,
  attackDirection: 1 | -1,
): RoyalRumblePitchPlayer[] {
  return shape.map((player) => {
    if (player.position === 'GK') return player
    const forward = (5 + random() * 8) * attackDirection
    const vertical = (random() - 0.5) * 16
    return {
      ...player,
      x: Math.max(6, Math.min(94, player.x + forward)),
      y: Math.max(12, Math.min(88, player.y + vertical)),
    }
  })
}

/** scorer weight by RESOLVED position (§38): FW > MF > DF; a keeper never scores */
const SCORER_WEIGHT: Record<Position, number> = { FW: 5, MF: 3, DF: 2, GK: 0 }

function scorer(team: readonly ValidatedRoyalRumblePick[], random: () => number): ValidatedRoyalRumblePick {
  const weighted = team.flatMap((pick) => Array.from({ length: SCORER_WEIGHT[pick.offeredAs] }, () => pick))
  return weighted[Math.floor(random() * weighted.length)] ?? team[team.length - 1]!
}

function partner(team: readonly ValidatedRoyalRumblePick[], scorerPick: ValidatedRoyalRumblePick, random: () => number): ValidatedRoyalRumblePick {
  const candidates = team.filter((pick) => pick.player.slug !== scorerPick.player.slug && pick.offeredAs !== 'GK')
  return candidates[Math.floor(random() * candidates.length)] ?? scorerPick
}

/**
 * Formation modifiers (§37), small by design — 3–5% at most. Two midfielders create a
 * little more and hold a little less; two defenders the reverse. The base stays what it
 * was: team power is the sum of the hidden ratings.
 */
const FORMATION_MOD: Record<RoyalRumbleFormation, { attack: number; defence: number }> = {
  creative: { attack: 1.04, defence: 0.97 },
  defensive: { attack: 0.97, defence: 1.04 },
}

type Tally = { goals: Map<string, number>; involvement: Map<string, number> }

function simulate(seed: number, us: readonly ValidatedRoyalRumblePick[], them: readonly ValidatedRoyalRumblePick[]): RoyalRumbleResult {
  return simulateWithTallies(seed, us, them).result
}

function simulateWithTallies(
  seed: number,
  us: readonly ValidatedRoyalRumblePick[],
  them: readonly ValidatedRoyalRumblePick[],
): { result: RoyalRumbleResult; tallies: { us: Tally; them: Tally } } {
  const random = mulberry32((seed ^ 0x9e3779b9) >>> 0)
  const usFormation = resolveFormation(us) ?? 'creative'
  const themFormation = resolveFormation(them) ?? 'creative'
  const usPower = hiddenPower(us)
  const themPower = hiddenPower(them)
  // creation against the other side's holding — the formation is worth a few percent, not a five
  const usEdge = usPower * FORMATION_MOD[usFormation].attack - themPower * FORMATION_MOD[themFormation].defence
  const themEdge = themPower * FORMATION_MOD[themFormation].attack - usPower * FORMATION_MOD[usFormation].defence
  const delta = (usEdge - themEdge) / 2

  const usChance = Math.max(0.2, Math.min(0.8, 0.5 + delta / 600))
  // two creative fives open the match up; two defensive ones close it
  const openness = (usFormation === 'creative' ? 0.5 : -0.5) + (themFormation === 'creative' ? 0.5 : -0.5)
  const totalGoals = Math.max(1, Math.min(5, 1 + Math.floor(random() * 5) + (random() < Math.abs(openness) * 0.35 ? Math.sign(openness) : 0)))
  let scoreFor = 0
  let scoreAgainst = 0
  let usShape = baseShape('us', us, usFormation)
  let themShape = baseShape('them', them, themFormation)
  const tallies: { us: Tally; them: Tally } = {
    us: { goals: new Map(), involvement: new Map() },
    them: { goals: new Map(), involvement: new Map() },
  }

  const goals: RoyalRumbleGoal[] = []
  const frames: RoyalRumbleFrame[] = [
    {
      at: 0,
      scoreFor,
      scoreAgainst,
      // §18: "יאללה." — the kickoff line is the gate's voice (lib/voice), not this file's copy
      commentaryHe: voiceAction(9, 'kickoff') ?? '',
      ball: { x: 50, y: 50 },
      us: usShape,
      them: themShape,
    },
  ]

  for (let goal = 0; goal < totalGoals; goal += 1) {
    const ours = random() < usChance
    const attack = ours ? us : them
    const pick = scorer(attack, random)
    const helper = partner(attack, pick, random)
    const player = pick.player
    const baseMinute = 6 + goal * 9
    const tally = ours ? tallies.us : tallies.them
    tally.goals.set(player.slug, (tally.goals.get(player.slug) ?? 0) + 1)
    tally.involvement.set(player.slug, (tally.involvement.get(player.slug) ?? 0) + 2)
    tally.involvement.set(helper.player.slug, (tally.involvement.get(helper.player.slug) ?? 0) + 1)

    usShape = moveShape(usShape, random, ours ? 1 : -1)
    themShape = moveShape(themShape, random, ours ? -1 : 1)

    frames.push({
      at: baseMinute,
      scoreFor,
      scoreAgainst,
      commentaryHe: ours
        ? rumbleText('playBuildOurs', { helper: helper.player.nameHe, player: player.nameHe })
        : rumbleText('playBuildTheirs', { helper: helper.player.nameHe, player: player.nameHe }),
      ball: { x: ours ? 68 + random() * 10 : 32 - random() * 10, y: 30 + random() * 40 },
      us: usShape,
      them: themShape,
    })

    frames.push({
      at: baseMinute + 1,
      scoreFor,
      scoreAgainst,
      commentaryHe: ours
        ? rumbleText('playShotOurs', { player: player.nameHe })
        : rumbleText('playShotTheirs', { player: player.nameHe }),
      ball: { x: ours ? 84 + random() * 5 : 16 - random() * 5, y: 38 + random() * 24 },
      us: usShape,
      them: themShape,
    })

    if (ours) scoreFor += 1
    else scoreAgainst += 1
    goals.push({
      side: ours ? 'us' : 'them',
      minute: baseMinute + 2,
      scorerSlug: player.slug,
      assistSlug: helper.player.slug === player.slug ? null : helper.player.slug,
    })

    frames.push({
      at: baseMinute + 2,
      scoreFor,
      scoreAgainst,
      commentaryHe: ours ? rumbleText('playGoalOurs', { player: player.nameHe }) : rumbleText('playGoalTheirs', { player: player.nameHe }),
      ball: { x: ours ? 94 : 6, y: 44 + random() * 12 },
      us: usShape,
      them: themShape,
    })

    if (goal < totalGoals - 1) {
      const recovering = random() < 0.5
      usShape = baseShape('us', us, usFormation)
      themShape = baseShape('them', them, themFormation)
      frames.push({
        at: baseMinute + 4,
        scoreFor,
        scoreAgainst,
        commentaryHe: recovering ? rumbleText('playReset') : rumbleText('playRegroup'),
        ball: { x: 45 + random() * 10, y: 35 + random() * 30 },
        us: usShape,
        them: themShape,
      })
    }
  }

  frames.push({
    at: 60,
    scoreFor,
    scoreAgainst,
    commentaryHe: scoreFor > scoreAgainst ? rumbleText('matchWon') : scoreFor < scoreAgainst ? rumbleText('matchLost') : rumbleText('matchDraw'),
    ball: { x: 50, y: 50 },
    us: usShape,
    them: themShape,
  })

  const winner = scoreFor === scoreAgainst ? 'draw' : scoreFor > scoreAgainst ? 'us' : 'them'
  return {
    result: {
      opponent: them.map((pick) => ({ player: publicPlayer(pick.player), offeredAs: pick.offeredAs })),
      formation: usFormation,
      opponentFormation: themFormation,
      scoreFor,
      scoreAgainst,
      winner,
      frames,
      goals,
      highlight: highlightFor(us, tallies.us, winner),
    },
    tallies,
  }
}

/**
 * The one line under the score (§50–§52). A match hero is only ever what the simulation
 * actually produced — goals and involvement; the value pick is `rating / price` on the
 * server, and only the NAME crosses; the star is the dearest card when it earned its price.
 */
function highlightFor(
  us: readonly ValidatedRoyalRumblePick[],
  { goals: goalsBy, involvement }: Tally,
  winner: 'us' | 'them' | 'draw',
): RoyalRumbleHighlight | undefined {
  const hero = [...us]
    .filter((pick) => (goalsBy.get(pick.player.slug) ?? 0) > 0)
    .sort(
      (a, b) =>
        (goalsBy.get(b.player.slug) ?? 0) - (goalsBy.get(a.player.slug) ?? 0) ||
        (involvement.get(b.player.slug) ?? 0) - (involvement.get(a.player.slug) ?? 0),
    )[0]
  const heroGoals = hero ? (goalsBy.get(hero.player.slug) ?? 0) : 0
  if (hero && (heroGoals >= 2 || (winner === 'us' && heroGoals >= 1))) {
    return { slug: hero.player.slug, kind: 'matchHero', textHe: rumbleText('matchHero', { name: hero.player.nameHe }) }
  }

  const ratings = us.map((pick) => pick.player.rating).sort((a, b) => a - b)
  const median = ratings[Math.floor(ratings.length / 2)] ?? 0
  const value = [...us]
    .filter((pick) => pick.player.price <= 2 && pick.player.rating >= median)
    .sort((a, b) => b.player.rating / b.player.price - a.player.rating / a.player.price)[0]
  if (value) return { slug: value.player.slug, kind: 'value', textHe: rumbleText('valuePick', { name: value.player.nameHe }) }

  const star = [...us].sort((a, b) => b.player.price - a.player.price || b.player.rating - a.player.rating)[0]
  const top = Math.max(...us.map((pick) => pick.player.rating))
  if (star && star.player.price >= 4 && star.player.rating === top) {
    return { slug: star.player.slug, kind: 'star', textHe: rumbleText('starPick', { name: star.player.nameHe }) }
  }
  if (hero) return { slug: hero.player.slug, kind: 'matchHero', textHe: rumbleText('matchHero', { name: hero.player.nameHe }) }
  return undefined
}

function mirrorPitchPlayer(player: RoyalRumblePitchPlayer): RoyalRumblePitchPlayer {
  return { ...player, x: 100 - player.x }
}

function awayPerspective(result: RoyalRumbleResult, home: readonly ValidatedRoyalRumblePick[], guestHighlight: RoyalRumbleHighlight | undefined): RoyalRumbleResult {
  return {
    opponent: home.map((pick) => ({ player: publicPlayer(pick.player), offeredAs: pick.offeredAs })),
    formation: result.opponentFormation,
    opponentFormation: result.formation,
    scoreFor: result.scoreAgainst,
    scoreAgainst: result.scoreFor,
    winner: result.winner === 'draw' ? 'draw' : result.winner === 'us' ? 'them' : 'us',
    frames: result.frames.map((frame) => ({
      ...frame,
      scoreFor: frame.scoreAgainst,
      scoreAgainst: frame.scoreFor,
      ball: { x: 100 - frame.ball.x, y: frame.ball.y },
      us: frame.them.map(mirrorPitchPlayer),
      them: frame.us.map(mirrorPitchPlayer),
    })),
    goals: result.goals.map((goal) => ({ ...goal, side: goal.side === 'us' ? 'them' : 'us' })),
    highlight: guestHighlight,
  }
}

export function playRoyalRumbleHeadToHead(
  matchSeed: number,
  homeOfferSeed: number,
  homeSelection: readonly RoyalRumbleSelection[],
  guestOfferSeed: number,
  guestSelection: readonly RoyalRumbleSelection[],
): { home: RoyalRumbleResult; away: RoyalRumbleResult } | null {
  const home = validateSelection(homeOfferSeed, homeSelection)
  const away = validateSelection(guestOfferSeed, guestSelection)
  if (!home || !away) return null
  const { result, tallies } = simulateWithTallies(matchSeed >>> 0, home, away)
  // the guest's own line — the same match, his goals, read from his side
  const guestHighlight = highlightFor(away, tallies.them, result.winner === 'draw' ? 'draw' : result.winner === 'us' ? 'them' : 'us')
  return { home: result, away: awayPerspective(result, home, guestHighlight) }
}

/** The only solo function a server action needs. Ratings never cross this boundary. */
export function playRoyalRumble(seed: number, selection: readonly RoyalRumbleSelection[], window?: RumbleWindow): RoyalRumbleResult | null {
  const selected = validateSelection(seed, selection, window)
  if (!selected) return null
  const matchSeed = royalRumbleMatchSeed(seed)
  const opponent = dealOpponent(matchSeed, window)
  if (opponent.length !== ROYAL_RUMBLE_LINEUP_SIZE) return null
  return simulate(matchSeed, selected, opponent)
}

/* ------------------------------------------------------------------ the offline audit */

/**
 * What `scripts/royal-rumble/audit.ts` reads (§60–§66). This is the one door through
 * which a rating leaves the module, and it opens only for the offline script — never
 * call it from a server action or a page.
 */
export function royalRumbleAuditView(): {
  players: Array<
    RoyalRumblePublicPlayer & {
      rating: number
      suggested: RoyalRumblePrice
      calibrated: RoyalRumblePrice
      overridden: boolean
      overrideReasonHe: string | null
      evidence: RoyalRumbleEvidence
      factors: RatingFactors
      confidence: RatingConfidence
    }
  >
  compose: (seed: number, window?: RumbleWindow, only?: RoyalRumbleBoardMood) => ReturnType<typeof composeRoyalRumbleBoard>
  power: (selection: readonly RoyalRumbleSelection[], seed: number, window?: RumbleWindow) => number | null
} {
  return {
    players: pool().map((row) => ({
      ...publicPlayer(row),
      rating: row.rating,
      suggested: row.suggested,
      calibrated: row.calibrated,
      overridden: row.overridden,
      overrideReasonHe: row.overrideReasonHe,
      evidence: row.evidence,
      factors: row.factors,
      confidence: row.confidence,
    })),
    compose: composeRoyalRumbleBoard,
    power: (selection, seed, window) => {
      const picks = validateSelection(seed, selection, window)
      return picks ? hiddenPower(picks) : null
    },
  }
}
