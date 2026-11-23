/**
 * LIFE · the human kit — the skinned people the asset pipeline builds (docs/life/ASSETS-PIPELINE.md): nine MakeHuman
 * characters on one skeleton, one file of clips. Loaded once for the whole app (the GLBs, their textures and clips are
 * shared by every stage and never disposed per stage); a stage clones a character per person (`human.ts`).
 * Geometry is meshopt-compressed: the decoder is three's own module (wasm inside the script, nothing copied to public/).
 */
import * as THREE from 'three'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js'

export const CAST = ['boy', 'girl', 'teen', 'father', 'father_heavy', 'mother', 'mother_heavy', 'grandfather', 'grandmother'] as const
export type CastId = typeof CAST[number]
/** what a phone downloads: five bodies. A full machine takes all nine. */
export const CAST_LITE: readonly CastId[] = ['boy', 'father', 'mother', 'grandfather', 'teen']
/** who stands in for a character that is not loaded (the lite set covers every one) */
export const STAND_IN: Record<CastId, CastId> = {boy: 'boy', girl: 'boy', teen: 'teen', father: 'father', father_heavy: 'grandfather', mother: 'mother', mother_heavy: 'mother', grandfather: 'grandfather', grandmother: 'mother'}
export const ASSET_BASE = '/life/assets/'

export type Layer = 'full' | 'lo' | 'up' | 'arms'
/** the legs and the trunk under the ribs carry the walk; the chest, arms, neck and head carry what he says */
/** a hand that goes to somebody leaves the head to whoever he is looking at */
const HEAD = /^(neck_01|head|eye_)/
const LOWER = /^(Root|pelvis|spine_01|spine_02|thigh_|calf_|foot_|ball_)/
export type CharAsset = {
  id: CastId; scene: THREE.Object3D; height: number; hip: number; k: number; bytes: number
  clip(name: string, layer: Layer): THREE.AnimationClip | null
  /** one stride of the captured walk and run, in this body's metres */
  stride: {walk: number; run: number; walkT: number; runT: number}
}
type ClipSet = {clips: Map<string, THREE.AnimationClip>; hip: number; stride: {walk: number; run: number}; bytes: number}
type Manifest = {assets: {id: string; bytes: number; height?: number; hipHeight?: number}[]}

let LOADER: GLTFLoader | null = null
const loader = () => (LOADER ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder))
let MANIFEST: Promise<Manifest> | null = null
let CLIPS: Promise<ClipSet> | null = null
const CHARS = new Map<CastId, Promise<CharAsset>>()
const READY = new Map<CastId, CharAsset>()
let FAILED = false

const manifest = () => (MANIFEST ??= fetch(ASSET_BASE + 'manifest.json').then(r => { if (!r.ok) throw new Error('manifest'); return r.json() as Promise<Manifest> }))

/** how far the body travels in one turn of a stride played in place: the planted foot's speed backwards, times the clip */
function strideOf(scene: THREE.Object3D, clip: THREE.AnimationClip): number {
  const mixer = new THREE.AnimationMixer(scene), act = mixer.clipAction(clip); act.play()
  const foot = scene.getObjectByName('foot_l'); if (!foot) return 1.4
  const N = 40, pts: THREE.Vector3[] = []
  for (let i = 0; i <= N; i++) { act.time = clip.duration * i / N; mixer.update(0); scene.updateMatrixWorld(true); pts.push(foot.getWorldPosition(new THREE.Vector3())) }
  mixer.stopAllAction(); mixer.uncacheRoot(scene)
  let lowest = Infinity; for (const p of pts) lowest = Math.min(lowest, p.y)
  let sum = 0, n = 0
  for (let i = 0; i < N; i++) if (pts[i]!.y < lowest + 0.035 && pts[i + 1]!.y < lowest + 0.035) { sum += pts[i]!.z - pts[i + 1]!.z; n++ }
  // the planted foot goes back at the pace the body goes forward
  return n > 2 && sum > 0 ? sum / n * N : 1.4
}

function loadClips(): Promise<ClipSet> {
  return (CLIPS ??= Promise.all([loader().loadAsync(ASSET_BASE + 'clips/clips.glb'), manifest()]).then(([g, m]) => {
    const clips = new Map(g.animations.map(a => [a.name, a] as const))
    const hip = m.assets.find(a => a.id === 'clips')?.hipHeight ?? 0.95
    const walk = clips.get('walk'), run = clips.get('run')
    return {clips, hip, bytes: m.assets.find(a => a.id === 'clips')?.bytes ?? 0, stride: {walk: walk ? strideOf(g.scene, walk) : 1.4, run: run ? strideOf(g.scene, run) : 2.6}}
  }))
}

/** skin that is alive at dusk, eyes that are wet, teeth that are not black: once per character, shared by every clone */
function dress(scene: THREE.Object3D): void {
  const seen = new Set<THREE.Material>()
  scene.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh) return
    m.frustumCulled = false; m.castShadow = true; m.receiveShadow = false
    const mats = Array.isArray(m.material) ? m.material : [m.material]
    for (const mat of mats as THREE.MeshStandardMaterial[]) {
      if (seen.has(mat)) continue
      seen.add(mat)
      const n = mat.name
      if (n === 'skin') { mat.roughness = 0.6; mat.emissiveMap = mat.map; mat.emissive = new THREE.Color('#ff9a70'); mat.emissiveIntensity = 0.2; mat.envMapIntensity = 1.3 }
      else if (n.endsWith('_eyes')) { mat.roughness = 0.08; mat.envMapIntensity = 2.2; mat.emissiveMap = mat.map; mat.emissive = new THREE.Color('#ffffff'); mat.emissiveIntensity = 0.3 }
      else if (n.endsWith('_teeth')) { mat.emissiveMap = mat.map; mat.emissive = new THREE.Color('#fff2e6'); mat.emissiveIntensity = 0.22; mat.roughness = 0.35 }
      else if (n.endsWith('_hair')) { mat.roughness = 0.62; mat.emissiveMap = mat.map; mat.emissive = new THREE.Color('#ffd0a8'); mat.emissiveIntensity = 0.08; mat.alphaTest = 0.4; mat.side = THREE.DoubleSide }
      else if (n === 'tint_top' || n.includes('_clothes')) { mat.emissiveMap = mat.map; mat.emissive = new THREE.Color('#ffffff'); mat.emissiveIntensity = 0.05 }
      if (mat.map) mat.map.anisotropy = 4
    }
  })
}

export function loadChar(id: CastId): Promise<CharAsset> {
  let p = CHARS.get(id)
  if (!p) {
    p = Promise.all([loader().loadAsync(ASSET_BASE + `cast/${id}.glb`), loadClips(), manifest()]).then(([g, cs, m]) => {
      const row = m.assets.find(a => a.id === id)
      const hip = row?.hipHeight ?? 0.95, height = row?.height ?? 1.75, k = hip / cs.hip
      dress(g.scene)
      const made = new Map<string, THREE.AnimationClip | null>()
      const clip = (name: string, layer: Layer) => {
        const key = name + '.' + layer
        if (made.has(key)) return made.get(key)!
        const src = cs.clips.get(name)
        let out: THREE.AnimationClip | null = null
        if (src) {
          const tracks = src.tracks.filter(t => { const lo = LOWER.test(t.name); return layer === 'full' || (layer === 'lo' ? lo : layer === 'arms' ? !lo && !HEAD.test(t.name) : !lo) })
            .map(t => { if (t.name !== 'pelvis.position') return t; const c = t.clone(); for (let i = 0; i < c.values.length; i++) c.values[i]! *= k; return c })
          out = new THREE.AnimationClip(key, src.duration, tracks)
        }
        made.set(key, out)
        return out
      }
      const a: CharAsset = {id, scene: g.scene, height, hip, k, bytes: row?.bytes ?? 0, clip,
        stride: {walk: cs.stride.walk * k, run: cs.stride.run * k, walkT: cs.clips.get('walk')?.duration ?? 1.1, runT: cs.clips.get('run')?.duration ?? 0.74}}
      READY.set(id, a)
      return a
    })
    p.catch(() => { /* the caller falls back to the classic figure */ })
    CHARS.set(id, p)
  }
  return p
}

/** a character that is already here (a stage builds people synchronously), or null */
export const charNow = (id: CastId): CharAsset | null => READY.get(id) ?? null
export const kitFailed = () => FAILED

/**
 * Before the stage is built: the boy and his father (and the clips) must be there, the others arrive behind them.
 * Resolves false when the kit cannot be had in time (the classic figures play instead) — nothing waits on a file for ever.
 */
export function preloadHumans(lite: boolean, timeoutMs = 20000): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  const need: CastId[] = ['boy', 'father'], rest = (lite ? CAST_LITE : CAST).filter(c => !need.includes(c))
  const core = Promise.all(need.map(loadChar)).then(() => { rest.reduce((p, c) => p.then(() => loadChar(c).then(() => undefined, () => undefined)), Promise.resolve()); return true }, () => { FAILED = true; return false })
  return Promise.race([core, new Promise<boolean>(res => window.setTimeout(() => res(READY.has('boy') && READY.has('father')), timeoutMs))])
}
/** the bytes of the people a stage of this quality asks for (for the report and the tests) */
export async function humanBytes(lite: boolean): Promise<number> {
  const m = await manifest(), ids = new Set<string>([...(lite ? CAST_LITE : CAST), 'clips'])
  return m.assets.filter(a => ids.has(a.id)).reduce((s, a) => s + a.bytes, 0)
}
