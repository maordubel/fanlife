import { flagOn, type LifeState } from './types'

/**
 * מסלולי חיים נפרדים — זוגיות, עבודה, הורות.
 *
 * מאור, 17.9.2026: *"מסלולי חיים נפרדים שמשפיעים גם כן: זוגיות, עבודה, הורות וכד'."*
 *
 * A second axis beside the supporter routes. A man is on ULTRAS or he is not; separately,
 * and at the same time, he is somebody's partner, he does something for a living, and he
 * may be somebody's father. The two axes are not a ladder and a sub-ladder — they cross.
 * A route answers *"מי אתה יכול להיות"* in the club; a track answers what else was
 * happening in the same years.
 *
 * ------------------------------------------------------------------------------------
 * **מה יש כאן, ומה בכוונה אין.**
 *
 * This file owns the track vocabulary and ordering. It deliberately does NOT invent age
 * thresholds, attraction scores, salary requirements or a "parenthood level": the fiction
 * decides when a life fact happened and this registry only gives that fact a durable name.
 *
 * The continuation screenplay was authored before this registry existed and already stores
 * durable facts such as `life:partner`, `life:child` and the first adult work commitment.
 * `world/milestones.ts` is the compatibility seam: it reconciles those facts into the
 * `own:track:*` vocabulary instead of rewriting 114 scenes or invalidating old saves.
 * New content may raise track stages directly once the scene genuinely establishes them.
 *
 * ------------------------------------------------------------------------------------
 * **שלושה כללים של המנוע.**
 *
 * **1 · הדגל הוא `own:`, ולכן הוא שורד חיתוך פרק.** `personFlags` in `events.ts` keeps
 * `own:` across both `day.entered` and `year.entered`. A partnership or parenthood fact
 * cannot disappear because a calendar page turned.
 *
 * **2 · מזהה שלב הוא מפתח שמירה.** Track stages are now live save vocabulary. Renaming
 * `first`, `born`, `living` etc. is a migration, not copy-editing.
 *
 * **3 · השלבים הם סדר, לא ציון.** `stages` is ordered and `trackAtLeast` compares
 * positions. There is no apex and no "best" family/work state: these are life conditions,
 * not achievements. Difficulty belongs to the supporter routes and to the collisions the
 * screenplay creates between commitments.
 */

export type TrackId = 'PARTNERSHIP' | 'WORK' | 'PARENTHOOD'

export type TrackStageDef = {
  /** persisted save key once the fiction establishes it */
  id: string
  titleHe: string
}

export type LifeTrackDef = {
  id: TrackId
  titleHe: string
  /** in order, earliest first. No ages/thresholds here — those belong to content. */
  stages: readonly TrackStageDef[]
  /** remaining authored/gameplay work before the track feels fully systemic */
  needsHe: readonly string[]
}

/**
 * שלושה מסלולים, ובדיוק שלושה.
 *
 * Maor's sentence ends *"וכד'"*; a fourth is not guessed here. Adding one is a product
 * decision, not a convenience row.
 */
export const LIFE_TRACKS = [
  {
    id: 'PARTNERSHIP',
    titleHe: 'זוגיות',
    stages: [
      { id: 'first', titleHe: 'מישהי' },
      { id: 'together', titleHe: 'ביחד' },
      { id: 'home', titleHe: 'בית משותף' },
    ],
    needsHe: [
      'להמשיך להפוך זוגיות למחויבויות יום אמיתיות ולא רק לשיחות',
      'לקשור בית משותף רק לסצנה שמבססת מגורים משותפים במפורש',
      'לתת לזוגיות להשפיע על זמן, כסף והחלטות שבת בפרקים מאוחרים',
    ],
  },
  {
    id: 'WORK',
    titleHe: 'עבודה',
    stages: [
      { id: 'first-job', titleHe: 'עבודה ראשונה' },
      { id: 'trade', titleHe: 'מקצוע' },
      { id: 'living', titleHe: 'פרנסה' },
    ],
    needsHe: [
      'לכתוב את המעבר מעבודה ראשונה למקצוע מתוך תוכן קיים ולא מסף מומצא',
      'להראות בפרקים נבחרים מה עבודה עושה לשעות של שבת',
      'לשמור את ההבדל בין פרנסה בוגרת לבין ג׳וב של אחר צהריים',
    ],
  },
  {
    id: 'PARENTHOOD',
    titleHe: 'הורות',
    stages: [
      { id: 'expecting', titleHe: 'בדרך' },
      { id: 'born', titleHe: 'נולד' },
      { id: 'raising', titleHe: 'מגדל' },
    ],
    needsHe: [
      'להפוך את הילד מדגל לדמות מתמשכת בלי להמציא שם/מין שלא נבחרו',
      'להכניס התנגשויות יום אמיתיות בין הורות, עבודה והפועל',
      'להמשיך את כלל 39: ילד הוא דמות, לא מונה',
    ],
  },
] as const satisfies readonly LifeTrackDef[]

export const trackById = (id: TrackId): LifeTrackDef | null => LIFE_TRACKS.find((track) => track.id === id) ?? null

export type TrackStageId = (typeof LIFE_TRACKS)[number]['stages'][number]['id']

/** `own:track:<TRACK>:<stage>` — persistent for the same reason life-route titles are. */
export const trackStageFlag = (id: TrackId, stage: string): string => `own:track:${id}:${stage}`

export const hasTrackStage = (state: LifeState, id: TrackId, stage: string): boolean =>
  flagOn(state, trackStageFlag(id, stage))

/** the furthest stage reached on this track — history, in registry order */
export function trackStageOf(state: LifeState, id: TrackId): TrackStageDef | null {
  const track = trackById(id)
  if (!track) return null
  let reached: TrackStageDef | null = null
  for (const stage of track.stages) if (hasTrackStage(state, id, stage.id)) reached = stage
  return reached
}

/**
 * האם הוא לפחות כאן — `minStage` defaults to the first stage, so a condition may ask only
 * whether this life track has begun. Unknown stage ids answer false; tests catch the typo
 * without crashing a save at runtime.
 */
export function trackAtLeast(state: LifeState, id: TrackId, minStage?: string): boolean {
  const track = trackById(id)
  if (!track) return false
  const wanted = minStage ?? track.stages[0]?.id
  const wantedIndex = track.stages.findIndex((stage) => stage.id === wanted)
  if (wantedIndex < 0) return false
  const reached = trackStageOf(state, id)
  if (!reached) return false
  return track.stages.findIndex((stage) => stage.id === reached.id) >= wantedIndex
}

/** every track this life is actually on — useful for profile, bridge and content conditions */
export const tracksOn = (state: LifeState): readonly TrackId[] =>
  LIFE_TRACKS.filter((track) => trackStageOf(state, track.id) !== null).map((track) => track.id)
