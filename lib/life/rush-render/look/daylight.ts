/**
 * LIFE · the hood — the day on the picture (owner, 28.11.2026: day and night are different, the lighting is in order).
 *
 * `lib/life/hood/daylight.ts` says what the light of a minute is; this puts it on the street that look/dusk.ts built:
 * the sky dome, the haze, the sun or the moon and where its shadows fall, the exposure and the grade, and above all what
 * is ON. The street was dressed for dusk with hundreds of lit things (lamp heads and their pools, windows, shop fronts,
 * string lights, floodlight banks, headlamps). They are found once by what they are, not listed by hand:
 *   - additive light (pools, halos, beams, glow points) fades out to nothing by day;
 *   - things lit from inside (unlit, never tone-mapped) go back to what they are with the power off: dark glass, a pale
 *     panel, a shop seen by daylight;
 *   - emissive paint (awnings, the Flow facades' lit windows) follows the same switch.
 * Late arrivals (the Flow pictures, the kiln props) are picked up by a slow re-scan. Nothing here allocates per frame.
 */
import * as THREE from 'three'
import {lightAt, type DayLight} from '@/lib/life/hood/daylight'

type Tracked = {kind: 'glow' | 'lit' | 'emis'; base: THREE.Color; k: number; day: THREE.Color; /** a wall painted at dusk: its own colour, lifted by day */ wall?: THREE.Color; /** the road and the pavement: wet at dusk, dry in the sun */ ground?: {rough: number; metal: number; col: THREE.Color}}
type LitMaterial = THREE.Material & {color?: THREE.Color; emissive?: THREE.Color; emissiveIntensity?: number; map?: THREE.Texture | null; toneMapped: boolean}

export type DaylightCtx = {
  scene: THREE.Scene; renderer: THREE.WebGLRenderer
  /** the dome's material (look/dusk.ts `skyMaterial`) */
  sky: THREE.ShaderMaterial
  hemi: THREE.HemisphereLight; key: THREE.DirectionalLight
  /** the lamps' own point lights (the stage moves them; this sets how strong they are) */
  lamps: readonly THREE.PointLight[]; gate: THREE.PointLight | null
  /** the wet road's mirror and its pavement overlays */
  wet: readonly THREE.ShaderMaterial[]
  grade: {uNight: {value: number}}
  bloom: {strength: number} | null
  /** re-light the environment map from the sky as it is now */
  bakeEnv: () => void
}
export type Daylight = {
  /** put this minute of the day on the street (cheap; call every frame or on a change) */
  set(minutes: number): void
  /** look for lit things that arrived since the last look */
  scan(): void
  /** where the sun stands from the player, for the stage to hang the key light on */
  readonly sun: THREE.Vector3
  readonly light: DayLight
  /** the bloom this hour wants before the stage adds its own beats */
  readonly bloomBase: number
  readonly dark: boolean
}

const GLASS = new THREE.Color('#1d2733'), PANEL = 0.4
const rad = (d: number) => d * Math.PI / 180
const dir = (az: number, el: number, out: THREE.Vector3) => out.set(Math.sin(rad(az)) * Math.cos(rad(el)), Math.sin(rad(el)), -Math.cos(rad(az)) * Math.cos(rad(el)))

export function createDaylight(x: DaylightCtx): Daylight {
  const seen = new WeakMap<THREE.Material, Tracked>(), list: {m: LitMaterial; t: Tracked}[] = []
  const plates: {m: THREE.ShaderMaterial; grade: THREE.Vector3 | null}[] = [], plateSeen = new WeakSet<THREE.Material>()
  const lampBase = x.lamps.map(l => l.intensity), gateBase = x.gate?.intensity ?? 0
  const wetBase = x.wet.map(m => ({base: Number(m.uniforms.uBase?.value ?? 0), pud: Number(m.uniforms.uPud?.value ?? 0)}))
  const sun = new THREE.Vector3(), tmp = new THREE.Color(), fogC = new THREE.Color()
  let light = lightAt(18 * 60 + 40), last = -1, bakedAt = -1e9, bloomBase = light.bloom

  const track = (m: LitMaterial) => {
    if (seen.has(m) || m.userData.dayFixed || (m as unknown as THREE.ShaderMaterial).isShaderMaterial) return
    let t: Tracked | null = null
    const std = (m as unknown as THREE.MeshStandardMaterial).isMeshStandardMaterial
    if (!std && m.color && m.blending === THREE.AdditiveBlending) t = {kind: 'glow', base: m.color.clone(), k: 1, day: GLASS}
    else if (!std && m.color && m.toneMapped === false) {
      // with the power off: a picture (a shop front, a sign, a lamp bank) is seen by daylight at a panel's brightness in
      // its own tint; a plain lit pane is dark glass
      const b = m.color, peak = Math.max(b.r, b.g, b.b, 1e-3)
      t = {kind: 'lit', base: b.clone(), k: 1, day: m.map ? b.clone().multiplyScalar(PANEL / peak) : GLASS}
    } else if (std && m.emissive && (m.emissiveIntensity ?? 0) > 0 && (m.emissive.r + m.emissive.g + m.emissive.b) > 0) t = {kind: 'emis', base: m.emissive.clone(), k: m.emissiveIntensity ?? 1, day: GLASS}
    if (m.userData.dayGround && std) { const g = m as unknown as THREE.MeshStandardMaterial; t = {kind: 'emis', base: new THREE.Color(0), k: 0, day: GLASS, ground: {rough: g.roughness, metal: g.metalness, col: g.color.clone()}} }
    if (m.userData.dayWall && m.color) { if (t) t.wall = m.color.clone(); else t = {kind: 'emis', base: new THREE.Color(0), k: 0, day: GLASS, wall: m.color.clone()} }
    if (!t) return
    seen.set(m, t); list.push({m, t}); paint(m, t)
  }
  const paint = (m: LitMaterial, t: Tracked) => {
    if (t.kind === 'glow') m.color!.copy(t.base).multiplyScalar(light.glow)
    else if (t.kind === 'lit') { const k = Math.min(1, light.lit); m.color!.copy(tmp.copy(t.day).lerp(t.base, k)); if (light.lit > 1) m.color!.multiplyScalar(light.lit) }
    else m.emissiveIntensity = t.k * light.lit
    if (t.ground) { const g = m as unknown as THREE.MeshStandardMaterial, dry = Math.max(0, Math.min(1, 1 - light.wet)); g.roughness = t.ground.rough + (0.92 - t.ground.rough) * dry; g.metalness = t.ground.metal * (1 - dry); g.color.copy(t.ground.col).multiplyScalar(1 + dry * 1.6) }
    if (t.wall) m.color!.copy(t.wall).multiplyScalar(1 + (light.plate - 1) * 1.5 * (light.plate > 1 ? 1 : 0.6))
  }
  function scan() {
    for (const e of list) paint(e.m, e.t)
    x.scene.traverse(o => {
      const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
      if (!mat) return
      for (const m of Array.isArray(mat) ? mat : [mat]) {
        const sh = m as THREE.ShaderMaterial
        if (sh.isShaderMaterial) {
          // the painted backdrops carry the haze's colour and a grade of their own
          if (!plateSeen.has(sh) && sh.uniforms?.uFog?.value instanceof THREE.Color) { plateSeen.add(sh); const g = sh.uniforms.uGrade?.value; plates.push({m: sh, grade: g instanceof THREE.Vector3 ? g.clone() : null}); paintPlate(plates[plates.length - 1]!) }
          continue
        }
        track(m as LitMaterial)
      }
    })
  }
  const paintPlate = (p: {m: THREE.ShaderMaterial; grade: THREE.Vector3 | null}) => {
    (p.m.uniforms.uFog!.value as THREE.Color).copy(fogC)
    if (p.grade) (p.m.uniforms.uGrade!.value as THREE.Vector3).copy(p.grade).multiplyScalar(light.plate)
  }

  function set(minutes: number) {
    // a quarter of a game minute is finer than the eye: skip the frames in between
    const q = Math.round(minutes * 4) / 4
    if (q === last) return
    last = q; light = lightAt(q)
    const u = x.sky.uniforms
    ;(u.uC!.value as THREE.Color[]).forEach((c, i) => c.set(light.sky[i]!))
    ;(u.uBelow!.value as THREE.Color).set(light.fog)
    dir(light.glowAz, light.glowEl, u.uSun!.value as THREE.Vector3)
    if (u.uGlow) u.uGlow.value = light.sunGlow
    if (u.uStars) u.uStars.value = light.stars
    fogC.set(light.fog)
    const fog = x.scene.fog as THREE.FogExp2 | null
    if (fog) { fog.color.copy(fogC); fog.density = light.fogDensity }
    x.hemi.color.set(light.hemiSky); x.hemi.groundColor.set(light.hemiGround); x.hemi.intensity = light.hemiK
    x.key.color.set(light.sun); x.key.intensity = light.sunK
    dir(light.sunAz, light.sunEl, sun).multiplyScalar(32)
    x.renderer.toneMappingExposure = light.exposure
    x.scene.environmentIntensity = light.env
    x.grade.uNight.value = light.night
    bloomBase = light.bloom
    x.lamps.forEach((l, i) => { l.intensity = lampBase[i]! * light.glow; l.visible = light.glow > 0.02 })
    if (x.gate) x.gate.intensity = gateBase * (0.2 + 0.8 * Math.min(1, light.lit))
    x.wet.forEach((m, i) => { const b = wetBase[i]!; if (m.uniforms.uBase) m.uniforms.uBase.value = b.base * light.wet; if (m.uniforms.uPud) m.uniforms.uPud.value = b.pud * Math.min(1.05, 0.12 + 0.9 * light.wet); if (m.uniforms.uFog) m.uniforms.uFog.value = light.fogDensity })
    for (const e of list) paint(e.m, e.t)
    for (const p of plates) paintPlate(p)
    // what the sky lights changes slowly: the reflections are re-lit at most every twenty game minutes
    if (Math.abs(q - bakedAt) >= 20) { bakedAt = q; try { x.bakeEnv() } catch { /* the last environment stays */ } }
  }

  scan()
  return {set, scan, sun, get light() { return light }, get bloomBase() { return bloomBase }, get dark() { return light.lit > 0.5 }}
}
