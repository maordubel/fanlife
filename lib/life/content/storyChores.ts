import type { LifeEvent } from '../events'
import type { LocationId } from '../types'

import { QUEST_CHORES_B } from './adultQuestsB'
import { STORY_CHORES_PASS_D } from './choresPassD'
import { STORY_CHORES_ADULT } from './storyChoresAdult'
import { STORY_CHORES_PASS_C } from './storyChoresPassC'

/**
 * עבודה בעלילה — a story beat done with the hands (Director V3 §10, 24.9.2026).
 *
 * `ChoreScene` was built for the paid jobs of `gigs.ts`: an afternoon offered, agreed to,
 * played and paid. V3 asked for the same room to carry the story, because the best
 * moments of the decade were a button that lowered energy and raised a flag: *"לסחוב את
 * הארגזים"* was a sentence you chose, not crates you carried. A story chore is the same
 * shape of work — `carry`: one at a time, from the pile to the door, the walk back is the
 * cost — with no wage and no once-a-chapter job slot. It pays in what it changes, scaled by
 * how much of it was done, and it can be stopped halfway: the half that was carried counts.
 *
 * Content only: the runtime reads the row, plays it, and dispatches `finish(done, target)`.
 * It is opened as `{ e: 'minigame', id: 'chore:story:<id>' }`.
 */
export type StoryChore = {
  id: string
  /** the room the work happens in — its painting, band and size */
  where: LocationId
  /** where the pieces are carried TO */
  drop: { x: number; y: number }
  labelHe: string
  /**
   * `carry` — one at a time to the drop; `serve` — people arrive, wait a little, and go;
   * `collect` — things lying about, walked into; `sweep` — patches of floor walked over
   * (a broom, a brush, a pot of paint). The four shapes `ChoreScene` already plays.
   */
  shape: { mode: 'carry' | 'serve' | 'collect' | 'sweep'; art?: string; target: number; seconds: number; hintHe: string }
  /** where the room is rebuilt afterwards */
  returnSpawn: string
  /** what the work changed; `done` is what was carried, never more than `target` */
  finish: (done: number, target: number) => LifeEvent[]
  toastHe: (done: number, target: number) => string
}

export const STORY_CHORE_PREFIX = 'story:'

/** 27.3.1997 — "שני ארגזים צריכים להיכנס לפני הקהל, ואין לי גב." (שחור) */
export const CRATES_1997 = 'h1:crates-carried'

/** 29.3.1999 — "אני עושה את הסדרן הערב. אתה עושה את התור." (לימור) */
export const QUEUE_1999 = 'seed:queue-worked'

/** ספטמבר 1985 — all five bottles came back from the alley (`bottles-85`) */
export const BOTTLES_ALL_85 = 'a4:bottles-all'

/** a shekel a crate at Rafi's, in agorot, and an hour for all five */
const RAFI_CRATE_85 = 100

/** 17.5.2000 — the afternoon was spent, and the week answers it (`chapter2000double.ts`) */
const D_DID_00 = 'd:did'

export const STORY_CHORES: Record<string, StoryChore> = {
  /**
   * B5 S2 · אביב 1996 — the banner under the colonnade at gate seven, three words against the
   * man on his wall (implementation pass 27.9.2026: *"להצטרף ליצור"*). The brush is the
   * joining; how many of the letters are his is what the wall at home says back to him.
   */
  'banner-96': {
    id: 'banner-96',
    where: 'bloomfield-outside',
    drop: { x: 0.24, y: 0.9 },
    labelHe: 'הבד מתחת לעמודים',
    shape: { mode: 'sweep', target: 10, seconds: 35, hintHe: 'עשר אותיות על הבד. לעבור על כל אחת עם המכחול, עד שהיא אדומה. כפתור — לקום.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const painted = Math.max(0, Math.min(done, target))
      const events: LifeEvent[] = [
        { t: 'flag.raised', flag: 's3:g:done' },
        { t: 'flag.set', flag: 'life:sinai:gate', value: 'painted' },
        { t: 'energy.changed', delta: -8 },
        { t: 'clock.advanced', minutes: 10 + painted },
        { t: 'institution.changed', key: 'protestEscalation', delta: 2 + Math.round((6 * painted) / target) },
      ]
      if (painted >= target) events.push({ t: 'redheart.changed', key: 'terraceCulture', delta: 2 })
      return events
    },
    toastHe: (done, target) =>
      done >= target ? 'עשר אותיות, בכתב שלך. בחצי השני הן יהיו על הגדר, מול הספסל שלו.' : done > 0 ? `${done} אותיות שלך. את השאר גמר הבחור מהדלת, עקום.` : 'הנחת את המכחול. הבחור מהדלת לא אמר כלום, ולקח אותו.',
  },
  /**
   * B2 · 11.3.1991 — "ילד. שני ארגזים, מהאוטו לדלת." (שחור). Until the implementation pass
   * of 27.9.2026 this was a sentence and a toast; the brief's hall job is the hands: two
   * crates from the car at the corner to the hall door, one at a time, twenty minutes of an
   * evening that also has a spot to hold. Half of it counts — Shachor carries the other one.
   */
  'crates-91': {
    id: 'crates-91',
    where: 'ussishkin-outside',
    drop: { x: 0.39, y: 0.86 },
    labelHe: 'הארגזים של שחור',
    shape: { mode: 'carry', art: 'propCrate', target: 2, seconds: 30, hintHe: 'ארגז אחד כל פעם, מהאוטו לדלת של האולם. כפתור — להניח.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const carried = Math.max(0, Math.min(done, target))
      const events: LifeEvent[] = [
        { t: 'flag.raised', flag: 'helped:crates-1991' },
        { t: 'energy.changed', delta: -4 * Math.max(1, carried) },
        { t: 'clock.advanced', minutes: 8 + 6 * carried },
      ]
      if (carried > 0) {
        events.push(
          { t: 'relationship.changed', who: 'shachor', axis: 'bond', delta: 2 + 2 * carried },
          { t: 'redheart.changed', key: 'community', delta: 2 * carried },
          {
            t: 'relationship.memory_added',
            memory: { characterId: 'shachor', eventId: 'carried-crates-1991', significance: carried >= target ? 'major' : 'notable', year: 1991, atMinute: 18 * 60 + 40 },
          },
        )
      }
      return events
    },
    toastHe: (done, target) => (done >= target ? 'שני ארגזים. הכתפיים כואבות. הוא אמר "יאללה" וזה היה תודה.' : done > 0 ? 'ארגז אחד. את השני שחור הרים לבד, ולא אמר כלום על זה.' : 'שחור הרים את שניהם לבד. לא הסתכל אחורה.'),
  },
  /** B11b · a double shift at Rafi's counter — "הגמר עולה כסף", paid by the customer served */
  'shift-00': {
    id: 'shift-00',
    where: 'kiosk',
    drop: { x: 0.55, y: 0.92 },
    labelHe: 'משמרת כפולה אצל רפי',
    shape: { mode: 'serve', target: 8, seconds: 40, hintHe: 'לקוח אחרי לקוח. להגיע אליו וללחוץ — קפה, עיתון, עודף. רפי סופר.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const served = Math.max(0, Math.min(done, target))
      return [
        { t: 'flag.raised', flag: 'd:pick1:work' },
        { t: 'flag.raised', flag: D_DID_00 },
        { t: 'money.changed', agorot: 3000 + Math.round((6000 * served) / target), why: 'משמרת כפולה' },
        { t: 'energy.changed', delta: -15 },
      ]
    },
    toastHe: (done, target) => (done >= target ? 'תשעים שקל, מקופלים לארבע. רפי אמר "תביא את הגביע".' : `${done} לקוחות, ורפי הוסיף מהכיס שלו "בשביל הגמר".`),
  },
  /** B11b · on the knees by Bloomfield: the letters painted by walking the brush over them */
  'banner-00': {
    id: 'banner-00',
    where: 'bloomfield-outside',
    drop: { x: 0.5, y: 0.9 },
    labelHe: 'הבד על הרצפה',
    shape: { mode: 'sweep', target: 10, seconds: 45, hintHe: 'עשר אותיות. לעבור על כל אחת עם המכחול, עד שהיא אדומה. כפתור — לקום.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const painted = Math.max(0, Math.min(done, target))
      const events: LifeEvent[] = [{ t: 'flag.raised', flag: 'd:pick1:gate5' }, { t: 'flag.raised', flag: D_DID_00 }, { t: 'energy.changed', delta: -20 }]
      if (painted >= target) events.push({ t: 'relationship.changed', who: 'asaf', axis: 'trust', delta: 3 })
      return events
    },
    toastHe: (done, target) => (done >= target ? 'הצבע מתייבש לאט. אסף עבר על כל אות באצבע, ולא אמר כלום — אצלו זה הרבה.' : `${done} אותיות שלך. את השאר גמרו אחרים, בלילה.`),
  },
  /** B11b · "אליפות יפה. עכשיו תרים את הצד הזה." Three crates from Shachor's car to the hall door */
  'uss-00': {
    id: 'uss-00',
    where: 'ussishkin-outside',
    drop: { x: 0.39, y: 0.86 },
    labelHe: 'הארגזים של שחור',
    shape: { mode: 'carry', art: 'propCrate', target: 3, seconds: 35, hintHe: 'ארגז אחד כל פעם, לדלת. כפתור — להניח.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const carried = Math.max(0, Math.min(done, target))
      const events: LifeEvent[] = [{ t: 'flag.raised', flag: 'd:pick1:uss' }, { t: 'flag.raised', flag: D_DID_00 }, { t: 'energy.changed', delta: -4 * Math.max(1, carried) }]
      if (carried >= target) events.push({ t: 'relationship.changed', who: 'shachor', axis: 'trust', delta: 2 })
      return events
    },
    toastHe: (done, target) => (done >= target ? 'שלושה ארגזים. שחור סגר את הדלת ברגל ואמר "עכשיו אפשר גמר".' : 'ארגז אחד, ושחור לקח את השאר. "גם זה."'),
  },
  /**
   * B10 · 19.5.1999 — Michel's notebook, four seats, names not "friends": the people come
   * up to the kiosk corner and each is written in before he wanders off (V3 §12).
   */
  'minibus-99': {
    id: 'minibus-99',
    where: 'street',
    drop: { x: 0.5, y: 0.9 },
    labelHe: 'הפנקס של מישל',
    shape: { mode: 'serve', target: 4, seconds: 30, hintHe: 'ארבעה מקומות. מי שמגיע — להגיע אליו וללחוץ: שם בפנקס. לא "חברים".' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const names = Math.max(0, Math.min(done, target))
      const events: LifeEvent[] = [{ t: 'flag.raised', flag: 'c99:notebook' }, { t: 'clock.advanced', minutes: 20 }]
      if (names >= target) events.push({ t: 'flag.raised', flag: 'c99:notebook-full' }, { t: 'relationship.changed', who: 'michel', axis: 'bond', delta: 2 })
      return events
    },
    toastHe: (done, target) =>
      done >= target ? 'ארבעה שמות בכתב שלך, בפנקס שאתה לא מחזיק.' : done > 0 ? `${done} שמות, ושורה ריקה למי שתמיד מאחר.` : 'השורות נשארו ריקות. מישל מילא אותן בעצמו, בלי להסתכל עליך.',
  },
  /**
   * B8 · 2.5.1998 — ten minutes after the whistle, with Soko: the newspapers off the
   * forecourt, straightened on a knee, because somebody has to keep what was printed
   * before it is written for them (Director V3 §12, "aftermath world action").
   */
  'papers-98': {
    id: 'papers-98',
    where: 'bloomfield-outside',
    drop: { x: 0.3, y: 0.9 },
    labelHe: 'העיתונים של סוקו',
    shape: { mode: 'collect', art: 'propNewspaper', target: 6, seconds: 30, hintHe: 'עיתונים על המדרכה. להרים, ליישר, לתת לסוקו. כפתור — לעצור.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const kept = Math.max(0, Math.min(done, target))
      const events: LifeEvent[] = [
        { t: 'laces.marked', response: 'organizer' },
        { t: 'relationship.changed', who: 'soko', axis: 'bond', delta: 3 + Math.min(3, kept) },
        { t: 'redheart.changed', key: 'historyMemory', delta: 2 + Math.floor(kept / 2) },
        { t: 'institution.changed', key: 'supporterOwnershipSeed', delta: kept >= target ? 6 : 3 },
        { t: 'flag.raised', flag: 'l1:cut' },
        { t: 'clock.advanced', minutes: 8 },
      ]
      return events
    },
    toastHe: (done, target) =>
      done >= target ? 'שישה עיתונים, מיושרים, בידיים של סוקו. "עכשיו יש לנו מה לקרוא מחר."' : done > 0 ? `${done} עיתונים. סוקו לקח אותם בלי לספור.` : 'סוקו אסף לבד. הוא לא אמר כלום.',
  },
  /** B4 · 20.5.1993 — "לא מדברים. סוחבים." Chairs from the hall to the street and back */
  'chairs-93': {
    id: 'chairs-93',
    where: 'ussishkin-outside',
    drop: { x: 0.39, y: 0.86 },
    labelHe: 'הכיסאות של שחור',
    shape: { mode: 'carry', art: 'propCrate', target: 4, seconds: 35, hintHe: 'כיסא אחד כל פעם, לדלת. בלי לדבר. כפתור — להפסיק.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const carried = Math.max(0, Math.min(done, target))
      const events: LifeEvent[] = [{ t: 'flag.raised', flag: 'after:chairs' }, { t: 'clock.advanced', minutes: 5 * carried + 2 }]
      if (carried > 0) events.push({ t: 'energy.changed', delta: -2 * carried })
      if (carried >= target) events.push({ t: 'relationship.changed', who: 'shachor', axis: 'trust', delta: 2 })
      return events
    },
    toastHe: (done, target) =>
      done >= target ? 'ארבעה כיסאות, ואז ארבעה בחזרה. שחור לא שאל למה. גם אתה לא.' : done > 0 ? 'כיסא, ועוד אחד. הידיים היו צריכות משהו, וזה הספיק.' : 'שחור המשיך לבד. הוא לא הסתכל אם אתה עוזר.',
  },
  /** B3 · 19.4.1993 — "עשרים דקות. משהו לכיס." Six crates behind Rafi's counter, a shekel each */
  'crates-93': {
    id: 'crates-93',
    where: 'kiosk',
    drop: { x: 0.9, y: 0.9 },
    labelHe: 'הארגזים של רפי',
    shape: { mode: 'carry', art: 'propCrate', target: 6, seconds: 45, hintHe: 'ארגז אחד כל פעם, לדלת האחורית. שקל לארגז. כפתור — להפסיק.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const carried = Math.max(0, Math.min(done, target))
      const events: LifeEvent[] = [{ t: 'clock.advanced', minutes: 4 * carried + 1 }]
      if (carried > 0) events.push({ t: 'money.changed', agorot: 100 * carried, why: 'ארגזים אצל רפי' }, { t: 'energy.changed', delta: -2 * carried })
      return events
    },
    toastHe: (done, target) =>
      done >= target ? 'הוא אמר עשרים דקות. יצא עשרים וחמש, ושישה שקלים.' : done > 0 ? `${done} ארגזים, ${done} שקלים. רפי ספר פעמיים.` : '"תמיד אין זמן. לך, לך."',
  },
  /** B3 · the banner the size of a living room, in three folds, from the corner to the bus */
  'banner-93': {
    id: 'banner-93',
    where: 'ussishkin-outside',
    drop: { x: 0.15, y: 0.86 },
    labelHe: 'הבד של שחור',
    shape: { mode: 'carry', art: 'propBannerBlank', target: 3, seconds: 35, hintHe: 'שלושה קיפולים, אחד כל פעם, עד האוטובוס. כפתור — להניח.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const carried = Math.max(0, Math.min(done, target))
      const events: LifeEvent[] = [{ t: 'clock.advanced', minutes: 10 * carried + 2 }]
      if (carried > 0) events.push({ t: 'flag.raised', flag: 'helped:banner' }, { t: 'energy.changed', delta: -4 * carried })
      return events
    },
    toastHe: (done, target) =>
      done >= target ? 'הבד כבד כמו אדם, וזה לקח חצי שעה. שחור לא אמר תודה. הוא אמר "יופי".' : done > 0 ? 'קיפול אחד באוטובוס. את השאר שחור גרר לבד, והסתכל עליך פעם אחת.' : '"מקום טוב," הוא חזר, כאילו זו מילה בשפה זרה.',
  },
  /**
   * B2 · 11.3.1991 — עמוד ארבעים ואחת. Thirteen answers picked up off the desk before the
   * evening goes (Director V3 §12, "homework micro-action"). All thirteen is homework done;
   * half is a page left open in the middle; less is a page that only looks like one.
   */
  'homework-91': {
    id: 'homework-91',
    where: 'bedroom',
    drop: { x: 0.17, y: 0.9 },
    labelHe: 'עמוד ארבעים ואחת',
    shape: { mode: 'collect', art: 'propNote', target: 13, seconds: 40, hintHe: 'שלוש עשרה שאלות. כל פתק שאתה מרים — תשובה. כפתור — לקום באמצע.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const answered = Math.max(0, Math.min(done, target))
      if (answered >= target) {
        return [
          { t: 'flag.raised', flag: 'hw:done' },
          { t: 'clock.advanced', minutes: 50 },
          { t: 'personality.shifted', key: 'responsibility', delta: 8 },
          { t: 'wellbeing.changed', key: 'exhaustion', delta: 6 },
        ]
      }
      if (answered * 2 >= target) {
        return [
          { t: 'flag.raised', flag: 'hw:half' },
          { t: 'clock.advanced', minutes: 20 },
          { t: 'personality.shifted', key: 'responsibility', delta: 1 },
          { t: 'personality.shifted', key: 'stubbornness', delta: 1 },
        ]
      }
      return [
        { t: 'flag.raised', flag: 'hw:faked' },
        { t: 'clock.advanced', minutes: 8 + answered },
        { t: 'personality.shifted', key: 'riskTolerance', delta: 3 },
        { t: 'wellbeing.changed', key: 'stress', delta: 5 },
      ]
    },
    toastHe: (done, target) =>
      done >= target
        ? 'שלוש עשרה שאלות. האצבעות כואבות. אבל זה גמור, והיא תוכל לפתוח.'
        : done * 2 >= target
          ? 'חצי, והמחברת נשארת פתוחה על השולחן כאילו קמת רק לרגע.'
          : 'שורות מלאות בכתב יפה. אם לא מסתכלים מקרוב, זה עובד.',
  },
  /**
   * A4 · ספטמבר 1985 — the thirty shekels are earned with the hands (Director V3 §12).
   * Five deposit bottles lying about by the bin, walked into and picked up; what is in the
   * hand is what Rafi pays for at the counter, one shekel a bottle.
   */
  'bottles-85': {
    id: 'bottles-85',
    where: 'kiosk',
    drop: { x: 0.55, y: 0.92 },
    labelHe: 'הבקבוקים ליד הפח',
    shape: { mode: 'collect', art: 'propBottle', target: 5, seconds: 30, hintHe: 'חמישה בקבוקים. ללכת אליהם, להרים. כפתור — להפסיק.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const got = Math.max(0, Math.min(done, target))
      const events: LifeEvent[] = [{ t: 'flag.raised', flag: 'a4:bottles' }, { t: 'clock.advanced', minutes: 8 }]
      if (got > 0) events.push({ t: 'item.gained', item: 'bottle', count: got })
      if (got >= target) events.push({ t: 'flag.raised', flag: BOTTLES_ALL_85 })
      return events
    },
    toastHe: (done, target) =>
      done >= target ? 'חמישה בקבוקים. מלוכלכים. שווים.' : done > 0 ? `${done} בקבוקים ביד. השאר התגלגלו מתחת למכונית.` : 'הבקבוקים נשארו ליד הפח. מישהו אחר ייקח אותם.',
  },
  /**
   * A4 · the crates behind Rafi's counter, one at a time to the back door — a shekel each.
   *
   * Eight, not five (owner, 25.9.2026 — "לאפשר להרוויח יותר"): the afternoon's own work
   * used to reach 29 ₪ against a 30 ₪ shirt, so the shirt needed the week's street job too.
   * Rafi has always had eight crates by the wall (`crates-kiosk`: "שמונה ארגזים ליד הקיר");
   * A4 now counts all of them. `seconds` grew with the pile so the pace per crate is unchanged.
   */
  'crates-85': {
    id: 'crates-85',
    where: 'kiosk',
    drop: { x: 0.9, y: 0.9 },
    labelHe: 'הארגזים של רפי',
    shape: { mode: 'carry', art: 'propCrate', target: 8, seconds: 70, hintHe: 'ארגז אחד כל פעם, עד הדלת האחורית. רפי סופר. כפתור — להפסיק.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const carried = Math.max(0, Math.min(done, target))
      const events: LifeEvent[] = [{ t: 'clock.advanced', minutes: 10 * carried + 5 }]
      if (carried > 0) {
        events.push(
          { t: 'money.changed', agorot: RAFI_CRATE_85 * carried, why: 'ארגזים' },
          { t: 'energy.changed', delta: -3 * carried },
        )
      }
      return events
    },
    toastHe: (done, target) =>
      done >= target ? 'שעה וחצי של ארגזים, אחד־אחד. 8 ₪ ובקבוק קולה שלא ביקשת.' : done > 0 ? `${done} ארגזים, ${done} ₪. את השאר רפי יסחוב מחר.` : 'רפי הרים גבה. "אז למה שאלת?"',
  },

  'queue-99': {
    id: 'queue-99',
    where: 'ussishkin-outside',
    drop: { x: 0.62, y: 0.9 },
    labelHe: 'התור לקופה',
    shape: { mode: 'serve', target: 8, seconds: 40, hintHe: 'הם מגיעים לתור ולא מחכים הרבה. להגיע לכל אחד וללחוץ — כרטיס, עודף, "הבא".' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const served = Math.max(0, Math.min(done, target))
      const events: LifeEvent[] = [{ t: 'flag.raised', flag: QUEUE_1999 }]
      if (served > 0) {
        events.push(
          { t: 'relationship.changed', who: 'crowd-limor', axis: 'trust', delta: Math.min(5, 1 + Math.floor(served / 2)) },
          { t: 'relationship.changed', who: 'shachor', axis: 'bond', delta: served >= target ? 3 : 1 },
          { t: 'personality.shifted', key: 'responsibility', delta: served >= target / 2 ? 3 : 1 },
          { t: 'energy.changed', delta: -Math.ceil(served) },
        )
      }
      return events
    },
    toastHe: (done, target) =>
      done >= target
        ? 'התור נגמר לפני השריקה. לימור סימנה לך וי באוויר.'
        : done > 0
          ? `${done} מתוך ${target}. השאר נכנסו בלי כרטיס, ולימור עשתה את עצמה שלא ראתה.`
          : 'התור עבר לידך. לימור לקחה אותו בעצמה.',
  },
  'crates-97': {
    id: 'crates-97',
    where: 'ussishkin-outside',
    // the glass doors under the canopy (`ussishkin-outside/in`, 0.33–0.45)
    drop: { x: 0.39, y: 0.86 },
    labelHe: 'שני ארגזים לפני הקהל',
    shape: { mode: 'carry', art: 'propCrate', target: 2, seconds: 40, hintHe: 'ארגז אחד כל פעם, עד הדלת של האולם. כפתור — להפסיק באמצע.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const carried = Math.max(0, Math.min(done, target))
      const events: LifeEvent[] = [{ t: 'flag.raised', flag: CRATES_1997 }]
      if (carried >= target) events.push({ t: 'flag.raised', flag: 'h1:crates-all' })
      if (carried > 0) {
        events.push(
          { t: 'relationship.changed', who: 'shachor', axis: 'bond', delta: carried >= target ? 6 : 3 },
          { t: 'energy.changed', delta: -6 * carried },
          { t: 'redheart.changed', key: 'basketballLove', delta: 2 * carried },
        )
      }
      return events
    },
    toastHe: (done, target) =>
      done >= target
        ? 'לארגז השני חסרה ידית. שחור לא אמר תודה — אמר "עוד אחד".'
        : done > 0
          ? 'ארגז אחד בפנים. את השני שחור לקח בעצמו, בלי מילה.'
          : 'שחור הרים את הראשון בעצמו. הוא לא ביקש פעמיים.',
  },
  // 2016–2026 (LIFE 90-E) — the adult feature quests keep their rows beside their words
  ...QUEST_CHORES_B,
  // 2002–2010 (LIFE 90-D) — the founding, Liron's day, the head count, the banner of 2010
  ...STORY_CHORES_ADULT,
  // 2000–2012 (pass C, 28.9.2026) — the chapters' own hands: Amit's move of 2012, …
  ...STORY_CHORES_PASS_C,
  // 2013–2026 (pass D, 28.9.2026) — the Saturday of 2019
  ...STORY_CHORES_PASS_D,
}
