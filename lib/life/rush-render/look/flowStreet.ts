/**
 * LIFE · the hood dressed in the town's own pictures (rule life-flow-art; owner 23.11.2026: "use my FLOW wherever needed
 * to create a more real experience — streets of Athens, of Tel Aviv, stadiums that recall the originals").
 *
 * Three layers, each loaded lazily after the first frame and each failing soft (a 404, a refused manifest, a piece
 * reviewed `use:false`: the street keeps the look it was built with):
 *  1. FACADES — the main street's buildings get the town's facade pictures as their front walls, sized from the storeys
 *     each picture shows (~3.1 m a floor), cropped and mirrored so neighbours differ; normal, roughness and lit-window
 *     maps baked from the picture make the windows glow at dusk and the wet street reflect them. The box behind keeps
 *     the procedural wall, tinted to the picture. The modelled awnings, signs and lit shop fronts stay in front.
 *  2. THE GROUND — the club's stadium plate as a backdrop card behind the floodlight towers, sunk into the haze.
 *  3. THE SKY BAND — the town's skyline plate as a fogged cylindrical band under the dusk dome.
 * `lite` asks for the 512/1024 files and no normal/roughness maps; `high` for 1024/2048 and every map.
 */
import * as THREE from 'three'
import type {Level} from '@/lib/life/rush/level'
import {DUSK, skyMaterial, type Block} from './dusk'
import {facadeMetres, flowFits, flowPieces, flowSize, flowTown, flowUrl, loadFlowManifest, type FlowPiece} from './flowArt'
import {shopTexture, shutterTexture, type Front as TownFront} from './town'

export type FlowCtx = {
  scene: THREE.Scene; renderer?: THREE.WebGLRenderer; level: Level; clubId: string; skinTown?: string | null; lite: boolean
  keep: <T extends {dispose(): void}>(x: T) => T; rnd: () => number
  /** does the club's colour policy forbid this colour? */
  banned: (hex: string) => boolean
  /** the procedural main-street fronts the pictures replace (hidden once the pictures are in) */
  replaces: () => THREE.Object3D[]
  /** the dusk wall material (town texture in world metres): the boxes behind the pictures wear it */
  wallMat: THREE.MeshStandardMaterial | null
  /** the 3D bowl at the end of the road, hidden when the plate takes its place */
  bowl?: THREE.Object3D | null
  /** the dusk rig's own ground (stand wings, floodlight towers), hidden too: the plate has its own lights */
  ground?: THREE.Object3D | null
  /** the street's blocks as the stage laid them (only their crossings gaps are reused) */
  blocks: Block[]
  /** told where the buildings now stand, so the town hangs its balconies, awnings and pilotis on the pictures (town.ts) */
  onFronts?: (list: TownFront[]) => void
}
export type FlowDress = {update(cam: THREE.Vector3): void; ready(): Promise<FlowReport>; dispose(): void}
export type FlowReport = {facades: string[]; stadium: string | null; skyline: string | null; air?: string[]; env?: string | null; urls: string[]}

/** THE WORKER's imported pictures (lib/life/worker-art/imported.json) and the towns that may borrow its Tel Aviv set */
const WORKER = '/life/worker'
const WORKER_TOWNS: readonly string[] = ['tlv', 'hfa', 'ptk']
/** THE WORKER's picture of a club's ground, where it beats the Flow plate (`prefer`) or stands in until one is drawn */
const WORKER_PLATES: Record<string, {prefer: boolean; plate: {id: string; url: string; v: [number, number]; aspect: number; W: number; y: number; mix: number; back?: number}}> = {
  'hapoel-tel-aviv': {prefer: false, plate: {id: 'worker:introReturnHome', url: `${WORKER}/tlv/introReturnHome.webp`, v: [0.3, 0.92], aspect: 16 / 9, W: 420, y: -6, mix: 0.22, back: 60}},
}
const FAMILY_HEX = {red: '#c8102e', yellow: '#f2c500', green: '#1f8a3b', blue: '#1f4fbf'} as const
const C = (h: THREE.ColorRepresentation) => new THREE.Color(h)

function loadTex(url: string, srgb: boolean, keep: FlowCtx['keep'], urls: string[]): Promise<THREE.Texture | null> {
  return new THREE.TextureLoader().loadAsync(url).then(t => {
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 4; urls.push(url); return keep(t)
  }).catch(() => null)
}

/* the plate and the band: a picture sunk into the dusk haze, its edges dissolving (no hard card edge anywhere) */
const HAZE_FRAG = `uniform sampler2D map; uniform vec3 uFog, uGrade; uniform float uMix, uV0, uV1, uEdge, uTop, uBottom, uRep;
  varying vec2 vUv;
  void main(){
    vec2 uv = vec2(vUv.x * uRep, mix(uV0, uV1, vUv.y));
    vec4 tx = texture2D(map, uv);
    vec3 c = tx.rgb * uGrade;
    float l = dot(c, vec3(.2126,.7152,.0722));
    c = mix(c, vec3(l) * vec3(.95,.97,1.05), .18);
    c = mix(c, uFog, uMix * (0.55 + 0.45 * (1. - smoothstep(0., .9, vUv.y))));
    float e = max(uEdge, 1e-4);
    float a = clamp(vUv.x / e, 0., 1.) * clamp((1. - vUv.x) / e, 0., 1.);
    a *= 1. - smoothstep(1. - max(uTop, 1e-4), 1., vUv.y);
    a *= smoothstep(0., max(uBottom, 1e-4), vUv.y);
    a = a * a * (3. - 2. * a) * tx.a;
    gl_FragColor = vec4(c, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`
const HAZE_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }'

export function dressFlow(x: FlowCtx): FlowDress {
  const {scene, level, lite, keep, rnd} = x
  const group = new THREE.Group(); group.name = 'flow-art'; group.visible = false; scene.add(group)
  const urls: string[] = []
  let band: THREE.Mesh | null = null, dead = false
  // a wall carrying a rival's colour is skipped; a plate or a skyline is judged on yellow only (its sky is always blue)
  const fits = (p: FlowPiece) => flowFits(p, f => f === 'yellow' || (p.kind === 'facade' && x.banned(FAMILY_HEX[f])))
  const town = flowTown(x.clubId, x.skinTown)

  /* ---- 1 · facades ---- */
  // a source is one picture that can front a building: which part of it is the wall (u, v), how tall that wall is in
  // metres, its width-to-height at the full crop, and how often and where it may stand
  type Source = {id: string; m: THREE.MeshStandardMaterial; H: number; aspect: number; u: [number, number]; v: [number, number]; f: [number, number]; max?: number; nearGround?: boolean; avg: string}
  const facadeMat = (map: THREE.Texture, o: {emi?: THREE.Texture | null; nrm?: THREE.Texture | null; rough?: THREE.Texture | null; grade?: THREE.ColorRepresentation; key: string}) => {
    const m = keep(new THREE.MeshStandardMaterial({map, roughness: 1, metalness: 0, color: C(o.grade ?? '#ffffff'),
      emissive: o.emi ? C(DUSK.cream) : C('#000000'), emissiveMap: o.emi ?? null, emissiveIntensity: o.emi ? 2.6 : 0,
      normalMap: o.nrm ?? null, normalScale: new THREE.Vector2(0.7, 0.7), roughnessMap: o.rough ?? null}))
    // the picture sits in the street's light: damp and darker toward the pavement, a touch dimmer up the wall
    m.onBeforeCompile = sh => {
      sh.vertexShader = 'varying float vFy;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vFy = (modelMatrix * vec4(transformed, 1.0)).y;')
      sh.fragmentShader = 'varying float vFy;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        diffuseColor.rgb *= mix(0.7, 1.0, smoothstep(0.0, 3.5, vFy)) * mix(1.0, 0.92, smoothstep(10.0, 24.0, vFy));`)
        // the street's own warm light on the walls (lamps, shop fronts, the sky's afterglow), the same on both sides of the
        // road: the key light comes from one side only, and without this the far wall of every view sat in the dark
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * vec3(0.34, 0.25, 0.18) * mix(1.0, 0.62, smoothstep(3.0, 18.0, vFy));`)
    }
    m.customProgramCacheKey = () => 'flow-facade'
    return m
  }
  const flowSources = async (all: FlowPiece[]): Promise<Source[]> => {
    const want = lite ? [512, 1024] : [1024, 512]
    return (await Promise.all(all.map(async (p): Promise<Source | null> => {
      const size = flowSize(p, want); if (!size) return null
      const [map, emi, nrm, rough] = await Promise.all([
        loadTex(flowUrl(p.stem, size), true, keep, urls),
        p.files['e-512'] ? loadTex(flowUrl(p.stem, 'e-512'), true, keep, urls) : null,
        !lite && p.files['n-512'] ? loadTex(flowUrl(p.stem, 'n-512'), false, keep, urls) : null,
        !lite && p.files['r-512'] ? loadTex(flowUrl(p.stem, 'r-512'), false, keep, urls) : null,
      ])
      if (!map) return null
      return {id: p.stem, m: facadeMat(map, {emi, nrm, rough, grade: '#ececec', key: p.stem}), H: facadeMetres(p), aspect: 1, u: [0, 1], v: [0, 1], f: [0.62, 1], avg: p.avg ?? '#cfc8bb'}
    }))).filter((v): v is Source => !!v)
  }
  // THE WORKER's own Tel Aviv pictures (lib/life/worker-art, catalog 24.11.2026), for the Israeli streets: the kiosk on a
  // wet night street (its front-on left half), and for Hapoel's own street the old ground's gate block, painted in
  // daylight and graded here to the dusk. The perspective street scenes (Allenby, the promenade, `street`) cannot be
  // laid on a wall and are not used.
  const workerSources = async (): Promise<Source[]> => {
    if (!town || !WORKER_TOWNS.includes(town)) return []
    const list: Promise<Source | null>[] = [
      loadTex(`${WORKER}/tlv/kioskNight.webp`, true, keep, urls).then(t => t && {id: 'worker:kioskNight', m: facadeMat(t, {grade: '#c8c8cc', key: 'kiosk'}), H: 6.4, aspect: (1600 * 0.5) / 625, u: [0, 0.5] as [number, number], v: [0.16, 1] as [number, number], f: [0.85, 1] as [number, number], max: 2, avg: '#6d655e'}),
    ]
    if (x.clubId === 'hapoel-tel-aviv') list.push(loadTex(`${WORKER}/tlv/bloomOldGates.webp`, true, keep, urls).then(t => t && {id: 'worker:bloomOldGates', m: facadeMat(t, {grade: '#6f7690', key: 'gates'}), H: 8, aspect: 1600 / (0.6 * 900), u: [0, 1] as [number, number], v: [0.2, 0.8] as [number, number], f: [0.55, 0.7] as [number, number], max: 1, nearGround: true, avg: '#8a8780'}))
    return (await Promise.all(list)).filter((v): v is Source => !!v)
  }
  const facades = async (all: FlowPiece[]): Promise<string[]> => {
    // a whole building (a numbered facade, the corner block, the block on pilotis) fronts a box; a ground-floor piece (a
    // shop, a café, the kiosk) is laid over the foot of one; a balcony strip waits for its own placement
    const role = (p: FlowPiece) => { const k = p.key ?? ''; return /^\d+$/.test(k) || /^(corner|pilotis)/.test(k) ? 'building' : /^(shop|cafe)/.test(k) ? 'ground' : 'later' }
    const pieces = all.filter(p => role(p) === 'building'), groundFloor = all.filter(p => role(p) === 'ground')
    const [own, worker, gf] = await Promise.all([flowSources(pieces), workerSources(), flowSources(groundFloor)])
    const loaded = [...own, ...worker]
    if (!own.length || dead) return []

    // the street's buildings, laid again to the pictures' own widths, in the gaps the stage left for the crossings
    const walk = level.walk, from = level.bounds.z1 + 16, to = level.goal.z + 40
    type Front = {i: number; s: number; zc: number; W: number; H: number; u0: number; u1: number; flip: boolean; lift: number}
    // Tel Aviv stands some of its blocks on pilotis: the picture is raised a storey and the town builds the open floor under it
    const onPilotis = town === 'tlv' || town === 'hfa' || town === 'ptk'
    const fronts: Front[] = [], used = new Map<number, number>()
    const pickFor = (z: number, last: number) => {
      const near = z < to + 45
      const ok = loaded.map((L, i) => i).filter(i => { const L = loaded[i]!; return (used.get(i) ?? 0) < (L.max ?? 1e9) && (!L.nearGround || near) && (loaded.length < 2 || i !== last) })
      const ground = ok.find(i => loaded[i]!.nearGround); if (ground !== undefined) return ground
      const pool = ok.filter(i => !loaded[i]!.max || rnd() < 0.18)
      return (pool.length ? pool : ok.length ? ok : [0])[Math.floor(rnd() * (pool.length || ok.length || 1))]!
    }
    for (const s of [-1, 1]) {
      let z = from, last = -1
      while (z > to) {
        const i = pickFor(z, last), L = loaded[i]!, H = L.H * (0.96 + rnd() * 0.1)
        const f = L.f[0] + rnd() * (L.f[1] - L.f[0]), W = H * L.aspect * f, zc = z - W / 2
        if (level.crossings.some(c => Math.abs(zc - c) < W / 2 + 8)) { z -= 4; continue }
        const span = L.u[1] - L.u[0], u0 = L.u[0] + rnd() * span * (1 - f)
        const lift = onPilotis && !L.max && W > 7 && rnd() < 0.3 ? 3.0 : 0
        fronts.push({i, s, zc, W, H, u0, u1: u0 + span * f, flip: !L.max && rnd() < 0.5, lift}); used.set(i, (used.get(i) ?? 0) + 1); last = i
        z -= W + (rnd() < 0.15 ? 0.6 : 0)
      }
    }
    // one merged front per picture: a quad per building, its UVs the crop (and the mirror) that building shows
    loaded.forEach((L, i) => {
      const mine = fronts.filter(fr => fr.i === i); if (!mine.length) return
      const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = []
      for (const fr of mine) {
        const fx = fr.s * walk, za = fr.zc + fr.W / 2, zb = fr.zc - fr.W / 2
        // the viewer's right on the left side (s=-1, facing +x) runs toward -z, on the right side toward +z
        const [zl, zr] = fr.s < 0 ? [za, zb] : [zb, za]
        let ul = fr.u0, ur = fr.u1; if (fr.flip) [ul, ur] = [ur, ul]
        const b = pos.length / 3, [v0, v1] = L.v
        pos.push(fx, fr.lift, zl, fx, fr.lift, zr, fx, fr.H + fr.lift, zr, fx, fr.H + fr.lift, zl)
        for (let k = 0; k < 4; k++) nor.push(-fr.s, 0, 0)
        uv.push(ul, v0, ur, v0, ur, v1, ul, v1)
        idx.push(...(fr.s < 0 ? [b, b + 1, b + 2, b, b + 2, b + 3] : [b, b + 2, b + 1, b, b + 3, b + 2]))
      }
      const g = keep(new THREE.BufferGeometry())
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx)
      const mesh = new THREE.Mesh(g, L.m); mesh.receiveShadow = true; mesh.frustumCulled = false; group.add(mesh)
    })
    // the building behind each picture: the procedural wall, set back a hair, tinted to the picture's own colour
    const box = keep(new THREE.BoxGeometry(1, 1, 1))
    const vol = new THREE.InstancedMesh(box, x.wallMat ?? keep(new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 0.9})), fronts.length)
    const m4 = new THREE.Matrix4()
    fronts.forEach((fr, k) => { const L = loaded[fr.i]!; m4.makeScale(9.9, fr.H, fr.W - 0.02).setPosition(fr.s * (walk + 0.06 + 4.95), fr.H / 2 + fr.lift, fr.zc); vol.setMatrixAt(k, m4); vol.setColorAt(k, C(L.avg).lerp(C('#d8d0c2'), 0.35).multiplyScalar(1.05)) })
    vol.receiveShadow = true; group.add(vol)
    roofs(fronts.map(fr => ({s: fr.s, zc: fr.zc, W: fr.W, H: fr.H + fr.lift})))
    // the town's 3D modules on these walls: storeys read from each picture (a shop floor, then ~3.1 m a storey)
    x.onFronts?.(fronts.map(fr => ({s: fr.s, zc: fr.zc, W: fr.W, H: fr.H, lift: fr.lift, floors: Math.max(1, Math.round((fr.H - 5.1) / 3.1) + 1)})))
    // the side streets wear the town's pictures too (they were bare blocks): both rows of every crossing, out to the barrier
    sideStreets(own)
    // a drawn shop or café front over the foot of some buildings (the Flow ground-floor pieces, once drawn)
    if (gf.length) { const pick = fronts.filter(fr => !fr.lift && !loaded[fr.i]!.max && fr.W > 6 && rnd() < 0.35)
      pick.forEach(fr => { const G = gf[Math.floor(rnd() * gf.length)]!, w = 4.6, m = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, w)), G.m); m.rotation.y = -fr.s * Math.PI / 2; m.position.set(fr.s * (walk - 0.04), w / 2, fr.zc + (rnd() - 0.5) * (fr.W - w) * 0.6); group.add(m) }) }
    // a lit shop on some ground floors, in front of the picture's shutters (the stalls and awnings stay where they were)
    const shopG = keep(new THREE.PlaneGeometry(1, 1)), lit = fronts.filter(fr => !loaded[fr.i]!.max && rnd() < 0.45)
    const shops = new THREE.InstancedMesh(shopG, keep(new THREE.MeshBasicMaterial({color: '#ffffff', map: keep(shopTexture(rnd)), toneMapped: false})), Math.max(1, lit.length))
    const shut = new THREE.InstancedMesh(shopG, keep(new THREE.MeshStandardMaterial({map: keep(shutterTexture(rnd)), roughness: 0.6, metalness: 0.3})), Math.max(1, lit.length))
    const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p3 = new THREE.Vector3(), s3 = new THREE.Vector3()
    lit.forEach((fr, k) => { q.setFromAxisAngle(up, -fr.s * Math.PI / 2); const zz = fr.zc + (rnd() - 0.5) * fr.W * 0.2, w = Math.min(5.2, fr.W * 0.5)
      shops.setMatrixAt(k, m4.compose(p3.set(fr.s * (walk - 0.025), 1.3 + fr.lift, zz), q, s3.set(w, 2.0, 1)))
      shops.setColorAt(k, C([DUSK.amber, DUSK.cream, '#ffd8b4', DUSK.cool][Math.floor(rnd() * 4)]!).multiplyScalar(0.8 + rnd() * 0.45))
      // its roller shutter half down at dusk
      const down = 0.5 + rnd() * 0.8; shut.setMatrixAt(k, m4.compose(p3.set(fr.s * (walk - 0.035), 2.3 + fr.lift - down / 2, zz), q, s3.set(w + 0.1, down, 1))) })
    shops.count = shut.count = lit.length; group.add(shops, shut)
    return [...new Set(fronts.map(fr => loaded[fr.i]!.id))]
  }

  /* ---- 1a · the side streets: the town's pictures on both rows of every crossing, from the corner to the barrier ---- */
  const sideStreets = (own: {m: THREE.MeshStandardMaterial; H: number; avg: string}[]) => {
    if (!own.length || !level.side) return
    const per = new Map<number, {pos: number[]; nor: number[]; uv: number[]; idx: number[]}>(), vols: {x: number; z: number; W: number; H: number; c: string}[] = []
    for (const cz of level.crossings) for (const row of [1, -1]) for (const side of [-1, 1]) {
      // the row's front faces the crossing: at cz + row * 7 its normal points back to the crossing (-row in z)
      const fz = cz + row * 6.98
      let xa = level.walk + 10
      while (xa < level.side + 40) {
        const i = Math.floor(rnd() * own.length), L = own[i]!, H = L.H * (0.95 + rnd() * 0.1), W = H * (0.65 + rnd() * 0.3)
        const b = per.get(i) ?? {pos: [], nor: [], uv: [], idx: []}; per.set(i, b)
        const x0 = side * xa, x1 = side * (xa + W), n0 = b.pos.length / 3
        // the viewer's left and right, standing in the crossing and facing the row
        const [xl, xr] = (row > 0) === (side > 0) ? [x1, x0] : [x0, x1]
        const ul = rnd() * 0.3, ur = ul + 0.65 + rnd() * 0.05
        b.pos.push(xl, 0, fz, xr, 0, fz, xr, H, fz, xl, H, fz); for (let k = 0; k < 4; k++) b.nor.push(0, 0, -row)
        b.uv.push(ul, 0, ur, 0, ur, 1, ul, 1)
        b.idx.push(n0, n0 + 1, n0 + 2, n0, n0 + 2, n0 + 3)
        vols.push({x: side * (xa + W / 2), z: cz + row * (6.98 + 5.02), W, H, c: L.avg})
        xa += W + 0.05
      }
    }
    per.forEach((b, i) => { const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2)); g.setIndex(b.idx)
      const m = new THREE.Mesh(g, own[i]!.m); m.frustumCulled = false; group.add(m) })
    const vol = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, 1, 1)), x.wallMat ?? keep(new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 0.9})), vols.length), m4 = new THREE.Matrix4()
    vols.forEach((v, k) => { vol.setMatrixAt(k, m4.makeScale(v.W - 0.02, v.H + 0.02, 10).setPosition(v.x, v.H / 2, v.z)); vol.setColorAt(k, C(v.c).lerp(C('#d8d0c2'), 0.35)) }); vol.frustumCulled = false; group.add(vol)
    roofs([]) // nothing: the side rows keep plain roofs (cheap)
  }

  /* ---- 1b · what stands on the roofs: water tanks and aerials everywhere, solar heaters on the Israeli roofs, chimneys
     in the European towns. Dark against the dusk sky, so a roof line is a skyline and not a ruled edge. ---- */
  const roofs = (list: {s: number; zc: number; W: number; H: number}[]) => {
    const walk = level.walk, il = town === 'tlv' || town === 'hfa' || town === 'ptk', eu = town === 'mos' || town === 'eur'
    const dark = (c: string) => keep(new THREE.MeshStandardMaterial({color: c, roughness: 0.75, metalness: 0.2}))
    const geos = {
      tank: keep(new THREE.CylinderGeometry(0.55, 0.55, 1.2, 10).translate(0, 0.6, 0)),
      leg: keep(new THREE.BoxGeometry(0.08, 0.7, 0.08).translate(0, 0.35, 0)),
      mast: keep(new THREE.CylinderGeometry(0.03, 0.04, 3.2, 5).translate(0, 1.6, 0)),
      bar: keep(new THREE.BoxGeometry(1.4, 0.04, 0.04)),
      panel: keep(new THREE.BoxGeometry(1.1, 0.06, 1.9)),
      chim: keep(new THREE.BoxGeometry(0.7, 1.5, 0.7).translate(0, 0.75, 0)),
      parapet: keep(new THREE.BoxGeometry(1, 0.7, 1).translate(0, 0.35, 0)),
    }
    type Put = {g: THREE.BufferGeometry; m: THREE.Material; at: THREE.Matrix4[]}
    const sets: Put[] = [
      {g: geos.tank, m: dark('#5f646d'), at: []}, {g: geos.leg, m: dark('#2c2e35'), at: []}, {g: geos.mast, m: dark('#24262c'), at: []},
      {g: geos.bar, m: dark('#24262c'), at: []}, {g: geos.panel, m: dark('#27334a'), at: []}, {g: geos.chim, m: dark('#6b5a4e'), at: []},
      {g: geos.parapet, m: x.wallMat ?? dark('#8a8378'), at: []},
    ]
    const [tank, leg, mast, bar, panel, chim, parapet] = sets as [Put, Put, Put, Put, Put, Put, Put]
    const M = (px: number, py: number, pz: number, ry = 0, rx = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0)), new THREE.Vector3(sx, sy, sz))
    for (const fr of list) {
      const y = fr.H, inX = (d: number) => fr.s * (walk + d), zr = () => fr.zc + (rnd() - 0.5) * fr.W * 0.7
      // a low parapet along the front, so the roof edge has a lip
      parapet.at.push(M(inX(0.3), y, fr.zc, 0, 0, 0.45, 0.5 + rnd() * 0.3, fr.W))
      const nT = il ? 1 + Math.floor(rnd() * 3) : rnd() < 0.5 ? 1 : 0
      for (let k = 0; k < nT; k++) { const px = inX(2 + rnd() * 5), pz = zr(), lift = il ? 0.7 : 0
        tank.at.push(M(px, y + lift, pz, 0, 0, 1, il ? 1 : 0.8, 1)); if (lift) for (const [dx, dz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]] as const) leg.at.push(M(px + dx, y, pz + dz)) }
      if (il) { const nS = Math.floor(rnd() * 3); for (let k = 0; k < nS; k++) { const px = inX(1.6 + rnd() * 5), pz = zr(); panel.at.push(M(px, y + 0.8, pz, 0, 0.55 * -fr.s)); tank.at.push(M(px + fr.s * 0.9, y + 0.9, pz, 0, Math.PI / 2, 0.55, 1.2, 0.55)) } }
      if (eu) { const nC = 1 + Math.floor(rnd() * 3); for (let k = 0; k < nC; k++) chim.at.push(M(inX(1 + rnd() * 6), y, zr(), 0, 0, 1, 0.8 + rnd() * 0.8, 1)) }
      const nA = rnd() < 0.75 ? 1 + Math.floor(rnd() * 2) : 0
      for (let k = 0; k < nA; k++) { const px = inX(1.2 + rnd() * 6), pz = zr(), ry = rnd() * Math.PI
        mast.at.push(M(px, y, pz)); for (const h of [2.3, 2.75, 3.1]) bar.at.push(M(px, y + h, pz, ry, 0, 1 - (h - 2.3) * 0.5)) }
    }
    for (const st of sets) { if (!st.at.length) continue; const im = new THREE.InstancedMesh(st.g, st.m, st.at.length); st.at.forEach((m, i) => im.setMatrixAt(i, m)); im.frustumCulled = false; group.add(im) }
  }

  /* ---- 2 · the ground's plate ---- */
  type Plate = {id: string; url: string; v: [number, number]; aspect: number; W: number; y: number; mix: number; /** how far behind the end of the road it stands */ back?: number; /** a daylight photograph is pulled down into the dusk (the owner's own pictures) */ grade?: [number, number, number]}
  const plate = async (pl: Plate): Promise<string | null> => {
    const tex = await loadTex(pl.url, true, keep, urls); if (!tex || dead) return null
    const W = pl.W, H = W / pl.aspect * (pl.v[1] - pl.v[0]), whole = pl.v[0] === 0 && pl.v[1] === 1
    const mat = keep(new THREE.ShaderMaterial({transparent: true, depthWrite: false, fog: false, vertexShader: HAZE_VERT, fragmentShader: HAZE_FRAG,
      uniforms: {map: {value: tex}, uFog: {value: C(DUSK.fog)}, uGrade: {value: new THREE.Vector3(...(pl.grade ?? [1.1, 1.07, 1.1]))}, uMix: {value: pl.mix}, uV0: {value: pl.v[0]}, uV1: {value: pl.v[1]}, uEdge: {value: 0.12}, uTop: {value: whole ? 0.08 : 0.3}, uBottom: {value: whole ? 0.1 : 0.32}, uRep: {value: 1}}}))
    const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(W, H)), mat)
    // drawn after the town's painted backdrop (renderOrder -1, further away): the ground stands in front of the city
    m.position.set(0, H / 2 + pl.y, level.goal.z - (pl.back ?? 115)); m.renderOrder = 0; m.frustumCulled = false; group.add(m)
    // the floodlights' glow over the ground: a soft warm dome above the stands, seen from the start of the street
    const glow = keep(new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!, r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,236,214,1)'); r.addColorStop(0.35, 'rgba(255,214,176,.45)'); r.addColorStop(1, 'rgba(255,200,160,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return c })()))
    const dome = new THREE.Mesh(keep(new THREE.PlaneGeometry(W * 1.1, H * 1.3)), keep(new THREE.MeshBasicMaterial({map: glow, color: C('#ffe2c8').multiplyScalar(0.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false})))
    dome.position.set(0, H * 0.78 + pl.y, level.goal.z - (pl.back ?? 115) + 3); dome.renderOrder = 1; dome.frustumCulled = false; group.add(dome)
    return pl.id
  }

  /* ---- 2b · the air at the end of the road: THE WORKER's mist bank and floodlight haze (every city) ---- */
  const air = async (): Promise<string[]> => {
    const [mist, haze] = await Promise.all([loadTex(`${WORKER}/universal/overlayMist.webp`, true, keep, urls), lite ? null : loadTex(`${WORKER}/universal/overlayHaze.webp`, true, keep, urls)])
    if (dead) return []
    const out: string[] = []
    if (mist) {
      // a low bank only: it lies along the foot of the ground's picture and never over the stands
      const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(260, 26)), keep(new THREE.MeshBasicMaterial({map: mist, color: C(DUSK.fog).multiplyScalar(1.1), transparent: true, opacity: 0.2, depthWrite: false, fog: false})))
      mist.repeat.set(1, 0.42); m.position.set(0, 7, level.goal.z - 60); m.renderOrder = 2; group.add(m); out.push('worker:overlayMist')
    }
    if (haze) {
      const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(300, 170)), keep(new THREE.MeshBasicMaterial({map: haze, color: C('#ffe9d4').multiplyScalar(0.22), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false})))
      m.position.set(0, 80, level.goal.z - 60); m.renderOrder = 3; group.add(m); out.push('worker:overlayHaze')
    }
    return out
  }

  /* ---- 2c · reflections: a Tel Aviv junction (THE WORKER's panorama) under the dusk sky, for the wet street and the glass ---- */
  const env = async (): Promise<string | null> => {
    if (lite || !x.renderer || !town || !WORKER_TOWNS.includes(town)) return null
    const pano = await loadTex(`${WORKER}/tlv/panoTamar.webp`, true, keep, urls); if (!pano || dead) return null
    try {
      const es = new THREE.Scene(), skyM = keep(skyMaterial())
      es.add(new THREE.Mesh(keep(new THREE.SphereGeometry(400, 32, 16)), skyM))
      // a cylinder strip, the junction at street height around the camera, graded from its daylight to the dusk
      const R = 60, H = 2 * Math.PI * R / 2.49
      es.add(new THREE.Mesh(keep(new THREE.CylinderGeometry(R, R, H, 48, 1, true)), keep(new THREE.MeshBasicMaterial({map: pano, side: THREE.BackSide, color: C('#5a6078'), toneMapped: false}))))
      es.children[1]!.position.y = H * 0.3
      const pm = new THREE.PMREMGenerator(x.renderer), rt = pm.fromScene(es, 0.04); keep(rt); pm.dispose()
      scene.environment = rt.texture
      return 'worker:panoTamar'
    } catch { return null }
  }

  /* ---- 3 · the sky band ---- */
  const sky = async (p: FlowPiece): Promise<string | null> => {
    const size = flowSize(p, lite ? [1024, 2048] : [2048, 1024]); if (!size) return null
    const tex = await loadTex(flowUrl(p.stem, size), true, keep, urls); if (!tex || dead) return null
    tex.wrapS = THREE.MirroredRepeatWrapping
    const R = 1000, rep = 4, Hfull = (2 * Math.PI * R / rep) * 9 / 16, v1 = 0.55, Hb = Hfull * v1
    const mat = keep(new THREE.ShaderMaterial({transparent: true, depthWrite: false, fog: false, side: THREE.BackSide, vertexShader: HAZE_VERT, fragmentShader: HAZE_FRAG,
      uniforms: {map: {value: tex}, uFog: {value: C(DUSK.fog)}, uGrade: {value: new THREE.Vector3(0.95, 0.95, 1.02)}, uMix: {value: 0.42}, uV0: {value: 0}, uV1: {value: v1}, uEdge: {value: 0}, uTop: {value: 0.45}, uBottom: {value: 0.08}, uRep: {value: rep}}}))
    band = new THREE.Mesh(keep(new THREE.CylinderGeometry(R, R, Hb, 64, 1, true)), mat)
    // the horizon (a third up the picture) at about eye level, a little above the roofs' line far off
    band.position.y = Hb / 2 - Hfull / 3 + 26; band.userData.y0 = band.position.y
    band.renderOrder = -90; band.frustumCulled = false; group.add(band)
    return p.stem
  }

  let started: Promise<FlowReport> | null = null
  const run = async (): Promise<FlowReport> => {
    // no manifest yet is no Flow pictures yet: THE WORKER's plate, air and reflections still dress the street
    const man = await loadFlowManifest()
    const empty: FlowReport = {facades: [], stadium: null, skyline: null, urls}
    if (dead) return empty
    const fac = flowPieces(man, {kind: 'facade', town, club: x.clubId}).filter(fits)
    const st = flowPieces(man, {kind: 'stadium', club: x.clubId}).filter(fits)
    const sk = flowPieces(man, {kind: 'skyline', town, club: x.clubId}).filter(fits)
    // the ground: the club's own Flow plate (`-a`), or THE WORKER's where it is the better picture of that ground
    // the owner's own photograph of the ground (`-ownerN`, scripts/brand/*-plate.py) wins over any drawn plate: it is
    // already cropped to the stand and graded to the dusk, its sky fading to alpha, so it is shown whole at its own shape
    const owned = st.find(p => /-owner\d+$/.test(p.stem))
    const own = owned ?? st.find(p => p.key === 'a') ?? st[0], ownSize = own && flowSize(own, lite ? [1024, 2048] : [2048, 1024])
    const worker = WORKER_PLATES[x.clubId]
    const ownFile = own && ownSize ? own.files[ownSize] : null
    const pl: Plate | null = worker && !owned && (worker.prefer || !own) ? worker.plate
      : owned && ownSize && ownFile ? {id: owned.stem, url: flowUrl(owned.stem, ownSize), v: [0, 1], aspect: ownFile.w / ownFile.h, W: 520, y: 4, mix: 0.2, back: 45, grade: [0.62, 0.66, 0.84]}
      : own && ownSize ? {id: own.stem, url: flowUrl(own.stem, ownSize), v: [0.4, 1], aspect: 16 / 9, W: 420, y: -6, mix: 0.1, back: 60} : null
    const [f, s, k, a, e] = await Promise.all([fac.length ? facades(fac) : [], pl ? plate(pl) : null, sk[0] ? sky(sk[0]) : null, air(), env()])
    if (dead) return empty
    if (f.length) for (const o of x.replaces()) o.visible = false
    if (s && x.bowl) x.bowl.visible = false
    if (s && x.ground) x.ground.visible = false
    group.visible = true
    const report: FlowReport = {facades: f, stadium: s, skyline: k, air: a, env: e, urls}
    // the QA stands read what the street is wearing (no effect on play)
    if (typeof window !== 'undefined') (window as unknown as {__flowArt?: FlowReport & {group?: THREE.Group}}).__flowArt = {...report, group}
    return report
  }
  // lazily, after the first frame has been drawn: the street is playable before a single picture arrives
  const ready = () => started ??= new Promise<FlowReport>(res => {
    const go = () => run().then(res, () => res({facades: [], stadium: null, skyline: null, urls}))
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(go, lite ? 250 : 30)); else setTimeout(go, 0)
  })
  void ready()
  return {
    ready,
    update(cam) { if (band) { band.position.x = cam.x; band.position.z = cam.z; band.position.y = (band.userData.y0 as number) + cam.y } },
    dispose() { dead = true; scene.remove(group) },
  }
}
