/**
 * LIFE · the hood — the DAY. One clock for the whole street and the light that goes with every hour of it (owner,
 * 28.11.2026: "make day and night different, put the lighting in order").
 *
 * Pure: no DOM, no engine. `lightAt(minutes)` blends the hours below into one `DayLight`, which `rush-render/look/daylight.ts`
 * puts on the picture. The hours are taken from THE WORKER's own paintings of the same street: the cool clear morning,
 * the gold afternoon with long tree shadows, the orange promenade sunset, and the deep-blue night where one lit kiosk and
 * one cold lamp carry the frame. The dusk hour is the look the street was approved in (look/dusk.ts), kept number for number.
 * Warm light is orange-amber, never yellow (rule 8).
 */

export type DayLight = {
  /** the sky from the horizon up: six colours on the dome's fixed stops */
  sky: readonly [string, string, string, string, string, string]
  /** haze and what lies under the horizon */
  fog: string
  fogDensity: number
  hemiSky: string
  hemiGround: string
  hemiK: number
  /** the sun, or the moon after dark */
  sun: string
  sunK: number
  /** where it stands: degrees over the horizon, and round the compass (0 = down the street toward the ground, which is west: the sun sets behind the stand) */
  sunEl: number
  sunAz: number
  /** the warm disc of light in the sky (none for the moon), and where on the dome it sits */
  sunGlow: number
  glowAz: number
  glowEl: number
  exposure: number
  /** light that is only light: lamp pools, halos, beams, headlamp glows (0 by day) */
  glow: number
  /** things that are lit from inside: windows, lamp heads, shop fronts, the floodlight banks (0 = unlit glass and paint) */
  lit: number
  /** the grade's night split-tone */
  night: number
  bloom: number
  /** how much the wet road mirrors */
  wet: number
  env: number
  stars: number
  /** painted backdrops (the ground's plate, the skyline) are graded toward the hour */
  plate: number
}

type Key = {at: number} & DayLight

const H = (h: number, m = 0) => h * 60 + m

/** the approved dusk (look/dusk.ts): every other hour is measured against it */
export const DUSK_LIGHT: DayLight = {
  sky: ['#f0a878', '#d9929a', '#8d86ad', '#456aa6', '#1f3a7c', '#0c1a4c'],
  fog: '#8d93ad', fogDensity: 0.0074, hemiSky: '#86a2d8', hemiGround: '#4a3a3e', hemiK: 0.62,
  sun: '#ffbe94', sunK: 1.6, sunEl: 32, sunAz: 202, sunGlow: 1, glowAz: 0, glowEl: 1.7, exposure: 1.05,
  glow: 1, lit: 1, night: 0.55, bloom: 0.32, wet: 1, env: 0.7, stars: 0, plate: 1,
}

const NIGHT: DayLight = {
  sky: ['#1b2446', '#161d3c', '#101733', '#0a1028', '#060a1c', '#030511'],
  fog: '#0d1226', fogDensity: 0.0068, hemiSky: '#4a5f9c', hemiGround: '#17131a', hemiK: 0.4,
  sun: '#9db4e6', sunK: 0.55, sunEl: 48, sunAz: 150, sunGlow: 0, glowAz: 0, glowEl: 2, exposure: 1.08,
  glow: 1.12, lit: 1.08, night: 1, bloom: 0.5, wet: 1.05, env: 0.34, stars: 1, plate: 0.5,
}

const hex = (s: string): [number, number, number] => { const n = parseInt(s.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255] }
const toHex = (c: readonly number[]) => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
/** colours blend in linear light, the way light itself does (a straight blend of two sRGB hexes goes muddy halfway) */
const lin = (v: number) => (v / 255) ** 2.2, un = (v: number) => 255 * v ** (1 / 2.2)
export function mixHex(a: string, b: string, t: number): string {
  const x = hex(a), y = hex(b)
  return toHex([0, 1, 2].map(i => un(lin(x[i]!) + (lin(y[i]!) - lin(x[i]!)) * t)))
}
const mixN = (a: number, b: number, t: number) => a + (b - a) * t
/** the shortest way round the compass */
const mixAz = (a: number, b: number, t: number) => { const d = ((b - a + 540) % 360) - 180; return (a + d * t + 360) % 360 }
function mix(a: DayLight, b: DayLight, t: number): DayLight {
  return {
    sky: a.sky.map((c, k) => mixHex(c, b.sky[k]!, t)) as unknown as DayLight['sky'],
    fog: mixHex(a.fog, b.fog, t), fogDensity: mixN(a.fogDensity, b.fogDensity, t),
    hemiSky: mixHex(a.hemiSky, b.hemiSky, t), hemiGround: mixHex(a.hemiGround, b.hemiGround, t), hemiK: mixN(a.hemiK, b.hemiK, t),
    sun: mixHex(a.sun, b.sun, t), sunK: mixN(a.sunK, b.sunK, t), sunEl: mixN(a.sunEl, b.sunEl, t), sunAz: mixAz(a.sunAz, b.sunAz, t),
    sunGlow: mixN(a.sunGlow, b.sunGlow, t), glowAz: mixAz(a.glowAz, b.glowAz, t), glowEl: mixN(a.glowEl, b.glowEl, t),
    exposure: mixN(a.exposure, b.exposure, t), glow: mixN(a.glow, b.glow, t), lit: mixN(a.lit, b.lit, t),
    night: mixN(a.night, b.night, t), bloom: mixN(a.bloom, b.bloom, t), wet: mixN(a.wet, b.wet, t), env: mixN(a.env, b.env, t),
    stars: mixN(a.stars, b.stars, t), plate: mixN(a.plate, b.plate, t),
  }
}

// sunset: the horizon burns behind the stand, the first lamps come on (the promenade)
const SUNSET: DayLight = {sky: ['#f7a26a', '#ec9684', '#b990a8', '#6f86be', '#3f5ea6', '#21407e'], fog: '#b9a39e', fogDensity: 0.0066,
  hemiSky: '#a2b2dc', hemiGround: '#5e4840', hemiK: 0.66, sun: '#ffb47e', sunK: 2.0, sunEl: 9, sunAz: 352, sunGlow: 1.25, glowAz: 0, glowEl: 6,
  exposure: 1.06, glow: 0.55, lit: 0.6, night: 0.25, bloom: 0.3, wet: 0.6, env: 0.78, stars: 0, plate: 1.15}
// the sun is gone: for a breath nothing casts a shadow, and in that breath the light changes sides (the sky's afterglow
// lights the street from behind the walker, as the approved dusk has it) without a shadow seen swinging
const GONE = mix(SUNSET, DUSK_LIGHT, 0.5)

const KEYS: readonly Key[] = [
  {at: H(0), ...NIGHT},
  {at: H(4, 50), ...NIGHT},
  // first light: the lamps are still on under a sky going from ink to rose
  {at: H(6), sky: ['#f2b596', '#d8a2a8', '#9a9cc0', '#6f8fc4', '#4a6fb0', '#2c4a8c'], fog: '#a4a8bc', fogDensity: 0.0082,
    hemiSky: '#9db3dc', hemiGround: '#544a48', hemiK: 0.6, sun: '#ffc9a6', sunK: 1.2, sunEl: 6, sunAz: 180, sunGlow: 0.9, glowAz: 180, glowEl: 3,
    exposure: 1.02, glow: 0.7, lit: 0.75, night: 0.4, bloom: 0.3, wet: 0.95, env: 0.62, stars: 0.05, plate: 0.95},
  // morning: cool, clear, washed (THE WORKER's "cool daylight" street); the sun is behind the walker and the street is front-lit
  {at: H(8), sky: ['#d6e2ec', '#b9d2ea', '#8fb9e6', '#5f98dc', '#3d79c8', '#2a5aa8'], fog: '#c2d0dc', fogDensity: 0.0046,
    hemiSky: '#cfe2f8', hemiGround: '#8a8072', hemiK: 1.3, sun: '#fff0dc', sunK: 2.5, sunEl: 30, sunAz: 170, sunGlow: 0.35, glowAz: 170, glowEl: 28,
    exposure: 1.1, glow: 0, lit: 0, night: 0, bloom: 0.16, wet: 0.2, env: 0.95, stars: 0, plate: 1.5},
  // noon: high sun from the side, short shadows, a pale hot sky
  {at: H(12, 30), sky: ['#dfe8ee', '#c4daec', '#96bfe8', '#5f9ce0', '#3a7ccc', '#275cae'], fog: '#cdd6dc', fogDensity: 0.004,
    hemiSky: '#d8e8fa', hemiGround: '#948878', hemiK: 1.4, sun: '#fff6e8', sunK: 3.1, sunEl: 68, sunAz: 95, sunGlow: 0.2, glowAz: 95, glowEl: 66,
    exposure: 1.14, glow: 0, lit: 0, night: 0, bloom: 0.14, wet: 0.08, env: 1, stars: 0, plate: 1.6},
  // the gold afternoon: a low warm sun ahead, long soft shadows on pale walls (Allenby, 1986)
  {at: H(16, 30), sky: ['#f6dcc0', '#e6d2c4', '#b4c8de', '#74a2d8', '#4a80c6', '#305fa6'], fog: '#d8cdbd', fogDensity: 0.0052,
    hemiSky: '#c6d6ee', hemiGround: '#967a60', hemiK: 1.3, sun: '#ffd2a0', sunK: 2.9, sunEl: 24, sunAz: 330, sunGlow: 0.8, glowAz: 345, glowEl: 20,
    exposure: 1.12, glow: 0, lit: 0.08, night: 0, bloom: 0.22, wet: 0.22, env: 0.9, stars: 0, plate: 1.4},
  {at: H(17, 50), ...SUNSET},
  {at: H(18, 12), ...GONE, sunK: 0.25, sunAz: SUNSET.sunAz, sunEl: 5},
  {at: H(18, 14), ...GONE, sunK: 0.25, sunAz: DUSK_LIGHT.sunAz, sunEl: DUSK_LIGHT.sunEl},
  {at: H(18, 40), ...DUSK_LIGHT},
  // the last blue: the sky still holds, every lamp and window is on
  {at: H(19, 40), sky: ['#5a5c8c', '#474a7c', '#30386a', '#1d2a5a', '#101c46', '#070e2c'], fog: '#3a4066', fogDensity: 0.0072,
    hemiSky: '#5e78b8', hemiGround: '#2a2228', hemiK: 0.5, sun: '#b4c2ea', sunK: 0.7, sunEl: 36, sunAz: 170, sunGlow: 0.1, glowAz: 0, glowEl: 1,
    exposure: 1.07, glow: 1.08, lit: 1.05, night: 0.85, bloom: 0.42, wet: 1.05, env: 0.5, stars: 0.45, plate: 0.7},
  {at: H(20, 40), ...NIGHT},
  {at: H(24), ...NIGHT},
]

export const DAY_MINUTES = 1440
export const wrapDay = (m: number) => ((m % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES

/** the light of this minute of the day */
export function lightAt(minutes: number): DayLight {
  const m = wrapDay(minutes)
  let i = 0
  while (i < KEYS.length - 2 && KEYS[i + 1]!.at <= m) i++
  const a = KEYS[i]!, b = KEYS[i + 1]!
  const raw = b.at === a.at ? 0 : Math.max(0, Math.min(1, (m - a.at) / (b.at - a.at)))
  return mix(a, b, raw * raw * (3 - 2 * raw))
}

export type DayPart = 'night' | 'dawn' | 'morning' | 'midday' | 'afternoon' | 'sunset' | 'dusk' | 'evening'
/** the name of the hour, for the HUD and the words */
export function dayPart(minutes: number): DayPart {
  const m = wrapDay(minutes)
  if (m < H(5, 15)) return 'night'
  if (m < H(7)) return 'dawn'
  if (m < H(11)) return 'morning'
  if (m < H(14, 30)) return 'midday'
  if (m < H(17, 15)) return 'afternoon'
  if (m < H(18, 20)) return 'sunset'
  if (m < H(19, 20)) return 'dusk'
  if (m < H(21)) return 'evening'
  return 'night'
}
/** is it dark enough for the lamps (the sim's people, the sound and the words may ask) */
export const isDark = (minutes: number): boolean => lightAt(minutes).lit > 0.5

/* ───────────── the clock ───────────── */

/** one game minute every 1.5 seconds of play: a whole day in 36 minutes, a matchday evening in about four */
export const SECONDS_PER_MINUTE = 1.5
export const clockAfter = (minutes: number, seconds: number): number => wrapDay(minutes + Math.max(0, seconds) / SECONDS_PER_MINUTE)
export function clockLabel(minutes: number): string {
  const m = Math.floor(wrapDay(minutes))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** the hour a mission begins at: the story sets the clock, the street only keeps it running */
export type MissionHour = {day: 'any' | 'matchday'; place: string; kind: 'main' | 'side' | 'standing'}
export function missionStart(m: MissionHour): number {
  // matchday: the gold hour before kick-off, so the walk to the ground goes through sunset into the floodlights
  if (m.day === 'matchday') return H(16, 50)
  if (m.place === 'school') return H(7, 35)
  if (m.place === 'pitch') return H(15, 40)
  if (m.place === 'kiosk') return H(10, 20)
  if (m.place === 'ground') return H(17, 30)
  if (m.place === 'home') return H(18, 10)
  return H(14)
}
/** a new life begins on the afternoon of a matchday */
export const FIRST_CLOCK = H(16, 50)
/**
 * Where the clock goes when a mission is taken: forward to the mission's hour, never backward within the same day part
 * (taking a morning job at 08:10 does not rewind to 07:35), and a job taken in the dark waits for its own hour tomorrow.
 */
export function clockForMission(now: number, m: MissionHour): number {
  const want = missionStart(m), cur = wrapDay(now)
  if (Math.abs(cur - want) <= 75) return cur
  return want
}
