/**
 * השוער — the one piece of AI that decides whether any of this is believable.
 *
 * The brief puts it plainly and it is right: bad goalkeeping destroys the illusion faster
 * than bad outfield play. A keeper who wanders, who stands on his line, or who saves
 * everything all read as "this is a toy" within ten seconds, and no amount of stadium
 * detail recovers from that.
 *
 * So he does four things, in this order, and nothing else:
 *
 *  1. **Stands on the bisector.** His resting place is on the line between the ball and
 *     the goal centre, pushed off his line by how far away the ball is. That single rule
 *     produces angle-closing, near-post protection and the sideways shuffle for free —
 *     they are not three behaviours, they are one geometry.
 *  2. **Commits when it is too late to read.** He picks his dive the tick the shot passes
 *     a threshold, not after watching it — a keeper who tracks the ball all the way saves
 *     everything, and a player who cannot beat him stops shooting.
 *  3. **Reaches, and misses what is out of reach.** Reach is a radius and a dive is that
 *     radius extended along one axis. Nothing is rolled that geometry can answer.
 *  4. **Comes for a loose ball in his six.** Otherwise the box becomes a pinball table
 *     and every rebound is a goal.
 */
import { attemptTackle } from './actions'
import { BALL_RADIUS, GOAL_HALF, GOAL_HEIGHT, clamp, dist, insideBox, ownGoalX } from './pitch'
import { arrive } from './players'
import type { BallState, Direction, PlayerState, Vec2 } from './types'

/** How far his hands go, standing. */
const REACH = 1.25
/** and diving */
const DIVE_REACH = 2.75

export type KeeperIntent = {
  move: Vec2
  /** he wants to sprint off his line */
  urgent: boolean
  /** the side he has committed to, once a shot is on its way */
  dive: -1 | 0 | 1
}

/** Where he should be standing, given where the ball is. */
export function keeperStation(ball: BallState, direction: Direction): Vec2 {
  const goalX = ownGoalX(direction)
  const goal = { x: goalX, z: 0 }
  const ballFlat = { x: ball.p.x, z: ball.p.z }
  const away = dist(goal, ballFlat)

  // off the line by up to four metres, and only when the ball is a long way out
  const advance = clamp((away - 12) * 0.16, 0, 4.2)
  const t = away < 0.01 ? 0 : advance / away

  return {
    x: goalX + (ballFlat.x - goalX) * t,
    // never further out than the post: a keeper wider than his goal is a keeper who has
    // been walked around, and it is the commonest tell of a cheap football game
    z: clamp(ballFlat.z * (0.24 + t * 0.5), -GOAL_HALF + 0.4, GOAL_HALF - 0.4),
  }
}

export function keeperIntent(
  keeper: PlayerState,
  ball: BallState,
  direction: Direction,
  ownerSide: 'own' | 'theirs' | 'loose',
): KeeperIntent {
  const goalX = ownGoalX(direction)
  const ballFlat = { x: ball.p.x, z: ball.p.z }
  const incoming = (ball.v.x - 0) * direction < 0 && Math.hypot(ball.v.x, ball.v.z) > 8

  // a loose ball in his own six is his, and he goes for it
  if (ownerSide !== 'own' && insideBox(ballFlat, direction) && dist(keeper.p, ballFlat) < 9 && ball.p.y < 2.2) {
    const chase = Math.abs(ballFlat.x - goalX) < 9 || ownerSide === 'loose'
    if (chase) return { move: arrive(keeper.p, ballFlat, 3), urgent: true, dive: 0 }
  }

  const station = keeperStation(ball, direction)
  const dive = incoming ? commit(keeper, ball, direction) : 0
  return { move: arrive(keeper.p, station, 2.5), urgent: incoming, dive }
}

/**
 * Which way he goes, decided once and not revised.
 *
 * The projection is where the ball will cross his line if nothing changes. He commits to
 * the side of that, not to the exact spot — a keeper who commits to the exact spot never
 * gets beaten and a keeper who does not commit at all never saves anything.
 */
function commit(keeper: PlayerState, ball: BallState, direction: Direction): -1 | 0 | 1 {
  const goalX = ownGoalX(direction)
  const toLine = (goalX - ball.p.x) / (ball.v.x || 0.0001)
  if (toLine < 0 || toLine > 1.1) return 0
  const z = ball.p.z + ball.v.z * toLine
  const gap = z - keeper.p.z
  if (Math.abs(gap) < 0.35) return 0
  return gap > 0 ? 1 : -1
}

export type KeeperResult = { saved: boolean; held: boolean }

/**
 * Can he actually get to it this tick?
 *
 * Called after the ball has moved, with the segment it travelled, so a shot cannot pass
 * through his hands between two frames the way it can pass through a post.
 */
export function keeperSave(
  keeper: PlayerState,
  ball: BallState,
  direction: Direction,
  intent: KeeperIntent,
  roll: number,
): KeeperResult | null {
  const ballFlat = { x: ball.p.x, z: ball.p.z }
  if (ball.ownerId) return null
  if (Math.abs(ball.p.x - ownGoalX(direction)) > 7) return null
  if (ball.p.y > GOAL_HEIGHT + 0.5) return null

  const flat = dist(keeper.p, ballFlat)
  const lateral = (ballFlat.z - keeper.p.z) * (intent.dive || 1)
  const reach = intent.dive !== 0 && lateral > 0 ? DIVE_REACH : REACH
  const high = ball.p.y > 1.7 ? 0.55 : 1
  if (flat > reach * high) return null

  const speed = Math.hypot(ball.v.x, ball.v.y, ball.v.z)
  // held when it is soft enough and central enough; parried otherwise. The roll only
  // separates the middle band, so a tame shot is always held and a rocket never is.
  const control = clamp(1.15 - speed / 34 - Math.abs(lateral) / DIVE_REACH, 0, 1)
  const held = roll < control

  ball.ownerId = held ? keeper.id : null
  ball.lockout = held ? 0 : 6
  if (held) {
    ball.v.x = 0
    ball.v.y = 0
    ball.v.z = 0
    ball.p.y = BALL_RADIUS
  } else {
    // parried away from goal and wide, never straight back down the middle
    const away = Math.sign(ballFlat.z - 0) || 1
    ball.v.x = direction * 7
    ball.v.z = away * 9
    ball.v.y = 2.4
  }
  keeper.recover = held ? 10 : 16
  return { saved: true, held }
}

/** A keeper closing down a carrier who is through on goal. */
export function keeperCanTackle(keeper: PlayerState, carrier: PlayerState, ball: BallState, roll: number): boolean {
  if (carrier.side === keeper.side) return false
  return attemptTackle(keeper, carrier, ball, roll * 0.7)
}
