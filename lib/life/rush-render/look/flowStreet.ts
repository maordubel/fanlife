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
  /** the street's blocks as the stage laid them (only their crossings gaps are reused) */
  blocks: Block[]
}
export type FlowDress = {update(cam: THREE.Vector3): void; ready(): Promise<FlowReport>; dispose(): void}
export type FlowReport = {facades: string[]; stadium: string | null; skyline: string | null; air?: string[]; env?: string | null; urls: string[]}

/** THE WORKER's imported pictures (lib/life/worker-art/imported.json) and the towns that may borrow its Tel Aviv set */
const WORKER = '/life/worker'
const WORKER_TOWNS: readonly string[] = ['tlv', 'hfa', 'ptk']
/** THE WORKER's picture of a club's ground, where it beats the Flow plate (`prefer`) or stands in until one is drawn */
const WORKER_PLATES: Record<string, {prefer: boolean; plate: {id: string; url: string; v: [number, number]; aspect: number; W: number; y: number; mix: number}}> = {
  'hapoel-tel-aviv': {prefer: false, plate: {id: 'worker:introReturnHome', url: `${WORKER}/tlv/introReturnHome.webp`, v: [0.3, 0.92], aspect: 16 / 9, W: 300, y: -12, mix: 0.3}},
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
    vec3 c = texture2D(map, uv).rgb * uGrade;
    float l = dot(c, vec3(.2126,.7152,.0722));
    c = mix(c, vec3(l) * vec3(.95,.97,1.05), .18);
    c = mix(c, uFog, uMix * (0.55 + 0.45 * (1. - smoothstep(0., .9, vUv.y))));
    float e = max(uEdge, 1e-4);
    float a = clamp(vUv.x / e, 0., 1.) * clamp((1. - vUv.x) / e, 0., 1.);
    a *= 1. - smoothstep(1. - max(uTop, 1e-4), 1., vUv.y);
    a *= smoothstep(0., max(uBottom, 1e-4), vUv.y);
    a = a * a * (3. - 2. * a);
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
      emissive: o.emi ? C(DUSK.cream) : C('#000000'), emissiveMap: o.emi ?? null, emissiveIntensity: o.emi ? 1.7 : 0,
      normalMap: o.nrm ?? null, normalScale: new THREE.Vector2(0.7, 0.7), roughnessMap: o.rough ?? null}))
    // the picture sits in the street's light: damp and darker toward the pavement, a touch dimmer up the wall
    m.onBeforeCompile = sh => {
      sh.vertexShader = 'varying float vFy;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vFy = (modelMatrix * vec4(transformed, 1.0)).y;')
      sh.fragmentShader = 'varying float vFy;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        diffuseColor.rgb *= mix(0.62, 1.0, smoothstep(0.0, 3.5, vFy)) * mix(1.0, 0.9, smoothstep(10.0, 24.0, vFy));`)
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
      return {id: p.stem, m: facadeMat(map, {emi, nrm, rough, grade: '#d9d9d9', key: p.stem}), H: facadeMetres(p), aspect: 1, u: [0, 1], v: [0, 1], f: [0.62, 1], avg: p.avg ?? '#cfc8bb'}
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
  const facades = async (pieces: FlowPiece[]): Promise<string[]> => {
    const [own, worker] = await Promise.all([flowSources(pieces), workerSources()])
    const loaded = [...own, ...worker]
    if (!own.length || dead) return []

    // the street's buildings, laid again to the pictures' own widths, in the gaps the stage left for the crossings
    const walk = level.walk, from = level.bounds.z1 + 16, to = level.goal.z + 40
    type Front = {i: number; s: number; zc: number; W: number; H: number; u0: number; u1: number; flip: boolean}
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
        fronts.push({i, s, zc, W, H, u0, u1: u0 + span * f, flip: !L.max && rnd() < 0.5}); used.set(i, (used.get(i) ?? 0) + 1); last = i
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
        pos.push(fx, 0, zl, fx, 0, zr, fx, fr.H, zr, fx, fr.H, zl)
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
    fronts.forEach((fr, k) => { const L = loaded[fr.i]!; m4.makeScale(9.9, fr.H, fr.W - 0.02).setPosition(fr.s * (walk + 0.06 + 4.95), fr.H / 2, fr.zc); vol.setMatrixAt(k, m4); vol.setColorAt(k, C(L.avg).lerp(C('#d8d0c2'), 0.35).multiplyScalar(1.05)) })
    vol.receiveShadow = true; group.add(vol)
    // a lit shop on some ground floors, in front of the picture's shutters (the stalls and awnings stay where they were)
    const shopG = keep(new THREE.PlaneGeometry(1, 1)), lit = fronts.filter(fr => !loaded[fr.i]!.max && rnd() < 0.45)
    const shops = new THREE.InstancedMesh(shopG, keep(new THREE.MeshBasicMaterial({color: '#ffffff', toneMapped: false})), Math.max(1, lit.length))
    const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p3 = new THREE.Vector3(), s3 = new THREE.Vector3()
    lit.forEach((fr, k) => { q.setFromAxisAngle(up, -fr.s * Math.PI / 2); shops.setMatrixAt(k, m4.compose(p3.set(fr.s * (walk - 0.025), 1.3, fr.zc + (rnd() - 0.5) * fr.W * 0.2), q, s3.set(Math.min(5.2, fr.W * 0.5), 2.0, 1)))
      shops.setColorAt(k, C([DUSK.amber, DUSK.cream, '#ffd8b4', DUSK.cool][Math.floor(rnd() * 4)]!).multiplyScalar(1.0 + rnd() * 0.6)) })
    shops.count = lit.length; group.add(shops)
    return [...new Set(fronts.map(fr => loaded[fr.i]!.id))]
  }

  /* ---- 2 · the ground's plate ---- */
  type Plate = {id: string; url: string; v: [number, number]; aspect: number; W: number; y: number; mix: number}
  const plate = async (pl: Plate): Promise<string | null> => {
    const tex = await loadTex(pl.url, true, keep, urls); if (!tex || dead) return null
    const W = pl.W, H = W / pl.aspect * (pl.v[1] - pl.v[0])
    const mat = keep(new THREE.ShaderMaterial({transparent: true, depthWrite: false, fog: false, vertexShader: HAZE_VERT, fragmentShader: HAZE_FRAG,
      uniforms: {map: {value: tex}, uFog: {value: C(DUSK.fog)}, uGrade: {value: new THREE.Vector3(1.0, 0.98, 1.04)}, uMix: {value: pl.mix}, uV0: {value: pl.v[0]}, uV1: {value: pl.v[1]}, uEdge: {value: 0.16}, uTop: {value: 0.3}, uBottom: {value: 0.25}, uRep: {value: 1}}}))
    const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(W, H)), mat)
    m.position.set(0, H / 2 + pl.y, level.goal.z - 115); m.renderOrder = -1; m.frustumCulled = false; group.add(m)
    return pl.id
  }

  /* ---- 2b · the air at the end of the road: THE WORKER's mist bank and floodlight haze (every city) ---- */
  const air = async (): Promise<string[]> => {
    const [mist, haze] = await Promise.all([loadTex(`${WORKER}/universal/overlayMist.webp`, true, keep, urls), lite ? null : loadTex(`${WORKER}/universal/overlayHaze.webp`, true, keep, urls)])
    if (dead) return []
    const out: string[] = []
    if (mist) {
      // a low bank only: it lies along the foot of the ground's picture and never over the stands
      const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(260, 26)), keep(new THREE.MeshBasicMaterial({map: mist, color: C(DUSK.fog).multiplyScalar(1.1), transparent: true, opacity: 0.32, depthWrite: false, fog: false})))
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
    const own = st.find(p => p.key === 'a') ?? st[0], ownSize = own && flowSize(own, lite ? [1024, 2048] : [2048, 1024])
    const worker = WORKER_PLATES[x.clubId]
    const pl: Plate | null = worker && (worker.prefer || !own) ? worker.plate
      : own && ownSize ? {id: own.stem, url: flowUrl(own.stem, ownSize), v: [0.36, 1], aspect: 16 / 9, W: 290, y: -14, mix: 0.22} : null
    const [f, s, k, a, e] = await Promise.all([fac.length ? facades(fac) : [], pl ? plate(pl) : null, sk[0] ? sky(sk[0]) : null, air(), env()])
    if (dead) return empty
    if (f.length) for (const o of x.replaces()) o.visible = false
    if (s && x.bowl) x.bowl.visible = false
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
