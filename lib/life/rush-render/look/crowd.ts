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
import {HAIR, PANTS, SKIN_TONES, pose, disposeFigure, type FigureData, type FigureOptions} from '../figure'

export type CrowdCtx = {
  scene: THREE.Scene; level: Level; skin: VoxelSkin; lite: boolean; rnd: () => number
  keep: <T extends {dispose(): void}>(x: T) => T; allowed: (l: readonly string[]) => string[]
  figOf: (o: FigureOptions) => THREE.Group
}
type P = {x: number; z: number; yaw: number; v: number; k: number; ph: number; sc: number; walk: boolean; d: number; col: THREE.Color}

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
  const variants: {geo: THREE.BufferGeometry; walk: boolean; grp: number; ph: number}[] = []
  let groups = 0
  for (let s = 0; s < sets; s++) defs.forEach((d, i) => {
    for (let k = 0; k < (d.walk ? NPH : 1); k++) {
      const f = x.figOf({kit: true, scarf: true, noBlob: true, pack: i % 3 === 0, ...d.o, scale: 0.94})
      ;(f.userData as FigureData).phase = d.walk ? k / NPH * Math.PI * 2 : d.t * 2; pose(f, d.p, d.t, 0)
      variants.push({geo: bake(f, SKIN_TONES[(i * 2 + s * 3 + 1) % SKIN_TONES.length]!, HAIR[(i + s * 2) % HAIR.length]!, PANTS[(i + s) % PANTS.length]!), walk: !!d.walk, grp: groups, ph: k}); disposeFigure(f)
    }
    groups++
  })
  const shirts = x.allowed([skin.p, skin.p, skin.p, skin.s, '#2a2d36', '#e8e4dc', '#3a3630'])
  const L = level.bounds.z1, G = level.goal.z
  const people: P[] = []
  for (let i = 0; i < total; i++) {
    const near = i < total * 0.55, z = near ? -14 - rnd() * 90 : -90 - Math.pow(rnd(), 0.7) * (-G - 100), walk = rnd() < 0.3
    const lane = rnd(), px = lane < 0.5 ? (rnd() < 0.5 ? -1 : 1) * (7.4 + rnd() * 2.8) : (rnd() - 0.5) * 12
    people.push({x: px, z: Math.max(G + 14, z), yaw: walk ? Math.PI : rnd() * 6.28, v: walk ? 0.9 + rnd() * 0.8 : 0, k: 0, ph: rnd() * 6, sc: 0.94 + rnd() * 0.14, walk, d: rnd() * 3, col: new THREE.Color(shirts[Math.floor(rnd() * shirts.length)]!)})
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
  const none = new THREE.Matrix4().makeScale(0, 0, 0)
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p3 = new THREE.Vector3(), s3 = new THREE.Vector3()
  return {
    update(sim: {x: number; z: number}, t: number, dt: number) {
      for (const p of people) if (p.walk) { p.z -= p.v * dt; p.d += p.v * dt; if (p.z < G + 12) p.z = L - 6 - rnd() * 20 }
      for (const {im, mine, v} of ims) {
        mine.forEach((p, i) => {
          if (v.walk) { const h = p.sc * 0.94, stride = h * Math.max(0.9, Math.min(3.3, 0.85 + 0.42 * p.v / h)), u = (p.d / stride) % 1; if (Math.floor(u * NPH) % NPH !== v.ph) { im.setMatrixAt(i, none); return } }
          let px = p.x; const dx = px - sim.x, dz = p.z - sim.z
          if (Math.abs(dz) < 1.8 && Math.abs(dx) < 1.3) px = sim.x + (dx >= 0 ? 1.3 : -1.3)
          const bob = p.walk ? 0 : Math.sin(t * 2 + p.ph) * 0.006
          q.setFromEuler(e.set(0, p.yaw, p.walk ? 0 : Math.sin(t * 0.5 + p.ph) * 0.012)); im.setMatrixAt(i, m4.compose(p3.set(px, bob, p.z), q, s3.set(p.sc, p.sc, p.sc)))
        })
        im.instanceMatrix.needsUpdate = true
      }
    },
  }
}
