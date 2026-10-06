import * as THREE from 'three'
import { LIFE_PALETTE } from '@/lib/life/runtime/palette'

import { billboard, imageTexture, shadowDecal } from '@/lib/life/runtime/three3d'

/**
 * תפאורה למיניגיימים התלת־ממדיים — the world around a minigame, built out of art LIFE
 * already owns.
 *
 * The games' own pictures (goal, keeper, court, ring) stay exactly as they are. This module
 * adds only what stands around them: a backdrop cut from an existing painting, kids who
 * live in this life, a prop in front of the lens. It knows nothing about scoring or
 * physics — a card hands it a `DressConfig` (data), calls `update` once a frame, and tells
 * it what happened (`react`). One helper, two games.
 *
 * Everything that moves is a transform on a group whose origin is the figure's FEET, so a
 * kid breathing scales from the ground rather than from his belt.
 */

export type SpectatorState = 'idle' | 'anticipate' | 'celebrate' | 'mock' | 'disappointed'
export type Tier = 'mobile' | 'tablet' | 'desktop'
export type Reaction = 'goal' | 'miss' | 'aim'

const TIER_RANK: Record<Tier, number> = { mobile: 0, tablet: 1, desktop: 2 }

export function tierOf(width: number): Tier {
  if (width < 520) return 'mobile'
  if (width < 900) return 'tablet'
  return 'desktop'
}

/** how far each depth plane drifts against the lens (plan §parallax) */
export const PARALLAX = { background: 0.08, mid: 0.2, npc: 0.4, foreground: 0.7 } as const

export interface DressBackdrop {
  url: string
  /** distance behind the ground origin, height in world units, foot on the ground */
  z: number
  height: number
  /** the same painting mirrored either side, so a wide screen never runs out of picture */
  mirrorTiles: boolean
}

export interface DressProp {
  id: string
  url: string
  x: number
  z: number
  height: number
  factor: number
  /** drawn in front of every kid, so it can hide part of one */
  foreground?: boolean
  min?: Tier
}

export interface DressNpc {
  id: string
  url: string
  x: number
  z: number
  height: number
  min: Tier
  /** per-kid rhythm, so nobody breathes in step */
  phase: number
  flip?: boolean
  /** which reactions this kid answers, with what */
  lines?: Partial<Record<Reaction, readonly string[]>>
  /** how he takes a goal / a miss */
  onGoal: SpectatorState
  onMiss: SpectatorState
}

export interface DressConfig {
  backdrop: DressBackdrop
  props: readonly DressProp[]
  npcs: readonly DressNpc[]
}

export interface Say {
  text: string
  /** screen position as a fraction of the host, of the kid's head */
  x: number
  y: number
}

interface NpcRuntime {
  def: DressNpc
  group: THREE.Group
  shadow: THREE.Mesh
  baseX: number
  state: SpectatorState
  since: number
}

export interface Dressing {
  layout: (width: number) => void
  update: (now: number) => void
  react: (reaction: Reaction, now: number) => void
  /** a small puff of dust off the ground at (x, z) — the kick, and nothing else */
  puff: (x: number, z: number, now: number) => void
  dispose: () => void
}

interface DressOptions {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  config: DressConfig
  reducedMotion: boolean
  onSay?: (say: Say) => void
  /** deterministic pick, so a test (or a replay) says the same thing */
  random?: () => number
}

const SWAY = 0.32

export function dressScene(options: DressOptions): Dressing {
  const { scene, camera, config, reducedMotion, onSay } = options
  const random = options.random ?? Math.random
  const root = new THREE.Group()
  root.name = 'life-dressing'
  scene.add(root)

  // ---- backdrop: three copies, the outer two mirrored, so the seam is invisible
  const back = config.backdrop
  const backGroup = new THREE.Group()
  imageTexture(back.url, (t) => {
    const img = t.image as { width?: number; height?: number } | undefined
    if (!img?.width || !img?.height) return
    const w = back.height * (img.width / img.height)
    const tiles = back.mirrorTiles ? [-1, 0, 1] : [0]
    tiles.forEach((i, n) => {
      const mat = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, depthWrite: false })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(i === 0 ? w : -w, back.height), mat)
      mesh.position.set(i * w, back.height / 2, 0)
      mesh.renderOrder = -20
      backGroup.add(mesh)
    })
  })
  backGroup.position.set(0, 0, back.z)
  root.add(backGroup)

  // ---- props and kids
  const propRuntimes: { def: DressProp; group: THREE.Group }[] = []
  for (const def of config.props) {
    const group = new THREE.Group()
    const mesh = billboard(def.url, def.height)
    mesh.position.y = def.height / 2
    mesh.renderOrder = def.foreground ? 30 : 5
    group.add(mesh)
    group.position.set(def.x, 0, def.z)
    root.add(group)
    propRuntimes.push({ def, group })
  }

  const kids: NpcRuntime[] = config.npcs.map((def, index) => {
    const group = new THREE.Group()
    const mesh = billboard(def.url, def.height)
    mesh.position.y = def.height / 2
    // nearer kids draw over farther ones; every kid draws under a foreground prop
    mesh.renderOrder = 10 + Math.round(-def.z * 0.1) + index
    group.add(mesh)
    const shadow = shadowDecal(def.height * 0.22)
    shadow.scale.set(1, 0.55, 1)
    shadow.position.y = 0.012
    shadow.renderOrder = 2
    group.add(shadow)
    group.position.set(def.x, 0, def.z)
    root.add(group)
    return { def, group, shadow, baseX: def.x, state: 'idle' as SpectatorState, since: 0 }
  })

  function layout(width: number) {
    const tier = tierOf(width)
    for (const k of kids) k.group.visible = TIER_RANK[tier] >= TIER_RANK[k.def.min]
    for (const p of propRuntimes) p.group.visible = TIER_RANK[tier] >= TIER_RANK[p.def.min ?? 'mobile']
  }

  const head = new THREE.Vector3()
  function say(k: NpcRuntime, reaction: Reaction) {
    const pool = k.def.lines?.[reaction]
    if (!pool || pool.length === 0 || !onSay) return
    head.set(k.group.position.x, k.def.height * 1.02, k.group.position.z).project(camera)
    onSay({ text: pool[Math.floor(random() * pool.length)] ?? '', x: (head.x + 1) / 2, y: (1 - head.y) / 2 })
  }

  function react(reaction: Reaction, now: number) {
    if (reaction === 'aim') {
      for (const k of kids) {
        k.state = 'anticipate'
        k.since = now
      }
      return
    }
    // one kid answers out loud, the rest only move — a chorus would be a crowd
    const visible = kids.filter((k) => k.group.visible)
    const talkers = visible.filter((k) => k.def.lines?.[reaction]?.length)
    const chosen = talkers.length ? talkers[Math.floor(random() * talkers.length)] : null
    for (const k of kids) {
      k.state = reaction === 'goal' ? k.def.onGoal : k.def.onMiss
      k.since = now
      if (k === chosen) say(k, reaction)
    }
  }

  function update(now: number) {
    tickPuffs(now)
    const sway = reducedMotion ? 0 : Math.sin(now * 0.00042) * SWAY
    backGroup.position.x = sway * PARALLAX.background
    for (const p of propRuntimes) p.group.position.x = p.def.x + sway * p.def.factor
    for (const k of kids) {
      k.group.position.x = k.baseX + sway * PARALLAX.npc
      if (reducedMotion) {
        k.group.scale.set(1, 1, 1)
        k.group.position.y = 0
        continue
      }
      const age = now - k.since
      const wave = Math.sin(now * 0.0016 + k.def.phase)
      let sx = 1
      let sy = 1 + 0.0065 * (wave + 1) // 1.00 → 1.013 over ~4 s
      let dy = 0
      let dx = 0
      const settle = Math.min(1, age / 220)
      switch (k.state) {
        case 'anticipate':
          sy = 1.02 * settle + sy * (1 - settle)
          break
        case 'celebrate': {
          const hop = Math.max(0, Math.sin(Math.min(1, age / 520) * Math.PI))
          dy = 0.08 * hop
          sy = 1 + 0.03 * hop
          sx = sy
          break
        }
        case 'mock':
          dx = Math.sin(age * 0.03) * 0.04 * Math.max(0, 1 - age / 900)
          break
        case 'disappointed':
          sy = 1 - 0.015 * settle
          dy = -0.02 * settle
          break
        default:
          break
      }
      if ((k.state === 'celebrate' || k.state === 'mock' || k.state === 'disappointed') && age > 1500) {
        k.state = 'idle'
        k.since = now
      }
      k.group.position.x += dx
      k.group.position.y = dy
      k.group.scale.set(sx, sy, 1)
    }
  }

  // ---- dust: six flat discs that rise, widen and fade — no particles, no textures
  const PUFF_MS = 620
  const puffs: { mesh: THREE.Mesh; born: number; vx: number; vz: number }[] = []
  function puff(x: number, z: number, now: number) {
    if (reducedMotion) return
    for (let i = 0; i < 6; i += 1) {
      const mat = new THREE.MeshBasicMaterial({ color: LIFE_PALETTE.dirtDark, transparent: true, opacity: 0.4, depthWrite: false })
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.07 + random() * 0.05, 12), mat)
      mesh.userData.billboard = true
      mesh.position.set(x + (random() - 0.5) * 0.3, 0.08, z)
      mesh.renderOrder = 40
      root.add(mesh)
      puffs.push({ mesh, born: now, vx: (random() - 0.5) * 0.0006, vz: -random() * 0.0004 })
    }
  }
  function tickPuffs(now: number) {
    for (let i = puffs.length - 1; i >= 0; i -= 1) {
      const p = puffs[i]
      if (!p) continue
      const a = (now - p.born) / PUFF_MS
      if (a >= 1) {
        root.remove(p.mesh)
        p.mesh.geometry.dispose()
        ;(p.mesh.material as THREE.Material).dispose()
        puffs.splice(i, 1)
        continue
      }
      p.mesh.position.x += p.vx * 16
      p.mesh.position.y += 0.0011 * 16 * (1 - a)
      p.mesh.scale.setScalar(1 + a * 2.2)
      ;(p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - a)
    }
  }

  function dispose() {
    for (const p of puffs) {
      p.mesh.geometry.dispose()
      ;(p.mesh.material as THREE.Material).dispose()
    }
    puffs.length = 0
    scene.remove(root)
    root.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      const m = mesh.material as THREE.MeshBasicMaterial
      m.map?.dispose()
      m.dispose()
    })
  }

  layout(1200)
  return { layout, update, react, puff, dispose }
}
