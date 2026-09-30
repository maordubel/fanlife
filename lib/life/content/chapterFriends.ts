import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { ChoiceDef, Conversation } from './script'
import { JAFFA_LOOKS } from '../world/city2027/jaffa'
import { PORTRAIT_CHAMPIONS } from './chapter2010champions'

/**
 * חלון INTERNATIONAL — I01–I03 (סתיו 2010) ו-I04 (2024).
 *
 * **איך הוא נפתח:** `C02` שואל *"באיזו עיר אתה יכול?"*, ואחת התשובות היא *"אני נשאר.
 * תביא אנשים אליי."* — לארח בארץ. מי שבחר בה מרים `life:international`, ורומא מביא אנשים
 * אליו: לינה וניקו (I01). זה החלון, ואין לו דלת אחרת — הוא ההמשך של הבחירה לארח, לא
 * פרס על עניין פוליטי. (ההכרעה שהוצעה למאור כ-A — לפי מה שהחיים כבר בחרו.)
 *
 * **ומה שהתסריט אוסר, נשמר כאן במפורש:**
 * · לינה וניקו הם *"דמויות בדיוניות של אוהדים אנטי־פשיסטים"*; *"אין ייחוס ברית
 *   היסטורית לקבוצה אמיתית ללא מקור"*. אף שורה כאן לא נוקבת בשם של קבוצה אמיתית.
 * · השלט של I02 הוא *"רכיב קוד עם נוסח מקורי, לא טקסט בתוך תמונת רקע"*, ו*"שיוך פוליטי
 *   נשמר רק כבחירה עלילתית מקומית"* — ולכן הבחירה נרשמת כ-`life:intl:banner` ולא נוגעת
 *   במוניטין, באישיות או באף מד. המשחק לא מנקד עמדה.
 * · I04: *"המשחק אינו מסיק עמדות של קהילה אמיתית ולא מנקד אידאולוגיה"* — מה שנמדד שם
 *   הוא איך מתווכחים (תקשורת, קשר), לא על מה.
 *
 * **ושני דברים שהתסריט קושר בין החלונות:** I03 עוסקת בהבטחה למתוקי (*"חשבתי שהיום אני
 * בפנים"*) — ההבטחה נאמרת בשורות הפתיחה של הסצנה עצמה, כך שהיא עומדת גם בחיים שלא
 * עברו בחלון TOURNAMENT; ומי שהחליף את מתוקי בלי לשאול (I03.3) נושא `life:metuki:benched`
 * — עניין פתוח, בדיוק כמו שהתסריט קורא לו.
 */

export const PORTRAIT_FRIENDS: Record<string, string> = {
  ...PORTRAIT_CHAMPIONS,
}

export const INTERNATIONAL = 'life:international'

// ================================================================ I01–I03 · 2010 ====

/**
 * **I01–I03 — מעבר ג׳, 28.9.2026** (`IMPLEMENTATION-PASS-PROGRAMMER` §35): *"Roma arrives with
 * Lina/Nico plus practical need · ticket/bed/translation vs existing obligation · solve one
 * yourself, delegate another, refuse · the conversation about differences happens after deeds."*
 *
 * · **S1** — רומא מביא אנשים, ושלושה דברים מעשיים לפני שבע ורבע (`I01_NEEDS_BY`): איפה ישנים
 *   (הספה בסלון), שני כרטיסים (הקופה, בכסף שלו), ותרגום של הנוסח (הבד ברחוב).
 * · **S2** — שלושה מקומות, זמן לשניים. מה שלא נעשה ביד — נמסר לרומא, או מסורב בקול. מה שנשאר
 *   פתוח בשבע ורבע רומא עושה בעצמו, בפרצוף (`dropped`).
 * · **S3** — השולחן באלנבי בלילה (`i-table`): השיחה על ההבדלים קורית אחרי המעשים, ונקראת מהם.
 *
 * `life:intl:hosted` (הם ישנו אצלו) שורד ונקרא אצל לינה ב-`2010-anthem` (`c10-host`).
 */
export const I01_NEEDS = ['bed', 'tickets', 'translate'] as const
/** the evening's hour for the three needs — after it, Roma does what is left himself */
export const I01_NEEDS_BY = 20 * 60 + 15
export const INTL_HOSTED = 'life:intl:hosted'
const NEED = (need: string) => `i:need:${need}`
const NEEDS_SETTLED = { all: I01_NEEDS.map((need) => ({ flag: NEED(need) })) }

export function objectiveFriends(state: LifeState, sceneId: string): string | null {
  const f = state.flags
  if (state.chapterDone) return null
  if (!f['i:meet']) return sceneId === 'allenby' ? null : 'באלנבי. רומא מביא אנשים.'
  if (f['i:needs'] && !f['i:banner'] && I01_NEEDS.some((need) => !f[NEED(need)])) {
    const left = I01_NEEDS.filter((need) => !f[NEED(need)]).map((need) => ({ bed: 'הספה בסלון', tickets: 'שני כרטיסים בקופה', translate: 'הנוסח על הבד' })[need])
    return `עד שבע ורבע: ${left.join(' · ')}. מה שלא תעשה — לתת לרומא, או לסרב.`
  }
  if (!f['i:banner']) return sceneId === 'street' ? null : 'ברחוב, על המדרכה. השם של מי על הבד.'
  if (!f['i:lineup']) return sceneId === 'pitch' ? null : 'המגרש. אימון ידידות — ומתוקי חשב שהיום הוא בפנים.'
  if (!f['i:table']) return sceneId === 'allenby' ? null : 'אלנבי, בלילה. השולחן בבית הקפה.'
  return null
}

export const ENDINGS_FRIENDS: Record<string, EndingCard> = {
  kept: {
    id: 'kept',
    titleHe: 'הבטחה, לא תזכורת',
    bodyHe:
      'שמרת את ההרכב שהובטח והוספת אימון אחר בשביל ניקו. מתוקי אמר תודה שזכרת, ואמרת שזאת הייתה הבטחה ולא תזכורת — וניקו שיחק באימון שאחרי, ברמה שעליה הזהיר.',
    memoryHe: 'שני הרכבים על אותו דף.',
    memoryItem: 'folded-paper',
  },
  asked: {
    id: 'asked',
    titleHe: 'נשארים עם מה שסיכמנו',
    bodyHe:
      'ביקשת חילוף מוסכם, ומתוקי אמר שהוא רוצה לשחק היום, כי לזה התכונן. נשארתם עם מה שסיכמתם — ושאלת, וזה מה שהוא יזכור.',
    memoryHe: 'שאלה אחת, ותשובה שכובדה.',
    memoryItem: 'folded-paper',
  },
  benched: {
    id: 'benched',
    titleHe: 'נדבר אחר כך',
    bodyHe:
      'החלפת את מתוקי בלי לשאול. הוא אמר שהוא חוזר הביתה ושתסתדרו עם הסידורים, ואמר "נדבר אחר כך" — ואחר כך עוד לא הגיע.',
    memoryHe: 'הודעה שלא נשלחה.',
    memoryItem: 'folded-paper',
  },
}

export const BEATS_FRIENDS: Beat[] = [
  { id: 'i-meet', at: 'allenby', trigger: 'enter', when: { none: [{ flag: 'i:meet' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'i-meet' }] },
  /** S1 — Roma's three practical things, said right after the introductions (`clock` + `at`) */
  { id: 'i-needs', at: 'allenby', trigger: 'clock', when: { all: [{ flag: 'i:meet' }], none: [{ flag: 'i:needs' }, { flagIs: { flag: 'i:meeting', value: 'later' } }] }, delayMs: 1000, do: [{ a: 'talk', conversation: 'i-needs' }] },
  /** S2 — a quarter past eight: what is still open, Roma does himself, with a face */
  {
    id: 'i-needs-drop',
    trigger: 'clock',
    when: { all: [{ flag: 'i:needs' }, { afterMinute: I01_NEEDS_BY }], none: [NEEDS_SETTLED] },
    delayMs: 800,
    do: [
      { a: 'derive', events: (state) => I01_NEEDS.filter((need) => !state.flags[NEED(need)]).map((need) => ({ t: 'flag.set' as const, flag: NEED(need), value: 'dropped' })) },
      { a: 'toast', text: 'רומא, בהודעה: "סידרתי את מה שנשאר. לא תשאל איך."', tone: 'red' },
    ],
  },
  {
    id: 'i-banner',
    at: 'street',
    trigger: 'enter',
    when: { all: [{ flag: 'i:meet' }, { any: [NEEDS_SETTLED, { flagIs: { flag: 'i:meeting', value: 'later' } }] }], none: [{ flag: 'i:banner' }] },
    delayMs: 700,
    do: [{ a: 'talk', conversation: 'i-banner' }],
  },
  { id: 'i-lineup', at: 'pitch', trigger: 'enter', when: { all: [{ flag: 'i:banner' }], none: [{ flag: 'i:lineup' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'i-lineup' }] },
  /** S3 — the late table: the talk about differences happens after the deeds, and is read from them */
  { id: 'i-table', at: 'allenby', trigger: 'enter', when: { all: [{ flag: 'i:lineup' }], none: [{ flag: 'i:table' }] }, delayMs: 800, do: [{ a: 'talk', conversation: 'i-table' }] },
  /** the one close path — the ending is read from what was done on the pitch; written in the conversation (90-C) */
  { id: 'i-close', trigger: 'clock', when: { all: [{ flag: 'i:table' }], none: [{ flag: 'i:done' }] }, delayMs: 1200, do: [{ a: 'talk', conversation: 'i-close' }] },
]

// ======================================================================= I04 · 2024 ====

export function objectiveLina(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone || state.flags['i:call']) return null
  if (!state.flags['i:phone']) return sceneId === 'home' ? null : 'בבית. לינה קראה מה כתבת.'
  if (!state.flags['i:jaffa']) return null
  if (!state.flags['i:tower']) return sceneId === 'jaffa' ? null : 'יפו, מגדל השעון. דרך הקשת באלנבי, ולאורך הים.'
  const walk = state.flags[LINA_WALK]
  if (walk === 'alley') return sceneId === 'jaffa-alley' ? null : 'הסמטה, בית הקפה. קודם קפה.'
  if (walk === 'boulevard') return sceneId === 'jaffa-boulevard' ? null : 'השדרה, כשהתריסים עוד סגורים.'
  return null
}

export const ENDINGS_LINA: Record<string, EndingCard> = {
  understood: {
    id: 'understood',
    titleHe: 'עכשיו אני מבין למה',
    bodyHe:
      'הסברת את העמדה שלך ושאלת מה היא שמעה. היא עדיין לא הסכימה עם הכול, וגם אתה לא — אבל עכשיו הבנת למה היא מתכוונת, והיא שמעה אותך ולא את כל מי שהגיב שם.',
    memoryHe: 'שיחה ארוכה, בלי מנצח.',
    memoryItem: 'folded-paper',
  },
  paused: {
    id: 'paused',
    titleHe: 'כשנוכל להקשיב',
    bodyHe:
      'הגדרת גבול והפסקתם את השיחה בהסכמה. היא אמרה שלא תפתרו את זה בכוח, ואמרת שתדברו כשתוכלו להקשיב. החברות לא נגמרה; היא עצרה.',
    memoryHe: 'מספר טלפון, שעוד לא נמחק.',
    memoryItem: 'folded-paper',
  },
  bounded: {
    id: 'bounded',
    titleHe: 'בלי להעמיד פנים',
    bodyHe:
      'המשכתם סביב הביקור שתכננתם, בלי להעמיד פנים שהכול נפתר. זה התאים לשניכם, וזה היה כנה יותר מהסכמה.',
    memoryHe: 'תאריך לביקור, בעיפרון.',
    memoryItem: 'folded-paper',
  },
}

/**
 * **I04 ביפו (27.9.2026).** מאור, על הרקעים שאיש לא הלך בהם: *"שפגישה מסויימת תהיה ביפו
 * למשל."* הוויכוח עם לינה היה שיחת טלפון בתשע בערב; עכשיו הוא בוקר. הם נחתו בחמש, המלון
 * רק בשתיים, והם מסתובבים ביפו מאז — ולינה מתקשרת בשש וארבעים, כי קראה מה כתבת וכי היא
 * פה. אותה שיחה, אותן שלוש תשובות, אותם שלושה סופים (`ENDINGS_LINA`) — רק שעכשיו אפשר גם
 * ללכת אליה, ולבחור איפה מדברים:
 *
 *   בית (הטלפון) ──לבוא──▶ מגדל השעון (לינה וניקו) ──▶ הסמטה · השדרה · כאן
 *                 └─לדבר עכשיו──▶ `i-call-now` (בטלפון, כמו קודם)
 *
 * **ומי שלא מגיע לא נתקע** (כלל 75, חוזה 0.4): בתשע וחצי הם הולכים לישון במלון, ולינה
 * מתקשרת שוב — `i-late` פותח את אותה שיחה בטלפון. `life:lina:walk` שורד את הפרק, ו-`i-talk`
 * קורא את `life:lina:photo` (התמונה מתחת לשעון). איפה נפגשתם נרשם אצל לינה כזיכרון
 * (`i04-jaffa` / `i04-phone`).
 */
export const LINA_WALK = 'life:lina:walk'
export const LINA_PHOTO = 'life:lina:photo'

export const BEATS_LINA: Beat[] = [
  { id: 'i-call', at: 'home', trigger: 'enter', when: { none: [{ flag: 'i:phone' }, { flag: 'i:call' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'i-call' }] },
  { id: 'i-tower', at: 'jaffa', trigger: 'enter', when: { all: [{ flag: 'i:jaffa' }], none: [{ flag: 'i:tower' }, { flag: 'i:call' }] }, delayMs: 900, do: [{ a: 'talk', conversation: 'i-tower' }] },
  {
    id: 'i-talk-alley',
    at: 'jaffa-alley',
    trigger: 'enter',
    when: { all: [{ flag: 'i:tower' }, { flagIs: { flag: LINA_WALK, value: 'alley' } }], none: [{ flag: 'i:call' }] },
    delayMs: 900,
    do: [{ a: 'talk', conversation: 'i-talk' }],
  },
  {
    id: 'i-talk-boulevard',
    at: 'jaffa-boulevard',
    trigger: 'enter',
    when: { all: [{ flag: 'i:tower' }, { flagIs: { flag: LINA_WALK, value: 'boulevard' } }], none: [{ flag: 'i:call' }] },
    delayMs: 900,
    do: [{ a: 'talk', conversation: 'i-talk' }],
  },
  /** fail-forward: בתשע וחצי הם במלון, והשיחה חוזרת לטלפון — בכל חדר שבו פוגי עומד */
  {
    id: 'i-late',
    trigger: 'clock',
    when: { all: [{ flag: 'i:jaffa' }, { afterMinute: 9 * 60 + 30 }], none: [{ flag: 'i:call' }, { flag: 'i:late' }] },
    delayMs: 800,
    waitingHe: 'הם ביפו, ליד מגדל השעון.',
    do: [{ a: 'flag', flag: 'i:late' }, { a: 'talk', conversation: 'i-late' }],
  },
]

// ======================================================================== the words ====

/** S3 — two ways to talk at the table; neither is a position, both are a way of being with them */
const I_TABLE_CHOICES: ChoiceDef[] = [
  {
    id: 'ask',
    text: '(לשאול מה שונה אצלם ביציע — ולהקשיב עד הסוף.)',
    then: [{ e: 'flag', flag: 'i:table' }, { e: 'flagValue', flag: 'life:intl:table', value: 'asked' }, { e: 'time', minutes: 40 }, { e: 'rel', who: 'lina', axis: 'bond', delta: 2 }, { e: 'toast', text: 'לינה דיברה עשרים דקות בלי הפסקה. ניקו אמר שזה קצר, אצלה.', tone: 'plain' }],
  },
  {
    id: 'tell',
    text: '(לספר על שער 5 — מי עומד שם, ולמה.)',
    then: [{ e: 'flag', flag: 'i:table' }, { e: 'flagValue', flag: 'life:intl:table', value: 'told' }, { e: 'time', minutes: 40 }, { e: 'rel', who: 'nico', axis: 'bond', delta: 2 }, { e: 'redheart', key: 'terraceCulture', delta: 2 }, { e: 'toast', text: 'ניקו רשם על מפית: "שער 5". ליתר ביטחון, גם בעברית.', tone: 'plain' }],
  },
]

export const CONVERSATIONS_FRIENDS: Conversation[] = [
  // העיר שעל הים — מה שהעיניים אומרות בחדרים של `world/city2027/jaffa.ts`
  ...JAFFA_LOOKS,
  {
    id: 'i-meet',
    nameHe: 'רומא',
    branches: [
      {
        lines: [
          { who: 'רומא', text: 'זאת לינה, זה ניקו. הם מארגנים מפגש נגד גזענות.' },
          { who: 'ניקו', text: 'וגם משחק. אבל למשחק אני פחות מוכן.' },
          { who: 'פוגי', text: 'אז אתה כבר מתאים לחבורה.' },
          { who: 'לינה', text: 'קודם קפה. אחרי זה נריב על הרכב.' },
        ],
        choices: [
          {
            id: 'listen',
            text: '(לשאול מה הם עושים — ולהקשיב.)',
            then: [
              { e: 'flag', flag: 'i:meet' },
              { e: 'flag', flag: 'life:intl:met' },
              { e: 'time', minutes: 30 },
              { e: 'rel', who: 'lina', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'לינה: "אנחנו מתחילים ממה שקורה סביבנו, לא מסיסמה." — "תני לי דוגמה מהפעילות שלכם."', tone: 'plain' },
            ],
          },
          {
            id: 'friends',
            text: '(לבוא בשביל החברות — בלי להצטרף להתארגנות.)',
            then: [
              { e: 'flag', flag: 'i:meet' },
              { e: 'flag', flag: 'life:intl:met' },
              { e: 'time', minutes: 30 },
              { e: 'rel', who: 'nico', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'ניקו: "בסדר. אתה רוצה לשחק?" — "כן. ברמה שעליה הזהרתי."', tone: 'plain' },
            ],
          },
          {
            id: 'later',
            text: '(לסרב לפעילות — ולשמור אפשרות לפגישה אחרת.)',
            then: [
              { e: 'flag', flag: 'i:meet' },
              { e: 'flagValue', flag: 'i:meeting', value: 'later' },
              { e: 'toast', text: 'רומא: "ניפגש מחר לאוכל?" — "מתאים."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'i-banner',
    nameHe: 'לינה',
    branches: [
      {
        lines: [
          { who: 'לינה', text: 'אפשר גם את השם של הקבוצה שלכם?' },
          { who: 'פוגי', text: 'נראה לי.' },
          { who: 'רומא', text: 'מי זה ״נראה לי״?' },
          { who: 'לינה', text: 'אפשר גם רק את השם שלך. אני שואלת.' },
        ],
        choices: [
          {
            id: 'personal',
            text: '(לחתום בשמי בלבד — אחרי שקראתי את הנוסח.)',
            then: [
              { e: 'flag', flag: 'i:banner' },
              { e: 'flagValue', flag: 'life:intl:banner', value: 'personal' },
              { e: 'proof', kind: 'personal_consent', proofId: 'personal_consent:{chapter}:banner', subjectHe: 'השם שלי על הבד', noteHe: 'חתם בשמו בלבד, אחרי שקרא. החברים לא נהיו חתומים.' },
              { e: 'toast', text: 'לינה: "ככה נרשום." — "בלי להפוך את החברים שלי לחתומים."', tone: 'plain' },
            ],
          },
          {
            id: 'group',
            text: '(לבקש את הסכמת החבורה — לפני שמשתמשים בשם.)',
            then: [
              { e: 'flag', flag: 'i:banner' },
              { e: 'flagValue', flag: 'life:intl:banner', value: 'group-asked' },
              { e: 'time', minutes: 30 },
              // `mediation` בתסריט → `communication` במנוע
              { e: 'skill', skill: 'communication', delta: 3, why: 'אין חתימה עד שכולם מבינים' },
              { e: 'proof', kind: 'group_consent_process', proofId: 'group_consent_process:{chapter}:banner', subjectHe: 'השם של החבורה', noteHe: 'כל אחד ראה מה כתוב לפני שמישהו חתם בשמו.' },
              { e: 'toast', text: 'אפי: "אני רוצה לראות מה כתוב." — "ברור. אין חתימה עד שכולם מבינים."', tone: 'plain' },
            ],
          },
          {
            id: 'help',
            text: '(לעזור בהקמה — בלי חתימה ובלי שיוך.)',
            // pass C: the help is done with the hands (`banner-up-10`); the proof is paid by what was tied
            then: [{ e: 'minigame', id: 'chore:story:banner-up-10' }],
          },
          {
            id: 'no',
            text: '(לא להשתתף בפעילות הזאת.)',
            then: [
              { e: 'flag', flag: 'i:banner' },
              { e: 'flagValue', flag: 'life:intl:banner', value: 'declined' },
              { e: 'toast', text: 'רומא: "נתראה אחר כך." — "בשעה שסיכמנו."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'i-lineup',
    nameHe: 'רומא',
    branches: [
      {
        lines: [
          { who: 'רומא', text: 'ניקו רוצה לשחק.' },
          { who: 'מתוקי', text: 'חשבתי שהיום אני בפנים.' },
          { who: 'פוגי', text: 'נכון. אמרתי לך.' },
          { who: 'ניקו', text: 'אז אל תוציא אותו בגללי. אפשר עוד משחק.' },
          { who: 'אופיר', text: 'סוף סוף מישהו עם פתרון שאני מבין.' },
        ],
        choices: [
          {
            id: 'kept',
            text: '(לשמור את ההרכב שהובטח — ולהוסיף אימון אחר.)',
            then: [
              { e: 'flag', flag: 'i:lineup' },
              { e: 'rel', who: 'metuki', axis: 'bond', delta: 2 },
              { e: 'rel', who: 'metuki', axis: 'trust', delta: 5 },
              { e: 'proof', kind: 'promise_kept', proofId: 'promise_kept:{chapter}:lineup', subjectHe: 'ההרכב שהובטח למתוקי באימון הידידות', noteHe: 'אמר לו שהוא בפנים, והוא היה בפנים. ניקו קיבל אימון משלו.' },
              { e: 'toast', text: 'מתוקי: "תודה שזכרת." — "זאת הייתה הבטחה, לא תזכורת."', tone: 'plain' },
              { e: 'flagValue', flag: 'i:lineupKind', value: 'kept' },
            ],
          },
          {
            id: 'asked',
            text: '(לבקש חילוף מוסכם — ולכבד סירוב.)',
            then: [
              { e: 'flag', flag: 'i:lineup' },
              { e: 'rel', who: 'metuki', axis: 'bond', delta: 2 },
              { e: 'toast', text: 'מתוקי: "אני רוצה לשחק היום. לזה התכוננתי." — "אז נשארים עם מה שסיכמנו."', tone: 'plain' },
              { e: 'flagValue', flag: 'i:lineupKind', value: 'asked' },
            ],
          },
          {
            id: 'swap',
            text: '(להחליף בלי לשאול.)',
            then: [
              { e: 'flag', flag: 'i:lineup' },
              { e: 'flag', flag: 'life:metuki:benched' },
              { e: 'rel', who: 'metuki', axis: 'bond', delta: -4 },
              { e: 'rel', who: 'metuki', axis: 'trust', delta: -8 },
              { e: 'toast', text: 'מתוקי: "אני חוזר הביתה. אתם תסתדרו עם הסידורים." — "מתוקי—" — "נדבר אחר כך."', tone: 'red' },
              { e: 'flagValue', flag: 'i:lineupKind', value: 'benched' },
            ],
          },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ pass C · S1–S3 ------
  {
    id: 'i-close',
    nameHe: null,
    branches: [
      { when: { flagIs: { flag: 'i:lineupKind', value: 'benched' } }, lines: [{ who: null, text: 'מתוקי לא בא לשולחן. הכיסא שלו נשאר ליד הקיר, ואף אחד לא ישב עליו.' }], then: [{ e: 'flag', flag: 'i:done' }, { e: 'ending', id: 'benched' }] },
      { when: { flagIs: { flag: 'i:lineupKind', value: 'asked' } }, lines: [{ who: null, text: 'מתוקי ישב בקצה, עם הנעליים עוד בשקית. הוא שיחק היום, והוא אמר את זה פעמיים.' }], then: [{ e: 'flag', flag: 'i:done' }, { e: 'ending', id: 'asked' }] },
      { lines: [{ who: null, text: 'מתוקי ישב ליד ניקו, והראה לו על מפית איך עומדים בהרכב שהובטח.' }], then: [{ e: 'flag', flag: 'i:done' }, { e: 'ending', id: 'kept' }] },
    ],
  },
  {
    id: 'i-needs',
    nameHe: 'רומא',
    branches: [
      {
        lines: [
          { who: 'רומא', text: 'ועוד שלושה דברים, לפני שבע ורבע. איפה הם ישנים הלילה.' },
          { who: 'לינה', text: 'שני כרטיסים למשחק בשבת. אנחנו משלמים, רק אין לנו איך לקנות.' },
          { who: 'ניקו', text: 'והנוסח של הבד — בעברית. שלא נכתוב משהו שאנחנו לא מבינים.' },
          { who: 'פוגי', text: 'ומה אתה לוקח?' },
          { who: 'רומא', text: 'את מה שתיתן לי. ומה שתגיד לא — תגיד בקול, לא בשתיקה.' },
        ],
        then: [{ e: 'flag', flag: 'i:needs' }],
      },
    ],
  },
  /** S2 — Roma, for what is not done by hand: hand it over, or say no out loud */
  {
    id: 'i-roma',
    nameHe: 'רומא',
    branches: [
      {
        when: NEEDS_SETTLED,
        lines: [{ who: 'רומא', text: 'שלושה מתוך שלושה. עכשיו הבד.' }],
      },
      {
        lines: [{ who: 'רומא', text: 'מה אתה נותן לי, ומה אתה לא עושה בכלל?' }],
        choices: [
          { id: 'give-bed', text: '(הלינה — לרומא. אצל אמא שלו יש מיטה.)', when: { notFlag: NEED('bed') }, hidden: true, then: [{ e: 'flagValue', flag: NEED('bed'), value: 'roma' }, { e: 'rel', who: 'roma', axis: 'trust', delta: 1 }, { e: 'toast', text: 'רומא: "אמא שלי תשאל מי הם. אני אגיד שאתה." — "תגיד שאתה."', tone: 'plain' }] },
          { id: 'give-tickets', text: '(הכרטיסים — לרומא. יש לו חבר בקופה.)', when: { notFlag: NEED('tickets') }, hidden: true, then: [{ e: 'flagValue', flag: NEED('tickets'), value: 'roma' }, { e: 'toast', text: 'רומא: "החבר בקופה יגיד שזאת טובה אחרונה." — "הוא אומר את זה מ-2002."', tone: 'plain' }] },
          { id: 'give-translate', text: '(התרגום — לרומא. הוא יביא את אפי.)', when: { notFlag: NEED('translate') }, hidden: true, then: [{ e: 'flagValue', flag: NEED('translate'), value: 'roma' }, { e: 'toast', text: 'רומא: "אפי יתרגם, ואחר כך יתווכח על כל מילה." — "זה חלק מהתרגום."', tone: 'plain' }] },
          { id: 'no-tickets', text: '(כרטיסים — לא. שיעמדו בתור בשבת, כמו כולם.)', when: { notFlag: NEED('tickets') }, hidden: true, then: [{ e: 'flagValue', flag: NEED('tickets'), value: 'refused' }, { e: 'rel', who: 'lina', axis: 'bond', delta: -1 }, { e: 'toast', text: 'לינה: "בסדר. תור זה גם ביקור." — אמרה, ולא לגמרי בחיוך.', tone: 'plain' }] },
          { id: 'no-bed', text: '(לינה — לא אצלי. אין לי איך, ואני אומר את זה עכשיו.)', when: { notFlag: NEED('bed') }, hidden: true, then: [{ e: 'flagValue', flag: NEED('bed'), value: 'refused' }, { e: 'toast', text: 'ניקו: "אכסניה ליד הים. גם זה תל אביב." — "זה יותר תל אביב ממני."', tone: 'plain' }] },
        ],
      },
    ],
  },
  /** S2 · by hand — the sofa (a chore), the ticket window (money), the banner's words (time) */
  {
    id: 'i-bed',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'הספה בסלון: עיתונים, שלט, מעיל של אבא, קופסה שאף אחד לא זוכר מה בתוכה. לשניים צריך את כולה.' }],
        choices: [
          { id: 'clear', text: '(לפנות אותה. דבר־דבר.)', then: [{ e: 'minigame', id: 'chore:story:sofa-10' }] },
        ],
      },
    ],
  },
  {
    id: 'i-tickets',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'הקופה פתוחה עד שמונה. שני כרטיסים ליציע, שישים כל אחד. לינה אמרה שהם משלמים — אחר כך.' }],
        choices: [
          {
            id: 'buy',
            text: '(לקנות שניים. מהכסף שלי, עד שיחזירו.)',
            when: { minAgorot: 12000 },
            noteHe: 'אין בכיס מאה עשרים.',
            then: [{ e: 'money', agorot: -12000, why: 'שני כרטיסים ללינה וניקו' }, { e: 'flagValue', flag: NEED('tickets'), value: 'self' }, { e: 'time', minutes: 10 }, { e: 'flag', flag: 'own:tickets-intl-2010' }, { e: 'toast', text: 'שני כרטיסים, בכיס של החולצה. הקופאי: "אורחים? אז שיבואו מוקדם."', tone: 'plain' }],
          },
        ],
      },
    ],
  },
  {
    id: 'i-translate',
    nameHe: 'לינה',
    branches: [
      {
        lines: [
          { who: 'לינה', text: 'תקרא לי שורה, ותגיד לי מה היא אומרת. לא מה היא רוצה להגיד.' },
          { who: 'פוגי', text: '"היציע שלנו פתוח. לגזענות — אין כרטיס."' },
          { who: 'ניקו', text: 'את החצי השני אני אזכור.' },
        ],
        then: [{ e: 'flagValue', flag: NEED('translate'), value: 'self' }, { e: 'time', minutes: 20 }, { e: 'rel', who: 'nico', axis: 'bond', delta: 2 }],
      },
    ],
  },
  /**
   * S3 — the late table. Nobody asks what he believes; they talk about the evening, and the
   * evening is what he did: who slept where, who stood in which queue, whose words the cloth says.
   */
  {
    id: 'i-table',
    nameHe: 'לינה',
    branches: [
      {
        when: { flagIs: { flag: NEED('bed'), value: 'self' } },
        lines: [
          { who: 'ניקו', text: 'הספה שלך קצרה מהשם שלך.' },
          { who: 'לינה', text: 'אצלנו לא מארחים ככה. אצלנו נותנים כתובת של אכסניה ומאחלים בהצלחה.' },
          { who: 'פוגי', text: 'אצלנו גם. רק שאמא שלי לא יודעת.' },
        ],
        choices: I_TABLE_CHOICES,
      },
      {
        when: { any: [{ flagIs: { flag: NEED('tickets'), value: 'refused' } }, { flagIs: { flag: NEED('bed'), value: 'refused' } }] },
        lines: [
          { who: 'לינה', text: 'אמרת לא בקול. זה יותר ממה שרוב האנשים עושים.' },
          { who: 'ניקו', text: 'והתור בשבת — אני אספר עליו בבית כמו על מסע.' },
        ],
        choices: I_TABLE_CHOICES,
      },
      {
        when: { any: I01_NEEDS.map((need) => ({ flagIs: { flag: NEED(need), value: 'dropped' } })) },
        lines: [
          { who: 'רומא', text: 'את מה שנשאר סידרתי בעצמי. לא שאלת, אז לא סיפרתי.' },
          { who: 'לינה', text: 'זה בסדר. רק תדע שהוא לא ישן.' },
        ],
        choices: I_TABLE_CHOICES,
      },
      {
        lines: [
          { who: 'לינה', text: 'כולם בבית שלכם מתווכחים ככה?' },
          { who: 'פוגי', text: 'רק על מה שחשוב. כלומר על הכול.' },
        ],
        choices: I_TABLE_CHOICES,
      },
    ],
  },
  {
    id: 'i-call',
    nameHe: 'לינה',
    // שש וארבעים בבוקר. היא ביפו; השיחה בטלפון
    remote: { 'לינה': 'phone' },
    branches: [
      {
        lines: [
          { who: 'לינה', text: 'קראתי מה כתבת, ולא הבנתי למה התכוונת.' },
          { who: 'פוגי', text: 'אז תשאלי אותי, לא את כל מי שמגיב שם.' },
          { who: 'לינה', text: 'בגלל זה התקשרתי.' },
          { who: 'לינה', text: 'ועוד משהו. נחתנו בחמש. אנחנו ביפו, ניקו ואני, מתחת למגדל השעון — והמלון רק בשתיים.' },
        ],
        choices: [
          {
            id: 'come',
            text: '(לבוא אליהם — ולדבר בפנים.)',
            then: [
              { e: 'flag', flag: 'i:phone' },
              { e: 'flag', flag: 'i:jaffa' },
              { e: 'rel', who: 'lina', axis: 'trust', delta: 2 },
              { e: 'toast', text: 'לינה: "קודם קפה." — "כמו אז. תני לי חצי שעה — אני בא לאורך הים."', tone: 'plain' },
            ],
          },
          {
            id: 'phone',
            text: '(לדבר עכשיו, בטלפון.)',
            then: [{ e: 'flag', flag: 'i:phone' }, { e: 'goto', node: 'i-call-now' }],
          },
        ],
      },
    ],
  },
  {
    /** הדרך הישנה — השיחה בטלפון, לינה ורומא על אותו קו (I04 כפי שנכתבה) */
    id: 'i-call-now',
    nameHe: 'לינה',
    remote: { 'לינה': 'phone', 'רומא': 'phone' },
    branches: [
      {
        lines: [
          { who: 'רומא', text: 'אני נשאר רק אם שניכם רוצים.' },
          { who: 'פוגי', text: 'בואו נדבר לאט.' },
        ],
        choices: linaChoices('phone'),
      },
    ],
  },
  {
    /** בתשע וחצי — הם במלון, והשיחה חוזרת לטלפון (fail-forward) */
    id: 'i-late',
    nameHe: 'לינה',
    remote: { 'לינה': 'phone', 'רומא': 'phone' },
    branches: [
      {
        lines: [
          { who: 'לינה', text: 'חיכינו מתחת לשעון. ניקו נרדם על ספסל, אז חזרנו למלון.' },
          { who: 'לינה', text: 'אבל אני עדיין רוצה לשמוע אותך. רומא על הקו.' },
          { who: 'רומא', text: 'אני נשאר רק אם שניכם רוצים.' },
          { who: 'פוגי', text: 'בואו נדבר לאט.' },
        ],
        choices: linaChoices('late'),
      },
    ],
  },
  {
    /** מתחת למגדל השעון — לינה וניקו, ארבע-עשרה שנה אחרי אלנבי */
    id: 'i-tower',
    nameHe: 'לינה',
    branches: [
      {
        // נגיעה בהם אחרי שבחרת לאן — הם כבר בדרך
        when: { flag: 'i:tower' },
        lines: [{ who: 'לינה', text: 'אנחנו אחריך. אתה זה שיודע איפה.' }],
      },
      {
        lines: [
          { who: 'ניקו', text: 'ארבע-עשרה שנה. אתה נראה כמו מישהו שהתעורר לפני רבע שעה.' },
          { who: 'פוגי', text: 'לפני עשרים דקות. והלכתי לאורך הים.' },
          { who: 'לינה', text: 'לפני שמדברים — תראה לנו את העיר שלך. לא את זו מהטלפון.' },
        ],
        choices: [
          {
            id: 'alley',
            text: '(לסמטה, לבית הקפה — קודם קפה.)',
            then: [
              { e: 'flag', flag: 'i:tower' },
              { e: 'flagValue', flag: LINA_WALK, value: 'alley' },
              { e: 'rel', who: 'nico', axis: 'bond', delta: 2 },
              { e: 'toast', text: 'ניקו: "קפה. סוף סוף מישהו מבין אותי." — "מתחת לקשתות, משמאל."', tone: 'plain' },
            ],
          },
          {
            id: 'boulevard',
            text: '(דרך השדרה, כשהתריסים עוד סגורים — ללכת ולדבר.)',
            then: [
              { e: 'flag', flag: 'i:tower' },
              { e: 'flagValue', flag: LINA_WALK, value: 'boulevard' },
              { e: 'rel', who: 'lina', axis: 'bond', delta: 2 },
              { e: 'toast', text: 'לינה: "עיר לפני שהיא מתעוררת. זה מה שרציתי." — "ימינה, לשדרה."', tone: 'plain' },
            ],
          },
          {
            id: 'here',
            text: '(כאן, מתחת לשעון. בלי לזוז.)',
            then: [
              { e: 'flag', flag: 'i:tower' },
              { e: 'flagValue', flag: LINA_WALK, value: 'tower' },
              { e: 'goto', node: 'i-talk' },
            ],
          },
        ],
      },
    ],
  },
  {
    /** פעולת צד: תמונה של שלושתכם מתחת לשעון — ו-`i-talk` זוכר אותה */
    id: 'jaffa-photo',
    nameHe: 'ניקו',
    branches: [
      {
        when: { flag: LINA_PHOTO },
        lines: [{ who: 'ניקו', text: 'כבר צילמנו. אתה יצאת עם עיניים סגורות, וזה נשאר.' }],
      },
      {
        lines: [
          { who: 'ניקו', text: 'רגע. תעמוד באמצע — אתה המקומי.' },
          { who: 'לינה', text: 'בלי לחייך בכוח. רק תעמוד.' },
        ],
        then: [
          { e: 'flag', flag: LINA_PHOTO },
          { e: 'time', minutes: 5 },
          { e: 'rel', who: 'nico', axis: 'bond', delta: 1 },
          { e: 'toast', text: 'שלושה אנשים מתחת למגדל השעון, ואחד מהם עם עיניים סגורות.', tone: 'plain' },
        ],
      },
    ],
  },
  {
    /** I04 בפנים — איפה שבחרת לעמוד. רומא על הרמקול של הטלפון של לינה */
    id: 'i-talk',
    nameHe: 'לינה',
    remote: { 'רומא': 'phone' },
    branches: [
      {
        when: { flag: LINA_PHOTO },
        lines: [
          { who: 'ניקו', text: 'שלחתי לרומא את התמונה. הוא כתב "סוף סוף", ומתקשר.' },
          { who: 'לינה', text: 'עכשיו תסביר לי. לא לכולם — לי.' },
          { who: 'רומא', text: 'אני נשאר רק אם שניכם רוצים.' },
          { who: 'פוגי', text: 'בואו נדבר לאט.' },
        ],
        choices: linaChoices('jaffa'),
      },
      {
        lines: [
          { who: 'לינה', text: 'עכשיו תסביר לי. לא לכולם — לי.' },
          { who: 'לינה', text: 'ורומא על הרמקול, כי הוא ביקש.' },
          { who: 'רומא', text: 'אני נשאר רק אם שניכם רוצים.' },
          { who: 'פוגי', text: 'בואו נדבר לאט.' },
        ],
        choices: linaChoices('jaffa'),
      },
    ],
  },
]

/**
 * שלוש התשובות של I04 — אותן מילים בכל מקום שהשיחה קורית, והמקום נרשם כזיכרון אצל לינה:
 * `i04-jaffa` למי שבא אליה, `i04-phone` למי שלא. זה מה שהחברות זוכרת, לא מי צדק.
 */
function linaChoices(where: 'phone' | 'late' | 'jaffa'): ChoiceDef[] {
  const met = where === 'jaffa'
  const remember = { e: 'remember', who: 'lina', eventId: met ? 'i04-jaffa' : 'i04-phone', significance: met ? 'major' : 'notable' } as const
  return [
    {
      id: 'explain',
      text: '(להסביר את העמדה שלי — ולשאול מה היא שמעה.)',
      then: [
        { e: 'flag', flag: 'i:call' },
        { e: 'time', minutes: 30 },
        // `mediation` בתסריט → `communication` במנוע. **לא** אישיות ולא מוניטין: איך
        // מתווכחים נמדד, על מה — לא (*"לא מנקד אידאולוגיה"*).
        { e: 'skill', skill: 'communication', delta: 3, why: 'התווכח עם חברה, לא עם קהל' },
        { e: 'rel', who: 'lina', axis: 'bond', delta: 2 },
        remember,
        { e: 'proof', kind: 'disagreed_without_proxy', proofId: 'disagreed_without_proxy:{chapter}:lina', subjectHe: 'המחלוקת עם לינה', noteHe: 'דיבר בשם עצמו, לא בשם ציבור.' },
        {
          e: 'toast',
          text: met
            ? 'לינה: "אני עדיין לא מסכימה עם הכול." — "גם אני. אבל עכשיו אני מבין למה את מתכוונת." ניקו חוזר עם שלוש כוסות.'
            : 'לינה: "אני עדיין לא מסכימה עם הכול." — "גם אני. אבל עכשיו אני מבין למה את מתכוונת."',
          tone: 'plain',
        },
        { e: 'ending', id: 'understood' },
      ],
    },
    {
      id: 'pause',
      text: '(להגדיר גבול — ולהפסיק כרגע את השיחה.)',
      then: [
        { e: 'flag', flag: 'i:call' },
        { e: 'flagValue', flag: 'life:lina', value: 'paused' },
        remember,
        {
          e: 'toast',
          text: met
            ? 'לינה: "בסדר. לא נפתור את זה בכוח." — "נדבר כשנוכל להקשיב." ניקו מושיט לך קפה בכל זאת.'
            : 'לינה: "בסדר. לא נפתור את זה בכוח." — "נדבר כשנוכל להקשיב."',
          tone: 'plain',
        },
        { e: 'ending', id: 'paused' },
      ],
    },
    {
      id: 'bounded',
      text: '(להמשיך את החברות — סביב תחום מוסכם אחר.)',
      then: [
        { e: 'flag', flag: 'i:call' },
        { e: 'flagValue', flag: 'life:lina', value: 'bounded' },
        { e: 'rel', who: 'lina', axis: 'bond', delta: 2 },
        remember,
        { e: 'toast', text: 'לינה: "אפשר לדבר על הביקור שתכננו, בלי להעמיד פנים שהכול נפתר." — "זה מתאים לי."', tone: 'plain' },
        { e: 'ending', id: 'bounded' },
      ],
    },
  ]
}
