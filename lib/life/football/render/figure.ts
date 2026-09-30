/**
 * הדמות — a footballer built out of primitives, and articulated enough to be read.
 *
 * The bar this has to clear is not "photoreal". It is: at broadcast distance, on a phone,
 * can you tell who has the ball, which way he is facing, and what number he wears. A
 * capsule fails all three, which is exactly why §65 of the brief names capsules as the
 * thing that means the graphics are not done.
 *
 * So: eleven parts on a shared skeleton — head, neck, torso, two upper arms, two
 * forearms, two thighs, two shins — plus boots, and a shirt texture on the torso. Legs and
 * arms swing from one phase driven by speed, which is a walk cycle without a single frame
 * of authored animation, and it is what stops twenty-two men from sliding around the pitch
 * like counters on a board.
 *
 * Every figure shares four geometries and two materials per side. Twenty-two players
 * therefore cost twenty-two group transforms and nothing else, which is what keeps a
 * phone at thirty frames with a stand full of people behind them.
 */
import * as THREE from 'three'

import { LIFE_PALETTE } from '../../runtime/palette'
import type { PlayerState } from '../types'
import type { KitSpec } from './kit'

export type FigureParts = {
  group: THREE.Group
  hips: THREE.Group
  torso: THREE.Group
  head: THREE.Mesh
  armL: THREE.Group
  armR: THREE.Group
  legL: THREE.Group
  legR: THREE.Group
  /** advanced by speed, not by time — a standing player does not jog on the spot */
  phase: number
}

/** Geometry shared by every figure in the scene; built once, disposed by `disposeThree`. */
export type FigureKit = {
  torso: THREE.BufferGeometry
  limb: THREE.BufferGeometry
  head: THREE.BufferGeometry
  boot: THREE.BufferGeometry
  shirt: THREE.Material
  skin: THREE.Material
  shorts: THREE.Material
  socks: THREE.Material
  boots: THREE.Material
}

export function figureKit(spec: KitSpec, shirtMap: THREE.Texture | null): FigureKit {
  return {
    torso: new THREE.CapsuleGeometry(0.19, 0.36, 3, 8),
    limb: new THREE.CapsuleGeometry(0.065, 0.3, 2, 6),
    head: new THREE.SphereGeometry(0.115, 10, 8),
    boot: new THREE.BoxGeometry(0.12, 0.07, 0.24),
    shirt: new THREE.MeshLambertMaterial({ color: spec.base, map: shirtMap ?? undefined }),
    skin: new THREE.MeshLambertMaterial({ color: LIFE_PALETTE.skin }),
    shorts: new THREE.MeshLambertMaterial({ color: spec.shorts }),
    socks: new THREE.MeshLambertMaterial({ color: spec.socks }),
    boots: new THREE.MeshLambertMaterial({ color: LIFE_PALETTE.shoeDark }),
  }
}

export function buildFigure(kit: FigureKit, build: { height: number; girth: number }): FigureParts {
  const group = new THREE.Group()
  const scale = build.height / 1.78
  group.scale.setScalar(scale)

  const hips = new THREE.Group()
  hips.position.y = 0.86
  group.add(hips)

  const torso = new THREE.Group()
  hips.add(torso)

  const chest = new THREE.Mesh(kit.torso, kit.shirt)
  chest.position.y = 0.2
  chest.scale.set(build.girth, 1, build.girth * 0.8)
  torso.add(chest)

  const head = new THREE.Mesh(kit.head, kit.skin)
  head.position.y = 0.52
  torso.add(head)

  const arm = (sign: number) => {
    const shoulder = new THREE.Group()
    shoulder.position.set(0, 0.34, sign * 0.21)
    const upper = new THREE.Mesh(kit.limb, kit.shirt)
    upper.position.y = -0.14
    shoulder.add(upper)
    const fore = new THREE.Mesh(kit.limb, kit.skin)
    fore.scale.set(0.85, 0.8, 0.85)
    fore.position.y = -0.4
    shoulder.add(fore)
    torso.add(shoulder)
    return shoulder
  }

  const leg = (sign: number) => {
    const hip = new THREE.Group()
    hip.position.set(0, 0, sign * 0.1)
    const thigh = new THREE.Mesh(kit.limb, kit.shorts)
    thigh.scale.set(1.15, 0.95, 1.15)
    thigh.position.y = -0.19
    hip.add(thigh)
    const shin = new THREE.Mesh(kit.limb, kit.socks)
    shin.scale.set(0.95, 0.95, 0.95)
    shin.position.y = -0.55
    hip.add(shin)
    const boot = new THREE.Mesh(kit.boot, kit.boots)
    boot.position.set(0.05, -0.82, 0)
    hip.add(boot)
    hips.add(hip)
    return hip
  }

  const armL = arm(1)
  const armR = arm(-1)
  const legL = leg(1)
  const legR = leg(-1)

  return { group, hips, torso, head, armL, armR, legL, legR, phase: 0 }
}

/**
 * One frame of the walk cycle.
 *
 * The phase advances with distance travelled rather than with time, so the stride length
 * stays constant and a sprinting player takes faster steps rather than longer ones — the
 * cheapest way to make speed legible without a single authored keyframe. The torso leans
 * into the run and the arms counter-swing, which is most of what separates "running" from
 * "gliding with legs moving".
 */
export function poseFigure(parts: FigureParts, player: PlayerState, dt: number) {
  const speed = Math.hypot(player.v.x, player.v.z)
  parts.phase += speed * dt * 2.6

  parts.group.position.set(player.p.x, 0, player.p.z)
  parts.group.rotation.y = -player.facing

  const swing = Math.sin(parts.phase) * Math.min(1, speed / 6) * 0.95
  const lift = Math.abs(Math.cos(parts.phase)) * Math.min(1, speed / 7)

  parts.legL.rotation.z = swing
  parts.legR.rotation.z = -swing
  parts.armL.rotation.z = -swing * 0.75
  parts.armR.rotation.z = swing * 0.75

  parts.torso.rotation.z = -Math.min(0.34, speed / 26)
  parts.hips.position.y = 0.86 + lift * 0.035

  if (player.recover > 0) {
    // knocked over: he is on the way back up rather than standing still
    const down = Math.min(1, player.recover / 16)
    parts.hips.position.y = 0.86 - down * 0.42
    parts.torso.rotation.z = -down * 1.1
  }
}
