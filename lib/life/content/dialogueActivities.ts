import type { Condition } from '../world/types'
import type { Branch, Conversation } from './script'

/**
 * הפעילויות — the words around the gate games the life opens (21.9.2026).
 *
 * Maor's file asks for one shape and no other: *"פוגי נמצא במקום → מישהו מדבר איתו →
 * קורה משהו טבעי בעולם → המכניקה נפתחת → חוזרים לאותו מקום → העולם מגיב לתוצאה."* So
 * every activity has two conversations here at most, and never a result page:
 *
 *  · the ASK — somebody in the room, a reason, a choice (`{ e: 'mechanic' }` opens the
 *    game over the paused room). Jobs and bets ask through their `GIGS` row instead
 *    (`gigs.ts`), so the refusal "you already worked today" stays in one place.
 *  · the REACTION — `act-<id>-after`, which the room plays when the game closes. Its
 *    branches read `act:<id>:tier` (`high` / `mid` / `low` / `away`, written by
 *    `settleActivity`) and, where the years matter, `act:<id>:era`.
 *
 * The rules every other file in this folder keeps, kept here too: no date, no opponent, no
 * score, no scorer in a line (the game's own board shows the archive's words, the people do
 * not); no opinion graded (Shachor never says which name was right, Kobi never says which
 * eleven was better — rules 24 and 74); nobody praises a number.
 */

const tier = (id: string, value: string): Condition => ({ flagIs: { flag: `act:${id}:tier`, value } })
const era = (id: string, value: string): Condition => ({ flagIs: { flag: `act:${id}:era`, value } })
const done = (id: string): Condition => ({ flag: `act:${id}:done` })

/** the three tiers and the walk-away, in the order a reaction is read */
function reaction(
  id: string,
  nameHe: string | null,
  lines: { away: Branch['lines']; high: Branch['lines']; mid: Branch['lines']; low: Branch['lines'] },
): Conversation {
  return {
    id: `act-${id}-after`,
    nameHe,
    branches: [
      { when: tier(id, 'away'), lines: lines.away },
      { when: tier(id, 'high'), lines: lines.high },
      { when: tier(id, 'mid'), lines: lines.mid },
      { lines: lines.low },
    ],
  }
}

export const CONVERSATIONS_ACTIVITIES: Conversation[] = [
  // ------------------------------------------------------------ הקיוסק — הטוטו ----
  reaction('kiosk-trivia', 'רפי מהקיוסק', {
    away: [{ who: null, text: 'רפי, מאחורי הדלפק: "חצי טופס. גם זה טופס, אני מניח."' }],
    high: [
      { who: null, text: 'רפי, מאחורי הדלפק: "נו, מה אני אגיד. אתה יודע יותר ממני על המועדון שלך."' },
      { who: null, text: 'הוא מקפל את הטופס לשניים ושם אותו מתחת לקופה, כמו משהו ששומרים.' },
    ],
    mid: [{ who: null, text: 'רפי, מאחורי הדלפק: "חצי־חצי. זה מה שיש לרוב האנשים שממלאים פה."' }],
    low: [{ who: null, text: 'רפי, מאחורי הדלפק: "את הפועל אתה אוהב. לדעת — עוד תלמד. כולם לומדים על הדלפק הזה."' }],
  }),

  // ------------------------------------------------------------- הקפה באלנבי -----
  reaction('cafe-shift', 'המלצר', {
    away: [{ who: null, text: 'שולחן ארבע ממשיך להתווכח בלעדיך. המלצר מושיט לך את המטאטא בלי מילה.' }],
    high: [
      { who: null, text: 'שולחן ארבע משתתק. אחד מהם מוציא מטבע, מסתכל עליו, ומניח אותו ליד הכוס שלך.' },
      { who: null, text: 'המלצר מחייך בחצי פה: "תבוא גם בשבוע הבא. עם כזה זיכרון אני לא צריך רדיו."' },
    ],
    mid: [
      { who: null, text: 'חצי שולחן צודק, חצי שולחן כועס. הטיפ קטן, והוויכוח ממשיך בלעדיך.' },
    ],
    low: [
      { who: null, text: 'הם צוחקים, לא עליך בדיוק. "ילד, באותו ערב אתה עוד שיחקת בחול."' },
      { who: null, text: 'המלצר מושיט לך סמרטוט לשולחן הבא. המשמרת היא המשמרת.' },
    ],
  }),

  // --------------------------------------------------------- חנות האוהדים -------
  reaction('shop-order', 'המוכר', {
    away: [{ who: 'המוכר', text: 'לא נורא. אני אגיד לו שיבוא מחר.' }],
    high: [
      { who: 'המוכר', text: 'זאת היא. בדיוק זאת. הוא עוד יחשוב שקנה אותה אז.' },
      { who: null, text: 'הלקוח מחזיק את החולצה לאור ולא אומר כלום, וזה הכי טוב שלקוח יכול להגיד.' },
    ],
    mid: [{ who: 'המוכר', text: 'קרוב. הוא ייקח אותה, אבל הוא ישים לב. לקוחות כאלה תמיד שמים לב.' }],
    low: [{ who: 'המוכר', text: 'זאת לא העונה שלו, חביבי. אני אתקן. תסתכל איך.' }],
  }),

  // ------------------------------------------------------------ התחנה — בארי -----
  {
    id: 'act-busstop-memory',
    nameHe: 'בארי',
    branches: [
      {
        when: done('busstop-memory'),
        lines: [{ who: 'בארי', text: 'מספיק לי ליום אחד. הזיכרון זה כמו רגליים, קטן. גם הוא מתעייף.' }],
      },
      {
        when: { flagIs: { flag: 'act:era', value: '80s' } },
        // `act:era` is the chapter's money era, written when the room is built (`ERA_FLAG`)
        lines: [
          { who: 'בארי', text: 'שב רגע. האוטובוס שלי ממילא מאחר.' },
          { who: 'בארי', text: 'אני אספר לך מה היה פה לפני שנולדת. ואתה תגיד לי מה הולך עם מה.' },
        ],
        choices: [
          { id: 'sit', text: 'לשבת איתו', then: [{ e: 'mechanic', activity: 'busstop-memory' }] },
          { id: 'later', text: 'לא עכשיו.', then: [] },
        ],
      },
      {
        lines: [
          { who: 'בארי', text: 'אני מכיר אותך. הילד מהשער. עכשיו כבר לא ילד.' },
          { who: 'בארי', text: 'בוא נראה מה נשאר לך בראש ממה שראינו. זוג־זוג, כמו פעם.' },
        ],
        choices: [
          { id: 'sit', text: 'לשבת איתו על הספסל', then: [{ e: 'mechanic', activity: 'busstop-memory' }] },
          { id: 'later', text: 'לא עכשיו.', then: [] },
        ],
      },
    ],
  },
  {
    id: 'act-busstop-memory-after',
    nameHe: 'בארי',
    branches: [
      { when: tier('busstop-memory', 'away'), lines: [{ who: 'בארי', text: 'לך, לך. הזיכרונות לא בורחים. רק אני.' }] },
      {
        when: { all: [tier('busstop-memory', 'high'), era('busstop-memory', '80s')] },
        lines: [
          { who: 'בארי', text: 'אתה לא היית שם, ואתה זוכר את זה יותר טוב ממני.' },
          { who: null, text: 'הוא מחייך את החיוך שלו, זה שהוא שומר לשער שבע.' },
        ],
      },
      {
        when: tier('busstop-memory', 'high'),
        lines: [
          { who: 'בארי', text: 'את זה היית צריך להגיד לי אתה, לא אני לך. יופי.' },
          { who: null, text: 'הוא טופח לך על הכתף פעמיים, כמו שטופחים למי שעמד לידך ביציע.' },
        ],
      },
      { when: tier('busstop-memory', 'mid'), lines: [{ who: 'בארי', text: 'חצי מזה אתה זוכר, חצי מזה אני. ביחד יוצא משהו.' }] },
      { lines: [{ who: 'בארי', text: 'הכול מתערבב, אה? גם אצלי. בגלל זה מספרים את זה שוב ושוב.' }] },
    ],
  },

  // ------------------------------------------------------------- המגרש — החבר׳ה -----
  reaction('pitch-rumble', 'החבר׳ה במגרש', {
    away: [{ who: null, text: 'מעל הקלפים: "ברחת? אז אתה קונה."' }],
    high: [
      { who: null, text: 'מעל הקלפים: "לא יכול להיות. הבלם שלך עצר הכול."' },
      { who: null, text: 'הקופה של הארטיקים עוברת אליך, ומי שהפסיד סופר אותה פעמיים כדי להרגיש משהו.' },
    ],
    mid: [{ who: null, text: 'מעל הקלפים: "תיקו. אף אחד לא קונה, ושנינו כועסים. זה הכי הוגן שיש."' }],
    low: [{ who: null, text: 'מעל הקלפים: "ארטיק לימון. ושלא תגיד שלא הזהרתי אותך מהשוער הזה."' }],
  }),

  // -------------------------------------------------------------- החצר — החבר׳ה -----
  reaction('yard-lineup', 'החבר׳ה בחצר', {
    away: [{ who: null, text: 'מהצד השני של הגדר: "ידעתי. אף אחד לא זוכר את זה."' }],
    high: [{ who: null, text: 'מהצד השני של הגדר: "טוב. טוב! אני משלם. אבל אתה מספר לי מאיפה אתה יודע."' }],
    mid: [{ who: null, text: 'מהצד השני של הגדר: "חצי. חצי הימור, חצי כסף. ככה זה אצלנו."' }],
    low: [{ who: null, text: 'מהצד השני של הגדר: "לא ולא. זה היה בעיתון, בגדול, ואתה עדיין לא זוכר."' }],
  }),

  // ------------------------------------------------------------ אוסישקין — שחור -----
  {
    id: 'act-shachor-lesson',
    nameHe: 'שחור',
    branches: [
      { when: done('shachor-lesson'), lines: [{ who: 'שחור', text: 'שיעור אחד ליום. יותר מזה זה כבר שנאה בלי סיבה.' }] },
      {
        lines: [
          { who: null, text: 'שחור יושב על המדרגה, פנקס מקופל על הברך.' },
          { who: 'שחור', text: 'רוצה לדעת את מי שונאים פה, ולמה? לא בשביל לשנוא. בשביל לזכור.' },
        ],
        choices: [
          { id: 'sit', text: 'לשבת לידו', then: [{ e: 'mechanic', activity: 'shachor-lesson' }] },
          { id: 'later', text: 'אחר כך.', then: [] },
        ],
      },
    ],
  },
  reaction('shachor-lesson', 'שחור', {
    away: [{ who: 'שחור', text: 'לא נורא. הם לא הולכים לשום מקום, השמות האלה.' }],
    high: [
      { who: 'שחור', text: 'עברת את כל הקיר. לא אמרתי לך מי צודק, ולא אגיד.' },
      { who: 'שחור', text: 'אבל עכשיו אתה יודע למה האולם הזה צועק מה שהוא צועק.' },
    ],
    mid: [{ who: 'שחור', text: 'חצי קיר. גם זה משהו. את השאר תשמע מהיציע.' }],
    low: [{ who: 'שחור', text: 'לאט. אף אחד לא נולד עם הרשימה הזאת בראש.' }],
  }),

  // ------------------------------------------------------------ אוסישקין — הכיסאות -----
  {
    id: 'act-ussishkin-help-after',
    nameHe: 'שחור',
    branches: [
      {
        when: { all: [tier('ussishkin-help', 'high'), { flagIs: { flag: 'chore:order', value: 'right' } }] },
        lines: [
          { who: null, text: 'שחור, מהפתח: "בסדר הנכון. כיסאות, מים, בד. מי לימד אותך?"' },
          { who: null, text: 'הוא לא מחכה לתשובה. הוא כבר תולה את הקצה השני של הבד.' },
        ],
      },
      { when: tier('ussishkin-help', 'high'), lines: [{ who: null, text: 'שחור, מהפתח: "עשית הכול. בסדר שלך, אבל עשית הכול."' }] },
      { when: tier('ussishkin-help', 'mid'), lines: [{ who: null, text: 'שחור, מהפתח: "עוד חצי שורה והיה מושלם. בפעם הבאה."' }] },
      { lines: [{ who: null, text: 'שחור, מהפתח: "האנשים כבר בפנים והכיסאות עוד בערימה. נסדר ביחד."' }] },
    ],
  },

  // ------------------------------------------------------------ בלומפילד — הפרלמנט -----
  {
    id: 'act-parliament',
    nameHe: 'הפרלמנט ליד הגדר',
    branches: [
      { when: done('parliament'), lines: [{ who: null, text: 'ליד הגדר עוד מתווכחים — {crowd1} ו{crowd2}, על אותו שער, באותה עוצמה.' }] },
      {
        lines: [
          { who: null, text: 'ליד הגדר עומדת קבוצה קטנה: {crowd1}, {crowd2} ועוד כמה. ידיים באוויר, שער אחד, שלוש גרסאות.' },
          { who: null, text: '"אתה! אתה היית שם, לא? תגיד לו איך זה נכנס."' },
        ],
        choices: [
          { id: 'join', text: 'להיכנס לוויכוח', then: [{ e: 'mechanic', activity: 'parliament' }] },
          { id: 'later', text: 'להמשיך ללכת', then: [] },
        ],
      },
    ],
  },
  reaction('parliament', 'הפרלמנט ליד הגדר', {
    away: [{ who: null, text: 'משיכת כתפיים ליד הגדר, ומישהו אומר: "הנה, גם הוא לא יודע."' }],
    high: [
      { who: null, text: 'שקט של שנייה. ואז, מפי {crowd2}: "טוב. טוב! ככה זה היה."' },
      { who: null, text: 'יד על הכתף שלך, כאילו אתה כבשת את השער הזה בעצמך.' },
    ],
    mid: [{ who: null, text: '"כמעט," מפי {crowd2}. "בדיוק," מפי {crowd1}. הוויכוח מתחיל מחדש, הפעם איתך.' }],
    low: [{ who: null, text: 'צחוק קצר ליד הגדר: "זה לא היה ככה, חביבי. אבל יפה שניסית." והם ממשיכים בלעדיך.' }],
  }),

  // ------------------------------------------------------------ קופת הכרטיסים -----
  {
    id: 'act-ticket-poll',
    nameHe: 'הקופאי',
    branches: [
      { when: done('ticket-poll'), lines: [{ who: null, text: 'הקופאי, דרך החריץ: "ענית כבר. בפעם הבאה תהיה שאלה חדשה."' }] },
      {
        lines: [
          { who: null, text: 'מאחורי הזכוכית הקופאי לא מרים את הראש. רק מחליק פתק מודפס דרך החריץ.' },
          { who: null, text: 'הקופאי, דרך החריץ: "תעשה לנו טובה. שאלה אחת, לסקר של המועדון."' },
        ],
        choices: [
          { id: 'answer', text: 'לענות', then: [{ e: 'mechanic', activity: 'ticket-poll' }] },
          { id: 'later', text: 'לא עכשיו.', then: [] },
        ],
      },
    ],
  },
  reaction('ticket-poll', 'הקופאי', {
    away: [{ who: null, text: 'הקופאי, דרך החריץ: "לא חשוב. הפתק יחכה."' }],
    high: [
      { who: null, text: 'הוא מחתים את הפתק בחותמת עגולה ומחליק לך מטבע מתחת לזכוכית.' },
      { who: null, text: 'הקופאי, דרך החריץ: "תודה. כל התשובות נכנסות לארגז. מה עושים איתן, אל תשאל אותי."' },
    ],
    mid: [{ who: null, text: 'הקופאי, דרך החריץ: "תודה. הבא בתור."' }],
    low: [{ who: null, text: 'הקופאי, דרך החריץ: "תודה. הבא בתור."' }],
  }),

  // ------------------------------------------------------------ בקבוקים אחרי המשחק -----
  reaction('bottles', null, {
    away: [{ who: null, text: 'המנקים מגיעים עם המטאטאים הרחבים. מה שנשאר על המדרכה הולך איתם.' }],
    high: [{ who: null, text: 'שקית מלאה ועוד אחת. רפי יספור את זה מחר בלי להסתכל עליך, וזה אומר הכול.' }],
    mid: [{ who: null, text: 'כמה סיבובים עד הארגז וחזרה. חצי מהמדרכה עוד מלאה, אבל השעה כבר מאוחרת.' }],
    low: [{ who: null, text: 'השקית קרעה באמצע, והמנקים היו מהירים. בפעם הבאה, לפדות מוקדם יותר.' }],
  }),

  // ------------------------------------------------------------ חלוקת עיתונים -----
  // the man at the stand has no face in the cast, so he is heard through the boy's eyes
  reaction('papers', null, {
    away: [{ who: null, text: 'האיש בדוכן לוקח את החבילה בחזרה בלי מילה. "טוב. אני, כמו תמיד."' }],
    high: [
      { who: null, text: 'האיש בדוכן לא מרים את הראש: "אף תיבה לא חיכתה. הדרך שלך טובה מהדרך שלי."' },
      { who: null, text: 'הוא משלם, ומוסיף עיתון אחד בשבילך. "תקרא. אתה הרי מחלק אותם."' },
    ],
    mid: [{ who: null, text: '"הגיעו כולם," הוא אומר. "קצת מסביב, אבל הגיעו."' }],
    low: [{ who: null, text: '"חצי מהבניינים קיבלו אחרי הקפה. בפעם הבאה תחשוב על הדרך לפני שאתה רץ."' }],
  }),

  // ------------------------------------------------------------ השכנה עם השקיות -----
  {
    id: 'act-neighbour',
    nameHe: 'השכנה מהקומה השלישית',
    branches: [
      { when: done('neighbour'), lines: [{ who: null, text: 'השכנה כבר למעלה. החלון שלה פתוח ומשהו מתבשל.' }] },
      {
        lines: [
          { who: null, text: 'השכנה מהקומה השלישית עומדת ליד הכניסה עם שתי שקיות בד. אחת מהן נראית כמו אבטיח.' },
          { who: null, text: 'היא לא מבקשת. היא רק מסתכלת על המדרגות ואז עליך.' },
        ],
        choices: [
          { id: 'help', text: 'לעזור לה עם השקיות', then: [{ e: 'minigame', id: 'chore:shopping-neighbour' }] },
          { id: 'later', text: 'להמשיך בדרך', then: [] },
        ],
      },
    ],
  },
  {
    id: 'act-neighbour-after',
    nameHe: 'השכנה מהקומה השלישית',
    branches: [
      {
        when: { flagIs: { flag: 'act:neighbour:gift', value: 'money' } },
        lines: [{ who: null, text: 'היא מכניסה לך מטבע לכיס ודוחפת את היד בחזרה כשאתה מנסה להחזיר.' }],
      },
      {
        when: { flagIs: { flag: 'act:neighbour:gift', value: 'food' } },
        lines: [{ who: null, text: 'היא לא נותנת כסף. היא נותנת צלחת, מכוסה במגבת. "תאכל. אתה רזה."' }],
      },
      {
        lines: [
          { who: null, text: 'היא לא אומרת תודה. היא אומרת: "אני חייבת לך אחת." ומתכוונת לזה.' },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ הבית -----
  {
    id: 'act-bedroom-bag',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'התיק תלוי על הכיסא. מה שיש בו, מה ששמרת, מה שאתה עדיין נושא איתך.' }],
        choices: [
          { id: 'open', text: 'לפתוח את התיק', then: [{ e: 'mechanic', activity: 'bedroom-bag' }] },
          { id: 'later', text: 'לא עכשיו.', then: [] },
        ],
      },
    ],
  },
  {
    id: 'act-lounge-xi',
    nameHe: 'קובי',
    branches: [
      { when: done('lounge-xi'), lines: [{ who: 'קובי', text: 'כבר בנינו היום. מחר תבנה שוב, ותגלה שהחלפת את חצי.' }] },
      {
        lines: [
          { who: null, text: 'קובי מקפל את העיתון לרבע ומפנה מקום על השולחן.' },
          { who: 'קובי', text: 'נו. הטובים ביותר שהיו. אחד־עשר. ואני אגיד לך את מי שכחת.' },
        ],
        choices: [
          { id: 'build', text: 'לבנות הרכב עם אבא', then: [{ e: 'mechanic', activity: 'lounge-xi' }] },
          { id: 'later', text: 'אחר כך.', then: [] },
        ],
      },
    ],
  },
  reaction('lounge-xi', 'קובי', {
    away: [{ who: 'קובי', text: 'חצי הרכב. גם אני ככה, בשבת, מול הרדיו.' }],
    high: [
      { who: 'קובי', text: 'את אלה אני ראיתי. מאיפה אתה מכיר אותם בכלל?' },
      { who: null, text: 'הוא מתחיל לספר על אחד מהם, ולא עוצר עד שאמא קוראת לאכול.' },
    ],
    mid: [{ who: 'קובי', text: 'חצי שלי, חצי שלך. ככה זה צריך להיות בבית הזה.' }],
    low: [
      { who: 'קובי', text: 'כולם שלך, אף אחד לא שלי. גם זה בסדר. אתה תספר עליהם לבן שלך.' },
    ],
  }),
  {
    id: 'act-kitchen-archive',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'ערימת עיתונים ישנים ליד הקיר, קשורה בחוט. אמא אמרה לזרוק אותם כבר חודש.' },
        ],
        choices: [
          { id: 'dig', text: 'לחפור בערימה', then: [{ e: 'mechanic', activity: 'kitchen-archive' }] },
          { id: 'later', text: 'לא עכשיו.', then: [] },
        ],
      },
    ],
  },
  reaction('kitchen-archive', null, {
    away: [{ who: null, text: 'החוט חוזר לקשר. הערימה תחכה עוד חודש.' }],
    high: [
      { who: null, text: 'כמה גזירים יוצאים מהערימה ונכנסים לקופסה שלך. אמא מסתכלת ולא אומרת כלום.' },
    ],
    mid: [{ who: null, text: 'גזיר אחד נשאר בכיס. השאר חוזר לערימה.' }],
    low: [{ who: null, text: 'קראת, הנחת בחזרה. גם לקרוא זה משהו.' }],
  }),
]
