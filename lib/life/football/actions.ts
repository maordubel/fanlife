/**
 * הפעולות — pass, shoot, tackle, and how a target is chosen.
 *
 * One button does three things by context, which is the control grammar this game already
 * settled on for the neighbourhood 2v2 and the reason it can keep a two-button arcade
 * controller for a football match. The context is not a mode: it is read off the world at
 * the moment of the press — do you have the ball, and where are you.
 *
 * **Pass target selection is the part that decides whether the game feels good.** The
 * naive version picks the nearest teammate and is unusable, because the nearest teammate
 * is usually the one you just received it from. So a candidate is scored on four things
 * and the stick is the loudest of them: how close the stick is pointing to him, how far he
 * is, whether the lane is blocked, and whether the pass goes forward. A player who pushes
 * the stick at somebody and presses A must get that man, or he stops trusting the button.
 */
import { angleDelta, clamp, dist, targetGoalX } from './pitch'
import type { BallState, Direction, PlayerState, Vec2 } from './types'
import { kickBall } from './ball'

export type PassKind = 'ground' | 'lofted'

const LANE_WIDTH = 2.1

/** Is there an opponent standing in the corridor between two points? */
export function laneBlocked(from: Vec2, to: Vec2, opponents: PlayerState[]): boolean {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const length = Math.hypot(dx, dz)
  if (length < 0.5) return false
  const ux = dx / length
  const uz = dz / length
  for (const opponent of opponents) {
    const px = opponent.p.x - from.x
    const pz = opponent.p.z - from.z
    const along = px * ux + pz * uz
    if (along <= 0.6 || along >= length - 0.4) continue
    const across = Math.abs(px * -uz + pz * ux)
    if (across < LANE_WIDTH) return true
  }
  return false
}

/**
 * Who the pass is for.
 *
 * `aim` is the stick direction as an angle, or null when the stick is centred — in which
 * case the safest forward option wins, which is what a player who just taps A expects.
 */
export function choosePassTarget(
  carrier: PlayerState,
  mates: PlayerState[],
  opponents: PlayerState[],
  aim: number | null,
  direction: Direction,
): PlayerState | null {
  let best: PlayerState | null = null
  let bestScore = -Infinity

  for (const mate of mates) {
    if (mate.id === carrier.id) continue
    const d = dist(carrier.p, mate.p)
    if (d < 2 || d > 42) continue

    const angle = Math.atan2(mate.p.z - carrier.p.z, mate.p.x - carrier.p.x)
    const offAim = aim === null ? 0 : Math.abs(angleDelta(aim, angle))
    // the stick is the loudest term on purpose: a pass that ignores where you pointed
    // is a button the player stops trusting
    if (aim !== null && offAim > 1.15) continue

    const forward = (mate.p.x - carrier.p.x) * direction
    const blocked = laneBlocked(carrier.p, mate.p, opponents)

    let score = 0
    score -= offAim * 34
    score -= Math.abs(d - 14) * 0.9
    score += clamp(forward, -20, 30) * 0.7
    if (blocked) score -= 26
    if (mate.role === 'GK') score -= 30

    if (score > bestScore) {
      bestScore = score
      best = mate
    }
  }
  return best
}

/** Pass weight: enough to arrive, never enough to run away from him. */
export function playPass(ball: BallState, from: Vec2, to: Vec2, kind: PassKind, power = 1) {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const length = Math.max(Math.hypot(dx, dz), 0.5)
  const speed = clamp(6.5 + length * 0.62, 7, 26) * power
  const lift = kind === 'lofted' ? clamp(2.6 + length * 0.16, 3, 8.5) : 0
  kickBall(ball, (dx / length) * speed, lift, (dz / length) * speed, 9)
}

/**
 * A shot.
 *
 * Aim is the goal centre bent by the stick, and the miss is a function of distance,
 * angle and how hard it was hit — not of a random roll alone. A shot that misses because
 * of a hidden dice throw feels unfair; a shot that misses because you hit it too hard
 * from thirty metres on the turn feels like football.
 */
export function playShot(
  ball: BallState,
  shooter: PlayerState,
  direction: Direction,
  aimZ: number,
  power: number,
  spray: number,
): void {
  const goalX = targetGoalX(direction)
  const targetZ = clamp(aimZ * 3.2, -3.4, 3.4)
  const dx = goalX - shooter.p.x
  const dz = targetZ - shooter.p.z
  const length = Math.max(Math.hypot(dx, dz), 1)

  const speed = 17 + power * 13
  const lift = clamp(1.1 + power * 2.4 - length * 0.035, 0.2, 6.5)

  // `spray` arrives from the caller's roller, so the same seed always produces the
  // same miss — a shot is never re-rollable by reloading
  const wobble = (spray - 0.5) * (0.03 + length * 0.0042) * (0.6 + power)
  const angle = Math.atan2(dz, dx) + wobble

  kickBall(ball, Math.cos(angle) * speed, lift, Math.sin(angle) * speed, 10)
}

/** A clearance: away from your own goal, high and long, and nobody's fault if it goes out. */
export function playClearance(ball: BallState, from: PlayerState, direction: Direction, spray: number) {
  const angle = Math.atan2((spray - 0.5) * 1.4, direction)
  kickBall(ball, Math.cos(angle) * 21, 7.5, Math.sin(angle) * 21, 10)
  void from
}

/**
 * A tackle.
 *
 * Deterministic where it can be: reach and timing decide it, and the roller only breaks a
 * near-tie. `won` means the ball came loose, not that the tackler now has it — he has to
 * pick it up like anybody else, which is what stops a tackle from feeling like a magnet.
 */
export function attemptTackle(
  tackler: PlayerState,
  carrier: PlayerState,
  ball: BallState,
  roll: number,
): boolean {
  const reach = dist(tackler.p, { x: ball.p.x, z: ball.p.z })
  if (reach > 1.6) return false

  const facing = Math.abs(angleDelta(tackler.facing, Math.atan2(carrier.p.z - tackler.p.z, carrier.p.x - tackler.p.x)))
  const chance = clamp(0.58 - reach * 0.24 - facing * 0.2, 0.04, 0.7)
  const won = roll < chance

  tackler.recover = won ? 8 : 22
  if (!won) return false

  carrier.recover = 10
  ball.ownerId = null
  ball.lockout = 4
  // knocked away from the carrier, not to the tackler
  const away = Math.atan2(ball.p.z - carrier.p.z, ball.p.x - carrier.p.x)
  ball.v.x += Math.cos(away) * 4.5
  ball.v.z += Math.sin(away) * 4.5
  return true
}
