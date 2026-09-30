import type { LocationId } from '../types'

/**
 * שלב א׳ כשמונה ימים — the manifest, before the rooms.
 *
 * The Stage A brief (§4, §22 pass 1) asks for the days to exist as DATA first: eight key
 * days across three years, each with a date, a start, a want, a system it teaches and the
 * historical anchor it hangs on — so that the chapters can be built one at a time without
 * anybody having to remember what A4 was supposed to be.
 *
 * ALL EIGHT are built and playing. `a1` is the 1983 prologue, `a8` is the championship
 * this game shipped with (the same Saturday `ERA_1986` runs today), and a2–a7 each have a
 * full era in `era.ts` — `ERA_A2`…`ERA_A7`, with endings, objective, beats and goal — over
 * 1,395 lines of content in `chapterStageA.ts`, and `chapters.ts` declares every one of
 * them `playable: true`.
 *
 * **This comment used to say six of them were unbuilt, and `built` said so too, long after
 * they had shipped.** Found on 15.9.2026 while checking the life spec against the repo.
 * The flag is the kind that makes a status report lie: a test reads it, a delta quotes it,
 * and everyone downstream believes a finished chapter is still a plan. `built` is now what
 * it always claimed to be — the honest state of the day — and the way to keep it honest is
 * that it changes in the same commit as the scene it describes. `stageADayId` in the save
 * is written by `day.entered`.
 *
 * **No line here states a historical fact.** `anchorKey` is an id the anchor resolver
 * answers for; the dates in `dateHe` are the days the brief locked, and the archive is what
 * says what happened on them.
 */

export type StageADayId = 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'a7' | 'a8'

export type StageADay = {
  id: StageADayId
  /** what a card would say — never a scoreline */
  dateHe: string
  year: number
  /** 0 = Sunday … 6 = Saturday */
  weekday: number
  /** minutes since midnight the day opens on */
  minute: number
  /** how old the boy is that day */
  age: number
  startLocation: LocationId
  /** the one thing he wants when the day opens */
  wantHe: string
  /** the system this day teaches, in the brief's words */
  teachesHe: string
  /** the anchor this day hangs on, by resolver key; null when the day is private */
  anchorKey: string | null
  /** is there a scene behind it today */
  built: boolean
}

export const STAGE_A_DAYS: readonly StageADay[] = [
  {
    id: 'a1',
    dateHe: '1 ביוני 1983',
    year: 1983,
    weekday: 3,
    minute: 17 * 60 + 30,
    age: 5,
    startLocation: 'prologue',
    wantHe: 'לא לאבד את אבא',
    teachesHe: 'חושים, מבט, והליכה אחרי מישהו',
    anchorKey: 'prologue',
    // Built 6.9.2026: the interactive version §6 asks for — look around, copy the crowd,
    // the red thing on the concrete — playing as the conversation `a1-1983` over the
    // terrace painting, with three branches that decide who the boy is in 1984.
    built: true,
  },
  {
    id: 'a2',
    dateHe: 'אביב 1984',
    year: 1984,
    weekday: 2,
    minute: 15 * 60 + 40,
    age: 6,
    startLocation: 'home',
    wantHe: 'להספיק למשחק בסמטה לפני שהקבוצות מלאות',
    teachesHe: 'חברים, שליחויות, וזמן שנגמר',
    anchorKey: null,
    built: true,
  },
  {
    id: 'a3',
    dateHe: '1984 — הבית האדום השני',
    year: 1984,
    weekday: 4,
    minute: 17 * 60,
    age: 6,
    startLocation: 'street',
    wantHe: 'ללכת עם אפי לאולם',
    teachesHe: 'ענף שני, וקהילה שמכירה אותך בשם',
    anchorKey: null,
    built: true,
  },
  {
    id: 'a4',
    dateHe: 'קיץ 1985',
    year: 1985,
    weekday: 0,
    minute: 9 * 60 + 30,
    age: 7,
    startLocation: 'bedroom',
    wantHe: 'החולצה',
    teachesHe: 'לחסוך, לעבוד, ולוותר על משהו',
    anchorKey: null,
    built: true,
  },
  {
    id: 'a5',
    dateHe: '28 בספטמבר 1985',
    year: 1985,
    weekday: 6,
    minute: 13 * 60,
    age: 7,
    startLocation: 'bedroom',
    wantHe: 'ללכת למשחק בחולצה שלך',
    teachesHe: 'להתכונן בעצמך למשחק',
    anchorKey: '1985',
    built: true,
  },
  {
    id: 'a6',
    dateHe: 'חורף 1985/86',
    year: 1986,
    weekday: 6,
    minute: 14 * 60,
    age: 7,
    startLocation: 'home',
    wantHe: 'לשמוע את המשחק',
    teachesHe: 'רדיו, קליטה, ואכזבה רגילה',
    anchorKey: null,
    built: true,
  },
  {
    id: 'a7',
    dateHe: '17–23 במאי 1986',
    year: 1986,
    weekday: 6,
    minute: 16 * 60,
    age: 8,
    startLocation: 'street',
    wantHe: 'להבין מה קורה בשבת הבאה',
    teachesHe: 'הבטחות, לחץ, וסירוב',
    anchorKey: null,
    built: true,
  },
  {
    id: 'a8',
    dateHe: '24 במאי 1986',
    year: 1986,
    weekday: 6,
    minute: 12 * 60 + 35,
    age: 8,
    startLocation: 'bedroom',
    wantHe: 'להגיע לבלומפילד',
    teachesHe: 'הכול, ביום אחד',
    anchorKey: '1986',
    // The day this game shipped with, and the one `ERA_1986` plays today.
    built: true,
  },
]

export const STAGE_A_DAY: Record<StageADayId, StageADay> = Object.fromEntries(
  STAGE_A_DAYS.map((day) => [day.id, day]),
) as Record<StageADayId, StageADay>

/** The days that have a scene behind them right now. */
export function playableStageADays(): readonly StageADay[] {
  return STAGE_A_DAYS.filter((day) => day.built)
}
