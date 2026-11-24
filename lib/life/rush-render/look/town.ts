/**
 * LIFE · the hood as a REAL city (owner 24.11.2026: "another round of the feeling of realism in the streets and of a real
 * city — of Athens, of Tel Aviv"). The dusk rig (`dusk.ts`) lights the street; this module makes it a town and fills it
 * with life. Only DRESSES: nothing here walks, blocks or moves the player.
 *
 *  · fronts(list)  — 3D modules in front of every building front (the Flow pictures or the procedural blocks), so the
 *    street has depth and parallax: Athens' continuous polykatoikia balconies with retractable striped awnings and plants
 *    and a marble entrance; Tel Aviv's rounded Bauhaus balconies with solid parapets, trisim (slatted shutters) and
 *    buildings on pilotis with cars and bicycles under them; laundry that moves in the wind and TVs flickering blue on a
 *    match night in every town.
 *  · the street    — the pavement each city walks on (marble in Athens, concrete slabs and sand verges in Tel Aviv), its
 *    trees (bitter orange with whitewashed trunks; ficus and palms), motorbikes on the pavement, the periptero, cafés
 *    with men at the tables and an old man with his paper, cats, pigeons that lift when the boy comes near, kids on
 *    bikes, a man washing his car, a moped that passes with its own sound, overhead cables, sign plates with no writing,
 *    the port's cranes at the end of Piraeus' side streets, the sea's glow at the west end of Tel Aviv's.
 * Era-aware through `era.ts` (the story's decade). Every colour through the club's policy; never yellow; no text, no
 * flag, no face. One shadow light (none of this casts on `lite`), instanced throughout.
 */
import * as THREE from 'three'
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type {Level} from '@/lib/life/rush/level'
import {readSettings, browserStore} from '@/lib/life/hood/save'
import {decadeOf, ERA_DRESS, type Decade} from '../era'

export type TownId = 'ath' | 'tlv' | 'other'
export type Front = {s: number; zc: number; W: number; H: number; floors: number; lift?: number}
export type TownCtx = {
  scene: THREE.Object3D; level: Level; town: TownId; clubId: string; lite: boolean; year: number | null
  keep: <T extends {dispose(): void}>(x: T) => T; rnd: () => number; glowTex: THREE.Texture
  banned: (hex: string) => boolean
  /** where the dusk rig already stood something on the pavement (trees, stalls, bins, stops), so nothing lands on it */
  taken: {x: number; z: number; r: number}[]
}
export type Town = {fronts(list: Front[]): void; update(sim: {x: number; z: number}, t: number, dt: number): void; dispose(): void}

const C = (h: THREE.ColorRepresentation) => new THREE.Color(h)
const fb = (w: number, h: number, d: number, px: number, py: number, pz: number) => new THREE.BoxGeometry(w, h, d).translate(px, py, pz)
/** a merged geometry with one flat vertex colour per part, so a whole figure is one instanced draw */
function painted(parts: [THREE.BufferGeometry, string][]): THREE.BufferGeometry {
  return mergeGeometries(parts.map(([g0, c]) => {
    const g = g0.index ? g0.toNonIndexed() : g0, n = g.attributes.position!.count, col = new Float32Array(n * 3), cc = C(c)
    for (let i = 0; i < n; i++) col.set([cc.r, cc.g, cc.b], i * 3)
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k)
    return g
  }))!
}
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}
/** marks that read as a sign from across the street and say nothing up close (no readable text in the world) */
export function signMarks(g: CanvasRenderingContext2D, w: number, h: number, ink: string, rnd: () => number) {
  g.fillStyle = ink; let x = w * 0.1
  while (x < w * 0.88) { const cw = h * (0.18 + rnd() * 0.22); g.globalAlpha = 0.85; if (rnd() < 0.5) g.fillRect(x, h * 0.32, cw * 0.28, h * 0.38); else { g.beginPath(); g.ellipse(x + cw * 0.3, h * 0.5, cw * 0.3, h * 0.17, 0, 0, Math.PI * 2); g.fill() } g.fillRect(x, h * (0.3 + rnd() * 0.4), cw * 0.8, h * 0.06); x += cw + (rnd() < 0.18 ? h * 0.25 : h * 0.04) }
  g.globalAlpha = 1
}
/** a shop lit from inside: warm back wall, shelves, a counter and a silhouette or two */
export function shopTexture(rnd: () => number) {
  return canvasTex(256, 160, g => {
    const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, '#fff1df'); gr.addColorStop(0.7, '#ffcf9c'); gr.addColorStop(1, '#b8875e'); g.fillStyle = gr; g.fillRect(0, 0, 256, 160)
    g.fillStyle = 'rgba(90,60,40,.45)'; for (let y = 28; y < 110; y += 22) g.fillRect(0, y, 256, 4)
    for (let k = 0; k < 70; k++) { g.fillStyle = `rgba(${80 + rnd() * 120},${60 + rnd() * 80},${50 + rnd() * 60},.55)`; g.fillRect(rnd() * 250, 10 + Math.floor(rnd() * 4) * 22, 4 + rnd() * 8, 12) }
    g.fillStyle = 'rgba(70,46,32,.7)'; g.fillRect(150, 112, 106, 48)
    const man = (x: number, s: number) => { g.fillStyle = 'rgba(28,20,18,.82)'; g.beginPath(); g.arc(x, 72 * s + 40 * (1 - s), 11 * s, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(x, 120, 21 * s, 40 * s, 0, Math.PI, 0); g.fill(); g.fillRect(x - 21 * s, 118, 42 * s, 50) }
    man(60 + rnd() * 60, 1); if (rnd() < 0.6) man(190 + rnd() * 30, 0.88)
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, 256, 6); g.fillRect(0, 0, 6, 160); g.fillRect(250, 0, 6, 160)
  })
}
/** a roller shutter: ribbed grey metal, the dust darker toward its foot */
export function shutterTexture(rnd: () => number) {
  return canvasTex(128, 128, g => {
    for (let y = 0; y < 128; y += 4) { const v = 120 + rnd() * 18; g.fillStyle = `rgb(${v},${v + 2},${v + 6})`; g.fillRect(0, y, 128, 3); g.fillStyle = 'rgb(70,72,78)'; g.fillRect(0, y + 3, 128, 1) }
    const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(30,26,22,.45)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
    g.fillStyle = 'rgb(48,50,56)'; g.fillRect(0, 122, 128, 6)
    // a tag on some: abstract sprayed shapes, never a word
    if (rnd() < 0.6) { g.lineCap = 'round'; for (let k = 0; k < 3; k++) { g.strokeStyle = ['rgba(40,44,60,.8)', 'rgba(230,226,216,.7)', 'rgba(150,60,70,.6)', 'rgba(60,110,140,.6)'][Math.floor(rnd() * 4)]!; g.lineWidth = 3 + rnd() * 5; g.beginPath(); g.moveTo(10 + rnd() * 30, 60 + rnd() * 40); g.bezierCurveTo(30 + rnd() * 60, 20 + rnd() * 80, 60 + rnd() * 50, 30 + rnd() * 80, 90 + rnd() * 30, 50 + rnd() * 50); g.stroke() } }
  })
}

const AWN: Record<TownId, [string, string][]> = {
  ath: [['#5d7f9c', '#ece6da'], ['#6f8a6a', '#ece6da'], ['#9a6b55', '#e8dfcf'], ['#8a8f99', '#ece6da'], ['#b8afa0', '#e4dccd']],
  tlv: [['#b9a88e', '#ece4d4'], ['#7f8f96', '#e8e2d6']],
  other: [['#6e7680', '#e2dccf']],
}

export function dressTown(x: TownCtx): Town {
  const {level, town, lite, keep, rnd, glowTex} = x
  const root = new THREE.Group(); root.name = 'town'; x.scene.add(root)
  const half = level.half, walk = level.walk, zTop = level.bounds.z1, goalZ = level.goal.z
  const decade: Decade | null = typeof x.year === 'number' ? decadeOf(x.year) : null
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p3 = new THREE.Vector3(), s3 = new THREE.Vector3()
  const put = (im: THREE.InstancedMesh, i: number, px: number, py: number, pz: number, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => { q.setFromEuler(e.set(rx, ry, rz, 'YXZ')); im.setMatrixAt(i, m4.compose(p3.set(px, py, pz), q, s3.set(sx, sy, sz))) }
  const std = (c: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) => keep(new THREE.MeshStandardMaterial({color: c, roughness: 0.8, ...o}))
  const vc = (o: THREE.MeshStandardMaterialParameters = {}) => keep(new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.85, ...o}))
  const ok = (hex: string, fb2 = '#8a8f99') => x.banned(hex) ? fb2 : hex
  const inst = (g: THREE.BufferGeometry, m: THREE.Material, n: number, parent: THREE.Object3D = root) => { const im = new THREE.InstancedMesh(keep(g), m, Math.max(1, n)); im.count = 0; im.frustumCulled = false; parent.add(im); return im }
  const nearCross = (z: number, m = 9) => level.crossings.some(c => Math.abs(z - c) < m)
  const taken = [...x.taken, ...(level.hood?.people ?? []).map(p => ({x: p.x, z: p.z, r: 2.2})), ...(level.hood ? [{x: level.hood.kiosk.x, z: level.hood.kiosk.z, r: 3.5}] : [])]
  const free = (px: number, pz: number, r: number) => !nearCross(pz, 8 + r) && taken.every(t => Math.hypot(t.x - px, t.z - pz) > t.r + r)
  const claim = (px: number, pz: number, r: number) => { taken.push({x: px, z: pz, r}) }
  const ticks: ((t: number, dt: number, sim: {x: number; z: number}) => void)[] = []
  const shirts = ['#3b4250', '#6b6f78', '#e6e0d4', '#5a4a3e', '#2e3a4a', '#7a5a48', '#4a5a4e', '#8c8678'].map(c => ok(c))

  /* ───────────── the fronts: 3D modules on the walls ───────────── */
  let frontGroup: THREE.Group | null = null
  const fronts = (list: Front[]) => {
    if (frontGroup) { root.remove(frontGroup); frontGroup.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose?.() }) }
    const G = new THREE.Group(); frontGroup = G; root.add(G)
    const r2 = mulberry(list.length * 7919 + (x.clubId.length << 4))
    const slabs: [number, number, number, number, number, number, number][] = [] // x y z ry w d (railing kind)
    const awn: {px: number; y: number; z: number; s: number; w: number; k: number}[] = []
    const plants: [number, number, number][] = [], ac: [number, number, number, number][] = [], laundry: [number, number, number, number][] = [], tvs: [number, number, number, number][] = []
    const trisim: [number, number, number, number, number][] = [], round: [number, number, number, number, number][] = [], doors: [number, number, number][] = []
    for (const f of list) {
      const s = f.s, lift = f.lift ?? 0, fx = s * walk, ry = -s * Math.PI / 2
      const storeys = Math.max(1, f.floors), floorY = (k: number) => lift + 4.2 + k * 3.1 // the slab under storey k+1
      const tall = storeys >= 3
      // the entrance: a marble frame, a lit door (not on a building raised on pilotis)
      if (!lift && f.W > 5 && r2() < 0.8) doors.push([fx, 0, f.zc + (r2() - 0.5) * f.W * 0.5])
      for (let k = 0; k < storeys - 1; k++) {
        const y = floorY(k)
        if (town === 'ath' && tall) {
          // the polykatoikia: a continuous balcony across the whole front on every floor
          slabs.push([fx - s * 0.68, y, f.zc, ry, f.W - 0.5, 1.36, 0])
          for (let b = -f.W / 2 + 1.8; b < f.W / 2 - 1.2; b += 3.4) {
            const z = f.zc + b + 0.5
            if (r2() < 0.55) awn.push({px: fx, y: y + 2.95, z, s, w: 3.1, k: Math.floor(r2() * AWN.ath.length)})
            if (r2() < 0.45) plants.push([fx - s * (1.2 + r2() * 0.1), y + 0.32, z + (r2() - 0.5) * 2])
            if (r2() < 0.22) laundry.push([fx - s * 1.05, y + 1.2, z + (r2() - 0.5) * 1.4, ry])
            if (r2() < 0.3) ac.push([fx - s * 0.35, y + 0.42, z + 1.1, ry])
            if (r2() < 0.06) tvs.push([fx - s * 0.03, y + 1.5, z, ry])
          }
        } else if (town === 'tlv') {
          // the white Bauhaus balcony: a solid rendered parapet with a rounded end; trisim half down behind it
          if (r2() < 0.7) { const w = Math.min(f.W - 1, 3.8 + r2() * 3), z = f.zc + (r2() < 0.5 ? -1 : 1) * (f.W / 2 - w / 2 - 0.4)
            round.push([fx - s * 0.6, y, z, ry, w]); if (r2() < 0.7) trisim.push([fx - s * 0.02, y + 1.3, z - 0.2, ry, w * 0.7])
            if (r2() < 0.2) laundry.push([fx - s * 0.85, y + 1.5, z, ry]); if (r2() < 0.4) plants.push([fx - s * 1.0, y + 1.1, z + w / 2 - 0.4]) }
          else if (r2() < 0.6) trisim.push([fx - s * 0.02, y + 1.4, f.zc + (r2() - 0.5) * f.W * 0.5, ry, 1.6])
          if (r2() < 0.6) ac.push([fx - s * 0.32, y + 2.2, f.zc + (r2() - 0.5) * f.W * 0.8, ry])
          if (r2() < 0.08) tvs.push([fx - s * 0.03, y + 1.5, f.zc + (r2() - 0.5) * f.W * 0.6, ry])
        } else {
          // every other town: a balcony here and there, and the life on it
          for (let b = -f.W / 2 + 1.6; b < f.W / 2 - 1; b += 3.2) {
            const z = f.zc + b + 0.3
            if (r2() < 0.18) { slabs.push([fx - s * 0.5, y, z, ry, 1.9, 1.0, 1]); if (r2() < 0.5) plants.push([fx - s * 0.9, y + 0.32, z]); else if (r2() < 0.5) laundry.push([fx - s * 0.8, y + 1.2, z, ry]) }
            if (r2() < 0.07) tvs.push([fx - s * 0.03, y + 1.5, z, ry])
            if (r2() < 0.08) ac.push([fx - s * 0.3, y + 0.5, z + 1, ry])
          }
        }
      }
      if (lift) pilotis(G, f, r2)
    }
    // balcony slabs and railings (one draw each)
    const slabM = inst(fb(1, 1, 1, 0, 0, 0), std('#d6d0c4', {roughness: 0.75}), slabs.length, G)
    const railTex = keep(canvasTex(256, 64, g => { g.clearRect(0, 0, 256, 64); g.fillStyle = '#1e2026'; g.fillRect(0, 0, 256, 5); g.fillRect(0, 59, 256, 5); for (let i = 0; i < 256; i += 10) g.fillRect(i, 0, 2, 64) }))
    railTex.wrapS = THREE.RepeatWrapping
    const railM = inst(new THREE.PlaneGeometry(1, 1), keep(new THREE.MeshStandardMaterial({map: railTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.4})), slabs.length, G)
    slabs.forEach(([px, y, z, ry, w, d], i) => { put(slabM, i, px, y, z, ry, w, 0.17, d); put(railM, i, px - Math.sign(px) * (d / 2 - 0.04), y + 0.55, z, ry, w, 1.0, 1) })
    slabM.count = railM.count = slabs.length; slabM.castShadow = !lite; slabM.receiveShadow = true
    // retractable awnings: striped canvas sloping out from under the slab above, the valance hanging at its edge
    const awTex = AWN[town].map(([a, b]) => keep(canvasTex(128, 64, g => { const n = 10; for (let k = 0; k < n; k++) { g.fillStyle = ok(k % 2 ? b : a, '#9a968c'); g.fillRect(k * 128 / n, 0, 128 / n, 64) } g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(0, 52, 128, 12) })))
    awTex.forEach((t, k) => {
      const mine = awn.filter(a => a.k === k); if (!mine.length) return
      const sheet = inst(new THREE.PlaneGeometry(1, 1), keep(new THREE.MeshStandardMaterial({map: t, side: THREE.DoubleSide, roughness: 0.9, emissive: C('#3a2416'), emissiveIntensity: 0.25})), mine.length, G)
      const val = inst(new THREE.PlaneGeometry(1, 1), keep(new THREE.MeshStandardMaterial({map: t, side: THREE.DoubleSide, roughness: 0.9})), mine.length, G)
      mine.forEach((a, i) => { const out = 1.25; put(sheet, i, a.px - a.s * out / 2 - a.s * 0.05, a.y - 0.42, a.z, -a.s * Math.PI / 2, a.w, 1.4, 1, -Math.PI / 2 + 0.62); put(val, i, a.px - a.s * (out + 0.05), a.y - 0.98, a.z, -a.s * Math.PI / 2, a.w, 0.22, 1) })
      sheet.count = val.count = mine.length
    })
    // plants in pots on the rails (never where green is a rival's)
    if (!x.banned('#3b5e34')) { const pg = painted([[new THREE.CylinderGeometry(0.16, 0.12, 0.3, 8).translate(0, 0, 0), '#9a5a3e'], [new THREE.IcosahedronGeometry(0.3, 1).translate(0, 0.32, 0), '#3d5f34'], [new THREE.IcosahedronGeometry(0.2, 1).translate(0.15, 0.5, 0.1), '#4e7040']])
      const pm = inst(pg, vc(), plants.length, G); plants.forEach(([px, y, z], i) => put(pm, i, px, y, z, r2() * 6, 1, 0.8 + r2() * 0.6, 1)); pm.count = plants.length }
    // air-conditioners on brackets
    const acM = inst(painted([[fb(0.8, 0.52, 0.32, 0, 0, 0), '#d2d3cf'], [new THREE.CylinderGeometry(0.17, 0.17, 0.02, 14).rotateX(Math.PI / 2).translate(0.12, 0, 0.17), '#55585e']]), vc({roughness: 0.55}), ac.length, G)
    ac.forEach(([px, y, z, ry], i) => put(acM, i, px, y, z, ry)); acM.count = ac.length
    // trisim: the slatted roller shutter, at every height between open and shut
    const triTex = keep(canvasTex(64, 128, g => { for (let y = 0; y < 128; y += 5) { g.fillStyle = '#d9d4c8'; g.fillRect(0, y, 64, 4); g.fillStyle = '#8f8a80'; g.fillRect(0, y + 4, 64, 1) } }))
    const triM = inst(new THREE.PlaneGeometry(1, 1), keep(new THREE.MeshStandardMaterial({map: triTex, roughness: 0.7})), trisim.length, G)
    trisim.forEach(([px, y, z, ry, w], i) => { const h = 0.6 + r2() * 1.2; put(triM, i, px, y + 1.0 - h / 2, z, ry, w, h, 1) }); triM.count = trisim.length
    // the rounded white parapet (Tel Aviv): a box with a half-cylinder at its free end, solid render
    if (round.length) {
      const body = inst(fb(1, 1, 1, 0, 0, 0), std('#e9e5dc', {roughness: 0.85}), round.length, G), end = inst(new THREE.CylinderGeometry(1, 1, 1, 18), std('#e9e5dc', {roughness: 0.85}), round.length, G)
      const floorS = inst(fb(1, 1, 1, 0, 0, 0), std('#cfc9bd'), round.length, G)
      round.forEach(([px, y, z, ry, w], i) => { const s = -Math.sign(px), d = 1.2
        // the slab, the solid parapet at its outer edge, and the rounded bow at its free end
        put(floorS, i, px, y, z, ry, w, 0.16, d); put(body, i, px + s * 0.55, y + 0.55, z, ry, w, 1.1, 0.16); put(end, i, px, y + 0.55, z - w / 2, 0, d / 2, 1.1, d / 2) })
      body.count = end.count = floorS.count = round.length; body.castShadow = !lite
    }
    // the entrance: marble frame and steps, a lit door
    const dM = inst(painted([[fb(0.25, 2.8, 2.3, 0, 1.4, 0), '#e6e2da'], [fb(0.6, 0.16, 2.6, -0.3, 0.08, 0), '#d8d4cc'], [fb(0.6, 0.12, 2.3, -0.55, 0.2, 0), '#cfcac0']]), vc({roughness: 0.35}), doors.length, G)
    const dG = inst(new THREE.PlaneGeometry(1.5, 2.3), keep(new THREE.MeshBasicMaterial({color: C('#ffd9b0').multiplyScalar(1.15), toneMapped: false})), doors.length, G)
    doors.forEach(([px, , z], i) => { const s = Math.sign(px); put(dM, i, px - s * 0.12, 0, z, s > 0 ? Math.PI : 0); put(dG, i, px - s * 0.26, 1.25, z, -s * Math.PI / 2) })
    dM.count = dG.count = doors.length
    // laundry on a line, moving in the wind
    const lc = ['#e8e4dc', '#9fb4c8', '#c88a7a', '#d8d0c4', '#8a9a8a', '#ece8e0'].map(c => ok(c, '#d8d2c6'))
    const lnMat = keep(new THREE.MeshStandardMaterial({color: '#ffffff', side: THREE.DoubleSide, roughness: 0.95}))
    const windU = {value: 0}
    lnMat.onBeforeCompile = sh => { sh.uniforms.uWind = windU; sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float ph = instanceMatrix[3].x * .7 + instanceMatrix[3].z * 1.3; float hang = 1. - uv.y;
      transformed.z += (sin(uWind * 2.6 + ph) * .7 + sin(uWind * 5.3 + ph * 2.) * .3) * .14 * hang;
      transformed.x += sin(uWind * 3.1 + ph + position.x * 4.) * .03 * hang;`) }
    lnMat.customProgramCacheKey = () => 'town-laundry'
    const lnM = inst(new THREE.PlaneGeometry(0.55, 0.75).translate(0, -0.375, 0), lnMat, laundry.length * 3, G); let li = 0
    for (const [px, y, z, ry] of laundry) for (let k = 0; k < 3; k++) { put(lnM, li, px, y, z - 0.75 + k * 0.7, ry, 0.8 + r2() * 0.5, 0.8 + r2() * 0.5, 1); lnM.setColorAt(li, C(lc[Math.floor(r2() * lc.length)]!)); li++ }
    lnM.count = li
    const wire: number[] = []; for (const [px, y, z] of laundry) wire.push(px, y + 0.02, z - 1.2, px, y + 0.02, z + 1.2)
    if (wire.length) { const wg = keep(new THREE.BufferGeometry()); wg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(wire), 3)); G.add(new THREE.LineSegments(wg, keep(new THREE.LineBasicMaterial({color: '#2a2a30'})))) }
    // a match night: TVs flickering blue in a few windows
    const tvM = inst(new THREE.PlaneGeometry(1.1, 1.3), keep(new THREE.MeshBasicMaterial({color: '#ffffff', toneMapped: false})), tvs.length, G)
    tvs.forEach(([px, y, z, ry], i) => put(tvM, i, px, y, z, ry)); tvM.count = tvs.length
    const tvK = tvs.map(() => ({v: 0.6, to: 0.6, at: 0}))
    flick = (t: number) => { windU.value = t; tvK.forEach((k, i) => { if (t > k.at) { k.to = 0.35 + rnd() * 0.9; k.at = t + 0.08 + rnd() * 0.5 } k.v += (k.to - k.v) * 0.35; tvM.setColorAt(i, C('#6f9cff').multiplyScalar(k.v)) }); if (tvM.instanceColor) tvM.instanceColor.needsUpdate = true }
  }
  let flick: (t: number) => void = () => {}

  /** a building on pilotis (Tel Aviv): the open ground floor, round columns, a car and bicycles parked in its shade */
  function pilotis(G: THREE.Group, f: Front, r2: () => number) {
    const s = f.s, lift = f.lift ?? 3, fx = s * walk, depth = 5
    const back = new THREE.Mesh(keep(new THREE.PlaneGeometry(f.W, lift)), std('#8f8b84', {roughness: 0.95})); back.position.set(s * (walk + depth), lift / 2, f.zc); back.rotation.y = -s * Math.PI / 2; G.add(back)
    const ceil = new THREE.Mesh(keep(new THREE.PlaneGeometry(depth, f.W)), std('#c9c4ba')); ceil.rotation.x = Math.PI / 2; ceil.position.set(s * (walk + depth / 2), lift, f.zc); G.add(ceil)
    for (const e2 of [-1, 1]) { const side = new THREE.Mesh(keep(new THREE.PlaneGeometry(depth, lift)), std('#a39e95')); side.position.set(s * (walk + depth / 2), lift / 2, f.zc + e2 * f.W / 2); side.rotation.y = e2 > 0 ? Math.PI : 0; G.add(side) }
    const n = Math.max(2, Math.round(f.W / 3.6)), col = keep(new THREE.CylinderGeometry(0.2, 0.2, lift, 12)), cm = std('#e2ddd3', {roughness: 0.7})
    for (let k = 0; k < n; k++) { const c = new THREE.Mesh(col, cm); c.position.set(s * (walk + 0.35), lift / 2, f.zc - f.W / 2 + 0.5 + k * (f.W - 1) / (n - 1)); G.add(c) }
    const bulb = new THREE.Mesh(keep(new THREE.SphereGeometry(0.08, 8, 6)), keep(new THREE.MeshBasicMaterial({color: C('#ffd2a4').multiplyScalar(3), toneMapped: false}))); bulb.position.set(s * (walk + 3), lift - 0.15, f.zc); G.add(bulb)
    const pool = new THREE.Mesh(keep(new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({map: glowTex, color: C('#ffb47a').multiplyScalar(0.5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}))); pool.position.set(s * (walk + 2.6), 0.2, f.zc); G.add(pool)
    const car = carMesh(r2); car.position.set(s * (walk + 2.6), 0.18, f.zc + (r2() - 0.5) * 1.5); car.rotation.y = r2() < 0.5 ? 0 : Math.PI; G.add(car)
    if (r2() < 0.8) { const b = bikeMesh(); b.position.set(s * (walk + 4.4), 0.18, f.zc + f.W / 2 - 1); b.rotation.y = Math.PI / 2; G.add(b) }
  }

  /* ───────────── small things the town is made of ───────────── */
  const carPaint = decade ? ERA_DRESS[decade].paint : ['#9aa0a6', '#5c6670', '#3f4650', '#d6d8da']
  let carGeo: THREE.BufferGeometry | null = null
  function carMesh(r2: () => number): THREE.Mesh {
    if (!carGeo) {
      const sh = new THREE.Shape(), boxy = decade === '70s' || decade === '80s'
      if (boxy) sh.moveTo(-2.1, 0.32).lineTo(-2.1, 0.9).lineTo(-1.1, 0.95).lineTo(-0.8, 1.38).lineTo(0.7, 1.38).lineTo(1.05, 0.95).lineTo(2.05, 0.9).lineTo(2.05, 0.32).lineTo(-2.1, 0.32)
      else sh.moveTo(-1.9, 0.32).lineTo(-1.9, 0.95).quadraticCurveTo(-1.85, 1.45, -1.2, 1.48).lineTo(0.4, 1.48).quadraticCurveTo(0.8, 1.45, 1.2, 1.0).lineTo(1.9, 0.9).lineTo(1.95, 0.32).lineTo(-1.9, 0.32)
      const body = new THREE.ExtrudeGeometry(sh, {depth: 1.6, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2}).translate(0, 0, -0.8).rotateY(Math.PI / 2)
      const wheels = [[-0.8, 1.3], [0.8, 1.3], [-0.8, -1.3], [0.8, -1.3]].map(([wx, wz]) => new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12).rotateZ(Math.PI / 2).translate(wx!, 0.32, wz!))
      carGeo = keep(painted([[body, '#ffffff'], ...wheels.map(w => [w, '#141416'] as [THREE.BufferGeometry, string])]))
    }
    const m = new THREE.Mesh(carGeo, std(ok(carPaint[Math.floor(r2() * carPaint.length)]!), {vertexColors: true, roughness: 0.3, metalness: 0.5}))
    return m
  }
  let bikeGeo: THREE.BufferGeometry | null = null
  function bikeMesh(): THREE.Mesh {
    bikeGeo ??= keep(painted([[new THREE.TorusGeometry(0.32, 0.03, 5, 16).rotateY(Math.PI / 2).translate(0, 0.32, -0.52), '#16171b'], [new THREE.TorusGeometry(0.32, 0.03, 5, 16).rotateY(Math.PI / 2).translate(0, 0.32, 0.52), '#16171b'],
      [fb(0.04, 0.04, 0.85, 0, 0.72, 0), '#5a6068'], [fb(0.04, 0.55, 0.04, 0, 0.5, 0.1).rotateX(0.5), '#5a6068'], [fb(0.12, 0.05, 0.25, 0, 0.88, 0.3), '#1a1a1e'], [fb(0.5, 0.04, 0.04, 0, 1.0, -0.45), '#2a2a30']]))
    return new THREE.Mesh(bikeGeo, vc({roughness: 0.5, metalness: 0.4}))
  }
  // a seated man: chair, legs, body, head; and the same man holding the morning paper up
  const seated = (paper: boolean, shirt: string) => painted([
    [fb(0.44, 0.05, 0.44, 0, 0.45, 0), '#3a3430'], [fb(0.44, 0.5, 0.05, 0, 0.72, -0.21), '#3a3430'], ...[[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].map(([a, b]) => [fb(0.035, 0.45, 0.035, a!, 0.22, b!), '#2a2622'] as [THREE.BufferGeometry, string]),
    [fb(0.34, 0.15, 0.46, 0, 0.53, 0.1), '#2c2f36'], [fb(0.3, 0.46, 0.13, 0, 0.27, 0.32), '#2c2f36'], [fb(0.3, 0.07, 0.24, 0, 0.04, 0.4), '#18181a'],
    [new THREE.CapsuleGeometry(0.19, 0.3, 4, 10).scale(1, 1, 0.7).translate(0, 0.86, -0.04), shirt],
    [new THREE.SphereGeometry(0.11, 12, 10).translate(0, 1.22, -0.02), '#c4957a'], [new THREE.SphereGeometry(0.115, 12, 8, 0, Math.PI * 2, 0, 1.4).translate(0, 1.24, -0.04), '#8a8682'],
    ...(paper ? [[fb(0.08, 0.08, 0.34, -0.2, 1.0, 0.18).rotateX(-0.6), shirt], [fb(0.08, 0.08, 0.34, 0.2, 1.0, 0.18).rotateX(-0.6), shirt], [fb(0.62, 0.42, 0.01, 0, 1.12, 0.36).rotateX(-0.15), '#e9e4d6'], [fb(0.6, 0.04, 0.012, 0, 1.2, 0.365).rotateX(-0.15), '#9a968c']] as [THREE.BufferGeometry, string][]
      : [[fb(0.08, 0.08, 0.36, -0.21, 0.78, 0.2), shirt], [fb(0.08, 0.08, 0.36, 0.21, 0.78, 0.2), shirt]] as [THREE.BufferGeometry, string][]),
  ])
  const standing = () => painted([[fb(0.14, 0.82, 0.16, -0.1, 0.41, 0), '#2c2f36'], [fb(0.14, 0.82, 0.16, 0.1, 0.41, 0), '#2c2f36'], [new THREE.CapsuleGeometry(0.19, 0.38, 4, 10).scale(1, 1, 0.7).translate(0, 1.15, 0), '#d8d4ca'],
    [fb(0.09, 0.58, 0.09, -0.26, 1.1, 0.05), '#d8d4ca'], [fb(0.09, 0.09, 0.5, 0.27, 1.05, 0.25), '#d8d4ca'], [new THREE.SphereGeometry(0.11, 12, 10).translate(0, 1.6, 0), '#b8886a']])

  /* ───────────── the street: pavement, trees, motorbikes, the kiosk, cafés ───────────── */
  const span = zTop + 20 - (goalZ + 20), zMid = (zTop + 20 + goalZ + 20) / 2
  { // the pavement each city walks on, laid over the slabs just under the wet sheen
    const tex = town === 'ath'
      ? canvasTex(256, 256, g => { g.fillStyle = '#c9c5bd'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 64) for (let k = 0; k < 256; k += 64) { const v = 188 + rnd() * 30; g.fillStyle = `rgb(${v},${v - 3},${v - 9})`; g.fillRect(k + 1, y + 1, 62, 62)
          g.strokeStyle = `rgba(120,116,110,${0.15 + rnd() * 0.2})`; g.lineWidth = 1; g.beginPath(); g.moveTo(k + rnd() * 64, y); g.bezierCurveTo(k + rnd() * 64, y + 20, k + rnd() * 64, y + 40, k + rnd() * 64, y + 64); g.stroke() }
          for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${90 + rnd() * 60},${80 + rnd() * 50},${70 + rnd() * 40},.35)`; g.fillRect(rnd() * 256, rnd() * 256, 1.5, 1.5) } })
      : town === 'tlv'
        ? canvasTex(256, 256, g => { g.fillStyle = '#9d988f'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 32) for (let k = 0; k < 256; k += 32) { const v = 140 + rnd() * 26; g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.fillRect(k + 1, y + 1, 30, 30) } for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${170 + rnd() * 40},${150 + rnd() * 30},${110 + rnd() * 30},.3)`; g.fillRect(rnd() * 256, rnd() * 256, 2, 2) } })
        : null
    if (tex) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set((walk - half) / 4, span / 4)
      const m = std('#ffffff', {map: tex, roughness: town === 'ath' ? 0.32 : 0.6, metalness: town === 'ath' ? 0.05 : 0})
      for (const s of [-1, 1]) { const p = new THREE.Mesh(keep(new THREE.PlaneGeometry(walk - half - 0.3, span).rotateX(-Math.PI / 2)), m); p.position.set(s * (half + 0.15 + (walk - half - 0.3) / 2), 0.168, zMid); p.receiveShadow = true; root.add(p) } }
    // grime along the kerb: the dark line where the rain and the tyres leave it
    const grime = keep(canvasTex(64, 8, g => { const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(10,10,12,.7)'); gr.addColorStop(1, 'rgba(10,10,12,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 8) }))
    for (const s of [-1, 1]) { const p = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.1, span).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({map: grime, transparent: true, depthWrite: false, opacity: 0.55}))); if (s > 0) p.rotation.y = Math.PI; p.position.set(s * (half - 0.55), 0.016, zMid); root.add(p) }
    // tyre marks and worn patches down the lanes
    const tyre = keep(canvasTex(32, 256, g => { for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(8,8,10,${0.05 + rnd() * 0.12})`; g.fillRect(8 + rnd() * 16, rnd() * 256, 3 + rnd() * 4, 30 + rnd() * 90) } }))
    const tm = inst(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), keep(new THREE.MeshBasicMaterial({map: tyre, transparent: true, depthWrite: false})), 24)
    for (let k = 0; k < 24; k++) put(tm, k, (k % 2 ? 1 : -1) * (1.4 + rnd() * 2.8), 0.017, zTop - rnd() * (zTop - goalZ - 30), rnd() * 0.06, 0.9, 1, 10 + rnd() * 18)
    tm.count = 24
  }

  // trees by the kerb: bitter orange with whitewashed trunks (Athens), ficus and palms (Tel Aviv), the rest keeps the rig's
  const treeZ: {x: number; z: number}[] = []
  if (town !== 'other' && !x.banned('#2f4a33')) {
    for (const s of [-1, 1]) for (let z = zTop - 9 + (s > 0 ? 9 : 0); z > goalZ + 30; z -= town === 'ath' ? 15 : 19) { const px = s * (half + 1.25); if (free(px, z, 1.4)) { treeZ.push({x: px, z}); claim(px, z, 1.6) } }
    const n = treeZ.length
    const pit = inst(new THREE.PlaneGeometry(1.3, 1.3).rotateX(-Math.PI / 2), std(town === 'tlv' ? '#8f7f62' : '#2c241e', {roughness: 1}), n)
    const litter = inst(new THREE.PlaneGeometry(0.12, 0.08).rotateX(-Math.PI / 2), keep(new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide})), n * 18)
    let lk = 0
    treeZ.forEach((t, i) => { put(pit, i, t.x, 0.172, t.z); for (let k = 0; k < 18; k++) { const a = rnd() * 6.28, r = rnd() * 2.6; put(litter, lk, t.x + Math.cos(a) * r * 0.8, 0.175, t.z + Math.sin(a) * r, rnd() * 6); litter.setColorAt(lk, C(['#6b4a2a', '#8a6232', '#4e3c26', '#a0703a'][Math.floor(rnd() * 4)]!)); lk++ } })
    pit.count = n; litter.count = lk
    if (town === 'ath') {
      const trunk = inst(painted([[new THREE.CylinderGeometry(0.1, 0.13, 2.2, 7).translate(0, 1.1, 0), '#4a3a2c'], [new THREE.CylinderGeometry(0.135, 0.14, 0.95, 7).translate(0, 0.48, 0), '#ece9e2']]), vc(), n)
      const blobs: THREE.BufferGeometry[] = []
      ;([[0, 0, 0, 1.15], [0.6, 0.3, 0.2, 0.85], [-0.6, 0.2, -0.3, 0.9], [0.1, 0.75, -0.2, 0.8], [-0.2, 0.4, 0.6, 0.8]] as const).forEach(([bx, by, bz, r]) => { const g = new THREE.IcosahedronGeometry(r, 2).translate(bx, by, bz); const c = g.attributes.position!.count, col = new Float32Array(c * 3); for (let i = 0; i < c; i++) { const tt = THREE.MathUtils.clamp((g.attributes.position!.getY(i) + 1.1) / 2.4, 0, 1), cc = C('#16301a').lerp(C('#3f6a34'), tt * tt); col.set([cc.r, cc.g, cc.b], i * 3) } g.setAttribute('color', new THREE.BufferAttribute(col, 3)); blobs.push(g) })
      const crown = inst(mergeGeometries(blobs)!, vc({roughness: 0.55}), n)
      const fruit = inst(new THREE.SphereGeometry(0.075, 6, 4), keep(new THREE.MeshStandardMaterial({color: ok('#e8751a', '#b9a58a'), roughness: 0.5, emissive: C(ok('#a04a10', '#5a5048')), emissiveIntensity: 0.25})), n * 26)
      let fk = 0
      treeZ.forEach((t, i) => { const sc = 0.9 + rnd() * 0.3; put(trunk, i, t.x, 0.17, t.z); put(crown, i, t.x, 2.9 * sc + 0.2, t.z, rnd() * 6, sc, sc * 0.95, sc)
        for (let k = 0; k < 26; k++) { const a = rnd() * 6.28, el = (rnd() - 0.35) * 1.3; put(fruit, fk++, t.x + Math.cos(a) * 1.15 * sc, 2.9 * sc + 0.2 + el, t.z + Math.sin(a) * 1.15 * sc) } })
      trunk.count = crown.count = n; fruit.count = fk; crown.castShadow = !lite
    } else {
      const fic = treeZ.filter((_, i) => i % 3 !== 2), palmsAt = treeZ.filter((_, i) => i % 3 === 2)
      const trunk = inst(painted([[new THREE.CylinderGeometry(0.24, 0.38, 3.2, 9).translate(0, 1.6, 0), '#6e6a62'], [new THREE.CylinderGeometry(0.06, 0.06, 2.6, 5).translate(0.28, 1.3, 0.1), '#5e5a52'], [new THREE.CylinderGeometry(0.05, 0.05, 2.4, 5).translate(-0.25, 1.4, -0.12), '#5e5a52']]), vc(), fic.length)
      const blobs: THREE.BufferGeometry[] = []
      ;([[0, 0, 0, 2.0], [1.4, -0.2, 0.4, 1.5], [-1.4, -0.1, -0.4, 1.6], [0.3, 0.8, -1.2, 1.4], [-0.4, 0.5, 1.3, 1.4], [0.9, 0.6, 1.0, 1.2]] as const).forEach(([bx, by, bz, r]) => { const g = new THREE.IcosahedronGeometry(r, 2).translate(bx, by, bz); const c = g.attributes.position!.count, col = new Float32Array(c * 3); for (let i = 0; i < c; i++) { const tt = THREE.MathUtils.clamp((g.attributes.position!.getY(i) + 2) / 4, 0, 1), cc = C('#10261a').lerp(C('#33573a'), tt * tt); col.set([cc.r, cc.g, cc.b], i * 3) } g.setAttribute('color', new THREE.BufferAttribute(col, 3)); blobs.push(g) })
      const crown = inst(mergeGeometries(blobs)!, vc({roughness: 0.6}), fic.length)
      fic.forEach((t, i) => { const sc = 0.95 + rnd() * 0.25; put(trunk, i, t.x, 0.17, t.z, rnd() * 6); put(crown, i, t.x - Math.sign(t.x) * 0.6, 4.6 * sc, t.z, rnd() * 6, sc, sc * 0.75, sc) })
      trunk.count = crown.count = fic.length; crown.castShadow = !lite
      const pt = inst(new THREE.CylinderGeometry(0.17, 0.26, 8, 7).translate(0, 4, 0), std('#6e5a44'), palmsAt.length), fr = inst(new THREE.ConeGeometry(0.4, 3.4, 4).rotateX(Math.PI / 2).translate(0, 0, 1.7), std('#2f4f30', {flatShading: true}), palmsAt.length * 9)
      let k2 = 0; palmsAt.forEach((t, i) => { put(pt, i, t.x, 0.17, t.z, 0, 1, 1, 1, 0, Math.sign(t.x) * 0.05); for (let k = 0; k < 9; k++) put(fr, k2++, t.x - Math.sign(t.x) * 0.4, 8.1, t.z, k * Math.PI * 2 / 9, 1, 0.25, 1, -0.45 + (k % 2) * 0.25) })
      pt.count = palmsAt.length; fr.count = k2
    }
  }

  // motorbikes and mopeds on the pavement, nose to the kerb (Athens: many)
  { const per = town === 'ath' ? 0.75 : town === 'tlv' ? 0.4 : 0.18, spots: {x: number; z: number; r: number}[] = []
    for (const s of [-1, 1]) for (let z = zTop - 6; z > goalZ + 30; z -= 2.2) if (rnd() < per * 0.5) { const px = s * (half + 0.95); if (free(px, z, 0.5)) { spots.push({x: px, z, r: s * (Math.PI / 2 + 0.35)}); claim(px, z, 0.45) } }
    const old = decade === '70s' || decade === '80s' || decade === '90s'
    const moto = painted([[new THREE.TorusGeometry(0.27, 0.07, 6, 14).rotateY(Math.PI / 2).translate(0, 0.27, -0.6), '#141416'], [new THREE.TorusGeometry(0.27, 0.07, 6, 14).rotateY(Math.PI / 2).translate(0, 0.27, 0.6), '#141416'],
      [fb(0.34, old ? 0.42 : 0.32, 0.95, 0, 0.55, 0.15), '#ffffff'], [fb(0.36, old ? 0.8 : 0.6, 0.1, 0, old ? 0.72 : 0.68, -0.48).rotateX(-0.18), '#ffffff'], [fb(0.28, 0.1, 0.62, 0, 0.86, 0.25), '#1a1a1c'], [fb(0.62, 0.04, 0.04, 0, 1.15, -0.55), '#2a2b30'], [fb(0.12, 0.12, 0.08, 0, 1.0, -0.6), '#d8d6d0']])
    const mm = inst(moto, vc({roughness: 0.32, metalness: 0.35}), spots.length)
    const cols = (old ? ['#9c3a2e', '#e8e2d4', '#4a7a5a', '#3a5e88', '#8a8f99'] : ['#d8dadc', '#25282e', '#8a8f99', '#6c2a2a', '#3a4a5e']).map(c => ok(c))
    spots.forEach((p, i) => { put(mm, i, p.x, 0.17, p.z, p.r + (rnd() - 0.5) * 0.25, 1, 1, 1, 0, 0.08 * Math.sign(p.x)); mm.setColorAt(i, C(cols[Math.floor(rnd() * cols.length)]!)) }); mm.count = spots.length; mm.castShadow = !lite
  }

  // cafés: small tables on the pavement by the wall, men at them; an old man reading the paper at one
  const sitters: {x: number; z: number; ry: number; paper: boolean}[] = [], tables: {x: number; z: number}[] = []
  { const want = town === 'other' ? 2 : lite ? 3 : 4
    const zs: number[] = []; for (let z = zTop - 30; z > goalZ + 40 && zs.length < want * 3; z -= 23 + rnd() * 14) zs.push(z)
    let made = 0
    for (const z0 of zs) { if (made >= want) break
      const s = made % 2 ? 1 : -1, cx = s * (walk - 1.6)
      if (!free(cx, z0, 3.2)) continue
      claim(cx, z0, 3.4); made++
      for (let k = 0; k < 3; k++) { const tz = z0 - 2.4 + k * 2.4, tx = cx + (k % 2) * s * -0.7; tables.push({x: tx, z: tz})
        const nS = rnd() < 0.75 ? 1 + Math.floor(rnd() * 2) : 0
        for (let j = 0; j < nS; j++) { const a = (j ? Math.PI : 0) + (rnd() - 0.5) * 0.6 + Math.PI / 2 * s, r = 0.62; sitters.push({x: tx + Math.sin(a) * r, z: tz + Math.cos(a) * r, ry: a + Math.PI, paper: false}) } } }
    if (sitters.length) sitters[Math.floor(rnd() * sitters.length)]!.paper = true
    const tbl = inst(painted([[new THREE.CylinderGeometry(0.36, 0.36, 0.04, 16).translate(0, 0.74, 0), '#d8d2c6'], [new THREE.CylinderGeometry(0.04, 0.05, 0.72, 6).translate(0, 0.36, 0), '#3a3a40'], [new THREE.CylinderGeometry(0.22, 0.22, 0.03, 12).translate(0, 0.015, 0), '#3a3a40'],
      [new THREE.CylinderGeometry(0.035, 0.03, 0.08, 8).translate(0.12, 0.8, 0.05), '#f2efe8'], [new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8).translate(-0.1, 0.82, -0.06), '#c9d6d8'], [fb(0.18, 0.03, 0.24, 0.02, 0.775, -0.12), '#6a4a34']]), vc({roughness: 0.4}), tables.length)
    tables.forEach((t, i) => put(tbl, i, t.x, 0.17, t.z, rnd() * 6)); tbl.count = tables.length
    // three shirts and the reader's cardigan, one draw each (an instance tint would darken the faces too)
    const variants = [shirts[0]!, shirts[2]!, shirts[5]!, '#5a5650']
    variants.forEach((shirt, v) => {
      const mine = sitters.filter((p, i) => p.paper ? v === 3 : v < 3 && i % 3 === v); if (!mine.length) return
      const fig = inst(seated(v === 3, shirt), vc({roughness: 0.85}), mine.length)
      mine.forEach((p, i) => put(fig, i, p.x, 0.17, p.z, p.ry)); fig.count = mine.length
    })
    // a café's warm spill on the pavement
    const pools = inst(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), keep(new THREE.MeshBasicMaterial({map: glowTex, color: C('#ffae6e').multiplyScalar(0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending})), Math.ceil(tables.length / 3))
    for (let i = 0; i * 3 < tables.length; i++) { const t = tables[i * 3 + 1] ?? tables[i * 3]!; put(pools, i, t.x, 0.18, t.z, 0, 7, 1, 9) } pools.count = Math.ceil(tables.length / 3)
  }

  // the periptero (Athens) on the kiosk's corner: racks of papers, a cigarette wall, the fridge, papers pegged on the side
  if (town === 'ath' && level.hood) periptero(level.hood.kiosk.x, level.hood.kiosk.z)
  function periptero(kx: number, kz: number) {
    const g = new THREE.Group(); g.position.set(kx, 0.17, kz); root.add(g)
    const body = ok('#5c6e66', '#5f646c')
    const box = keep(new THREE.BoxGeometry(1, 1, 1)), add = (m: THREE.Material, px: number, py: number, pz: number, sx: number, sy: number, sz: number) => { const o = new THREE.Mesh(box, m); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); g.add(o); return o }
    add(std(body, {roughness: 0.6, metalness: 0.2}), 0, 1.2, 0, 1.9, 2.4, 2.4)
    add(std('#e4e0d6'), 0, 2.48, 0, 2.6, 0.14, 3.2) // the roof overhang
    add(std('#3a3c42', {metalness: 0.4}), 1.2, 2.3, 0, 0.7, 0.05, 3.0) // the front canopy
    const wares = keep(canvasTex(256, 256, c => { c.fillStyle = '#2a2622'; c.fillRect(0, 0, 256, 256); const cols = ['#c86a5a', '#5a86b8', '#e8e4da', '#7aa07a', '#b86a9a', '#d8a06a', '#3a3e48', '#9a5a4a'].map(v => ok(v, '#9a948a'))
      for (let r = 0; r < 7; r++) for (let k = 0; k < 9; k++) { c.fillStyle = cols[(r * 5 + k * 3) % cols.length]!; c.fillRect(6 + k * 27.5, 8 + r * 35, 23, 30); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(8 + k * 27.5, 12 + r * 35, 15, 3) } }))
    const front = new THREE.Mesh(keep(new THREE.PlaneGeometry(2.2, 1.7)), keep(new THREE.MeshBasicMaterial({map: wares, color: C('#ffe4c4').multiplyScalar(1.0), toneMapped: false}))); front.rotation.y = Math.PI / 2; front.position.set(0.96, 1.35, 0); g.add(front)
    const fridge = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.9, 1.6)), keep(new THREE.MeshBasicMaterial({map: keep(canvasTex(64, 128, c => { c.fillStyle = '#dfeaf2'; c.fillRect(0, 0, 64, 128); for (let r = 0; r < 5; r++) for (let k = 0; k < 6; k++) { c.fillStyle = ['#c84a3a', '#3a6aa8', '#e8e8e0', '#6a9a5a', '#c8783a'][(r + k) % 5]!; c.fillRect(4 + k * 10, 8 + r * 24, 7, 18) } c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(0, 0, 8, 128) })), color: C('#ffffff').multiplyScalar(1.1), toneMapped: false})))
    fridge.position.set(0.5, 0.97, 1.75); g.add(fridge)
    add(std('#d8dadc', {roughness: 0.3, metalness: 0.4}), 0.5, 0.95, 1.5, 1.0, 1.7, 0.45)
    // papers pegged along the side
    const pap = inst(new THREE.PlaneGeometry(0.32, 0.44), keep(new THREE.MeshStandardMaterial({color: '#ffffff', side: THREE.DoubleSide, roughness: 0.9})), 16, g)
    for (let k = 0; k < 16; k++) { const side = k < 8 ? 1 : -1, j = k % 8; put(pap, k, -0.6 + j * 0.2, 1.9 - (j % 2) * 0.05, side * 1.22, 0, 1, 1, 1); pap.setColorAt(k, C(['#e8e2d4', '#d8d2c4', '#ece8de', '#c8c2b4'][j % 4]!)) } pap.count = 16
    const sign = new THREE.Mesh(keep(new THREE.PlaneGeometry(2.4, 0.42)), keep(new THREE.MeshBasicMaterial({map: keep(canvasTex(256, 48, c => { c.fillStyle = '#1b1e26'; c.fillRect(0, 0, 256, 48); signMarks(c, 256, 48, '#efe8dc', rnd) })), toneMapped: false}))); sign.rotation.y = Math.PI / 2; sign.position.set(0.97, 2.25, 0); g.add(sign)
    const crates = inst(fb(0.4, 0.3, 0.3, 0, 0.15, 0), std('#6a7280', {roughness: 0.7}), 5, g); for (let k = 0; k < 5; k++) put(crates, k, -0.4 + (k % 2) * 0.1, (Math.floor(k / 2)) * 0.31, -1.55 - (k % 2) * 0.35, rnd() * 0.3); crates.count = 5
    const gl = new THREE.Mesh(keep(new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({map: glowTex, color: C('#ffc28a').multiplyScalar(0.7), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}))); gl.position.set(2.2, 0.02, 0); g.add(gl)
  }

  // the grocery (Tel Aviv): fruit in crates on the pavement, stacked bottle crates, the lit shop behind
  if (town === 'tlv') { let z = zTop - 70; while (!free(-(walk - 1.2), z, 2.2) && z > goalZ + 50) z -= 4
    claim(-(walk - 1.2), z, 2.4)
    const fruit = painted([[fb(0.55, 0.28, 0.4, 0, 0.14, 0), '#7a5a3a'], ...Array.from({length: 9}, (_, k) => [new THREE.SphereGeometry(0.08, 6, 4).translate(-0.18 + (k % 3) * 0.18, 0.3, -0.12 + Math.floor(k / 3) * 0.12), '#ffffff'] as [THREE.BufferGeometry, string])])
    const fm = inst(fruit, vc({roughness: 0.6}), 8)
    const fc = ['#c8502e', '#e07a2a', '#7a9a3a', '#b83a3a', '#d8b0a0', '#8a3a5a'].map(c => ok(c, '#b8a890'))
    for (let k = 0; k < 8; k++) { put(fm, k, -(walk - 0.9 - (k % 2) * 0.6), 0.17 + Math.floor(k / 4) * 0.3 * 0, z - 1.6 + (k % 4) * 0.62 + Math.floor(k / 4) * 0.1); fm.setColorAt(k, C(fc[k % fc.length]!)) } fm.count = 8
    const sh = new THREE.Mesh(keep(new THREE.PlaneGeometry(3.4, 2.2)), keep(new THREE.MeshBasicMaterial({map: keep(shopTexture(rnd)), toneMapped: false, color: C('#ffffff').multiplyScalar(1.1)}))); sh.rotation.y = Math.PI / 2; sh.position.set(-(walk - 0.03), 1.3, z); root.add(sh) }

  // overhead cables: Athens strings them across and along the street everywhere; poles' cross-wires elsewhere
  { const pts: number[] = [], n = town === 'ath' ? 26 : town === 'tlv' ? 12 : 6
    for (let i = 0; i < n; i++) { const z = zTop - 6 - rnd() * (zTop - goalZ - 40), z2 = z + (rnd() - 0.5) * 10, h1 = 5.5 + rnd() * 4, h2 = 5.5 + rnd() * 4, sag = 0.5 + rnd() * 0.9
      for (let k = 0; k < 12; k++) { const a = k / 12, b = (k + 1) / 12, y = (t: number) => h1 + (h2 - h1) * t - sag * Math.sin(t * Math.PI)
        pts.push(-walk + a * walk * 2, y(a), z + (z2 - z) * a, -walk + b * walk * 2, y(b), z + (z2 - z) * b) } }
    // and along the facades at the first floor, sagging between brackets
    if (town !== 'other') for (const s of [-1, 1]) for (let z = zTop; z > goalZ + 30; z -= 6) { const y = 3.9 + (Math.floor(z) % 3) * 0.05; pts.push(s * (walk - 0.12), y, z, s * (walk - 0.12), y - 0.25, z - 3, s * (walk - 0.12), y - 0.25, z - 3, s * (walk - 0.12), y, z - 6) }
    const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3)); root.add(new THREE.LineSegments(g, keep(new THREE.LineBasicMaterial({color: '#121216'}))))
  }

  // street signs at every crossing: the plate's shape and enamel, never a word
  { const plate = keep(canvasTex(128, 48, g => { g.fillStyle = town === 'ath' ? '#1f4e8c' : town === 'tlv' ? '#e9e6de' : '#2b3a52'; g.fillRect(0, 0, 128, 48); g.strokeStyle = town === 'tlv' ? '#2b3a52' : '#eeeae0'; g.lineWidth = 4; g.strokeRect(4, 4, 120, 40); signMarks(g, 128, 48, town === 'tlv' ? '#2b3a52' : '#eeeae0', rnd) }))
    const pole = inst(new THREE.CylinderGeometry(0.04, 0.05, 3.2, 6).translate(0, 1.6, 0), std('#55585e', {metalness: 0.5}), level.crossings.length * 2)
    const pl = inst(new THREE.PlaneGeometry(0.9, 0.34), keep(new THREE.MeshBasicMaterial({map: plate, color: C('#ffffff').multiplyScalar(0.75), side: THREE.DoubleSide})), level.crossings.length * 2)
    const round2 = inst(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 18).rotateX(Math.PI / 2), keep(new THREE.MeshStandardMaterial({map: keep(canvasTex(64, 64, g => { g.fillStyle = '#f2f0ea'; g.beginPath(); g.arc(32, 32, 31, 0, 7); g.fill(); g.strokeStyle = ok('#b8322a', '#2b3a52'); g.lineWidth = 9; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.stroke() })), roughness: 0.5})), level.crossings.length * 2)
    let k = 0; for (const c of level.crossings) for (const s of [-1, 1]) { const px = s * (half + 0.5), pz = c + s * 7.6; put(pole, k, px, 0.17, pz); put(pl, k, px, 3.1, pz, 0); put(round2, k, px, 2.4, pz, Math.PI / 2 * (1 + s)); k++ }
    pole.count = pl.count = round2.count = k
  }

  /* ───────────── what lies at the end of the side streets ───────────── */
  if (x.clubId === 'olympiacos') {
    // the port: container cranes over the roofs at the end of the side streets, a red light on each jib
    const crane = painted([[fb(0.8, 26, 0.8, -6, 13, -5), '#3a3e46'], [fb(0.8, 26, 0.8, 6, 13, -5), '#3a3e46'], [fb(0.8, 26, 0.8, -6, 13, 5), '#3a3e46'], [fb(0.8, 26, 0.8, 6, 13, 5), '#3a3e46'], [fb(13, 1.4, 11, 0, 26, 0), '#454a54'], [fb(1.6, 1.4, 52, 0, 30, 10), '#3e434c'], [fb(0.4, 12, 0.4, 0, 36, -4), '#3a3e46'], [fb(3, 3, 4, 0, 28.5, -2), '#50555e']])
    const cm = inst(crane, vc({roughness: 0.9}), 6); const red: number[] = []
    let k = 0; for (const c of level.crossings) { put(cm, k++, 168, 0, c + (rnd() - 0.5) * 30, Math.PI / 2 + (rnd() - 0.5) * 0.4); red.push(168, 42, c) }
    for (const zz of [goalZ - 120, goalZ - 160, goalZ - 90]) { put(cm, k++, (k % 2 ? 1 : -1) * (110 + rnd() * 40), 0, zz, rnd() * 3); }
    cm.count = k
    const rg = keep(new THREE.BufferGeometry()); rg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(red), 3))
    root.add(new THREE.Points(rg, keep(new THREE.PointsMaterial({map: glowTex, size: 4, color: C('#ff5a3a').multiplyScalar(1.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}))))
  }
  if (town === 'tlv') {
    // the sea's last light at the west end of every side street
    const sea = keep(canvasTex(16, 128, g => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,190,150,0)'); gr.addColorStop(0.55, 'rgba(255,186,140,.85)'); gr.addColorStop(0.62, 'rgba(150,170,200,.9)'); gr.addColorStop(0.66, 'rgba(255,220,190,1)'); gr.addColorStop(0.7, 'rgba(60,80,110,.95)'); gr.addColorStop(1, 'rgba(30,44,66,.9)'); g.fillStyle = gr; g.fillRect(0, 0, 16, 128) }))
    for (const c of level.crossings) { const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(26, 40)), keep(new THREE.MeshBasicMaterial({map: sea, transparent: true, depthWrite: false, fog: false, toneMapped: false}))); m.rotation.y = Math.PI / 2; m.position.set(-150, 8, c); m.renderOrder = -2; root.add(m) }
  }

  /* ───────────── street life that moves ───────────── */
  // cats: on the pavement edge, under a car, on a step
  { const cat = painted([[new THREE.CapsuleGeometry(0.09, 0.26, 4, 8).rotateX(Math.PI / 2).translate(0, 0.16, 0), '#ffffff'], [new THREE.SphereGeometry(0.075, 8, 6).translate(0, 0.27, 0.2), '#ffffff'], [new THREE.ConeGeometry(0.025, 0.05, 4).translate(-0.04, 0.34, 0.2), '#ffffff'], [new THREE.ConeGeometry(0.025, 0.05, 4).translate(0.04, 0.34, 0.2), '#ffffff'],
      [new THREE.CylinderGeometry(0.018, 0.012, 0.3, 5).rotateX(-0.9).translate(0, 0.25, -0.28), '#ffffff'], ...[[-0.05, 0.1], [0.05, 0.1], [-0.05, -0.1], [0.05, -0.1]].map(([a, b]) => [new THREE.CylinderGeometry(0.018, 0.018, 0.12, 4).translate(a!, 0.06, b!), '#ffffff'] as [THREE.BufferGeometry, string])])
    const n = lite ? 5 : 8, cm = inst(cat, vc({roughness: 0.9}), n), cols = ['#2a2624', '#c08a5a', '#8a8580', '#e8e4dc', '#4a3a30', '#d8a878']
    for (let i = 0; i < n; i++) { const s = i % 2 ? 1 : -1, z = zTop - 20 - rnd() * (zTop - goalZ - 60), px = s * (half + 0.6 + rnd() * 3.2); put(cm, i, px, 0.17, z, rnd() * 6); cm.setColorAt(i, C(cols[i % cols.length]!)) } cm.count = n }
  // pigeons: a flock pecking near the café or the kiosk; they lift when the boy comes near and settle again
  const flockAt = tables[1] ?? {x: -(walk - 2), z: zTop - 40}
  { const N = lite ? 10 : 16, bird = painted([[new THREE.SphereGeometry(0.1, 7, 5).scale(0.8, 0.7, 1.4).translate(0, 0.1, 0), '#ffffff'], [new THREE.SphereGeometry(0.055, 6, 4).translate(0, 0.18, 0.12), '#ffffff'], [fb(0.36, 0.01, 0.12, 0, 0.13, -0.02), '#ffffff']])
    const pm = inst(bird, vc({roughness: 0.8}), N), cx = flockAt.x - Math.sign(flockAt.x) * 2.2, cz = flockAt.z
    const birds = Array.from({length: N}, () => ({x: cx + (rnd() - 0.5) * 3, z: cz + (rnd() - 0.5) * 4, y: 0.17, vy: 0, vx: 0, vz: 0, ry: rnd() * 6, ph: rnd() * 6, up: false, back: 0, hx: 0, hz: 0}))
    birds.forEach((b, i) => { b.hx = b.x; b.hz = b.z; pm.setColorAt(i, C(['#6a6e78', '#7a7e86', '#5a5e66', '#8a8e94', '#4e5258'][i % 5]!)) }); pm.count = N
    ticks.push((t, dt, sim) => {
      for (const [i, b] of birds.entries()) {
        const d = Math.hypot(sim.x - b.x, sim.z - b.z)
        if (!b.up && d < 4.5 && t > b.back) { b.up = true; const a = Math.atan2(b.x - sim.x, b.z - sim.z) + (rnd() - 0.5); b.vx = Math.sin(a) * 4; b.vz = Math.cos(a) * 4; b.vy = 3.5 + rnd() * 2; b.ry = a; b.back = t + 9 + rnd() * 5 }
        if (b.up) { b.x += b.vx * dt; b.z += b.vz * dt; b.y += b.vy * dt; b.vy = Math.max(1.2, b.vy - dt * 1.5); if (t > b.back) { b.up = false; b.x = b.hx + (rnd() - 0.5) * 2; b.z = b.hz + (rnd() - 0.5) * 2; b.y = 0.17 } }
        else if (rnd() < dt * 0.6) { b.ry += (rnd() - 0.5) * 1.5 }
        const flap = b.up ? 1 + Math.sin(t * 28 + b.ph) * 0.8 : 1, peck = b.up ? 0 : Math.max(0, Math.sin(t * 3 + b.ph * 3)) * 0.4
        put(pm, i, b.x, b.y, b.z, b.ry, flap, 1, 1, peck)
      }
      pm.instanceMatrix.needsUpdate = true
    }) }
  // kids on bikes up and down the side streets and the pavement; a man washing his car
  { const kidOnBike = (shirt: string) => painted([[new THREE.TorusGeometry(0.26, 0.03, 5, 14).rotateY(Math.PI / 2).translate(0, 0.26, -0.45), '#18181c'], [new THREE.TorusGeometry(0.26, 0.03, 5, 14).rotateY(Math.PI / 2).translate(0, 0.26, 0.45), '#18181c'], [fb(0.04, 0.04, 0.75, 0, 0.6, 0), '#b8bcc2'],
      [fb(0.12, 0.5, 0.12, -0.08, 0.6, 0.05), '#2c2f36'], [fb(0.12, 0.5, 0.12, 0.08, 0.6, 0.05), '#2c2f36'], [new THREE.CapsuleGeometry(0.14, 0.26, 4, 8).rotateX(0.35).translate(0, 1.05, -0.1), shirt], [new THREE.SphereGeometry(0.1, 10, 8).translate(0, 1.36, -0.22), '#b8886a'],
      [fb(0.07, 0.07, 0.4, -0.15, 1.02, -0.3).rotateX(0.2), shirt], [fb(0.07, 0.07, 0.4, 0.15, 1.02, -0.3).rotateX(0.2), shirt], [fb(0.45, 0.04, 0.04, 0, 0.92, -0.45), '#2a2a30']])
    const kids = [0, 1, 2].slice(0, lite ? 2 : 3).map((k): {lane: 'x' | 'z'; c: number; a: number; b: number; v: number; p: number} => k < 2 && level.crossings[k] !== undefined ? {lane: 'x', c: level.crossings[k]! + (k ? 3 : -3), a: walk + 4, b: level.side - 4, v: 2.6 + k * 0.6, p: rnd() * 40} : {lane: 'z', c: (k % 2 ? 1 : -1) * (half + 2.2), a: goalZ + 60, b: zTop - 20, v: 2.2, p: rnd() * 80})
    const kms = kids.map((_, i) => { const m = new THREE.Mesh(keep(kidOnBike(['#c8c2b4', '#6a7a8a', '#8a5a4a'][i]!)), vc({roughness: 0.7})); root.add(m); return m })
    ticks.push(t => { kids.forEach((k, i) => { const L = k.b - k.a, u = ((t * k.v + k.p) % (2 * L) + 2 * L) % (2 * L), back = u > L, d = back ? 2 * L - u : u, pos = k.a + d, m = kms[i]!
      if (k.lane === 'x') { m.position.set((i % 2 ? 1 : -1) * pos, 0.02, k.c); m.rotation.set(0, -(back ? -1 : 1) * (i % 2 ? 1 : -1) * Math.PI / 2, Math.sin(t * 2 + i) * 0.05) }
      else { m.position.set(k.c, 0.17, pos); m.rotation.set(0, back ? 0 : Math.PI, Math.sin(t * 2 + i) * 0.05) } }) })
    // the man washing his car in the second side street: the car wet and shining, a bucket, foam on the bonnet, his arm going
    const c2 = level.crossings[1]
    if (c2 !== undefined) { const cx = -(walk + 9), cz = c2 + 4.2, car = carMesh(rnd); car.position.set(cx, 0, cz); car.rotation.y = Math.PI / 2; (car.material as THREE.MeshStandardMaterial).roughness = 0.12; root.add(car)
      const man = new THREE.Mesh(keep(standing()), vc({roughness: 0.85})); man.position.set(cx + 0.6, 0.02, cz + 1.25); man.rotation.y = Math.PI; root.add(man)
      const bucket = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.17, 0.14, 0.3, 10).translate(0, 0.15, 0)), std('#5a7aa0', {roughness: 0.4})); bucket.position.set(cx - 0.6, 0.02, cz + 1.4); root.add(bucket)
      const foam = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.2, 0.8).rotateX(-Math.PI / 2)), std('#f4f2ee', {roughness: 1, transparent: true, opacity: 0.85})); foam.position.set(cx + 0.5, 1.02, cz); root.add(foam)
      const wet = new THREE.Mesh(keep(new THREE.CircleGeometry(2.4, 18).rotateX(-Math.PI / 2)), std('#101216', {roughness: 0.03, metalness: 0.8, transparent: true, opacity: 0.6})); wet.position.set(cx, 0.03, cz + 0.6); root.add(wet)
      ticks.push(t => { man.rotation.z = Math.sin(t * 4) * 0.06; man.position.x = cx + 0.6 + Math.sin(t * 1.3) * 0.5 }) }
  }
  // a moped passes down the street now and then, with its own two-stroke sound when sound is on
  { const moped = painted([[new THREE.TorusGeometry(0.24, 0.07, 6, 14).rotateY(Math.PI / 2).translate(0, 0.24, -0.55), '#141416'], [new THREE.TorusGeometry(0.24, 0.07, 6, 14).rotateY(Math.PI / 2).translate(0, 0.24, 0.55), '#141416'], [fb(0.32, 0.38, 0.9, 0, 0.5, 0.1), ok('#8a2e2a', '#4a5a6a')], [fb(0.34, 0.7, 0.1, 0, 0.7, -0.45), ok('#8a2e2a', '#4a5a6a')],
      [fb(0.14, 0.6, 0.14, -0.1, 0.85, 0.2), '#2c2f36'], [fb(0.14, 0.6, 0.14, 0.1, 0.85, 0.2), '#2c2f36'], [new THREE.CapsuleGeometry(0.17, 0.32, 4, 8).translate(0, 1.4, 0.1).rotateX(0.0), '#3a3f48'], [new THREE.SphereGeometry(0.15, 10, 8).translate(0, 1.85, 0.0), '#2a2c30'], [fb(0.6, 0.04, 0.04, 0, 1.15, -0.5), '#2a2b30']])
    const mesh = new THREE.Mesh(keep(moped), vc({roughness: 0.35, metalness: 0.3})); root.add(mesh)
    const lampG = keep(new THREE.BufferGeometry()); lampG.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3))
    const lamp = new THREE.Points(lampG, keep(new THREE.PointsMaterial({map: glowTex, size: 2.4, color: C('#fff0e0').multiplyScalar(1.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}))); root.add(lamp)
    const L = zTop - (goalZ + 40), v = 9.5, lane = 3.9
    let audio: {ctx: AudioContext; gain: GainNode; osc: OscillatorNode; lfo: OscillatorNode} | null = null, soundOk = false, checkAt = 0
    const wake = () => {
      if (audio || typeof window === 'undefined') return
      try { if (!readSettings(browserStore()).sound) return
        const Ctor = window.AudioContext ?? (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext; if (!Ctor) return
        const ctx = new Ctor(), osc = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), filt = ctx.createBiquadFilter(), gain = ctx.createGain()
        osc.type = 'sawtooth'; osc.frequency.value = 95; lfo.type = 'square'; lfo.frequency.value = 31; lg.gain.value = 22; lfo.connect(lg).connect(osc.frequency)
        filt.type = 'lowpass'; filt.frequency.value = 900; gain.gain.value = 0; osc.connect(filt).connect(gain).connect(ctx.destination); osc.start(); lfo.start()
        audio = {ctx, gain, osc, lfo}; soundOk = true } catch { audio = null }
    }
    if (typeof window !== 'undefined') { window.addEventListener('pointerdown', wake, {once: true}); window.addEventListener('keydown', wake, {once: true}) }
    let lastZ = 0
    ticks.push((t, dt, sim) => {
      const period = L / v + 14, u = (t + 5) % period, on = u < L / v, z = zTop - u * v
      mesh.visible = on; mesh.position.set(-lane, 0.02, z); mesh.rotation.set(0, 0, Math.sin(t * 1.7) * 0.04)
      ;(lampG.attributes.position as THREE.BufferAttribute).setXYZ(0, on ? -lane : 0, on ? 1.05 : -50, z - 0.7); lampG.attributes.position!.needsUpdate = true
      if (audio) {
        if (t > checkAt) { checkAt = t + 2; soundOk = readSettings(browserStore()).sound; if (!soundOk) void audio.ctx.suspend(); else void audio.ctx.resume() }
        const d = Math.hypot(sim.x + lane, sim.z - z), g = on && soundOk ? Math.min(0.07, 0.6 / (1 + d * d * 0.05)) : 0, closing = (z - lastZ) / Math.max(dt, 1e-3) * Math.sign(sim.z - z)
        audio.gain.gain.setTargetAtTime(g, audio.ctx.currentTime, 0.08); audio.osc.frequency.setTargetAtTime(95 * (1 + THREE.MathUtils.clamp(-closing / 340, -0.08, 0.08)), audio.ctx.currentTime, 0.1)
      }
      lastZ = z
    })
    keepDispose(() => { if (typeof window !== 'undefined') { window.removeEventListener('pointerdown', wake); window.removeEventListener('keydown', wake) } try { audio?.osc.stop(); audio?.lfo.stop(); void audio?.ctx.close() } catch { /* already closed */ } audio = null })
  }
  function keepDispose(f: () => void) { keep({dispose: f}) }

  return {
    fronts,
    update(sim, t, dt) { flick(t); for (const f of ticks) f(t, dt, sim) },
    dispose() { x.scene.remove(root) },
  }
}

/** a small seeded stream, so the fronts lay the same way every time the same street is built */
function mulberry(a: number) { return () => { a |= 0; a = a + 1_831_565_813 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
