import { at } from '../clock'
import { KOBI_LEAVES } from '../world/scenes'

import { CONVERSATIONS_1990 } from './dialogue1990'
import { CONVERSATIONS_1991 } from './dialogue1991'
import { CONVERSATIONS_ALLENBY } from './dialogueAllenby'
import { CONVERSATIONS_USSISHKIN } from './dialogueUssishkin'
import { CONVERSATIONS_BLOOMFIELD } from './dialogueBloomfield'
import { CONVERSATIONS_PANORAMAS } from './dialoguePanoramas'
import { CONVERSATIONS_1993 } from './chapter1993cup'
import { CONVERSATIONS_GALIL } from './chapter1993galil'
import { CONVERSATIONS_SINAI } from './chapter1995sinai'
// the world and its conversations on the same source: scenes.ts exposes kobi-gate7,
// barry-gate7, asaf-gate5, a3-bus and the winter people, and they all live here
import { CONVERSATIONS_ARMY } from './chapter1996army'
import { CONVERSATIONS_HALL } from './chapter1997basket'
import { CONVERSATIONS_LACES } from './chapter1998laces'
import { CONVERSATIONS_SEED } from './chapter1999basket'
import { CONVERSATIONS_CUP99 } from './chapter1999cup'
import { CONVERSATIONS_DOUBLE, CONVERSATIONS_TITLE } from './chapter2000double'
import { CONVERSATIONS_BRIDGE } from './chapter2000bridge'
import { CONVERSATIONS_EUROPE } from './chapter2002europe'
import { CONVERSATIONS_HOME } from './chapter2006home'
import { CONVERSATIONS_FOUNDING } from './chapter2007founding'
import { CONVERSATIONS_2010 } from './chapter2010double'
import { CONVERSATIONS_CHAMPIONS } from './chapter2010champions'
import { CONVERSATIONS_GROWTH } from './chapter2012growth'
import { CONVERSATIONS_NEWHALL } from './chapter2015newhall'
import { CONVERSATIONS_COLLAPSE } from './chapter2016collapse'
import { CONVERSATIONS_RETURN } from './chapter2018return'
import { CONVERSATIONS_LATE } from './chapter2023late'
import { CONVERSATIONS_HOME24 } from './chapter2024home'
import { CONVERSATIONS_FINALE } from './chapter2026finale'
import { CONVERSATIONS_FAMILY } from './chapter2011family'
import { CONVERSATIONS_PROMISES } from './chapter2021promises'
import { CONVERSATIONS_WINDOWS } from './chapterWindows'
import { CONVERSATIONS_TEAM } from './chapterTeam'
import { CONVERSATIONS_CAREER } from './chapterCareer'
import { CONVERSATIONS_FRIENDS } from './chapterFriends'
import { CONVERSATIONS_ABROAD } from './chapterAbroad'
import { CONVERSATIONS_ROOMS2000 } from './rooms2000Looks'
import { CONVERSATIONS_BATYA } from './batya'
import { CONVERSATIONS_OWNER } from './chapterOwner'
import { CONVERSATIONS_COMBOS } from './chapterCombos'
import { CONVERSATIONS_MATCH } from './dialogueMatch'
import { CONVERSATIONS_A1, CONVERSATIONS_A2, CONVERSATIONS_A3, CONVERSATIONS_A4, CONVERSATIONS_A5, CONVERSATIONS_A6, CONVERSATIONS_A7 } from './chapterStageA'
import { gigConversations } from '../gigs'
import { CONVERSATIONS_ACTIVITIES } from './dialogueActivities'
import { CONVERSATIONS_MISSIONS } from './dialogueMissions'
import { CONVERSATIONS_ROUTES } from './routes'
import { fanShops } from '../shirts'
import type { ChoiceDef, Conversation } from './script'
import { CONVERSATIONS_MORNING_86, CONVERSATIONS_SCARF } from './threads'

/** (pass 28.9.2026) Efi's hall, offered to a boy who has already been inside (A3) */
const EFI_HALL_KNOWN: ChoiceDef[] = [
  { id: 'go', text: 'בוא נלך.', then: [{ e: 'seize', opportunity: 'efi-hall' }, { e: 'goto', node: 'efi-hall-after' }] },
  { id: 'no', text: 'היום יש משחק.', when: { flag: 'knows:match' }, noteHe: 'צריך לדעת שיש היום משחק', then: [{ e: 'redheart', key: 'footballLove', delta: 5 }, { e: 'rel', who: 'efi', axis: 'distance', delta: 4 }, { e: 'toast', text: '"היום זה שלך," הוא אמר. "בשבוע הבא — שלי." הוא לא נעלב.', tone: 'plain' }] },
  { id: 'later', text: 'אולי אחר כך.', then: [] },
]

/**
 * שבת אחת ב-1986 — the chapter's words.
 *
 * Written to brief §7: dialogue supports the game, it is not the game. Nothing here
 * hands out a quest, nothing prints a number, and no line tells the player where to go.
 * Kobi says there is a match; the street fills with people walking one way; the child
 * works out the rest. That is the difference between a life and a menu.
 *
 * And nothing here states a historical fact — see the note in `script.ts`.
 */

const CONVERSATIONS: Conversation[] = [
  // ---------------------------------------------------------------- the bedroom ----
  {
    id: 'bed',
    branches: [
      {
        // The day can also simply end. Brief §26: there is no Game Over, there is a
        // Saturday you were not at. Going to bed is a real choice with a real ending.
        when: { flag: 'match:over', notFlag: 'found:kobi' },
        lines: [
          { who: null, text: 'המיטה. בחוץ צפירות של מכוניות, רחוק, ואבא עוד לא חזר.' },
          { who: null, text: 'השמיכה קרה מהצד של הקיר. אפשר לחכות לו ער. אפשר גם לישון.' },
        ],
        choices: [
          { id: 'sleep', text: 'לישון', then: [{ e: 'ending', id: 'missed' }] },
          { id: 'wait', text: 'לחכות לו ער', then: [] },
        ],
      },
      { lines: [{ who: null, text: 'המיטה שלך. השמיכה עוד חמה מהלילה, והכרית מריחה כמו סבון כביסה.' }] },
    ],
  },
  {
    id: 'window',
    branches: [
      {
        when: { afterMinute: KOBI_LEAVES },
        lines: [
          { who: null, text: 'מהחלון: הרחוב, ובו אנשים שהולכים מזרחה. אחד מהם מחזיק טרנזיסטור צמוד לאוזן.' },
          { who: null, text: 'אף אחד לא הולך הביתה. כולם לאותו צד.' },
        ],
        then: [{ e: 'trait', trait: 'knowledge', delta: 2 }],
      },
      {
        lines: [
          { who: null, text: 'שבת בצהריים. חתול על גדר, מכונית אחת, וכביסה על כל מרפסת.' },
          { who: null, text: 'את הרחוב הזה אתה מכיר לפי הקולות, גם בעיניים עצומות.' },
        ],
      },
    ],
  },
  {
    id: 'poster',
    branches: [
      {
        lines: [
          { who: null, text: 'פוסטר אדום על הקיר. קרעת אותו מעמוד חשמל ברחוב סלמה, והדבק עוד דביק מאחורה.' },
          { who: null, text: 'משה סיני, ידיים על המותניים, מסתכל על משהו שנמצא מחוץ לתמונה.' },
          { who: null, text: 'אבא אמר שלא תולים בבית דברים שמצאת ברחוב. אמא אמרה שזה נשאר.' },
          { who: null, text: 'לפעמים הוא עומד מולה בלילה, כשהוא חושב שאתה ישן.' },
        ],
        then: [
          { e: 'trait', trait: 'footballAffinity', delta: 3 },
          { e: 'flag', flag: 'knows:sinai' },
        ],
      },
    ],
  },
  {
    id: 'poster-cup',
    branches: [
      {
        lines: [
          { who: null, text: 'ליד המיטה, בגובה העיניים כששוכבים: מחזיקת הגביע. אחת־עשרה חולצות אדומות בשורה אחת.' },
          { who: null, text: 'למטה כתוב "פוסטר למזכרת", כאילו מישהו חשב שאפשר לשכוח.' },
        ],
        then: [
          { e: 'doc', art: 'docPosterCup', captionHe: 'פוסטר למזכרת — הפועל תל אביב מחזיקת גביע המדינה. מהאוסף של צוות The Worker.' },
          { e: 'redheart', key: 'footballLove', delta: 1 },
        ],
      },
    ],
  },
  {
    id: 'desk',
    branches: [
      {
        when: { notFlag: 'has:key' },
        lines: [
          { who: null, text: 'במגירה: עיפרון, גומייה שהתייבשה, ומפתח על שרוך נעליים.' },
          { who: null, text: 'אמא קושרת לך אותו על הצוואר כשאתה יוצא לבד, ומכניסה אותו מתחת לחולצה.' },
        ],
        then: [
          { e: 'give', item: 'house-key' },
          { e: 'flag', flag: 'has:key' },
          { e: 'toast', text: 'מפתח הבית' },
        ],
      },
      { lines: [{ who: null, text: 'מגירה פתוחה, עיפרון שבור, וקצת חול שנכנס מהחלון.' }] },
    ],
  },
  /**
   * הקופסה האדומה — שתי שיחות, כי יש לה שני מקומות (`scenes.ts`, `redbox` ו-`redbox-shelf`).
   *
   * **"לפתוח" פותח אותה** (`{ e: 'box' }`). עד 21.9.2026 הבחירה הרימה את `open:redbox`
   * ולא קרה כלום על המסך; והענף הראשון נפתח ב-`memory:first`, דגל יום, כך שב-1990 הקופסה
   * הייתה אומרת "ריקה" לילד שכבר שם בה את 1986. מה שבתוכה נקרא עכשיו מהמצב, והקופסה
   * עצמה אומרת כשהיא ריקה.
   */
  {
    id: 'redbox',
    branches: [
      {
        lines: [
          { who: null, text: 'קופסת הפח האדומה, מתחת למיטה. הציר חורק, כמו תמיד.' },
        ],
        choices: [
          { id: 'open', text: 'לפתוח את הקופסה', then: [{ e: 'flag', flag: 'open:redbox' }, { e: 'box' }] },
          { id: 'shut', text: 'להשאיר סגורה', then: [] },
        ],
      },
    ],
  },
  {
    id: 'redbox-shelf',
    branches: [
      {
        lines: [
          { who: null, text: 'הקופסה על המדף, בין הקלטות. היא עברה איתך כל עשור, ועוד לא נגמר בה המקום.' },
        ],
        choices: [
          { id: 'open', text: 'להוריד אותה ולפתוח', then: [{ e: 'flag', flag: 'open:redbox' }, { e: 'box' }] },
          { id: 'shut', text: 'להשאיר על המדף', then: [] },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------- the home ----
  {
    id: 'kobi-morning',
    nameHe: 'קובי',
    branches: [
      {
        // He has already said no once, and the child has come back. What happens now
        // depends on the relationship — not on a persuasion check the player can see.
        when: { flag: 'asked:ticket', bond: { who: 'kobi', min: 66 } },
        lines: [
          { who: 'קובי', text: 'שוב אתה.' },
          { who: null, text: 'הוא מקפל את העיתון לחצי ומנמיך את הרדיו, וזה לוקח לו יותר מדי זמן.' },
          { who: 'קובי', text: 'לא היום. קח, תקנה לך גזוז אצל רפי. ולהיות בבית.' },
        ],
        then: [
          { e: 'money', agorot: 500, why: 'קובי' },
          { e: 'flag', flag: 'kobi:softened' },
          { e: 'bond', who: 'kobi', delta: 3 },
          { e: 'toast', text: 'קובי נתן לך 5 ₪' },
        ],
      },
      /**
       * (pass 28.9.2026, brief §7→§8) the lie from last Saturday meets its morning: he did
       * talk to Ofir's father. Nothing is said about it twice; the boy is let go on the
       * same terms as any other no — and the reunion in the stand knows (`kobi-found`
       * reads `lied:rachel`; this one is `life:a7:lied`).
       */
      {
        when: { flag: 'life:a7:lied', none: [{ flag: 'kobi:lie-met' }] },
        lines: [
          { who: 'קובי', text: 'דיברתי עם אבא של אופיר.' },
          { who: null, text: 'הוא לא מוסיף כלום. הוא הופך דף בעיתון, והדף רועש.' },
          { who: 'קובי', text: 'הוא עובד היום. אבל אתה ידעת את זה.' },
        ],
        then: [{ e: 'flag', flag: 'kobi:lie-met' }, { e: 'rel', who: 'kobi', axis: 'trust', delta: -4 }, { e: 'rel', who: 'kobi', axis: 'tension', delta: 3 }, { e: 'remember', who: 'kobi', eventId: 'caught-the-lie-1986', significance: 'major' }, { e: 'wellbeing', key: 'regret', delta: 3 }],
      },
      /** the car he offered to wash — still dirty, and his father says so, almost smiling */
      {
        when: { flag: 'life:a7:bargained', none: [{ flag: 'kobi:car-met' }] },
        lines: [
          { who: 'קובי', text: 'האוטו עוד מלוכלך, אגב.' },
          { who: null, text: 'הוא אומר את זה לעיתון. זה כמעט חיוך, וזה עדיין לא.' },
          { who: 'קובי', text: 'לא היום, פוגי. תשטוף בשבוע הבא.' },
        ],
        then: [{ e: 'flag', flag: 'kobi:car-met' }, { e: 'rel', who: 'kobi', axis: 'familiarity', delta: 2 }],
      },
      /**
       * (delta 90, §7 A7→A8) the three weeks-before are three different mornings. "נראה"
       * is not "לא": a boy who was told maybe hears the maybe run out, and a boy who never
       * asked hears his father notice the silence. Only the refusal is "I said no".
       */
      {
        when: { flag: 'life:a7:promised' },
        lines: [
          { who: 'קובי', text: 'אמרתי "נראה".' },
          { who: null, text: 'הוא לא מסתכל עליך. ה"נראה" של שבוע שעבר נגמר הבוקר, בלי שאף אחד אמר את זה בקול.' },
          { who: 'קובי', text: 'לא היום, פוגי.' },
        ],
        then: [{ e: 'remember', who: 'kobi', eventId: 'maybe-ran-out-1986', significance: 'notable' }],
      },
      {
        when: { flag: 'asked:ticket' },
        lines: [
          { who: 'קובי', text: 'שבוע שעבר אמרתי לא. אל תתחיל שוב.' },
          { who: null, text: 'הוא לא כועס. הוא פשוט לא זז.' },
        ],
      },
      {
        when: { flag: 'life:a7:silent', none: [{ flag: 'asked:ticket' }, { flag: 'kobi:quiet-again' }] },
        lines: [
          { who: 'קובי', text: 'כל השבוע לא שאלת.' },
          { who: null, text: 'הוא אומר את זה כאילו זה מפתיע אותו יותר מכל שאלה. העיתון נשאר פתוח על אותו עמוד.' },
        ],
        choices: [
          { id: 'ask', text: 'עכשיו לשאול: "קח אותי איתך."', then: [{ e: 'goto', node: 'kobi-refuse' }] },
          { id: 'leave', text: 'גם היום לא לשאול.', then: [{ e: 'flag', flag: 'kobi:quiet-again' }, { e: 'personality', key: 'stubbornness', delta: 2 }, { e: 'remember', who: 'kobi', eventId: 'still-did-not-ask-1986', significance: 'notable' }] },
        ],
      },
      {
        when: { flag: 'knows:match' },
        lines: [{ who: 'קובי', text: 'תן לי לקרוא בשקט חמש דקות, נו.' }],
        choices: [
          {
            id: 'ask',
            text: 'קח אותי איתך.',
            then: [
              { e: 'goto', node: 'kobi-refuse' },
            ],
          },
          { id: 'leave', text: 'לתת לו לקרוא', then: [] },
        ],
      },
      {
        lines: [
          { who: null, text: 'אבא בכורסה, העיתון על הברכיים, הרדיו מדבר חלש מאחורי הראש שלו.' },
          { who: 'קובי', text: 'התלבשת? יופי. אל תסתובב לי פה יחף.' },
        ],
        choices: [
          {
            id: 'match',
            text: 'אתה עדיין לא לוקח אותי?',
            then: [{ e: 'goto', node: 'kobi-refuse' }],
          },
          {
            id: 'nothing',
            text: 'שום דבר.',
            then: [{ e: 'bond', who: 'kobi', delta: 1 }],
          },
        ],
      },
    ],
  },
  // (23.9.2026) `kobi-match` removed: the overlay replaced its goto target with
  // `kobi-refuse` and this node was left with nothing pointing at it (life-orphans).
  {
    id: 'kobi-refuse',
    nameHe: 'קובי',
    branches: [
      {
        shot: { focus: 'kobi', framing: 'close', ambienceDuck: 0.55 },
        lines: [
          { who: 'קובי', text: 'אתה בן שמונה.' },
          { who: null, text: 'הוא מכבה את הסיגריה במאפרה ומניח את העיתון על הברך. פה הוא בדרך כלל מתרכך.' },
          { who: 'קובי', text: 'שם דוחפים. אתה נעלם לי בין הרגליים בשתי שניות.' },
          { who: 'קובי', text: 'עוד שנה־שנתיים. תבטיח לי שתחכה.' },
        ],
        // ההבטחה. It costs nothing now and it is the single line the last scene of the
        // chapter is built on: a father who was promised, and a child who came anyway,
        // are a different reunion from a father who was told the truth in the doorway.
        choices: [
          {
            id: 'promise',
            text: 'אני מבטיח.',
            then: [
              { e: 'flag', flag: 'asked:ticket' },
              { e: 'personality', key: 'reliability', delta: 6 },
              { e: 'rel', who: 'kobi', axis: 'trust', delta: 8 },
              { e: 'remember', who: 'kobi', eventId: 'promised-to-wait', significance: 'major' },
            ],
          },
          {
            id: 'silence',
            text: 'לא לענות.',
            then: [
              { e: 'flag', flag: 'asked:ticket' },
              { e: 'personality', key: 'stubbornness', delta: 6 },
              { e: 'rel', who: 'kobi', axis: 'tension', delta: 6 },
              { e: 'remember', who: 'kobi', eventId: 'would-not-promise', significance: 'notable' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'rachel-kitchen',
    nameHe: 'רחל',
    branches: [
      {
        when: { flag: 'chore:done', afterMinute: KOBI_LEAVES, bond: { who: 'rachel', min: 60 } },
        lines: [
          { who: null, text: 'היא מסתכלת עליך, ואז על הדלת שאבא יצא ממנה.' },
          { who: 'רחל', text: 'אתה חושב שאני לא רואה אותך מסתובב פה כמו חתול.' },
          { who: null, text: 'היא מוציאה מהארנק משהו, מניחה לך בכף היד וסוגרת עליו את האצבעות שלך.' },
          { who: 'רחל', text: 'לא סיפרתי לאבא. ואתה גם לא.' },
        ],
        then: [
          { e: 'money', agorot: 500, why: 'רחל' },
          { e: 'flag', flag: 'rachel:secret' },
          { e: 'bond', who: 'rachel', delta: 4 },
          { e: 'trait', trait: 'independence', delta: 3 },
        ],
      },
      {
        // אמא בדלת — the fork the reunion reads, and the player does not know it yet.
        // Telling her the truth is expensive and telling her a story is free, which is
        // exactly the shape of the decision at eight years old.
        when: { all: [{ afterMinute: KOBI_LEAVES }, { notFlag: 'told:rachel' }, { flag: 'knows:match' }] },
        shot: { focus: 'rachel', framing: 'medium', ambienceDuck: 0.4 },
        lines: [
          { who: null, text: 'היא עומדת בפתח המטבח עם המגבת ביד, ורואה שאתה כבר בנעליים סגורות.' },
          { who: 'רחל', text: 'לאן?' },
        ],
        choices: [
          {
            id: 'truth',
            text: 'לבלומפילד. אחרי אבא.',
            then: [
              { e: 'flag', flag: 'told:rachel' },
              { e: 'flag', flag: 'rachel:knows' },
              { e: 'rel', who: 'rachel', axis: 'trust', delta: 10 },
              { e: 'rel', who: 'rachel', axis: 'tension', delta: 14 },
              { e: 'personality', key: 'courage', delta: 6 },
              { e: 'remember', who: 'rachel', eventId: 'told-the-truth', significance: 'major' },
              { e: 'goto', node: 'rachel-doorway' },
            ],
          },
          {
            id: 'lie',
            text: 'לאופיר, למטה.',
            then: [
              { e: 'flag', flag: 'told:rachel' },
              { e: 'flag', flag: 'lied:rachel' },
              { e: 'rel', who: 'rachel', axis: 'trust', delta: -12 },
              { e: 'personality', key: 'impulsiveness', delta: 5 },
              { e: 'wellbeing', key: 'stress', delta: 12 },
              { e: 'remember', who: 'rachel', eventId: 'lied-about-bloomfield', significance: 'major' },
              { e: 'toast', text: 'היא מהנהנת ולא מורידה ממך את העיניים.' },
            ],
          },
        ],
      },
      {
        when: { flag: 'chore:bottles', hasItem: 'bottle' },
        lines: [
          { who: 'רחל', text: 'הבקבוקים עוד אצלך. הקיוסק סוגר בשלוש וחצי, לא בחמש.' },
        ],
      },
      {
        when: { flag: 'chore:bottles' },
        lines: [{ who: 'רחל', text: 'יופי. תודה, מותק. תשטוף ידיים.' }],
      },
      {
        lines: [
          { who: null, text: 'ריח של חמין ושל בצל מטוגן. היא מנגבת ידיים במגבת ומסתכלת עליך.' },
          { who: 'רחל', text: 'משעמם לך? יופי. יש לי בדיוק עבודה בשבילך.' },
        ],
        choices: [
          {
            id: 'help',
            text: 'מה צריך?',
            then: [{ e: 'goto', node: 'rachel-chore' }],
          },
          {
            id: 'no',
            text: 'לא עכשיו.',
            then: [{ e: 'bond', who: 'rachel', delta: -2 }],
          },
        ],
      },
    ],
  },
  {
    id: 'rachel-chore',
    nameHe: 'רחל',
    branches: [
      {
        lines: [
          { who: 'רחל', text: 'הארגז ליד הדלת. שלושה בקבוקים, לקיוסק, ומה שהוא נותן לך — שלך.' },
          { who: 'רחל', text: 'ולא לרוץ עם זכוכית ביד.' },
        ],
        then: [
          { e: 'flag', flag: 'chore:bottles' },
          { e: 'bond', who: 'rachel', delta: 4 },
          { e: 'trait', trait: 'responsibility', delta: 3 },
        ],
      },
    ],
  },
  {
    id: 'bottles',
    branches: [
      {
        when: { flag: 'chore:bottles', lacksItem: 'bottle', notFlag: 'chore:done' },
        lines: [{ who: null, text: 'ארגז עץ, שלושה בקבוקי זכוכית בפנים. כבדים יותר משנראה.' }],
        then: [
          { e: 'give', item: 'bottle', count: 3 },
          { e: 'toast', text: 'שלושה בקבוקים' },
        ],
      },
      { lines: [{ who: null, text: 'ארגז ריק ליד הדלת.' }] },
    ],
  },
  {
    id: 'radio',
    branches: [
      {
        when: { beforeMinute: KOBI_LEAVES },
        lines: [
          { who: null, text: 'הרדיו על השידה, בין מפית לתמונה. שיר, ואז גבר שמדבר מהר מדי.' },
          { who: null, text: 'המילה בלומפילד נכנסת ויוצאת. את השאר אתה לא מספיק לתפוס.' },
        ],
        then: [
          { e: 'time', minutes: 4 },
          { e: 'trait', trait: 'knowledge', delta: 3 },
          { e: 'flag', flag: 'heard:radio' },
        ],
      },
      {
        lines: [
          { who: null, text: 'מהרדיו נשמע רעש של קהל, רחוק, כאילו מתחת למים.' },
          { who: null, text: 'זה קורה עכשיו. בלעדיך.' },
        ],
        then: [{ e: 'time', minutes: 3 }],
      },
    ],
  },
  {
    id: 'family-photo',
    branches: [
      {
        lines: [
          { who: null, text: 'תמונה בשחור־לבן: אבא צעיר בלי שפם, יעקב לידו, ועוד מישהו שאתה לא מכיר.' },
          { who: null, text: 'מאחוריהם גדר, ומעל הגדר משהו גדול שלא נכנס לתמונה.' },
        ],
      },
    ],
  },
  {
    id: 'coffee-table',
    branches: [
      {
        lines: [
          { who: null, text: 'שולחן נמוך: מאפרה מלאה, ספל קפה הפוך, וקופסת סיגריות פתוחה למחצה.' },
          { who: null, text: 'אמא מנקה את כל הבית. את השולחן הזה היא לא נוגעת.' },
        ],
      },
    ],
  },
  /**
   * המגירה — the sideboard under the television, and the booklet in it.
   *
   * Twenty-four pages of a championship booklet from the season before the boy was born,
   * scanned off the copy Kobi kept. The game does not explain it and does not
   * summarise it: it opens the drawer and hands it over, and everything the player takes
   * out of those pages is theirs. The only line the game is allowed to print over a
   * primary source is where it came from — that lives in `books.ts` as `sourceHe`.
   *
   * The second visit is written differently on purpose. The first time is a discovery;
   * after that it is a thing you know is there, which is what a kept object actually is.
   */
  {
    id: 'sideboard-drawer',
    branches: [
      {
        when: { flag: 'book:8081' },
        lines: [
          { who: null, text: 'המגירה נפתחת בחריקה שאתה כבר מכיר. החוברת במקום שלה, בין הקבלות והמפתחות הישנים.' },
        ],
        choices: [
          { id: 'read', text: 'לדפדף שוב.', then: [{ e: 'book', id: '8081' }] },
          { id: 'shut', text: 'לסגור.', then: [] },
        ],
      },
      {
        lines: [
          { who: null, text: 'מגירת השידה מתחת לטלוויזיה. אמא לא נוגעת בה, ואבא פותח אותה פעמיים בעשור.' },
          { who: null, text: 'בפנים: קבלות, מפתח של דלת שכבר לא קיימת, ומתחת לכולם חוברת דקה עם פינה מקופלת.' },
        ],
        choices: [
          {
            id: 'open',
            text: 'להוציא את החוברת.',
            then: [
              /**
               * הסימנייה — one sticker from 1980/81, used to keep a page.
               *
               * The album's first entry is not bought and cannot be. It is Bezredno,
               * numbered 5, out of an album his father filled the year the boy was born,
               * left inside the booklet at the page somebody wanted to come back to. It
               * is the reason the album exists in this life at all, and it is the one
               * sticker in the game that has nothing to do with completing anything.
               */
              { e: 'book', id: '8081' },
              { e: 'sticker', id: 'bezredno' },
              { e: 'toast', text: 'מדבקה ישנה נפלה מבין הדפים.', tone: 'red' },
              { e: 'redheart', key: 'footballLove', delta: 3 },
            ],
          },
          { id: 'leave', text: 'לסגור את המגירה.', then: [] },
        ],
      },
    ],
  },
  {
    id: 'kitchen-table',
    branches: [
      /**
       * העיתון של אבא — the stakes, in 1986's own words, on a Saturday morning table.
       *
       * This is the pre-match page of מעריב ספורט: both line-ups printed in boxes, the
       * league table down the middle, and a headline that says the whole season is
       * decided tomorrow at Bloomfield. Nothing in this game had to write that sentence,
       * and nothing in this game is allowed to — so the child picks up his father's paper
       * and reads it, which is how an eight-year-old would have found out anyway.
       *
       * It is also the honest way to raise `knows:match`: the flag that opens the road
       * east is now something the player LEARNED rather than something the game granted.
       */
      {
        when: { notFlag: 'knows:match' },
        lines: [
          { who: null, text: 'העיתון של אבא פתוח על השעוונית בדיוק באמצע. את העמוד הזה הוא קרא הבוקר שלוש פעמים.' },
        ],
        then: [
          { e: 'doc', art: 'paperBefore', captionHe: 'מעריב ספורט, 23.5.1986 — מארכיון צוות The Worker' },
          { e: 'flag', flag: 'knows:match' },
          { e: 'redheart', key: 'footballLove', delta: 4 },
          { e: 'toast', text: 'היום. בבלומפילד.', tone: 'red' },
        ],
      },
      {
        lines: [{ who: null, text: 'שעוונית פרחונית, פירורי לחם, סכין, והעיתון של אבא מקופל בצד.' }],
        then: [{ e: 'doc', art: 'paperBefore', captionHe: 'מעריב ספורט, 23.5.1986 — מארכיון צוות The Worker' }],
      },
    ],
  },

  // ----------------------------------------------------------------- the street ----
  {
    id: 'ofir-wall',
    nameHe: 'אופיר',
    branches: [
      /**
       * (pass 28.9.2026, brief §7 S3 → §8 S2) "שתיים, ליד הקיוסק" — the plan made through
       * a window last Saturday, kept. Ofir is the one who remembers it; the route is his.
       */
      {
        when: { flagIs: { flag: 'life:a7:plan', value: 'ofir' }, none: [{ flag: 'ofir:plan-met' }] },
        lines: [
          { who: 'אופיר', text: 'אמרנו שתיים. באת.' },
          { who: null, text: 'הוא קופץ מהקיר ומנער את המכנסיים, כאילו כל השבוע עמד פה.' },
          { who: 'אופיר', text: 'אני יודע את הדרך. אחרי האנשים, מזרחה. אל תעצור באמצע.' },
        ],
        then: [{ e: 'flag', flag: 'ofir:plan-met' }, { e: 'flag', flag: 'route:known' }, { e: 'flag', flag: 'knows:match' }, { e: 'flag', flag: 'ofir:knows' }, { e: 'rel', who: 'ofir', axis: 'trust', delta: 4 }, { e: 'remember', who: 'ofir', eventId: 'kept-the-plan-1986', significance: 'major' }],
      },
      {
        when: { flag: 'played:football' },
        lines: [
          { who: 'אופיר', text: 'שיחקת יפה. בשבוע הבא אתה בקבוצה שלי.' },
        ],
        then: [{ e: 'bond', who: 'ofir', delta: 2 }],
      },
      {
        lines: [
          { who: null, text: 'אופיר יושב על הקיר עם רגליים באוויר. הוא תמיד יושב על משהו.' },
          { who: 'אופיר', text: 'מה, יצאת סוף סוף? חשבתי שאמא שלך קשרה אותך למיטה.' },
        ],
        choices: [
          {
            id: 'pitch',
            text: 'מה קורה במגרש?',
            then: [
              { e: 'goto', node: 'ofir-pitch' },
            ],
          },
          {
            id: 'match',
            text: 'יש היום משחק בבלומפילד.',
            when: { flag: 'knows:match' },
            noteHe: 'עוד לא שמעת על משחק',
            then: [{ e: 'goto', node: 'ofir-knows' }],
          },
          /**
           * מחליף? — offered only with a spare in hand, and it may well come back "no".
           *
           * Whether אופיר is the one holding the sticker you are short of is not written
           * here and is not fixed: it is whoever you have been worst to this afternoon
           * (`swap` → `holderOf`). Some days that is him and some days he tells you to go
           * and ask עמית, which is the joke and the mechanic at the same time.
           */
          {
            id: 'swap',
            text: 'יש לי כפולים. מחליף?',
            when: { all: [{ flag: 'album:seen' }, { duplicatesAtLeast: 1 }] },
            hidden: true,
            then: [{ e: 'swap', who: 'ofir' }],
          },
        ],
      },
    ],
  },
  {
    id: 'ofir-pitch',
    nameHe: 'אופיר',
    branches: [
      {
        lines: [
          { who: 'אופיר', text: 'שלושה על שלושה, מאחורי הבניין. אפי כבר שם.' },
          { who: 'אופיר', text: 'תיכנס מהסמטה. לך ראשון, אני בא אחריך.' },
        ],
        then: [
          { e: 'bond', who: 'ofir', delta: 3 },
          { e: 'flag', flag: 'knows:pitch' },
        ],
      },
    ],
  },
  {
    id: 'ofir-knows',
    nameHe: 'אופיר',
    branches: [
      {
        lines: [
          { who: 'אופיר', text: 'ברור שיש. כל הרחוב הולך.' },
          { who: 'אופיר', text: 'אבא שלך לוקח אותך?' },
          { who: null, text: 'אתה לא עונה. הוא לא שואל שוב.' },
          { who: 'אופיר', text: 'אז נסתדר.' },
        ],
        then: [
          { e: 'bond', who: 'ofir', delta: 5 },
          { e: 'flag', flag: 'ofir:knows' },
          { e: 'trait', trait: 'courage', delta: 2 },
        ],
      },
    ],
  },
  {
    id: 'ofir-matchday',
    nameHe: 'אופיר',
    branches: [
      {
        lines: [
          { who: null, text: 'אופיר עומד באמצע המדרכה, פונה מזרחה, כאילו חיכה לך.' },
          { who: 'אופיר', text: 'הם כבר הולכים. אם תצא עכשיו תגיע לפני שסוגרים.' },
          { who: 'אופיר', text: 'אני משיג אותך שם. לך אחרי האנשים ואל תעצור באמצע.' },
        ],
        then: [
          { e: 'flag', flag: 'route:known' },
          { e: 'flag', flag: 'knows:match' },
          { e: 'bond', who: 'ofir', delta: 4 },
          { e: 'trait', trait: 'courage', delta: 3 },
        ],
      },
    ],
  },
  {
    id: 'neighbour',
    nameHe: 'אילן השכן',
    branches: [
      {
        when: { afterMinute: KOBI_LEAVES },
        lines: [
          { who: 'אילן השכן', text: 'אבא שלך ירד לפני עשר דקות, עם החולצה בחוץ. רץ כמו ילד.' },
          { who: 'אילן השכן', text: 'היום יש משחק, ואף אחד לא נשאר בבית. תראה בעצמך.' },
        ],
        then: [
          { e: 'flag', flag: 'knows:match' },
          { e: 'redheart', key: 'community', delta: 4 },
        ],
      },
      {
        lines: [
          { who: 'אילן השכן', text: 'תגיד לאמא שלך שהמים חזרו.' },
          { who: 'אילן השכן', text: 'ואל תעבור את הכביש הגדול לבד. שמעת?' },
        ],
        then: [],
      },
    ],
  },
  {
    id: 'wall-writing',
    branches: [
      {
        lines: [
          { who: null, text: 'על הקיר, באדום, בכתב יד גדול: משהו שנכתב בלילה ואף אחד לא מחק.' },
          { who: null, text: 'אתה עוד לא קורא מהר, ואת זה אתה יודע בעל פה.' },
        ],
        then: [
          { e: 'trait', trait: 'footballAffinity', delta: 2 },
          { e: 'redheart', key: 'terraceCulture', delta: 4 },
        ],
      },
    ],
  },
  {
    id: 'gutter-coin',
    branches: [
      {
        lines: [
          { who: null, text: 'משהו נוצץ בין המרצפת לשורש של הפיקוס.' },
          { who: null, text: 'שקל. שלך עכשיו.' },
        ],
        then: [
          { e: 'money', agorot: 100, why: 'מציאה' },
          { e: 'flag', flag: 'found:coin' },
          { e: 'personality', key: 'curiosity', delta: 1 },
          { e: 'toast', text: 'קיבלת 1 ₪' },
        ],
      },
    ],
  },
  {
    id: 'alley-look',
    branches: [
      {
        lines: [{ who: null, text: 'הסמטה בין הבניינים. מאחוריה כדור נחבט בקיר, ומישהו צועק שזה היה בחוץ.' }],
      },
    ],
  },
  {
    id: 'kiosk-look',
    branches: [
      {
        lines: [{ who: null, text: 'עיתונים, מסטיקים, גזוז. השלט האדום דהוי מהשמש.' }],
      },
    ],
  },

  // ------------------------------------------------------------------ the kiosk ----
  {
    id: 'kiosk-man',
    nameHe: 'רפי מהקיוסק',
    branches: [
      {
        lines: [
          { who: 'רפי מהקיוסק', text: 'נו, מה אתה רוצה. בשלוש וחצי אני נועל — היום מעבירים את זה בטלוויזיה, בשידור חי.' },
        ],
        choices: [
          {
            id: 'bottles',
            text: 'הבאתי בקבוקים.',
            when: { hasItem: 'bottle' },
            noteHe: 'אין לך בקבוקים',
            then: [{ e: 'goto', node: 'kiosk-bottles' }],
          },
          {
            id: 'paper',
            text: 'עיתון. 2 ₪.',
            when: { minAgorot: 200 },
            noteHe: 'אין לך מספיק',
            then: [{ e: 'goto', node: 'kiosk-paper' }],
          },
          {
            id: 'card',
            text: 'מעטפת סופרגול. 1 ₪.',
            when: { minAgorot: 100 },
            noteHe: 'אין לך מספיק',
            then: [{ e: 'goto', node: 'kiosk-card' }],
          },
          {
            id: 'album',
            text: 'לפתוח את האלבום.',
            when: { flag: 'album:seen' },
            hidden: true,
            then: [{ e: 'album' }],
          },
          { id: 'nothing', text: 'רק מסתכל.', then: [] },
        ],
      },
    ],
  },
  {
    id: 'kiosk-bottles',
    nameHe: 'רפי מהקיוסק',
    branches: [
      {
        lines: [
          { who: null, text: 'הוא סופר אותם באצבע, אחד־שניים־שלושה, ומוציא מטבעות מקופסת פח.' },
          { who: 'רפי מהקיוסק', text: 'תגיד לאמא שלך שהיא צודקת תמיד.' },
        ],
        then: [
          { e: 'take', item: 'bottle', count: 3 },
          { e: 'money', agorot: 300, why: 'בקבוקים' },
          { e: 'flag', flag: 'chore:done' },
          { e: 'toast', text: 'קיבלת 3 ₪' },
        ],
      },
    ],
  },
  {
    id: 'kiosk-paper',
    nameHe: 'רפי מהקיוסק',
    branches: [
      {
        lines: [
          { who: null, text: 'עיתון של יום שישי, מקופל, עמוד הספורט כלפי חוץ.' },
          { who: null, text: 'תמונה של שחקן באמצע קפיצה, ומתחתיה שורות קטנות שאתה קורא לאט מדי.' },
        ],
        then: [
          { e: 'money', agorot: -200, why: 'עיתון' },
          { e: 'give', item: 'newspaper' },
          { e: 'trait', trait: 'knowledge', delta: 4 },
          { e: 'toast', text: 'עיתון' },
        ],
      },
    ],
  },
  /**
   * מעטפת סופרגול — the shekel that does not go towards the shirt.
   *
   * This node used to hand over one generic `football-card` and a line saying the boy did
   * not recognise the face, which was the honest placeholder while the album did not
   * exist. It exists now (`lib/life/stickers.ts`), so the purchase does both halves of
   * what a packet actually does: the paper envelope goes in the pocket — that is the
   * `football-card` the Red Box can keep — and three stickers go in the album.
   *
   * `packet` spends the money itself, priced off `PACKET` in `prices.ts`, so nothing here
   * types a number.
   */
  {
    id: 'kiosk-card',
    nameHe: 'רפי מהקיוסק',
    branches: [
      {
        lines: [
          { who: null, text: 'מעטפת נייר קטנה, אדומה, עם כדור מודפס עליה. אתה קורע את הפינה בשיניים.' },
          { who: 'רפי מהקיוסק', text: 'אל תפתח לי אותה על הדלפק. ותביא לי את הכפולים, אני אוסף בשביל הנכד.' },
        ],
        then: [
          { e: 'packet' },
          { e: 'give', item: 'football-card' },
          { e: 'trait', trait: 'footballAffinity', delta: 3 },
        ],
      },
    ],
  },
  {
    id: 'kiosk-counter',
    branches: [{ lines: [{ who: null, text: 'דלפק דביק, קופסת פח עם מטבעות, ומאוורר שלא עובד.' }] }],
  },

  // ------------------------------------------------------------------ the pitch ----
  {
    id: 'pitch-kids',
    nameHe: 'ילד מהשכונה',
    branches: [
      {
        when: { flag: 'played:football' },
        lines: [{ who: 'ילד מהשכונה', text: 'מספיק להיום, אני הולך לאכול.' }],
      },
      {
        lines: [
          { who: 'ילד מהשכונה', text: 'שלושה על שלושה. עד שלוש שערים.' },
          { who: 'ילד מהשכונה', text: 'אני סיני. אמרתי ראשון.' },
          { who: null, text: 'תמיד מישהו אומר ראשון. אף פעם לא אתה.' },
        ],
        choices: [
          {
            id: 'play',
            text: 'בוא נשחק.',
            then: [{ e: 'minigame', id: 'football' }],
          },
          {
            id: 'sinai',
            text: 'אז אני סיני אחריך.',
            when: { flag: 'knows:sinai' },
            noteHe: 'צריך להכיר אותו',
            then: [
              { e: 'trait', trait: 'footballAffinity', delta: 4 },
              { e: 'trait', trait: 'courage', delta: 2 },
              { e: 'minigame', id: 'football' },
            ],
          },
          { id: 'later', text: 'אחר כך.', then: [] },
        ],
      },
    ],
  },
  {
    id: 'pitch-ball',
    branches: [
      {
        when: { flag: 'played:football' },
        lines: [{ who: null, text: 'הכדור מונח ליד האבן. עייף כמוך.' }],
      },
      {
        lines: [{ who: null, text: 'כדור פלסטיק חבוט. מספיק כדי לשחק שלושה על שלושה.' }],
        choices: [
          { id: 'play', text: 'לשחק', then: [{ e: 'minigame', id: 'football' }] },
          { id: 'no', text: 'להשאיר', then: [] },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------- the route ---
  {
    id: 'route-fan',
    nameHe: 'אוהד',
    branches: [
      {
        lines: [
          { who: 'אוהד', text: 'לאן אתה רץ, קטן? יש עוד זמן.' },
          { who: null, text: 'הוא צוחק ומזיז אותך מהכביש ביד אחת.' },
        ],
      },
    ],
  },
  {
    /**
     * בארי — Stage A Director's Cut §21/§53, 6.9.2026: Barry's canonical entry into
     * Pugi's playable supporter world is 1986, Gate 7 — not the year-earlier kiosk one-liner he
     * used to get. `characters.ts` already knew this (`activeEras: ['1986+']`, tag
     * `gate7`); only the dialogue still called him "an old-timer" and banked the
     * relationship on a throwaway `veteran` id instead of his own. Same lines, same
     * scene — he simply has his name now, and Stage B inherits a real person instead of
     * nobody.
     */
    id: 'route-veteran',
    nameHe: 'בארי',
    branches: [
      {
        lines: [
          { who: 'בארי', text: 'קטן. אתה יודע לאן אתה הולך?' },
          { who: null, text: 'אתה מהנהן. הוא לא אומר כלום, רק ממשיך ללכת לידך עוד קצת.' },
        ],
        /**
         * התחנה (21.9.2026) — the old fan's memory game, offered where he is: on the road, by
         * the bus shelter, on the afternoon of the final. It costs the clock, which is the
         * point on this day — the courage he gives you for walking on is kept on both roads.
         */
        choices: [
          { id: 'walk', text: 'להמשיך ללכת לידו', then: [{ e: 'trait', trait: 'courage', delta: 2 }] },
          {
            id: 'bench',
            text: 'לשאול אותו על פעם',
            then: [
              { e: 'trait', trait: 'courage', delta: 2 },
              { e: 'goto', node: 'act-busstop-memory' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'route-banner',
    branches: [
      {
        lines: [{ who: null, text: 'סדין קשור לגדר. אדום, מלוכלך, ומישהו תפר עליו אותיות לבנות עקומות.' }],
      },
    ],
  },

  // ------------------------------------------------------------ outside the ground -
  {
    id: 'steward',
    nameHe: 'סדרן',
    branches: [
      {
        when: { flag: 'entry:granted' },
        lines: [{ who: 'סדרן', text: 'קדימה, פנימה. לא לעמוד בפתח.' }],
      },
      {
        lines: [
          { who: 'סדרן', text: 'ילד. לבד לא נכנסים. תמצא את מי שהביא אותך ותחזור איתו.' },
          { who: null, text: 'הוא לא רשע ולא מרחם. הוא עומד פה מהבוקר.' },
        ],
      },
    ],
  },
  {
    id: 'ticket-window',
    nameHe: 'הקופאי',
    branches: [
      {
        when: { flag: 'entry:granted' },
        lines: [{ who: 'הקופאי', text: 'כבר סידרת. לך.' }],
      },
      {
        when: { minAgorot: 1500 },
        lines: [
          { who: 'הקופאי', text: 'ילד — חמישה־עשר.' },
          { who: null, text: 'אתה מניח את הכסף על השיש. הוא סופר, ודוחף לך פתק קרטון עם שני השמות מודפסים עליו.' },
        ],
        then: [
          { e: 'money', agorot: -1500, why: 'כרטיס' },
          { e: 'give', item: 'ticket-stub' },
          { e: 'flag', flag: 'entry:granted' },
          { e: 'flag', flag: 'entry:ticket' },
          { e: 'trait', trait: 'independence', delta: 4 },
          { e: 'toast', text: 'כרטיס', tone: 'red' },
        ],
      },
      {
        lines: [
          { who: 'הקופאי', text: 'חמישה־עשר לילד.' },
          { who: null, text: 'אתה סופר בכיס בלי להוציא את היד. זה לא מספיק, וזה לא ישתנה מספירה שנייה.' },
        ],
      },
    ],
  },
  {
    id: 'ofir-ground',
    nameHe: 'אופיר',
    branches: [
      {
        when: { flag: 'entry:granted' },
        lines: [{ who: 'אופיר', text: 'תיכנס כבר, אני שומר לך מקום.' }],
      },
      {
        lines: [
          { who: null, text: 'אופיר יושב על מעקה מול הכניסה כאילו הוא גר פה.' },
          { who: 'אופיר', text: 'בן דוד שלי עובד פה. אמרתי לו שאני בא עם עוד אחד.' },
          { who: 'אופיר', text: 'תישאר לידי ואל תדבר.' },
        ],
        then: [
          { e: 'flag', flag: 'entry:granted' },
          { e: 'flag', flag: 'entry:ofir' },
          { e: 'bond', who: 'ofir', delta: 6 },
          { e: 'trait', trait: 'streetSmarts', delta: 4 },
          { e: 'toast', text: 'אתה נכנס', tone: 'red' },
        ],
      },
    ],
  },
  {
    id: 'gate-veteran',
    nameHe: 'בארי',
    branches: [
      {
        when: { flag: 'entry:granted' },
        lines: [{ who: 'בארי', text: 'נו, מה אתה מחכה. זה מתחיל.' }],
      },
      {
        when: { hasItem: 'newspaper', bond: { who: 'kobi', min: 60 } },
        lines: [
          { who: null, text: 'הוא מסתכל על העיתון המקופל ביד שלך, ואז על הפנים שלך.' },
          { who: 'בארי', text: 'רגע. אתה של קובי?' },
          { who: null, text: 'אתה מהנהן.' },
          { who: 'בארי', text: 'הוא עומד בשבע כל שבת. בוא, הילד איתי.' },
        ],
        then: [
          { e: 'flag', flag: 'entry:granted' },
          { e: 'flag', flag: 'entry:name' },
          { e: 'bond', who: 'kobi', delta: 2 },
          { e: 'toast', text: 'אתה נכנס', tone: 'red' },
        ],
      },
      {
        /**
         * הרשת — the way in that needs nothing, and is not therefore free.
         *
         * A chapter that can dead-lock is not a chapter (rule 42), so one route must
         * always be open. But `talk → entry granted` is not a route, it is a hotspot
         * wearing a face, and the production directive (§3.2) names it as a defect: a
         * fail-safe is not a free solution. So the old man does not simply take the
         * child in. He asks him the one question a stranger would ask, the child has to
         * answer it out loud, and only then does the old man decide — and it still costs
         * twenty-two minutes of queue, which at ten to four is most of what is left.
         *
         * Neither answer refuses him. Refusing would reintroduce the dead end this
         * branch exists to prevent. What changes is what the man believes he is doing,
         * what he remembers, and what the reunion later reads off it.
         */
        lines: [
          { who: null, text: 'הוא עומד ליד הגדר ומעשן, ורואה אותך כבר כמה דקות. בסוף הוא מכבה את הסיגריה בסוליה.' },
          { who: 'בארי', text: 'לבד, מה?' },
          { who: null, text: 'הוא לא שואל כמו מבוגר שעומד לשלוח אותך הביתה. הוא שואל כמו מישהו שבודק.' },
          { who: 'בארי', text: 'ומי מחכה לך בפנים?' },
        ],
        choices: [
          {
            id: 'father',
            text: 'אבא שלי. בשער שבע.',
            then: [
              { e: 'goto', node: 'gate-veteran-in' },
              { e: 'flag', flag: 'entry:kindness' },
              { e: 'rel', who: 'kobi', axis: 'sharedHistory', delta: 6 },
              { e: 'remember', who: 'barry', eventId: 'told-him-about-kobi', significance: 'notable' },
            ],
          },
          {
            id: 'nobody',
            text: 'אף אחד.',
            then: [
              { e: 'goto', node: 'gate-veteran-in' },
              { e: 'flag', flag: 'entry:kindness' },
              { e: 'flag', flag: 'entry:alone' },
              { e: 'personality', key: 'independence', delta: 8 },
              { e: 'wellbeing', key: 'loneliness', delta: 6 },
              { e: 'remember', who: 'barry', eventId: 'said-nobody', significance: 'major' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'gate-veteran-in',
    nameHe: 'בארי',
    branches: [
      {
        // The cost is the same either way, and it is real: twenty-two minutes in a
        // queue at ten to four is most of what is left of the afternoon. That is what
        // makes the fail-safe a decision rather than a door.
        when: { flag: 'entry:alone' },
        shot: { focus: 'both', framing: 'ots', ambienceDuck: 0.5 },
        lines: [
          { who: null, text: 'הוא מסתכל עליך עוד שנייה, ואז מניח יד גדולה על הכתף שלך ולא מוריד אותה.' },
          { who: 'בארי', text: 'אז היום אני. תעמוד לידי ותשתוק.' },
          { who: null, text: 'לוקח זמן עד שמגיעים לתור. הרבה זמן. הוא לא מדבר איתך ולא עוזב את הכתף.' },
        ],
        then: [
          { e: 'flag', flag: 'entry:granted' },
          { e: 'time', minutes: 22 },
          { e: 'trait', trait: 'courage', delta: 4 },
          { e: 'redheart', key: 'community', delta: 10 },
          { e: 'toast', text: 'אתה נכנס', tone: 'red' },
        ],
      },
      {
        shot: { focus: 'both', framing: 'ots', ambienceDuck: 0.5 },
        lines: [
          { who: 'בארי', text: 'שער שבע. אז אתה יודע לפחות איפה אתה.' },
          { who: null, text: 'הוא מהנהן לעצמו, מניח יד על הכתף שלך, ומכניס אותך לתור לפניו.' },
          { who: 'בארי', text: 'תעמוד לידי ותשתוק. ואם הוא לא שם — אתה נשאר איתי עד שהוא בא.' },
          { who: null, text: 'התור כמעט לא זז, ומבפנים כבר שומעים משהו.' },
        ],
        then: [
          { e: 'flag', flag: 'entry:granted' },
          { e: 'time', minutes: 22 },
          { e: 'trait', trait: 'courage', delta: 3 },
          { e: 'redheart', key: 'community', delta: 8 },
          { e: 'toast', text: 'אתה נכנס', tone: 'red' },
        ],
      },
    ],
  },
  {
    id: 'street-pole',
    branches: [
      {
        when: { flag: 'knows:match' },
        lines: [
          { who: null, text: 'העמוד. מדבקה אדומה שמישהו הדביק גבוה מדי בשביל ילד, ומתחתיה שכבות של מודעות קרועות.' },
          { who: null, text: 'אתה יודע מה כתוב עליה בעל פה, ואתה קורא את זה בכל זאת.' },
        ],
        then: [{ e: 'redheart', key: 'terraceCulture', delta: 4 }],
      },
      {
        lines: [
          { who: null, text: 'עמוד חשמל עם מדבקות. אחת מהן אדומה, וקרועה בדיוק במקום שבו כתוב מתי.' },
          { who: null, text: 'מישהו קרע אותה בכוונה, או שהגשם עשה את זה. אין דרך לדעת.' },
        ],
        then: [{ e: 'personality', key: 'curiosity', delta: 3 }],
      },
    ],
  },
  {
    id: 'route-shelter',
    branches: [
      {
        when: { afterMinute: KOBI_LEAVES },
        lines: [
          { who: null, text: 'תחנת האוטובוס ריקה. הספסל חם מהשמש ויש עליו קליפות של גרעינים.' },
          { who: null, text: 'אף אחד לא מחכה כאן היום. כולם כבר הולכים ברגל, וזה מהר יותר.' },
        ],
        then: [{ e: 'trait', trait: 'streetSmarts', delta: 3 }],
      },
      {
        lines: [
          { who: null, text: 'תחנת אוטובוס עם גג פח ושלושה ספסלים. מישהו חרט שם משהו ומישהו אחר מחק חצי ממנו.' },
        ],
      },
    ],
  },
  {
    id: 'gate-seven',
    branches: [
      {
        lines: [
          { who: null, text: 'שער שבע. אבא עומד שם בכל שבת, באותו מקום, עם יעקב.' },
          { who: null, text: 'מפה זה נראה הרבה יותר קטן ממה שדמיינת.' },
        ],
        then: [{ e: 'trait', trait: 'knowledge', delta: 2 }],
      },
    ],
  },
  {
    id: 'fence-look',
    branches: [
      {
        lines: [
          { who: null, text: 'דרך הגדר רואים פס של דשא וקצה של יציע.' },
          { who: null, text: 'הרעש מבפנים לא נשמע כמו אנשים. הוא נשמע כמו מזג אוויר.' },
        ],
      },
    ],
  },

  // ----------------------------------------------------------- inside the ground ---
  {
    id: 'terrace-fan',
    nameHe: 'אוהד',
    branches: [
      {
        when: { flag: 'match:over' },
        lines: [{ who: 'אוהד', text: 'תזכור את היום הזה, ילד. שומע? תזכור אותו.' }],
      },
      {
        lines: [{ who: 'אוהד', text: 'תעלה על המדרגה, ילד. מלמטה אתה רואה רק גב.' }],
      },
    ],
  },
  {
    id: 'terrace-rail',
    branches: [
      {
        lines: [
          { who: null, text: 'המעקה קר ורועד קצת. לא מהרוח.' },
        ],
      },
    ],
  },
  {
    /**
     * אחרי המשחק — הסיום שהיה כתוב ולא היה לו איך לקרות.
     *
     * `ENDINGS.late` in `chapter1986.ts` has a title, a body, a memory item and its own
     * `after` pair (`kobi-cheer` → `kobi90-cheer`) — a complete ending, written for the
     * boy who did not get in and found his father in the crowd coming out. **Nothing in
     * the game emitted it.** `kobi-found` is `kobi-crowd` standing on the terrace inside,
     * which needs `entry:granted`, and all five of its branches end on `home`. So a
     * Saturday spent outside the turnstile had exactly two outcomes — you got in, or you
     * went to bed — and the third, which the chapter had already written down, could not
     * happen to anybody.
     *
     * This is that third one, and it is deliberately NOT a consolation. The `home` card
     * is a ticket stub kept in the boy's own pocket; this one is a scrap picked up off
     * the floor, and the line that matters is that nobody gave it to him. Seven years
     * later `chapter2000double.ts` reads that scrap back.
     */
    id: 'kobi-out-late',
    nameHe: 'קובי',
    branches: [
      {
        shot: { focus: 'kobi', framing: 'medium', ambienceDuck: 0.6 },
        lines: [
          { who: null, text: 'השער נפתח והם יוצאים כולם ביחד, צרודים, מדברים בקול רם מדי. אתה עומד בצד ונותן להם לעבור.' },
          { who: null, text: 'הוא רואה אותך לפני שאתה רואה אותו.' },
          { who: 'קובי', text: 'מה אתה עושה פה.' },
          { who: null, text: 'זאת לא שאלה. הוא לא מחכה לתשובה — הוא מוריד את הידיים מהראש ומשאיר אותן באוויר רגע, ואז לוקח אותך.' },
          { who: 'קובי', text: 'היינו אלופים ואתה היית בחוץ.' },
          { who: null, text: 'הוא אומר את זה לתוך הצוואר שלך, לא אליך.' },
        ],
        then: [
          { e: 'flag', flag: 'found:kobi' },
          { e: 'bond', who: 'kobi', delta: 10 },
          { e: 'rel', who: 'kobi', axis: 'tension', delta: 6 },
          { e: 'rel', who: 'kobi', axis: 'sharedHistory', delta: 8 },
          { e: 'trait', trait: 'independence', delta: 8 },
          { e: 'remember', who: 'kobi', eventId: 'came-anyway', significance: 'major' },
          { e: 'presence', mode: 'late' },
          { e: 'keep' },
          { e: 'ending', id: 'late' },
        ],
      },
    ],
  },
  {
    id: 'kobi-found',
    nameHe: 'קובי',
    /**
     * המפגש — the same four feelings every time, in a different order.
     *
     * Brief §31: fear, anger, disbelief and love, and never a speech. What changes is
     * WHICH of them arrives first, and that is read off the save rather than off a
     * dialogue tree the player can feel branching: whether he was promised, whether he
     * was lied to at home, whether somebody he knows brought the child in, and how long
     * he has been looking. Every branch is six lines or fewer.
     */
    branches: [
      {
        // He has been searching. The mother told him the truth on the phone at the
        // kiosk, or a neighbour did, and the match went past him.
        when: { flag: 'rachel:knows' },
        shot: { focus: 'kobi', framing: 'close', ambienceDuck: 0.7 },
        lines: [
          { who: null, text: 'הוא מוצא אותך לפני שאתה מוצא אותו. הוא כבר חיפש.' },
          { who: 'קובי', text: 'אמא אמרה לי.' },
          { who: null, text: 'הוא לא מרים את הקול. הוא מוריד אותו, וזה הרבה יותר גרוע.' },
          { who: 'קובי', text: 'תסתכל עליי. שאני אראה שאתה שלם.' },
          { who: null, text: 'ואז הוא מחבק אותך חזק מדי, ולא אומר כלום עוד הרבה זמן.' },
        ],
        then: [
          { e: 'flag', flag: 'found:kobi' },
          { e: 'rel', who: 'kobi', axis: 'trust', delta: 10 },
          { e: 'rel', who: 'kobi', axis: 'tension', delta: 10 },
          { e: 'bond', who: 'kobi', delta: 12 },
          { e: 'trait', trait: 'independence', delta: 10 },
          { e: 'remember', who: 'kobi', eventId: 'came-anyway', significance: 'major' },
          { e: 'keep' },
          { e: 'goto', node: 'kobi-shoulders-1986' },
        ],
      },
      {
        // He was promised, and the promise is standing next to him in a red t-shirt.
        when: { relationshipMemory: { who: 'kobi', eventId: 'promised-to-wait' } },
        shot: { focus: 'kobi', framing: 'close', ambienceDuck: 0.7 },
        lines: [
          { who: null, text: 'הוא מסתובב עם כולם ואז נעצר, כי משהו בשורה מתחת לא במקום.' },
          { who: 'קובי', text: 'הבטחת לי.' },
          { who: null, text: 'אתה לא עונה. אין מה לענות.' },
          { who: null, text: 'הוא לוקח אותך בשתי ידיים, מרים לגובה שלו, ולא ממהר להוריד.' },
          { who: 'קובי', text: 'טעיתי. לא אתה.' },
        ],
        then: [
          { e: 'flag', flag: 'found:kobi' },
          { e: 'bond', who: 'kobi', delta: 14 },
          { e: 'rel', who: 'kobi', axis: 'tension', delta: 8 },
          { e: 'rel', who: 'kobi', axis: 'sharedHistory', delta: 12 },
          { e: 'trait', trait: 'independence', delta: 12 },
          { e: 'remember', who: 'kobi', eventId: 'broke-the-promise', significance: 'major' },
          { e: 'keep' },
          { e: 'goto', node: 'kobi-shoulders-1986' },
        ],
      },
      {
        // Somebody at the gate said his name, and word travels along a terrace faster
        // than a child does.
        when: { flag: 'entry:name' },
        shot: { focus: 'both', framing: 'medium', ambienceDuck: 0.6 },
        lines: [
          { who: null, text: 'הוא כבר יודע. מישהו אמר לו לפני עשר דקות ששאלו עליו בשער.' },
          { who: 'קובי', text: 'אמרו לי שיש פה ילד ששואל את השם שלי.' },
          { who: null, text: 'הוא מנסה להיראות כועס. הוא לא מצליח, כי כל מי שסביבו מסתכל עליכם.' },
          { who: 'קובי', text: 'אמא הולכת להרוג את שנינו.' },
        ],
        then: [
          { e: 'flag', flag: 'found:kobi' },
          { e: 'bond', who: 'kobi', delta: 12 },
          { e: 'rel', who: 'kobi', axis: 'sharedHistory', delta: 14 },
          { e: 'redheart', key: 'community', delta: 10 },
          { e: 'trait', trait: 'independence', delta: 9 },
          { e: 'keep' },
          { e: 'goto', node: 'kobi-shoulders-1986' },
        ],
      },
      {
        // The child lied on the way out and has been carrying it up the stairs.
        when: { flag: 'lied:rachel' },
        shot: { focus: 'kobi', framing: 'ots', ambienceDuck: 0.7 },
        lines: [
          { who: null, text: 'הוא מסתובב, ולרגע אחד הפנים שלו לא מבינות מה הן רואות.' },
          { who: 'קובי', text: 'איך…' },
          { who: null, text: 'ואז הוא נזכר לשאול את השאלה השנייה, וזאת הקשה.' },
          { who: 'קובי', text: 'מה אמרת לאמא?' },
          { who: null, text: 'אתה מסתכל על הנעליים. הוא לא שואל שוב.' },
        ],
        then: [
          { e: 'flag', flag: 'found:kobi' },
          { e: 'bond', who: 'kobi', delta: 9 },
          { e: 'rel', who: 'kobi', axis: 'trust', delta: -6 },
          { e: 'rel', who: 'kobi', axis: 'tension', delta: 16 },
          { e: 'wellbeing', key: 'regret', delta: 12 },
          { e: 'trait', trait: 'independence', delta: 10 },
          { e: 'remember', who: 'kobi', eventId: 'came-anyway', significance: 'major' },
          { e: 'keep' },
          { e: 'goto', node: 'kobi-shoulders-1986' },
        ],
      },
      {
        shot: { focus: 'kobi', framing: 'close', ambienceDuck: 0.7 },
        lines: [
          { who: null, text: 'הוא עומד עם הגב אליך, הידיים על הראש, וצועק משהו לאוויר.' },
          { who: null, text: 'ואז הוא מסתובב.' },
          { who: 'קובי', text: '...' },
          { who: null, text: 'הוא לא צועק עליך. הוא לא שואל איך הגעת.' },
          { who: null, text: 'הוא מרים אותך באוויר, וזה לוקח לו שנייה יותר מדי לשים אותך בחזרה.' },
          { who: 'קובי', text: 'אמרתי לך עוד שנה־שנתיים.' },
          { who: 'קובי', text: 'טעיתי.' },
        ],
        then: [
          { e: 'flag', flag: 'found:kobi' },
          { e: 'bond', who: 'kobi', delta: 12 },
          { e: 'trait', trait: 'independence', delta: 10 },
          { e: 'keep' },
          { e: 'goto', node: 'kobi-shoulders-1986' },
        ],
      },
    ],
  },

  // =================================================================================
  // ההתנגשות — the people who are only there for part of the afternoon.
  // =================================================================================

  {
    /**
     * על הכתפיים, שוב (pass 28.9.2026, brief §8 S5 "קובי יוזם את הצעד האחרון"). Whatever
     * the reunion was, it ends where the life began: the father lifts the eight-year-old
     * onto his shoulders, and the five-year-old of 1983 answers in him — the scarf he held,
     * the "again" he pointed, the question he asked, the ankle he was caught by. Nothing
     * here is chosen; it is read off what the prologue's hand did (`life:a1:*`). Then the
     * card. The reversal is 2026's to pay.
     */
    id: 'kobi-shoulders-1986',
    nameHe: 'קובי',
    branches: [
      {
        when: { flagIs: { flag: 'life:a1:scarf', value: 'held' } },
        lines: [
          { who: null, text: 'הוא מתכופף, ובתנועה אחת אתה למעלה, על הכתפיים. הצעיף שלו מתחת לידיים שלך — אותו צמר.' },
          { who: null, text: 'אתה מחזיק קצה, כמו אז. הוא מרגיש את זה, ולא אומר כלום, ורק מהדק את היד על הקרסול.' },
        ],
        then: [{ e: 'rel', who: 'kobi', axis: 'sharedHistory', delta: 4 }, { e: 'flagValue', flag: 'life:a8:shoulders', value: 'scarf' }, { e: 'ending', id: 'home' }],
      },
      {
        when: { flagIs: { flag: 'life:a1:instinct', value: 'terrace' } },
        lines: [
          { who: null, text: 'הוא מתכופף, ובתנועה אחת אתה למעלה, על הכתפיים, מעל כל הראשים.' },
          { who: null, text: 'אתה מצביע למגרש, לדשא שכבר מלא אנשים. "עוד פעם," אתה אומר.' },
          { who: 'קובי', text: 'את זה אמרת גם כשהיית בן חמש.' },
        ],
        then: [{ e: 'rel', who: 'kobi', axis: 'sharedHistory', delta: 4 }, { e: 'redheart', key: 'terraceCulture', delta: 2 }, { e: 'flagValue', flag: 'life:a8:shoulders', value: 'again' }, { e: 'ending', id: 'home' }],
      },
      {
        when: { flagIs: { flag: 'life:a1:instinct', value: 'question' } },
        lines: [
          { who: null, text: 'הוא מתכופף, ובתנועה אחת אתה למעלה, על הכתפיים.' },
          { who: null, text: '"מה קרה?" אתה שואל, כמו אז, כשלא הבנת כלום.' },
          { who: 'קובי', text: 'הפעם אני אסביר לך. הכל. בדרך הביתה.' },
        ],
        then: [{ e: 'rel', who: 'kobi', axis: 'sharedHistory', delta: 4 }, { e: 'personality', key: 'curiosity', delta: 1 }, { e: 'flagValue', flag: 'life:a8:shoulders', value: 'answered' }, { e: 'ending', id: 'home' }],
      },
      {
        when: { flagIs: { flag: 'life:a1:grip', value: 'caught' } },
        lines: [
          { who: null, text: 'הוא מתכופף, ובתנועה אחת אתה למעלה, על הכתפיים. היד שלו נסגרת על הקרסול שלך — באותו מקום בדיוק.' },
          { who: 'קובי', text: 'תחזיק חזק, פוגי.' },
        ],
        then: [{ e: 'rel', who: 'kobi', axis: 'sharedHistory', delta: 4 }, { e: 'flagValue', flag: 'life:a8:shoulders', value: 'caught' }, { e: 'ending', id: 'home' }],
      },
      {
        lines: [
          { who: null, text: 'הוא מתכופף, ובתנועה אחת אתה למעלה, על הכתפיים, כמו כשהיית קטן.' },
          { who: 'קובי', text: 'תחזיק חזק, פוגי.' },
        ],
        then: [{ e: 'flagValue', flag: 'life:a8:shoulders', value: 'held' }, { e: 'ending', id: 'home' }],
      },
    ],
  },
  {
    id: 'rachel-doorway',
    nameHe: 'רחל',
    branches: [
      {
        shot: { focus: 'rachel', framing: 'close', ambienceDuck: 0.5 },
        lines: [
          { who: null, text: 'היא לא אומרת לא. היא גם לא אומרת כן.' },
          { who: 'רחל', text: 'אתה יודע איפה שער שבע?' },
          { who: null, text: 'אתה מהנהן, וזה חצי נכון.' },
          { who: 'רחל', text: 'אם משהו — אתה עומד במקום אחד ולא זז עד שהוא מוצא אותך. שמעת?' },
        ],
        then: [
          { e: 'flag', flag: 'knows:gate7' },
          { e: 'bond', who: 'rachel', delta: 6 },
          { e: 'wellbeing', key: 'stress', delta: -6 },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ המידע: עמית ---
  {
    id: 'amit-kiosk',
    nameHe: 'עמית',
    branches: [
      {
        when: { flag: 'knows:gate7' },
        lines: [
          { who: 'עמית', text: 'כבר אמרתי לך הכול. תלך כבר.' },
        ],
      },
      {
        // Before one o'clock, and he is twenty agorot short. What the player does here
        // is remembered for the rest of the afternoon.
        when: { minAgorot: 100 },
        shot: { focus: 'amit', framing: 'medium' },
        lines: [
          { who: null, text: 'עמית עומד ליד הדלפק וסופר מטבעות בכף היד. שוב.' },
          { who: 'עמית', text: 'חסר לי עשרים. תמיד חסר לי עשרים.' },
        ],
        choices: [
          {
            id: 'pay',
            text: 'קח, יש לי.',
            then: [
              { e: 'money', agorot: -100, why: 'לעמית' },
              { e: 'bond', who: 'amit', delta: 14 },
              { e: 'personality', key: 'empathy', delta: 8 },
              { e: 'remember', who: 'amit', eventId: 'paid-for-the-paper', significance: 'major' },
              { e: 'toast', text: 'הוא לא אומר תודה. הוא יזכור.' },
            ],
          },
          { id: 'watch', text: 'לא להגיד כלום.', then: [{ e: 'personality', key: 'curiosity', delta: 2 }] },
          {
            id: 'swap',
            text: 'יש לי כפולים. מחליף?',
            when: { all: [{ flag: 'album:seen' }, { duplicatesAtLeast: 1 }] },
            hidden: true,
            then: [{ e: 'swap', who: 'amit' }],
          },
        ],
      },
      {
        lines: [
          { who: null, text: 'עמית סופר מטבעות ליד הדלפק, ורפי מחכה בסבלנות של מישהו שראה את זה כבר.' },
          { who: 'עמית', text: 'העיתון עולה יותר מאתמול. אני נשבע לך.' },
        ],
      },
    ],
  },
  {
    id: 'amit-street',
    nameHe: 'עמית',
    branches: [
      /** (pass 28.9.2026) "עם עמית. הוא יודע איזה שער." — and he does */
      {
        when: { flagIs: { flag: 'life:a7:plan', value: 'amit' }, none: [{ flag: 'knows:gate7' }] },
        lines: [
          { who: 'עמית', text: 'סיכמנו. תראה.' },
          { who: null, text: 'הוא פותח את העיתון על העמוד הנכון, זה שהוא קרע לך בשבת, ומצביע על מספר.' },
          { who: 'עמית', text: 'שער שבע. כולם מהשכונה שם. לא שש, לא שמונה.' },
        ],
        then: [{ e: 'seize', opportunity: 'amit-paper' }, { e: 'flag', flag: 'knows:gate7' }, { e: 'rel', who: 'amit', axis: 'trust', delta: 3 }, { e: 'remember', who: 'amit', eventId: 'kept-the-plan-1986', significance: 'notable' }],
      },
      {
        when: { flag: 'knows:gate7' },
        lines: [{ who: 'עמית', text: 'מה, שכחת? שער שבע. לך.' }],
      },
      {
        // He remembers the twenty agorot, and the information is free.
        when: { relationshipMemory: { who: 'amit', eventId: 'paid-for-the-paper' } },
        shot: { focus: 'amit', framing: 'ots', ambienceDuck: 0.4 },
        lines: [
          { who: null, text: 'הוא רואה אותך מרחוק ומקפל את העיתון כך שהעמוד הנכון למעלה.' },
          { who: 'עמית', text: 'בגלל שנתת לי — תשמע טוב.' },
          { who: 'עמית', text: 'היום זה לא סתם משחק. אם מנצחים — נגמר היום. תיקו לא עוזר לנו.' },
          { who: 'עמית', text: 'והשער שבו כולם מהשכונה עומדים זה שבע. לא שש, לא שמונה.' },
        ],
        then: [
          { e: 'seize', opportunity: 'amit-paper' },
          { e: 'give', item: 'newspaper' },
          { e: 'toast', text: 'קרעת את עמוד הספורט. הוא נתן לך.' },
        ],
      },
      {
        when: { minAgorot: 100 },
        shot: { focus: 'amit', framing: 'medium' },
        lines: [
          { who: null, text: 'עמית יושב על המדרכה עם עיתון פתוח על הברכיים, ומכסה חצי ממנו ביד.' },
          { who: 'עמית', text: 'מה, אתה רוצה לדעת? זה שלי, קניתי אותו.' },
        ],
        choices: [
          {
            id: 'buy',
            text: 'שקל, ואני קורא איתך.',
            then: [
              { e: 'money', agorot: -100, why: 'עמית' },
              { e: 'seize', opportunity: 'amit-paper' },
              { e: 'give', item: 'newspaper' },
            ],
          },
          {
            id: 'ask',
            text: 'רק תגיד לי מה כתוב.',
            then: [
              { e: 'seize', opportunity: 'amit-paper' },
              { e: 'rel', who: 'amit', axis: 'tension', delta: 4 },
            ],
          },
          { id: 'go', text: 'עזוב.', then: [] },
        ],
      },
      {
        shot: { focus: 'amit', framing: 'medium' },
        lines: [
          { who: null, text: 'עמית יושב על המדרכה עם עיתון פתוח על הברכיים.' },
          { who: 'עמית', text: 'אתה יודע לקרוא מהר? כי אני לא נותן לך אותו ביד.' },
        ],
        choices: [
          {
            id: 'read',
            text: 'להסתכל מעבר לכתף שלו.',
            then: [
              { e: 'seize', opportunity: 'amit-paper' },
              { e: 'personality', key: 'curiosity', delta: 6 },
            ],
          },
          { id: 'go', text: 'אחר כך.', then: [] },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------- קרן ---------
  {
    id: 'keren-street',
    nameHe: 'קרן',
    branches: [
      {
        when: { bond: { who: 'keren', min: 20 } },
        lines: [
          { who: 'קרן', text: 'אם אתה הולך — תלך כבר, לפני שאמא שלך תראה אותך.' },
        ],
      },
      {
        shot: { focus: 'keren', framing: 'medium', ambienceDuck: 0.3 },
        lines: [
          { who: null, text: 'קרן יושבת על המדרגה עם צעיף אדום על הברכיים ומותחת חוט שיצא ממנו.' },
          { who: 'קרן', text: 'זה של אח שלי. שכח אותו על המיטה, והוא ימות בלעדיו.' },
          { who: null, text: 'היא מסתכלת עליך כמו מישהי שכבר יודעת לאן אתה הולך.' },
        ],
        choices: [
          {
            id: 'ask',
            text: 'איך זה שם? ביציע.',
            then: [
              { e: 'bond', who: 'keren', delta: 12 },
              { e: 'redheart', key: 'terraceCulture', delta: 10 },
              { e: 'wellbeing', key: 'belonging', delta: 6 },
              { e: 'goto', node: 'keren-terrace' },
            ],
          },
          {
            id: 'scarf',
            text: 'אני יכול לקחת לו אותו.',
            when: { flag: 'knows:match' },
            noteHe: 'צריך לדעת שיש היום משחק',
            then: [
              { e: 'give', item: 'scarf' },
              { e: 'bond', who: 'keren', delta: 16 },
              { e: 'personality', key: 'responsibility', delta: 6 },
              { e: 'remember', who: 'keren', eventId: 'took-the-scarf', significance: 'notable' },
              { e: 'toast', text: 'צעיף אדום, מקופל לרבע, בתוך החולצה.', tone: 'red' },
            ],
          },
          { id: 'nothing', text: 'להמשיך.', then: [] },
        ],
      },
    ],
  },
  {
    id: 'keren-terrace',
    nameHe: 'קרן',
    branches: [
      {
        lines: [
          { who: 'קרן', text: 'רועש. ואף אחד לא יושב, גם כשיש כיסא.' },
          { who: 'קרן', text: 'ואם מבקיעים, כולם צועקים איזה גול, ואתה לא רואה כלום כי קופצים עליך.' },
          { who: null, text: 'היא אומרת את זה כאילו זה חיסרון. אתה שומע את זה אחרת.' },
        ],
        then: [{ e: 'redheart', key: 'travelDrive', delta: 6 }],
      },
    ],
  },

  // --------------------------------------------------------------------- אפי --------
  {
    id: 'efi-hall',
    nameHe: 'אפי',
    branches: [
      {
        when: { flag: 'saw:hall' },
        lines: [{ who: 'אפי', text: 'אמרתי לך שזה שווה. עכשיו תלך לאבא שלך.' }],
      },
      {
        when: { afterMinute: at(14, 0) },
        lines: [
          { who: null, text: 'אפי כבר לא פה. הכדור שלו נשאר ליד האבן, והוא לא כזה שמשאיר כדור.' },
        ],
      },
      /**
       * (pass 28.9.2026) a boy who has already been inside Ussishkin (A3) is not told there
       * is a hall — he is reminded of what his body did there. Same choice, same cost.
       */
      {
        // …and what his body did there, two years ago, is what Efi remembers first
        when: { flag: 'life:knows:hall', flagIs: { flag: 'life:a3:locker', value: 'wished' }, none: [{ flag: 'saw:hall' }] },
        shot: { focus: 'efi', framing: 'medium' },
        lines: [
          { who: 'אפי', text: 'אוסישקין, עכשיו. יש אימון פתוח.' },
          { who: 'אפי', text: 'והענק מהמסדרון, זה שאמרת לו "בהצלחה"? הוא עוד שואל איפה הילד הקטן.' },
        ],
        choices: EFI_HALL_KNOWN,
      },
      {
        when: { flag: 'life:knows:hall', flagIs: { flag: 'life:a3:usher', value: 'door' }, none: [{ flag: 'saw:hall' }] },
        shot: { focus: 'efi', framing: 'medium' },
        lines: [
          { who: 'אפי', text: 'אוסישקין, עכשיו. יש אימון פתוח.' },
          { who: 'אפי', text: 'הסדרן קורא לך "שומר הדלת". תבוא, יש לו בשבילך דלת.' },
        ],
        choices: EFI_HALL_KNOWN,
      },
      {
        when: { flag: 'life:knows:hall', none: [{ flag: 'saw:hall' }] },
        shot: { focus: 'efi', framing: 'medium' },
        lines: [
          { who: null, text: 'אפי מקפיץ את הכדור הכתום על המדרכה, פעם, ועוד פעם.' },
          { who: 'אפי', text: 'אוסישקין, עכשיו. יש אימון פתוח. אתה זוכר את הרצפה?' },
        ],
        choices: EFI_HALL_KNOWN,
      },
      {
        // The other life. It closes at two, and the player almost certainly does not
        // know that — which is the point of a missable thing.
        shot: { focus: 'efi', framing: 'medium' },
        lines: [
          { who: null, text: 'אפי מחזיק כדור שהוא לא בועט בו. הוא מקפיץ אותו על הרצפה, פעם, ועוד פעם.' },
          { who: 'אפי', text: 'זה לא כדורגל. זה אחר.' },
          { who: 'אפי', text: 'יש אולם. אני הולך לשם עוד רגע, זה חמש דקות מפה.' },
        ],
        choices: [
          {
            id: 'go',
            text: 'בוא נלך.',
            then: [
              { e: 'seize', opportunity: 'efi-hall' },
              { e: 'goto', node: 'efi-hall-after' },
            ],
          },
          {
            id: 'no',
            text: 'היום יש משחק.',
            when: { flag: 'knows:match' },
            noteHe: 'צריך לדעת שיש היום משחק',
            then: [
              { e: 'redheart', key: 'footballLove', delta: 5 },
              { e: 'rel', who: 'efi', axis: 'distance', delta: 8 },
            ],
          },
          { id: 'later', text: 'אולי אחר כך.', then: [] },
        ],
      },
    ],
  },
  {
    id: 'efi-hall-after',
    nameHe: 'אפי',
    branches: [
      {
        lines: [
          { who: null, text: 'אולם קטן, ריח של גומי ושל פרקט. הכדור נשמע אחרת פה — גבוה, יבש, מהיר.' },
          { who: 'אפי', text: 'תראה. אני זורק מפה ואתה תופס.' },
          { who: null, text: 'אתה לא תופס. אתם צוחקים. חוזרים על זה עשרים פעם.' },
          { who: null, text: 'כשאתה יוצא החוצה השמש כבר נמוכה, והרחוב מלא אנשים שהולכים לכיוון אחד.' },
        ],
        then: [
          { e: 'flag', flag: 'saw:hall' },
          { e: 'wellbeing', key: 'happiness', delta: 10 },
          { e: 'wellbeing', key: 'exhaustion', delta: 8 },
        ],
      },
    ],
  },

  // ============================================================ הדרך לבלומפילד =======
  {
    id: 'route-shortcut',
    branches: [
      {
        when: { flag: 'used:shortcut' },
        lines: [{ who: null, text: 'הרווח בין הבתים. אתה כבר יודע לאן הוא יוצא.' }],
      },
      {
        // The street family's payoff: two minutes and a piece of knowledge, for a child
        // who has been paying attention to his own neighbourhood.
        when: { personalityAbove: { key: 'streetSmarts', min: 14 } },
        lines: [
          { who: null, text: 'רווח בין שני בתים, רחב בדיוק כמו ילד. מהצד השני שומעים את אותו רעש, רק קרוב יותר.' },
          { who: null, text: 'אתה נכנס, מסובב את הכתפיים, ויוצא שלושה בניינים אחרי כולם.' },
        ],
        then: [
          { e: 'flag', flag: 'used:shortcut' },
          { e: 'flag', flag: 'knows:route' },
          { e: 'trait', trait: 'streetSmarts', delta: 8 },
          { e: 'toast', text: 'קיצור דרך. חסכת כמה דקות.' },
        ],
      },
      {
        lines: [
          { who: null, text: 'רווח צר בין שני בתים, מלא ארגזים. אולי הוא מוביל לאנשהו ואולי לא.' },
          { who: null, text: 'אתה לא מכיר את הצד השני מספיק טוב כדי להיכנס לבד.' },
        ],
      },
    ],
  },
  {
    id: 'gate-turnstile',
    branches: [
      {
        lines: [
          { who: null, text: 'קרוסלת ברזל, גבוהה ממך. כל אחד שנכנס דוחף אותה פעם אחת והיא מקרקשת.' },
          { who: null, text: 'ילדים עוברים עם מבוגר, מתחת ליד שלו. סדרן מסתכל ולא אומר כלום.' },
        ],
        then: [{ e: 'trait', trait: 'streetSmarts', delta: 3 }],
      },
    ],
  },
  {
    id: 'gate-family',
    nameHe: 'אבא עם ילד',
    branches: [
      {
        when: { flag: 'entry:granted' },
        lines: [{ who: 'אבא עם ילד', text: 'נו, קדימה, זה מתחיל.' }],
      },
      {
        // The RESOURCE route ends here too: a child with a ticket and no adult still
        // needs somebody to walk in beside.
        when: { hasItem: 'ticket-stub' },
        shot: { focus: 'both', framing: 'medium' },
        lines: [
          { who: null, text: 'אבא ובן, בערך בגיל שלך, בתור לקרוסלה. הוא רואה את הכרטיס ביד שלך.' },
          { who: 'אבא עם ילד', text: 'לבד עם כרטיס? יאללה, תיכנס לידנו, שלא ידחפו אותך.' },
        ],
        then: [
          { e: 'flag', flag: 'entry:granted' },
          { e: 'flag', flag: 'entry:ticket' },
          { e: 'wellbeing', key: 'belonging', delta: 8 },
          { e: 'toast', text: 'אתה נכנס', tone: 'red' },
        ],
      },
      {
        // The STREET route: no ticket, no name, no friend. Just a child who knows how a
        // queue works and is willing to ask. Nothing is climbed and nothing is stolen.
        when: { personalityAbove: { key: 'streetSmarts', min: 20 } },
        shot: { focus: 'both', framing: 'ots' },
        lines: [
          { who: null, text: 'אתה עומד ליד הבן שלו ומחזיק את הקצה של החולצה שלך, כאילו אתה מחכה למישהו.' },
          { who: null, text: 'האבא סופר ראשים כמו כל אבא, מגיע לשלושה במקום שניים, ועוצר.' },
          { who: 'אבא עם ילד', text: 'ואתה של מי?' },
        ],
        choices: [
          {
            id: 'truth',
            text: 'אבא שלי בפנים. בשער שבע.',
            then: [
              { e: 'flag', flag: 'entry:granted' },
              { e: 'flag', flag: 'entry:family' },
              { e: 'personality', key: 'courage', delta: 8 },
              { e: 'redheart', key: 'community', delta: 8 },
              { e: 'toast', text: 'הוא מניח לך יד על הכתף ומעביר אותך איתם.', tone: 'red' },
            ],
          },
          {
            id: 'silent',
            text: 'לא לענות.',
            then: [
              { e: 'wellbeing', key: 'stress', delta: 10 },
              { e: 'toast', text: 'הוא מושך את הבן שלו קדימה ואתה נשאר מאחור.' },
            ],
          },
        ],
      },
      {
        lines: [
          { who: null, text: 'אבא ובן בתור לקרוסלה. האבא מחזיק שני כרטיסים ומסתכל קדימה.' },
          { who: null, text: 'אתה לא מצליח לומר כלום, והתור זז.' },
        ],
        then: [{ e: 'wellbeing', key: 'loneliness', delta: 5 }],
      },
    ],
  },
  /**
   * הרווח בגדר — the sneak, and the fail-forward it ends in (Director V3 §12, 25.9.2026).
   *
   * A boy who looked at the gap a week earlier (`life:a7:scouted`), or who knows his
   * streets well enough to see one, can go under the fence. He does not get in that way:
   * rule §42 stands — nothing is climbed and nothing is stolen — and a steward's hand on
   * his collar is where the sneak ends. But it does not end the day. The steward walks him
   * along the fence, and the one man at gate seven who asks "לבד, מה?" is standing exactly
   * there (`gate-veteran`). Failing is the way to the kindness, and it costs mud and a
   * minute of shame.
   */
  {
    id: 'gap-1986',
    nameHe: null,
    branches: [
      {
        when: { flag: 'life:a7:scouted' },
        lines: [
          { who: null, text: 'העמוד השלישי. הרווח מתחת לגדר, בדיוק איפה שהיה לפני שבוע.' },
          { who: null, text: 'אתה על הבטן, חצי גוף בפנים — ויד גדולה תופסת לך את הצווארון.' },
          { who: 'סדרן', text: 'לאן? לבד לא נכנסים. גם לא מלמטה.' },
          { who: null, text: 'הוא מושך אותך בחזרה לאור, לאורך הגדר, עם בוץ על החולצה — ישר לאיש הזקן עם הסיגריה.' },
        ],
        then: [{ e: 'flag', flag: 'entry:caught' }, { e: 'energy', delta: -5 }, { e: 'time', minutes: 6 }, { e: 'trait', trait: 'courage', delta: 2 }, { e: 'goto', node: 'gate-veteran' }],
      },
      {
        lines: [
          { who: null, text: 'רווח צר מתחת לגדר, מלא בוץ יבש. רחב בדיוק כמו ילד.' },
          { who: null, text: 'אתה על הבטן, חצי גוף בפנים — ויד גדולה תופסת לך את הצווארון.' },
          { who: 'סדרן', text: 'לאן? לבד לא נכנסים. גם לא מלמטה.' },
          { who: null, text: 'הוא מושך אותך בחזרה לאור, לאורך הגדר, עם בוץ על החולצה — ישר לאיש הזקן עם הסיגריה.' },
        ],
        then: [{ e: 'flag', flag: 'entry:caught' }, { e: 'energy', delta: -5 }, { e: 'time', minutes: 6 }, { e: 'goto', node: 'gate-veteran' }],
      },
    ],
  },
]

/**
 * One registry, every chapter. A conversation id is global on purpose — `steward` is the
 * 1986 steward and `steward-1990` the 1990 one, and a scene names which it wants — so a
 * second chapter is a second content file and not a second runner (brief §52).
 */

export const DIALOGUE: Record<string, Conversation> = Object.fromEntries(
  [...CONVERSATIONS, ...CONVERSATIONS_1990, ...CONVERSATIONS_1991, ...CONVERSATIONS_ALLENBY, ...CONVERSATIONS_USSISHKIN, ...CONVERSATIONS_PANORAMAS, ...CONVERSATIONS_BLOOMFIELD, ...CONVERSATIONS_1993, ...CONVERSATIONS_GALIL, ...CONVERSATIONS_SINAI, ...CONVERSATIONS_ARMY, ...CONVERSATIONS_HALL, ...CONVERSATIONS_LACES, ...CONVERSATIONS_SEED, ...CONVERSATIONS_CUP99, ...CONVERSATIONS_TITLE, ...CONVERSATIONS_DOUBLE, ...CONVERSATIONS_BRIDGE, ...CONVERSATIONS_EUROPE, ...CONVERSATIONS_HOME, ...CONVERSATIONS_FOUNDING, ...CONVERSATIONS_2010, ...CONVERSATIONS_CHAMPIONS, ...CONVERSATIONS_GROWTH, ...CONVERSATIONS_NEWHALL, ...CONVERSATIONS_COLLAPSE, ...CONVERSATIONS_RETURN, ...CONVERSATIONS_LATE, ...CONVERSATIONS_HOME24, ...CONVERSATIONS_FINALE, ...CONVERSATIONS_FAMILY, ...CONVERSATIONS_PROMISES, ...CONVERSATIONS_WINDOWS, ...CONVERSATIONS_TEAM, ...CONVERSATIONS_CAREER, ...CONVERSATIONS_FRIENDS, ...CONVERSATIONS_ABROAD, ...CONVERSATIONS_ROOMS2000, ...CONVERSATIONS_BATYA, ...CONVERSATIONS_OWNER, ...CONVERSATIONS_COMBOS, ...CONVERSATIONS_MATCH, ...CONVERSATIONS_A1, ...CONVERSATIONS_A2, ...CONVERSATIONS_A3, ...CONVERSATIONS_A4, ...CONVERSATIONS_A5, ...CONVERSATIONS_A6, ...CONVERSATIONS_A7, ...CONVERSATIONS_SCARF, ...CONVERSATIONS_MORNING_86, ...CONVERSATIONS_ROUTES, ...CONVERSATIONS_ACTIVITIES, ...CONVERSATIONS_MISSIONS, ...fanShops(), ...gigConversations()].map(
    (conversation) => [conversation.id, conversation],
  ),
)
