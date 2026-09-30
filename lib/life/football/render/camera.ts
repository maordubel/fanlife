/**
 * המצלמה — the second most important thing in the whole engine, after the input.
 *
 * A football game is won or lost on whether you can see the pass before you make it. The
 * reference frames Maor supplied all share the same composition and it is not an accident:
 * elevated, angled down about a quarter turn, the ball a little below centre, and enough
 * width that the two nearest lines of players are both on screen.
 *
 * Three rules do all the work, and each one exists because its absence is a known failure:
 *
 *  · **It follows the ball, not the player.** A camera locked to the man you control
 *    loses the ball at the exact moment it matters, and the neighbourhood 2v2 in this game
 *    already learned that on a portrait phone.
 *  · **It leads.** The look-at point is pushed along the ball's velocity, so the camera
 *    arrives where the ball is going instead of chasing where it was. Without the lead a
 *    long pass always outruns the frame.
 *  · **It is critically damped, and its zoom is clamped.** A camera that can accelerate
 *    freely swings; a zoom that reacts to every touch breathes. Both read as cheap
 *    immediately, and neither is a thing a player can name — they just feel sick.
 *
 * Portrait phones get height and width rather than a crop. Cropping a 68-metre pitch to a
 * phone's width is how a football game becomes unplayable in one orientation.
 */
import * as THREE from 'three'

import { HALF_LENGTH, HALF_WIDTH, clamp } from '../pitch'
import type { FootballState } from '../types'

export type CameraMode = 'broadcast' | 'attack' | 'setpiece' | 'replay' | 'behind-goal'

export type CameraRig = {
  mode: CameraMode
  /** the smoothed point the camera is looking at */
  focus: THREE.Vector3
  /** the smoothed camera position */
  eye: THREE.Vector3
  /** metres of pitch width the frame is trying to hold */
  spread: number
}

export function freshRig(): CameraRig {
  return {
    mode: 'broadcast',
    focus: new THREE.Vector3(0, 0, 0),
    eye: new THREE.Vector3(0, 22, 58),
    spread: 58,
  }
}

/**
 * The rig, in the numbers a real outside-broadcast position actually uses.
 *
 * A television camera at a football ground is in the main stand, about thirty metres back
 * from the touchline and twenty up — not hovering over the pitch. Both numbers matter and
 * the first attempt got them wrong in a way a screenshot showed instantly: the camera sat
 * BELOW the top of the near terrace and inside its footprint, so the frame was half sky,
 * the pitch was a strip through the middle, and the near stand cut across the horizon.
 */
const BROADCAST = {
  /** metres beyond the touchline — must clear the near terrace, which is 17m deep */
  back: 19,
  /** how far the eye is above the pitch, as a fraction of its distance from it (≈20°) */
  rake: 0.34,
  /** how sharply the rig catches up, per second */
  chase: 2.6,
  /** how far ahead of the ball the look-at is pushed, per unit of ball speed */
  lead: 0.34,
}

/**
 * Update the rig and write it into the camera.
 *
 * The framing is SOLVED rather than guessed: the rig knows how many metres of pitch it
 * wants across the frame, and the field of view is whatever puts exactly that much there
 * at the camera's distance and the viewport's aspect. That is the only way one composition
 * survives a 1440×900 desktop and a 390×844 phone — a fixed FOV gives one of them a
 * corridor and the other a map.
 */
export function updateCamera(
  camera: THREE.PerspectiveCamera,
  rig: CameraRig,
  state: FootballState,
  aspect: number,
  dt: number,
) {
  const ball = state.ball
  const lead = clamp(ball.v.x * BROADCAST.lead, -14, 14)
  const leadZ = clamp(ball.v.z * BROADCAST.lead, -10, 10)

  const wantX = clamp(ball.p.x + lead, -HALF_LENGTH + 10, HALF_LENGTH - 10)
  const wantZ = clamp((ball.p.z + leadZ) * 0.4, -HALF_WIDTH * 0.4, HALF_WIDTH * 0.4)

  // tighter in the box, wider in midfield — clamped so it never breathes
  const nearGoal = Math.max(0, 1 - (HALF_LENGTH - Math.abs(ball.p.x)) / 34)
  const wantSpread = 58 - nearGoal * 14

  const k = 1 - Math.exp(-BROADCAST.chase * dt)
  rig.focus.x += (wantX - rig.focus.x) * k
  rig.focus.z += (wantZ - rig.focus.z) * k
  rig.spread += (wantSpread - rig.spread) * k * 0.5

  const dz = HALF_WIDTH + BROADCAST.back
  const height = dz * BROADCAST.rake
  const distance = Math.hypot(dz, height)

  rig.eye.x += (rig.focus.x - rig.eye.x) * k
  rig.eye.y += (height - rig.eye.y) * k
  rig.eye.z += (rig.focus.z + dz - rig.eye.z) * k

  camera.position.copy(rig.eye)
  // the ball sits a little below the middle of the frame, as it does in every broadcast
  camera.lookAt(rig.focus.x, 0, rig.focus.z - 6)

  // solve the vertical FOV so `spread` metres fit across the frame at this aspect
  const halfWide = Math.atan(rig.spread / 2 / distance)
  const fov = (2 * Math.atan(Math.tan(halfWide) / Math.max(aspect, 0.35)) * 180) / Math.PI
  camera.fov = clamp(fov, 26, 62)
  camera.updateProjectionMatrix()
}

/**
 * Snap the rig to the ball with no easing.
 *
 * Used on the first frame and after a restart: easing in from wherever the camera happened
 * to be is a two-second swoop across the pitch that nobody asked for.
 */
export function snapCamera(rig: CameraRig, state: FootballState) {
  rig.focus.set(state.ball.p.x, 0, state.ball.p.z * 0.4)
  const dz = HALF_WIDTH + BROADCAST.back
  rig.eye.set(rig.focus.x, dz * BROADCAST.rake, rig.focus.z + dz)
}
