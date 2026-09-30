import type { KitSpec } from '@/lib/kit/spec'

/**
 * שער 4 — the contract between the server deal and the client run. Client-safe: types and
 * constants only, no data and no answers (rule 4).
 *
 * FIVE STEPS over the eight-layer spec (brief §8: "the UX can group these details into fewer
 * visible steps, but the data model should remain rich"). A step's option is a BUNDLE of real
 * values read off one real shirt — a body is a base, a pattern and its second ink together — so a
 * distractor is always something the club actually wore, and grading still scores field by field.
 */

export type KitStep = 'body' | 'construction' | 'crest' | 'maker' | 'sponsor'
export const STEP_ORDER: readonly KitStep[] = ['body', 'construction', 'crest', 'maker', 'sponsor']

export type KitGradeField =
  | 'base'
  | 'pattern'
  | 'secondary'
  | 'collar'
  | 'collarInk'
  | 'sleeves'
  | 'sleeveInk'
  | 'crest'
  | 'maker'
  | 'sponsor'

export const STEP_FIELDS: Record<KitStep, readonly KitGradeField[]> = {
  body: ['base', 'pattern', 'secondary'],
  construction: ['collar', 'collarInk', 'sleeves', 'sleeveInk'],
  crest: ['crest'],
  maker: ['maker'],
  sponsor: ['sponsor'],
}

/** points per field — the eight-part weights of V5, with collar and sleeves split into cut and ink */
export const FIELD_WEIGHT: Record<KitGradeField, number> = {
  base: 10,
  pattern: 15,
  secondary: 7,
  collar: 6,
  collarInk: 4,
  sleeves: 6,
  sleeveInk: 4,
  crest: 17,
  maker: 13,
  sponsor: 18,
}

export const STEP_WEIGHT: Record<KitStep, number> = Object.fromEntries(
  STEP_ORDER.map((step) => [step, STEP_FIELDS[step].reduce((sum, field) => sum + FIELD_WEIGHT[field], 0)]),
) as Record<KitStep, number>

/** 100 for a shirt, +15 for a perfect one */
export const SHIRT_POINTS = 100
export const PERFECT_BONUS = 15
export const KIT_ROUND = 5

/**
 * The two ways to play a round (ONE RED WORLD §13): Full is five shirts, Quick is three. A deal
 * is always KIT_ROUND shirts from the cursor; Quick plays the first three of them.
 */
export type KitMode = 'full' | 'quick'
export const KIT_MODE_SIZE: Readonly<Record<KitMode, number>> = { full: KIT_ROUND, quick: 3 }

/** `?n=3` → quick, `?n=5` → full; anything else is no choice yet (the intro asks). */
export function kitModeFrom(raw: string | string[] | undefined): KitMode | null {
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  if (value === KIT_MODE_SIZE.quick) return 'quick'
  if (value === KIT_MODE_SIZE.full) return 'full'
  return null
}

/**
 * The cursor of gate 4 counts SHIRTS, not rounds: a round starts at the cursor's shirt in the
 * seed's deck, and the next round starts where this one stopped — so the cursor advances by the
 * number of shirts actually CONSUMED (3 for Quick, 5 for Full), never by one slice. Mixing the
 * two modes therefore never repeats a shirt before the whole deck was dealt (§13, §49).
 */
export function kitNextCursor(cursor: number, consumed: number): number {
  const safe = Number.isFinite(cursor) && cursor > 0 ? Math.floor(cursor) : 0
  return safe + Math.max(0, Math.floor(consumed))
}

export const KIT_HINT_PENALTY = 8
export const KIT_HINT_LIMIT = 3
/** the DNA of a shirt opens in the studio when its base score reaches this (≈ V5's six of eight) */
export const DNA_THRESHOLD = 75

/**
 * Options per step, by the shirt's place in the round: a warm-up of three, a middle of four, an
 * expert close of five. The only difficulty ramp the repo had already tested (V5), and it rewards
 * knowing the ERA rather than recognising one shirt.
 */
export const OPTION_RAMP: readonly number[] = [3, 4, 4, 4, 5]

export type KitOption = {
  /** opaque — a hash of the value, never the season (rule 31) */
  id: string
  labelHe: string
  /** the long-press / ⓘ sheet — descriptive, and never a year */
  infoHe: string
  /** what the option lays onto the shirt */
  patch: Partial<KitSpec>
}

export type KitPuzzle = {
  id: string
  index: number
  seasonLabel: string
  variant: KitSpec['variant']
  /** the look every option of this puzzle can be drawn in — photo only if ALL of them can */
  look: 'photo' | 'vector'
  /** the garment before the first step: neutral cloth, no marks, the season's cut */
  blank: KitSpec
  steps: { step: KitStep; options: KitOption[] }[]
}

export type KitHintKind = 'whisper' | 'detail' | 'front'
export const HINT_KINDS: readonly KitHintKind[] = ['whisper', 'detail', 'front']

export type KitHintAnswer = {
  kind: KitHintKind
  textHe: string
  penalty: number
  /** server-signed proof the hint was given — the server counts these, not the client's claim */
  receipt: string
}

export type FieldVerdict = { field: KitGradeField; ok: boolean; points: number; truthHe: string; chosenHe: string | null }

export type StepVerdict = {
  step: KitStep
  points: number
  max: number
  correct: boolean
  /** the answer given was one of a conflicted field's alternates */
  tolerant: boolean
  fields: FieldVerdict[]
}

export type KitEvidencePhoto = {
  src: string
  sourceTitle: string
  sourceUrl: string | null
  creditHe: string | null
  /** a year-only photograph: printed with "בערך", never as a season */
  yearRaw: number | null
}

export type KitVerdict = {
  puzzleId: string
  index: number
  seasonLabel: string
  variant: KitSpec['variant']
  look: 'photo' | 'vector'
  steps: StepVerdict[]
  /** steps fully right, 0–5 */
  right: number
  perfect: boolean
  /** field points (0–100) plus the perfect bonus */
  baseScore: number
  hintsUsed: number
  score: number
  answer: KitSpec
  evidence: { kind: 'exact' | 'candidate' | 'reconstruction'; photos: KitEvidencePhoto[] }
  sourceTitle: string
  sourceUrl: string | null
  noteHe: string
  unlock: { key: string; token: string; dna: boolean }
}
