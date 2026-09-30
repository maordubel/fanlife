import type { KitColour } from './spec'

/**
 * שער 4 — kit truth, normalized (29.9.2026).
 *
 * A shirt's answer is a handful of finite-vocabulary attributes. Three things used to make a
 * right answer read as wrong: the same maker written three ways (`adidas` / `Adidas` /
 * `אדידס`), two inks nobody can tell apart on a photograph (`paper` and `cream`), and a field
 * the archive does not know being graded like a field it does. This file is the whole fix:
 * pure vocabulary, no archive data, no answers — client-safe by construction.
 *
 * A value here is never invented (rule 11): an alias is a spelling the archive or the shirt
 * itself uses, and a name with no alias stays what it was, compared after cosmetic folding.
 */

export type TruthAttribute = 'baseColor' | 'secondaryColor' | 'pattern' | 'collar' | 'manufacturer' | 'sponsor' | 'sleeveStyle'

/** one attribute of a shirt's truth: known with a value, or unknown — which penalizes nobody */
export type TruthValue = { known: true; value: string } | { known: false }

export type FieldJudgement = 'match' | 'mismatch' | 'unknown'

/** spelling-level folding: case, geresh/quotes, dashes, dots and spaces do not name a different thing */
export function fold(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[֑-ׇ]/g, '')
    .toLowerCase()
    .replace(/[׳״'"’`\-_.()\s]/g, '')
}

type AliasMap = Record<string, readonly string[]>

/** canonical id → every spelling the archive or a shirt uses for it */
export const MAKER_ALIASES: AliasMap = {
  adidas: ['adidas', 'אדידס'],
  nike: ['nike', 'נייקי', 'נייק'],
  umbro: ['umbro', 'אמברו'],
  puma: ['puma', 'פומה'],
  kappa: ['kappa', 'קאפה', 'קפה'],
  diadora: ['diadora', 'דיאדורה'],
  macron: ['macron', 'מקרון'],
}

export const SPONSOR_ALIASES: AliasMap = {
  arkia: ['arkia', 'ארקיע'],
  hachshara: ['הכשרה', 'hachshara', 'hachsharahatikshoret', 'הכשרהביטוח'],
  fujicom: ['fujicom', 'פוג׳יקום', 'פוגיקום'],
  fujitsu: ['fujitsu', 'פוג׳יטסו', 'פוג׳יצו', 'פוגיצו'],
  subaru: ['subaru', 'סובארו'],
  keter: ['keter', 'כתר'],
  king: ['king', 'קינג'],
  cal: ['cal', 'כאל', 'קאל'],
  visa: ['visa', 'ויזה'],
  ibi: ['ibi', 'איביאיי', 'איבייאיי'],
  suzuki: ['suzuki', 'סוזוקי'],
  umbro: ['umbro', 'אמברו'],
}

function reverse(map: AliasMap): Map<string, string> {
  const out = new Map<string, string>()
  for (const [id, names] of Object.entries(map)) {
    out.set(fold(id), id)
    for (const name of names) out.set(fold(name), id)
  }
  return out
}

const MAKER_INDEX = reverse(MAKER_ALIASES)
const SPONSOR_INDEX = reverse(SPONSOR_ALIASES)

/** the canonical maker for any spelling; an unaliased name keeps its folded self */
export function canonMaker(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined || raw.trim() === '') return null
  return MAKER_INDEX.get(fold(raw)) ?? fold(raw)
}

export function canonSponsor(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined || raw.trim() === '') return null
  return SPONSOR_INDEX.get(fold(raw)) ?? fold(raw)
}

/**
 * Colours nobody can tell apart on a photograph: the shirt's white and its cream are one
 * chalk family. Red and dark red, black and navy are NOT folded — those are different shirts.
 */
const COLOUR_FAMILY: Record<KitColour, string> = {
  red: 'red',
  deep: 'deep',
  cream: 'chalk',
  paper: 'chalk',
  ink: 'ink',
  navy: 'navy',
  concrete: 'concrete',
}

export const colourFamily = (colour: KitColour): string => COLOUR_FAMILY[colour] ?? colour

export function sameColour(a: KitColour | null | undefined, b: KitColour | null | undefined): boolean {
  if (!a || !b) return false
  return colourFamily(a) === colourFamily(b)
}

/**
 * The one comparison every field goes through. `truth` unknown → `unknown`, which the grader
 * counts as neither right nor wrong (it awards the field and marks it tolerant). Otherwise
 * `same` decides.
 */
export function judge<T>(truth: T | null | undefined, chosen: T | null | undefined, same: (a: T, b: T) => boolean = (a, b) => a === b): FieldJudgement {
  if (truth === null || truth === undefined) return 'unknown'
  if (chosen === null || chosen === undefined) return 'mismatch'
  return same(truth, chosen) ? 'match' : 'mismatch'
}

export const sameMaker = (a: string, b: string): boolean => canonMaker(a) === canonMaker(b)
export const sameSponsor = (a: string, b: string): boolean => canonSponsor(a) === canonSponsor(b)
