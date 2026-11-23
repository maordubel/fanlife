/**
 * LIFE · the hood — what the open neighbourhood adds to RUSH's street picture: the front door, the kiosk stall (Athens
 * keeps the periptero `city.ts` already builds), the school gate, the small pitch, and the named people standing in the world.
 * It only DRESSES (the level says where everything is). Every colour goes through the club's colour policy.
 */
import * as THREE from 'three'
import type {VoxelSkin} from '@/lib/life/universal/skin'
import type {Level, Look} from '@/lib/life/rush/level'
import type {Sim} from '@/lib/life/rush/sim'
import {hoodWord} from '@/lib/life/hood/words'
import type {AmbState} from '@/lib/life/hood/ambient'
import {lookAt, pose, turnTo, type FigureData, type Gesture, type Mood} from './figure'

/** a conversation as the picture plays it: who speaks, with what face and hands, and how long this line has been on */
export type TalkDir = {who: string; mood?: Mood; gesture?: Gesture | null; you?: Mood; shot?: 'two' | 'close'; beat?: 'scarf' | null; speak: number; tt: number}
export type HoodDress = {
  /** returns where the face of whoever is being talked to is (for the camera), or null */
  update(sim: Sim, view: {hood?: {job: 'idle' | 'active' | 'done'}}, t: number, dt: number, talk: TalkDir | null, amb: AmbState | null, child: boolean): {x: number; y: number; z: number} | null
}
export type HoodCtx = {
  scene: THREE.Scene; keep: <T extends {dispose(): void}>(x: T) => T; level: Level; skin: VoxelSkin; night: boolean; lite?: boolean
  banned: (hex: string) => boolean; tint: THREE.Color
  person: (l: Look) => THREE.Group
  sign: (text: string, bg: string, fg: string, w?: number, h?: number) => THREE.Texture
}

export function dressHood(x: HoodCtx): HoodDress {
  const {scene, keep, level, skin, night} = x, hood = level.hood!
  const box = keep(new THREE.BoxGeometry(1, 1, 1))
  const std = (c: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) => keep(new THREE.MeshStandardMaterial({color: c, roughness: 0.8, ...o}))
  const ok = (hex: string, fb: string) => x.banned(hex) ? fb : hex
  const add = (m: THREE.Object3D) => { scene.add(m); return m }
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, px: number, py: number, pz: number, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(g, m); o.scale.set(sx, sy, sz); o.position.set(px, py, pz); o.castShadow = false; return add(o) as THREE.Mesh }
  const W = level.walk

  /* the front door: on the facade of the home block, a step, the number plate, a lit fanlight */
  { const d = hood.door
    mesh(box, std(ok(skin.p, '#6b6f78')), d.x - 0.02, 1.2, d.z, 0.16, 2.5, 1.5)
    mesh(box, std('#2a1d16'), d.x + 0.06, 1.1, d.z, 0.06, 2.2, 1.1)
    mesh(box, std('#8f8a80'), d.x + 0.5, 0.1, d.z, 1.2, 0.2, 1.7)
    const fan = mesh(keep(new THREE.PlaneGeometry(1.0, 0.4)), keep(new THREE.MeshBasicMaterial({color: new THREE.Color('#ffd9a0').multiplyScalar(night ? 1.6 : 0.8), toneMapped: false})), d.x + 0.1, 2.45, d.z)
    fan.rotation.y = Math.PI / 2
    const pl = mesh(keep(new THREE.PlaneGeometry(0.4, 0.28)), keep(new THREE.MeshBasicMaterial({map: x.sign('27', '#1b1e26', '#f3efe6', 128, 96), toneMapped: false})), d.x + 0.12, 1.8, d.z + 1.1)
    pl.rotation.y = Math.PI / 2
    if (night && !x.lite) { const l = new THREE.PointLight('#ffd6a8', 18, 9, 1.6); l.position.set(d.x + 1.6, 2.4, d.z); add(l) } }

  /* the kiosk stall (a periptero is already there in Athens) */
  if (skin.town !== 'ath') { const k = hood.kiosk
    mesh(box, std(ok(skin.p, '#4a505c')), k.x, 1.2, k.z, 1.8, 2.4, 2.6)
    mesh(box, std('#e9e4da'), k.x, 2.5, k.z, 2.3, 0.18, 3.1)
    const shelf = mesh(keep(new THREE.PlaneGeometry(2.4, 1.5)), keep(new THREE.MeshBasicMaterial({color: new THREE.Color('#ffcf9e').multiplyScalar(night ? 1.1 : 0.7), toneMapped: false})), k.x + 0.92, 1.25, k.z); shelf.rotation.y = Math.PI / 2
    const sg = mesh(keep(new THREE.PlaneGeometry(2.6, 0.6)), keep(new THREE.MeshBasicMaterial({map: x.sign((skin.strings.kiosk ?? hoodWord('hood.who.kiosk')).toUpperCase(), '#1b1e26', '#f3efe6'), toneMapped: false})), k.x + 0.95, 2.85, k.z); sg.rotation.y = Math.PI / 2
    if (night && !x.lite) { const l = new THREE.PointLight('#ffd6a8', 22, 8, 1.6); l.position.set(k.x + 1.8, 1.8, k.z); add(l) } }

  /* the school gate: two piers, an arch with the word over it, railings along the wall */
  { const s = hood.school, zf = s.z + 0.2
    for (const dx of [-2.2, 2.2]) mesh(box, std('#8f8a80'), s.x + dx, 1.6, zf, 0.7, 3.2, 0.7)
    mesh(box, std('#2b2f3a'), s.x, 3.3, zf, 5.1, 0.25, 0.4)
    for (let i = -6; i <= 6; i++) mesh(box, std('#2b2f3a'), s.x + i * 0.3, 0.9, zf + 0.05, 0.05, 1.8, 0.05)
    mesh(keep(new THREE.PlaneGeometry(4, 0.8)), keep(new THREE.MeshBasicMaterial({map: x.sign((skin.strings.school ?? hoodWord('hood.place.school')).toUpperCase(), ok(skin.p, '#2c4d8a'), '#f3efe6'), toneMapped: false})), s.x, 3.9, zf + 0.25)
    for (const sd of [-1, 1]) for (let i = 0; i < 14; i++) mesh(box, std('#2b2f3a'), s.x + sd * (3.4 + i * 0.4), 0.8, zf + 0.05, 0.04, 1.6, 0.04) }

  /* the pitch at the end of the side street: lines and two small goals, a hard surface (never a rival's green) */
  { const p = hood.pitch, green = ok('#2f5a2c', '#4a4f58')
    mesh(keep(new THREE.PlaneGeometry(p.w, p.d).rotateX(-Math.PI / 2)), std(green, {roughness: 0.95}), p.x, 0.02, p.z)
    const line = std('#e8e3d8', {roughness: 0.6})
    mesh(box, line, p.x, 0.03, p.z, p.w - 0.6, 0.01, 0.1); mesh(box, line, p.x, 0.03, p.z - p.d / 2 + 0.3, p.w - 0.6, 0.01, 0.1); mesh(box, line, p.x, 0.03, p.z + p.d / 2 - 0.3, p.w - 0.6, 0.01, 0.1)
    mesh(box, line, p.x - p.w / 2 + 0.3, 0.03, p.z, 0.1, 0.01, p.d - 0.6); mesh(box, line, p.x + p.w / 2 - 0.3, 0.03, p.z, 0.1, 0.01, p.d - 0.6)
    mesh(keep(new THREE.RingGeometry(1.7, 1.8, 28).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({color: '#e8e3d8'})), p.x, 0.035, p.z)
    for (const sd of [-1, 1]) { const gx = p.x + sd * (p.w / 2 - 0.2)
      mesh(box, std('#d0cbc0'), gx, 1.0, p.z - 1.3, 0.1, 2.0, 0.1); mesh(box, std('#d0cbc0'), gx, 1.0, p.z + 1.3, 0.1, 2.0, 0.1); mesh(box, std('#d0cbc0'), gx, 2.0, p.z, 0.1, 0.1, 2.7) } }

  /* the people: named, solid in the sim. Each sees the boy coming, turns to him, and — in a conversation he started — comes
     a step nearer, bends to him if he is small, and says the line with his face and his hands (`talk.ts` → `feelOf`). */
  const figs = hood.people.map(p => { const f = x.person(p.look); f.position.set(p.x, 0, p.z); f.rotation.y = Math.atan2(level.start.x - p.x, level.start.z - p.z); scene.add(f); return {p, f, ox: 0, oz: 0} })
  const mark = new THREE.Mesh(keep(new THREE.OctahedronGeometry(0.17, 0)), keep(new THREE.MeshBasicMaterial({color: x.tint.clone().multiplyScalar(2), toneMapped: false}))); scene.add(mark)
  // the scarf in Dad's hands, before it goes round the boy's neck
  const scarfMat = std(ok(skin.p, '#6b6f78'), {roughness: 0.9}), held = new THREE.Group(); held.visible = false; scene.add(held)
  const bar = new THREE.Mesh(box, scarfMat); held.add(bar)
  const tails = [0, 1].map(() => { const m = new THREE.Mesh(box, scarfMat); scene.add(m); m.visible = false; return m })
  const wl = new THREE.Vector3(), wr = new THREE.Vector3()
  void W

  return {
    update(sim, view, t, dt, talk, amb, child) {
      const job = view.hood?.job ?? 'idle'
      const j = hood.jobs[0]!
      let live: string | null = job === 'idle' ? j.giver : null
      const st = job === 'active' ? level.steps[sim.step] : null
      if (st?.kind === 'talk') live = hood.people.find(p => Math.hypot(p.x - st.x, p.z - st.z) < 0.5)?.id ?? null
      let faceAt: {x: number; y: number; z: number} | null = null
      held.visible = false; tails.forEach(m => { m.visible = false })
      for (const q of figs) {
        const {p, f} = q
        const d = Math.hypot(sim.x - p.x, sim.z - p.z), nearHim = d < 14, talking = talk?.who === p.id
        const tall = f.scale.y || 1, small = child && tall > 0.86
        // he comes a step nearer to whoever he is talking to (never the other way round: nobody moves the player)
        let wx = 0, wz = 0
        if (talking && d > 0.01) { const reach = small ? 0.72 : 0.92, go = Math.max(0, Math.min(1.5, d - reach)); wx = (sim.x - p.x) / d * go; wz = (sim.z - p.z) / d * go }
        const mx = wx - q.ox, mz = wz - q.oz, md = Math.hypot(mx, mz), stepLen = Math.min(md, 1.25 * dt)
        if (md > 0.001) { q.ox += mx / md * stepLen; q.oz += mz / md * stepLen }
        const mv = dt > 0 ? stepLen / dt : 0
        f.position.set(p.x + q.ox, 0, p.z + q.oz)
        const to = Math.atan2(sim.x - f.position.x, sim.z - f.position.z)
        if (talking && talk) {
          turnTo(f, to, dt, 7, 5)
          let g = talk.gesture ?? null, mood = talk.mood ?? 'warm'
          if (talk.beat === 'scarf') { const tt = talk.tt; g = tt < 4.3 ? 'scarfOn' : tt < 6.9 ? 'ruffle' : 'shoulder'; mood = tt < 4.3 ? 'proud' : tt < 7.3 ? 'laugh' : 'smile' }
          const nextStep = job === 'active' ? level.steps[sim.step] : null
          const py = Math.atan2((nextStep?.x ?? f.position.x) - f.position.x, (nextStep?.z ?? f.position.z - 30) - f.position.z) - f.rotation.y
          const hands = g === 'shoulder' || g === 'ruffle' || g === 'scarfOn' || g === 'give'
          pose(f, {speed: mv, mood, gesture: mv > 0.3 ? null : g, gestureYaw: Math.max(-1.25, Math.min(1.25, Math.atan2(Math.sin(py), Math.cos(py)))), speak: talk.speak, bend: small ? (hands ? 0.5 : 0.24) : 0, lookDown: small ? (hands ? 0.14 : 0.02) : 0, gaze: true}, t, dt)
          faceAt = {x: f.position.x, y: tall * (small ? 1.5 : 1.62), z: f.position.z}
          if (talk.beat === 'scarf' && talk.tt > 0.2 && talk.tt < 1.75 && mv < 0.3) {
            const J = (f.userData as FigureData).J
            J.wristL!.getWorldPosition(wl); J.wristR!.getWorldPosition(wr)
            held.visible = true; held.position.copy(wl).lerp(wr, 0.5); held.position.y -= 0.03; held.lookAt(wr); bar.scale.set(0.09, 0.03, Math.max(0.1, wl.distanceTo(wr)))
            tails.forEach((m, i) => { const h = i ? wr : wl; m.visible = true; m.position.set(h.x, h.y - 0.2, h.z); m.scale.set(0.085, 0.36, 0.03); m.rotation.y = f.rotation.y; m.rotation.x = Math.sin(t * 2 + i) * 0.08 })
          }
        } else {
          const nh = nearHim ? lookAt(f, to, dt) : 0
          const giver = live === p.id
          const hail = amb && p.id === 'kiosk' && amb.noticed.kiosk !== undefined && amb.t - amb.noticed.kiosk < 3.2
          const calls = !!amb?.captions.some(c => c.spot === p.id)
          // he sees the boy coming and smiles; a wave from far off, open arms as he gets near
          pose(f, {speed: mv, mood: !nearHim ? 'neutral' : giver || job === 'done' && p.id === j.giver ? (d < 7 ? 'smile' : 'warm') : 'warm',
            gesture: mv > 0.3 ? null : giver && d < 14 && d > 6.5 ? 'wave' : giver && d <= 6.5 && d > p.r ? 'lift' : hail ? 'lift' : null,
            lookY: nh, gaze: nearHim && d < 9, lookDown: small && d < 4 ? 0.22 : 0, bend: small && giver && d < 3.2 ? 0.2 : 0, speak: calls ? 1 : 0}, t, dt)
        }
      }
      const lp = talk ? undefined : figs.find(q => q.p.id === live)
      mark.visible = !!lp
      if (lp) { mark.position.set(lp.p.x, 2.15 + Math.sin(t * 3) * 0.08, lp.p.z); mark.rotation.y = t * 2 }
      return faceAt
    },
  }
}
