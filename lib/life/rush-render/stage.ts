/**
 * LIFE · RUSH — the picture. Builds the level the simulation describes and draws it every frame.
 *
 * Nothing here decides anything: where a car is, where a steward looks, whether he made it — all of
 * that is `lib/life/rush/sim.ts`. This file turns it into a street at night in the club's colours.
 *
 * Colour rules (rule 95): every colour a club's page may not print is kept out of the picture —
 * no trees where green is the rival's, a police light that is never the banned family, kit and
 * pennants from the club's own skin. The skin is the same object the voxel town is painted from.
 */
import * as THREE from 'three'
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js'
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js'
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js'
import type {VoxelSkin} from '@/lib/life/universal/skin'
import {carAt, walkerAt, type Level, type Look, type PickupKind} from '@/lib/life/rush/level'
import {patrolLook, stepTarget, type Sim} from '@/lib/life/rush/sim'
import type {MissionSpec} from '@/lib/life/rush/spec'
import {dressCity} from './city'
import {HAIR, kitTexture, makeFigure, makeHand, PANTS, pose, SKIN_TONES, TOPS, type Cloth, type FigureData} from './figure'

export type Quality = 'high' | 'lite'
export type View = {cam: 'chase' | 'eyes'; ending: boolean; endT: number; outcome: 'good' | 'ok' | 'slip' | null; intro: number}
export type Stage = {
  render(sim: Sim, view: View, dt: number): void
  resize(w: number, h: number): void
  /** a world point on the glass, for the speech bubbles (DOM, never canvas text) */
  project(x: number, y: number, z: number): {x: number; y: number; visible: boolean}
  dispose(): void
}

const C = (hex: THREE.ColorRepresentation) => new THREE.Color(hex)
const std = (color: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({color, roughness: 0.78, metalness: 0, ...o})

/* ───────────── colour policy ───────────── */

function hsv(hex: string) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return {h: (h * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx}
}
function family(hex: string): string | null {
  const x = hsv(hex)
  if (x.s < 0.2) return null
  return x.h <= 18 || x.h >= 342 ? 'red' : x.h >= 38 && x.h <= 70 ? 'yellow' : x.h >= 90 && x.h <= 170 ? 'green' : x.h >= 190 && x.h <= 260 ? 'blue' : null
}
/** a colour this club's picture never shows: a rival's family, or a hue the club's own policy forbids */
export function bannedColour(hex: string, skin: Pick<VoxelSkin, 'rivals' | 'policy'>): boolean {
  const f = family(hex)
  if (f && skin.rivals?.includes(f)) return true
  const c = hsv(hex)
  return skin.policy.some(r => c.s >= r.minSaturation && c.v >= r.minValue && (r.hue[0] <= r.hue[1] ? c.h >= r.hue[0] && c.h <= r.hue[1] : c.h >= r.hue[0] || c.h <= r.hue[1]))
}
const allowed = (list: readonly string[], skin: VoxelSkin, fallback = '#7a7f89') => { const ok = list.filter(c => !bannedColour(c, skin)); return ok.length ? ok : [fallback] }

/* ───────────── canvas textures ───────────── */

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, w, h)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]) }
  return t
}
function seeded(seed: number) { let s = (seed >>> 0) % 2147483647 || 1984; return () => (s = (s * 16807) % 2147483647) / 2147483647 }

/* ───────────── the stage ───────────── */

export function createStage(o: {canvas: HTMLCanvasElement; level: Level; spec: MissionSpec; skin: VoxelSkin; quality: Quality; reduced: boolean; gateLabel: string}): Stage {
  const {canvas, level, spec, skin, quality, reduced} = o
  const lite = quality === 'lite'
  const renderer = new THREE.WebGLRenderer({canvas, antialias: !lite, powerPreference: 'high-performance'})
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = spec.time === 'night' ? 1.08 : 1.0
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = !lite
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  const rnd = seeded(spec.seed ^ 0x51ed)
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]!
  const night = spec.time === 'night'
  const disposables: {dispose(): void}[] = []
  const keep = <T extends {dispose(): void}>(x: T) => { disposables.push(x); return x }

  const cloth: Cloth = {primary: skin.p, secondary: skin.s, trim: skin.t, pattern: skin.pattern, inverse: skin.ik}
  const kitMap = keep(kitTexture(cloth))
  const box = keep(new THREE.BoxGeometry(1, 1, 1))
  const glowTex = keep(canvasTex(128, 128, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w) }))
  const noiseTex = (base: string, spread: number, rep: [number, number], cracks = false) => keep(canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h)
    const im = g.getImageData(0, 0, w, h)
    for (let i = 0; i < im.data.length; i += 4) { const n = (rnd() - 0.5) * spread; im.data[i]! += n; im.data[i + 1]! += n; im.data[i + 2]! += n }
    g.putImageData(im, 0, 0)
    if (cracks) { g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; for (let k = 0; k < 6; k++) { g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y); for (let s = 0; s < 8; s++) { x += (rnd() - 0.5) * 30; y += (rnd() - 0.5) * 30; g.lineTo(x, y) } g.stroke() } }
  }, rep))
  const signTex = (text: string, bg: string, fg: string, w = 512, h = 128) => keep(canvasTex(w, h, g => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'
    let size = h * 0.62
    const f = (s: number) => `800 ${s}px 'Arial Narrow','Heebo','Fira Sans Condensed',system-ui,sans-serif`
    g.font = f(size)
    while (g.measureText(text).width > w * 0.88 && size > 10) { size -= 2; g.font = f(size) }
    g.fillText(text, w / 2, h / 2 + 2)
  }))

  const scene = new THREE.Scene()
  const cam = new THREE.PerspectiveCamera(56, 1, 0.05, 1600)
  scene.add(cam)

  /* sky, light, weather */
  const skyTop = night ? '#03050b' : '#4f7fb8', skyMid = night ? '#121a33' : '#a9c4dc', glowC = night ? '#2a1a33' : '#f3d9b8'
  scene.fog = new THREE.FogExp2(night ? '#0b0f1d' : '#b8c8d6', level.place === 'road' ? 0.0035 : 0.0075)
  const skyMat = keep(new THREE.ShaderMaterial({side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {uTop: {value: C(skyTop)}, uMid: {value: C(skyMid)}, uGlow: {value: C(glowC)}},
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 uTop,uMid,uGlow; varying vec3 vP; void main(){ float h=vP.y; vec3 c=mix(uMid,uTop,smoothstep(0.,.55,h)); c=mix(c,uGlow,smoothstep(.25,0.,abs(h-.02))*smoothstep(.2,-.9,vP.z)); gl_FragColor=vec4(c,1.); }'}))
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(1400, 32, 16)), skyMat); scene.add(sky)
  if (night) {
    const st = new Float32Array(900 * 3)
    for (let i = 0; i < 900; i++) { const a = rnd() * Math.PI * 2, e = 0.08 + rnd() * 1.3, r = 1300; st[i * 3] = Math.cos(a) * Math.cos(e) * r; st[i * 3 + 1] = Math.sin(e) * r; st[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r }
    const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(st, 3))
    scene.add(new THREE.Points(g, keep(new THREE.PointsMaterial({color: '#cfd8ff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8}))))
  }
  scene.add(new THREE.HemisphereLight(night ? '#6a7cb0' : '#dfe9f5', night ? '#1a1214' : '#6b5d4c', night ? 0.38 : 1.0))
  const key = new THREE.DirectionalLight(night ? '#e6efff' : '#fff1dc', night ? 0.9 : 2.2)
  key.castShadow = !lite; key.shadow.mapSize.set(2048, 2048)
  Object.assign(key.shadow.camera, {left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 140})
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02
  scene.add(key, key.target)
  const rim = new THREE.PointLight('#ffb886', night ? 6 : 2, 6, 2); scene.add(rim)
  const fill = new THREE.PointLight('#9fb6ff', night ? 3 : 1, 7, 2); scene.add(fill)
  let rain: THREE.Points | null = null
  if (spec.weather === 'rain' || spec.weather === 'cold') {
    const n = lite ? 900 : 2400, p = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { p[i * 3] = (rnd() - 0.5) * 40; p[i * 3 + 1] = rnd() * 20; p[i * 3 + 2] = (rnd() - 0.5) * 40 }
    const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    rain = new THREE.Points(g, keep(new THREE.PointsMaterial({color: spec.weather === 'cold' ? '#eef2ff' : '#9fb3cf', size: spec.weather === 'cold' ? 0.09 : 0.05, transparent: true, opacity: 0.7, depthWrite: false})))
    scene.add(rain)
  }

  /* ground + the shared street pieces */
  const wet = spec.weather === 'rain'
  const asphalt = noiseTex('#202227', 26, [3, 80], true)
  const tile = keep(canvasTex(256, 256, (g, w) => { g.fillStyle = '#6b6a6e'; g.fillRect(0, 0, w, w); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const v = 95 + rnd() * 25; g.fillStyle = `rgb(${v},${v - 2},${v - 4})`; g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60) } }, [2, 40]))
  const plaster = ['#e9e3d6', '#ddd5c5', '#efe7d7', '#cfc8bb', '#e4d8c3', '#d8cfbf']
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), tmp = new THREE.Vector3()
  const lampLights: THREE.PointLight[] = []
  const lampZ: number[] = []
  const zStart = level.bounds.z1 + 30, zEnd = level.goal.z - 60, span = zStart - zEnd, zMid = (zStart + zEnd) / 2

  const addRoad = (half: number, walk: number) => {
    const road = new THREE.Mesh(keep(new THREE.PlaneGeometry(half * 2, span)), keep(new THREE.MeshStandardMaterial({map: asphalt, roughness: wet ? 0.16 : 0.38, metalness: wet ? 0.5 : 0.2})))
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0, zMid); road.receiveShadow = true; scene.add(road)
    for (const side of [-1, 1]) {
      const pave = new THREE.Mesh(box, keep(new THREE.MeshStandardMaterial({map: tile, roughness: wet ? 0.3 : 0.8})))
      pave.scale.set(walk - half, 0.16, span); pave.position.set(side * (half + (walk - half) / 2), 0.08, zMid); pave.receiveShadow = true; scene.add(pave)
      const kerb = new THREE.Mesh(box, keep(std('#9a958c'))); kerb.scale.set(0.22, 0.18, span); kerb.position.set(side * half, 0.09, zMid); scene.add(kerb)
    }
    const n = Math.floor(span / 5)
    const dashes = new THREE.InstancedMesh(box, keep(std('#cfc9bc', {roughness: 0.55})), n * (level.place === 'road' ? 2 : 1))
    let i = 0
    for (let k = 0; k < n; k++) for (const x of level.place === 'road' ? [-2.1, 2.1] : [0]) { m4.makeScale(0.16, 0.01, 2.2).setPosition(x, 0.006, zStart - k * 5); dashes.setMatrixAt(i++, m4) }
    scene.add(dashes)
  }

  const addBuildings = (walk: number, from: number, to: number, gaps: number[]) => {
    const blocks: {x: number; z: number; w: number; h: number; c: string}[] = [], wins: {x: number; y: number; z: number; lit: boolean; warm: boolean; side: number}[] = []
    for (const side of [-1, 1]) {
      let z = from
      while (z > to) {
        const w = 7 + rnd() * 9, zc = z - w / 2
        if (gaps.some(c => Math.abs(zc - c) < w / 2 + 8)) { z -= 4; continue }
        const h = 9 + Math.floor(rnd() * 6) * 3.2
        blocks.push({x: side * (walk + 5), z: zc, w, h, c: pick(plaster)})
        for (let fl = 1; fl * 3.2 + 1 < h; fl++) for (let k = 0; k < Math.floor(w / 2.6); k++) wins.push({x: side * (walk - 0.04), y: fl * 3.2 + 0.4, z: z - 1.3 - k * 2.6, lit: rnd() < (night ? 0.42 : 0.1), warm: rnd() < 0.7, side})
        z -= w + (rnd() < 0.2 ? 2 : 0.2)
      }
    }
    const facade = noiseTex('#ffffff', 22, [1, 1])
    const b = new THREE.InstancedMesh(box, keep(new THREE.MeshStandardMaterial({map: facade, roughness: 0.95})), blocks.length)
    blocks.forEach((x, i) => { m4.makeScale(10, x.h, x.w).setPosition(x.x, x.h / 2, x.z); b.setMatrixAt(i, m4); b.setColorAt(i, C(x.c)) }); b.receiveShadow = true; scene.add(b)
    const plinth = new THREE.InstancedMesh(box, keep(std('#ffffff')), blocks.length)
    blocks.forEach((x, i) => { m4.makeScale(10.3, 3, x.w).setPosition(x.x, 1.5, x.z); plinth.setMatrixAt(i, m4); plinth.setColorAt(i, C(x.c).multiplyScalar(0.55)) }); scene.add(plinth)
    const winGeo = keep(new THREE.PlaneGeometry(1.2, 1.6))
    const warm = new THREE.InstancedMesh(winGeo, keep(new THREE.MeshBasicMaterial({color: C('#ffb27a').multiplyScalar(night ? 1.6 : 0.9), toneMapped: false})), wins.length)
    const cool = new THREE.InstancedMesh(winGeo, keep(new THREE.MeshBasicMaterial({color: C('#9ec2ff').multiplyScalar(night ? 1.3 : 0.8), toneMapped: false})), wins.length)
    const dark = new THREE.InstancedMesh(winGeo, keep(std(night ? '#2a2f3c' : '#5d6b7d', {roughness: 0.2, metalness: 0.5})), wins.length)
    let nw = 0, nc = 0, nd = 0
    for (const w of wins) { q.setFromAxisAngle(up, -w.side * Math.PI / 2); m4.compose(tmp.set(w.x, w.y, w.z), q, one); if (!w.lit) dark.setMatrixAt(nd++, m4); else if (w.warm) warm.setMatrixAt(nw++, m4); else cool.setMatrixAt(nc++, m4) }
    warm.count = nw; cool.count = nc; dark.count = nd; scene.add(warm, cool, dark)
    // shop fronts with the club's own words over them
    const words = [skin.strings.kiosk, skin.strings.cafe, skin.strings.snack, skin.strings.shop, skin.strings.news, skin.strings.ticket].filter((x): x is string => !!x)
    for (const side of [-1, 1]) for (let z = from - 8; z > to + 10; z -= 22 + rnd() * 10) {
      if (gaps.some(c => Math.abs(z - c) < 9)) continue
      if (words.length) {
        const sg = new THREE.Mesh(keep(new THREE.PlaneGeometry(4.2, 1.05)), keep(new THREE.MeshBasicMaterial({map: signTex(pick(words), rnd() < 0.5 ? skin.t : '#101521', rnd() < 0.45 ? skin.p : '#f3efe6'), toneMapped: false})))
        sg.rotation.y = -side * Math.PI / 2; sg.position.set(side * (walk - 0.05), 3.6, z); scene.add(sg)
      }
      const aw = new THREE.Mesh(box, keep(std(rnd() < 0.5 ? skin.p : '#2d3a52'))); aw.scale.set(1.6, 0.12, 4.4); aw.position.set(side * (walk - 0.8), 2.8, z); aw.rotation.z = side * 0.25; aw.castShadow = true; scene.add(aw)
      const shop = new THREE.Mesh(keep(new THREE.PlaneGeometry(3.8, 2.2)), keep(new THREE.MeshBasicMaterial({color: C('#ffcf9e').multiplyScalar(night ? 1.1 : 0.7), toneMapped: false}))); shop.rotation.y = -side * Math.PI / 2; shop.position.set(side * (walk - 0.04), 1.3, z); scene.add(shop)
    }
    // trees, never where green is a rival's
    if (!bannedColour('#2f4a33', skin)) {
      const trunks: [number, number][] = [], crowns: [number, number, number, number][] = []
      for (const side of [-1, 1]) for (let z = from - 4; z > to + 10; z -= 27) { if (gaps.some(c => Math.abs(z - c) < 9)) continue; trunks.push([side * (level.half + 2.6), z]); for (let k = 0; k < 4; k++) crowns.push([side * (level.half + 2.6) + (rnd() - 0.5) * 1.4, 4.2 + rnd() * 1.6, z + (rnd() - 0.5) * 1.4, 0.9 + rnd() * 0.6]) }
      const tm = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.12, 0.18, 4, 8)), keep(std('#3d2c22')), trunks.length)
      trunks.forEach(([x, z], i) => { m4.makeTranslation(x, 2, z); tm.setMatrixAt(i, m4) }); tm.castShadow = !lite; scene.add(tm)
      const cm = new THREE.InstancedMesh(keep(new THREE.IcosahedronGeometry(1, 1)), keep(std('#2f4a33', {roughness: 0.9, flatShading: true})), crowns.length)
      crowns.forEach(([x, y, z, r], i) => { m4.makeScale(r, r * 0.85, r).setPosition(x, y, z); cm.setMatrixAt(i, m4); cm.setColorAt(i, C('#2f4a33').lerp(C('#4a5e33'), rnd())) }); cm.castShadow = !lite; scene.add(cm)
    }
  }

  const addLamps = (half: number, from: number, to: number, every: number) => {
    for (let z = from; z > to; z -= every) lampZ.push(z)
    const poles = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.07, 0.1, 6.5, 8)), keep(std('#22252c')), lampZ.length * 2)
    const heads = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.14, 0.9, 4, 8).rotateZ(Math.PI / 2)), keep(new THREE.MeshBasicMaterial({color: C('#ffd9b8').multiplyScalar(night ? 3.2 : 1), toneMapped: false})), lampZ.length * 2)
    const pools = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(1, 1)), keep(new THREE.MeshBasicMaterial({map: glowTex, color: C('#ff9c5c').multiplyScalar(night ? 0.85 : 0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending})), lampZ.length * 2)
    let li = 0
    for (const z of lampZ) for (const side of [-1, 1]) {
      const x = side * (half + 1.2)
      m4.makeTranslation(x, 3.25, z); poles.setMatrixAt(li, m4)
      m4.makeTranslation(x - side * 0.6, 6.5, z); heads.setMatrixAt(li, m4)
      q.setFromAxisAngle(tmp.set(1, 0, 0), -Math.PI / 2); m4.compose(new THREE.Vector3(x - side * 1.2, 0.03, z), q, new THREE.Vector3(9, 9, 1)); pools.setMatrixAt(li, m4)
      li++
    }
    scene.add(poles, heads); if (night) scene.add(pools)
    if (night) for (let k = 0; k < (lite ? 4 : 8); k++) { const pl = new THREE.PointLight('#ffb07a', 55, 24, 1.6); scene.add(pl); lampLights.push(pl) }
  }

  const addPennants = (walk: number, from: number, to: number) => {
    const pz: number[] = []; for (let z = from; z > to; z -= 34) pz.push(z)
    const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.45, 0, 0, 0.45, 0, 0, 0, -1.1, 0]), 3)); g.computeVertexNormals()
    const pens = new THREE.InstancedMesh(g, keep(new THREE.MeshStandardMaterial({color: '#ffffff', side: THREE.DoubleSide, roughness: 0.7, emissive: '#222222'})), pz.length * 18)
    let i = 0
    for (const z of pz) for (let j = 0; j < 18; j++) { const x = -walk + 1 + j * ((walk * 2 - 2) / 17); m4.makeRotationY((rnd() - 0.5) * 0.3).setPosition(x, 7.6 - (1 - (x / walk) ** 2) * 0.9, z); pens.setMatrixAt(i, m4); pens.setColorAt(i, C(j % 2 ? skin.s : skin.p)); i++ }
    scene.add(pens)
  }

  /** the ground at the end of the road: a lit bowl, floodlights, the gate in the club's word for it */
  const towers: THREE.Sprite[] = []
  const addGround = (z: number, wallZ: number) => {
    const stad = new THREE.Group(); stad.position.set(0, 0, z); scene.add(stad)
    const shell = new THREE.Mesh(keep(new THREE.CylinderGeometry(78, 84, 26, 48, 1, true)), keep(std('#2b2f3a', {side: THREE.DoubleSide}))); shell.position.y = 13; stad.add(shell)
    const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(80, 1.2, 6, 64)), keep(new THREE.MeshBasicMaterial({color: C(skin.p).multiplyScalar(1.6), toneMapped: false}))); ring.rotation.x = Math.PI / 2; ring.position.y = 26.5; stad.add(ring)
    const glow = new THREE.Mesh(keep(new THREE.PlaneGeometry(420, 200)), keep(new THREE.MeshBasicMaterial({map: glowTex, color: C(night ? '#cfe0ff' : '#ffffff').multiplyScalar((night ? 0.9 : 0.25) * (skyline ? 0.3 : 1)), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false}))); glow.position.set(0, 50, -40); stad.add(glow)
    for (const [x, zz] of [[-70, 40], [70, 40], [-70, -40], [70, -40]] as const) {
      const tw = new THREE.Mesh(box, keep(new THREE.MeshStandardMaterial({color: '#30343e', fog: false}))); tw.scale.set(2.2, 82, 2.2); tw.position.set(x, 41, zz); stad.add(tw)
      const lamp = new THREE.Mesh(box, keep(new THREE.MeshBasicMaterial({color: C('#eaf2ff').multiplyScalar(night ? 7 : 1.5), toneMapped: false, fog: false}))); lamp.scale.set(12, 6, 1.2); lamp.position.set(x, 84, zz); lamp.lookAt(0, 0, 0); stad.add(lamp)
      if (night) { const halo = new THREE.Sprite(keep(new THREE.SpriteMaterial({map: glowTex, color: C('#dfe9ff').multiplyScalar(1.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false}))); halo.scale.set(70, 70, 1); halo.position.set(x, 84, zz); stad.add(halo); towers.push(halo) }
    }
    const wall = new THREE.Mesh(box, keep(std('#3c3f48'))); wall.scale.set(46, 10, 2); wall.position.set(0, 5, wallZ); wall.receiveShadow = true; scene.add(wall)
    const frame = new THREE.Mesh(box, keep(std(skin.t))); frame.scale.set(8.6, 7, 2.4); frame.position.set(0, 3.5, wallZ + 0.1); scene.add(frame)
    const hole = new THREE.Mesh(keep(new THREE.PlaneGeometry(6, 5.4)), keep(new THREE.MeshBasicMaterial({color: C('#f4f7ff').multiplyScalar(2.2), toneMapped: false}))); hole.position.set(0, 2.7, wallZ + 1.35); scene.add(hole)
    const sign = new THREE.Mesh(keep(new THREE.PlaneGeometry(8, 2)), keep(new THREE.MeshBasicMaterial({map: signTex(o.gateLabel, skin.p, '#ffffff'), toneMapped: false}))); sign.position.set(0, 8.2, wallZ + 1.3); scene.add(sign)
    const ground = skin.stadium ?? skin.strings.ground
    if (ground) { const gs = new THREE.Mesh(keep(new THREE.PlaneGeometry(26, 3.2)), keep(new THREE.MeshBasicMaterial({map: signTex(ground, '#0d1018', '#f3efe6', 1024, 128), toneMapped: false}))); gs.position.set(0, 12.2, wallZ - 1.2); scene.add(gs) }
    const gl = new THREE.PointLight('#e8f0ff', night ? 140 : 30, 30, 1.6); gl.position.set(0, 5, wallZ + 8); scene.add(gl)
  }


  /** every crossing is a street you may walk down: pavements, shop fronts, windows, a barrier where the walk ends */
  const addSideStreets = () => {
    const w = level.walk, far = 120
    const tileM = keep(new THREE.MeshStandardMaterial({map: tile, roughness: wet ? 0.3 : 0.8}))
    const blocks: {x: number; z: number; w: number; h: number; c: string}[] = [], wins: {x: number; y: number; z: number; lit: boolean; warm: boolean; face: number}[] = []
    const fronts: {x: number; z: number; face: number}[] = []
    for (const cz of level.crossings) {
      for (const side of [-1, 1]) for (const zz of [cz + 5.6, cz - 5.6]) {
        const pv = new THREE.Mesh(box, tileM); pv.scale.set(far - w, 0.16, 3.2); pv.position.set(side * (w + (far - w) / 2), 0.08, zz); pv.receiveShadow = true; scene.add(pv)
      }
      for (const side of [-1, 1]) for (const row of [1, -1]) {
        const zz = cz + row * 12, face = row > 0 ? Math.PI : 0, fz = cz + row * 7.02
        let x = w + 10
        while (x < far) {
          const bw = 7 + rnd() * 8, h = 9 + Math.floor(rnd() * 5) * 3.2, cx = side * (x + bw / 2)
          blocks.push({x: cx, z: zz, w: bw, h, c: pick(plaster)})
          for (let fl = 1; fl * 3.2 + 1 < h; fl++) for (let k = 0; k < Math.floor(bw / 2.6); k++) wins.push({x: side * (x + 1.3 + k * 2.6), y: fl * 3.2 + 0.4, z: fz, lit: rnd() < (night ? 0.42 : 0.1), warm: rnd() < 0.7, face})
          if (x < level.side + 4 && rnd() < 0.55) fronts.push({x: cx, z: fz, face})
          x += bw + 0.3
        }
      }
      // where the walk ends: a barrier across each pavement, lit
      for (const side of [-1, 1]) for (const zz of [cz + 5.6, cz - 5.6]) {
        const b = new THREE.Mesh(box, keep(std('#f3efe6', {emissive: C('#f3efe6'), emissiveIntensity: night ? 0.35 : 0.05}))); b.scale.set(0.12, 1.0, 3); b.position.set(side * (level.side + 0.8), 0.6, zz); scene.add(b)
        const s2 = new THREE.Mesh(box, keep(std('#2b2f3a'))); s2.scale.set(0.14, 0.18, 3.02); s2.position.set(side * (level.side + 0.8), 0.75, zz); scene.add(s2)
      }
    }
    // lamps down every side street, a warm pool under each: the way in is lit
    const lamps: [number, number][] = []
    for (const cz of level.crossings) for (const side of [-1, 1]) for (let x = w + 9; x < level.side + 2; x += 13) lamps.push([side * x, cz + (Math.round(x / 13) % 2 ? 6.6 : -6.6)])
    const poles = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.06, 0.09, 5.4, 8)), keep(std('#22252c')), lamps.length)
    const heads = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.22, 10, 8)), keep(new THREE.MeshBasicMaterial({color: C('#ffd9b8').multiplyScalar(night ? 3.2 : 1), toneMapped: false})), lamps.length)
    const pools = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(1, 1)), keep(new THREE.MeshBasicMaterial({map: glowTex, color: C('#ff9c5c').multiplyScalar(night ? 0.9 : 0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending})), lamps.length)
    lamps.forEach(([x, z], i) => {
      m4.makeTranslation(x, 2.7, z); poles.setMatrixAt(i, m4)
      m4.makeTranslation(x, 5.45, z); heads.setMatrixAt(i, m4)
      q.setFromAxisAngle(tmp.set(1, 0, 0), -Math.PI / 2); m4.compose(new THREE.Vector3(x, 0.03, z), q, new THREE.Vector3(8, 8, 1)); pools.setMatrixAt(i, m4)
    })
    scene.add(poles, heads); if (night) scene.add(pools)
    const facade = noiseTex('#ffffff', 22, [1, 1])
    const b = new THREE.InstancedMesh(box, keep(new THREE.MeshStandardMaterial({map: facade, roughness: 0.95})), blocks.length)
    blocks.forEach((x, i) => { m4.makeScale(x.w, x.h, 10).setPosition(x.x, x.h / 2, x.z); b.setMatrixAt(i, m4); b.setColorAt(i, C(x.c)) }); b.receiveShadow = true; scene.add(b)
    const winGeo = keep(new THREE.PlaneGeometry(1.2, 1.6))
    const warm = new THREE.InstancedMesh(winGeo, keep(new THREE.MeshBasicMaterial({color: C('#ffb27a').multiplyScalar(night ? 1.6 : 0.9), toneMapped: false})), wins.length)
    const dark = new THREE.InstancedMesh(winGeo, keep(std(night ? '#2a2f3c' : '#5d6b7d', {roughness: 0.2, metalness: 0.5})), wins.length)
    let nw = 0, nd = 0
    for (const x of wins) { q.setFromAxisAngle(up, x.face); m4.compose(tmp.set(x.x, x.y, x.z), q, one); if (x.lit && x.warm) warm.setMatrixAt(nw++, m4); else dark.setMatrixAt(nd++, m4) }
    warm.count = nw; dark.count = nd; scene.add(warm, dark)
    const words = [skin.strings.kiosk, skin.strings.cafe, skin.strings.snack, skin.strings.shop, skin.strings.news].filter((x): x is string => !!x)
    for (const f of fronts) {
      const shop = new THREE.Mesh(keep(new THREE.PlaneGeometry(3.6, 2.2)), keep(new THREE.MeshBasicMaterial({color: C('#ffcf9e').multiplyScalar(night ? 1.1 : 0.7), toneMapped: false}))); shop.rotation.y = f.face; shop.position.set(f.x, 1.3, f.z + (f.face ? -0.02 : 0.02)); scene.add(shop)
      if (words.length) { const sg = new THREE.Mesh(keep(new THREE.PlaneGeometry(3.8, 0.95)), keep(new THREE.MeshBasicMaterial({map: signTex(pick(words), rnd() < 0.5 ? skin.t : '#101521', rnd() < 0.45 ? skin.p : '#f3efe6'), toneMapped: false}))); sg.rotation.y = f.face; sg.position.set(f.x, 3.4, f.z + (f.face ? -0.04 : 0.04)); scene.add(sg) }
    }
  }

  /* ───────────── the places ───────────── */

  const crossLanes: THREE.Mesh[] = []
  let skyline = false
  if (level.place === 'street') {
    addRoad(level.half, level.walk)
    for (const z of level.crossings) {
      const cr = new THREE.Mesh(keep(new THREE.PlaneGeometry(240, 8.2)), keep(new THREE.MeshStandardMaterial({map: asphalt, roughness: wet ? 0.16 : 0.4, metalness: wet ? 0.5 : 0.2}))); cr.rotation.x = -Math.PI / 2; cr.position.set(0, 0.004, z); cr.receiveShadow = true; scene.add(cr); crossLanes.push(cr)
      const zeb = new THREE.InstancedMesh(box, keep(std('#d9d4c8', {roughness: 0.55})), 9)
      for (let i = 0; i < 9; i++) { m4.makeScale(0.9, 0.01, 3).setPosition(-6 + i * 1.5, 0.01, z + 7); zeb.setMatrixAt(i, m4) } scene.add(zeb)
    }
    addBuildings(level.walk, level.bounds.z1 + 16, level.goal.z + 40, level.crossings)
    if (level.side) addSideStreets()
    addLamps(level.half, level.bounds.z1 + 4, level.goal.z + 20, 18)
    addPennants(level.walk, -20, level.goal.z + 30)
    // a city with a landmark at the end of the road dims the ground's glow so the landmark reads behind it
    skyline = dressCity({scene, keep, level, skin, clubId: spec.skin, seed: spec.seed, night, lite, banned: h => bannedColour(h, skin), glowTex})
    const banner = new THREE.Mesh(keep(new THREE.PlaneGeometry(16, 2.4)), keep(new THREE.MeshBasicMaterial({map: signTex(`${o.gateLabel} · ${skin.name.toUpperCase()}`, skin.p, skin.s, 1024, 154), toneMapped: false}))); banner.position.set(0, 9.5, level.goal.z + 26); scene.add(banner)
    addGround(level.goal.z - 51, level.goal.z - 7)
  } else if (level.place === 'road') {
    addRoad(level.half, level.half + 3)
    // the countryside either side: fields, never a rival's green; barriers; a few lamps
    const fieldC = bannedColour('#3c5634', skin) ? '#6b5d4c' : '#3c5634'
    for (const side of [-1, 1]) { const f = new THREE.Mesh(keep(new THREE.PlaneGeometry(400, span)), keep(std(night ? C(fieldC).multiplyScalar(0.5) : fieldC, {roughness: 1}))); f.rotation.x = -Math.PI / 2; f.position.set(side * (level.half + 3 + 200), -0.02, zMid); scene.add(f) }
    const rails = new THREE.InstancedMesh(box, keep(std('#9aa0a8', {metalness: 0.6, roughness: 0.4})), 2)
    for (const [i, side] of [-1, 1].entries()) { m4.makeScale(0.12, 0.5, span).setPosition(side * (level.half + 0.6), 0.6, zMid); rails.setMatrixAt(i, m4) } scene.add(rails)
    addLamps(level.half, level.bounds.z1, level.goal.z, 60)
    for (const c of level.checks) {
      const s = new THREE.Mesh(keep(new THREE.PlaneGeometry(6, 1.4)), keep(new THREE.MeshBasicMaterial({map: signTex('40', '#f3efe6', '#141414', 256, 64), toneMapped: false}))); s.position.set(level.half + 2, 2.4, c.z0 + 20); s.rotation.y = -0.3; scene.add(s)
    }
    addGround(level.goal.z - 120, level.goal.z - 60)
  } else if (level.place === 'yard') {
    const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(level.half * 2 + 20, 120)), keep(new THREE.MeshStandardMaterial({map: noiseTex('#55575c', 18, [6, 18]), roughness: wet ? 0.2 : 0.85}))); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -25); floor.receiveShadow = true; scene.add(floor)
    // the fence at the back with one gap, the wall of the stand behind it
    const fz = level.goal.z - 2
    const fence = new THREE.InstancedMesh(box, keep(std('#2a2d33', {metalness: 0.5, roughness: 0.5})), 160)
    let fi = 0
    for (let x = -level.half - 6; x <= level.half + 6; x += 0.5) { if (Math.abs(x - level.goal.x) < 1.4) continue; m4.makeScale(0.06, 3.2, 0.06).setPosition(x, 1.6, fz); fence.setMatrixAt(fi++, m4) }
    fence.count = fi; scene.add(fence)
    const top = new THREE.Mesh(box, keep(std('#2a2d33'))); top.scale.set(level.half * 2 + 12, 0.08, 0.08); top.position.set(0, 3.2, fz); scene.add(top)
    const gapLight = new THREE.PointLight(level.home ? '#ff9a5a' : '#e8f0ff', night ? 30 : 8, 8, 1.6); gapLight.position.set(level.goal.x, 2.4, fz + 1); scene.add(gapLight)
    const stand = new THREE.Mesh(box, keep(std('#3c3f48'))); stand.scale.set(level.half * 2 + 40, 18, 6); stand.position.set(0, 9, fz - 8); scene.add(stand)
    if (level.home) {
      // the storeroom: a doorway with their banner rolled on a rack — drawn in neither club's colours
      const door = new THREE.Mesh(keep(new THREE.PlaneGeometry(2.4, 2.8)), keep(new THREE.MeshBasicMaterial({color: C('#ffcf9e').multiplyScalar(1.2), toneMapped: false}))); door.position.set(level.goal.x, 1.4, fz + 0.05); scene.add(door)
    }
    addLamps(level.half - 1, 8, fz + 6, 14)
    // the bowl stands well behind the fence: a 78 m shell placed close would swallow the yard
    addGround(fz - 100, fz - 6)
  } else {
    // the crowd: a terrace in rising bands, crush barriers, the floodlights
    const pitchC = bannedColour('#2f5a2c', skin) ? '#2a2d36' : '#2f5a2c'
    const isPitch = spec.template === 'title-night', school = level.kids
    const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(level.half * 2 + 30, 90)), keep(isPitch ? std(pitchC, {roughness: 0.95}) : new THREE.MeshStandardMaterial({map: noiseTex(school ? '#585a60' : '#6f6c66', school ? 20 : 14, [4, 12], school), roughness: wet ? 0.2 : 0.9})))
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -16); floor.receiveShadow = true; scene.add(floor)
    if (school) {
      // a playground: painted lines, a school along the far side, a wall with a net-less goal
      const lines = new THREE.InstancedMesh(box, keep(std('#e8e3d8', {roughness: 0.6})), 4)
      ;[[0, -16, 22, 0.1], [0, -30, 22, 0.1], [-11, -23, 0.1, 14], [11, -23, 0.1, 14]].forEach(([x, z, w2, d2], i) => { m4.makeScale(w2!, 0.01, d2!).setPosition(x!, 0.012, z!); lines.setMatrixAt(i, m4) }); scene.add(lines)
      const sch = new THREE.Mesh(box, keep(std(pick(plaster)))); sch.scale.set(70, 13, 10); sch.position.set(0, 6.5, level.bounds.z0 - 8); sch.receiveShadow = true; scene.add(sch)
      const ws = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(1.6, 1.8)), keep(new THREE.MeshBasicMaterial({color: C('#ffd9b0').multiplyScalar(night ? 1.4 : 0.7), toneMapped: false})), 48)
      for (let i = 0; i < 48; i++) { m4.makeTranslation(-33 + (i % 16) * 4.4, 3 + Math.floor(i / 16) * 3.6, level.bounds.z0 - 2.98); ws.setMatrixAt(i, m4) } scene.add(ws)
      for (const sx2 of [-1, 1]) { const wl = new THREE.Mesh(box, keep(std('#8a857c'))); wl.scale.set(0.6, 2.4, 60); wl.position.set(sx2 * (level.half + 1.5), 1.2, -20); scene.add(wl) }
    }
    if (!isPitch && !school) {
      const bands = new THREE.InstancedMesh(box, keep(std('#8a857c')), 24)
      for (let i = 0; i < 24; i++) { m4.makeScale(level.half * 2 + 30, 0.04, 0.12).setPosition(0, 0.02, 6 - i * 2.1); bands.setMatrixAt(i, m4) } scene.add(bands)
      const bars = new THREE.InstancedMesh(box, keep(std('#b8b3aa', {metalness: 0.5, roughness: 0.4})), 40)
      let bi = 0
      for (let r = 0; r < 5; r++) for (let k = 0; k < 8; k++) { if (bi >= 40) break; m4.makeScale(3, 0.08, 0.08).setPosition(-14 + k * 4 + (r % 2) * 2, 1.05, -2 - r * 8); bars.setMatrixAt(bi++, m4) }
      bars.count = bi; scene.add(bars)
    }
    const tg = level.targets[0]
    if (tg?.kind === 'spot') {
      const bar = new THREE.Mesh(box, keep(std('#d0cbc0', {metalness: 0.6, roughness: 0.35}))); bar.scale.set(3, 0.1, 0.1); bar.position.set(tg.x, 1.05, tg.z - 0.6); scene.add(bar)
      for (const sx of [-1.4, 1.4]) { const leg = new THREE.Mesh(box, keep(std('#d0cbc0'))); leg.scale.set(0.08, 1.05, 0.08); leg.position.set(tg.x + sx, 0.52, tg.z - 0.6); scene.add(leg) }
      const beam = new THREE.Mesh(keep(new THREE.ConeGeometry(2.2, 14, 24, 1, true)), keep(new THREE.MeshBasicMaterial({color: C('#e6efff').multiplyScalar(0.35), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide}))); beam.position.set(tg.x, 7, tg.z); scene.add(beam)
    }
    if (!school) addGround(level.bounds.z0 - 100, level.bounds.z0 - 12)
  }

  /* ───────────── cars ───────────── */
  type CarParts = {body: THREE.InstancedMesh; cab: THREE.InstancedMesh; wheel: THREE.InstancedMesh; head: THREE.InstancedMesh; tail: THREE.InstancedMesh; bar: THREE.InstancedMesh}
  let cars: CarParts | null = null
  const carCols = allowed(['#ece8de', '#2c3a55', '#7a7f89', '#1d1f24', '#9a3a2c', '#3f5f4c'], skin)
  const policeA = bannedColour('#ff2b2b', skin) ? '#f4f4f4' : '#ff2b2b', policeB = bannedColour('#2b6bff', skin) ? '#f4f4f4' : '#2b6bff'
  const heroCar = level.place === 'road'
  const nCars = level.cars.length + (heroCar ? 1 : 0)
  if (nCars) {
    const bodyG = keep(new THREE.CapsuleGeometry(0.55, 3.3, 4, 12).rotateZ(Math.PI / 2)), cabG = keep(new THREE.CapsuleGeometry(0.45, 1.5, 4, 12).rotateZ(Math.PI / 2)), wheelG = keep(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 14).rotateX(Math.PI / 2))
    cars = {
      body: new THREE.InstancedMesh(bodyG, keep(std('#ffffff', {roughness: 0.3, metalness: 0.5})), nCars),
      cab: new THREE.InstancedMesh(cabG, keep(std('#151821', {roughness: 0.1, metalness: 0.7})), nCars),
      wheel: new THREE.InstancedMesh(wheelG, keep(std('#111216')), nCars * 4),
      head: new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.12, 8, 6)), keep(new THREE.MeshBasicMaterial({color: C('#fff3e4').multiplyScalar(night ? 5 : 1.4), toneMapped: false})), nCars * 2),
      tail: new THREE.InstancedMesh(box, keep(new THREE.MeshBasicMaterial({color: C(bannedColour('#ff3a2a', skin) ? '#ff9a3a' : '#ff3a2a').multiplyScalar(night ? 3 : 1.2), toneMapped: false})), nCars),
      bar: new THREE.InstancedMesh(box, keep(new THREE.MeshBasicMaterial({color: '#ffffff', toneMapped: false})), nCars * 2),
    }
    level.cars.forEach((c, i) => cars!.body.setColorAt(i, C(c.police ? '#e9ecf2' : carCols[c.colour % carCols.length]!)))
    if (heroCar) cars.body.setColorAt(level.cars.length, C(skin.p))
    for (const m of Object.values(cars)) { m.castShadow = !lite; m.frustumCulled = false; scene.add(m) }
  }
  const carObj = new THREE.Object3D(), partObj = new THREE.Object3D()
  const placeCar = (i: number, x: number, z: number, yaw: number, police: boolean, t: number) => {
    if (!cars) return
    carObj.position.set(x, 0, z); carObj.rotation.set(0, yaw, 0); carObj.updateMatrix()
    const put = (m: THREE.InstancedMesh, idx: number, px: number, py: number, pz: number, sx = 1, sy = 1, sz = 1) => {
      partObj.position.set(px, py, pz); partObj.scale.set(sx, sy, sz); partObj.rotation.set(0, 0, 0); partObj.updateMatrix()
      m.setMatrixAt(idx, m4.multiplyMatrices(carObj.matrix, partObj.matrix))
    }
    put(cars.body, i, 0, 0.75, 0, 1, 0.95, 1.7)
    put(cars.cab, i, -0.2, 1.42, 0, 1, 0.9, 1.75)
    const wheels: [number, number][] = [[1.3, 0.82], [1.3, -0.82], [-1.3, 0.82], [-1.3, -0.82]]
    wheels.forEach(([wx, wz], k) => put(cars!.wheel, i * 4 + k, wx, 0.34, wz))
    put(cars.head, i * 2, 2.2, 0.8, 0.55); put(cars.head, i * 2 + 1, 2.2, 0.8, -0.55)
    put(cars.tail, i, -2.18, 0.9, 0, 0.06, 0.14, 1.4)
    const on = Math.sin(t * 16) > 0
    put(cars.bar, i * 2, -0.2, 1.95, -0.38, police ? 0.3 : 0, police ? 0.16 : 0, police ? 0.55 : 0)
    put(cars.bar, i * 2 + 1, -0.2, 1.95, 0.38, police ? 0.3 : 0, police ? 0.16 : 0, police ? 0.55 : 0)
    if (police) { cars.bar.setColorAt(i * 2, C(on ? policeA : '#333333').multiplyScalar(on ? 6 : 1)); cars.bar.setColorAt(i * 2 + 1, C(!on ? policeB : '#333333').multiplyScalar(!on ? 6 : 1)) }
  }

  /* ───────────── people ───────────── */
  const figOf = (opts: Parameters<typeof makeFigure>[2]) => makeFigure(cloth, kitMap, opts)
  // the crowd: one posed template, each part instanced
  const tmpl = figOf({template: true, scarf: true})
  tmpl.updateMatrixWorld(true)
  const kidK = level.kids ? 0.78 : 1
  const tParts = (tmpl.userData as FigureData).meshes.filter(m => m.userData.role !== 'glint' && m.userData.role !== 'iris' && m.userData.role !== 'eyeW' && m.userData.role !== 'brow')
  const recolour = new Set(['skin', 'hair', 'pants', 'top', 'beard'])
  type Person = {x: number; z: number; face: number; look: Look; mode: 'walk' | 'stand' | 'steward' | 'rival' | 'target'; idx: number; react: number; turn: number; bubbleAt: number}
  const people: Person[] = []
  level.walkers.forEach((w, i) => people.push({x: w.x, z: w.z0, face: Math.PI, look: w.look, mode: 'walk', idx: i, react: 0, turn: Math.PI, bubbleAt: -9}))
  level.standers.forEach((s, i) => people.push({x: s.x, z: s.z, face: s.face, look: s.look, mode: s.role === 'rival' ? 'rival' : 'stand', idx: i, react: 0, turn: s.face, bubbleAt: -9}))
  const tgt = level.targets[0]
  if (tgt?.kind === 'person' && tgt.look) people.push({x: tgt.x, z: tgt.z, face: Math.PI, look: tgt.look, mode: 'target', idx: 0, react: 0, turn: Math.PI, bubbleAt: -9})
  const N = Math.max(1, people.length)
  const crowd = tParts.map(m => {
    const mat = (m.material as THREE.MeshStandardMaterial).clone(); if (recolour.has(m.userData.role)) mat.color.set('#ffffff')
    keep(mat)
    const im = new THREE.InstancedMesh(m.geometry, mat, N); im.frustumCulled = false; im.castShadow = !lite; scene.add(im); return im
  })
  const tops = allowed(TOPS, skin)
  people.forEach((p, i) => tParts.forEach((m, k) => {
    const r = m.userData.role as string
    const rival = p.mode === 'rival'
    const col = r === 'skin' ? SKIN_TONES[p.look.tone % SKIN_TONES.length] : r === 'hair' || r === 'beard' ? HAIR[p.look.hair % HAIR.length] : r === 'pants' ? PANTS[p.look.pants % PANTS.length] : r === 'top' ? (rival ? '#1d1f24' : tops[p.look.top % tops.length]) : null
    if (col) crowd[k]!.setColorAt(i, C(col))
  }))
  crowd.forEach(im => { if (im.instanceColor) im.instanceColor.needsUpdate = true })
  const zero = new THREE.Matrix4().makeScale(0, 0, 0)


  /* ───────────── the quest: who waits for you, what lies on the ground, where to go next ───────────── */
  const rlook = (o: Partial<Look> = {}): Look => ({tone: Math.floor(rnd() * 6), hair: Math.floor(rnd() * 6), top: Math.floor(rnd() * 6), pants: Math.floor(rnd() * 5), kit: rnd() < 0.8, cap: rnd() < 0.2, scarf: true, beard: rnd() < 0.2, size: 0.95 + rnd() * 0.1, ...o})
  const lookFig = (L: Look, o: Parameters<typeof makeFigure>[2] = {}) => figOf({kit: L.kit, scarf: L.scarf, cap: L.cap, mustache: L.beard, hair: HAIR[L.hair % HAIR.length], skinTone: SKIN_TONES[L.tone % SKIN_TONES.length], top: tops[L.top % tops.length], pants: PANTS[L.pants % PANTS.length], longSleeves: !L.kit, scale: L.size * 0.94 * kidK, ...o})
  const tint = C(skin.p).lerp(C('#ffffff'), 0.3)
  type Npc = {fig: THREE.Group; step: number; extra: THREE.Group[]; x: number; z: number}
  const npcs: Npc[] = []
  level.steps.forEach((st, i) => {
    if (!st.npc) return
    const px = st.kind === 'stop' ? level.half + 4.4 : st.x, pz = st.z
    const childOf = st.joins && level.escort?.who === 'child'
    const fig = lookFig(st.npc, {child: childOf, scale: childOf ? 0.74 : undefined, cap: st.npc.cap || level.escort?.who === 'elder' && st.joins}); fig.position.set(px, 0, pz); scene.add(fig)
    const extra: THREE.Group[] = []
    for (let k = 1; k < st.group; k++) { const a = (k / st.group) * Math.PI * 2; const f = lookFig(rlook({kit: true})); f.position.set(px + Math.cos(a) * 1.3, 0, pz + Math.sin(a) * 1.3); scene.add(f); extra.push(f) }
    npcs.push({fig, step: i, extra, x: px, z: pz})
  })
  // the next place to go: a column of light and a ring on the ground, in the club's own colour
  const beamTex = keep(canvasTex(16, 128, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h) }))
  const beacon = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.85, 0.85, 26, 20, 1, true)), keep(new THREE.MeshBasicMaterial({map: beamTex, color: tint.clone().multiplyScalar(1.4), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false})))
  beacon.position.y = 13; scene.add(beacon)
  const halo = new THREE.Mesh(keep(new THREE.RingGeometry(1.15, 1.45, 40).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({color: tint.clone().multiplyScalar(1.8), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false})))
  scene.add(halo)
  // a speech mark over whoever you have to talk to
  const tag = new THREE.Mesh(keep(new THREE.OctahedronGeometry(0.17, 0)), keep(new THREE.MeshBasicMaterial({color: tint.clone().multiplyScalar(2), toneMapped: false})))
  scene.add(tag)

  // things on the ground: each its own small object, turning, with a glow — the ones a step needs carry a thin light
  const stickerTex = keep(canvasTex(128, 128, (g, w) => { g.fillStyle = skin.p; g.beginPath(); g.arc(w / 2, w / 2, w * 0.47, 0, Math.PI * 2); g.fill(); g.fillStyle = skin.s; g.beginPath(); g.arc(w / 2, w / 2, w * 0.3, 0, Math.PI * 2); g.fill(); g.fillStyle = skin.p; g.font = `900 ${w * 0.3}px system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(skin.initials ?? '', w / 2, w / 2 + 2) }))
  const scarfTex = keep(canvasTex(128, 32, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? skin.s : skin.p; g.fillRect(i * w / 8, 0, w / 8, h) } }))
  const objOf = (k: PickupKind): THREE.Object3D => {
    const g = new THREE.Group()
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, y = 0) => { const m = new THREE.Mesh(keep(geo), keep(mat)); m.position.y = y; m.castShadow = !lite; g.add(m); return m }
    if (k === 'sticker') add(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshStandardMaterial({map: stickerTex, side: THREE.DoubleSide, roughness: 0.5, emissive: C('#ffffff'), emissiveMap: stickerTex, emissiveIntensity: 0.35}))
    else if (k === 'coin') add(new THREE.CylinderGeometry(0.15, 0.15, 0.035, 20).rotateX(Math.PI / 2), std('#d8dce4', {metalness: 0.9, roughness: 0.25}))
    else if (k === 'bottle') { add(new THREE.CylinderGeometry(0.075, 0.075, 0.24, 14), new THREE.MeshStandardMaterial({color: '#bcd6e6', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.75})); add(new THREE.CylinderGeometry(0.028, 0.06, 0.12, 12), new THREE.MeshStandardMaterial({color: '#bcd6e6', roughness: 0.08, transparent: true, opacity: 0.75}), 0.18) }
    else if (k === 'roll') add(new THREE.CylinderGeometry(0.15, 0.15, 0.95, 16).rotateZ(Math.PI / 2), std('#efe9de', {roughness: 0.8}))
    else if (k === 'bag') { add(new THREE.BoxGeometry(0.52, 0.34, 0.26), std('#2b3550', {roughness: 0.7})); add(new THREE.TorusGeometry(0.14, 0.022, 6, 16, Math.PI), std('#1c2233'), 0.17) }
    else if (k === 'scarf') add(new THREE.BoxGeometry(0.95, 0.05, 0.2), new THREE.MeshStandardMaterial({map: scarfTex, roughness: 0.9}))
    else if (k === 'paint') { add(new THREE.CylinderGeometry(0.15, 0.15, 0.22, 18), std('#c9cdd4', {metalness: 0.6, roughness: 0.35})); add(new THREE.CylinderGeometry(0.152, 0.152, 0.07, 18), std(skin.p), 0.02) }
    else if (k === 'cloth') add(new THREE.BoxGeometry(0.55, 0.14, 0.4), std(skin.s, {roughness: 0.95}))
    else add(new THREE.TorusGeometry(0.1, 0.045, 10, 20).rotateX(Math.PI / 2), std('#d9d4c8', {roughness: 0.6}))
    return g
  }
  const pickups = level.pickups.map(p => {
    const g = new THREE.Group(); g.position.set(p.x, 0, p.z); scene.add(g)
    const item = objOf(p.kind); item.position.y = 0.55; g.add(item)
    const glow = new THREE.Sprite(keep(new THREE.SpriteMaterial({map: glowTex, color: (p.step === null ? C('#ffffff') : tint.clone()).multiplyScalar(p.step === null ? 0.6 : 1.1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}))); glow.scale.set(1.3, 1.3, 1); glow.position.y = 0.55; g.add(glow)
    if (p.step !== null) { const b2 = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.12, 0.12, 9, 8, 1, true)), keep(new THREE.MeshBasicMaterial({map: beamTex, color: tint.clone(), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false}))); b2.position.y = 4.5; g.add(b2) }
    return {g, item}
  })
  // a knot of people singing: a ring on the ground that fills while you stand in it
  const ringMeshes = level.rings.map(r => {
    const m = new THREE.Mesh(keep(new THREE.RingGeometry(r.r - 0.12, r.r, 40).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({color: C(skin.s).multiplyScalar(1.4), transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false})))
    m.position.set(r.x, 0.03, r.z); scene.add(m)
    const fillM = new THREE.Mesh(keep(new THREE.CircleGeometry(r.r - 0.14, 40).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({color: C(skin.p).multiplyScalar(1.2), transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false})))
    fillM.position.set(r.x, 0.025, r.z); fillM.scale.setScalar(0.001); scene.add(fillM)
    return {m, fillM}
  })
  // bins and shutters to bang
  const bins = level.noises.map(n => {
    const g = new THREE.Group(); g.position.set(n.x, 0, n.z); scene.add(g)
    const body = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.34, 0.3, 0.95, 16)), keep(std('#4a4f59', {metalness: 0.55, roughness: 0.45}))); body.position.y = 0.48; body.castShadow = !lite; g.add(body)
    const lid = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.37, 0.37, 0.06, 16)), keep(std('#3a3e47', {metalness: 0.6, roughness: 0.4}))); lid.position.y = 0.98; g.add(lid)
    const wave = new THREE.Mesh(keep(new THREE.RingGeometry(0.6, 0.75, 40).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({color: '#f3efe6', transparent: true, opacity: 0, depthWrite: false}))); wave.position.y = 0.05; g.add(wave)
    return {g, lid, wave}
  })
  // a good turn: a small boy alone, or a bag left on the pavement with its owner looking about
  const favourFigs = level.favours.map(f => {
    const g = new THREE.Group(); g.position.set(f.x, 0, f.z); scene.add(g)
    const who = lookFig(rlook({kit: f.kind === 'lost-kid'}), {child: f.kind === 'lost-kid', scale: f.kind === 'lost-kid' ? 0.68 : undefined}); g.add(who)
    if (f.kind === 'bag') { const bag = objOf('bag'); bag.position.set(0.7, 0.17, 0.2); g.add(bag) }
    const mark = new THREE.Mesh(keep(new THREE.OctahedronGeometry(0.13, 0)), keep(new THREE.MeshBasicMaterial({color: '#f3efe6', toneMapped: false}))); mark.position.y = f.kind === 'lost-kid' ? 1.55 : 2.15; g.add(mark)
    return {g, mark}
  })
  // a lay-by on the road where a mate waits
  for (const st of level.steps) if (st.kind === 'stop') {
    const lb = new THREE.Mesh(keep(new THREE.PlaneGeometry(4.6, st.r * 2 + 20)), keep(new THREE.MeshStandardMaterial({map: asphalt, roughness: 0.5, metalness: 0.15}))); lb.rotation.x = -Math.PI / 2; lb.position.set(level.half + 2.2, 0.006, st.z); lb.receiveShadow = true; scene.add(lb)
    const edge = new THREE.Mesh(box, keep(std('#cfc9bc'))); edge.scale.set(0.14, 0.012, st.r * 2 + 20); edge.position.set(level.half - 0.1, 0.01, st.z); scene.add(edge)
    const pole = new THREE.Mesh(box, keep(std('#2b2f3a'))); pole.scale.set(0.08, 2.6, 0.08); pole.position.set(level.half + 4.9, 1.3, st.z - 2); scene.add(pole)
    const sign = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.9, 0.6)), keep(new THREE.MeshBasicMaterial({map: signTex('P', '#2c4d8a', '#f3efe6', 128, 96), toneMapped: false}))); sign.position.set(level.half + 4.9, 2.5, st.z - 1.94); scene.add(sign)
  }
  // who walks with you, and the ones who fall in behind the banner
  const escFig = level.escort ? lookFig(level.escort.look, {child: level.escort.who === 'child', scale: level.escort.who === 'child' ? 0.74 : undefined}) : null
  if (escFig) { escFig.visible = false; scene.add(escFig) }
  const marchers: THREE.Group[] = []
  const groupSteps = level.steps.filter(x => x.group > 0)
  for (let k = 0; k < Math.min(14, groupSteps.reduce((a, b) => a + b.group, 0)); k++) { const f = lookFig(rlook({kit: true})); f.visible = false; scene.add(f); marchers.push(f) }
  const trail: {x: number; z: number; h: number}[] = []
  let trailT = 0

  // stewards and lookouts: their own figures, in a hi-vis vest (a lookout in black)
  const patrolFigs = level.patrols.map(p => { const f = figOf({kit: false, vest: p.role === 'steward', top: '#22262f', longSleeves: true, pants: '#22262f', hair: HAIR[2], hairStyle: 'short', skinTone: SKIN_TONES[3]}); scene.add(f); return f })
  const coneMat = keep(new THREE.MeshBasicMaterial({color: '#f3efe6', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide}))
  const cones = level.patrols.map(p => {
    const g = keep(new THREE.CircleGeometry(p.range, 24, Math.PI / 2 - p.fov / 2, p.fov)); const m = new THREE.Mesh(g, coneMat.clone()); keep(m.material as THREE.Material)
    m.rotation.x = -Math.PI / 2; scene.add(m); return m
  })

  // the supporter: his own figure, or his car
  const child = spec.age < 13
  const hero = figOf({kit: true, scarf: true, band: !child && level.verb === 'run', pack: level.verb === 'run' || level.verb === 'find', roll: level.verb === 'carry', pants: '#2f3e5e', hair: HAIR[1], skinTone: SKIN_TONES[1], child, scale: child ? 0.78 : 0.94})
  if (!heroCar) scene.add(hero)
  // the banner he takes on the ultras route: rolled cloth in neutral grey and white, never the other club's colours
  const loot = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.14, 0.14, 1.2, 14).rotateZ(Math.PI / 2)), keep(std('#c9c5bd', {roughness: 0.85})))
  loot.visible = false; scene.add(loot)
  const roll = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.16, 0.16, 1.15, 18).rotateZ(Math.PI / 2)), keep(std('#efe9de', {roughness: 0.8}))); roll.visible = false; scene.add(roll)
  // thrown things: a cup, a bottle-shaped plastic — drawn small and pale, never a weapon
  const throwsMesh = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.06, 0.05, 0.16, 8)), keep(std('#e8e3d8', {roughness: 0.5})), 12); throwsMesh.frustumCulled = false; scene.add(throwsMesh)
  const marks = new THREE.InstancedMesh(keep(new THREE.RingGeometry(0.5, 0.62, 24).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({color: '#f3efe6', transparent: true, opacity: 0.55, depthWrite: false})), 12); marks.frustumCulled = false; scene.add(marks)

  // eyes camera: his own hands, his scarf
  const hands = new THREE.Group()
  { const hm = keep(std(SKIN_TONES[1], {roughness: 0.58})), km = keep(new THREE.MeshStandardMaterial({map: kitMap, roughness: 0.82}))
    for (const s of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(s * 0.2, -0.3, -0.3); hands.add(arm)
      const sl = new THREE.Mesh(keep(new THREE.CapsuleGeometry(0.06, 0.2, 4, 10)), km); sl.rotation.x = -1.35; arm.add(sl)
      const fa = new THREE.Mesh(keep(new THREE.CapsuleGeometry(0.045, 0.2, 4, 10)), hm); fa.rotation.x = -1.35; fa.position.set(0, -0.04, -0.15); arm.add(fa)
      // a hand with fingers, half closed as a runner's is, palm in (owner, 21.10.2026: "the hands are alien")
      const h = makeHand(hm, 0.5); h.position.set(0, -0.07, -0.33); h.rotation.set(1.42, -s * Math.PI / 2, 0); if (s > 0) h.scale.x = -1; h.scale.multiplyScalar(1.05); arm.add(h)
    }
    // the scarf held between the fists sags like cloth, not a plank
    const sag = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.19, -0.36, -0.64), new THREE.Vector3(-0.08, -0.41, -0.68), new THREE.Vector3(0.08, -0.41, -0.68), new THREE.Vector3(0.19, -0.36, -0.64)])
    const sc = new THREE.Mesh(keep(new THREE.TubeGeometry(sag, 24, 0.024, 8, false)), keep(std(skin.p, {emissive: C(skin.p), emissiveIntensity: 0.2, roughness: 0.95}))); sc.scale.z = 1; hands.add(sc)
    hands.visible = false; cam.add(hands) }

  /* ───────────── post ───────────── */
  let composer: EffectComposer | null = null
  let grade: ShaderPass | null = null
  if (!lite) {
    composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, cam))
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), night ? 0.8 : 0.35, 0.55, 0.88))
    grade = new ShaderPass({
      uniforms: {tDiffuse: {value: null}, uTime: {value: 0}, uSpeed: {value: 0}, uHeart: {value: 0}, uFlash: {value: 0}, uTint: {value: C(skin.p)}, uAspect: {value: 1}},
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime,uSpeed,uFlash,uAspect,uHeart; uniform vec3 uTint; varying vec2 vUv;
        float h(float n){ return fract(sin(n)*43758.5453); }
        void main(){ vec2 p=vUv-.5; p.x*=uAspect; float r=length(p); float ca=.0016*uSpeed*r*2.; vec2 dir=normalize(vUv-.5+1e-5);
          vec3 c=vec3(texture2D(tDiffuse,vUv+dir*ca).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-dir*ca).b);
          float a=atan(p.y,p.x); float n=h(floor(a*70.)+floor(uTime*14.)); c+=smoothstep(.93,1.,n)*smoothstep(.42,1.05,r)*uSpeed*.22*vec3(.9,.95,1.);
          float beat=pow(max(0.,sin(uTime*7.5)),6.)*uHeart; c*=mix(1.,smoothstep(1.05,.25-beat*.15,r),.62+uHeart*.18); c=mix(c,c*uTint*1.5,beat*.25*smoothstep(.3,.9,r));
          c+=(h(dot(vUv,vec2(12.9898,78.233))+uTime)-.5)*.035; c+=uFlash*vec3(.85,.9,1.); gl_FragColor=vec4(c,1.); }`,
    })
    composer.addPass(grade)
    composer.addPass(new OutputPass())
  }

  /* ───────────── the frame ───────────── */
  const camPos = new THREE.Vector3(level.start.x, 2, level.start.z + 4), camLook = new THREE.Vector3(level.start.x, 1.4, level.start.z - 6)
  let t = 0, shake = 0, speedFx = 0, flash = 0, heart = 0, lastHits = 0, lastCaught = 0
  const eyeHeight = child ? 1.2 : 1.62

  function render(sim: Sim, view: View, dt: number) {
    t += dt
    const heading = sim.heading
    // people
    const J = (tmpl.userData as FigureData)
    for (let i = 0; i < people.length; i++) {
      const p = people[i]!
      if (p.mode === 'walk') { const w = walkerAt(level.walkers[p.idx]!, sim.t); p.x = w.x; p.z = w.z }
      const dx = p.x - sim.x, dz = p.z - sim.z, d2 = dx * dx + dz * dz
      if (d2 > 900 && p.mode !== 'target') { crowd.forEach(im => im.setMatrixAt(i, zero)); continue }
      if (d2 < 9 && !p.react && Math.random() < 0.5 && !sim.ended) p.react = 1.6
      p.react = Math.max(0, p.react - dt)
      const faceHero = p.mode === 'stand' || p.mode === 'rival' || p.react > 0
      const yaw = faceHero && p.mode !== 'target' ? Math.atan2(sim.x - p.x, sim.z - p.z) : p.mode === 'walk' ? Math.PI : p.face
      p.turn += (yaw - p.turn) * Math.min(dt * 4, 1)
      J.phase = i * 1.7 + t * (p.mode === 'walk' ? 1 : 0)
      const standing = p.mode !== 'walk'
      pose(tmpl, {speed: standing ? 0 : level.walkers[p.idx]!.v, scarfUp: p.mode === 'stand' ? Math.sin(t * 2 + i) > -0.2 && level.place !== 'yard' : p.react > 0.6 && p.mode !== 'rival', joy: p.mode === 'rival' ? 0 : standing || p.react > 0 ? 1 : 0.2, talk: p.react > 0, effort: p.mode === 'rival' ? 0.7 : 0}, t, 0)
      tmpl.position.set(p.x, p.mode === 'stand' ? Math.abs(Math.sin(t * 3 + i)) * 0.05 : 0, p.z); tmpl.rotation.y = p.turn
      const sc = p.look.size * kidK; tmpl.scale.set(sc, sc, sc)
      tmpl.updateMatrixWorld(true)
      tParts.forEach((m, k) => {
        const r = m.userData.role as string, L = p.look
        const hide = (r === 'kit' && (!L.kit || p.mode === 'rival')) || (r === 'top' && L.kit && p.mode !== 'rival') || (r === 'collar' && !L.kit) || (r === 'cap' && !L.cap) || (r === 'beard' && !L.beard) || ((r === 'scarf' || r === 'scarfB') && (!L.scarf || p.mode === 'rival')) || ((r === 'mouthOpen' || r === 'mouth') && !m.visible)
        crowd[k]!.setMatrixAt(i, hide ? zero : m.matrixWorld)
      })
    }
    crowd.forEach(im => { im.instanceMatrix.needsUpdate = true })

    // cars
    if (cars) {
      level.cars.forEach((c, i) => { const p = carAt(c, sim.t); placeCar(i, p.x, p.z, c.axis === 'x' ? (c.dir === 1 ? 0 : Math.PI) : Math.PI / 2, c.police, t) })
      if (heroCar) placeCar(level.cars.length, sim.x, sim.z, Math.PI / 2 + (sim.heading - Math.PI) * -1, false, t)
      for (const m of Object.values(cars)) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true }
    }


    // the quest: whoever waits, the way to the next step, what is still on the ground
    npcs.forEach(n => {
      const st = level.steps[n.step]!
      const gone = (st.leaves || st.joins) && sim.step > n.step
      n.fig.visible = !gone
      const grouped = st.group > 0 && sim.step > n.step
      n.extra.forEach(f => { f.visible = !grouped })
      if (grouped) n.fig.visible = false
      if (!n.fig.visible) return
      const live = sim.step === n.step
      n.fig.rotation.y = Math.atan2(sim.x - n.x, sim.z - n.z)
      pose(n.fig, {speed: 0, wave: live && Math.hypot(sim.x - n.x, sim.z - n.z) < 14, joy: 0.6, talk: live && Math.hypot(sim.x - n.x, sim.z - n.z) < 3, scarfUp: st.group > 0 && Math.sin(t * 2.4 + n.step) > 0}, t, dt)
      n.extra.forEach((f, k) => { if (f.visible) { f.rotation.y = Math.atan2(sim.x - f.position.x, sim.z - f.position.z); pose(f, {speed: 0, scarfUp: Math.sin(t * 2.4 + k) > -0.3, joy: 1}, t, dt) } })
    })
    const target = view.ending ? null : stepTarget(level, sim)
    const curStep = level.steps[sim.step]
    beacon.visible = halo.visible = !!target && !(level.place === 'crowd' && curStep?.kind === 'goal')
    if (target) {
      const bx = curStep?.kind === 'stop' ? curStep.x + 0.4 : target.x
      beacon.position.set(bx, 13, target.z); halo.position.set(bx, 0.04, target.z)
      const pulse = 1 + Math.sin(t * 3.2) * 0.12; halo.scale.set(pulse * (curStep?.kind === 'stop' ? 2.2 : 1), 1, pulse * (curStep?.kind === 'stop' ? 6 : 1))
      ;(beacon.material as THREE.MeshBasicMaterial).opacity = 0.32 + Math.sin(t * 2) * 0.08
    }
    const talkNpc = curStep?.kind === 'talk' ? npcs.find(n => n.step === sim.step) : null
    tag.visible = !!talkNpc && !view.ending
    if (talkNpc) { tag.position.set(talkNpc.x, (talkNpc.fig.scale.y || 1) * 2.15 + Math.sin(t * 3) * 0.08, talkNpc.z); tag.rotation.y = t * 2 }
    pickups.forEach((p, i) => {
      p.g.visible = !sim.got[i]
      if (!p.g.visible) return
      p.item.position.y = 0.55 + Math.sin(t * 2.2 + i) * 0.09; p.item.rotation.y = t * 1.6 + i
    })
    ringMeshes.forEach((r, i) => {
      const done = sim.ringDone[i]
      r.m.visible = !done
      const k = Math.min(1, (sim.ringT[i] ?? 0) / 1.6)
      r.fillM.visible = !done && k > 0; r.fillM.scale.setScalar(Math.max(0.001, k))
      ;(r.m.material as THREE.MeshBasicMaterial).opacity = 0.45 + Math.sin(t * 4 + i) * 0.25
    })
    favourFigs.forEach((f, i) => { const done = sim.favoured[i]; f.mark.visible = !done; f.mark.rotation.y = t * 2; f.mark.position.y += Math.sin(t * 3 + i) * 0.004 })
    bins.forEach((b, i) => {
      const n = sim.noise, hit = n && Math.hypot(n.x - level.noises[i]!.x, n.z - level.noises[i]!.z) < 0.1 ? sim.t - n.t : 99
      const k = hit < 1.2 ? hit / 1.2 : 1
      b.lid.position.y = 0.98 + (hit < 0.4 ? Math.sin(hit * 40) * 0.05 : 0); b.lid.rotation.z = hit < 0.6 ? Math.sin(hit * 30) * 0.2 : 0
      b.wave.scale.setScalar(1 + k * 9); ;(b.wave.material as THREE.MeshBasicMaterial).opacity = hit < 1.2 ? (1 - k) * 0.6 : 0
    })
    if (escFig) {
      const e = sim.esc
      escFig.visible = !!e && !(view.cam === 'eyes' && !view.ending && e && Math.hypot(e.x - sim.x, e.z - sim.z) < 0.6)
      if (e) {
        escFig.position.set(e.x, 0, e.z)
        if (e.speed > 0.2) escFig.rotation.y = e.heading
        else escFig.rotation.y = Math.atan2(sim.x - e.x, sim.z - e.z)
        pose(escFig, view.ending ? {speed: 0, celebrate: view.outcome !== 'slip', joy: 1} : {speed: e.speed, wave: e.lost, joy: e.lost ? 0 : 0.6, talk: e.lost, panting: level.escort?.who === 'elder' && e.speed > 2.5}, t, dt)
      }
    }
    if (marchers.length) {
      trailT += dt
      if (trailT > 0.2) { trailT = 0; trail.unshift({x: sim.x, z: sim.z, h: sim.heading}); trail.length = Math.min(trail.length, 80) }
      const joined = level.steps.reduce((a, st2, i) => a + (st2.group > 0 && sim.step > i ? st2.group : 0), 0)
      marchers.forEach((f, k) => {
        f.visible = k < joined && trail.length > 3
        if (!f.visible) return
        const row = Math.floor(k / 3), col = (k % 3) - 1
        const p = trail[Math.min(trail.length - 1, 4 + row * 4)]!
        const lx = Math.cos(p.h) * col * 1.1, lz = -Math.sin(p.h) * col * 1.1
        f.position.x += (p.x + lx - f.position.x) * Math.min(1, dt * 4); f.position.z += (p.z + lz - f.position.z) * Math.min(1, dt * 4)
        f.rotation.y = p.h
        pose(f, {speed: Math.min(sim.speed, 6), scarfUp: Math.sin(t * 2 + k) > 0.2, joy: 1}, t, dt)
      })
    }

    // stewards and the ground they can see
    level.patrols.forEach((p, i) => {
      const at = patrolLook(level, sim, i), f = patrolFigs[i]!
      f.position.set(at.x, 0, at.z); f.rotation.y = at.face
      pose(f, {speed: p.v, talk: sim.seenBy === i && sim.seen > 0.4}, t, dt)
      const cone = cones[i]!; cone.position.set(at.x, 0.02, at.z)
      cone.rotation.set(-Math.PI / 2, 0, at.face + Math.PI)
      ;(cone.material as THREE.MeshBasicMaterial).opacity = sim.seenBy === i ? 0.12 + sim.seen * 0.3 : 0.1
    })

    // the supporter
    const sp = sim.speed
    const tired = sim.stamina < 0.25
    if (!heroCar) {
      hero.position.set(sim.x, 0, sim.z); hero.rotation.y = heading
      const carrying = (level.verb === 'carry' && sim.holding) || (level.home !== null && sim.back)
      if (view.ending) { hero.rotation.y += (0 - hero.rotation.y) * 0.1; pose(hero, view.outcome === 'slip' ? {speed: 0, knees: true, panting: true, effort: 0.6} : {speed: 0, celebrate: true, joy: 1}, t, dt) }
      else if (view.intro > 0) pose(hero, {speed: 0, joy: 0.4, ticket: level.verb === 'run'}, t, dt)
      else pose(hero, {speed: sim.stagger > 0 ? 1 : sp, effort: sim.sprinting ? 0.9 : tired ? 0.7 : Math.min(sp / 9, 0.5), panting: tired, stumble: sim.stagger > 0.5, lean: sim.sprinting ? 0.1 : 0, carry: carrying, crouch: level.place === 'yard' && !sim.sprinting ? 0.55 : 0}, t, dt)
      const hd = hero.userData as FigureData
      if (hd.J.roll) hd.J.roll.visible = level.verb === 'carry' && sim.holding
      hero.visible = view.cam === 'chase' || view.ending
      loot.visible = !!level.home && sim.back
      if (loot.visible) { loot.position.set(sim.x + Math.sin(heading) * 0.35, 1.3, sim.z + Math.cos(heading) * 0.35); loot.rotation.y = heading }
    }
    roll.visible = level.verb === 'carry' && !sim.holding && !!sim.dropped
    if (roll.visible && sim.dropped) roll.position.set(sim.dropped.x, 0.16, sim.dropped.z)
    hands.visible = view.cam === 'eyes' && !view.ending && !heroCar

    // throws: the arc and where it will land
    for (let i = 0; i < 12; i++) {
      const th = sim.throws[i]
      if (!th) { throwsMesh.setMatrixAt(i, zero); marks.setMatrixAt(i, zero); continue }
      const k = Math.min(1, (sim.t - th.t0) / (th.t1 - th.t0))
      m4.makeRotationX(t * 9).setPosition(th.x0 + (th.x - th.x0) * k, 1.6 + Math.sin(k * Math.PI) * 4, th.z0 + (th.z - th.z0) * k); throwsMesh.setMatrixAt(i, m4)
      m4.makeScale(1 - k * 0.4, 1, 1 - k * 0.4).setPosition(th.x, 0.03, th.z); marks.setMatrixAt(i, m4)
    }
    throwsMesh.instanceMatrix.needsUpdate = true; marks.instanceMatrix.needsUpdate = true

    // lights follow him
    key.position.set(sim.x - 12, 30, sim.z - 40); key.target.position.set(sim.x, 0, sim.z)
    if (!night) key.position.set(sim.x + 20, 40, sim.z + 10)
    rim.position.set(sim.x + 1.4, 2.2, sim.z - 1.2); fill.position.set(sim.x - 1.2, 1.8, sim.z + 1.6)
    if (lampLights.length) { const near = lampZ.filter(z => z < sim.z + 30).slice(0, lampLights.length / 2 + 1); lampLights.forEach((l, k) => { const z = near[Math.floor(k / 2)] ?? -9999; l.position.set((k % 2 ? 1 : -1) * (level.half - 0.2), 6, z) }) }
    towers.forEach((h, i) => h.scale.setScalar(70 + Math.sin(t * 0.7 + i) * 3))
    if (rain) { const a = rain.geometry.attributes.position as THREE.BufferAttribute; for (let i = 0; i < a.count; i++) { let y = a.getY(i) - dt * (spec.weather === 'cold' ? 2 : 14); if (y < 0) y += 20; a.setY(i, y) } a.needsUpdate = true; rain.position.set(sim.x, 0, sim.z) }

    // camera
    if (sim.hits > lastHits) { shake = reduced ? 0 : 0.5; flash = 0.3; lastHits = sim.hits }
    if (sim.caught > lastCaught) { flash = 0.5; lastCaught = sim.caught }
    shake = Math.max(0, shake - dt * 1.5)
    const jx = (Math.random() - 0.5) * shake * shake, jy = (Math.random() - 0.5) * shake * shake
    const breath = reduced ? 0 : Math.sin(t * (tired ? 7 : 2.2)) * (tired ? 0.03 : 0.008)
    if (view.ending && !heroCar) {
      const k = Math.min(view.endT / 1.2, 1), e = k * k * (3 - 2 * k)
      camPos.lerp(tmp.set(sim.x + 0.6, child ? 1.2 : 1.55, sim.z - 2.4), Math.min(1, dt * (2 + e * 4)))
      cam.position.copy(camPos)
      camLook.lerp(new THREE.Vector3(sim.x, view.outcome === 'slip' ? 1.0 : 1.4, sim.z), Math.min(1, dt * 5)); cam.lookAt(camLook)
      cam.fov += (42 - cam.fov) * Math.min(1, dt * 3)
    } else if (heroCar) {
      const target = tmp.set(sim.x * 0.6 + jx, 3.4 + jy, sim.z + 8.5)
      camPos.lerp(target, Math.min(dt * 5, 1)); cam.position.copy(camPos)
      camLook.lerp(new THREE.Vector3(sim.x * 0.8, 1.2, sim.z - 14), Math.min(dt * 6, 1)); cam.lookAt(camLook)
      const fov = 58 + Math.min(sim.speed, 30) * 0.5; cam.fov += (fov - cam.fov) * Math.min(dt * 3, 1)
    } else if (view.cam === 'chase') {
      const back = 3.1 + sp * 0.1, high = (child ? 1.55 : 1.85) + sp * 0.02, side = 0.75
      const fx = Math.sin(heading), fz = Math.cos(heading)
      // over the right shoulder, behind the way he faces
      // his right hand is (−fz, fx)
      const target = tmp.set(sim.x - fx * back - fz * side + jx, high + jy + breath, sim.z - fz * back + fx * side)
      camPos.lerp(target, Math.min(dt * 5, 1)); cam.position.copy(camPos)
      camLook.lerp(new THREE.Vector3(sim.x + fx * 7 - fz * side * 0.4, 1.45, sim.z + fz * 7 + fx * side * 0.4), Math.min(dt * 6, 1)); cam.lookAt(camLook)
      const fov = (view.intro > 0 ? 48 : 54) + Math.min(sp, 10) * 1.2; cam.fov += (fov - cam.fov) * Math.min(dt * 4, 1)
    } else {
      const hb = reduced ? 0 : Math.sin(t * (6 + sp * 1.2)) * 0.055 * Math.min(sp / 6, 1.4)
      cam.position.set(sim.x + jx, eyeHeight + hb + jy + breath - (level.place === 'yard' && !sim.sprinting ? 0.35 : 0), sim.z)
      cam.rotation.order = 'YXZ'; cam.rotation.set(-0.04 + hb * 0.2, heading + Math.PI, 0)
      hands.children.forEach((a, i) => { if ((a as THREE.Group).isGroup) a.position.y = -0.3 + Math.sin(t * (6 + sp * 1.2) + (i ? Math.PI : 0)) * 0.03 * Math.min(sp / 4, 1.5) })
      const fov = 76 + Math.min(sp, 10) * 1.1; cam.fov += (fov - cam.fov) * Math.min(dt * 4, 1)
    }
    cam.updateProjectionMatrix()
    speedFx += (((sim.sprinting || (heroCar && sim.speed > 20)) ? 1 : sp > 4 ? 0.35 : 0) * (reduced ? 0 : 1) - speedFx) * Math.min(dt * 4, 1)
    heart += ((tired && !view.ending ? 1 : 0) - heart) * Math.min(dt * 3, 1)
    flash = Math.max(0, flash - dt * 2.4)
    if (grade && composer) {
      grade.uniforms.uSpeed!.value = view.ending ? 0 : speedFx; grade.uniforms.uHeart!.value = reduced ? 0 : heart; grade.uniforms.uFlash!.value = flash * 0.5; grade.uniforms.uTime!.value = t
      composer.render()
    } else renderer.render(scene, cam)
  }

  function resize(w: number, h: number) {
    renderer.setSize(w, h, false)
    composer?.setSize(w, h)
    cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix()
    if (grade) grade.uniforms.uAspect!.value = w / Math.max(1, h)
  }

  const pv = new THREE.Vector3()
  function project(x: number, y: number, z: number) {
    pv.set(x, y, z).project(cam)
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight
    return {x: (pv.x * 0.5 + 0.5) * w, y: (-pv.y * 0.5 + 0.5) * h, visible: pv.z < 1}
  }

  function dispose() {
    scene.traverse(o2 => { const m = o2 as THREE.Mesh; if (m.isMesh) { m.geometry?.dispose?.() } })
    disposables.forEach(d => { try { d.dispose() } catch { /* already gone */ } })
    crowd.forEach(im => im.dispose())
    composer?.dispose()
    renderer.dispose()
    try { renderer.forceContextLoss() } catch { /* a lost context is a closed one */ }
  }

  return {render, resize, project, dispose}
}
