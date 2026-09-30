/**
 * המגרש — the dimensions, and the arithmetic every other file asks instead of guessing.
 *
 * Real numbers, because a pitch that is nearly the right shape reads as wrong immediately
 * and nobody can say why: the penalty area looks small, the wingers stand too close, and
 * a cross that should be twenty-five metres is fifteen. FIFA's recommended international
 * size is 105 × 68, the goal is 7.32 × 2.44, the penalty area is 40.32 × 16.5 and the spot
 * is 11 metres out. Those five numbers fix everything else on this page.
 *
 * The origin is the centre spot. `x` runs the length, `z` the width, and a side's goal is
 * at `-HALF_LENGTH * direction`. Keeping the origin in the middle rather than in a corner
 * is what lets `mirror()` be one multiplication and lets a formation be written once.
 */
import type { Direction, Side, Vec2 } from './types'

export const LENGTH = 105
export const WIDTH = 68
export const HALF_LENGTH = LENGTH / 2
export const HALF_WIDTH = WIDTH / 2

export const GOAL_WIDTH = 7.32
export const GOAL_HALF = GOAL_WIDTH / 2
export const GOAL_HEIGHT = 2.44

export const BOX_DEPTH = 16.5
export const BOX_HALF_WIDTH = 20.16
export const SIX_DEPTH = 5.5
export const SIX_HALF_WIDTH = 9.16
export const PENALTY_SPOT = 11
export const CENTRE_RADIUS = 9.15
export const CORNER_RADIUS = 1

export const BALL_RADIUS = 0.11

/** The goal line a side defends, given the direction it attacks in. */
export function ownGoalX(direction: Direction): number {
  return -HALF_LENGTH * direction
}

/** The goal line a side attacks, given the direction it attacks in. */
export function targetGoalX(direction: Direction): number {
  return HALF_LENGTH * direction
}

export function goalCentre(direction: Direction): Vec2 {
  return { x: targetGoalX(direction), z: 0 }
}

export function insideBox(p: Vec2, direction: Direction): boolean {
  const goal = ownGoalX(direction)
  const near = Math.min(goal, goal + BOX_DEPTH * direction)
  const far = Math.max(goal, goal + BOX_DEPTH * direction)
  return p.x >= near && p.x <= far && Math.abs(p.z) <= BOX_HALF_WIDTH
}

export function insideSix(p: Vec2, direction: Direction): boolean {
  const goal = ownGoalX(direction)
  const near = Math.min(goal, goal + SIX_DEPTH * direction)
  const far = Math.max(goal, goal + SIX_DEPTH * direction)
  return p.x >= near && p.x <= far && Math.abs(p.z) <= SIX_HALF_WIDTH
}

export function onPitch(p: Vec2): boolean {
  return Math.abs(p.x) <= HALF_LENGTH && Math.abs(p.z) <= HALF_WIDTH
}

/** Clamp a position to the field of play, with a margin so a keeper is not stuck in the net. */
export function clampToPitch(p: Vec2, margin = 0): Vec2 {
  return {
    x: clamp(p.x, -HALF_LENGTH - margin, HALF_LENGTH + margin),
    z: clamp(p.z, -HALF_WIDTH - margin, HALF_WIDTH + margin),
  }
}

/** Where a corner is taken from, on the side of the pitch the ball went out. */
export function cornerSpot(attackDirection: Direction, z: number): Vec2 {
  return {
    x: (HALF_LENGTH - CORNER_RADIUS * 0.2) * attackDirection,
    z: Math.sign(z || 1) * (HALF_WIDTH - CORNER_RADIUS * 0.2),
  }
}

export function goalKickSpot(direction: Direction, z: number): Vec2 {
  return {
    x: ownGoalX(direction) + SIX_DEPTH * direction,
    z: Math.sign(z || 1) * SIX_HALF_WIDTH * 0.6,
  }
}

/** A throw is taken from where it went out, pulled just inside the line. */
export function throwSpot(p: Vec2): Vec2 {
  return {
    x: clamp(p.x, -HALF_LENGTH + 1, HALF_LENGTH - 1),
    z: Math.sign(p.z || 1) * HALF_WIDTH,
  }
}

/** Distance on the ground; the only metric anything here uses. */
export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

export function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value
}

/** Signed shortest turn from `from` to `to`, in radians. */
export function angleDelta(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2)
  if (delta > Math.PI) delta -= Math.PI * 2
  if (delta < -Math.PI) delta += Math.PI * 2
  return delta
}

export function angleTo(from: Vec2, to: Vec2): number {
  return Math.atan2(to.z - from.z, to.x - from.x)
}

/**
 * Which side is which way round, in a given period.
 *
 * Teams change ends at half time and a reconstruction that does not is a reconstruction
 * a supporter will notice in the first second. One function so every file agrees.
 */
export function directionFor(side: Side, secondHalf: boolean): Direction {
  const base: Direction = side === 'home' ? 1 : -1
  return (secondHalf ? -base : base) as Direction
}
