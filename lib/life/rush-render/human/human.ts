/**
 * LIFE · the human figure — a real skinned person (the kit of `kit.ts`) behind the same door the code-built figure uses:
 * a `THREE.Group` that `pose(fig, state, t, dt)` drives (figure.ts hands over to `userData.human`). The stride is the
 * captured walk and run played by the distance covered (a planted foot stays planted), idle ↔ walk ↔ run and every
 * gesture cross-fade on the mixer, the face is ARKit units eased over time (seven moods, blinks, visemes while a line
 * is typed), the head and eyes go to whoever he is with inside soft limits, and a hand that has somewhere to be gets
 * there by two-bone IK. A `Troupe` is one stage's people: it shares materials, keeps only the nearest N skinned
 * (everybody else is the cheap figure in the same colours) and disposes what it made.
 */
import * as THREE from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import type {Gesture, Pose} from '../figure'
import {CAST_LITE, charNow, loadChar, STAND_IN, type CastId, type CharAsset, type Layer} from './kit'
import {reachTwoBone} from './ik'
import {MOOD_ROWS, speak, U, UNITS} from './face'

export type HumanOptions = {
  /** the top's colour (already through the colour policy), what multiplies the skin, the hair and the trousers */
  top: string; skin?: string; hair?: string; pants?: string
  /** how tall he stands, in metres (clamped to what the body can be) */
  height: number; child?: boolean
  scarf?: {p: string; s: string} | null; pack?: boolean; noBlob?: boolean
  /** 0 the player, 1 somebody with a name, 2 the street, 3 a face in the crowd */
  rank?: number
  /** what a named person is known to wear; the street's people are varied by the troupe instead (no twins) */
  wear?: {cap?: boolean; beard?: boolean; glasses?: boolean}
}
type Act = {a: THREE.AnimationAction; w: number; want: number; once: boolean; manual: boolean; dur: number; on: boolean}
type Live = {sp: number; ph: number; yaw: number; yr: number; hy: number; hx: number; sx: number; sy: number; sac: number; blink: number; seed: number; fresh: boolean
  bend: number; ikR: number; ikL: number; gName: string; gT: number; face: Float32Array; kick: number}
export type Human = {
  root: THREE.Group; o: HumanOptions; cast: CastId; asset: CharAsset | null; model: THREE.Object3D | null; classic: THREE.Group | null; fallback: () => THREE.Group
  mixer: THREE.AnimationMixer | null; acts: Map<string, Act>; b: Record<string, THREE.Object3D>; qb: Record<string, THREE.Quaternion>; qi: Record<string, THREE.Quaternion>
  mem: {b: THREE.Object3D; base: THREE.Quaternion; last: THREE.Quaternion}[]; morph: {inf: number[]; i: number}[][]; mouth: THREE.Object3D[]; tails: THREE.Object3D[]; pack: THREE.Object3D | null; scarf: THREE.Object3D[]; blob: THREE.Object3D | null
  s: Live; skinned: boolean; dist: number; tR: THREE.Vector3; tL: THREE.Vector3; scale: number; dead: boolean
}
export type Troupe = {
  make(cast: CastId, o: HumanOptions, fallback: () => THREE.Group): THREE.Group
  /** the same person in another body (the boy grows into a teenager and a man): the figure object stays, its model is rebuilt */
  recast(fig: THREE.Object3D, cast: CastId, o: Partial<HumanOptions>): void
  /** who is drawn as a person this frame: the nearest `max` to the eye (the player and whoever speaks first) */
  update(eye: THREE.Vector3, speaker?: THREE.Object3D | null): void
  count(): {made: number; skinned: number}
  dispose(): void
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const smooth = (a: number, b: number, x: number) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u) }
const PROC = ['spine_01', 'spine_02', 'spine_03', 'neck_01', 'head', 'eye_l', 'eye_r', 'thigh_l', 'thigh_r', 'clavicle_l', 'clavicle_r'] as const
/** bones turned by hand after the clips. The mixer only writes a bone when its own result changed, so each keeps what the
 *  clips last gave it (`base`) and what was left on it (`last`): a held pose is never turned twice. */
const HAND = [...PROC, 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r'] as const
const ONCE = new Set(['sit', 'crouch_to_child', 'hand_on_shoulder', 'hug', 'put_scarf_on', 'ruffle_hair', 'kick_ball', 'laugh_body'])
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), e1 = new THREE.Euler()
const WHITE = new THREE.Color('#ffffff')
const REF_SKIN = new THREE.Color('#e6b48f')
const DUMMY = new THREE.Object3D()

export const humanOf = (fig: THREE.Object3D | null | undefined): Human | null => (fig?.userData as {human?: Human} | undefined)?.human ?? null
/** is this figure drawn as a skinned person right now (and not the cheap stand-in)? */
export const isSkinned = (fig: THREE.Object3D | null | undefined): boolean => { const h = humanOf(fig); return !!h && !!h.model && h.skinned }
/** a point on a person, in the world: where a hand, a scarf or a camera should go. Null when he is not a skinned human. */
export function humanPoint(fig: THREE.Object3D | null | undefined, what: 'head' | 'neck' | 'shoulderL' | 'shoulderR' | 'crown' | 'eyes', out: THREE.Vector3): THREE.Vector3 | null {
  const h = humanOf(fig); if (!h?.model || !h.skinned) return null
  const b = h.b
  if (what === 'head' || what === 'crown' || what === 'eyes') { b.head!.getWorldPosition(out); if (what === 'eyes') { b.eye_l!.getWorldPosition(out); b.eye_r!.getWorldPosition(v2); out.lerp(v2, 0.5) } else if (what === 'crown') out.y += 0.2 * h.scale * (h.asset!.height / 1.78) + 0.02; return out }
  if (what === 'neck') return b.neck_01!.getWorldPosition(out)
  return b[what === 'shoulderL' ? 'upperarm_l' : 'upperarm_r']!.getWorldPosition(out)
}

export function createTroupe(x: {max: number; lite: boolean}): Troupe {
  const mats = new Map<string, THREE.Material>(), own: {dispose(): void}[] = [], all: Human[] = []
  const keep = <T extends {dispose(): void}>(d: T) => { own.push(d); return d }
  let gone = false
  const mat = (key: string, src: THREE.Material, edit: (m: THREE.MeshStandardMaterial) => void) => { let m = mats.get(key); if (!m) { m = src.clone(); m.name = src.name; edit(m as THREE.MeshStandardMaterial); mats.set(key, m) } return m }
  // shared small things: the scarf's cloth, a bag, a catch-light, the shadow under the feet
  const geo = {ring: keep(new THREE.TorusGeometry(1, 0.42, 8, 20)), tail: keep(new THREE.BoxGeometry(1, 1, 0.2).translate(0, -0.5, 0)), pack: keep(new THREE.CapsuleGeometry(0.5, 0.5, 5, 12)), strap: keep(new THREE.TorusGeometry(1, 0.11, 5, 14, Math.PI * 1.15)),
    glint: keep(new THREE.SphereGeometry(1, 6, 5)), blob: keep(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2))}
  const glintMat = keep(new THREE.MeshBasicMaterial({color: new THREE.Color('#fff4e2').multiplyScalar(1.6), toneMapped: false}))
  const packMat = keep(new THREE.MeshStandardMaterial({color: '#b98a56', roughness: 0.85, emissive: new THREE.Color('#b98a56'), emissiveIntensity: 0.12})), strapMat = keep(new THREE.MeshStandardMaterial({color: '#7a5a3a', roughness: 0.85, emissive: new THREE.Color('#7a5a3a'), emissiveIntensity: 0.1}))
  let blobMat: THREE.MeshBasicMaterial | null = null
  const blob = () => { if (!blobMat) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!, r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,.5)'); r.addColorStop(0.4, 'rgba(0,0,0,.28)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); blobMat = keep(new THREE.MeshBasicMaterial({map: keep(new THREE.CanvasTexture(c)), transparent: true, depthWrite: false, opacity: 0.6})) } return blobMat }
  const scarfMats = new Map<string, THREE.Material>()
  // a club scarf: the club's colour with bars of its second, lit a little from inside so it keeps its colour at dusk.
  // Never the pure hue: a fully saturated colour goes out of gamut under the film tone map and the grade turns it black.
  const scarfMat = (c: string) => { let m = scarfMats.get(c); if (!m) { const soft = new THREE.Color(c).lerp(WHITE, 0.12); m = keep(new THREE.MeshStandardMaterial({color: soft, roughness: 0.95, emissive: soft.clone(), emissiveIntensity: 0.4})); scarfMats.set(c, m) } return m }

  // the street's people in one body are told apart: a second hairstyle, a cap or a beanie, glasses, a moustache or a beard
  const seen = new Map<CastId, number>()
  function wearOf(h: Human, a: CharAsset): Set<string> {
    const o = h.o, adult = !o.child && a.id !== 'teen', out = new Set<string>()
    if ((o.rank ?? 2) <= 1) {
      if (o.wear?.cap) out.add('Acc_cap_flat')
      if (o.wear?.glasses) out.add('Acc_glasses_round')
      if (o.wear?.beard && adult) out.add('Acc_beard')
      return out
    }
    const k = seen.get(a.id) ?? 0; seen.set(a.id, k + 1)
    if (adult && k % 2 === 1) out.add('Hair2')
    const hat = k % 5 === 2 ? 'Acc_cap_flat' : k % 5 === 4 ? 'Acc_beanie' : null
    if (hat) out.add(hat)
    if (k % 7 === 3) out.add('Acc_glasses_round'); else if (k % 7 === 5) out.add('Acc_glasses_square')
    if (adult && (a.id.startsWith('father') || a.id === 'grandfather')) { if (k % 4 === 1) out.add('Acc_moustache'); else if (k % 4 === 3) out.add('Acc_beard') }
    return out
  }
  function build(h: Human, a: CharAsset): void {
    if (gone || h.dead) return
    const o = h.o, model = SkeletonUtils.clone(a.scene)
    { const wear = wearOf(h, a), hat = wear.has('Acc_cap_flat') || wear.has('Acc_beanie'), hasHat = !!model.getObjectByName('Hair_hat'), two = wear.has('Hair2') && !hat && !!model.getObjectByName('Hair2')
      model.traverse(n => {
        if (n.name.startsWith('Acc_')) n.visible = wear.has(n.name)
        else if (n.name === 'Hair2') n.visible = two
        else if (n.name === 'Hair_hat') n.visible = hat && hasHat
        else if (n.name === 'Hair' && (n as THREE.Mesh).isMesh) n.visible = !two && !(hat && hasHat)
      }) }
    h.asset = a; h.model = model
    h.scale = clamp(o.height / a.height, o.child ? 0.62 : 0.9, o.child ? 1.12 : 1.1)
    h.root.scale.setScalar(h.scale)
    const tone = o.skin ? new THREE.Color(o.skin) : null
    if (tone) { tone.r = clamp(tone.r / REF_SKIN.r, 0.3, 1.05); tone.g = clamp(tone.g / REF_SKIN.g, 0.3, 1.05); tone.b = clamp(tone.b / REF_SKIN.b, 0.3, 1.05) }
    h.morph = UNITS.map(() => [])
    model.traverse(n => {
      if ((n as THREE.Bone).isBone) h.b[n.name] = n
      const m = n as THREE.Mesh; if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial, nm = src.name
      if (nm === 'tint_top') m.material = mat(`${a.id}|top|${o.top}`, src, c => { c.color.set(o.top).lerp(WHITE, 0.12); c.emissive.copy(c.color); c.emissiveIntensity = 0.4 })
      // the collar and cuffs in the scarf's second colour (the club's), or a deeper shade of the top
      else if (nm === 'tint_trim') { const tc = o.scarf ? o.scarf.s : '#' + new THREE.Color(o.top).multiplyScalar(0.62).getHexString(); m.material = mat(`${a.id}|trim|${tc}`, src, c => { c.color.set(tc).lerp(WHITE, 0.1); c.emissive.copy(c.color); c.emissiveIntensity = 0.3 }) }
      else if (nm === 'skin' && tone) m.material = mat(`${a.id}|skin|${o.skin}`, src, c => { c.color.copy(tone); c.emissive.set('#ff9a70').multiply(tone) })
      else if (nm.endsWith('_hair') && o.hair) m.material = mat(`${a.id}|hair|${o.hair}`, src, c => { c.color.set(o.hair!).lerp(new THREE.Color('#ffffff'), 0.35) })
      else if (nm.endsWith('_brows') && o.hair) m.material = mat(`${a.id}|brow|${o.hair}`, src, c => { c.color.set(o.hair!).lerp(new THREE.Color('#ffffff'), 0.3) })
      else if (nm.includes('_clothes') && o.pants) m.material = mat(`${a.id}|${nm}|${o.pants}`, src, c => { c.color.set(o.pants!).lerp(new THREE.Color('#ffffff'), 0.45) })
      if (x.lite) m.castShadow = false
      if (/Teeth|Tongue/.test(n.name) || /Teeth|Tongue/.test(n.parent?.name ?? '')) h.mouth.push(m)
      const dict = m.morphTargetDictionary, inf = m.morphTargetInfluences
      if (dict && inf) UNITS.forEach((u, i) => { const k = dict[u]; if (k !== undefined) h.morph[i]!.push({inf, i: k}) })
    })
    h.root.add(model)
    // the bind pose in the figure's own axes: what a turn "to the left" or "down" means for each bone that is moved by hand
    h.root.updateMatrixWorld(true)
    h.root.getWorldQuaternion(q1).invert()
    for (const n of PROC) { const bn = h.b[n]; if (!bn) continue; const q = bn.getWorldQuaternion(new THREE.Quaternion()).premultiply(q1); h.qb[n] = q; h.qi[n] = q.clone().invert() }
    const hs = a.height / 1.78
    const anchor = (bone: string) => { const g = new THREE.Group(); g.quaternion.copy(h.qi[bone]!); h.b[bone]!.add(g); return g }
    const local = (bone: string, of: string, out: THREE.Vector3) => { h.b[of]!.getWorldPosition(out); h.b[bone]!.getWorldPosition(v2); return out.sub(v2).applyQuaternion(q1).divideScalar(h.scale) }
    const chest = anchor('spine_03'); chest.name = 'chest-anchor'; h.b.chestAnchor = chest
    // a catch-light in each eye: what makes a face look back at you
    { const head = anchor('head'), r = 0.0026 * hs * (o.child ? 1.1 : 1)
      for (const e of ['eye_l', 'eye_r']) { const g = new THREE.Mesh(geo.glint, glintMat); local('head', e, g.position); g.position.x += 0.0035 * hs; g.position.y += 0.0042 * hs; g.position.z += 0.0128 * hs * (o.child ? 1.04 : 1); g.scale.setScalar(r); head.add(g) } }
    if (o.scarf) {
      const m = scarfMat(o.scarf.p), ms = scarfMat(o.scarf.s), R = (0.058 + (o.child ? 0.006 : 0)) * hs + 0.012, at = local('spine_03', 'neck_01', new THREE.Vector3())
      const ring = new THREE.Mesh(geo.ring, m); ring.position.set(at.x, at.y + 0.012 * hs, at.z + 0.012 * hs); ring.rotation.x = Math.PI / 2 + 0.34; ring.scale.set(R, R * 1.08, R * 0.9); chest.add(ring); h.scarf.push(ring)
      for (const sd of [-1, 1]) { const tp = new THREE.Group(); tp.position.set(at.x + sd * 0.034 * hs, at.y - 0.03 * hs, at.z + R + 0.03 * hs); const tl = new THREE.Mesh(geo.tail, m); const len = (0.3 + (sd > 0 ? 0.03 : 0)) * hs; tl.scale.set(0.07 * hs, len, 0.07 * hs); tp.add(tl)
        for (const at2 of [0.42, 0.7, 0.98]) { const bar = new THREE.Mesh(geo.tail, ms); bar.scale.set(0.072 * hs, 0.028 * hs, 0.085 * hs); bar.position.y = -len * at2 + 0.028 * hs; tp.add(bar) } chest.add(tp); h.tails.push(tp); h.scarf.push(tp) }
      h.scarf.forEach(s => s.traverse(n => { n.castShadow = !x.lite }))
    }
    if (o.pack) {
      const p = new THREE.Group(); p.position.set(0, -0.13 * hs, -0.15 * hs); chest.add(p); h.pack = p
      const bag = new THREE.Mesh(geo.pack, packMat); bag.scale.set(0.22 * hs, 0.2 * hs, 0.12 * hs); p.add(bag)
      const pocket = new THREE.Mesh(geo.pack, strapMat); pocket.scale.set(0.18 * hs, 0.12 * hs, 0.06 * hs); pocket.position.set(0, -0.07 * hs, -0.07 * hs); p.add(pocket)
      for (const sd of [-1, 1]) { const st = new THREE.Mesh(geo.strap, strapMat); st.scale.setScalar(0.125 * hs); st.rotation.set(0, Math.PI / 2, 0.25); st.position.set(sd * 0.085 * hs, -0.03 * hs, -0.035 * hs); chest.add(st) }
    }
    if (!o.noBlob) { const bl = new THREE.Mesh(geo.blob, blob()); bl.position.y = 0.012; bl.scale.set(0.7 * hs, 1, 0.56 * hs); bl.renderOrder = 1; h.root.add(bl); h.blob = bl }
    h.mixer = new THREE.AnimationMixer(model)
    for (const n of HAND) { const b = h.b[n]; if (b) h.mem.push({b, base: b.quaternion.clone(), last: new THREE.Quaternion(9, 9, 9, 9)}) }
    const u = h.root.userData as {J: Record<string, THREE.Object3D>; scarf: THREE.Object3D[]}
    u.scarf = h.scarf
    u.J = new Proxy({wristL: h.b.hand_l!, wristR: h.b.hand_r!, head: h.b.head!, chest, pelvis: h.b.pelvis!, neck: h.b.neck_01!} as Record<string, THREE.Object3D>, {get: (t, k: string) => t[k] ?? DUMMY})
    model.visible = h.skinned
  }
  /** the cheap figure in his place: the kit never came, or he is beyond the people this picture can afford */
  function standIn(h: Human): THREE.Group | null {
    if (!h.classic && !gone) { try { const c = h.fallback(); c.userData.standIn = true; h.root.add(c); h.classic = c; if (!h.model) { const u = h.root.userData as Record<string, unknown>, cu = c.userData as Record<string, unknown>; u.J = cu.J; u.scarf = cu.scarf } } catch { /* nobody there */ } }
    return h.classic
  }

  return {
    make(cast, o, fallback) {
      const root = new THREE.Group()
      const h: Human = {root, o, cast, asset: null, model: null, classic: null, fallback, mixer: null, acts: new Map(), b: {}, qb: {}, qi: {}, mem: [], morph: [], mouth: [], tails: [], pack: null, scarf: [], blob: null,
        s: {sp: 0, ph: Math.random(), yaw: 0, yr: 0, hy: 0, hx: 0, sx: 0, sy: 0, sac: 0, blink: 1 + Math.random() * 4, seed: Math.random() * 40, fresh: true, bend: 0, ikR: 0, ikL: 0, gName: '', gT: 0, face: new Float32Array(UNITS.length), kick: 0},
        skinned: (o.rank ?? 2) <= 1, dist: 0, tR: new THREE.Vector3(), tL: new THREE.Vector3(), scale: 1, dead: false}
      root.userData = {human: h, J: new Proxy({}, {get: () => DUMMY}), scarf: [], meshes: [], materials: [], face: {eyes: [], irises: [], brows: [], tails: []}, blink: 0, phase: 0, child: !!o.child, tall: o.height / 1.87,
        pose: (fig: THREE.Object3D, st: Pose, t: number, dt: number, classicPose: (f: THREE.Object3D, st: Pose, t: number, dt: number) => void) => poseHuman(h, st, t, dt, classicPose)}
      all.push(h)
      // a phone downloads five bodies: whoever is not among them is played by his stand-in
      const id = x.lite && !CAST_LITE.includes(cast) ? STAND_IN[cast] : charNow(cast) ? cast : charNow(STAND_IN[cast]) ? STAND_IN[cast] : cast, now = charNow(id)
      if (now) build(h, now)
      else loadChar(id).then(a => build(h, a), () => loadChar(STAND_IN[cast]).then(a => build(h, a), () => { standIn(h) }))
      return root
    },
    recast(fig, cast, patch) {
      const h = humanOf(fig); if (!h || gone || h.dead) return
      const o = {...h.o, ...patch}
      if (h.cast === cast && Math.abs(o.height - h.o.height) < 0.005 && !!o.child === !!h.o.child && !!o.pack === !!h.o.pack) return
      h.o = o; h.cast = cast
      // the old body goes: its clips, its bones and everything hung on them (scarf, bag, catch-lights), its shadow
      h.mixer?.stopAllAction(); if (h.model) { h.mixer?.uncacheRoot(h.model); h.model.traverse(n => { const sk = (n as THREE.SkinnedMesh).skeleton; if (sk) sk.dispose() }); h.root.remove(h.model) }
      if (h.blob) h.root.remove(h.blob)
      Object.assign(h, {asset: null, model: null, mixer: null, acts: new Map(), b: {}, qb: {}, qi: {}, mem: [], morph: [], mouth: [], tails: [], pack: null, scarf: [], blob: null})
      h.s.fresh = true; h.s.gName = ''; h.s.gT = 0; h.s.kick = 0
      const u = h.root.userData as {child: boolean; tall: number}
      u.child = !!o.child; u.tall = o.height / 1.87
      const id = x.lite && !CAST_LITE.includes(cast) ? STAND_IN[cast] : charNow(cast) ? cast : charNow(STAND_IN[cast]) ? STAND_IN[cast] : cast, now = charNow(id)
      if (now) build(h, now)
      else loadChar(id).then(a => { if (h.cast === cast && !h.model) build(h, a) }, () => undefined)
    },
    update(eye, speaker) {
      // rank the people by how near the eye they are (the player, then whoever is spoken to, then names, then the street)
      for (const h of all) {
        let vis = true; for (let p: THREE.Object3D | null = h.root; p; p = p.parent) if (!p.visible) { vis = false; break }
        h.root.getWorldPosition(v1)
        const rank = h.o.rank ?? 2
        h.dist = !vis ? 1e9 : rank === 0 || h.root === speaker ? -1 : v1.distanceTo(eye) + (rank === 1 ? -2 : 0) - (h.skinned ? 1.2 : 0)
      }
      const order = all.slice().sort((p, q) => p.dist - q.dist)
      order.forEach((h, i) => {
        const on = i < x.max && h.dist < 1e8 && h.dist < (x.lite ? 34 : 60)
        if (on !== h.skinned) { h.skinned = on; h.s.fresh = true }
        if (h.model) h.model.visible = on
        if (h.blob) h.blob.visible = on
        const c = on && h.model ? h.classic : h.dist < 1e8 ? standIn(h) : h.classic
        if (c) { c.visible = !(on && h.model); const u = c.userData as {base?: number}; u.base ??= c.scale.x; c.scale.setScalar(u.base / (h.root.scale.x || 1)) }
      })
    },
    count: () => ({made: all.length, skinned: all.filter(h => h.skinned && h.model && h.dist < 1e8).length}),
    dispose() {
      gone = true
      for (const h of all) { h.dead = true; h.mixer?.stopAllAction(); if (h.model) h.mixer?.uncacheRoot(h.model); h.model?.traverse(n => { const sk = (n as THREE.SkinnedMesh).skeleton; if (sk) sk.dispose() }); if (h.classic) (h.classic.userData as {materials?: THREE.Material[]}).materials?.forEach(m => m.dispose()) }
      mats.forEach(m => m.dispose()); own.forEach(d => d.dispose()); all.length = 0
    },
  }
}

function act(h: Human, name: string, layer: Layer): Act | null {
  const key = name + '.' + layer
  let A = h.acts.get(key)
  if (A === undefined) {
    const clip = h.asset!.clip(name, layer); if (!clip || !h.mixer) return null
    const a = h.mixer.clipAction(clip), once = ONCE.has(name), manual = name === 'walk' || name === 'run' || name === 'carry'
    if (once) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true }
    A = {a, w: 0, want: 0, once, manual, dur: clip.duration, on: false}; h.acts.set(key, A)
  }
  return A
}
const want = (h: Human, name: string, layer: Layer, w: number) => { const A = act(h, name, layer); if (A && w > A.want) A.want = w }
/** a turn in the figure's own axes (x down/forward, y to his left, z a tilt) laid on a bone after the clips */
function turn(h: Human, bone: string, x: number, y: number, z: number): void {
  const b = h.b[bone], qb = h.qb[bone]; if (!b || !qb || (x === 0 && y === 0 && z === 0)) return
  q2.setFromEuler(e1.set(x, y, z, 'YXZ'))
  b.quaternion.multiply(q1.copy(h.qi[bone]!).multiply(q2).multiply(qb))
}
/** which clip a gesture is, on which part of the body, and how much of it */
const CLIP: Partial<Record<Gesture, readonly [string, number]>> = {open: ['talk_1', 1], point: ['talk_3', 1], shrug: ['talk_3', 0.9], shoulder: ['hand_on_shoulder', 1], ruffle: ['ruffle_hair', 1], wave: ['wave', 1], lift: ['wave', 0.8],
  thumb: ['talk_2', 0.9], cheer: ['cheer', 1], laugh: ['talk_1', 0.35], give: ['talk_2', 0.7], scarfOn: ['put_scarf_on', 1], hug: ['hug', 1], carryKid: ['child_on_shoulders_carrier', 1], play: ['talk_2', 0.55]}
/** the clips that carry the arms only (the legs keep walking or kneeling under them) */
const ARMS = new Set(['hand_on_shoulder', 'hug', 'ruffle_hair', 'put_scarf_on', 'child_on_shoulders_carrier'])
/** a hand shape that goes with a gesture (finger bones only) */
const HANDSHAPE: Partial<Record<Gesture, string>> = {shoulder: 'hand_palm_down_rest', ruffle: 'hand_relaxed', point: 'hand_point', thumb: 'hand_thumb_up', cheer: 'hand_fist', carryKid: 'hand_fist'}

function poseHuman(h: Human, st: Pose, t: number, dt: number, classicPose: (f: THREE.Object3D, st: Pose, t: number, dt: number) => void): void {
  if (h.classic && h.classic.visible && (h.classic.userData as {J?: unknown}).J) classicPose(h.classic, st, t, dt)
  if (!h.model || !h.mixer || !h.asset || !h.skinned) return
  const S = h.s, a = h.asset, live = dt > 0 && !S.fresh, sc = h.scale
  const ez = (rate: number) => live ? Math.min(1, dt * rate) : 1
  const spIn = st.speed ?? 0
  S.sp += (spIn - S.sp) * ez(7)
  const sp = S.sp
  // the body's own turning: a head leads a turn
  { let d = h.root.rotation.y - S.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); S.yaw = h.root.rotation.y; S.yr += ((live ? clamp(d / dt, -6, 6) : 0) - S.yr) * ez(8) }
  /* the legs: idle ↔ walk ↔ run by the pace, the stride played by the ground covered */
  const nat = a.stride.walk * sc / a.stride.walkT, natR = a.stride.run * sc / a.stride.runT
  const moving = smooth(0.08, 0.5, sp / nat), run = smooth(nat * 1.25, Math.max(nat * 1.9, natR * 0.8), sp)
  const len = (a.stride.walk + (a.stride.run - a.stride.walk) * run) * sc, natNow = nat + (natR - nat) * run
  if (live) S.ph = (S.ph + dt * sp / (len * clamp(sp / natNow, 0.7, 1.3))) % 1
  const sit = st.sit || st.ride, kneel = Math.max(st.kneel ?? 0, st.knees ? 1 : 0, (st.crouch ?? 0) * 0.6)
  const still = 1 - moving
  const gest = st.gesture ?? null
  const cheer = !!st.celebrate || !!st.scarfUp || gest === 'cheer'
  let full = sit ? 1 : kneel
  for (const A of h.acts.values()) A.want = 0
  // a child riding on somebody's shoulders holds on and waves (the pair's own clip), not a chair's sit
  if (st.ride && a.clip('child_on_shoulders_rider', 'full')) want(h, 'child_on_shoulders_rider', 'full', 1)
  else if (sit) want(h, 'sit', 'full', 1)
  else if (kneel > 0) want(h, 'crouch_to_child', 'full', kneel)
  // a kick at the ball: the captured kick, once each time it starts (the hand-turned thigh is the code-built figure's)
  const kickClip = gest === 'kick' && !!a.clip('kick_ball', 'full')
  if (kickClip && !sit) { full = Math.max(full, 1); want(h, 'kick_ball', 'full', 1) }
  // hand in hand: the paired walk replaces the plain one while they move (mother and child)
  const pairWalk = (gest === 'hold' || gest === 'held') && !sit ? (gest === 'hold' ? 'hold_hand_walk_adult' : 'hold_hand_walk_child') : null
  const hasPair = !!pairWalk && !!a.clip(pairWalk, 'full')
  // what the arms say (the chest, arms, neck and head), over whatever the legs are doing
  let up = 0, upName = ''
  if (cheer) { upName = 'cheer'; up = 1 }
  else if (st.wave) { upName = 'wave'; up = 1 }
  else if (st.carry) { upName = 'carry'; up = 1 }
  else if (st.ticket) { upName = 'talk_2'; up = 0.8 }
  else if (gest && CLIP[gest]) { upName = CLIP[gest]![0]; up = CLIP[gest]![1] }
  if (sit && upName === 'cheer') full = 0.35
  const lo = kickClip && !sit ? 0 : 1 - (sit ? 1 : kneel), bodyUp = (1 - full) * (1 - up)
  const pw = hasPair ? moving : 0
  want(h, 'idle', 'lo', lo * (1 - moving)); want(h, 'walk', 'lo', lo * moving * (1 - run) * (1 - pw)); want(h, 'run', 'lo', lo * moving * run * (1 - pw))
  want(h, 'idle', 'up', bodyUp * (1 - moving)); want(h, 'walk', 'up', bodyUp * moving * (1 - run) * (1 - pw)); want(h, 'run', 'up', bodyUp * moving * run * (1 - pw))
  if (hasPair) want(h, pairWalk!, 'full', pw)
  if (upName) want(h, upName, ARMS.has(upName) ? 'arms' : 'up', up * (1 - full) + (sit || kneel ? up * full : 0))
  const hand = gest ? HANDSHAPE[gest] : undefined
  if (hand && a.clip(hand, 'arms')) want(h, hand, 'arms', 0.85)
  const rate = ez(5.5)
  for (const A of h.acts.values()) {
    A.w += (A.want - A.w) * rate
    if (A.w < 0.004 && A.want === 0) { if (A.on) { A.a.stop(); A.on = false } A.w = 0; continue }
    if (!A.on) { A.on = true; A.a.reset(); A.a.play(); if (A.once && S.fresh) A.a.time = A.dur; else if (!A.once && !A.manual) A.a.time = (S.seed * 0.37) % A.dur }
    if (A.manual) { A.a.timeScale = 0; A.a.time = S.ph * A.dur }
    A.a.setEffectiveWeight(A.w)
  }
  h.mixer.update(live ? dt : 0)
  for (let i = 0; i < h.mem.length; i++) { const m = h.mem[i]!; if (m.b.quaternion.equals(m.last)) m.b.quaternion.copy(m.base); else m.base.copy(m.b.quaternion) }

  /* by hand, over the clips: a bend to somebody small, breath, the head and the eyes */
  S.bend += ((st.bend ?? 0) - S.bend) * ez(3.2)
  const breath = Math.sin(t * (st.panting ? 7 : 2.1) + S.seed) * (st.panting ? 0.035 : 0.012)
  const lean = (st.lean ?? 0) + S.bend * 0.5 + (st.stumble ? -0.25 : 0)
  if (S.gName !== (gest ?? '')) { S.gName = gest ?? ''; S.gT = 0 } else S.gT += dt
  const laugh = gest === 'laugh' || st.mood === 'laugh' ? 1 : 0, shake = laugh * Math.sin(t * 13 + S.seed)
  turn(h, 'spine_01', lean * 0.5, 0, 0)
  turn(h, 'spine_02', lean * 0.5 - laugh * 0.03, 0, 0)
  const wantY = clamp(st.lookY ?? 0, -1.25, 1.25), wantX = clamp(st.lookDown ?? 0, -0.6, 0.7)
  S.hy += (wantY - S.hy) * ez(5.5); S.hx += (wantX - S.hx) * ez(5)
  const micro = (st.gaze ? 0.3 : 1) * still
  const nod = gest === 'nod' ? Math.sin(S.gT * 7.5) * 0.16 * Math.exp(-S.gT * 0.8) + 0.02 : 0
  const headY = S.hy + clamp(S.yr * 0.2, -0.45, 0.45) + (Math.sin(t * 0.31 + S.seed) * 0.06 + Math.sin(t * 0.83 + S.seed) * 0.025) * micro
  const headX = S.hx - S.bend * 0.3 + nod - laugh * 0.1 + shake * 0.02 + (st.mood === 'proud' ? -0.07 : 0) + Math.sin(t * 0.43 + S.seed * 2) * 0.025 * micro
  const tilt = (st.mood === 'warm' || st.mood === 'smile' ? 0.05 : 0) * Math.sin(S.seed) + Math.sin(t * 0.27 + S.seed) * 0.02 * micro
  turn(h, 'spine_03', breath + shake * 0.012, headY * 0.14, 0)
  turn(h, 'neck_01', headX * 0.4, headY * 0.36, tilt * 0.5)
  turn(h, 'head', headX * 0.6, headY * 0.5, tilt)
  if (st.ride) { turn(h, 'thigh_l', 0, 0.42, 0); turn(h, 'thigh_r', 0, -0.42, 0) }
  if (gest === 'kick' && !kickClip) { const kk = Math.sin(clamp(S.gT / 0.45, 0, 1) * Math.PI); turn(h, 'thigh_r', -kk * 1.0, 0, 0) }
  // the eyes get there before the head, and are never quite still
  if (live) { S.sac -= dt; if (S.sac < 0) { S.sac = 0.5 + Math.random() * (st.gaze ? 2.4 : 1.5); const r = st.gaze ? 0.12 : 0.45; S.sx = (Math.random() - 0.5) * 2 * r; S.sy = (Math.random() - 0.5) * r } }
  const ex = clamp((st.eyeX ?? 0) + S.sx + clamp((wantY - S.hy) * 2.2, -1, 1), -1, 1) * 0.42, ey = clamp(-(st.eyeY ?? 0) + S.sy + clamp((wantX - S.hx) * 2, -0.8, 0.8), -1, 1) * 0.3
  turn(h, 'eye_l', ey, ex, 0); turn(h, 'eye_r', ey, ex, 0)

  /* hands that have somewhere to be */
  const R = st.reach, L = st.reachL
  let ikR = 0, ikL = 0
  const self = (x: number, y: number, z: number, out: THREE.Vector3) => h.root.localToWorld(out.set(x / sc, y / sc, z / sc))
  if (R) { h.tR.set(R.x, R.y, R.z); ikR = 1 } else if (gest === 'give') { self(-0.1, a.height * sc * 0.66, 0.42, h.tR); ikR = 1 } else if (gest === 'hold') { self(-0.27, 0.74, 0.03, h.tR); ikR = 1 }
  else if (gest === 'carryKid') { self(-0.14, a.height * sc * 0.83, 0.13, h.tR); ikR = 1 } else if (gest === 'play') { self(-0.05 + Math.sin(t * 0.9 + S.seed) * 0.1, 0.86, 0.4, h.tR); ikR = 0.8 }
  if (L) { h.tL.set(L.x, L.y, L.z); ikL = 1 } else if (gest === 'held') { self(0.27, 0.74, 0.03, h.tL); ikL = 1 } else if (gest === 'carryKid') { self(0.14, a.height * sc * 0.83, 0.13, h.tL); ikL = 1 }
  S.ikR += (ikR - S.ikR) * ez(4.5); S.ikL += (ikL - S.ikL) * ez(4.5)
  if (S.ikR > 0.01 || S.ikL > 0.01) {
    h.root.updateWorldMatrix(true, false); h.model.updateMatrixWorld(true)
    if (S.ikR > 0.01) reachTwoBone(h.b.upperarm_r!, h.b.lowerarm_r!, h.b.hand_r!, h.tR, S.ikR * S.ikR * (3 - 2 * S.ikR))
    if (S.ikL > 0.01) reachTwoBone(h.b.upperarm_l!, h.b.lowerarm_l!, h.b.hand_l!, h.tL, S.ikL * S.ikL * (3 - 2 * S.ikL))
  }

  for (let i = 0; i < h.mem.length; i++) { const m = h.mem[i]!; m.last.copy(m.b.quaternion) }

  /* the face: a feeling eased in, a blink, the lips of the line being said */
  const F = S.face, row = MOOD_ROWS[st.mood ?? ((st.joy ?? 0) > 0.75 ? 'smile' : (st.joy ?? 0) > 0.3 ? 'warm' : 'neutral')], fr = ez(6)
  S.blink -= dt
  if (S.blink < 0) S.blink = Math.random() < 0.18 ? 0.36 : 2.2 + Math.random() * 3.8
  const shut = S.blink < 0.17 ? Math.sin((S.blink / 0.17) * Math.PI) : 0
  for (let i = 0; i < F.length; i++) F[i] = F[i]! + (row[i]! - F[i]!) * fr
  const sk = st.speak ?? (st.talk ? 1 : 0)
  const open = Math.max(st.panting ? 0.3 + Math.abs(breath) * 4 : 0, cheer ? 0.4 + Math.sin(t * 5 + S.seed) * 0.15 : 0, (st.effort ?? 0) > 0.6 ? 0.18 : 0, laugh * (0.12 + Math.abs(shake) * 0.1))
  let mouthOpen = F[U.jawOpen]! + open
  for (let i = 0; i < F.length; i++) {
    let v = F[i]!
    if (i === U.eyeBlinkLeft || i === U.eyeBlinkRight) v = Math.max(v, shut)
    else if (i === U.jawOpen) v += open
    else if (i === U.eyeLookDownLeft || i === U.eyeLookDownRight) v = Math.max(0, ey) * 1.6
    else if (i === U.eyeLookUpLeft || i === U.eyeLookUpRight) v = Math.max(0, -ey) * 1.6
    else if (i === U.eyeLookOutLeft || i === U.eyeLookInRight) v = Math.max(0, ex) * 1.2
    else if (i === U.eyeLookInLeft || i === U.eyeLookOutRight) v = Math.max(0, -ex) * 1.2
    else if ((i === U.browDownLeft || i === U.browDownRight) && (st.effort ?? 0) > 0.5) v += 0.4
    FACE[i] = v
  }
  if (sk > 0) { speak(FACE, t, S.seed, sk); mouthOpen += 0.2 }
  for (let i = 0; i < FACE.length; i++) { const ch = h.morph[i]!; if (!ch.length) continue; const v = clamp(FACE[i]!, 0, 1); for (let k = 0; k < ch.length; k++) ch[k]!.inf[ch[k]!.i] = v }
  const teeth = mouthOpen > 0.06
  for (let i = 0; i < h.mouth.length; i++) h.mouth[i]!.visible = teeth

  /* what hangs on him comes after him */
  const k = clamp(sp / 6, 0, 1.2)
  for (let i = 0; i < h.tails.length; i++) { const tp = h.tails[i]!; tp.rotation.x = -0.2 + k * 0.7 + Math.sin(S.ph * Math.PI * 4 + i) * 0.14 * moving + Math.sin(t * 1.7 + i + S.seed) * 0.035 - lean * 0.6; tp.rotation.z = (i ? 1 : -1) * (0.06 + k * 0.16) + clamp(S.yr * 0.06, -0.3, 0.3) }
  if (h.pack) { const bob = Math.sin(S.ph * Math.PI * 4 - 0.6) * moving; h.pack.position.y = -0.13 * (a.height / 1.78) + bob * 0.012; h.pack.rotation.z = -clamp(S.yr * 0.03, -0.1, 0.1); h.pack.rotation.x = 0.06 + bob * 0.02 }
  S.fresh = false
}
const FACE = new Float32Array(UNITS.length)

/** which body plays whom: a child, a woman, a man of an age and a build — the same person always the same body */
export function castFor(o: {child?: boolean; female?: boolean; grey?: boolean; heavy?: boolean; teen?: boolean; pick?: number}): CastId {
  const n = Math.abs(o.pick ?? 0)
  if (o.child) return o.female ? 'girl' : n % 4 === 3 ? 'girl' : 'boy'
  if (o.teen) return 'teen'
  if (o.female) return o.grey ? 'grandmother' : o.heavy || n % 3 === 1 ? 'mother_heavy' : 'mother'
  if (o.grey) return 'grandfather'
  return o.heavy || n % 4 === 1 ? 'father_heavy' : n % 4 === 3 ? 'teen' : 'father'
}
