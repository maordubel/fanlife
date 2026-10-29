/**
 * LIFE · RUSH — the flat, drawn (place `flat`): a home with its ceiling off, seen from above like a doll's house.
 *
 * Floors by room (boards, tiles, a carpet in his room), walls with their doors cut out, the furniture the level
 * blocks, windows full of the afternoon, warm lamps. The walls between the camera and the boy turn to glass so he is
 * never lost behind one. Dad sits on the sofa by the radio; Mum and the cat go about their business; the toys lie
 * where he left them. Every colour is a neutral home colour or the club's own (his blanket, his rug) — never a rival's.
 */
import * as THREE from 'three'
import {patrolAt, type Level} from '@/lib/life/rush/level'
import {FLAT_DOORS, FLAT_RADIO, FLAT_SEAT} from '@/lib/life/rush/flat'
import type {Sim} from '@/lib/life/rush/sim'
import type {VoxelSkin} from '@/lib/life/universal/skin'
import {pose, type FigureData} from './figure'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {propCopy} from './props'
import type {SurfaceName} from './surfaces'

/** the furniture as models (kiln: `scripts/life/rush/home.kx.js`) — loaded once, the drawn boxes stand in until then */
let homeLib: Promise<Map<string, THREE.Object3D> | null> | null = null
function loadHome(): Promise<Map<string, THREE.Object3D> | null> {
  if (!homeLib) homeLib = new GLTFLoader().loadAsync('/life/rush/models/home.glb').then(g => new Map(g.scene.children.map(o => [o.name, o] as const))).catch(() => { homeLib = null; return null })
  return homeLib
}
/** which model a block is, which way it faces (radians about y, the model faces +z), and the things set beside it */
const MODEL: Record<string, {m: string; yaw: number}> = {
  sofa: {m: 'sofa', yaw: Math.PI / 2}, armchair: {m: 'armchair', yaw: Math.PI}, 'table-low': {m: 'table_low', yaw: 0}, sideboard: {m: 'sideboard', yaw: 0},
  counter: {m: 'counter', yaw: -Math.PI / 2}, table: {m: 'table', yaw: 0}, fridge: {m: 'fridge', yaw: 0}, bed: {m: 'bed', yaw: 0},
  wardrobe: {m: 'wardrobe', yaw: 0}, desk: {m: 'desk', yaw: 0}, shoes: {m: 'shoes', yaw: -Math.PI / 2},
}

type Ctx = {
  scene: THREE.Scene
  keep: <T extends {dispose(): void}>(x: T) => T
  level: Level
  skin: VoxelSkin
  night: boolean
  lite: boolean
  banned: (hex: string) => boolean
  /** a person in a look the stage already knows how to draw */
  person: (o: {curly?: boolean; top: string; pants: string; hair: string; beard?: boolean; scale?: number}) => THREE.Group
  /** a floor material the stage lays its loom tile on when it arrives (world-space, `surfaces.ts`) */
  ground: (name: SurfaceName, m: THREE.MeshStandardMaterial) => THREE.MeshStandardMaterial
  glowTex: THREE.Texture
}

const WALL_H = 2.55, WALL_T = 0.18

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat: [number, number]): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  draw(c.getContext('2d')!, w, h)
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}

export function dressFlat(c: Ctx): {update(sim: Sim, t: number, dt: number, ending: boolean, outcome: string | null): void} {
  const {scene, keep, level, skin, night, lite} = c
  const std = (color: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) => keep(new THREE.MeshStandardMaterial({color, roughness: 0.8, metalness: 0, ...o}))
  const box = keep(new THREE.BoxGeometry(1, 1, 1))
  const pick = (list: string[], fallback: string) => list.find(h => !c.banned(h)) ?? fallback
  let into: THREE.Object3D = scene
  const put = (mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, shadow = true) => {
    const m = new THREE.Mesh(box, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = shadow && !lite; m.receiveShadow = true; into.add(m); return m
  }
  // a soft dark patch under whatever stands on the floor: what makes it stand ON the floor, shadows or no shadows (phones)
  const blobTex = keep(canvasTex(64, 64, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(0.6, 'rgba(0,0,0,.28)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w) }, [1, 1]))
  blobTex.wrapS = blobTex.wrapT = THREE.ClampToEdgeWrapping; blobTex.repeat.set(1, 1)
  const blobMat = keep(new THREE.MeshBasicMaterial({map: blobTex, transparent: true, depthWrite: false, opacity: lite ? 0.85 : 0.6}))
  const blobGeo = keep(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2))
  const blob = (x: number, z: number, w: number, d: number, k = 1) => { const m = new THREE.Mesh(blobGeo, blobMat); m.position.set(x, 0.012, z); m.scale.set(w * 1.35 * k, 1, d * 1.35 * k); m.renderOrder = 1; scene.add(m); return m }

  /* the world outside the flat: dark, so the house reads as a cut-away */
  const under = new THREE.Mesh(keep(new THREE.PlaneGeometry(400, 400)), std(night ? '#0d0f14' : '#2a2622', {roughness: 1}))
  under.rotation.x = -Math.PI / 2; under.position.y = -0.03; scene.add(under)

  /* floors */
  const seeded = (() => { let s = (level.seed >>> 0) % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647 })()
  const boards = keep(canvasTex(256, 256, (g, w, h) => {
    for (let i = 0; i < 8; i++) { const v = 0.82 + seeded() * 0.22; g.fillStyle = `rgb(${Math.round(150 * v)},${Math.round(104 * v)},${Math.round(70 * v)})`; g.fillRect(0, i * h / 8, w, h / 8 - 2); g.fillStyle = 'rgba(40,24,14,.5)'; g.fillRect(seeded() * w, i * h / 8, 2, h / 8) }
    for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(60,36,20,${seeded() * 0.12})`; g.fillRect(seeded() * w, seeded() * h, 8 + seeded() * 30, 1) }
  }, [1, 1]))
  const tiles = keep(canvasTex(128, 128, (g, w) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#e9e4d8' : '#c9c2b2'; g.fillRect(x * 32, y * 32, 31, 31) } }, [1, 1]))
  const carpetC = new THREE.Color('#8f7f72').lerp(new THREE.Color(skin.p), 0.14).getStyle()
  const carpet = keep(canvasTex(128, 128, (g, w, h) => { g.fillStyle = carpetC; g.fillRect(0, 0, w, h); for (let k = 0; k < 2400; k++) { g.fillStyle = `rgba(0,0,0,${seeded() * 0.07})`; g.fillRect(seeded() * w, seeded() * h, 1, 1) } }, [1, 1]))
  for (const r of level.rooms) {
    const w = r.rect.x1 - r.rect.x0 + WALL_T, d = r.rect.z1 - r.rect.z0 + WALL_T
    const map = (r.floor === 'tile' ? tiles : r.floor === 'carpet' ? carpet : boards).clone(); keep(map)
    map.repeat.set(w / (r.floor === 'tile' ? 1.6 : 2.4), d / (r.floor === 'tile' ? 1.6 : 2.4)); map.needsUpdate = true
    const f = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, d)), c.ground(r.floor === 'tile' ? 'tiles' : r.floor === 'carpet' ? 'carpet' : 'boards', std('#ffffff', {map, roughness: r.floor === 'tile' ? 0.35 : 0.75})))
    f.rotation.x = -Math.PI / 2; f.position.set((r.rect.x0 + r.rect.x1) / 2, 0.002, (r.rect.z0 + r.rect.z1) / 2); f.receiveShadow = true; scene.add(f)
  }
  for (const d of FLAT_DOORS) {
    const f = new THREE.Mesh(keep(new THREE.PlaneGeometry(d.rect.x1 - d.rect.x0, d.rect.z1 - d.rect.z0)), std('#8a6448', {roughness: 0.7}))
    f.rotation.x = -Math.PI / 2; f.position.set((d.rect.x0 + d.rect.x1) / 2, 0.004, (d.rect.z0 + d.rect.z1) / 2); f.receiveShadow = true; scene.add(f)
  }

  /* walls: every room's edges, with the doors cut out; the ones between the camera and him fade */
  const paper: Record<string, string> = {living: '#e8dcc4', hall: '#ece4d2', kitchen: '#e2e6da', bedroom: '#dde4ec'}
  type Wall = {mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; z: number; alongX: boolean; x0: number; x1: number}
  const walls: Wall[] = []
  const skirting = std('#5a4030', {roughness: 0.6})
  const cap = std('#2a2420', {roughness: 0.9})
  const cut = (a0: number, a1: number, holes: [number, number][]) => {
    let segs: [number, number][] = [[a0, a1]]
    for (const [h0, h1] of holes) segs = segs.flatMap(([s0, s1]): [number, number][] => h1 <= s0 || h0 >= s1 ? [[s0, s1]] : ([[s0, h0], [h1, s1]] as [number, number][]).filter(([p, q]) => q - p > 0.05))
    return segs
  }
  for (const r of level.rooms) {
    const {x0, x1, z0, z1} = r.rect
    const edges: {alongX: boolean; at: number; a0: number; a1: number; out: number}[] = [
      {alongX: true, at: z0, a0: x0, a1: x1, out: -1}, {alongX: true, at: z1, a0: x0, a1: x1, out: 1},
      {alongX: false, at: x0, a0: z0, a1: z1, out: -1}, {alongX: false, at: x1, a0: z0, a1: z1, out: 1},
    ]
    for (const e of edges) {
      const holes = FLAT_DOORS.filter(d => e.alongX ? d.rect.z0 <= e.at + 0.6 && d.rect.z1 >= e.at - 0.6 && d.rect.x1 > e.a0 && d.rect.x0 < e.a1 && d.rect.x1 - d.rect.x0 > d.rect.z1 - d.rect.z0
        : d.rect.x0 <= e.at + 0.6 && d.rect.x1 >= e.at - 0.6 && d.rect.z1 > e.a0 && d.rect.z0 < e.a1 && d.rect.z1 - d.rect.z0 > d.rect.x1 - d.rect.x0)
        .map(d => (e.alongX ? [d.rect.x0, d.rect.x1] : [d.rect.z0, d.rect.z1]) as [number, number])
      for (const [s0, s1] of cut(e.a0 - WALL_T / 2, e.a1 + WALL_T / 2, holes)) {
        const mat = std(paper[r.id] ?? '#e6e0d4', {roughness: 0.92, transparent: true})
        const len = s1 - s0, mid = (s0 + s1) / 2, at = e.at + e.out * WALL_T / 2
        const m = e.alongX ? put(mat, mid, WALL_H / 2, at, len, WALL_H, WALL_T) : put(mat, at, WALL_H / 2, mid, WALL_T, WALL_H, len)
        walls.push({mesh: m, mat, z: at, alongX: e.alongX, x0: e.alongX ? s0 : at, x1: e.alongX ? s1 : at})
        // the skirting and the cut top of the wall: what makes it read as a doll's house and not a maze
        if (e.alongX) { put(skirting, mid, 0.06, at - e.out * (WALL_T / 2 + 0.01), len, 0.12, 0.02, false); put(cap, mid, WALL_H + 0.01, at, len, 0.02, WALL_T + 0.01, false) }
        else { put(skirting, at - e.out * (WALL_T / 2 + 0.01), 0.06, mid, 0.02, 0.12, len, false); put(cap, at, WALL_H + 0.01, mid, WALL_T + 0.01, 0.02, len, false) }
      }
    }
  }
  // door frames
  const frame = std('#6b4a34', {roughness: 0.55})
  for (const d of FLAT_DOORS) {
    const across = d.rect.x1 - d.rect.x0 < d.rect.z1 - d.rect.z0
    const cx = (d.rect.x0 + d.rect.x1) / 2
    // two slim posts and a threshold: a doorway, not a gap
    for (const end of across ? [d.rect.z0, d.rect.z1] : [d.rect.x0, d.rect.x1]) across ? put(frame, cx, WALL_H / 2, end, 0.3, WALL_H, 0.07) : put(frame, end, WALL_H / 2, (d.rect.z0 + d.rect.z1) / 2, 0.07, WALL_H, 0.3)
  }

  /* windows: on the far walls, full of the afternoon (or of the street lamps) */
  const winMat = keep(new THREE.MeshBasicMaterial({color: new THREE.Color(night ? '#3a4a70' : '#cfe3f5').multiplyScalar(night ? 1 : 1.25), toneMapped: false}))
  const sill = std('#f2ede2')
  for (const r of level.rooms) {
    if (r.id === 'hall') continue
    const z = r.rect.z0 + 0.01, w = r.rect.x1 - r.rect.x0
    for (const k of w > 9 ? [0.3, 0.7] : [0.5]) {
      const x = r.rect.x0 + w * k
      const p = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.5, 1.15)), winMat); p.position.set(x, 1.55, z); scene.add(p)
      put(sill, x, 0.95, z + 0.05, 1.7, 0.06, 0.12, false)
      put(frame, x, 1.55, z + 0.02, 0.06, 1.15, 0.04, false)
      if (!night && !lite) { const sun = new THREE.SpotLight('#fff1d8', 14, 9, 0.55, 0.6, 1.4); sun.position.set(x, 2.2, z + 0.2); sun.target.position.set(x, 0, z + 3); scene.add(sun, sun.target) }
    }
  }

  /* lamps: one warm light a room */
  for (const r of level.rooms) {
    if (lite && r.id === 'hall') continue
    const l = new THREE.PointLight('#ffd2a0', night ? 18 : 3.5, 11, 1.6); l.position.set((r.rect.x0 + r.rect.x1) / 2, 2.35, (r.rect.z0 + r.rect.z1) / 2); scene.add(l)
  }

  /* the furniture: every block of the level, as what it is */
  const wood = std('#8a5a3a', {roughness: 0.62}), woodD = std('#5e3d28', {roughness: 0.6})
  const fabric = std(pick(['#6f5a4c', '#5d6b7a', '#7a6a58'], '#6f6a66'), {roughness: 0.95}), fabricD = std(new THREE.Color(fabric.color).multiplyScalar(0.8))
  const white = std('#efece4', {roughness: 0.4}), steel = std('#a9adb3', {metalness: 0.6, roughness: 0.35})
  const blanket = std(skin.p, {roughness: 0.95}), blanketB = std(skin.s, {roughness: 0.95})
  const stands: {b: typeof level.blocks[number]; g: THREE.Group}[] = []
  for (const b of level.blocks) {
    const w = b.x1 - b.x0, d = b.z1 - b.z0, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2
    const g = new THREE.Group(); scene.add(g); into = g; stands.push({b, g})
    blob(cx, cz, w, d)
    if (b.kind === 'sofa') {
      put(fabric, cx + 0.1, 0.22, cz, w - 0.2, 0.44, d)
      put(fabricD, b.x0 + 0.16, 0.55, cz, 0.32, 0.7, d)
      for (const z of [b.z0 + 0.14, b.z1 - 0.14]) put(fabricD, cx, 0.36, z, w, 0.5, 0.28)
      for (const k of [0.3, 0.7]) put(fabric, cx + 0.18, 0.5, b.z0 + d * k, w - 0.56, 0.14, d * 0.4 - 0.08)
    } else if (b.kind === 'armchair') {
      put(fabric, cx, 0.22, cz, w, 0.44, d)
      put(fabricD, cx, 0.55, b.z1 - 0.16, w, 0.7, 0.32)
    } else if (b.kind === 'table-low' || b.kind === 'table' || b.kind === 'desk') {
      put(wood, cx, b.h - 0.03, cz, w, 0.06, d)
      for (const [x, z] of [[b.x0 + 0.1, b.z0 + 0.1], [b.x1 - 0.1, b.z0 + 0.1], [b.x0 + 0.1, b.z1 - 0.1], [b.x1 - 0.1, b.z1 - 0.1]] as const) put(woodD, x, (b.h - 0.06) / 2, z, 0.08, b.h - 0.06, 0.08)
      if (b.kind === 'table') for (const z of [b.z0 - 0.35, b.z1 + 0.35]) { put(woodD, cx, 0.24, z, 0.5, 0.05, 0.45); put(woodD, cx, 0.55, z + (z < cz ? -0.2 : 0.2), 0.5, 0.6, 0.05) }
      if (b.kind === 'desk') { const lamp = new THREE.PointLight('#ffc890', night ? 6 : 1.5, 3, 2); lamp.position.set(b.x1 - 0.4, b.h + 0.5, cz); scene.add(lamp); put(steel, b.x1 - 0.4, b.h + 0.25, cz, 0.06, 0.5, 0.06, false) }
    } else if (b.kind === 'sideboard') {
      put(wood, cx, b.h / 2, cz, w, b.h, d)
      put(woodD, cx, b.h * 0.5, b.z1 + 0.005, w - 0.1, b.h - 0.12, 0.01, false)
    } else if (b.kind === 'counter') {
      put(white, cx, b.h / 2, cz, w, b.h, d)
      put(std('#7d7a74', {roughness: 0.3}), cx, b.h + 0.02, cz, w + 0.04, 0.04, d + 0.04)
      for (let z = b.z0 + 0.7; z < b.z1 - 0.3; z += 1.3) put(steel, b.x0 - 0.01, b.h - 0.14, z, 0.02, 0.03, 0.4, false)
      put(steel, cx, b.h + 0.05, b.z1 - 1.6, w * 0.6, 0.04, 0.7, false)
    } else if (b.kind === 'fridge') {
      put(white, cx, b.h / 2, cz, w, b.h, d)
      put(steel, b.x1 + 0.01, b.h * 0.6, cz + d * 0.3, 0.03, 0.4, 0.04, false)
    } else if (b.kind === 'bed') {
      put(woodD, cx, 0.18, cz, w, 0.36, d)
      put(white, cx, 0.42, cz, w - 0.08, 0.14, d - 0.08)
      put(blanket, cx, 0.5, cz + d * 0.12, w - 0.04, 0.06, d * 0.72)
      put(blanketB, cx, 0.535, cz + d * 0.12 - d * 0.3, w - 0.04, 0.012, 0.18, false)
      put(white, cx, 0.56, b.z0 + 0.35, w * 0.6, 0.12, 0.42)
    } else if (b.kind === 'wardrobe') {
      put(wood, cx, b.h / 2, cz, w, b.h, d)
      put(woodD, cx, b.h / 2, b.z1 + 0.005, 0.02, b.h - 0.1, 0.01, false)
      // the box on top: the archive, Dad calls it
      put(std('#b08a5a', {roughness: 0.9}), cx - w * 0.15, b.h + 0.16, cz, 0.7, 0.32, 0.5)
    } else if (b.kind === 'shoes') {
      put(woodD, cx, b.h / 2, cz, w, b.h, d)
      for (let k = 0; k < 4; k++) put(std(['#2b2f3a', '#6a4a32', '#efece4', '#3a3f4f'][k]!), b.x0 + 0.2, b.h + 0.05, b.z0 + 0.25 + k * 0.32, 0.26, 0.1, 0.12, false)
    } else put(wood, cx, b.h / 2, cz, w, b.h, d)
  }
  into = scene
  // the radio on the sideboard: the thing the whole afternoon is about
  const radio = new THREE.Group(); radio.position.set(FLAT_RADIO.x, 0.85, FLAT_RADIO.z); scene.add(radio)
  { const body = new THREE.Mesh(box, std('#4a3024', {roughness: 0.5})); body.scale.set(0.7, 0.42, 0.3); body.position.y = 0.21; body.castShadow = !lite; radio.add(body)
    const grille = new THREE.Mesh(box, std('#cbb994', {roughness: 0.9})); grille.scale.set(0.36, 0.3, 0.01); grille.position.set(-0.13, 0.21, 0.152); radio.add(grille)
    const ant = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.008, 0.008, 0.8)), steel); ant.position.set(0.25, 0.75, 0); ant.rotation.z = -0.35; radio.add(ant) }
  const dial = new THREE.Mesh(keep(new THREE.CircleGeometry(0.07, 20)), keep(new THREE.MeshBasicMaterial({color: '#3a2a20', toneMapped: false}))); dial.position.set(0.2, 1.06, FLAT_RADIO.z + 0.155); dial.position.x += FLAT_RADIO.x; scene.add(dial)
  /* the furniture as models: each replaces its drawn stand-in when the file arrives (at the flat's own scale), and the
     small things of a lived-in home are set about: a lamp by the sofa, plants, books, chairs round the tables */
  const S = 1.3
  const decor: {m: string; x: number; z: number; yaw: number}[] = [
    {m: 'lamp_floor', x: -9.75, z: -3.25, yaw: 0}, {m: 'bookshelf', x: -8.4, z: -3.69, yaw: 0}, {m: 'plant', x: 1.75, z: 7.05, yaw: 0.6},
    {m: 'plant', x: 5.25, z: -17.55, yaw: 2}, {m: 'chair', x: 9.62, z: -7.75, yaw: 0}, {m: 'chair', x: 9.62, z: -5.4, yaw: Math.PI},
    {m: 'chair', x: 1.36, z: -16.45, yaw: Math.PI}, {m: 'bookshelf', x: 2.07, z: -9.6, yaw: -Math.PI / 2}, {m: 'radio', x: FLAT_RADIO.x, z: FLAT_RADIO.z, yaw: 0},
  ]
  const mats = new Map<string, THREE.Material>()
  void loadHome().then(lib => {
    if (!lib) return
    const copy = (name: string) => { const src = lib.get(name); return src ? propCopy(src, {p: skin.p, s: skin.s}, mats, keep, !lite) : null }
    for (const st of stands) {
      const def = MODEL[st.b.kind], o = def && copy(def.m)
      if (!o) continue
      o.scale.setScalar(S); o.rotation.y = def.yaw; o.position.set((st.b.x0 + st.b.x1) / 2, 0, (st.b.z0 + st.b.z1) / 2)
      o.traverse(n => { const m = n as THREE.Mesh; if (m.isMesh) { m.receiveShadow = true; m.castShadow = !lite } })
      scene.remove(st.g); scene.add(o)
    }
    for (const d of decor) {
      const o = copy(d.m)
      if (!o) continue
      o.scale.setScalar(S); o.rotation.y = d.yaw; o.position.set(d.x, d.m === 'radio' ? 0.84 * S : 0, d.z)
      scene.add(o)
      if (d.m === 'radio') { radio.visible = false; dial.position.set(d.x + 0.17 * S, (0.84 + 0.2) * S, d.z + 0.15 * S) }
      else blob(d.x, d.z, d.m === 'bookshelf' ? 1.1 : 0.5, d.m === 'bookshelf' ? 0.4 : 0.5, 0.9)
    }
  })

  /* the afternoon through the windows: shafts of light on the floor, and dust turning in them */
  const beams: THREE.Mesh[] = []
  if (!night) {
    const beamTex = keep(canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,236,200,.0)'); gr.addColorStop(0.25, 'rgba(255,236,200,.55)'); gr.addColorStop(1, 'rgba(255,236,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h) }, [1, 1]))
    beamTex.wrapS = beamTex.wrapT = THREE.ClampToEdgeWrapping
    const beamMat = keep(new THREE.MeshBasicMaterial({map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.32, toneMapped: false}))
    for (const r of level.rooms) {
      if (r.id === 'hall') continue
      const w = r.rect.x1 - r.rect.x0
      for (const k of w > 9 ? [0.3, 0.7] : [0.5]) {
        // a slanting sheet from the window down to a lit patch on the floor
        const x = r.rect.x0 + w * k, z = r.rect.z0
        const sheet = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.5, 3.4)), beamMat); sheet.position.set(x, 1.15, z + 1.5); sheet.rotation.x = -1.0; scene.add(sheet); beams.push(sheet)
        const patch = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.7, 1.6).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({map: c.glowTex, color: new THREE.Color('#ffe6bf').multiplyScalar(0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false})))
        patch.position.set(x, 0.015, z + 2.9); patch.scale.set(1, 1, 1.6); scene.add(patch)
      }
    }
  }
  const DUST = lite ? 120 : 320, dustPos = new Float32Array(DUST * 3), dustSeed = new Float32Array(DUST)
  for (let i = 0; i < DUST; i++) { const r = level.rooms[i % level.rooms.length]!.rect; dustPos[i * 3] = r.x0 + seeded() * (r.x1 - r.x0); dustPos[i * 3 + 1] = 0.3 + seeded() * 2; dustPos[i * 3 + 2] = r.z0 + seeded() * (r.z1 - r.z0); dustSeed[i] = seeded() * 6.28 }
  const dustGeo = keep(new THREE.BufferGeometry()); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  const dust = new THREE.Points(dustGeo, keep(new THREE.PointsMaterial({map: c.glowTex, color: night ? '#9fb0d8' : '#fff0d6', size: 0.06, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending})))
  scene.add(dust)
  // a soft shadow under everybody who moves (the boy, Dad, Mum, the cat)
  const heroBlob = blob(0, 0, 0.5, 0.5, 1)
  // and a ring of his club's colour round his feet: from above, in a busy room, you always know which one is you
  const heroRing = new THREE.Mesh(keep(new THREE.RingGeometry(0.36, 0.46, 36).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({color: new THREE.Color(skin.p).multiplyScalar(1.3), transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false})))
  heroRing.renderOrder = 2; scene.add(heroRing)
  // a rug under the low table, in the club's own colour
  const rug = new THREE.Mesh(keep(new THREE.PlaneGeometry(3.4, 2.8)), std(new THREE.Color(skin.p).multiplyScalar(0.62), {roughness: 1})); rug.rotation.x = -Math.PI / 2; rug.position.set(-7.0, 0.006, 3.9); rug.receiveShadow = true; scene.add(rug)

  /* the toys: where he left them */
  const toys = level.trips.map((tr, i) => {
    const g = new THREE.Group(); g.position.set(tr.x, 0, tr.z); g.rotation.y = i * 1.7; scene.add(g)
    if (tr.kind === 'ball') { const b2 = new THREE.Mesh(keep(new THREE.SphereGeometry(0.16, 16, 12)), std('#efece4', {roughness: 0.5})); b2.position.y = 0.16; b2.castShadow = !lite; g.add(b2); const band = new THREE.Mesh(keep(new THREE.TorusGeometry(0.162, 0.02, 6, 24)), std(skin.p)); band.position.y = 0.16; g.add(band) }
    else if (tr.kind === 'car') { const car = new THREE.Mesh(box, std(skin.s, {roughness: 0.4})); car.scale.set(0.32, 0.12, 0.16); car.position.y = 0.09; g.add(car); for (const [x, z] of [[-0.1, 0.08], [0.1, 0.08], [-0.1, -0.08], [0.1, -0.08]] as const) { const wh = new THREE.Mesh(box, std('#1d1f24')); wh.scale.set(0.06, 0.06, 0.03); wh.position.set(x, 0.03, z); g.add(wh) } }
    else for (let k = 0; k < 5; k++) { const cube = new THREE.Mesh(box, std([skin.p, skin.s, '#efece4', '#5d6b7a', skin.p][k]!, {roughness: 0.5})); cube.scale.setScalar(0.12); cube.position.set((k % 3) * 0.15 - 0.15, 0.06 + Math.floor(k / 3) * 0.12, (k % 2) * 0.1); cube.rotation.y = k; cube.castShadow = !lite; g.add(cube) }
    return g
  })

  /* the people: Dad on the sofa, Mum going about, the cat */
  const dad = c.person({top: pick(['#5d6b7a', '#6a6f7a'], '#6a6f7a'), pants: '#2c3446', hair: '#2a1d16', beard: true, scale: 1.02})
  dad.position.set(FLAT_SEAT.x, 0, FLAT_SEAT.z); dad.rotation.y = FLAT_SEAT.face; scene.add(dad)
  const walkerBlobs = level.patrols.map(p => blob(0, 0, p.role === 'cat' ? 0.3 : 0.5, p.role === 'cat' ? 0.55 : 0.5))
  const patrolFigs = level.patrols.map(p => {
    if (p.role === 'cat') {
      const g = new THREE.Group(), fur = std('#3a302a', {roughness: 0.95})
      const body = new THREE.Mesh(keep(new THREE.CapsuleGeometry(0.1, 0.28, 4, 10).rotateX(Math.PI / 2)), fur); body.position.y = 0.2; g.add(body)
      const head = new THREE.Mesh(keep(new THREE.SphereGeometry(0.09, 12, 10)), fur); head.position.set(0, 0.3, 0.22); g.add(head)
      for (const s of [-1, 1]) { const ear = new THREE.Mesh(keep(new THREE.ConeGeometry(0.035, 0.07, 6)), fur); ear.position.set(s * 0.05, 0.39, 0.22); g.add(ear) }
      const tail = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.018, 0.012, 0.32)), fur); tail.position.set(0, 0.32, -0.24); tail.rotation.x = -0.7; tail.name = 'tail'; g.add(tail)
      const legs: THREE.Mesh[] = []
      for (const [x, z] of [[-0.05, 0.12], [0.05, 0.12], [-0.05, -0.12], [0.05, -0.12]] as const) { const l = new THREE.Mesh(box, fur); l.scale.set(0.035, 0.16, 0.035); l.position.set(x, 0.08, z); g.add(l); legs.push(l) }
      g.userData.legs = legs; g.castShadow = !lite; scene.add(g); return g
    }
    const m = c.person({curly: true, top: pick(['#7a4a5a', '#5a6a6a', '#6a5a7a'], '#6a6f7a'), pants: '#3a3f4f', hair: '#3b2a1e', scale: 0.97}); scene.add(m)
    const apron = new THREE.Mesh(box, std('#efece4', {roughness: 0.9})); apron.scale.set(0.34, 0.5, 0.02); apron.position.set(0, 0.85, 0.15); m.add(apron)
    return m
  })

  return {
    update(sim, t, dt, ending, outcome) {
      heroBlob.position.set(sim.x, 0.013, sim.z); heroRing.position.set(sim.x, 0.016, sim.z); heroRing.visible = !ending; heroRing.scale.setScalar(1 + Math.sin(t * 5) * 0.06)
      level.patrols.forEach((p, i) => { const at = patrolAt(p, sim.t); walkerBlobs[i]!.position.set(at.x, 0.013, at.z) })
      // the dust turns slowly in the air; the shafts breathe
      const a = dustGeo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < DUST; i++) { const k = dustSeed[i]!; a.setY(i, a.getY(i) + Math.sin(t * 0.4 + k) * 0.0015); a.setX(i, a.getX(i) + Math.cos(t * 0.3 + k) * 0.001) }
      a.needsUpdate = true
      beams.forEach((b, i) => { (b.material as THREE.MeshBasicMaterial).opacity = 0.26 + Math.sin(t * 0.7 + i) * 0.05 })
      // the walls between the camera and him turn to glass: walls along x that stand nearer the camera than he does
      for (const w of walls) {
        const front = w.alongX && w.z > sim.z + 0.3 && sim.x > w.x0 - 3 && sim.x < w.x1 + 3
        const want = front ? 0.16 : 1
        w.mat.opacity += (want - w.mat.opacity) * Math.min(1, dt * 8)
        w.mat.depthWrite = w.mat.opacity > 0.9
      }
      // Dad: seated, watching the door; when you come back with both, on his feet if you made it
      const near = Math.hypot(sim.x - FLAT_SEAT.x, sim.z - FLAT_SEAT.z) < 4.5
      const haveAll = sim.step >= 1
      const looking = Math.atan2(sim.x - FLAT_SEAT.x, sim.z - FLAT_SEAT.z)
      dad.rotation.y += ((near || ending ? looking : FLAT_SEAT.face) - dad.rotation.y) * Math.min(1, dt * 3)
      pose(dad, ending ? (outcome === 'slip' ? {speed: 0, knees: true} : {speed: 0, celebrate: true, joy: 1}) : {speed: 0, wave: near && haveAll, talk: near, joy: haveAll ? 1 : 0, effort: haveAll ? 0 : 0.6}, t, dt)
      if (!(ending && outcome !== 'slip')) {
        const J = (dad.userData as FigureData).J
        J.hipL!.rotation.x = J.hipR!.rotation.x = -1.45; J.kneeL!.rotation.x = J.kneeR!.rotation.x = 1.45
        J.pelvis!.position.y = 0.5; J.spine!.rotation.x = haveAll ? 0.05 : 0.22 + Math.sin(t * 9) * 0.02
      }
      // Mum and the cat on their rounds
      level.patrols.forEach((p, i) => {
        const at = patrolAt(p, sim.t), f = patrolFigs[i]!
        const moved = Math.hypot(at.x - f.position.x, at.z - f.position.z)
        if (moved > 0.0005) f.rotation.y = Math.atan2(at.x - f.position.x, at.z - f.position.z)
        f.position.set(at.x, 0, at.z)
        if (p.role === 'cat') {
          const legs = f.userData.legs as THREE.Mesh[]
          legs.forEach((l, k) => { l.rotation.x = Math.sin(t * 14 + (k % 2 ? Math.PI : 0) + (k > 1 ? 1.2 : 0)) * 0.6 })
          const tail = f.getObjectByName('tail'); if (tail) tail.rotation.z = Math.sin(t * 3) * 0.4
        } else {
          const close = Math.hypot(sim.x - at.x, sim.z - at.z) < 3
          if (close && sim.sprinting) f.rotation.y = Math.atan2(sim.x - at.x, sim.z - at.z)
          pose(f, {speed: close && sim.sprinting ? 0 : p.v, talk: close && sim.sprinting, wave: close && sim.sprinting}, t, dt)
        }
      })
      // the toys wobble when he goes by at speed
      level.trips.forEach((tr, i) => { const d = Math.hypot(sim.x - tr.x, sim.z - tr.z); toys[i]!.rotation.z = d < 1.2 && sim.speed > 3 ? Math.sin(t * 30) * 0.08 : 0 })
      // the radio dial lights when the batteries are in his hand
      ;(dial.material as THREE.MeshBasicMaterial).color.set(haveAll || ending ? (Math.sin(t * 6) > 0 ? '#ff9a50' : '#d8743a') : '#3a2a20')
      radio.rotation.y = 0
    },
  }
}
