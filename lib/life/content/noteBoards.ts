import type { LifeEvent } from '../events'
import { gradeOf, type NoteBoardDef, type ResolvedCard } from '../noteBoards'
import type { LifeState } from '../types'

/**
 * הפתקים של העשור — the three boards of Stage B (`lib/life/noteBoards.ts`).
 *
 *  · `notebook-1990` — the margin of the newspaper at half-time, 12.5.1990. What he knows,
 *    what he checked, what he was told. GRADED: each scrap has an honest column, and the
 *    column is about HOW he knows, never whether it is true. The rumour about the gates
 *    turns out right; it is still a rumour when it is written down. Bible B1: *"פוגי ממש
 *    בונה על פתק"* and *"שני מקורות עצמאיים → journalist seed"*.
 *  · `court-1995` — the kiosk counter in August 1995, three voices about the man on his
 *    wall. Bible B5: *"לא להציג טענה שנויה במחלוקת כעובדה. דמויות אומרות מה הן מאמינות."*
 *    Graded gently — a table in a newspaper is a fact, a lawyer's theory is a claim, a
 *    stranger's "let him go" is a feeling — and what it writes is how he holds the three.
 *  · `lists-1998` — Soko's three lists, in the ten minutes after 2.5.1998, in Soko's own
 *    words: *"מה אנחנו יודעים. מה שמענו. מה אנחנו ממציאים."* NOT graded: the bible's rule
 *    for that day is "no objective motive truth", and the game does not mark an accusation
 *    right or wrong. It records where he put it, and the Monday says it back to him.
 *
 * Rule 11 on every scrap: no score, no scorer, no minute that the archive does not hold,
 * and every scrap carries the name of whoever said it. The one minute that appears (86) is
 * the archive's own (rule 49, 24.5.1986).
 */

const F = (flag: string) => ({ flag })

// ------------------------------------------------------------------ 1990 -----

/** where the last radio line came from (`match1990.ts` `learn`) — whose transistor it was */
function radioWho(state: LifeState): string {
  const from = state.flags['net:known:from']
  if (from === 'radio') return 'הרדיו של האוהד ליד'
  return 'הרדיו של אבא'
}

const NOTEBOOK_1990: NoteBoardDef = {
  id: 'notebook-1990',
  titleHe: 'הפתק',
  kickerHe: 'מחצית · השוליים של העיתון',
  introHe: 'עיפרון, השוליים של העיתון, וחמש־עשרה דקות. לא מה נכון — איך אתה יודע. כל פתק למקום שלו.',
  columns: [
    { id: 'known', labelHe: 'יודע', subHe: 'ראיתי בעיניים, או שזה מודפס' },
    { id: 'verified', labelHe: 'בדקתי', subHe: 'שמעתי בעצמי, מהרדיו' },
    { id: 'rumour', labelHe: 'אמרו לי', subHe: 'מישהו ששמע ממישהו' },
  ],
  cards: [
    {
      id: 'ours',
      textHe: 'אצלנו, על הדשא — כל שער, בעיניים.',
      whoHe: 'אתה, מהיציע',
      fits: 'known',
    },
    {
      id: 'table',
      textHe: 'אותן נקודות, והם כבשו יותר כל העונה. לנצח — לא מספיק.',
      whoHe: 'העיתון על שולחן המטבח',
      when: { any: [F('knows:table'), F('math:careful'), F('math:kobi')] },
      fits: 'known',
    },
    {
      id: 'radio-home',
      textHe: 'ברדיו במטבח הקריאו מגרשים, לא תוצאות.',
      whoHe: 'הטרנזיסטור בבית',
      when: F('knows:radio'),
      fits: 'verified',
    },
    {
      id: 'yavne',
      textHe: (state) => {
        const line = state.flags['net:known']
        return typeof line === 'string' && line ? line : null
      },
      whoHe: 'הרדיו, צמוד לאוזן',
      when: F('net:heard'),
      fits: 'verified',
    },
    {
      id: 'kids',
      textHe: (state) => {
        const line = state.flags['rumor:last']
        return typeof line === 'string' && line ? line : null
      },
      whoHe: 'הילדים ביציע',
      fits: 'rumour',
    },
    {
      id: 'amit',
      textHe: 'ביבנה כבר מובילים.',
      whoHe: 'עמית — "ממישהו ששמע"',
      when: { any: [F('net:src:amit'), F('net:checked-amit')] },
      fits: 'rumour',
    },
    {
      id: 'rafi',
      textHe: 'יבנה בבית, ובבית, במחזור אחרון, אף אחד לא מפסיד.',
      whoHe: 'רפי מהקיוסק',
      when: { any: [F('rumor:home'), F('net:src:rafi')] },
      fits: 'rumour',
    },
    {
      id: 'gates',
      textHe: 'במחצית פותחים את השערים לכולם.',
      whoHe: 'האיש עם הטרנזיסטור, מתחת ליציע',
      when: F('uc:heard'),
      fits: 'rumour',
    },
    {
      id: 'brain',
      textHe: 'לפי החשבון שלו — צריך עוד אחד לפחות.',
      whoHe: 'האוהד שתמיד בטוח',
      when: F('net:src:brain'),
      fits: 'rumour',
    },
  ],
  seconds: 75,
  minCards: 3,
  settle: (placed, cards) => {
    const { right, placed: count, graded } = gradeOf(cards, placed)
    const events: LifeEvent[] = [{ t: 'flag.raised', flag: 'net:noted' }]
    if (count === 0) {
      events.push({ t: 'flag.set', flag: 'life:1990:notebook', value: 'blank' })
      return { events, verdictHe: 'הפתק נשאר ריק. המחצית נגמרה בלעדיו, והמספרים נשארו בראש — שם הם מתערבבים.' }
    }
    if (count < cards.length) {
      events.push({ t: 'flag.set', flag: 'life:1990:notebook', value: 'half' })
      return {
        events,
        verdictHe: 'שריקה. הפתק חוזר לכיס חצי כתוב — מה שלא נכתב, יזכר איך שבא לו.',
        after: 'net-note-kobi-1990',
      }
    }
    // two independent sources on the true side of the page is the seed the bible names
    const firm = new Set(cards.filter((card) => placed[card.id] && placed[card.id] === card.fits && card.fits !== 'rumour').map((card) => card.whoHe))
    if (right === graded) {
      events.push(
        { t: 'flag.set', flag: 'life:1990:notebook', value: 'clean' },
        { t: 'skill.changed', skill: 'knowledge', delta: 2, why: 'הפריד בין מה שראה, מה שבדק ומה שאמרו לו' },
        { t: 'personality.shifted', key: 'curiosity', delta: 2 },
      )
      if (firm.size >= 2) events.push({ t: 'flag.raised', flag: 'life:journalist:seed' })
      return {
        events,
        verdictHe: 'פתק נקי: מה שראית — לבד, מה ששמעת בעצמך — לבד, ומה שאמרו לך — בטור של מה שאמרו. אחת השמועות עוד תתברר כנכונה. זה לא יזיז אותה טור.',
        after: 'net-note-kobi-1990',
      }
    }
    if (right >= graded - 1) {
      events.push({ t: 'flag.set', flag: 'life:1990:notebook', value: 'mostly' }, { t: 'personality.shifted', key: 'curiosity', delta: 1 })
      return {
        events,
        verdictHe: 'כמעט. דבר אחד ששמעת ממישהו כתבת כאילו בדקת בעצמך. ככה, בכתב יד של ילד, נולדת ידיעה.',
        after: 'net-note-kobi-1990',
      }
    }
    events.push({ t: 'flag.set', flag: 'life:1990:notebook', value: 'mixed' }, { t: 'personality.shifted', key: 'impulsiveness', delta: 1 })
    return {
      events,
      verdictHe: 'הפתק מלא, והכול באותו כתב יד. אחר כך קשה לדעת מה ידעת ומה רק רצית שיהיה נכון.',
      after: 'net-note-kobi-1990',
    }
  },
}

// ------------------------------------------------------------------ 1995 -----

const COURT_1995: NoteBoardDef = {
  id: 'court-1995',
  titleHe: 'מה אתה יודע עליו',
  kickerHe: 'הקיוסק · אוגוסט 1995',
  introHe: 'שלושה קולות על הדלפק, ואחד בראש שלך. לפני שאתה עונה — מה מזה עובדה, מה מזה טענה, ומה מזה רק מה שמרגישים.',
  columns: [
    { id: 'fact', labelHe: 'עובדה', subHe: 'כתוב בטבלה, או שמישהו ראה' },
    { id: 'claim', labelHe: 'טענה', subHe: 'מישהו אומר שכך זה, ומסביר למה' },
    { id: 'feeling', labelHe: 'מה שמרגישים', subHe: 'לא צריך הוכחה — וגם לא מוכיח' },
  ],
  cards: [
    { id: 'table', textHe: 'עונה שלמה של "עוד לא" ו"בשבוע הבא". הטבלה.', whoHe: 'העיתון של עמית', when: F('s2:v:paper'), fits: 'fact' },
    { id: 'cover', textHe: 'המאמן הוא לא הבעיה. הוא הכיסוי של מי שמינה אותו.', whoHe: 'פרדי', when: F('s2:v:freddy'), fits: 'claim' },
    { id: 'go', textHe: 'שיילך הביתה.', whoHe: 'הבחור בדלת', when: F('s2:v:fan'), fits: 'feeling' },
    { id: 'europe', textHe: 'באירופה קרה משהו שאף אחד לא מדבר עליו.', whoHe: 'רפי, בין קפה לקפה', fits: 'claim' },
    {
      id: 'eighty-six',
      textHe: 'בדקה שמונים ושש הוא נתן את הכדור במקום לקחת אותו.',
      whoHe: 'אבא, בסלון, לפני שנה',
      when: { relationshipMemory: { who: 'kobi', eventId: 'two-things-one-head-1994' } },
      fits: 'fact',
    },
    { id: 'poster', textHe: 'מי שתלה פוסטר בגיל שמונה לא מוריד אותו בגלל עונה.', whoHe: 'אתה', when: { sinaiIs: 'defending' }, fits: 'feeling' },
  ],
  seconds: null,
  minCards: 3,
  settle: (placed, cards) => {
    const { right, placed: count, graded } = gradeOf(cards, placed)
    const events: LifeEvent[] = [{ t: 'flag.raised', flag: 's2:sorted' }]
    if (count === 0) return { events, verdictHe: 'לא סידרת כלום. הם ממשיכים לדבר, וכל משפט נשמע כמו פסק דין.', after: 's2-court' }
    const complete = count === cards.length
    const clean = complete && right === graded
    // what he did with the lawyer's theory is the one placement the chapter keeps
    const coverAsFact = placed['cover'] === 'fact'
    events.push({ t: 'flag.set', flag: 'life:sinai:ledger', value: clean ? 'clean' : coverAsFact ? 'certain' : 'mixed' })
    if (clean) {
      events.push({ t: 'institution.changed', key: 'legalUnderstanding', delta: 4 }, { t: 'personality.shifted', key: 'empathy', delta: 1 })
      return {
        events,
        verdictHe: 'שלוש ערימות על הדלפק. הטבלה היא טבלה, התאוריה של פרדי היא תאוריה, והבחור בדלת כועס. ואת הכדור ההוא אף אחד מהם לא מוחק.',
        after: 's2-court',
      }
    }
    if (coverAsFact) {
      events.push({ t: 'institution.changed', key: 'protestEscalation', delta: 2 })
      return { events, verdictHe: 'שמת את מה שפרדי חושב בטור של מה שקרה. זה נוח: עכשיו יש אשם, ואין שאלה.', after: 's2-court' }
    }
    return { events, verdictHe: 'חלק במקום, חלק לא. זה מה שקורה כשכל הקולות מדברים בבת אחת ואחד מהם הוא שלך.', after: 's2-court' }
  },
}

// ------------------------------------------------------------------ 1998 -----

/** the scraps that are accusations — where they land is what the day remembers */
const ACCUSATIONS = ['bought', 'pager'] as const

const LISTS_1998: NoteBoardDef = {
  id: 'lists-1998',
  titleHe: 'שלוש הרשימות של סוקו',
  kickerHe: 'עשר דקות אחרי · 2.5.1998',
  introHe: 'סוקו קורע שלושה דפים מהמחברת ומניח אותם על מדרגת הבטון. "מה אנחנו יודעים. מה שמענו. מה אנחנו ממציאים. אני לא מתקן לך — רק תכתוב."',
  columns: [
    { id: 'know', labelHe: 'מה אנחנו יודעים', subHe: 'ראינו, או שכתוב' },
    { id: 'heard', labelHe: 'מה שמענו', subHe: 'ברדיו, בפייג׳ר, מאחד לשני' },
    { id: 'invent', labelHe: 'מה אנחנו ממציאים', subHe: 'מה שהלב צריך שיהיה נכון' },
  ],
  cards: [
    { id: 'ours', textHe: 'אצלנו ניצחנו. ראינו את זה עם העיניים.', whoHe: 'אתה, מהיציע', when: F('l1:inside') },
    { id: 'laces', textHe: 'שם, באמצע, מישהו עצר לקשור נעל.', whoHe: 'האיש עם הטרנזיסטור', when: F('m98:laces') },
    { id: 'bought', textHe: 'סידרו את זה. אני אומר לך — סידרו.', whoHe: 'אוהד בשורה מאחור' },
    { id: 'pager', textHe: 'מישהו עם פייג׳ר ידע איך זה ייגמר עוד לפני שזה נגמר.', whoHe: 'אסף, ששמע ממישהו' },
    { id: 'radio', textHe: 'השדר אמר שמשהו קרה, ואז עבר לדבר על משהו אחר.', whoHe: 'לירון, עם הרדיו בשתי הידיים' },
    { id: 'next', textHe: 'בשנה הבאה זה יהיה שלנו. תראה.', whoHe: 'אופיר, על המדרגות' },
  ],
  seconds: null,
  minCards: 3,
  settle: (placed, cards: readonly ResolvedCard[]) => {
    const events: LifeEvent[] = [
      { t: 'flag.raised', flag: 'l1:lists' },
      { t: 'laces.marked', response: 'organizer' },
      { t: 'relationship.changed', who: 'soko', axis: 'trust', delta: 4 },
      { t: 'redheart.changed', key: 'historyMemory', delta: 3 },
      { t: 'flag.raised', flag: 'l1:cut' },
      { t: 'clock.advanced', minutes: 9 },
    ]
    const accused = cards.filter((card) => (ACCUSATIONS as readonly string[]).includes(card.id))
    const asKnown = accused.filter((card) => placed[card.id] === 'know').length
    const asHeard = accused.filter((card) => placed[card.id] === 'heard' || placed[card.id] === 'invent').length
    if (Object.keys(placed).length === 0) {
      events.push({ t: 'flag.set', flag: 'life:laces:lists', value: 'blank' })
      return { events, verdictHe: 'לא כתבת כלום. סוקו כתב את שלוש הרשימות לבד, ולא שאל למה.' }
    }
    if (asKnown === accused.length && accused.length > 0) {
      events.push({ t: 'flag.set', flag: 'life:laces:lists', value: 'certain' }, { t: 'institution.changed', key: 'protestEscalation', delta: 4 })
      return { events, verdictHe: 'בטור של מה שאנחנו יודעים יש עכשיו שני דברים שאף אחד מכם לא ראה. סוקו מסתכל על הדף רגע ארוך, ולא מתקן. "זה הכתב שלך," הוא אומר. "תזכור שזה הכתב שלך."' }
    }
    if (asHeard === accused.length && accused.length > 0) {
      events.push({ t: 'flag.set', flag: 'life:laces:lists', value: 'strict' }, { t: 'personality.shifted', key: 'curiosity', delta: 2 }, { t: 'relationship.changed', who: 'soko', axis: 'bond', delta: 3 })
      return { events, verdictHe: 'מה שראית — בטור אחד. מה ששמעת, גם כשזה שורף — בטור אחר. זה לא הופך את זה לפחות כואב. זה הופך את זה לשלך.' }
    }
    events.push({ t: 'flag.set', flag: 'life:laces:lists', value: 'torn' })
    return { events, verdictHe: 'דבר אחד בטור של מה שיודעים, ואותו דבר בדיוק — בטור של מה ששמענו. אתה לא יכול להחליט. סוקו אומר שזה בסדר: "רוב העיר עוד לא החליטה."' }
  },
}

export const NOTE_BOARDS: Record<string, NoteBoardDef> = {
  [NOTEBOOK_1990.id]: NOTEBOOK_1990,
  [COURT_1995.id]: COURT_1995,
  [LISTS_1998.id]: LISTS_1998,
}
