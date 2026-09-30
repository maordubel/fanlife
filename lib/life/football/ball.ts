/**
 * הכדור — an object with its own opinion.
 *
 * The single most common failure in a small football game is a ball glued to a foot: it
 * turns when the player turns, it stops when he stops, and every pass looks like a
 * teleport. So the ball is integrated on its own here and possession (`possession.ts`)
 * only ever NUDGES it — a carried ball is a ball being pushed a metre ahead, not a ball
 * parented to a boot.
 *
 * The physics is deliberately shallow and deliberately real in the two places a player
 * can feel: rolling friction is much stronger than air drag, so a pass along the floor
 * dies and a lofted one carries; and the bounce keeps most of the horizontal speed while
 * losing most of the vertical, which is why a dropping cross skids on rather than
 * stopping dead. Everything else — swerve, seams, wind — is left out on purpose. It costs
 * frames and no player can tell.
 */
import { BALL_RADIUS, GOAL_HALF, GOAL_HEIGHT, HALF_LENGTH, HALF_WIDTH } from './pitch'
import type { BallState, Vec3 } from './types'

export const GRAVITY = 9.81
/** per second, applied to the horizontal velocity while the ball is on the deck */
const ROLL_DAMP = 0.62
/** per second, in the air */
const AIR_DRAG = 0.06
const BOUNCE_Y = 0.52
const BOUNCE_XZ = 0.78
/** below this the ball is at rest, and a ball that never quite stops looks like a bug */
const REST_SPEED = 0.22

export function ballAtRest(ball: BallState): boolean {
  return ball.p.y <= BALL_RADIUS + 0.01 && Math.hypot(ball.v.x, ball.v.z) < REST_SPEED
}

/**
 * One fixed step of ball physics. Returns the post/bar hit, if there was one, so the
 * caller can raise the event and the renderer can ring the woodwork.
 */
export function stepBall(ball: BallState, dt: number): { hitWoodwork: boolean } {
  if (ball.lockout > 0) ball.lockout -= 1

  const airborne = ball.p.y > BALL_RADIUS + 0.001
  const damp = airborne ? AIR_DRAG : ROLL_DAMP
  const decay = Math.max(0, 1 - damp * dt)

  ball.v.x *= decay
  ball.v.z *= decay
  if (airborne) ball.v.y -= GRAVITY * dt

  const before: Vec3 = { x: ball.p.x, y: ball.p.y, z: ball.p.z }

  ball.p.x += ball.v.x * dt
  ball.p.y += ball.v.y * dt
  ball.p.z += ball.v.z * dt

  if (ball.p.y <= BALL_RADIUS) {
    ball.p.y = BALL_RADIUS
    if (ball.v.y < -0.4) {
      ball.v.y = -ball.v.y * BOUNCE_Y
      ball.v.x *= BOUNCE_XZ
      ball.v.z *= BOUNCE_XZ
    } else {
      ball.v.y = 0
    }
  }

  ball.spin *= Math.max(0, 1 - 1.4 * dt)
  if (!airborne) ball.spin = Math.hypot(ball.v.x, ball.v.z) / BALL_RADIUS

  if (ballAtRest(ball)) {
    ball.v.x = 0
    ball.v.z = 0
  }

  return { hitWoodwork: woodwork(before, ball) }
}

/**
 * Post and crossbar.
 *
 * Checked as a line crossing rather than as an overlap, because at 30 m/s and a sixtieth
 * of a second the ball moves half a metre a step and a sphere test simply misses the
 * post. If the segment crosses a goal line at a height and a width that put it on the
 * frame, the ball comes back.
 */
function woodwork(from: Vec3, ball: BallState): boolean {
  for (const goalX of [HALF_LENGTH, -HALF_LENGTH]) {
    const crossed = (from.x - goalX) * (ball.p.x - goalX) <= 0 && from.x !== ball.p.x
    if (!crossed) continue
    const t = (goalX - from.x) / (ball.p.x - from.x)
    const z = from.z + (ball.p.z - from.z) * t
    const y = from.y + (ball.p.y - from.y) * t

    const onPost = Math.abs(Math.abs(z) - GOAL_HALF) < 0.14 && y <= GOAL_HEIGHT + 0.12
    const onBar = Math.abs(y - GOAL_HEIGHT) < 0.14 && Math.abs(z) <= GOAL_HALF + 0.12
    if (!onPost && !onBar) continue

    // put it back on the field side and take the sting out of it
    ball.p.x = goalX - Math.sign(ball.p.x - from.x) * 0.3
    if (onBar) {
      ball.v.y = -Math.abs(ball.v.y) * 0.5
      ball.v.x *= -0.45
    } else {
      ball.v.z *= -0.6
      ball.v.x *= -0.5
    }
    return true
  }
  return false
}

/** Did the whole ball cross a goal line between the posts and under the bar? */
export function crossedGoalLine(from: Vec3, to: Vec3): { goalX: number } | null {
  for (const goalX of [HALF_LENGTH, -HALF_LENGTH]) {
    const crossed = (from.x - goalX) * (to.x - goalX) <= 0 && from.x !== to.x
    if (!crossed) continue
    const t = (goalX - from.x) / (to.x - from.x)
    const z = from.z + (to.z - from.z) * t
    const y = from.y + (to.y - from.y) * t
    if (Math.abs(z) < GOAL_HALF - 0.02 && y < GOAL_HEIGHT - 0.02) return { goalX }
  }
  return null
}

export function ballOutOfPlay(ball: BallState): boolean {
  return Math.abs(ball.p.z) > HALF_WIDTH + BALL_RADIUS || Math.abs(ball.p.x) > HALF_LENGTH + BALL_RADIUS
}

export function kickBall(ball: BallState, vx: number, vy: number, vz: number, lockout = 8) {
  ball.v.x = vx
  ball.v.y = vy
  ball.v.z = vz
  ball.ownerId = null
  ball.lockout = lockout
}

/**
 * Where the ball will be in `t` seconds if nobody touches it.
 *
 * A closed form rather than a re-simulation, because it is called for twenty-two players
 * every tick: rolling friction is exponential, so the distance travelled is
 * `v · (1 − e^(−d·t)) / d`. Good enough for a metre of accuracy over a second, which is
 * all an interception needs, and it is the difference between a pass that gets received
 * and a pass that rolls past everybody into touch.
 */
export function predictBall(ball: BallState, t: number): { x: number; z: number } {
  const damp = ball.p.y > BALL_RADIUS + 0.05 ? AIR_DRAG : ROLL_DAMP
  const travel = (1 - Math.exp(-damp * t)) / damp
  return { x: ball.p.x + ball.v.x * travel, z: ball.p.z + ball.v.z * travel }
}

/**
 * The point a player should run at to meet the ball.
 *
 * Four fixed-point iterations: guess how long it takes to get there, ask where the ball
 * will be then, repeat. Converges in two for anything a footballer can reach and costs
 * nothing, and running at where the ball IS — which is what the first version did — is
 * why the ball spent eighty-eight per cent of a smoke run rolling around unclaimed.
 */
export function interceptPoint(from: { x: number; z: number }, ball: BallState, speed: number): { x: number; z: number } {
  let t = 0
  for (let i = 0; i < 4; i += 1) {
    const at = predictBall(ball, t)
    t = Math.min(3, Math.hypot(at.x - from.x, at.z - from.z) / Math.max(speed, 1))
  }
  return predictBall(ball, t)
}

export function freshBall(): BallState {
  return { p: { x: 0, y: BALL_RADIUS, z: 0 }, v: { x: 0, y: 0, z: 0 }, spin: 0, ownerId: null, lockout: 0 }
}
