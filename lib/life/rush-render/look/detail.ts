/**
 * LIFE · the hood — small things are drawn only where they can be seen (owner, 28.11.2026: "the game is very heavy").
 *
 * The street is 350 m of dressing: bins, chairs, pots, signs, pipes, crates, hundreds of small meshes with a draw call
 * each. From the far end of it they are a few pixels inside the haze, and in the wet road's mirror they are nothing at
 * all, yet every one was drawn in both, every frame. Here each small mesh is found once and moved off the camera's layer
 * when it is past the distance at which it reads; the mirror keeps only what stands close to the lens.
 * Layers, never `visible`: the game shows and hides its own things, and this must not fight it.
 */
import * as THREE from 'three'

type Item = {o: THREE.Object3D; r: number; near: boolean; held: boolean}
export type Detail = {
  /** look for small meshes that arrived since the last look */
  scan(): void
  /** from where the lens stands: a share of the list each frame, so no frame pays for all of it */
  update(eye: THREE.Vector3): void
  /** round the mirror's own draw: `true` before it, `false` after */
  mirror(on: boolean): void
  readonly count: number
}

const FAR = 1 << 1

export function createDetail(scene: THREE.Scene, lite: boolean): Detail {
  const items: Item[] = [], seen = new WeakSet<THREE.Object3D>()
  // how far a thing of one metre's radius is drawn; bigger things proportionally farther
  const REACH = lite ? 62 : 110, MIRROR = lite ? 16 : 30, SMALL = 2.6
  const v = new THREE.Vector3(), sc = new THREE.Vector3(), eyeAt = new THREE.Vector3()
  let cursor = 0
  function scan() {
    scene.traverse(o => {
      const m = o as THREE.Mesh & {isInstancedMesh?: boolean; isSkinnedMesh?: boolean}
      if (!m.isMesh || m.isInstancedMesh || m.isSkinnedMesh || seen.has(o) || !m.geometry) return
      seen.add(o)
      const mat = m.material as THREE.Material | THREE.Material[]
      // what the player steers by, and anything that is light itself, is never dropped
      if ((Array.isArray(mat) ? mat : [mat]).some(k => k?.userData?.dayFixed || k?.blending === THREE.AdditiveBlending || (k as THREE.Material & {fog?: boolean})?.fog === false)) return
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere()
      m.getWorldScale(sc)
      const r = (m.geometry.boundingSphere?.radius ?? 9) * Math.max(Math.abs(sc.x), Math.abs(sc.y), Math.abs(sc.z))
      if (!(r > 0) || r > SMALL) return
      items.push({o, r: Math.max(0.35, r), near: true, held: false})
    })
  }
  const dist2 = (it: Item) => { const e = it.o.matrixWorld.elements; return v.set(e[12]! - eyeAt.x, 0, e[14]! - eyeAt.z).lengthSq() }
  function update(eye: THREE.Vector3) {
    eyeAt.copy(eye)
    const n = Math.min(items.length, 160)
    for (let k = 0; k < n; k++) {
      const it = items[cursor++ % items.length]!, reach = REACH * it.r
      const near = dist2(it) < reach * reach
      if (near !== it.near) { it.near = near; if (near) it.o.layers.enable(0); else it.o.layers.mask = FAR }
    }
  }
  function mirror(on: boolean) {
    if (on) { for (const it of items) { if (!it.near) continue; const reach = MIRROR * it.r; if (dist2(it) > reach * reach) { it.held = true; it.o.layers.mask = FAR } } }
    else for (const it of items) if (it.held) { it.held = false; it.o.layers.mask = 1 }
  }
  scan()
  return {scan, update, mirror, get count() { return items.length }}
}
