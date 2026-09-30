/**
 * השחקנים — how a footballer moves, and what it costs him to change his mind.
 *
 * Two decisions here carry the whole feel of the game, and both were made by watching
 * what a bad version does:
 *
 *  · **Turning is not free.** A player who can reverse at full speed in one frame slides
 *    like a mouse cursor. So acceleration is applied along the facing, the facing turns
 *    at a limited rate, and the rate is lower the faster he is going. That single
 *    coupling is what makes a sprint feel committed and a walk feel nimble, and it is why
 *    the brief's "sharp turning reduces control" needs no special case.
 *  · **Sprint is a resource, not a modifier.** Stamina drains while `run` is held and
 *    comes back while it is not. A match that lets a player hold sprint for ninety
 *    minutes has no shape, because pressing costs nothing.
 *
 * Speeds are metres per second and they are real: a footballer jogs at about 4, runs at
 * 6 and sprints at 8. Using real numbers means the pitch, the camera and the clock all
 * agree without a fudge factor, which is the only way a 105-metre pitch can feel 105
 * metres long.
 */
import { angleDelta, clamp, clampToPitch } from './pitch'
import type { PlayerState, Vec2 } from './types'

export const WALK = 2.4
export const JOG = 4.2
export const RUN = 6.1
export const SPRINT = 8.0

const ACCEL = 11
const BRAKE = 16
/** rad/s at a standstill; scaled down as speed rises */
const TURN_RATE = 7.5
const STAMINA_DRAIN = 0.11
const STAMINA_RECOVER = 0.07

/** A heading, kept inside ±π. */
export function wrapAngle(angle: number): number {
  const wrapped = angle % (Math.PI * 2)
  return wrapped > Math.PI ? wrapped - Math.PI * 2 : wrapped < -Math.PI ? wrapped + Math.PI * 2 : wrapped
}

export function speedOf(player: PlayerState): number {
  return Math.hypot(player.v.x, player.v.z)
}

/**
 * Move a player toward a desired direction at a desired speed.
 *
 * `want` is a unit-ish vector: its direction is where he is trying to go and its length
 * scales the target speed, so an analogue stick pushed halfway walks.
 */
export function drive(player: PlayerState, want: Vec2, topSpeed: number, dt: number) {
  if (player.recover > 0) {
    player.recover -= 1
    player.v.x *= 0.8
    player.v.z *= 0.8
    integrate(player, dt)
    return
  }

  const push = Math.hypot(want.x, want.z)
  const speed = speedOf(player)

  if (push < 0.02) {
    const decay = Math.max(0, 1 - (BRAKE / Math.max(speed, 1)) * dt)
    player.v.x *= decay
    player.v.z *= decay
    integrate(player, dt)
    return
  }

  const target = Math.atan2(want.z, want.x)
  // a fast player turns slowly — this one line is most of the feel
  const agility = TURN_RATE * (1 - 0.6 * clamp(speed / SPRINT, 0, 1))
  const delta = angleDelta(player.facing, target)
  // wrapped, because an unwrapped heading walks off to forty-five radians over a match
  // and every trigonometric call after that is doing arithmetic on noise
  player.facing = wrapAngle(player.facing + clamp(delta, -agility * dt, agility * dt))

  const wanted = Math.min(topSpeed, topSpeed * clamp(push, 0, 1))
  // he accelerates along where he is FACING, not along the stick: that is why a
  // hairpin turn costs momentum instead of teleporting it
  const ax = Math.cos(player.facing) * ACCEL * dt
  const az = Math.sin(player.facing) * ACCEL * dt
  player.v.x += ax
  player.v.z += az

  const now = speedOf(player)
  if (now > wanted && now > 0) {
    const scale = Math.max(wanted / now, 1 - (BRAKE / Math.max(now, 1)) * dt)
    player.v.x *= scale
    player.v.z *= scale
  }

  integrate(player, dt)
}

function integrate(player: PlayerState, dt: number) {
  const next = clampToPitch({ x: player.p.x + player.v.x * dt, z: player.p.z + player.v.z * dt }, 2)
  player.p = next
}

export function updateStamina(player: PlayerState, sprinting: boolean, dt: number) {
  const next = sprinting ? player.stamina - STAMINA_DRAIN * dt : player.stamina + STAMINA_RECOVER * dt
  player.stamina = clamp(next, 0, 1)
}

/** What this player can actually do right now, tired and all. */
export function topSpeedFor(player: PlayerState, sprinting: boolean): number {
  const base = sprinting ? SPRINT : RUN
  return base * (0.82 + 0.18 * player.stamina)
}

/** Steer toward a point; the vector `drive` wants. */
export function toward(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const length = Math.hypot(dx, dz)
  if (length < 0.001) return { x: 0, z: 0 }
  return { x: dx / length, z: dz / length }
}

/** Arrive rather than overshoot: full speed far away, easing inside `slowRadius`. */
export function arrive(from: Vec2, to: Vec2, slowRadius = 3): Vec2 {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const length = Math.hypot(dx, dz)
  if (length < 0.15) return { x: 0, z: 0 }
  const scale = Math.min(1, length / slowRadius) / length
  return { x: dx * scale, z: dz * scale }
}

/**
 * Two players cannot stand in the same place.
 *
 * A soft separation rather than a physical collision: a hard one at this scale turns a
 * crowded box into a pinball table, and the brief asks only that tackles "not feel like
 * characters walking through each other".
 */
export function separate(players: PlayerState[], dt: number) {
  const minimum = 0.72
  for (let i = 0; i < players.length; i += 1) {
    for (let j = i + 1; j < players.length; j += 1) {
      const a = players[i] as PlayerState
      const b = players[j] as PlayerState
      const dx = b.p.x - a.p.x
      const dz = b.p.z - a.p.z
      const d = Math.hypot(dx, dz)
      if (d >= minimum || d < 0.0001) continue
      const push = ((minimum - d) / 2) * Math.min(1, dt * 30)
      const nx = dx / d
      const nz = dz / d
      a.p = { x: a.p.x - nx * push, z: a.p.z - nz * push }
      b.p = { x: b.p.x + nx * push, z: b.p.z + nz * push }
    }
  }
}
