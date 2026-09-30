import { at } from '../clock'

import { CURFEW, RACHEL_HOME as RACHEL_HOME_91, TIP_OFF } from './chapter1991'
import type { Conversation } from './script'

/**
 * 11.3.1991 — what people say on the day the boy has to arrange his own night.
 *
 * The rules of `dialogue.ts` and `dialogue1990.ts` are unchanged and one of them is the
 * whole reason this file reads the way it does: **no authored line states a result, a
 * score, a margin, a quarter, an official or a player's name.** The derby is a row in the
 * archive; the crowd in this hall reacts to a game whose numbers the game itself never
 * says out loud, and the one number a person is allowed to speak is read off the anchor
 * by the director at the horn.
 *
 * The other rule is the brief's, and it is the design of the whole evening: no menu ever
 * says PERMISSION GRANTED. Rachel says a time. The time arrives while the game is alive,
 * and what the player does with his own legs at that moment is the choice (§41).
 */

const BREAK = at(8, 55)

export const CONVERSATIONS_1991: Conversation[] = [
  // ================================================================= the classroom ==
  {
    id: 'note-1991',
    nameHe: null,
    branches: [
      // --- it has been answered and is on its way back --------------------------------
      {
        when: { flag: 'note:answered' },
        lines: [
          { who: null, text: 'הפתק כבר לא אצלך. הוא עובר מתחת לשולחנות, בין השורה השנייה לשלישית.' },
          { who: null, text: 'מישהו מאחוריך צוחק בלי קול. אז הוא הגיע.' },
        ],
      },
      // --- confiscated ---------------------------------------------------------------
      {
        when: { flag: 'note:caught' },
        lines: [
          { who: null, text: 'הפתק על השולחן שלה, ליד הגיר, מקופל בדיוק כמו שהיה. היא לא פתחה אותו שוב.' },
          { who: null, text: 'זה איכשהו יותר גרוע מזה שהיא הייתה פותחת אותו.' },
        ],
      },
      // --- the note, and the only real decision of the morning ------------------------
      {
        when: { flag: 'note:read' },
        lines: [
          { who: null, text: 'הפתק פתוח על הברכיים. שתי מילים, סימן שאלה, ומתחת — שלוש תשובות מוכנות שצריך רק להקיף.' },
          { who: null, text: 'כן · ברור · נראה לך שלא?' },
          { who: null, text: 'המורה כותבת על הלוח. הגב שלה אליך, וזה לא מצב קבוע.' },
        ],
        choices: [
          {
            id: 'now',
            text: 'להעביר עכשיו, מהר.',
            then: [
              { e: 'flag', flag: 'note:caught' },
              { e: 'take', item: 'school-note' },
              { e: 'time', minutes: 12 },
              { e: 'personality', key: 'impulsiveness', delta: 5 },
              { e: 'toast', text: 'היד שלך באוויר כשהיא מסתובבת. היא לא צועקת. היא רק מושיטה יד.', tone: 'plain' },
              { e: 'goto', node: 'note-caught' },
            ],
          },
          {
            id: 'wait',
            text: 'לחכות שהיא תכתוב עוד שורה.',
            then: [
              { e: 'flag', flag: 'note:answered' },
              { e: 'flag', flag: 'plan:tonight' },
              { e: 'time', minutes: 6 },
              { e: 'personality', key: 'reliability', delta: 2 },
              { e: 'bond', who: 'ofir', delta: 3 },
              { e: 'toast', text: 'חיכית שהגיר יתחיל לחרוק, הקפת "ברור", והעברת. הפתק נעלם קדימה.', tone: 'plain' },
            ],
          },
          {
            id: 'keep',
            text: 'לקפל ולשים בכיס.',
            then: [
              { e: 'flag', flag: 'note:kept' },
              { e: 'flag', flag: 'plan:tonight' },
              { e: 'personality', key: 'responsibility', delta: 4 },
              { e: 'toast', text: 'הכנסת אותו לכיס. תענה בהפסקה, פנים אל פנים. גם זאת תשובה.', tone: 'plain' },
            ],
          },
        ],
      },
      {
        lines: [{ who: null, text: 'נייר מקופל לארבע על השולחן. לא ראית מי שלח אותו.' }],
        then: [{ e: 'flag', flag: 'note:read' }, { e: 'give', item: 'school-note' }],
      },
    ],
  },
  {
    id: 'note-caught',
    nameHe: 'המורה',
    branches: [
      {
        lines: [
          { who: 'המורה', text: 'תודה. אני אשמור עליו טוב.' },
          { who: null, text: 'היא מקפלת אותו שוב לארבע ומניחה על השולחן שלה, ליד הגיר, בלי למהר.' },
          { who: 'המורה', text: 'אוסישקין.' },
          { who: null, text: 'היא לא שואלת. היא אומרת את המילה כמו מי ששמעה אותה בכיתה הזאת כבר עשר שנים.' },
          { who: 'המורה', text: 'אתה נשאר חמש דקות אחרי השיעור. ויש שיעורי בית, כמו לכולם.' },
        ],
        then: [
          { e: 'flag', flag: 'hw:given' },
          { e: 'rel', who: 'teacher', axis: 'familiarity', delta: 4 },
          { e: 'remember', who: 'teacher', eventId: 'note-confiscated', significance: 'minor' },
        ],
      },
    ],
  },
  {
    id: 'teacher-1991',
    nameHe: 'המורה',
    branches: [
      {
        when: { flag: 'note:caught' },
        lines: [
          { who: 'המורה', text: 'אתה עדיין כאן.' },
          { who: 'פוגי', text: 'אמרת חמש דקות.' },
          { who: 'המורה', text: 'אמרתי. שיעורי הבית עמוד ארבעים ואחת. לא בגלל הפתק — לכל הכיתה.' },
          { who: null, text: 'היא מסתכלת עליך מעל המשקפיים עוד שנייה אחת, ואז חוזרת ללוח.', },
          { who: 'המורה', text: 'לך כבר. אתה תאחר.' },
        ],
        // (delta 90) she SAYS page forty-one — so it is given: without `hw:given` the desk
        // at home said "nothing to do" to the one boy the teacher had just set it to
        then: [{ e: 'flag', flag: 'hw:given' }, { e: 'flag', flag: 'school:done' }, { e: 'time', minutes: 5 }],
      },
      {
        when: { afterMinute: BREAK },
        lines: [
          { who: 'המורה', text: 'צלצל. עמוד ארבעים ואחת להיום, וכן, כולו.' },
          { who: null, text: 'היא מוחקת את הלוח באותה תנועה כל בוקר. חצי מעגל, ואז שורה.' },
        ],
        then: [{ e: 'flag', flag: 'hw:given' }, { e: 'flag', flag: 'school:done' }],
      },
      {
        lines: [
          { who: 'המורה', text: 'אנחנו באמצע משפט.' },
          { who: null, text: 'נכון. אתה לא.' },
        ],
      },
    ],
  },
  {
    id: 'class-board',
    branches: [
      {
        lines: [
          { who: null, text: 'הלוח מלא בסימנים לבנים. אתה מעתיק אותם למחברת בלי לקרוא אותם.' },
          { who: null, text: 'בעמוד ליד, בשוליים, אתה מצייר אולם קטן עם גג פח ומדרגה אחת.' },
        ],
        then: [{ e: 'personality', key: 'curiosity', delta: 2 }],
      },
    ],
  },
  {
    id: 'class-window',
    branches: [
      {
        lines: [
          { who: null, text: 'החלונות גבוהים, ומהמקום שלך רואים רק שמיים ופינה של גג.' },
          { who: null, text: 'ככה זה בנוי, בכוונה. כדי שלא תסתכל החוצה.' },
        ],
      },
    ],
  },
  {
    id: 'class-bag',
    branches: [
      {
        lines: [
          { who: null, text: 'התיק בין הרגליים. ספר חשבון, קלמר, וקצה של צעיף אדום שאתה דוחף פנימה כל בוקר.' },
          { who: null, text: 'הוא תמיד מציץ החוצה. אתה כבר לא באמת מנסה.' },
        ],
        then: [{ e: 'redheart', key: 'terraceCulture', delta: 2 }],
      },
    ],
  },
  {
    id: 'keren-class',
    nameHe: 'קרן',
    branches: [
      {
        when: { flag: 'note:caught' },
        lines: [
          { who: 'קרן', text: 'איזה גאון אתה.' },
          { who: 'פוגי', text: 'היא הסתובבה.' },
          { who: 'קרן', text: 'היא מסתובבת תמיד בדיוק ברגע הזה. זה התפקיד שלה.' },
        ],
        then: [{ e: 'bond', who: 'keren', delta: 2 }],
      },
      {
        when: { flag: 'plan:tonight' },
        lines: [
          { who: 'קרן', text: 'אתה בכלל הולך?' },
          { who: 'פוגי', text: 'אני צריך לשאול.' },
          { who: 'קרן', text: 'אז תשאל יפה, ולפני שהיא עייפה. אמא שלך לא אמא שלי.' },
        ],
      },
      {
        lines: [
          { who: 'קרן', text: 'תפסיק לזוז. היא מסתכלת לכיוון שלנו.' },
          { who: null, text: 'אתה קופא במקום. היא לא מסתכלת. קרן צוחקת בלי קול.' },
        ],
      },
    ],
  },

  // ================================================================== the schoolyard ==
  {
    /**
     * אופיר בחצר — ומי שכתב את הפתק הוא מי שיודע לאן.
     *
     * הענף הראשון נוסף ב-17.9.2026 בגלל מה שמאור מצא: *"אני אמור ללכת לאוסישקין ואין
     * בכלל דלת לאוסישקין."* הדרך לאולם נלמדת ב-`a3-hall`, פרק שרץ רק למי שהתיידד עם אפי
     * ב-1984 — כלומר חצי מהשחקנים הגיעו ליום הזה בלי שהמקום קיים עבורם, בזמן שכל הפרק
     * שולח אותם לשם.
     *
     * הענף השלישי, שהיה כאן מהיום שהפרק נכתב, אומר *"אתה מכיר את הדרך, זאת אותה דרך"* —
     * המשחק **קובע** שהילד יודע. עכשיו הוא קובע את זה רק כשזה נכון, ובמקרה השני אופיר
     * עושה את הדבר שילד בן שתים־עשרה עושה כשחבר שלו לא יודע לאן: הוא לוקח אותו. זה לא
     * פותח חצי עיר בגלל משפט של דמות — זאת הדמות שכבר זרקה את הפתק על השולחן בבוקר.
     */
    id: 'ofir-yard',
    nameHe: 'אופיר',
    branches: [
      {
        when: { none: [{ area: 'ussishkin' }] },
        lines: [
          { who: 'אופיר', text: 'נו? בערב.' },
          { who: 'פוגי', text: 'איפה זה בכלל.' },
          { who: null, text: 'הוא מסתכל עליך רגע אחד ארוך מדי, כמו מישהו שבודק אם צוחקים עליו.' },
          { who: 'אופיר', text: 'אתה רציני?' },
          { who: 'פוגי', text: 'רציני.' },
          { who: 'אופיר', text: 'טוב. אז אנחנו הולכים ביחד. תחכה לי ברחוב, אני אקח אותך.' },
          { who: null, text: 'הוא אומר את זה בלי להתאמץ, כאילו זה הדבר הכי פשוט שיש. בשבילו זה באמת.' },
        ],
        then: [
          { e: 'flag', flag: 'plan:tonight' },
          { e: 'flag', flag: 'guided:ofir' },
          { e: 'bond', who: 'ofir', delta: 4 },
          { e: 'toast', text: 'אופיר לוקח אותך. הוא יחכה ברחוב.', tone: 'plain' },
        ],
      },
      {
        when: { flag: 'note:caught' },
        lines: [
          { who: 'אופיר', text: 'שמעתי שהמורה קוראת פתקים עכשיו.' },
          { who: 'פוגי', text: 'היא לא קראה.' },
          { who: 'אופיר', text: 'ברור שהיא קראה.' },
          { who: 'אופיר', text: 'לא משנה. בשמונה מתחילים. אתה מכיר את הדרך, זאת אותה דרך.' },
        ],
        then: [{ e: 'flag', flag: 'plan:tonight' }, { e: 'bond', who: 'ofir', delta: 3 }],
      },
      {
        when: { flag: 'plan:tonight' },
        lines: [
          { who: 'אופיר', text: 'קיבלתי "ברור". יופי. אז אל תעשה לי בעיות בערב.' },
          { who: 'אופיר', text: 'עמית שומר מקומות. אבל עמית שומר מקומות כמו שעמית שומר סודות.' },
          { who: null, text: 'הוא צוחק מהבדיחה של עצמו כל הדרך חזרה לכיתה.' },
        ],
        then: [{ e: 'redheart', key: 'basketballLove', delta: 4 }],
      },
      {
        lines: [
          { who: 'אופיר', text: 'נו? קיבלת את הפתק או לא?' },
          { who: 'פוגי', text: 'קיבלתי.' },
          { who: 'אופיר', text: 'אז זהו, סגור. בערב.' },
        ],
        then: [{ e: 'flag', flag: 'plan:tonight' }],
      },
    ],
  },
  {
    id: 'amit-yard',
    nameHe: 'עמית',
    branches: [
      {
        lines: [
          { who: 'עמית', text: 'תשמע, אני נכנס מוקדם. אני תמיד נכנס מוקדם.' },
          { who: 'עמית', text: 'יש שם אלפיים מקומות ובאים יותר. תגיע לפני שפותחים, אחרת תעמוד ליד הדלת עם הסדרן.' },
          { who: null, text: 'הוא מסביר את זה כמו מהנדס. הוא בן שתים עשרה וחצי.' },
        ],
        then: [{ e: 'flag', flag: 'knows:early' }, { e: 'trait', trait: 'knowledge', delta: 3 }],
      },
    ],
  },
  {
    id: 'keren-yard',
    nameHe: 'קרן',
    branches: [
      {
        lines: [
          { who: 'קרן', text: 'אני לא הולכת. יש לי מבחן מחר.' },
          { who: 'פוגי', text: 'גם לי יש מבחן מחר.' },
          { who: 'קרן', text: 'אני יודעת.' },
          { who: null, text: 'היא לא אומרת את זה רע. זה יותר גרוע.' },
        ],
        then: [{ e: 'wellbeing', key: 'stress', delta: 4 }],
      },
    ],
  },
  {
    id: 'yard-ball',
    branches: [
      {
        when: { flag: 'played:yard' },
        lines: [{ who: null, text: 'הכדור אצל מישהו אחר עכשיו. גם ככה נגמרה ההפסקה.' }],
      },
      {
        lines: [
          { who: null, text: 'כדור גומי מקרטע על אספלט, וסל בלי רשת בקצה החצר.' },
          { who: null, text: 'אחד־על־אחד עד חמש. אף פעם לא נגמר בחמש.' },
        ],
        choices: [
          {
            id: 'play',
            text: 'לשחק. משחק אחד.',
            then: [
              { e: 'flag', flag: 'played:yard' },
              { e: 'time', minutes: 20 },
              { e: 'redheart', key: 'basketballLove', delta: 6 },
              { e: 'personality', key: 'impulsiveness', delta: 3 },
              { e: 'toast', text: 'משחק אחד. ואז עוד אחד. ואז הצלצול, ואתה מזיע בשיעור.', tone: 'plain' },
            ],
          },
          {
            id: 'watch',
            text: 'להסתכל מהצד.',
            then: [
              { e: 'time', minutes: 5 },
              { e: 'personality', key: 'curiosity', delta: 2 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'yard-fence',
    branches: [
      {
        lines: [
          { who: null, text: 'הגדר של החצר, ומעבר לה הרחוב שאתה הולך בו הביתה כל יום.' },
          { who: null, text: 'מכאן הדרך לאולם נראית קצרה. היא לא קצרה.' },
        ],
      },
    ],
  },

  {
    /**
     * אופיר ברחוב — ההזדמנות השנייה לאותו משפט.
     *
     * החצר קורית בהפסקה ואפשר לפספס אותה: להישאר בכיתה, ללכת לגדר, לדבר עם קרן. אז
     * ההצעה עומדת גם כאן, כי משימה שתלויה בכך שהשחקן דיבר עם האדם הנכון בחלון הנכון היא
     * בדיוק הצורה של תקיעה — רק עם תירוץ. שני חלונות לאותה תשובה זה לא כפילות; זה מה
     * שהופך את התשובה לוודאית.
     */
    id: 'ofir-afternoon-1991',
    nameHe: 'אופיר',
    branches: [
      {
        when: { none: [{ area: 'ussishkin' }] },
        lines: [
          { who: 'אופיר', text: 'אתה יודע להגיע לבד?' },
          { who: 'פוגי', text: 'לא ממש.' },
          { who: 'אופיר', text: 'אז אל תנסה. תחכה לי פה, נלך ביחד.' },
        ],
        then: [
          { e: 'flag', flag: 'plan:tonight' },
          { e: 'flag', flag: 'guided:ofir' },
          { e: 'bond', who: 'ofir', delta: 3 },
          { e: 'toast', text: 'אופיר לוקח אותך. הוא יחכה ברחוב.', tone: 'plain' },
        ],
      },
      /*
       * (delta 90, §20.3 no omniscient NPCs) Ofir was not in the kitchen: he cannot KNOW
       * that Rachel said no. He used to open on "אז מה, אתה לא בא?" as if he had been
       * standing behind her. Now he asks, and the boy does not say — the "no" reaches Ofir
       * only when Pugi says it out loud (`91-ofir-told-no`, `toldBy: 'player'`).
       */
      {
        when: { flag: 'permission:no' },
        lines: [
          { who: 'אופיר', text: 'נו? שאלת אותה?' },
          { who: 'פוגי', text: 'שאלתי.' },
          { who: 'אופיר', text: 'ו...? אתה בא או לא?' },
          { who: 'פוגי', text: 'לא יודע.' },
          { who: 'אופיר', text: 'תגיד לי עד שבע. אני לא עומד לחכות לך ברחוב כמו אידיוט.' },
        ],
      },
      {
        when: { afterMinute: 17 * 60 },
        lines: [
          { who: 'אופיר', text: 'אני יוצא מוקדם. בשבע וחצי אני כבר שם.' },
          { who: null, text: 'הוא כבר הולך אחורה בזמן שהוא מדבר, כמו שהוא עושה מאז כיתה ב׳.' },
        ],
      },
      {
        lines: [
          { who: 'אופיר', text: 'גמרת שיעורים?' },
          { who: 'פוגי', text: 'לא התחלתי.' },
          { who: 'אופיר', text: 'יופי. גם אני.' },
          { who: null, text: 'זה לא באמת מנחם, אבל זה משהו.' },
        ],
        then: [{ e: 'bond', who: 'ofir', delta: 2 }],
      },
    ],
  },

  // ======================================================================== at home ==
  {
    id: 'homework-1991',
    branches: [
      {
        when: { flag: 'hw:done' },
        lines: [{ who: null, text: 'המחברת סגורה על השולחן. עמוד ארבעים ואחת, כולו, בכתב היד שלך.' }],
      },
      {
        when: { notFlag: 'hw:given' },
        lines: [{ who: null, text: 'השולחן פנוי. אין מה לעשות עליו עכשיו.' }],
      },
      {
        lines: [
          { who: null, text: 'עמוד ארבעים ואחת. שלוש עשרה שאלות, וכל אחת ארוכה יותר מהקודמת.' },
          { who: null, text: 'מהמטבח רדיו נמוך. השעון בסלון עושה את הקול שלו, ואתה שומע כל תקתוק.' },
        ],
        /**
         * (Director V3 §12, 25.9.2026) "homework micro-action". The page is worked, not
         * chosen: thirteen questions are thirteen answers picked up off the desk in the
         * time the kitchen radio allows (`chore:story:homework-91`), and how many were done
         * is what the evening reads — all of them (`hw:done`), half (`hw:half`), or fewer
         * (`hw:faked` — rows that only look like answers). Writing something that looks
         * like answers without sitting down is still one sentence away, below.
         */
        choices: [
          { id: 'work', text: 'לשבת לעבוד.', then: [{ e: 'minigame', id: 'chore:story:homework-91' }] },
          {
            id: 'fake',
            text: 'לכתוב משהו שנראה כמו תשובות.',
            then: [
              { e: 'flag', flag: 'hw:faked' },
              { e: 'time', minutes: 8 },
              { e: 'personality', key: 'riskTolerance', delta: 5 },
              { e: 'wellbeing', key: 'stress', delta: 5 },
              { e: 'toast', text: 'שורות מלאות בכתב יפה. אם לא מסתכלים מקרוב, זה עובד.', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'rachel-1991',
    nameHe: 'רחל',
    branches: [
      // ---- the night is over: the consequence (§44) ---------------------------------
      /*
       * (delta 90) The door used to greet every boy who came back from the hall the same
       * way — the one she said yes to, the one she said no to and the one who never asked.
       * A note under a cup is a different evening from a permission, and she has read it
       * by now. Four branches, before the two general ones: the unasked note and the note
       * after a "no", each kept or broken. Same proofs (`:curfew`), so the ledger's promise
       * and breach rows still count one evening once.
       */
      {
        when: { all: [{ flag: 'derby:over' }, { flag: 'uss:arrived' }, { flag: 'sneak:unasked' }, { flag: 'curfew:kept' }] },
        lines: [
          { who: null, text: 'היא במטבח. הפתק שלך בין שתי אצבעות שלה, כמו קבלה.' },
          { who: 'רחל', text: '"הלכתי לאוסישקין. חוזר בעשר."' },
          { who: 'פוגי', text: 'וחזרתי.' },
          { who: 'רחל', text: 'חזרת. לא שאלת.' },
          { who: null, text: 'היא מקפלת את הפתק לשניים ומכניסה לכיס של החלוק. לא לפח.' },
        ],
        then: [
          { e: 'flag', flag: 'walked:home' },
          { e: 'rel', who: 'rachel', axis: 'trust', delta: 3 },
          { e: 'rel', who: 'rachel', axis: 'tension', delta: 2 },
          { e: 'proof', kind: 'promise_kept', proofId: 'promise_kept:{chapter}:curfew-note', subjectHe: 'הפתק: "חוזר בעשר"', noteHe: 'לא שאל. כתב שעה, ועמד בה.' },
          { e: 'remember', who: 'rachel', eventId: 'left-a-note-1991', significance: 'notable' },
          { e: 'keep' },
          { e: 'ending', id: 'wall' },
        ],
      },
      {
        when: { all: [{ flag: 'derby:over' }, { flag: 'uss:arrived' }, { flag: 'sneak:unasked' }, { flag: 'curfew:broken' }] },
        lines: [
          { who: 'רחל', text: '"חוזר בעשר."' },
          { who: null, text: 'היא קוראת את זה בקול, בלי להרים את העיניים מהפתק. השעון מעל המקרר מתקתק.' },
          { who: 'פוגי', text: 'זה היה דרבי.' },
          { who: 'רחל', text: 'לא שאלת אותי, כי ידעת מה אני אגיד. ואז גם לא עמדת במה שכתבת בעצמך.' },
          { who: null, text: 'היא לא כועסת. היא עייפה, וזה יותר גרוע.' },
        ],
        then: [
          { e: 'flag', flag: 'walked:home' },
          { e: 'rel', who: 'rachel', axis: 'trust', delta: -6 },
          { e: 'rel', who: 'rachel', axis: 'tension', delta: 5 },
          { e: 'proof', kind: 'breach_discovered', proofId: 'breach_discovered:{chapter}:curfew-note', subjectHe: 'הפתק: "חוזר בעשר"', noteHe: 'כתב שעה בעצמו, והמשחק עוד היה חי.' },
          { e: 'remember', who: 'rachel', eventId: 'broke-his-own-note-1991', significance: 'major' },
          { e: 'keep' },
          { e: 'ending', id: 'hall' },
        ],
      },
      {
        when: { all: [{ flag: 'derby:over' }, { flag: 'uss:arrived' }, { flag: 'permission:no' }, { flag: 'curfew:kept' }] },
        lines: [
          { who: 'רחל', text: 'אמרתי לא.' },
          { who: 'פוגי', text: 'וחזרתי בזמן.' },
          { who: 'רחל', text: 'חזרת בזמן. ועדיין אמרתי לא.' },
          { who: null, text: 'היא מחזיקה את זה עוד רגע, ואז מושיטה לך את הצלחת שחיכתה על השיש.' },
        ],
        then: [
          { e: 'flag', flag: 'walked:home' },
          { e: 'rel', who: 'rachel', axis: 'trust', delta: -3 },
          { e: 'rel', who: 'rachel', axis: 'tension', delta: 3 },
          { e: 'proof', kind: 'promise_kept', proofId: 'promise_kept:{chapter}:curfew-after-no', subjectHe: 'הפתק מתחת לכוס', noteHe: 'הלך אחרי "לא", וחזר בשעה.' },
          { e: 'remember', who: 'rachel', eventId: 'went-anyway-1991', significance: 'major' },
          { e: 'keep' },
          { e: 'ending', id: 'wall' },
        ],
      },
      {
        when: { all: [{ flag: 'derby:over' }, { flag: 'uss:arrived' }, { flag: 'permission:no' }, { flag: 'curfew:broken' }] },
        lines: [
          { who: 'רחל', text: 'אמרתי לא. ואחר כך גם השעה.' },
          { who: 'פוגי', text: 'הגג רעד. באמת רעד.' },
          { who: 'רחל', text: 'גם אני.' },
          { who: null, text: 'היא לא מסבירה מה זה אומר. היא מכבה את האור במטבח ונשארת לעמוד בחושך עוד רגע.' },
        ],
        then: [
          { e: 'flag', flag: 'walked:home' },
          { e: 'rel', who: 'rachel', axis: 'trust', delta: -10 },
          { e: 'rel', who: 'rachel', axis: 'tension', delta: 8 },
          { e: 'proof', kind: 'breach_discovered', proofId: 'breach_discovered:{chapter}:curfew', subjectHe: 'ה"לא" של אמא', noteHe: 'הלך אחרי "לא", ולא חזר בשעה.' },
          { e: 'remember', who: 'rachel', eventId: 'came-home-late-1991', significance: 'major' },
          { e: 'keep' },
          { e: 'ending', id: 'hall' },
        ],
      },
      {
        when: { all: [{ flag: 'derby:over' }, { flag: 'curfew:broken' }] },
        lines: [
          { who: 'פוגי', text: 'הגג רעד. באמת רעד.' },
          { who: 'רחל', text: 'ראיתי מה השעה.', closeUp: 'cuRachelWatch' },
          { who: 'פוגי', text: 'זה היה דרבי.' },
          { who: 'רחל', text: 'ראיתי מה השעה.' },
          { who: null, text: 'היא לא מרימה את הקול. היא אף פעם לא צריכה.' },
          { who: 'רחל', text: 'לך לישון. מחר בית ספר, ואתה קם ראשון.' },
        ],
        /**
         * ההפרה נרשמת כראיה, ולא רק כזיכרון של אדם.
         *
         * `came-home-late-1991` הוא מה ש**רחל** זוכרת; `breach_discovered` הוא מה
         * ש**הפנקס** מחזיק, ובלעדיו אין למה לחזור: `ACH_REPAIR` מצליב תיקון מול הפרה
         * **על אותו נושא**, ותיקון בלי הפרה רשומה הוא התנצלות על שום דבר. שתי השורות
         * יושבות זו ליד זו לנצח — התיקון לא מוחק את הערב הזה, וזה כל העניין.
         */
        then: [
          { e: 'flag', flag: 'walked:home' },
          { e: 'rel', who: 'rachel', axis: 'trust', delta: -8 },
          { e: 'rel', who: 'rachel', axis: 'tension', delta: 6 },
          { e: 'proof', kind: 'breach_discovered', proofId: 'breach_discovered:{chapter}:curfew', subjectHe: 'השעה שאמא אמרה', noteHe: 'המשחק עוד היה חי, והוא נשאר.' },
          { e: 'remember', who: 'rachel', eventId: 'came-home-late-1991', significance: 'major' },
          { e: 'keep' },
          { e: 'ending', id: 'hall' },
        ],
      },
      {
        when: { all: [{ flag: 'derby:over' }, { flag: 'curfew:kept' }] },
        lines: [
          { who: 'רחל', text: 'הספקת לראות עד הסוף?' },
          { who: 'פוגי', text: 'לא.' },
          { who: null, text: 'היא מסתכלת עליך שנייה אחת יותר מדי.' },
          { who: 'רחל', text: 'טוב.' },
          { who: null, text: 'זה כואב קצת. שניכם יודעים את זה.' },
        ],
        /**
         * הראיה נרשמת כאן, בדלת, ולא באולם — כי היא על מה שהוא עשה ולא על מה שהוא הרגיש.
         *
         * רחל נקבה בשעה, והשעה הגיעה בזמן שהמשחק עוד חי: זו התבנית של הבטחה במשחק הזה
         * (§B2), ומי שיצא קיים אותה. `promise_kept` היא ראיה בפנקס ולא ציון — היא לא
         * משנה שום מדד בשורה הזאת, והמספרים שמסביבה הם אותם מספרים שהיו כאן קודם.
         * הנושא נקוב במפורש כדי ש-`ACH_RELIABLE` יספור ארבע הבטחות **שונות** ולא ארבע
         * פעמים את אותה אחת.
         */
        then: [
          { e: 'flag', flag: 'walked:home' },
          { e: 'rel', who: 'rachel', axis: 'trust', delta: 10 },
          { e: 'proof', kind: 'promise_kept', proofId: 'promise_kept:{chapter}:curfew', subjectHe: 'השעה שאמא אמרה', noteHe: 'יצא מהאולם בשעה שהיא אמרה, והמשחק עוד היה חי.' },
          { e: 'remember', who: 'rachel', eventId: 'came-home-on-time-1991', significance: 'major' },
          { e: 'keep' },
          { e: 'ending', id: 'wall' },
        ],
      },
      {
        when: { all: [{ flag: 'derby:over' }, { notFlag: 'uss:arrived' }] },
        lines: [
          { who: 'רחל', text: 'נגמר?' },
          { who: 'פוגי', text: 'נגמר.' },
          { who: 'רחל', text: 'שמעתי מהרדיו של השכנים. כל הבניין שמע.' },
          { who: null, text: 'היא מכבה את האור במטבח והולכת לישון.' },
        ],
        then: [{ e: 'keep' }, { e: 'ending', id: 'missed' }],
      },

      // ---- the boss fight (§30) ------------------------------------------------------
      {
        when: { all: [{ flag: 'permission:yes' }, { beforeMinute: TIP_OFF }] },
        lines: [
          { who: 'רחל', text: 'בתשע וחצי אתה בבית. לא בתשע וארבעים.' },
          { who: 'פוגי', text: 'טוב.' },
          { who: 'רחל', text: 'תגיד "טוב" עוד פעם, ככה שאני אאמין לך.' },
          { who: 'פוגי', text: 'טוב!' },
        ],
      },
      {
        when: { all: [{ flag: 'permission:no' }, { beforeMinute: TIP_OFF }] },
        lines: [
          { who: 'רחל', text: 'אמרתי לא.' },
          { who: null, text: 'היא לא מוסיפה למה. יש ערבים שבהם אין למה.' },
        ],
      },
      {
        when: { flag: 'hw:done' },
        lines: [
          { who: 'רחל', text: 'שיעורים.' },
          { who: 'פוגי', text: 'עשיתי.' },
          { who: 'רחל', text: 'הכול?' },
          { who: 'פוגי', text: 'הכול.' },
          { who: null, text: 'היא הולכת לחדר, פותחת את המחברת, ומסתכלת בעמוד שלוש שניות בדיוק.' },
          { who: 'רחל', text: 'יש היום משחק, נכון.' },
        ],
        choices: [
          {
            id: 'ask',
            text: '"אפשר?"',
            then: [
              { e: 'flag', flag: 'asked:mum' },
              { e: 'flag', flag: 'permission:yes' },
              { e: 'rel', who: 'rachel', axis: 'trust', delta: 6 },
              { e: 'toast', text: 'רחל: "בתשע וחצי בבית. אני לא אומרת את זה פעמיים."', tone: 'red' },
            ],
          },
          {
            id: 'wait',
            text: 'לא לשאול. לחכות שהיא תגיד.',
            then: [
              { e: 'flag', flag: 'asked:mum' },
              { e: 'flag', flag: 'permission:yes' },
              { e: 'personality', key: 'stubbornness', delta: 4 },
              { e: 'toast', text: 'רחל: "לך כבר, לפני שאני מתחרטת. בתשע וחצי בבית."', tone: 'red' },
            ],
          },
        ],
      },
      {
        when: { any: [{ flag: 'hw:half' }, { flag: 'hw:faked' }] },
        lines: [
          { who: 'רחל', text: 'שיעורים.' },
          { who: 'פוגי', text: 'עשיתי.' },
          { who: null, text: 'היא הולכת לחדר. את המחברת היא לא פותחת — רק מסתכלת עליה מהדלת.' },
          { who: 'רחל', text: 'יש היום משחק.' },
          { who: 'פוגי', text: 'יש.' },
        ],
        choices: [
          {
            id: 'truth',
            text: '"לא גמרתי. אני אגמור מחר בבוקר."',
            then: [
              { e: 'flag', flag: 'asked:mum' },
              { e: 'flag', flag: 'permission:yes' },
              { e: 'rel', who: 'rachel', axis: 'trust', delta: 8 },
              { e: 'remember', who: 'rachel', eventId: 'told-the-truth-1991', significance: 'notable' },
              { e: 'toast', text: 'רחל: "בתשע וחצי. ובבוקר אתה קם לפני כולם וגומר."', tone: 'red' },
            ],
          },
          {
            id: 'push',
            text: '"גמרתי, נשבע."',
            then: [
              { e: 'flag', flag: 'asked:mum' },
              { e: 'flag', flag: 'permission:no' },
              { e: 'rel', who: 'rachel', axis: 'tension', delta: 6 },
              { e: 'remember', who: 'rachel', eventId: 'lied-about-homework-1991', significance: 'notable' },
              { e: 'toast', text: 'רחל: "אז אתה גם לא צריך ללכת לשום מקום. לא הערב."', tone: 'red' },
            ],
          },
        ],
      },
      {
        lines: [
          { who: 'רחל', text: 'שיעורים.' },
          { who: 'פוגי', text: 'יש היום משחק.' },
          { who: 'רחל', text: 'יופי.' },
          { who: null, text: 'שתיקה.' },
          { who: 'רחל', text: 'שיעורים.' },
        ],
        then: [{ e: 'flag', flag: 'hw:given' }],
      },
    ],
  },
  {
    id: 'kobi-1991',
    nameHe: 'קובי',
    branches: [
      {
        when: { all: [{ flag: 'permission:no' }, { relationship: { who: 'kobi', axis: 'bond', min: 45 } }] },
        lines: [
          { who: 'קובי', text: 'שמעתי.' },
          { who: 'פוגי', text: 'היא אמרה לא.' },
          { who: 'קובי', text: 'היא אמרה לא כי אמרת לה משהו שהיא ידעה שהוא לא נכון.' },
          { who: null, text: 'הוא מקפל את העיתון על הברך ומניח אותו בצד.' },
          { who: 'קובי', text: 'אני לא אדבר בשבילך. אבל אם תלך אליה ותגיד את זה בלי לשקר — אני לא אפריע.' },
        ],
        then: [{ e: 'flag', flag: 'kobi:nudged' }, { e: 'rel', who: 'kobi', axis: 'trust', delta: 4 }],
      },
      {
        when: { beforeMinute: TIP_OFF },
        lines: [
          { who: 'קובי', text: 'כדורסל זה לא אותו דבר.' },
          { who: 'פוגי', text: 'זה אותה קבוצה.' },
          { who: 'קובי', text: 'זה אותה קבוצה.' },
          { who: null, text: 'הוא לא מרים את העיניים מהעיתון. אבל הוא אמר את זה פעמיים.' },
        ],
        then: [{ e: 'redheart', key: 'familyTradition', delta: 3 }],
      },
      {
        lines: [
          { who: 'קובי', text: 'נו? היה?' },
          { who: 'פוגי', text: 'היה.' },
          { who: 'קובי', text: 'אז היה.' },
        ],
      },
    ],
  },
  {
    id: 'kitchen-note-1991',
    branches: [
      {
        when: { flag: 'sneak:ready' },
        lines: [{ who: null, text: 'הפתק שלך על השולחן, מתחת לכוס ההפוכה. "חוזר בעשר. פוגי."' }],
      },
      /**
       * לא לשאול בכלל — the intentional non-request (design pass v2 §7 1991).
       *
       * The pad used to offer the note only to a boy who had been told no. A boy who
       * decided not to ask — because he knew the answer, or because he did not want to
       * hear it — had no way to leave a word behind, and after seven the front door told
       * him "אמא אמרה לא" about a conversation that never happened. Not asking is a choice
       * the evening remembers (`sneak:unasked`), not a gap in it.
       */
      {
        when: { none: [{ flag: 'asked:mum' }, { flag: 'permission:yes' }, { flag: 'permission:no' }], afterMinute: RACHEL_HOME_91 },
        lines: [
          { who: null, text: 'שולחן המטבח. פנקס ועיפרון. אמא בסלון, ואתה עוד לא שאלת אותה כלום.' },
          { who: null, text: 'אפשר לכתוב שורה ולצאת בלי לשאול. אפשר גם ללכת אליה.' },
        ],
        choices: [
          {
            id: 'note-unasked',
            text: 'לכתוב "הלכתי לאוסישקין. חוזר בעשר." ולצאת.',
            then: [
              { e: 'flag', flag: 'sneak:ready' },
              { e: 'flag', flag: 'sneak:unasked' },
              { e: 'personality', key: 'independence', delta: 4 },
              { e: 'personality', key: 'riskTolerance', delta: 4 },
              { e: 'wellbeing', key: 'stress', delta: 5 },
              { e: 'toast', text: 'הפתק מתחת לכוס. לא שאלת — אז גם לא אמרו לך לא.', tone: 'plain' },
            ],
          },
          { id: 'go-ask', text: 'להשאיר את הפנקס. ללכת לשאול.', then: [{ e: 'toast', text: 'היא בסלון. הדלת פתוחה.', tone: 'plain' }] },
        ],
      },
      {
        when: { flag: 'permission:no' },
        lines: [
          { who: null, text: 'שולחן המטבח. עיפרון, ופנקס שאמא כותבת בו רשימות של מכולת.' },
          { who: null, text: 'אפשר לכתוב ולצאת. אפשר גם לא לצאת.' },
        ],
        choices: [
          {
            id: 'note',
            text: 'להשאיר פתק ולצאת.',
            then: [
              { e: 'flag', flag: 'sneak:ready' },
              { e: 'personality', key: 'riskTolerance', delta: 6 },
              { e: 'wellbeing', key: 'stress', delta: 8 },
              { e: 'toast', text: 'כתבת "חוזר בעשר" ושמת מתחת לכוס. סגרת את הדלת בשתי ידיים, שלא תעשה קול.', tone: 'plain' },
            ],
          },
          {
            id: 'stay',
            text: 'להשאיר את זה. להישאר.',
            then: [
              { e: 'flag', flag: 'night:home' },
              { e: 'personality', key: 'responsibility', delta: 6 },
              { e: 'toast', text: 'החזרת את העיפרון למקום שלו בפנקס. הערב הזה קורה בלעדיך.', tone: 'plain' },
            ],
          },
        ],
      },
      {
        lines: [{ who: null, text: 'שולחן המטבח. פנקס, עיפרון, וכוס הפוכה על מגבת.' }],
      },
    ],
  },

  // ============================================================== outside the hall ==
  /**
   * ------------------------------------------- 11.3.1991 · מי שבזכותו אתה פה ---
   *
   * The chapter the Stage B brief calls the Ussishkin initiation (§7 B2) had none of the
   * people it is about: Efi, who invited him; Limor, who knows which door; Shachor, who
   * needs hands. All three entered the game two years later, in 1993, fully formed, as if
   * the boy had met them off-screen. A player finished the initiation without meeting a
   * single member of the branch he was being initiated into.
   *
   * They are here now, on the pavement outside, an hour before tip-off. Nothing they offer
   * is free: the side door costs a lie or an admission, the crates cost twenty minutes of a
   * night with a curfew in it (§11 — no route attends everything without paying), and both
   * are remembered in 1993 by people who were standing here.
   */
  {
    id: 'efi-1991',
    nameHe: 'אפי',
    branches: [
      /**
       * מי שאמר "כדורסל זה לבנות" — seven years later, and Efi has not forgotten.
       *
       * Stage A §7 asks that skipping the branch cost something real. This is the cost: not
       * a locked door, but a boy who took you in anyway and mentions, once, that he asked
       * you first and you laughed. `relationshipMemory` is the right test rather than a
       * flag, because it is a thing a PERSON remembers about you.
       */
      {
        when: { relationshipMemory: { who: 'efi', eventId: 'said-that-in-1984' } },
        lines: [
          { who: 'אפי', text: 'באת. אחרי שבע שנים.' },
          { who: 'אפי', text: 'שאלתי אותך פעם, ברחוב שלך. אמרת שזה לבנות.' },
          { who: null, text: 'הוא לא אמר את זה ברוגז. הוא אמר את זה כמו מישהו שסופר.' },
        ],
        then: [{ e: 'rel', who: 'efi', axis: 'bond', delta: 2 }, { e: 'wellbeing', key: 'regret', delta: 3 }],
      },
      {
        when: { flag: 'uss:arrived' },
        lines: [{ who: 'אפי', text: 'אמרתי לך. עכשיו תשתוק ותסתכל.' }],
      },
      {
        when: { flag: 'derby:over' },
        lines: [
          { who: 'אפי', text: 'נו? עכשיו אתה מבין למה אני לא הולך לכדורגל בחורף.' },
          { who: null, text: 'הוא צחק. הקול שלו היה גמור.' },
        ],
        then: [{ e: 'rel', who: 'efi', axis: 'bond', delta: 3 }],
      },
      {
        lines: [
          { who: 'אפי', text: 'באת. חשבתי שאמא שלך לא תיתן.' },
          { who: 'אפי', text: 'תשמע — לימור פה, ולימור יודעת דברים. אם היא אומרת לך מאיפה להיכנס, תיכנס משם.' },
        ],
        choices: [
          {
            id: 'came',
            text: '"אמרתי לך שאני בא."',
            then: [
              { e: 'rel', who: 'efi', axis: 'bond', delta: 3 },
              { e: 'flag', flag: 'life:efi:kept-1991' },
              { e: 'redheart', key: 'basketballLove', delta: 3 },
            ],
          },
          {
            id: 'unasked',
            text: '"לא שאלתי אותה."',
            when: { flag: 'sneak:unasked' },
            hidden: true,
            then: [
              { e: 'rel', who: 'efi', axis: 'sharedHistory', delta: 3 },
              { e: 'flag', flag: 'life:efi:kept-1991' },
              { e: 'toast', text: '"חכם. מה שלא שואלים, לא אומרים לך לא." הוא לא נשמע בטוח שזה חכם.', tone: 'plain' },
            ],
          },
          {
            id: 'sneaked',
            text: '"היא לא נתנה."',
            when: { flag: 'sneak:ready', notFlag: 'sneak:unasked' },
            hidden: true,
            then: [
              { e: 'rel', who: 'efi', axis: 'sharedHistory', delta: 4 },
              { e: 'flag', flag: 'life:efi:kept-1991' },
              { e: 'toast', text: 'הוא לא אמר "אתה משוגע". הוא אמר "אז בוא נזוז" ולקח אותך בשרוול.', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'limor-1991',
    nameHe: 'לימור',
    branches: [
      {
        when: { flag: 'knows:side' },
        lines: [{ who: 'לימור', text: 'מהצד, אמרתי. ואל תעמוד מתחת לחור בגג, אלא אם אתה אוהב לחזור רטוב.' }],
      },
      {
        lines: [
          { who: 'לימור', text: 'פעם ראשונה? רואים.' },
          { who: 'לימור', text: 'יש כניסה מהצד. בחזית התור לוקח חצי שעה, ובחצי שעה הזאת מתחילים.' },
        ],
        choices: [
          {
            id: 'admit',
            text: '"אני לא יודע כלום פה."',
            then: [
              { e: 'flag', flag: 'knows:side' },
              // `life:` — the day flag dies at the chapter cut, and this is the fact she
              // remembers him by in 1993
              { e: 'flag', flag: 'life:limor:honest-1991' },
              { e: 'rel', who: 'crowd-limor', axis: 'trust', delta: 4 },
              { e: 'personality', key: 'reliability', delta: 2 },
              { e: 'toast', text: '"יופי. מי שיודע הכל אף פעם לא לומד." היא רשמה משהו בפנקס.', tone: 'plain' },
            ],
          },
          {
            id: 'pretend',
            text: '"אני מכיר. באתי כבר."',
            then: [
              { e: 'rel', who: 'crowd-limor', axis: 'distance', delta: 3 },
              { e: 'personality', key: 'impulsiveness', delta: 2 },
              { e: 'time', minutes: 25 },
              { e: 'toast', text: 'היא לא תיקנה אותך. עמדת בתור בחזית עשרים וחמש דקות והיא עברה לידך פנימה.', tone: 'red' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'shachor-1991',
    nameHe: 'שחור',
    branches: [
      {
        when: { flag: 'helped:crates-1991' },
        lines: [{ who: 'שחור', text: 'טוב. עכשיו תיכנס לפני שהם מתחילים.' }],
      },
      {
        lines: [
          { who: 'שחור', text: 'ילד. שני ארגזים, מהאוטו לדלת. זה הכל.' },
          { who: null, text: 'הוא לא ביקש. הוא הניח את זה בין המשפטים, כמו מישהו שמניח שתעשה.' },
        ],
        choices: [
          {
            id: 'help',
            text: 'לסחוב.',
            // (implementation pass 27.9.2026, B2 S3) carried, not said: `chore:story:crates-91`
            then: [{ e: 'minigame', id: 'chore:story:crates-91' }],
          },
          {
            id: 'later',
            text: '"אני ממהר."',
            then: [
              { e: 'rel', who: 'shachor', axis: 'distance', delta: 2 },
              { e: 'toast', text: 'הוא הרים את שני הארגזים לבד. לא הסתכל אחורה.', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'usher-night',
    nameHe: 'סדרן',
    branches: [
      {
        when: { flag: 'derby:over' },
        lines: [
          { who: 'סדרן', text: 'לילה טוב, פוגי.', closeUp: 'cuUsherNight' },
          { who: null, text: 'הוא אף פעם לא שאל איך קוראים לך. הוא פשוט יודע.' },
        ],
        then: [{ e: 'redheart', key: 'community', delta: 5 }],
      },
      {
        when: { flag: 'uss:arrived' },
        lines: [
          { who: 'סדרן', text: 'פנימה, פנימה. ליד המדרגה, לא על המדרגה.' },
          { who: null, text: 'הוא אומר את זה לכל מי שנכנס. אף אחד לא מקשיב, כולל אתה.' },
        ],
      },
      {
        lines: [
          { who: 'סדרן', text: 'יש קבוצות שנכנסות לפה כבר מובסות, עוד לפני הקפיצה. ככה זה כאן.' },
          { who: 'סדרן', text: 'תיכנס מוקדם אם אתה רוצה לראות משהו. אחר כך זה קיר של אנשים.' },
        ],
        then: [{ e: 'flag', flag: 'knows:early' }],
      },
    ],
  },
  {
    id: 'uss-queue',
    branches: [
      {
        lines: [
          { who: null, text: 'תור קצר וצפוף, וריח של נקניקיות וסיגריות. אף אחד פה לא באמת עומד בתור.' },
          { who: 'אוהד', text: 'מה קורה פוגי.' },
          { who: null, text: 'אתה לא יודע איך קוראים לו. הוא יודע איך קוראים לך. ככה זה כאן.' },
        ],
        then: [{ e: 'redheart', key: 'community', delta: 4 }, { e: 'flag', flag: 'uss:known' }],
      },
    ],
  },

  // ================================================================ inside the hall ==
  {
    id: 'amit-hall',
    nameHe: 'עמית',
    branches: [
      {
        when: { flag: 'spot:lost' },
        lines: [
          { who: 'עמית', text: 'איפה היית?' },
          { who: 'פוגי', text: 'הלכתי רגע.' },
          { who: 'עמית', text: 'רגע.' },
          { who: null, text: 'עכשיו אתם עומדים מאחורי גב אחד גדול, ורואים חצי מגרש. זה המקום שלכם הערב.' },
        ],
        then: [{ e: 'bond', who: 'amit', delta: -2 }, { e: 'wellbeing', key: 'happiness', delta: -4 }],
      },
      {
        when: { flag: 'spot:held' },
        lines: [
          { who: 'עמית', text: 'שמרת.' },
          { who: 'פוגי', text: 'שמרתי.' },
          { who: 'עמית', text: 'אתה בסדר.' },
          { who: null, text: 'זה כל מה שהוא אומר, וזה מספיק לכל הערב.' },
        ],
        then: [{ e: 'bond', who: 'amit', delta: 6 }, { e: 'redheart', key: 'community', delta: 5 }],
      },
      {
        when: { flag: 'spot:asked' },
        lines: [
          { who: 'עמית', text: 'אני חוזר עוד רגע. אל תזוז מהמקום, שנייה אחת לא.' },
          { who: null, text: 'הוא נעלם בין האנשים. המדרגה ריקה מצד אחד ומתמלאת מהצד השני.' },
        ],
      },
      {
        lines: [
          { who: 'עמית', text: 'זה המקום. מכאן רואים את כל הפרקט חוץ מהפינה.' },
          { who: 'עמית', text: 'אני הולך להביא משהו לאכול. תשמור.' },
          { who: null, text: 'הוא לא מחכה לתשובה.' },
        ],
        then: [{ e: 'flag', flag: 'spot:asked' }],
      },
    ],
  },
  {
    id: 'hall-spot',
    branches: [
      {
        when: { flag: 'spot:held' },
        lines: [{ who: null, text: 'המקום שלכם. שני זוגות רגליים על מדרגה אחת, וזה בסדר גמור.' }],
      },
      {
        when: { flag: 'spot:asked' },
        lines: [
          { who: null, text: 'המדרגה. אתה תופס כמה שיותר מקום, כמה שילד בן שתים־עשרה יכול לתפוס.' },
          { who: null, text: 'מישהו נדחף בכתף. אתה לא זז. הוא מוצא לעצמו מקום אחר.' },
        ],
        then: [
          { e: 'flag', flag: 'spot:held' },
          { e: 'personality', key: 'stubbornness', delta: 5 },
          { e: 'toast', text: 'שמרת על המקום. הכתף כואבת קצת, וזה שווה את זה.', tone: 'plain' },
        ],
      },
      {
        lines: [
          { who: null, text: 'מדרגת בטון, שחוקה באמצע מרגליים. מעליך גג פח שנוטף כשיורד גשם, ואף אחד לא זז בגללו.' },
        ],
      },
    ],
  },
  {
    id: 'hall-vendor',
    nameHe: 'מוכר',
    branches: [
      {
        when: { flag: 'bought:food' },
        lines: [{ who: 'מוכר', text: 'קנית כבר. לך תפוס מקום, ילד, עוד מעט מתחילים.' }],
      },
      {
        when: { minAgorot: 300 },
        lines: [
          { who: 'מוכר', text: 'נקניקייה, גרעינים, שתייה. מה שנשאר.' },
          { who: null, text: 'הריח של הגריל נכנס לך לחולצה ויישאר שם עד מחר בבוקר.' },
        ],
        choices: [
          {
            id: 'buy',
            text: 'לקנות משהו חם.',
            then: [
              { e: 'money', agorot: -300, why: 'בקיוסק של האולם' },
              { e: 'flag', flag: 'bought:food' },
              { e: 'give', item: 'wrapper' },
              { e: 'time', minutes: 8 },
              { e: 'wellbeing', key: 'happiness', delta: 6 },
            ],
          },
          {
            id: 'phone',
            text: '"יש לך טלפון?"',
            when: { flag: 'permission:yes' },
            noteHe: 'רק אם יש למי להתקשר.',
            then: [
              { e: 'flag', flag: 'told:home' },
              { e: 'time', minutes: 6 },
              { e: 'rel', who: 'rachel', axis: 'trust', delta: 5 },
              { e: 'toast', text: 'הוא מסובב אליך את הטלפון של המזנון. שני צלצולים, ואמא עונה. אמרת איפה אתה.', tone: 'plain' },
            ],
          },
          { id: 'no', text: 'לא עכשיו.', then: [] },
        ],
      },
      {
        lines: [
          { who: 'מוכר', text: 'בלי כסף אין כלום, ילד. לעמוד ליד ולהריח — בחינם.' },
          { who: null, text: 'אתה עומד ליד ומריח.' },
        ],
      },
    ],
  },
  {
    id: 'hall-rail',
    branches: [
      {
        lines: [
          { who: null, text: 'מעקה ברזל בקצה המדרגה, קר וחלק מאלף ידיים.' },
          { who: null, text: 'מכאן עד הקו הלבן פחות ממטר. מי שמחליק על הקו נופל כמעט לתוך הידיים שלך.' },
        ],
        then: [{ e: 'redheart', key: 'basketballLove', delta: 4 }],
      },
    ],
  },
  {
    id: 'hall-clock',
    branches: [
      {
        when: { afterMinute: CURFEW },
        lines: [
          { who: null, text: 'השעון על הקיר. אתה מסתכל עליו ומיד חוזר למגרש, כאילו זה יעזור.' },
        ],
        then: [{ e: 'wellbeing', key: 'stress', delta: 5 }],
      },
      {
        lines: [{ who: null, text: 'שעון קיר עגול מעל הדלת. המחוג הגדול קופץ, לא זז.' }],
      },
    ],
  },

  // ---------------------------------------------------------------- the derby beats --
  // Started by the director (`derby1991.ts`), never by a hotspot: these are moments the
  // night produces, and a moment you can walk up to and press is not a moment.
  {
    id: 'derby:chant',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'מישהו מתחיל, שתי מדרגות מעליך. אחר כך עוד שניים. אחר כך כל הצד הזה.' },
          { who: 'אופיר', text: 'זה מה שאני שר!' },
          { who: 'פוגי', text: 'אלה לא המילים!' },
          { who: 'אוהד ותיק', text: 'שניכם שרים לא נכון, ובקול.' },
        ],
        choices: [
          {
            id: 'join',
            text: 'לשיר. חזק, גם אם לא נכון.',
            then: [
              { e: 'flag', flag: 'chant:joined' },
              { e: 'redheart', key: 'terraceCulture', delta: 8 },
              { e: 'wellbeing', key: 'belonging', delta: 8 },
              { e: 'toast', text: 'עד סוף השורה כולכם שרים את אותו הדבר. בערך.', tone: 'red' },
            ],
          },
          {
            id: 'help',
            text: 'ללחוש לאופיר את המילים.',
            then: [
              { e: 'flag', flag: 'chant:helped' },
              { e: 'bond', who: 'ofir', delta: 5 },
              { e: 'redheart', key: 'community', delta: 6 },
              { e: 'toast', text: 'אתה לוחש לו. הוא חוזר אחריך בקול רם מדי. הוותיק מרים גבה ולא מתקן.', tone: 'plain' },
            ],
          },
          {
            id: 'clap',
            text: 'רק למחוא כפיים.',
            then: [
              { e: 'flag', flag: 'chant:quiet' },
              { e: 'wellbeing', key: 'belonging', delta: 3 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'derby:curfew',
    nameHe: null,
    branches: [
      {
        when: { flag: 'told:home' },
        lines: [
          { who: null, text: 'תשע וחצי. אתה יודע את זה בלי להסתכל על השעון.' },
          { who: null, text: 'התקשרת, אמרת איפה אתה. זה עדיין אסור. זה רק אומר שסיפרת.' },
        ],
      },
      {
        lines: [
          { who: null, text: 'תשע וחצי. השעה שהיא אמרה, והמשחק עוד חי.' },
          { who: 'אופיר', text: 'מה, אתה הולך עכשיו?' },
          { who: null, text: 'הדלת מאחוריך. המגרש לפניך. אף אחד כאן לא יבחר בשבילך.' },
        ],
        then: [{ e: 'wellbeing', key: 'stress', delta: 6 }],
      },
    ],
  },
  {
    id: 'derby:friend',
    nameHe: 'אופיר',
    branches: [
      {
        when: { flag: 'curfew:now' },
        lines: [
          { who: 'אופיר', text: 'אמא שלך אמרה שעה?' },
          { who: 'פוגי', text: 'אמרה.' },
          { who: 'אופיר', text: 'אז זה עניין שלך, לא שלי.' },
          { who: null, text: 'הוא לא מנסה לשכנע אותך להישאר. זה מה שהופך את זה לקשה.' },
        ],
      },
      {
        lines: [
          { who: 'אופיר', text: 'תראה את זה. תראה!' },
          { who: null, text: 'אתה לא מספיק לראות מה. כולם קמים באותו רגע, וגם אתה, ואתה צועק עם כולם.' },
        ],
        then: [{ e: 'wellbeing', key: 'happiness', delta: 5 }],
      },
    ],
  },

  // ================================================================ the way home =====
  /**
   * הרחוב בלילה — ומה שהוסר ממנו כשהוא קיבל סוף סוף דלת.
   *
   * השיחה הזאת נכתבה לפני `wallBeat` ב-`WorldScene` ועמדה בלי שאיש יפתח אותה. עכשיו יש
   * לה נקודה חמה ברחוב אחרי שריקת הפתיחה — ו-`then` הוסר משני הענפים, בכוונה: הרגע של
   * לשמוע את הקיר כבר שולם במלואו (`basketballLove +8`, `loyaltyReturn +6`) ברגע
   * ש-`heard:wall` הורם, וכפילות של `loyaltyReturn` הייתה משלמת פעמיים על אותו ערב.
   * **מבט שאפשר לחזור עליו אינו משלם.** מה שנשאר הוא מה שהיה שווה להציל כאן — הכתיבה.
   */
  {
    id: 'street-night-1991',
    branches: [
      {
        when: { flag: 'heard:wall' },
        lines: [
          { who: null, text: 'רחוב ריק, ורוח קרה מהירקון. מאחוריך, מבעד לקיר, גל של קול עולה ונשבר ועולה שוב.' },
          { who: null, text: 'אתה עומד. אתה לא חוזר. אתה גם לא ממשיך ללכת.' },
        ],
      },
      {
        lines: [
          { who: null, text: 'הרחוב בלילה קצר יותר מהרחוב ביום. אותו רחוב בדיוק.' },
        ],
      },
    ],
  },
]
