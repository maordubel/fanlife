import type { ActivityMechanic, ActivityResult, MechanicCatalog, MechanicWindow } from '../mechanics/types'
import { levelForAge } from '../mechanics/types'
import { chapterFor, playableChapters } from './content/chapters'
import { missionForActivity } from './content/performedMissions'
import { missionEvents } from './missions'
import { pickCrowd } from './crowd'
import type { LifeEvent } from './events'
import { gigFlagOf, workDoneFlag } from './workFlags'
import { WAGE, decadeOf, shekels } from './prices'
import { TOTO_PER_ANSWER } from './toto'
import type {
  LifeState,
  LocationId,
  PersonalityId,
  RedHeartId,
  RelationshipAxis,
  ReputationAudience,
  SkillId,
} from './types'

/**
 * פעילויות — the gate games, opened from inside the life (Maor, 21.9.2026).
 *
 * *"Gate = Mechanic. LIFE = Context."* A room, a person in it and a reason; the SAME game
 * the gate plays (`lib/mechanics/`, the gate's own server engine and board); and then back
 * in the same room, where the person says something about how it went and the wallet moves
 * by an amount that knows which decade it is in.
 *
 * This file is the context half, and it is the only place any of it is priced:
 *
 *  · **One unit, B.** `activityBase` is `WAGE` — an hour of a child's work in the chapter's
 *    decade (5 · 10 · 18 · 26 ₪). Every activity pays a RANGE of B, never a typed sum, so a
 *    café shift in 1993 and one in 2000 are the same afternoon in two currencies (rule 78:
 *    "מספר שמוקלד בסצנה הוא מספר שלא יודע באיזה עשור הוא").
 *  · **Two money slots a chapter, and nothing else.** `work:paid:<chapter>` is the one paid
 *    job (Maor, 6.9.2026) and wagers spend it too (rule 72). `favour:paid:<chapter>` is new:
 *    ONE paid favour for somebody in the street. After both are spent every activity still
 *    plays — the argument at the bus stop is still an argument — and pays nothing. That is
 *    the whole anti-grind rule, and it is two flags.
 *  · **Stage A does not move.** The 1984–86 chapters are the tested economy of the shirt
 *    (rules 68, 72, `tests/life-wallet.test.ts`): favours there pay no money and the Toto
 *    slip keeps its two shekels an answer. Owner's decision, 21.9.2026. (25.9.2026, owner:
 *    "לאפשר להרוויח יותר" — A4 grew in its own fiction, not here: Rafi's eight crates and a
 *    paid run upstairs written in `chapterStageA.ts` on the `favour:paid:a4-shirt` flag.
 *    No activity in Stage A pays a favour; the wallet test holds the new number.)
 *  · **Nothing here can take money away.** No stake, no fine, no price to enter. So no
 *    activity can put a boy below a ticket he could afford before it — the softlock the
 *    file asks about cannot get worse, and `tests/life-activities.test.ts` says so for
 *    every activity in every chapter.
 */

export type ActivityId =
  | 'kiosk-trivia'
  | 'cafe-shift'
  | 'shop-order'
  | 'busstop-memory'
  | 'pitch-rumble'
  | 'yard-lineup'
  | 'shachor-lesson'
  | 'ussishkin-help'
  | 'parliament'
  | 'ticket-poll'
  | 'bottles'
  | 'papers'
  | 'neighbour'
  | 'bedroom-bag'
  | 'lounge-xi'
  | 'kitchen-archive'
  // --- delta 91 — Performed Missions (`content/performedMissions.ts` says what each one MEANS)
  | 'hall-confetti'
  | 'banner-letters'
  | 'wall-stencil'
  | 'tifo-night'
  | 'fan-shirt'
  | 'friend-shirt'

export type Slot = 'work' | 'favour' | 'none'

/** how it went, as the person in the room will put it */
export type ActivityTier = 'high' | 'mid' | 'low' | 'away'

/** what an activity is played AS — a gate mechanic, a chore in the chore scene, or the paper round's own sheet */
export type ActivityKind = ActivityMechanic | 'chore' | 'route'

export type ActivityDef = {
  id: ActivityId
  kind: ActivityKind
  where: LocationId
  /** who asks — the name on the box and on the sheet */
  hostHe: string
  /** the sheet's title */
  titleHe: string
  /**
   * The `GIGS` row this activity IS, when it is work or a wager. There is one jobs table
   * (`gigs.ts`) and this points into it; an activity with a gig is refused at the door by
   * the gig's own conversation once the day's work is done.
   */
  gig?: string
  slot: Slot
  /** a range of B; null = this pays no money, in any year (the home) */
  pay: readonly [number, number] | null
  minutes: number
  energy: number
  /** first and last chapter, inclusive */
  from: string
  until?: string
  /** an archive row (a match, a goal, a shirt, a poll question) pays once per life */
  perContent?: boolean
  /** the slot was already claimed when the player agreed (the Toto slip's handshake) */
  claimsAtHandshake?: boolean
  /** the ordinary afternoon, when the archive holds nothing for this year */
  fallback?: string
  /** what the room says when there is nothing to deal and no afternoon to fall back on */
  emptyHe?: string
  /** once a chapter, on completion — the value that is not money */
  rel?: { who: string; axis: RelationshipAxis; delta: number }
  skill?: { skill: SkillId; delta: number }
  redHeart?: { key: RedHeartId; delta: number }
  personality?: { key: PersonalityId; delta: number }
  /** an audience that WATCHED — so the claim is earned and heard in one breath */
  rep?: { audience: ReputationAudience; delta: number }
}

/** the last chapter a boy's odd jobs exist in — `CHILDHOOD_GIGS_END` in `gigs.ts` says why */
const CHILDHOOD_END = '2000-double'

export const ACTIVITIES: readonly ActivityDef[] = [
  {
    id: 'kiosk-trivia',
    kind: 'trivia',
    where: 'kiosk',
    hostHe: 'רפי מהקיוסק',
    // the ledger's word for this money since 5.9.2026 (`TOTO_WHY_HE`) — the log keeps reading the same
    titleHe: 'טוטו',
    gig: 'toto-slip',
    slot: 'work',
    pay: [0, 1],
    minutes: 20,
    // the slip never cost energy, and the 1984–86 economy does not move (owner, 21.9.2026)
    energy: 0,
    from: 'a4-shirt',
    until: CHILDHOOD_END,
    // the slip is settled like every activity now — flags on hand-in, not on the handshake (§22.7)
    rel: { who: 'rafi', axis: 'familiarity', delta: 2 },
  },
  {
    id: 'cafe-shift',
    kind: 'lineupQuiz',
    where: 'allenby',
    hostHe: 'המלצר',
    titleHe: 'משמרת בקפה',
    gig: 'sweep-allenby',
    slot: 'work',
    pay: [0.6, 1.4],
    minutes: 40,
    energy: 8,
    from: '1990',
    until: CHILDHOOD_END,
    perContent: true,
    fallback: 'chore:sweep-allenby',
    skill: { skill: 'knowledge', delta: 2 },
  },
  {
    id: 'shop-order',
    kind: 'shirtDesigner',
    where: 'allenby',
    hostHe: 'המוכר בחנות האוהדים',
    titleHe: 'הזמנה של לקוח',
    gig: 'order-shop',
    slot: 'work',
    pay: [0.5, 1.6],
    minutes: 45,
    energy: 6,
    from: '1990',
    until: CHILDHOOD_END,
    perContent: true,
    emptyHe: 'המוכר מגרד בראש: "אין לי היום הזמנה שאתה מכיר את העונה שלה."',
    skill: { skill: 'creativity', delta: 2 },
  },
  {
    id: 'busstop-memory',
    kind: 'memoryChallenge',
    where: 'route',
    hostHe: 'בארי',
    titleHe: 'בתחנה עם בארי',
    slot: 'favour',
    pay: [0.4, 1.3],
    minutes: 25,
    energy: 4,
    from: '1986',
    until: CHILDHOOD_END,
    emptyHe: 'בארי מנפנף ביד: "היום אני לא זוכר כלום. תבוא מחר."',
    rel: { who: 'barry', axis: 'sharedHistory', delta: 3 },
    redHeart: { key: 'historyMemory', delta: 2 },
  },
  {
    id: 'pitch-rumble',
    kind: 'royalRumble',
    where: 'pitch',
    hostHe: 'החבר׳ה במגרש',
    titleHe: 'רויאל ראמבל על ארטיק',
    gig: 'rumble-pitch',
    slot: 'work',
    pay: [1.5, 2],
    minutes: 30,
    energy: 6,
    from: '1990',
    // the gig row's own last chapter — the pitch's door (rule 78), not the end of childhood
    until: '1999-cup',
    emptyHe: 'אין מספיק קלפים היום. "מחר," אומר אופיר.',
  },
  {
    id: 'yard-lineup',
    kind: 'lineupQuiz',
    where: 'schoolyard',
    hostHe: 'החבר׳ה בחצר',
    titleHe: 'התערבות בחצר',
    gig: 'lineup-yard',
    slot: 'work',
    pay: [0.2, 1],
    minutes: 15,
    energy: 3,
    from: '1990',
    until: '1995-sinai',
    perContent: true,
    emptyHe: 'עמית מושך בכתפיים: "על מה נתערב? לא היה משחק שנינו זוכרים."',
  },
  {
    id: 'shachor-lesson',
    kind: 'hateHistory',
    where: 'ussishkin-outside',
    hostHe: 'שחור',
    titleHe: 'שיעור היסטוריה משחור',
    slot: 'favour',
    pay: [0.3, 0.6],
    minutes: 25,
    energy: 3,
    from: '1991',
    until: '1999-basket',
    emptyHe: 'שחור מקפל את הפנקס בחזרה: "עוד לא הגיע הזמן שלך לזה."',
    rel: { who: 'shachor', axis: 'trust', delta: 3 },
    skill: { skill: 'knowledge', delta: 3 },
    rep: { audience: 'ussishkin', delta: 2 },
  },
  {
    id: 'ussishkin-help',
    kind: 'chore',
    where: 'ussishkin-end',
    hostHe: 'שחור',
    titleHe: 'הכיסאות בקצה',
    gig: 'chairs-end',
    slot: 'work',
    pay: [0.7, 1.2],
    minutes: 35,
    energy: 16,
    from: '1991',
    until: CHILDHOOD_END,
    rel: { who: 'shachor', axis: 'bond', delta: 3 },
    rep: { audience: 'ussishkin', delta: 2 },
  },
  {
    id: 'parliament',
    kind: 'goalReconstruction',
    where: 'bloomfield-outside',
    hostHe: 'הפרלמנט ליד הגדר',
    titleHe: 'הוויכוח ליד הגדר',
    slot: 'favour',
    pay: [0.4, 1.5],
    minutes: 30,
    energy: 4,
    from: '1991',
    until: CHILDHOOD_END,
    perContent: true,
    emptyHe: 'הם מתווכחים על משהו שעוד לא ראית. אתה מקשיב, ולא יותר.',
    rep: { audience: 'gate7', delta: 2 },
    redHeart: { key: 'terraceCulture', delta: 2 },
  },
  {
    id: 'ticket-poll',
    kind: 'poll',
    where: 'ticket-office',
    hostHe: 'הקופאי',
    titleHe: 'שאלה אחת לסקר',
    slot: 'favour',
    pay: [0.2, 0.3],
    minutes: 10,
    energy: 1,
    from: '1990',
    until: '2009-up',
    perContent: true,
    emptyHe: 'הקופאי מנופף: "הסקר נגמר. ענית על הכול."',
    redHeart: { key: 'community', delta: 1 },
  },
  {
    id: 'bottles',
    kind: 'chore',
    where: 'bloomfield-outside',
    hostHe: 'אחרי השריקה',
    titleHe: 'בקבוקים אחרי המשחק',
    gig: 'bottles-ground',
    slot: 'work',
    pay: [0.4, 1],
    minutes: 30,
    energy: 10,
    from: '1990',
    until: CHILDHOOD_END,
  },
  {
    id: 'papers',
    kind: 'route',
    where: 'street',
    hostHe: 'הדוכן',
    titleHe: 'חלוקת עיתונים',
    gig: 'papers-round',
    slot: 'work',
    pay: [0.6, 1.2],
    minutes: 45,
    energy: 12,
    from: '1990',
    until: '1996-army',
    skill: { skill: 'organization', delta: 2 },
  },
  {
    id: 'neighbour',
    kind: 'chore',
    where: 'street',
    hostHe: 'השכנה מהקומה השלישית',
    titleHe: 'השקיות של השכנה',
    slot: 'favour',
    pay: [0.4, 0.8],
    minutes: 20,
    energy: 8,
    from: '1990',
    until: CHILDHOOD_END,
    personality: { key: 'empathy', delta: 3 },
  },
  {
    id: 'bedroom-bag',
    kind: 'myBag',
    where: 'bedroom',
    hostHe: 'החדר שלך',
    titleHe: 'התיק שלי',
    slot: 'none',
    pay: null,
    minutes: 0,
    energy: 0,
    from: '1986',
    until: '1999-cup',
  },
  {
    id: 'lounge-xi',
    kind: 'allTimeXI',
    where: 'home',
    hostHe: 'קובי',
    titleHe: 'הרכב כל הזמנים, עם אבא',
    emptyHe: 'קובי מקפל את העיתון בחזרה: "לא היום. אין לי ראש לשמות."',
    slot: 'none',
    pay: null,
    minutes: 30,
    energy: 2,
    from: '1986',
    until: CHILDHOOD_END,
    rel: { who: 'kobi', axis: 'sharedHistory', delta: 3 },
    redHeart: { key: 'familyTradition', delta: 2 },
  },
  {
    id: 'kitchen-archive',
    kind: 'archive',
    where: 'kitchen',
    hostHe: 'העיתונים הישנים',
    titleHe: 'הערימה על השיש',
    emptyHe: 'הערימה דקה מדי היום. שום דבר בה שלא קראת.',
    slot: 'none',
    pay: null,
    minutes: 20,
    energy: 1,
    from: '1990',
    until: CHILDHOOD_END,
    redHeart: { key: 'historyMemory', delta: 2 },
  },
  /**
   * סדנת האוהדים (delta 91) — six rows, one mechanic. The bench is `supporterCraft`; WHICH
   * job is on it comes from the mission the activity plays as in this chapter
   * (`missionForActivity` → the recipe id rides in `MechanicRequest.contentId`). A favour
   * here pays nothing: nobody hands a boy money for painting letters. The skill the doing
   * teaches is on the mission; what the room says afterwards is `act-<id>-after`.
   */
  {
    id: 'hall-confetti',
    kind: 'supporterCraft',
    where: 'ussishkin-outside',
    hostHe: 'אפי',
    titleHe: 'לחתוך קונפטי',
    slot: 'favour',
    pay: null,
    minutes: 20,
    energy: 4,
    from: '1991',
    until: '1993-galil',
    emptyHe: 'אפי מסתכל על הערימה: "נגמרו העיתונים. מחר יביאו עוד."',
  },
  {
    id: 'banner-letters',
    kind: 'supporterCraft',
    where: 'gate5',
    hostHe: 'אסף',
    titleHe: 'לעזור עם השלט',
    slot: 'favour',
    pay: null,
    minutes: 25,
    energy: 6,
    from: '1998-laces',
    until: '1999-basket',
    emptyHe: 'אסף מנער פח ריק: "הצבע לא הגיע. תחזור כשיהיה."',
    rel: { who: 'asaf', axis: 'trust', delta: 3 },
  },
  {
    id: 'wall-stencil',
    kind: 'supporterCraft',
    where: 'street',
    hostHe: 'אופיר',
    titleHe: 'להכין סטנסיל',
    slot: 'favour',
    pay: null,
    minutes: 30,
    energy: 6,
    from: '1998-laces',
    until: '2000-double',
    emptyHe: 'אופיר מגלגל את הקרטון בחזרה: "לא היום. יש מישהו על הקיר."',
    rel: { who: 'ofir', axis: 'sharedHistory', delta: 2 },
  },
  {
    id: 'tifo-night',
    kind: 'supporterCraft',
    where: 'gate5',
    hostHe: 'ארז',
    titleHe: 'ערב תפאורה',
    slot: 'favour',
    pay: null,
    minutes: 60,
    energy: 14,
    from: '2001-terrace',
    until: '2012-terrace',
    emptyHe: 'ארז מסתכל על השעון: "הבד עוד לא כאן. בלי בד אין ערב."',
    rel: { who: 'crowd-erez', axis: 'trust', delta: 4 },
  },
  {
    id: 'fan-shirt',
    kind: 'supporterCraft',
    where: 'bedroom',
    hostHe: 'החדר שלך',
    titleHe: 'חולצה משלי',
    slot: 'none',
    pay: null,
    minutes: 30,
    energy: 4,
    from: '1990',
    until: '1995-sinai',
    emptyHe: 'הטוש יבש. בפעם הבאה, עם טוש חדש.',
    redHeart: { key: 'footballLove', delta: 1 },
  },
  {
    id: 'friend-shirt',
    kind: 'supporterCraft',
    where: 'street',
    hostHe: 'אופיר',
    titleHe: 'תכין גם לי',
    slot: 'favour',
    pay: null,
    minutes: 35,
    energy: 5,
    from: '1993-cup',
    until: '1999-cup',
    emptyHe: 'אופיר מושך בכתפיים: "שכחתי את החולצה בבית. מחר."',
    rel: { who: 'ofir', axis: 'bond', delta: 3 },
  },
]

export const ACTIVITY: Record<ActivityId, ActivityDef> = Object.fromEntries(
  ACTIVITIES.map((row) => [row.id, row]),
) as Record<ActivityId, ActivityDef>

export function isActivityId(value: unknown): value is ActivityId {
  return typeof value === 'string' && value in ACTIVITY
}

/* ------------------------------------------------------------------ when, and where */

const ORDER = (): readonly string[] => playableChapters().map((chapter) => chapter.id)

/** every chapter the activity exists in, in order */
export function activityChapters(def: ActivityDef): string[] {
  const order = ORDER()
  const from = order.indexOf(def.from)
  const until = order.indexOf(def.until ?? order[order.length - 1] ?? def.from)
  if (from < 0 || until < 0) return []
  return order.slice(from, until + 1)
}

export function activityIn(def: ActivityDef, chapter: string): boolean {
  return activityChapters(def).includes(chapter)
}

/** the activity a gig row plays as in this chapter, if any — the gig stays the gig before it */
export function activityForGig(gigId: string, chapter: string): ActivityDef | null {
  const def = ACTIVITIES.find((row) => row.gig === gigId || (gigId === 'shopping-neighbour' && row.id === 'neighbour'))
  return def && activityIn(def, chapter) ? def : null
}

/** the year a chapter is set in — the edge every window is cut at */
export function chapterYear(chapter: string, fallback = 1986): number {
  return chapterFor(chapter)?.year ?? fallback
}

/** the tested 1984–86 economy, which none of this may move */
export function isStageA(chapter: string): boolean {
  return chapter === '1986' || chapter === 'prologue' || /^a\d/.test(chapter)
}

/* ------------------------------------------------------------------ flags */

export const doneFlag = (id: ActivityId) => `act:${id}:done`
export const tierFlag = (id: ActivityId) => `act:${id}:tier`
export const eraFlag = (id: ActivityId) => `act:${id}:era`
export const favourFlag = (chapter: string) => `favour:paid:${chapter}`
/** the neighbour does not stand in the street every chapter — this says she does, this one */
export const NEIGHBOUR_OFFER = 'act:offer:neighbour'
/** the names of this chapter's parliament, `a|b|c` — `{crowd1}` in a line reads them */
export const CROWD_FLAG = 'act:crowd'
/** a reaction waiting for the room to be rebuilt (a chore returns through a scene restart) */
export const AFTER_FLAG = 'act:after'
/** the chapter's money era (`80s` / `90s` / `00s`), written when a room is built — Barry greets a boy and a man differently */
export const ERA_FLAG = 'act:era'
/** what the neighbour gave back this time — money, a plate, or a favour owed */
export const GIFT_FLAG = 'act:neighbour:gift'

/**
 * השיחות של כל פעילות, כל שם כתוב במלואו (כלל 71).
 *
 * The reactions are built from a template in `content/dialogueActivities.ts`, and a
 * template id is the exact thing `tests/life-keys.test.ts` and `life:orphans` cannot see.
 * This table is deliberately not clever: every id is spelled out, the `Record` types it
 * against the activity list, and `tests/life-activities.test.ts` checks that it and
 * `DIALOGUE` agree in both directions. `ask` is the conversation a room opens to offer the
 * activity (null where the offer is a `GIGS` row's own); `after` is what the room says
 * when it is over (null where there is nothing to say — the bag is a card, not a scene).
 */
export const ACTIVITY_CONVERSATIONS: Record<ActivityId, { ask: string | null; after: string | null }> = {
  'kiosk-trivia': { ask: null, after: 'act-kiosk-trivia-after' },
  'cafe-shift': { ask: null, after: 'act-cafe-shift-after' },
  'shop-order': { ask: null, after: 'act-shop-order-after' },
  'busstop-memory': { ask: 'act-busstop-memory', after: 'act-busstop-memory-after' },
  'pitch-rumble': { ask: null, after: 'act-pitch-rumble-after' },
  'yard-lineup': { ask: null, after: 'act-yard-lineup-after' },
  'shachor-lesson': { ask: 'act-shachor-lesson', after: 'act-shachor-lesson-after' },
  'ussishkin-help': { ask: null, after: 'act-ussishkin-help-after' },
  parliament: { ask: 'act-parliament', after: 'act-parliament-after' },
  'ticket-poll': { ask: 'act-ticket-poll', after: 'act-ticket-poll-after' },
  bottles: { ask: null, after: 'act-bottles-after' },
  papers: { ask: null, after: 'act-papers-after' },
  neighbour: { ask: 'act-neighbour', after: 'act-neighbour-after' },
  'bedroom-bag': { ask: 'act-bedroom-bag', after: null },
  'lounge-xi': { ask: 'act-lounge-xi', after: 'act-lounge-xi-after' },
  'kitchen-archive': { ask: 'act-kitchen-archive', after: 'act-kitchen-archive-after' },
  // delta 91 — the asks are the missions' PERSON + NEED + PLACE + TIME (`content/dialogueMissions.ts`)
  'hall-confetti': { ask: 'act-hall-confetti', after: 'act-hall-confetti-after' },
  'banner-letters': { ask: 'act-banner-letters', after: 'act-banner-letters-after' },
  'wall-stencil': { ask: 'act-wall-stencil', after: 'act-wall-stencil-after' },
  'tifo-night': { ask: 'act-tifo-night', after: 'act-tifo-night-after' },
  'fan-shirt': { ask: 'act-fan-shirt', after: 'act-fan-shirt-after' },
  'friend-shirt': { ask: 'act-friend-shirt', after: 'act-friend-shirt-after' },
}

/** the conversation a room plays when the player comes back from an activity — '' when there is none */
export const afterConversation = (id: ActivityId): string => ACTIVITY_CONVERSATIONS[id].after ?? ''

/* ------------------------------------------------------------------ money */

/** B — an hour of a child's work in this chapter's decade, whole shekels */
export function activityBase(chapter: string): number {
  return WAGE[decadeOf(chapter)]
}

/** whole shekels for a share `s` (0..1) of an activity's range, in this chapter's money */
export function payShekels(def: ActivityDef, chapter: string, share: number): number {
  if (!def.pay) return 0
  const s = Math.max(0, Math.min(1, Number.isFinite(share) ? share : 0))
  // the Toto slip in Stage A is Maor's two shekels a right answer, and stays that (owner, 21.9.2026)
  if (def.id === 'kiosk-trivia' && isStageA(chapter)) return Math.round(s * 5) * TOTO_PER_ANSWER
  const [min, max] = def.pay
  const raw = activityBase(chapter) * (min + (max - min) * s)
  if (raw <= 0) return 0
  return Math.max(1, Math.round(raw))
}

/** the most a chapter's activities can pay, in agorot — what `life:budget` adds to its ceiling */
export function activityCeiling(chapter: string): number {
  if (isStageA(chapter)) {
    // the only activity money in Stage A is the Toto slip, which was already there
    const toto = ACTIVITY['kiosk-trivia']
    return activityIn(toto, chapter) ? shekels(payShekels(toto, chapter, 1)) : 0
  }
  const best = (slot: Slot) =>
    Math.max(0, ...ACTIVITIES.filter((def) => def.slot === slot && activityIn(def, chapter)).map((def) => payShekels(def, chapter, 1)))
  return shekels(best('work') + best('favour'))
}

export function seen(state: LifeState, id: ActivityId, contentId: string | null | undefined): boolean {
  if (!contentId) return false
  return state.activities[id]?.seen.includes(contentId) ?? false
}

/** what this result pays, in agorot — zero once the slot is spent, in Stage A for a favour, or for a row already paid */
export function paidFor(state: LifeState, def: ActivityDef, result: ActivityResult): number {
  if (!def.pay || !result.completed) return 0
  if (result.won === false) return 0
  const chapter = state.chapter
  if (def.slot === 'favour' && (isStageA(chapter) || state.flags[favourFlag(chapter)])) return 0
  if (def.slot === 'work' && !def.claimsAtHandshake && state.flags[workDoneFlag(chapter)]) return 0
  if (def.perContent && seen(state, def.id, result.contentId)) return 0
  return shekels(payShekels(def, chapter, result.pay ?? result.score))
}

export function tierOf(result: ActivityResult): ActivityTier {
  if (!result.completed) return 'away'
  if (result.score >= 0.75) return 'high'
  if (result.score >= 0.4) return 'mid'
  return 'low'
}

/** the three money eras a reaction can tell apart */
export function eraOf(chapter: string): '80s' | '90s' | '00s' {
  const year = chapterYear(chapter)
  return year >= 2000 ? '00s' : year >= 1990 ? '90s' : '80s'
}

/* ------------------------------------------------------------------ settling */

export type Settlement = { events: LifeEvent[]; tier: ActivityTier; paid: number }

/**
 * מה קרה, ביומן — the whole consequence of one activity, as events. Pure: the shell and the
 * chore scene dispatch what this returns, and a test can fold it.
 */
export function settleActivity(state: LifeState, id: ActivityId, result: ActivityResult): Settlement {
  const def = ACTIVITY[id]
  const chapter = state.chapter
  const tier = tierOf(result)
  const gift = id === 'neighbour' ? giftOf(state) : null
  // the neighbour does not always pay: a plate or a favour owed is a real answer too
  const paid = gift && gift !== 'money' ? 0 : paidFor(state, def, result)
  const first = !state.flags[doneFlag(id)]
  const events: LifeEvent[] = []

  // the afternoon: what it cost is what it cost, whether it went well — a third of it for walking away
  const minutes = result.completed ? def.minutes : Math.round(def.minutes / 3)
  if (minutes > 0) events.push({ t: 'clock.advanced', minutes })
  if (result.completed && def.energy > 0) events.push({ t: 'energy.changed', delta: -def.energy })

  if (paid > 0) events.push({ t: 'money.changed', agorot: paid, why: def.titleHe })

  if (result.completed) {
    // the one jobs table's own flags: done today, and the chapter's paid work taken
    if (def.gig && !def.claimsAtHandshake) {
      events.push({ t: 'flag.raised', flag: gigFlagOf(def.gig) })
      if (def.slot === 'work') events.push({ t: 'flag.raised', flag: workDoneFlag(chapter) })
    }
    if (def.slot === 'favour' && paid > 0) events.push({ t: 'flag.raised', flag: favourFlag(chapter) })

    if (first) {
      if (def.rel) events.push({ t: 'relationship.changed', who: def.rel.who, axis: def.rel.axis, delta: def.rel.delta })
      if (def.skill) events.push({ t: 'skill.changed', skill: def.skill.skill, delta: def.skill.delta, why: def.titleHe })
      if (def.redHeart) events.push({ t: 'redheart.changed', key: def.redHeart.key, delta: def.redHeart.delta })
      if (def.personality) events.push({ t: 'personality.shifted', key: def.personality.key, delta: def.personality.delta })
      if (def.rep) {
        // the audience is standing right there — earned and heard in the same breath
        const proofId = `act:${id}:${chapter}`
        events.push(
          { t: 'reputation.earned', proofId, audience: def.rep.audience, delta: def.rep.delta, why: def.titleHe },
          { t: 'reputation.heard', proofId },
        )
      }
    }
    events.push({ t: 'flag.raised', flag: doneFlag(id) })
  }

  if (gift && result.completed) {
    // money in the Stage A tin rules, or a spent favour, still reads as money — and pays nothing
    const said = gift === 'money' && paid === 0 ? 'owe' : gift
    events.push({ t: 'flag.set', flag: GIFT_FLAG, value: said })
    if (said === 'food') events.push({ t: 'energy.changed', delta: 15 })
    if (said === 'owe') events.push({ t: 'flag.raised', flag: 'owe:neighbour' })
  }

  /**
   * המשימה שהפעילות היא (delta 91, MASTER §22): base effects → mission → proof → output →
   * callback flags, in ONE settlement. `missionEvents` is idempotent on `mission:<id>:done`,
   * so a board that answers twice or a log folded twice leaves one mission, one output, one
   * claim. Walking away (`completed: false`) reaches none of it.
   */
  if (result.completed) events.push(...missionEvents(state, id, result, tier))

  events.push(
    { t: 'flag.set', flag: tierFlag(id), value: tier },
    { t: 'flag.set', flag: eraFlag(id), value: eraOf(chapter) },
    {
      t: 'activity.completed',
      id,
      mechanic: def.kind,
      chapter,
      contentId: result.contentId ?? null,
      answer: result.answer ?? null,
      score: Math.round(Math.max(0, Math.min(1, result.score)) * 100),
      tier,
      paid,
    },
  )
  return { events, tier, paid }
}

/**
 * פעם אחת בדיוק (§22.7, §24.2) — has this request already been settled?
 *
 * A request carries the `runs` it was dealt at, and settling one always writes
 * `activity.completed`, which moves `runs` on by one. So a second `onDone` (a board that
 * answers twice, ✕ pressed while the verdict is landing, a remount) finds `runs` already
 * past the request and settles nothing: the time, the energy and the pay land once.
 */
export function alreadySettled(state: LifeState, request: { activity: ActivityId; runs: number }): boolean {
  return (state.activities[request.activity]?.runs ?? 0) !== request.runs
}

/** money, a plate or a favour — off the seed, the same answer every time this chapter is played */
export function giftOf(state: LifeState): 'money' | 'food' | 'owe' {
  const roll = hash(`${state.rng.seed}|${state.chapter}|neighbour-gift`) % 10
  return roll < 5 ? 'money' : roll < 8 ? 'food' : 'owe'
}

/* ------------------------------------------------------------------ what to deal */

/** a small, stable string hash — the same save and chapter always deal the same round */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** a positive int seed for this life, this chapter, this activity, this attempt */
export function seedFor(state: LifeState, id: ActivityId): number {
  const runs = state.activities[id]?.runs ?? 0
  return (hash(`${state.rng.seed}|${state.chapter}|${id}|${runs}`) % 2147483000) + 1
}

/** the window a deal is cut to: before this chapter's year, at this life's age */
export function windowFor(state: LifeState, def: ActivityDef): MechanicWindow {
  const year = chapterYear(state.chapter, state.year)
  const level = levelForAge(state.age)
  // the old fan remembers what came before the boy was born; later, what the boy lived through
  if (def.id === 'busstop-memory' && year < 1990) return { before: state.identity.birthYear, level }
  if (def.kind === 'hateHistory') return { before: year, level, sport: 'basketball' }
  return { before: year, level }
}

const PINNED: ReadonlySet<ActivityKind> = new Set(['lineupQuiz', 'goalReconstruction', 'shirtDesigner'])

export type ContentPick = { window: MechanicWindow; contentId: string | null }

/**
 * מה מחלקים הפעם — or null, and then the room offers the ordinary afternoon (`fallback`)
 * or says why not (`emptyHe`).
 *
 * A pinned mechanic (a lineup, a goal, a shirt) picks one archive row dated before the
 * chapter's year, preferring one this life has not been paid for. A pooled one asks only
 * whether the archive holds a full round before that year (`catalog.ready`). The poll takes
 * the next question this life has not answered.
 */
export function pickContent(state: LifeState, id: ActivityId, catalog: MechanicCatalog): ContentPick | null {
  const def = ACTIVITY[id]
  const window = windowFor(state, def)
  const kind = def.kind
  if (kind === 'supporterCraft') {
    // the workbench needs no archive row: the recipe comes from the mission, never from a deal
    // (`MechanicRequest.contentId` carries the recipe id — the bench's contract, delta 91)
    const mission = missionForActivity(id, state.chapter)
    if (!mission || mission.mechanic.kind !== 'supporterCraft') return null
    return { window, contentId: mission.mechanic.recipe }
  }
  if (kind === 'chore' || kind === 'route' || kind === 'myBag') {
    return { window, contentId: null }
  }
  if (kind === 'poll') {
    const answered = state.activities[id]?.seen ?? []
    const next = (catalog.items.poll ?? []).find((item) => !answered.includes(item.id))
    return next ? { window: { ...window, pin: next.id }, contentId: next.id } : null
  }
  if (PINNED.has(kind)) {
    const items = (catalog.items[kind as ActivityMechanic] ?? []).filter(
      (item) => item.year < window.before && (window.from === undefined || item.year >= window.from),
    )
    if (items.length === 0) return null
    const fresh = items.filter((item) => !seen(state, id, item.id))
    // an argument you already won pays nothing; with an ordinary afternoon to fall back on, take that instead
    const pool = fresh.length > 0 ? fresh : def.fallback ? [] : items
    if (pool.length === 0) return null
    const item = pool[seedFor(state, id) % pool.length] as { id: string }
    return { window: { ...window, pin: item.id }, contentId: item.id }
  }
  const ready = catalog.ready[kind as ActivityMechanic]
  if (ready === undefined || window.before < ready) return null
  return { window, contentId: null }
}

/**
 * What the room asks the shell to open — everything the sheet needs and nothing it could
 * learn an answer from. Carried on the bus as `mechanic`.
 */
export type MechanicRequest = {
  activity: ActivityId
  kind: ActivityKind
  chapter: string
  seed: number
  window: MechanicWindow
  contentId: string | null
  titleHe: string
  hostHe: string
  /** how many times this life has played it — the paper round learns its addresses */
  runs: number
  /** the parliament's names, when there is one */
  crowd: string[]
}

/* ------------------------------------------------------------------ the street, per chapter */

/** does the neighbour need a hand this chapter — about every other one, off the save's own seed */
export function neighbourAsks(chapter: string, seed: string): boolean {
  if (!activityIn(ACTIVITY.neighbour, chapter)) return false
  return hash(`${seed}|${chapter}|neighbour`) % 100 < 55
}

/** two to four of the chapter's crowd, off the seed — the same faces every time this chapter is played */
export function parliamentOf(state: LifeState, chapter: string): string[] {
  const seed = `${state.rng.seed}|${chapter}|parliament`
  const count = 2 + (hash(seed) % 3)
  const { people } = pickCrowd({ ...state, rng: { seed, cursor: 0 } }, chapter, count)
  return people.map((person) => person.displayNameHe)
}
