/**
 * מה שאתה לוקח החוצה — the sharing layer, and the one rule that shapes all of it.
 *
 * Maor, 7.9.2026: a guerrilla campaign built out of the PLAYER, not out of us. He shares a
 * memory, a moment, something that moved him — to a story, to WhatsApp, to Facebook. Not a
 * banner we wrote.
 *
 * Which immediately runs into his own rule, from the content document:
 *
 *   > **הישגים / תגים / רצפים.** הקופסה האדומה היא ההישג.
 *
 * So this is deliberately NOT an achievement system with a share button bolted on. There is
 * no score, no percentage, no badge, no "you unlocked". What a player can take outside is
 * exactly what the game already gave him and nothing that was invented for the outside:
 *
 *   · **a Red Box object** — the thing he kept from a day, with the sentence the box holds.
 *   · **an ending card** — how a chapter closed FOR HIM, out of the branches he chose.
 *   · **an album page** — a page of the Supergoal album, closed, with what it cost.
 *   · **a moment** — one line he was given at a moment that landed.
 *
 * Four rules, and they are all tested:
 *
 * 1. **Never a number that means "how good you are".** A card may carry a year, a date, a
 *    shirt number, a page — never a score, a completion percentage or a comparison.
 * 2. **Never a historical claim the archive does not hold.** A share card goes further than
 *    any screen in the game: it lands in front of people who never played it and have no
 *    context. So every factual line on one comes from the archive with its own provenance,
 *    or it is in the first person and obviously a memory ("what I remember").
 * 3. **Never yellow** (rule 8) — the templates are checked like every other shipped asset.
 * 4. **The player's own words win.** Where the game asked him "what do you remember", that
 *    sentence is the card. Ours is the fallback, not the default.
 *
 * This file is pure: it turns a life into card specifications. The painting is
 * `runtime/shareCard.ts` and the sheet is `components/life/ShareSheet.tsx`, so the whole
 * decision layer can be tested without a canvas.
 */
import type { LifeState, RedBoxItem } from './types'
import { CHAPTER } from './content/chapters'

/** the two shapes people actually post in */
export type ShareFormat = 'story' | 'square'

export const FORMAT_SIZE: Record<ShareFormat, { w: number; h: number }> = {
  /** Instagram / WhatsApp status — the one that matters most on a phone */
  story: { w: 1080, h: 1920 },
  /** a post, and the one that survives being forwarded */
  square: { w: 1080, h: 1080 },
}

export type ShareKind = 'memory' | 'ending' | 'album' | 'moment'

export const KIND_LABEL: Record<ShareKind, string> = {
  memory: 'מהקופסה האדומה',
  ending: 'איך זה נגמר אצלי',
  album: 'דף שנסגר',
  moment: 'רגע',
}

export type ShareCard = {
  id: string
  kind: ShareKind
  /**
   * התאריך, בענק — וזה כל הקרס.
   *
   * 7.9.2026, אחרי שמאור אמר את הדבר הנכון על הגרסה הראשונה: *"לא מרגיש שמועבר שום רגש, שום
   * סקרנות, שום עניין שיווקי."* צדק. הכרטיס הראשון היה תווית של מוזיאון — נכון, מכובד, ואף
   * אחד לא היה נכנס בגללו.
   *
   * מה שעוצר אוהד הפועל הוא לא כותרת. זה **תאריך**. `2.5.1998` הוא לא מספר — הוא כל היום
   * ההוא, ומי שראה אותו בסטורי כבר הרגיש משהו לפני שקרא מילה. זה עובד רק על השבט, וזה בדיוק
   * העניין: כרטיס שמי שלא הפועל גולל הלאה, ומי שכן — עוצר.
   */
  dateHe: string
  /**
   * מה **אני** עשיתי — בגוף ראשון, ותמיד פעולה ולא תיאור.
   *
   * "עמדתי וראיתי" מזמין תשובה. "ראית. זה מה שנשאר" — לא. אדם משתף כדי לומר משהו על עצמו,
   * ואדם אחר מגיב כי הוא היה עושה אחרת. זה המנוע של השיתוף, וזאת גם, במקרה, האמת של המשחק:
   * לכל אחד יש 2.5.1998 אחר.
   */
  claimHe: string
  /**
   * השאלה — פנייה ישירה לצופה, והחלק שאין בשום כרטיס־הישג.
   *
   * לולאה פתוחה: אוהד הפועל בן הארבעים יודע את התשובה שלו לשאלה "איפה היית", והוא ירצה
   * לומר אותה. אין דרך לומר אותה בסטורי של מישהו אחר — יש דרך אחת להגיע למקום ששואלים בו.
   */
  askHe: string
  /** המילה הקטנה למעלה — איזה סוג של דבר זה */
  kindHe: string
  /** המשפט שלו עצמו, כשהמשחק כבר שאל */
  ownWordsHe: string | null
  /** מפתח האמנות שהצייר שם מאחור, כשיש */
  art: string | null
  /** הטקסט שנוסע עם התמונה לוואטספ */
  captionHe: string
}

export const FOOTER_HE = 'העובד · משחק על הפועל תל אביב'

/**
 * מתי — from the chapter's own bridge card, which is the date the game already shows the
 * player. Never a date this file made up, and never one the archive does not hold.
 */
/**
 * התאריך שהשבט מזהה — מהעוגן של הפרק, ולעולם לא כזה שהקובץ הזה המציא.
 *
 * `2.5.1998` ולא "1998". ההבדל הוא כל ההבדל: שנה היא הקשר, תאריך הוא זיכרון. אוהד הפועל
 * שרואה `12.5.1990` יודע בדיוק מה הוא רואה, ומי שלא — גולל הלאה, וזה בסדר גמור.
 */
const DATE_OF: Record<string, string> = {
  '1986': '24.5.1986',
  '1990': '12.5.1990',
  '1991': '1991',
  '1993-cup': '1993',
  '1993-galil': '1993',
  '1995-sinai': '1995',
  '1996-army': '1996',
  '1997-basket': '1997',
  '1998-laces': '2.5.1998',
  '1999-basket': '1999',
  '1999-cup': '19.5.1999',
  '2000-title': '13.5.2000',
  '2000-double': '17.5.2000',
  '2002-europe': '21.3.2002',
  '2006-home': '8.3.2004',
  '2007-registered': '25.6.2007',
  '2010-cup': '11.5.2010',
  '2010-teddy': '15.5.2010',
}

const dateOf = (state: LifeState, year: number): string => DATE_OF[state.chapter] ?? String(year)

/**
 * השאלה, לפי היום — ולמה היא לא אחת.
 *
 * "איפה היית?" עובד על 2.5.1998 כי לכל אוהד הפועל בן ארבעים ומעלה יש תשובה, והיא כואבת.
 * על 12.5.1990 השאלה אחרת לגמרי — שם לא היה איפה, היה **אם הבנת בזמן**. שאלה גנרית היא
 * שאלה שאף אחד לא עונה עליה בראש, ושאלה שלא עונים עליה בראש היא סטורי שגוללים.
 */
const ASK_OF: Record<string, string> = {
  '1986': 'ואתה — מה נשאר לך מ-86׳?',
  '1990': 'ואתה, היית עושה את החשבון בזמן?',
  '1998-laces': 'ואתה — איפה היית באותו ערב?',
  '1999-cup': 'ואתה, הסתכלת או הסתובבת?',
  '2000-title': 'ואתה, איפה שמעת?',
  '2000-double': 'ואתה, למי היית נותן אותו?',
  /**
   * שלב ג׳ — ושאלה שעונים עליה בראש, כמו כל השאר כאן.
   *
   * *"שאלה שלא עונים עליה בראש היא סטורי שגוללים."* כל אחת מהן היא השאלה שהסצנה עצמה
   * שואלת, במילים שאוהד בן ארבעים ומשהו יודע לענות עליהן בלי לחשוב.
   */
  '2000-bridge': 'ואתה — עם מי סיימת את הלילה הזה?',
  '2002-europe': 'ואתה, טסת או ראית מהסלון?',
  '2006-home': 'ואתה — מה נשאר לך מאוסישקין?',
  '2007-table': 'ואתה, מה לקחת כשביקשו?',
  '2007-registered': 'ואתה — איפה היית ביום ההוא?',
  '2007-key': 'ואתה, מי פתח אצלכם בשמונה?',
  '2009-up': 'ואתה, עם מי חילקת?',
  '2010-cup': 'ואתה — היית בגמר, או שכבר חשבת על שבת?',
  '2010-teddy': 'ואתה, למי התקשרת ראשון?',
}

const DEFAULT_ASK = 'ואתה — מה אתה זוכר?'
export const askFor = (chapter: string): string => ASK_OF[chapter] ?? DEFAULT_ASK

/** חפץ מהקופסה — הכרטיס היחיד בסט שהוא עצם ולא משפט */
export function cardForMemory(state: LifeState, item: RedBoxItem): ShareCard {
  const own = ownWords(state, item.sourceEventId)
  return {
    id: `memory:${item.id}`,
    kind: 'memory',
    kindHe: KIND_LABEL.memory,
    dateHe: dateOf(state, item.year),
    claimHe: `${item.titleHe} — ${item.noteHe ?? 'שמרתי אותו.'}`,
    askHe: askFor(state.chapter),
    ownWordsHe: own,
    art: item.item,
    captionHe: `${item.titleHe} · ${dateOf(state, item.year)}`,
  }
}

/**
 * סוף פרק — החזק בסט, כי הוא היחיד שאומר משהו שהשחקן **בחר**.
 *
 * הכותרת של הסיום היא כבר משפט בגוף ראשון בעצם ("ראית. זה מה שנשאר.") — היא רק כתובה בגוף
 * שני, כי ככה המשחק מדבר אליו. בכרטיס היא מומרת לגוף ראשון, כי בסטורי הוא מדבר אל אחרים.
 */
export function cardForEnding(
  state: LifeState,
  ending: { id: string; titleHe: string; bodyHe: string; memoryHe: string },
): ShareCard {
  return {
    id: `ending:${state.chapter}:${ending.id}`,
    kind: 'ending',
    kindHe: KIND_LABEL.ending,
    dateHe: dateOf(state, state.year),
    claimHe: firstPerson(ending.titleHe),
    askHe: askFor(state.chapter),
    ownWordsHe: ownWords(state, `ending:${ending.id}`),
    art: null,
    captionHe: `${dateOf(state, state.year)} — ${firstPerson(ending.titleHe)}`,
  }
}

/** דף באלבום — הכרטיס היחיד שנוגע באיסוף, והוא אומר מה זה עלה */
export function cardForAlbumPage(state: LifeState, pageHe: string, spentHe: string): ShareCard {
  return {
    id: `album:${pageHe}`,
    kind: 'album',
    kindHe: KIND_LABEL.album,
    dateHe: dateOf(state, state.year),
    claimHe: `סגרתי את ${pageHe}. ${spentHe}`,
    askHe: 'ואתה, כמה חסר לך?',
    ownWordsHe: null,
    art: null,
    captionHe: `${pageHe} — נסגר`,
  }
}

/** רגע — שורה אחת שנחתה */
export function cardForMoment(state: LifeState, id: string, lineHe: string): ShareCard {
  return {
    id: `moment:${id}`,
    kind: 'moment',
    kindHe: KIND_LABEL.moment,
    dateHe: dateOf(state, state.year),
    claimHe: lineHe,
    askHe: askFor(state.chapter),
    ownWordsHe: ownWords(state, id),
    art: null,
    captionHe: `${dateOf(state, state.year)} · ${lineHe}`,
  }
}

/**
 * גוף שני → גוף ראשון. המשחק מדבר אל השחקן; הסטורי מדבר בשמו.
 *
 * רשימה קטנה ומכוונת ולא ניסיון לכבוש עברית: הכותרות של הסיומים כתובות בעבר, גוף שני יחיד,
 * וזה בדיוק החלק שאפשר להמיר בבטחה. מה שלא מזוהה נשאר כמו שהוא — כרטיס עם משפט מוזר גרוע
 * פחות מכרטיס עם עברית שבורה.
 */
/**
 * `\b` אינו עובד אחרי אות עברית — עברית איננה `\w` בביטוי רגולרי של JavaScript, אז גבול
 * מילה אחרי "ראית" פשוט לא נתפס. הצצה קדימה על טווח האותיות עושה את מה ש-`\b` התיימר לעשות.
 */
const SECOND_TO_FIRST: Array<[RegExp, string]> = [
  [/^ראית(?![\u05d0-\u05ea])/, 'ראיתי'],
  [/^רצת(?![\u05d0-\u05ea])/, 'רצתי'],
  [/^החזקת(?![\u05d0-\u05ea])/, 'החזקתי'],
  [/^נשארת(?![\u05d0-\u05ea])/, 'נשארתי'],
  [/^שתקת(?![\u05d0-\u05ea])/, 'שתקתי'],
  [/^בנית(?![\u05d0-\u05ea])/, 'בניתי'],
  [/^ירשת(?![\u05d0-\u05ea])/, 'ירשתי'],
  [/^הלכת(?![\u05d0-\u05ea])/, 'הלכתי'],
  [/^ידעת(?![\u05d0-\u05ea])/, 'ידעתי'],
]

export function firstPerson(text: string): string {
  for (const [pattern, replacement] of SECOND_TO_FIRST) {
    if (pattern.test(text)) return text.replace(pattern, replacement)
  }
  return text
}

export const OWN_WORDS_PREFIX = 'said:'
export const ownWordsFlag = (id: string) => `${OWN_WORDS_PREFIX}${id}`
export function ownWords(state: LifeState, id: string): string | null {
  const value = state.flags[ownWordsFlag(id)]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

/** first `n` sentences of a paragraph — a card is not a page */
export function firstSentences(text: string, n: number): string {
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean)
  return parts.slice(0, n).join(' ')
}

// ------------------------------------------------------------------ לאן זה הולך ---

export type ShareTarget = 'native' | 'whatsapp' | 'facebook' | 'x' | 'copy' | 'download'

export const TARGET_LABEL: Record<ShareTarget, string> = {
  native: 'שיתוף',
  whatsapp: 'ווטסאפ',
  facebook: 'פייסבוק',
  x: 'X',
  copy: 'העתקת טקסט',
  download: 'שמירת התמונה',
}

/**
 * הקישור שהכרטיס נושא — and the reason it is a constant rather than a per-card URL.
 *
 * A share card is not a tracking pixel. It carries the game's address and nothing that
 * identifies the player, the run, or the save. If we ever want to know whether sharing
 * works, that question is answered by the analytics the monetization layer already has,
 * on our side, and not by decorating a person's WhatsApp message with an id.
 */
export const SHARE_URL = 'https://theworker.dubelteam.com'

/** the text that travels with the image; the image is the point, this is the escort */
export function shareText(card: ShareCard): string {
  const own = card.ownWordsHe ? `\n"${card.ownWordsHe}"` : ''
  return `${card.dateHe}\n${card.claimHe}${own}\n\n${card.askHe}\n${SHARE_URL}`
}

/** where a target sends a browser, or null when the target needs the file itself */
export function shareHref(card: ShareCard, target: ShareTarget): string | null {
  const text = encodeURIComponent(shareText(card))
  switch (target) {
    case 'whatsapp':
      return `https://wa.me/?text=${text}`
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}`
    case 'x':
      return `https://twitter.com/intent/tweet?text=${text}`
    default:
      return null
  }
}

/**
 * מה אסור להופיע על כרטיס — rule 1 and rule 2, as a function, so the test can run every
 * card the game can produce through it.
 *
 * A share card leaves the game and lands in front of people with no context, so it is held
 * to a stricter standard than a screen: no score, no percentage, no comparison, and no bare
 * result that reads as an archive claim.
 */
const BANNED = [
  /\b\d{1,3}\s*%/,
  /\bניקוד\b/,
  /\bנקודות שלי\b/,
  /\bדירוג\b/,
  /\bשיא\b/,
  /\bרצף\b/,
  /\bהישג\b/,
  /\bתג\b/,
  /\bרמה \d/,
]

export function cardIsClean(card: ShareCard): { ok: boolean; whyHe: string | null } {
  const text = [card.dateHe, card.claimHe, card.askHe, card.ownWordsHe ?? '', card.captionHe].join(' ')
  for (const pattern of BANNED) {
    if (pattern.test(text)) return { ok: false, whyHe: `הכרטיס נושא ניסוח של הישג: ${pattern}` }
  }
  return { ok: true, whyHe: null }
}
