/**
 * LIFE · the hood at dusk — the street's supporters: 60 to 120 people in the club's colours on the main street.
 * Each pose is one baked, merged figure (vertex colours for skin, hair, trousers; the shirt tinted per instance), instanced:
 * a dozen draw calls for the whole crowd. Walkers stream toward the ground, the rest idle facing every way.
 * Shirts come from the club's own colours through the colour policy; a rival's never appears.
 */
import * as THREE from 'three'
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type {VoxelSkin} from '@/lib/life/universal/skin'
import type {Level} from '@/lib/life/rush/level'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import {HAIR, PANTS, SKIN_TONES, pose, disposeFigure, type FigureData, type FigureOptions} from '../figure'
import {loadLod, type CastId, type CharAsset} from '../human/kit'

export type CrowdCtx = {
  scene: THREE.Scene; level: Level; skin: VoxelSkin; lite: boolean; rnd: () => number
  keep: <T extends {dispose(): void}>(x: T) => T; allowed: (l: readonly string[]) => string[]
  figOf: (o: FigureOptions) => THREE.Group
  /** the skinned people are in: the far crowd becomes their own far bodies (`cast/<id>-lod1.glb`), so the street has one
   *  kind of person from the nearest face to the farthest back, and no seam where a figure turns into a human */
  humans?: boolean
}

/** each pose of the far crowd, as which far body plays it and which moment of which clip (set 0 is all a phone loads) */
const LOD_POSES: {body: [CastId, CastId]; clip: [string, string]; at: number}[] = [
  {body: ['father', 'grandfather'], clip: ['idle_2', 'idle_3'], at: 0.3},
  {body: ['mother', 'father_heavy'], clip: ['talk_1', 'talk_2'], at: 0.45},
  {body: ['teen', 'father'], clip: ['cheer', 'cheer'], at: 0.2},
  {body: ['father', 'teen'], clip: ['walk', 'walk'], at: 0},
  {body: ['mother', 'mother_heavy'], clip: ['walk', 'walk'], at: 0},
  {body: ['grandfather', 'teen'], clip: ['cheer', 'wave'], at: 0.6},
]

/** a far body held still at one moment of a clip, skinned once on the CPU into a plain mesh: its atlas, and the tint mask
 *  (COLOR_0: R the top, B the trim) as an attribute the material mixes the shirt colour in by */
function bakeLod(a: CharAsset, clip: string, at: number): {geo: THREE.BufferGeometry; map: THREE.Texture | null} | null {
  const model = SkeletonUtils.clone(a.scene)
  const c = a.clip(clip, 'full'); if (!c) return null
  const mixer = new THREE.AnimationMixer(model), act = mixer.clipAction(c); act.play(); act.time = c.duration * at; mixer.update(0)
  model.updateMatrixWorld(true)
  let sm: THREE.SkinnedMesh | null = null
  model.traverse(o => { if (!sm && (o as THREE.SkinnedMesh).isSkinnedMesh) sm = o as THREE.SkinnedMesh })
  if (!sm) { mixer.uncacheRoot(model); return null }
  const m = sm as THREE.SkinnedMesh
  m.skeleton.update()
  const src = m.geometry, pos = src.attributes.position!, n = pos.count, out = new Float32Array(n * 3), v = new THREE.Vector3()
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(pos, i); m.applyBoneTransform(i, v); v.applyMatrix4(m.matrixWorld); out.set([v.x, v.y, v.z], i * 3) }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(out, 3))
  if (src.attributes.uv) geo.setAttribute('uv', src.attributes.uv.clone())
  const col = src.attributes.color
  const mask = new Float32Array(n * 3); if (col) for (let i = 0; i < n; i++) mask.set([col.getX(i), col.getY(i), col.getZ(i)], i * 3)
  geo.setAttribute('aMask', new THREE.BufferAttribute(mask, 3))
  if (src.index) geo.setIndex(src.index.clone())
  geo.computeVertexNormals()
  const map = (m.material as THREE.MeshStandardMaterial).map ?? null
  mixer.stopAllAction(); mixer.uncacheRoot(model); m.skeleton.dispose()
  return {geo, map}
}
type P = {x: number; z: number; yaw: number; v: number; k: number; ph: number; sc: number; walk: boolean; d: number; col: THREE.Color; i: number; hum: boolean; tier: 0 | 1 | 2}
/** somebody near enough to be a person: the stage draws him as a skinned human and says whether it did */
export type CrowdNear = (i: number, x: number, z: number, yaw: number, v: number, sc: number, col: THREE.Color) => boolean

export function dressCrowd(x: CrowdCtx) {
  const {scene, level, skin, lite, rnd, keep} = x
  const skip = new Set(['glint', 'iris', 'eyeW', 'brow', 'blob', 'mouthOpen', 'mouth', 'belt', 'sock', 'cuff', 'hem', 'scarfB', 'lid', 'ear', 'nose'])
  const bake = (f: THREE.Group, skinC: string, hairC: string, pantsC: string) => {
    f.updateMatrixWorld(true)
    const parts: THREE.BufferGeometry[] = []
    f.traverse(o => {
      const m = o as THREE.Mesh; if (!m.isMesh) return
      const role = m.userData.role as string; if (skip.has(role)) return
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere()
      if ((m.geometry.boundingSphere?.radius ?? 1) < 0.05) return
      const g = m.geometry.clone().toNonIndexed(); g.applyMatrix4(m.matrixWorld)
      const n = g.attributes.position!.count, col = new Float32Array(n * 3), tint = new Float32Array(n)
      const c = new THREE.Color(role === 'skin' ? skinC : role === 'hair' || role === 'beard' ? hairC : role === 'pants' ? pantsC : role === 'shoe' ? '#e8e4dc' : role === 'sole' ? '#c9c4b8' : role === 'scarf' ? skin.p : role === 'cap' ? skin.p : role === 'collar' ? skin.s : role === 'pack' ? '#5a4a3a' : '#ffffff')
      for (let i = 0; i < n; i++) { col.set([c.r, c.g, c.b], i * 3); tint[i] = role === 'kit' || role === 'top' ? 1 : 0 }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aTint', new THREE.BufferAttribute(tint, 1))
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color', 'aTint'].includes(k)) g.deleteAttribute(k)
      parts.push(g)
    })
    const merged = mergeGeometries(parts, false)!; parts.forEach(g => g.dispose()); return keep(merged)
  }
  const mat = keep(new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.82}))
  mat.onBeforeCompile = sh => { sh.vertexShader = 'attribute float aTint;\n' + sh.vertexShader.replace('#include <color_vertex>', `vColor = vec3(1.0);
    #ifdef USE_COLOR
    vColor *= color;
    #endif
    #ifdef USE_INSTANCING_COLOR
    vColor.xyz = mix(vColor.xyz, vColor.xyz * instanceColor.xyz, aTint);
    #endif`) }
  // poses: idle, talking, scarf up, two walking frames, cheering; two builds each
  const defs: {o: FigureOptions; p: Parameters<typeof pose>[1]; t: number; walk?: boolean}[] = [
    {o: {hairStyle: 'short'}, p: {speed: 0, joy: 0.6}, t: 0}, {o: {hairStyle: 'curly', scarf: false, longSleeves: true, denim: true}, p: {speed: 0, joy: 0.8, talk: true}, t: 0.7},
    {o: {hairStyle: 'short'}, p: {speed: 0, scarfUp: true, joy: 1}, t: 1.3}, {o: {hairStyle: 'bald'}, p: {speed: 1.6, joy: 0.4}, t: 0.2, walk: true},
    {o: {hairStyle: 'long', female: true}, p: {speed: 1.6, joy: 0.4}, t: 2.1, walk: true}, {o: {hairStyle: 'short', cap: true}, p: {speed: 0, celebrate: true, joy: 1}, t: 0.5},
  ]
  const sets = lite ? 1 : 2, total = lite ? 80 : 150
  // a walker is a stride, not a statue sliding: each walking build is baked at several moments of the captured stride and
  // every walker shows the one his own distance has reached (a foot that is down stays down)
  const NPH = lite ? 4 : 6
  const variants: {geo: THREE.BufferGeometry; walk: boolean; grp: number; ph: number; d: number; s: number}[] = []
  let groups = 0
  for (let s = 0; s < sets; s++) defs.forEach((d, i) => {
    for (let k = 0; k < (d.walk ? NPH : 1); k++) {
      const f = x.figOf({kit: true, scarf: true, noBlob: true, pack: i % 3 === 0, ...d.o, scale: 0.94})
      ;(f.userData as FigureData).phase = d.walk ? k / NPH * Math.PI * 2 : d.t * 2; pose(f, d.p, d.t, 0)
      variants.push({geo: bake(f, SKIN_TONES[(i * 2 + s * 3 + 1) % SKIN_TONES.length]!, HAIR[(i + s * 2) % HAIR.length]!, PANTS[(i + s) % PANTS.length]!), walk: !!d.walk, grp: groups, ph: k, d: i, s}); disposeFigure(f)
    }
    groups++
  })
  const shirts = x.allowed([skin.p, skin.p, skin.p, skin.s, '#2a2d36', '#e8e4dc', '#3a3630'])
  const L = level.bounds.z1, G = level.goal.z
  const people: P[] = []
  for (let i = 0; i < total; i++) {
    const near = i < total * 0.55, z = near ? -14 - rnd() * 90 : -90 - Math.pow(rnd(), 0.7) * (-G - 100), walk = rnd() < 0.3
    const lane = rnd(), px = lane < 0.5 ? (rnd() < 0.5 ? -1 : 1) * (7.4 + rnd() * 2.8) : (rnd() - 0.5) * 12
    people.push({x: px, z: Math.max(G + 14, z), yaw: walk ? Math.PI : rnd() * 6.28, v: walk ? 0.9 + rnd() * 0.8 : 0, k: 0, ph: rnd() * 6, sc: 0.94 + rnd() * 0.14, walk, d: rnd() * 3, col: new THREE.Color(shirts[Math.floor(rnd() * shirts.length)]!), i, hum: false, tier: 0})
  }
  // walkers use the walking builds, the rest the standing ones
  const wk = [...new Set(variants.filter(v => v.walk).map(v => v.grp))], st = [...new Set(variants.filter(v => !v.walk).map(v => v.grp))]
  people.forEach(p => { p.k = p.walk ? wk[Math.floor(rnd() * wk.length)]! : st[Math.floor(rnd() * st.length)]! })
  const ims = variants.map(v => {
    const mine = people.filter(p => p.k === v.grp), im = new THREE.InstancedMesh(v.geo, mat, Math.max(1, mine.length)); im.count = mine.length; im.frustumCulled = false; im.castShadow = !lite; scene.add(im)
    mine.forEach((p, i) => im.setColorAt(i, p.col))
    if (im.instanceColor) im.instanceColor.needsUpdate = true
    return {im, mine, v}
  })
  // the far bodies, when they arrive: every pose is re-baked from its body and swapped in place (the people keep their places)
  if (x.humans) {
    let alive = true
    keep({dispose: () => { alive = false }})
    // the far bodies are ~100 KB each: a phone takes the few its one set of poses asks for
    const ids = [...new Set(LOD_POSES.flatMap(p => p.body.slice(0, sets)))]
    void Promise.all(ids.map(id => loadLod(id).then(a => [id, a] as const, () => null))).then(list => {
      if (!alive) return
      const got = new Map(list.filter((e): e is readonly [CastId, CharAsset] => !!e))
      const mats = new Map<THREE.Texture, THREE.MeshStandardMaterial>()
      const lodMat = (map: THREE.Texture) => { let m = mats.get(map); if (!m) {
        m = keep(new THREE.MeshStandardMaterial({map, roughness: 0.85}))
        m.onBeforeCompile = sh => { sh.vertexShader = 'attribute vec3 aMask;\n' + sh.vertexShader.replace('#include <color_vertex>', `#include <color_vertex>
          #ifdef USE_INSTANCING_COLOR
          vColor = mix(vec3(1.0), instanceColor.xyz, aMask.r) * mix(vec3(1.0), instanceColor.xyz * 0.6, aMask.b);
          #endif`) }
        m.customProgramCacheKey = () => 'lod-crowd'; mats.set(map, m) } return m }
      for (const it of ims) {
        const P = LOD_POSES[it.v.d]!, body = P.body[it.v.s] ?? P.body[0], a = got.get(body) ?? got.get(P.body[0]); if (!a) continue
        const at = it.v.walk ? it.v.ph / NPH : P.at
        const b = bakeLod(a, P.clip[it.v.s] ?? P.clip[0], at); if (!b || !b.map) { b?.geo.dispose(); continue }
        // the far body is drawn at its own height: the instance scale (0.94-1.08) stays a person's own build
        it.im.geometry = keep(b.geo); it.im.material = lodMat(b.map)
      }
    })
  }
  /* ---- far away a supporter is a shape in the club's colour: one low body (about a hundred triangles) for everybody past
     the middle distance, so the far end of the street costs a few thousand triangles and not a few hundred thousand ---- */
  const farGeo = (() => {
    const part = (g: THREE.BufferGeometry, col: string, tint: number) => { const n2 = g.toNonIndexed(); g.dispose(); const n = n2.attributes.position!.count, c = new THREE.Color(col), cs = new Float32Array(n * 3), ts = new Float32Array(n); for (let i = 0; i < n; i++) { cs.set([c.r, c.g, c.b], i * 3); ts[i] = tint } n2.setAttribute('color', new THREE.BufferAttribute(cs, 3)); n2.setAttribute('aTint', new THREE.BufferAttribute(ts, 1)); n2.deleteAttribute('uv'); return n2 }
    const parts = [
      part(new THREE.BoxGeometry(0.15, 0.82, 0.17).translate(-0.1, 0.41, 0), PANTS[1]!, 0), part(new THREE.BoxGeometry(0.15, 0.82, 0.17).translate(0.1, 0.41, 0), PANTS[1]!, 0),
      part(new THREE.CylinderGeometry(0.2, 0.17, 0.6, 6).translate(0, 1.1, 0), '#ffffff', 1),
      part(new THREE.BoxGeometry(0.09, 0.56, 0.1).translate(-0.26, 1.08, 0), '#ffffff', 1), part(new THREE.BoxGeometry(0.09, 0.56, 0.1).translate(0.26, 1.08, 0), '#ffffff', 1),
      part(new THREE.IcosahedronGeometry(0.115, 0).translate(0, 1.58, 0), SKIN_TONES[2]!, 0), part(new THREE.BoxGeometry(0.2, 0.09, 0.2).translate(0, 1.68, -0.01), HAIR[1]!, 0),
    ]
    const g = mergeGeometries(parts, false)!; parts.forEach(q2 => q2.dispose()); g.computeVertexNormals(); return keep(g)
  })()
  const far = new THREE.InstancedMesh(farGeo, mat, total); far.count = 0; far.frustumCulled = false; scene.add(far)
  for (let i = 0; i < total; i++) far.setColorAt(i, people[i]!.col)
  const farOwner = new Int16Array(total).fill(-1), owners = ims.map(it => new Int16Array(Math.max(1, it.mine.length)).fill(-1))
  const MID2 = (lite ? 24 : 46) ** 2
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p3 = new THREE.Vector3(), s3 = new THREE.Vector3()
  return {
    /**
     * `eye`: where the lens stands, which way it looks and how far the air lets it see. Only who can be seen is drawn, and
     * the instances are packed (an instance scaled to nothing still costs every one of its triangles): near the lens a
     * person has his full body, past the middle distance the low one.
     */
    update(sim: {x: number; z: number}, t: number, dt: number, near?: CrowdNear, eye?: {x: number; z: number; fx: number; fz: number; far: number}) {
      const ex = eye?.x ?? sim.x, ez = eye?.z ?? sim.z, far2 = (eye?.far ?? 400) ** 2
      let fn = 0, farDirty = false
      for (const p of people) { if (p.walk) { p.z -= p.v * dt; p.d += p.v * dt; if (p.z < G + 12) p.z = L - 6 - rnd() * 20 }
        const dx = p.x - sim.x, dz = p.z - sim.z; p.hum = !!near && dx * dx + dz * dz < 121 && near(p.i, Math.abs(dz) < 1.8 && Math.abs(dx) < 1.3 ? sim.x + (dx >= 0 ? 1.3 : -1.3) : p.x, p.z, p.yaw, p.v, p.sc, p.col)
        // 0 = not drawn, 1 = his own body, 2 = the far body
        const cx = p.x - ex, cz = p.z - ez, d2 = cx * cx + cz * cz
        p.tier = p.hum || d2 > far2 || (eye && cx * eye.fx + cz * eye.fz < -4) ? 0 : d2 < MID2 ? 1 : 2
        if (p.tier === 2) {
          q.setFromEuler(e.set(0, p.yaw, 0)); far.setMatrixAt(fn, m4.compose(p3.set(p.x, p.walk ? Math.abs(Math.sin(p.d * 2.2)) * 0.03 : 0, p.z), q, s3.set(p.sc, p.sc, p.sc)))
          if (farOwner[fn] !== p.i) { farOwner[fn] = p.i; far.setColorAt(fn, p.col); farDirty = true }
          fn++
        } }
      far.count = fn; far.instanceMatrix.needsUpdate = true; if (farDirty && far.instanceColor) far.instanceColor.needsUpdate = true
      ims.forEach(({im, mine, v}, k) => {
        const own = owners[k]!; let n = 0, dirty = false
        for (const p of mine) {
          if (p.tier !== 1) continue
          if (v.walk) { const h = p.sc * 0.94, stride = h * Math.max(0.9, Math.min(3.3, 0.85 + 0.42 * p.v / h)), u = (p.d / stride) % 1; if (Math.floor(u * NPH) % NPH !== v.ph) continue }
          let px = p.x; const dx = px - sim.x, dz = p.z - sim.z
          if (Math.abs(dz) < 1.8 && Math.abs(dx) < 1.3) px = sim.x + (dx >= 0 ? 1.3 : -1.3)
          const bob = p.walk ? 0 : Math.sin(t * 2 + p.ph) * 0.006
          q.setFromEuler(e.set(0, p.yaw, p.walk ? 0 : Math.sin(t * 0.5 + p.ph) * 0.012)); im.setMatrixAt(n, m4.compose(p3.set(px, bob, p.z), q, s3.set(p.sc, p.sc, p.sc)))
          if (own[n] !== p.i) { own[n] = p.i; im.setColorAt(n, p.col); dirty = true }
          n++
        }
        im.count = n; im.instanceMatrix.needsUpdate = true; if (dirty && im.instanceColor) im.instanceColor.needsUpdate = true
      })
    },
  }
}
