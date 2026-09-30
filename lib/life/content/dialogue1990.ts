import type { Conversation } from './script'

/**
 * מה שאומרים על יבנה — הנושא שכל הראיות של היום הזה נושאות.
 *
 * לא "מה קרה ביבנה". **המשחק לא יודע מה קרה ביבנה** — השורה בארכיון נושאת תוצאה `null`
 * בוודאות 1, וזו כל הנקודה של הפרק. מה שכן קיים הוא מה ש**אנשים אומרים**, ולכן הראיות
 * כאן הן על הדיבור ועל מי אמר אותו: עמית ששמע ממישהו ששמע, רפי שיש לו סברה, והרדיו
 * שמקריא רשימת מגרשים ומאחר. ילד שבודק שמועה בשני מקורות ואז כותב **מי אמר מה** עשה
 * בדיוק את מה שעיתונאי עושה, בגיל שתים־עשרה, בלי מילה אחת שהארכיון לא מחזיק.
 */
const YAVNE_TALK = 'מה שאומרים על יבנה'

/**
 * 1990 — what people say, and what they will not.
 *
 * The rule of `dialogue.ts` — no date, no opponent, no score, no scorer, no attendance in
 * an authored line — is kept, and it bites harder here because the whole day is people
 * doing arithmetic out loud. They do it in WORDS: "the same points, the same difference,
 * they scored more". Every number the archive holds is read off the anchor by the match
 * director at runtime; every number the archive does not hold is a rumour, and the log
 * records it as one.
 *
 * The other rule of this chapter is the brief's: never `+5 KNOWLEDGE`. A child who
 * worked out the race carefully has an easier afternoon at the radio; a child who said
 * "let them score six" has a joke waiting for him. Nothing says which was right.
 */

export const CONVERSATIONS_1990: Conversation[] = [
  // ============================================================== the kitchen ======
  {
    id: 'table-1990',
    nameHe: null,
    branches: [
      {
        when: { flag: 'knows:math' },
        lines: [
          { who: null, text: 'העיתון עדיין פתוח על הטבלה. החשבון כבר נעשה — שלך, או שלו.' },
          { who: null, text: 'מה שנשאר זה משחק אחד פה, ומשחק אחד שאף אחד בשולחן הזה לא יראה.' },
        ],
        /**
         * השוליים של העיתון, והדבר היחיד שילד בן שתים־עשרה באמת יכול להחזיק על יבנה.
         *
         * לא תוצאה — **מי אמר מה, ומתי**. שתי הבחירות כאן הן אותה פעולה בשתי רמות של
         * יושר: לכתוב את השמועה כמו שהיא, או לכתוב אותה עם המקורות לידה. שתיהן רושמות
         * `written_account` על אותו נושא, כי שתיהן כתיבה; מה שמבדיל ביניהן הוא שתי
         * הראיות ש-`ACH_VERIFY` סופר, ושהן לא ניתנות להשגה במקרה.
         *
         * ואבא קורא את זה. זה מה שהופך את הפתק לדבר שנכתב ולא לדבר שנחשב.
         */
        choices: [
          {
            id: 'write-checked',
            text: 'לכתוב בשוליים: מי אמר, מה אמר, ומאיפה.',
            when: { all: [{ flag: 'net:checked-amit' }, { flag: 'knows:radio' }], none: [{ flag: 'net:wrote' }] },
            hidden: true,
            then: [
              { e: 'flag', flag: 'net:wrote' },
              { e: 'time', minutes: 10 },
              { e: 'proof', kind: 'written_account', proofId: 'written_account:{chapter}:yavne', subjectHe: YAVNE_TALK, noteHe: 'שלוש שורות בשוליים: עמית, רפי, הרדיו — ומה כל אחד מהם באמת אמר.' },
              { e: 'skill', skill: 'communication', delta: 3, why: 'כתב מה שנאמר, עם מי שאמר' },
              { e: 'personality', key: 'honesty', delta: 2 },
              { e: 'rel', who: 'kobi', axis: 'trust', delta: 4 },
              { e: 'toast', text: 'אבא קרא את זה מהצד, הפוך, ולא אמר כלום. אחר כך ראית שהוא לא מחק.', tone: 'plain' },
            ],
          },
          {
            id: 'write-heard',
            text: 'לכתוב בשוליים את מה ששמעת.',
            when: { none: [{ flag: 'net:wrote' }] },
            hidden: true,
            then: [
              { e: 'flag', flag: 'net:wrote' },
              { e: 'time', minutes: 5 },
              { e: 'proof', kind: 'written_account', proofId: 'written_account:{chapter}:yavne', subjectHe: YAVNE_TALK, noteHe: 'שורה אחת: "יבנה מובילים". בלי מי אמר.' },
              { e: 'skill', skill: 'communication', delta: 1, why: 'כתב מה ששמע' },
              { e: 'toast', text: 'כתבת את זה כאילו זה נכון. ככה זה נראה בשוליים של עיתון.', tone: 'plain' },
            ],
          },
          { id: 'leave', text: 'להשאיר את הטבלה בשקט.', then: [] },
        ],
      },
      {
        lines: [
          { who: null, text: 'העיתון פתוח על הטבלה מאתמול בלילה. שתי שורות מסומנות בעיפרון: שלנו, ושל יבנה.' },
          { who: null, text: 'אותן נקודות. אותו הפרש. ליד השורה שלהם אבא כתב מספר קטן, עיגל אותו פעמיים, ולא מחק.' },
        ],
        choices: [
          {
            id: 'careful',
            text: 'לקרוא את כל הטבלה. לאט.',
            then: [
              { e: 'time', minutes: 10 },
              { e: 'flag', flag: 'knows:math' },
              { e: 'flag', flag: 'math:careful' },
              { e: 'personality', key: 'curiosity', delta: 6 },
              { e: 'trait', trait: 'knowledge', delta: 5 },
              { e: 'toast', text: 'הבנת: הם כבשו יותר כל העונה. לנצח לא מספיק — וגם המשחק שלהם לא כאן.', tone: 'plain' },
            ],
          },
          {
            id: 'six',
            text: '"שישימו שש וזהו."',
            then: [
              { e: 'flag', flag: 'knows:math' },
              { e: 'flag', flag: 'math:six' },
              { e: 'personality', key: 'impulsiveness', delta: 6 },
              { e: 'redheart', key: 'footballLove', delta: 4 },
              { e: 'toast', text: 'אבא מרים את העיניים מהעיתון, מסתכל עליך רגע, וחוזר לטבלה. לא אומר כלום.', tone: 'plain' },
            ],
          },
          {
            id: 'wrong',
            text: '"אם מנצחים — עולים. נקודה."',
            then: [
              { e: 'flag', flag: 'knows:math' },
              { e: 'flag', flag: 'math:wrong' },
              { e: 'personality', key: 'stubbornness', delta: 5 },
              { e: 'toast', text: 'אבא: "לא בטוח." אתה: "בטוח." הוא לא מתווכח איתך. זה גרוע יותר.', tone: 'plain' },
            ],
          },
          {
            id: 'ask',
            text: 'לשאול את אבא.',
            then: [{ e: 'goto', node: 'kobi-table-1990' }],
          },
        ],
      },
    ],
  },
  {
    id: 'kobi-table-1990',
    nameHe: 'קובי',
    branches: [
      {
        when: { flag: 'kobi:leaving' },
        lines: [{ who: 'קובי', text: 'יוצאים.' }],
        choices: [
          {
            id: 'now',
            text: 'לקום וללכת איתו.',
            then: [
              { e: 'flag', flag: 'went:withKobi' },
              { e: 'flag', flag: 'kobi:left' },
              { e: 'rel', who: 'kobi', axis: 'sharedHistory', delta: 6 },
              { e: 'redheart', key: 'familyTradition', delta: 6 },
              { e: 'time', minutes: 30 },
              { e: 'toast', text: 'יצאתם ביחד. הוא לא החזיק לך את היד, וגם לא הלך לפניך.', tone: 'plain' },
              { e: 'travel', to: 'bloomfield-outside', spawn: 'fromRoute' },
            ],
          },
          {
            id: 'five',
            text: '"חמש דקות."',
            when: { notFlag: 'asked:five' },
            noteHe: 'כבר ביקשת חמש',
            then: [
              { e: 'flag', flag: 'asked:five' },
              { e: 'rel', who: 'kobi', axis: 'tension', delta: 3 },
              { e: 'toast', text: '"חמש. ואני לא סופר עד שש." הוא לא מסתכל על השעון. הוא לא צריך.', tone: 'plain' },
            ],
          },
          {
            id: 'friends',
            text: '"אני בא עם אופיר. שער 7."',
            when: { flag: 'ofir:invited' },
            noteHe: 'אופיר עוד לא הזמין',
            then: [
              { e: 'flag', flag: 'going:friends' },
              { e: 'flag', flag: 'kobi:left' },
              { e: 'personality', key: 'independence', delta: 6 },
              { e: 'rel', who: 'kobi', axis: 'trust', delta: 3 },
              { e: 'toast', text: '"שער 7, ליד העמוד. אל תאחר לי." הדלת נסגרת, ואתה נשאר עם השעון.', tone: 'plain' },
            ],
          },
        ],
      },
      {
        when: { flag: 'knows:math' },
        lines: [
          { who: 'קובי', text: 'יוצאים בשלוש ועשרה. ואל תיעלם לי — היום אני צריך אותך עם הרגליים.' },
          { who: null, text: 'הוא חוזר לעיתון. הטרנזיסטור לידו, כבוי, כמו כלב שמחכה שיפתחו לו את הדלת.' },
        ],
      },
      {
        lines: [
          { who: 'קובי', text: 'תראה. אותן נקודות, אותו הפרש. אצבע פה, אצבע פה.' },
          { who: 'קובי', text: 'הם כבשו יותר מאיתנו כל העונה. אם שנינו ננצח באותה תוצאה — הם עולים, ואנחנו נשארים.' },
          { who: 'קובי', text: 'אז לא מספיק לנצח. צריך לנצח יותר בגדול מהם, והם משחקים דרומה מכאן באותה שעה בדיוק.' },
          { who: 'פוגי', text: 'אז איך נדע?' },
          { who: 'קובי', text: 'הקופסה הזאת שומעת חצי מילה. תלך, תעמוד ליד רדיו של מישהו אחר, ותחזור להגיד לי.' },
          { who: null, text: 'הוא מקיש באצבע על הטרנזיסטור. אחר כך על החזה שלך.' },
        ],
        then: [
          { e: 'time', minutes: 8 },
          { e: 'flag', flag: 'knows:math' },
          { e: 'flag', flag: 'math:kobi' },
          { e: 'flag', flag: 'knows:radio' },
          { e: 'rel', who: 'kobi', axis: 'familiarity', delta: 5 },
          { e: 'redheart', key: 'familyTradition', delta: 5 },
        ],
      },
    ],
  },
  {
    id: 'radio-table-1990',
    branches: [
      {
        when: { flag: 'knows:radio' },
        lines: [
          { who: null, text: 'הטרנזיסטור. האנטנה מכופפת מהפעם שנפל בשנה שעברה, וקשורה בגומייה.' },
          { who: 'קובי', text: 'הוא בא איתי. את מה שקורה אצלנו הוא שומע טוב. את מה שקורה שם — באיחור.' },
        ],
      },
      {
        lines: [
          { who: null, text: 'טרנזיסטור קטן ושחור, חם מהחלון. אתה מסובב את הכפתור לאט, כמו שראית אותו עושה.' },
          { who: null, text: 'רעש. קול. רעש. מישהו אומר "מחזור אחרון", ואחריו מקריאים רשימה של מגרשים ואחד מהם הוא יבנה.' },
          { who: 'קובי', text: 'עזוב אותו. בארבע הוא יתחיל לדבר, וגם אז לא על הכול.' },
        ],
        then: [
          { e: 'flag', flag: 'knows:radio' },
          { e: 'personality', key: 'curiosity', delta: 3 },
          /**
           * המקור השני, והוא לא אומר יותר — הוא אומר **פחות, ובידיעה**.
           *
           * הרשימה מקריאה מגרשים ולא תוצאות, וזה בדיוק מה שנרשם: לא "מה קורה ביבנה",
           * אלא "מה השמיע הרדיו בשעה הזאת". שתי הראיות על אותו נושא הן ההבדל בין ילד
           * שמעביר שמועה לילד שיודע מאיפה היא הגיעה.
           */
          { e: 'proof', kind: 'verified_report', proofId: 'verified_report:{chapter}:radio', subjectHe: YAVNE_TALK, noteHe: 'הרדיו הקריא מגרשים ולא תוצאות. בשעה הזאת הוא לא יודע יותר מזה.' },
        ],
      },
    ],
  },
  {
    id: 'rachel-1990',
    nameHe: 'רחל',
    branches: [
      // In through the gate after the whistle: he saw the pitch full of people and not
      // one minute of football, and found his father in it. The ending is "late".
      {
        when: { all: [{ flag: 'found:kobi' }, { flag: 'entry:late' }] },
        lines: [
          { who: 'רחל', text: 'נו?' },
          { who: 'קובי', text: 'עלינו. הוא הגיע בדיוק לחלק שכולם רצים בו.' },
          { who: 'רחל', text: 'העיקר שחזרתם ביחד. נעליים בחוץ.' },
        ],
        then: [{ e: 'flag', flag: 'walked:home' }, { e: 'keep' }, { e: 'ending', id: 'late' }],
      },
      /**
       * הטלפון מתחת ליציע (B1 S4, 27.9.2026) — a boy who called home before the radio did
       * does not get asked "נו?". She already knows, and she knows who told her first.
       */
      {
        when: { flag: 'found:kobi', flagIs: { flag: 'life:1990:called', value: 'first' }, none: [{ flag: 'entry:late' }] },
        lines: [
          { who: 'רחל', text: 'אני יודעת. אתה אמרת לי.' },
          { who: null, text: 'היא לא אומרת "נו". היא מסתכלת על קובי, ואחר כך עליך, כמו שמסתכלים על מי שהביא את החדשות הביתה.' },
          { who: 'רחל', text: 'הרדיו אמר את זה עשר דקות אחריך. נעליים בחוץ.' },
        ],
        then: [{ e: 'rel', who: 'rachel', axis: 'trust', delta: 3 }, { e: 'flag', flag: 'walked:home' }, { e: 'keep' }, { e: 'ending', id: 'home' }],
      },
      {
        when: { flag: 'found:kobi' },
        lines: [
          { who: 'רחל', text: 'נו?', closeUp: 'cuRachelNu' },
          { who: null, text: 'שניכם, ביחד:' },
          { who: 'פוגי', text: 'עלינו.' },
          { who: 'רחל', text: 'יופי. נעליים בחוץ.' },
          { who: null, text: 'יום היסטורי. אמא רגילה.' },
        ],
        then: [{ e: 'flag', flag: 'walked:home' }, { e: 'keep' }, { e: 'ending', id: 'home' }],
      },
      {
        when: { all: [{ flag: 'match:over' }, { notFlag: 'entry:granted' }] },
        lines: [
          { who: 'רחל', text: 'לא הלכת?' },
          { who: 'פוגי', text: 'הלכתי. לא נכנסתי.' },
          { who: 'רחל', text: 'אבא יחזור צרוד. תמלא לו כוס מים ותשים ליד המיטה.' },
        ],
        then: [{ e: 'keep' }, { e: 'ending', id: 'missed' }],
      },
      {
        when: { flag: 'got:pocket' },
        lines: [
          { who: 'רחל', text: 'שיעורים יש מחר. אני לא שוכחת.' },
          { who: 'רחל', text: 'ואם אתה מתחיל לקנות שם דברים — אל תבוא אחר כך לבכות שחסר לך.' },
        ],
      },
      {
        lines: [
          { who: 'רחל', text: 'שניכם עוד פה?' },
          { who: null, text: 'היא עוברת מאחוריך עם סל כביסה על הירך, ומניחה משהו על השולחן בלי להסתכל.' },
          { who: 'רחל', text: 'קח. אם תרעב שם, שיהיה. ותחזור עם אבא, לא לבד.' },
        ],
        then: [
          { e: 'flag', flag: 'got:pocket' },
          { e: 'money', agorot: 3200, why: 'מאמא' },
          { e: 'give', item: 'pocket-money' },
          { e: 'rel', who: 'rachel', axis: 'trust', delta: 4 },
          { e: 'toast', text: 'שטר, מקופל לארבע', tone: 'red' },
        ],
      },
    ],
  },

  // ============================================================== the flat ========
  {
    id: 'phone-1990',
    branches: [
      {
        when: { flag: 'ofir:invited' },
        lines: [{ who: null, text: 'הטלפון שקט. אופיר אמר קיוסק, ואופיר לא מתקשר פעמיים.' }],
      },
      {
        when: { notFlag: 'kobi:left' },
        lines: [
          { who: null, text: 'הטלפון מצלצל בדיוק כשאתה עובר לידו, כאילו חיכה שתעבור.' },
          { who: 'אופיר', text: 'פוגי? קיוסק, בשלוש. עמית מביא כסף, אני מביא את הראש.' },
          { who: 'פוגי', text: 'אבא לוקח אותי.' },
          { who: 'אופיר', text: 'אבא לוקח אותך. יופי. גם אותנו לוקחים — הרגליים.' },
          { who: null, text: 'הוא מנתק. הוא תמיד מנתק ראשון.' },
        ],
        then: [
          { e: 'flag', flag: 'ofir:invited' },
          { e: 'bond', who: 'ofir', delta: 3 },
        ],
      },
      {
        lines: [{ who: null, text: 'הטלפון שותק. בשעה הזאת כבר כולם ברחוב.' }],
      },
    ],
  },
  {
    id: 'photo-1990',
    branches: [
      {
        lines: [
          { who: null, text: 'התמונה על המזנון. אתה בן חמש, על הכתפיים של מישהו, ורואה בעיקר ראשים.' },
          { who: null, text: 'היום אתה רואה מעל רוב הראשים. לא מעל של אבא.' },
        ],
        then: [{ e: 'redheart', key: 'historyMemory', delta: 3 }],
      },
    ],
  },
  {
    id: 'bed-1990',
    branches: [
      {
        lines: [
          { who: null, text: 'המיטה. הפוסטר מעליה החליף ידיים לפני שנה, והפינות שלו כבר מתקלפות מהלחות.' },
        ],
      },
    ],
  },
  {
    id: 'drawer-1990',
    branches: [
      {
        when: { hasItem: 'scarf' },
        lines: [{ who: null, text: 'המגירה ריקה. הצעיף כבר על הצוואר שלך, בחום הזה.' }],
      },
      {
        lines: [
          { who: null, text: 'הצעיף. אדום, דהוי בקצוות, עם ריח של ארון. מישהו שם לך אותו על הצוואר לפני ארבע שנים ולא ביקש בחזרה.' },
        ],
        choices: [
          {
            id: 'take',
            text: 'לקחת.',
            then: [
              { e: 'give', item: 'scarf' },
              { e: 'redheart', key: 'terraceCulture', delta: 4 },
              { e: 'toast', text: 'הצעיף', tone: 'red' },
            ],
          },
          { id: 'leave', text: 'להשאיר אותו. חם מדי היום.', then: [{ e: 'personality', key: 'independence', delta: 2 }] },
        ],
      },
    ],
  },

  // ============================================================== the street =====
  {
    id: 'ofir-1990',
    nameHe: 'אופיר',
    branches: [
      {
        when: { flag: 'went:withFriends' },
        lines: [{ who: 'אופיר', text: 'נו, זזים. הרגליים לא הולכות לבד.' }],
      },
      {
        when: { flag: 'going:friends' },
        lines: [
          { who: 'אופיר', text: 'אמרת לאבא שלך? יופי. אז הוא לא יחפש אותך בין הראשים כל המשחק.' },
          { who: 'אופיר', text: 'עמית — הכסף.' },
          { who: 'עמית', text: 'יש. ספרתי שלוש פעמים.' },
          { who: 'אופיר', text: 'טעה שלוש פעמים, בקיצור. יאללה, זזים.' },
        ],
        then: [
          { e: 'flag', flag: 'went:withFriends' },
          { e: 'bond', who: 'ofir', delta: 8 },
          { e: 'bond', who: 'amit', delta: 5 },
          { e: 'personality', key: 'sociability', delta: 5 },
          { e: 'time', minutes: 25 },
          { e: 'travel', to: 'route', spawn: 'fromStreet' },
        ],
      },
      {
        when: { flag: 'ofir:invited' },
        lines: [
          { who: 'אופיר', text: 'נו? עם אבא או עם בני אדם?' },
        ],
        choices: [
          {
            id: 'friends',
            text: '"איתכם."',
            then: [
              { e: 'flag', flag: 'going:friends' },
              { e: 'toast', text: 'אופיר מהנהן כאילו ידע מראש. הוא תמיד "ידע מראש".', tone: 'plain' },
            ],
          },
          {
            id: 'dad',
            text: '"עם אבא. נתראה בשער 7."',
            then: [
              { e: 'bond', who: 'ofir', delta: -2 },
              { e: 'rel', who: 'ofir', axis: 'distance', delta: 3 },
              { e: 'toast', text: '"שער 7. כמו תמיד." הוא לא נפגע. אתה לא בטוח בזה.', tone: 'plain' },
            ],
          },
        ],
      },
      {
        lines: [
          { who: 'אופיר', text: 'פוגי. כמה צריך היום?' },
          { who: 'פוגי', text: 'תלוי ביבנה.' },
          { who: 'אופיר', text: 'הכול תלוי ביבנה. אני שונא את יבנה. לא הייתי שם בחיים.' },
        ],
        then: [{ e: 'bond', who: 'ofir', delta: 2 }],
      },
    ],
  },
  {
    id: 'amit-1990',
    nameHe: 'עמית',
    branches: [
      {
        lines: [
          { who: null, text: 'עמית מחשב בקול. הוא טועה בכל שורה, ובטוח בכל שורה.' },
          { who: 'עמית', text: 'שמעתי שביבנה כבר מובילים. אז אנחנו צריכים שניים. או שלושה. תלוי.' },
          { who: 'אופיר', text: 'מובילים? עוד לא התחיל שם כלום. שמעת ממי?' },
          { who: 'עמית', text: 'ממישהו ששמע. זה מהרדיו, זה לא סתם דיבורים.' },
        ],
        then: [
          { e: 'wellbeing', key: 'happiness', delta: 4 },
          { e: 'bond', who: 'amit', delta: 2 },
          // a scrap for the note at half-time (`content/noteBoards.ts`)
          { e: 'flag', flag: 'net:src:amit' },
        ],
        /**
         * *"שמעת ממי?"* — אופיר שואל את זה, ואף אחד לא עונה. הבחירה הזאת היא מי שכן.
         *
         * היא לא מפריכה ולא מאשרת: היא **מתעדת מקור**. עמית נשאר בטוח, והילד יודע עכשיו
         * דבר אחד יותר ממה שידע — לא על יבנה, על המשפט. זו הראיה הראשונה מתוך שתיים
         * ש-`ACH_VERIFY` מבקש, והשנייה יושבת על הטרנזיסטור במטבח.
         */
        choices: [
          {
            id: 'source',
            text: '"ממי בדיוק? מי שמע, ומתי?"',
            when: { none: [{ flag: 'net:checked-amit' }] },
            noteHe: 'כבר שאלת אותו.',
            then: [
              { e: 'flag', flag: 'net:checked-amit' },
              { e: 'time', minutes: 5 },
              { e: 'proof', kind: 'verified_report', proofId: 'verified_report:{chapter}:amit', subjectHe: YAVNE_TALK, noteHe: 'עמית: "ממישהו ששמע." בלי שם, בלי שעה.' },
              { e: 'skill', skill: 'knowledge', delta: 2, why: 'ביקש מקור' },
              { e: 'personality', key: 'curiosity', delta: 2 },
              { e: 'toast', text: '"ממישהו." הוא אמר את זה באותו ביטחון. עכשיו אתה יודע כמה שווה הביטחון הזה.', tone: 'plain' },
            ],
          },
          { id: 'let', text: 'לתת לו לספור.', then: [] },
        ],
      },
    ],
  },
  {
    id: 'kiosk-man-1990',
    nameHe: 'רפי מהקיוסק',
    branches: [
      {
        when: { hasItem: 'newspaper' },
        lines: [
          { who: 'רפי מהקיוסק', text: 'קנית עיתון — תקרא עיתון. הטבלה לא זזה מזה שמסתכלים עליה.' },
          { who: 'רפי מהקיוסק', text: 'ואם אתה שואל אותי — יבנה משחקת בבית שלה. ובבית, במחזור אחרון, אף אחד לא מפסיד. תרשום.' },
        ],
        then: [{ e: 'flag', flag: 'net:src:rafi' }],
      },
      {
        when: { minAgorot: 300 },
        lines: [
          { who: 'רפי מהקיוסק', text: 'עיתון? שלושה שקלים. יש בו טבלה, ויש בו עמוד שלם שמסביר למה זה לא פשוט.' },
        ],
        choices: [
          {
            id: 'buy',
            text: 'לקנות עיתון.',
            then: [
              { e: 'money', agorot: -300, why: 'עיתון' },
              { e: 'give', item: 'newspaper' },
              { e: 'flag', flag: 'knows:table' },
              { e: 'trait', trait: 'knowledge', delta: 3 },
              { e: 'toast', text: 'עיתון', tone: 'red' },
            ],
          },
          {
            id: 'snack',
            text: 'משהו לאכול במקום.',
            then: [
              { e: 'money', agorot: -200, why: 'גרעינים' },
              { e: 'flag', flag: 'bought:snack' },
              { e: 'wellbeing', key: 'happiness', delta: 3 },
              { e: 'toast', text: 'שקית גרעינים', tone: 'red' },
            ],
          },
          /**
           * מעטפה, 1990 — the same shekel decision as 1986 and a different album.
           *
           * `packet` resolves the page off the chapter's decade, so the boy who filled
           * 1985/86 opens 1992/93 stickers here without a line of content saying so.
           */
          {
            id: 'packet',
            text: 'מעטפת סופרגול. 2 ₪.',
            when: { minAgorot: 200 },
            noteHe: 'אין לך מספיק',
            then: [{ e: 'packet' }],
          },
          {
            id: 'album',
            text: 'לפתוח את האלבום.',
            when: { flag: 'album:seen' },
            hidden: true,
            then: [{ e: 'album' }],
          },
          { id: 'no', text: 'לא לגעת בכסף של אמא.', then: [{ e: 'personality', key: 'responsibility', delta: 3 }] },
        ],
      },
      {
        lines: [
          { who: 'רפי מהקיוסק', text: 'בלי כסף אין עיתון. בחינם אני נותן לך רק את זה: יבנה משחקת בבית.' },
          { who: null, text: 'החצי הראשון נכון. החצי השני זה מה שכולם אומרים, ולכן זה נשמע כמו מידע.' },
        ],
        then: [{ e: 'flagValue', flag: 'rumor:home', value: true }],
      },
    ],
  },
  {
    // בארי, ארבע שנים אחר כך — Stage A Director's Cut §43: "atrong long-term seed" that
    // must pay off across decades rather than XP. Same fixture from Gate 7 in 1986, the
    // same care in recognising whose son is standing there.
    id: 'veteran-1990',
    nameHe: 'בארי',
    branches: [
      {
        when: { flag: 'knows:pillar' },
        lines: [{ who: 'בארי', text: 'ליד העמוד, כמו שאמרתי. ותגיד לו שמישל שאל עליו.' }],
      },
      {
        lines: [
          { who: null, text: 'אדם עם צעיף ביד, לא על הצוואר. חם מדי בשביל ללבוש אותו, ואי אפשר לבוא בלעדיו.' },
          { who: 'בארי', text: 'אתה הבן של קובי. אתם בשער 7, ליד העמוד השני. כמו תמיד.' },
          { who: 'בארי', text: 'ואם תאבד אותו בהפסקה — הגדר בין שער 5 לשער 7. שם כולם נפגשים, שם מוצאים אנשים.' },
        ],
        then: [
          { e: 'flag', flag: 'knows:pillar' },
          { e: 'rel', who: 'barry', axis: 'sharedHistory', delta: 6 },
          { e: 'remember', who: 'barry', eventId: 'recognized-kobis-son-1990', significance: 'notable' },
          { e: 'redheart', key: 'community', delta: 5 },
          { e: 'redheart', key: 'terraceCulture', delta: 3 },
        ],
      },
    ],
  },
  {
    id: 'poster-1990',
    branches: [
      {
        lines: [
          { who: null, text: 'מודעה על העמוד, מודבקת מעל מודעה מעל מודעה. "מחזור אחרון". מישהו כתב עליה בטוש: כולם.' },
        ],
        then: [{ e: 'redheart', key: 'terraceCulture', delta: 2 }],
      },
    ],
  },

  // ============================================================== the road ========
  {
    id: 'radio-walker-1990',
    nameHe: 'אוהד עם רדיו',
    branches: [
      {
        lines: [
          { who: null, text: 'אדם הולך עם טרנזיסטור צמוד לאוזן. הוא לא מגביר אותו. מי שרוצה לשמוע מצמיד את הראש.' },
          { who: 'אוהד עם רדיו', text: 'עוד לא התחיל כלום, לא פה ולא שם. בארבע. תלך אחרי האדומים, ילד.' },
        ],
        then: [{ e: 'flag', flag: 'saw:radio-walker' }],
      },
    ],
  },
  {
    id: 'route-stream-1990',
    branches: [
      {
        lines: [
          { who: null, text: 'יותר אדום מכל שבת, ולכל שלישי יש טרנזיסטור ביד. אנשים שלא באים בדרך כלל באים היום.' },
        ],
      },
    ],
  },

  // ============================================================== the ground ======
  {
    id: 'kobi-gate-1990',
    nameHe: 'קובי',
    branches: [
      {
        when: { flag: 'entry:granted' },
        lines: [{ who: 'קובי', text: 'פנימה. שער 7, ליד העמוד. אני אחריך.' }],
      },
      /**
       * מה ששמעת מתחת ליציע (`uc-radio-1990`, 27.9.2026) — the boy brings it to the gate before
       * his father says a word, and his father already knew it. Then the ordinary meeting.
       */
      {
        when: { flag: 'uc:carry', none: [{ flag: 'uc:told' }] },
        lines: [
          { who: 'פוגי', text: 'אבא, מתחת ליציע אומרים שבמחצית פותחים את השערים.' },
          { who: 'קובי', text: 'אומרים. אני אמרתי את זה לאיש עם הטרנזיסטור לפני עשרים שנה.' },
          { who: 'קובי', text: 'וטוב שבאת אליי עם זה, ולא לכל השער. רוב האנשים פה רק מעבירים הלאה.' },
        ],
        then: [{ e: 'flag', flag: 'uc:told' }, { e: 'rel', who: 'kobi', axis: 'sharedHistory', delta: 2 }, { e: 'goto', node: 'kobi-gate-1990' }],
      },
      {
        lines: [
          { who: 'קובי', text: 'הנה אתה.' },
          { who: null, text: 'הוא מוציא שני כרטיסים מכיס החולצה. הוציא אותם משם כבר שלוש פעמים היום, רק לבדוק.' },
          { who: 'קובי', text: 'תחזיק את שלך בכיס. אם נתפזר — שער 7, העמוד השני. ואם אני קורא לך, זה בגלל יבנה.' },
        ],
        then: [
          { e: 'flag', flag: 'entry:granted' },
          { e: 'flag', flag: 'entry:kobi' },
          { e: 'flag', flag: 'knows:pillar' },
          { e: 'give', item: 'ticket-stub' },
          { e: 'rel', who: 'kobi', axis: 'trust', delta: 4 },
          { e: 'toast', text: 'כרטיס', tone: 'red' },
        ],
      },
    ],
  },
  {
    id: 'steward-1990',
    nameHe: 'סדרן',
    branches: [
      {
        when: { flag: 'entry:granted' },
        lines: [{ who: 'סדרן', text: 'קדימה, פנימה, לא לעצור בקרוסלה. אחריך יש עוד אלף.' }],
      },
      // (27.9.2026) the boy who heard it under the stand (`uc-radio-1990`) was standing here first
      {
        when: { all: [{ afterMinute: 16 * 60 + 48 }, { flag: 'uc:half' }] },
        lines: [
          { who: 'סדרן', text: 'מחצית. פותחים. תיכנס, רק לא בריצה.' },
          { who: null, text: 'ידעת. עמדת פה עוד לפני שהסדרן הוציא את המפתח — ראשון בתור, מול עשרים ילדים ששמעו את זה ממך.' },
        ],
        then: [
          { e: 'flag', flag: 'entry:granted' },
          { e: 'flag', flag: 'entry:half' },
          { e: 'personality', key: 'streetSmarts', delta: 2 },
          { e: 'toast', text: 'המחצית. נכנסים — ראשון.', tone: 'red' },
        ],
      },
      // The old mercy of Israeli grounds: at half-time the gates open and whoever is
      // still outside walks in for the second half. A boy with no ticket, no father at
      // the gate and no friends inside is not stuck — he is early for the half.
      {
        when: { afterMinute: 16 * 60 + 48 },
        lines: [
          { who: 'סדרן', text: 'מחצית. פותחים. תיכנס, רק לא בריצה.' },
          { who: null, text: 'הקרוסלה מסתובבת בלי כרטיס. מאחוריך עוד עשרים ילדים שעמדו פה בשביל הרגע הזה.' },
        ],
        then: [
          { e: 'flag', flag: 'entry:granted' },
          { e: 'flag', flag: 'entry:half' },
          { e: 'toast', text: 'המחצית. נכנסים.', tone: 'red' },
        ],
      },
      {
        when: { flag: 'went:withKobi' },
        lines: [{ who: 'סדרן', text: 'הבן של קובי? הוא עומד לך ליד הקופה כבר עשר דקות. תמיד אותו דבר, אתם.' }],
      },
      {
        lines: [
          { who: 'סדרן', text: 'כרטיס. אין כרטיס — אין שער. היום בטח שלא.' },
          { who: null, text: 'הוא לא רשע. היום פשוט יש יותר אנשים ממקומות, וזה לא הוא שסופר.' },
        ],
      },
    ],
  },
  {
    id: 'ticket-window-1990',
    nameHe: 'הקופאי',
    branches: [
      {
        when: { flag: 'entry:granted' },
        lines: [{ who: 'הקופאי', text: 'יש לך כרטיס. לך, אתה מעכב.' }],
      },
      {
        when: { minAgorot: 3000 },
        lines: [
          { who: 'הקופאי', text: 'ילד — שלושים. היום זה המחיר.' },
          { who: null, text: 'השטר של אמא, מקופל לארבע. אתה פותח אותו לאט, כאילו זה ישנה משהו במחיר.' },
        ],
        then: [
          { e: 'money', agorot: -3000, why: 'כרטיס' },
          { e: 'take', item: 'pocket-money' },
          { e: 'give', item: 'ticket-stub' },
          { e: 'flag', flag: 'entry:granted' },
          { e: 'flag', flag: 'entry:ticket' },
          { e: 'personality', key: 'independence', delta: 5 },
          { e: 'toast', text: 'כרטיס', tone: 'red' },
        ],
      },
      {
        lines: [
          { who: 'הקופאי', text: 'שלושים לילד. היום.' },
          { who: null, text: 'אתה סופר שוב, בכיס, בלי להוציא את היד. זה לא נהיה יותר.' },
        ],
      },
    ],
  },
  {
    id: 'ofir-ground-1990',
    nameHe: 'אופיר',
    branches: [
      {
        when: { flag: 'entry:granted' },
        lines: [{ who: 'אופיר', text: 'תיכנס. אנחנו למעלה בשער 7, איפה שכל מי שיש לו רדיו עומד.' }],
      },
      {
        when: { flag: 'went:withFriends' },
        lines: [
          { who: 'אופיר', text: 'עמית שילם על שלושה כרטיסים. אל תשאל מאיפה.' },
          { who: 'עמית', text: 'מהחיסכון.' },
          { who: 'אופיר', text: 'אמרתי אל תשאל.' },
        ],
        then: [
          { e: 'flag', flag: 'entry:granted' },
          { e: 'flag', flag: 'entry:friends' },
          { e: 'give', item: 'ticket-stub' },
          { e: 'bond', who: 'amit', delta: 8 },
          { e: 'toast', text: 'אתה נכנס', tone: 'red' },
        ],
      },
      {
        lines: [
          { who: 'אופיר', text: 'אתה לבד? איפה אבא שלך?' },
          { who: 'פוגי', text: 'בפנים.' },
          { who: 'אופיר', text: 'אז תסתדר ותיכנס. אתה כבר לא בן שמונה.' },
          { who: null, text: 'הוא לא מציע כלום. זו לא רשעות. זה 1990.' },
        ],
        then: [{ e: 'rel', who: 'ofir', axis: 'distance', delta: 2 }],
      },
    ],
  },
  {
    id: 'vendor-1990',
    nameHe: 'מוכר',
    branches: [
      {
        when: { minAgorot: 200 },
        lines: [{ who: 'מוכר', text: 'גרעינים — שניים. גזוז נגמר. רדיו אין לי — יש למי שעומד למעלה. תעמוד לידו ותשמע.' }],
        choices: [
          {
            id: 'seeds',
            text: 'גרעינים.',
            then: [
              { e: 'money', agorot: -200, why: 'גרעינים' },
              { e: 'flag', flag: 'bought:snack' },
              { e: 'wellbeing', key: 'happiness', delta: 3 },
              { e: 'toast', text: 'שקית גרעינים', tone: 'red' },
            ],
          },
          { id: 'no', text: 'לא עכשיו.', then: [] },
        ],
      },
      {
        lines: [{ who: 'מוכר', text: 'בלי כסף, בלי גרעינים. הרעש פה חינם, וממנו יש היום הרבה.' }],
      },
    ],
  },

  // ============================================================== after ==========
  {
    id: 'kobi-found-1990',
    nameHe: 'קובי',
    branches: [
      {
        when: { flag: 'found:kobi' },
        lines: [{ who: 'קובי', text: 'הביתה. ברגל, שנינו. אמא מחכה.' }],
      },
      {
        lines: [
          { who: 'פוגי', text: 'איפה היית?!', closeUp: 'cuKobiWhere' },
          { who: 'קובי', text: 'אני?! איפה אתה היית?!' },
          { who: 'פוגי', text: 'עלינו!' },
          { who: 'קובי', text: 'אני יודע!' },
          { who: null, text: 'חיבוק קצר, בתוך הרעש. לא יותר מזה. לא צריך יותר מזה.' },
        ],
        then: [
          { e: 'flag', flag: 'found:kobi' },
          { e: 'rel', who: 'kobi', axis: 'sharedHistory', delta: 12 },
          { e: 'rel', who: 'kobi', axis: 'bond', delta: 8 },
          { e: 'redheart', key: 'familyTradition', delta: 10 },
          { e: 'remember', who: 'kobi', eventId: '1990-found', significance: 'major' },
          { e: 'toast', text: 'הביתה. ברגל, ביחד.', tone: 'red' },
        ],
      },
    ],
  },

  // ======================================================= under the stand ========
  /**
   * מתחת ליציע (27.9.2026, `undercroft`, `world/city2027/stadiumSide.ts`) — the approach under
   * the stand before the whistle, one door along the forecourt from gate seven. B1 S2: "the
   * surroundings; every check costs minutes". Three small things and one of them is the chapter's
   * own subject — a rumour, and what a twelve-year-old does with it. The rumour is the one fact
   * this afternoon already holds (the steward opens the gates at half-time, `steward-1990`), so
   * nothing here says a word about Yavne or a number: it is information about the GROUND.
   */
  {
    id: 'uc-radio-1990',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'ליד העמוד השלישי, איש עם טרנזיסטור צמוד לאוזן, ושלושה ילדים סביבו כמו סביב מדורה.' },
          { who: 'אוהד עם רדיו', text: 'היום במחצית פותחים. תמיד כשמלא — פותחים. מי שבחוץ, נכנס לחצי השני.' },
          { who: null, text: 'אחד הילדים כבר רץ לספר למישהו.' },
        ],
        choices: [
          {
            id: 'ask',
            text: '(לשאול מאיפה הוא יודע.)',
            then: [
              { e: 'flag', flag: 'uc:heard' },
              { e: 'flag', flag: 'uc:half' },
              { e: 'flagValue', flag: 'life:1990:undercroft', value: 'asked' },
              { e: 'time', minutes: 6 },
              { e: 'personality', key: 'curiosity', delta: 2 },
              { e: 'toast', text: '"ארבעים שנה אני עומד פה. תשאל את הסדרן — אבל אחרי שהוא פותח."', tone: 'plain' },
            ],
          },
          {
            id: 'carry',
            text: '(לרוץ לספר לאבא, בשער 7.)',
            then: [
              { e: 'flag', flag: 'uc:heard' },
              { e: 'flag', flag: 'uc:half' },
              { e: 'flag', flag: 'uc:carry' },
              { e: 'flagValue', flag: 'life:1990:undercroft', value: 'carried' },
              { e: 'toast', text: 'שני ילדים כבר רצים לפניך עם אותה ידיעה. השמועה הולכת מהר יותר ממך.', tone: 'plain' },
            ],
          },
          {
            id: 'doubt',
            text: '(לא להאמין. שמועות.)',
            then: [
              { e: 'flag', flag: 'uc:heard' },
              { e: 'flagValue', flag: 'life:1990:undercroft', value: 'doubted' },
              { e: 'personality', key: 'stubbornness', delta: 1 },
              { e: 'toast', text: 'האיש מחזיר את הטרנזיסטור לאוזן. "תראה בעצמך במחצית."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'uc-cart-1990',
    nameHe: null,
    branches: [
      {
        when: { minAgorot: 200 },
        lines: [{ who: null, text: 'עגלה עם שמשייה, שקי גרעינים ובקבוקי גזוז בקרח שנמס. המוכר לא מסתכל על הכסף — רק על השעון.' }],
        choices: [
          { id: 'seeds', text: '(גרעינים. שניים.)', then: [{ e: 'flag', flag: 'uc:cart' }, { e: 'money', agorot: -200, why: 'גרעינים מתחת ליציע' }, { e: 'flag', flag: 'bought:snack' }, { e: 'wellbeing', key: 'happiness', delta: 2 }, { e: 'toast', text: 'שקית גרעינים, חמה מהשמש.', tone: 'red' }] },
          { id: 'no', text: '(לא עכשיו.)', then: [{ e: 'flag', flag: 'uc:cart' }] },
        ],
      },
      {
        lines: [{ who: null, text: 'עגלה עם שמשייה. אין לך שקל, והמוכר יודע את זה לפני שאתה פותח את הפה.' }],
        then: [{ e: 'flag', flag: 'uc:cart' }],
      },
    ],
  },
  {
    id: 'uc-lanes-1990',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'המעברים בין המעקות ריקים. מספרים צבועים על הבטון, ובסוף כל אחד — קרוסלה נעולה. התור האמיתי בקופה, ובאורך של שלוש קרוסלות.' },
          { who: null, text: 'אתה סופר אותו פעמיים. יותר אנשים מכרטיסים.' },
        ],
        then: [{ e: 'flag', flag: 'uc:lanes' }, { e: 'time', minutes: 5 }],
      },
    ],
  },
  /**
   * ================================================= הפתק · מחצית (B1 S3, 27.9.2026) ===
   *
   * `TransistorNet.halftime()` opens this once. The note itself is a board over the paused
   * ground (`content/noteBoards.ts`, `notebook-1990`): the scraps are only what this boy
   * actually heard today, and the columns are about how he knows, not whether it is true.
   * Not writing is an answer too — the half ends and the numbers stay in his head.
   */
  {
    id: 'net-half-1990',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'מחצית. מסביבך כולם מחשבים בקול, ואף אחד לא מסכים עם אף אחד.' },
          { who: null, text: 'בכיס — השוליים של העיתון מהבוקר, וחצי עיפרון.' },
        ],
        choices: [
          { id: 'write', text: 'לכתוב. מה אני יודע, ומאיפה.', when: { notFlag: 'net:noted' }, noteHe: 'כבר כתבת. הפתק בכיס.', then: [{ e: 'minigame', id: 'board:notebook-1990' }] },
          { id: 'watch', text: 'לא. להסתכל על היציע.', then: [{ e: 'flag', flag: 'net:noted' }, { e: 'toast', text: 'היציע מחשב בשבילך. בקולות שונים, בתוצאות שונות.', tone: 'plain' }] },
        ],
      },
    ],
  },
  {
    id: 'net-note-kobi-1990',
    nameHe: 'קובי',
    branches: [
      {
        when: { flagIs: { flag: 'life:1990:notebook', value: 'clean' } },
        lines: [
          { who: null, text: 'אבא קורא את הפתק מעל הכתף שלך, הפוך, בלי לבקש.' },
          { who: 'קובי', text: 'מי לימד אותך לכתוב ככה?' },
          { who: 'פוגי', text: 'אתה. "תלך, תשמע, ותחזור להגיד לי."' },
          { who: null, text: 'הוא מקפל את הפתק לארבע ושם בכיס החולצה. ואז מושיט לך את הטרנזיסטור.' },
          { who: 'קובי', text: 'חצי שני — אתה על האוזן. אני על הדשא.' },
        ],
        then: [
          { e: 'flag', flag: 'net:handed' },
          { e: 'rel', who: 'kobi', axis: 'trust', delta: 5 },
          { e: 'rel', who: 'kobi', axis: 'familiarity', delta: 2 },
          { e: 'remember', who: 'kobi', eventId: 'the-note-1990', significance: 'notable' },
          { e: 'toast', text: 'הטרנזיסטור אצלך. מה שהוא שומע — אתה שומע ראשון.', tone: 'red' },
        ],
      },
      {
        when: { flagIs: { flag: 'life:1990:notebook', value: 'mostly' } },
        lines: [
          { who: null, text: 'אבא מסתכל על הפתק, ושם אצבע על שורה אחת.' },
          { who: 'קובי', text: 'את זה לא שמעת בעצמך. את זה אמרו לך.' },
          { who: null, text: 'הוא לא מוחק. הוא רק משאיר את האצבע שם עוד שנייה, כדי שתזכור איזו שורה.' },
        ],
        then: [{ e: 'rel', who: 'kobi', axis: 'familiarity', delta: 2 }, { e: 'personality', key: 'curiosity', delta: 1 }],
      },
      {
        when: { flagIs: { flag: 'life:1990:notebook', value: 'mixed' } },
        lines: [
          { who: 'קובי', text: 'הכול פה נכון?' },
          { who: 'פוגי', text: '…כן?' },
          { who: 'קובי', text: 'אז בשביל מה אני סוחב רדיו.' },
        ],
        then: [{ e: 'rel', who: 'kobi', axis: 'tension', delta: 1 }],
      },
      {
        lines: [
          { who: 'קובי', text: 'תגמור את זה בבית. עכשיו תסתכל על הדשא.' },
        ],
      },
    ],
  },
  /**
   * ================================== הטלפון מתחת ליציע · אחרי השריקה (B1 S4) ===
   *
   * The crowd understands before or after him according to where he got his news. The one
   * thing a twelve-year-old can do with being first is tell somebody: an asimon, a payphone
   * on a concrete pillar, and his mother in a kitchen with the other radio station on. Being
   * FIRST is only possible for a boy whose note was honest and whose radio was at his ear;
   * everybody else is told by his mother what the radio already said.
   */
  {
    id: 'uc-phone-1990',
    nameHe: 'רחל',
    remote: { 'רחל': 'phone' },
    branches: [
      {
        when: { flag: 'life:1990:called' },
        lines: [{ who: null, text: 'השפופרת עוד חמה. כבר התקשרת.' }],
      },
      {
        when: { minAgorot: 100, any: [{ flagIs: { flag: 'life:1990:notebook', value: 'clean' } }, { flag: 'net:handed' }, { flag: 'net:toldKobi' }] },
        lines: [
          { who: null, text: 'אסימון, חריץ, צליל. מסביב אנשים רצים לדשא, ואתה עומד עם הגב אליהם ומחכה שיענו.' },
          { who: 'רחל', text: 'הלו?' },
          { who: 'פוגי', text: 'אמא. עלינו.' },
          { who: 'רחל', text: 'ברדיו עוד לא אמרו כלום.' },
          { who: 'פוגי', text: 'יגידו. בדקתי.' },
          { who: null, text: 'שקט בקו. ואז, מהמטבח, הקול של השדר — עולה, אומר את זה, בדיוק מה שאמרת.' },
          { who: 'רחל', text: '…טוב. תביא את אבא הביתה.' },
        ],
        then: [
          { e: 'money', agorot: -100, why: 'אסימון' },
          { e: 'flagValue', flag: 'life:1990:called', value: 'first' },
          { e: 'rel', who: 'rachel', axis: 'trust', delta: 4 },
          { e: 'skill', skill: 'communication', delta: 2, why: 'הביא ידיעה הביתה, ראשון, ובדוקה' },
          { e: 'time', minutes: 8 },
          { e: 'toast', text: 'הפעם הראשונה שסיפרת למישהו משהו לפני הרדיו.', tone: 'red' },
        ],
      },
      {
        when: { minAgorot: 100 },
        lines: [
          { who: null, text: 'אסימון, חריץ, צליל. מסביב אנשים רצים לדשא.' },
          { who: 'רחל', text: 'הלו? — אני יודעת, אני יודעת. הרדיו אמר כבר לפני רבע שעה. אבא איתך?' },
          { who: 'פוגי', text: 'עוד לא מצאתי אותו.' },
          { who: 'רחל', text: 'אז תמצא. ותחזרו ביחד.' },
        ],
        then: [
          { e: 'money', agorot: -100, why: 'אסימון' },
          { e: 'flagValue', flag: 'life:1990:called', value: 'second' },
          { e: 'time', minutes: 6 },
          { e: 'toast', text: 'הרדיו היה מהיר ממך. בפעם הבאה.', tone: 'plain' },
        ],
      },
      {
        lines: [{ who: null, text: 'אין לך אסימון, ואין לך שקל לקנות אחד. הטלפון מאחורי העמוד מחכה למישהו אחר.' }],
      },
    ],
  },
]
