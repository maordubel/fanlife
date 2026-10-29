/**
 * LIFE · RUSH — the ground, seen close. Three tiles made with loom (`scripts/life/rush/surfaces.tx.js`):
 * asphalt, pavement slabs and a concrete floor, each shipped as colour + height + roughness.
 *
 * The normal map is built here from the height (a lossy normal map would bend the light), and the tiles are
 * laid in WORLD space — a slab is the same size on a 300-metre pavement and on a three-metre kerb, which the
 * street's stretched box UVs never were. Until the files arrive the canvas textures stay; if they never arrive
 * nothing changes. Every colour here is a grey: no surface carries a club's or a rival's colour.
 */
import * as THREE from 'three'

export type SurfaceName = 'asphalt' | 'slabs' | 'concrete' | 'boards' | 'tiles' | 'carpet'
/** metres one tile covers on the ground, how hard the relief reads, and the tone the tile is laid at (night streets are dark) */
/** `own`: an indoor floor carries its own colour and its own sheen (the street's tiles are grey and dull when dry) */
const SPEC: Record<SurfaceName, {tile: number; relief: number; tone: string; own?: boolean}> = {
  asphalt: {tile: 12, relief: 0.35, tone: '#8f9094'},
  slabs: {tile: 2.4, relief: 1, tone: '#d4d4d4'},
  concrete: {tile: 4, relief: 0.5, tone: '#cfcfcf'},
  // the flat (rule 130): oak boards, the kitchen's checker, his carpet — `scripts/life/rush/home.tx.js`
  boards: {tile: 3.6, relief: 0.6, tone: '#d9cbbd', own: true},
  tiles: {tile: 2.6, relief: 0.8, tone: '#e6e1d8', own: true},
  carpet: {tile: 1.6, relief: 0.5, tone: '#cdbcad', own: true},
}

type Loaded = {map: THREE.Texture; normal: THREE.Texture; rough: THREE.Texture}
const cache = new Map<SurfaceName, Promise<Loaded | null>>()

function image(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => rej(new Error(src)); im.src = src })
}
function wrap<T extends THREE.Texture>(t: T, srgb = false): T {
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.needsUpdate = true
  return t
}

/** a tangent-space normal (green up) from a tiling height map: central differences, wrapping at the edges */
export function normalFromHeight(px: Uint8ClampedArray, w: number, h: number, strength: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(w * h * 4)), at = (x: number, y: number) => px[(((y + h) % h) * w + ((x + w) % w)) * 4]! / 255
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength
    const nx = -dx, ny = dy, nz = 1, l = Math.hypot(nx, ny, nz), i = (y * w + x) * 4
    out[i] = Math.round((nx / l * 0.5 + 0.5) * 255); out[i + 1] = Math.round((ny / l * 0.5 + 0.5) * 255); out[i + 2] = Math.round((nz / l * 0.5 + 0.5) * 255); out[i + 3] = 255
  }
  return out
}

export function loadSurface(name: SurfaceName, base = '/life/rush/tex'): Promise<Loaded | null> {
  const hit = cache.get(name)
  if (hit) return hit
  const p = (async () => {
    try {
      const [albedo, height, rough] = await Promise.all(['albedo', 'height', 'rough'].map(k => image(`${base}/${name}-${k}.webp`)))
      const c = document.createElement('canvas'); c.width = height!.width; c.height = height!.height
      const g = c.getContext('2d', {willReadFrequently: true})!; g.drawImage(height!, 0, 0)
      const data = normalFromHeight(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height, 6 * SPEC[name].relief * (c.width / 512))
      const normal = new THREE.DataTexture(data, c.width, c.height, THREE.RGBAFormat)
      normal.generateMipmaps = true; normal.minFilter = THREE.LinearMipmapLinearFilter; normal.magFilter = THREE.LinearFilter
      return {map: wrap(new THREE.Texture(albedo!), true), normal: wrap(normal), rough: wrap(new THREE.Texture(rough!))}
    } catch { return null }
  })()
  cache.set(name, p)
  return p
}

/**
 * Lays a loaded surface on a material in world space (x/z on the ground). `wet`: the roughness tile is used
 * (puddles become mirrors); dry, the ground keeps one dull roughness and only the relief changes.
 */
export function dressSurface(mat: THREE.MeshStandardMaterial, name: SurfaceName, s: Loaded, wet: boolean) {
  mat.map = s.map; mat.normalMap = s.normal; mat.normalScale.set(1, 1)
  if (SPEC[name].own) { mat.roughnessMap = s.rough; mat.roughness = 1; mat.metalness = 0 }
  else if (wet) { mat.roughnessMap = s.rough; mat.roughness = 1; mat.metalness = Math.min(mat.metalness, 0.12) } else { mat.roughnessMap = null; mat.roughness = Math.max(mat.roughness, 0.78) }
  mat.color.set(SPEC[name].tone)
  const k = 1 / SPEC[name].tile
  mat.onBeforeCompile = sh => {
    sh.uniforms.uWorldUv = {value: k}
    sh.vertexShader = 'uniform float uWorldUv;\n' + sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
vec4 wPos = modelMatrix * vec4(position, 1.0);
#ifdef USE_INSTANCING
wPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
#endif
vec2 wUv = wPos.xz * uWorldUv;
#ifdef USE_MAP
vMapUv = wUv;
#endif
#ifdef USE_NORMALMAP
vNormalMapUv = wUv;
#endif
#ifdef USE_ROUGHNESSMAP
vRoughnessMapUv = wUv;
#endif`)
  }
  mat.customProgramCacheKey = () => `rush-ground-${name}-${wet ? 'w' : 'd'}`
  mat.needsUpdate = true
}
