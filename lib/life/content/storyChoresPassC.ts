import type { LifeEvent } from '../events'

import type { StoryChore } from './storyChores'

/**
 * עבודה בעלילה — מעבר ג׳, 2000–2012 (28.9.2026, `IMPLEMENTATION-PASS-PROGRAMMER` §21–§40).
 *
 * The same contract as `storyChores.ts` and `storyChoresAdult.ts`: no wage slot, can be stopped
 * halfway, `finish` pays in what the work changed and never more than was carried, and what it
 * writes is what the next conversation reads. This file does not import `income.ts` (the
 * `income → prices → chapters` cycle, `storyChoresAdult.ts`).
 */

const clamp = (done: number, target: number) => Math.max(0, Math.min(done, target))

/** L02 · 2012 — Amit's move: from the pavement to the van at the corner, one box at a time */
function move(id: string, target: number, hintHe: string): StoryChore {
  return {
    id,
    where: 'street',
    drop: { x: 0.12, y: 0.74 },
    labelHe: 'הארגזים של עמית',
    shape: { mode: 'carry', art: 'propCrate', target, seconds: 20 + 5 * target, hintHe },
    returnSpawn: 'fromHome',
    finish: (done, total) => {
      const carried = clamp(done, total)
      const events: LifeEvent[] = [{ t: 'flag.raised', flag: 'n:moved' }, { t: 'clock.advanced', minutes: 5 * carried + 5 }]
      if (carried > 0) events.push({ t: 'energy.changed', delta: -2 * carried }, { t: 'relationship.changed', who: 'amit', axis: 'bond', delta: carried >= total ? 3 : 1 })
      if (carried >= total) events.push({ t: 'flag.raised', flag: 'n:moved-all' })
      return events
    },
    toastHe: (done, total) =>
      done >= total ? 'הטנדר מלא. עמית סגר את הדלת האחורית ברגל ואמר "עכשיו בירה".' : done > 0 ? `${done} ארגזים בטנדר. את השאר עמית והשכן גררו לבד.` : 'עמית הרים את הראשון בעצמו, ולא הסתכל אם אתה בא.',
  }
}

export const STORY_CHORES_PASS_C: Record<string, StoryChore> = {
  /** U05 · 2009 — after the photograph, the chairs folded and stood against the wall */
  'chairs-09': {
    id: 'chairs-09',
    where: 'hall-new',
    drop: { x: 0.8, y: 0.7 },
    labelHe: 'הכיסאות, לקיר',
    shape: { mode: 'collect', target: 6, seconds: 30, hintHe: 'שישה כיסאות מתקפלים על הפרקט. לגשת לכל אחד ולקפל. כפתור — לעצור.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const folded = clamp(done, target)
      const events: LifeEvent[] = [{ t: 'flag.raised', flag: 'u:closed' }, { t: 'flag.set', flag: 'life:2009:closed', value: 'chairs' }, { t: 'clock.advanced', minutes: 3 * folded + 5 }]
      if (folded > 0) events.push({ t: 'energy.changed', delta: -folded }, { t: 'relationship.changed', who: 'shachor', axis: 'trust', delta: folded >= target ? 2 : 1 })
      return events
    },
    toastHe: (done, target) => (done >= target ? 'שישה כיסאות, בשורה. שחור עבר ויישר אחד, מתוך הרגל.' : done > 0 ? `${done} כיסאות ליד הקיר. את השאר קיפלו אחרים.` : 'הכיסאות נשארו על הפרקט. מישהו אחר יקפל.'),
  },
  /** I01 · 2010 — the sofa cleared for two guests: newspapers, the remote, Kobi's coat, a box */
  'sofa-10': {
    id: 'sofa-10',
    where: 'home',
    drop: { x: 0.73, y: 0.74 },
    labelHe: 'הספה, לשניים',
    shape: { mode: 'collect', art: 'propPaperFolded', target: 4, seconds: 30, hintHe: 'עיתונים, שלט, המעיל של אבא, קופסה. לגשת לכל אחד ולהרים. כפתור — לעצור.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const cleared = clamp(done, target)
      const events: LifeEvent[] = [{ t: 'flag.set', flag: 'i:need:bed', value: cleared > 0 ? 'self' : 'dropped' }, { t: 'clock.advanced', minutes: 5 * cleared + 5 }]
      if (cleared > 0) events.push({ t: 'flag.raised', flag: 'life:intl:hosted' }, { t: 'relationship.changed', who: 'lina', axis: 'trust', delta: cleared >= target ? 3 : 1 })
      return events
    },
    toastHe: (done, target) => (done >= target ? 'הספה פנויה. רחל הביאה שמיכה נוספת בלי שביקשת.' : done > 0 ? 'חצי ספה. ניקו אמר שהוא ישן גם על חצי.' : 'הספה נשארה כמו שהיא. רומא ימצא מיטה אחרת.'),
  },
  /** I01 · 2010 — the banner put up by hand: poles, knots, tape, without a name on it */
  'banner-up-10': {
    id: 'banner-up-10',
    where: 'street',
    drop: { x: 0.585, y: 0.745 },
    labelHe: 'ההקמה של הבד',
    shape: { mode: 'collect', art: 'propPaperFolded', target: 5, seconds: 35, hintHe: 'שני מוטות, שלושה קשרים, סרט דבק. לגשת לכל אחד. כפתור — לעצור.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const tied = clamp(done, target)
      const events: LifeEvent[] = [{ t: 'flag.raised', flag: 'i:banner' }, { t: 'flag.set', flag: 'life:intl:banner', value: tied > 0 ? 'helped' : 'declined' }, { t: 'clock.advanced', minutes: 4 * tied + 5 }]
      if (tied > 0) {
        events.push({ t: 'energy.changed', delta: -tied }, { t: 'relationship.changed', who: 'lina', axis: 'bond', delta: 2 }, { t: 'relationship.changed', who: 'lina', axis: 'trust', delta: tied >= target ? 3 : 1 })
        events.push({ t: 'proof.recorded', proof: { kind: 'practical_help', proofId: 'practical_help:2010-friends:banner', chapter: '2010-friends', year: 2010, subjectHe: 'ההקמה, בלי השם שלי', noteHe: 'עזר בידיים, ולא חתם.' } })
      }
      return events
    },
    toastHe: (done, target) => (done >= target ? 'הבד עומד. לינה: "נדע להודות על מה שבאמת עשית."' : done > 0 ? 'חצי בד. ניקו קשר את השאר בשיניים.' : 'לינה הקימה לבד. היא לא שאלה למה.'),
  },
  /** C01 · 2010 — the qualifier evening, set up by whoever wrote himself first: chairs, cups, the aerial */
  'qualify-10': {
    id: 'qualify-10',
    where: 'kiosk',
    drop: { x: 0.5, y: 0.8 },
    labelHe: 'ערב הצפייה',
    shape: { mode: 'collect', art: 'propPaperFolded', target: 5, seconds: 35, hintHe: 'כיסאות מהמחסן, כוסות, האנטנה, הרשימה על הקיר. לגשת לכל אחד. כפתור — לעצור.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const set = clamp(done, target)
      const events: LifeEvent[] = [{ t: 'flag.raised', flag: 'c10:qualify' }, { t: 'clock.advanced', minutes: 6 * set + 5 }]
      if (set > 0) events.push({ t: 'energy.changed', delta: -set }, { t: 'skill.changed', skill: 'organization', delta: set >= target ? 3 : 1, why: 'בכל פעם מישהו אחר מסדר בסוף' })
      if (set >= target) events.push({ t: 'proof.recorded', proof: { kind: 'organised_evening', proofId: 'organised_evening:2010-qualify:qualifiers', chapter: '2010-qualify', year: 2010, subjectHe: 'ערב הצפייה החוזר', noteHe: 'שלושה סיבובים, אותה דירה, ומי שמסדר רשום מראש.' } })
      return events
    },
    toastHe: (done, target) => (done >= target ? 'מתוקי: "בכל פעם מישהו אחר מסדר בסוף." — "תכתוב אותי ראשון."' : done > 0 ? 'חצי ערב מסודר. עמית הביא את השאר מהבית.' : 'אף כיסא לא זז. אופיר ישב על הארגז.'),
  },
  /** B01 · 2000 — Amit's travel list, done at the counter: five names, and who approved each */
  'list-00': {
    id: 'list-00',
    where: 'kiosk',
    drop: { x: 0.5, y: 0.8 },
    labelHe: 'הרשימה של עמית',
    shape: { mode: 'collect', art: 'propNote', target: 5, seconds: 35, hintHe: 'חמישה פתקים על הדלפק: שם, טלפון, מי אישר. להרים כל אחד ולרשום. כפתור — לעצור.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const written = clamp(done, target)
      const events: LifeEvent[] = [{ t: 'clock.advanced', minutes: 7 * written + 5 }]
      if (written > 0) events.push({ t: 'energy.changed', delta: -written }, { t: 'skill.changed', skill: 'organization', delta: written >= target ? 4 : 1, why: 'סידור נסיעה' }, { t: 'relationship.changed', who: 'amit', axis: 'trust', delta: written >= target ? 3 : 1 })
      if (written >= target) events.push({ t: 'flag.raised', flag: 'b:list-full' })
      return events
    },
    toastHe: (done, target) => (done >= target ? 'עמית: "הפעם כתוב גם מי אישר."' : done > 0 ? `${done} שמות ברשימה. עמית השלים את השאר בעט אחר.` : 'הרשימה נשארה של עמית. הוא לא התפלא.'),
  },
  /** Y03 · 2000 — one-two with Ofir on the dirt: six give-and-goes, and he shouts less each time */
  'onetwo-00': {
    id: 'onetwo-00',
    where: 'pitch',
    drop: { x: 0.5, y: 0.8 },
    labelHe: 'אחד־שתיים עם אופיר',
    shape: { mode: 'collect', art: 'propFootball', target: 6, seconds: 30, hintHe: 'שש מסירות. להגיע לכדור, למסור, לרוץ לקבל. כפתור — לעצור.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const passes = clamp(done, target)
      const events: LifeEvent[] = [{ t: 'flag.raised', flag: 'y:train' }, { t: 'clock.advanced', minutes: 4 * passes + 6 }]
      if (passes > 0) events.push({ t: 'energy.changed', delta: -passes }, { t: 'relationship.changed', who: 'ofir', axis: 'bond', delta: 2 }, { t: 'relationship.changed', who: 'ofir', axis: 'trust', delta: passes >= target ? 2 : 1 })
      if (passes >= target) events.push({ t: 'flag.raised', flag: 'y:onetwo' })
      return events
    },
    toastHe: (done, target) => (done >= target ? 'אופיר: "תמסור לפני שאני צועק." — "זה משאיר לי חצי שנייה."' : done > 0 ? `${done} מסירות. אופיר צעק על השאר.` : 'אופיר התאמן עם הקיר.'),
  },
  /** C04 · 2010 — Metuki's plates at the café, and then he is made to sit */
  'plates-10': {
    id: 'plates-10',
    where: 'allenby',
    drop: { x: 0.8, y: 0.77 },
    labelHe: 'הצלחות של מתוקי',
    shape: { mode: 'serve', target: 5, seconds: 30, hintHe: 'חמישה אנשים ליד השולחן. להגיע לכל אחד ולהניח צלחת. אחר כך — מתוקי יושב. כפתור — לעצור.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const served = clamp(done, target)
      const events: LifeEvent[] = [{ t: 'flag.raised', flag: 'c10:host' }, { t: 'clock.advanced', minutes: 5 * served + 10 }]
      if (served > 0) events.push({ t: 'energy.changed', delta: -served }, { t: 'relationship.changed', who: 'metuki', axis: 'bond', delta: 2 }, { t: 'relationship.changed', who: 'metuki', axis: 'trust', delta: served >= target ? 3 : 1 })
      if (served >= target) events.push({ t: 'proof.recorded', proof: { kind: 'community_help', proofId: 'community_help:2010-anthem:evening', chapter: '2010-anthem', year: 2010, subjectHe: 'הצלחות של מתוקי', noteHe: 'לקח צלחות, ואחר כך הושיב אותו.' } })
      return events
    },
    toastHe: (done, target) => (done >= target ? 'מתוקי: "אתה יכול לקחת צלחות?" — "כבר לקחתי. עכשיו אתה יושב."' : done > 0 ? 'חצי שולחן. מתוקי המשיך לבד, ולא ישב.' : 'מתוקי הגיש לבד. הוא התרגל.'),
  },
  'move-12': move('move-12', 8, 'שמונה ארגזים מהמדרכה לטנדר בפינה. אחד כל פעם. כפתור — להפסיק.'),
  'move-12-late': move('move-12-late', 3, 'שלושה שנשארו. אחד כל פעם, לטנדר. כפתור — להפסיק.'),
}
