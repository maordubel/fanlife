import type { Conversation } from './script'

/**
 * ============================================================ בתיה (27.9.2026) ====
 *
 * מאור, 27.9.2026: *"צריך גם לדייק את הדמות של בתיה, היא לוקחת ל'סוקו' ול'מישל' את
 * התפקיד, בתיה אמורה להיות החברה המבוגרת מהשכונה, חברה כייפית אוהדת הפועל."*
 *
 * הספר (5.9.2026, §12): *"אוהדת בולגרייה ותיקה ומבוגרת, גרה כל חייה ליד בלומפילד, מעולם
 * לא נישאה ומתייחסת לשחקנים כאל ילדיה … זיכרון חי, אוכל, קיצורי דרך, קללות אוהבות ודאגה
 * בין־דורית."* — לא ארכיון (זה סוקו) ולא הסעות וקשרים (זה מישל).
 *
 * שלושה רגעים קטנים, כל אחד פועל אחד וחוט אחד שממשיך (`life:batya:*` שורד מעבר פרק):
 *  · 2006 — מגש בניצה מחוץ לאוסישקין, "בשביל הילדים. השחקנים." (`life:batya:banitsa`)
 *  · 2019 — "אבא שלך אוכל?" — סיר לקובי, או לא (`life:batya:kobi`), וזוכרת את המגש
 *  · 2026 — בולגריה. היא משם; קופסה לדרך לבוטבגרד, וזוכרת את שניהם (`life:batya:road`)
 * היא לא נותנת מידע שהסיפור צריך ולא מכוונת לשום מטרה: מי שלא ניגש אליה לא מפסיד כלום.
 * אין בה אדם אמיתי, אין תאריך ואין תוצאה.
 */
export const CONVERSATIONS_BATYA: Conversation[] = [
  {
    id: 'batya-06',
    nameHe: 'בתיה',
    branches: [
      {
        when: { flag: 'life:batya:banitsa' },
        lines: [{ who: 'בתיה', text: 'עוד פה? בניצה לא מתחממת מזה שמסתכלים עליה.' }],
      },
      {
        lines: [
          { who: 'בתיה', text: 'בוא הנה, רזה. בניצה. עם גבינה, בלי תירוצים.' },
          { who: 'פוגי', text: 'בשבילי?' },
          { who: 'בתיה', text: 'בשביל הילדים. השחקנים. אף אחד מהם לא מתקשר, אבל כולם אוכלים.' },
          { who: 'בתיה', text: 'ומה שנשאר — שלך. גם אתה ילד שלי, רק מהיציע.' },
        ],
        choices: [
          {
            id: 'eat',
            text: '(לקחת חתיכה, ולאכול בעמידה.)',
            then: [
              { e: 'flagValue', flag: 'life:batya:banitsa', value: 'ate' },
              { e: 'rel', who: 'batya', axis: 'bond', delta: 2 },
              { e: 'time', minutes: 5 },
              { e: 'toast', text: 'בתיה: "בעמידה, כמו סוס. אבל אכלת."', tone: 'plain' },
            ],
          },
          {
            id: 'carry',
            text: '(לקחת את המגש פנימה, לשחקנים.)',
            then: [
              { e: 'flagValue', flag: 'life:batya:banitsa', value: 'carried' },
              { e: 'rel', who: 'batya', axis: 'bond', delta: 3 },
              { e: 'time', minutes: 10 },
              { e: 'toast', text: 'בתיה: "תגיד להם שזה ממני. ושיחזרו בזמן להגנה, הממזרים."', tone: 'plain' },
            ],
          },
          {
            id: 'no',
            text: '"אני לא רעב."',
            then: [
              { e: 'flagValue', flag: 'life:batya:banitsa', value: 'refused' },
              { e: 'rel', who: 'batya', axis: 'bond', delta: 1 },
              { e: 'toast', text: 'בתיה: "רעב לא שואלים." — חתיכה עטופה במפית נוחתת לך בכיס.', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'batya-19',
    nameHe: 'בתיה',
    branches: [
      {
        when: { none: [{ flag: 'a:saturday' }] },
        lines: [{ who: 'בתיה', text: 'קודם הסולם. אחר כך אני.' }],
      },
      {
        when: { flag: 'life:batya:kobi' },
        lines: [{ who: 'בתיה', text: 'יאללה, לך. ותאכל משהו גם אתה, אתה נראה כמו מחצית שנייה.' }],
      },
      {
        when: { flagIs: { flag: 'life:batya:banitsa', value: 'carried' } },
        lines: [
          { who: 'בתיה', text: 'זה שסחב לי את המגש לאוסישקין. גדלת, ועדיין רזה.' },
          { who: 'בתיה', text: 'תגיד, אבא שלך אוכל? כשהם מפסידים הוא לא אוכל. אני מכירה אותו מלפני שאתה נולדת.' },
        ],
        choices: [
          { id: 'pot', text: '(לקחת לו את הסיר.)', then: [{ e: 'flagValue', flag: 'life:batya:kobi', value: 'pot' }, { e: 'rel', who: 'batya', axis: 'bond', delta: 2 }, { e: 'rel', who: 'kobi', axis: 'bond', delta: 1 }, { e: 'time', minutes: 15 }, { e: 'toast', text: 'בתיה: "ותחזיר לי את הסיר. את הסיר, לא את האוכל."', tone: 'plain' }] },
          { id: 'fine', text: '"הוא בסדר."', then: [{ e: 'flagValue', flag: 'life:batya:kobi', value: 'fine' }, { e: 'toast', text: 'בתיה: "בסדר זה לא מאכל."', tone: 'plain' }] },
        ],
      },
      {
        lines: [
          { who: 'בתיה', text: 'תגיד, אבא שלך אוכל? כשהם מפסידים הוא לא אוכל. אני מכירה אותו מלפני שאתה נולדת.' },
        ],
        choices: [
          { id: 'pot', text: '(לקחת לו את הסיר.)', then: [{ e: 'flagValue', flag: 'life:batya:kobi', value: 'pot' }, { e: 'rel', who: 'batya', axis: 'bond', delta: 2 }, { e: 'rel', who: 'kobi', axis: 'bond', delta: 1 }, { e: 'time', minutes: 15 }, { e: 'toast', text: 'בתיה: "ותחזיר לי את הסיר. את הסיר, לא את האוכל."', tone: 'plain' }] },
          { id: 'fine', text: '"הוא בסדר."', then: [{ e: 'flagValue', flag: 'life:batya:kobi', value: 'fine' }, { e: 'toast', text: 'בתיה: "בסדר זה לא מאכל."', tone: 'plain' }] },
        ],
      },
    ],
  },
  {
    id: 'batya-26',
    nameHe: 'בתיה',
    branches: [
      {
        when: { flag: 'life:batya:road' },
        lines: [{ who: 'בתיה', text: 'עוד פה? הקופסה לא נוסעת לבד.' }],
      },
      {
        lines: [
          { who: 'בתיה', text: 'שמעתי שאתם נוסעים לבולגריה. אתה ואבא שלך.' },
          { who: 'פוגי', text: 'עוד לא סגרנו.' },
          { who: 'בתיה', text: 'בבולגריה אף פעם לא סוגרים. מגיעים. אני משם, לפני הכול.' },
        ],
        choices: [
          {
            id: 'box',
            text: '(לקחת את הקופסה לדרך.)',
            then: [
              { e: 'flagValue', flag: 'life:batya:road', value: 'box' },
              { e: 'rel', who: 'batya', axis: 'bond', delta: 2 },
              { e: 'goto', node: 'batya-26-box' },
            ],
          },
          {
            id: 'ask',
            text: '(לשאול אותה איך זה שם.)',
            then: [
              { e: 'flagValue', flag: 'life:batya:road', value: 'asked' },
              { e: 'rel', who: 'batya', axis: 'bond', delta: 1 },
              { e: 'toast', text: 'בתיה: "הרים, ואנשים שצועקים כמו פה. תרגיש בבית — רק תשאל פעמיים איפה השירותים."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  /**
   * הקופסה — והחוט: מה שקרה ב-2006 ובשבת של 2019 נאמר פה במשפט אחד, בלי להסביר אותו מחדש
   * (הספר §13.6). מי שלא פגש אותה קודם שומע רק את הקופסה.
   */
  {
    id: 'batya-26-box',
    nameHe: 'בתיה',
    branches: [
      {
        when: { flagIs: { flag: 'life:batya:kobi', value: 'pot' } },
        lines: [
          { who: 'בתיה', text: 'הסיר חזר נקי אז, אז אני יודעת שהוא אוכל. אחת לך, אחת לאבא, ואחת לנהג.' },
          { who: 'בתיה', text: 'ואם מפסידים — אוכלים בכל זאת, ממזרים.' },
        ],
      },
      {
        when: { flagIs: { flag: 'life:batya:banitsa', value: 'refused' } },
        lines: [
          { who: 'בתיה', text: 'ואל תגיד לי שאתה לא רעב. את זה כבר שמעתי ממך פעם, מול אוסישקין.' },
          { who: 'בתיה', text: 'אחת לך, אחת לאבא, ואחת לנהג. ואם מפסידים — אוכלים בכל זאת, ממזרים.' },
        ],
      },
      {
        when: { flagIs: { flag: 'life:batya:banitsa', value: 'carried' } },
        lines: [
          { who: 'בתיה', text: 'פעם סחבת לי מגש לשחקנים. עכשיו תסחב את אבא שלך. לאט.' },
          { who: 'בתיה', text: 'אחת לך, אחת לאבא, ואחת לנהג. ואם מפסידים — אוכלים בכל זאת, ממזרים.' },
        ],
      },
      {
        lines: [{ who: 'בתיה', text: 'אחת לך, אחת לאבא, ואחת לנהג. ואם מפסידים — אוכלים בכל זאת, ממזרים.' }],
      },
    ],
  },
]
