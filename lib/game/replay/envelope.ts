import {
  LANDMARKS,
  PITCH,
  UNITS_PER_METRE,
  zoneCenter,
  type LandmarkId,
  type ZoneId,
} from '@/lib/game/goal-zones'
import type { ActorKind } from './actors'
import type { ReplayAction } from './vocab'

/**
 * מעטפת אי-ודאות — the point this gate stopped claiming, and what replaced it.
 *
 * Until now a touch in שחזור השער was a ZONE, and before that it was a PIXEL. Both are the
 * same mistake at different resolutions: they state a position the archive does not hold.
 * A match report says "מ-17 מטר", "בתוך הרחבה", "אגף ימין". None of those is a coordinate,
 * and every one of them is a REGION — a different shape of region each time, which is the
 * whole of the information the source actually carries.
 *
 * So a touch is an ellipse. `x`/`y` is still the best anchor we can defend, and `rx`/`ry`
 * say how far that anchor may be wrong, in the two directions separately — because "כ-25
 * מטר מהשער" pins the DEPTH and says nothing about the bearing, while "אגף ימין" does the
 * exact opposite. One radius would have lost the difference between those two sentences,
 * which is most of what a reporter tells you about where a man was standing.
 *
 * **An honest wide envelope beats an invented precise point.** A player who puts the ball
 * anywhere the source admits is right, and the score says so. That is not leniency, it is
 * the grading reading the same evidence the record does.
 *
 * Radii are written in METRES and converted through `UNITS_PER_METRE`, because the board
 * is a diagram with a different scale on each axis. A radius typed straight into
 * normalised units would mean 24 metres across and 32 metres deep for the same number.
 */

/** A place on the board, normalised: x over the pitch's width, y over its height. */
export type ReplayPoint = { x: number; y: number }

/** A place the source admits: an anchor plus the radii of what it does not pin down. */
export type Envelope = ReplayPoint & { rx: number; ry: number }

/** One touch as the archive holds it. */
export type TruthTouch = {
  step: number
  actorHe: string
  /**
   * Whose touch it was: a Hapoel player, the other side (a keeper's parry), or nobody the
   * report names ("הכדור עבר את ההגנה"). Absent means `player` — see `./actors.ts`.
   */
  actorKind?: ActorKind
  action: ReplayAction
  origin: Envelope
  /** where the ball went. For every touch but the last, this IS the next touch's origin. */
  target: Envelope
  /** why the target sits where it does — continuity, or the goal itself */
  targetFrom: 'continuity' | 'goal'
  /** the reporter's own words for the origin, and the tier they were read as */
  positionHe: string
  precision: PrecisionId
  noteHe: string
}

/** One touch as the player built it. */
export type UserTouch = {
  actorHe: string
  action: ReplayAction
  origin: ReplayPoint
  target: ReplayPoint
}

export function normalise(point: { x: number; y: number }): ReplayPoint {
  return { x: point.x / PITCH.w, y: point.y / PITCH.h }
}

/** Semi-axes in metres → semi-axes in normalised board units, one axis at a time. */
function radii(acrossM: number, deepM: number): { rx: number; ry: number } {
  return {
    rx: (acrossM * UNITS_PER_METRE.x) / PITCH.w,
    ry: (deepM * UNITS_PER_METRE.y) / PITCH.h,
  }
}

/**
 * The tiers, and what each one is a statement ABOUT.
 *
 * `across`/`deep` are semi-axes in metres. Every number below is either a dimension the
 * Laws of the Game define (the penalty area is 40.3m × 16.5m, the goal 7.32m wide, the
 * spot 11m out) or an honest reading of how much a phrase leaves open. None of them is a
 * measurement of where a player stood, because no source in this archive measured one.
 *
 * `landmark` is set on the two tiers whose phrase names a painted place rather than a
 * region — there the anchor comes from the pitch, not from the zone the phrase was read
 * into, because the laws are more precise than our own grid.
 */
export const PRECISION = {
  /** "נקודת הפנדל" — a painted spot. The tightest thing this archive ever says. */
  spot: { across: 1.2, deep: 1.2, landmark: 'penaltySpot' as LandmarkId },
  /** "קו השער" — a keeper parrying on his line. The mouth is 7.32m; he covers it. */
  line: { across: 4, deep: 2, landmark: 'goalLine' as LandmarkId },
  /** "מ-17 מטר" — the depth is stated, the bearing is not, so it is WIDER than a flank. */
  range: { across: 11, deep: 3.5 },
  /** "כ-25 מטר, אלכסונית מצד ימין" — the depth AND a side. */
  rangeNamed: { across: 6, deep: 3.5 },
  /** "מול השוער טרמל" — one on one: close, roughly central, never measured. */
  keeper: { across: 8, deep: 5 },
  /** "מקרוב" — from close in, and nothing else. */
  close: { across: 7, deep: 5 },
  /** "בתוך הרחבה" — the penalty area's own half-dimensions. 40.3m × 16.5m. */
  box: { across: 20.15, deep: 8.25 },
  /** "צד שמאל של הרחבה, זווית קשה" — the box, with a side named. */
  boxSide: { across: 8, deep: 7 },
  /** "קצה הרחבה" — along the eighteen-yard line: depth pinned, width open. */
  boxEdge: { across: 12, deep: 5 },
  /** "אגף ימין" — a flank: narrow across, long in depth. The mirror of `range`. */
  flank: { across: 9, deep: 14 },
  /** "מרכז המגרש" — the middle of things. A region, never a point. */
  centre: { across: 14, deep: 14 },
  /** "אזור ההתקפה" — the attacking third, and not a word more. */
  third: { across: 16, deep: 14 },
  /** "מאחורי ההגנה" — a runner in behind. Vaguer than the middle, and that is the fact. */
  behind: { across: 13, deep: 12 },
  /** "חצי המגרש שלנו" — off the bottom of a board that only draws one half. */
  ownHalf: { across: 18, deep: 20 },
  /** the ball in the net. The one target in a scored goal nobody has to guess. */
  goal: { across: 5.2, deep: 2.5, landmark: 'goalMouth' as LandmarkId },
} as const

export type PrecisionId = keyof typeof PRECISION

export function precisionRadii(id: PrecisionId): { rx: number; ry: number } {
  const tier = PRECISION[id]
  return radii(tier.across, tier.deep)
}

export function landmarkOf(id: PrecisionId): LandmarkId | null {
  const tier = PRECISION[id] as { landmark?: LandmarkId }
  return tier.landmark ?? null
}

/**
 * The envelope for one touch: the anchor first, then the radii.
 *
 * The anchor is the centre of the zone the reporter's words were read into — unless the
 * tier names a landmark, in which case the laws win. That ordering is the whole of the
 * honesty argument: our grid is a reading, a painted spot is not.
 */
export function envelopeFor(zone: ZoneId, id: PrecisionId): Envelope | null {
  const landmark = landmarkOf(id)
  const anchor = landmark ? LANDMARKS[landmark] : zoneCenter(zone)
  if (!anchor) return null
  return { ...normalise(anchor), ...precisionRadii(id) }
}

/** How many envelope-radii away a point is. 1 is the rim; 0 is the anchor itself. */
export function envelopeDistance(point: ReplayPoint, envelope: Envelope): number {
  const dx = (point.x - envelope.x) / envelope.rx
  const dy = (point.y - envelope.y) / envelope.ry
  return Math.hypot(dx, dy)
}

/**
 * What a placement inside — or outside — an envelope is worth, 0–100.
 *
 * Anywhere inside the envelope scores 90 or better, because inside the envelope the
 * source does not know better than the player does. Outside it the credit falls away
 * smoothly and reaches zero at three radii, so "one envelope out" is a real answer with a
 * real cost rather than a cliff. Continuous and strictly decreasing in the distance,
 * which is what lets `tests/replay.test.ts` hold it to a property instead of to a table.
 */
export function envelopeScore(point: ReplayPoint, envelope: Envelope): number {
  const d = envelopeDistance(point, envelope)
  if (d <= 1) return 100 - 10 * d * d
  const fade = Math.max(0, 1 - (d - 1) / 2)
  return 90 * fade ** 1.5
}

export function insideEnvelope(point: ReplayPoint, envelope: Envelope): boolean {
  return envelopeDistance(point, envelope) <= 1
}

/**
 * The twelve per cent that is about PRECISION rather than about being admissible — and
 * the one design decision in this file that had to be made twice.
 *
 * The first version measured the plain distance to the anchor against a fixed reach, the
 * way the prototype does. It is the obvious implementation and it quietly breaks the
 * thing this whole module exists for: a player who lands at the rim of a WIDE envelope is
 * further from the anchor than one at the rim of a narrow one, so honesty about what the
 * source does not know cost the player more the more honest the record was. The incentive
 * ran backwards, and data follows incentives.
 *
 * So precision is the same measurement at HALF the radii — "did you find the middle half
 * of what the source admits" — which is a real skill at any envelope size and scales with
 * the envelope like everything else here. That makes the honesty claim a THEOREM rather
 * than a hope: because both terms are monotone in the radii, widening an envelope can
 * never lower any point's score, and `tests/replay.test.ts` proves it over a grid.
 */
export function halved(envelope: Envelope): Envelope {
  return { ...envelope, rx: envelope.rx / 2, ry: envelope.ry / 2 }
}

export function anchorScore(point: ReplayPoint, envelope: Envelope): number {
  return envelopeScore(point, halved(envelope))
}
