import type { Beat } from './beats'
import type { Conversation } from './script'

/**
 * חלון COMBINATIONS — Q01–Q10, **הסצנות שקורות בתוך פרקים אחרים**.
 *
 * התסריט כותב אותן כ"שילובים": כל אחת נפתחת מצירוף של מה שהחיים כבר נושאים (שני מסלולים,
 * מסלול וחזרה, מסלול ומגורים), או לכל אחד — *"הגעה לסצנה בסדר הפרק או פתיחתה בחלון רשות"*.
 * לכן אין להן פרק משלהן: כל אחת היא ביט בפרק שהזמן שלה מתאים לו, בחדר **שאינו על הדרך
 * של הפרק** — מי שמסתובב מוצא אותה, ומי שלא, לא מפסיד את הפרק. היוצאות מן הכלל נקובות:
 *
 * | סצנה | איפה | למי |
 * |---|---|---|
 * | Q01 · בלי תפקיד, עם מקום | `2000-bridge`, טלפון מעמית אחרי ההזמנה של אופיר | לכולם — **על הדרך**: עמית שואל, והתשובה השלישית פותחת את T01 (`2001-terrace`, `whenAny`) |
 * | Q02 · המקום שלא צריך להרוויח | `2023-quiet`, הקיוסק | לכולם |
 * | Q03 · שתי חולצות באותו תיק | `2012-five`, המחסן | מייסד כדורסל **וגם** יציע |
 * | Q04 · התוף לא חיכה | `2018-return`, הקיוסק, לפני הקפיצה ל-2019 | יציע **וגם** מי שחזר ב-K03 — **על הדרך** |
 * | Q05 · כתבה מעבר לים | `2023-abroad` (`chapterAbroad.ts`), הדירה בחו״ל | חו״ל **וגם** עיתונאי **וגם** בינלאומי |
 * | Q06 · מי כותב על הבעלים | `2025-owner` (`chapterOwner.ts`) | בעלים שהיה עיתונאי |
 * | Q07 · מישהו צריך לסגור את היום | `2021-promises`, הבית שלו | לכולם; עם בן/בת זוג אם יש, אחרת עמית (בטלפון) |
 * | Q08 · כיסא באולם, כורסה בבית | `2023-quiet`, הרחוב | מייסד כדורסל |
 * | Q09 · לא כתוב פה הכול | — | הקופסה האדומה היא מערכת, לא חדר (ART-PROMPTS, "מערכת, לא מקום") |
 * | Q10 · הוא קורא לך בשם | `2026-finale` (`chapter2026finale.ts`) | מי שנוסע עם קובי |
 *
 * **"פתיחת יחידת תוכן" שהתסריט מזכיר ואין לה עדיין תוכן** (`PROJECT_CONTRACTS`,
 * `CAPACITY_PLANNER`, `CONSENSUAL_ROLE_HANDOVER`, `RETURN_LEADERSHIP_CONTRACTS`) נרשמת כדגל
 * `life:` עם אותו שם — הכוונה נשמרת בחיים, והיחידה תקרא אותה ביום שתיכתב. שום דבר כאן לא
 * מעמיד פנים שהיא קיימת.
 */

const FOUNDER = { flag: 'own:route:USSISHKIN_FOUNDER:entry' } as const
const ULTRAS = { flag: 'own:route:ULTRAS:entry' } as const

/** `life:returned` — raised by K03 "לחזור כאוהד" (`chapterWindows.ts`) */
export const RETURNED = 'life:returned'
/** Q04 stands between R01 and the jump to 2019 only for the life it belongs to */
export const DRUM_ELIGIBLE = { all: [ULTRAS, { flag: RETURNED }] } as const

export const COMBO_BEATS: Record<string, Beat[]> = {
  '2000-bridge': [
    { id: 'q-role', trigger: 'clock', when: { all: [{ flag: 'b:commit' }], none: [{ flag: 'q:role' }] }, delayMs: 900, do: [{ a: 'talk', conversation: 'q-role' }] },
  ],
  '2012-five': [
    // Q03 *"מחסן קהילתי"* — המחסן שמאחורי חדר הקהילה (`storeroom`, 21.9.2026), ולא הרחוב
    { id: 'q-shirts', at: 'storeroom', trigger: 'enter', when: { all: [FOUNDER, ULTRAS], none: [{ flag: 'q:shirts' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'q-shirts' }] },
  ],
  '2018-return': [
    { id: 'q-drum', at: 'kiosk', trigger: 'clock', when: { all: [{ flag: 'r:back' }, ...DRUM_ELIGIBLE.all], none: [{ flag: 'q:drum' }, { flag: 'r:reopen' }] }, delayMs: 900, do: [{ a: 'talk', conversation: 'q-drum' }] },
  ],
  '2021-promises': [
    // Q07 — בבית שלו (`homeAdult`), לא בחדר הילדות: ב-2021 פוגי גר עם PARTNER
    { id: 'q-week', at: 'home', trigger: 'clock', when: { all: [{ flag: 'pr:promise' }], none: [{ flag: 'q:week' }] }, delayMs: 900, do: [{ a: 'talk', conversation: 'q-week' }] },
  ],
  '2023-quiet': [
    { id: 'q-evening', at: 'kiosk', trigger: 'enter', when: { none: [{ flag: 'q:evening' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'q-evening' }] },
    { id: 'q-hall', at: 'street', trigger: 'enter', when: { all: [FOUNDER], none: [{ flag: 'q:hall' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'q-hall' }] },
  ],
}

export const CONVERSATIONS_COMBOS: Conversation[] = [
  // ------------------------------------------------------------------ Q01 ------
  {
    id: 'q-role',
    nameHe: 'עמית',
    // עמית שואל בטלפון; אם הוא עומד לידך — הוא פשוט שואל
    remote: { 'עמית': 'phone' },
    branches: [
      {
        lines: [
          { who: 'עמית', text: 'אז מה אתה השנה?' },
          { who: 'פוגי', text: 'פנוי ביום שבת. לפעמים.' },
          { who: 'עמית', text: 'התכוונתי איזה תפקיד.' },
          { who: 'פוגי', text: 'אני בא, מתרגש, חוזר. צריך לזה ועדה?' },
          { who: 'עמית', text: 'אם תקים ועדה, אתה כבר לא בתפקיד הזה.' },
        ],
        choices: [
          {
            id: 'regular',
            text: '(להישאר אוהד רגיל — בלי לקחת אחריות על אחרים.)',
            then: [
              { e: 'flag', flag: 'q:role' },
              { e: 'flagValue', flag: 'life:support', value: 'regular' },
              { e: 'toast', text: 'עמית: "אז אני שומר לך מקום לידנו." — "מקום, לא תוף."', tone: 'plain' },
            ],
          },
          {
            id: 'home',
            text: '(לראות לפעמים בבית — בתקופה הזאת הפועל בשוליים.)',
            then: [
              { e: 'flag', flag: 'q:role' },
              { e: 'flagValue', flag: 'life:support', value: 'armchair' },
              { e: 'toast', text: 'עמית: "לעדכן אותך על כל משחק?" — "רק כשאבקש. ועליך אפשר גם בלי משחק."', tone: 'plain' },
            ],
          },
          {
            id: 'explore',
            text: '"אני רוצה לנסות תפקיד קטן, בלי תואר."',
            then: [
              { e: 'flag', flag: 'q:role' },
              { e: 'flagValue', flag: 'life:support', value: 'exploring' },
              // *"פתיחת יחידת תוכן T01"* — the second door into `2001-terrace` (`whenAny`)
              { e: 'flag', flag: 'life:terrace:exploring' },
              { e: 'toast', text: 'עמית: "רשימה אחת. בלי ״נשנה את העולם״." — "תלוי כמה שמות יש בה."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ Q02 ------
  {
    id: 'q-evening',
    nameHe: 'אופיר',
    branches: [
      {
        lines: [
          { who: 'אופיר', text: 'מי מארגן היום?' },
          { who: 'פוגי', text: 'מישהו אחר.' },
          { who: 'אופיר', text: 'ומי אתה?' },
          { who: 'פוגי', text: 'זה שעוד רואה מה קורה במשחק.' },
          { who: 'אופיר', text: 'תעדכן גם אותי.' },
        ],
        choices: [
          {
            id: 'stay',
            text: '(לראות עם אופיר — ולהישאר לשיחה אחרי.)',
            then: [
              { e: 'flag', flag: 'q:evening' },
              { e: 'time', minutes: 90 },
              { e: 'energy', delta: -5 },
              { e: 'rel', who: 'ofir', axis: 'bond', delta: 3 },
              { e: 'memory', item: 'folded-paper', id: 'q-ordinary-evening' },
              { e: 'toast', text: 'אופיר: "אני זוכר איך נגמר." — "אני זוכר מה סיפרת לי במחצית."', tone: 'plain' },
            ],
          },
          {
            id: 'part',
            text: '(לראות חלק — וללכת בזמן שקבעתי.)',
            then: [
              { e: 'flag', flag: 'q:evening' },
              { e: 'time', minutes: 45 },
              { e: 'energy', delta: -5 },
              { e: 'toast', text: 'אופיר: "כבר הולך?" — "כן. אמרתי שאחזור בזמן." — "אז תשלח שהגעת."', tone: 'plain' },
            ],
          },
          {
            id: 'other',
            text: '"היום לא. בוא ניפגש על משהו שהוא לא משחק."',
            then: [
              { e: 'flag', flag: 'q:evening' },
              { e: 'flagValue', flag: 'life:ofir:next', value: 'nonfootball' },
              { e: 'toast', text: 'אופיר: "אז על מה נדבר?" — "תתחיל בשלומך. נתקדם משם."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ Q03 ------
  {
    id: 'q-shirts',
    nameHe: 'מתוקי',
    branches: [
      {
        lines: [
          { who: 'אפי', text: 'אתה איתנו מחר?' },
          { who: 'עמית', text: 'הוא כבר איתנו מחר.' },
          { who: 'פוגי', text: 'מחר גדול. יש בו כמה שעות.' },
          { who: 'מתוקי', text: 'בדקתי. אלה אותן שעות.' },
          { who: 'פוגי', text: 'היה שווה לנסות.' },
        ],
        choices: [
          {
            id: 'two',
            text: '(לתאם ביצוע בשני חלונות פנויים — ולסגור עם שני הצוותים.)',
            then: [
              { e: 'flag', flag: 'q:shirts' },
              { e: 'flag', flag: 'promise:dualDelivery' },
              { e: 'time', minutes: 30 },
              { e: 'toast', text: 'מתוקי: "שתי כתובות, שתי שעות. עכשיו יש תוכנית." — אפי: "תגיע אלינו כאילו אנחנו לא התחנה השנייה."', tone: 'plain' },
            ],
          },
          {
            id: 'hand',
            text: '(למסור חלק אחד לשותף שהסכים — ולבצע את שלי.)',
            then: [
              { e: 'flag', flag: 'q:shirts' },
              { e: 'time', minutes: 30 },
              { e: 'energy', delta: -5 },
              { e: 'skill', skill: 'organization', delta: 2, why: 'מסר חלק לשותף שהסכים, בשם' },
              { e: 'proof', kind: 'consenting_handover', proofId: 'consenting_handover:{chapter}:shirts', subjectHe: 'שתי החולצות', noteHe: 'מי שקיבל את החלק ידע לפני שאחרים ידעו.' },
              { e: 'toast', text: 'עמית: "אני יודע מי אחראי כשאתה לא פה?" — "כן. והוא יודע לפני שאתה יודע."', tone: 'plain' },
            ],
          },
          {
            id: 'one',
            text: '"הפעם אני רק בכדורסל."',
            then: [
              { e: 'flag', flag: 'q:shirts' },
              { e: 'toast', text: 'עמית: "נמצא מחליף. טוב שאמרת לפני שהתחלנו." — "תספר לי איך היה, בלי להעמיד פנים שהייתי."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ Q04 ------
  {
    id: 'q-drum',
    nameHe: 'עמית',
    branches: [
      {
        lines: [
          { who: 'עמית', text: 'שמרנו לך מקום.' },
          { who: 'פוגי', text: 'ליד התוף?' },
          { who: 'עמית', text: 'לידנו.' },
          { who: 'פוגי', text: 'הבנתי.' },
          { who: 'עמית', text: 'לא בטוח. אתה לא צריך להוכיח שהיית פה כדי להיות פה עכשיו.' },
        ],
        choices: [
          {
            id: 'fan',
            text: '(לחזור כאוהד רגיל — התפקיד שהיה הוא חלק מהסיפור.)',
            then: [
              { e: 'flag', flag: 'q:drum' },
              { e: 'flagValue', flag: 'life:terrace:return', value: 'supporter' },
              { e: 'rel', who: 'amit', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'עמית: "בוא תראה מי עומד היום מקדימה." — "אני אנסה לא להגיד איך עשינו את זה פעם."', tone: 'plain' },
            ],
          },
          {
            id: 'mentor',
            text: '(להציע חניכה — ורק אם הצוות רוצה.)',
            then: [
              { e: 'flag', flag: 'q:drum' },
              { e: 'flagValue', flag: 'life:terrace:return', value: 'mentor_offer' },
              { e: 'toast', text: 'עמית: "אני אשאל אותם." — "ואם לא?" — "עדיין יש מקום לידנו."', tone: 'plain' },
            ],
          },
          {
            id: 'again',
            text: '(להתחיל שלוש משימות חזרה לתפקיד.)',
            then: [
              { e: 'flag', flag: 'q:drum' },
              { e: 'flagValue', flag: 'life:terrace:return', value: 'requalification' },
              { e: 'flag', flag: 'life:RETURN_LEADERSHIP_CONTRACTS' },
              { e: 'toast', text: 'עמית: "תחזור קודם להיות מישהו שאפשר לתאם איתו." — "הוגן. מה צריך ביום חמישי?"', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ Q07 ------
  {
    id: 'q-week',
    nameHe: 'עמית',
    // בלי בן/בת זוג, השבוע נסגר בטלפון עם עמית — הוא לא גר שם
    remote: { 'עמית': 'phone' },
    branches: [
      {
        // *"אם יש בן/בת זוג זו שיחה משותפת; אחרת זו תכנון עצמי ושיחה עם עמית"*
        when: { flag: 'life:partner' },
        lines: [
          { who: 'PARTNER', text: 'אתה פנוי השבוע?' },
          { who: 'פוגי', text: 'על הנייר.' },
          { who: 'PARTNER', text: 'איזה נייר?' },
          { who: 'פוגי', text: 'זה שלא כתבתי עליו עבודה, בית ושינה.' },
          { who: 'PARTNER', text: 'תשאיר לפחות שורה לשפיות.' },
        ],
        choices: weekChoices(),
      },
      {
        lines: [
          { who: 'עמית', text: 'אתה פנוי השבוע?' },
          { who: 'פוגי', text: 'על הנייר.' },
          { who: 'עמית', text: 'איזה נייר?' },
          { who: 'פוגי', text: 'זה שלא כתבתי עליו עבודה, בית ושינה.' },
          { who: 'עמית', text: 'תשאיר לפחות שורה לשפיות.' },
        ],
        choices: weekChoices(),
      },
    ],
  },

  // ------------------------------------------------------------------ Q08 ------
  {
    id: 'q-hall',
    nameHe: 'אפי',
    branches: [
      {
        lines: [
          { who: 'אפי', text: 'אתה אומר שאתה כבר לא הולך, ואז אני רואה אותך באולם.' },
          { who: 'פוגי', text: 'שאלת על כדורגל.' },
          { who: 'אפי', text: 'נכון.' },
          { who: 'פוגי', text: 'חשבת שאם הפסקתי לצעוק במקום אחד, כולם קיבלו שקט?' },
          { who: 'אפי', text: 'קיוויתי.' },
        ],
        choices: [
          {
            id: 'hall',
            text: '(כדורסל פעיל; כדורגל לפעמים בטלוויזיה.)',
            then: [
              { e: 'flag', flag: 'q:hall' },
              { e: 'flagValue', flag: 'life:basketball', value: 'central' },
              { e: 'flagValue', flag: 'life:football', value: 'peripheral' },
              { e: 'toast', text: 'אפי: "אז לא צריך להחזיר אותך לשום דבר." — "רק להפסיק לקנות לי שני מנויים."', tone: 'plain' },
            ],
          },
          {
            id: 'both',
            text: '(בשני הענפים — אבוא מדי פעם כאוהד רגיל.)',
            then: [
              { e: 'flag', flag: 'q:hall' },
              { e: 'flagValue', flag: 'life:basketball', value: 'balanced' },
              { e: 'flagValue', flag: 'life:football', value: 'balanced' },
              { e: 'flag', flag: 'life:CONSENSUAL_ROLE_HANDOVER' },
              { e: 'toast', text: 'אפי: "ומה עם התפקיד?" — "אעביר אותו כמו שצריך. הזיכרונות נשארים."', tone: 'plain' },
            ],
          },
          {
            id: 'rest',
            text: '(להפסיק לתקופה בשני הענפים — ולשמור קשר עם אפי.)',
            then: [
              { e: 'flag', flag: 'q:hall' },
              { e: 'flagValue', flag: 'life:basketball', value: 'peripheral' },
              { e: 'flagValue', flag: 'life:football', value: 'peripheral' },
              { e: 'rel', who: 'efi', axis: 'bond', delta: 2 },
              { e: 'toast', text: 'אפי: "קפה ביום שאין משחק?" — "יש ימים כאלה?" — "נחקור."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
]

function weekChoices() {
  return [
    {
      id: 'one',
      text: '(להתחייב לתפקיד אחד — ולהשאיר זמן לחיים האחרים.)',
      then: [
        { e: 'flag' as const, flag: 'q:week' },
        { e: 'flagValue' as const, flag: 'life:schedule', value: 'one_role' },
        { e: 'proof' as const, kind: 'boundaries_set', proofId: 'boundaries_set:{chapter}:week', subjectHe: 'השבוע שלי', noteHe: 'תפקיד אחד, ושורה לשפיות.' },
        { e: 'wellbeing' as const, key: 'stress' as const, delta: -5 },
        { e: 'toast' as const, text: '"אז אני יודע בדיוק למה אפשר לפנות אליך." — "ואני יודע מתי מותר לא לענות."', tone: 'plain' as const },
      ],
    },
    {
      id: 'two',
      text: '(תוכנית לשני תפקידים — עם צוות והסכמות.)',
      then: [
        { e: 'flag' as const, flag: 'q:week' },
        { e: 'flagValue' as const, flag: 'life:schedule', value: 'two_roles_pending' },
        { e: 'flag' as const, flag: 'life:CAPACITY_PLANNER' },
        { e: 'toast' as const, text: '"מי מכסה כשאחד הערבים נופל?" — "נסגור את זה לפני שאכתוב שאני פנוי."', tone: 'plain' as const },
      ],
    },
    {
      id: 'pause',
      text: '(בתקופה הזאת — עבודה או בית; התפקיד בהשהיה.)',
      then: [
        { e: 'flag' as const, flag: 'q:week' },
        { e: 'flagValue' as const, flag: 'life:schedule', value: 'pause_public_roles' },
        { e: 'flag' as const, flag: 'life:CONSENSUAL_ROLE_HANDOVER' },
        { e: 'toast' as const, text: '"את מה שכבר לקחת נסגור יחד." — "את מה שעוד לא לקחתי, לא אבטיח."', tone: 'plain' as const },
      ],
    },
  ]
}
