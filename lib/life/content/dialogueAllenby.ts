import { SHIRTS } from '../shirts'
import type { Conversation } from './script'

/**
 * אלנבי — the words on the corner.
 *
 * Maor opened this junction on 6.9.2026 and sent the painting of it the same afternoon:
 * a record shop, a green door at number 96, an archway through the block, a café under a
 * red awning, and the same corner told three times — vinyl, then compact discs, then a
 * phone shop. Everything below is written to what is actually drawn there, because a line
 * that describes something the player cannot see is a line that makes them feel blind.
 *
 * The rules are the ones every other conversation here is written to:
 *  · nothing hands out a quest and nothing prints a number;
 *  · no line states a historical fact the archive cannot source — the shopkeeper sells
 *    records, the rival supports a club, and neither of them tells you a result;
 *  · the child works it out. The corner shows where the streets go; NOBODY says "go north".
 */

/** the first kit in the collection, by id — the shirt a boy in red is most likely wearing */
const FIRST_SHIRT = SHIRTS[0]?.id ?? 'visa86'

export const CONVERSATIONS_ALLENBY: Conversation[] = [
  // -------------------------------------------------------------- המספר בפינה -----
  {
    id: 'allenby-sign',
    nameHe: null,
    branches: [
      {
        /**
         * Once the hall has a name, this stops being scenery and becomes a map. It is the
         * moment the city stops being "my street, and everywhere else".
         */
        when: { flag: 'life:knows:hall' },
        lines: [
          { who: null, text: 'לוחית אמייל כחולה על הטיח, מבורגת בשתי פינות ומעוקמת באחת: 96.' },
          { who: null, text: 'מעליה הבניין מתעגל, ומתחתיו הקשת נכנסת פנימה — מדרגות, ואור בקצה השני.' },
          { who: null, text: 'משם ממשיכים צפונה, והולכים, והולכים, ובסוף מגיעים לירקון. אפי אמר את זה כאילו זה כלום.' },
        ],
      },
      {
        lines: [
          { who: null, text: 'לוחית אמייל כחולה על הטיח: 96. מספר של בית שאתה לא מכיר אף אחד בו.' },
          { who: null, text: 'שלושה רחובות נפגשים כאן ואף אחד מהם לא הרחוב שלך. זאת העיר, והיא לא מחכה לך.' },
        ],
        then: [{ e: 'flag', flag: 'saw:allenby-sign' }],
      },
    ],
  },

  // ------------------------------------------------------------ החלון של החנות ----
  {
    id: 'allenby-window',
    nameHe: null,
    branches: [
      {
        when: { beforeMinute: 10 * 60 },
        lines: [
          { who: null, text: 'התריס עוד חצי סגור והוא מסדר את השורות מבפנים, עטיפה־עטיפה, בלי למהר.' },
          { who: null, text: 'שני ארגזי עץ עומדים בחוץ ומחכים שיכניסו אותם. אף אחד עוד לא נגע בהם.' },
        ],
      },
      {
        lines: [
          { who: null, text: 'החלון מלא משורה לשורה, ונורה אחת תלויה באמצע ומחזירה אור מהעטיפות.' },
          { who: null, text: 'אתה מצמיד את האף לזכוכית. מבפנים מישהו מסתכל עליך בחזרה ולא אומר לך לזוז.' },
        ],
        then: [{ e: 'personality', key: 'curiosity', delta: 3 }],
      },
    ],
  },

  // ------------------------------------------------------------- המוכר בפינה ------
  {
    id: 'allenby-records',
    nameHe: 'המוכר בפינה',
    branches: [
      {
        when: { flag: 'gig:crates-allenby' },
        lines: [
          { who: 'המוכר', text: 'היום גמרנו. תבוא מוקדם מחר, לפני שהשמש עולה על הארגזים.' },
          { who: null, text: 'הוא כבר מסתכל על מישהו אחר. ככה זה בחנות.' },
        ],
      },
      {
        /**
         * The rail at the back is why this doorway is the shop. He says it plainly once,
         * and never again — a shopkeeper does not advertise the same thing twice.
         */
        when: { notFlag: 'own:told:rail' },
        lines: [
          { who: 'המוכר', text: 'תיכנס או אל תיכנס, רק אל תעמוד בדלת. אנשים צריכים לעבור.' },
          { who: null, text: 'מבפנים ריח של קרטון וחשמל. בקיר האחורי, מעבר לתקליטים, מוט עם קולבים.' },
          { who: 'המוכר', text: 'מה, זה? חולצות. אני מוכר גם חולצות. מה זה משנה מה כתוב על השלט בחוץ.' },
        ],
        then: [{ e: 'flag', flag: 'own:told:rail' }, { e: 'redheart', key: 'community', delta: 3 }],
      },
      {
        lines: [
          { who: 'המוכר', text: 'שוב אתה. תיכנס, המוט מאחורה.' },
          { who: null, text: 'הוא מנגב את הדלפק באותה מטלית שהוא מנגב בה תקליטים, וזה כנראה לא בסדר.' },
        ],
      },
    ],
  },

  // ------------------------------------------------------------- בית הקפה --------
  {
    id: 'allenby-cafe',
    nameHe: null,
    branches: [
      {
        when: { afterMinute: 17 * 60 },
        lines: [
          { who: null, text: 'כל השולחנות תפוסים ואף אחד לא אוכל. מדברים, ומזיזים סוכר על השולחן כמו שחקנים.' },
          { who: null, text: 'משם, מהשולחן השני, מישהו אומר מילה שאתה מכיר — שם של קבוצה — וכולם עונים ביחד.' },
        ],
        then: [{ e: 'redheart', key: 'terraceCulture', delta: 3 }],
      },
      {
        lines: [
          { who: null, text: 'סוכך אדום, שולחנות קטנים, וכיסאות שאף אחד לא ישב עליהם עדיין היום.' },
          { who: null, text: 'מלצר מסדר אותם בשורה ישרה, ואחרי חמש דקות מישהו יזיז אחד ויהרוס לו את זה.' },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ היריב -------
  {
    id: 'allenby-rival',
    nameHe: 'הגבר מהשולחן',
    branches: [
      {
        /**
         * Wearing red, in town, beside a café table. The only conversation in the game
         * where being recognised costs nothing — which is what neutral ground IS, and why
         * he is here and not at a gate. Nothing about him says which club until he does.
         */
        when: { flag: `own:shirt:${FIRST_SHIRT}` },
        lines: [
          { who: 'הגבר', text: 'נו. ראיתי את החולצה מהפינה השנייה.' },
          { who: null, text: 'הוא לא מרים את הקול ולא זז. כוס על השולחן, עיתון מקופל לידה.' },
          { who: 'הגבר', text: 'אני מהצד השני של העיר. אל תעשה פרצוף, אני יודע.' },
          { who: 'הגבר', text: 'תשמע, פה באלנבי אנחנו קונים באותה חנות. בשבת נדבר.' },
        ],
        choices: [
          {
            id: 'nod',
            text: 'להנהן.',
            then: [
              { e: 'personality', key: 'sociability', delta: 4 },
              { e: 'toast', text: 'הוא הנהן בחזרה. שני אנשים על מדרכה אחת, לא יותר.' },
            ],
          },
          {
            id: 'answer',
            text: '"בשבת נדבר."',
            then: [
              { e: 'personality', key: 'courage', delta: 5 },
              { e: 'redheart', key: 'community', delta: 4 },
              { e: 'toast', text: 'הוא צחק לתוך הכוס. אתה לא הורדת את המבט.', tone: 'red' },
            ],
          },
        ],
      },
      {
        lines: [
          { who: null, text: 'גבר בחולצה לבנה עומד ליד שולחן, עם כוס ועיתון, ומסתכל למעלה על המרפסות.' },
          { who: null, text: 'הוא לא יודע מי אתה ולא אכפת לו. זאת העיר של כולם, ובשבת זה יהיה סיפור אחר.' },
        ],
      },
    ],
  },
]
