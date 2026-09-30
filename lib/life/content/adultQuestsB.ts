import type { LifeEvent } from '../events'

import type { Ride } from './passages'
import type { StoryChore } from './storyChores'

/**
 * ============================================ הכלים של 2016–2026 — נתונים, לא מנוע (90-E) ====
 *
 * אותם שני כלים של V3 (`storyChores.ts`, `passages.ts`) — שורה לכל פעולה, בלי סצנה חדשה.
 * הם נרשמים במרשמים של הכלים (`STORY_CHORES`, `RIDES`) בשורת פיזור אחת, כדי שכל פרק בוגר
 * ישמור את הפעולות שלו ליד המילים שלו.
 */

export const QUEST_CHORES_B: Record<string, StoryChore> = {
  /**
   * 2020–21 · R03 — *"למיין את האוסף — ולכתוב מאיפה כל דבר."* עד היום זה היה משפט ששלח 45
   * דקות וראיה. עכשיו הדפים והגזירים על הרצפה, אחד אחד לקופסה; מה שנאסף נספר
   * (`r:sorted`), ו-`r-sorted` מגיב לספירה — הראיה רק למי שמיין את כולם (`r:sortall`).
   */
  'archive-21': {
    id: 'archive-21',
    where: 'home',
    drop: { x: 0.5, y: 0.9 },
    labelHe: 'האוסף, על הרצפה',
    shape: { mode: 'collect', art: 'propNewspaper', target: 6, seconds: 40, hintHe: 'גזירים, כרטיסים, דפים. להרים כל אחד ולכתוב מאיפה הוא — לקופסה. כפתור — לעצור.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const sorted = Math.max(0, Math.min(done, target))
      const events: LifeEvent[] = [
        { t: 'flag.set', flag: 'r:sorted', value: sorted },
        { t: 'flag.raised', flag: 'r:sortdone' },
        { t: 'clock.advanced', minutes: 5 + 5 * sorted },
      ]
      // the whole box, every item with its source line — what `r-sorted` answers with the proof
      if (sorted >= target) events.push({ t: 'flag.raised', flag: 'r:sortall' })
      return events
    },
    toastHe: (done, target) => (done >= target ? 'שש שורות מקור, בכתב יד. הקופסה נסגרת אחרת כשיודעים מה בתוכה.' : done > 0 ? `${done} פריטים עם שורת מקור. השאר מחכים לערב אחר.` : 'הקופסה נשארה פתוחה על הרצפה.'),
  },
  /** 2023 · Z01 — התיק: גופיות, קונוסים ובקבוק לקובי, לפני שמתחילים */
  'kit-23': {
    id: 'kit-23',
    where: 'pitch',
    drop: { x: 0.2, y: 0.8 },
    labelHe: 'התיק של הציוד',
    shape: { mode: 'collect', art: 'propBib', target: 6, seconds: 30, hintHe: 'גופיות וקונוסים על הדשא. לאסוף הכול לתיק, לפני שמתחילים. כפתור — לעצור.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const kept = Math.max(0, Math.min(done, target))
      const events: LifeEvent[] = [
        { t: 'flag.set', flag: 'z:kit', value: kept >= target ? 'full' : kept > 0 ? 'half' : 'none' },
        { t: 'clock.advanced', minutes: 3 + kept },
      ]
      if (kept > 0) events.push({ t: 'energy.changed', delta: -kept })
      if (kept >= target) events.push({ t: 'relationship.changed', who: 'kobi', axis: 'trust', delta: 2 })
      return events
    },
    toastHe: (done, target) =>
      done >= target ? 'שש גופיות, קונוסים בשורה, והבקבוק ליד הכיסא של קובי. הוא לא אמר תודה — הוא התיישב.' : done > 0 ? `${done} גופיות. השאר — מי שמגיע ראשון.` : 'התיק נשאר סגור. גופיות למי שמגיע ראשון.',
  },
}

/**
 * 7.5.2026 · F02 — **נמל ההגעה, והפעם פוגי מוביל.** חדר עומד (`still`), אותו מבנה של
 * הטרנזיסטור של A6: לוח היציאות, התיק של קובי, הספסל, הדלת. 1983: קובי החזיק את
 * הכרטיסים וידע את הדרך ונשא את הילד. 2026: הדף בכיס של פוגי, הדרך בראש שלו, והתיק של
 * אבא ביד שלו — ומה שהוא עושה עם הספסל הוא מה שקובי יזכור (`f-back`).
 *
 * כל עצירה פותחת שיחה של הפרק (`chapter2026finale.ts`), והשיחה קוראת את התוכנית שנבנתה
 * ב-`2026-plan` (`life:finale:route`, `life:finale:snag`) — הנסיעה בודקת את התוכנית.
 */
export const RIDE_TERMINAL_26: Ride = {
  id: 'terminal-26',
  art: 'portEurope',
  titleHe: 'נמל ההגעה',
  hintHe: 'היום אתה מוביל. מה שנדלק — לגעת בו.',
  still: true,
  stops: [
    { id: 'board', spot: { x: 0.21, y: 0.4 }, verb: 'look', labelHe: 'לוח היציאות', gapMs: 1400, autoMs: 9000, conversation: 'f-leg-board' },
    { id: 'bag', spot: { x: 0.38, y: 0.58 }, verb: 'hold', labelHe: 'התיק של אבא', gapMs: 2600, autoMs: 9000, conversation: 'f-leg-bag' },
    { id: 'bench', spot: { x: 0.46, y: 0.62 }, verb: 'look', labelHe: 'אבא, והספסל', gapMs: 3000, autoMs: 9000, conversation: 'f-leg-pace' },
    { id: 'door', spot: { x: 0.64, y: 0.4 }, verb: 'watch', labelHe: 'הדלתות, והדרך לבוטבגרד', gapMs: 2600, autoMs: 7000, conversation: 'f-leg-door' },
  ],
  land: { mapId: 'arena-out', spawn: 'start' },
  flags: ['f:led'],
}

/**
 * 11.1.2025 — הערב הראשון בהיכל הגדול (`2024-home`, חלק ג').
 *
 * **מ-27.9.2026 יש להיכל ציור (`menoraSeats`) וחדר (`menora`, `world/city2027/stadiumSide.ts`).**
 * הנסיעה היא הכניסה: הדלת והמסדרון, הדגלים מהתקרה, השיר הראשון — על אותו ציור שהחדר עומד
 * עליו, כך שכשהיא נגמרת המצלמה לא מחליפה מקום; היא רק מחזירה לשחקן את הרגליים. היא **נוחתת
 * בהיכל** (`h24:arrived`), ושם הוא מוצא את הכיסא, מחפש פנים, ויושב (H24 §S5 — "האם זה בית"
 * נענה במה שרואים). הבית, ושאלה אחת של קובי, באים אחרי השריקה (`h24-inside` → `h24-after`).
 * אף עצירה לא נוקבת במספר: קופות סגורות זו העובדה היחידה, והיא נאמרת במילים.
 */
export const RIDE_MENORA_25: Ride = {
  id: 'menora-25',
  art: 'menoraSeats',
  titleHe: 'ההיכל הגדול',
  hintHe: 'ערב ראשון. מה שנדלק — לגעת בו.',
  still: true,
  radio: false,
  stops: [
    { id: 'gate', spot: { x: 0.93, y: 0.4 }, verb: 'watch', labelHe: 'הדלת, והמסדרון שמאחוריה', gapMs: 1400, autoMs: 8000, lines: [{ who: null, text: 'מסדרון רחב מדי. אנשים באדום, יותר מכל ערב בדרייב אין, ורובם לא מכירים אותך.' }] },
    { id: 'flags', spot: { x: 0.5, y: 0.2 }, verb: 'look', labelHe: 'הדגלים מהתקרה', gapMs: 2400, autoMs: 8000, lines: [{ who: null, text: 'מישהו תלה אדום על כל מה שהיה בצבע אחר. זה נראה כמו ניצחון. זה נראה גם כמו תחפושת.' }] },
    { id: 'noise', spot: { x: 0.64, y: 0.5 }, verb: 'listen', labelHe: 'השיר הראשון', gapMs: 2600, autoMs: 8000, lines: [{ who: null, text: 'השיר הראשון מגיע מהצד השני של האולם, לפני שאתה מספיק להצטרף. שעה לפני, וההיכל עוד מתמלא.' }] },
  ],
  land: { mapId: 'menora', spawn: 'start' },
  flags: ['h24:arrived'],
}

export const QUEST_RIDES_B: Record<string, Ride> = { [RIDE_TERMINAL_26.id]: RIDE_TERMINAL_26, [RIDE_MENORA_25.id]: RIDE_MENORA_25 }
