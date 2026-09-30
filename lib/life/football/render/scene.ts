/**
 * העולם — the pitch, the goals, the stands and the light, built from parts.
 *
 * Modular on purpose (brief §20): the ground is a composition of pitch, terraces, roof,
 * fencing, floodlights and hoardings, so a historical stadium becomes data rather than a
 * mesh somebody has to model. Bloomfield 1986 is Δ49; what is here is the generic ground
 * every preset starts from, and it is already a ground rather than a green rectangle with
 * cubes around it.
 *
 * Three details carry most of the impression and each is cheap:
 *
 *  · **The net reacts.** A vertex ripple at the impact point, decaying over about eight
 *    tenths of a second. It is the single cheapest piece of "that was a goal" in the whole
 *    engine, and its absence is why so many small football games feel like diagrams.
 *  · **There is space behind the goal.** A goal floating at the edge of a green plane
 *    reads as a technical drawing; a goal with a stand behind it reads as a match.
 *  · **The crowd is a colour field, not people.** At Δ47 the terraces are banded blocks in
 *    supporter colours with a little noise — enough that the ground is not empty, honest
 *    about being a first pass, and replaced by the instanced three-tier crowd in Δ49.
 */
import * as THREE from 'three'

import { LIFE_PALETTE } from '../../runtime/palette'
import { shadowDecal } from '../../runtime/three3d'
import {
  BALL_RADIUS,
  GOAL_HALF,
  GOAL_HEIGHT,
  HALF_LENGTH,
  HALF_WIDTH,
  LENGTH,
  WIDTH,
} from '../pitch'
import type { QualitySpec } from './quality'

export type Ground = {
  root: THREE.Group
  net: { mesh: THREE.Points; rest: Float32Array; impulse: Float32Array }[]
  ball: THREE.Mesh
}

const POST_RADIUS = 0.06
/** metres of grass outside the touchline before the barrier */
const RUN_OFF = 5

export function buildGround(
  scene: THREE.Scene,
  quality: QualitySpec,
  turf: THREE.Texture,
  lines: THREE.Texture,
  ballTexture: THREE.Texture,
  noise: (i: number) => number,
): Ground {
  const root = new THREE.Group()
  scene.add(root)

  scene.background = new THREE.Color(LIFE_PALETTE.skyDeep)
  scene.fog = new THREE.Fog(LIFE_PALETTE.skyDeep, quality.fogNear, quality.fogNear + 120)

  // --- the field ---------------------------------------------------------------------
  turf.wrapS = THREE.RepeatWrapping
  turf.wrapT = THREE.RepeatWrapping
  turf.repeat.set(3, 2)
  const field = new THREE.Mesh(
    new THREE.PlaneGeometry(LENGTH + RUN_OFF * 2, WIDTH + RUN_OFF * 2),
    new THREE.MeshLambertMaterial({ map: turf, color: LIFE_PALETTE.grass }),
  )
  field.rotation.x = -Math.PI / 2
  field.receiveShadow = quality.shadowMap
  root.add(field)

  const marks = new THREE.Mesh(
    new THREE.PlaneGeometry(LENGTH, WIDTH),
    new THREE.MeshBasicMaterial({ map: lines, transparent: true, depthWrite: false }),
  )
  marks.rotation.x = -Math.PI / 2
  marks.position.y = 0.012
  root.add(marks)

  // --- the goals ---------------------------------------------------------------------
  const net: Ground['net'] = []
  for (const side of [1, -1]) {
    const { group, points, rest } = buildGoal(quality, side)
    root.add(group)
    net.push({ mesh: points, rest, impulse: new Float32Array(rest.length) })
  }

  // --- the ground around it ------------------------------------------------------------
  root.add(buildStands(quality, noise))
  root.add(buildFloodlights())

  // --- the ball ------------------------------------------------------------------------
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, quality.ballSegments, Math.max(6, quality.ballSegments - 2)),
    new THREE.MeshLambertMaterial({ map: ballTexture }),
  )
  ball.castShadow = quality.shadowMap
  root.add(ball)
  const ballShadow = shadowDecal(BALL_RADIUS * 1.6)
  ballShadow.position.y = 0.014
  root.add(ballShadow)
  ball.userData.decal = ballShadow

  return { root, net, ball }
}

function buildGoal(quality: QualitySpec, side: number) {
  const group = new THREE.Group()
  const frame = new THREE.MeshLambertMaterial({ color: LIFE_PALETTE.chalk })
  const goalX = HALF_LENGTH * side

  const post = new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, GOAL_HEIGHT, 8)
  for (const z of [-GOAL_HALF, GOAL_HALF]) {
    const mesh = new THREE.Mesh(post, frame)
    mesh.position.set(goalX, GOAL_HEIGHT / 2, z)
    group.add(mesh)
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, GOAL_HALF * 2, 8), frame)
  bar.rotation.x = Math.PI / 2
  bar.position.set(goalX, GOAL_HEIGHT, 0)
  group.add(bar)

  /**
   * The net, as a point cloud on a grid.
   *
   * Points rather than a mesh because a net is holes: a translucent plane looks like a
   * shower curtain, and a real woven mesh is thousands of segments for something the eye
   * reads as texture. A grid of points at the string crossings reads correctly at every
   * distance the broadcast camera uses, and — crucially — every point can be MOVED, which
   * is what makes the ball hitting it visible.
   */
  const depth = 2.0
  const cols = quality.netLines
  const rows = Math.max(5, Math.round(quality.netLines * 0.6))
  const layers = 3
  const positions: number[] = []
  for (let l = 0; l < layers; l += 1) {
    const t = l / (layers - 1)
    const x = goalX + side * depth * t
    const top = GOAL_HEIGHT * (1 - t * 0.45)
    for (let c = 0; c <= cols; c += 1) {
      const z = -GOAL_HALF + (GOAL_HALF * 2 * c) / cols
      for (let r = 0; r <= rows; r += 1) {
        positions.push(x, (top * r) / rows, z)
      }
    }
  }
  const rest = new Float32Array(positions)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rest), 3))
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: LIFE_PALETTE.chalk, size: 0.055, sizeAttenuation: true, transparent: true, opacity: 0.75 }),
  )
  group.add(points)

  return { group, points, rest }
}

/**
 * Terraces on all four sides, in banded supporter colour.
 *
 * A first pass, and an honest one: real instanced people arrive in Δ49 with the stadium
 * presets. What matters at Δ47 is that the ground is enclosed — an open horizon behind a
 * goal is the single strongest signal that a football scene is a tech demo.
 */
function buildStands(quality: QualitySpec, noise: (i: number) => number): THREE.Group {
  const group = new THREE.Group()
  const concrete = new THREE.MeshBasicMaterial({ color: LIFE_PALETTE.concreteDark })
  const rows = 16
  // a real terrace is steeper than a staircase — 0.7 up to 0.8 along is about 41°, which
  // is what makes a stand read as a WALL of people from pitch level rather than as a ramp
  // of concrete seen edge-on, which is exactly how the first version photographed
  const rise = 0.7
  const tread = 0.8

  const bank = (length: number, rotation: number, distance: number, tint: number) => {
    const bankGroup = new THREE.Group()
    for (let r = 0; r < rows; r += 1) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(length, rise, tread), concrete)
      step.position.set(0, rise / 2 + r * rise, distance + r * tread)
      bankGroup.add(step)

      // the people, as a band of colour with grain in it — standing at the FRONT of the
      // step, where somebody on the pitch would see them, and tall enough to be seen over
      // the step above
      /**
       * Unlit on purpose.
       *
       * A crowd is thousands of small self-shadowing objects; a lit box standing in for
       * them lands wherever the sun happens to be and photographs as a black wall, which
       * is exactly what the first version did. Every engine that draws a crowd as an
       * impostor draws it unlit for this reason, and the four supporter colours mixed
       * toward chalk give it the pale speckle a real terrace has at this distance.
       */
      const shade = noise(r * 7)
      const crowdMaterial = new THREE.MeshBasicMaterial({
        color: mixColour(mixColour(tint, LIFE_PALETTE.crowdA, shade * 0.55), LIFE_PALETTE.concrete, 0.34),
      })
      const band = new THREE.Mesh(new THREE.BoxGeometry(length, 1.05, 0.5), crowdMaterial)
      band.position.set(0, r * rise + rise + 0.5, distance + r * tread - tread * 0.5)
      bankGroup.add(band)
    }
    // the pitch-side barrier, and the back wall that gives the stand a silhouette
    const wall = new THREE.Mesh(new THREE.BoxGeometry(length, 1.1, 0.24), concrete)
    wall.position.set(0, 0.55, distance - 0.6)
    bankGroup.add(wall)
    const back = new THREE.Mesh(new THREE.BoxGeometry(length, 2.2, 0.4), concrete)
    back.position.set(0, rows * rise + 1.1, distance + rows * tread)
    bankGroup.add(back)

    bankGroup.rotation.y = rotation
    return bankGroup
  }

  const long = LENGTH + RUN_OFF * 2
  const short = WIDTH + RUN_OFF * 2
  // the four sides differ in colour density, which is what a ground with its own
  // supporters looks like — the addressable stands (Gate 7, Gate 5) arrive with the
  // stadium presets in Δ49 and slot straight into this call
  group.add(bank(long, 0, HALF_WIDTH + RUN_OFF, LIFE_PALETTE.red))
  group.add(bank(long, Math.PI, HALF_WIDTH + RUN_OFF, LIFE_PALETTE.crowdF))
  group.add(bank(short, Math.PI / 2, HALF_LENGTH + RUN_OFF + 2, LIFE_PALETTE.crowdC))
  group.add(bank(short, -Math.PI / 2, HALF_LENGTH + RUN_OFF + 2, LIFE_PALETTE.crowdE))

  void quality
  return group
}

/**
 * Four pylons.
 *
 * They are here at Δ47 as geometry and proportion only; Bloomfield's own pylons are the
 * detail Maor cares about more than any other part of that ground, and they are drawn
 * from his references in Δ49 rather than guessed at now.
 */
function buildFloodlights(): THREE.Group {
  const group = new THREE.Group()
  const steel = new THREE.MeshLambertMaterial({ color: LIFE_PALETTE.rail })
  const lamp = new THREE.MeshBasicMaterial({ color: LIFE_PALETTE.lamp })
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 30, 6), steel)
      mast.position.set(sx * (HALF_LENGTH + 10), 15, sz * (HALF_WIDTH + 14))
      group.add(mast)
      const head = new THREE.Mesh(new THREE.BoxGeometry(6, 3.4, 0.6), lamp)
      head.position.set(sx * (HALF_LENGTH + 10), 31, sz * (HALF_WIDTH + 14))
      head.rotation.y = sx * sz > 0 ? 0.6 : -0.6
      group.add(head)
    }
  }
  return group
}

function mixColour(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff
  const ag = (a >> 8) & 0xff
  const ab = a & 0xff
  const br = (b >> 16) & 0xff
  const bg = (b >> 8) & 0xff
  const bb = b & 0xff
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  )
}

/**
 * Push the net where the ball went through it, and let it settle.
 *
 * The impulse is stored per vertex and decays; the position is rest plus impulse. That is
 * why a goal keeps rippling for most of a second after the ball has stopped, which is
 * exactly what a real net does and what makes the moment land.
 */
export function rippleNet(ground: Ground, at: { x: number; y: number; z: number }) {
  for (const net of ground.net) {
    const rest = net.rest
    for (let i = 0; i < rest.length; i += 3) {
      const dx = (rest[i] as number) - at.x
      const dy = (rest[i + 1] as number) - at.y
      const dz = (rest[i + 2] as number) - at.z
      const d = Math.hypot(dx, dy, dz)
      if (d > 2.2) continue
      const force = (1 - d / 2.2) * 0.55
      net.impulse[i] = (net.impulse[i] as number) + Math.sign(rest[i] as number) * force
      net.impulse[i + 2] = (net.impulse[i + 2] as number) + (dz / (d || 1)) * force * 0.35
    }
  }
}

export function settleNet(ground: Ground, dt: number) {
  for (const net of ground.net) {
    const attribute = net.mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    const array = attribute.array as Float32Array
    let moving = false
    for (let i = 0; i < net.rest.length; i += 1) {
      const impulse = net.impulse[i] as number
      if (Math.abs(impulse) > 0.001) moving = true
      net.impulse[i] = impulse * Math.max(0, 1 - 3.4 * dt)
      array[i] = (net.rest[i] as number) + (net.impulse[i] as number)
    }
    if (moving) attribute.needsUpdate = true
  }
}
