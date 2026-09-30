/**
 * שלושים ההישגים — recognition, and a reward that is a thing in the world.
 *
 * The life spec opens this section with the sentence the whole feature has to obey:
 *
 *   > הישג הוא זיהוי של משהו שעשית. הפרס הוא חפץ, זיכרון, גישה, תפקיד או תגובה בעולם.
 *   > אין תשלום כפול בנקודות על פעולה ואז על ההישג של אותה פעולה.
 *   > אין פרס על שיתוף לרשת חברתית, ואין חובה לשתף כדי לקבל תוכן.
 *
 * Three consequences, and all three are structural rather than editorial:
 *
 *  1. **There is no number anywhere in this file.** No points, no percentage, no tier, no
 *     "17 of 30". An achievement carries an id, a Hebrew name, a predicate and a REWARD,
 *     and the reward is one of the five kinds the spec names. The deed already paid; this
 *     layer only notices. (Rule 46 and rule 63א: the sheet answers "how much", the card
 *     answers "who you are", and this is on the card's side of that line.)
 *  2. **A condition is a PREDICATE over the life, not a hand-wired hook.** The spec's
 *     `evidence` column — `first_match_1983`, `bread_delivered`, `promise_kept`,
 *     `radio_repaired`, `travel_proof` … — is exactly `ProofRecord.kind`, so thirty
 *     conditions are thirty questions asked of `state.proofs`, `state.flags`,
 *     `state.relationships`, `state.redBox` and `state.presence`. That is what makes them
 *     checkable in a test instead of trusted.
 *  3. **Nothing here may be a measure of how good a supporter somebody is.** Rule 46 gives
 *     PURE HAPOEL LOVE one owner (`pure-love.ts`) and this file does not read it, does not
 *     write it, and has no row that ranks a life against another one.
 *
 * **Where the proof ledger does not reach yet, the world's own flag is accepted as the
 * same evidence, and only where it is UNAMBIGUOUS.** `a4:worked` is a paid shift at
 * Rafi's counter and can mean nothing else, so it stands in for `paid_shift`. `a4:kobi`
 * is raised by BOTH branches of the conversation with the father — the one that takes his
 * five shekels and the one that refuses them — so it proves nothing about funding and is
 * not used. A row that has no unambiguous evidence in the game as built carries
 * `waitingHe`, in the shape rule 66 asks a budget audit to report an unreachable
 * threshold in: named, with the reason, rather than shipped as dead content.
 *
 * **ושתי שורות יצאו מההמתנה ב-16.9.2026, והדרך שהן יצאו היא העניין.** `ACH_SHIRT_GIFT`
 * ו-`ACH_SHIRT_SELF` לא תוקנו כאן; הן תוקנו ב-`content/chapterStageA.ts`, כי מה שהיה חסר
 * לא היה תנאי אלא ראיה. הרכישה אצל רפי רושמת עכשיו `first_shirt_bought`, שעת הארגזים
 * רושמת `paid_shift`, והחמישה שקל של אבא רושמים `gift_received` ומרימים `a4:kobi-gave`
 * רק בענף שלוקח אותם. **הישג שאי-אפשר להשיג הוא כמעט תמיד באג בעולם ולא באסמכתה** —
 * לרפות את התנאי כאן היה הופך אותו לשקר במקום לחסר.
 *
 * Pure. No React, no Phaser, no i18n — so a test can drive the whole of it.
 */

import { CHAPTERS } from './content/chapters'
import { LATER, chapterIndex, chapterOnOrAfter, firstWornChapter, ownedShirts } from './shirts'
import { reversalComplete, ticketsIn1983 } from './tickets'
import { flagOn, type LifeState } from './types'
import type { LifeEvent } from './events'

// ---------------------------------------------------------------------------------
// חמשת סוגי הפרס — the spec's own list, and the reason the type is closed.
//
//   1. חפץ עם סיפור       — a shirt, a ticket, a notebook, a page of an idea.
//   2. גישה                — a system mission, a preparation room, a crew meeting.
//   3. הכרה                — a character remembers your contribution and speaks differently.
//   4. יצירה נראית         — your song, your clipping, your item, where others use it.
//   5. רגע אישי            — your father agrees you can organise it; a friend takes out
//                            the thing you gave him; somebody starts talking to you again.
//
// The spec says all five MUST appear in the script. A closed union plus one test is how
// that stops being a sentence in a document.
// ---------------------------------------------------------------------------------

export type RewardKind = 'object' | 'access' | 'recognition' | 'visible' | 'personal'

export const REWARD_KINDS: readonly RewardKind[] = ['object', 'access', 'recognition', 'visible', 'personal']

/**
 * The spec's own five words, kept here beside the type for the same reason `RARITY_LABEL`
 * lives in `redbox.ts`: this is content about the model, not chrome on a screen, and two
 * copies of it would drift the moment somebody renamed a kind.
 */
export const REWARD_KIND_HE: Record<RewardKind, string> = {
  object: 'חפץ עם סיפור',
  access: 'גישה',
  recognition: 'הכרה',
  visible: 'יצירה נראית',
  personal: 'רגע אישי',
}

/** מה הפרס בעצם — the kind, what it is, and what it explicitly is NOT. */
export type Reward = {
  kind: RewardKind
  /** the thing itself, in the spec's own words */
  titleHe: string
  /** what it does in the world — a sentence a writer can build a scene from */
  noteHe: string
}

export type Achievement = {
  /** the spec's own id. Persisted inside a flag, so it is never renamed (rule 35). */
  id: string
  /** the spec's own Hebrew name */
  titleHe: string
  /**
   * `ProofRecord.kind` — the spec's `evidence` column, when it names one.
   *
   * It is on the row rather than only inside `earned` so that a content writer can ask
   * "what would I have to record for this to become true" without reading a predicate.
   */
  proofKinds: readonly string[]
  /** what has to be true of a life. Pure, total, and never reads a number off a gauge. */
  earned: (state: LifeState) => boolean
  reward: Reward
  /**
   * למה אי-אפשר להשיג אותו היום — null when the game as built can produce it.
   *
   * A row with a sentence here is content that is knowingly waiting for a chapter, in the
   * shape rule 66 reports an unreachable threshold: named, with the reason. An achievement
   * nothing can trigger and nobody has written down is the dead content that rule exists
   * to make visible.
   */
  waitingHe: string | null
}

// ------------------------------------------------------------------- הראיות ------

const proofsOf = (state: LifeState, kind: string) => state.proofs.filter((proof) => proof.kind === kind)

export const hasProof = (state: LifeState, kind: string): boolean => proofsOf(state, kind).length > 0

/**
 * הנושא של הראיה — the promise, the report, the ticket, the work.
 *
 * `subjectHe` is the spec's own join key: "promise_kept לאותה בקשה", "public_correction
 * לטענה קודמת שלך", "שימוש מתועד של הקהל בשיר". Where a proof carries no subject it is
 * its own subject, so a ledger that has not started naming things yet cannot accidentally
 * make two unrelated proofs look like a pair.
 */
const subjectsOf = (state: LifeState, kind: string): Set<string> =>
  new Set(proofsOf(state, kind).map((proof) => proof.subjectHe ?? proof.proofId))

/** אותה ראיה, שני צדדים — a subject that appears under both kinds. */
const sameSubject = (state: LifeState, left: string, right: string): boolean => {
  const first = subjectsOf(state, left)
  for (const subject of subjectsOf(state, right)) if (first.has(subject)) return true
  return false
}

/** a subject carried by at least `n` DISTINCT proofs of one kind — two sources, one report */
const subjectWithSources = (state: LifeState, kind: string, n: number): Set<string> => {
  const seen = new Map<string, Set<string>>()
  for (const proof of proofsOf(state, kind)) {
    const subject = proof.subjectHe ?? proof.proofId
    const ids = seen.get(subject) ?? new Set<string>()
    ids.add(proof.proofId)
    seen.set(subject, ids)
  }
  const out = new Set<string>()
  for (const [subject, ids] of seen) if (ids.size >= n) out.add(subject)
  return out
}

/** how many chapters a kind of evidence was recorded in — "בשני פרקים לפחות" */
const chaptersWith = (state: LifeState, kind: string): Set<string> =>
  new Set(proofsOf(state, kind).map((proof) => proof.chapter))

// ------------------------------------------------------------------- המסלולים ----

/**
 * `own:route:<ROUTE>:apex` — the agreed contract with `lib/life/routes.ts`.
 *
 * Six of the thirty fire on a route's apex being ACCEPTED. That file is being built in
 * parallel and is deliberately NOT imported here: an achievement that reaches into a
 * route's internals is an achievement that breaks when the route is refactored, and the
 * flag is the seam both sides already agreed on. `own:` is load-bearing — `personFlags()`
 * erases everything else at a year change, and an apex accepted in 1996 has to still be
 * true in 2000.
 */
export const routeApexFlag = (route: string) => `own:route:${route}:apex`

const apexAccepted = (state: LifeState, route: string) => flagOn(state, routeApexFlag(route))

export const ROUTE_IDS = {
  ultras: 'ULTRAS',
  journalist: 'JOURNALIST',
  owner: 'OWNER',
  creator: 'CREATOR',
  founder: 'USSISHKIN_FOUNDER',
  traveller: 'TRAVELLER',
} as const

// ------------------------------------------------------------------- העולם -------

/**
 * הפרולוג — 1 ביוני 1983, and the year is READ, never typed (rule 45).
 *
 * `STAGE_A_DAYS` would answer it too; `CHAPTERS` is the registry every other module in
 * this layer counts from, and `a2-alley` is the first chapter row, so the prologue is the
 * year before the life's first chapter opens on. Deriving it keeps this file honest if the
 * master timeline is ever rebased again, which rule 45 records having already happened
 * once.
 */
const FIRST_CHAPTER = CHAPTERS[0]

/** the chapter whose unit the spec calls B11B — the twenty-second birthday */
const B11B = CHAPTERS.find((chapter) => chapter.unit.toUpperCase() === 'B11B') ?? null

/**
 * שני הבתים — the ground and the hall, as the world records them.
 *
 * Presence is keyed by anchor id and an anchor's SPORT is resolved server-side, so a pure
 * predicate cannot ask "was this a football anchor". The hall is asked for by the flags
 * only a hall scene raises; the ground is asked for by a presence mode that means he was
 * physically at a match. Two different events by construction, which is what the spec's
 * "בשני אירועים שונים" wants.
 */
const HALL_FLAGS = [
  'life:seen:ussishkin',
  'life:knows:hall',
  'life:hall:d1',
  'life:hall:d2',
  'life:hall:h2',
  'life:hall:football-night',
] as const

const inTheHall = (state: LifeState) => HALL_FLAGS.some((flag) => flagOn(state, flag))

const inTheStand = (state: LifeState) =>
  Object.values(state.presence).some((mode) => mode === 'inside' || mode === 'late')

/**
 * עבר איתו שלושה מעברי תקופה — the same kept object, still owned, three chapters later.
 *
 * A Red Box row carries the year it was kept, and `chapterOnOrAfter` turns a year into the
 * chapter it belongs to, so "three lived period transitions" is a distance along the same
 * spine the shop and the album already count on.
 *
 * **ובגד נספר עכשיו גם הוא, בלי ששדה אחד נוסף למצב.** This used to say that `clothing`
 * cannot answer the question because it is a list of ids with no acquisition year, and
 * that a field would have to be added. It does not: `own:worn:<id>:<chapter>` is written
 * the evening a shirt is put on and survives every year turn, so the earliest chapter a
 * shirt was worn in is already in the log (`firstWornChapter`). That is a stronger claim
 * than a stored purchase year — it is evidence he HAD it then, not a number — and it is
 * the smallest possible version of the rule the save system is built on (rule 39/46): the
 * same rows, read by a richer reducer. A stored `boughtIn` would have been a second,
 * weaker truth beside a fact the log already holds.
 *
 * The two halves are deliberately an OR and not one merged list. A Red Box row is a thing
 * he chose to keep; a shirt is a thing he wears. Either of them crossing three chapters is
 * the same sentence — "it moved house with me" — and neither is more of an object than the
 * other.
 */
const KEPT_SPAN = 3

/** a kept object from the Red Box, still there this many chapters later */
function keptInBox(state: LifeState, now: number, spans: number): boolean {
  return state.redBox.some((item) => {
    const chapter = chapterOnOrAfter(item.year)
    if (chapter === LATER) return false
    const at = chapterIndex(chapter)
    return at >= 0 && now - at >= spans
  })
}

/** a shirt worn that many chapters ago and still in the wardrobe now */
function keptInWardrobe(state: LifeState, now: number, spans: number): boolean {
  return ownedShirts(state).some((shirt) => {
    const first = firstWornChapter(state, shirt.id)
    if (first === null) return false
    const at = chapterIndex(first)
    return at >= 0 && now - at >= spans
  })
}

function keptAcrossEras(state: LifeState, spans = KEPT_SPAN): boolean {
  const now = chapterIndex(state.chapter)
  if (now < 0) return false
  return keptInBox(state, now, spans) || keptInWardrobe(state, now, spans)
}

// ------------------------------------------------------------------- השואו -------

/**
 * שואו אישי בסיום תקופה — three items, two memories, one line he chose.
 *
 * The flag is `own:` because a show put together in 1991 is still his in 2000, and its
 * value is the line he picked, so the display can print HIS sentence rather than ours.
 * `components/life/LifeShow.tsx` is the screen; this is the only place that knows the key.
 */
export const SHOW_FLAG = 'own:show'
export const SHOW_ITEMS_FLAG = 'own:show:items'
export const SHOW_MEMORIES_FLAG = 'own:show:memories'

export const SHOW_ITEMS = 3
export const SHOW_MEMORIES = 2

/** what a published show writes — existing event types only; nothing new is invented */
export function showEvents(picks: { items: string[]; memories: string[]; lineHe: string }): LifeEvent[] {
  return [
    { t: 'flag.set', flag: SHOW_ITEMS_FLAG, value: picks.items.join(',') },
    { t: 'flag.set', flag: SHOW_MEMORIES_FLAG, value: picks.memories.join(',') },
    { t: 'flag.set', flag: SHOW_FLAG, value: picks.lineHe },
  ]
}

/**
 * הניסוחים שהמצב מאפשר — and the emphasis is on ALLOWS.
 *
 * The spec gives two examples and they are both a sentence the life earned: *"את הגביע
 * הזה שמעתי מהסלון"* is a `presence` of `radio`, and *"הכרטיס שלי הגיע לאופיר"* is a
 * `ticket_shared` proof with a name on it. So the short line is not free text and it is
 * not a list of moods: it is generated from what the save actually holds, which is the
 * only way a show can be personal without letting anybody write a caption the game cannot
 * stand behind (rule 11, applied to the player's own claims).
 *
 * A day he was not present for gets a sentence that says so. The spec is explicit that a
 * memory from an event you missed may be *"אופיר סיפר לי"* and never *"הייתי שם"*.
 */
const PRESENCE_LINE: Record<string, (titleHe: string) => string> = {
  inside: (it) => `${it} — הייתי שם.`,
  late: (it) => `ל${it} הגעתי באיחור, ונכנסתי בכל זאת.`,
  outside: (it) => `${it} — עמדתי בחוץ, ליד השער.`,
  radio: (it) => `את ${it} שמעתי מהסלון.`,
  television: (it) => `את ${it} ראיתי מול הטלוויזיה.`,
  army: (it) => `${it} קרה כשהייתי בצבא.`,
  working: (it) => `${it} קרה כשהייתי בעבודה.`,
  'heard-from-friend': (it) => `על ${it} סיפרו לי.`,
  travelling: (it) => `את ${it} שמעתי בדרך, מרדיו של מישהו אחר.`,
  'archive-later': (it) => `על ${it} קראתי רק אחר כך.`,
}

export type ShowMemoryPick = {
  id: string
  titleHe: string
  /** the presence mode the save recorded, or null when it recorded only that he was there */
  mode: string | null
  wasThere: boolean
}

export function phrasingsFor(
  state: LifeState,
  picks: { items: readonly { id: string; titleHe: string }[]; memories: readonly ShowMemoryPick[] },
): string[] {
  const lines: string[] = []
  for (const memory of picks.memories) {
    const write = memory.mode ? PRESENCE_LINE[memory.mode] : null
    if (write) lines.push(write(memory.titleHe))
    else lines.push(memory.wasThere ? `${memory.titleHe} — הייתי שם.` : `${memory.titleHe} — לא הייתי שם.`)
  }
  for (const item of picks.items) lines.push(`${item.titleHe} — נשאר אצלי.`)
  for (const proof of proofsOf(state, 'ticket_shared')) {
    if (proof.subjectHe) lines.push(`הכרטיס שלי הגיע ל${proof.subjectHe}.`)
  }
  return [...new Set(lines)]
}

const listLength = (state: LifeState, flag: string): number => {
  const value = state.flags[flag]
  if (typeof value !== 'string' || value.trim() === '') return 0
  return value.split(',').filter((entry) => entry.trim() !== '').length
}

const showPublished = (state: LifeState): boolean =>
  flagOn(state, SHOW_FLAG) &&
  listLength(state, SHOW_ITEMS_FLAG) >= SHOW_ITEMS &&
  listLength(state, SHOW_MEMORIES_FLAG) >= SHOW_MEMORIES

// ---------------------------------------------------------------------------------
// שלושים
// ---------------------------------------------------------------------------------

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'ACH_FIRST',
    titleHe: 'היד הראשונה',
    proofKinds: ['first_match_1983'],
    /**
     * 1 ביוני 1983 — a real match in the archive (rule 11), and the only thing this row
     * asserts about it is that the boy was carried in and that it was his father who had
     * the tickets. `own:tickets-1983` is written by the prologue AS A VALUE for exactly
     * this kind of question, and `prologue:done` is the fallback for a life that played
     * the prologue before the ticket beat shipped.
     */
    earned: (state) =>
      (hasProof(state, 'first_match_1983') || flagOn(state, 'prologue:done')) &&
      (ticketsIn1983(state) === 'kobi' || flagOn(state, 'life:a1:father')),
    reward: {
      kind: 'object',
      titleHe: 'עמוד פתיחה באלבום',
      noteHe: 'הדף הראשון של האלבום נפתח על השנה ההיא, עם החפץ שנשאר ממנה ובלי תוצאה.',
    },
    waitingHe: null,
  },
  {
    id: 'ACH_BREAD',
    titleHe: 'אמרתי שאחזור',
    proofKinds: ['bread_delivered', 'promise_kept'],
    earned: (state) =>
      (hasProof(state, 'bread_delivered') && sameSubject(state, 'bread_delivered', 'promise_kept')) ||
      (flagOn(state, 'a2:errand') && flagOn(state, 'a2:bread')),
    reward: {
      kind: 'recognition',
      titleHe: 'שורת זיכרון של רחל',
      noteHe: 'רחל פונה אליו אחרת בפעם הבאה שהיא מבקשת משהו — היא כבר יודעת שהוא חוזר.',
    },
    waitingHe: null,
  },
  {
    id: 'ACH_NEW_PLAN',
    titleHe: 'שיניתי בלי להיעלם',
    proofKinds: ['promise_renegotiated', 'promise_kept'],
    earned: (state) =>
      hasProof(state, 'promise_renegotiated') && sameSubject(state, 'promise_renegotiated', 'promise_kept'),
    reward: {
      kind: 'access',
      titleHe: 'אפשרות לבחור את ההסכמה כסיפור אישי',
      noteHe: 'בשואו האישי נפתח ניסוח שרק מי שסיכם מחדש מראש יכול לבחור.',
    },
    /**
     * נפתח ב-20.9.2026, ב-A2 — הפרק שבו נאמרת ההבטחה הראשונה במשחק.
     *
     * רחל מבקשת לחם, והייתה תשובה שאומרת כן ותשובה שדוחה בלי לנקוב בכלום. השלישית היא
     * המנגנון שהשורה הזאת חיכתה לו: *"אני קודם יורד למגרש. הלחם יהיה פה לפני חמש."* —
     * מועד אחר, מוסכם מראש, שהילד עצמו נוקב בו. הלחם שנקנה לפני חמש רושם `promise_kept`
     * על **אותו נושא**, ומי שנקב בשעה ולא עמד בה שומע על זה בערב ולא נרשם לו כלום.
     */
    waitingHe: null,
  },
  {
    id: 'ACH_SHIRT_WORK',
    titleHe: 'חלק ממני בחולצה',
    proofKinds: ['first_shirt_bought', 'paid_shift'],
    /**
     * `a4:worked` היא שעה של ארגזים אצל רפי ולא שום דבר אחר — ראיה חד-משמעית לשכר, ולכן
     * היא עומדת במקום `paid_shift` עד שהרכישה תרשום פנקס מימון.
     */
    earned: (state) =>
      (hasProof(state, 'first_shirt_bought') && hasProof(state, 'paid_shift')) ||
      (flagOn(state, 'own:shirt85') && flagOn(state, 'a4:worked')),
    reward: {
      kind: 'object',
      titleHe: 'תווית מקור אישית לחולצה',
      noteHe: 'לחולצה נקשרת תווית שאומרת מאיפה הגיע הכסף — שעה של ארגזים, בשם שלו.',
    },
    waitingHe: null,
  },
  {
    id: 'ACH_SHIRT_GIFT',
    titleHe: 'המתנה הראשונה',
    proofKinds: ['first_shirt_bought', 'gift_received'],
    /**
     * (delta 93) the gift is now the shirt itself: Kobi walks into the kiosk behind a boy
     * who already has the thirty on the counter, and pays. `a4:kobi-gifted-shirt` is that
     * moment. The two older readings stay for the lives that lived them — the five shekels
     * at home (`a4:kobi-gave`) and the ledger pair written beside them.
     */
    earned: (state) =>
      (flagOn(state, 'own:shirt85') && (flagOn(state, 'life:first-shirt:gift') || flagOn(state, 'a4:kobi-gifted-shirt'))) ||
      (hasProof(state, 'first_shirt_bought') && hasProof(state, 'gift_received')) ||
      (flagOn(state, 'own:shirt85') && flagOn(state, 'a4:kobi-gave')),
    reward: {
      kind: 'personal',
      titleHe: 'פתק דיאלוג נלווה',
      noteHe: 'קובי אומר על החולצה משפט שהוא לא היה אומר על חולצה שנקנתה בלעדיו. יכול להתקיים יחד עם ACH_SHIRT_WORK.',
    },
    /**
     * ההפרדה נעשתה בתוכן (16.9.2026). `kobi-a4` מרים `a4:kobi-gave` רק בענף שלוקח את
     * החמישה שקל, ורושם שם `gift_received` עם שם האיש עליו. הענף שמסרב ממשיך להרים את
     * `a4:kobi` בלבד, כי הוא עדיין נכון לשאלה שהוא נשאל עליה — "דיברנו על זה".
     */
    waitingHe: null,
  },
  {
    id: 'ACH_SHIRT_SELF',
    titleHe: 'הכסף שחסכתי',
    proofKinds: ['first_shirt_bought', 'paid_shift'],
    /**
     * זה הרוב שדורש ראיה שלילית, ולכן הוא לא מסתמך על דגלים.
     *
     * `a4:worked` מוכיח שכר; שום דגל לא מוכיח את **היעדר** המתנה, ואישור על סמך "לא ראינו
     * מתנה" היה נותן את ההישג גם למי שלקח חמישה שקל מאבא. עדיף חסר מאשר שקר.
     */
    /**
     * (delta 93) "הכסף שחסכתי" is truer than it was: the thirty he saved is still in his
     * pocket after the counter. What it may not have is MONEY that was a present — the
     * shirt his father bought him is not money, so the ledger line for it
     * (`first_shirt_gift:*`) does not count against him; Kobi's old five shekels do.
     */
    earned: (state) =>
      hasProof(state, 'first_shirt_bought') &&
      hasProof(state, 'paid_shift') &&
      !proofsOf(state, 'gift_received').some((row) => !row.proofId.startsWith('first_shirt_gift:')) &&
      !hasProof(state, 'loan_taken') &&
      state.debt === 0,
    reward: {
      kind: 'object',
      titleHe: 'עמוד רכישה עצמאית',
      noteHe: 'עמוד באלבום שמראה את הפחית, את הארגזים ואת החולצה — ואפשר להשיג אותו גם הרבה אחר כך.',
    },
    /**
     * הפנקס נפתח (16.9.2026): הרכישה אצל רפי רושמת `first_shirt_bought`, שעת הארגזים
     * רושמת `paid_shift`, והחמישה שקל של אבא רושמים `gift_received`. הראיה השלילית היא
     * עכשיו ראיה ולא חוסר — המתנה נרשמת בכל פעם שהיא ניתנת.
     *
     * **והשלושים באמת ניתנים להשגה בלי המתנה**, וזה מה שהופך את השורה הזאת לחיה ולא
     * לתיאורטית: הפחית, דמי הכיס, כסף הלחם שנשאר בכיס (אצל רפי הכול על החשבון),
     * הבקבוקים והארגזים הם עשרים וחמישה, וג׳וב אחד בתשלום סוגר את החמישה שנותרו —
     * `lib/life/gigs.ts` מבטיח שאחד לפחות מוצע בכל פרק, והיקר שבהם שווה שמונה.
     * `tests/life-wallet.test.ts` מחזיק את החשבון הזה.
     *
     * **ובשבוע שבו העבודה היחידה שהוצעה היא סבב הבקבוקים, זה לא מספיק — בשקל.** זו לא
     * תקלה וזה גם לא סף מעל התקרה: הרוטציה של הג׳ובים היא פיצ'ר מוצהר ("שני שמורים
     * רואים ג׳ובים שונים, כי אלה חיים ולא תסריט"), והמשמעות שלה כאן היא שיש שבועות שבהם
     * החולצה נקנית רק עם החמישה שקל של אבא. זה בדיוק מה שהפרק אמור להרגיש. מה שכן היה
     * חייב להיות נכון — שקיים מסלול שבו היא נקנית בלעדיו — נכון.
     */
    waitingHe: null,
  },
  {
    id: 'ACH_RADIO',
    titleHe: 'חזר השידור',
    proofKinds: ['radio_repaired'],
    earned: (state) => hasProof(state, 'radio_repaired') || flagOn(state, 'a6:end-liron'),
    reward: {
      kind: 'object',
      titleHe: 'פריט זיכרון תיקון',
      noteHe: 'החוט האדום והמברג נכנסים לקופסה. הרדיו עצמו נשאר של לירון — בעלות עוברת רק כשהיא עוברת.',
    },
    waitingHe: null,
  },
  {
    id: 'ACH_TWO_HOMES',
    titleHe: 'עוד בית',
    proofKinds: [],
    earned: (state) => inTheStand(state) && inTheHall(state),
    reward: {
      kind: 'object',
      titleHe: 'עמוד כפול של שני הבתים',
      noteHe: 'דף אחד עם שני עמודים פתוחים: היציע והפרקט, כל אחד עם מה שנשמר ממנו.',
    },
    waitingHe: null,
  },
  {
    id: 'ACH_VERIFY',
    titleHe: 'בדקתי לפני שאמרתי',
    proofKinds: ['verified_report', 'written_account'],
    earned: (state) => {
      const twoSources = subjectWithSources(state, 'verified_report', 2)
      for (const subject of subjectsOf(state, 'written_account')) if (twoSources.has(subject)) return true
      return false
    },
    reward: {
      kind: 'visible',
      titleHe: 'שומר גזיר מהדיווח שלך',
      noteHe: 'הגזיר נכנס לקופסה ומופיע אחר כך על שולחן של מישהו אחר, עם השם שלו עליו.',
    },
    /**
     * נפתח ב-20.9.2026, ב-12.5.1990 — הפרק שכל עניינו מה ידעת ומתי.
     *
     * שני המקורות היו שם מהיום הראשון ואף אחד לא רשם אותם: עמית אומר *"שמעתי שביבנה כבר
     * מובילים"* ואופיר שואל *"שמעת ממי?"* — ואף אחד לא עונה. הבחירה החדשה היא מי שכן
     * שואל, והראיה נרשמת על **מה שנאמר**, לא על מה שקרה. השנייה היא הטרנזיסטור: הוא
     * מקריא מגרשים ולא תוצאות, ובשעה ההיא זה כל מה שהוא יודע.
     *
     * ואז השוליים של העיתון. **המשחק לא יודע מה קרה ביבנה** — השורה בארכיון נושאת תוצאה
     * `null` — ולכן מה שנכתב הוא מי אמר מה ומאיפה. ילד בן שתים־עשרה שעושה את זה עשה
     * בדיוק את מה שההישג הזה נקרא עליו, בלי מילה אחת שהארכיון לא מחזיק.
     */
    waitingHe: null,
  },
  {
    id: 'ACH_CORRECT',
    titleHe: 'השם שלי גם על התיקון',
    proofKinds: ['public_correction'],
    earned: (state) => hasProof(state, 'public_correction') && sameSubject(state, 'public_correction', 'written_account'),
    reward: {
      kind: 'visible',
      titleHe: 'גזיר תיקון צמוד למקור',
      noteHe: 'התיקון נתלה ליד הטענה המקורית ולא במקומה. הטעות נשארת קריאה — זה כל העניין.',
    },
    /**
     * נפתח ב-20.9.2026, והצורה של התיקון היא כל ההישג.
     *
     * הדף שנתלה בחלון של רפי ב-1999 עוד שם שנה אחר כך, מצהיב ומצוטט — ובפסקה השלישית שם
     * של מישהו שלא היה שם באותו ערב. אפשר להוריד ולכתוב מחדש, ואפשר לתלות **פתק ליד**.
     * רק השני נרשם: `public_correction` על אותו נושא של הטקסט המקורי, **בלי למחוק אותו**.
     * מי שמוחק במקום להוסיף מוחק גם את העדות שהוא טעה — וזה עולה אחד משני הדברים שיש
     * זמן אליהם בארבעת הימים שבין האליפות לגמר, כי תיקון שלא עולה כלום הוא הודעה.
     */
    waitingHe: null,
  },
  {
    id: 'ACH_GAVE',
    titleHe: 'המקום שנתתי',
    proofKinds: ['ticket_shared', 'ticket_used'],
    earned: (state) => hasProof(state, 'ticket_shared') && sameSubject(state, 'ticket_shared', 'ticket_used'),
    reward: {
      kind: 'personal',
      titleHe: 'תצלום או מכתב מהחבר',
      noteHe: 'החבר מוציא בסצנה מאוחרת את מה שקיבל ממך, ואומר עליו משפט שאתה לא כתבת.',
    },
    /**
     * נפתח ב-20.9.2026, בגמר הגביע של 1999, ושתי הראיות נרשמות בשני מקומות שונים בכוונה.
     *
     * `ticket_shared` נרשם ברחוב — שישים שקל ומקום ביציע שאפי לא ביקש. `ticket_used`
     * נרשם רק באצטדיון, כשרואים אותו שם עומד על כיסא. בין שני המשפטים האלה עומד ערב שלם
     * שבו אדם יכול פשוט לא לבוא, וזו בדיוק ההבחנה שההישג עושה: **מקום שנתת אינו מקום
     * שמישהו ישב בו.**
     */
    waitingHe: null,
  },
  {
    id: 'ACH_RELIABLE',
    titleHe: 'ארבע הבטחות',
    proofKinds: ['promise_kept'],
    earned: (state) => {
      const ids = new Set(proofsOf(state, 'promise_kept').map((proof) => proof.proofId))
      return ids.size >= 4 && chaptersWith(state, 'promise_kept').size >= 2
    },
    reward: {
      kind: 'recognition',
      titleHe: 'דמות מתייחסת להרגל שלך בסצנה',
      noteHe: 'מישהו מפסיק לוודא. הוא כבר מתכנן סביבך, ואומר את זה בלי לשבח אותך.',
    },
    /**
     * ארבע הבטחות, ארבעה פרקים, ואף אחת מהן לא נכתבה בשביל השורה הזאת.
     *
     * כולן כבר היו בעולם; מה שחסר היה שמישהו ירשום אותן. `promise_kept` נרשמת עכשיו על
     * הלחם של 1984 (לפני חמש), על השעה שאמא אמרה ב-1991 (יצא בזמן), על *"מה שלא יהיה"*
     * שנאמר לאפי ב-1993 (ונסע), ועל *"לא אעשה שטויות"* מ-1996 — זו האחרונה נסגרת בסוף
     * החורף ורק אם לא הייתה נסיעה בלי חופשה ולא שקר למפקד.
     *
     * ארבע ראיות עם ארבעה נושאים שונים, כי `ids.size` סופר מזהים ולא מקרים: להבטיח אותו
     * דבר ארבע פעמים אינו ארבע הבטחות.
     */
    waitingHe: null,
  },
  {
    id: 'ACH_REPAIR',
    titleHe: 'חזרתי לדבר',
    proofKinds: ['repair_completed', 'breach_discovered'],
    earned: (state) => hasProof(state, 'repair_completed') && sameSubject(state, 'repair_completed', 'breach_discovered'),
    reward: {
      kind: 'personal',
      titleHe: 'זיכרון פיוס שאינו מוחק את התקרית',
      noteHe: 'שתי שורות בקופסה, זו ליד זו: מה שקרה, ומה שנאמר אחר כך. אף אחת לא מוחקת את השנייה.',
    },
    /**
     * ההפרות היו תמיד בעולם; מה שחסר היה שהן ייכתבו, ושתהיה דרך לחזור אליהן.
     *
     * `breach_discovered` נרשמת עכשיו בשני המקומות שבהם היא קורית — הערב שבו הוא נשאר
     * באולם אחרי השעה שרחל אמרה (1991), ו*"מה שלא יהיה"* שנאמר לאפי ולא קוים (1993) —
     * ולכל אחת מהן יש חדר לחזור אליה בו: הערב האחרון בבית לפני הגיוס, והמדרכה לפני גמר
     * הגביע של 1999. שתי הבחירות **מוסתרות** למי שלא הפר: אין מה לתקן, ואין מה להציע.
     *
     * **והתיקון לא מוחק את התקרית.** שתי הראיות נושאות את אותו נושא ויושבות בפנקס זו
     * ליד זו, וגם המדדים אומרים את זה: המתח יורד, האמון עולה, ואף אחד מהם לא חוזר למקום
     * שבו היה לפני.
     */
    waitingHe: null,
  },
  {
    id: 'ACH_TEAM',
    titleHe: 'הם הגיעו בזכותי',
    proofKinds: ['group_delivered'],
    earned: (state) => hasProof(state, 'group_delivered') && !sameSubject(state, 'group_delivered', 'group_unresolved'),
    reward: {
      kind: 'visible',
      titleHe: 'רשימת משתתפים עם השם שלך כאחראי',
      noteHe: 'הפנקס של מישל — מי נסע, מי איחר, כמה עלה — נפתח בעמוד שהשם שלך בראשו.',
    },
    /**
     * הפנקס של מישל קיים בסיפור מ-1993, ומ-20.9.2026 אפשר להחזיק אותו.
     *
     * לקחת אותו זה לרשום **שמות** — לא "חברים" — ולהיות באחריות עליהם. מי שמילא מקומות
     * ונסע במיניבוס הביא אותם; מי שמילא ואז הגיע בדרך אחרת רשם `group_unresolved` על
     * אותו נושא, וההישג קורא את שניהם. אין קנס ואין הודעה: יש שורה שנייה בפנקס, ומישל
     * שאומר מי חיכה בקיוסק עד שבע.
     */
    waitingHe: null,
  },
  {
    id: 'ACH_WRITE',
    titleHe: 'המילים שלי בחוץ',
    proofKinds: ['journalism_proof', 'publication_proof'],
    earned: (state) => hasProof(state, 'journalism_proof') && sameSubject(state, 'journalism_proof', 'publication_proof'),
    reward: {
      kind: 'visible',
      titleHe: 'עמוד כתבה בעל קרדיט',
      noteHe: 'הכתבה מופיעה בעולם עם השם שלו מתחת לכותרת, ואנשים בסצנה מצטטים ממנה בלי לדעת שהוא כתב.',
    },
    /**
     * נפתח ב-20.9.2026, והחלון של רפי הוא ה"חוץ".
     *
     * *"תן, אני אכתוב את הערב"* קיים מאז שהפרק נכתב, והוא היה מחווה: אמון, זיכרון, דגל.
     * עכשיו הוא רושם **שתי** ראיות על אותו דף — תיעוד וטקסט שמישהו יקרא — וסוקו יכול
     * להעתיק אותו ולתלות בחלון. `publication_proof` נרשם שם ולא באולם, כי בין מחברת
     * לבין דף שאנשים עוצרים מולו עומד בדיוק ההבדל שהשורה הזאת חיכתה לו. שנה אחר כך
     * מישהו מצטט ממנו בקול ולא יודע מי כתב אותו, וזה הפרס בדיוק כפי שהוא רשום.
     */
    waitingHe: null,
  },
  {
    id: 'ACH_CREATE',
    titleHe: 'שרים את זה',
    proofKinds: ['creation_proof', 'crowd_use_proof'],
    earned: (state) => hasProof(state, 'creation_proof') && sameSubject(state, 'creation_proof', 'crowd_use_proof'),
    reward: {
      kind: 'visible',
      titleHe: 'ביצוע של היצירה בעולם',
      noteHe: 'היציע שר את זה בלי שביקשת, ואתה שומע את זה מאחורה. בתחום שאינו שיר — הישג מקביל בשם מתאים.',
    },
    /**
     * נפתח ב-20.9.2026, בשתי דרכים — ושתיהן מפרידות בין לעשות לבין שישתמשו.
     *
     * **הקצב:** חייל בן שמונה־עשרה עונה למלמד מתחת ליציע, *"אתה לא יודע עוד מה עשית"*.
     * זו היצירה. בקיוסק ב-1999 הפינה מצטרפת, וברמת גן ב-2000 זה חוזר מאלף איש בצד השני
     * — שאף אחד מהם לא יודע ממי זה בא. **הבד:** לילה שלם על רצפת מחסן, ואז ארבעה אנשים
     * שלא היו שם פורשים אותו שתי שורות מתחתיך.
     *
     * `crowd_use_proof` נרשם **רק באצטדיון**, כי זו כל ההבחנה: יצירה היא דבר שאדם עושה,
     * ושימוש של קהל הוא דבר שקורה לה. מי שעשה ואיש לא לקח — עשה, ויש לו ראיה על זה.
     */
    waitingHe: null,
  },
  {
    id: 'ACH_BALANCE',
    titleHe: 'לא נשאר חייב',
    proofKinds: ['debt_settled'],
    earned: (state) => {
      const ids = new Set(proofsOf(state, 'debt_settled').map((proof) => proof.proofId))
      return ids.size >= 2 && chaptersWith(state, 'debt_settled').size >= 2 && state.debt === 0
    },
    reward: {
      kind: 'object',
      titleHe: 'עמוד עסק ראשון מסודר',
      noteHe: 'דף עם שתי שורות פרעון ותאריכים אמיתיים. לא תעודה — פנקס.',
    },
    /**
     * `state.debt` הפסיק להיות שדה מת ב-20.9.2026, והדרך שזה נעשה היא העניין.
     *
     * ארבעה חובות נלקחים עכשיו **בכסף** ולא רק בדגל: מה שהתור השלים בדלת האוטובוס (1993),
     * ההפרש ששחור השלים לנסיעה צפונה (1993), המונית ששער 5 אסף עליה (1996), וחצי הדלק
     * שלירון שילם כששתקת בתחנה (1996). כל אחד מהם רושם `debt.changed` בסכום שהוא באמת
     * עלה, ולכן `debt` הוא מספר שאפשר להחזיר לאפס ולא קישוט.
     *
     * הפרעונות קיימים כבר: שלושה בפינה של אוסישקין ב-1999 ואחד באוטו של לירון בגמר הגביע
     * של אותה שנה. **שני פרקים שונים** — וזה מה שהתנאי מבקש, כי שני פרעונות באותו ערב הם
     * ערב אחד ולא הרגל. שלושתם נשארים בחירה ולא תנאי: חוב של יציע נפרע כי מי שחייב רוצה.
     */
    waitingHe: null,
  },
  {
    id: 'ACH_FIRST_AWAY',
    titleHe: 'מצאנו את הדרך',
    proofKinds: ['travel_proof'],
    /**
     * הנסיעה צפונה ב-B4. `went:galil-bus` הוא הכרטיס שנקנה באמת (תשעים שקל, או הכובע
     * שעבר ביציע), ו-`life:galil:there` הוא ההגעה לאולם. שניהם ביחד הם בדיוק מה שהשורה
     * במפרט מבקשת: נסיעה ראשונה מחוץ לעיר, והקבוצה הגיעה.
     */
    earned: (state) => hasProof(state, 'travel_proof') || (flagOn(state, 'went:galil-bus') && flagOn(state, 'life:galil:there')),
    reward: {
      kind: 'object',
      titleHe: 'עמוד מסע עם כרטיסים שנרכשו באמת',
      noteHe: 'הכרטיס הקרוע עם חותמת של מקום שלא היית בו קודם, על עמוד שרק נסיעות שקרו נכנסות אליו.',
    },
    waitingHe: null,
  },
  {
    id: 'ACH_TEN_AWAY',
    titleHe: 'עשר שנים, חיים אחרים',
    proofKinds: ['hiatus_chosen', 'bridge_scene'],
    earned: (state) => {
      const bridges = new Set(proofsOf(state, 'bridge_scene').map((proof) => proof.proofId))
      return hasProof(state, 'hiatus_chosen') && bridges.size >= 4 && !hasProof(state, 'returned_to_regular')
    },
    reward: {
      kind: 'access',
      titleHe: 'פרק אלבום החיים האחרים',
      noteHe: 'פרק שלם באלבום שאין לו כניסה אחרת — עשר שנים שלא היו בהן משחקים, וארבע סצנות שכן.',
    },
    waitingHe: 'המשחק נגמר בשנת 2000. קשת ההתרחקות בת עשר השנים שייכת לפרק שעוד לא נכתב.',
  },
  {
    id: 'ACH_RETURN',
    titleHe: 'המקום החדש שלי',
    proofKinds: ['hiatus_chosen', 'return_service', 'new_role_accepted'],
    earned: (state) =>
      hasProof(state, 'hiatus_chosen') && hasProof(state, 'return_service') && hasProof(state, 'new_role_accepted'),
    reward: {
      kind: 'access',
      titleHe: 'סצנת היכרות מחודשת עם התפקיד',
      noteHe: 'החדר שהתפקיד פותח, ואנשים שצריך להכיר מחדש כי הם לא היו שם כשהלכת.',
    },
    waitingHe: 'המשחק נגמר בשנת 2000. החזרה אחרי ההתרחקות שייכת לפרק שעוד לא נכתב.',
  },
  {
    id: 'ACH_KEEP_ITEM',
    titleHe: 'עבר איתי בית',
    proofKinds: [],
    earned: (state) => keptAcrossEras(state),
    reward: {
      kind: 'object',
      titleHe: 'תצוגה לחפץ עם שלושת ההקשרים',
      noteHe: 'החפץ מוצג עם שלוש השורות של שלוש התקופות שהוא עבר בהן — לא עם גיל, עם מקומות.',
    },
    waitingHe: null,
  },
  {
    id: 'ACH_SHOW',
    titleHe: 'אלה החיים שלי',
    proofKinds: [],
    earned: (state) => showPublished(state),
    reward: {
      kind: 'access',
      titleHe: 'מדף אישי וכרטיס תצוגה לייצוא מרצון',
      noteHe: 'המדף נפתח בחדר, והכרטיס הוא בחירה ולא תנאי: אין פרס על שיתוף ואין תוכן שנעול מאחוריו.',
    },
    waitingHe: null,
  },
  {
    id: 'ACH_LEAD',
    titleHe: 'מי שמחזיק את היציע',
    proofKinds: ['leadership_proof'],
    earned: (state) => apexAccepted(state, ROUTE_IDS.ultras),
    reward: {
      kind: 'access',
      titleHe: 'סצנת המנהיגות וקרדיט באלבום',
      noteHe: 'ישיבת הצוות לפני משחק, והחדר שמכינים בו את מה שהיציע יראה.',
    },
    waitingHe: null,
    // 21.9.2026 — קיר הגיל נפל, ולא מפני שמישהו הוריד סף.
    //
    // `2002-europe` ו-`2006-home` נבנו, כלומר הפרק האחרון הוא 2006 והתקרה היא **28**.
    // כל פסגה שננעלה ב-25 נעשתה בת-השגה באותו רגע, בלי שנגענו בשורה אחת ב-`routes.ts`
    // — וזו בדיוק ההבטחה שהשורה הקודמת כאן נתנה: *"פרק שאחרי 2000 יזיז אותו בלי לגעת
    // בשורה"*. `stageOutOfReachFor` קורא את רשימת הפרקים, ולכן הוא עשה את זה לבד.
    //
    // `waitingHe` הוא "למה אי-אפשר", ולכן `null` הוא התשובה הנכונה עכשיו. מה שנשאר
    // הוא הספים עצמם — ראיות, פרקים ומוניטין — והם נאמרים על כרטיס המסלול, שם מקומם.
  },
  {
    id: 'ACH_JOURNALIST',
    titleHe: 'הטור שלי',
    proofKinds: ['journalism_proof'],
    earned: (state) => apexAccepted(state, ROUTE_IDS.journalist),
    reward: {
      kind: 'visible',
      titleHe: 'טור אישי וראיון פרס אופציונלי',
      noteHe: 'טור קבוע שאנשים בסצנות קוראים. הראיון קצר, בתוך העולם, ואפשר לסרב לו.',
    },
    waitingHe: null,
  },
  {
    id: 'ACH_OWNER',
    titleHe: 'אחריות של בעלים',
    proofKinds: ['ownership_contract'],
    earned: (state) => apexAccepted(state, ROUTE_IDS.owner) && hasProof(state, 'ownership_contract') && state.debt === 0,
    reward: {
      kind: 'access',
      titleHe: 'חדר עבודה וסצנת אחריות ציבורית',
      noteHe: 'שולחן עם מסמכים שאפשר לקרוא, וערב שבו צריך לעמוד מול אנשים ולהגיד מה קרה לכסף.',
    },
    /**
     * ...והחסם שנשאר הוא **אחד**, וזה לא זה שהיה כתוב כאן עד 21.9.2026.
     *
     * השורה נקבה בשני חסמים: הסף של "שותף בעלות" מול התקרה שהמשחק מגיע אליה, ועוד
     * חוזה שלא קיים. הראשון נפל כשנכתב `2009-up` — התקרה עברה את הסף — והשני נשאר.
     *
     * לכן השורה הזאת **אינה נוקבת יותר בחסם הראשון בשמו**, ו-`tests/life-ledger`
     * אוכף את זה מכנית: לדווח על חסם שכבר נפל הוא בדיוק השקר-למראית-עין שכרטיס
     * המסלול נבנה נגדו (כלל 71 — לדווח על חלון כעל משהו אחר).
     */
    waitingHe:
      'נשאר חסם אחד ואמיתי: אין חוזה בעלות בתוך העולם — `ownership_contract` לא נרשם באף ' +
      'סצנה, ולכן הפסגה אינה ניתנת לאישור גם אם כל השאר במקום. ענף הבעלות בתסריט הוא ' +
      'קיץ 2025 (O01–O05), והוא היסטוריה חלופית מוצהרת — כלומר גם כשייכתב, הוא לא יטען דבר ' +
      'על מה שקרה במועדון באמת.',
  },
  {
    id: 'ACH_ARTIST',
    titleHe: 'יצירה שנשארה',
    proofKinds: ['creation_proof'],
    earned: (state) => apexAccepted(state, ROUTE_IDS.creator) && hasProof(state, 'creation_proof'),
    reward: {
      kind: 'visible',
      titleHe: 'תערוכה או מופע אישי בתחום המוכח',
      noteHe: 'ערב אחד שבו מה שהוא עשה נמצא על קיר או על במה, ואנשים באים בשבילו ולא בשביל המשחק.',
    },
    waitingHe: null,
  },
  {
    id: 'ACH_FOUNDER',
    titleHe: 'הייתי חלק מההקמה',
    proofKinds: ['founder_contribution'],
    earned: (state) => {
      const ids = new Set(proofsOf(state, 'founder_contribution').map((proof) => proof.proofId))
      return apexAccepted(state, ROUTE_IDS.founder) && ids.size >= 3
    },
    reward: {
      kind: 'object',
      titleHe: 'מזכרת וקרדיט כחלק מקבוצת המייסדים',
      noteHe: 'השם ברשימה שנוצרה — ואם לא היית שם, הרשימה נשארת כמו שהיא ואף אחד לא מוסיף אותך בדיעבד.',
    },
    waitingHe:
      'הגיל דווקא כן — "שותף בקבוצת המייסדים" נפתח ב-18. מה שעוצר הוא חלון: `FOUNDING_YEAR = 2007`, ' +
      'אחרי הפרק האחרון שנבנה. וכשייכתב, הוא חייב להיכתב כשלושה פרקים, כי הפסגה מבקשת שלוש ' +
      'הוכחות בפרקים שונים — שנה שהיא פרק אחד הופכת אותה לבלתי-אפשרית במבנה.',
  },
  {
    id: 'ACH_ROADS',
    titleHe: 'האדם של הדרך',
    proofKinds: ['travel_proof'],
    earned: (state) => apexAccepted(state, ROUTE_IDS.traveller),
    reward: {
      kind: 'access',
      titleHe: 'מפת מסעות אישית ומשימת חניכה',
      noteHe: 'מפה שרק נסיעות שקרו נצבעות בה, ומישהו צעיר שצריך שילמדו אותו איך מגיעים.',
    },
    waitingHe: null,
  },
  {
    id: 'ACH_FIRST_ERA',
    titleHe: 'בן עשרים ושתיים',
    proofKinds: [],
    /**
     * B11B הושלם באחד מענפיו התקינים — the chapter id is read off the registry by its
     * `unit`, so renaming a chapter moves this with it and typing a year here is never
     * necessary (rule 45).
     */
    earned: (state) => B11B !== null && state.chapter === B11B.id && state.chapterDone,
    reward: {
      kind: 'object',
      titleHe: 'צילום מצב לשמירה ולהשוואה',
      noteHe: 'תמונת מצב של מי שהוא בסוף התקופה, נשמרת כדי שאפשר יהיה להשוות אליה — לעצמו, לא לאחרים.',
    },
    waitingHe: null,
  },
  {
    id: 'ACH_KOBI',
    titleHe: 'עכשיו אני לוקח אותך',
    proofKinds: ['final_trip_agreed'],
    earned: (state) => hasProof(state, 'final_trip_agreed') && reversalComplete(state),
    reward: {
      kind: 'personal',
      titleHe: 'סצנת הסיום, ועמוד 1983 מול 2026',
      noteHe: 'שני הצדדים של אותו מעשה על עמוד אחד: מי החזיק את הכרטיסים אז, ומי מחזיק אותם עכשיו.',
    },
    waitingHe:
      'הפרק הסוגר לא נכתב — `chapters.ts` נגמר ב-B11B עם `next: null`, ו-`own:tickets-2026` ' +
      'אינו נכתב על-ידי אף סצנה (`lib/life/tickets.ts` אומר את זה בעצמו).',
  },
  /**
   * ---------------------------------------------------------------------------------
   * ששת ההישגים של תסריט ההמשך (21.9.2026) — **ולמה הם נכתבים לפני הפרקים שלהם.**
   *
   * `npm run life:screenplay-map` דיווח "שבעה הישגים חדשים" כמקטע בלי בית, ושבע היו
   * שש: `keys_in_hand` מופיע פעמיים ב-`O04`, בשתי בחירות שונות, וזה אותו הישג.
   *
   * כולם שייכים לפרקים שעדיין לא נבנו — הסיום של 2026, הראיון של מסלול העיתונאי,
   * וענף הבעלות של קיץ 2025 — ולכן כולם נושאים `waitingHe`. זו **הצורה שכלל 78
   * דורש**: מה שאי-אפשר להשיג נאמר בשמו ולא מוסתר, ו-`waiting()` מדפיס אותו. הם
   * נכתבים עכשיו ולא כשייבנו הפרקים, מאותה סיבה שדמות היא שורה לפני שהיא פנים
   * (כלל 58): כשהסצנה תיכתב, יהיה לה מול מה להיכתב.
   *
   * **ושלושת הראשונים הם שלושה סיומים של אותה סצנה, לא מדרג.** `F04` שואלת "עם מי
   * חוזרים", והתשובות הן אבא, ילד, או חבר באירופה. אין ביניהם טוב יותר — §26 של
   * הבריף, שוב — ולכן הם שלוש שורות ולא שורה אחת עם שלוש דרגות.
   */
  {
    id: 'ACH_FORTY_YEARS',
    titleHe: 'ארבעים שנה, מהצד הזה',
    proofKinds: [],
    earned: (state) => flagOn(state, 'own:ending:father_and_child'),
    reward: {
      kind: 'personal',
      titleHe: 'עמוד הסיום — 1986 מול 2026',
      noteHe: 'אותה יציאה, אותה יד, והפעם אתה זה שיודע לאן הולכים.',
    },
    waitingHe:
      'הפרק הסוגר (F00–F04, 2026) לא נכתב. `own:ending:father_and_child` אינו נכתב על-ידי ' +
      'אף סצנה, ו-`chapters.ts` נגמר היום ב-`2009-up`.',
  },
  {
    id: 'ACH_THREE_GENERATIONS',
    titleHe: 'שלושה דורות, מקום אחד',
    proofKinds: [],
    earned: (state) => flagOn(state, 'own:ending:three_generations'),
    reward: {
      kind: 'personal',
      titleHe: 'עמוד הסיום — מי שאמר "בואו"',
      noteHe: 'הילד שמצא מקום, ושני האנשים שהלכו אחריו.',
    },
    waitingHe:
      'הפרק הסוגר לא נכתב, ובנוסף הסיום הזה מבקש ילד — כלומר מסלול `PARENTHOOD` שהגיע ' +
      'לשלב, וסצנה שממנה הוא מדבר. שני חסמים, ושניהם אמיתיים.',
  },
  {
    id: 'ACH_REUNION_EUROPE',
    titleHe: 'מחר אני חוזר לחיים שלי',
    proofKinds: [],
    earned: (state) => flagOn(state, 'own:ending:reunion_in_europe'),
    reward: {
      kind: 'personal',
      titleHe: 'עמוד הסיום — המרחק, והטלפון',
      noteHe: '"תתקשר גם משם." ארבעים שנה, ושיחה אחת שממשיכה.',
    },
    waitingHe:
      'הפרק הסוגר לא נכתב, והסיום הזה שייך לענף `ABROAD` — חיים שנבנו במקום אחר, ' +
      'ושגם הם עוד לא נכתבו (X01–X05).',
  },
  {
    id: 'ACH_ASKED',
    titleHe: 'פעם אחת שואלים אותך',
    proofKinds: ['media_interview'],
    earned: (state) => hasProof(state, 'media_interview'),
    reward: {
      kind: 'access',
      titleHe: 'הקטע מהראיון, באלבום',
      noteHe: 'לא ציון ולא תואר — דקה וחצי שבה מישהו אחר מסביר מה עשית.',
    },
    waitingHe:
      'ענף `CAREER` (J01–J03) לא נכתב, ו-`media_interview` אינה ראיה שאף סצנה רושמת. ' +
      'התסריט קורא לזה `media.interview_completed`, והמיפוי לשם המנוע ייקבע כשהסצנה תיכתב.',
  },
  {
    id: 'ACH_NOT_AT_ANY_PRICE',
    titleHe: 'לא בכל מחיר',
    proofKinds: [],
    earned: (state) => flagOn(state, 'own:owner:withdrew'),
    reward: {
      kind: 'personal',
      titleHe: 'העמוד של מה שלא קנית',
      noteHe: '"זו החלטה עסקית. לא בושה." — ובכל זאת כואב, וזה כתוב.',
    },
    waitingHe:
      'ענף הבעלות (O01–O05, קיץ 2025) לא נכתב. הוא גם **היסטוריה חלופית מוצהרת** בתסריט ' +
      'עצמו, ולכן כשייכתב הוא לא יטען דבר על מה שקרה במועדון באמת (כלל 11).',
  },
  {
    id: 'ACH_KEYS',
    titleHe: 'המפתחות ביד',
    proofKinds: ['ownership_contract'],
    earned: (state) => hasProof(state, 'ownership_contract'),
    reward: {
      kind: 'access',
      titleHe: 'ענף הבעלות — הפרק החלופי',
      noteHe: 'ההיסטוריה שלא קרתה, מסומנת ככזאת בכל עמוד שלה.',
    },
    waitingHe:
      'אותו ענף, ואותה ראיה ש-`ACH_OWNER` ממתין לה: `ownership_contract` לא נרשם באף סצנה. ' +
      'שני ההישגים ממתינים לאותו דבר בדיוק, וזה בסדר — הם שתי שאלות שונות עליו.',
  },
]

export const ACHIEVEMENT_IDS: readonly string[] = ACHIEVEMENTS.map((row) => row.id)

export const achievementFor = (id: string): Achievement | null =>
  ACHIEVEMENTS.find((row) => row.id === id) ?? null

// ------------------------------------------------------------------ הרישום ------

/**
 * `own:ach:<ID>` — the record that this life earned it, and the reason it is a flag.
 *
 * An achievement is recognition of something that HAPPENED, so it may never un-happen:
 * a predicate that becomes false again (a debt taken out after `ACH_BALANCE`) must not
 * withdraw the recognition. A flag under `own:` survives `day.entered` and
 * `year.entered` for free, folds out of the existing log with no migration, and needs no
 * new field on `LifeState`. Its value is the year, so a card can say when.
 */
export const ACH_FLAG_PREFIX = 'own:ach:'
export const achievementFlag = (id: string) => `${ACH_FLAG_PREFIX}${id}`

export const isRecorded = (state: LifeState, id: string): boolean => flagOn(state, achievementFlag(id))

/** every achievement whose condition is TRUE of this life, whether or not it was recorded */
export function earnedIds(state: LifeState): string[] {
  return ACHIEVEMENTS.filter((row) => row.earned(state)).map((row) => row.id)
}

/** every achievement this life has already been told about */
export function recordedIds(state: LifeState): string[] {
  return ACHIEVEMENT_IDS.filter((id) => isRecorded(state, id))
}

/**
 * מה נהיה נכון עכשיו — the whole wiring surface, as a pure difference.
 *
 * Earning is an EVENT, not a poll: the card has to be shown at the second the thing
 * became true, and a life has to be replayable into the same order of cards. So whoever
 * owns the dispatch calls this with the state before and after and dispatches what comes
 * back — two lines — and this file never touches the engine.
 *
 * Anything already recorded is excluded, so a reducer that re-folds a whole log does not
 * announce a life's achievements a second time.
 */
export function earnedNow(before: LifeState, after: LifeState): Achievement[] {
  const was = new Set(earnedIds(before))
  return ACHIEVEMENTS.filter((row) => !was.has(row.id) && !isRecorded(after, row.id) && row.earned(after))
}

/**
 * The events `earnedNow` asks for.
 *
 * `events.ts` is not this agent's to edit, so this writes the record with `flag.set` —
 * an event type that is already there — and the feature works today. When the reducer
 * gains `{ t: 'achievement.earned'; id; chapter; year }` the body below becomes
 *
 *   return rows.map((row) => ({ t: 'achievement.earned', id: row.id, chapter: state.chapter, year: state.year }))
 *
 * and nothing else in the layer moves: the reducer writes the same `own:ach:<id>` flag,
 * so every predicate, every test and every save reads identically either way. That is a
 * narrowing of HOW it is written down, never of what.
 */
export function achievementEvents(rows: readonly Achievement[], state: LifeState): LifeEvent[] {
  // `achievement.earned` landed in `events.ts` on 16.9.2026, so this is the narrowing the
  // comment above predicted: one named event instead of a generic flag write. The reducer
  // still writes the same `own:ach:<id>` flag, so every predicate, save and test reads
  // identically — and a log now says in its own words what happened, which is what lets a
  // replay put the card back at the right second.
  return rows.map((row) => ({ t: 'achievement.earned', id: row.id, chapter: state.chapter, year: state.year }))
}

/** rows that nothing in the game as built can trigger, with the reason each one waits */
export function waiting(): Achievement[] {
  return ACHIEVEMENTS.filter((row) => row.waitingHe !== null)
}

/** rows a life played today can actually reach */
export function reachable(): Achievement[] {
  return ACHIEVEMENTS.filter((row) => row.waitingHe === null)
}

/** the prologue's chapter, for a screen that wants to say where a life begins */
export const FIRST_CHAPTER_ID = FIRST_CHAPTER?.id ?? null
