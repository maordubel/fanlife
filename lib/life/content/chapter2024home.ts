import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { ChoiceDef, Conversation, Effect } from './script'
import { PORTRAIT_LATE } from './chapter2023late'

/**
 * H24a–H24c · "איפה הבית?" · יולי 2024 – ינואר 2025 — **פרק ראשי חדש** (תנ"ך מהדורה 2, §12).
 *
 * עד 27.9.2026 לא היה פרק ראשי בשנת 2024: `2023-quiet` נגמר בירידה, ושלושת פרקי 2024 הם
 * חלונות (`2023-visit`, `2024-terrace`, `2024-lina`). התנ"ך ביקש שלושה פרקים — רכישת
 * הכדורגל, המעבר של הכדורסל, והקונפליקט — והפרק הזה הוא שלושתם, כי §25 אומר שהמשחק
 * צריך להראות **שני סיפורי בעלות במקביל**, וזה בדיוק מה שאוהד חווה: אותה קבוצת וואטסאפ.
 *
 * **חלק א' (הקיוסק, יולי–אוגוסט)** — השמועה, לוח העובדות, ומה אתה אומר.
 * **חלק ב' (הדרייב אין, הבית — אוקטובר–דצמבר)** — "עד אז מה?", דאגה אחת,
 * המנוי, והבורר.
 * **חלק ג' (11.1.2025)** — המשחק הראשון בהיכל הגדול: הולך, נשאר בחוץ, או בבית.
 *
 * **מה שהפרק נשען עליו, ומה לא** (§7 בתנ"ך, כלל 11):
 * · 12.7.2024 הודעה, 15.8.2024 אישור ההתאחדות — העוגן `2024-safra`.
 * · 10.12.2024 כ-400 מנויים שלא הועברו; 18–20.12 הבורר: ערבות של 25 מיליון לשיפוץ, ווטו
 *   רק מהעונה הבאה; 11.1.2025 המשחק הראשון, קופות סגורות — ynet, וואלה.
 * · **לא נכנס:** "26 אלף", "סושי", "91%", "הצבעה ברוב גדול", "קריאה רשמית לחרם". אף אחד
 *   מהם לא נמצא במקור (§26).
 *
 * **ואף אדם אמיתי לא מדבר** (§29, `tests/life-real-people.test.ts`). הבעלים של שני
 * המועדונים הם שמות בעיתון ובטלפון. מי שמדבר בשם הצד של הבעלים הוא **נציג הבעלים** —
 * דמות בדיונית, מנהל קשרי אוהדים, בשיחת וידאו — ומי שמדבר בשם העמותה הוא יוסף, כמו
 * מאז 2007. אף צד אינו "האמת"; כל אחד מקבל שורה של מישהו שאכפת לו.
 */

export const PORTRAIT_HOME24: Record<string, string> = {
  ...PORTRAIT_LATE,
  /** נציג הבעלים — בדיוני, ניצב כללי (כלל 67: לא פנים של אדם אחר) */
  'נציג הבעלים': 'faceStandB2',
}

/** the life remembers where he stood — read by `2025-eurocup` (Z06) */
export const MENORA_2025 = 'life:menora:2025'
/** how he took the new football ownership — read by `2025-eurocup` (Z07) */
export const OWNERSHIP_FOOTBALL = 'life:ownership:football'

const Z = (flag: string, value: string) => ({ flagIs: { flag, value } }) as const

// ------------------------------------------------------------------ objective ------

export function objectiveHome24(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  const f = state.flags
  if (!f['h24:rumor']) return sceneId === 'kiosk' ? null : 'הקיוסק. מתוקי כבר מגלגל עיתון.'
  if (!f['h24:board']) return sceneId === 'kiosk' ? 'הלוח על הקיר. ארבעה פתקים, ואף אחד לא יודע איפה לתלות אותם.' : 'הקיוסק. הלוח מחכה.'
  if (!f['h24:ask']) return 'סוף הקיץ. עמית שואל מה אתה אומר.'
  if (!f['h24:small']) return sceneId === 'drive-in' ? null : 'הדרייב אין, אחרי המשחק. אפי מחכה ליד היציע.'
  if (!f['h24:concern']) return sceneId === 'drive-in' ? 'על הפרקט, פגישה פתוחה. הבעלים בווידאו, על מסך.' : 'הדרייב אין. פגישה פתוחה, והבעלים בווידאו.'
  if (!f['h24:ticket'] || f['h24:ticket'] === 'waiting') return sceneId === 'home' ? 'הטלפון. המנוי.' : 'הביתה. הטלפון מחכה עם שאלה אחת.'
  if (!f['h24:night']) return 'אחד־עשר בינואר. איפה אתה בערב הזה.'
  // S5 — the first night is a room now (`menora`): find the seat, look for faces, sit
  if (f[MENORA_2025] === 'went' && !f['h24:inside']) {
    if (sceneId !== 'menora') return 'ההיכל. הכרטיס בטלפון.'
    return f['h24:seat'] ? 'הכיסא שלך. לשבת — מתי שתרצה.' : 'השורה הראשונה, ליד המעקה. למצוא את המקום.'
  }
  return null
}

export const goalHome24 = (state: LifeState): 'kiosk' | 'drive-in' | 'home' | 'menora' | null => {
  const f = state.flags
  if (!f['h24:rumor'] || !f['h24:board'] || !f['h24:ask']) return 'kiosk'
  if (!f['h24:small']) return 'drive-in'
  if (!f['h24:concern']) return 'drive-in'
  if (!f['h24:night']) return 'home'
  if (f[MENORA_2025] === 'went' && !f['h24:inside']) return 'menora'
  return null
}

// ------------------------------------------------------------------- endings ------

export const ENDINGS_HOME24: Record<string, EndingCard> = {
  went: {
    id: 'went',
    titleHe: 'פעם ישבו פה אחרים',
    bodyHe:
      'הלכת. היכל גדול, אדום מקיר לקיר, והכיסא בשורה הראשונה שכל השנים היה של מישהו אחר. לא החלטת אם זה בית. החלטת להיות שם בערב הראשון, וזה מה שעשית.',
    memoryHe: 'כרטיס מודפס, עם שורה ומושב שעוד לא התרגלת אליהם.',
    memoryItem: 'ticket-stub',
    presence: 'inside',
  },
  outside: {
    id: 'outside',
    titleHe: 'גם לשבת זה צד',
    bodyHe:
      'לא העברת את המנוי. ישבת עם מי שנשאר, מול מסך, והשקט היה הסצנה. אף אחד לא אמר לך שצדקת, ואף אחד לא אמר שטעית — ומחר תצטרך להחליט שוב.',
    memoryHe: 'המנוי הישן, בארנק, עם שם של אולם שכבר לא משחקים בו.',
    memoryItem: 'ticket-stub',
    presence: 'television',
  },
  home: {
    id: 'home',
    titleHe: 'אני הלכתי ב־93',
    bodyHe:
      'נשארת בבית עם אבא. הוא סיפר על גמר ביד אליהו, באוטובוס של מישל, כאילו זה היה אתמול. הסיפור שלו לא פתר את השאלה שלך. הוא הזכיר לך שהיא לא חדשה.',
    memoryHe: 'השלט של הטלוויזיה, אצלו ביד.',
    memoryItem: 'folded-paper',
    presence: 'television',
  },
  turned: {
    id: 'turned',
    titleHe: 'בכניסה',
    bodyHe:
      'הגעת עד הדלת והסתובבת. לא בגלל שמישהו אמר לך. בגלל שבאותו רגע לא ידעת, והדלת לא חיכתה. זה לא נחשב נגדך. זה נחשב.',
    memoryHe: 'כרטיס שלא נסרק.',
    memoryItem: 'ticket-stub',
    presence: 'late',
  },
}

// --------------------------------------------------------------------- beats ------

export const BEATS_HOME24: Beat[] = [
  // חלק א' — הקיוסק
  { id: 'h24-rumor', at: 'kiosk', trigger: 'enter', when: { none: [{ flag: 'h24:rumor' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'h24-rumor' }] },
  // סוף הקיץ — אחרי שהלוח נתלה, עמית שואל. שומר על עצמו ב-`h24:ask`
  { id: 'h24-ask', at: 'kiosk', trigger: 'clock', when: { all: [{ flag: 'h24:board' }], none: [{ flag: 'h24:ask' }] }, delayMs: 1400, do: [{ a: 'talk', conversation: 'h24-ask' }] },
  // חלק ב' — הדרייב אין, חדר הקהילה
  { id: 'h24-small', at: 'drive-in', trigger: 'enter', when: { all: [{ flag: 'h24:ask' }], none: [{ flag: 'h24:small' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'h24-small' }] },
  { id: 'h24-meeting', at: 'drive-in', trigger: 'clock', when: { all: [{ flag: 'h24:small' }], none: [{ flag: 'h24:concern' }] }, delayMs: 1600, do: [{ a: 'talk', conversation: 'h24-meeting' }] },
  // המנוי — בבית, בטלפון. נדרך מחדש עד שיש החלטה (V3 כלל 2)
  { id: 'h24-ticket', at: 'home', trigger: 'clock', when: { all: [{ flag: 'h24:concern' }], none: [{ flag: 'h24:ticket' }] }, delayMs: 1200, do: [{ a: 'talk', conversation: 'h24-ticket' }] },
  // מי שחיכה לבורר מקבל את ההכרעה, ובוחר שוב
  { id: 'h24-ruling', at: 'home', trigger: 'clock', when: { all: [Z('h24:ticket', 'waiting')], none: [{ flag: 'h24:ruled' }] }, delayMs: 1600, do: [{ a: 'talk', conversation: 'h24-ruling' }] },
  // חלק ג' — 11.1.2025. הערב נפתח בבית, בכל אחת מהדרכים
  // אחרי ההיכל — הנסיעה נוחתת בבית, וקובי מחכה עם שאלה אחת
  { id: 'h24-after', at: 'home', trigger: 'enter', when: { all: [{ flag: 'h24:inside' }], none: [{ flag: 'h24:after' }] }, delayMs: 800, do: [{ a: 'talk', conversation: 'h24-after' }] },
  {
    id: 'h24-night',
    at: 'home',
    trigger: 'clock',
    when: { all: [{ flag: 'h24:ticket' }], any: [Z('h24:ticket', 'moved'), Z('h24:ticket', 'held')], none: [{ flag: 'h24:night' }] },
    delayMs: 1800,
    do: [{ a: 'talk', conversation: 'h24-night' }],
  },
]

// ---------------------------------------------------------------- the words ------

type Branches = Conversation['branches']

/** a card on the cork board: four columns, one of them right — and no wrong one fails */
function card(n: 1 | 2 | 3 | 4, textHe: string, right: 'claim' | 'announced' | 'signed' | 'approved', next: string): Conversation {
  const columns: Array<[typeof right, string]> = [
    ['claim', 'שמועה'],
    ['announced', 'הודעה'],
    ['signed', 'חתום'],
    ['approved', 'מאושר'],
  ]
  const choices: ChoiceDef[] = columns.map(([id, labelHe]) => ({
    id,
    text: `(לתלות תחת "${labelHe}".)`,
    then: [
      ...(id === right ? ([{ e: 'flag', flag: `h24:c${n}` }] as Effect[]) : []),
      { e: 'goto', node: next },
    ],
  }))
  return {
    id: `h24-card-${n}`,
    nameHe: null,
    branches: [{ lines: [{ who: null, text: textHe }], choices }],
  }
}

const RUMOR: Branches = [
  {
    // מי שקיפל את הבד ב-11.5 (Z05)
    when: Z('life:relegation:2024:where', 'gate'),
    lines: [
      { who: 'מתוקי', text: 'ספרא קונה.' },
      { who: 'פוגי', text: 'מי זה ספרא?' },
      { who: 'מתוקי', text: 'זאת בדיוק השאלה ששאלו על כל הקודמים.' },
      { who: 'עמית', text: 'ראיתי אותך מקפל את הבד במאי.' },
      { who: 'מתוקי', text: 'תשמור אותו. אולי נצטרך אותו שוב.' },
    ],
    then: [{ e: 'flag', flag: 'h24:rumor' }],
  },
  {
    lines: [
      { who: 'מתוקי', text: 'ספרא קונה.' },
      { who: 'פוגי', text: 'מי זה ספרא?' },
      { who: 'מתוקי', text: 'זאת בדיוק השאלה ששאלו על כל הקודמים.' },
      { who: 'עמית', text: 'ירדנו לפני חודשיים. עכשיו כולם פתאום רוצים אותנו.' },
      { who: 'מתוקי', text: 'לא כולם. אחד.' },
    ],
    then: [{ e: 'flag', flag: 'h24:rumor' }],
  },
]

const ASK: Branches = [
  {
    lines: [
      { who: null, text: 'סוף אוגוסט. על הלוח, ארבעה פתקים, והאחרון עם תאריך.' },
      { who: 'עמית', text: 'נו. מה אתה אומר?' },
    ],
    choices: [
      {
        id: 'careful',
        text: '"אני מקווה. בזהירות."',
        then: [
          { e: 'flag', flag: 'h24:ask' },
          { e: 'flagValue', flag: OWNERSHIP_FOOTBALL, value: 'hope-careful' },
          { e: 'rel', who: 'amit', axis: 'trust', delta: 2 },
          { e: 'toast', text: 'עמית: "בזהירות זה כמה?" — "עד שנעלה."', tone: 'plain' },
        ],
      },
      {
        id: 'refuse',
        text: '"לא מתאהב במסיבות עיתונאים."',
        then: [
          { e: 'flag', flag: 'h24:ask' },
          { e: 'flagValue', flag: OWNERSHIP_FOOTBALL, value: 'refuse-hope' },
          { e: 'personality', key: 'stubbornness', delta: 2 },
          { e: 'toast', text: 'מתוקי: "למדת משהו בשלושים שנה." — "למדתי מה לא ללמוד."', tone: 'plain' },
        ],
      },
      {
        id: 'football',
        text: '"מה שמעניין אותי זה ההרכב."',
        then: [
          { e: 'flag', flag: 'h24:ask' },
          { e: 'flagValue', flag: OWNERSHIP_FOOTBALL, value: 'football-first' },
          { e: 'redheart', key: 'footballLove', delta: 2 },
          { e: 'toast', text: 'עמית: "ההרכב של הלאומית." — "גם שם משחקים אחד־עשר."', tone: 'plain' },
        ],
      },
      {
        id: 'structure',
        text: '"רוצה לראות מה כתוב במבנה."',
        then: [
          { e: 'flag', flag: 'h24:ask' },
          { e: 'flagValue', flag: OWNERSHIP_FOOTBALL, value: 'structure' },
          { e: 'skill', skill: 'knowledge', delta: 2, why: 'שאל על המבנה, לא על הכותרת' },
          { e: 'toast', text: 'מתוקי: "מבנה." — "זה מה שנשאר כשהבעלים הולכים."', tone: 'plain' },
        ],
      },
    ],
  },
]

const SMALL: Branches = [
  {
    when: { flag: 'life:drivein:first-night' },
    lines: [
      { who: 'אפי', text: 'אנחנו באמת לא נכנסים פה.' },
      { who: 'יבגני', text: 'אז מרחיבים.' },
      { who: 'אפי', text: 'עד אז מה?' },
      { who: 'אפי', text: 'שורה שבע. עשר שנים. ועכשיו אומרים לי שהיא קטנה.' },
      { who: 'פוגי', text: 'היא לא קטנה. אנחנו גדלנו.' },
      { who: 'יבגני', text: 'לאן, זאת השאלה.' },
    ],
    then: [{ e: 'flag', flag: 'h24:small' }, { e: 'remember', who: 'efi', eventId: 'row-seven-2024', significance: 'notable' }],
  },
  {
    lines: [
      { who: 'אפי', text: 'אנחנו באמת לא נכנסים פה.' },
      { who: 'יבגני', text: 'אז מרחיבים.' },
      { who: 'אפי', text: 'עד אז מה?' },
      { who: 'יבגני', text: 'עד אז באולם שכל השנים שרנו נגדו. זה לא אולם, זה משפט.' },
      { who: 'אפי', text: 'יש פגישה פתוחה בחדר הקהילה. תבוא לשאול, לא לצעוק.' },
    ],
    then: [{ e: 'flag', flag: 'h24:small' }],
  },
]

const CONCERNS: Array<[string, string, string]> = [
  ['capacity', '(לשאול כמה מקומות יהיו, ולמי.)', 'נציג הבעלים: "יותר מפי שלושה. גם למי שלא הגיע אף פעם." — יוסף: "וגם למי שהגיע תמיד?"'],
  ['identity', '(לשאול מה נשאר שלנו באולם של מישהו אחר.)', 'נציג הבעלים: "הצבע, השירים, והקהל." — יבגני, מאחור: "הקהל זה לא סעיף."'],
  ['rights', '(לשאול מי מחליט, ומה העמותה יכולה לעצור.)', 'יוסף: "זאת בדיוק השאלה שהולכת לבורר." — נציג הבעלים: "ונכבד מה שיוחלט."'],
  ['guarantee', '(לשאול מה מבטיח שהדרייב אין ישופץ ושחוזרים.)', 'נציג הבעלים: "יש תוכנית." — יוסף: "תוכנית זה לא ערבות." — "אז נדבר על ערבות."'],
  ['away', '(לשאול כמה מקומות יקבלו אוהדי החוץ.)', 'נציג הבעלים: "לפי התקנון." — פוגי: "אז יש לי עוד שאלה על התקנון."'],
  ['money', '(לשאול כמה יעלה מנוי.)', 'נציג הבעלים: "המנויים הקיימים עוברים כמו שהם." — יוסף: "את זה כדאי לכתוב."'],
]

const MEETING: Branches = [
  {
    // מי ששאל ב-2023 על האולם (Z03b) — המשפט חוזר
    when: { flag: 'life:assembly:asked-venue' },
    lines: [
      { who: 'יוסף', text: 'ביולי שעבר שאלת אותי מה קורה אם רוצים להעביר אולם.' },
      { who: 'פוגי', text: 'ואמרת שנדבר כשזה יגיע.' },
      { who: 'יוסף', text: 'הגיע.' },
      { who: 'נציג הבעלים', text: 'האולם הזה נבנה לקבוצה בליגה א\'. אנחנו כבר לא שם.' },
    ],
    choices: concernChoices(),
  },
  {
    lines: [
      { who: null, text: 'כיסאות פלסטיק על הפרקט, ומסך על אחד מהם. בצד השני של המסך, מישהו בחולצה מגוהצת.' },
      { who: 'נציג הבעלים', text: 'האולם הזה נבנה לקבוצה בליגה א\'. אנחנו כבר לא שם.' },
      { who: 'יוסף', text: 'השאלה היא לא אם לעבור. השאלה היא מי מחליט.' },
      { who: 'אפי', text: 'יש לך שאלה אחת. תבחר טוב.' },
    ],
    choices: concernChoices(),
  },
]

function concernChoices(): ChoiceDef[] {
  return CONCERNS.map(([id, text, toast]) => ({
    id,
    text,
    then: [
      { e: 'flagValue', flag: 'h24:concern', value: id },
      { e: 'time', minutes: 60 },
      { e: 'skill', skill: 'communication', delta: 2, why: 'שאלה אחת, בקול, מול כולם' },
      { e: 'toast', text: toast, tone: 'plain' },
    ],
  }))
}

const TICKET_CHOICES = (again: boolean): ChoiceDef[] => [
  {
    id: 'move',
    text: '(להעביר את המנוי.)',
    then: [
      { e: 'flagValue', flag: 'h24:ticket', value: 'moved' },
      ...(again ? ([{ e: 'flag', flag: 'h24:ruled' }] as Effect[]) : []),
      { e: 'rel', who: 'efi', axis: 'bond', delta: 1 },
      { e: 'remember', who: 'yevgeny', eventId: 'menora-moved-2025', significance: 'notable' },
      { e: 'toast', text: 'יבגני לא ענה בקבוצה. זה מה שהכאיב.', tone: 'red' },
    ],
  },
  {
    id: 'hold',
    text: '(לא להעביר.)',
    then: [
      { e: 'flagValue', flag: 'h24:ticket', value: 'held' },
      ...(again ? ([{ e: 'flag', flag: 'h24:ruled' }] as Effect[]) : []),
      { e: 'rel', who: 'yevgeny', axis: 'trust', delta: 3 },
      { e: 'remember', who: 'yevgeny', eventId: 'menora-held-2025', significance: 'notable' },
      { e: 'toast', text: 'נציג הבעלים, בקבוצה: "מי שלא מעביר — מקומו שמור. אבל לא לעולם."', tone: 'plain' },
    ],
  },
  ...(again
    ? []
    : [
        {
          id: 'wait',
          text: '(לחכות לבורר.)',
          then: [
            { e: 'flagValue', flag: 'h24:ticket', value: 'waiting' },
            { e: 'personality', key: 'responsibility', delta: 1 },
            { e: 'toast', text: 'יוסף: "טוב שיש מי שמחכה לנייר." — "אני לא מחכה לנייר. אני מחכה לדעת."', tone: 'plain' },
          ],
        } satisfies ChoiceDef,
      ]),
]

const TICKET: Branches = [
  {
    lines: [
      { who: null, text: 'דצמבר. בטלפון, כפתור אחד: "העבר את המנוי שלך להיכל החדש."' },
      { who: null, text: 'בקבוצה כותבים שכמה מאות לא העבירו. מישהו שואל אם זה הרבה. אף אחד לא עונה.' },
    ],
    choices: TICKET_CHOICES(false),
  },
]

const RULING: Branches = [
  {
    lines: [
      { who: null, text: 'עשרים בדצמבר. הבורר: ערבות של עשרים וחמישה מיליון לשיפוץ האולם הישן. ווטו של העמותה — רק מהעונה הבאה.' },
      { who: 'אפי', text: 'אז יש נייר. עכשיו תחליט אתה.' },
    ],
    choices: TICKET_CHOICES(true),
  },
]

const NIGHT: Branches = [
  {
    when: Z('h24:ticket', 'moved'),
    lines: [
      { who: null, text: 'אחד־עשר בינואר. קופות סגורות. הכרטיס בטלפון.' },
      { who: 'קובי', text: 'אתה הולך?' },
      { who: 'פוגי', text: 'הכרטיס אומר שכן.' },
      { who: 'קובי', text: 'הכרטיס תמיד אומר שכן.' },
    ],
    choices: [
      {
        id: 'go',
        text: '(ללכת.)',
        then: [{ e: 'flag', flag: 'h24:night' }, { e: 'flagValue', flag: MENORA_2025, value: 'went' }, { e: 'minigame', id: 'ride:menora-25' }],
      },
      {
        id: 'turn',
        text: '(להגיע עד הכניסה — ולהחליט שם.)',
        then: [{ e: 'flag', flag: 'h24:night' }, { e: 'goto', node: 'h24-door' }],
      },
      {
        id: 'with-kobi',
        text: '"בעצם — אני נשאר איתך."',
        then: [{ e: 'flag', flag: 'h24:night' }, { e: 'goto', node: 'h24-with-kobi' }],
      },
    ],
  },
  {
    when: Z('h24:ticket', 'held'),
    lines: [
      { who: null, text: 'אחד־עשר בינואר. קופות סגורות, בלעדיך.' },
      { who: 'אפי', text: 'יש מסך בבר ליד הדרייב אין. כמה מאיתנו שם.' },
      { who: 'קובי', text: 'ויש מסך גם פה.' },
    ],
    choices: [
      {
        id: 'bar',
        text: '(לבר, עם מי שנשאר.)',
        then: [
          { e: 'flag', flag: 'h24:night' },
          { e: 'flagValue', flag: MENORA_2025, value: 'outside' },
          { e: 'presence', mode: 'television' },
          { e: 'rel', who: 'yevgeny', axis: 'bond', delta: 3 },
          { e: 'time', minutes: 150 },
          { e: 'toast', text: 'יבגני, בשריקה, בלי להסתכל עליך: "טוב, לפחות אנחנו יודעים איפה אנחנו."', tone: 'plain' },
          { e: 'ending', id: 'outside' },
        ],
      },
      {
        id: 'kobi',
        text: '(להישאר עם אבא.)',
        then: [{ e: 'flag', flag: 'h24:night' }, { e: 'goto', node: 'h24-with-kobi' }],
      },
    ],
  },
  {
    // לא אמור לקרות (הביט מחכה להחלטה על המנוי) — ובכל זאת ערב שאין בו דרך החוצה אינו ערב
    lines: [{ who: 'קובי', text: 'לא החלטת כלום, אז החלטתי אני. נשארים.' }],
    then: [{ e: 'flag', flag: 'h24:night' }, { e: 'goto', node: 'h24-with-kobi' }],
  },
]

const WITH_KOBI: Branches = [
  {
    lines: [
      { who: 'קובי', text: 'אני הלכתי ליד אליהו ב־93. גמר. באוטובוס של מישל.' },
      { who: 'פוגי', text: 'אני יודע. הייתי שם.' },
      { who: 'קובי', text: 'אז אתה יודע שזה לא אולם. זה ערב.' },
      { who: 'פוגי', text: 'והערב הזה?' },
      { who: 'קובי', text: 'הערב הזה אנחנו בבית. גם זה ערב.' },
    ],
    then: [
      { e: 'flagValue', flag: MENORA_2025, value: 'home' },
      { e: 'presence', mode: 'television' },
      { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
      { e: 'remember', who: 'kobi', eventId: 'menora-night-home-2025', significance: 'notable' },
      { e: 'time', minutes: 150 },
      { e: 'ending', id: 'home' },
    ],
  },
]

const DOOR: Branches = [
  {
    lines: [
      { who: null, text: 'הכניסה. אנשים באדום עוברים לידך בשני הכיוונים — רובם נכנסים.' },
      { who: null, text: 'הכרטיס על המסך. הסורק מחכה.' },
    ],
    choices: [
      {
        id: 'in',
        text: '(להיכנס.)',
        then: [{ e: 'flagValue', flag: MENORA_2025, value: 'went' }, { e: 'minigame', id: 'ride:menora-25' }],
      },
      {
        id: 'back',
        text: '(להסתובב.)',
        then: [
          { e: 'flagValue', flag: MENORA_2025, value: 'turned' },
          { e: 'presence', mode: 'late' },
          { e: 'time', minutes: 90 },
          { e: 'toast', text: 'בדרך הביתה שמעת את הרעש מבפנים. לא הסתובבת שוב.', tone: 'plain' },
          { e: 'ending', id: 'turned' },
        ],
      },
    ],
  },
]

/**
 * ---------------------------------------------------- S5 · הערב הראשון, כחדר (27.9.2026) ---
 *
 * The ride lands in the arena (`menora`, `world/city2027/stadiumSide.ts`) an hour before, with the
 * hall still filling. Three things in it, and one of them closes the night:
 *   · the seat (`h24-find-seat`) — the ticket's row and number, the front row by the rail;
 *   · the faces (`h24-faces`) — who from the small hall is here, read from the life he had;
 *   · sitting (`h24-inside`) — the commit: sit when the ticket says, or stand at the rail through
 *     the first song. Both are "went"; which one is `life:menora:2025:how`, and Kobi asks.
 * Efi walks up once (`h24-efi-menora`, the actor's `initiative`). Nothing here is a number.
 */
export const MENORA_HOW = 'life:menora:2025:how'
/** who he found in the stand — read by Kobi at home (`h24-after`) */
export const MENORA_FACES = 'h24:faces'

const FIND_SEAT: Branches = [
  {
    lines: [
      { who: null, text: 'השורה הראשונה, ליד המעקה. המספר מהכרטיס מודפס על משענת בצבע אחר, ומעליו כיסוי אדום חדש.' },
      { who: null, text: 'פעם ישבו פה אחרים. המושב זוכר אותם יותר ממך.' },
    ],
    then: [{ e: 'flag', flag: 'h24:seat' }, { e: 'toast', text: 'המקום שלך. אפשר לשבת — או עוד רגע לעמוד.', tone: 'plain' }],
  },
]

const FACES: Branches = [
  {
    // מי שישב בשורה שבע בערב הראשון בדרייב אין (2015)
    when: { flag: 'life:drivein:first-night' },
    lines: [
      { who: null, text: 'שתי שורות מעליך — שלושה אנשים משורה שבע של הדרייב אין. אחד מרים יד. השני מסתכל על התקרה, כאילו הוא סופר אותה.' },
      { who: null, text: 'בית זה לא הקירות. בית זה מי שיושב שתי שורות מעליך.' },
    ],
    then: [{ e: 'flagValue', flag: MENORA_FACES, value: 'row7' }, { e: 'redheart', key: 'community', delta: 2 }],
  },
  {
    // מי שקיפל את הבד ב-11.5.2024 (Z05)
    when: { flagIs: { flag: 'life:relegation:2024:where', value: 'gate' } },
    lines: [
      { who: null, text: 'ביציע ממול, מגולגל על הברכיים של מישהו — הבד שקיפלתם במאי. הוא לא פורש אותו. הוא רק מחזיק.' },
    ],
    then: [{ e: 'flagValue', flag: MENORA_FACES, value: 'banner' }, { e: 'redheart', key: 'community', delta: 1 }],
  },
  {
    lines: [
      { who: null, text: 'אתה סורק את היציע ומחפש פנים. רוב הפנים חדשות — ילדים עם צעיפים שנקנו השבוע, זוגות שבאו לראות.' },
      { who: null, text: 'אפי, ליד המעבר, הוא היחיד כאן שמכיר אותך בשם.' },
    ],
    then: [{ e: 'flagValue', flag: MENORA_FACES, value: 'efi' }],
  },
]

const EFI_MENORA: Branches = [
  {
    lines: [
      { who: 'אפי', text: 'נו. בית?' },
      { who: 'פוגי', text: 'שאלה של אפי.' },
      { who: 'אפי', text: 'שאלה של מי שעבר. אתה עברת איתי.' },
    ],
    choices: [
      {
        id: 'not-yet',
        text: '"עוד לא."',
        then: [{ e: 'flag', flag: 'h24:efi-menora' }, { e: 'rel', who: 'efi', axis: 'trust', delta: 2 }, { e: 'toast', text: 'אפי: "גם אני לא. אבל ישבתי."', tone: 'plain' }],
      },
      {
        id: 'who-comes',
        text: '"בית זה מי שבא."',
        then: [{ e: 'flag', flag: 'h24:efi-menora' }, { e: 'rel', who: 'efi', axis: 'bond', delta: 2 }, { e: 'toast', text: 'אפי מסתכל על שלוש השורות הריקות לידו. "אז עוד לא כולם באו."', tone: 'plain' }],
      },
    ],
  },
]

/** the commit — sitting down in the big hall; it closes the night and takes him home */
const SAT = (how: 'sat' | 'stood', toastHe: string): Effect[] => [
  { e: 'flagValue', flag: MENORA_HOW, value: how },
  { e: 'presence', mode: 'inside' },
  { e: 'attend' },
  { e: 'rel', who: 'efi', axis: 'bond', delta: 2 },
  { e: 'remember', who: 'efi', eventId: 'menora-went-2025', significance: 'notable' },
  { e: 'flag', flag: 'h24:inside' },
  { e: 'time', minutes: 150 },
  { e: 'toast', text: toastHe, tone: 'red' },
  { e: 'travel', to: 'home', spawn: 'start' },
]

const INSIDE: Branches = [
  {
    lines: [
      { who: null, text: 'הכיסא בשורה הראשונה מכוסה עכשיו באדום. פעם ישבו פה אחרים.' },
      { who: 'פוגי', text: 'גדול.' },
      { who: null, text: 'אף אחד לא שמע. היה רועש מדי.' },
    ],
    choices: [
      { id: 'sit', text: '(לשבת. הכרטיס אומר שזה המקום.)', then: SAT('sat', 'ישבת. השריקה, ושעתיים שהאולם הזה לא שמע מעולם — ואז הדרך הביתה.') },
      { id: 'stand', text: '(לעמוד ליד המעקה עד שהשיר הראשון נגמר — ואז לשבת.)', then: SAT('stood', 'עמדת עד סוף השיר, ורק אז ישבת. אף אחד לא ביקש ממך לשבת. שעתיים, ואז הביתה.') },
    ],
  },
]

/** back home after the big hall — `h24-inside` travels here (`h24:inside`), and the evening closes */
const AFTER: Branches = [
  {
    // who he found in the stand (`h24:faces`) — the answer Kobi gets
    when: { flagIs: { flag: MENORA_FACES, value: 'row7' } },
    lines: [
      { who: 'קובי', text: 'נו?' },
      { who: 'פוגי', text: 'גדול. שורה שבע באה, כמעט כולה.' },
      { who: 'קובי', text: 'אז זה לא אולם חדש. זה אותם אנשים במקום רחב.' },
      { who: 'פוגי', text: 'עוד לא יודע.' },
      { who: 'קובי', text: 'זאת תשובה של מי שהיה שם.' },
    ],
    then: [{ e: 'flag', flag: 'h24:after' }, { e: 'ending', id: 'went' }],
  },
  {
    when: { flagIs: { flag: MENORA_HOW, value: 'stood' } },
    lines: [
      { who: 'קובי', text: 'נו? ישבת?' },
      { who: 'פוגי', text: 'אחרי השיר.' },
      { who: 'קובי', text: 'אני בגיל שלך לא ישבתי אף פעם. לא היה על מה.' },
      { who: 'פוגי', text: 'עכשיו יש על מה. זה חלק מהבעיה.' },
      { who: 'קובי', text: 'זאת תשובה של מי שהיה שם.' },
    ],
    then: [{ e: 'flag', flag: 'h24:after' }, { e: 'ending', id: 'went' }],
  },
  {
    lines: [
      { who: 'קובי', text: 'נו?' },
      { who: 'פוגי', text: 'גדול.' },
      { who: 'קובי', text: 'גדול טוב או גדול גדול?' },
      { who: 'פוגי', text: 'עוד לא יודע.' },
      { who: 'קובי', text: 'זאת תשובה של מי שהיה שם.' },
    ],
    then: [{ e: 'flag', flag: 'h24:after' }, { e: 'ending', id: 'went' }],
  },
]

export const CONVERSATIONS_HOME24: Conversation[] = [
  { id: 'h24-rumor', nameHe: 'מתוקי', branches: RUMOR },
  // הלוח — ארבעה פתקים, כל אחד לעמודה. טעות לא מכשילה (§12, חלק א')
  card(1, 'פתק ראשון, בכתב יד: "משקיע יהודי מחו״ל, אומרים."', 'claim', 'h24-card-2'),
  card(2, 'גזיר עיתון, שנים־עשר ביולי: "המועדון: סוכמה רכישה."', 'announced', 'h24-card-3'),
  card(3, 'צילום מסך: "החוזה נחתם." בלי תאריך.', 'signed', 'h24-card-4'),
  card(4, 'גזיר, חמישה־עשר באוגוסט: "ההתאחדות אישרה את העברת הזכויות."', 'approved', 'h24-card-done'),
  {
    id: 'h24-card-done',
    nameHe: 'אופיר',
    branches: [
      {
        when: { all: [{ flag: 'h24:c1' }, { flag: 'h24:c2' }, { flag: 'h24:c3' }, { flag: 'h24:c4' }] },
        lines: [
          { who: 'אופיר', text: 'שמועה, הודעה, חתום, מאושר.' },
          { who: 'פוגי', text: 'ככה זה הולך.' },
          { who: 'אופיר', text: 'ככה זה הולך כשזה הולך.' },
        ],
        then: [
          { e: 'flag', flag: 'h24:board' },
          { e: 'skill', skill: 'knowledge', delta: 3, why: 'הפריד בין שמועה לחתימה' },
          { e: 'proof', kind: 'verified_report', proofId: 'verified_report:{chapter}:safra', subjectHe: 'מה באמת נחתם בקיץ', audience: 'public', delta: 2, noteHe: 'ארבעה פתקים, כל אחד בעמודה של מה שהוא.' },
        ],
      },
      {
        lines: [
          { who: 'אופיר', text: 'תלית את זה לפני שזה קרה.' },
          { who: 'פוגי', text: 'מה?' },
          { who: 'אופיר', text: 'לא משנה. כולם תולים לפני. בגלל זה יש לוח.' },
        ],
        then: [{ e: 'flag', flag: 'h24:board' }, { e: 'skill', skill: 'knowledge', delta: 1, why: 'ראה את הקיץ על קיר אחד' }],
      },
    ],
  },
  { id: 'h24-ask', nameHe: 'עמית', branches: ASK },
  { id: 'h24-small', nameHe: 'אפי', branches: SMALL },
  { id: 'h24-meeting', nameHe: 'יוסף', remote: { 'נציג הבעלים': 'video' }, branches: MEETING },
  { id: 'h24-ticket', nameHe: null, branches: TICKET },
  { id: 'h24-ruling', nameHe: 'אפי', remote: { 'אפי': 'phone' }, branches: RULING },
  { id: 'h24-night', nameHe: 'קובי', remote: { 'אפי': 'phone' }, branches: NIGHT },
  { id: 'h24-with-kobi', nameHe: 'קובי', branches: WITH_KOBI },
  { id: 'h24-after', nameHe: 'קובי', branches: AFTER },
  { id: 'h24-door', nameHe: null, where: 'הכניסה להיכל', branches: DOOR },
  { id: 'h24-inside', nameHe: null, branches: INSIDE },
  // S5 — the room of the first night (`menora`)
  { id: 'h24-find-seat', nameHe: null, branches: FIND_SEAT },
  { id: 'h24-faces', nameHe: null, branches: FACES },
  { id: 'h24-efi-menora', nameHe: 'אפי', branches: EFI_MENORA },
]
