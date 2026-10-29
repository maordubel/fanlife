/**
 * LIFE · RUSH — the things a run picks up, as models (kiln: `scripts/life/rush/props.kx.js`).
 *
 * One library for every club: the materials named `clubP` / `clubS` are repainted with the club's own two
 * colours (the skin the whole town is painted from), so no file carries a club — or a rival — colour. The
 * drawn primitives in stage.ts stay as the stand-in while this loads, and for good if it never does.
 */
import * as THREE from 'three'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'

export type PropLibrary = {items: Map<string, THREE.Object3D>; bin: THREE.Object3D | null}
let cache: Promise<PropLibrary | null> | null = null

export function loadProps(base = '/life/rush/models'): Promise<PropLibrary | null> {
  if (cache) return cache
  const loader = new GLTFLoader()
  cache = Promise.all([loader.loadAsync(`${base}/rush-props.glb`), loader.loadAsync(`${base}/bin.glb`).catch(() => null)])
    .then(([pack, bin]) => {
      const items = new Map<string, THREE.Object3D>()
      for (const o of pack.scene.children) items.set(o.name, o)
      return {items, bin: bin?.scene.children[0] ?? null}
    })
    .catch(() => { cache = null; return null })
  return cache
}

/** A copy of one model at the origin, its club materials repainted (one material per colour per stage, from `mats`). */
export function propCopy(src: THREE.Object3D, paint: {p: string; s: string}, mats: Map<string, THREE.Material>, keep: <T extends {dispose(): void}>(x: T) => T, shadows: boolean): THREE.Object3D {
  const o = src.clone(true)
  o.position.set(0, 0, 0)
  o.traverse(n => {
    const m = n as THREE.Mesh
    if (!m.isMesh) return
    m.castShadow = shadows
    const mat = m.material as THREE.MeshStandardMaterial
    const name = mat.name
    if (name === 'clubP' || name === 'clubS' || name === 'glass') {
      let mine = mats.get(name)
      if (!mine) {
        const c = keep(mat.clone())
        if (name === 'clubP') c.color.set(paint.p)
        else if (name === 'clubS') c.color.set(paint.s)
        else { c.transparent = true; c.opacity = 0.72; c.depthWrite = false }
        mats.set(name, c); mine = c
      }
      m.material = mine
    }
  })
  return o
}
