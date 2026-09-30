import type { LifeEvent } from '../events'

import type { StoryChore } from './storyChores'

/**
 * עבודה בעלילה, בגיל שלושים — the adult feature quests of 2002–2010 (delta 90, LIFE 90-D).
 *
 * `NARRATIVE-QUEST-DESIGN-PASS-v2` §11.4: *"Dialogue choices that claim calls/deliveries/
 * organization/work occurred and immediately award skill/proof."* Until today the founding
 * of 2007 was three sentences — "I take operations", "three calls today", "I sort the
 * equipment" — each one a flag, forty-five minutes and +3 organization. The verbs of the
 * childhood (A4's bottles, 1997's crates, 1999's queue) are the same verbs here, grown up:
 * a storeroom counted by hand, the people leaving a table caught before the door, the kit
 * carried to the cage, a note on every thing so somebody else can open tomorrow.
 *
 * Same contract as `storyChores.ts` — no wage slot, can be stopped halfway, and `finish`
 * pays in what the work changed, scaled by `done`. **What a chore writes is the event log
 * the next conversation reads**: `life:founding:*` crosses the chapter so 2009 remembers,
 * `u:hands` is the day's own "something was actually done" (the founding proof in the room is
 * gated on it), and nothing here claims more than was carried.
 */

const clamp = (done: number, target: number) => Math.max(0, Math.min(done, target))

/**
 * the day's "he did some of it with the hands" — gates the founding proof in the room
 * (`world/rooms2000.ts`) in U01 and U04. Only a chore raises it: U02's own `u:did` is
 * raised by the handoff to Yosef (`u-list`), and one day flag raised in two chapters
 * reads, to `life:worldlines`, as a flag one of them inherited from the other.
 */
export const DID_TODAY = 'u:hands'
/** anything done with the hands for the founding, 2007 — read by 2009 (`u-after`) */
export const FOUNDING_WORKED = 'life:founding:worked'

function worked(done: number): LifeEvent[] {
  return done > 0 ? [{ t: 'flag.raised', flag: DID_TODAY }, { t: 'flag.raised', flag: FOUNDING_WORKED }] : []
}

/**
 * (Liron's day is PAID in `h-work-done`, `chapter2006home.ts`: the wage is derived from `WAGE`
 * through `income.ts`, and `income` → `prices` → `chapters` is a cycle this file must not
 * join — `storyChores.ts` is imported before the chapter table exists.)
 */

/** 2002 · E05 — the head count at the doors; with a meeting point fixed in Nicosia they come to you */
function heads(id: string, seconds: number, hintHe: string): StoryChore {
  return {
    id,
    where: 'port-europe',
    drop: { x: 0.56, y: 0.62 },
    labelHe: 'לספור ראשים',
    shape: { mode: 'serve', target: 6, seconds, hintHe },
    returnSpawn: 'start',
    finish: (done, target) => {
      const counted = clamp(done, target)
      const events: LifeEvent[] = [
        { t: 'flag.raised', flag: 'e:counted' },
        { t: 'flag.set', flag: 'e:heads', value: counted },
        { t: 'clock.advanced', minutes: 20 },
        { t: 'energy.changed', delta: -5 },
      ]
      if (counted >= target) events.push({ t: 'flag.raised', flag: 'e:heads-all' })
      if (counted > 0) events.push({ t: 'relationship.changed', who: 'roma', axis: 'trust', delta: counted >= target ? 3 : 1 })
      return events
    },
    toastHe: (done, target) =>
      done >= target ? 'שישה ראשים, שישה שמות. אף אחד לא נשאר בטרמינל.' : done > 0 ? `${done} מתוך ${target}. השאר עוד בפנים, איפשהו.` : 'הם יצאו מכל הדלתות, ואתה עמדת באמצע.',
  }
}

export const STORY_CHORES_ADULT: Record<string, StoryChore> = {
  // ------------------------------------------------------------------ 2002 · E05
  'heads-02': heads('heads-02', 40, 'נקודת המפגש שקבעתם. הם יוצאים מהדלתות אחד־אחד — להגיע לכל אחד: ראש, שם, "לאוטובוס".'),
  'heads-02-lost': heads('heads-02-lost', 26, 'בלי נקודת מפגש, הם יוצאים מכל הדלתות. להגיע לכל אחד לפני שהוא נבלע — ראש, שם, "לאוטובוס".'),

  // ------------------------------------------------------------------ 2006 · H01 / H03
  /** H01 · "(להישאר אחרי, לעזור בפירוק.)" — Shachor's crates, the hall emptying, to the door */
  'fold-04': {
    id: 'fold-04',
    where: 'ussishkin-hall',
    drop: { x: 0.1, y: 0.92 },
    labelHe: 'הפירוק, אחרי הדרבי',
    shape: { mode: 'carry', art: 'propCrate', target: 4, seconds: 35, hintHe: 'הארגזים של שחור, אחד כל פעם, עד הדלת. האולם מתרוקן. כפתור — להפסיק.' },
    returnSpawn: 'fromOut',
    finish: (done, target) => {
      const carried = clamp(done, target)
      const events: LifeEvent[] = [{ t: 'flag.raised', flag: 'h:helped' }, { t: 'clock.advanced', minutes: 6 * carried + 2 }]
      if (carried > 0) {
        events.push(
          { t: 'energy.changed', delta: -2 * carried },
          { t: 'skill.changed', skill: 'organization', delta: carried >= target ? 3 : 1, why: 'אחרי שהאולם מתרוקן' },
          { t: 'relationship.changed', who: 'efi', axis: 'trust', delta: carried >= target ? 3 : 1 },
        )
      }
      if (carried >= target) events.push({ t: 'flag.raised', flag: 'h:helped-all' })
      return events
    },
    toastHe: (done, target) => (done >= target ? 'ארבעה ארגזים. הצד הכבד, כל פעם.' : done > 0 ? `${done} ארגזים. שחור לקח את השאר, בלי לספור.` : 'שחור סחב לבד. הוא לא הסתכל אם אתה עוזר.'),
  },
  /** H03 · "אני ממיין לפי דחיפות" — the orders at Liron's window, most urgent first */
  'orders-06': {
    id: 'orders-06',
    where: 'workshop',
    drop: { x: 0.5, y: 0.86 },
    labelHe: 'ההזמנות של לירון',
    shape: { mode: 'serve', target: 6, seconds: 40, hintHe: 'לקוחות בחלון, טלפון ביד. להגיע לכל אחד וללחוץ — מה דחוף קודם, לא מי שאתה אוהב.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const served = clamp(done, target)
      const events: LifeEvent[] = [
        { t: 'flag.raised', flag: 'h:work' },
        { t: 'flag.raised', flag: 'h:worked' },
        { t: 'flag.raised', flag: 'h:worked-sort' },
        { t: 'clock.advanced', minutes: 60 },
        { t: 'energy.changed', delta: -10 },
      ]
      if (served > 0) events.push({ t: 'flag.raised', flag: 'h:orders-some' })
      if (served >= target) events.push({ t: 'flag.raised', flag: 'h:orders-all' })
      if (served > 0) events.push({ t: 'skill.changed', skill: 'business', delta: served >= target ? 3 : 1, why: 'הזמנות, סדר אחד' })
      if (served * 2 >= target) events.push({ t: 'flag.raised', flag: 'h:orders-half' })
      return events
    },
    toastHe: (done, target) => (done >= target ? 'שש הזמנות יצאו בזמן. לירון ספר פעמיים ולא אמר כלום.' : done > 0 ? `${done} הזמנות יצאו. השאר חיכו למחר.` : 'הטלפונים צלצלו, ולירון ענה בעצמו.'),
  },
  /** H03 · "(לעזור לירון עם הידיים, בלי קשרים.)" — the parcels from the back door to the bench */
  'boxes-06': {
    id: 'boxes-06',
    where: 'workshop',
    drop: { x: 0.5, y: 0.86 },
    labelHe: 'החבילות של לירון',
    shape: { mode: 'carry', art: 'propCrate', target: 4, seconds: 35, hintHe: 'חבילה אחת כל פעם, מהדלת האחורית לשולחן. כפתור — להפסיק.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const carried = clamp(done, target)
      const events: LifeEvent[] = [
        { t: 'flag.raised', flag: 'h:work' },
        { t: 'flag.raised', flag: 'h:worked' },
        { t: 'flag.raised', flag: 'h:worked-hands' },
        { t: 'clock.advanced', minutes: 10 * carried + 5 },
      ]
      if (carried > 0) {
        events.push(
          { t: 'flag.raised', flag: 'h:boxes-some' },
          { t: 'energy.changed', delta: -3 * carried },
          { t: 'skill.changed', skill: 'organization', delta: carried >= target ? 3 : 1, why: 'זוג ידיים' },
          { t: 'relationship.changed', who: 'yaron', axis: 'trust', delta: carried >= target ? 3 : 1 },
        )
      }
      return events
    },
    toastHe: (done, target) => (done >= target ? 'ארבע חבילות על השולחן. ירון הנהן פעם אחת.' : done > 0 ? `${done} חבילות. את השאר ירון גרר לבד.` : 'ירון הרים את הראשונה בעצמו.'),
  },

  // ------------------------------------------------------------------ 2007 · U01
  /** U01, operations — "מה שלא אצלך, אל תרשום כאילו כבר קנינו": the storeroom, counted by hand */
  'count-07': {
    id: 'count-07',
    where: 'storeroom',
    drop: { x: 0.5, y: 0.86 },
    labelHe: 'מה יש, ומה חסר',
    shape: { mode: 'collect', art: 'propBasketball', target: 6, seconds: 35, hintHe: 'כדורים, קונוסים, רשת, משאבה. לגשת לכל דבר ולספור אותו. כפתור — לעצור.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const counted = clamp(done, target)
      const events: LifeEvent[] = [
        { t: 'flag.raised', flag: 'u:counted' },
        { t: 'flag.set', flag: 'life:founding:count', value: counted },
        { t: 'clock.advanced', minutes: 4 * counted + 3 },
        ...worked(counted),
      ]
      if (counted > 0) events.push({ t: 'skill.changed', skill: 'organization', delta: counted >= target ? 3 : 1, why: 'מה יש ומה אין' })
      if (counted >= target) events.push({ t: 'flag.raised', flag: 'life:founding:count-full' }, { t: 'relationship.changed', who: 'shachor', axis: 'trust', delta: 3 })
      return events
    },
    toastHe: (done, target) =>
      done >= target ? 'שישה דברים, ספורים. ליד שלושה מהם כתבת "אין".' : done > 0 ? `${done} דברים ספורים. השאר — סימן שאלה.` : 'המדפים נשארו כמו שהיו.',
  },
  /** U01, people — "מי חוזר ומי רק הקשיב": caught one by one on their way to the door */
  'returns-07': {
    id: 'returns-07',
    where: 'community-room',
    drop: { x: 0.2, y: 0.78 },
    labelHe: 'מי חוזר ביום ראשון',
    shape: { mode: 'serve', target: 5, seconds: 30, hintHe: 'הם קמים מהשולחן והולכים לדלת. להגיע לכל אחד לפני שהוא יוצא — "חוזר ביום ראשון?"' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const asked = clamp(done, target)
      const events: LifeEvent[] = [
        { t: 'flag.raised', flag: 'u:asked' },
        { t: 'flag.set', flag: 'life:founding:asked', value: asked },
        { t: 'clock.advanced', minutes: 15 },
        ...worked(asked),
      ]
      if (asked > 0) {
        events.push(
          // `mediation` בתסריט → `communication` במנוע
          { t: 'skill.changed', skill: 'communication', delta: asked >= target ? 3 : 1, why: 'שני טורים שונים' },
          { t: 'relationship.changed', who: 'yosef', axis: 'trust', delta: asked >= target ? 3 : 1 },
        )
      }
      if (asked >= target) events.push({ t: 'flag.raised', flag: 'life:founding:asked-all' })
      return events
    },
    toastHe: (done, target) =>
      done >= target ? 'חמישה שמות, בשני טורים: "חוזר", ו"רק הקשיב".' : done > 0 ? `${done} שמות. השאר כבר היו ברחוב.` : 'הם יצאו, והטור נשאר ריק.',
  },

  // ------------------------------------------------------------------ 2007 · U04
  /** U04 · "(לסדר את הציוד, ואז להראות לענבל איפה הכול.)" — from the doors to the ball cage */
  'kit-07': {
    id: 'kit-07',
    where: 'hall-new',
    drop: { x: 0.34, y: 0.7 },
    labelHe: 'הציוד, לפני מחר',
    shape: { mode: 'carry', art: 'propCrate', target: 5, seconds: 45, hintHe: 'ארגז אחד כל פעם — מהדלתות לכלוב הכדורים. כפתור — להפסיק באמצע.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const carried = clamp(done, target)
      const events: LifeEvent[] = [
        { t: 'flag.raised', flag: 'u:sorted' },
        { t: 'flag.set', flag: 'life:founding:kit', value: carried },
        { t: 'clock.advanced', minutes: 8 * carried + 5 },
        ...worked(carried),
      ]
      if (carried > 0) {
        events.push(
          { t: 'energy.changed', delta: -3 * carried },
          { t: 'skill.changed', skill: 'organization', delta: carried >= target ? 4 : 1, why: 'מחר בשמונה' },
        )
      }
      if (carried >= target) events.push({ t: 'flag.raised', flag: 'life:founding:kit-full' })
      return events
    },
    toastHe: (done, target) =>
      done >= target ? 'חמישה ארגזים בכלוב. עכשיו אתה יודע איפה כל דבר.' : done > 0 ? `${done} ארגזים בכלוב. השאר ליד הדלת.` : 'הארגזים נשארו ליד הדלת.',
  },
  /** U04 · "(לכתוב רשימה שמישהו אחר יוכל לקרוא.)" — a note on every thing, walked to */
  'labels-07': {
    id: 'labels-07',
    where: 'hall-new',
    drop: { x: 0.8, y: 0.7 },
    labelHe: 'רשימה שמישהו אחר יוכל לקרוא',
    shape: { mode: 'collect', art: 'propNote', target: 6, seconds: 40, hintHe: 'פתק על כל דבר: הכדורים, המשאבה, הקונוסים, המפתח. ללכת אליו ולכתוב איפה. כפתור — לעצור.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const noted = clamp(done, target)
      const events: LifeEvent[] = [
        { t: 'flag.raised', flag: 'u:listed' },
        { t: 'flag.set', flag: 'life:founding:labels', value: noted },
        { t: 'clock.advanced', minutes: 5 * noted + 5 },
        ...worked(noted),
      ]
      if (noted > 0) events.push({ t: 'skill.changed', skill: 'knowledge', delta: noted >= target ? 4 : 1, why: 'רשימה שאפשר להשתמש בה' })
      if (noted >= target) events.push({ t: 'flag.raised', flag: 'life:founding:labels-full' })
      return events
    },
    toastHe: (done, target) =>
      done >= target ? 'שישה פתקים, ורשימה אחת שמסכמת אותם.' : done > 0 ? `${done} פתקים. חצי אולם יודע איפה הוא.` : 'הדף נשאר ריק.',
  },

  // ------------------------------------------------------------------ 2010 · D02
  /** D02 · "(לעזור לאופיר עם הבד.)" — the letters on the pavement by the kiosk, before the derby */
  'banner-10': {
    id: 'banner-10',
    where: 'kiosk',
    drop: { x: 0.5, y: 0.9 },
    labelHe: 'הבד של אופיר',
    shape: { mode: 'sweep', target: 8, seconds: 40, hintHe: 'הבד על המדרכה ליד הקיוסק. לעבור עם המכחול על כל אות עד שהיא אדומה. כפתור — לקום.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const painted = clamp(done, target)
      const events: LifeEvent[] = [
        { t: 'flag.raised', flag: 'd10:math' },
        { t: 'flag.raised', flag: 'd10:banner' },
        { t: 'clock.advanced', minutes: 30 },
        { t: 'energy.changed', delta: -10 },
      ]
      if (painted > 0) events.push({ t: 'skill.changed', skill: 'organization', delta: painted >= target ? 3 : 1, why: 'בד שצריך להרים' })
      if (painted >= target) events.push({ t: 'flag.raised', flag: 'd10:banner-full' })
      return events
    },
    toastHe: (done, target) =>
      done >= target ? 'אופיר: "יש בד שצריך להרים." — "לזה יש נוסחה?"' : done > 0 ? `${done} אותיות שלך. את השאר אופיר גמר בלילה.` : 'אופיר צבע לבד. הוא לא ביקש פעמיים.',
  },
}
