import { WEAR_CRAFTED_FLAG } from '../shirts'
import type { Condition } from '../world/types'
import { callbackFlag, missionDoneFlag, missionProofId, outputFlag } from './performedMissions'
import type { Branch, Conversation } from './script'

/**
 * המילים סביב המשימות המבוצעות (delta 91, MASTER §6, §9.3, §58; PERFORMED §59).
 *
 * Every ask is a PERSON with a NEED, in a PLACE, with a TIME — never a label. Asaf does not
 * say "[צבע שלט]"; he says the paint has only just arrived and there is an hour. Every
 * reaction is a human sentence for `high` / `mid` / `low` / `away` and never a number:
 * *"אחי, תלית את זה הפוך."* is the whole of a low score.
 *
 * The rules every other file in this folder keeps, kept here: no date, no opponent, no
 * score, no scorer; nobody praises a figure. The CALLBACK conversations at the end are what
 * the world says when it sees the thing again (PERFORMED §20–§21) — a stand that recognises
 * its own banner, a friend who turned up in the shirt you made him. Those are where the
 * standing is HEARD and, for the friend's shirt, where the evidence is written.
 */

const tier = (id: string, value: string): Condition => ({ flagIs: { flag: `act:${id}:tier`, value } })
const done = (id: string): Condition => ({ flag: missionDoneFlag(id) })

function reaction(
  id: string,
  nameHe: string | null,
  lines: { away: Branch['lines']; high: Branch['lines']; mid: Branch['lines']; low: Branch['lines'] },
  extra: Branch[] = [],
): Conversation {
  return {
    id: `act-${id}-after`,
    nameHe,
    branches: [
      ...extra,
      { when: tier(id, 'away'), lines: lines.away },
      { when: tier(id, 'high'), lines: lines.high },
      { when: tier(id, 'mid'), lines: lines.mid },
      { lines: lines.low },
    ],
  }
}

export const CONVERSATIONS_MISSIONS: Conversation[] = [
  // ============================================================ ULTRAS — 1991, הקונפטי ==
  {
    id: 'act-hall-confetti',
    nameHe: 'אפי',
    branches: [
      { when: done('hall-confetti-91'), lines: [{ who: null, text: 'הערימה ליד הדלת כבר לא ערימה. שקית אחת, קשורה, עם השם שלך עליה בטוש.' }] },
      {
        lines: [
          { who: null, text: 'ליד הדלת של האולם — ערימת עיתונים ישנים, קשורה בחוט, ומספריים תקועים בתוכה.' },
          { who: 'אפי', text: 'שחור הביא את זה הבוקר. אמר: מי שרוצה שיירד שלג הערב — שיחתוך.' },
          { who: 'אפי', text: 'אני חתכתי שתי שקיות. היד נפלה לי. יש עד שפותחים את השערים.' },
        ],
        choices: [
          { id: 'help', text: 'לקחת את המספריים', then: [{ e: 'mechanic', activity: 'hall-confetti' }] },
          { id: 'later', text: 'אחר כך.', then: [] },
        ],
      },
    ],
  },
  reaction('hall-confetti', 'אפי', {
    away: [{ who: 'אפי', text: 'חצי שקית. גם חצי שקית זה שלג, אם זורקים נכון.' }],
    high: [
      { who: 'אפי', text: 'זה? זה שלג. הערב לא רואים את הפרקט.' },
      { who: null, text: 'הוא קושר את השקית פעמיים, כמו משהו שאסור שייפתח לפני הזמן.' },
    ],
    mid: [{ who: 'אפי', text: 'חתיכות גדולות, אבל זה יורד. העיקר שזה יורד.' }],
    low: [{ who: 'אפי', text: 'אחי, אלה לא פתיתים, אלה עמודים. לא נורא. מלמעלה הכול נראה אותו דבר.' }],
  }),

  // ============================================================ ULTRAS — 1998, השלט =====
  {
    id: 'act-banner-letters',
    nameHe: 'אסף',
    branches: [
      { when: done('gate5-banner-98'), lines: [{ who: null, text: 'הבד מגולגל ליד הקיר, והאותיות שלך מייבשות מבפנים. אסף כבר בחוץ, עם החבל.' }] },
      {
        lines: [
          { who: null, text: 'מתחת ליציע. בד לבן פרוש על הבטון, ושני פחי צבע שעוד לא נפתחו.' },
          { who: 'אסף', text: 'הצבע הגיע רק עכשיו. יש שעה עד שיוצאים. אתה לוקח את האותיות?' },
        ],
        choices: [
          { id: 'help', text: 'לפתוח את הפח', then: [{ e: 'mechanic', activity: 'banner-letters' }] },
          { id: 'later', text: 'לא אני. לא היום.', then: [] },
        ],
      },
    ],
  },
  reaction('banner-letters', 'אסף', {
    away: [{ who: 'אסף', text: 'חצי מילה על הבד. מישהו אחר יגמור. אבל הוא יגמור אחרת.' }],
    high: [
      { who: 'אסף', text: 'זה נראה טוב. בוא נגלגל לפני שיתייבש לנו פה.' },
      { who: null, text: 'הוא לא אומר תודה. הוא נותן לך את הקצה של החבל, וזה יותר.' },
    ],
    mid: [{ who: 'אסף', text: 'קוראים את זה. מרחוק. מקרוב פחות, אבל מרחוק זה מה שחשוב.' }],
    low: [
      { who: 'אסף', text: 'אחי, תלית את זה הפוך.' },
      { who: null, text: 'הוא מסתכל עוד רגע, ואז מושך בכתפיים. "מלמטה, מי שיסתכל טוב מדי ממילא לא שר."' },
    ],
  }),

  // ======================================================= ULTRAS — 1998–2000, הסטנסיל ==
  {
    id: 'act-wall-stencil',
    nameHe: 'אופיר',
    branches: [
      { when: done('wall-stencil-98'), lines: [{ who: null, text: 'הקרטון החתוך נשען על העמוד. הקיר ליד הקיוסק כבר אומר משהו שלא אמר הבוקר.' }] },
      {
        // he already carries the terrace's trust: the ask changes its tone, never its door
        when: { route: { id: 'ULTRAS' } },
        lines: [
          { who: 'אופיר', text: 'אסף שלח. הוא אמר שאתה יודע מה לעשות עם זה.' },
          { who: null, text: 'קרטון מגולגל, פחית אחת, והקיר ליד הקיוסק. לפני שמחשיך.' },
        ],
        choices: [
          { id: 'help', text: 'לפרוש את הקרטון על הקיר', then: [{ e: 'mechanic', activity: 'wall-stencil' }] },
          { id: 'later', text: 'לא עכשיו.', then: [] },
        ],
      },
      {
        lines: [
          { who: 'אופיר', text: 'אסף שלח. הוא לא אמר למי — אמר "למי שיודע לחתוך ישר".' },
          { who: null, text: 'קרטון מגולגל, פחית אחת, והקיר ליד הקיוסק. צריך להיגמר לפני שמחשיך, ולפני שמישהו שואל.' },
        ],
        choices: [
          { id: 'help', text: 'לפרוש את הקרטון על הקיר', then: [{ e: 'mechanic', activity: 'wall-stencil' }] },
          { id: 'later', text: 'לא עכשיו.', then: [] },
        ],
      },
    ],
  },
  reaction('wall-stencil', 'אופיר', {
    away: [{ who: 'אופיר', text: 'חצי אות. עכשיו זה נראה כמו טעות של מישהו אחר. טוב, בעצם.' }],
    high: [
      { who: 'אופיר', text: 'שששש. תעמוד רגע ותסתכל כמו שאתה לא מכיר את זה.' },
      { who: null, text: 'מישהו עובר, מאט, קורא, ממשיך. זה כל מה שסטנסיל צריך.' },
    ],
    mid: [{ who: 'אופיר', text: 'יש ריסוס מסביב. מרחוק זה נראה כמו צל. קרוב — כמו מישהו שמיהר.' }],
    low: [{ who: 'אופיר', text: 'אחי, זה נראה כאילו הקיר התעטש. בוא לפני שהקיוסק יוצא לראות.' }],
  }),

  // =========================================================== ULTRAS — 2001, ערב תפאורה ==
  {
    id: 'act-tifo-night',
    nameHe: 'ארז',
    branches: [
      { when: done('tifo-night-01'), lines: [{ who: null, text: 'הבד מגולגל, קשור, ושלושה אנשים יודעים בדיוק מי מרים איזה קצה. ארז כבר לא שואל.' }] },
      {
        lines: [
          { who: 'ארז', text: 'בד אחד, שלושה אנשים, שעתיים. שני ומתוקי כבר פה. אתה אחראי.' },
          { who: 'ארז', text: 'מי לוקח את האותיות, מי את הרקע, מי את החבלים? תגיד — ואז תעבוד.' },
        ],
        choices: [
          {
            id: 'do-letters',
            text: 'אני על האותיות. שני על הרקע, מתוקי על החבלים.',
            then: [{ e: 'flagValue', flag: 'tifo:crew', value: 'letters' }, { e: 'mechanic', activity: 'tifo-night' }],
          },
          {
            id: 'do-ground',
            text: 'אני על הרקע. שני על האותיות, מתוקי על החבלים.',
            then: [{ e: 'flagValue', flag: 'tifo:crew', value: 'ground' }, { e: 'mechanic', activity: 'tifo-night' }],
          },
          { id: 'later', text: 'לא אני מחלק. תחלק אתה.', then: [{ e: 'rel', who: 'crowd-erez', axis: 'trust', delta: -1 }] },
        ],
      },
    ],
  },
  reaction(
    'tifo-night',
    'ארז',
    {
      away: [{ who: 'ארז', text: 'עזבת באמצע. שני גמרה את הקטע שלך. היא לא תגיד לך כלום, וזה גרוע מלהגיד.' }],
      high: [
        { who: 'ארז', text: 'זה עולה מחר. ומי שיראה את זה מחר לא ידע מי צבע, ולא צריך שידע.' },
        { who: null, text: 'מתוקי מקפל את החבלים בשמונה. שני מצלמת. אף אחד לא מדבר איתך על זה, וכולם יודעים.' },
      ],
      mid: [{ who: 'ארז', text: 'עלה. עם קמטים, אבל עלה. בשבוע הבא תיקח את הרקע ותבין למה.' }],
      low: [{ who: 'ארז', text: 'אחי, תלית את זה הפוך. ואת החצי השני אני תליתי. בפעם הבאה — פחות לחלק, יותר לעשות.' }],
    },
  ),

  // ============================================================ CREATOR — 1990, חולצה משלי ==
  {
    id: 'act-fan-shirt',
    nameHe: null,
    branches: [
      { when: done('fan-shirt-first-90'), lines: [{ who: null, text: 'החולצה תלויה על הכיסא, מייבשת. מחר היא על הגב.' }] },
      {
        lines: [
          { who: null, text: 'על הכיסא — חולצה לבנה ישנה של אבא. אמא הניחה אותה שם עם טוש ופתק: "הוא לא לובש אותה. רק לא על השולחן."' },
          { who: null, text: 'חולצה מהחנות עולה יותר ממה שיש בפחית. חולצה משלך עולה שעה.' },
        ],
        choices: [
          { id: 'do', text: 'לפתוח את הטוש', then: [{ e: 'mechanic', activity: 'fan-shirt' }] },
          { id: 'later', text: 'לא עכשיו.', then: [] },
        ],
      },
    ],
  },
  reaction(
    'fan-shirt',
    null,
    {
      away: [{ who: null, text: 'חצי חולצה. הטוש בלי פקק על השולחן. אמא תראה.' }],
      high: [
        { who: null, text: 'הצבע יבש. מרחוק זה נראה כמו חולצה מהחנות. מקרוב זה נראה יותר טוב.' },
        { who: null, text: 'קובי עובר בדלת, עוצר, לא אומר כלום. וממשיך. זה יותר משהוא אומר על החנות.' },
      ],
      mid: [{ who: null, text: 'האותיות רצות קצת ימינה. זה נראה כמו שאתה כותב. וזה בעצם העניין.' }],
      low: [{ who: null, text: 'זה נראה כמו כתם עם כוונה. אמא: "יפה. תכבס לבד." — וזה לא לא.' }],
    },
    [
      // a shirt that came out: put it on now, or leave it on the chair
      {
        when: { all: [{ flag: outputFlag('pugi:fan-shirt') }, { notFlag: WEAR_CRAFTED_FLAG }, { any: [tier('fan-shirt', 'high'), tier('fan-shirt', 'mid')] }] },
        lines: [{ who: null, text: 'הצבע יבש. מרחוק זה נראה כמו חולצה מהחנות. מקרוב זה נראה יותר טוב.' }],
        choices: [
          { id: 'wear', text: 'ללבוש אותה עכשיו', then: [{ e: 'flag', flag: WEAR_CRAFTED_FLAG }, { e: 'toast', text: 'החולצה שלך. עלייך.', tone: 'red' }] },
          { id: 'chair', text: 'להשאיר על הכיסא', then: [] },
        ],
      },
    ],
  ),

  // ============================================================ CREATOR — 1993, תכין גם לי ==
  {
    id: 'act-friend-shirt',
    nameHe: 'אופיר',
    branches: [
      { when: done('friend-shirt-93'), lines: [{ who: 'אופיר', text: 'היא אצלי בתיק. בשבת אתה תראה אותה איפה שצריך.' }] },
      {
        when: { flag: outputFlag('pugi:fan-shirt') },
        lines: [
          { who: 'אופיר', text: 'ראיתי את שלך. תכין גם לי. הבאתי חולצה — לבנה, של אח שלי, הוא לא יודע.' },
          { who: 'אופיר', text: 'עד שבת. בשבת אני איתה ביציע, ואני לא לובש משהו שנראה כמו טעות.' },
        ],
        choices: [
          { id: 'help', text: 'לקחת את החולצה', then: [{ e: 'mechanic', activity: 'friend-shirt' }] },
          { id: 'later', text: 'לא הפעם.', then: [] },
        ],
      },
      {
        lines: [
          { who: 'אופיר', text: 'עמית אמר שאתה יודע לצייר. תכין לי חולצה. הבאתי אחת — לבנה, של אח שלי, הוא לא יודע.' },
          { who: 'אופיר', text: 'עד שבת. בשבת אני איתה ביציע, ואני לא לובש משהו שנראה כמו טעות.' },
        ],
        choices: [
          { id: 'help', text: 'לקחת את החולצה', then: [{ e: 'mechanic', activity: 'friend-shirt' }] },
          { id: 'later', text: 'לא הפעם.', then: [] },
        ],
      },
    ],
  },
  reaction('friend-shirt', 'אופיר', {
    away: [{ who: 'אופיר', text: 'חצי? אני לא לובש חצי. תגמור או תחזיר לי אותה לבנה.' }],
    high: [
      { who: 'אופיר', text: 'אחי. אחי! זה יותר טוב משלך.' },
      { who: null, text: 'הוא מקפל אותה בזהירות של מישהו שאף פעם לא קיפל כלום.' },
    ],
    mid: [{ who: 'אופיר', text: 'טוב. מרחוק טוב. אני ממילא עומד רחוק מכולם.' }],
    low: [{ who: 'אופיר', text: 'אחי, תלית את זה הפוך. לא נורא — אני אלבש אותה הפוך.' }],
  }),

  // ============================================================ הקולבקים — לראות שוב =====
  {
    /**
     * הסטנד מזהה את השלט שלו — the one world callback shipped end to end (PERFORMED §47).
     * Narration only: the terrace of a later year holds no named actor, and a voice you do
     * not recognise is the point. This is where gate 5's opinion, queued the afternoon the
     * letters were painted, is finally HEARD.
     */
    id: 'cb-banner-seen',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'מעל היציע, בין שני עמודים, בד. את האותיות אתה מכיר מבפנים — מהצד שלא רואים.' },
          { who: null, text: 'מישהו מאחוריך, בקול שאתה לא מזהה: "זה שלנו."' },
        ],
        then: [
          { e: 'heard', proofId: missionProofId('gate5-banner-98') },
          { e: 'heard', proofId: missionProofId('tifo-night-01') },
          { e: 'flag', flag: callbackFlag('banner:heard') },
          { e: 'redheart', key: 'terraceCulture', delta: 2 },
        ],
      },
    ],
  },
  {
    /**
     * אופיר בא עם החולצה — the CREATOR chain closes: create → deliver → someone uses it →
     * public callback → proof heard. The evidence is written HERE and not the afternoon it
     * was made, because `PROOF_CREATE` is a thing used, not a thing finished.
     */
    id: 'cb-friend-shirt-seen',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'אופיר בא עם החולצה. לא אומר כלום עליה, וזה אומר שהיא עובדת.' },
          { who: null, text: 'מישהו שואל אותו איפה קנה. הוא מצביע עליך בלי להסתובב.' },
        ],
        then: [
          { e: 'proof', kind: 'creation_proof', proofId: 'creation_proof:{chapter}:friend-shirt', subjectHe: 'החולצה של אופיר', noteHe: 'נלבשה ביציע. מישהו שאל מי הכין.' },
          { e: 'heard', proofId: missionProofId('friend-shirt-93') },
          { e: 'flag', flag: callbackFlag('shirt:ofir:heard') },
          { e: 'rel', who: 'ofir', axis: 'sharedHistory', delta: 3 },
        ],
      },
    ],
  },
]
