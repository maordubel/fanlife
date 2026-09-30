/**
 * החזקה — who has the ball, and what it costs to keep it.
 *
 * Possession is proximity, exactly as the neighbourhood 2v2 already decided
 * (`FootballScene`): whoever is nearest inside a small radius carries it. A dribble state
 * machine at this scale is a system to fight rather than a system to feel.
 *
 * What proximity alone does not give you is the TOUCH. A carried ball here is pushed to a
 * point slightly ahead of the carrier and then left alone to roll there, and how far ahead
 * depends on how fast he is going. Walking, the ball stays under him; sprinting, it runs
 * two metres in front and an alert defender can nick it. That is the whole risk/reward of
 * running with the ball and it costs four lines.
 *
 * `lockout` is why a pass cannot be intercepted by the man who played it: for a few ticks
 * after a kick nobody may claim the ball at all.
 */
import { BALL_RADIUS, dist } from './pitch'
import { speedOf } from './players'
import type { BallState, PlayerState, Vec2 } from './types'

/** How close a player must be to take a loose ball. */
export const CONTROL_RADIUS = 1.05
/** A keeper's hands reach further than a boot. */
export const KEEPER_RADIUS = 1.9

export function ownerOf(players: PlayerState[], ball: BallState): PlayerState | null {
  if (!ball.ownerId) return null
  return players.find((p) => p.id === ball.ownerId) ?? null
}

/**
 * Give the loose ball to whoever is closest enough to claim it.
 *
 * Airborne balls above head height are not claimable, which is what makes a lofted pass a
 * lofted pass rather than a fast one.
 */
export function claimLooseBall(players: PlayerState[], ball: BallState): PlayerState | null {
  if (ball.lockout > 0 || ball.ownerId) return null
  if (ball.p.y > 2.1) return null

  let best: PlayerState | null = null
  let bestDistance = Infinity
  for (const player of players) {
    if (player.recover > 0) continue
    const radius = player.role === 'GK' ? KEEPER_RADIUS : CONTROL_RADIUS
    const d = dist(player.p, { x: ball.p.x, z: ball.p.z })
    if (d > radius || d >= bestDistance) continue
    best = player
    bestDistance = d
  }
  if (!best) return null
  ball.ownerId = best.id
  return best
}

/** Where a carrier's next touch should put the ball. */
export function touchPoint(carrier: PlayerState): Vec2 {
  const lead = 0.55 + (speedOf(carrier) / 8) * 1.5
  return {
    x: carrier.p.x + Math.cos(carrier.facing) * lead,
    z: carrier.p.z + Math.sin(carrier.facing) * lead,
  }
}

/**
 * Move a carried ball toward the touch point.
 *
 * Not a hard snap: the ball is given a velocity toward where it should be, so it keeps
 * rolling on its own between touches and a sharp turn genuinely leaves it behind. Turn
 * hard enough at speed and `loseControl` takes it off you.
 */
export function carry(carrier: PlayerState, ball: BallState, dt: number) {
  const want = touchPoint(carrier)
  const dx = want.x - ball.p.x
  const dz = want.z - ball.p.z
  const pull = 7.5
  ball.v.x += dx * pull * dt
  ball.v.z += dz * pull * dt
  const damp = Math.max(0, 1 - 6 * dt)
  ball.v.x *= damp
  ball.v.z *= damp
  if (ball.p.y <= BALL_RADIUS + 0.01) ball.v.y = 0
}

/** A ball that has got too far from its owner is not his any more. */
export function loseControl(carrier: PlayerState, ball: BallState): boolean {
  const gap = dist(carrier.p, { x: ball.p.x, z: ball.p.z })
  const limit = 1.4 + (speedOf(carrier) / 8) * 1.3
  if (gap <= limit) return false
  ball.ownerId = null
  ball.lockout = 3
  return true
}

/** The nearest opponent to a point — the pressure a carrier is under. */
export function nearestOpponent(players: PlayerState[], to: PlayerState): PlayerState | null {
  let best: PlayerState | null = null
  let bestDistance = Infinity
  for (const player of players) {
    if (player.side === to.side) continue
    const d = dist(player.p, to.p)
    if (d >= bestDistance) continue
    best = player
    bestDistance = d
  }
  return best
}
