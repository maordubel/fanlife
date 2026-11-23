/**
 * LIFE · a human face — what the seven moods, a blink and a spoken line are in ARKit face units and visemes
 * (the names the asset pipeline writes on Head, Brows, Lashes, Teeth, Tongue). Pure: no three, no DOM.
 */
import type {Mood} from '../figure'

/** every morph target the game drives, in one fixed order (a face is a Float32Array of these) */
export const UNITS = ['mouthSmileLeft', 'mouthSmileRight', 'cheekSquintLeft', 'cheekSquintRight', 'eyeSquintLeft', 'eyeSquintRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight',
  'browDownLeft', 'browDownRight', 'eyeWideLeft', 'eyeWideRight', 'mouthFrownLeft', 'mouthFrownRight', 'jawOpen', 'mouthPressLeft', 'mouthPressRight', 'mouthDimpleLeft', 'mouthDimpleRight',
  'eyeBlinkLeft', 'eyeBlinkRight', 'eyeLookUpLeft', 'eyeLookUpRight', 'eyeLookDownLeft', 'eyeLookDownRight', 'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft', 'eyeLookOutRight',
  'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U', 'viseme_PP', 'viseme_FF', 'viseme_SS', 'mouthUpperUpLeft', 'mouthUpperUpRight', 'noseSneerLeft', 'noseSneerRight'] as const
export type Unit = typeof UNITS[number]
export const U = Object.fromEntries(UNITS.map((n, i) => [n, i])) as Record<Unit, number>

type Mix = Partial<Record<Unit, number>>
const both = (name: string, v: number): Mix => ({[name + 'Left']: v, [name + 'Right']: v}) as Mix
/** a feeling as a face. A resting face is never blank: the mouth is soft and the eyes are a little narrowed by the cheeks. */
export const MOOD_MIX: Record<Mood, Mix> = {
  neutral: {...both('mouthSmile', 0.1), ...both('mouthDimple', 0.05)},
  warm: {...both('mouthSmile', 0.56), ...both('cheekSquint', 0.32), ...both('eyeSquint', 0.16), browInnerUp: 0.2, ...both('browOuterUp', 0.12), ...both('mouthDimple', 0.12)},
  smile: {...both('mouthSmile', 0.72), ...both('cheekSquint', 0.45), ...both('eyeSquint', 0.26), browInnerUp: 0.08, ...both('mouthDimple', 0.15)},
  laugh: {...both('mouthSmile', 0.95), jawOpen: 0.32, ...both('cheekSquint', 0.8), ...both('eyeSquint', 0.55), browInnerUp: 0.22, ...both('mouthUpperUp', 0.25)},
  worried: {browInnerUp: 0.85, ...both('browDown', 0.22), ...both('mouthFrown', 0.38), ...both('mouthPress', 0.15), ...both('eyeWide', 0.1)},
  proud: {...both('mouthSmile', 0.52), ...both('mouthPress', 0.22), ...both('cheekSquint', 0.3), ...both('eyeSquint', 0.2), ...both('browOuterUp', 0.28), browInnerUp: 0.12},
  surprised: {browInnerUp: 0.75, ...both('browOuterUp', 0.8), ...both('eyeWide', 0.55), jawOpen: 0.24, ...both('mouthSmile', 0.12)},
}
/** the mood as a row of UNITS */
export function moodRow(m: Mood): Float32Array {
  const out = new Float32Array(UNITS.length)
  for (const [k, v] of Object.entries(MOOD_MIX[m])) out[U[k as Unit]] = v as number
  return out
}
export const MOOD_ROWS: Record<Mood, Float32Array> = {neutral: moodRow('neutral'), warm: moodRow('warm'), smile: moodRow('smile'), laugh: moodRow('laugh'), worried: moodRow('worried'), proud: moodRow('proud'), surprised: moodRow('surprised')}

/** the mouth shapes a line goes through, in an order that reads as speech (open, spread, round, closed …) */
export const VISEMES: readonly Unit[] = ['viseme_aa', 'viseme_E', 'viseme_PP', 'viseme_O', 'viseme_I', 'viseme_SS', 'viseme_aa', 'viseme_U', 'viseme_FF', 'viseme_E', 'viseme_O', 'viseme_PP']
const hash = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x) }
/**
 * Lips for a line that is being said: about seven shapes a second, each easing into the next, with the small rests of
 * a breath between phrases. Writes into `out` (UNITS), never allocates. `amount` 0 … 1 is how much he is speaking.
 */
export function speak(out: Float32Array, t: number, seed: number, amount: number): void {
  if (amount <= 0.01) return
  const u = t * 7.2 + seed * 13, i = Math.floor(u), f = u - i, e = f * f * (3 - 2 * f)
  const a = VISEMES[Math.floor(hash(i) * VISEMES.length)]!, b = VISEMES[Math.floor(hash(i + 1) * VISEMES.length)]!
  // a phrase, then a breath: the mouth rests about one beat in six
  const phrase = Math.sin(t * 1.7 + seed) > -0.72 ? 1 : 0.15
  const k = amount * phrase * (0.55 + 0.3 * hash(i + 7))
  out[U[a]] = out[U[a]]! + (1 - e) * k; out[U[b]] = out[U[b]]! + e * k
  out[U.jawOpen] = out[U.jawOpen]! + k * 0.12
}
