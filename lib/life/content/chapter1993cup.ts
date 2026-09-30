import { at } from '../clock'
import type { PassageObject } from './chapter1990'
import type { RandomEncounter } from '../encounters'
import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { Conversation } from './script'

/**
 * עשרים שקל, ומי אמר אותם.
 *
 * הסכום שהתור השלים עליך בדלת של האוטובוס — נכתב כאן, ונפרע באותו סכום בדיוק ב-1999.
 * הדגל `owe:group` אומר למי; זה אומר כמה, ובלעדיו שדה החוב במנוע נשאר אפס לנצח.
 */
const QUEUE_AGOROT = 2000

/**
 * B3 · "הגביע אדום" · 19.4.1993 — the first joy that feels complete, and the first
 * time the joy belongs to a group he chose rather than a father he followed.
 *
 * The day is a Monday. The final is in the evening, in a hall that is not theirs — the
 * archive row names it (`content/manual/basketball-matches.json`, 19.4.1993: היכל יד
 * אליהו), and the map has carried it since 1993, so the lines may say the hall even
 * though they may never say the game. The play is BEFORE the hall: money, a route, a
 * banner that needs carrying, a choice of who to go with — Efi and Limor's planned route
 * by bus from the Ussishkin corner, Ofir and Amit's improvised one, or the television at
 * home with Kobi, who does not do basketball but does do his son. The final itself is not
 * a scene the player controls: it is a cut — the big hall in a card, the sound, the boy's
 * own lines — and then the walk after, which is where the chapter actually lives.
 *
 * The fare is 36: a 30 ₪ ticket and a 6 ₪ ride, which is exactly the month's leftover
 * (22) plus his mother's face (8) plus Rafi's crates (6). Pride costs the bus, and the
 * group is the way back onto it.
 *
 * **No line here states a score, an opponent or a scorer.** The archive holds the row,
 * the finale reads it, and the crowd in this chapter reacts to a game whose numbers the
 * game never says out loud. The two facts the lines do borrow are Ussishkin's dripping
 * tin roof (`ussishkin.json` · condition) and the nine years since the last cup
 * (`ussishkin.json` · cups: 1961/62, 1968/69, 1983/84).
 */

export const BUS_LEAVES = at(18, 30)

/** the payphone at the Dan stop (`bs-phone-1993`) — what his mother knows at midnight (`close-1993`) */
export const CALL_1993 = 'life:1993:call'

/**
 * מתי נועל השער הצדדי — eight o'clock, and Efi has been saying so since the chapter was
 * written: "תגיד לו שהשער הצדדי נסגר בשמונה, לא בתשע כמו שהוא חושב". It closes at eight.
 * That line is now load-bearing rather than decorative.
 */
export const SIDE_GATE_SHUTS = at(20, 0)
export const TIP_OFF_93 = at(20, 0)
export const FINAL_HORN_93 = at(21, 40)

export const PORTRAIT_1993: Record<string, string> = {
  'פוגי': 'faceHero80',
  'קובי': 'faceKobi',
  'רחל': 'faceRachel90',
  'אפי': 'faceEfi',
  'לימור': 'faceLimor',
  // מישל בר־כליפא — his plate has been on disk since the September ingest
  // (`faceMichel`, `michel96-walk*`, `michel99`) and was in no portrait map, so the one
  // line that named him drew an empty nameplate. He is the transport, and from here he
  // has a face while he does it.
  'מישל': 'faceMichel',
  'אסף': 'faceAsaf',
  'אופיר': 'faceOfir',
  'עמית': 'faceAmit',
  'רפי מהקיוסק': 'faceOldMan',
  'שחור': 'faceShachor',
  'אוהד': 'faceSupporter',
  'אוהדת': 'faceWoman',
  'אוהד ותיק': 'faceOldMan',
  'סדרן': 'faceUsher',
  // שני הקבועים של אלנבי — שני השחקנים האלה מתויגים `era: '*'` ב-`scenes.ts`, כלומר הם
  // עומדים שם בכל פרק, ולכן כל מפה צריכה את הפלייטים שלהם.
  'המוכר': 'faceVendor',
  'הגבר': 'faceSupporterB',
}

export const OBJECTIVES_1993 = {
  morning: 'ערב גמר. איך מגיעים?',
  money: 'צריך כסף לכרטיס ולנסיעה.',
  route: 'להחליט עם מי הולכים.',
  bus: 'האוטובוס יוצא מהפינה של אוסישקין.',
  tv: 'הטלוויזיה בסלון. אבא בכורסה.',
  after: 'הלילה עוד לא נגמר.',
  afterWalk: 'למי מספרים קודם: האוטובוס חזרה, אופיר בקיוסק, או האור במטבח.',
  home: 'הביתה.',
}


/**
 * הגשר מ-1991 ל-1993 — the two years the game skipped.
 *
 * Stage B §7 B2 asks for "11.3.1991 + season bridge", and the bridge was missing: the
 * derby ended and April 1993 began, so the hall the whole unit is about was one Monday
 * evening followed by silence. Four objects in the same bedroom say what actually
 * happened in between — that a boy started going, kept going, and stopped asking
 * permission — and none of them states a result, because the archive is what states
 * results and a bedroom is not the archive.
 *
 * The mechanism is `PassageScene`, which stopped being 1986's private scene on 6.9.2026
 * and became what it always was: how this game shows time passing.
 */
export const PASSAGE_1993: PassageObject[] = [
  {
    id: 'years',
    labelHe: 'הקופסה האדומה',
    lookHe: 'שנתיים נכנסו לקופסה בלי לבקש רשות: כרטיסים אם היית, פתקים אם פספסת, ודברים ששמעת מאחרים. היא לא מספרת חיים שלא חיית.',
    afterHe: 'החדר נשאר אותו חדר. אתה כבר בן חמש־עשרה, ופחות דברים דורשים רשות מראש.',
  },
]

export const PASSAGE_CARD_1993_HE = 'אפריל 1993'

export function objective1993(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (state.flags['final:over']) return state.flags['walked:home'] ? null : state.flags['after:walk'] ? OBJECTIVES_1993.afterWalk : OBJECTIVES_1993.after
  if (state.flags['route:tv']) return OBJECTIVES_1993.tv
  if (state.flags['route:efi'] || state.flags['route:ofir']) return sceneId === 'ussishkin-outside' ? OBJECTIVES_1993.bus : OBJECTIVES_1993.bus
  if (state.agorot < 1200 && !state.flags['money:enough']) return OBJECTIVES_1993.money
  return OBJECTIVES_1993.route
}

// ---------------------------------------------------------------------------------
// ENDINGS — every route ends with something. Presence is how he was there.
// ---------------------------------------------------------------------------------
export const ENDINGS_1993: Record<string, EndingCard> = {
  inside: {
    id: 'inside',
    titleHe: 'הגביע אדום',
    bodyHe:
      'חזרת בשתים־עשרה בלילה עם קול צרוד וריח של אולם זר על החולצה. אמא לא שאלה כלום, רק הראתה לך על הכיור. אבא הרים עין מהעיתון ואמר "נו?", ואמרת "נו" בחזרה, ושניכם הבנתם. בחוץ מישהו עוד צפר.',
    memoryHe: 'קרע של נייר אדום מהיציע. החזקת אותו בכיס כל הדרך ולא הוצאת אותו אפילו באוטובוס.',
    memoryItem: 'hall-ticket',
    presence: 'inside',
  },
  late: {
    id: 'late',
    titleHe: 'בחצי השני',
    bodyHe:
      'הגעת כשההיכל כבר רעד. פספסת את ההתחלה ואת הפחד של ההתחלה, אבל את הסוף לא. הסוף היה שלך כמו של כולם, ובדרך הביתה אפי לא הזכיר במילה שאיחרת. הוא רק שר, ולא נכון.',
    memoryHe: 'כרטיס מקומט, קרוע בקצה. הסדרן קרע אותו מהר כי כבר התחילו.',
    memoryItem: 'hall-ticket',
    presence: 'late',
  },
  television: {
    id: 'television',
    titleHe: 'מהסלון',
    bodyHe:
      'ראית את זה מהכורסה, עם אבא, שלא מבין את החוקים ושאל ארבע פעמים "למה זה שלוש?". בדקות האחרונות הוא קם ועמד ליד המכשיר, כאילו מקרוב זה נכנס יותר טוב. כשזה נגמר הוא אמר "יפה" ונגע לך בכתף. זה לא היה ההיכל. זה היה משהו אחר, ושווה לשמור גם אותו.',
    memoryHe: 'העמוד מהעיתון של מחרת. אבא גזר אותו בשבילך ולא אמר על זה מילה.',
    memoryItem: 'clipping',
    presence: 'television',
  },
  missed: {
    id: 'missed',
    titleHe: 'מהרחוב',
    bodyHe:
      'לא הגעת להיכל ולא לסלון. שמעת את זה מהחלונות של השכונה — ברגע אחד כל הרחוב צעק, ואתה עמדת על המדרכה והבנת. למחרת אפי סיפר לך הכול פעמיים. בפעם השנייה כבר ידעת מה יבוא, ועדיין רצית לשמוע.',
    memoryHe: 'כלום ביד. רק הסיפור של אפי, שאתה כבר יודע בעל פה.',
    memoryItem: 'folded-paper',
    presence: 'heard-from-friend',
  },
}

// ---------------------------------------------------------------------------------
// BEATS — what the day does by itself.
// ---------------------------------------------------------------------------------
export const BEATS_1993: Beat[] = [
  // the Dan stop on the corner (27.9.2026): the wait is a place, not a gap
  {
    id: '93-stop',
    at: 'bus-stop',
    trigger: 'enter',
    when: { none: [{ flag: 'bs:seen' }, { flag: 'on:bus' }, { flag: 'final:over' }] },
    delayMs: 700,
    do: [
      { a: 'flag', flag: 'bs:seen' },
      { a: 'lines', lines: [{ who: null, text: 'התחנה של "דן" בפינה. הקו הרגיל — והערב, בזכות מישל, גם האוטובוס להיכל. עיתונים על המעמד, טלפון ציבורי, ואנשים שמחכים לדברים אחרים.' }] },
    ],
  },
  {
    id: '93-open',
    at: 'home',
    trigger: 'enter',
    when: { notFlag: 'beat:93-open' },
    delayMs: 600,
    do: [
      {
        a: 'lines',
        lines: [
          { who: null, text: 'יום שני, שלוש וחצי. התיק ליד הדלת איפה שזרקת אותו, והבית שקט כמו לפני משהו.' },
          { who: null, text: 'הערב גמר. לא כדורגל — כדורסל. ולא באוסישקין: בהיכל הגדול ביד אליהו.' },
          { who: null, text: 'אפי אמר "שש וחצי בפינה, מישל מסדר את ההסעה". אמא עוד לא יודעת מזה כלום.' },
        ],
      },
    ],
  },
  // the bus leaves from the corner of Ussishkin at half past six, with or without him
  {
    id: '93-bus-gone',
    trigger: 'clock',
    waitingHe: 'ממתין: האוטובוס יוצא',
    // `bus:gone` in its own guard (25.9.2026): without it the beat was due again on every
    // tick after it ran (rule 42 re-arms a beat whose `when` still holds), the toast
    // repeated for ever, and every clock beat after it in this list — eight o'clock, the
    // street at twenty to ten, the only ending a boy who missed the bus has — was starved
    when: { afterMinute: BUS_LEAVES + 12, none: [{ flag: 'on:bus' }, { flag: 'route:tv' }, { flag: 'bus:gone' }] },
    do: [{ a: 'toast', text: 'שש וארבעים. הפינה ריקה. האוטובוס לא חיכה לאף אחד.', tone: 'red' }, { a: 'flag', flag: 'bus:gone' }],
  },
  // eight o'clock: somewhere across the city a hall goes off
  {
    id: '93-tipoff',
    trigger: 'clock',
    waitingHe: 'ממתין: הקפיצה הראשונה',
    when: { afterMinute: TIP_OFF_93, none: [{ flag: 'on:bus' }, { flag: 'route:tv' }, { flag: 'tipoff:93' }] },
    do: [{ a: 'toast', text: 'שמונה. ביד אליהו הרימו כדור אחד באוויר, ואתה פה.', tone: 'plain' }, { a: 'flag', flag: 'tipoff:93' }],
  },
  // the television route: the family, the chair, the final in the living room
  {
    id: '93-tv',
    at: 'home',
    trigger: 'clock',
    waitingHe: 'ממתין: השידור מתחיל',
    when: { afterMinute: TIP_OFF_93, flag: 'route:tv' },
    do: [
      { a: 'sound', kind: 'radio', on: true },
      { a: 'card', titleHe: 'שמונה בערב', subHe: 'הסלון', ms: 2200 },
      { a: 'talk', conversation: 'tv-final-1993' },
      { a: 'flag', flag: 'final:over' },
      { a: 'ending', id: 'television' },
    ],
  },
  /**
   * (V3 §12) the kitchen light: a boy who walks home from the corner after the final tells
   * his father first — the `home` answer of the old menu, reached by the door
   */
  {
    id: 'after-home-1993',
    at: 'home',
    trigger: 'enter',
    when: { flag: 'after:walk', none: [{ flag: 'walked:home' }, { flag: 'after:group' }, { flag: 'after:ofir' }] },
    delayMs: 600,
    do: [
      { a: 'events', events: [{ t: 'relationship.changed', who: 'kobi', axis: 'bond', delta: 4 }, { t: 'redheart.changed', key: 'familyTradition', delta: 2 }, { t: 'flag.raised', flag: 'after:home' }] },
      { a: 'talk', conversation: 'close-1993' },
    ],
  },
  /**
   * הארכיון נפתח — the cup final, on film, once (§23.6; owner 25.9.2026: "מאשר את כולם.").
   *
   * The hall is a chain of lines (`hall-1993` → `quarters-1993` → `horn-1993` →
   * `after-1993`) and the payoff is the horn — "הגביע. אדום." — so the film comes AFTER
   * it, on the pavement the bus brings him back to (`after-1993` travels here with
   * `after:walk` up). Never before the horn: the boy earns the film by being there
   * (MASTER §55). `clock` + `at`, not `enter`, so a reload on the corner still gets it;
   * `93:film` is the beat's own guard because the sim does not raise the registry flag.
   * A film that cannot play falls through to the walk with nothing lost (rule §23.6).
   */
  {
    id: '93-film',
    at: 'ussishkin-outside',
    trigger: 'clock',
    when: { flag: 'after:walk', none: [{ flag: '93:film' }, { flag: 'walked:home' }] },
    delayMs: 900,
    do: [{ a: 'flag', flag: '93:film' }, { a: 'cutscene', id: '1993-cup' }],
  },
  /** and the night does end: at half past midnight the street is his way home anyway */
  {
    id: 'after-late-1993',
    trigger: 'clock',
    when: { flag: 'after:walk', afterMinute: at(23, 55), none: [{ flag: 'walked:home' }] },
    do: [{ a: 'talk', conversation: 'close-1993' }],
  },
  // the street at nine forty: the whole neighbourhood shouts at once
  {
    id: '93-street-roar',
    trigger: 'clock',
    waitingHe: 'ממתין: הרחוב שומע את התוצאה',
    when: { afterMinute: FINAL_HORN_93, none: [{ flag: 'on:bus' }, { flag: 'route:tv' }] },
    do: [
      { a: 'sound', kind: 'roar', big: 2 },
      { a: 'lines', lines: [{ who: null, text: 'מכל החלונות ברחוב, בבת אחת, אותה צעקה. אתה על המדרכה, ואתה מבין בלי שאף אחד אמר לך מילה.' }] },
      { a: 'flag', flag: 'final:over' },
      { a: 'ending', id: 'missed' },
    ],
  },
]

// ---------------------------------------------------------------------------------
// ENCOUNTERS — small, seeded, period.
// ---------------------------------------------------------------------------------
export const ENCOUNTERS_1993: RandomEncounter[] = [
  {
    id: '93-paper',
    era: '1993-cup',
    locations: ['street', 'kiosk'],
    weight: 3,
    lineHe: 'כרזה של הערב על עמוד חשמל, הדבק עוד רטוב. מישהו כבר קרע ממנה פינה למזכרת.',
    who: null,
    effects: [{ e: 'redheart', key: 'basketballLove', delta: 1 }],
  },
  {
    id: '93-radio-shop',
    era: '1993-cup',
    locations: ['street'],
    weight: 2,
    requirements: [{ afterMinute: at(17, 0) }],
    lineHe: 'מחנות הרדיו, דרך הדלת הפתוחה: "...הערב, בשמונה, שידור ישיר מההיכל..." ואז פרסומת.',
    who: null,
    effects: [{ e: 'flag', flag: 'heard:live' }],
  },
]

// ---------------------------------------------------------------------------------
// CONVERSATIONS
// ---------------------------------------------------------------------------------
export const CONVERSATIONS_1993: Conversation[] = [
  // ================================================================== the house ==
  {
    id: 'rachel-1993',
    nameHe: 'רחל',
    branches: [
      {
        when: { flag: 'final:over' },
        lines: [{ who: 'רחל', text: 'שתים־עשרה. אמרתי שתים־עשרה. לך לישון, מחר בית ספר.' }, { who: null, text: 'היא לא שאלה מה היה. הסתכלה עליך פעם אחת וכיבתה את האור במטבח.' }],
      },
      {
        when: { flag: 'route:tv' },
        lines: [{ who: 'רחל', text: 'נשארת? יופי. תביא כיסא מהמטבח, אבא לא יזוז מהכורסה בשביל אף אחד.' }],
      },
      {
        when: { flag: 'asked:money' },
        lines: [{ who: 'רחל', text: 'אמרתי מה שאמרתי. בשש וחצי יוצאים, בשתים־עשרה בבית, ולא חוזרים ברגל.' }],
      },
      {
        lines: [
          { who: 'רחל', text: 'גמר? של כדורסל? ביום שני?' },
          { who: 'פוגי', text: 'ביד אליהו. עם אפי, יש אוטובוס של מישל מהפינה.' },
          { who: 'רחל', text: 'ומי משלם על האוטובוס, ועל הכרטיס, ועל מה שתאכל שם?' },
        ],
        choices: [
          {
            id: 'ask',
            text: 'לבקש ממנה.',
            then: [
              { e: 'flag', flag: 'asked:money' },
              { e: 'money', agorot: 800, why: 'מאמא, בפרצוף' },
              { e: 'rel', who: 'rachel', axis: 'trust', delta: -2 },
              { e: 'personality', key: 'independence', delta: -1 },
              { e: 'toast', text: 'שמונה שקלים מהארנק שבמגירה. ההבעה הגיעה בחינם.', tone: 'plain' },
            ],
          },
          {
            id: 'own',
            text: 'יש לי. חסכתי.',
            when: { minAgorot: 1200 },
            noteHe: 'אין לך מספיק.',
            then: [
              { e: 'flag', flag: 'money:enough' },
              { e: 'rel', who: 'rachel', axis: 'trust', delta: 4 },
              { e: 'personality', key: 'independence', delta: 2 },
              { e: 'toast', text: 'היא לא אמרה כלום. אצלה זה הכי הרבה שאפשר להגיד.', tone: 'plain' },
            ],
          },
          {
            id: 'stay',
            text: 'אולי אני אשאר. יש טלוויזיה.',
            then: [
              { e: 'flag', flag: 'route:tv' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'wellbeing', key: 'belonging', delta: 2 },
              { e: 'toast', text: 'אבא, מאחורי העיתון, לא אמר כלום. אבל העיתון ירד קצת.', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'kobi-1993',
    nameHe: 'קובי',
    branches: [
      {
        when: { flag: 'route:tv' },
        lines: [
          { who: 'קובי', text: 'מתי מתחילים? שמונה? יופי. אני לא מבין בזה כלום, אבל אני יודע לזהות מתי צריך לצעוק.' },
        ],
      },
      {
        lines: [
          { who: 'קובי', text: 'כדורסל.' },
          { who: 'פוגי', text: 'כדורסל.' },
          { who: 'קובי', text: 'תגיד לי דבר אחד. כשהם מנצחים, זה מרגיש אותו דבר?' },
        ],
        choices: [
          {
            id: 'same',
            text: 'אותו דבר בדיוק.',
            then: [{ e: 'rel', who: 'kobi', axis: 'tension', delta: 2 }, { e: 'redheart', key: 'basketballLove', delta: 2 }, { e: 'toast', text: 'הוא הנהן לאט. לא הסכים, ולא התווכח.', tone: 'plain' }],
          },
          {
            id: 'different',
            text: 'אחרת. אבל גם.',
            then: [{ e: 'rel', who: 'kobi', axis: 'bond', delta: 3 }, { e: 'redheart', key: 'familyTradition', delta: 1 }, { e: 'toast', text: '"גם," הוא חזר. כאילו הוא בודק אם המילה מחזיקה.', tone: 'plain' }],
          },
          {
            id: 'dont-know',
            text: 'אני לא יודע עוד.',
            then: [{ e: 'personality', key: 'curiosity', delta: 1 }, { e: 'toast', text: '"אז לך תדע," הוא אמר, וחזר לעיתון.', tone: 'plain' }],
          },
        ],
      },
    ],
  },
  {
    id: 'tv-1993',
    nameHe: null,
    branches: [
      { when: { flag: 'route:tv' }, lines: [{ who: null, text: 'המסך עוד כבוי. אבא כבר הזיז את הכורסה עשרה סנטימטר קדימה ושם צלחת גרעינים על השרפרף.' }] },
      { lines: [{ who: null, text: 'הטלוויזיה. הערב אחד מהערוצים ישדר את ההיכל, ומי שיישאר פה יראה אותו קטן, לבן ורועד.' }] },
    ],
  },
  {
    id: 'tv-final-1993',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'ההיכל על המסך קטן ולבן ורועד. הקול מגיע חצי שנייה אחרי התמונה.' },
          { who: 'קובי', text: 'למה זה שלוש? הרגע היה שתיים.' },
          { who: 'פוגי', text: 'כי מרחוק זה שלוש.' },
          { who: 'קובי', text: 'אז שיזרקו רק מרחוק.' },
          { who: null, text: 'אמא הביאה תה ולא התיישבה. עמדה בפתח המטבח עם הכוס ביד, ומסתכלת עליכם יותר מאשר על המסך.' },
          { who: null, text: 'בדקות האחרונות אבא קם ועמד ליד המכשיר. כאילו זה יעזור. כאילו הוא בשער.' },
        ],
        choices: [
          {
            id: 'stand',
            text: 'לקום לידו.',
            then: [{ e: 'rel', who: 'kobi', axis: 'bond', delta: 5 }, { e: 'remember', who: 'kobi', eventId: 'stood-by-tv-1993', significance: 'notable' }, { e: 'redheart', key: 'familyTradition', delta: 3 }],
          },
          {
            id: 'sit',
            text: 'להישאר בכיסא. לא לזוז. שלא יקרה כלום.',
            then: [{ e: 'personality', key: 'stubbornness', delta: 2 }, { e: 'redheart', key: 'basketballLove', delta: 2 }],
          },
        ],
      },
    ],
  },

  // ================================================================== the street ==
  {
    id: 'efi-1993',
    nameHe: 'אפי',
    branches: [
      {
        when: { flag: 'route:efi' },
        lines: [{ who: 'אפי', text: 'שש וחצי, הפינה. מישל שומר לנו מקום. אל תאחר, אני לא מחכה.' }, { who: 'אפי', text: '...אני מחכה. אבל אל תאחר.' }],
      },
      {
        when: { flag: 'route:ofir' },
        lines: [{ who: 'אפי', text: 'עם אופיר, אה. בסדר. תגיד לו שהשער הצדדי נסגר בשמונה, לא בתשע כמו שהוא חושב.' }],
      },
      {
        when: { flag: 'route:tv' },
        lines: [{ who: 'אפי', text: 'טלוויזיה.' }, { who: 'אפי', text: 'טוב. תצעק חזק, אולי נשמע אותך משם.' }],
      },
      {
        lines: [
          { who: 'אפי', text: 'הערב. אתה בא?' },
          { who: null, text: 'אפי גדל השנה עשרה סנטימטר, וכל הסנטימטרים האלה עצבניים.' },
          { who: 'אפי', text: 'מישל מכיר את הנהג בפינה. שש וחצי, יש מקומות, ויש כרטיסים בכניסה למי שמגיע מוקדם.' },
        ],
        choices: [
          {
            id: 'with-efi',
            text: 'בא איתך. שש וחצי.',
            /**
             * `guided:efi` — 17.9.2026, ולא תוספת אלא שם לדבר שהבחירה כבר אומרת.
             *
             * "בא איתך. שש וחצי" זו נסיעה מודרכת במילים של ילד: אפי לוקח אותו. עד היום
             * הדגל היחיד שעלה כאן היה `route:efi`, והדלת לאוסישקין לא יודעת לקרוא אותו —
             * אז מי שלא היה באולם ב-1984 ולא הגיע אליו ב-1991 עמד בשדרה עם מסלול שנבחר
             * ובלי דלת. אותו חור בדיוק של 1991, שנתיים אחריו.
             */
            then: [{ e: 'flag', flag: 'route:efi' }, { e: 'flag', flag: 'guided:efi' }, { e: 'rel', who: 'efi', axis: 'bond', delta: 4 }, { e: 'redheart', key: 'basketballLove', delta: 2 }, { e: 'toast', text: 'הוא חייך כמו מישהו שהחזירו לו חוב.', tone: 'plain' }],
          },
          {
            id: 'with-ofir',
            text: 'אופיר אמר שיש דרך אחרת.',
            then: [{ e: 'flag', flag: 'route:ofir' }, { e: 'flag', flag: 'guided:ofir' }, { e: 'rel', who: 'efi', axis: 'tension', delta: 3 }, { e: 'toast', text: '"דרך אחרת." הוא הסתכל לכיוון הקיוסק ולא אמר עוד מילה.', tone: 'plain' }],
          },
          {
            id: 'later',
            text: 'עוד לא יודע.',
            then: [{ e: 'toast', text: '"שש וחצי," הוא חזר, והלך בלי להסתובב.', tone: 'plain' }],
          },
        ],
      },
    ],
  },
  {
    id: 'ofir-1993',
    nameHe: 'אופיר',
    branches: [
      {
        when: { flag: 'route:ofir' },
        lines: [{ who: 'אופיר', text: 'הטרמפ לא יצא. עמית בדק, אין קו מהצומת אחרי שבע. אז אוטובוס, כמו כולם, ואל תספר לאפי שאמרתי.' }],
      },
      {
        lines: [
          { who: 'אופיר', text: 'כדורסל, אה? אתה ואפי והאולם הקטן שלכם עם הגג שמטפטף.' },
          { who: 'אופיר', text: 'אבל הערב זה היכל גדול. היכל גדול זה כבר מעניין גם אותי.' },
          { who: 'אופיר', text: 'ויש דרך להגיע בלי האוטובוס של מישל. אם בא לך.' },
        ],
        choices: [
          { id: 'ok', text: 'ספר.', then: [{ e: 'toast', text: 'טרמפ עד הצומת, משם ברגל, ועמית מאחור עם הטרנזיסטור ליתר ביטחון.', tone: 'plain' }] },
          { id: 'no', text: 'אני עם אפי.', then: [{ e: 'rel', who: 'ofir', axis: 'distance', delta: 2 }, { e: 'toast', text: '"בסדר. נתראה שם. או שלא."', tone: 'plain' }] },
        ],
      },
    ],
  },
  {
    id: 'amit-1993',
    nameHe: 'עמית',
    branches: [
      {
        lines: [
          { who: 'עמית', text: 'גמר זה משחק אחד. לא סדרה, לא הלוך־חזור. מה שקורה בו קורה פעם אחת.' },
          { who: 'עמית', text: 'והגביע האחרון שלנו היה לפני תשע שנים. בדקתי בעיתונים של אבא שלי.' },
          { who: 'פוגי', text: 'תודה, עמית.' },
          { who: 'עמית', text: 'אני רק אומר.' },
        ],
        then: [{ e: 'personality', key: 'curiosity', delta: 1 }],
      },
    ],
  },

  // ================================================================== the kiosk ==
  {
    id: 'rafi-1993',
    nameHe: 'רפי מהקיוסק',
    branches: [
      {
        when: { flag: 'rafi:work' },
        lines: [{ who: 'רפי מהקיוסק', text: 'סידרת את הארגזים? יפה. הנה, וזה כבר עם העודף. לך תראה כדורסל, אני אשמע ברדיו.' }],
      },
      {
        lines: [
          { who: 'רפי מהקיוסק', text: 'ערב גדול, אה? רואים לך את זה על הפנים מהפינה.' },
          { who: 'רפי מהקיוסק', text: 'יש לי מאחור ארגזים שמחכים לגב צעיר. עשרים דקות. משהו לכיס.' },
        ],
        choices: [
          /**
           * (Director V3 §12, 25.9.2026) "earn fare": the six shekels are six crates carried
           * from behind the counter to the back door (`chore:story:crates-93`), a shekel a
           * crate — and every one of them is two minutes nearer half past six.
           */
          {
            id: 'work',
            text: 'לסדר את הארגזים.',
            then: [{ e: 'flag', flag: 'rafi:work' }, { e: 'personality', key: 'responsibility', delta: 2 }, { e: 'minigame', id: 'chore:story:crates-93' }],
          },
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
          { id: 'no', text: 'אין זמן, רפי.', then: [{ e: 'toast', text: '"תמיד אין זמן. לך, לך."', tone: 'plain' }] },
        ],
      },
    ],
  },

  // ================================================================== the corner ==
  /**
   * שני אנשים בפינה אחת, ושתי עבודות שונות.
   *
   * **מישל בר־כליפא הוא ההסעה.** הוא היה האיש שאחראי בפועל על הסעות האוהדים בשנות
   * השמונים והתשעים, ואוהד ידוע ומוכר של הפועל — מאור הראל, ידע אישי, 15.9.2026
   * (כלל 18: מאור הוא מקור, לא טענה שצריך לבדוק). עד כאן העבודה הזאת הייתה של לימור:
   * היא הכירה את הנהג, היא החזיקה מקום בתור, ובגליל היא עמדה ליד ההסעה עם הפנקס
   * וגבתה שלושים שקל. זה תפקידו של מישל, והוא קיבל אותו בחזרה.
   *
   * **לימור היא הדרך פנימה.** זה מה שהיא תמיד הייתה טובה בו והיא שומרת אותו: הכניסה
   * מהצד ולא מהחזית, התור שלוקח שעה, הסדרן שמכיר את כולם — ומי שאמר לה ב-1991 שהוא
   * לא יודע כלום. שתי עבודות שלא נוגעות זו בזו, ושתיהן טובות יותר כשהן לא אותו אדם.
   */
  {
    id: 'michel-1993',
    nameHe: 'מישל',
    branches: [
      {
        when: { flag: 'on:bus' },
        lines: [{ who: 'מישל', text: 'עלית? יופי. שב ליד החלון בצד הזה, ממנו רואים את כל העיר.' }],
      },
      {
        when: { afterMinute: BUS_LEAVES + 12 },
        lines: [{ who: 'מישל', text: 'האוטובוס יצא. אמרתי לאפי לחכות לך, והוא חיכה עד שהנהג צפר עליו.' }, { who: 'מישל', text: 'אין עוד אחד הערב. אני מצטער. תשמע את זה מהרחוב, כמו חצי מהעיר.' }],
        then: [{ e: 'flag', flag: 'late:route' }],
      },
      {
        lines: [
          { who: 'מישל', text: 'שש וחצי, מהפינה. לא שש ורבע ולא שבע — שש וחצי.' },
          { who: 'מישל', text: 'הנהג מכיר אותי, אז הוא מחכה דקה. דקה, לא עשר.' },
        ],
      },
    ],
  },
  {
    id: 'limor-1993',
    nameHe: 'לימור',
    branches: [
      /**
       * שנתיים אחרי — Limor remembers who admitted, in 1991, that he knew nothing.
       *
       * §17 asks the player to remember "the first time Ussishkin felt like another home",
       * and a person remembering you is what makes a place a home rather than a venue.
       * `knows:side` is a day flag and dies at the chapter cut; `life:limor:honest-1991` is
       * the one that survives, and it is set only by the honest answer.
       */
      {
        when: { flag: 'life:limor:honest-1991' },
        lines: [
          { who: 'לימור', text: 'אתה. הילד שאמר לי שהוא לא יודע כלום.' },
          { who: 'לימור', text: 'מהצד, כמו תמיד. ואל תשוויץ שיש לך כרטיס אם אין — הסדרן מכיר את כולם, וגם אותי.' },
        ],
        then: [{ e: 'rel', who: 'crowd-limor', axis: 'bond', delta: 4 }, { e: 'flag', flag: 'knows:side' }],
      },
      {
        lines: [
          { who: 'לימור', text: 'שמעת שיש כניסה מהצד, נכון? לא מהחזית. בחזית התור לוקח שעה.' },
          { who: null, text: 'לימור יודעת דברים. לימור תמיד יודעת דברים לפני שהם קורים.' },
          { who: 'לימור', text: 'ואם אין לך כרטיס, אל תשוויץ שיש. הסדרן שם מכיר את כולם, וגם אותי.' },
        ],
        choices: [
          { id: 'thanks', text: 'תודה. באמת.', then: [{ e: 'rel', who: 'crowd-limor', axis: 'bond', delta: 3 }, { e: 'flag', flag: 'knows:side' }] },
          { id: 'bluff', text: 'יש לי כרטיס.', when: { lacksItem: 'hall-ticket' }, noteHe: 'יש לך כרטיס אמיתי. אין מה לבלף.', then: [{ e: 'flag', flag: 'bluffed' }, { e: 'personality', key: 'impulsiveness', delta: 2 }, { e: 'toast', text: 'היא הרימה גבה ולא אמרה כלום. זה היה גרוע יותר.', tone: 'plain' }] },
        ],
      },
    ],
  },
  {
    id: 'shachor-1993',
    nameHe: 'שחור',
    branches: [
      /**
       * שחור זוכר ידיים — 1991, two crates from a car to a door.
       *
       * `remember shachor 'carried-crates-1991'` is written on the pavement outside the
       * hall the night of the derby; this is where it is read. The brief's whole thesis
       * about this branch (§17) is that it is built out of people who noticed you doing
       * something unglamorous, and a memory nobody ever reads back is not noticing.
       */
      {
        when: { relationshipMemory: { who: 'shachor', eventId: 'carried-crates-1991' } },
        lines: [
          { who: 'שחור', text: 'אתה סחבת לי ארגזים בחורף של תשעים ואחת. אני זוכר ידיים.' },
          { who: 'שחור', text: 'היום זה בד, לא ארגזים. אותו דבר.' },
        ],
        choices: [
          { id: 'help', text: 'לקחת צד.', then: [{ e: 'rel', who: 'shachor', axis: 'bond', delta: 5 }, { e: 'redheart', key: 'community', delta: 3 }, { e: 'minigame', id: 'chore:story:banner-93' }] },
          { id: 'no', text: '"לא הפעם."', then: [{ e: 'rel', who: 'shachor', axis: 'distance', delta: 1 }] },
        ],
      },
      {
        when: { flag: 'helped:banner' },
        lines: [{ who: 'שחור', text: 'אתה הילד של הבד. תזכור את זה, כי אני זוכר.' }],
      },
      {
        lines: [
          { who: null, text: 'איש גדול בטרנינג אדום. בד מקופל בגודל של סלון תחת הזרוע, וצרור מפתחות של אולם על האצבע.' },
          { who: 'שחור', text: 'אתה. כן, אתה. אתה נוסע באוטובוס? הבד הזה לא עולה עליו לבד.' },
          { who: 'שחור', text: 'מי שסוחב איתי נכנס איתי מהצד. מי שלא — שיעמוד בתור כמו בן אדם.' },
        ],
        choices: [
          {
            id: 'help',
            text: 'לסחוב את הבד.',
            /**
             * חצי שעה. זה המחיר, ולא היה לו מחיר.
             *
             * Stage B §7 B3 asks that carrying the banner "risk a worse position or being
             * late". It cost ten energy and UNLOCKED the better place, so the trade-off the
             * brief describes was a free upgrade with a sentence attached. Thirty minutes
             * is what a folded banner the size of a living room actually costs, and
             * `BUS_LEAVES` is at half past six: help him late enough and the coach goes
             * without you, which is the risk, and it is Limor at the corner who tells you.
             */
            // (V3 §12) carried in three folds, one at a time, to the bus (`chore:story:banner-93`)
            then: [{ e: 'rel', who: 'shachor', axis: 'bond', delta: 6 }, { e: 'remember', who: 'shachor', eventId: 'carried-the-banner-1993', significance: 'major' }, { e: 'redheart', key: 'community', delta: 3 }, { e: 'minigame', id: 'chore:story:banner-93' }],
          },
          {
            id: 'no',
            text: 'אני צריך מקום טוב, לא בד.',
            then: [{ e: 'rel', who: 'shachor', axis: 'tension', delta: 2 }, { e: 'personality', key: 'independence', delta: 1 }, { e: 'toast', text: '"מקום טוב," הוא חזר, כאילו זו מילה בשפה זרה.', tone: 'plain' }],
          },
        ],
      },
    ],
  },
  {
    id: 'bus-1993',
    nameHe: null,
    branches: [
      {
        when: { afterMinute: BUS_LEAVES + 12 },
        lines: [{ who: null, text: 'פה הוא עמד. כתם שמן על הכביש, וחצי כרטיס קרוע לידו.' }],
      },
      /**
       * הדרך של אופיר — and until 5.9.2026 it was not a way at all.
       *
       * `route:ofir` and `route:efi` landed on this same door, at the same corner, for the
       * same 36 ₪, with the same result. A choice with one outcome is a paragraph, not a
       * choice. Ofir's route is now what Efi's line has been describing all along: the side
       * gate — no queue, no fare, thirty shekels instead of thirty-six — **and it shuts at
       * eight.** Cheaper and earlier, or dearer and safe. That is a decision.
       */
      {
        when: { all: [{ flag: 'route:ofir' }, { beforeMinute: SIDE_GATE_SHUTS }], minAgorot: 3000 },
        lines: [
          { who: null, text: 'האוטובוס בפינה, ומאה מטר אחריו הסמטה שאופיר דיבר עליה. שער צדדי, אחד מהאנשים של האולם עומד בו עם סיגריה.' },
          { who: 'אופיר', text: 'שלושים, בלי תור, בלי לימור. רק שהוא נועל בשמונה ואז זהו.' },
        ],
        choices: [
          {
            id: 'side',
            text: 'לצד. שלושים.',
            then: [
              { e: 'money', agorot: -3000, why: 'השער הצדדי' },
              { e: 'give', item: 'hall-ticket' },
              { e: 'flag', flag: 'in:sideGate' },
              { e: 'rel', who: 'ofir', axis: 'sharedHistory', delta: 4 },
              { e: 'personality', key: 'courage', delta: 2 },
              { e: 'time', minutes: 40 },
              { e: 'goto', node: 'ride-1993' },
            ],
          },
          {
            id: 'board-anyway',
            text: 'לא. עם כולם, באוטובוס.',
            when: { minAgorot: 3600 },
            noteHe: 'אין שלושים ושש.',
            then: [
              { e: 'money', agorot: -3600, why: 'אוטובוס וכרטיס' },
              { e: 'give', item: 'hall-ticket' },
              { e: 'flag', flag: 'on:bus' },
              { e: 'time', minutes: 35 },
              { e: 'goto', node: 'ride-1993' },
            ],
          },
        ],
      },
      {
        /** …ואם השער כבר ננעל, נשאר האוטובוס, ואופיר ידע שזה מה שיקרה */
        when: { all: [{ flag: 'route:ofir' }, { afterMinute: SIDE_GATE_SHUTS }], minAgorot: 3600 },
        lines: [
          { who: null, text: 'השער הצדדי נעול. האיש עם הסיגריה כבר לא שם, וגם הסיגריה לא.' },
          { who: 'אופיר', text: 'אמרתי שמונה. נו. אוטובוס.' },
        ],
        choices: [
          {
            id: 'board',
            text: 'לעלות. שלושים ושש.',
            then: [
              { e: 'money', agorot: -3600, why: 'אוטובוס וכרטיס' },
              { e: 'give', item: 'hall-ticket' },
              { e: 'flag', flag: 'on:bus' },
              { e: 'time', minutes: 35 },
              { e: 'goto', node: 'ride-1993' },
            ],
          },
          { id: 'wait', text: 'עוד רגע.', then: [] },
        ],
      },
      {
        when: { any: [{ flag: 'route:efi' }, { flag: 'route:ofir' }], minAgorot: 3600 },
        lines: [
          { who: null, text: 'אוטובוס לבן, מנוע דולק, הנהג מעשן דרך החלון. אפי מבפנים דופק על הזכוכית. לימור בדלת גובה, אצבעות פרושות: שלושים ושש — הנסיעה והכרטיס ביחד.' },
        ],
        choices: [
          {
            id: 'board',
            text: 'לעלות. שלושים ושש.',
            then: [
              { e: 'money', agorot: -3600, why: 'אוטובוס וכרטיס' },
              { e: 'give', item: 'hall-ticket' },
              { e: 'flag', flag: 'on:bus' },
              { e: 'time', minutes: 35 },
              { e: 'goto', node: 'ride-1993' },
            ],
          },
          { id: 'wait', text: 'עוד רגע.', then: [] },
        ],
      },
      {
        when: { any: [{ flag: 'route:efi' }, { flag: 'route:ofir' }] },
        lines: [{ who: null, text: 'שלושים ושש, מראה לימור באצבעות. אתה סופר את מה שיש לך פעמיים, וזה לא משתנה.' }, { who: 'אפי', text: 'תגיד שאין לך. פה תמיד מישהו משלים.' }],
        choices: [
          {
            id: 'admit',
            text: 'להגיד שאין לי.',
            then: [{ e: 'flag', flag: 'admitted:broke' }, { e: 'rel', who: 'efi', axis: 'trust', delta: 3 }, { e: 'personality', key: 'empathy', delta: 1 }, { e: 'goto', node: 'chip-in-1993' }],
          },
          { id: 'walk', text: 'לא לעלות. ללכת ברגל. זה רחוק, אבל.', then: [{ e: 'flag', flag: 'walking:far' }, { e: 'time', minutes: 90 }, { e: 'energy', delta: -30 }, { e: 'goto', node: 'walked-1993' }] },
        ],
      },
      { lines: [{ who: null, text: 'האוטובוס להיכל. שש וחצי. עוד לא החלטת עם מי אתה.' }] },
    ],
  },
  {
    id: 'chip-in-1993',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'שקט של שנייה. ואז שחור, מאחור, בלי להסתובב: "כמה חסר לו?"' },
          { who: null, text: 'מטבעות עברו מיד ליד מעל הראשים. לימור ספרה בקול. הנהג צפר. עלית.' },
        ],
        then: [{ e: 'give', item: 'hall-ticket' }, { e: 'flag', flag: 'on:bus' }, { e: 'flag', flag: 'owe:group' }, { e: 'debt', agorot: QUEUE_AGOROT, why: 'מה שהתור השלים עליך בדלת' }, { e: 'redheart', key: 'community', delta: 4 }, { e: 'wellbeing', key: 'belonging', delta: 4 }, { e: 'time', minutes: 35 }, { e: 'goto', node: 'ride-1993' }],
      },
    ],
  },
  {
    id: 'walked-1993',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'הלכת. מהירקון דרומה, אבן גבירול עד שנגמר, ואז רחובות שלא ידעת שיש להם שמות.' },
          { who: null, text: 'כשהגעת, ההיכל כבר רעד מבחוץ. הסדרן בצד — לימור דיברה איתו. הוא הסתכל עליך ופתח סנטימטר.' },
        ],
        then: [{ e: 'flag', flag: 'arrived:late' }, { e: 'flag', flag: 'on:bus' }, { e: 'redheart', key: 'travelDrive', delta: 4 }, { e: 'personality', key: 'stubbornness', delta: 2 }, { e: 'goto', node: 'hall-1993' }],
      },
    ],
  },
  /**
   * הנסיעה — B3 S2 (implementation pass 27.9.2026): *"לשמור מקום / לעזור למישהו / לבחור מי
   * יושב לידך — social friction"*. The ride used to be a paragraph between the door and the
   * hall. It is one decision now, and every answer costs something the others do not: the
   * one free seat held for Efi against a man twice your size, the banner pole held upright
   * for forty minutes in the aisle, or the window beside Limor and her tin of coins.
   *
   * `life:1993:seat` outlives the night on purpose. Three weeks later a bus leaves for the
   * north (`1993-galil`), and who kept a seat for whom in April is who keeps one in May.
   */
  {
    id: 'ride-1993',
    nameHe: null,
    branches: [
      // the side gate is not a bus: two boys on foot through an alley, and a man with a cigarette
      {
        when: { flag: 'in:sideGate' },
        lines: [
          { who: null, text: 'הסמטה, פח זבל, דלת ברזל חצי פתוחה. האיש עם הסיגריה סופר שלושים בלי להסתכל לכם בפנים.' },
          { who: 'אופיר', text: 'אמרתי לך. בלי תור, בלי לימור.' },
          { who: null, text: 'ואז אתם בפנים, מהצד הלא נכון של ההיכל, ורצים במסדרון לכיוון הרעש.' },
        ],
        then: [{ e: 'flagValue', flag: 'life:1993:seat', value: 'ofir' }, { e: 'goto', node: 'hall-1993' }],
      },
      {
        lines: [
          { who: null, text: 'האוטובוס מלא ואף אחד לא יושב. מישהו מאחור התחיל שיר, מישהו מקדימה ענה בשיר אחר, ובאמצע הדרך זה הפך לשיר אחד.' },
          { who: null, text: 'מקום אחד פנוי ליד החלון. אפי עוד בדלת עם לימור. שחור במעבר, מחזיק את המוט של הבד בשתי ידיים והאוטובוס קופץ.' },
        ],
        choices: [
          {
            id: 'efi',
            text: 'לשים את התיק על המקום. "תפוס — לאפי."',
            then: [
              { e: 'flagValue', flag: 'life:1993:seat', value: 'efi' },
              { e: 'rel', who: 'efi', axis: 'bond', delta: 4 },
              { e: 'personality', key: 'stubbornness', delta: 2 },
              { e: 'energy', delta: -6 },
              { e: 'toast', text: 'אחד גדול ממך פעמיים ניסה לשבת. לא זזת. אפי נפל על הכיסא ואמר "יא משוגע" בחיוך.', tone: 'plain' },
              { e: 'goto', node: 'ride-1993-window' },
            ],
          },
          {
            id: 'pole',
            text: 'לקחת צד של המוט משחור.',
            then: [
              { e: 'flagValue', flag: 'life:1993:seat', value: 'pole' },
              { e: 'rel', who: 'shachor', axis: 'trust', delta: 4 },
              { e: 'redheart', key: 'community', delta: 2 },
              { e: 'energy', delta: -12 },
              { e: 'toast', text: 'ארבעים דקות עם הידיים למעלה. בכל פנייה הבד רצה ליפול, ובכל פנייה לא נתתם לו.', tone: 'plain' },
              { e: 'goto', node: 'ride-1993-window' },
            ],
          },
          {
            id: 'limor',
            text: 'לשבת ליד לימור. לעזור לה לספור.',
            then: [
              { e: 'flagValue', flag: 'life:1993:seat', value: 'limor' },
              { e: 'rel', who: 'crowd-limor', axis: 'trust', delta: 4 },
              { e: 'skill', skill: 'organization', delta: 1, why: 'ספר עם לימור את הכסף של האוטובוס' },
              { e: 'toast', text: 'קופסת פח, מטבעות, רשימה בעיפרון. היא סופרת בקול ואתה רושם. חסר שקל וחצי. "תמיד חסר שקל וחצי."', tone: 'plain' },
              { e: 'goto', node: 'ride-1993-window' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ride-1993-window',
    nameHe: null,
    branches: [
      {
        when: { flagIs: { flag: 'life:1993:seat', value: 'limor' } },
        lines: [
          { who: 'לימור', text: 'מהחלון הזה רואים את כל העיר. שלוש שנים אני נוסעת בקו הזה, ורק בערבים כאלה הוא מלא.' },
          { who: null, text: 'ואז הוא שם, מאחורי בניין ועוד בניין: היכל לבן, ענק, אורות מכל הצדדים. לא הבית שלנו. הערב, כן.' },
        ],
        then: [{ e: 'goto', node: 'hall-1993' }],
      },
      {
        when: { flagIs: { flag: 'life:1993:seat', value: 'pole' } },
        lines: [
          { who: 'שחור', text: 'עוד פנייה. ועוד אחת. יאללה.' },
          { who: null, text: 'את ההיכל לא ראית מהחלון. ראית אותו כשהדלת נפתחה והבד יצא ראשון, ואתה אחריו.' },
        ],
        then: [{ e: 'goto', node: 'hall-1993' }],
      },
      {
        lines: [
          { who: 'אפי', text: 'תסתכל. תסתכל עכשיו.' },
          { who: null, text: 'מאחורי בניין ועוד בניין: היכל לבן, ענק, אורות מכל הצדדים. אפי מצמיד את המצח לזכוכית כמו ילד, ואתה לידו, כמו ילד.' },
        ],
        then: [{ e: 'goto', node: 'hall-1993' }],
      },
    ],
  },
  {
    id: 'hall-1993',
    nameHe: null,
    branches: [
      {
        when: { flag: 'arrived:late' },
        lines: [
          { who: null, text: 'פספסת את ההתחלה. את הפחד של ההתחלה, את הרגע שכולם עומדים ועוד לא יודעים כלום.' },
          { who: null, text: 'מה שלא פספסת: הסוף. הסוף היה של כולם. גם שלך.' },
        ],
        then: [{ e: 'flag', flag: 'inside:hall' }, { e: 'goto', node: 'horn-1993' }],
      },
      {
        lines: [
          { who: null, text: 'ההיכל הגדול. תקרה שאי אפשר לגעת בה, אור שלא נגמר, ואלפים. אלפים. הצבע שלכם בצד אחד, שלהם בשני.' },
          { who: null, text: 'זה לא אוסישקין. באוסישקין הגג מטפטף עליך והקול חוזר אליך מהקיר. פה שום דבר לא חוזר, וצריך לצעוק פי שניים כדי לשמוע את עצמך.' },
          { who: 'אפי', text: 'תעמוד. אל תשב. מי שיושב פה לא רואה כלום.' },
        ],
        choices: [
          { id: 'stand', text: 'לעמוד כל המשחק.', then: [{ e: 'energy', delta: -20 }, { e: 'redheart', key: 'terraceCulture', delta: 3 }, { e: 'flag', flag: 'inside:hall' }, { e: 'goto', node: 'quarters-1993' }] },
          { id: 'spot', text: 'לחפש מקום ליד הבד של שחור.', when: { flag: 'helped:banner' }, noteHe: 'לא עזרת עם הבד. אין לך מקום שם.', then: [{ e: 'rel', who: 'shachor', axis: 'bond', delta: 3 }, { e: 'redheart', key: 'community', delta: 2 }, { e: 'flag', flag: 'inside:hall' }, { e: 'goto', node: 'quarters-1993' }] },
          { id: 'sit', text: 'לשבת. הרגליים.', then: [{ e: 'flag', flag: 'inside:hall' }, { e: 'goto', node: 'quarters-1993' }] },
        ],
      },
    ],
  },
  {
    id: 'quarters-1993',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'רבע ראשון: רועדים. מישהו מאחוריך אומר "זה ייגמר מהר" ואתה לא יודע לאיזה כיוון הוא מתכוון.' },
          { who: null, text: 'שני: הבד של שחור נפתח. הוא ענק. מישהו ליד צועק על מישהו שמחזיק אותו לא ישר.' },
          { who: null, text: 'שלישי: שקט. השקט של אולם שלא נושם. אפי אוחז לך במרפק ולא יודע שהוא אוחז.' },
          { who: null, text: 'רביעי: הדקות נהיות שניות, והשניות לא זזות.' },
        ],
        then: [{ e: 'goto', node: 'horn-1993' }],
      },
    ],
  },
  {
    id: 'horn-1993',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'הצפירה.' },
          { who: null, text: 'אתה לא זוכר מה עשית בשנייה שאחריה. אתה זוכר את השנייה שאחרי זה: אפי על הגב שלך, שחור בוכה עם הבד על הכתפיים, סוקו רושם משהו בפנקס קטן כאילו גם את זה צריך לתעד.' },
          { who: null, text: 'הגביע. אדום.' },
        ],
        then: [{ e: 'flag', flag: 'final:over' }, { e: 'redheart', key: 'basketballLove', delta: 6 }, { e: 'wellbeing', key: 'happiness', delta: 12 }, { e: 'wellbeing', key: 'belonging', delta: 8 }, { e: 'goto', node: 'after-1993' }],
      },
    ],
  },
  {
    id: 'after-1993',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'בחוץ האוויר קר והעיר רועשת. האוטובוס חזרה לא נוסע — הוא רוקד.' },
          { who: 'לימור', text: 'תזכור את הערב הזה. בדיוק אותו. כי הליגה עוד לא נגמרה, ובחודש הבא—' },
          { who: 'אפי', text: 'לימור. לא הערב.' },
          { who: 'לימור', text: 'לא הערב.' },
          { who: null, text: 'ויש רק לילה אחד כזה. ומישהו צריך לשמוע אותו ממך, עכשיו, לפני שהוא נהיה סיפור.' },
        ],
        /**
         * (Director V3 §12, 25.9.2026) who hears it first is where he walks, not which line
         * he picks: the bus brings them back to the corner, and from there it is the bus
         * again (the group, until it runs out — `bus-back-1993`), the kiosk rail (Ofir,
         * who did not go — `ofir-after-1993`), or the kitchen light (his father — the
         * `after-home-1993` beat). The three effects are the three the menu carried.
         */
        then: [{ e: 'flag', flag: 'after:walk' }, { e: 'time', minutes: 45 }, { e: 'travel', to: 'ussishkin-outside', spawn: 'start' }],
      },
    ],
  },
  {
    id: 'after-bus-1993',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'האוטובוס חזרה עומד בפינה עם הדלת פתוחה, ומבפנים עוד שרים. אפי מושיט יד מהמדרגה.' }],
        then: [{ e: 'rel', who: 'efi', axis: 'sharedHistory', delta: 6 }, { e: 'redheart', key: 'community', delta: 3 }, { e: 'wellbeing', key: 'exhaustion', delta: 10 }, { e: 'flag', flag: 'after:group' }, { e: 'goto', node: 'close-1993' }],
      },
    ],
  },
  {
    id: 'after-ofir-1993',
    nameHe: 'אופיר',
    branches: [
      {
        lines: [{ who: null, text: 'על המעקה ליד הקיוסק — אופיר, כאילו חיכה.' }],
        then: [{ e: 'rel', who: 'ofir', axis: 'bond', delta: 4 }, { e: 'flag', flag: 'after:ofir' }, { e: 'goto', node: 'close-1993' }],
      },
    ],
  },
  {
    /**
     * הסוף שתלוי במי שרצת אליו.
     *
     * The choice above — home to your father, staying with the group, or looking for Ofir
     * — raised `after:home`, `after:group` and `after:ofir`, and NOTHING in this repository
     * read any of them. Three endings that were the same ending. Now the walk home is the
     * one you chose: the kitchen light on, or the last of the bus, or a boy on a wall who
     * did not go.
     */
    id: 'close-1993',
    nameHe: null,
    branches: [
      {
        when: { flag: 'arrived:late' },
        lines: [{ who: null, text: 'ירדת בפינה והלכת את השאר לבד. חלון פתוח, רדיו במרפסת, מישהו צוחק בקומה שנייה. הרחוב כבר יודע — ואתה ראית את זה בעיניים.' }],
        then: [{ e: 'flag', flag: 'walked:home' }, { e: 'ending', id: 'late' }],
      },
      {
        when: { flag: 'after:home' },
        lines: [
          { who: null, text: 'ירדת בפינה ורצת. האור במטבח דלוק, וזה אומר שהוא חיכה.' },
          { who: 'קובי', text: 'נו?' },
          { who: null, text: 'לא אמרת כלום. הוא הסתכל עליך שנייה וידע, וזה היה מספיק לשניכם.' },
        ],
        then: [{ e: 'rel', who: 'kobi', axis: 'bond', delta: 3 }, { e: 'flag', flag: 'walked:home' }, { e: 'ending', id: 'inside' }],
      },
      {
        when: { flag: 'after:group' },
        lines: [
          { who: null, text: 'נשארת עד שהאוטובוס התרוקן והנהג כיבה את האורות ואמר "די, מספיק".' },
          { who: null, text: 'את השאר הלכת ברגל, בשתיים בלילה, עם צרוד במקום קול. אף אחד בבית לא היה ער. זה היה שווה את זה.' },
        ],
        then: [{ e: 'wellbeing', key: 'exhaustion', delta: 6 }, { e: 'flag', flag: 'walked:home' }, { e: 'ending', id: 'inside' }],
      },
      {
        when: { flag: 'after:ofir' },
        lines: [
          { who: null, text: 'אופיר ישב על המעקה ליד הקיוסק כאילו הוא לא זז משם כל הערב. אולי באמת לא.' },
          { who: 'אופיר', text: 'שמעתי ברדיו. אל תספר לי, אני רוצה שתספר לי מחר לאט.' },
          { who: null, text: 'ישבתם שם עד שכיבו את השלט של רפי, ולא סיפרת לו כלום.' },
        ],
        then: [{ e: 'rel', who: 'ofir', axis: 'sharedHistory', delta: 4 }, { e: 'flag', flag: 'walked:home' }, { e: 'ending', id: 'inside' }],
      },
      /**
       * the call from the Dan stop (`bs-phone-1993`, 27.9.2026) — what his mother knew when he
       * walked in is what he told her from the payphone
       */
      {
        when: { flagIs: { flag: CALL_1993, value: 'truth' } },
        lines: [
          { who: null, text: 'ירדת בפינה והלכת את השאר לבד. האור במטבח דלוק, ואמא יושבת ליד השולחן עם כוס תה שהתקררה.' },
          { who: 'רחל', text: 'אמרת היכל. היית בהיכל?' },
          { who: null, text: 'הנהנת. היא קמה, שמה את הכוס בכיור, ואמרה "לילה טוב" בקול של מי שחיכתה ולא תגיד.' },
        ],
        then: [{ e: 'rel', who: 'rachel', axis: 'trust', delta: 3 }, { e: 'flag', flag: 'walked:home' }, { e: 'ending', id: 'inside' }],
      },
      {
        when: { flagIs: { flag: CALL_1993, value: 'cover' } },
        lines: [
          { who: null, text: 'ירדת בפינה והלכת את השאר לבד. אמא בפתח הדלת, בחלוק.' },
          { who: 'רחל', text: 'איך היה אצל אפי?' },
          { who: null, text: 'אמרת "בסדר". הקול הצרוד אמר משהו אחר, והיא שמעה את שניהם.' },
        ],
        then: [{ e: 'rel', who: 'rachel', axis: 'trust', delta: -2 }, { e: 'flag', flag: 'walked:home' }, { e: 'ending', id: 'inside' }],
      },
      {
        lines: [{ who: null, text: 'ירדת בפינה והלכת את השאר לבד. חלון פתוח, רדיו במרפסת, מישהו צוחק בקומה שנייה. הרחוב שמע. אתה היית שם.' }],
        then: [{ e: 'flag', flag: 'walked:home' }, { e: 'ending', id: 'inside' }],
      },
    ],
  },

  // ============================================================ the Dan stop ==
  /**
   * התחנה בפינה (27.9.2026, `bus-stop`, `world/city2027/stadiumSide.ts`) — B3 S2 "travel". The
   * wait for the bus used to be a hotspot on the pavement; now it is the "Dan" shelter on the
   * corner: the evening papers (a shekel out of a fare that is exactly 36), the payphone (a call
   * home, and what his mother knows when he comes back — `close-1993`), and the people under the
   * tin roof who are not going to any final. The bus boards from here (`bus-1993`).
   */
  {
    id: 'bs-papers-1993',
    nameHe: null,
    branches: [
      {
        when: { minAgorot: 100 },
        lines: [
          { who: null, text: 'על המעמד — העיתונים של הערב. בעמוד האחורי, תמונה של ההיכל הגדול מלמעלה, וכותרת על הערב הזה בלי מילה אחת על איך הוא ייגמר.' },
        ],
        choices: [
          {
            id: 'buy',
            text: '(לקנות אחד. שקל. לשמור לקופסה.)',
            then: [
              { e: 'flag', flag: 'bs:papers' },
              { e: 'money', agorot: -100, why: 'עיתון ערב בתחנה' },
              { e: 'flagValue', flag: 'life:1993:paper', value: 'kept' },
              { e: 'toast', text: 'העיתון מקופל בכיס האחורי. שקל פחות לאוטובוס — תספור שוב לפני שהוא מגיע.', tone: 'plain' },
            ],
          },
          { id: 'read', text: '(לקרוא את הכותרת בעמידה, ולהחזיר.)', then: [{ e: 'flag', flag: 'bs:papers' }, { e: 'time', minutes: 4 }, { e: 'toast', text: 'המוכר מסתכל עליך כמו על כל מי שקורא בחינם. הוא רגיל.', tone: 'plain' }] },
        ],
      },
      {
        lines: [{ who: null, text: 'העיתונים של הערב על המעמד. אין לך שקל מיותר, ואתה יודע בדיוק למה.' }],
        then: [{ e: 'flag', flag: 'bs:papers' }],
      },
    ],
  },
  {
    id: 'bs-phone-1993',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'הטלפון הציבורי האדום, והאסימון האחרון שלך. אמא עוד לא יודעת מזה כלום.' },
        ],
        choices: [
          {
            id: 'truth',
            text: '(להתקשר ולהגיד את האמת: ההיכל, עם אפי, חוזר בחצות.)',
            then: [
              { e: 'flag', flag: 'bs:phone' },
              { e: 'flagValue', flag: CALL_1993, value: 'truth' },
              { e: 'time', minutes: 5 },
              { e: 'rel', who: 'rachel', axis: 'trust', delta: 2 },
              { e: 'toast', text: 'שקט בקו. ואז: "תחזיק את הארנק בכיס הקדמי." זה היה ה"כן" שלה.', tone: 'plain' },
            ],
          },
          {
            id: 'cover',
            text: '(להתקשר ולהגיד שאתה אצל אפי. זה חצי נכון.)',
            then: [
              { e: 'flag', flag: 'bs:phone' },
              { e: 'flagValue', flag: CALL_1993, value: 'cover' },
              { e: 'time', minutes: 3 },
              { e: 'toast', text: '"אצל אפי. בסדר." היא לא שאלה עוד. זה היה גרוע יותר מאם הייתה שואלת.', tone: 'plain' },
            ],
          },
          { id: 'hang', text: '(להרים ולהניח. אחר כך.)', then: [{ e: 'flag', flag: 'bs:phone' }, { e: 'flagValue', flag: CALL_1993, value: 'none' }] },
        ],
      },
    ],
  },
  {
    id: 'bs-wait-1993',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'מתחת לגג הפח: אישה עם סל ירקות, שני חיילים שישנים בעמידה, ואיש זקן שמסתכל על הצעיף שלך ואומר "גמר, אה?" בלי לחכות לתשובה.' },
          { who: null, text: 'רובם לא נוסעים לשום גמר. הם נוסעים הביתה. הערב הזה שלך, לא שלהם — והם לא מתנגדים.' },
        ],
        then: [{ e: 'flag', flag: 'bs:wait' }, { e: 'wellbeing', key: 'belonging', delta: 1 }],
      },
    ],
  },
]
