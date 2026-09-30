import { trackStageFlag } from '../tracks'
import type { LifeState } from '../types'

/**
 * מה פוגי חווה, לא איפה הוא לחץ — semantic milestones and the reconciliation that repairs
 * them.
 *
 * Reconciliation records facts the world already proves. It never invents a consequence
 * and never awards money, reputation or a relationship; it only raises a persistent flag
 * that says the same fact in vocabulary another system can read.
 */

const flag = (state: LifeState, name: string) => Boolean(state.flags[name])
const value = (state: LifeState, name: string) => state.flags[name]

export type Milestone = {
  id: string
  meaningHe: string
  when: (state: LifeState) => boolean
}

/**
 * Story milestones keep the historical `life:` contract. Existing flow tests deliberately
 * assert this: they are experiences, not ownership/titles.
 */
export const MILESTONES: readonly Milestone[] = [
  {
    id: 'life:seen:ussishkin',
    meaningHe: 'פוגי היה בפעם הראשונה באולם אוסישקין, ואפי הראה לו אותו',
    when: (state) =>
      flag(state, 'a3:inside') &&
      ((flag(state, 'saw:parquet') && flag(state, 'saw:stand')) || flag(state, 'a3:shown')),
  },
]

/**
 * LIFE-track / household milestones are ownership facts and therefore use `own:`. The
 * continuation screenplay predates `tracks.ts`; translating its existing durable facts
 * here keeps old saves valid and avoids duplicating truth inside every dialogue choice.
 */
export const TRACK_MILESTONES: readonly Milestone[] = [
  {
    id: trackStageFlag('PARTNERSHIP', 'first'),
    meaningHe: 'נוצר קשר זוגי בהסכמה הדדית',
    when: (state) => typeof value(state, 'life:partner') === 'string' && String(value(state, 'life:partner')).length > 0,
  },
  {
    id: trackStageFlag('PARTNERSHIP', 'together'),
    meaningHe: 'פוגי ובן/בת הזוג בחרו להמשיך ביחד',
    when: (state) => typeof value(state, 'life:partner') === 'string' && String(value(state, 'life:partner')).length > 0,
  },
  {
    id: trackStageFlag('WORK', 'first-job'),
    meaningHe: 'פוגי לקח על עצמו עבודה ראשונה כחלק מחיי המבוגר',
    when: (state) => value(state, 'b:commitKind') === 'work',
  },
  /**
   * `hh:home` is chapter-local. Persist the household fact before a year transition clears
   * it. This intentionally does NOT claim PARTNERSHIP/home: a shared-home relationship
   * needs explicit fiction, while this says only that adult household costs now exist.
   */
  {
    id: 'own:home:independent',
    meaningHe: 'פוגי מנהל משק בית עצמאי ולא חי עוד כילד אצל ההורים',
    when: (state) => typeof value(state, 'hh:home') === 'string' && String(value(state, 'hh:home')).length > 0,
  },
  /** Intent is not parenthood. `life:child` is raised only after L06's time passage. */
  {
    id: trackStageFlag('PARENTHOOD', 'born'),
    meaningHe: 'לפוגי יש ילד והוא נכנס בפועל לחיי הורות',
    when: (state) => flag(state, 'life:child'),
  },
]

const ALL_MILESTONES: readonly Milestone[] = [...MILESTONES, ...TRACK_MILESTONES]

/** the flags reconciliation would raise right now — empty when nothing needs repair */
export function reconcile(state: LifeState): string[] {
  return ALL_MILESTONES.filter((one) => !flag(state, one.id) && one.when(state)).map((one) => one.id)
}

/** has the player had this experience/fact, whichever way it was recorded */
export const reached = (state: LifeState, id: string) =>
  flag(state, id) || (ALL_MILESTONES.find((one) => one.id === id)?.when(state) ?? false)
