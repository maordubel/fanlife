import 'server-only'

import type { Position } from './royal-rumble-public'

/**
 * Historical rating V3 (Gate 9, 29.9.2026) — the hidden strength of a Royal Rumble card.
 *
 * Price is the DRAFT ECONOMY (`royal-rumble-prices.ts`); this file is football strength and
 * only that. They correlate and are never the same number, which is what lets a €2 out-rate
 * a €3 and makes a bargain something a supporter can find.
 *
 * What V2 got wrong: one formula for four jobs, and a percentile spread of the SUM — so a
 * goalkeeper was measured on goals he never scores, a 1960s striker on how many moments a
 * modern archive happens to have logged. V3:
 *
 *  1. **Every factor is a percentile inside a peer group, then combined.** Output, peak,
 *     longevity and honours are ranked among men of his own POSITION (GK · DF · MF · FW);
 *     big-game and legacy evidence — the two kinds that depend on how richly an era was
 *     documented — are ranked among his own ERA. The weights differ by position.
 *  2. **Absence of data is not weakness.** A man with no big-game row and no song gets a
 *     neutral 0.40 on those two factors, not zero; a man with only squad rows (confidence
 *     `low`) is rated on the factors that are always documented — seasons and honours — and
 *     the two sparse factors drop out of his weights altogether.
 *  3. **The result is spread over 9–99 by rank** (seven tenths rank, three tenths the score)
 *     so five €3s stand with 5+4+3+2+1, exactly as V2's `spreadRating` did.
 */

export type RatingConfidence = 'high' | 'medium' | 'low'

export type RatingEvidence = {
  slug: string
  position: Position
  fromYear: number | null
  seasons: number
  titles: number
  goals: number
  lineups: number
  shirtSeasons: number
  songs: number
  moments: number
  captain: boolean
  numberHolding: boolean
}

export type RatingFactors = {
  /** rate of output at his position — goals per season, or title density for a keeper */
  peak: number
  longevity: number
  /** total output at his position — goals scaled by what his position is asked to score */
  output: number
  honours: number
  /** documented big-game evidence, era-relative */
  bigGames: number
  /** supporter legacy — songs, the captain's armband, a number kept for life, era-relative */
  legacy: number
}

export type Rated = { slug: string; rating: number; score: number; factors: RatingFactors; confidence: RatingConfidence }

type Weights = Record<keyof RatingFactors, number>

/** how much each factor counts at each position; every row sums to 1 */
export const POSITION_WEIGHTS: Record<Position, Weights> = {
  FW: { peak: 0.2, longevity: 0.1, output: 0.3, honours: 0.15, bigGames: 0.15, legacy: 0.1 },
  MF: { peak: 0.15, longevity: 0.15, output: 0.2, honours: 0.2, bigGames: 0.15, legacy: 0.15 },
  // Deep QA 29.9.2026 §13.1–13.2: a defender's history is longevity, captaincy, titles and
  // starts — not goals × a multiplier; a keeper is what he lasted and won, not one title period
  DF: { peak: 0.05, longevity: 0.3, output: 0.05, honours: 0.28, bigGames: 0.2, legacy: 0.12 },
  GK: { peak: 0.1, longevity: 0.35, output: 0, honours: 0.25, bigGames: 0.2, legacy: 0.1 },
}

/** goals are asked of a striker, sometimes of a midfielder, rarely of a defender, never of a keeper */
const GOAL_SCALE: Record<Position, number> = { FW: 1, MF: 1.5, DF: 2, GK: 0 }

const NEUTRAL = 0.4

export function eraOf(fromYear: number | null): 'early' | 'middle' | 'late' {
  if (fromYear === null) return 'middle'
  return fromYear < 1980 ? 'early' : fromYear < 2000 ? 'middle' : 'late'
}

export function confidenceOf(row: RatingEvidence): RatingConfidence {
  const kinds = [
    row.seasons >= 3,
    row.titles > 0,
    row.goals > 0 || row.position === 'GK',
    row.lineups > 0,
    row.moments > 0,
    row.songs + row.shirtSeasons > 0 || row.captain || row.numberHolding,
  ].filter(Boolean).length
  return kinds >= 4 ? 'high' : kinds >= 2 ? 'medium' : 'low'
}

/** average-rank percentile in (0,1): ties share a rank, so two equal men are never separated */
export function percentileMap(values: ReadonlyMap<string, number>): Map<string, number> {
  const sorted = [...values.entries()].sort((a, b) => a[1] - b[1])
  const out = new Map<string, number>()
  let index = 0
  while (index < sorted.length) {
    let end = index
    while (end + 1 < sorted.length && sorted[end + 1]![1] === sorted[index]![1]) end += 1
    const middle = (index + end) / 2
    for (let at = index; at <= end; at += 1) out.set(sorted[at]![0], (middle + 0.5) / sorted.length)
    index = end + 1
  }
  return out
}

function group<T>(rows: readonly T[], key: (row: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>()
  for (const row of rows) out.set(key(row), [...(out.get(key(row)) ?? []), row])
  return out
}

/** rank inside a peer group, for one raw measure */
function rankWithin(rows: readonly RatingEvidence[], key: (row: RatingEvidence) => string, measure: (row: RatingEvidence) => number): Map<string, number> {
  const out = new Map<string, number>()
  for (const peers of group(rows, key).values()) {
    const ranks = percentileMap(new Map(peers.map((row) => [row.slug, measure(row)])))
    for (const [slug, rank] of ranks) out.set(slug, rank)
  }
  return out
}

/**
 * A density factor is ranked among era-mates who HAVE the evidence and mapped into
 * NEUTRAL..1; a man with none gets NEUTRAL. Zero rows in a sparsely documented decade is a
 * gap in the record, not a verdict on the player.
 */
function densityRank(rows: readonly RatingEvidence[], measure: (row: RatingEvidence) => number): Map<string, number> {
  const out = new Map<string, number>()
  for (const peers of group(rows, (row) => eraOf(row.fromYear)).values()) {
    const have = peers.filter((row) => measure(row) > 0)
    const ranks = percentileMap(new Map(have.map((row) => [row.slug, measure(row)])))
    for (const row of peers) out.set(row.slug, have.length === 0 || measure(row) <= 0 ? NEUTRAL : NEUTRAL + (1 - NEUTRAL) * (ranks.get(row.slug) ?? 0))
  }
  return out
}

/**
 * §13.3 — a lineup row is a DOCUMENTED START, not a big match: it counts once, while a recorded
 * moment (a goal that decided something, a final, a European night) counts double.
 */
const bigGameMeasure = (row: RatingEvidence) => 2 * row.moments + row.lineups
/**
 * §13.4 — songs are fan legacy, not football power: one point each (was three), so a cult hero
 * stays loved without becoming artificially stronger. The captain's armband and a number kept
 * for life weigh more than a verse.
 */
const legacyMeasure = (row: RatingEvidence) => row.songs + (row.captain ? 3 : 0) + (row.numberHolding ? 1 : 0) + Math.min(3, row.shirtSeasons)

export function rateAll(rows: readonly RatingEvidence[], nudge: (slug: string) => number = () => 0): Map<string, Rated> {
  const position = (row: RatingEvidence) => row.position
  const goalsOf = (row: RatingEvidence) => row.goals * GOAL_SCALE[row.position]
  const peakOf = (row: RatingEvidence) => {
    const seasons = Math.max(1, row.seasons)
    // a keeper (and, in part, a back) is measured by how often his years ended in a title
    return row.position === 'GK' ? row.titles / seasons : (goalsOf(row) / seasons) * 3 + (row.position === 'DF' ? (row.titles / seasons) * 4 : 0)
  }

  const peak = rankWithin(rows, position, peakOf)
  const longevity = rankWithin(rows, position, (row) => Math.min(row.seasons, 16))
  const output = rankWithin(rows, position, goalsOf)
  const honours = rankWithin(rows, position, (row) => row.titles + (row.captain ? 1 : 0))
  const bigGames = densityRank(rows, bigGameMeasure)
  const legacy = densityRank(rows, legacyMeasure)

  const scored = rows.map((row) => {
    const factors: RatingFactors = {
      peak: peak.get(row.slug) ?? 0,
      longevity: longevity.get(row.slug) ?? 0,
      output: output.get(row.slug) ?? 0,
      honours: honours.get(row.slug) ?? 0,
      bigGames: bigGames.get(row.slug) ?? NEUTRAL,
      legacy: legacy.get(row.slug) ?? NEUTRAL,
    }
    const confidence = confidenceOf(row)
    const weights = { ...POSITION_WEIGHTS[row.position] }
    // sparse evidence: rate on what is always documented, never on what is merely absent
    if (confidence === 'low') {
      weights.bigGames = 0
      weights.legacy = 0
    }
    const total = (Object.keys(weights) as Array<keyof RatingFactors>).reduce((sum, key) => sum + weights[key], 0)
    const score = (Object.keys(weights) as Array<keyof RatingFactors>).reduce((sum, key) => sum + (weights[key] / total) * factors[key], 0)
    return { slug: row.slug, score, factors, confidence }
  })

  const rank = percentileMap(new Map(scored.map((row) => [row.slug, row.score])))
  const lo = Math.min(...scored.map((row) => row.score))
  const hi = Math.max(...scored.map((row) => row.score))
  const span = hi - lo || 1
  const out = new Map<string, Rated>()
  for (const row of scored) {
    const spread = 9 + 90 * (0.7 * (rank.get(row.slug) ?? 0) + 0.3 * ((row.score - lo) / span))
    out.set(row.slug, {
      slug: row.slug,
      score: row.score,
      factors: row.factors,
      confidence: row.confidence,
      rating: Math.max(9, Math.min(99, Math.round(spread + nudge(row.slug)))),
    })
  }
  return out
}
