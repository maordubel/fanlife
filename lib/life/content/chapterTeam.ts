import type { LifeState } from '../types'
import { streetMatch } from '../football/door'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { ChoiceDef, Conversation } from './script'
import { PORTRAIT_EUROPE } from './chapter2002europe'

/**
 * חלון TOURNAMENT — Y01–Y05 · "עוד התקפה אחת" · קיץ 2000.
 *
 * **איך הוא נפתח: מהחיים, בלבד** (מאור, 21.9.2026, מבין שלוש אפשרויות). עד היום אופיר
 * התקשר בסוף `2000-bridge` ושאל כן או לא; עכשיו אין שאלה. מי שבחר בקיוסק *"הערב אני פנוי.
 * בואו"* — החבר׳ה על פני משמרת ורשימה — מרים `life:team`, ו-`2000-team` הוא פשוט הפרק הבא.
 * מי שבחר אחרת לא מאבד דבר: הטורניר של 2023 (`Z01`) בציר הראשי וקורה לכולם.
 *
 * **חמש הסצנות, בחדרים שכבר יש:** המגרש השכונתי (`Y01`, `Y03`, `Y04` — התחליף של
 * `pitchSmall` מבריף הציור), הקיוסק לשיחת הסגל (`Y02`) ולארוחה שאחרי (`Y05`: *"עכשיו
 * אוכל"*).
 *
 * **המשחק הוא המשחק.** `Y04` מבקש *"מיני־משחק team_match"* שהתוצאה שלו מגיעה ממנוע —
 * וזה בדיוק המגרש התלת-ממדי שכבר יש (`{ e: 'pitch' }`, `football/door.ts`). התוצאה חוזרת
 * כ-`pitch:result` (`settlePitch` ב-`useLifeLedger`), ו-`Y05` קורא אותה: ניצחון — גביע
 * פלסטיק עם שריטה; תיקו או הפסד — תמונה בלי גביע. *"אין חזרה אוטומטית על גלגול כדי
 * לזכות"*: הסצנה קוראת את התוצאה פעם אחת ולא מציעה עוד משחק.
 *
 * **שלוש המרות מהתסריט לשפת המנוע, כל אחת במקום אחד:**
 * · `mediation` → `communication` (כמו ב-`2018-return`); `organization` נשאר כמו שהוא.
 * · *"תיאום pogi|ofir"* → קשר עם אופיר (bond + trust); *"יכולת מגרש"* אין במנוע — ולכן
 *   לא הומצאה, והאימון נושא את מה שכן קיים: זמן, אנרגיה, והאדם שהתאמנת איתו.
 * · *"חבר ליבה חסר"* (`Y02.3`, יבגני) — הליבה היא ארבעה, ופוגי אחד מהם. מי שבחר ב-`Y01.3`
 *   לא לשחק הפעם השאיר נעליים ריקות, וזה המצב היחיד בחלון שבו חבר ליבה באמת חסר.
 */

export const PORTRAIT_TEAM: Record<string, string> = {
  ...PORTRAIT_EUROPE,
}

/** the team's own flags that outlive the summer — `life:` survives a year (`personFlags`) */
export const TEAM_FLAG = 'life:team'
export const TEAM_NAME = 'life:team:name'
export const TEAM_ROLE = 'life:team:role'
export const TEAM_CUP = 'life:team:cup'

const social = { flagIs: { flag: TEAM_ROLE, value: 'social' } } as const

// ----------------------------------------------------------------- the chapter ---

export function objectiveTeam(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (!state.flags['y:name']) return sceneId === 'pitch' ? null : 'המגרש. צריך שם עד מחר.'
  if (!state.flags['y:guest']) return sceneId === 'kiosk' ? null : 'חסר שחקן. מתוקי בקיוסק.'
  if (!state.flags['y:train']) return sceneId === 'pitch' ? null : 'אימון לפני המפגש. כולם מאמנים.'
  if (!state.flags['y:match']) return sceneId === 'pitch' ? null : 'המשחק. עוד התקפה אחת.'
  if (!state.flags['y:after']) return sceneId === 'street' ? null : 'אחרי המשחק. שולחן פלסטיק מחוץ לקיוסק.'
  return null
}

export const ENDINGS_TEAM: Record<string, EndingCard> = {
  cup: {
    id: 'cup',
    titleHe: 'גביע עם שריטה',
    bodyHe:
      'ניצחתם, והגביע היה פלסטיק עם שריטה בצד. צילמתם את ההרכב כמו שהוא באמת עמד — מי שמסר, מי שכבש, ומי שבא בלי לסדר לכולם משהו — והתמונה הזאת נשמרה יותר זמן מהגביע.',
    memoryHe: 'גביע פלסטיק, שנה וארבעה שמות.',
    memoryItem: 'folded-paper',
  },
  photo: {
    id: 'photo',
    titleHe: 'סתם תמונה',
    bodyHe:
      'לא היה גביע. הייתה תמונה של ההרכב בפועל, עם מתוקי באמצע שלא האמין שהוא בפנים, ואפי שכבר חשב על האוכל. היא נכנסה ליומן בלי תוצאה, כי התוצאה לא הייתה מה שקרה שם.',
    memoryHe: 'תמונה, בלי גביע.',
    memoryItem: 'folded-paper',
  },
  repair: {
    id: 'repair',
    titleHe: 'מה מתאים לפעם הבאה',
    bodyHe:
      'ישבת עם אופיר אחרי המשחק. הוא אמר שרצה שתשאל לפני שהחלפת אותו, ואמרת שהוא צודק ושאלת מה מתאים לפעם הבאה. זה לא תיקן את הקיץ — זה תיקן את הקיץ הבא.',
    memoryHe: 'שורה ביומן: "לשאול קודם".',
    memoryItem: 'folded-paper',
  },
  goal: {
    id: 'goal',
    titleHe: 'בישול למתוקי',
    bodyHe:
      'עמית שאל כמה שערים, ואמרת שהפעם בישול למתוקי. מתוקי אמר שהוא יצטרך לקבל את הכדור בשביל זה, וכולם צחקו — ורשמתם את זה כיעד, לא כבדיחה.',
    memoryHe: 'יעד אחד לפעם הבאה, בכתב יד.',
    memoryItem: 'score-paper',
  },
}

export const BEATS_TEAM: Beat[] = [
  { id: 'y-name', at: 'pitch', trigger: 'enter', when: { none: [{ flag: 'y:name' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'y-name' }] },
  { id: 'y-guest', at: 'kiosk', trigger: 'enter', when: { all: [{ flag: 'y:name' }], none: [{ flag: 'y:guest' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'y-guest' }] },
  { id: 'y-train', at: 'pitch', trigger: 'enter', when: { all: [{ flag: 'y:guest' }], none: [{ flag: 'y:train' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'y-train' }] },
  /**
   * `clock` ולא `enter`: האימון והמשחק באותו מגרש, ומי שסיים להתאמן כבר עומד בו. ביט
   * שמחכה לכניסה היה שולח אותו לצאת ולחזור כדי שהמשחק יתחיל.
   */
  { id: 'y-match', at: 'pitch', trigger: 'clock', when: { all: [{ flag: 'y:train' }], none: [{ flag: 'y:match' }] }, delayMs: 1400, do: [{ a: 'talk', conversation: 'y-match' }] },
  // Y05 — *"שולחן פלסטיק מחוץ לקיוסק"*: on the pavement under the awning, not inside (21.9.2026)
  { id: 'y-after', at: 'street', trigger: 'enter', when: { all: [{ flag: 'y:match' }], none: [{ flag: 'y:after' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'y-after' }] },
  /** the ending is read from what was chosen, once the evening is over (the `b-close` shape) */
  { id: 'y-close', trigger: 'clock', when: { all: [{ flag: 'y:after' }], none: [{ flag: 'y:done' }] }, delayMs: 1000, do: [{ a: 'flag', flag: 'y:done' }, { a: 'talk', conversation: 'y-close' }] },
]

// ------------------------------------------------------------------ the words ----

/**
 * `Y05` — the same three choices whatever the score, and the score only changes what
 * happened to the cup. The promise to Metuki is paid here, by the photograph of the
 * roster as it actually stood; the two photo lines are one sentence with two prices, so
 * the one that does not apply is `hidden` rather than greyed (`ChoiceDef.hidden`).
 */
const afterChoices = (won: boolean): ChoiceDef[] => {
  const cup = won ? [{ e: 'flag' as const, flag: TEAM_CUP }] : []
  const photo = [
    { e: 'flag' as const, flag: 'y:after' },
    { e: 'flagValue' as const, flag: 'y:afterKind', value: 'photo' },
    { e: 'time' as const, minutes: 20 },
    { e: 'memory' as const, item: 'folded-paper' as const, id: 'y-roster-photo' },
    ...cup,
  ]
  return [
    {
      id: 'photo-kept',
      text: '(לצלם את ההרכב בפועל — ולשמור ביומן.)',
      when: { flag: 'promise:guestSlot' },
      hidden: true,
      then: [
        ...photo,
        { e: 'proof', kind: 'promise_kept', proofId: 'promise_kept:{chapter}:guest', subjectHe: 'המקום של מתוקי בהרכב', noteHe: 'הובטח בשיחת הסגל, ושוחק במשחק.' },
        { e: 'rel', who: 'metuki', axis: 'trust', delta: 3 },
      ],
    },
    {
      id: 'photo',
      text: '(לצלם את ההרכב בפועל — ולשמור ביומן.)',
      when: { notFlag: 'promise:guestSlot' },
      hidden: true,
      then: photo,
    },
    {
      id: 'repair',
      text: '(לשבת עם אופיר. ההחלטה שלי פגעה בו.)',
      // *"team.unresolved_roster_issue"* — the one decision in this window that benched a
      // core player without asking him is the guest's slot, and it was Ofir who asked
      // "אתה אומר את זה אליי?" when Amit promised it out loud.
      when: { flagIs: { flag: 'y:guestWho', value: 'metuki' } },
      noteHe: 'אף אחד לא ישב בגללך הפעם.',
      then: [
        { e: 'flag', flag: 'y:after' },
        { e: 'flagValue', flag: 'y:afterKind', value: 'repair' },
        { e: 'time', minutes: 30 },
        { e: 'rel', who: 'ofir', axis: 'bond', delta: 1 },
        { e: 'rel', who: 'ofir', axis: 'trust', delta: 2 },
        ...cup,
      ],
    },
    {
      id: 'goal',
      text: '(לקבוע יעד אישי לפעם הבאה.)',
      then: [
        { e: 'flag', flag: 'y:after' },
        { e: 'flagValue', flag: 'y:afterKind', value: 'goal' },
        { e: 'flagValue', flag: 'life:team:goal', value: 'assist_guest' },
        { e: 'time', minutes: 15 },
        ...cup,
      ],
    },
  ]
}

const AFTER_LINES = [
  { who: 'אופיר', text: 'עוד משחק?' },
  { who: 'אפי', text: 'עכשיו אוכל.' },
  { who: 'עמית', text: 'צריך לרשום מי כבש.' },
  { who: 'מתוקי', text: 'ומי מסר.' },
  { who: 'פוגי', text: 'ומי סוף סוף בא בלי שסידר לכולם משהו.' },
]

export const CONVERSATIONS_TEAM: Conversation[] = [
  // ------------------------------------------------------------------ Y01 ------
  {
    id: 'y-name',
    nameHe: 'אופיר',
    branches: [
      {
        lines: [
          { who: 'אופיר', text: 'קוראים לנו "הבלתי מנוצחים".' },
          { who: 'עמית', text: 'עוד לא שיחקנו.' },
          { who: 'אופיר', text: 'אז בינתיים זה נכון.' },
          { who: 'אפי', text: 'קודם תחליטו מי עומד בשער.' },
          { who: 'פוגי', text: 'בשם כזה כנראה אני.' },
        ],
        choices: [
          {
            id: 'together',
            text: '(לבחור שם יחד — ולסכם חילופים.)',
            then: [
              { e: 'flag', flag: 'y:name' },
              { e: 'flagValue', flag: TEAM_NAME, value: 'עוד התקפה אחת' },
              { e: 'flagValue', flag: TEAM_ROLE, value: 'player' },
              { e: 'time', minutes: 30 },
              { e: 'skill', skill: 'organization', delta: 3, why: 'סיכם חילופים לפני שמישהו ביקש' },
              { e: 'proof', kind: 'team_founded', proofId: 'team_founded:{chapter}:name', subjectHe: 'הקבוצה של הקיץ', audience: 'gate5', delta: 1, noteHe: 'שם אחד שהוחלט יחד, וחילופים שסוכמו בקול.' },
              { e: 'toast', text: 'עמית: "גם למי שיושב יהיה זמן משחק." — אופיר: "אתה אומר את זה אליי?" — "אני אומר את זה בקול, לכולם."', tone: 'plain' },
            ],
          },
          {
            id: 'crew',
            text: '(לתת לחבורה לבחור — ולהוביל את ההרשמה.)',
            then: [
              { e: 'flag', flag: 'y:name' },
              { e: 'flagValue', flag: TEAM_NAME, value: 'חברים מהסמטה' },
              { e: 'flagValue', flag: TEAM_ROLE, value: 'organizer' },
              { e: 'time', minutes: 30 },
              // `mediation` בתסריט → `communication` במנוע
              { e: 'skill', skill: 'communication', delta: 3, why: 'נתן לחבורה לבחור, ולקח את ההרשמה' },
              { e: 'proof', kind: 'team_founded', proofId: 'team_founded:{chapter}:name', subjectHe: 'הקבוצה של הקיץ', audience: 'gate5', delta: 1, noteHe: 'השם של החבורה, וההרשמה עליו.' },
              { e: 'toast', text: 'אפי: "אז אתה מטפל באנשים, לא רק בשם." — "מישהו צריך."', tone: 'plain' },
            ],
          },
          {
            id: 'social',
            text: '(לא לשחק הפעם — לעזור רק אם יבקשו.)',
            then: [
              { e: 'flag', flag: 'y:name' },
              { e: 'flagValue', flag: TEAM_NAME, value: 'עוד התקפה אחת' },
              { e: 'flagValue', flag: TEAM_ROLE, value: 'social' },
              { e: 'toast', text: 'אופיר: "אתה יכול גם לבוא סתם." — "תשמור לי מקום אחרי המשחק."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ Y02 ------
  {
    id: 'y-guest',
    nameHe: 'מתוקי',
    branches: [
      {
        lines: [
          { who: 'מתוקי', text: 'מה חסר?' },
          { who: 'פוגי', text: 'שחקן.' },
          { who: 'מתוקי', text: 'אז למה התקשרת אליי?' },
          { who: 'פוגי', text: 'כי אמרת שאתה רוצה לשחק.' },
          { who: 'מתוקי', text: 'אמרתי גם שאני חלוץ. את זה פחות חייבים לזכור.' },
        ],
        choices: [
          {
            id: 'metuki',
            text: '(לתת למתוקי מקום — אם הוא רוצה ופנוי.)',
            then: [
              { e: 'flag', flag: 'y:guest' },
              { e: 'flagValue', flag: 'y:guestWho', value: 'metuki' },
              { e: 'flag', flag: 'promise:guestSlot' },
              { e: 'rel', who: 'metuki', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'מתוקי: "רוצה. ואני מביא נעליים, לא קלסר." — "שתי הפתעות ביום אחד."', tone: 'plain' },
            ],
          },
          {
            id: 'roma',
            text: '(לבחור ברומא — שהסכים, לפני שהובטח מקום למישהו.)',
            then: [
              { e: 'flag', flag: 'y:guest' },
              { e: 'flagValue', flag: 'y:guestWho', value: 'roma' },
              { e: 'rel', who: 'roma', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'רומא: "אני בא לשחק. היום לא מביא משלחת." — "גם זה שינוי מרענן."', tone: 'plain' },
            ],
          },
          {
            id: 'yevgeny',
            text: '(לבנות סגל חלופי בהסכמה — יבגני נכנס לתפקיד שסוכם.)',
            when: social,
            noteHe: 'כל הליבה במגרש — אין נעליים ריקות למלא.',
            then: [
              { e: 'flag', flag: 'y:guest' },
              { e: 'flagValue', flag: 'y:guestWho', value: 'yevgeny' },
              { e: 'proof', kind: 'consented_replacement', proofId: 'consented_replacement:{chapter}:roster', subjectHe: 'הנעליים שהשארתי', audience: 'gate5', delta: 1, noteHe: 'המקום שהתפנה מולא בהסכמה, בתפקיד שסוכם מראש.' },
              { e: 'toast', text: 'יבגני: "אני נכנס לתפקיד שסיכמנו, לא לנעליים של מישהו." — "בדיוק."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ Y03 ------
  {
    id: 'y-train',
    nameHe: 'אפי',
    branches: [
      {
        lines: [
          { who: 'אפי', text: 'תפסיקו לתת לפוגי הוראות מכל צד.' },
          { who: 'עמית', text: 'שלי נכונות.' },
          { who: 'אופיר', text: 'שלי קצרות.' },
          { who: 'מתוקי', text: 'שלי לא נשמעות.' },
          { who: 'פוגי', text: 'אז נתחיל משלך.' },
        ],
        choices: [
          {
            id: 'onetwo',
            text: '(להתאמן על אחד־שתיים עם אופיר.)',
            // pass C: the drill is played on the dirt (`onetwo-00`), and the passes are what Ofir remembers
            then: [{ e: 'minigame', id: 'chore:story:onetwo-00' }],
          },
          {
            id: 'rest',
            text: '(לנוח — ולחלק תפקידים בלי אימון.)',
            then: [
              { e: 'flag', flag: 'y:train' },
              { e: 'time', minutes: 30 },
              { e: 'energy', delta: 25 },
              { e: 'wellbeing', key: 'stress', delta: -10 },
              { e: 'toast', text: 'אפי: "לפעמים לשבת זה מהלך חכם." — "מצאתי סוף סוף עמדה."', tone: 'plain' },
            ],
          },
          {
            id: 'listen',
            text: '(להקשיב לתוכנית של האורח — ולתאם.)',
            then: [
              { e: 'flag', flag: 'y:train' },
              { e: 'time', minutes: 30 },
              { e: 'energy', delta: -5 },
              // `reading` (יכולת מגרש) אין במנוע; `mediation` → `communication`
              { e: 'skill', skill: 'communication', delta: 2, why: 'שמע תוכנית של מי שבא מבחוץ' },
              { e: 'toast', text: 'מתוקי: "אני רוצה פעם אחת להתחיל מהצד הזה." — "ננסה. עכשיו אנחנו יודעים למה."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ Y04 ------
  {
    id: 'y-match',
    nameHe: 'אפי',
    branches: [
      {
        // מי שבחר לא לשחק (Y01.3) לא מקבל "לשחק את התוכנית" — הוא על הקו, והשאלה שלו אחרת
        when: social,
        lines: [
          { who: 'אופיר', text: 'אני פנוי!' },
          { who: 'עמית', text: 'אתה תמיד פנוי כשאתה לא רץ.' },
          { who: 'אפי', text: 'פוגי, אתה על הקו או בפנים?' },
        ],
        choices: [
          {
            id: 'line',
            text: '(להישאר על הקו — ולספור מי מסר למי.)',
            then: [
              { e: 'flag', flag: 'y:match' },
              { e: 'flagValue', flag: 'y:intent', value: 'watched' },
              { e: 'time', minutes: 50 },
              { e: 'toast', text: 'אפי: "תספור גם את שלי." — "את שלך אני סופר פעמיים."', tone: 'plain' },
            ],
          },
          {
            id: 'sub',
            text: '(להיכנס לעשר הדקות האחרונות, כשביקשו.)',
            then: [
              { e: 'flag', flag: 'y:match' },
              { e: 'flagValue', flag: 'y:intent', value: 'sub' },
              { e: 'pitch', intent: { ...streetMatch('2000'), homeHe: 'החבורה', awayHe: 'הקבוצה השנייה' } },
            ],
          },
        ],
      },
      {
        lines: [
          { who: 'אופיר', text: 'אני פנוי!' },
          { who: 'עמית', text: 'אתה תמיד פנוי כשאתה לא רץ.' },
          { who: 'אפי', text: 'פוגי, תסתכל לפני המסירה.' },
          { who: 'מתוקי', text: 'גם בצד שלי יש מגרש.' },
        ],
        choices: [
          {
            id: 'share',
            text: '(לשחק את התוכנית — ולשתף את החבר הפנוי.)',
            then: [
              { e: 'flag', flag: 'y:match' },
              { e: 'flagValue', flag: 'y:intent', value: 'share' },
              { e: 'pitch', intent: { ...streetMatch('2000'), homeHe: 'החבורה', awayHe: 'הקבוצה השנייה' } },
            ],
          },
          {
            id: 'delegate',
            text: '(לתת לאפי להוביל — ולשחק תפקיד משלים.)',
            then: [
              { e: 'flag', flag: 'y:match' },
              { e: 'flagValue', flag: 'y:intent', value: 'delegate' },
              { e: 'rel', who: 'efi', axis: 'trust', delta: 2 },
              { e: 'toast', text: 'אפי: "באמת נותן לי להחליט?" — "למשחק הזה. אל תיסחף."', tone: 'plain' },
              { e: 'pitch', intent: { ...streetMatch('2000'), homeHe: 'החבורה', awayHe: 'הקבוצה השנייה' } },
            ],
          },
          {
            id: 'withdraw',
            text: '(לפרוש לפני המשחק — ולמסור את האחריות בהסכמה.)',
            then: [
              { e: 'flag', flag: 'y:match' },
              { e: 'flagValue', flag: 'y:intent', value: 'withdrew' },
              { e: 'rel', who: 'efi', axis: 'bond', delta: 1 },
              { e: 'proof', kind: 'handover', proofId: 'handover:{chapter}:match', subjectHe: 'המשחק שלא שיחקתי', audience: 'gate5', delta: 1, noteHe: 'מסר אחריות לפני המשחק, בהסכמה ובקול.' },
              { e: 'toast', text: 'אפי: "אנחנו ממשיכים. נדבר אחר כך." — "בהצלחה. אני לא נעלם בלי להגיד."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ Y05 ------
  {
    id: 'y-after',
    nameHe: 'אופיר',
    branches: [
      {
        // ניצחון — המגרש החזיר `pitch:result`, ורק ניצחון מביא גביע
        when: { flagIs: { flag: 'pitch:result', value: 'won' } },
        lines: [{ who: null, text: 'גביע פלסטיק, קטן ממה שחשבתם, עם שריטה בצד. מישהו כבר כתב עליו את השנה בטוש.' }, ...AFTER_LINES],
        choices: afterChoices(true),
      },
      {
        lines: [{ who: null, text: 'בלי גביע. שולחן פלסטיק מחוץ לקיוסק, ומישהו כבר הזמין לכולם.' }, ...AFTER_LINES],
        choices: afterChoices(false),
      },
    ],
  },
  {
    id: 'y-close',
    nameHe: null,
    branches: [
      {
        when: { all: [{ flagIs: { flag: 'y:afterKind', value: 'photo' } }, { flag: TEAM_CUP }] },
        lines: [{ who: null, text: 'הגביע נשאר אצל אפי. התמונה נשארה אצלך.' }],
        then: [{ e: 'ending', id: 'cup' }],
      },
      {
        when: { flagIs: { flag: 'y:afterKind', value: 'repair' } },
        lines: [{ who: null, text: 'השולחן התרוקן. אתה ואופיר נשארתם עוד קצת.' }],
        then: [{ e: 'ending', id: 'repair' }],
      },
      {
        when: { flagIs: { flag: 'y:afterKind', value: 'goal' } },
        lines: [{ who: null, text: 'עמית קיפל את הדף עם היעד וטען שזה לא נחשב עד שכותבים תאריך.' }],
        then: [{ e: 'ending', id: 'goal' }],
      },
      {
        lines: [{ who: null, text: 'התמונה יצאה עם מישהו עם עיניים עצומות. השארתם אותה ככה.' }],
        then: [{ e: 'ending', id: 'photo' }],
      },
    ],
  },
]
