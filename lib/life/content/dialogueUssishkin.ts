import type { Conversation } from './script'

/**
 * אוסישקין — the empty hall, spoken.
 *
 * Before there is a derby night here (11.3.1991, the second movement of Stage B) there is
 * a place, and a child can walk into it on any Saturday and find it empty, warm, and
 * used. Every line here is about the ROOM — the parquet, the window strip under the tin
 * roof, the old basket bolted to the end wall, the stand of red and charcoal seats — and
 * not one of them states a result, a name, or a season. What the club's hall means is
 * for the player to feel from the floor up; the archive says the rest, later.
 *
 * Both chapters share these: an eight-year-old and a twelve-year-old see the same
 * hall, and the usher knows both of them by the second visit.
 */
export const CONVERSATIONS_USSISHKIN: Conversation[] = [
  {
    id: 'usher-hall',
    nameHe: 'סדרן',
    branches: [
      // 11.3.1991. The same man, the same chair, and a room that has stopped being empty.
      {
        when: { flag: 'uss:arrived' },
        lines: [
          { who: 'סדרן', text: 'לא להישען על המעקה. הם נופלים מהקו ישר לתוך האנשים, כל ערב.' },
          { who: null, text: 'הוא אומר את זה בלי להסתכל עליך, ומיד אחר כך אומר את זה בדיוק לעוד שני ילדים.' },
        ],
      },
      {
        when: { flag: 'uss:met' },
        lines: [
          { who: 'סדרן', text: 'שוב אתה. תיכנס. רק לא על הפרקט — הוא שוקע גם בלי הנעליים שלך.' },
          { who: null, text: 'הוא לא מסתכל אם באמת ירדת ממנו. ככה זה כשמכירים אותך.' },
        ],
      },
      {
        lines: [
          { who: 'סדרן', text: 'אין היום כלום, חביבי. ביום שיש — שומעים את זה מהרחוב לפני שרואים את הבניין.' },
          { who: 'סדרן', text: 'רוצה להסתכל — תסתכל. רק לא על הפרקט עם הנעליים האלה.' },
          { who: null, text: 'הוא חוזר לכיסא שלו ליד הדלת. גם כשאין משחק, יש לו כיסא.' },
        ],
        then: [{ e: 'flag', flag: 'uss:met' }],
      },
    ],
  },
  {
    id: 'uss-parquet',
    branches: [
      {
        when: { flag: 'uss:arrived' },
        lines: [
          { who: null, text: 'הפרקט לא מבריק הערב. סימני גומי שחורים לכל האורך, וכל חריקה נשמעת עד לגג.' },
          { who: null, text: 'כשהם רצים לצד הזה, הרצפה זזה קצת. אתה מרגיש את זה בברכיים.' },
        ],
        then: [{ e: 'flag', flag: 'saw:parquet' }],
      },
      {
        lines: [
          { who: null, text: 'הפרקט מבריק כמו מים. רואים בו את פס החלונות הפוך.' },
          { who: null, text: 'ליד הקו הוא שקע קצת. אלפי סוליות עברו כאן, וכולן השאירו את אותו צליל.' },
        ],
        then: [{ e: 'flag', flag: 'uss:floor' }],
      },
    ],
  },
  {
    id: 'uss-stand',
    branches: [
      {
        when: { flag: 'uss:arrived' },
        lines: [
          { who: null, text: 'היציע מלא מלמעלה עד למטה ואף אחד לא יושב. אין אוויר, יש עשן.' },
          { who: null, text: 'את הכיסאות האדומים כבר לא רואים. רק גבים, ותוף אחד מהשורה השלישית.' },
        ],
        then: [{ e: 'flag', flag: 'saw:stand' }],
      },
      {
        lines: [
          { who: null, text: 'היציע הזה אדום ופחם, וקרוב כל כך לקו שאפשר לגעת בשחקן בלי לקום.' },
          { who: null, text: 'אומרים שקבוצות נכנסות לפה כבר עם מינוס עשר. עכשיו יש רק כיסאות, ומישהו שכח כובע.' },
        ],
        then: [{ e: 'flag', flag: 'saw:stand' }],
      },
    ],
  },
  {
    id: 'uss-windows',
    branches: [
      {
        when: { flag: 'uss:arrived' },
        lines: [
          { who: null, text: 'פס החלונות שחור. כל האור בא מהמנורות שמתחת לגג הפח, והן רועדות.' },
          { who: null, text: 'הן באמת רועדות. ומהגג יורד חום, כאילו בחוץ עכשיו קיץ.' },
        ],
        then: [{ e: 'flag', flag: 'saw:windows' }],
      },
      {
        lines: [
          { who: null, text: 'פס חלונות צמוד לגג הפח. האור שנכנס קר, והכול מתחתיו חם.' },
          { who: null, text: 'על הפח כתמי חלודה, ומתחתם סימנים על הבטון. כשיורד גשם, מי שיושב פה סופג.' },
        ],
        then: [{ e: 'flag', flag: 'saw:windows' }],
      },
    ],
  },
  {
    id: 'uss-basket',
    branches: [
      {
        lines: [
          { who: null, text: 'סל ישן, מוברג לקיר הקצה. הרשת קרועה בשני מקומות ואף אחד לא מחליף.' },
          { who: null, text: 'מישהו זורק. הכדור נכנס בלי לגעת בברזל. הוא לא מסתכל לראות אם ראית.' },
        ],
        then: [{ e: 'flag', flag: 'uss:basket' }],
      },
    ],
  },
  {
    id: 'uss-board',
    branches: [
      {
        lines: [
          { who: null, text: 'לוח תוצאות כבוי. שני צדדים, ואף ספרה — רק נורות אפורות מאחורי רשת.' },
          { who: null, text: 'כשהוא נדלק, כל האולם מסתכל למעלה באותה שנייה. גם מי שכבר ראה הכול.' },
        ],
      },
    ],
  },
]
