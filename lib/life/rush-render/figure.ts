/**
 * LIFE · RUSH — the human figure. One rig for everybody: the supporter, his father, a steward, a
 * face in the crowd. Smooth parts (a lathe torso, capsule limbs, a face with eyes that blink and a
 * mouth that breathes), not blocks — the owner asked for people, not pieces.
 *
 * `template: true` builds every optional part so the crowd can be drawn by instancing each part of
 * one posed rig (`crowd.ts`), switching a cap or a beard per person by scaling it to nothing.
 */
import {gaitPose} from '@/lib/life/motion/gait'
import * as THREE from 'three'

/* ---- shared textures (the whole app's lifetime; never disposed per stage) ----
   the fabric swatches and the iris plates are the realism pack TOWN already ships (public/life/town, REALISM-ASSETS.md):
   read here as bump maps and eye plates, never written to. A missing file leaves the plain material: nothing waits. */
const TEX = new Map<string, THREE.Texture>()
function tex(url: string, repeat: [number, number], srgb = false): THREE.Texture | null {
  if (typeof document === 'undefined') return null
  let t = TEX.get(url)
  if (!t) {
    t = new THREE.TextureLoader().load(url, () => { t!.needsUpdate = true }, undefined, () => { /* the plain material stays */ })
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); t.anisotropy = 4
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    TEX.set(url, t)
  }
  return t
}
const FABRIC = {jersey: '/life/town/tex/fabric/jersey.webp', denim: '/life/town/tex/fabric/denim.webp', knit: '/life/town/tex/fabric/knit.webp', tricot: '/life/town/tex/fabric/tricot.webp'} as const
const IRIS = ['/life/town/people/iris/brown-dark.webp', '/life/town/people/iris/brown.webp', '/life/town/people/iris/hazel.webp', '/life/town/people/iris/green.webp', '/life/town/people/iris/blue-grey.webp'] as const
/** a soft dark disc: the contact shadow under every pair of feet (shadow maps or no shadow maps) */
let BLOB: THREE.Texture | null = null
function blobTex(): THREE.Texture | null {
  if (BLOB || typeof document === 'undefined') return BLOB
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d')!, r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, 'rgba(0,0,0,.5)'); r.addColorStop(0.35, 'rgba(0,0,0,.3)'); r.addColorStop(0.7, 'rgba(0,0,0,.1)'); r.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = r; g.fillRect(0, 0, 64, 64)
  BLOB = new THREE.CanvasTexture(c)
  return BLOB
}

export type Cloth = {primary: string; secondary: string; trim: string; pattern: string; inverse?: boolean}

export const SKIN_TONES = ['#e6b48f', '#c99470', '#b07a56', '#8d5a3e', '#d9a982', '#f0c7a4'] as const
export const HAIR = ['#2a1d16', '#3b2a1e', '#15110e', '#6b4a2e', '#8c8682', '#1d1d22'] as const
export const TOPS = ['#3d4558', '#545b6b', '#2f3442', '#6a6f7a', '#3a2f2a', '#7a7368'] as const
export const PANTS = ['#2c3446', '#2b2f3a', '#3a3f4f', '#1f2430', '#4a4f5e'] as const

const std = (color: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({color, roughness: 0.78, metalness: 0, ...o})
const lathe = (pts: [number, number][], seg: number) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg)

let G: Record<string, THREE.BufferGeometry> | null = null
function geos(): Record<string, THREE.BufferGeometry> {
  if (G) return G
  G = {
    torso: lathe([[0.001, 0], [0.152, 0], [0.162, 0.08], [0.172, 0.2], [0.198, 0.34], [0.208, 0.42], [0.19, 0.49], [0.12, 0.535], [0.055, 0.55]], 28),
    hips: lathe([[0.001, -0.15], [0.16, -0.15], [0.172, -0.06], [0.162, 0.05], [0.001, 0.06]], 24),
    sleeve: lathe([[0.001, -0.17], [0.064, -0.17], [0.07, -0.08], [0.074, 0], [0.04, 0.03]], 16),
    thigh: new THREE.CapsuleGeometry(0.074, 0.34, 4, 12).translate(0, -0.17, 0),
    shin: new THREE.CapsuleGeometry(0.058, 0.34, 4, 12).translate(0, -0.17, 0),
    upper: new THREE.CapsuleGeometry(0.05, 0.2, 4, 10).translate(0, -0.12, 0),
    fore: new THREE.CapsuleGeometry(0.045, 0.2, 4, 10).translate(0, -0.1, 0),
    hand: new THREE.SphereGeometry(0.052, 12, 10),
    shoe: new THREE.CapsuleGeometry(0.058, 0.12, 4, 10).rotateX(Math.PI / 2),
    sole: new THREE.BoxGeometry(0.12, 0.035, 0.27),
    neck: new THREE.CylinderGeometry(0.052, 0.058, 0.11, 12),
    head: new THREE.SphereGeometry(0.15, 28, 20),
    ear: new THREE.SphereGeometry(0.034, 10, 8),
    nose: new THREE.SphereGeometry(0.026, 12, 10),
    eye: new THREE.SphereGeometry(0.027, 14, 10),
    iris: new THREE.SphereGeometry(0.0175, 12, 10),
    glint: new THREE.SphereGeometry(0.005, 6, 5),
    brow: new THREE.CapsuleGeometry(0.0085, 0.044, 3, 6).rotateZ(Math.PI / 2),
    smile: new THREE.TorusGeometry(0.03, 0.0085, 6, 16, Math.PI),
    mouth: new THREE.SphereGeometry(0.032, 14, 10),
    hairShort: new THREE.SphereGeometry(0.163, 24, 14, 0, Math.PI * 2, 0, 1.3),
    hairBack: new THREE.SphereGeometry(0.16, 20, 12, Math.PI, Math.PI, 0, 2.15),
    capTop: new THREE.SphereGeometry(0.168, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    brim: new THREE.CylinderGeometry(0.12, 0.12, 0.014, 18, 1, false, -Math.PI / 2, Math.PI),
    band: new THREE.TorusGeometry(0.158, 0.022, 8, 28),
    mustache: new THREE.CapsuleGeometry(0.014, 0.07, 3, 8).rotateZ(Math.PI / 2),
    collar: new THREE.TorusGeometry(0.07, 0.018, 8, 20),
    scarfRing: new THREE.TorusGeometry(0.095, 0.038, 10, 24),
    scarfTail: new THREE.BoxGeometry(0.075, 0.3, 0.018).translate(0, -0.15, 0),
    scarfEnd: new THREE.BoxGeometry(0.077, 0.045, 0.02),
    pack: new THREE.CapsuleGeometry(0.13, 0.14, 6, 14),
    strap: new THREE.TorusGeometry(0.13, 0.012, 6, 16, Math.PI * 1.1),
    vest: lathe([[0.001, 0.04], [0.176, 0.04], [0.186, 0.2], [0.208, 0.34], [0.214, 0.44], [0.13, 0.5], [0.001, 0.5]], 28),
    roll: new THREE.CylinderGeometry(0.16, 0.16, 1.15, 18).rotateZ(Math.PI / 2),
    palm: new THREE.CapsuleGeometry(0.03, 0.035, 6, 12),
    phal1: new THREE.CapsuleGeometry(0.0092, 0.026, 4, 8).translate(0, -0.013 - 0.0092, 0),
    phal2: new THREE.CapsuleGeometry(0.0082, 0.02, 4, 8).translate(0, -0.01 - 0.0082, 0),
    thumb1: new THREE.CapsuleGeometry(0.011, 0.024, 4, 8).translate(0, -0.012 - 0.011, 0),
    thumb2: new THREE.CapsuleGeometry(0.0095, 0.018, 4, 8).translate(0, -0.009 - 0.0095, 0),
    // the face has bones under it: a jaw that narrows to the chin, lids over the eyes, a lip under the mouth
    jaw: new THREE.SphereGeometry(0.15, 24, 16, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58),
    lid: new THREE.SphereGeometry(0.03, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.42),
    lowerLip: new THREE.CapsuleGeometry(0.009, 0.036, 3, 8).rotateZ(Math.PI / 2),
    // hair with weight: a crown that sits proud of the skull, a fringe, a parting; long hair falls to the shoulders
    hairCrown: new THREE.SphereGeometry(0.172, 24, 14, 0, Math.PI * 2, 0, 1.05),
    fringe: new THREE.TorusGeometry(0.15, 0.028, 8, 20, Math.PI * 0.9),
    hairLong: new THREE.CylinderGeometry(0.165, 0.2, 0.42, 20, 1, true, Math.PI * 0.55, Math.PI * 0.9),
    curl: new THREE.SphereGeometry(0.036, 8, 6),
    glassRim: new THREE.TorusGeometry(0.03, 0.004, 6, 16),
    glassBridge: new THREE.CylinderGeometry(0.003, 0.003, 0.05, 6).rotateZ(Math.PI / 2),
    // clothes that read as clothes: a belt, trouser cuffs, socks, a zip, a hem, a skirt
    belt: new THREE.TorusGeometry(0.168, 0.016, 8, 28),
    buckle: new THREE.BoxGeometry(0.04, 0.03, 0.012),
    cuff: new THREE.CylinderGeometry(0.064, 0.07, 0.07, 12),
    sock: new THREE.CylinderGeometry(0.058, 0.062, 0.05, 12),
    zip: new THREE.BoxGeometry(0.012, 0.42, 0.006),
    hem: new THREE.TorusGeometry(0.155, 0.012, 6, 28),
    skirt: new THREE.CylinderGeometry(0.17, 0.26, 0.5, 20, 1, true),
    pocket: new THREE.BoxGeometry(0.1, 0.11, 0.006),
    blob: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
  }
  G.torso!.computeVertexNormals()
  return G
}

/** the shirt cloth wrapped round the lathe: u runs round the body, u = 0 is the chest */
export function kitTexture(c: Cloth): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128
  const g = cv.getContext('2d')!
  const base = c.inverse ? c.secondary : c.primary, ink = c.inverse ? c.primary : c.secondary
  g.fillStyle = c.pattern === 'sash' ? c.secondary : base; g.fillRect(0, 0, 256, 128)
  if (c.pattern === 'stripes') { g.fillStyle = ink; for (let x = 8; x < 256; x += 32) g.fillRect(x, 0, 14, 128) }
  if (c.pattern === 'hoops') { g.fillStyle = ink; for (let y = 6; y < 128; y += 26) g.fillRect(0, y, 256, 12) }
  if (c.pattern === 'halves') { g.fillStyle = ink; g.fillRect(128, 0, 128, 128) }
  if (c.pattern === 'checkers') { g.fillStyle = ink; for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) g.fillRect(x * 32, y * 32, 32, 32) }
  if (c.pattern === 'sash') { g.fillStyle = c.primary; for (const off of [-256, 0, 256]) { g.beginPath(); g.moveTo(off + 220, 128); g.lineTo(off + 246, 128); g.lineTo(off + 297, 0); g.lineTo(off + 271, 0); g.closePath(); g.fill() } }
  if (c.pattern === 'solid') { g.fillStyle = ink; g.fillRect(0, 118, 256, 5) }
  // the shirt is cloth, not paint: a fine knit weave and a little shading where the body turns away from the chest
  const im = g.getImageData(0, 0, 256, 128), d = im.data
  for (let y = 0; y < 128; y++) for (let x = 0; x < 256; x++) { const i = (y * 256 + x) * 4, weave = ((x & 1) ^ (y & 1)) ? 5 : -5, side = Math.cos(x / 256 * Math.PI * 2) * 7; d[i] = Math.max(0, Math.min(255, d[i]! + weave + side)); d[i + 1] = Math.max(0, Math.min(255, d[i + 1]! + weave + side)); d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + weave + side)) }
  g.putImageData(im, 0, 0)
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}


/**
 * A hand, not a mitten (owner, 21.10.2026: "the hands are alien"). A palm, four fingers of two joints each, a thumb that
 * lies along the index. It hangs from the wrist along −y; the palm faces +z of the hand's own frame and every finger
 * curls towards it. `grip` 0 is a hand at rest (a soft cascade, index least, little finger most), 1 a closed fist.
 */
export function makeHand(skin: THREE.Material, grip = 0, role = 'skin', out?: THREE.Mesh[]): THREE.Group {
  const g = geos(), hand = new THREE.Group()
  const add = (geo: THREE.BufferGeometry, parent: THREE.Object3D, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, skin); m.position.set(x, y, z); m.castShadow = true; m.userData.role = role; parent.add(m); out?.push(m); return m }
  add(g.palm!, hand, 0, -0.045, 0).scale.set(1.15, 1, 0.5)
  const fingers: THREE.Object3D[] = []
  ;[[-0.026, 0.95, 0.9], [-0.009, 1.05, 1], [0.009, 1.0, 1.1], [0.025, 0.85, 1.25]].forEach(([x, len, cas]) => {
    const base = new THREE.Group(); base.position.set(x!, -0.094, 0.002); base.scale.setScalar(len!); hand.add(base)
    base.rotation.x = (0.42 + grip * 0.95) * cas!
    base.rotation.z = -x! * 1.2 * (1 - grip * 0.5)
    add(g.phal1!, base)
    const mid = new THREE.Group(); mid.position.y = -0.044; base.add(mid); mid.rotation.x = (0.62 + grip * 0.95) * cas!
    add(g.phal2!, mid)
    fingers.push(base)
  })
  const th = new THREE.Group(); th.position.set(-0.034, -0.035, 0.012); th.rotation.set(0.35 + grip * 0.5, 0, -0.55 + grip * 0.25); hand.add(th)
  add(g.thumb1!, th)
  const th2 = new THREE.Group(); th2.position.y = -0.045; th2.rotation.x = 0.3 + grip * 0.5; th.add(th2)
  add(g.thumb2!, th2)
  hand.userData.fingers = fingers; hand.userData.thumb = th
  return hand
}

export type FigureOptions = {
  kit?: boolean; scarf?: boolean; band?: boolean; pack?: boolean; vest?: boolean; cap?: boolean; mustache?: boolean
  longSleeves?: boolean; hairStyle?: 'short' | 'bald' | 'curly' | 'long' | 'bun'; skinTone?: string; hair?: string; top?: string; pants?: string; shoe?: string
  child?: boolean; scale?: number; template?: boolean; roll?: boolean
  /** a woman's build: narrower shoulders, a skirt over the legs when asked; glasses; the eye's colour plate */
  female?: boolean; skirt?: string; glasses?: boolean; eyes?: number; denim?: boolean; jacket?: string
  /** no contact shadow (a figure drawn by instancing draws none; the flat draws its own) */
  noBlob?: boolean
}

type Joints = Record<string, THREE.Object3D>
export type Face = {eyes: THREE.Mesh[]; irises: THREE.Object3D[]; brows: THREE.Mesh[]; smile: THREE.Mesh; open: THREE.Mesh; tails: THREE.Object3D[]; lids?: THREE.Mesh[]}
export type FigureData = {J: Joints; face: Face; meshes: THREE.Mesh[]; blink: number; phase: number; materials: THREE.Material[]; /** a child moves like a child */ child?: boolean; /** the scarf's own meshes (it can be put on) */ scarf?: THREE.Object3D[]; /** what `pose` remembers between frames */ s?: unknown}

export function makeFigure(cloth: Cloth, kitMap: THREE.Texture, o: FigureOptions = {}): THREE.Group {
  const g = geos()
  const tone = o.skinTone ?? SKIN_TONES[1], hairC = o.hair ?? HAIR[0]
  const fem = !!o.female
  // cloth bump maps and the eye plate from the shared realism pack (null on the server; the plain material then)
  const jersey = tex(FABRIC.jersey, [6, 3]), denim = tex(FABRIC.denim, [4, 4]), knit = tex(FABRIC.knit, [3, 3]), tricot = tex(FABRIC.tricot, [5, 3])
  const irisMap = tex(IRIS[(o.eyes ?? 0) % IRIS.length]!, [1, 1], true)
  const bump = (m: THREE.MeshStandardMaterial, t: THREE.Texture | null, k: number) => { if (t) { m.bumpMap = t; m.bumpScale = k } return m }
  // skin: a little sheen where the light grazes (a physical material's sheen reads as the oil of skin), lower roughness than cloth
  const skinMat = new THREE.MeshPhysicalMaterial({color: tone, roughness: 0.52, metalness: 0, sheen: 0.25, sheenRoughness: 0.6, sheenColor: new THREE.Color(tone).lerp(new THREE.Color('#ffd7c0'), 0.4)})
  const topC = o.top ?? TOPS[0], pantsC = o.pants ?? PANTS[0]
  const M = {
    skin: skinMat, hair: std(hairC, {roughness: 0.72}), pants: bump(std(pantsC, {roughness: 0.92}), o.denim ? denim : tricot, 0.012),
    kit: bump(new THREE.MeshStandardMaterial({map: kitMap, roughness: 0.84}), jersey, 0.01), top: bump(std(topC, {roughness: 0.9}), o.jacket ? tricot : knit, 0.012),
    jacket: bump(std(o.jacket ?? topC, {roughness: 0.75}), tricot, 0.014),
    shoe: std(o.shoe ?? '#f2efe8', {roughness: 0.62}), sole: std('#d9d4c8', {roughness: 0.9}), white: std('#f4f3ef', {roughness: 0.3}),
    iris: irisMap ? new THREE.MeshStandardMaterial({map: irisMap, roughness: 0.25, color: '#ffffff'}) : std('#4a2e1e', {roughness: 0.3}), dark: std('#2a1612', {roughness: 0.7}), lip: std(new THREE.Color(tone).lerp(new THREE.Color('#8a3a33'), fem ? 0.6 : 0.45), {roughness: 0.55}),
    club: bump(std(cloth.primary, {roughness: 0.88, emissive: new THREE.Color(cloth.primary), emissiveIntensity: 0.08}), knit, 0.02), clubB: bump(std(cloth.secondary, {roughness: 0.88}), knit, 0.02),
    glint: new THREE.MeshBasicMaterial({color: '#ffffff'}), brow: std(hairC, {roughness: 0.9}),
    pack: std('#8a5a32', {roughness: 0.75}), vest: std('#ff7a1a', {roughness: 0.7, emissive: new THREE.Color('#ff6a10'), emissiveIntensity: 0.12}),
    roll: std('#efe9de', {roughness: 0.8}), belt: std('#2b2017', {roughness: 0.55}), buckle: std('#c8c2b4', {metalness: 0.8, roughness: 0.3}),
    sock: std('#e9e6df', {roughness: 0.9}), skirt: bump(std(o.skirt ?? '#2a2a34', {roughness: 0.9}), knit, 0.015), glass: std('#3a3630', {metalness: 0.6, roughness: 0.35}),
    blob: new THREE.MeshBasicMaterial({map: blobTex() ?? undefined, transparent: true, depthWrite: false, opacity: 0.55}),
  }
  const meshes: THREE.Mesh[] = []
  const part = (geo: THREE.BufferGeometry, mat: THREE.Material, role: string, parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.userData.role = role; m.castShadow = true; parent.add(m); meshes.push(m); return m
  }
  const node = (parent: THREE.Object3D, x = 0, y = 0, z = 0) => { const n = new THREE.Group(); n.position.set(x, y, z); parent.add(n); return n }
  const root = new THREE.Group()
  const J: Joints = {}
  // the contact shadow: what makes him stand on the ground rather than over it
  if (!o.noBlob && !o.template) { const b = new THREE.Mesh(g.blob!, M.blob); b.position.y = 0.012; b.scale.set(0.78, 1, 0.64); b.renderOrder = 1; b.userData.role = 'blob'; root.add(b) }
  J.pelvis = node(root, 0, 0.9, 0)
  const legMat = o.skirt ? M.skin : M.pants
  part(g.hips!, o.skirt ? M.skirt : M.pants, 'pants', J.pelvis).scale.set(1, 1, 0.72)
  if (o.skirt) part(g.skirt!, M.skirt, 'pants', J.pelvis, 0, -0.3, 0).scale.set(1, 1, 0.8)
  else { const bl = part(g.belt!, M.belt, 'belt', J.pelvis, 0, 0.04, 0); bl.rotation.x = Math.PI / 2; bl.scale.set(1, 0.74, 1); part(g.buckle!, M.buckle, 'belt', J.pelvis, 0, 0.04, 0.125)
    for (const s of [-1, 1]) part(g.pocket!, M.pants, 'pants', J.pelvis, s * 0.1, -0.09, -0.118).rotation.x = 0.1 }
  for (const s of [-1, 1]) {
    const L = s < 0 ? 'L' : 'R'
    const hip = J['hip' + L] = node(J.pelvis, s * 0.088, -0.06, 0)
    part(g.thigh!, legMat, o.skirt ? 'skin' : 'pants', hip)
    const knee = J['knee' + L] = node(hip, 0, -0.34, 0)
    part(g.shin!, legMat, o.skirt ? 'skin' : 'pants', knee)
    if (!o.skirt) part(g.cuff!, M.pants, 'pants', knee, 0, -0.33, 0)
    const ankle = J['ankle' + L] = node(knee, 0, -0.36, 0)
    part(g.sock!, M.sock, 'sock', ankle, 0, 0.0, 0)
    part(g.shoe!, M.shoe, 'shoe', ankle, 0, -0.03, 0.05).scale.set(1.12, 0.82, 1)
    part(g.sole!, M.sole, 'sole', ankle, 0, -0.075, 0.04)
  }
  J.spine = node(J.pelvis, 0, 0.04, 0)
  J.chest = node(J.spine, 0, 0, 0)
  const torsoMat = o.jacket ? M.jacket : M.top
  const torso = part(g.torso!, M.kit, 'kit', J.chest); torso.scale.set(fem ? 0.94 : 1, 1, 0.7)
  if (o.template) part(g.torso!, M.top, 'top', J.chest).scale.set(1.001, 1.001, 0.701)
  else if (!o.kit) { torso.material = torsoMat; torso.userData.role = 'top' }
  // a shirt has a hem; a zipped top has a zip
  part(g.hem!, o.kit || o.template ? M.kit : torsoMat, o.kit || o.template ? 'kit' : 'top', J.chest, 0, 0.005, 0).rotation.x = Math.PI / 2
  if (o.jacket && !o.template) part(g.zip!, M.buckle, 'top', J.chest, 0, 0.3, 0.147)
  if (o.vest) part(g.vest!, M.vest, 'vest', J.chest).scale.set(1.04, 1, 0.76)
  part(g.collar!, o.kit === false && !o.template ? torsoMat : M.clubB, 'collar', J.chest, 0, 0.53, 0.01).rotation.x = Math.PI / 2
  for (const s of [-1, 1]) {
    const L = s < 0 ? 'L' : 'R'
    const sh = J['shoulder' + L] = node(J.chest, s * (fem ? 0.2 : 0.215), 0.455, 0)
    sh.rotation.z = s * 0.1
    const kitArm = o.kit || o.template
    part(g.sleeve!, kitArm ? M.kit : torsoMat, kitArm ? 'kit' : 'top', sh).scale.set(1, 1, 0.9)
    if (o.template) part(g.sleeve!, M.top, 'top', sh).scale.set(1.001, 1.001, 0.901)
    part(g.upper!, o.longSleeves ? torsoMat : M.skin, o.longSleeves ? 'top' : 'skin', sh, 0, -0.02, 0)
    const el = J['elbow' + L] = node(sh, 0, -0.27, 0)
    part(g.fore!, o.longSleeves ? torsoMat : M.skin, o.longSleeves ? 'top' : 'skin', el)
    const wr = J['wrist' + L] = node(el, 0, -0.22, 0)
    // the hand: palm towards the body, fingers falling into a soft curl
    const hd = makeHand(M.skin, 0, 'skin', meshes); hd.rotation.y = -s * Math.PI / 2; if (s > 0) hd.scale.x = -1; hd.position.y = 0.01; wr.add(hd); J['hand' + L] = hd
  }
  J.neck = node(J.chest, 0, 0.53, 0)
  part(g.neck!, M.skin, 'skin', J.neck, 0, 0.05, 0)
  J.head = node(J.neck, 0, 0.09, 0)
  if (!o.child) J.head.scale.setScalar(0.9) // an adult is about seven and a half heads: the sphere was a toy's
  const H = J.headMesh = node(J.head, 0, 0.155, 0.005)
  part(g.head!, M.skin, 'skin', H).scale.set(fem ? 0.96 : 1, 1.08, 1.02)
  // the jaw: the lower face narrows to a chin, which is what turns a ball into a head
  part(g.jaw!, M.skin, 'skin', H, 0, -0.03, 0.012).scale.set(fem ? 0.84 : 0.9, 1.0, 0.92)
  for (const s of [-1, 1]) part(g.ear!, M.skin, 'skin', H, s * 0.148, -0.005, -0.005).scale.set(0.48, 1, 0.8)
  part(g.nose!, M.skin, 'skin', H, 0, -0.02, 0.148).scale.set(fem ? 0.78 : 0.9, 1.15, 1.05)
  const face: Face = {eyes: [], irises: [], brows: [], smile: null!, open: null!, tails: [], lids: []}
  for (const s of [-1, 1]) {
    const e = part(g.eye!, M.white, 'eyeW', H, s * 0.056, 0.022, 0.122); e.scale.set(1, 1, 0.7); face.eyes.push(e)
    const ir = new THREE.Group(); ir.position.set(s * 0.056, 0.022, 0.136); H.add(ir)
    part(g.iris!, M.iris, 'iris', ir).scale.set(1, 1, 0.55)
    part(g.glint!, M.glint, 'glint', ir, 0.006, 0.007, 0.009)
    face.irises.push(ir)
    // the upper lid: skin over the top of the eye, so the eye sits IN the face
    const lid = part(g.lid!, M.skin, 'skin', H, s * 0.056, 0.028, 0.121); lid.scale.set(1.05, 0.9, 0.85); lid.rotation.x = -0.35; face.lids!.push(lid)
    const b = part(g.brow!, M.brow, 'brow', H, s * 0.056, 0.075, 0.132); b.rotation.z = s * -0.12; b.scale.set(1, fem ? 0.7 : 1, 1); face.brows.push(b)
  }
  face.smile = part(g.smile!, M.lip, 'mouth', H, 0, -0.074, 0.128); face.smile.rotation.z = Math.PI; face.smile.scale.set(1, 0.65, 1)
  part(g.lowerLip!, M.lip, 'skin', H, 0, -0.086, 0.136)
  face.open = part(g.mouth!, M.dark, 'mouthOpen', H, 0, -0.078, 0.124); face.open.scale.set(0.9, 0.05, 0.45)
  const style = o.hairStyle ?? 'short'
  if (o.template || style !== 'bald') {
    part(g.hairShort!, M.hair, 'hair', H, 0, 0.018, -0.012).scale.set(1, 1.08, 1.06)
    part(g.hairBack!, M.hair, 'hair', H, 0, 0.012, -0.008).scale.set(1.02, 1.08, 1.06)
    // weight on top and a fringe: hair, not a painted cap
    part(g.hairCrown!, M.hair, 'hair', H, 0, 0.03, -0.02).scale.set(1, 0.9, 1.04)
    const fr = part(g.fringe!, M.hair, 'hair', H, 0, 0.095, 0.0); fr.rotation.order = 'YXZ'; fr.rotation.set(Math.PI / 2 + 0.3, -0.05 * Math.PI, 0); fr.scale.set(1, 1, 0.8)
  }
  if (style === 'curly' && !o.template) for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2, r2 = 0.125 + (k % 3) * 0.012; part(g.curl!, M.hair, 'hair', H, Math.cos(a) * r2, 0.09 + Math.sin(k * 2.3) * 0.035, Math.sin(a) * r2 - 0.01).scale.setScalar(1 + (k % 2) * 0.3) }
  if ((style === 'long' || style === 'bun') && !o.template) {
    if (style === 'long') { const lg = part(g.hairLong!, M.hair, 'hair', H, 0, -0.14, -0.03); lg.scale.set(1, 1, 0.95) }
    else part(g.curl!, M.hair, 'hair', H, 0, 0.1, -0.15).scale.set(2.2, 1.8, 1.8)
  }
  if (o.glasses && !o.template) for (const s of [-1, 1]) { part(g.glassRim!, M.glass, 'glass', H, s * 0.056, 0.022, 0.15); if (s > 0) part(g.glassBridge!, M.glass, 'glass', H, 0, 0.03, 0.152) }
  if (o.cap || o.template) { part(g.capTop!, M.club, 'cap', H, 0, 0.03, -0.005).scale.set(1, 0.95, 1.04); part(g.brim!, M.club, 'cap', H, 0, 0.03, 0.1).scale.set(1.05, 1, 1.3) }
  if (o.band) { const b = part(g.band!, M.club, 'band', H, 0, 0.07, -0.005); b.rotation.x = Math.PI / 2 - 0.12; b.scale.set(1, 1.06, 1) }
  if (o.mustache || o.template) part(g.mustache!, M.hair, 'beard', H, 0, -0.05, 0.145)
  const scarfParts: THREE.Object3D[] = []
  if (o.scarf || o.template) {
    const ring = part(g.scarfRing!, M.club, 'scarf', J.chest, 0, 0.52, 0); ring.rotation.x = Math.PI / 2; ring.scale.set(1.15, 1, 1); scarfParts.push(ring)
    for (const s of [-1, 1]) {
      const tp = node(J.chest, s * 0.05, 0.5, 0.1); face.tails.push(tp); scarfParts.push(tp)
      part(g.scarfTail!, M.club, 'scarf', tp)
      part(g.scarfEnd!, M.clubB, 'scarfB', tp, 0, -0.2, 0)
    }
  }
  if (o.pack) {
    J.pack = part(g.pack!, M.pack, 'pack', J.chest, 0, 0.3, -0.19); J.pack.scale.set(1.05, 1, 0.62)
    for (const s of [-1, 1]) { const st = part(g.strap!, M.pack, 'pack', J.chest, s * 0.1, 0.36, -0.02); st.rotation.y = Math.PI / 2; st.scale.set(1, 1.05, 0.9) }
  }
  if (o.roll) { J.roll = part(g.roll!, M.roll, 'roll', J.chest, 0, 0.32, 0.26); (J.roll as THREE.Mesh).scale.set(1, 1, 1) }
  const data: FigureData = {J, face, meshes, blink: 2 + Math.random() * 3, phase: Math.random() * 6, materials: Object.values(M), child: !!o.child, scarf: scarfParts}
  root.userData = data
  root.scale.setScalar(o.scale ?? 1)
  if (o.child) H.scale.setScalar(1.14)
  return root
}

export type Mood = 'neutral' | 'warm' | 'smile' | 'laugh' | 'worried' | 'proud' | 'surprised'
export type Gesture = 'open' | 'point' | 'shoulder' | 'ruffle' | 'wave' | 'lift' | 'thumb' | 'cheer' | 'nod' | 'laugh' | 'shrug' | 'give' | 'scarfOn' | 'hug' | 'hold' | 'held' | 'carryKid' | 'play' | 'kick'
export type Pose = {
  speed?: number; lean?: number; lookDown?: number; lookY?: number; eyeX?: number; eyeY?: number
  ticket?: boolean; celebrate?: boolean; wave?: boolean; scarfUp?: boolean; knees?: boolean; stumble?: boolean; carry?: boolean; crouch?: number
  panting?: boolean; effort?: number; joy?: number; talk?: boolean
  /** what the face feels; a gesture of the arms and the body, eased in and out; where a pointing arm goes (yaw, relative to the body) */
  mood?: Mood; gesture?: Gesture | null; gestureYaw?: number
  /** the lips while a line is spoken (0 … 1); a bend toward somebody smaller (0 … 1); sitting; riding on somebody's shoulders; eyes held on somebody */
  speak?: number; bend?: number; sit?: boolean; ride?: boolean; gaze?: boolean
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

/** Turn a body (or a head) towards an angle the SHORT way round, at a turning rate — never a snap, never a spin.
 *  `rate` is how quickly it closes the gap (per second); `max` caps the turn speed in radians a second. */
export function turnTo(o: THREE.Object3D, want: number, dt: number, rate = 8, max = 7): void {
  let d = want - o.rotation.y
  d = Math.atan2(Math.sin(d), Math.cos(d))
  const step = d * Math.min(1, dt * rate), cap = max * dt
  o.rotation.y = Math.atan2(Math.sin(o.rotation.y + Math.max(-cap, Math.min(cap, step))), Math.cos(o.rotation.y + Math.max(-cap, Math.min(cap, step))))
}

/** A person who wants to look at something turns the head first, and the body only when the head would go past
 *  the neck. Returns the head's share, which the caller adds to the neck after `pose` ran. */
export function lookAt(o: THREE.Object3D, want: number, dt: number, neck = 0.9): number {
  let d = want - o.rotation.y
  d = Math.atan2(Math.sin(d), Math.cos(d))
  if (Math.abs(d) > neck) turnTo(o, o.rotation.y + (d - Math.sign(d) * neck), dt, 6, 4)
  let h = want - o.rotation.y
  h = Math.atan2(Math.sin(h), Math.cos(h))
  return Math.max(-neck, Math.min(neck, h))
}

/** what a face does with a feeling: mouth curve (−1 frown … 1 smile), eyes narrowed by the cheeks, brows up, inner brows up (worry), eyes wide, mouth open, chin */
const MOODS: Record<Mood, readonly [number, number, number, number, number, number, number]> = {
  neutral: [0.3, 0, 0, 0, 0, 0, 0], warm: [0.78, 0.2, 0.01, 0.12, 0, 0, -0.03], smile: [1, 0.4, 0.014, 0.16, 0, 0, -0.05],
  laugh: [1, 0.8, 0.018, 0.2, 0, 0.7, -0.14], worried: [-0.65, 0, 0.006, 0.8, 0.12, 0, 0.05], proud: [0.9, 0.26, 0.012, 0.1, 0, 0, -0.1], surprised: [0.05, 0, 0.022, 0.2, 0.3, 0.5, -0.03],
}
type Live = {sp: number; yaw: number; yr: number; hy: number; hx: number; sx: number; sy: number; sac: number; gName: string; gT: number; gv: Record<string, number>; gw: Record<string, number>; f: number[]; seed: number; init: boolean; bend: number}
const newLive = (): Live => ({sp: 0, yaw: 0, yr: 0, hy: 0, hx: 0, sx: 0, sy: 0, sac: 0, gName: '', gT: 0, gv: {}, gw: {}, f: [0.3, 0, 0, 0, 0, 0, 0], seed: Math.random() * 40, init: false, bend: 0})

/** a gesture as joint angles at its own time `g` (seconds since it began). Arms are absolute, the rest is added to the body. */
function gesture(name: Gesture, g: number, t: number, yaw: number, small: number): Record<string, number> {
  const w = Math.sin(t * 3.1), e = (a: number, b: number) => clamp((g - a) / (b - a), 0, 1), s = (x: number) => x * x * (3 - 2 * x)
  switch (name) {
    // both forearms out, palms turning up: "here is how it is"
    case 'open': return {Rx: -0.5 + w * 0.05, Rz: 0.34, Re: -1.25 + w * 0.14, Lx: -0.42 - w * 0.04, Lz: -0.28, Le: -1.05 - w * 0.1, wR: 1.25, wL: -1.25, hZ: w * 0.04, sX: 0.03}
    // the arm goes out down the street, the eyes go with it and come back to the listener
    case 'point': { const there = 1 - s(e(1.1, 1.9)); return {Rx: -1.42 + Math.sin(t * 5) * 0.03, Rz: 0.12 - yaw * 0.5, Re: -0.1, gR: 0.9, iR: 1, sY: yaw * 0.45, hY: yaw * 0.55 * there, Lx: -0.1, Lz: -0.12, Le: -0.35} }
    // a hand on the shoulder of whoever he is talking to (lower when it is a child)
    case 'shoulder': return {Rx: -1.2 + small * 0.22 + w * 0.015, Rz: -0.08, Re: -0.55 - small * 0.15, wR: 0.5, Lx: 0.02, Lz: -0.12, Le: -0.3, hZ: 0.05}
    case 'ruffle': { const r = Math.sin(t * 11); return {Rx: -1.55 + small * 0.5, Rz: 0.02 + r * 0.13, Re: -0.75 + Math.abs(r) * 0.12, wR: 0.5 + r * 0.5, hZ: 0.08, sX: 0.04, Lx: 0.02, Lz: -0.12, Le: -0.3} }
    case 'wave': return {Rx: -2.55, Rz: 0.5 + Math.sin(t * 8.5) * 0.3, Re: -0.5 - Math.sin(t * 8.5) * 0.12, wR: 1.3, hZ: 0.05, sZ: -0.03}
    // a hand lifted, palm out: the greeting of a man who is working
    case 'lift': return {Rx: -1.75, Rz: 0.34 + w * 0.03, Re: -1.35, wR: 1.4}
    case 'thumb': return {Rx: -0.78, Rz: 0.22, Re: -1.72 + Math.sin(t * 6) * 0.05 * (1 - e(0.4, 1)), gR: 1, kR: 1, wR: 0.2, hX: 0.04}
    case 'cheer': { const b = Math.abs(Math.sin(t * 6)); return {Rx: -2.78, Lx: -2.78, Rz: 0.34, Lz: -0.34, Re: -0.28 - b * 0.2, Le: -0.28 - b * 0.2, gR: 0.9, gL: 0.9, pY: b * 0.07, hX: -0.16, sX: -0.07} }
    case 'nod': return {hX: Math.sin(g * 7.5) * 0.17 * Math.exp(-g * 0.8) + 0.03}
    case 'laugh': { const b = Math.sin(t * 13); return {hX: -0.12 + b * 0.025, sX: -0.07 + b * 0.012, pY: Math.abs(b) * 0.008, Rx: -0.2, Re: -0.75, Rz: 0.2, Lx: -0.1, Le: -0.55, Lz: -0.18} }
    case 'shrug': return {Rx: -0.25, Lx: -0.25, Rz: 0.42, Lz: -0.42, Re: -1.1, Le: -1.1, wR: 1.3, wL: -1.3, hZ: 0.12, pY: 0.012}
    case 'give': return {Rx: -1.12 + small * 0.2, Rz: -0.04, Re: -0.72, wR: 1.2, sX: 0.06, Lx: 0, Lz: -0.12, Le: -0.3}
    // the scarf: lifted in both hands, taken round the neck, the hands come to rest on the shoulders, one stays
    case 'scarfOn': { const a = s(e(0, 0.8)), b = s(e(0.9, 1.7)), c = s(e(1.9, 2.7)), d = s(e(3.0, 3.8))
      const x = -(1.0 - small * 0.22) * a - 0.12 * b + 0.2 * c, el = -1.05 * a + 0.42 * b + 0.1 * c, z = 0.12 * a - 0.26 * b + 0.1 * c
      return {Rx: x, Lx: x * (1 - d) + 0.02 * d, Re: el, Le: el * (1 - d) - 0.3 * d, Rz: z, Lz: -z * (1 - d) - 0.12 * d, gR: 0.55 * (1 - c), gL: 0.55 * (1 - c), sX: 0.05 * b, hZ: 0.05 * c, wR: 0.5 * c} }
    case 'hug': return {Rx: -1.25, Lx: -1.25, Rz: -0.42, Lz: 0.42, Re: -1.15, Le: -1.15, sX: 0.14, hZ: 0.12, hX: 0.06}
    // an arm let down and a little out: a small hand in his
    case 'hold': return {Rx: 0.04, Rz: 0.3, Re: -0.14, gR: 0.6}
    // a child's arm up to the hand that holds his
    case 'held': return {Lx: -0.15, Lz: -1.5, Le: -0.25, gL: 0.6}
    case 'carryKid': return {Rx: -2.25, Lx: -2.25, Rz: 0.16, Lz: -0.16, Re: -1.95, Le: -1.95, gR: 0.7, gL: 0.7}
    case 'play': { const m = Math.max(0, Math.sin(t * 1.1 + yaw)); return {Rx: -0.75 - m * 0.3, Rz: 0.05, Re: -1.0 + m * 0.35, gR: 0.5, sX: 0.2 + m * 0.05, hX: 0.22, Lx: -0.5, Le: -1.2, Lz: -0.1} }
    case 'kick': return {Rx: 0.3, Lx: -0.4, Re: -0.5, Le: -0.6, sX: -0.05}
  }
}
function curl(hand: THREE.Object3D | undefined, grip: number, index: number, thumb: number): void {
  const fs = hand?.userData.fingers as THREE.Object3D[] | undefined; if (!fs) return
  const cas = [0.9, 1, 1.1, 1.25]
  fs.forEach((b, i) => { const gk = i === 0 ? grip * (1 - index) - index * 0.3 : grip; b.rotation.x = (0.42 + gk * 0.95) * cas[i]!; const mid = b.children[1]; if (mid) mid.rotation.x = (0.62 + gk * 0.95) * cas[i]! })
  const th = hand!.userData.thumb as THREE.Object3D | undefined
  if (th) th.rotation.set(0.35 + grip * 0.5 - thumb * 1.2, 0, -0.55 + grip * 0.25 - thumb * 0.75)
}

/**
 * The body, then the face. Walking is the captured stride (lib/life/motion/gait.ts) played at the pace the feet cover the
 * ground (a stride's length follows the speed and the leg, so a foot that is down stays where it is); round it, what makes
 * a person a person: he eases into a walk and out of it, leans into a turn with the head going first, shifts his weight
 * when he stands, breathes, blinks, glances; his face holds a feeling and his arms say something, eased in and out.
 * `dt = 0` is a still (the crowd's shared template): nothing is remembered and nothing eases.
 */
export function pose(fig: THREE.Object3D, st: Pose, t: number, dt: number): void {
  const u = fig.userData as FigureData
  const {J, face} = u
  const live = dt > 0, S = (u.s ??= newLive()) as Live
  const sc = fig.scale.y || 1, kid = u.child ? 1 : 0
  const spIn = st.speed ?? 0
  if (live) S.sp += (spIn - S.sp) * Math.min(1, dt * 6.5); else S.sp = spIn
  const sp = S.sp, acc = live ? spIn - sp : 0, k = clamp(sp / 7, 0, 1.25)
  // one turn of the phase is one stride: its length follows the pace and the leg
  const stride = sc * clamp(0.85 + 0.42 * sp / sc, 0.9, 3.3)
  const ph = (u.phase += sp > 0.12 ? dt * sp / stride * Math.PI * 2 : 0)
  if (live) { let d = fig.rotation.y - S.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); S.yaw = fig.rotation.y; S.yr += ((S.init ? clamp(d / dt, -6, 6) : 0) - S.yr) * Math.min(1, dt * 8); S.init = true }
  const yr = live ? S.yr : 0
  const idle = 1 - clamp(sp / 1.2, 0, 1), moving = 1 - idle
  const breath = Math.sin(t * (st.panting ? 7 : 2.2) + S.seed) * (st.panting ? 1 : 0.4)
  const crouch = st.crouch ?? 0
  if (live) S.bend += ((st.bend ?? 0) - S.bend) * Math.min(1, dt * 3.2); else S.bend = st.bend ?? 0
  const bend = S.bend
  // standing: the weight goes from one leg to the other and the free knee lets go; turning on the spot he steps round
  const wsh = Math.sin(t * (0.42 + kid * 0.4) + S.seed) * idle * (st.sit || st.ride ? 0 : 1), wR = Math.max(0, wsh), wL = Math.max(0, -wsh)
  const stp = Math.sin(t * 9 + S.seed), step = idle * clamp(Math.abs(yr) - 0.5, 0, 1.2) * (st.sit ? 0 : 1)
  const run = clamp((sp / sc - 2.6) / 3.2, 0, 1), amp = clamp(sp / 1.1, 0, 1), g = gaitPose(ph / (Math.PI * 2), run), late = gaitPose(ph / (Math.PI * 2) - 0.07, run)
  J.hipL!.rotation.x = g.hipL * amp - crouch * 0.5 - wL * 0.07 - Math.max(0, stp) * step * 0.24 - bend * 0.4
  J.hipR!.rotation.x = g.hipR * amp - crouch * 0.5 - wR * 0.07 - Math.max(0, -stp) * step * 0.24 - bend * 0.4
  J.kneeL!.rotation.x = g.kneeL * amp + crouch * 0.9 + wL * 0.17 + Math.max(0, stp) * step * 0.45 + bend * 0.42
  J.kneeR!.rotation.x = g.kneeR * amp + crouch * 0.9 + wR * 0.17 + Math.max(0, -stp) * step * 0.45 + bend * 0.42
  // the foot meets the ground flat: the ankle takes back what the hip, the knee and the lean gave
  J.ankleL!.rotation.x = -(J.hipL!.rotation.x + J.kneeL!.rotation.x) * (0.35 + idle * 0.65); J.ankleR!.rotation.x = -(J.hipR!.rotation.x + J.kneeR!.rotation.x) * (0.35 + idle * 0.65)
  const roll = g.pelvisRoll * amp + wsh * 0.05 - clamp(yr * 0.03, -0.08, 0.08) * moving
  J.hipL!.rotation.z = J.hipR!.rotation.z = -roll * idle
  J.pelvis!.position.x = wsh * 0.028
  J.pelvis!.position.y = 0.9 + g.bob * 0.9 * amp * (1 + kid * 0.7) - run * 0.03 + breath * 0.002 - crouch * 0.16 - bend * 0.075 - (wL + wR) * 0.006 + kid * idle * Math.max(0, Math.sin(t * 1.3 + S.seed)) * Math.abs(Math.sin(t * 5.2)) * 0.012 * ((st.joy ?? 0) > 0.5 ? 1 : 0)
  // a bend starts at the hips (the belt goes with it), not in the middle of the back
  J.pelvis!.rotation.x = bend * 0.2; J.pelvis!.rotation.y = g.pelvisYaw * amp; J.pelvis!.rotation.z = roll; J.spine!.rotation.y = g.spineYaw * amp
  J.spine!.rotation.x = g.lean * amp * 0.9 + (st.lean ?? 0) + crouch * 0.35 + bend * 0.26 + clamp(acc * 0.07, -0.07, 0.13)
  J.spine!.rotation.z = -wsh * 0.06 - roll * 0.5 * moving + clamp(yr * 0.035, -0.1, 0.1) * moving
  J.chest!.scale.set(1 + breath * 0.012, 1 + breath * 0.008, 1 + breath * 0.02); J.chest!.position.y = breath * 0.004
  const swing = 1 + kid * 0.28, sway = idle * Math.sin(t * 1.1 + S.seed) * 0.035
  J.shoulderL!.rotation.x = g.shoulderL * amp * swing + sway - bend * 0.3; J.shoulderR!.rotation.x = g.shoulderR * amp * swing - sway - bend * 0.3
  J.shoulderL!.rotation.z = -0.1 - 0.08 * k - wsh * 0.03; J.shoulderR!.rotation.z = 0.1 + 0.08 * k - wsh * 0.03
  J.elbowL!.rotation.x = g.elbowL * amp - (0.3 + Math.sin(t * 0.7 + S.seed) * 0.05) * idle; J.elbowR!.rotation.x = g.elbowR * amp - (0.3 + Math.sin(t * 0.6 + S.seed * 2) * 0.05) * idle
  if (J.wristL) { J.wristL.rotation.y = 0; J.wristR!.rotation.y = 0 }
  if (st.sit) { J.hipL!.rotation.x = J.hipR!.rotation.x = -1.48; J.kneeL!.rotation.x = J.kneeR!.rotation.x = 1.5; J.ankleL!.rotation.x = J.ankleR!.rotation.x = 0; J.pelvis!.position.y = 0.53 + breath * 0.002; J.hipL!.rotation.z = -0.12; J.hipR!.rotation.z = 0.12 }
  if (st.ride) { J.hipL!.rotation.x = J.hipR!.rotation.x = -1.5; J.kneeL!.rotation.x = J.kneeR!.rotation.x = 1.25; J.hipL!.rotation.z = -0.42; J.hipR!.rotation.z = 0.42; J.shoulderL!.rotation.x = J.shoulderR!.rotation.x = -0.7; J.elbowL!.rotation.x = J.elbowR!.rotation.x = -1.3 }
  // the head: it leads a turn, looks where it is asked to (the eyes get there first), and is never quite still
  const wantY = st.lookY ?? 0, wantX = st.lookDown ?? 0
  if (live) { S.hy += (wantY - S.hy) * Math.min(1, dt * 5.5); S.hx += (wantX - S.hx) * Math.min(1, dt * 5) } else { S.hy = wantY; S.hx = wantX }
  const micro = st.gaze ? 0.35 : 1
  let headX = -(J.spine!.rotation.x * 0.7) + S.hx + Math.sin(t * 0.43 + S.seed * 2) * 0.028 * micro * idle
  let headY = -J.spine!.rotation.y * 0.7 + S.hy + clamp(yr * 0.2, -0.45, 0.45) + (Math.sin(t * 0.31 + S.seed) * 0.07 + Math.sin(t * 0.83 + S.seed) * 0.03) * micro * idle
  let headZ = wsh * 0.03 - J.spine!.rotation.z * 0.6
  if (st.carry) { J.shoulderL!.rotation.x = -1.05; J.shoulderR!.rotation.x = -1.05; J.shoulderL!.rotation.z = 0.35; J.shoulderR!.rotation.z = -0.35; J.elbowL!.rotation.x = -0.9; J.elbowR!.rotation.x = -0.9; J.spine!.rotation.x = 0.05 + k * 0.08 }
  if (st.ticket) { J.shoulderR!.rotation.x = -1.05; J.shoulderR!.rotation.z = 0.25; J.elbowR!.rotation.x = -1.2; headX = 0.38; headY = -0.15 }
  if (st.celebrate) { const b = Math.abs(Math.sin(t * 6)); J.shoulderL!.rotation.x = -2.8; J.shoulderR!.rotation.x = -2.8; J.shoulderL!.rotation.z = -0.35; J.shoulderR!.rotation.z = 0.35; J.elbowL!.rotation.x = -0.25; J.elbowR!.rotation.x = -0.25; J.pelvis!.position.y = 0.9 + b * 0.14; headX = -0.18; J.spine!.rotation.x = -0.08 }
  if (st.wave) { J.shoulderR!.rotation.x = -2.5; J.shoulderR!.rotation.z = 0.5 + Math.sin(t * 9) * 0.35; J.elbowR!.rotation.x = -0.5 }
  if (st.scarfUp) { const w = Math.sin(t * 8 + u.phase) * 0.12; J.shoulderL!.rotation.x = -2.9; J.shoulderR!.rotation.x = -2.9; J.shoulderL!.rotation.z = -0.25 + w; J.shoulderR!.rotation.z = 0.25 + w; J.elbowL!.rotation.x = -0.35; J.elbowR!.rotation.x = -0.35 }
  if (st.knees) { J.spine!.rotation.x = 0.85; headX = -0.6; J.shoulderL!.rotation.x = -0.45; J.shoulderR!.rotation.x = -0.45; J.elbowL!.rotation.x = -0.3; J.elbowR!.rotation.x = -0.3; J.hipL!.rotation.x = -0.35; J.hipR!.rotation.x = -0.35; J.kneeL!.rotation.x = 0.55; J.kneeR!.rotation.x = 0.55; J.pelvis!.position.y = 0.84 }
  if (st.stumble) { J.spine!.rotation.x = -0.3; J.shoulderL!.rotation.z = -1.2; J.shoulderR!.rotation.z = 1.2; J.shoulderL!.rotation.x = -0.5; J.shoulderR!.rotation.x = -0.5; headX = -0.2 }
  // what the arms say: a gesture eases in over what the body was doing and eases out again
  const gName = st.gesture ?? ''
  if (gName !== S.gName) { S.gName = gName; S.gT = 0 } else S.gT += dt
  const G = gName ? gesture(gName as Gesture, live ? S.gT : 9, t + S.seed, st.gestureYaw ?? 0, kid ? 0 : clamp(bend * 2.2, 0, 1)) : null
  const a = live ? Math.min(1, dt * 6.5) : 1
  const ease = (key: string, base: number): number => {
    const want = G?.[key]; let w = S.gw[key] ?? 0, v = S.gv[key] ?? base
    if (want !== undefined) { if (w < 0.02) v = base; v += (want - v) * a; w += (1 - w) * a } else { if (w < 0.004) { S.gw[key] = 0; return base } w += (0 - w) * a }
    S.gv[key] = v; S.gw[key] = w
    return base + (v - base) * (w * w * (3 - 2 * w))
  }
  if (G || S.gw.any) {
    S.gw.any = G ? 1 : Math.max(0, (S.gw.any ?? 0) - dt * 0.8)
    J.shoulderL!.rotation.x = ease('Lx', J.shoulderL!.rotation.x); J.shoulderL!.rotation.z = ease('Lz', J.shoulderL!.rotation.z); J.elbowL!.rotation.x = ease('Le', J.elbowL!.rotation.x)
    J.shoulderR!.rotation.x = ease('Rx', J.shoulderR!.rotation.x); J.shoulderR!.rotation.z = ease('Rz', J.shoulderR!.rotation.z); J.elbowR!.rotation.x = ease('Re', J.elbowR!.rotation.x)
    J.spine!.rotation.x += ease('sX', 0); J.spine!.rotation.y += ease('sY', 0); J.spine!.rotation.z += ease('sZ', 0)
    headX += ease('hX', 0); headY += ease('hY', 0); headZ += ease('hZ', 0); J.pelvis!.position.y += ease('pY', 0)
    if (J.wristL) { J.wristL.rotation.y = ease('wL', 0); J.wristR!.rotation.y = ease('wR', 0) }
    if (live) { curl(J.handR, ease('gR', 0), ease('iR', 0), ease('kR', 0)); curl(J.handL, ease('gL', 0), 0, 0) }
    if (gName === 'kick') { const kk = Math.sin(clamp(S.gT / 0.45, 0, 1) * Math.PI); J.hipR!.rotation.x -= kk * 1.05; J.kneeR!.rotation.x += kk * 0.35 * (S.gT < 0.2 ? 2 : 0.3) }
  }
  J.head!.rotation.set(headX, headY, headZ)
  // what hangs on him comes after him: the scarf's ends, the bag on his back
  face.tails.forEach((tp, i) => { tp.rotation.x = -0.08 + k * 0.9 + Math.sin(ph * 2 + i) * 0.18 * k + Math.sin(t * 1.7 + i) * 0.04 - J.spine!.rotation.x * 0.8; tp.rotation.z = (i ? 1 : -1) * (0.08 + k * 0.2) + clamp(yr * 0.06, -0.3, 0.3) })
  if (J.pack) { J.pack.position.y = 0.3 - late.bob * 0.7 * amp; J.pack.rotation.z = -late.pelvisRoll * amp * 1.4 - clamp(yr * 0.03, -0.1, 0.1); J.pack.rotation.x = -clamp(acc * 0.1, -0.08, 0.14) }
  // the face
  u.blink -= dt
  if (u.blink < 0) u.blink = Math.random() < 0.18 ? 0.34 : 2.2 + Math.random() * 3.8
  const shut = u.blink < 0.16 ? Math.sin((u.blink / 0.16) * Math.PI) : 0
  const eff = st.effort ?? 0, joy = st.joy ?? 0
  const M = st.mood ? MOODS[st.mood] : null
  const want = M ?? [0.3 + joy * 0.55, joy * 0.3, joy * 0.006, 0, 0, 0, 0]
  const F = S.f
  for (let i = 0; i < 7; i++) F[i] = live ? F[i]! + (want[i]! - F[i]!) * Math.min(1, dt * 7) : want[i]!
  const [curve, squint, browY, browIn, wide, openM] = F as [number, number, number, number, number, number, number]
  if (M) J.head!.rotation.x += F[6]!
  // the eyes: held on whoever he is with, or going about on their own; they move before the head does
  if (live) { S.sac -= dt; if (S.sac < 0) { S.sac = 0.5 + Math.random() * (st.gaze ? 2.2 : 1.5); const r = st.gaze ? 0.16 : 0.5; S.sx = (Math.random() - 0.5) * 2 * r; S.sy = (Math.random() - 0.5) * r } }
  const ex = clamp((st.eyeX ?? 0) + (live ? S.sx + clamp((wantY - S.hy) * 2.4, -1, 1) : 0), -1.2, 1.2), ey = clamp((st.eyeY ?? 0) + (live ? S.sy - clamp((wantX - S.hx) * 2, -0.8, 0.8) : 0), -1, 1)
  const openEye = (1 - shut * 0.93) * (eff > 0.5 ? 0.82 : 1) * (1 - squint * 0.36 + wide * 0.22)
  face.eyes.forEach((e, i) => { e.scale.y = openEye; face.irises[i]!.scale.y = Math.min(1, openEye + 0.1) * (shut > 0.6 ? 0.2 : 1); face.irises[i]!.position.x = (i ? 1 : -1) * 0.056 + ex * 0.011; face.irises[i]!.position.y = 0.022 + ey * 0.009 - squint * 0.002 })
  face.lids?.forEach(l => { l.rotation.x = -0.35 + shut * 1.15 + squint * 0.3 - wide * 0.2; l.scale.y = 0.9 + shut * 0.35 })
  face.brows.forEach((b, i) => { const sgn = i ? 1 : -1; b.position.y = 0.078 + browY + Math.max(0, curve) * 0.006 + joy * 0.004 - eff * 0.01 - shut * 0.003; b.rotation.z = sgn * (-0.12 + eff * 0.42 - browIn * 0.42 - squint * 0.05 - Math.max(0, curve) * 0.16) })
  // the mouth: a line that curves with the feeling; lips that move with the words, a laugh that opens it
  const sk = st.speak ?? (st.talk ? 1 : 0)
  const syll = sk > 0 ? Math.max(0, Math.sin(t * 10.5 + S.seed)) * (0.55 + 0.45 * Math.sin(t * 3.7 + S.seed * 3)) * (0.6 + 0.4 * Math.sin(t * 23.1)) : 0
  const laugh = openM > 0.55 ? 0.82 + Math.sin(t * 13) * 0.18 : 1
  const open = clamp(Math.max(st.panting ? 0.55 + Math.abs(breath) * 0.35 : 0, sk * (0.1 + syll * 0.62), openM * laugh, st.celebrate || st.scarfUp ? 0.6 + Math.sin(t * 5 + S.seed) * 0.2 : 0, eff > 0.6 ? 0.3 : 0), 0, 1)
  const round = wide > 0.2 ? 0.72 : 1
  face.open.scale.set((0.82 + Math.max(0, curve) * 0.3 + (sk > 0 ? Math.sin(t * 5.3 + S.seed) * 0.12 : 0)) * round, 0.05 + open * 0.55, 0.45); face.open.visible = open > 0.08
  face.smile.visible = open <= 0.08
  const up = curve >= 0, depth = up ? 0.16 + curve * 0.72 : 0.16 + -curve * 0.5
  face.smile.rotation.z = up ? Math.PI : 0; face.smile.position.y = up ? -0.076 + curve * 0.004 : -0.074 - 0.03 * depth - 0.006
  face.smile.scale.set(0.95 + Math.max(0, curve) * 0.5, depth, 1 + Math.max(0, curve) * 0.4)
}

/** give a figure its own rhythm (the crowd's one template is everybody in turn: each gets his own sway and breath) */
export function seedFigure(fig: THREE.Object3D, seed: number): void { const u = fig.userData as FigureData; ((u.s ??= newLive()) as Live).seed = seed }

export function disposeFigure(fig: THREE.Object3D): void {
  const u = fig.userData as FigureData
  u.materials?.forEach(m => m.dispose())
}
