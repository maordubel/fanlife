import { CHAPTERS } from '../content/chapters'
import type { LifeState, LocationId } from '../types'
import type { Condition } from './types'

/**
 * מחזור החיים של מקום — World Lifecycle (תוכנית השדרוג 27.9.2026, §8–§9).
 *
 * מקום בעולם יכול להיות פעיל, סגור, הרוס או נקודת זיכרון. זה לא טקסט על המפה: זה מה
 * שהמנוע עצמו יודע. אחרי 25.7.2007 אוסישקין איננו, והקוד לא אמור להיות *מסוגל* לשלוח את
 * פוגי לשם — לא דלת, לא חץ, לא מטרה, לא נסיעה, לא spawn.
 *
 * ── למה לא מוחקים ──────────────────────────────────────────────────────────────
 *
 * `ussishkin-hall` נשאר מזהה חוקי: שמירות, זיכרונות, היסטוריית פרקים, פלאשבקים ו-2006
 * (שמתחיל בתוך האולם) כולם מחזיקים אותו. מה שמשתנה הוא runtime: `canTravel` שקר, והשם
 * על המפה הוא «אוסישקין הי"ד».
 *
 * ── מתי ────────────────────────────────────────────────────────────────────────
 *
 * שני מקורות, ושניהם אמת:
 *  1. **בתוך פרק ההריסה** (`2007-registered`) — רק כשהסצנה הסתיימה: הדגל
 *     `life:place:ussishkin` = `'demolished'` מורם בביט האחרון, ולא לפני. עד אז אפשר
 *     להיכנס בפעם האחרונה.
 *  2. **כל פרק שאחריו** — לפי הסדר של `chapters.ts`, בלי תלות בדגל. שמירה ישנה שדילגה על
 *     הסצנה, או חיים שהתחילו פרק מאוחר ב-QA, לא יכולים למצוא אולם עומד ב-2009.
 */

export type PlaceState = 'active' | 'closed' | 'demolished' | 'memorial'

export type PlaceLifecycle = {
  id: string
  /** the rooms that ARE this place — none of them can be walked into once it is gone */
  scenes: readonly LocationId[]
  /** the room the world puts a player who was standing inside when it went */
  fallback: LocationId
  /** the room the way in arrives at — the one door the city closes first */
  entry: LocationId
  state: (life: Pick<LifeState, 'flags' | 'chapter'>) => PlaceState
  titleHe: (life: Pick<LifeState, 'flags' | 'chapter'>) => string
  canTravel: (life: Pick<LifeState, 'flags' | 'chapter'>) => boolean
  blockedHe?: (life: Pick<LifeState, 'flags' | 'chapter'>) => string
}

/** the chapter the hall is demolished IN — the last one it may be entered in */
export const USSISHKIN_DEMOLITION_CHAPTER = '2007-registered'
/** raised by the demolition's last beat (Beat 7), never before */
export const USSISHKIN_PLACE_FLAG = 'life:place:ussishkin'
export const DEMOLISHED = 'demolished'

const ORDER: readonly string[] = CHAPTERS.map((chapter) => chapter.id)
const indexOf = (chapter: string) => ORDER.indexOf(chapter)

/** true when `chapter` is lived after `pivot` — unknown ids (QA harnesses) are never "after" */
export function chapterAfter(chapter: string, pivot: string): boolean {
  const at = indexOf(chapter)
  const p = indexOf(pivot)
  return at >= 0 && p >= 0 && at > p
}

function ussishkinState(life: Pick<LifeState, 'flags' | 'chapter'>): PlaceState {
  if (chapterAfter(life.chapter, USSISHKIN_DEMOLITION_CHAPTER)) return 'memorial'
  if (life.flags[USSISHKIN_PLACE_FLAG] === DEMOLISHED) return 'demolished'
  return 'active'
}

export const USSISHKIN: PlaceLifecycle = {
  id: 'ussishkin',
  scenes: ['ussishkin-outside', 'ussishkin-hall', 'ussishkin-end'],
  // the door north to the hall was always Allenby's; that is where the walk back starts
  fallback: 'allenby',
  entry: 'ussishkin-outside',
  state: ussishkinState,
  titleHe: (life) => (ussishkinState(life) === 'active' ? 'אולם אוסישקין' : 'אוסישקין הי"ד'),
  canTravel: (life) => ussishkinState(life) === 'active',
  blockedHe: () => 'המקום כבר איננו.',
}

export const PLACE_LIFECYCLES: readonly PlaceLifecycle[] = [USSISHKIN]

const BY_SCENE = new Map<string, PlaceLifecycle>()
for (const place of PLACE_LIFECYCLES) for (const scene of place.scenes) BY_SCENE.set(scene, place)

export function lifecycleOfScene(scene: string): PlaceLifecycle | null {
  return BY_SCENE.get(scene) ?? null
}

/** can a player in this life walk, travel or be sent to this room? */
export function sceneAlive(life: Pick<LifeState, 'flags' | 'chapter'>, scene: string): boolean {
  const place = BY_SCENE.get(scene)
  return !place || place.canTravel(life)
}

/**
 * The room a player standing in a dead place is moved to on load (plan §16): once, to the
 * adjacent street, with a line — never the destruction scene again.
 */
export function relocateIfGone(life: Pick<LifeState, 'flags' | 'chapter'>, scene: string): { to: LocationId; noticeHe: string } | null {
  const place = BY_SCENE.get(scene)
  if (!place || place.canTravel(life)) return null
  return { to: place.fallback, noticeHe: 'המקום הזה כבר איננו.' }
}

/**
 * The same fact, as a door condition. A door is DRAWN by `whenFor`, so this is folded in
 * there: after the demolition chapter the door to the hall is simply not in the picture;
 * inside the demolition chapter it disappears the moment the flag rises.
 *
 * `null` when the room has no lifecycle, or it is standing for good in this chapter.
 */
export function lifecycleWhen(chapter: string, scene: string): Condition | null {
  const place = BY_SCENE.get(scene)
  if (!place) return null
  // inside the demolition chapter the way IN is there until the last beat raises the flag;
  // doors inside the place stay open, so nobody standing there is ever shut in
  if (place.id === 'ussishkin' && chapter === USSISHKIN_DEMOLITION_CHAPTER) {
    return { none: [{ flagIs: { flag: USSISHKIN_PLACE_FLAG, value: DEMOLISHED } }] }
  }
  return null
}

/**
 * Gone for the whole of this chapter — the door is not part of the geography at all
 * (`exitInEra`), which is what every door-walker (route, reach, travel, the worldline
 * audit) already respects. Static per chapter: no flag, no condition to wait on.
 */
export function goneForChapter(chapter: string, scene: string): boolean {
  const place = BY_SCENE.get(scene)
  if (!place) return false
  if (place.id === 'ussishkin') return chapterAfter(chapter, USSISHKIN_DEMOLITION_CHAPTER)
  return false
}
