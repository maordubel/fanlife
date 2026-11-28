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
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type {VoxelSkin} from '@/lib/life/universal/skin'
import {carAt, walkerAt, type Level, type Look, type PickupKind} from '@/lib/life/rush/level'
import {patrolLook, stepTarget, type Sim} from '@/lib/life/rush/sim'
import type {MissionSpec} from '@/lib/life/rush/spec'
import {bannedColour} from './colour'
import {dressCity} from './city'
import {dressHood, type HoodDress, type TalkDir} from './hood'
import {dressLife, type LifeDress} from './life'
import type {AmbState} from '@/lib/life/hood/ambient'
import {dressFlat} from './flat'
import {dressSurface, loadSurface, type SurfaceName} from './surfaces'
import {loadProps, propCopy} from './props'
import {dressDusk, DUSK, type Block, type Dusk} from './look/dusk'
import {createDaylight, type Daylight} from './look/daylight'
import {createDetail, type Detail} from './look/detail'
import {lookIndex, type LookRow} from './human/kit'
import {lookFor, ROLE_OF} from '@/lib/life/hood/looks'
import {decadeOf as decadeOfYear} from './era'
import {dressCrowd} from './look/crowd'
import {dressFlow, type FlowDress} from './look/flowStreet'
import {castFor, createTroupe, humanPoint, isSkinned, type Troupe} from './human/human'
import {heroBody} from './human/age'
export {heroBody}
import {charNow, type CastId} from './human/kit'
import {disposeFigure, HAIR, kitTexture, makeFigure, lookAt, makeHand, PANTS, pose, seedFigure, turnTo, SKIN_TONES, TOPS, type Cloth, type FigureData, type Gesture, type Mood} from './figure'

export type Quality = 'high' | 'lite'
export type View = {cam: 'chase' | 'eyes'; ending: boolean; endT: number; outcome: 'good' | 'ok' | 'slip' | null; intro: number; /** the briefing: the place seen from a slow crane before the run */ brief?: boolean; /** the hood: how the job stands (the marker over whoever gives or takes it) */ hood?: {job: 'idle' | 'active' | 'done';
  /** a conversation the player started: who speaks, the line's feeling (`talk.ts` → `feelOf`), and whether the words are still being typed */
  talk?: {who: string; key: string; mood?: Mood; gesture?: Gesture | null; you?: Mood; shot?: 'two' | 'close'; beat?: 'scarf' | null; speak: number} | null
  /** the scarf is round his neck (the job is done and he wears it) */ scarf?: boolean
  /** the street's small lives, stepped by the host (it knows the player's presses) */ amb?: AmbState | null}}
export type Stage = {
  render(sim: Sim, view: View, dt: number): void
  resize(w: number, h: number): void
  /** a world point on the glass, for the speech bubbles (DOM, never canvas text) */
  project(x: number, y: number, z: number): {x: number; y: number; visible: boolean}
  /** where a street voice's caption goes (`ambient.ts` spot id), on the glass */
  captionAt(spot: string): {x: number; y: number; visible: boolean} | null
  /** the story's age now: the player's body follows it (a boy to twelve, a teenager to eighteen, then a man) */
  setAge(age: number): void
  /** the hood's clock, in minutes of the day: the light, the lamps and the windows follow it (look/daylight.ts) */
  setClock(minutes: number): void
  /** what the last second of frames cost, and what the governor made of it (the QA stand and the settings screen read it) */
  stats(): StageStats
  /** the QA stand only: what is in the street, heaviest first (triangles after instancing) */
  profile(byCalls?: boolean): {name: string; tris: number; n: number; skinned: boolean}[]
  dispose(): void
}
export type StageStats = {calls: number; triangles: number; ms: number; fps: number; scale: number; mirror: number; textures: number; geometries: number}

const C = (hex: THREE.ColorRepresentation) => new THREE.Color(hex)
const std = (color: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({color, roughness: 0.78, metalness: 0, ...o})

/* ───────────── colour policy ───────────── */

export {bannedColour}
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

/** the missions played at another club's ground: no sign of ours goes up there (rule 135) */
const AWAY_GROUNDS: readonly string[] = ['away-pen', 'europe-night']

export function createStage(o: {canvas: HTMLCanvasElement; level: Level; spec: MissionSpec; skin: VoxelSkin; quality: Quality; reduced: boolean; gateLabel: string; /** the hood's people: skinned humans when the kit is loaded (the default), or the code-built figures */ people?: 'human' | 'classic'}): Stage {
  const {canvas, level, spec, skin, quality, reduced} = o
  const lite = quality === 'lite'
  const renderer = new THREE.WebGLRenderer({canvas, antialias: !lite, powerPreference: 'high-performance'})
  // the sharpest the picture is ever drawn; the governor below draws it softer when frames run long (and back again)
  const dprMax = Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.75)
  renderer.setPixelRatio(dprMax)
  renderer.info.autoReset = false
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  // a home mission keeps its own hour (a grounded boy goes out at night whatever the day's clock says)
  // the hood at dusk: lit like night (lamps, windows) under a graded sky and haze (look/dusk.ts)
  const dusk = !!level.hood && spec.time === 'dusk'
  const night = dusk || (level.house ? level.house.night : spec.time === 'night')
  renderer.toneMappingExposure = dusk ? DUSK.exposure : night ? 1.0 : 0.92
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = !lite
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  const rnd = seeded(spec.seed ^ 0x51ed)
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]!
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
  // a deeper sky and a warm haze band at the horizon: the air has depth (GTA's afternoons are smog-gold, its nights ink)
  const skyTop = night ? '#02040a' : '#2f63a6', skyMid = night ? '#0f1730' : '#9fbbd4', glowC = night ? '#3a1f2e' : '#f0cfa0'
  scene.fog = new THREE.FogExp2(dusk ? DUSK.fog : night ? '#0a0d19' : '#b5c3cc', dusk ? DUSK.fogDensity : level.place === 'road' ? 0.0035 : level.place === 'flat' ? 0.004 : 0.0075)
  const skyMat = keep(new THREE.ShaderMaterial({side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {uTop: {value: C(skyTop)}, uMid: {value: C(skyMid)}, uGlow: {value: C(glowC)}},
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 uTop,uMid,uGlow; varying vec3 vP; void main(){ float h=vP.y; vec3 c=mix(uMid,uTop,smoothstep(0.,.55,h)); c=mix(c,uGlow,smoothstep(.25,0.,abs(h-.02))*smoothstep(.2,-.9,vP.z)); gl_FragColor=vec4(c,1.); }'}))
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(1400, 32, 16)), skyMat); sky.visible = !dusk; scene.add(sky)
  if (night && !dusk) {
    const st = new Float32Array(900 * 3)
    for (let i = 0; i < 900; i++) { const a = rnd() * Math.PI * 2, e = 0.08 + rnd() * 1.3, r = 1300; st[i * 3] = Math.cos(a) * Math.cos(e) * r; st[i * 3 + 1] = Math.sin(e) * r; st[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r }
    const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(st, 3))
    scene.add(new THREE.Points(g, keep(new THREE.PointsMaterial({color: '#cfd8ff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8}))))
  }
  // less fill, more key: shadows that go somewhere, a sun with a colour, a sky that is blue from above and warm from the ground
  const hemi = dusk ? new THREE.HemisphereLight('#86a2d8', '#4a3a3e', 0.62) : new THREE.HemisphereLight(night ? '#5a6ea8' : '#cfe0f5', night ? '#14100f' : '#5a4a3a', night ? 0.34 : 0.62)
  scene.add(hemi)
  const key = new THREE.DirectionalLight(dusk ? '#ffbe94' : night ? '#dce8ff' : '#ffdcb0', dusk ? 1.6 : night ? 0.8 : 2.9)
  key.castShadow = !lite; key.shadow.mapSize.set(1536, 1536)
  Object.assign(key.shadow.camera, {left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 140})
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.025; key.shadow.radius = 3
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
  const wet = spec.weather === 'rain' || dusk
  // the ground's materials, by surface: the loom tiles replace the canvas ones when they arrive (surfaces.ts)
  const grounds: Record<SurfaceName, THREE.MeshStandardMaterial[]> = {asphalt: [], slabs: [], concrete: [], boards: [], tiles: [], carpet: []}
  // by day the road dries: look/daylight.ts takes the shine off it and lifts its colour
  const ground = (name: SurfaceName, m: THREE.MeshStandardMaterial) => { grounds[name].push(m); if (dusk && level.hood) m.userData.dayGround = true; return m }
  const asphalt = noiseTex('#202227', 26, [3, 80], true)
  const tile = keep(canvasTex(256, 256, (g, w) => { g.fillStyle = '#6b6a6e'; g.fillRect(0, 0, w, w); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const v = 95 + rnd() * 25; g.fillStyle = `rgb(${v},${v - 2},${v - 4})`; g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60) } }, [2, 40]))
  const plaster = ['#e9e3d6', '#ddd5c5', '#efe7d7', '#cfc8bb', '#e4d8c3', '#d8cfbf']
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3(), closeAt = new THREE.Vector3()
  let closeK = 0
  const lampLights: THREE.PointLight[] = []
  const lampZ: number[] = []
  const zStart = level.bounds.z1 + 30, zEnd = level.goal.z - 60, span = zStart - zEnd, zMid = (zStart + zEnd) / 2

  const addRoad = (half: number, walk: number) => {
    const road = new THREE.Mesh(keep(new THREE.PlaneGeometry(half * 2, span)), keep(ground('asphalt', new THREE.MeshStandardMaterial({map: asphalt, roughness: wet ? 0.16 : 0.38, metalness: wet ? 0.5 : 0.2}))))
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0, zMid); road.receiveShadow = true; scene.add(road)
    for (const side of [-1, 1]) {
      const pave = new THREE.Mesh(box, keep(ground('slabs', new THREE.MeshStandardMaterial({map: tile, roughness: wet ? 0.3 : 0.8}))))
      pave.scale.set(walk - half, 0.16, span); pave.position.set(side * (half + (walk - half) / 2), 0.08, zMid); pave.receiveShadow = true; scene.add(pave)
      const kerb = new THREE.Mesh(box, keep(std('#9a958c'))); kerb.scale.set(0.22, 0.18, span); kerb.position.set(side * half, 0.09, zMid); scene.add(kerb)
    }
    const n = Math.floor(span / 5)
    const dashes = new THREE.InstancedMesh(box, keep(std('#cfc9bc', {roughness: 0.55})), n * (level.place === 'road' ? 2 : 1))
    let i = 0
    for (let k = 0; k < n; k++) for (const x of level.place === 'road' ? [-2.1, 2.1] : [0]) { m4.makeScale(0.16, 0.01, 2.2).setPosition(x, 0.006, zStart - k * 5); dashes.setMatrixAt(i++, m4) }
    scene.add(dashes)
    // a street is lived on: scraps of paper and cups on the pavement, a drain cover, bollards by the kerb
    const nl = Math.floor(span / 2.2)
    const litter = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(0.22, 0.3).rotateX(-Math.PI / 2)), keep(std('#e9e4d8', {roughness: 0.9, side: THREE.DoubleSide})), nl)
    for (let k = 0; k < nl; k++) { const side = rnd() < 0.5 ? -1 : 1; const x = side * (half + 0.4 + rnd() * (walk - half - 0.8)); q.setFromAxisAngle(up, rnd() * 6.28); m4.compose(tmp.set(x, 0.17, zStart - rnd() * span), q, tmp2.set(0.6 + rnd(), 1, 0.6 + rnd())); litter.setMatrixAt(k, m4); litter.setColorAt(k, C(rnd() < 0.3 ? '#cfc4a8' : rnd() < 0.5 ? '#e9e4d8' : '#b9b4a8')) }
    litter.receiveShadow = true; scene.add(litter)
    const nb = Math.floor(span / 11)
    const bollards = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.07, 0.09, 0.9, 10)), keep(std('#2d3038', {metalness: 0.4, roughness: 0.5})), nb * 2)
    for (let k = 0; k < nb; k++) for (const [j, side] of [-1, 1].entries()) { m4.makeTranslation(side * (half + 0.45), 0.6, zStart - 6 - k * 11 + (j ? 5.5 : 0)); bollards.setMatrixAt(k * 2 + j, m4) }
    bollards.castShadow = !lite; scene.add(bollards)
    const drains = new THREE.InstancedMesh(box, keep(std('#3a3c42', {metalness: 0.6, roughness: 0.5})), Math.floor(span / 14))
    for (let k = 0; k < drains.count; k++) { m4.makeScale(0.5, 0.012, 0.3).setPosition((k % 2 ? 1 : -1) * (half - 0.35), 0.006, zStart - 7 - k * 14); drains.setMatrixAt(k, m4) }
    scene.add(drains)
    // the rain leaves the road in mirrors: puddles along the kerb and in the camber
    if (wet && !dusk) {
      const np = Math.floor(span / 7)
      const puddles = new THREE.InstancedMesh(keep(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2)), keep(new THREE.MeshStandardMaterial({color: '#1a1d24', roughness: 0.04, metalness: 0.9, transparent: true, opacity: 0.85})), np)
      for (let k = 0; k < np; k++) { q.setFromAxisAngle(up, rnd() * 3); m4.compose(tmp.set((rnd() - 0.5) * half * 1.6, 0.012, zStart - rnd() * span), q, tmp2.set(0.6 + rnd() * 1.6, 1, 0.4 + rnd() * 0.8)); puddles.setMatrixAt(k, m4) }
      scene.add(puddles)
    }
  }

  const duskBlocks: Block[] = [], duskFacades: THREE.MeshStandardMaterial[] = [], mainFronts: THREE.Object3D[] = []
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
    if (dusk) duskBlocks.push(...blocks)
    const facade = noiseTex('#ffffff', 22, [1, 1])
    const b = new THREE.InstancedMesh(box, keep(new THREE.MeshStandardMaterial({map: facade, roughness: 0.95})), blocks.length)
    blocks.forEach((x, i) => { m4.makeScale(10, x.h, x.w).setPosition(x.x, x.h / 2, x.z); b.setMatrixAt(i, m4); b.setColorAt(i, C(x.c)) }); b.receiveShadow = true; scene.add(b)
    if (dusk) duskFacades.push(b.material as THREE.MeshStandardMaterial)
    const plinth = new THREE.InstancedMesh(box, keep(std('#ffffff')), blocks.length)
    blocks.forEach((x, i) => { m4.makeScale(10.3, 3, x.w).setPosition(x.x, 1.5, x.z); plinth.setMatrixAt(i, m4); plinth.setColorAt(i, C(x.c).multiplyScalar(0.55)) }); scene.add(plinth)
    const winGeo = keep(new THREE.PlaneGeometry(1.2, 1.6))
    const warm = new THREE.InstancedMesh(winGeo, keep(new THREE.MeshBasicMaterial({color: C('#ffb27a').multiplyScalar(night ? 1.6 : 0.9), toneMapped: false})), wins.length)
    const cool = new THREE.InstancedMesh(winGeo, keep(new THREE.MeshBasicMaterial({color: C('#9ec2ff').multiplyScalar(night ? 1.3 : 0.8), toneMapped: false})), wins.length)
    const dark = new THREE.InstancedMesh(winGeo, keep(std(night ? '#2a2f3c' : '#5d6b7d', {roughness: 0.2, metalness: 0.5})), wins.length)
    let nw = 0, nc = 0, nd = 0
    for (const w of wins) { q.setFromAxisAngle(up, -w.side * Math.PI / 2); m4.compose(tmp.set(w.x, w.y, w.z), q, one); if (!w.lit) dark.setMatrixAt(nd++, m4); else if (w.warm) warm.setMatrixAt(nw++, m4); else cool.setMatrixAt(nc++, m4) }
    warm.count = nw; cool.count = nc; dark.count = nd; scene.add(warm, cool, dark)
    if (dusk) mainFronts.push(b, plinth, warm, cool, dark)
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
    if (!dusk && !bannedColour('#2f4a33', skin)) {
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
    if (dusk) { for (let k = 0; k < (lite ? 3 : 5); k++) { const pl = new THREE.PointLight('#ffa862', 40, 20, 1.6); scene.add(pl); lampLights.push(pl) } return }
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
  let gateLight: THREE.PointLight | null = null
  let bowl: THREE.Object3D | null = null
  const addGround = (z: number, wallZ: number) => {
    const stad = new THREE.Group(); stad.position.set(0, 0, z)
    // a city with its landmark painted at the end of the road keeps only the gate: the bowl and its floodlights
    // would stand exactly where the Acropolis, the towers or the bridge are
    if (!skyline) scene.add(stad)
    const shell = new THREE.Mesh(keep(new THREE.CylinderGeometry(78, 84, 26, 48, 1, true)), keep(std('#2b2f3a', {side: THREE.DoubleSide}))); shell.position.y = 13; stad.add(shell)
    const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(80, 1.2, 6, 64)), keep(new THREE.MeshBasicMaterial({color: C(skin.p).multiplyScalar(1.6), toneMapped: false}))); ring.rotation.x = Math.PI / 2; ring.position.y = 26.5; stad.add(ring)
    // the bowl alone (shell and ring), so a ground's picture can take its place (look/flowStreet.ts)
    bowl = new THREE.Group(); stad.add(bowl); bowl.add(shell, ring)
    const glow = new THREE.Mesh(keep(new THREE.PlaneGeometry(420, 200)), keep(new THREE.MeshBasicMaterial({map: glowTex, color: C(night ? '#cfe0ff' : '#ffffff').multiplyScalar((night ? 0.9 : 0.25) * (skyline ? 0.3 : 1)), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false}))); glow.position.set(0, 50, -40); stad.add(glow)
    for (const [x, zz] of (dusk ? [] : [[-70, 40], [70, 40], [-70, -40], [70, -40]]) as readonly (readonly [number, number])[]) {
      const tw = new THREE.Mesh(box, keep(new THREE.MeshStandardMaterial({color: '#30343e', fog: false}))); tw.scale.set(2.2, 82, 2.2); tw.position.set(x, 41, zz); stad.add(tw)
      const lamp = new THREE.Mesh(box, keep(new THREE.MeshBasicMaterial({color: C('#eaf2ff').multiplyScalar(night ? 7 : 1.5), toneMapped: false, fog: false}))); lamp.scale.set(12, 6, 1.2); lamp.position.set(x, 84, zz); lamp.lookAt(0, 0, 0); stad.add(lamp)
      if (night) { const halo = new THREE.Sprite(keep(new THREE.SpriteMaterial({map: glowTex, color: C('#dfe9ff').multiplyScalar(1.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false}))); halo.scale.set(70, 70, 1); halo.position.set(x, 84, zz); stad.add(halo); towers.push(halo) }
    }
    const wall = new THREE.Mesh(box, keep(std('#3c3f48'))); wall.scale.set(46, 10, 2); wall.position.set(0, 5, wallZ); wall.receiveShadow = true; scene.add(wall)
    const frame = new THREE.Mesh(box, keep(std(skin.t))); frame.scale.set(8.6, 7, 2.4); frame.position.set(0, 3.5, wallZ + 0.1); scene.add(frame)
    const hole = new THREE.Mesh(keep(new THREE.PlaneGeometry(6, 5.4)), keep(new THREE.MeshBasicMaterial({color: C('#f4f7ff').multiplyScalar(2.2), toneMapped: false}))); hole.position.set(0, 2.7, wallZ + 1.35); scene.add(hole)
    // somebody else's ground (the away end, a night abroad) carries neither our gate nor our ground's name
    const theirs = AWAY_GROUNDS.includes(spec.template)
    if (!theirs) { const sign = new THREE.Mesh(keep(new THREE.PlaneGeometry(8, 2)), keep(new THREE.MeshBasicMaterial({map: signTex(o.gateLabel, skin.p, '#ffffff'), toneMapped: false}))); sign.position.set(0, 8.2, wallZ + 1.3); scene.add(sign) }
    const ground = theirs ? null : skin.stadium ?? skin.strings.ground
    if (ground) { const gs = new THREE.Mesh(keep(new THREE.PlaneGeometry(26, 3.2)), keep(new THREE.MeshBasicMaterial({map: signTex(ground, '#0d1018', '#f3efe6', 1024, 128), toneMapped: false}))); gs.position.set(0, 12.2, wallZ - 1.2); scene.add(gs) }
    const gl = new THREE.PointLight('#e8f0ff', night ? 140 : 30, 30, 1.6); gl.position.set(0, 5, wallZ + 8); scene.add(gl); gateLight = gl
  }


  /** every crossing is a street you may walk down: pavements, shop fronts, windows, a barrier where the walk ends */
  const addSideStreets = () => {
    const w = level.walk, far = 120
    const tileM = keep(ground('slabs', new THREE.MeshStandardMaterial({map: tile, roughness: wet ? 0.3 : 0.8})))
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
      const cr = new THREE.Mesh(keep(new THREE.PlaneGeometry(240, 8.2)), keep(ground('asphalt', new THREE.MeshStandardMaterial({map: asphalt, roughness: wet ? 0.16 : 0.4, metalness: wet ? 0.5 : 0.2})))); cr.rotation.x = -Math.PI / 2; cr.position.set(0, 0.004, z); cr.receiveShadow = true; scene.add(cr); crossLanes.push(cr)
      const zeb = new THREE.InstancedMesh(box, keep(std('#d9d4c8', {roughness: 0.55})), 9)
      for (let i = 0; i < 9; i++) { m4.makeScale(0.9, 0.01, 3).setPosition(-6 + i * 1.5, 0.01, z + 7); zeb.setMatrixAt(i, m4) } scene.add(zeb)
    }
    addBuildings(level.walk, level.bounds.z1 + 16, level.goal.z + 40, level.crossings)
    if (level.side) addSideStreets()
    addLamps(level.half, level.bounds.z1 + 4, level.goal.z + 20, 18)
    if (!dusk) addPennants(level.walk, -20, level.goal.z + 30)
    // a city with a landmark at the end of the road shows the gate and not the bowl, so the landmark reads behind it
    skyline = dressCity({scene, keep, level, skin, clubId: spec.skin, seed: spec.seed, night, lite, banned: h => bannedColour(h, skin), glowTex, fronts: dusk ? mainFronts : undefined, dusk: !!dusk})
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
    const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(level.half * 2 + 20, 120)), keep(ground('concrete', new THREE.MeshStandardMaterial({map: noiseTex('#55575c', 18, [6, 18]), roughness: wet ? 0.2 : 0.85})))); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -25); floor.receiveShadow = true; scene.add(floor)
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
  } else if (level.place === 'flat') {
    // the flat is dressed once the people are known (below): it seats Dad and sends Mum and the cat on their rounds
  } else {
    // the crowd: a terrace in rising bands, crush barriers, the floodlights
    const pitchC = bannedColour('#2f5a2c', skin) ? '#2a2d36' : '#2f5a2c'
    const isPitch = spec.template === 'title-night', school = level.kids
    const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(level.half * 2 + 30, 90)), keep(isPitch ? std(pitchC, {roughness: 0.95}) : ground('concrete', new THREE.MeshStandardMaterial({map: noiseTex(school ? '#585a60' : '#6f6c66', school ? 20 : 14, [4, 12], school), roughness: wet ? 0.2 : 0.9}))))
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
      // the terrace: step nosings worn pale, with the dark line of each riser's shadow; crush barriers with their legs
      const bands = new THREE.InstancedMesh(box, keep(std('#a9a49a', {roughness: 0.7})), 24)
      for (let i = 0; i < 24; i++) { m4.makeScale(level.half * 2 + 30, 0.04, 0.14).setPosition(0, 0.02, 6 - i * 2.1); bands.setMatrixAt(i, m4) } scene.add(bands)
      const risers = new THREE.InstancedMesh(box, keep(std('#4a4842', {roughness: 0.95})), 24)
      for (let i = 0; i < 24; i++) { m4.makeScale(level.half * 2 + 30, 0.01, 0.35).setPosition(0, 0.012, 6 - i * 2.1 - 0.25); risers.setMatrixAt(i, m4) } scene.add(risers)
      const bars = new THREE.InstancedMesh(box, keep(std('#b8b3aa', {metalness: 0.5, roughness: 0.4})), 40)
      const legs = new THREE.InstancedMesh(box, keep(std('#9a958c', {metalness: 0.5, roughness: 0.45})), 80)
      let bi = 0
      for (let r = 0; r < 5; r++) for (let k = 0; k < 8; k++) { if (bi >= 40) break; const bx = -14 + k * 4 + (r % 2) * 2, bz = -2 - r * 8; m4.makeScale(3, 0.08, 0.08).setPosition(bx, 1.05, bz); bars.setMatrixAt(bi, m4); for (const [j, sx] of [-1.4, 1.4].entries()) { m4.makeScale(0.07, 1.05, 0.07).setPosition(bx + sx, 0.52, bz); legs.setMatrixAt(bi * 2 + j, m4) } bi++ }
      bars.count = bi; legs.count = bi * 2; bars.castShadow = legs.castShadow = !lite; scene.add(bars, legs)
      // the perimeter: a low wall, the hoardings in the club's two colours (plain cloth, no words of ours), the rail
      const wallZ = level.bounds.z1 + 1.6
      const pw = new THREE.Mesh(box, keep(std('#8f8a80', {roughness: 0.85}))); pw.scale.set(level.half * 2 + 30, 1.1, 0.3); pw.position.set(0, 0.55, wallZ); pw.receiveShadow = true; scene.add(pw)
      const nh = Math.floor((level.half * 2 + 30) / 4)
      const hoard = new THREE.InstancedMesh(box, keep(std('#ffffff', {roughness: 0.5})), nh)
      for (let k = 0; k < nh; k++) { m4.makeScale(3.9, 0.9, 0.08).setPosition(-level.half - 15 + 2 + k * 4, 1.55, wallZ + 0.1); hoard.setMatrixAt(k, m4); hoard.setColorAt(k, C(k % 3 === 0 ? skin.s : k % 3 === 1 ? skin.p : '#f3efe6')) }
      scene.add(hoard)
      const rail = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.03, 0.03, level.half * 2 + 30, 8).rotateZ(Math.PI / 2)), keep(std('#c9c4b8', {metalness: 0.7, roughness: 0.3}))); rail.position.set(0, 2.05, wallZ + 0.1); scene.add(rail)
    }
    const tg = level.targets[0]
    if (tg?.kind === 'spot') {
      const bar = new THREE.Mesh(box, keep(std('#d0cbc0', {metalness: 0.6, roughness: 0.35}))); bar.scale.set(3, 0.1, 0.1); bar.position.set(tg.x, 1.05, tg.z - 0.6); scene.add(bar)
      for (const sx of [-1.4, 1.4]) { const leg = new THREE.Mesh(box, keep(std('#d0cbc0'))); leg.scale.set(0.08, 1.05, 0.08); leg.position.set(tg.x + sx, 0.52, tg.z - 0.6); scene.add(leg) }
      const beam = new THREE.Mesh(keep(new THREE.ConeGeometry(2.2, 14, 24, 1, true)), keep(new THREE.MeshBasicMaterial({color: C('#e6efff').multiplyScalar(0.35), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide}))); beam.position.set(tg.x, 7, tg.z); scene.add(beam)
    }
    if (!school) addGround(level.bounds.z0 - 100, level.bounds.z0 - 12)
  }

  const eyeDir = new THREE.Vector3()
  let detail: Detail | null = null
  let duskDress: Dusk | null = null
  if (dusk && level.place === 'street') { try { duskDress = dressDusk({scene, renderer, level, skin, lite, skyline, keep, rnd, glowTex, allowed: l => allowed(l, skin), banned: h => bannedColour(h, skin), sign: (a, b, c, w, h) => signTex(a, b, c, w, h), blocks: duskBlocks, facadeMats: duskFacades, clubId: spec.skin, onMirror: on => detail?.mirror(on)}) } catch { duskDress = null } }
  // the town's own pictures (rule life-flow-art): facades, the ground's plate, the skyline band; lazy and failing soft
  let flowDress: FlowDress | null = null
  if (duskDress && level.hood) { const dd = duskDress; try { flowDress = dressFlow({scene, renderer, level, clubId: spec.skin, skinTown: skin.town, lite, keep, rnd: seeded(spec.seed ^ 0xf10a), banned: h => bannedColour(h, skin), replaces: () => [...mainFronts, ...dd.front], wallMat: duskFacades[0] ?? null, bowl, ground: dd.ground, blocks: duskBlocks, onFronts: l => dd.onFronts(l)}) } catch { flowDress = null } }

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
  // the hood's people are skinned humans (human/): the nearest few drawn as people, everybody else the cheap figure in the same colours
  const troupe: Troupe | null = level.hood && o.people !== 'classic' && charNow('boy') && charNow('father') ? createTroupe({max: lite ? 8 : 16, lite}) : null
  const scarfOf = {p: skin.p, s: bannedColour(skin.s, skin) ? '#f3efe6' : skin.s}
  const nobody = () => new THREE.Group()
  // the crowd: one posed template, each part instanced
  const tmpl = figOf({template: true, scarf: true})
  tmpl.updateMatrixWorld(true)
  const kidK = level.kids ? 0.78 : 1
  const tParts = (tmpl.userData as FigureData).meshes.filter(m => !['glint', 'blob'].includes(m.userData.role as string))
  const recolour = new Set(['skin', 'hair', 'pants', 'top', 'beard', 'brow'])
  type Person = {x: number; z: number; face: number; look: Look; mode: 'walk' | 'stand' | 'steward' | 'rival' | 'target'; idx: number; react: number; turn: number; bubbleAt: number; hy?: number}
  const people: Person[] = []
  level.walkers.forEach((w, i) => people.push({x: w.x, z: w.z0, face: Math.PI, look: w.look, mode: 'walk', idx: i, react: 0, turn: Math.PI, bubbleAt: -9}))
  level.standers.forEach((s, i) => { if (s.hidden) return; people.push({x: s.x, z: s.z, face: s.face, look: s.look, mode: s.role === 'rival' ? 'rival' : 'stand', idx: i, react: 0, turn: s.face, bubbleAt: -9}) })
  const tgt = level.targets[0]
  if (tgt?.kind === 'person' && tgt.look) people.push({x: tgt.x, z: tgt.z, face: Math.PI, look: tgt.look, mode: 'target', idx: 0, react: 0, turn: Math.PI, bubbleAt: -9})
  const N = Math.max(1, people.length)
  const crowd = tParts.map(m => {
    const mat = (m.material as THREE.MeshStandardMaterial).clone(); if (recolour.has(m.userData.role)) mat.color.set('#ffffff')
    keep(mat)
    const im = new THREE.InstancedMesh(m.geometry, mat, N); im.count = people.length; im.frustumCulled = false; im.castShadow = !lite; scene.add(im); return im
  })
  const tops = allowed(TOPS, skin)
  /** a known person keeps his own hair colour; grey hair is the palette's grey, so the clue matches what is drawn */
  const hairOf = (L: Look) => L.grey ? HAIR[4] : L.hex?.hair ?? HAIR[L.hair % HAIR.length]
  // a known person's own colours, except one the club's page may not show (rival bans apply to every pixel)
  for (const p of level.targets) if (p.look?.hex) p.look.hex = Object.fromEntries(Object.entries(p.look.hex).filter(([, h]) => h && !bannedColour(h, skin)))
  people.forEach((p, i) => tParts.forEach((m, k) => {
    const r = m.userData.role as string
    const rival = p.mode === 'rival'
    const col = r === 'skin' ? (p.look.hex?.skin ?? SKIN_TONES[p.look.tone % SKIN_TONES.length]) : r === 'hair' || r === 'beard' || r === 'brow' ? hairOf(p.look) : r === 'pants' ? (p.look.hex?.pants ?? PANTS[p.look.pants % PANTS.length]) : r === 'top' ? (rival ? '#1d1f24' : p.look.hex?.top ?? tops[p.look.top % tops.length]) : null
    if (col) crowd[k]!.setColorAt(i, C(col))
  }))
  crowd.forEach(im => { if (im.instanceColor) im.instanceColor.needsUpdate = true })
  // Only who is near is drawn, and the instances are packed: a person scaled to nothing still costs every triangle of
  // every part of him, and ninety of those were two million triangles a frame for people nobody could see. A slot
  // remembers whose colours it wears and takes new ones only when somebody else moves into it.
  const pCols = people.map((p, i) => tParts.map((_, k) => { const c = new THREE.Color(); crowd[k]!.instanceColor ? crowd[k]!.getColorAt(i, c) : c.set('#ffffff'); return c }))
  const slotOwner = new Int16Array(N).fill(-1)
  const zero = new THREE.Matrix4().makeScale(0, 0, 0)
  const duskCrowd = dusk ? dressCrowd({scene, level, skin, lite, rnd, keep, allowed: l => allowed(l, skin), figOf, humans: !!troupe}) : null


  /* ───────────── the quest: who waits for you, what lies on the ground, where to go next ───────────── */
  const rlook = (o: Partial<Look> = {}): Look => ({tone: Math.floor(rnd() * 6), hair: Math.floor(rnd() * 6), top: Math.floor(rnd() * 6), pants: Math.floor(rnd() * 5), kit: rnd() < 0.8, cap: rnd() < 0.2, scarf: true, beard: rnd() < 0.2, size: 0.95 + rnd() * 0.1, ...o})
  // a look is a person: the same numbers always dress the same way, and a crowd is not one man repeated —
  // women with their hair down, denim, glasses, a jacket at night, eyes of their own colour
  const lookFig = (L: Look, o: Parameters<typeof makeFigure>[2] = {}) => {
    const h = L.tone * 7 + L.hair * 3 + L.top * 5 + L.pants * 11
    const female = o.female ?? (!L.beard && !L.hex && h % 3 === 0)
    const classic = () => classicFig(L, o, h, female)
    if (!troupe) return classic()
    const cast = (o.cast as CastId | undefined) ?? castFor({child: o.child, female, grey: L.grey, heavy: h % 5 === 2, pick: h})
    return troupe.make(cast, {top: L.kit ? skin.p : o.top ?? L.hex?.top ?? tops[L.top % tops.length]!, skin: o.skinTone ?? L.hex?.skin ?? SKIN_TONES[L.tone % SKIN_TONES.length], hair: L.grey ? undefined : L.hex?.hair ?? (o.rank === 1 ? undefined : HAIR[L.hair % HAIR.length]),
      pants: L.hex?.pants ?? PANTS[L.pants % PANTS.length], height: (o.scale ?? L.size * 0.94 * kidK) * 1.87, child: o.child, scarf: (o.scarf ?? L.scarf) ? scarfOf : null, pack: o.pack, noBlob: o.noBlob, rank: o.rank ?? 2, wear: {cap: (L.cap || !!o.cap) && !female, beard: L.beard && !female, glasses: h % 6 === 0}}, o.rank === 3 ? nobody : classic)
  }
  const classicFig = (L: Look, o: Parameters<typeof makeFigure>[2], h: number, female: boolean) => {
    return figOf({kit: L.kit, scarf: L.scarf, cap: L.cap && !female, mustache: L.beard, hair: hairOf(L), skinTone: L.hex?.skin ?? SKIN_TONES[L.tone % SKIN_TONES.length], top: L.hex?.top ?? tops[L.top % tops.length], pants: L.hex?.pants ?? PANTS[L.pants % PANTS.length], longSleeves: !L.kit, scale: L.size * 0.94 * kidK,
      female, hairStyle: female ? (h % 2 ? 'long' : 'bun') : h % 5 === 0 ? 'curly' : h % 7 === 0 ? 'bald' : 'short', glasses: h % 6 === 0, denim: L.pants % 2 === 0, eyes: L.hair % 5, jacket: !L.kit && night ? (L.top % 2 ? '#2a2f3a' : '#3b3630') : undefined, ...o})
  }
  const tint = C(skin.p).lerp(C('#ffffff'), 0.3)
  const flat = level.place === 'flat' ? dressFlat({scene, keep, level, skin, night, lite, banned: h => bannedColour(h, skin), ground, glowTex,
    person: f => figOf({kit: false, longSleeves: true, hairStyle: f.hairStyle ?? (f.curly ? 'curly' : 'short'), top: f.top, pants: f.pants, hair: f.hair, mustache: !!f.beard, skinTone: f.skinTone ?? SKIN_TONES[1], scale: (f.scale ?? 1) * 0.94, female: f.female, skirt: f.skirt, glasses: f.glasses, denim: f.denim, jacket: f.jacket, eyes: f.eyes, noBlob: true})}) : null
  let lifeDress: LifeDress | null = null
  if (level.hood) { try { lifeDress = dressLife({scene, keep, level, lite, night, primary: skin.p, secondary: skin.s, glowTex, lookFig: (L, o) => lookFig(L, o), rlook}) } catch { lifeDress = null } }
  const named = new Map<string, THREE.Group>()
  const hoodDress: HoodDress | null = level.hood ? dressHood({scene, keep, level, skin, night, lite, banned: h => bannedColour(h, skin), tint, person: (L, id) => { const f = lookFig(L, {rank: 1, cast: id === 'dad' ? 'father' : id === 'kiosk' ? 'father_heavy' : id === 'neighbour' ? 'grandfather' : id === 'mate' ? 'teen' : undefined, scale: id === 'mate' ? 0.81 : undefined}); if (id) named.set(id, f); return f }, sign: (a, b, c, w, h) => signTex(a, b, c, w, h)}) : null
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
    else if (k === 'battery') { add(new THREE.CylinderGeometry(0.06, 0.06, 0.24, 14), std('#26272b', {roughness: 0.4}), 0); add(new THREE.CylinderGeometry(0.061, 0.061, 0.08, 14), std(skin.p, {roughness: 0.4}), 0.08); add(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 8), std('#d9dce2', {metalness: 0.9, roughness: 0.2}), 0.135) }
    else if (k === 'cloth') add(new THREE.BoxGeometry(0.55, 0.14, 0.4), std(skin.s, {roughness: 0.95}))
    // the morning paper, folded to its back page; the kitchen scissors; a stick of glue
    else if (k === 'paper') { add(new THREE.BoxGeometry(0.56, 0.035, 0.4), std('#e8e3d6', {roughness: 0.95})); add(new THREE.BoxGeometry(0.4, 0.004, 0.06), std('#5d5a54', {roughness: 0.9}), 0.02) }
    else if (k === 'scissors') { add(new THREE.BoxGeometry(0.05, 0.03, 0.34).rotateY(0.22), std('#c8ccd2', {metalness: 0.8, roughness: 0.3})); add(new THREE.BoxGeometry(0.05, 0.03, 0.34).rotateY(-0.22), std('#c8ccd2', {metalness: 0.8, roughness: 0.3})); add(new THREE.TorusGeometry(0.06, 0.018, 8, 16).rotateX(Math.PI / 2), std(skin.p, {roughness: 0.5}), 0) }
    else if (k === 'glue') { add(new THREE.CylinderGeometry(0.055, 0.055, 0.22, 14), std('#f1efe9', {roughness: 0.6})); add(new THREE.CylinderGeometry(0.058, 0.058, 0.07, 14), std(skin.p, {roughness: 0.5}), 0.12) }
    else add(new THREE.TorusGeometry(0.1, 0.045, 10, 20).rotateX(Math.PI / 2), std('#d9d4c8', {roughness: 0.6}))
    return g
  }
  const pickups = level.pickups.map(p => {
    const g = new THREE.Group(); g.position.set(p.x, 0, p.z); scene.add(g)
    const item = objOf(p.kind); item.position.y = 0.55; g.add(item)
    const glow = new THREE.Sprite(keep(new THREE.SpriteMaterial({map: glowTex, color: (p.step === null ? C('#ffffff') : tint.clone()).multiplyScalar(p.step === null ? 0.6 : 1.1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}))); glow.scale.set(1.3, 1.3, 1); glow.position.y = 0.55; g.add(glow)
    if (p.inside !== undefined) glow.visible = false
    if (p.step !== null && p.inside === undefined) { const b2 = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.12, 0.12, 9, 8, 1, true)), keep(new THREE.MeshBasicMaterial({map: beamTex, color: tint.clone(), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false}))); b2.position.y = 4.5; g.add(b2) }
    return {g, item}
  })
  // what the player steers by reads the same at noon as at night: the day never dims a marker (look/daylight.ts)
  const dayFix = (o: THREE.Object3D) => o.traverse(c => { const m = (c as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined; for (const k of Array.isArray(m) ? m : m ? [m] : []) k.userData.dayFixed = true })
  ;[beacon, halo, tag, ...pickups.map(p => p.g)].forEach(dayFix)
  // the burst when something is picked up (three in the air at once is plenty)
  const gotSeen = level.pickups.map(() => false)
  const revealT: number[] = level.pickups.map(() => -1)
  const bursts = [0, 1, 2].map(() => {
    const ring = new THREE.Mesh(keep(new THREE.RingGeometry(0.42, 0.5, 40).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({color: tint.clone().multiplyScalar(2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false})))
    const flash = new THREE.Sprite(keep(new THREE.SpriteMaterial({map: glowTex, color: tint.clone().multiplyScalar(1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending})))
    ring.visible = flash.visible = false; scene.add(ring, flash); dayFix(ring); dayFix(flash)
    return {ring, flash, t: 9}
  })
  // a knot of people singing: a ring on the ground that fills while you stand in it
  const ringMeshes = level.rings.map(r => {
    const m = new THREE.Mesh(keep(new THREE.RingGeometry(r.r - 0.12, r.r, 40).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({color: C(skin.s).multiplyScalar(1.4), transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false})))
    m.position.set(r.x, 0.03, r.z); scene.add(m)
    const fillM = new THREE.Mesh(keep(new THREE.CircleGeometry(r.r - 0.14, 40).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({color: C(skin.p).multiplyScalar(1.2), transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false})))
    fillM.position.set(r.x, 0.025, r.z); fillM.scale.setScalar(0.001); scene.add(fillM); dayFix(m); dayFix(fillM)
    return {m, fillM}
  })
  // bins and shutters to bang
  const bins = level.noises.map(n => {
    const g = new THREE.Group(); g.position.set(n.x, 0, n.z); scene.add(g)
    const body = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.34, 0.3, 0.95, 16)), keep(std('#4a4f59', {metalness: 0.55, roughness: 0.45}))); body.position.y = 0.48; body.castShadow = !lite; g.add(body)
    const lid = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.37, 0.37, 0.06, 16)), keep(std('#3a3e47', {metalness: 0.6, roughness: 0.4}))); lid.position.y = 0.98; g.add(lid)
    const wave = new THREE.Mesh(keep(new THREE.RingGeometry(0.6, 0.75, 40).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({color: '#f3efe6', transparent: true, opacity: 0, depthWrite: false}))); wave.position.y = 0.05; g.add(wave)
    return {g, lid: lid as THREE.Object3D, wave}
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
    const lb = new THREE.Mesh(keep(new THREE.PlaneGeometry(4.6, st.r * 2 + 20)), keep(ground('asphalt', new THREE.MeshStandardMaterial({map: asphalt, roughness: 0.5, metalness: 0.15})))); lb.rotation.x = -Math.PI / 2; lb.position.set(level.half + 2.2, 0.006, st.z); lb.receiveShadow = true; scene.add(lb)
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
  const patrolFigs = (level.place === 'flat' ? [] : level.patrols).map(p => { const f = figOf({kit: false, vest: p.role === 'steward', top: '#22262f', longSleeves: true, pants: '#22262f', hair: HAIR[2], hairStyle: 'short', skinTone: SKIN_TONES[3]}); scene.add(f); return f })
  const coneMat = keep(new THREE.MeshBasicMaterial({color: '#f3efe6', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide}))
  const cones = (level.place === 'flat' ? [] : level.patrols).map(p => {
    const g = keep(new THREE.CircleGeometry(p.range, 24, Math.PI / 2 - p.fov / 2, p.fov)); const m = new THREE.Mesh(g, coneMat.clone()); keep(m.material as THREE.Material)
    m.rotation.x = -Math.PI / 2; scene.add(m); return m
  })

  // the supporter: his own figure, or his car
  let child = spec.age < 13
  const heroOpts = {kit: true, scarf: true, band: !child && level.verb === 'run', pack: level.verb === 'run' || level.verb === 'find', roll: level.verb === 'carry', pants: '#2f3e5e', denim: true, eyes: 1, hair: HAIR[1], skinTone: SKIN_TONES[1], child, scale: child ? 0.78 : 0.94, noBlob: level.place === 'flat'}
  const body0 = level.hood ? heroBody(spec.age) : {cast: child ? 'boy' as const : spec.age < 19 ? 'teen' as const : 'father' as const, height: child ? 1.42 : 1.76, child}
  const hero = troupe ? troupe.make(body0.cast, {top: skin.p, height: body0.height, child, scarf: scarfOf, pack: 'pack' in body0 ? body0.pack : true, rank: 0}, () => figOf(heroOpts)) : figOf(heroOpts)
  if (!heroCar) scene.add(hero)
  // the near crowd as people: whoever comes within a few steps gets a body of his own (the troupe draws the nearest it can afford)
  const extras: (THREE.Group | undefined)[] = [], crowdExtras = new Map<number, THREE.Group>()
  const rimLight = new THREE.PointLight('#cfe0ff', 0, 5, 1.6); if (level.hood) scene.add(rimLight)
  // the banner he takes on the ultras route: rolled cloth in neutral grey and white, never the other club's colours
  const loot = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.14, 0.14, 1.2, 14).rotateZ(Math.PI / 2)), keep(std('#c9c5bd', {roughness: 0.85})))
  loot.visible = false; scene.add(loot)
  const roll = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.16, 0.16, 1.15, 18).rotateZ(Math.PI / 2)), keep(std('#efe9de', {roughness: 0.8}))); roll.visible = false; scene.add(roll)
  // thrown things: a cup, a bottle-shaped plastic — drawn small and pale, never a weapon
  const throwsMesh = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.06, 0.05, 0.16, 8)), keep(std('#e8e3d8', {roughness: 0.5})), 12); throwsMesh.frustumCulled = false; scene.add(throwsMesh)
  const marks = new THREE.InstancedMesh(keep(new THREE.RingGeometry(0.5, 0.62, 24).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({color: '#f3efe6', transparent: true, opacity: 0.55, depthWrite: false})), 12); marks.frustumCulled = false; scene.add(marks)

  /* the stand behind the terrace: hundreds of bodies on rising tiers, in the club's colours, singing. Each tier's people
     are ONE merged geometry per pose, instanced — six draw calls for a full end — with vertex colours for skin, hair and
     trousers and the instance colour tinting only the shirt (`aTint`), so a stand is many people and not one man. */
  const stand: {im: THREE.InstancedMesh; ph: number}[] = []
  if (level.place === 'crowd' && !level.kids && spec.template !== 'title-night') {
    const skipRole = new Set(['glint', 'iris', 'eyeW', 'brow', 'blob', 'mouthOpen', 'mouth', 'belt', 'sock', 'cuff', 'hem', 'scarfB'])
    const bake = (fig: THREE.Group, skinC: string, hairC: string, pantsC: string) => {
      fig.updateMatrixWorld(true)
      const parts: THREE.BufferGeometry[] = []
      fig.traverse(o => {
        const m = o as THREE.Mesh; if (!m.isMesh) return
        const role = m.userData.role as string; if (skipRole.has(role)) return
        // a man forty metres off has no fingers, lids or buckles: anything smaller than a fist is left out of the bake
        if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere()
        if ((m.geometry.boundingSphere?.radius ?? 1) < 0.045) return
        const gm = m.geometry.clone().toNonIndexed(); gm.applyMatrix4(m.matrixWorld)
        const n = gm.attributes.position!.count, col = new Float32Array(n * 3), tint = new Float32Array(n)
        const cc = C(role === 'skin' ? skinC : role === 'hair' || role === 'beard' ? hairC : role === 'pants' ? pantsC : role === 'shoe' ? '#e8e4dc' : role === 'sole' ? '#c9c4b8' : role === 'scarf' ? skin.p : role === 'cap' ? skin.p : role === 'collar' ? skin.s : '#ffffff')
        for (let i = 0; i < n; i++) { col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; tint[i] = role === 'kit' || role === 'top' ? 1 : 0 }
        gm.setAttribute('color', new THREE.BufferAttribute(col, 3)); gm.setAttribute('aTint', new THREE.BufferAttribute(tint, 1))
        for (const k of Object.keys(gm.attributes)) if (!['position', 'normal', 'color', 'aTint'].includes(k)) gm.deleteAttribute(k)
        parts.push(gm)
      })
      const merged = mergeGeometries(parts, false)!; parts.forEach(pg => pg.dispose())
      return keep(merged)
    }
    const standMat = keep(new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.86}))
    standMat.onBeforeCompile = sh => {
      sh.vertexShader = 'attribute float aTint;\n' + sh.vertexShader.replace('#include <color_vertex>', `vColor = vec3(1.0);
        #ifdef USE_COLOR
        vColor *= color;
        #endif
        #ifdef USE_INSTANCING_COLOR
        vColor.xyz = mix(vColor.xyz, vColor.xyz * instanceColor.xyz, aTint);
        #endif`)
    }
    const rows = lite ? 5 : 10, z0 = level.bounds.z0 - 2.2, xw = level.half + 16, gap = lite ? 1.05 : 0.78
    const tiers = new THREE.InstancedMesh(box, keep(std('#7d7a72', {roughness: 0.95})), rows)
    for (let r = 0; r < rows; r++) { m4.makeScale(xw * 2 + 6, 0.5 + r * 0.46, 1.7).setPosition(0, (0.5 + r * 0.46) / 2, z0 - r * 1.7); tiers.setMatrixAt(r, m4) }
    tiers.receiveShadow = true; scene.add(tiers)
    const variants: {geo: THREE.BufferGeometry; ph: number}[] = []
    const poses: Parameters<typeof pose>[1][] = [{speed: 0, scarfUp: true, joy: 1}, {speed: 0, joy: 0.6}, {speed: 0, celebrate: true, joy: 1}]
    poses.forEach((ps, pi) => {
      const f = figOf({kit: pi !== 1, scarf: true, cap: pi === 2, longSleeves: pi === 1, noBlob: true, hairStyle: pi === 0 ? 'short' : pi === 1 ? 'curly' : 'bald'})
      pose(f, ps, pi * 1.3, 0)
      variants.push({geo: bake(f, SKIN_TONES[(pi * 2 + 1) % SKIN_TONES.length]!, HAIR[pi % HAIR.length]!, PANTS[(pi + 1) % PANTS.length]!), ph: pi * 2.1})
      disposeFigure(f)
    })
    const per = Math.floor(xw * 2 / gap), total = per * rows, each = Math.ceil(total / variants.length)
    const shirtCols = allowed([skin.p, skin.p, skin.s, '#2a2d36', '#e8e4dc', '#3a3630'], skin)
    variants.forEach((v, vi) => {
      const im = new THREE.InstancedMesh(v.geo, standMat, each); im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true
      let n = 0
      for (let r = 0; r < rows; r++) for (let k = 0; k < per; k++) {
        if ((r * per + k) % variants.length !== vi || n >= each) continue
        const x = -xw + k * gap + (rnd() - 0.5) * 0.3, y = 0.5 + r * 0.46, z = z0 - r * 1.7 + (rnd() - 0.5) * 0.5
        q.setFromAxisAngle(up, (rnd() - 0.5) * 0.5); const sc = 0.9 + rnd() * 0.16
        m4.compose(tmp.set(x, y, z), q, tmp2.set(sc, sc, sc)); im.setMatrixAt(n, m4)
        im.setColorAt(n, C(shirtCols[Math.floor(rnd() * shirtCols.length)]!)); n++
      }
      im.count = n; scene.add(im); stand.push({im, ph: v.ph})
    })
  }

  // the end of a good night in the crowd: flares in the club's colour held up, smoke rolling under the floodlights
  const flareC = bannedColour(skin.p, skin) ? '#f3efe6' : skin.p
  const flareLights: THREE.PointLight[] = [], flareSprites: THREE.Sprite[] = [], smokeSprites: {s: THREE.Sprite; a: number; x: number; z: number}[] = []
  let smokeMat: THREE.SpriteMaterial | null = null
  if (level.place === 'crowd' && !lite) {
    const fm = keep(new THREE.SpriteMaterial({map: glowTex, color: C(flareC).multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0}))
    smokeMat = keep(new THREE.SpriteMaterial({map: glowTex, color: C(flareC).lerp(C('#8a8a8a'), 0.6), transparent: true, depthWrite: false, opacity: 0}))
    const sm = smokeMat
    for (let k = 0; k < 4; k++) {
      const pl = new THREE.PointLight(flareC, 0, 14, 1.8); pl.visible = false; scene.add(pl); flareLights.push(pl)
      const sp = new THREE.Sprite(fm); sp.scale.set(2.4, 2.4, 1); sp.visible = false; scene.add(sp); flareSprites.push(sp)
      for (let j = 0; j < 4; j++) { const sk = new THREE.Sprite(sm); sk.visible = false; scene.add(sk); smokeSprites.push({s: sk, a: j / 4 * 4, x: 0, z: 0}) }
    }
  }

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
  // every quality gets the grade (one full-screen pass, which is what a phone can afford); bloom and MSAA only on high.
  // The grade runs in linear light before the output pass tone-maps: a filmic S round middle grey, cool shadows and warm
  // highlights (split tone), a touch more saturation, a vignette, grain — the GTA look, not a filter on top of it.
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, {type: THREE.HalfFloatType, samples: lite ? 0 : 4}))
  composer.addPass(new RenderPass(scene, cam))
  const bloomBase = dusk ? 0.32 : night ? 0.55 : 0.22
  const bloom = lite ? null : new UnrealBloomPass(new THREE.Vector2(256, 256), bloomBase, dusk ? 0.5 : 0.6, dusk ? 1.05 : night ? 0.9 : 1.1)
  if (bloom) composer.addPass(bloom)
  const grade = new ShaderPass({
    uniforms: {tDiffuse: {value: null}, uTime: {value: 0}, uSpeed: {value: 0}, uHeart: {value: 0}, uFlash: {value: 0}, uTint: {value: C(skin.p)}, uAspect: {value: 1}, uNight: {value: dusk ? 0.55 : night ? 1 : 0}, uClose: {value: 0}, uWarm: {value: 0}, uFocus: {value: 0}},
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime,uSpeed,uFlash,uAspect,uHeart,uNight,uClose,uWarm,uFocus; uniform vec3 uTint; varying vec2 vUv;
      float h(float n){ return fract(sin(n)*43758.5453); }
      void main(){ vec2 p=vUv-.5; p.x*=uAspect; float r=length(p); vec2 dir=normalize(vUv-.5+1e-5);
        // a lens: a hair of colour fringing at the edge always, more at speed
        float ca=(.0004+.0016*uSpeed)*r*r*2.4;
        vec3 c=vec3(texture2D(tDiffuse,vUv+dir*ca).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-dir*ca).b);
        c=max(c,0.);
        // a conversation: what is round the two of them goes soft and a little dark, the way a long lens leaves it
        if(uFocus>.01){ float f=smoothstep(.14,.6,r)*uFocus; vec2 o=vec2(.0035,.0035*uAspect)*(1.+r*2.2);
          vec3 b=texture2D(tDiffuse,vUv+vec2(o.x,0.)).rgb+texture2D(tDiffuse,vUv-vec2(o.x,0.)).rgb+texture2D(tDiffuse,vUv+vec2(0.,o.y)).rgb+texture2D(tDiffuse,vUv-vec2(0.,o.y)).rgb
            +texture2D(tDiffuse,vUv+o*1.6).rgb+texture2D(tDiffuse,vUv-o*1.6).rgb+texture2D(tDiffuse,vUv+vec2(o.x,-o.y)*1.6).rgb+texture2D(tDiffuse,vUv-vec2(o.x,-o.y)*1.6).rgb;
          c=mix(c,max(b,0.)/8.,f); c*=1.-f*.3; }
        // split tone: the shadows go cool, the lights go warm (at night the shadows go ink-blue and the lights stay sodium)
        float l=dot(c,vec3(.2126,.7152,.0722));
        vec3 sh=mix(vec3(.86,.94,1.14),vec3(.78,.86,1.22),uNight), hi=mix(vec3(1.08,1.0,.9),vec3(1.1,.98,.84),uNight);
        c*=mix(sh,hi,smoothstep(.03,.7,l));
        // warmth: the lights go to amber and bloom a little into what is beside them
        c*=mix(vec3(1.),vec3(1.12,1.0,.84),uWarm*.7); c+=vec3(1.,.7,.4)*pow(max(l-.22,0.),1.4)*.3*uWarm;
        // saturation up, then a filmic S round middle grey: blacks that are black, whites that keep their colour
        l=dot(c,vec3(.2126,.7152,.0722)); c=max(mix(vec3(l),c,1.02),0.); // a saturated light pushed past zero would be NaN under pow: a black hole
        c=pow(c/.18,vec3(1.1))*.18;
        // speed: streaks at the rim; tired: a heartbeat that darkens the edge in the club's colour
        float a=atan(p.y,p.x); float n=h(floor(a*70.)+floor(uTime*14.)); c+=smoothstep(.93,1.,n)*smoothstep(.42,1.05,r)*uSpeed*.22*vec3(.9,.95,1.);
        float beat=pow(max(0.,sin(uTime*7.5)),6.)*uHeart;
        // the vignette: a real lens falls off at the corners; a close-up tightens it
        c*=mix(1.,smoothstep(1.12-uClose*.2,.3-beat*.15,r),.7+uHeart*.18+uClose*.1); c=mix(c,c*uTint*1.5,beat*.25*smoothstep(.3,.9,r));
        // grain, finer in the light
        c+=(h(dot(vUv,vec2(12.9898,78.233))+fract(uTime*7.))-.5)*mix(.035,.012,smoothstep(.0,.6,l));
        c+=uFlash*vec3(.85,.9,1.); gl_FragColor=vec4(c,1.); }`,
  })
  composer.addPass(grade)
  composer.addPass(new OutputPass())

  /* ───────────── the day, and what a frame may cost ───────────── */
  // the hood's street turns with the clock (look/daylight.ts); a mission's own stage keeps the hour it was built for
  const day: Daylight | null = duskDress ? createDaylight({scene, renderer, sky: duskDress.sky, hemi, key, lamps: lampLights, gate: gateLight, wet: duskDress.wet, grade: {uNight: grade.uniforms.uNight as {value: number}}, bloom, bakeEnv: duskDress.bakeEnv}) : null
  if (level.hood) detail = createDetail(scene, lite)
  let clock = 18 * 60 + 40, scanIn = 0
  // The governor. A phone that cannot hold the frame gets a softer picture before it gets a slower game: the drawing
  // scale steps down (and the wet road's mirror is redrawn less often), and steps back up when there is room again.
  // Measured on real frames (a moving average of the time between them), never guessed from the device's name.
  const SCALES = lite ? [1, 0.85, 0.72, 0.6, 0.5] : [1, 0.88, 0.76, 0.66, 0.56]
  let gov = 0, govMs = 16.7, govHold = 0, mirrorN = lite ? 2 : 1, viewW = 1, viewH = 1, frames = 0, lastCalls = 0, lastTris = 0
  duskDress?.mirrorEvery(mirrorN)
  const applyScale = () => { renderer.setPixelRatio(dprMax * SCALES[gov]!); renderer.setSize(viewW, viewH, false); composer.setPixelRatio(dprMax * SCALES[gov]!); composer.setSize(viewW, viewH) }
  const govern = (ms: number) => {
    // a stall (a tab coming back, a shader compiling) is not the device's speed
    if (ms > 250 || ms <= 0) return
    govMs += (ms - govMs) * 0.06; frames++
    if (frames < 45 || --govHold > 0) return
    if (govMs > 24 && gov < SCALES.length - 1) { gov++; applyScale(); govHold = 50; if (gov >= 2 && mirrorN < 3) duskDress?.mirrorEvery(++mirrorN) }
    else if (govMs > 21 && mirrorN < 2) { duskDress?.mirrorEvery(++mirrorN); govHold = 50 }
    else if (govMs < 13.5 && gov > 0) { gov--; applyScale(); govHold = 160 }
  }

  /* ───────────── the frame ───────────── */
  const camPos = new THREE.Vector3(level.start.x, 2, level.start.z + 4), camLook = new THREE.Vector3(level.start.x, 1.4, level.start.z - 6)
  let t = 0, shake = 0, speedFx = 0, flash = 0, heart = 0, lastHits = 0, lastCaught = 0
  let talkKey = '', talkT = 0, talkK = 0, shotKey = '', warm = 0, beatK = 0, talkFov = 40
  let talkFace: {x: number; y: number; z: number; fig?: THREE.Object3D} | null = null, ambNow: AmbState | null = null
  const rayCaster = new THREE.Raycaster(), rayFrom = new THREE.Vector3(), rayDir = new THREE.Vector3()
  let occluders: THREE.Object3D[] | null = null
  const talkPos = new THREE.Vector3(), talkLook = new THREE.Vector3(), talkWant = new THREE.Vector3(), talkAim = new THREE.Vector3()
  const talkLight = new THREE.PointLight('#ffc79a', 0, 6, 1.8); if (level.hood) scene.add(talkLight)
  const eyeH = () => child ? 1.2 : 1.62

  function render(sim: Sim, view: View, dtReal: number) {
    // the conversation's own clock: a new line starts it again; the scarf going on is held a little longer than life
    const vt = view.hood?.talk ?? null
    if ((vt?.key ?? '') !== talkKey) { talkKey = vt?.key ?? ''; talkT = 0; shotKey = '' }
    const beat = vt?.beat === 'scarf'
    const slow = beat && !reduced && talkT > 0.9 && talkT < 3.1 ? 0.5 : 1
    const dt = dtReal * slow
    renderer.info.reset()
    if (dtReal > 0 && !view.brief) govern(dtReal * 1000)
    if (day) { day.set(clock); if (--scanIn <= 0) { scanIn = 120; day.scan(); detail?.scan() } }
    detail?.update(cam.position)
    if (vt) talkT += dt
    const talkDir: TalkDir | null = vt ? {who: vt.who, mood: vt.mood, gesture: vt.gesture, you: vt.you, shot: vt.shot, beat: vt.beat, speak: vt.speak, tt: talkT} : null
    t += dt
    const heading = sim.heading
    // people
    const J = (tmpl.userData as FigureData)
    let slot = 0, slotDirty = false
    for (let i = 0; i < people.length; i++) {
      const p = people[i]!
      if (p.mode === 'walk') { const w = walkerAt(level.walkers[p.idx]!, sim.t); p.x = w.x; p.z = w.z }
      const dx = p.x - sim.x, dz = p.z - sim.z, d2 = dx * dx + dz * dz
      if (d2 > 900 && p.mode !== 'target') continue
      if (d2 < 9 && !p.react && Math.random() < 0.5 && !sim.ended) p.react = 1.6
      p.react = Math.max(0, p.react - dt)
      const hoodMode = !!level.hood
      const faceHero = hoodMode ? p.mode === 'rival' : p.mode === 'stand' || p.mode === 'rival' || p.react > 0
      const yaw = faceHero && p.mode !== 'target' ? Math.atan2(sim.x - p.x, sim.z - p.z) : p.mode === 'walk' ? Math.PI : p.face
      p.turn += (yaw - p.turn) * Math.min(dt * 4, 1)
      const standing = p.mode !== 'walk', v = standing ? 0 : level.walkers[p.idx]!.v, psc = p.look.size * kidK
      // a stride covers the ground he covers: the phase is the distance walked over the stride's length (no sliding feet)
      J.phase = i * 1.7 + (standing ? 0 : (v * sim.t) / (psc * Math.max(0.9, Math.min(3.3, 0.85 + 0.42 * v / psc))) * Math.PI * 2)
      seedFigure(tmpl, i * 2.39)
      // he notices the boy going by: the head and the eyes follow him, and the face is glad
      const rel = Math.atan2(sim.x - p.x, sim.z - p.z) - p.turn, relY = Math.atan2(Math.sin(rel), Math.cos(rel))
      p.hy = (p.hy ?? 0) + ((hoodMode && d2 < 56 && Math.abs(relY) < 1.75 ? Math.max(-1.05, Math.min(1.05, relY)) : 0) - (p.hy ?? 0)) * Math.min(1, dt * 5)
      if (troupe) {
        let xf = extras[i]
        if (d2 < 110 && !xf) { xf = extras[i] = lookFig(p.look, {rank: 3}); scene.add(xf) }
        if (xf) {
          xf.visible = d2 < 120
          if (xf.visible) {
            xf.position.set(p.x, 0, p.z); xf.rotation.y = p.turn
            const chat2 = p.mode === 'stand' && Math.sin(t * 0.55 + i * 1.3) > 0.45
            pose(xf, {speed: v, mood: p.mode === 'rival' ? 'neutral' : Math.abs(p.hy) > 0.15 ? 'smile' : chat2 ? 'laugh' : 'warm', lookY: p.hy, gaze: Math.abs(p.hy) > 0.1, speak: chat2 ? 1 : 0, gesture: chat2 ? (i % 3 === 0 ? 'open' : i % 3 === 1 ? 'laugh' : null) : p.react > 0.8 && i % 3 === 0 ? 'lift' : null}, t, dt)
            if (isSkinned(xf)) continue
          }
        }
      }
      const sing = p.mode === 'stand' && (hoodMode ? i % 5 === 0 && p.z < level.goal.z + 60 && Math.sin(t * 0.4 + i) > 0.2 : Math.sin(t * 2 + i) > -0.2 && level.place !== 'yard')
      const chat = hoodMode && p.mode === 'stand' && !sing && Math.sin(t * 0.55 + i * 1.3) > 0.45
      pose(tmpl, {speed: v, scarfUp: sing || (!hoodMode && p.react > 0.6 && p.mode !== 'rival'), joy: p.mode === 'rival' ? 0 : standing || p.react > 0 ? 1 : 0.2, talk: !hoodMode && p.react > 0, speak: chat ? 1 : undefined, effort: p.mode === 'rival' ? 0.7 : 0,
        gesture: chat ? (i % 3 === 0 ? 'open' : i % 3 === 1 ? 'laugh' : null) : hoodMode && p.react > 0.8 && i % 3 === 0 ? 'lift' : null, mood: hoodMode && p.mode !== 'rival' ? (Math.abs(p.hy) > 0.15 ? 'smile' : chat ? 'laugh' : 'warm') : undefined, lookY: p.hy, gaze: Math.abs(p.hy) > 0.1}, t, 0)
      tmpl.position.set(p.x, !hoodMode && p.mode === 'stand' ? Math.abs(Math.sin(t * 3 + i)) * 0.05 : 0, p.z); tmpl.rotation.y = p.turn
      const sc = p.look.size * kidK; tmpl.scale.set(sc, sc, sc)
      tmpl.updateMatrixWorld(true)
      tParts.forEach((m, k) => {
        const r = m.userData.role as string, L = p.look
        const hide = (r === 'kit' && (!L.kit || p.mode === 'rival')) || (r === 'top' && L.kit && p.mode !== 'rival') || (r === 'collar' && !L.kit) || (r === 'cap' && !L.cap) || (r === 'beard' && !L.beard) || ((r === 'scarf' || r === 'scarfB') && (!L.scarf || p.mode === 'rival')) || ((r === 'mouthOpen' || r === 'mouth') && !m.visible)
        crowd[k]!.setMatrixAt(slot, hide ? zero : m.matrixWorld)
        if (slotOwner[slot] !== i && crowd[k]!.instanceColor) { crowd[k]!.setColorAt(slot, pCols[i]![k]!); slotDirty = true }
      })
      slotOwner[slot] = i; slot++
    }
    crowd.forEach(im => { im.count = slot; im.instanceMatrix.needsUpdate = true; if (slotDirty && im.instanceColor) im.instanceColor.needsUpdate = true })

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
      const nh = lookAt(n.fig, Math.atan2(sim.x - n.x, sim.z - n.z), dt)
      pose(n.fig, {speed: 0, wave: live && Math.hypot(sim.x - n.x, sim.z - n.z) < 14, joy: 0.6, talk: live && Math.hypot(sim.x - n.x, sim.z - n.z) < 3, scarfUp: st.group > 0 && Math.sin(t * 2.4 + n.step) > 0, lookY: nh}, t, dt)
      n.extra.forEach((f, k) => { if (f.visible) { const fh = lookAt(f, Math.atan2(sim.x - f.position.x, sim.z - f.position.z), dt); pose(f, {speed: 0, scarfUp: Math.sin(t * 2.4 + k) > -0.3, joy: 1, lookY: fh}, t, dt) } })
    })
    const target = view.ending ? null : stepTarget(level, sim)
    const curStep = level.steps[sim.step]
    beacon.visible = halo.visible = !!target && !(level.place === 'crowd' && curStep?.kind === 'goal')
    if (target) {
      const bx = curStep?.kind === 'stop' ? curStep.x + 0.4 : target.x
      beacon.position.set(bx, level.place === 'flat' ? 2.1 : 13, target.z); beacon.scale.y = level.place === 'flat' ? 0.16 : 1; halo.position.set(bx, 0.04, target.z)
      const pulse = 1 + Math.sin(t * 3.2) * 0.12; halo.scale.set(pulse * (curStep?.kind === 'stop' ? 2.2 : 1), 1, pulse * (curStep?.kind === 'stop' ? 6 : 1))
      ;(beacon.material as THREE.MeshBasicMaterial).opacity = 0.32 + Math.sin(t * 2) * 0.08
    }
    const talkNpc = curStep?.kind === 'talk' ? npcs.find(n => n.step === sim.step) : null
    tag.visible = !!talkNpc && !view.ending
    if (talkNpc) { tag.position.set(talkNpc.x, (talkNpc.fig.scale.y || 1) * 2.15 + Math.sin(t * 3) * 0.08, talkNpc.z); tag.rotation.y = t * 2 }
    // something picked up bursts: a ring and a flash in the club's colour where it was
    pickups.forEach((p, i) => { if (sim.got[i] && !gotSeen[i]) { gotSeen[i] = true; const b = bursts.find(x => x.t > 0.7); if (b) { b.t = 0; b.ring.position.set(p.g.position.x, 0.05, p.g.position.z); b.flash.position.set(p.g.position.x, 0.6, p.g.position.z) } } else if (!sim.got[i]) gotSeen[i] = false })
    bursts.forEach(b => {
      b.t += dt; const k = Math.min(1, b.t / 0.7), on = k < 1
      b.ring.visible = b.flash.visible = on
      if (!on) return
      b.ring.scale.setScalar(0.3 + k * 2.6); (b.ring.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.9
      b.flash.scale.setScalar(0.6 + k * 2.2); (b.flash.material as THREE.SpriteMaterial).opacity = (1 - k) * 0.9; b.flash.position.y = 0.6 + k * 0.8
    })
    pickups.forEach((p, i) => {
      // what is hidden in a drawer is never on show: when he finds it, it comes up out of the place into the light
      const hidden = level.pickups[i]!.inside !== undefined
      if (hidden && sim.got[i]) {
        revealT[i] = (revealT[i] ?? -1) < 0 ? 0 : revealT[i]! + dt
        const k = revealT[i]!, on = k < 1.3
        p.g.visible = on
        if (on) { const e = Math.min(1, k / 0.5); p.item.position.y = 0.7 + e * 1.1 + Math.max(0, k - 0.5) * 0.25; p.item.rotation.y = k * 7; p.item.scale.setScalar(0.6 + e * 0.9 - Math.max(0, k - 1) * 3) }
        return
      }
      p.g.visible = !sim.got[i] && !hidden
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
    // the stand sings: each pose group rises and falls on its own beat
    stand.forEach(sg => { sg.im.position.y = Math.abs(Math.sin(t * 2.6 + sg.ph)) * 0.06 })
    // the flares: lit when the night is won, held among the crowd around him
    if (flareLights.length) {
      const on = view.ending && view.outcome !== 'slip', k = on ? Math.min(1, view.endT / 1.5) : 0
      flareLights.forEach((pl, i) => {
        const a = i * 1.57 + 0.6, fx = sim.x + Math.cos(a) * 3.2, fz = sim.z + Math.sin(a) * 2.6
        pl.visible = on; pl.intensity = k * (60 + Math.sin(t * 19 + i) * 14); pl.position.set(fx, 2.6, fz)
        const sp = flareSprites[i]!; sp.visible = on; sp.position.set(fx, 2.5, fz); sp.scale.setScalar(k * (2.2 + Math.sin(t * 23 + i) * 0.4))
        ;(sp.material as THREE.SpriteMaterial).opacity = k * 0.9
        for (let j = 0; j < 4; j++) { const sk = smokeSprites[i * 4 + j]!; sk.a = (sk.a + dt * 0.6) % 4; const u = sk.a / 4; sk.s.visible = on; sk.s.position.set(fx + Math.sin(sk.a * 2 + j) * 0.8 * u + u * 1.5, 2.6 + u * 3.5, fz + Math.cos(sk.a * 1.7 + i) * 0.6 * u); sk.s.scale.setScalar(1 + u * 4) }
      })
      if (smokeMat) smokeMat.opacity = k * 0.22
    }
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

    ambNow = lifeDress ? lifeDress.update(sim, view.hood?.amb ?? null, t, dt) : null
    talkFace = hoodDress ? hoodDress.update(sim, view, t, dt, talkDir, ambNow, child, hero) : null
    duskDress?.update(sim, t, dt, cam.position)
    flowDress?.update(cam.position)
    if (troupe) crowdExtras.forEach(f => { f.visible = false })
    duskCrowd?.update(sim, t, dt, troupe ? (i, px, pz, yaw, v, sc, col) => {
      let f = crowdExtras.get(i)
      if (!f) { if (crowdExtras.size > 40) return false; f = troupe.make(castFor({female: i % 3 === 0, grey: i % 7 === 3, heavy: i % 4 === 1, pick: i}), {top: '#' + col.getHexString(), skin: SKIN_TONES[(i * 5 + 1) % SKIN_TONES.length], hair: i % 7 === 3 ? undefined : HAIR[i % HAIR.length], pants: PANTS[i % PANTS.length], height: sc * 1.74, scarf: i % 4 !== 2 ? scarfOf : null, rank: 3}, nobody); scene.add(f); crowdExtras.set(i, f) }
      f.visible = true; f.position.set(px, 0, pz); f.rotation.y = yaw
      pose(f, {speed: v, mood: i % 3 ? 'warm' : 'smile', joy: 0.6, speak: v === 0 && Math.sin(t * 0.5 + i) > 0.6 ? 1 : 0, gesture: v === 0 && Math.sin(t * 0.5 + i) > 0.6 ? 'open' : null, lookY: Math.sin(t * 0.3 + i) * 0.3}, t, dt)
      return isSkinned(f)
    } : undefined, (cam.getWorldDirection(eyeDir), {x: cam.position.x, z: cam.position.z, fx: eyeDir.x, fz: eyeDir.z, far: Math.min(280, 1.4 / Math.max(0.003, (scene.fog as THREE.FogExp2).density))}))
    flat?.update(sim, t, dt, view.ending, view.outcome, {x: camPos.x, z: camPos.z, close: closeK})
    // stewards and the ground they can see
    if (level.place !== 'flat') level.patrols.forEach((p, i) => {
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
      hero.position.set(sim.x, 0, sim.z)
      // he turns the way he goes at a body's pace (the head gets there first, `pose`); in a conversation he turns to whoever he is talking to
      if (!level.hood || view.ending || view.brief) hero.rotation.y = heading
      else if (talkDir && talkFace) turnTo(hero, Math.atan2(talkFace.x - sim.x, talkFace.z - sim.z), dt, 7, 6)
      else turnTo(hero, heading, dt, 18, 14)
      const carrying = (level.verb === 'carry' && sim.holding) || (level.home !== null && sim.back)
      if (view.ending) { hero.rotation.y += (0 - hero.rotation.y) * 0.1; pose(hero, view.outcome === 'slip' ? {speed: 0, knees: true, panting: true, effort: 0.6} : {speed: 0, celebrate: true, joy: 1}, t, dt) }
      else if (view.intro > 0 || view.brief) pose(hero, {speed: 0, joy: 0.4, ticket: level.verb === 'run' && level.place !== 'flat'}, t, dt)
      else if (level.hood) {
        const hs = (hero.userData as FigureData).scarf
        const scarfOn = !!view.hood?.scarf && !(beat && talkT < 1.7)
        hs?.forEach(o => { o.visible = scarfOn })
        if (talkDir) {
          const tt = talkT, you: Mood = beat ? (tt < 1.7 ? 'surprised' : tt < 4.3 ? 'smile' : tt < 7 ? 'laugh' : 'proud') : talkDir.you ?? 'warm'
          const up = talkFace ? Math.atan2(talkFace.y - (child ? 1.12 : 1.55), Math.max(0.4, Math.hypot(talkFace.x - sim.x, talkFace.z - sim.z))) : 0
          pose(hero, {speed: 0, mood: you, gaze: true, lookDown: -Math.min(0.5, up) + (beat && tt > 1.2 && tt < 2.6 ? 0.25 : 0), joy: 0.6, gesture: beat && tt > 7.4 ? 'thumb' : null}, t, dt)
        } else {
          // he looks at whoever calls to him and at the people he knows as he passes them
          let gx = 0, gz = 0, gd = 99
          for (const q of level.hood.people) { const d = Math.hypot(q.x - sim.x, q.z - sim.z); if (d < 7 && d < gd) { gd = d; gx = q.x; gz = q.z } }
          const cap = ambNow?.captions[ambNow.captions.length - 1], ca = cap ? lifeDress?.anchor(cap.spot) : null
          if (ca && Math.hypot(ca.x - sim.x, ca.z - sim.z) < 14) { gd = 1; gx = ca.x; gz = ca.z }
          let gy = 0
          if (gd < 99) { const r0 = Math.atan2(gx - sim.x, gz - sim.z) - hero.rotation.y, r1 = Math.atan2(Math.sin(r0), Math.cos(r0)); if (Math.abs(r1) < 2) gy = Math.max(-1, Math.min(1, r1)) }
          const kicked = !!ambNow && ambNow.t - ambNow.kickAt < 0.5
          pose(hero, {speed: sim.stagger > 0 ? 1 : sp, effort: sim.sprinting ? 0.7 : tired ? 0.7 : 0, panting: tired, stumble: sim.stagger > 0.5, lean: sim.sprinting ? 0.1 : 0, lookY: gy, gaze: gy !== 0, lookDown: gy !== 0 && child && gd < 7 ? -0.18 : 0, mood: gy !== 0 ? 'smile' : 'warm', gesture: kicked ? 'kick' : null}, t, dt)
        }
      }
      else pose(hero, {speed: sim.stagger > 0 ? 1 : sp, effort: sim.sprinting ? 0.9 : tired ? 0.7 : Math.min(sp / 9, 0.5), panting: tired, stumble: sim.stagger > 0.5, lean: sim.sprinting ? 0.1 : 0, carry: carrying, crouch: level.place === 'yard' && !sim.sprinting ? 0.55 : 0}, t, dt)
      const hd = hero.userData as FigureData
      // going through a place: he faces it, bends to it, and his hands go through it (a drawer is pulled, a coat patted)
      if (sim.searchI >= 0 && !view.ending) {
        const sq = level.searches[sim.searchI]!, low = sq.kind === 'bed' || sq.kind === 'table' || sq.kind === 'shoes' || sq.kind === 'toybox' || sq.kind === 'cushion'
        let dy = sq.face - hero.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); hero.rotation.y += dy * Math.min(1, dt * 10)
        const J = hd.J, w = Math.sin(t * 11), up = sq.kind === 'wardrobe'
        J.spine!.rotation.x = low ? 0.55 : up ? -0.18 : 0.22
        if (low) { J.hipL!.rotation.x = J.hipR!.rotation.x = -0.9; J.kneeL!.rotation.x = J.kneeR!.rotation.x = 1.5; J.pelvis!.position.y *= 0.72 }
        J.shoulderL!.rotation.x = (up ? -2.6 : -1.15) + w * 0.25; J.shoulderR!.rotation.x = (up ? -2.5 : -1.05) - w * 0.25
        J.elbowL!.rotation.x = J.elbowR!.rotation.x = up ? -0.2 : -0.5 + Math.abs(w) * 0.3
        J.head!.rotation.x = low ? 0.35 : up ? -0.4 : 0.25
      }
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
    if (dusk) key.position.set(sim.x - 10, 16, sim.z + 24)
    if (day) key.position.set(sim.x + day.sun.x, day.sun.y, sim.z + day.sun.z)
    if (day) { const k = Math.min(1, day.light.lit); rim.intensity = 2 + 4 * k; fill.intensity = 1 + 2 * k }
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
    if (view.brief) {
      // the briefing: a slow crane round the place, high, so you see where you are before you are in it
      const a = t * 0.12, R = level.place === 'flat' ? 15 : 22, cx = level.place === 'flat' ? (level.bounds.x0 + level.bounds.x1) / 2 : sim.x, cz = level.place === 'flat' ? (level.bounds.z0 + level.bounds.z1) / 2 : sim.z - 10
      camPos.set(cx + Math.sin(a) * R, level.place === 'flat' ? 17 : 14, cz + Math.cos(a) * R)
      cam.position.copy(camPos); camLook.set(cx, 0, cz); cam.lookAt(camLook)
      cam.fov += (50 - cam.fov) * Math.min(1, dt * 3)
    } else if (level.place === 'flat' && !heroCar) {
      // home: from above, the ceiling off, the way up the screen always the same (the stick never turns with him);
      // the intro comes down from the crane, the ending leans in on his face
      const k = view.ending ? Math.min(view.endT / 1.2, 1) : 0, e = k * k * (3 - 2 * k)
      const drop = Math.max(0, view.intro) / 2.4
      // the distance that shows about a room's width across the screen, a phone held upright or a monitor
      const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * cam.aspect), want = cam.aspect < 1 ? 6.4 : 12
      const dist = Math.min(22, Math.max(9, want / 2 / Math.tan(hf / 2))) * (1 - e * 0.45) + drop * drop * 12
      const high = dist * 0.86, back = dist * 0.5
      // close up: going through a drawer, the camera comes down low beside him and looks at his hands
      const sq = sim.searchI >= 0 ? level.searches[sim.searchI] : null
      closeK += ((sq ? 1 : 0) - closeK) * Math.min(1, dt * (sq ? 3.2 : 2.2))
      // the hands are where the place is: up on the wardrobe, at a coat on its hook, down in a drawer
      if (sq) closeAt.set(sq.x + Math.sin(sq.face) * 0.55, sq.kind === 'wardrobe' ? 1.25 : sq.kind === 'coat' ? 1.2 : sq.kind === 'bed' || sq.kind === 'shoes' || sq.kind === 'toybox' ? 0.45 : 0.75, sq.z + Math.cos(sq.face) * 0.55)
      // the boy is the subject and the place is what he is doing: aim between his chest and his hands, not at the furniture
      if (sq) closeAt.lerp(tmp3.set(sim.x, child ? 0.85 : 1.05, sim.z), 0.45)
      // beside him, a little behind, on the side the camera already is (the open side of the room): his face, his hands and the place in one frame
      // in FRONT of the place and to one side of him (about sixty degrees off its face): further round than that and the lens
      // ends up beside or behind the furniture he is going through — the armchair filled the screen. Of the two sides, the
      // one with open floor between the lens and his hands; then the one the camera is already on.
      let side = 0, cdist = 2.2, closeCap = 0.92
      if (sq) {
        // the lens stays in the room he is in, and nothing stands between it and his hands
        const room = level.rooms.find(r => sim.x >= r.rect.x0 && sim.x <= r.rect.x1 && sim.z >= r.rect.z0 && sim.z <= r.rect.z1)?.rect
        const ok = (a: number, d: number) => { const cx = sim.x + Math.sin(a) * d, cz = sim.z + Math.cos(a) * d
          if (room && (cx < room.x0 + 0.12 || cx > room.x1 - 0.12 || cz < room.z0 + 0.12 || cz > room.z1 - 0.12)) return false
          for (let k = 0; k <= 10; k++) { const x = cx + (closeAt.x - cx) * k / 10, z = cz + (closeAt.z - cz) * k / 10; for (const b of level.blocks) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return false }
          return true }
        const pref = Math.cos(sq.face + Math.PI * 0.33) >= Math.cos(sq.face - Math.PI * 0.33) ? 1 : -1
        let hit = false
        found: for (const d of [2.2, 1.8, 1.5, 1.15]) for (const f of [0.33, 0.2, 0.45, 0]) for (const sg of [pref, -pref]) { const a = sq.face + sg * f * Math.PI; if (ok(a, d)) { side = a; cdist = d; hit = true; break found } }
        // no clean lens in a room this small: stay half way down — a mid shot from above beats a wall of wardrobe doors
        if (!hit) { side = sq.face; cdist = 2.2; closeCap = 0.45 }
      }
      const near = tmp2.set(sim.x + Math.sin(side) * cdist, (child ? 1.45 : 1.7) + (sq?.kind === 'wardrobe' ? 0.75 : 0), sim.z + Math.cos(side) * cdist)
      camPos.lerp(tmp.set(sim.x + jx, high + jy, sim.z + back).lerp(near, closeK * closeCap), Math.min(1, dt * (view.intro > 0 ? 3 : 4.5)))
      cam.position.copy(camPos)
      camLook.lerp(tmp3.set(sim.x, 0.5 + e * 0.6, sim.z - (cam.aspect < 1 ? 1.4 : 0.6) * (1 - e)).lerp(closeAt, closeK), Math.min(1, dt * 6)); cam.lookAt(camLook)
      const fov = 50 + Math.min(sp, 6) * 0.8 - e * 6 - closeK * 8; cam.fov += (fov - cam.fov) * Math.min(dt * 4, 1)
    } else if (view.ending && !heroCar) {
      const k = Math.min(view.endT / 1.2, 1), e = k * k * (3 - 2 * k)
      camPos.lerp(tmp.set(sim.x + 0.6, child ? 1.2 : 1.55, sim.z - 2.4), Math.min(1, dt * (2 + e * 4)))
      cam.position.copy(camPos)
      camLook.lerp(tmp3.set(sim.x, view.outcome === 'slip' ? 1.0 : 1.4, sim.z), Math.min(1, dt * 5)); cam.lookAt(camLook)
      cam.fov += (42 - cam.fov) * Math.min(1, dt * 3)
    } else if (heroCar) {
      const target = tmp.set(sim.x * 0.6 + jx, 3.4 + jy, sim.z + 8.5)
      camPos.lerp(target, Math.min(dt * 5, 1)); cam.position.copy(camPos)
      camLook.lerp(tmp3.set(sim.x * 0.8, 1.2, sim.z - 14), Math.min(dt * 6, 1)); cam.lookAt(camLook)
      const fov = 58 + Math.min(sim.speed, 30) * 0.5; cam.fov += (fov - cam.fov) * Math.min(dt * 3, 1)
    } else if (view.cam === 'chase') {
      const back = dusk ? 6.4 + sp * 0.1 : 3.1 + sp * 0.1, high = dusk ? 3.5 : (child ? 1.55 : 1.85) + sp * 0.02, side = dusk ? 0.9 : 0.75
      const fx = Math.sin(heading), fz = Math.cos(heading)
      // over the right shoulder, behind the way he faces
      // his right hand is (−fz, fx)
      const drop = Math.max(0, view.intro) / 2.4
      const target = tmp.set(sim.x - fx * (back + drop * 6) - fz * side + jx, high + jy + breath + drop * drop * 10, sim.z - fz * (back + drop * 6) + fx * side)
      camPos.lerp(target, Math.min(dt * (dusk ? 3.5 : 5), 1))
      // the lens never goes into a facade: on the main street it stays inside the pavements (a crossing lets it out)
      if (dusk && !level.crossings.some(c => Math.abs(camPos.z - c) < 8)) camPos.x = THREE.MathUtils.clamp(camPos.x, -(level.walk - 0.8), level.walk - 0.8)
      cam.position.copy(camPos)
      const ahead = dusk ? 24 : 7
      camLook.lerp(new THREE.Vector3(sim.x + fx * ahead - fz * side * 0.4, dusk ? 1.6 : 1.45, sim.z + fz * ahead + fx * side * 0.4), Math.min(dt * 6, 1)); cam.lookAt(camLook)
      const fov = (view.intro > 0 ? 48 : dusk ? 64 : 54) + Math.min(sp, 10) * 1.2; cam.fov += (fov - cam.fov) * Math.min(dt * 4, 1)
    } else {
      const hb = reduced ? 0 : Math.sin(t * (6 + sp * 1.2)) * 0.055 * Math.min(sp / 6, 1.4)
      cam.position.set(sim.x + jx, eyeH() + hb + jy + breath - (level.place === 'yard' && !sim.sprinting ? 0.35 : 0), sim.z)
      cam.rotation.order = 'YXZ'; cam.rotation.set(-0.04 + hb * 0.2, heading + Math.PI, 0)
      hands.children.forEach((a, i) => { if ((a as THREE.Group).isGroup) a.position.y = -0.3 + Math.sin(t * (6 + sp * 1.2) + (i ? Math.PI : 0)) * 0.03 * Math.min(sp / 4, 1.5) })
      const fov = 76 + Math.min(sp, 10) * 1.1; cam.fov += (fov - cam.fov) * Math.min(dt * 4, 1)
    }
    if (level.hood) {
      // whatever solid stands between a lens and the two people (a post, a tree, a stall, a wall the plan does not know):
      // a ray from the lens to the middle of the pair, against the scene's opaque things, not the people themselves
      const blocked = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => {
        rayFrom.set(ax, ay, az); rayDir.set(bx - ax, by - ay, bz - az); const len = rayDir.length(); if (len < 0.3) return false
        rayCaster.set(rayFrom, rayDir.divideScalar(len)); rayCaster.far = len - 0.5
        if (!occluders) { const list: THREE.Object3D[] = []; occluders = list; scene.traverse(o => { const m = o as THREE.Mesh; if (!m.isMesh || (m as THREE.SkinnedMesh).isSkinnedMesh || !m.visible) return
          const mt = m.material as THREE.Material; if (Array.isArray(mt) || mt.transparent || !mt.depthWrite || m.userData.role || m.geometry.attributes.aMask || m.geometry.attributes.aTint) return
          for (let p: THREE.Object3D | null = m; p; p = p.parent) if ((p.userData as {human?: unknown}).human || p === hero) return
          list.push(m) }) }
        return rayCaster.intersectObjects(occluders, false).length > 0
      }
      // A conversation is held, not watched from the kerb: over the boy's shoulder onto the face that speaks; for a line that
      // matters, round to the side so both of them are in the picture. The lens takes the side that has room (never a facade,
      // never the kiosk), eases in and out, and with reduced motion it cuts.
      const on = talkDir && talkFace && view.cam === 'chase' ? 1 : 0
      talkK = reduced ? on : talkK + (on - talkK) * Math.min(1, dtReal * (on ? 2.4 : 2.0))
      if (on && talkFace) {
        const shot = talkDir!.shot ?? 'two', key = talkKey + shot
        const hx = sim.x, hz = sim.z, d0 = Math.hypot(talkFace.x - hx, talkFace.z - hz) || 1, ax = (talkFace.x - hx) / d0, az = (talkFace.z - hz) / d0, px = az, pz = -ax
        const hh = child ? 1.16 : 1.58, mx = (hx + talkFace.x) / 2, mz = (hz + talkFace.z) / 2
        if (key !== shotKey) {
          shotKey = key; occluders = null
          talkFov = shot === 'close' ? 40 : 44
          const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(talkFov) / 2) * cam.aspect)
          const dist = Math.max(2.1, Math.min(4.0, 1.1 / (2 * Math.tan(hf / 2))))
          const free = (x: number, z: number) => {
            if (!level.crossings.some(c => Math.abs(z - c) < level.half) && Math.abs(x) > level.walk - 0.9) return false
            // nothing across the speaker's face, the boy's head or the middle of the pair
            const cy = hh + 0.25
            if (blocked(x, cy, z, mx, (hh + talkFace!.y) / 2, mz) || blocked(x, cy, z, talkFace!.x, talkFace!.y, talkFace!.z) || blocked(x, cy, z, hx, hh, hz)) return false
            // and nothing solid right at the lens's sides (a stall or a box filling half the frame)
            for (const [ox, oz] of [[0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45]] as const) if (blocked(x + ox, cy, z + oz, talkFace!.x, talkFace!.y, talkFace!.z)) return false
            for (let k = 0; k <= 8; k++) { const qx = x + (mx - x) * k / 8, qz = z + (mz - z) * k / 8; for (const b of level.blocks) if (qx > b.x0 - 0.45 && qx < b.x1 + 0.45 && qz > b.z0 - 0.45 && qz < b.z1 + 0.45) return false
              // the dusk street's lamp posts (look/dusk.ts lays them every 16 m, the right side 8 m on): never a post across the lens
              if (dusk && Math.abs(Math.abs(qx) - (level.half + 1.2)) < 0.6) { const off = qx > 0 ? 8 : 0, r = ((level.bounds.z1 + 4 + off - qz) % 16 + 16) % 16; if (r < 0.7 || r > 15.3) return false } }
            return true }
          // two: over the boy's shoulder onto the face that speaks. close: the reverse — past the speaker's shoulder and hands onto the boy's own face
          const at = (sg: number, k: number) => shot === 'close' ? talkWant.set(talkFace!.x + ax * 0.55 * k + px * sg * 1.45 * k, talkFace!.y - 0.08, talkFace!.z + az * 0.55 * k + pz * sg * 1.45 * k) : talkWant.set(hx - ax * 1.95 * k + px * sg * 0.72, hh + 0.2, hz - az * 1.95 * k + pz * sg * 0.72)
          // the side with room: the street's side first
          const pref = Math.abs(mx + px) < Math.abs(mx - px) ? 1 : -1
          let hit = false
          pick: for (const k of [1, 0.8, 0.62]) for (const sg of [pref, -pref]) { at(sg, k); if (free(talkWant.x, talkWant.z)) { hit = true; break pick } }
          let sideOn = false
          if (!hit) {
            // no room behind either of them (he stands between the speaker and a wall): from the side, the street's side first
            sideOn = true
            for (const sg of [pref, -pref]) { talkWant.set(mx + px * sg * Math.max(2.6, dist * 0.8), hh + 0.4, mz + pz * sg * Math.max(2.6, dist * 0.8)); if (free(talkWant.x, talkWant.z)) { hit = true; break } }
            // still nothing: round the pair at three distances, the first clear lens wins
            if (!hit) ring: for (const r of [3.2, 2.4, 4.4]) for (let k = 0; k < 12; k++) { const an = k * Math.PI / 6; talkWant.set(mx + Math.cos(an) * r, hh + 0.4, mz + Math.sin(an) * r); if (free(talkWant.x, talkWant.z)) { hit = true; break ring } }
            if (!hit) talkWant.set(mx - Math.sign(mx || 1) * 3.2, hh + 0.4, mz + 0.9)
          }
          if (sideOn) { talkAim.set(mx, (hh + talkFace.y) / 2, mz); talkFov = 54 }
          else if (shot === 'close') talkAim.set(hx + ax * 0.22, hh - 0.1, hz + az * 0.22); else talkAim.set(hx + (talkFace.x - hx) * 0.82, talkFace.y * 0.72 + hh * 0.28, hz + (talkFace.z - hz) * 0.82)
          talkPos.copy(talkWant); talkLook.copy(talkAim)
        }
        talkLight.position.set(mx + (talkPos.x - mx) * 0.45, troupe ? talkFace.y + 0.35 : 2.3, mz + (talkPos.z - mz) * 0.45)
      }
      if (talkK > 0.002) {
        const e = talkK * talkK * (3 - 2 * talkK)
        cam.position.lerpVectors(camPos, talkPos, e); cam.lookAt(tmp.copy(camLook).lerp(talkLook, e)); cam.fov += (talkFov - cam.fov) * e
      }
      const darkNow = day ? day.dark : night
      talkLight.intensity = talkK * (darkNow ? (troupe ? 11 : 7) : 2)
      // faces in a conversation: a soft warm key from the lens's side and a cool rim from behind, so skin is never flat or grey
      if (troupe && talkFace) { const bx = talkFace.x - cam.position.x, bz = talkFace.z - cam.position.z, bl = Math.hypot(bx, bz) || 1; rimLight.position.set(talkFace.x + bx / bl * 1.1, talkFace.y + 0.55, talkFace.z + bz / bl * 1.1) }
      rimLight.intensity = troupe ? talkK * (darkNow ? 9 : 3) : 0
      // standing still, the picture breathes with whoever is holding the camera
      if (!reduced && !view.brief) { const still = 1 - Math.min(1, sp / 1.5); cam.position.x += (Math.sin(t * 0.71) * 0.016 + Math.sin(t * 1.93) * 0.006) * still; cam.position.y += Math.sin(t * 0.87 + 1) * 0.012 * still; cam.rotateZ(Math.sin(t * 0.53) * 0.0028 * still) }
      // warmth: home is the warmest place on the street, a conversation warms the picture, and the scarf going on warms it most
      const hd = level.hood.door, homeK = Math.max(0, 1 - Math.hypot(sim.x - hd.x, sim.z - hd.z) / 26)
      beatK += ((beat && talkT > 0.8 && talkT < 5 ? 1 : 0) - beatK) * Math.min(1, dtReal * 1.6)
      warm += (Math.max(homeK * 0.32, talkK * 0.4, beatK) - warm) * Math.min(1, dtReal * 3)
      grade.uniforms.uWarm!.value = warm; grade.uniforms.uFocus!.value = Math.max(talkK * 0.75, beatK)
      if (bloom) bloom.strength = (day?.bloomBase ?? bloomBase) + beatK * 0.4 + talkK * 0.08
    }
    cam.updateProjectionMatrix()
    troupe?.update(cam.position, talkDir ? talkFace?.fig ?? null : null)
    speedFx += (((sim.sprinting || (heroCar && sim.speed > 20)) ? 1 : sp > 4 ? 0.35 : 0) * (reduced ? 0 : 1) - speedFx) * Math.min(dt * 4, 1)
    heart += ((tired && !view.ending ? 1 : 0) - heart) * Math.min(dt * 3, 1)
    flash = Math.max(0, flash - dt * 2.4)
    grade.uniforms.uSpeed!.value = view.ending ? 0 : speedFx; grade.uniforms.uHeart!.value = reduced ? 0 : heart; grade.uniforms.uFlash!.value = flash * 0.5; grade.uniforms.uTime!.value = t; grade.uniforms.uClose!.value = Math.max(closeK, view.ending ? 1 : 0)
    composer.render()
    lastCalls = renderer.info.render.calls; lastTris = renderer.info.render.triangles
  }

  function resize(w: number, h: number) {
    viewW = w; viewH = h
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
    duskDress?.resize(w, h)
    cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix()
    grade.uniforms.uAspect!.value = w / Math.max(1, h)
  }

  const pv = new THREE.Vector3()
  function project(x: number, y: number, z: number) {
    pv.set(x, y, z).project(cam)
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight
    return {x: (pv.x * 0.5 + 0.5) * w, y: (-pv.y * 0.5 + 0.5) * h, visible: pv.z < 1}
  }

  // the loom ground (surfaces.ts): laid on when it arrives, never waited for; textures are shared by every run, so not disposed here
  let gone = false
  for (const name of Object.keys(grounds) as SurfaceName[]) if (grounds[name].length) void loadSurface(name).then(s2 => { if (s2 && !gone) grounds[name].forEach(m => dressSurface(m, name, s2, wet)) })
  // the kiln models (props.ts) take the place of the drawn pickups and bins when they arrive; the sticker keeps its printed face
  void loadProps().then(lib => {
    if (!lib || gone) return
    const mats = new Map<string, THREE.Material>(), paint2 = {p: skin.p, s: skin.s}
    pickups.forEach((p, i) => {
      const kind = level.pickups[i]?.kind, src = kind && kind !== 'sticker' ? lib.items.get(kind) : undefined
      if (!src) return
      p.item.clear(); p.item.add(propCopy(src, paint2, mats, keep, !lite))
    })
    if (lib.bin) bins.forEach(b => {
      const copy = propCopy(lib.bin!, paint2, mats, keep, !lite), lidSrc = copy.getObjectByName('binlid') ?? copy.children[0]
      if (!lidSrc) return
      b.g.children.filter(c => c !== b.wave).forEach(c => b.g.remove(c))
      const holder = new THREE.Group(); holder.position.y = 0.98
      lidSrc.removeFromParent(); lidSrc.position.y -= 0.98; holder.add(lidSrc)
      b.g.add(copy, holder); b.lid = holder
    })
  })

  function captionAt(spot: string) { const a = lifeDress?.anchor(spot); return a ? project(a.x, a.y, a.z) : null }
  function dispose() {
    gone = true
    scene.traverse(o2 => { const m = o2 as THREE.Mesh; if (m.isMesh) { m.geometry?.dispose?.() } })
    flowDress?.dispose()
    disposables.forEach(d => { try { d.dispose() } catch { /* already gone */ } })
    crowd.forEach(im => im.dispose())
    troupe?.dispose()
    composer.dispose()
    renderer.dispose()
    try { renderer.forceContextLoss() } catch { /* a lost context is a closed one */ }
  }

  // The key people in the clothes of their decade (owner, 28.11.2026). The looks are dressed bodies of about 1.4 MB each,
  // so nobody waits for them: the street opens on the plain bodies and each person changes when his look arrives. A phone
  // dresses the two faces the story is about (the boy and his father); a full machine dresses the whole street corner.
  let lookRows: LookRow[] = [], heroAge = spec.age
  const decadeNow = () => (level.hood && typeof level.hood.year === 'number' ? decadeOfYear(level.hood.year + (heroAge - 11)) : null)
  const dressHero = () => { if (troupe && level.hood && lookRows.length) troupe.wear(hero, heroAge < 19 ? lookFor(lookRows, {role: 'hero', club: spec.skin, decade: decadeNow(), age: heroAge}) : null) }
  const dressPeople = () => { if (!troupe || !level.hood || !lookRows.length) return; for (const [id, f] of named) { const role = ROLE_OF[id]; if (!role || (lite && id !== 'dad')) continue; const row = lookFor(lookRows, {role, club: spec.skin, decade: decadeNow()}); if (row) troupe.wear(f, row) } }
  if (troupe && level.hood) void lookIndex().then(ix => { if (gone) return; lookRows = ix; dressHero(); dressPeople() })
  const setAge = (age: number) => {
    if (!troupe || !level.hood) return
    const b = heroBody(age)
    troupe.recast(hero, b.cast, {height: b.height, child: b.child, pack: b.pack})
    child = b.child
    // the years pass for everybody: the boy's own look by his age, the street's people in the next decade's clothes
    const was = decadeNow(); heroAge = age; dressHero(); if (decadeNow() !== was) dressPeople()
  }
  const setClock = (minutes: number) => { clock = minutes }
  const stats = (): StageStats => ({calls: lastCalls, triangles: lastTris, ms: Math.round(govMs * 10) / 10, fps: Math.round(1000 / Math.max(1, govMs)), scale: SCALES[gov]!, mirror: mirrorN, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries})
  const profile = (byCalls = false) => {
    const rows = new Map<string, {name: string; tris: number; n: number; skinned: boolean}>()
    scene.traverseVisible(o2 => {
      const m = o2 as THREE.Mesh & {count?: number; isInstancedMesh?: boolean; isSkinnedMesh?: boolean}
      if (!(m.isMesh || (o2 as THREE.Points).isPoints) || !m.geometry) return
      const g = m.geometry, per = (g.index ? g.index.count : g.attributes.position?.count ?? 0) / 3, inst = m.isInstancedMesh ? m.count ?? 1 : 1
      let par: THREE.Object3D | null = o2, path = ''
      for (let d = 0; par && d < 4; d++, par = par.parent) path = (par.name || par.type) + (path ? '/' + path : '')
      const key = `${path}|${g.type}|${Math.round(per)}`, r = rows.get(key) ?? {name: `${path} ${g.type} ${Math.round(per)}t${m.isInstancedMesh ? ' x' + inst : ''}`, tris: 0, n: 0, skinned: !!m.isSkinnedMesh}
      r.tris += per * inst; r.n++; rows.set(key, r)
    })
    return [...rows.values()].sort((a, b) => byCalls ? b.n - a.n : b.tris - a.tris).slice(0, 40).map(r => ({...r, tris: Math.round(r.tris)}))
  }
  return {render, resize, project, captionAt, setAge, setClock, stats, profile, dispose}
}
