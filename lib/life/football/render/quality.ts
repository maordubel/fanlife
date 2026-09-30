/**
 * רמות איכות — three presets, and what each one actually turns off.
 *
 * Not a slider. Three named settings, chosen automatically from the device and
 * overridable by hand, because the honest choice on a 2019 Android is not "70% detail",
 * it is "fewer people in the stand and no shadow map".
 *
 * The numbers are the ones the renderer reads directly. Nothing else may branch on the
 * preset name — a `if (quality === 'low')` scattered through the scene is how a quality
 * setting becomes three untested renderers.
 */
export type QualityId = 'low' | 'medium' | 'high'

export type QualitySpec = {
  id: QualityId
  /** people drawn in the near tier — instanced, individually posed */
  crowdNear: number
  /** people in the mid tier — instanced, shared phase */
  crowdMid: number
  /** radial segments on the ball; 10 is round enough at broadcast distance */
  ballSegments: number
  /** how many strings each goal net is drawn with, per axis */
  netLines: number
  /** the turf texture's edge, in pixels */
  turfTexture: number
  /** a soft contact decal under every player, always; a real shadow map only on high */
  shadowMap: boolean
  antialias: boolean
  /** cap on the device pixel ratio — the single biggest fill-rate lever on a phone */
  pixelRatio: number
  /** metres of fog-free depth before the stands start to fade */
  fogNear: number
}

export const QUALITY: Record<QualityId, QualitySpec> = {
  low: {
    id: 'low',
    crowdNear: 90,
    crowdMid: 260,
    ballSegments: 8,
    netLines: 8,
    turfTexture: 512,
    shadowMap: false,
    antialias: false,
    pixelRatio: 1,
    fogNear: 70,
  },
  medium: {
    id: 'medium',
    crowdNear: 220,
    crowdMid: 700,
    ballSegments: 12,
    netLines: 12,
    turfTexture: 1024,
    shadowMap: false,
    antialias: true,
    pixelRatio: 1.5,
    fogNear: 95,
  },
  high: {
    id: 'high',
    crowdNear: 420,
    crowdMid: 1400,
    ballSegments: 16,
    netLines: 16,
    turfTexture: 2048,
    shadowMap: true,
    antialias: true,
    pixelRatio: 2,
    fogNear: 130,
  },
}

/**
 * A first guess from the device.
 *
 * Deliberately crude and deliberately pessimistic: the cost of guessing too high is a
 * player whose first thirty seconds of the 1986 final stutter, and the cost of guessing
 * too low is a stand with fewer people in it that he can fix in the pause menu.
 */
export function suggestQuality(): QualityId {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return 'medium'
  const cores = navigator.hardwareConcurrency ?? 4
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const narrow = Math.min(window.innerWidth, window.innerHeight) < 500
  if (coarse && (cores <= 4 || narrow)) return 'low'
  if (coarse) return 'medium'
  return cores >= 8 ? 'high' : 'medium'
}
