/**
 * LIFE · the hood at dusk — the look-dev rig (visual floor 23.11.2026, refs 02/05/07).
 *
 * Only DRESSES: a graded sky dome, a sky-lit environment map, a wet street (planar mirror at reduced resolution blended by a
 * puddle mask: the cheapest method that reflects lamps, windows AND the sky, which stretched decals cannot), lamps with glow
 * and pools, string lights and bunting (club colours only, no national flags), stalls, parked and slow cars, trees with
 * volume, balconies and awnings on every facade, a stand silhouette and four floodlight towers over the roofs at the end.
 * Every glow is a Points draw (one call each); `lite` drops the mirror to a third of the screen and trims counts.
 * Warm light is orange-amber (hue under 30 degrees), never yellow.
 */
import * as THREE from 'three'
import {Reflector} from 'three/examples/jsm/objects/Reflector.js'
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type {VoxelSkin} from '@/lib/life/universal/skin'
import type {Level} from '@/lib/life/rush/level'
import {decadeOf, lampTone} from '../era'
import {dressTown, shopTexture, shutterTexture, signMarks, type Front, type Town} from './town'

export const DUSK = {
  fog: '#8d93ad', fogDensity: 0.0074, exposure: 1.05,
  amber: '#ffa862', cream: '#ffc79a', cool: '#a8c6ff',
}
export type Block = {x: number; z: number; w: number; h: number; c: string}
export type DuskCtx = {
  scene: THREE.Scene; renderer: THREE.WebGLRenderer; level: Level; skin: VoxelSkin; lite: boolean; skyline: boolean
  keep: <T extends {dispose(): void}>(x: T) => T; rnd: () => number; glowTex: THREE.Texture
  allowed: (l: readonly string[]) => string[]; banned: (h: string) => boolean
  sign: (text: string, bg: string, fg: string, w?: number, h?: number) => THREE.Texture
  blocks: Block[]; facadeMats: THREE.MeshStandardMaterial[]
  /** the club (the port's cranes are Piraeus' own) */
  clubId?: string
}
export type Dusk = {update(sim: {x: number; z: number}, t: number, dt: number, cam: THREE.Vector3): void; resize(w: number, h: number): void
  /** the procedural fronts of the main street (frames, shutters, balconies, cornices, roof kit, lit shops): what the Flow facades replace */
  front: THREE.Object3D[]
  /** the stand wings and floodlight towers at the end of the road (hidden when a picture of the ground takes their place) */
  ground: THREE.Object3D
  /** the buildings the street now wears (the Flow pictures, once they are in): the town hangs its balconies on them */
  onFronts(list: Front[]): void}

const C = (h: THREE.ColorRepresentation) => new THREE.Color(h)
const HDR = (h: string, k: number) => C(h).multiplyScalar(k)

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}

const SKY_STOPS: [number, string][] = [[0, '#f0a878'], [0.045, '#d9929a'], [0.15, '#8d86ad'], [0.34, '#456aa6'], [0.62, '#1f3a7c'], [1, '#0c1a4c']]
export function skyMaterial() {
  return new THREE.ShaderMaterial({side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {uC: {value: SKY_STOPS.map(s => C(s[1]))}, uS: {value: SKY_STOPS.map(s => s[0])}, uBelow: {value: C(DUSK.fog)}, uSun: {value: new THREE.Vector3(0, 0.03, -1).normalize()}},
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform vec3 uC[6]; uniform float uS[6]; uniform vec3 uBelow,uSun; varying vec3 vD;
      void main(){ vec3 d=normalize(vD); float e=d.y; vec3 c=uC[0];
        for(int i=0;i<5;i++){ float t=clamp((e-uS[i])/(uS[i+1]-uS[i]),0.,1.); c=mix(c,uC[i+1],t*t*(3.-2.*t)); }
        c=mix(c,uBelow,smoothstep(0.,-0.12,e));
        float s=max(dot(d,uSun),0.); c+=vec3(1.,.5,.32)*(pow(s,5.)*.12+pow(s,40.)*.15);
        gl_FragColor=vec4(c,1.); }`})
}

/** puddles in R, ripples in G/B: soft blobs, mirrored at the edges so the tile never seams */
function maskTexture(rnd: () => number) {
  const t = canvasTex(256, 256, g => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256); g.globalCompositeOperation = 'lighter'
    const blob = (x: number, y: number, r: number, col: string, a: number) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2) }
    for (let i = 0; i < 46; i++) blob(rnd() * 256, rnd() * 256, 14 + rnd() * 40, '255,0,0', 0.5)
    for (let i = 0; i < 700; i++) blob(rnd() * 256, rnd() * 256, 2 + rnd() * 5, rnd() < 0.5 ? '0,255,0' : '0,0,255', 0.35)
  }, false)
  t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping
  return t
}

const WET_FRAG = `uniform vec3 color; uniform sampler2D tDiffuse,tMask; uniform float uTime,uBase,uPud,uFog;
  varying vec4 vUv; varying vec3 vW;
  void main(){
    vec4 m=texture2D(tMask,vW.xz*0.05), r=texture2D(tMask,vW.xz*0.6+vec2(uTime*0.012,0.));
    float pud=smoothstep(.2,.55,m.r);
    vec3 V=cameraPosition-vW; float dist=length(V); V/=dist;
    float fr=pow(1.-clamp(V.y,0.,1.),2.2);
    vec2 n=(r.gb-.3)*(0.5+(1.-pud)); vec4 uv=vUv; uv.xy+=n*0.014*uv.w;
    vec2 p=uv.xy/uv.w; float bx=0.0025+(1.-pud)*0.004, by=0.008+(1.-pud)*0.012;
    vec3 c=texture2D(tDiffuse,p).rgb*.28;
    c+=texture2D(tDiffuse,p+vec2(bx,by)).rgb*.18+texture2D(tDiffuse,p+vec2(-bx,by)).rgb*.18;
    c+=texture2D(tDiffuse,p+vec2(0.,by*2.2)).rgb*.2+texture2D(tDiffuse,p+vec2(0.,-by*1.2)).rgb*.16;
    float a=(uBase+uPud*pud)*(.3+.7*fr); a*=mix(1.,.6,1.-exp(-pow(dist*uFog,2.)));
    gl_FragColor=vec4(c*color,clamp(a,0.,.94)); }`

export function dressDusk(x: DuskCtx): Dusk {
  const {scene, renderer, level, skin, lite, keep, rnd, glowTex} = x
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]!
  // the street lamps of the story's decade: sodium orange into the nineties, whiter LED after (era.ts)
  const year = level.hood?.year ?? null, lampC = lampTone(typeof year === 'number' ? decadeOf(year) : null)
  const taken: {x: number; z: number; r: number}[] = []
  const half = level.half, walk = level.walk, goalZ = level.goal.z, zTop = level.bounds.z1
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), p3 = new THREE.Vector3(), s3 = new THREE.Vector3()
  const put = (im: THREE.InstancedMesh, i: number, px: number, py: number, pz: number, sx = 1, sy = 1, sz = 1, ry = 0, rz = 0) => { q.setFromEuler(e.set(0, ry, rz)); im.setMatrixAt(i, m4.compose(p3.set(px, py, pz), q, s3.set(sx, sy, sz))) }
  const box = keep(new THREE.BoxGeometry(1, 1, 1))
  const nearCross = (z: number, m = 9) => level.crossings.some(c => Math.abs(z - c) < m)
  const group = new THREE.Group(); scene.add(group)
  const front: THREE.Object3D[] = []
  const add = <T extends THREE.Object3D>(o: T) => { group.add(o); return o }
  const instanced = (g: THREE.BufferGeometry, m: THREE.Material, n: number) => { const im = new THREE.InstancedMesh(g, m, Math.max(1, n)); im.frustumCulled = false; return add(im) }
  const std = (c: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) => keep(new THREE.MeshStandardMaterial({color: c, roughness: 0.8, ...o}))
  const glowPoints = (pos: Float32Array, size: number, col: THREE.Color) => {
    const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const pts = new THREE.Points(g, keep(new THREE.PointsMaterial({map: glowTex, size, sizeAttenuation: true, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false})))
    pts.frustumCulled = false; return add(pts)
  }

  /* ---- sky dome + the environment it lights ---- */
  const skyM = keep(skyMaterial()), skyG = keep(new THREE.SphereGeometry(1400, lite ? 24 : 40, lite ? 12 : 20))
  const dome = new THREE.Mesh(skyG, skyM); dome.frustumCulled = false; dome.renderOrder = -100; scene.add(dome)
  try {
    const pm = new THREE.PMREMGenerator(renderer), envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(skyG, skyM))
    const rt = pm.fromScene(envScene, 0.03); scene.environment = rt.texture; scene.environmentIntensity = 0.7; keep(rt); pm.dispose()
  } catch { /* no environment: the lamps still light it */ }

  /* ---- the wet street: one mirror at reduced resolution, blended by a puddle mask ---- */
  const span = zTop + 30 - (goalZ - 60), zMid = (zTop + 30 + goalZ - 60) / 2
  const shader = {name: 'WetMirror', uniforms: {color: {value: null}, tDiffuse: {value: null}, textureMatrix: {value: null}, tMask: {value: null}, uTime: {value: 0}, uBase: {value: 0.22}, uPud: {value: 0.56}, uFog: {value: DUSK.fogDensity}},
    vertexShader: 'uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW; void main(){ vUv=textureMatrix*vec4(position,1.); vW=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: WET_FRAG}
  const refl = new Reflector(keep(new THREE.PlaneGeometry(half * 2, span)), {color: '#ffffff', textureWidth: 256, textureHeight: 512, multisample: 0, shader})
  const mask = keep(maskTexture(rnd)); (refl.material as THREE.ShaderMaterial).uniforms.tMask!.value = mask
  const mat = refl.material as THREE.ShaderMaterial; mat.transparent = true; mat.depthWrite = false; keep(refl.getRenderTarget()); keep(mat)
  refl.rotation.x = -Math.PI / 2; refl.position.set(0, 0.022, zMid); refl.renderOrder = 5; add(refl)
  const overlays: THREE.Mesh[] = []
  const overlay = (w: number, d: number, px: number, py: number, pz: number, base: number, pud: number) => {
    const u = {...mat.uniforms, uBase: {value: base}, uPud: {value: pud}}
    const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2)), keep(new THREE.ShaderMaterial({uniforms: u, vertexShader: shader.vertexShader, fragmentShader: WET_FRAG, transparent: true, depthWrite: false})))
    m.position.set(px, py, pz); m.renderOrder = 6; overlays.push(m); add(m)
  }
  for (const s of [-1, 1]) overlay(walk - half, span, s * (half + (walk - half) / 2), 0.172, zMid, 0.1, 0.22)
  for (const c of level.crossings) for (const s of [-1, 1]) overlay(level.side - half, 8.2, s * (half + (level.side - half) / 2), 0.024, c, 0.2, 0.42)
  const orig = refl.onBeforeRender
  refl.onBeforeRender = function (this: THREE.Mesh, ...a: Parameters<THREE.Object3D['onBeforeRender']>) { overlays.forEach(o => { o.visible = false }); orig.apply(this, a); overlays.forEach(o => { o.visible = true }) }
  const mirrorScale = lite ? 0.33 : 0.5
  // road details: edge lines, manholes, patches
  { const worn = keep(canvasTex(16, 128, g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 16, 128); for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(0,0,0,${0.4 + rnd() * 0.6})`; g.fillRect(rnd() * 16, rnd() * 128, 2 + rnd() * 6, 2 + rnd() * 10) } }, false))
    const n = Math.floor(span / 4), edge = instanced(box, std('#cfcabd', {roughness: 0.55, alphaMap: worn, transparent: true, depthWrite: false}), n * 2)
    for (let k = 0; k < n; k++) for (const [j, s] of [-1, 1].entries()) put(edge, k * 2 + j, s * (half - 0.45), 0.012, zTop + 30 - k * 4, 0.12, 0.01, 2.4)
    const mh = instanced(keep(new THREE.CylinderGeometry(0.4, 0.4, 0.02, 18)), std('#2c2e34', {metalness: 0.7, roughness: 0.4}), 14)
    for (let k = 0; k < 14; k++) put(mh, k, (rnd() - 0.5) * 8, 0.015, zTop - 8 - k * 24)
    const patch = instanced(box, std('#15161a', {roughness: 0.35}), 16)
    for (let k = 0; k < 16; k++) put(patch, k, (rnd() - 0.5) * 10, 0.01, zTop - 4 - rnd() * (zTop - goalZ), 1.2 + rnd() * 2.4, 0.01, 2 + rnd() * 4) }

  /* ---- street lamps: pole, arm, lit head, glow, light pool ---- */
  const lampZ: number[] = []; for (let z = zTop + 4; z > goalZ + 20; z -= 16) lampZ.push(z)
  { const nL = lampZ.length * 2
    const poles = instanced(keep(new THREE.CylinderGeometry(0.07, 0.1, 6.8, 8)), std('#23252c', {metalness: 0.5}), nL)
    const arms = instanced(box, std('#23252c', {metalness: 0.5}), nL)
    const heads = instanced(box, keep(new THREE.MeshBasicMaterial({color: HDR(lampC.head, 5), toneMapped: false})), nL)
    const pools = instanced(keep(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({map: glowTex, color: HDR(lampC.pool, 0.95), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending})), nL)
    const gl = new Float32Array(nL * 3); let i = 0
    lampZ.forEach((z, k) => { for (const s of [-1, 1]) { const zz = z + (s > 0 ? 8 : 0), bx = s * (half + 1.2)
      put(poles, i, bx, 3.4, zz); put(arms, i, bx - s * 0.9, 6.75, zz, 1.9, 0.1, 0.1); put(heads, i, bx - s * 1.7, 6.66, zz, 0.9, 0.14, 0.42); put(pools, i, bx - s * 2.2, 0.035, zz, 11, 1, 11)
      gl.set([bx - s * 1.7, 6.6, zz], i * 3); i++ } void k })
    glowPoints(gl, lite ? 3.6 : 4.8, HDR(lampC.head, 1.1)) }

  /* ---- string lights high across the street, and on every other span the club's own cloth: small pennants or a scarf
     garland in its two colours (colour policy; never a national flag). Kept high and light so the street and the ground
     at its end are the picture, not the bunting. ---- */
  { const spans: number[] = []; for (let z = 2; z > goalZ + 30; z -= 19) if (!nearCross(z, 5)) spans.push(z)
    const NB = 22, wy = (xx: number, H: number, sag: number) => H - sag * (1 - (xx / (walk - 0.3)) ** 2)
    const bulbs = new Float32Array(spans.length * NB * 3), wire: number[] = []
    const tri = keep(new THREE.BufferGeometry()); tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.2, 0, 0, 0.2, 0, 0, 0, -0.5, 0]), 3))
    const NP = 14, NS = 18
    const pens = instanced(tri, keep(new THREE.MeshBasicMaterial({color: '#ffffff', side: THREE.DoubleSide})), spans.length * NP)
    // a scarf: short bars, alternating the club's two colours, hung on the line like a long knitted scarf
    const bar = keep(new THREE.BoxGeometry(1, 0.15, 0.03))
    const scarf = instanced(bar, keep(new THREE.MeshBasicMaterial({color: '#ffffff'})), spans.length * NS)
    // never yellow (rule 8), whatever the club wears: a yellow kit's cloth is hung in its other colour and cream
    const yellowish = (h: string) => { const c = C(h), o = {h: 0, s: 0, l: 0}; c.getHSL(o, THREE.SRGBColorSpace); return o.s > 0.2 && o.h * 360 >= 36 && o.h * 360 <= 72 }
    const cream = x.allowed(['#efe6da'])[0]!, cols0 = x.allowed([skin.p, skin.s]).filter(c => !yellowish(c)), cols = cols0.length ? cols0 : [cream, '#8a8f99']
    let bi = 0, pi = 0, si = 0
    spans.forEach((z, k) => {
      const H = 11.2 + (k % 3) * 0.4
      for (let j = 0; j < NB; j++) { const xx = -(walk - 0.6) + j * ((walk - 0.6) * 2 / (NB - 1)); bulbs.set([xx, wy(xx, H, 1.1) - 0.05, z], bi * 3); bi++
        if (j) { const x0 = xx - (walk - 0.6) * 2 / (NB - 1); wire.push(x0, wy(x0, H, 1.1), z, xx, wy(xx, H, 1.1), z) } }
      if (k % 2) return
      const H2 = H - 0.5, sag = 0.9
      if (k % 4 === 0) for (let j = 0; j < NP; j++) {
        const xx = -(walk - 1.2) + j * ((walk - 1.2) * 2 / (NP - 1))
        e.set(0, (rnd() - 0.5) * 0.3, 0); q.setFromEuler(e); pens.setMatrixAt(pi, m4.compose(p3.set(xx, wy(xx, H2, sag), z + 0.2), q, one)); pens.setColorAt(pi, C(j % 2 ? cream : cols[0]!).multiplyScalar(0.55)); pi++ }
      else for (let j = 0; j < NS; j++) {
        const t = (j + 0.5) / NS, xx = -(walk - 1.2) + t * (walk - 1.2) * 2, w = (walk - 1.2) * 2 / NS
        const dy = wy(xx + w / 2, H2, sag) - wy(xx - w / 2, H2, sag)
        q.setFromEuler(e.set(0, 0, Math.atan2(dy, w))); scarf.setMatrixAt(si, m4.compose(p3.set(xx, wy(xx, H2, sag) - 0.12, z + 0.2), q, s3.set(w * 1.02, 1, 1))); scarf.setColorAt(si, C(cols[j % cols.length]!).multiplyScalar(0.6)); si++ }
    })
    pens.count = pi; scarf.count = si
    glowPoints(bulbs, 0.5, HDR(DUSK.cream, 2))
    const wg = keep(new THREE.BufferGeometry()); wg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(wire), 3))
    add(new THREE.LineSegments(wg, keep(new THREE.LineBasicMaterial({color: '#1c1b22'})))) }

  /* ---- facades: cornices, pilasters, rooftops, balconies, awnings, lit shop fronts ---- */
  { const B = x.blocks
    const cornice = instanced(box, std('#d9d1c4'), B.length), tank = instanced(keep(new THREE.CylinderGeometry(0.9, 0.9, 1.7, 10)), std('#6d727c'), B.length * 2), acs = instanced(box, std('#8a8f98'), B.length * 3)
    const pil = instanced(box, std('#b9b0a2'), B.length * 2)
    const bal = new THREE.BoxGeometry(1.7, 0.12, 1.0).translate(0, 0, 0.5)
    const rails = [new THREE.BoxGeometry(1.7, 0.06, 0.05).translate(0, 0.95, 1.0), new THREE.BoxGeometry(0.05, 0.06, 1.0).translate(-0.82, 0.95, 0.5), new THREE.BoxGeometry(0.05, 0.06, 1.0).translate(0.82, 0.95, 0.5), new THREE.BoxGeometry(1.7, 0.04, 0.04).translate(0, 0.5, 1.0)]
    const balG = keep(mergeGeometries([bal, ...rails])!)
    const nBal = B.reduce((a, b) => a + Math.floor(b.h / 3.2) * Math.floor(b.w / 2.6), 0)
    const bals = instanced(balG, std('#2d3038', {roughness: 0.6}), Math.ceil(nBal * 0.4))
    const shops = instanced(keep(new THREE.PlaneGeometry(1, 1)), keep(new THREE.MeshBasicMaterial({color: '#ffffff', map: keep(shopTexture(rnd)), toneMapped: false})), B.length)
    const shut = instanced(keep(new THREE.PlaneGeometry(1, 1)), std('#ffffff', {map: keep(shutterTexture(rnd)), roughness: 0.6, metalness: 0.3}), B.length); let hi = 0
    // awning: slats alternating the club's colour and cream, baked as vertex colours
    const slat = (col: string, z0: number) => { const g = new THREE.BoxGeometry(1.7, 0.08, 0.48).translate(0, 0, z0); const c = C(col), n = g.attributes.position!.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g }
    const awnG = (a: string) => keep(mergeGeometries([0, 1, 2, 3, 4, 5].map(k => slat(k % 2 ? '#efe6da' : a, (k - 2.5) * 0.48)))!)
    const aw = x.allowed([skin.p, skin.s, '#2d3a52']), awnA = instanced(awnG(aw[0]!), keep(new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.85, emissive: C('#5a2a1a'), emissiveIntensity: 0.4})), B.length * 3), awnB = instanced(awnG(aw[1] ?? aw[0]!), keep(new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.85, emissive: C('#5a2a1a'), emissiveIntensity: 0.4})), B.length * 3)
    let ci = 0, ti = 0, ai = 0, pi = 0, bi = 0, si = 0, a1 = 0, a2 = 0
    for (const b of B) {
      const s = Math.sign(b.x), fx = s * walk
      put(cornice, ci, s * (walk - 0.3), b.h + 0.15, b.z, 0.9, 0.4, b.w + 0.1); cornice.setColorAt(ci, C(b.c).multiplyScalar(0.9)); ci++
      for (const dz of [-1, 1]) { put(pil, pi++, s * (walk - 0.22), b.h / 2, b.z + dz * (b.w / 2 - 0.28), 0.45, b.h, 0.5) }
      if (rnd() < 0.7) put(tank, ti++, s * (walk + 3 + rnd() * 4), b.h + 1.1, b.z + (rnd() - 0.5) * b.w * 0.6)
      for (let k = 0; k < 2; k++) if (rnd() < 0.8) put(acs, ai++, s * (walk + 1 + rnd() * 7), b.h + 0.5, b.z + (rnd() - 0.5) * b.w * 0.8, 1.4, 1, 1.0 + rnd())
      for (let fl = 2; fl * 3.2 + 1 < b.h; fl++) for (let k = 0; k < Math.floor(b.w / 2.6); k++) if (rnd() < 0.38 && bi < bals.count) { put(bals, bi++, s * (walk - 0.04), fl * 3.2 - 0.4, b.z + b.w / 2 - 1.3 - k * 2.6, 1, 1, s > 0 ? -1 : 1, s > 0 ? Math.PI / 2 : -Math.PI / 2) }
      const shopC = pick([DUSK.amber, DUSK.cream, '#ffd8b4', DUSK.cool]); if (rnd() < 0.85) { q.setFromEuler(e.set(0, -s * Math.PI / 2, 0)); shops.setMatrixAt(si, m4.compose(p3.set(s * (walk - 0.03), 1.35, b.z), q, s3.set(b.w - 1.6, 2.2, 1))); shops.setColorAt(si, HDR(shopC, 0.9 + rnd() * 0.5)); si++
        // the shutter half down at dusk (or down all the way where the shop has gone home)
        const down = rnd() < 0.35 ? 2.2 : 0.6 + rnd() * 0.8; shut.setMatrixAt(hi++, m4.compose(p3.set(s * (walk - 0.05), 2.45 - down / 2, b.z), q, s3.set(b.w - 1.5, down, 1))) }
      for (let k = 0; k < Math.floor(b.w / 3); k++) { const zz = b.z - b.w / 2 + 1.5 + k * 3; if (rnd() < 0.7) { const im = rnd() < 0.5 ? awnA : awnB; const idx = im === awnA ? a1++ : a2++
        // slats run along z, the awning drops toward the street
        q.setFromEuler(e.set(0, s > 0 ? Math.PI : 0, s * 0.25 * (s > 0 ? -1 : 1))); void idx
        im.setMatrixAt(idx, m4.compose(p3.set(s * (walk - 0.85), 2.75, zz), q, s3.set(1, 1, 1))) } }
    }
    cornice.count = ci; tank.count = ti; acs.count = ai; pil.count = pi; bals.count = bi; shops.count = si; shut.count = hi; awnA.count = a1; awnB.count = a2
    front.push(cornice, tank, acs, pil, bals, shops, shut) }


  /* ---- real facades: the town's own wall texture in metres, damp toward the ground, with frames, sills, shutters, plants ---- */
  { const key = ({ath: 'athens', tlv: 'tel-aviv', mos: 'mostar', ham: 'hamburg', gla: 'glasgow'} as Record<string, string>)[skin.town ?? ''] ?? 'glasgow'
    const loader = new THREE.TextureLoader()
    const wall = loader.load(`/life/town/tex/walls/${key}-a.webp`, t => { t.needsUpdate = true; x.facadeMats.forEach(m => { m.needsUpdate = true }) })
    wall.wrapS = wall.wrapT = THREE.RepeatWrapping; wall.colorSpace = THREE.SRGBColorSpace; wall.anisotropy = 4; keep(wall)
    for (const m of x.facadeMats) {
      m.map = wall; m.bumpMap = wall; m.bumpScale = 2.2; m.roughness = 0.9
      m.onBeforeCompile = sh => {
        sh.vertexShader = 'varying float vWy;\n' + sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
          vec4 wP = modelMatrix * instanceMatrix * vec4(position, 1.0); vWy = wP.y;
          vec2 wUv = vec2(wP.x + wP.z, wP.y) * vec2(0.17, 0.22);
          #ifdef USE_MAP
          vMapUv = wUv;
          #endif
          #ifdef USE_BUMPMAP
          vBumpMapUv = wUv;
          #endif`)
        sh.fragmentShader = 'varying float vWy;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
          diffuseColor.rgb *= mix(0.5, 1.0, smoothstep(0.0, 4.5, vWy)) * (0.85 + 0.15 * smoothstep(8.0, 20.0, vWy));`)
      }
      m.customProgramCacheKey = () => 'dusk-facade'; m.needsUpdate = true
    }
    const B = x.blocks, rows: {s: number; px: number; py: number; pz: number}[] = []
    for (const b of B) { const s = Math.sign(b.x); for (let fl = 1; fl * 3.2 + 1 < b.h; fl++) for (let k = 0; k < Math.floor(b.w / 2.6); k++) rows.push({s, px: s * (walk - 0.04), py: fl * 3.2 + 0.4, pz: b.z + b.w / 2 - 1.3 - k * 2.6}) }
    const fb = (w: number, h: number, d: number, px: number, py: number, pz: number) => new THREE.BoxGeometry(w, h, d).translate(px, py, pz)
    const frameG = keep(mergeGeometries([fb(1.42, 0.09, 0.14, 0, 0.84, 0.06), fb(1.42, 0.09, 0.14, 0, -0.84, 0.06), fb(0.09, 1.7, 0.14, -0.66, 0, 0.06), fb(0.09, 1.7, 0.14, 0.66, 0, 0.06), fb(0.05, 1.6, 0.06, 0, 0, 0.03), fb(1.62, 0.09, 0.3, 0, -0.93, 0.15)])!)
    const frames = instanced(frameG, std('#e4ddd0', {roughness: 0.7}), rows.length)
    const shutG = keep(mergeGeometries([fb(0.5, 1.6, 0.05, -0.98, 0, 0.05), fb(0.5, 1.6, 0.05, 0.98, 0, 0.05)])!), shutters = instanced(shutG, std('#ffffff', {roughness: 0.8}), rows.length)
    const acG = keep(new THREE.BoxGeometry(0.8, 0.5, 0.45)), acu = instanced(acG, std('#c9ccd2', {roughness: 0.6}), rows.length)
    const shCols = x.allowed(['#5f7f66', '#7a8aa8', '#a9856a', '#6e7b88', '#b5aea0']); let fi = 0, si = 0, ai = 0
    for (const r of rows) { put(frames, fi++, r.px, r.py, r.pz, 1, 1, 1, -r.s * Math.PI / 2)
      if (rnd() < 0.3) { put(shutters, si, r.px, r.py, r.pz, 1, 1, 1, -r.s * Math.PI / 2); shutters.setColorAt(si, C(pick(shCols))); si++ }
      if (rnd() < 0.1) put(acu, ai++, r.px - r.s * 0.4, r.py - 1.35, r.pz, 1, 1, 1, -r.s * Math.PI / 2) }
    frames.count = fi; shutters.count = si; acu.count = ai; front.push(frames, shutters, acu)
    // drainpipes and cables between the facades
    const pipes = instanced(keep(new THREE.CylinderGeometry(0.06, 0.06, 1, 8)), std('#6a6a70', {metalness: 0.4}), B.length)
    B.forEach((b, i) => put(pipes, i, Math.sign(b.x) * (walk - 0.12), b.h / 2, b.z - b.w / 2 + 0.95, 1, b.h, 1)); front.push(pipes)
    const cab: number[] = []; for (let z = -9; z > goalZ + 30; z -= 29) { const H = 7.4 + rnd() * 1.2; for (let k = 0; k < 14; k++) { const a = -walk + k * (walk * 2 / 14), b2 = a + walk * 2 / 14, y = (xx: number) => H - 0.7 * (1 - (xx / walk) ** 2); cab.push(a, y(a), z, b2, y(b2), z) } }
    const cg = keep(new THREE.BufferGeometry()); cg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cab), 3)); add(new THREE.LineSegments(cg, keep(new THREE.LineBasicMaterial({color: '#0e0e12'}))))
    // plants and laundry on the balconies' rails
    const green = !x.banned('#2f4a33'), pl = instanced(keep(new THREE.IcosahedronGeometry(0.22, 1)), std('#3b5e34', {roughness: 0.9}), 260), ln = instanced(keep(new THREE.PlaneGeometry(0.5, 0.7)), keep(new THREE.MeshStandardMaterial({color: '#ffffff', side: THREE.DoubleSide, roughness: 0.9})), 120)
    const lc = x.allowed(['#e8e4dc', '#8aa6c8', '#c86a5a', '#b8c8d8', '#d8d0c4']); let pn = 0, ln2 = 0
    for (const r of rows) if (r.py > 4 && rnd() < 0.18) { const o = -r.s * 0.95
      if (green && pn < 258 && rnd() < 0.6) { put(pl, pn++, r.px + o, r.py - 0.2, r.pz - 0.4, 1, 1.2, 1); put(pl, pn++, r.px + o, r.py - 0.2, r.pz + 0.4, 1, 1.2, 1) }
      else if (ln2 < 120) { put(ln, ln2, r.px + o, r.py + 0.1, r.pz, 1, 1, 1, -r.s * Math.PI / 2); ln.setColorAt(ln2, C(pick(lc))); ln2++ } }
    pl.count = pn; ln.count = ln2; front.push(pl, ln) }

  /* ---- street furniture: bins, benches, scooters, bus stops; bay lines and contact shadows ---- */
  const blobT = keep(canvasTex(64, 64, g => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,.7)'); r.addColorStop(0.6, 'rgba(0,0,0,.35)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64) }, false))
  { const spots: number[] = []; for (let z = zTop - 10; z > goalZ + 30; z -= 31) if (!nearCross(z, 8)) spots.push(z)
    const bins = instanced(keep(new THREE.CylinderGeometry(0.28, 0.25, 0.9, 12)), std('#3f4a45', {roughness: 0.6, metalness: 0.2}), spots.length * 2)
    const bench = instanced(keep(mergeGeometries([fb2(1.6, 0.08, 0.5, 0, 0.45, 0), fb2(1.6, 0.5, 0.06, 0, 0.8, -0.23), fb2(0.08, 0.45, 0.45, -0.7, 0.22, 0), fb2(0.08, 0.45, 0.45, 0.7, 0.22, 0)])!), std('#4a3a2c', {roughness: 0.8}), spots.length)
    const scoot = instanced(keep(mergeGeometries([fb2(0.2, 0.1, 1.1, 0, 0.38, 0), fb2(0.05, 0.9, 0.05, 0, 0.8, 0.5), fb2(0.5, 0.05, 0.05, 0, 1.25, 0.5), new THREE.CylinderGeometry(0.17, 0.17, 0.09, 12).rotateZ(Math.PI / 2).translate(0, 0.17, 0.45), new THREE.CylinderGeometry(0.17, 0.17, 0.09, 12).rotateZ(Math.PI / 2).translate(0, 0.17, -0.45)])!), std('#7a7f89', {roughness: 0.4, metalness: 0.5}), spots.length)
    let bi = 0, ci = 0, si = 0; spots.forEach((z, k) => { const s = k % 2 ? 1 : -1
      put(bins, bi++, s * 10.3, 0.62, z + 3); put(bins, bi++, -s * 10.4, 0.62, z - 9)
      put(bench, ci++, -s * 10.2, 0.16, z - 3, 1, 1, 1, -s * Math.PI / 2)
      put(scoot, si++, s * 9.4, 0.16, z - 14, 1, 1, 1, Math.PI / 2 + rnd() * 0.4)
      taken.push({x: s * 10.3, z: z + 3, r: 0.6}, {x: -s * 10.4, z: z - 9, r: 0.6}, {x: -s * 10.2, z: z - 3, r: 1.1}, {x: s * 9.4, z: z - 14, r: 0.8}) })
    bins.count = bi; bench.count = ci; scoot.count = si
    // two bus stops: a lit shelter on the pavement
    for (const [sx, sz] of [[1, -46], [-1, -186]] as const) { const z = nearCross(sz, 9) ? sz - 12 : sz; taken.push({x: sx * 9.5, z, r: 2.2})
      const roof = new THREE.Mesh(box, std('#2a2c34')); roof.scale.set(1.6, 0.1, 3.4); roof.position.set(sx * 9.5, 2.5, z); add(roof)
      const back = new THREE.Mesh(keep(new THREE.PlaneGeometry(3.2, 2.2)), keep(new THREE.MeshBasicMaterial({color: HDR('#bcd2ff', 1.1), toneMapped: false}))); back.position.set(sx * 10.2, 1.3, z); back.rotation.y = -sx * Math.PI / 2; add(back)
      for (const dz of [-1.6, 1.6]) { const p = new THREE.Mesh(box, std('#2a2c34')); p.scale.set(0.08, 2.5, 0.08); p.position.set(sx * 9.0, 1.25, z + dz); add(p) } } }
  function fb2(w: number, h: number, d: number, px: number, py: number, pz: number) { return new THREE.BoxGeometry(w, h, d).translate(px, py, pz) }

  /* ---- cars: one extruded body, parked along the kerbs and a few rolling slowly ---- */
  const carShape = new THREE.Shape()
  carShape.moveTo(-2.2, 0.35).lineTo(-2.2, 0.85).quadraticCurveTo(-2.2, 1.0, -2.0, 1.03).lineTo(-1.2, 1.06).lineTo(-0.9, 1.38).quadraticCurveTo(-0.8, 1.5, -0.5, 1.5).lineTo(0.5, 1.5).quadraticCurveTo(0.8, 1.5, 1.0, 1.36).lineTo(1.35, 1.06).lineTo(2.05, 0.96).quadraticCurveTo(2.25, 0.9, 2.25, 0.75).lineTo(2.25, 0.35).lineTo(-2.2, 0.35)
  const bodyG = keep(new THREE.ExtrudeGeometry(carShape, {depth: 1.5, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 2, curveSegments: 6}).translate(0, 0, -0.75))
  const glassS = new THREE.Shape(); glassS.moveTo(-0.85, 1.1).lineTo(-0.6, 1.43).lineTo(0.5, 1.43).lineTo(0.92, 1.3).lineTo(1.22, 1.1)
  const glassG = keep(new THREE.ExtrudeGeometry(glassS, {depth: 1.62, bevelEnabled: false}).translate(0, 0, -0.81))
  const wheelG = keep(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14).rotateX(Math.PI / 2))
  const carCols = x.allowed([...lampC.cars, '#7a7f89', '#1d1f24']); scene.userData.duskCars = true
  type Car = {x: number; z: number; dir: -1 | 1; v: number; moving: boolean; col: string; lit: boolean}
  const cars: Car[] = []
  { const stall = (z: number) => nearCross(z, 9) || z > -34
    for (const s of [-1, 1]) { let z = -14 - rnd() * 6; while (z > goalZ + 30) { if (!stall(z) && rnd() < 0.62) cars.push({x: s * 5.95, z, dir: s > 0 ? -1 : 1, v: 0, moving: false, col: pick(carCols), lit: rnd() < 0.4}); z -= 6.6 + rnd() * 9 } }
    for (let k = 0; k < (lite ? 3 : 5); k++) { const dir: -1 | 1 = k % 2 ? 1 : -1; cars.push({x: dir < 0 ? 2.6 : -2.6, z: -60 - k * 52, dir, v: 4.5 + rnd() * 2, moving: true, col: pick(carCols), lit: true}) } }
  const N = cars.length
  const bodyM = instanced(bodyG, keep(new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 0.28, metalness: 0.55})), N)
  const glassM = instanced(glassG, keep(new THREE.MeshStandardMaterial({color: '#0b0e18', roughness: 0.08, metalness: 0.9})), N)
  const wheelM = instanced(wheelG, std('#101114', {roughness: 0.9}), N * 4)
  const lampG = keep(new THREE.BoxGeometry(0.08, 0.14, 0.34))
  const headM = instanced(lampG, keep(new THREE.MeshBasicMaterial({color: HDR('#fff0e0', 4), toneMapped: false})), N * 2)
  const tailC = x.banned('#ff3a2a') ? '#ff9a3a' : '#ff3a2a'
  const tailM = instanced(lampG, keep(new THREE.MeshBasicMaterial({color: HDR(tailC, 3), toneMapped: false})), N * 2)
  const headGl = new Float32Array(N * 6), tailGl = new Float32Array(N * 6)
  const headPts = glowPoints(headGl, 2.6, HDR('#fff0e0', 1.1)), tailPts = glowPoints(tailGl, 1.4, HDR(tailC, 0.9))
  cars.forEach((c, i) => bodyM.setColorAt(i, C(c.col)))
  // lights and wheels are placed in the car's own frame by one helper (body faces +x; yaw turns +x onto -z or +z)
  const toWorld = (c: Car, lx: number, lz: number): [number, number] => c.dir < 0 ? [c.x + lz, c.z - lx] : [c.x - lz, c.z + lx]
  const layout = () => cars.forEach((c, i) => {
    const yaw = c.dir < 0 ? Math.PI / 2 : -Math.PI / 2
    put(bodyM, i, c.x, 0, c.z, 1, 1, 1, yaw); put(glassM, i, c.x, 0, c.z, 1, 1, 1, yaw); put(blobs, i, c.x, 0.03, c.z, 5.4, 1, 2.7, 0)
    ;([[1.3, 0.8], [1.3, -0.8], [-1.3, 0.8], [-1.3, -0.8]] as const).forEach(([lx, lz], k) => { const [wx, wz] = toWorld(c, lx, lz); put(wheelM, i * 4 + k, wx, 0.34, wz, 1, 1, 1, yaw) })
    ;([0.58, -0.58] as const).forEach((lz, k) => { const [hx, hz] = toWorld(c, 2.24, lz); put(headM, i * 2 + k, hx, 0.82, hz, 1, 1, 1, yaw); const [tx, tz] = toWorld(c, -2.22, lz); put(tailM, i * 2 + k, tx, 0.9, tz, 1, 1, 1, yaw)
      const [gx, gz] = toWorld(c, 2.6, lz); headGl.set(c.lit ? [gx, 0.85, gz] : [0, -50, 0], i * 6 + k * 3); tailGl.set(c.lit ? [tx, 0.9, tz] : [0, -50, 0], i * 6 + k * 3) })
  })
  const blobs = instanced(keep(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({map: blobT, transparent: true, depthWrite: false, fog: false})), N)
  { const bays = cars.filter(c => !c.moving), bl = instanced(box, std('#d8d3c8', {roughness: 0.5}), bays.length * 2)
    bays.forEach((c, i) => { for (const [j, d] of [-1, 1].entries()) put(bl, i * 2 + j, c.x - Math.sign(c.x) * 0.2, 0.012, c.z + d * 2.7, 2.3, 0.01, 0.1) }) }
  layout()
  const carDirty = () => { for (const m of [bodyM, glassM, wheelM, headM, tailM, blobs]) m.instanceMatrix.needsUpdate = true; (headPts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true; (tailPts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true }
  if (bodyM.instanceColor) bodyM.instanceColor.needsUpdate = true; carDirty()

  /* ---- stalls with lit striped awnings and balloons ---- */
  { const sg = x.allowed([skin.p, '#efe6da']), stripes = (a: string) => canvasTex(64, 64, g => { for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#efe6da' : a; g.fillRect(0, i * 10.7, 64, 11) } })
    const awn = keep(stripes(sg[0]!)), want = [-24, -96, -168, -252]
    const words = [skin.strings.snack, skin.strings.kiosk, skin.strings.cafe, skin.strings.shop].filter((w): w is string => !!w)
    const glow: number[] = []; const bl = instanced(keep(new THREE.SphereGeometry(0.2, 10, 8)), std('#ffffff', {roughness: 0.3}), 4 * 6)
    let bn = 0; const cols = x.allowed([skin.p, '#efe6da', skin.s])
    want.forEach((zw, k) => {
      let z = zw; while (nearCross(z, 9) || Math.abs(z - (level.hood?.kiosk.z ?? 1e9)) < 5 || level.hood?.people.some(p => Math.abs(p.z - z) < 4 && Math.abs(p.x) > 8)) z -= 3
      const s = k % 2 ? 1 : -1, bx = s * 9.7, g = new THREE.Group(); g.position.set(bx, 0, z); g.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; taken.push({x: bx, z, r: 2.2})
      const part = (geo: THREE.BufferGeometry, m: THREE.Material, px: number, py: number, pz: number, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); g.add(o); return o }
      part(box, std('#efe6da'), 0, 0.5, 0, 2.2, 1.0, 1.1); part(box, std('#3a3e48'), 0, 1.1, -0.45, 2.3, 2.2, 0.3)
      for (const px of [-1.05, 1.05]) part(box, std('#cfcfd4', {metalness: 0.5}), px, 1.2, 0.55, 0.06, 2.4, 0.06)
      const canopy = part(box, keep(new THREE.MeshStandardMaterial({map: awn, roughness: 0.8, emissive: C('#5a2a1a'), emissiveIntensity: 0.5})), 0, 2.5, 0.2, 2.6, 0.1, 1.7); canopy.rotation.x = 0.22
      part(keep(new THREE.PlaneGeometry(2.0, 1.1)), keep(new THREE.MeshBasicMaterial({color: HDR(DUSK.amber, 1.6), toneMapped: false})), 0, 1.4, -0.28)
      part(keep(new THREE.PlaneGeometry(2.4, 0.5)), keep(new THREE.MeshBasicMaterial({map: keep(canvasTex(256, 52, gg => { gg.fillStyle = '#15161c'; gg.fillRect(0, 0, 256, 52); signMarks(gg, 256, 52, '#f3efe6', rnd) })), toneMapped: false})), 0, 2.2, 0.62); void words
      part(box, std(sg[0]!), 0.9, 0.5, 0.58, 0.05, 1, 1)
      scene.add(g); group.add(g)
      glow.push(bx - s * 0.4, 1.6, z); for (let b = 0; b < 6; b++) { put(bl, bn, bx + s * 0.1 + (b % 3) * 0.28 * s, 2.7 + (b % 2) * 0.35, z + 1.0 + (b % 3) * 0.15, 1, 1.2, 1); bl.setColorAt(bn, C(cols[b % cols.length]!)); bn++ }
    })
    glowPoints(new Float32Array(glow), 5, HDR(DUSK.amber, 1.1)) }

  /* ---- trees with volume (never where green is a rival's) ---- */
  const townId = skin.town === 'ath' || skin.town === 'tlv' ? skin.town : 'other'
  if (!x.banned('#2f4a33') && townId === 'other') {
    const spots: number[] = []; for (let z = zTop - 6; z > goalZ + 30; z -= 24) if (!nearCross(z, 9)) spots.push(z)
    const blobs: THREE.BufferGeometry[] = []
    ;([[0, 0, 0, 1.5], [0.9, 0.5, 0.3, 1.1], [-0.9, 0.3, -0.4, 1.2], [0.2, 1.2, -0.3, 1.0], [-0.3, 0.9, 0.8, 1.0], [0.7, -0.2, -0.8, 0.9]] as const).forEach(([bx, by, bz, r]) => {
      const g = new THREE.IcosahedronGeometry(r, 2).translate(bx, by, bz), n = g.attributes.position!.count, col = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) { const t = THREE.MathUtils.clamp((g.attributes.position!.getY(i) + 1.5) / 3.4, 0, 1), c = C('#1c3622').lerp(C('#5a7d3c'), t * t); col.set([c.r, c.g, c.b], i * 3) }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); blobs.push(g) })
    const crownG = keep(mergeGeometries(blobs)!), cr = instanced(crownG, keep(new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.9})), spots.length * 2)
    const tr = instanced(keep(new THREE.CylinderGeometry(0.12, 0.2, 4.4, 8)), std('#3d2c22'), spots.length * 2)
    let ti = 0; for (const z of spots) for (const s of [-1, 1]) { const zz = z + (s > 0 ? 12 : 0), sc = 0.95 + rnd() * 0.4; put(tr, ti, s * 9.7, 2.2, zz); put(cr, ti, s * 9.7, 5.6 * sc, zz, sc, sc, sc, rnd() * 6); taken.push({x: s * 9.7, z: zz, r: 1.4}); ti++ }
    cr.count = tr.count = ti
  }

  /* ---- the ground: stand wings with a lit roof line, and four floodlight towers over the roofs ---- */
  const ground = new THREE.Group(); ground.name = 'dusk-ground'; group.add(ground)
  { const gz = goalZ - 8, add = <T extends THREE.Object3D>(o: T) => { ground.add(o); return o }
    const facade = keep(canvasTex(512, 96, g => { g.fillStyle = '#1b1a26'; g.fillRect(0, 0, 512, 96); for (let i = 0; i < 520; i++) { g.fillStyle = rnd() < 0.2 ? '#ffd2a0' : '#ffb078'; g.globalAlpha = 0.25 + rnd() * 0.7; g.fillRect(rnd() * 512, 14 + rnd() * 70, 3, 2) } g.globalAlpha = 1 }))
    if (x.skyline) for (const s of [-1, 1]) {
      const m = new THREE.Mesh(box, std('#1b1a26', {roughness: 1})); m.scale.set(112, 26, 14); m.position.set(s * 84, 13, gz - 12); add(m)
      const f = new THREE.Mesh(keep(new THREE.PlaneGeometry(112, 24)), keep(new THREE.MeshBasicMaterial({map: facade, color: HDR('#ffffff', 1.5), toneMapped: false}))); f.position.set(s * 84, 12.5, gz - 4.9); add(f)
      const roof = new THREE.Mesh(box, keep(new THREE.MeshBasicMaterial({color: HDR('#ffe2c4', 2.4), toneMapped: false, fog: false}))); roof.scale.set(112, 0.7, 0.9); roof.position.set(s * 84, 26.4, gz - 4.8); add(roof) }
    const bank = keep(canvasTex(256, 128, g => { g.fillStyle = '#1d1e26'; g.fillRect(0, 0, 256, 128); for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) { const gr = g.createRadialGradient(18 + c * 31, 20 + r * 30, 0, 18 + c * 31, 20 + r * 30, 14); gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, '#fff6ea'); gr.addColorStop(1, 'rgba(255,240,220,0)'); g.fillStyle = gr; g.fillRect(c * 31 + 2, r * 30 + 4, 32, 32) } }))
    const beamTex = keep(canvasTex(16, 128, g => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,240,225,.9)'); gr.addColorStop(1, 'rgba(255,240,225,0)'); g.fillStyle = gr; g.fillRect(0, 0, 16, 128) }))
    const streak = keep(canvasTex(256, 32, g => { const gr = g.createRadialGradient(128, 16, 0, 128, 16, 128); gr.addColorStop(0, 'rgba(255,250,240,1)'); gr.addColorStop(0.15, 'rgba(255,225,190,.6)'); gr.addColorStop(1, 'rgba(255,200,160,0)'); g.fillStyle = gr; g.save(); g.scale(1, 0.125); g.translate(0, 112); g.fillRect(0, 0, 256, 256); g.restore() }))
    // pylons of a real ground's height (~50 m), so their banks stand over the roofs at the end and not over the street
    const towers: [number, number, number][] = [[-20, gz - 10, 52], [20, gz - 16, 56], [-52, gz - 6, 48], [52, gz - 12, 54]]
    for (const [tx, tz, th] of towers) {
      const pole = new THREE.Mesh(box, std('#2a2b34', {fog: true})); pole.scale.set(1.6, th, 1.2); pole.position.set(tx, th / 2, tz); add(pole)
      const lamp = new THREE.Mesh(keep(new THREE.PlaneGeometry(22, 11)), keep(new THREE.MeshBasicMaterial({map: bank, color: HDR('#ffffff', 1.25), toneMapped: false, fog: false}))); lamp.position.set(tx, th + 5, tz + 1); add(lamp)
      const flare = new THREE.Sprite(keep(new THREE.SpriteMaterial({map: streak, color: HDR('#ffffff', 0.22), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false}))); flare.scale.set(120, 15, 1); flare.position.set(tx, th + 5, tz + 2); add(flare)
      const halo = new THREE.Sprite(keep(new THREE.SpriteMaterial({map: glowTex, color: HDR('#ffe6cc', 0.28), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false}))); halo.scale.set(70, 70, 1); halo.position.set(tx, th + 5, tz + 2); add(halo)
      const beam = new THREE.Mesh(keep(new THREE.CylinderGeometry(2, 14, 60, 14, 1, true).translate(0, -30, 0)), keep(new THREE.MeshBasicMaterial({map: beamTex, color: HDR('#ffe9d4', 0.1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false}))); beam.position.set(tx, th + 3, tz + 1); beam.rotation.x = -0.5; add(beam) } }

  /* ---- the town: its own balconies on every front, its pavement, trees, kiosk and cafés, and the life in it (town.ts) ---- */
  let town: Town | null = null
  try {
    town = dressTown({scene: group, level, town: townId, clubId: x.clubId ?? '', lite, year, keep, rnd, glowTex, banned: x.banned, taken})
    town.fronts(x.blocks.map(b => ({s: Math.sign(b.x), zc: b.z, W: b.w, H: b.h, floors: Math.max(1, Math.floor((b.h - 1) / 3.2))})))
  } catch { town = null }

  const resize = (w: number, h: number) => refl.getRenderTarget().setSize(Math.max(64, Math.floor(w * mirrorScale)), Math.max(64, Math.floor(h * mirrorScale)))
  return {
    resize, front, ground,
    onFronts(list) { try { town?.fronts(list) } catch { /* the town keeps the balconies it had */ } },
    update(sim, t, dt, cam) {
      dome.position.copy(cam)
      town?.update(sim, t, dt)
      mat.uniforms.uTime!.value = t; overlays.forEach(o => { (o.material as THREE.ShaderMaterial).uniforms.uTime!.value = t })
      // slow cars brake for whoever stands ahead of them
      for (const c of cars) { if (!c.moving) continue
        const ahead = (sim.z - c.z) * -c.dir, lat = Math.abs(sim.x - c.x), brake = ahead > 0 && ahead < 14 && lat < 3 ? Math.max(0, (ahead - 5) / 9) : 1
        c.z += c.dir * c.v * brake * dt; if (c.z < goalZ + 40) c.z = -40; if (c.z > -40) c.z = goalZ + 40 }
      layout(); carDirty()
    },
  }
}
