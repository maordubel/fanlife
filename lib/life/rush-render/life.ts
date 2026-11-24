/**
 * LIFE · the hood — the street's small lives, drawn (`lib/life/hood/ambient.ts` says where they are and what they say).
 * A neighbour on a balcony, a cat on a wall, two old men at a board, kids and a ball, friends who meet at the corner,
 * supporters walking to the ground together, a child on somebody's shoulders, a mother with a child by the hand; and the
 * warmth of the houses: lit windows with somebody moving inside, light spilling on the pavement, the front door glowing.
 * Only DRESSES: every person is the one rig (`figure.ts`), every colour goes through the club's colour policy.
 */
import * as THREE from 'three'
import type {Level, Look} from '@/lib/life/rush/level'
import {hoodAmbient, spotAt, stepAmbient, type AmbSpot, type AmbState} from '@/lib/life/hood/ambient'
import {pose, turnTo, type FigureOptions, type Pose} from './figure'
import {isSkinned} from './human/human'

export type LifeCtx = {
  scene: THREE.Scene; keep: <T extends {dispose(): void}>(x: T) => T; level: Level; lite: boolean; night: boolean
  primary: string; secondary: string; glowTex: THREE.Texture
  lookFig: (l: Look, o?: FigureOptions) => THREE.Group; rlook: (o?: Partial<Look>) => Look
}
export type LifeDress = {
  /** `amb` is the host's own state (it knows the player's presses); without one the street runs its own */
  update(me: {x: number; z: number}, amb: AmbState | null, t: number, dt: number): AmbState
  /** where a spot's speaker's head is, for the caption */
  anchor(spot: string): {x: number; y: number; z: number} | null
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const ang = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

export function dressLife(x: LifeCtx): LifeDress {
  const {scene, keep, level, lite} = x, W = level.walk
  const own = hoodAmbient(level, lite)
  const box = keep(new THREE.BoxGeometry(1, 1, 1))
  const std = (c: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) => keep(new THREE.MeshStandardMaterial({color: c, roughness: 0.8, ...o}))
  const glow = (c: THREE.ColorRepresentation, k = 1) => keep(new THREE.MeshBasicMaterial({color: new THREE.Color(c).multiplyScalar(k), toneMapped: false}))
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, px: number, py: number, pz: number, sx = 1, sy = 1, sz = 1, parent: THREE.Object3D = scene) => { const o = new THREE.Mesh(g, m); o.scale.set(sx, sy, sz); o.position.set(px, py, pz); parent.add(o); return o }
  const far = lite ? 30 : 44
  type Fig = THREE.Group & {userData: {hy?: number}}
  const fig = (o: Partial<Look>, fo: FigureOptions = {}): Fig => { const f = x.lookFig(x.rlook({scarf: false, cap: false, ...o}), fo) as Fig; scene.add(f); return f }
  /** the head goes to the boy when he is near, and the face is glad to see him */
  const notice = (f: THREE.Object3D, me: {x: number; z: number}, near = 6.5, yaw = f.rotation.y, px = f.position.x, pz = f.position.z): Pose => {
    const d = Math.hypot(me.x - px, me.z - pz)
    if (d > near) return {}
    return {lookY: clamp(ang(Math.atan2(me.x - px, me.z - pz) - yaw), -1.15, 1.15), gaze: true, mood: 'smile', lookDown: 0.12}
  }
  type Part = {s: AmbSpot; tick(me: {x: number; z: number}, a: AmbState, t: number, dt: number, p: {x: number; z: number}, d: number): void; show(v: boolean): void; head?: () => {x: number; y: number; z: number}}
  const parts: Part[] = []
  const pool = (px: number, pz: number, sx: number, sz: number, c: string, o: number) => { const m = mesh(keep(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({map: x.glowTex, color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false})), px, 0.035, pz, sx, 1, sz); m.renderOrder = 2; return m }

  for (const s of own.spots) {
    const side = Math.sign(s.x) || 1
    if (s.kind === 'balcony') {
      const g = new THREE.Group(); scene.add(g)
      mesh(box, std('#8f8a80'), s.x, s.y - 2.0, s.z, 1.15, 0.14, 2.6, g)
      for (let i = -4; i <= 4; i++) mesh(box, std('#23262e', {metalness: 0.5}), s.x - side * 0.52, s.y - 1.45, s.z + i * 0.3, 0.04, 1.0, 0.04, g)
      mesh(box, std('#23262e', {metalness: 0.5}), s.x - side * 0.52, s.y - 0.95, s.z, 0.06, 0.06, 2.6, g)
      const door = mesh(keep(new THREE.PlaneGeometry(1.3, 2.1)), glow('#d98442', x.night ? 0.9 : 0.6), s.x + side * 0.5, s.y - 0.9, s.z, 1, 1, 1, g); door.rotation.y = -side * Math.PI / 2
      for (const dz of [-0.9, 0.9]) mesh(box, std('#6a4a36'), s.x + side * 0.38, s.y - 1.7, s.z + dz, 0.3, 0.32, 0.3, g)
      const f = fig({kit: false, beard: false}, {female: true, hairStyle: 'bun', noBlob: true, top: '#7a5a5e', cast: 'grandmother'}); f.position.set(s.x - side * 0.12, s.y - 1.93, s.z); f.rotation.y = s.face
      parts.push({s, show: v => { g.visible = f.visible = v }, head: () => ({x: f.position.x, y: s.y - 0.1, z: s.z}),
        tick(me, a, t, dt) { const n = a.noticed[s.id], since = n === undefined ? 99 : a.t - n; turnTo(f, Math.atan2(me.x - f.position.x, me.z - f.position.z) * (since < 30 ? 1 : 0) + (since < 30 ? 0 : s.face), dt, 3, 2)
          pose(f, {speed: 0, gesture: since < 4.5 ? 'wave' : null, mood: since < 30 ? 'smile' : 'warm', bend: 0.22, lookDown: since < 30 ? 0.45 : 0.2, gaze: since < 30, speak: a.captions.some(c => c.spot === s.id) ? 1 : 0}, t, dt) }})
    } else if (s.kind === 'cat') {
      const g = new THREE.Group(); g.position.set(s.x, 0, s.z); scene.add(g)
      mesh(box, std('#8a8378', {roughness: 0.95}), 0, 0.5, 0, 0.5, 1.0, 2.4, g); mesh(box, std('#a39c90'), 0, 1.02, 0, 0.6, 0.06, 2.5, g)
      const fur = std('#5d5852', {roughness: 0.95}), cat = new THREE.Group(); cat.position.set(0, 1.05, 0.3); cat.rotation.y = s.face; g.add(cat)
      const body = mesh(keep(new THREE.CapsuleGeometry(0.085, 0.16, 4, 10)), fur, 0, 0.13, 0, 1, 1.15, 1.1, cat); body.rotation.x = 0.35
      const head = new THREE.Group(); head.position.set(0, 0.3, 0.07); cat.add(head)
      mesh(keep(new THREE.SphereGeometry(0.07, 12, 10)), fur, 0, 0, 0, 1.1, 0.95, 1, head)
      for (const e of [-1, 1]) { mesh(keep(new THREE.ConeGeometry(0.025, 0.05, 6)), fur, e * 0.04, 0.068, 0, 1, 1, 1, head); mesh(keep(new THREE.SphereGeometry(0.011, 6, 6)), glow('#cfe6c0', 1.2), e * 0.028, 0.012, 0.062, 1, 1, 1, head) }
      const tail = new THREE.Group(); tail.position.set(0, 0.06, -0.12); cat.add(tail); mesh(keep(new THREE.CapsuleGeometry(0.018, 0.22, 3, 6).translate(0, 0.12, 0)), fur, 0, 0, 0, 1, 1, 1, tail)
      parts.push({s, show: v => { g.visible = v }, tick(me, _a, t, _dt, _p, d) { const want = d < 7 ? clamp(ang(Math.atan2(me.x - s.x, me.z - s.z) - s.face), -1.3, 1.3) : Math.sin(t * 0.3) * 0.5; head.rotation.y += (want - head.rotation.y) * 0.06; head.rotation.z = Math.sin(t * 0.7) * 0.06; tail.rotation.x = -1.2 + Math.sin(t * 1.9) * 0.25; tail.rotation.z = Math.sin(t * 2.7) * 0.5 * (0.4 + 0.6 * Math.max(0, Math.sin(t * 0.37))); body.scale.z = 1.1 + Math.sin(t * 2.4) * 0.02 }})
    } else if (s.kind === 'table') {
      const g = new THREE.Group(); g.position.set(s.x, 0, s.z); scene.add(g)
      mesh(box, std('#5a4634'), 0, 0.74, 0, 0.66, 0.04, 0.66, g); mesh(box, std('#2b2620'), 0, 0.37, 0, 0.07, 0.72, 0.07, g)
      mesh(box, std('#3a2a20'), 0, 0.775, 0, 0.46, 0.03, 0.34, g); for (let i = -2; i <= 2; i++) mesh(box, std('#d8cdb8'), i * 0.08, 0.792, 0, 0.03, 0.004, 0.28, g)
      for (const dz of [-0.62, 0.62]) mesh(keep(new THREE.CylinderGeometry(0.17, 0.15, 0.48, 12)), std('#6b5a48'), 0, 0.24, dz, 1, 1, 1, g)
      pool(s.x, s.z, 4.2, 4.2, '#ffb070', x.night ? 0.3 : 0.1)
      const men = [-1, 1].map((dz, i) => { const f = fig({beard: i === 0, cap: i === 1, kit: false, grey: true}, {hairStyle: i ? 'short' : 'bald', longSleeves: true, noBlob: true, glasses: i === 0, cast: i ? 'father_heavy' : 'grandfather'}); f.position.set(s.x, 0, s.z + dz * 0.62); f.rotation.y = dz < 0 ? 0 : Math.PI; return f })
      parts.push({s, show: v => { g.visible = v; men.forEach(m => { m.visible = v }) }, head: () => ({x: s.x, y: 1.55, z: s.z}),
        tick(me, a, t, dt, _p, d) { const talks = a.captions.some(c => c.spot === s.id), who = (a.count[s.id] ?? 0) % 2
          men.forEach((f, i) => { const turn = d < 5 && Math.sin(t * 0.5 + i * 2) > 0.2 ? notice(f, me, 5) : {}
            pose(f, {speed: 0, sit: true, gesture: talks && who === i ? 'laugh' : 'play', gestureYaw: i * 2.6, mood: talks ? 'laugh' : i ? 'warm' : 'neutral', speak: talks && who !== i ? 1 : 0, ...turn}, t, dt) }) }})
    } else if (s.kind === 'kids') {
      const n = lite ? 2 : 3
      const kids = Array.from({length: n}, (_, i) => { const f = fig({kit: true, scarf: i === 1, size: 0.7 + i * 0.05}, {child: true, hairStyle: i === 2 ? 'curly' : 'short', female: i === 1, cast: i === 1 ? 'girl' : 'boy'}); f.position.set(s.x + [0, 0.5, -0.2][i]!, 0, s.z + [0, -1.5, 1.4][i]!); f.rotation.y = s.face; return f })
      const ballM = std('#f1eee6', {roughness: 0.5}), ball = mesh(keep(new THREE.IcosahedronGeometry(0.11, 1)), ballM, s.x, 0.11, s.z); ball.castShadow = !lite
      mesh(keep(new THREE.IcosahedronGeometry(0.112, 0)), keep(new THREE.MeshStandardMaterial({color: '#23262e', wireframe: true})), 0, 0, 0, 1, 1, 1, ball)
      let lx = s.x, lz = s.z
      parts.push({s, show: v => { kids.forEach(k => { k.visible = v }); ball.visible = v }, head: () => ({x: kids[0]!.position.x, y: 1.55, z: kids[0]!.position.z}),
        tick(me, a, t, dt) { const b = a.ball; if (!b) return
          const roll = Math.hypot(b.x - lx, b.z - lz); ball.position.set(b.x, 0.11 + (b.state === 'play' ? Math.abs(Math.sin((b.x - b.homeX) * 4)) * 0.05 : 0), b.z); ball.rotation.x += roll * 8; ball.rotation.z += roll * 3; lx = b.x; lz = b.z
          const mine = b.state === 'pass' || b.state === 'yours', cheer = a.t - a.kickAt < 1.8, home = Math.abs(b.x - b.homeX) < 0.28 && b.state === 'play'
          kids.forEach((f, i) => { turnTo(f, mine || cheer ? Math.atan2(me.x - f.position.x, me.z - f.position.z) : i === 0 ? s.face : Math.atan2(b.x - f.position.x, b.z - f.position.z), dt, 5, 5)
            pose(f, {speed: 0, joy: 0.9, mood: cheer ? 'laugh' : mine ? 'smile' : 'warm', gesture: cheer ? 'cheer' : mine && i === 0 ? 'wave' : i === 0 && home ? 'kick' : null, speak: i === 0 && a.captions.some(c => c.spot === s.id) ? 1 : 0, gaze: mine, lookDown: mine ? 0 : 0.2}, t + i * 1.7, dt) }) }})
    } else if (s.kind === 'hug') {
      const A = fig({kit: true, scarf: true}), B = fig({kit: true, scarf: true, cap: true}); A.position.set(s.x, 0, s.z)
      parts.push({s, show: v => { A.visible = B.visible = v }, head: () => ({x: s.x, y: 1.85, z: s.z + 0.3}),
        tick(me, a, t, dt) { const n = a.noticed[s.id], q = n === undefined ? -1 : a.t - n
          const gap = q < 0 ? 3.2 : q < 2.2 ? 3.2 - (q / 2.2) * 2.7 : q < 5.4 ? 0.5 : q < 6.2 ? 0.5 + (q - 5.4) * 0.6 : 0.98
          B.position.set(s.x + 0.1, 0, s.z + gap); B.rotation.y = Math.PI; A.rotation.y = q < 0 ? 0.6 : 0
          const hug = q > 2.0 && q < 5.2, after = q >= 5.2, turn = Math.sin(t * 0.8) > 0
          pose(A, {speed: 0, mood: q < 0 ? 'neutral' : hug ? 'laugh' : 'smile', gesture: hug ? 'hug' : q >= 0 && q < 2 ? 'wave' : after && turn ? 'open' : null, speak: after && turn ? 1 : 0, gaze: q >= 0, ...(after && !turn ? notice(A, me, 5) : {})}, t, dt)
          pose(B, {speed: q >= 0 && q < 2.2 ? 1.25 : 0, mood: q < 0 ? 'neutral' : hug ? 'laugh' : 'smile', gesture: hug ? 'hug' : after && !turn ? 'open' : null, speak: after && !turn ? 1 : 0, gaze: q >= 0}, t, dt) }})
    } else if (s.kind === 'pair' || s.kind === 'trio') {
      const n = s.kind === 'trio' ? 3 : 2
      const fs = Array.from({length: n}, (_, i) => fig({kit: i !== 1 || n === 3, scarf: true, cap: i === 2}))
      parts.push({s, show: v => { fs.forEach(f => { f.visible = v }) }, head: () => ({x: fs[0]!.position.x, y: 1.85, z: fs[0]!.position.z}),
        tick(me, a, t, dt, p) { const who = Math.floor(t / 3.4) % n, said = a.captions.some(c => c.spot === s.id)
          fs.forEach((f, i) => { const ox = i * 0.78 * -side, oz = [0, 0.35, -0.3][i]!; f.position.set(p.x + ox, 0, p.z + oz); f.rotation.y = Math.PI
            const mate = fs[who]!, to = i === who ? (i === 0 ? 1 : 0) : who, other = fs[to] ?? mate, ly = clamp(ang(Math.atan2(other.position.x - f.position.x, other.position.z - f.position.z - 1.2) - Math.PI), -0.75, 0.75)
            const nt = notice(f, me, 4.5)
            pose(f, {speed: s.v, mood: said ? 'laugh' : 'smile', gesture: i === who ? (s.kind === 'trio' && Math.sin(t * 0.4) > 0.7 ? 'cheer' : 'open') : null, speak: i === who ? 1 : 0, lookY: ly, ...(i !== who ? nt : {})}, t, dt) }) }})
    } else if (s.kind === 'shoulders') {
      const dad = fig({kit: true, scarf: true, beard: true, size: 1.06}), mum = fig({kit: false, scarf: true}, {female: true, hairStyle: 'long'})
      const kid = x.lookFig(x.rlook({kit: true, scarf: true, cap: false, size: 1}), {child: true, noBlob: true, scale: 0.5}); (dad.userData as {J: Record<string, THREE.Object3D>}).J.chest!.add(kid); kid.position.set(0, 0.2, -0.04)
      const place = () => { if (isSkinned(kid) && isSkinned(dad)) kid.position.set(0, 0.04, 0.05); else kid.position.set(0, 0.2, -0.04) }
      parts.push({s, show: v => { dad.visible = mum.visible = v }, head: () => ({x: dad.position.x, y: 2.5, z: dad.position.z}),
        tick(me, a, t, dt, p) { place(); dad.position.set(p.x, 0, p.z); dad.rotation.y = Math.PI; mum.position.set(p.x - side * 0.85, 0, p.z + 0.2); mum.rotation.y = Math.PI
          const said = a.captions.some(c => c.spot === s.id)
          pose(dad, {speed: s.v, gesture: 'carryKid', mood: 'smile', speak: said ? 1 : 0, ...notice(dad, me, 4.5)}, t, dt)
          pose(kid, {speed: 0, ride: true, mood: 'laugh', gesture: Math.sin(t * 0.5) > 0.5 ? 'cheer' : null, lookY: Math.sin(t * 0.6) * 0.5, joy: 1}, t, dt)
          pose(mum, {speed: s.v, mood: 'smile', lookY: side * 0.6, lookDown: -0.22, gesture: Math.sin(t * 0.33) > 0.6 ? 'open' : null}, t, dt) }})
    } else if (s.kind === 'mother') {
      const mum = fig({kit: false, scarf: true}, {female: true, hairStyle: 'long', top: '#6a5560'}), kid = fig({kit: true, scarf: true, size: 0.62}, {child: true})
      parts.push({s, show: v => { mum.visible = kid.visible = v }, head: () => ({x: mum.position.x, y: 1.85, z: mum.position.z}),
        tick(me, a, t, dt, p) { mum.position.set(p.x, 0, p.z); mum.rotation.y = Math.PI; // hand in hand: the captured pair walk puts the child 52 cm to her right and 4 cm ahead, so their hands meet
          const paired = isSkinned(kid) && isSkinned(mum)
          kid.position.set(p.x + (paired ? 0.52 : 0.5), 0, p.z + (paired ? -0.04 : 0.05 + Math.sin(t * 0.9) * 0.06)); kid.rotation.y = Math.PI + (paired ? 0 : Math.sin(t * 0.7) * 0.12)
          const said = a.captions.some(c => c.spot === s.id), up = Math.sin(t * 0.45) > 0.3
          pose(mum, {speed: s.v, gesture: 'hold', mood: 'warm', lookY: said || up ? -0.7 : 0, lookDown: said || up ? 0.4 : 0, speak: said ? 1 : 0}, t, dt)
          pose(kid, {speed: s.v, gesture: 'held', mood: 'smile', joy: 0.8, ...(up ? {lookY: 0.8, lookDown: -0.45} : notice(kid, me, 5))}, t, dt) }})
    }
  }

  /* warmth: lit ground-floor windows with somebody moving inside, their light on the pavement; the front door glowing */
  const sil = keep(new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = 64; c.height = 96; const g = c.getContext('2d')!; g.fillStyle = 'rgba(40,24,16,.88)'; g.beginPath(); g.arc(32, 26, 13, 0, 7); g.fill(); g.beginPath(); g.moveTo(8, 96); g.quadraticCurveTo(8, 44, 32, 42); g.quadraticCurveTo(56, 44, 56, 96); g.fill(); return c })()))
  type Win = {z: number; side: number; fig: THREE.Mesh; pool: THREE.Mesh; ph: number}
  const wins: Win[] = []
  const hood = level.hood!
  const winZ: [number, number][] = [[-1, 3.2], [-1, -9], [1, -5], [1, -20], [-1, -27], [1, -38], [-1, -46]]
  for (const [side, z] of winZ.slice(0, lite ? 4 : 7)) {
    if (level.crossings.some(c => Math.abs(z - c) < 10) || Math.abs(z - hood.kiosk.z) < 4 && side < 0) continue
    const wx = side * (W - 0.03), g = new THREE.Group(); g.position.set(wx, 1.75, z); g.rotation.y = -side * Math.PI / 2; scene.add(g)
    mesh(box, std('#3a2f28'), 0, 0, -0.02, 1.9, 1.6, 0.08, g)
    mesh(keep(new THREE.PlaneGeometry(1.7, 1.4)), glow('#d98442', x.night ? 0.9 : 0.55), 0, 0, 0.03, 1, 1, 1, g)
    const person = mesh(keep(new THREE.PlaneGeometry(0.8, 1.2)), keep(new THREE.MeshBasicMaterial({map: sil, transparent: true, depthWrite: false})), 0, -0.1, 0.04, 1, 1, 1, g)
    mesh(box, std('#3a2f28'), 0, 0, 0.05, 0.05, 1.4, 0.03, g); mesh(box, std('#3a2f28'), 0, 0.2, 0.05, 1.7, 0.05, 0.03, g); mesh(box, std('#8f8a80'), 0, -0.78, 0.08, 2.0, 0.08, 0.2, g)
    wins.push({z, side, fig: person, pool: pool(side * (W - 1.9), z, 3.6, 3.0, '#ffb878', x.night ? 0.42 : 0.12), ph: wins.length * 2.1})
  }
  // the front door: light through the glass, light on the step and the pavement — home is the warmest place on the street
  { const d = hood.door
    const pane = mesh(keep(new THREE.PlaneGeometry(0.62, 1.15)), glow('#c8703a', x.night ? 0.85 : 0.55), d.x + 0.1, 1.5, d.z); pane.rotation.y = Math.PI / 2
    const halo = mesh(keep(new THREE.PlaneGeometry(3.4, 3.8)), keep(new THREE.MeshBasicMaterial({map: x.glowTex, color: '#ffb070', transparent: true, opacity: x.night ? 0.16 : 0.06, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false})), d.x + 0.14, 1.5, d.z); halo.rotation.y = Math.PI / 2
    pool(d.x + 2.2, d.z, 5.2, 4.2, '#ffb070', x.night ? 0.55 : 0.14) }

  let lastAmb: AmbState = own
  return {
    update(me, amb, t, dt) {
      const a = amb ?? own
      if (!amb && dt > 0) stepAmbient(own, me, false, dt)
      lastAmb = a
      for (const part of parts) {
        const s = a.spots.find(q => q.id === part.s.id) ?? part.s, p = spotAt(s, a.t), d = Math.hypot(p.x - me.x, p.z - me.z)
        const on = d < far; part.show(on)
        if (on) part.tick(me, a, t, dt, p, d)
      }
      for (const w of wins) { const u = Math.sin(t * 0.21 + w.ph), in_ = Math.sin(t * 0.09 + w.ph * 1.7) > -0.3; w.fig.position.x = u * 0.5; w.fig.visible = in_; w.fig.scale.x = Math.cos(t * 0.21 + w.ph) > 0 ? 1 : -1; (w.pool.material as THREE.MeshBasicMaterial).opacity = (x.night ? 0.42 : 0.12) * (in_ ? 0.82 + Math.abs(u) * 0.18 : 1) }
      return a
    },
    anchor(spot) {
      const part = parts.find(q => q.s.id === spot)
      if (part?.head) return part.head()
      const s = lastAmb.spots.find(q => q.id === spot); if (!s) return null
      const p = spotAt(s, lastAmb.t); return {x: p.x, y: s.y, z: p.z}
    },
  }
}
