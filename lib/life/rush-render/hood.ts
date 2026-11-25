/**
 * LIFE · the hood — what the open neighbourhood adds to RUSH's street picture: the front door, the kiosk stall (Athens
 * keeps the periptero `city.ts` already builds), the school gate, the small pitch, and the named people standing in the world.
 * It only DRESSES (the level says where everything is). Every colour goes through the club's colour policy.
 */
import * as THREE from 'three'
import type {VoxelSkin} from '@/lib/life/universal/skin'
import type {Level, Look} from '@/lib/life/rush/level'
import type {Sim} from '@/lib/life/rush/sim'
import type {AmbState} from '@/lib/life/hood/ambient'
import {lookAt, pose, turnTo, type FigureData, type Gesture, type Mood} from './figure'
import {humanPoint, isSkinned} from './human/human'
import {dressEra} from './era'
import {signMarks} from './look/town'

/** a conversation as the picture plays it: who speaks, with what face and hands, and how long this line has been on */
export type TalkDir = {who: string; mood?: Mood; gesture?: Gesture | null; you?: Mood; shot?: 'two' | 'close'; beat?: 'scarf' | null; speak: number; tt: number}
export type HoodDress = {
  /** returns where the face of whoever is being talked to is (for the camera), or null */
  update(sim: Sim, view: {hood?: {job: 'idle' | 'active' | 'done'}}, t: number, dt: number, talk: TalkDir | null, amb: AmbState | null, child: boolean, hero?: THREE.Object3D): {x: number; y: number; z: number; fig?: THREE.Object3D} | null
}
export type HoodCtx = {
  scene: THREE.Scene; keep: <T extends {dispose(): void}>(x: T) => T; level: Level; skin: VoxelSkin; night: boolean; lite?: boolean
  banned: (hex: string) => boolean; tint: THREE.Color
  person: (l: Look, id?: string) => THREE.Group
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
  // a sign's shape and lettering rhythm, never a readable word (no text in the world)
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const marks = (bg: string, fg: string, w = 256, h = 64) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d')!; g.fillStyle = bg; g.fillRect(0, 0, w, h); signMarks(g, w, h, fg, rnd); const t = keep(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; return t }
  dressEra(x) // the era's dressing (feel pass; `era.ts` owns it)

  /* the front door: on the facade of the home block, a step, the number plate, a lit fanlight */
  { const d = hood.door
    mesh(box, std(ok(skin.p, '#6b6f78')), d.x - 0.02, 1.2, d.z, 0.16, 2.5, 1.5)
    mesh(box, std('#2a1d16'), d.x + 0.06, 1.1, d.z, 0.06, 2.2, 1.1)
    mesh(box, std('#8f8a80'), d.x + 0.5, 0.1, d.z, 1.2, 0.2, 1.7)
    const fan = mesh(keep(new THREE.PlaneGeometry(1.0, 0.4)), keep(new THREE.MeshBasicMaterial({color: new THREE.Color('#ffd9a0').multiplyScalar(night ? 1.6 : 0.8), toneMapped: false})), d.x + 0.1, 2.45, d.z)
    fan.rotation.y = Math.PI / 2
    const pl = mesh(keep(new THREE.PlaneGeometry(0.4, 0.28)), keep(new THREE.MeshBasicMaterial({map: marks('#1b1e26', '#f3efe6', 128, 96), toneMapped: false})), d.x + 0.12, 1.8, d.z + 1.1)
    pl.rotation.y = Math.PI / 2
    if (night && !x.lite) { const l = new THREE.PointLight('#ffd6a8', 18, 9, 1.6); l.position.set(d.x + 1.6, 2.4, d.z); add(l) } }

  /* the kiosk stall (a periptero is already there in Athens) */
  if (skin.town !== 'ath') { const k = hood.kiosk
    mesh(box, std(ok(skin.p, '#4a505c')), k.x, 1.2, k.z, 1.8, 2.4, 2.6)
    mesh(box, std('#e9e4da'), k.x, 2.5, k.z, 2.3, 0.18, 3.1)
    const shelf = mesh(keep(new THREE.PlaneGeometry(2.4, 1.5)), keep(new THREE.MeshBasicMaterial({color: new THREE.Color('#ffcf9e').multiplyScalar(night ? 1.1 : 0.7), toneMapped: false})), k.x + 0.92, 1.25, k.z); shelf.rotation.y = Math.PI / 2
    const sg = mesh(keep(new THREE.PlaneGeometry(2.6, 0.6)), keep(new THREE.MeshBasicMaterial({map: marks('#1b1e26', '#f3efe6'), toneMapped: false})), k.x + 0.95, 2.85, k.z); sg.rotation.y = Math.PI / 2
    if (night && !x.lite) { const l = new THREE.PointLight('#ffd6a8', 22, 8, 1.6); l.position.set(k.x + 1.8, 1.8, k.z); add(l) } }

  /* the school gate: two piers, an arch with the word over it, railings along the wall */
  { const s = hood.school, zf = s.z + 0.2
    for (const dx of [-2.2, 2.2]) mesh(box, std('#8f8a80'), s.x + dx, 1.6, zf, 0.7, 3.2, 0.7)
    mesh(box, std('#2b2f3a'), s.x, 3.3, zf, 5.1, 0.25, 0.4)
    for (let i = -6; i <= 6; i++) mesh(box, std('#2b2f3a'), s.x + i * 0.3, 0.9, zf + 0.05, 0.05, 1.8, 0.05)
    mesh(keep(new THREE.PlaneGeometry(4, 0.8)), keep(new THREE.MeshBasicMaterial({map: marks(ok(skin.p, '#2c4d8a'), '#f3efe6'), toneMapped: false})), s.x, 3.9, zf + 0.25)
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
  const figs = hood.people.map(p => { const f = x.person(p.look, p.id); f.position.set(p.x, 0, p.z); f.rotation.y = Math.atan2(level.start.x - p.x, level.start.z - p.z); scene.add(f); return {p, f, ox: 0, oz: 0} })
  const mark = new THREE.Mesh(keep(new THREE.OctahedronGeometry(0.17, 0)), keep(new THREE.MeshBasicMaterial({color: x.tint.clone().multiplyScalar(2), toneMapped: false}))); scene.add(mark)
  // the scarf in Dad's hands, before it goes round the boy's neck
  const scarfC = new THREE.Color(ok(skin.p, '#6b6f78')).lerp(new THREE.Color('#ffffff'), 0.12), scarfMat = std(scarfC, {roughness: 0.9, emissive: scarfC.clone(), emissiveIntensity: 0.4}), held = new THREE.Group(); held.visible = false; scene.add(held)
  const bar = new THREE.Mesh(box, scarfMat); held.add(bar)
  const tails = [0, 1].map(() => { const m = new THREE.Mesh(box, scarfMat); scene.add(m); m.visible = false; return m })
  const wl = new THREE.Vector3(), wr = new THREE.Vector3()
  // where a real hand goes on a real boy (the skinned people only): his neck, his shoulders, the top of his head
  const nk = new THREE.Vector3(), sL = new THREE.Vector3(), sR = new THREE.Vector3(), cr = new THREE.Vector3(), hd = new THREE.Vector3(), rR = new THREE.Vector3(), rL = new THREE.Vector3()
  const ss = (a: number, b: number, v: number) => { const u = Math.max(0, Math.min(1, (v - a) / (b - a))); return u * u * (3 - 2 * u) }
  void W

  return {
    update(sim, view, t, dt, talk, amb, child, hero) {
      const job = view.hood?.job ?? 'idle'
      const j = hood.jobs[0]!
      let live: string | null = job === 'idle' ? j.giver : null
      const st = job === 'active' ? level.steps[sim.step] : null
      if (st?.kind === 'talk') live = hood.people.find(p => Math.hypot(p.x - st.x, p.z - st.z) < 0.5)?.id ?? null
      let faceAt: {x: number; y: number; z: number; fig?: THREE.Object3D} | null = null
      held.visible = false; tails.forEach(m => { m.visible = false })
      for (const q of figs) {
        const {p, f} = q
        const d = Math.hypot(sim.x - p.x, sim.z - p.z), nearHim = d < 14, talking = talk?.who === p.id
        const tall = (f.userData as {tall?: number}).tall ?? (f.scale.y || 1), small = child && tall > 0.86
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
          // a skinned father with a skinned son: he goes down on one knee for the scarf, and his hands arrive where they are going
          const real = isSkinned(f) && isSkinned(hero) && mv < 0.3
          let reach: THREE.Vector3 | null = null, reachL: THREE.Vector3 | null = null, kneel = 0
          if (real && hands && humanPoint(hero, 'neck', nk) && humanPoint(hero, 'shoulderL', sL) && humanPoint(hero, 'shoulderR', sR) && humanPoint(hero, 'crown', cr)) {
            // the boy faces him: the hand on dad's right lands on the shoulder at dad's right
            const fx = Math.sin(f.rotation.y), fz = Math.cos(f.rotation.y), rx = -fz, rz = fx
            const mineR = (sR.x - sL.x) * rx + (sR.z - sL.z) * rz > 0 ? sR : sL, mineL = mineR === sR ? sL : sR
            if (g === 'shoulder') reach = rR.set(mineR.x - fx * 0.06, mineR.y + 0.035, mineR.z - fz * 0.06)
            else if (g === 'ruffle') reach = rR.set(cr.x - fx * 0.15 + Math.sin(t * 9) * 0.03, cr.y - 0.035, cr.z - fz * 0.15 + Math.cos(t * 7) * 0.02)
            else if (g === 'give') reach = rR.copy(nk).addScaledVector(wl.set(fx, 0, fz), -0.3).setY(nk.y - 0.12)
            else if (g === 'scarfOn') { const tt = talk.tt, a = ss(0, 0.8, tt), b = ss(0.9, 1.7, tt), c = ss(1.9, 2.7, tt), d = ss(3.0, 3.8, tt)
              kneel = small ? 1 : 0
              // held out in both hands, taken round his neck, the hands come to rest on his shoulders, one stays
              const out = 0.3 * (1 - b) + 0.07, wide = 0.17 - 0.06 * b + 0.02 * c, up = -0.16 * (1 - b) - 0.05 * b
              rR.set(nk.x - fx * out + rx * wide, nk.y + up, nk.z - fz * out + rz * wide).lerp(wr.set(mineR.x - fx * 0.06, mineR.y + 0.03, mineR.z - fz * 0.06), c)
              rL.set(nk.x - fx * out - rx * wide, nk.y + up, nk.z - fz * out - rz * wide).lerp(wr.set(mineL.x - fx * 0.06, mineL.y + 0.03, mineL.z - fz * 0.06), c)
              reach = a > 0.02 ? rR : null; reachL = a > 0.02 && d < 0.5 ? rL : null }
          }
          if (real && talk.beat === 'scarf' && small) kneel = 1 // he stays down at the boy's eye level for the whole of it
          // his eyes are on the boy's, wherever the boy's are
          let down = kneel ? 0 : small ? (hands ? 0.14 : 0.02) : 0
          if (real && humanPoint(hero, 'eyes', cr) && humanPoint(f, 'eyes', hd)) down = Math.max(-0.5, Math.min(0.62, Math.atan2(hd.y - cr.y, Math.max(0.3, Math.hypot(hd.x - cr.x, hd.z - cr.z))) - (kneel ? 0 : small ? (hands ? 0.25 : 0.12) : 0)))
          pose(f, {speed: mv, mood, gesture: mv > 0.3 ? null : g, gestureYaw: Math.max(-1.25, Math.min(1.25, Math.atan2(Math.sin(py), Math.cos(py)))), speak: talk.speak, bend: kneel ? 0 : small ? (hands ? 0.5 : 0.24) : 0, lookDown: down, gaze: true, reach, reachL, kneel}, t, dt)
          faceAt = humanPoint(f, 'head', hd) ? {x: hd.x, y: hd.y + 0.085, z: hd.z, fig: f} : {x: f.position.x, y: tall * (small ? 1.5 : 1.62), z: f.position.z, fig: f}
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
