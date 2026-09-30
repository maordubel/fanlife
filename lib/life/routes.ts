import { CHAPTERS } from './content/chapters'
import type { LifeEvent } from './events'
import {
  flagOn,
  relationshipOf,
  type CharacterId,
  type LifeState,
  type PersonalityId,
  type ProofRecord,
  type ReputationAudience,
  type SkillId,
} from './types'

/**
 * שבעת המסלולים — מי אתה יכול להיות, ומי החליט על זה.
 *
 * This is the model behind the life spec's *"שבעת המסלולים — זכאות, מחירים, שינוי
 * כיוון"* (lines 478–580). It holds no words and draws nothing: `content/routes.ts` is
 * the fiction and `components/life/RouteCard.tsx` is the paper. What lives here is the
 * arithmetic, and four refusals that the arithmetic is shaped around. Each of the four
 * is a sentence the spec repeats, and each one is the thing this file would lose first
 * if somebody later "simplified" it.
 *
 * **1 · זכאות היא הזמנה, לא קידום.** *"הגעה לסף יוצרת הזמנה שניתן לדחות; אינה מבצעת
 * החלטה."* So `eligibleFor` answers what he now QUALIFIES for and changes nothing.
 * Accepting is `acceptEvents` — a separate, explicit act, taken in a scene, by a person
 * who could have said no. A system that promoted on a threshold would be a level-up
 * screen with Hebrew on it.
 *
 * **2 · שלב אחד בכל פעם.** *"אין קפיצה אוטומטית דרך שלוש כותרות באותו טוסט."* That is
 * not a UI note, so it is not left to the UI: `nextStage()` returns the first stage he
 * has not accepted and nothing after it, and a man who walks into a room meeting every
 * condition of all three is offered `entry` — then `practice` in the next scene, then
 * `apex`. There is no code path that hands over two titles in one breath.
 *
 * **3 · אין סף אופי.** *"אין סף אופי שמחליט מי רשאי לחיות חיים מסוימים. אומץ 20 יכול
 * להוביל למנהיגות דרך הכנה ושותף; אומץ 80 מציע פנייה ישירה."* Not one route reads a
 * disposition. A `RouteCapability` is one of the five skills — or `streetSmarts`, and
 * that single exception is explained where it is declared below, because it looks
 * exactly like the breach this rule exists to prevent and is not one.
 *
 * **4 · מוניטין הוא מה שקהל שמע.** A route's `audience` threshold reads
 * `reputation.standing`, which only a `reputation.heard` event can move. A night of work
 * nobody saw makes the capability climb and leaves the standing where it was, so a man
 * can be ready for a title that nobody has yet thought to offer him. That is the system
 * working, not a bug, and `content/routes.ts` has a mission whose whole point is it.
 *
 * ------------------------------------------------------------------------------------
 * **ושלוש תוספות מ-17.9.2026, ושלושתן נתונים ולא לוגיקה.**
 *
 * `ROUTE_TIERS` is the difficulty ORDER Maor stated, hardest first, in his own six lines —
 * and `CREATOR` is not in them, so it has no tier and the card says so. `ROUTE_COMBINATIONS`
 * is every unordered pair of the seven with an explicit relation, because *"יהיה מצבים
 * שיהיה ניתן להיות כמה מסלולים יחד"* is a lattice and this file previously held one pair of
 * it. `routeAtLeast` is the reading a `Condition` does, which is what finally lets the world
 * ask about any of this: seven routes and eighteen offers had been reachable and not
 * CONSULTABLE — a task could never appear because of a route and never be hidden by one.
 * None of the three moves a threshold, and none of them is read by `gapsFor` or
 * `eligibleFor`; the second is read by `acceptEvents` in exactly one direction, and only for
 * a relation no pair carries yet.
 *
 * ------------------------------------------------------------------------------------
 * **שם שמתנגש, ולמה הוא נשאר.** `lib/life/world/reach.ts` has a `routeFlag` and the
 * story layer has `ROUTES` — walking routes, waypoints, a child following Efi down a
 * street. A life route and a walking route are different concepts with the same English
 * word, and rule 59 is about one concept having one file, not about two concepts being
 * forbidden a shared noun. Everything exported here is prefixed `LIFE_`/`Route*` and
 * nothing here imports that module, so the only cost is a reader's double-take.
 */

// ---------------------------------------------------------------------------------
// מי אפשר להיות
// ---------------------------------------------------------------------------------

export type RouteId =
  | 'ULTRAS'
  | 'JOURNALIST'
  | 'OWNER'
  | 'CREATOR'
  | 'USSISHKIN_FOUNDER'
  | 'TRAVELLER'
  | 'DISTANCE_RETURN'

export type RouteStage = 'entry' | 'practice' | 'apex'

export const ROUTE_STAGES: readonly RouteStage[] = ['entry', 'practice', 'apex']

/**
 * יכולת — never a disposition, with one exception the spec itself declares.
 *
 * Five of the six are `SkillId`. The sixth is `streetSmarts`, and it is worth being
 * explicit about why naming it here is not the breach refusal 3 exists against.
 *
 * The spec's route table gives TRAVELLER the capability `street_smarts` (line 541), and
 * its own comparison of the book's model against this one settles what that column
 * means: *"11 תכונות | 10 תכונות ועוד street_smarts ככישור"* — ten traits, plus
 * street_smarts AS A SKILL (line 1267). Its entry in the metric list says the same
 * thing in the other direction: *"יכולת מעשית לפתור בעיות דרך, חפצים ואנשים"*, opening
 * value 0 like every skill and unlike every disposition, and it is the one metric the
 * spec exempts from the per-chapter cap that applies to character.
 *
 * In THIS engine it is stored in `PersonalityState`, for a reason that has nothing to do
 * with what it is: `trait: 'streetSmarts'` is older than `SkillState` and `TRAIT_ROUTE`
 * has been forwarding it to the personality block since the systems pass. Moving it to
 * `SkillState` is the right fix and it is a change to `lib/life/types.ts` — see the
 * patch request in the delivery note. Until then this file reads it where the reducer
 * keeps it and says so out loud, which is better than either lying about the storage or
 * inventing a different number for TRAVELLER than the spec wrote.
 *
 * `tests/life-routes.test.ts` holds the line that matters: this is the ONLY personality
 * key any route may name, and the other eleven are checked one by one.
 */
export const PERSONALITY_BACKED_CAPABILITY = 'streetSmarts' satisfies PersonalityId

export type RouteCapability = SkillId | typeof PERSONALITY_BACKED_CAPABILITY

/** the eleven axes that are DISPOSITION, and that no route is allowed to ask about */
export const DISPOSITIONS: readonly PersonalityId[] = [
  'independence',
  'courage',
  'responsibility',
  'reliability',
  'empathy',
  'curiosity',
  'impulsiveness',
  'stubbornness',
  'sociability',
  'riskTolerance',
  'honesty',
]

// ---------------------------------------------------------------------------------
// התנאים הנוספים של הפסגה — as data, so they can be CHECKED
// ---------------------------------------------------------------------------------

/**
 * מה שעוד צריך בפסגה, ולמה זה לא טקסט חופשי.
 *
 * The spec writes each apex as a sentence — *"שלושה שותפים: trust>=65 ; ללא חוב שהגיע
 * זמנו ולא הוסדר"*. A sentence in a `noteHe` would be a promise the engine cannot keep:
 * it renders, it reads well, and nothing ever evaluates it, which is precisely the
 * class of dead content rule 66 was written about. So every clause the engine can decide
 * is a field, and the one clause it cannot — the scene where a person says yes out loud
 * — is `explicitChoiceHe`, marked as the thing a human has to do rather than a number.
 */
export type ApexExtra = {
  /** a SECOND capability the apex also wants (JOURNALIST: knowledge ≥ 55) */
  alsoCapability?: { capability: RouteCapability; min: number }
  /** N named people standing at these axes — a crew, three sources, three partners */
  people?: { count: number; trustMin: number; bondMin?: number; labelHe: string }
  /** the proofs must cover at least this many distinct subjects (JOURNALIST: two topics) */
  distinctSubjects?: number
  /** *"ללא חוב שהגיע זמנו ולא הוסדר"* — OWNER, and only OWNER */
  noOverdueDebt?: boolean
  /** four original works with provenance (CREATOR) */
  works?: number
  /** three different commitments inside the founding window: people, operations, budget */
  foundingCommitments?: number
  /** four journeys, of which two at home and one abroad (TRAVELLER) */
  journeys?: { total: number; domestic: number; abroad: number }
  /** the part no counter decides: somebody accepts responsibility, in a scene, in words */
  explicitChoiceHe: string
}

export type StageDef = {
  stage: RouteStage
  /** גיל מינימום — the spec's own column, and the reason most apexes are out of reach today */
  minAge: number
  capability: RouteCapability
  capabilityMin: number
  audience: ReputationAudience
  audienceMin: number
  /** how many `PROOF_*` missions of this route's kind */
  proofs: number
  /** how many DIFFERENT chapters those proofs must span — a week of work is not a career */
  chapters: number
  /** evidence this stage needs by name, over and above the count (`verified_report`…) */
  needsProofKinds?: readonly string[]
  extra?: ApexExtra
}

export type RouteDef = {
  id: RouteId
  titleHe: string
  /** what the person is CALLED at each stage — a title somebody gave you, not a rank */
  stageTitlesHe: Readonly<Record<RouteStage, string>>
  audience: ReputationAudience
  capability: RouteCapability
  /** the `kind` its proof missions record — `leadership_proof`, `journalism_proof`… */
  proofKind: string
  stages: readonly StageDef[]
  /** פרסים, לפי סדר — what each stage actually hands over, in the spec's order */
  rewardsHe: readonly [string, string, string]
}

// ---------------------------------------------------------------------------------
// הטבלאות — every number copied from the spec's own tables (lines 484–546)
// ---------------------------------------------------------------------------------

export const LIFE_ROUTES: readonly RouteDef[] = [
  {
    id: 'ULTRAS',
    titleHe: 'מוביל יציע',
    stageTitlesHe: { entry: 'אחראי ציוד', practice: 'מוביל חבורה', apex: 'מנהיג יציע' },
    audience: 'gate5',
    capability: 'organization',
    proofKind: 'leadership_proof',
    rewardsHe: [
      'אחריות לציוד ולמפגש',
      'פינת הכנה אישית ושני אנשי צוות',
      'סצנת בחירה למנהיגות; הקהל משתמש ביצירה ובקריאה שלך',
    ],
    stages: [
      { stage: 'entry', minAge: 18, capability: 'organization', capabilityMin: 12, audience: 'gate5', audienceMin: 10, proofs: 0, chapters: 0 },
      { stage: 'practice', minAge: 18, capability: 'organization', capabilityMin: 30, audience: 'gate5', audienceMin: 25, proofs: 2, chapters: 2 },
      {
        stage: 'apex',
        minAge: 25,
        capability: 'organization',
        capabilityMin: 70,
        audience: 'gate5',
        audienceMin: 65,
        proofs: 4,
        chapters: 4,
        extra: {
          // *"לפחות 3 חברי צוות: trust>=55 ו־bond>=35"*
          people: { count: 3, trustMin: 55, bondMin: 35, labelHe: 'אנשי צוות' },
          explicitChoiceHe: 'בחירה מפורשת לקחת אחריות — המעמד אינו מוענק אוטומטית',
        },
      },
    ],
  },
  {
    id: 'JOURNALIST',
    titleHe: 'עיתונאי',
    stageTitlesHe: { entry: 'כותב', practice: 'כתב', apex: 'בעל מדור' },
    audience: 'public',
    capability: 'communication',
    proofKind: 'journalism_proof',
    rewardsHe: [
      'פרסום ראשון עם קרדיט',
      'גישה למשימת מערכת ולארכיון',
      'מדור אישי, וראיון חגיגי כפרס אופציונלי',
    ],
    stages: [
      {
        stage: 'entry',
        minAge: 18,
        capability: 'communication',
        capabilityMin: 12,
        audience: 'public',
        audienceMin: 8,
        proofs: 0,
        chapters: 0,
        // *"entry: verified_report וגם written_account"* — two named pieces of evidence,
        // not two more points. A boy who checked a rumour twice and wrote one thing down.
        needsProofKinds: ['verified_report', 'written_account'],
      },
      { stage: 'practice', minAge: 18, capability: 'communication', capabilityMin: 30, audience: 'public', audienceMin: 25, proofs: 2, chapters: 2 },
      {
        stage: 'apex',
        minAge: 25,
        capability: 'communication',
        capabilityMin: 70,
        audience: 'public',
        audienceMin: 60,
        proofs: 4,
        chapters: 4,
        extra: {
          alsoCapability: { capability: 'knowledge', min: 55 },
          // *"שלושה קשרי מקור: trust>=50"*
          people: { count: 3, trustMin: 50, labelHe: 'מקורות' },
          // *"הוכחות לפחות בשני נושאים שונים"* — the subject is on the proof record
          distinctSubjects: 2,
          explicitChoiceHe: 'כל מידע בהסכמה שהוגדרה בסצנה; תיקון לכל טענה שסומנה כלא נכונה, בלי למחוק כתבה',
        },
      },
    ],
  },
  {
    id: 'OWNER',
    titleHe: 'יוזם ובעלים',
    stageTitlesHe: { entry: 'אחראי משמרת', practice: 'שותף בעסק', apex: 'שותף בעלות' },
    audience: 'work',
    capability: 'business',
    proofKind: 'business_proof',
    rewardsHe: [
      'אחריות למשמרת ולתקציב',
      'עסק ושותפות עם חוזה',
      'תפקיד בעלות, חדר עבודה ותיק החלטות ציבורי',
    ],
    stages: [
      {
        stage: 'entry',
        minAge: 18,
        capability: 'business',
        capabilityMin: 12,
        audience: 'work',
        audienceMin: 8,
        proofs: 0,
        chapters: 0,
        // *"entry: balanced_budget וגם adult_shift"*
        needsProofKinds: ['balanced_budget', 'adult_shift'],
      },
      // The only route whose practice is not 18. The spec sets it at 21 and the ladder
      // below it is the reason: a man cannot hold a contract at eighteen in this fiction.
      { stage: 'practice', minAge: 21, capability: 'business', capabilityMin: 35, audience: 'work', audienceMin: 30, proofs: 2, chapters: 2 },
      {
        stage: 'apex',
        minAge: 30,
        capability: 'business',
        capabilityMin: 75,
        audience: 'work',
        audienceMin: 65,
        proofs: 4,
        chapters: 4,
        extra: {
          alsoCapability: { capability: 'organization', min: 55 },
          // *"שלושה שותפים: trust>=65"*
          people: { count: 3, trustMin: 65, labelHe: 'שותפים' },
          // *"ללא חוב שהגיע זמנו ולא הוסדר"* — see `hasOverdueDebt` for what that reads
          noOverdueDebt: true,
          explicitChoiceHe: 'תרחיש מימון תקין ומתועד, ושאלת ניגוד העניינים נענית',
        },
      },
    ],
  },
  {
    id: 'CREATOR',
    titleHe: 'יוצר',
    stageTitlesHe: { entry: 'מי שהכין משהו', practice: 'יוצר מוזמן', apex: 'יוצר מזוהה' },
    audience: 'public',
    capability: 'creativity',
    proofKind: 'creation_proof',
    rewardsHe: [
      'יצירה ראשונה מוצגת בחדר',
      'הזמנה לשיתוף פעולה',
      'יצירה בשימוש בתוך העולם; תערוכה או מופע אישי',
    ],
    stages: [
      {
        stage: 'entry',
        minAge: 18,
        capability: 'creativity',
        capabilityMin: 12,
        audience: 'public',
        audienceMin: 8,
        proofs: 0,
        chapters: 0,
        // *"entry: creative_work בתחום מוגדר"*
        needsProofKinds: ['creative_work'],
      },
      { stage: 'practice', minAge: 18, capability: 'creativity', capabilityMin: 30, audience: 'public', audienceMin: 25, proofs: 2, chapters: 2 },
      {
        stage: 'apex',
        minAge: 25,
        capability: 'creativity',
        capabilityMin: 70,
        audience: 'public',
        audienceMin: 60,
        proofs: 4,
        chapters: 4,
        extra: {
          alsoCapability: { capability: 'communication', min: 35 },
          // *"ארבע יצירות מקוריות עם provenance"* — counted off the evidence ledger
          works: 4,
          // *"לפחות שותף אחד: trust>=50"*
          people: { count: 1, trustMin: 50, labelHe: 'שותף ליצירה' },
          explicitChoiceHe: 'אישור היוצר לשימוש הציבורי ביצירה',
        },
      },
    ],
  },
  {
    id: 'USSISHKIN_FOUNDER',
    titleHe: 'שותף בקבוצת המייסדים',
    stageTitlesHe: { entry: 'מתנדב', practice: 'צוות הקמה', apex: 'שותף בקבוצת המייסדים' },
    audience: 'ussishkin',
    capability: 'organization',
    proofKind: 'founding_proof',
    rewardsHe: [
      'אחריות קהילתית ראשונה',
      'צוות משימה בהקמה',
      'מזכרת הקמה אישית, וקרדיט כחלק מקבוצת המייסדים',
    ],
    stages: [
      { stage: 'entry', minAge: 18, capability: 'organization', capabilityMin: 12, audience: 'ussishkin', audienceMin: 10, proofs: 0, chapters: 0 },
      { stage: 'practice', minAge: 18, capability: 'organization', capabilityMin: 30, audience: 'ussishkin', audienceMin: 25, proofs: 1, chapters: 1 },
      {
        stage: 'apex',
        minAge: 18,
        capability: 'organization',
        capabilityMin: 45,
        audience: 'ussishkin',
        audienceMin: 40,
        proofs: 3,
        chapters: 3,
        extra: {
          // *"שלוש התחייבויות שונות בתוך חלון ההקמה: אנשים, תפעול, תקציב"*
          foundingCommitments: 3,
          // *"לפחות שני עמיתים: trust>=50"*
          people: { count: 2, trustMin: 50, labelHe: 'עמיתים' },
          explicitChoiceHe: 'הסצנה מאשרת את התרומה בפועל, ובלי להחליף מייסדים היסטוריים',
        },
      },
    ],
  },
  {
    id: 'TRAVELLER',
    titleHe: 'איש דרכים',
    stageTitlesHe: { entry: 'מתכנן נסיעה', practice: 'ראש קבוצת נסיעה', apex: 'מארגן נסיעות מוכר' },
    audience: 'gate7',
    capability: PERSONALITY_BACKED_CAPABILITY,
    proofKind: 'travel_proof',
    rewardsHe: [
      'אחריות לתכנון נסיעה בארץ',
      'אלבום דרכים וקבוצת נסיעה',
      'מארגן נסיעות מוכר, וסצנת חוץ מותאמת',
    ],
    stages: [
      { stage: 'entry', minAge: 18, capability: PERSONALITY_BACKED_CAPABILITY, capabilityMin: 12, audience: 'gate7', audienceMin: 8, proofs: 0, chapters: 0 },
      { stage: 'practice', minAge: 18, capability: PERSONALITY_BACKED_CAPABILITY, capabilityMin: 30, audience: 'gate7', audienceMin: 25, proofs: 2, chapters: 2 },
      {
        stage: 'apex',
        minAge: 25,
        capability: PERSONALITY_BACKED_CAPABILITY,
        capabilityMin: 70,
        audience: 'gate7',
        audienceMin: 55,
        proofs: 4,
        chapters: 4,
        extra: {
          alsoCapability: { capability: 'organization', min: 45 },
          // *"ארבע נסיעות שהושלמו, לפחות שתיים בארץ ולפחות אחת בחו״ל"*
          journeys: { total: 4, domestic: 2, abroad: 1 },
          explicitChoiceHe: 'התקציב סגור, אין נוסע שהופקר בחוב לא מוסכם, וסיוע נגישות לשותף נסיעה אחד',
        },
      },
    ],
  },
]

export const routeById = (id: RouteId): RouteDef | null => LIFE_ROUTES.find((route) => route.id === id) ?? null

// ---------------------------------------------------------------------------------
// הדרגות — הסדר של מאור, מהקשה לקל (17.9.2026)
// ---------------------------------------------------------------------------------

/**
 * כל מזהה מסלול, פעם אחת, ובאופן שהקומפיילר סופר.
 *
 * `RouteId` is a union and a union is not a list, so every question of the form "for
 * every route…" has until now been asked of `LIFE_ROUTES`, which is six of the seven —
 * `DISTANCE_RETURN` is deliberately not in it (see its own block below). A `Record` keyed
 * on the union is the cheap way to get the seventh without giving it a `StageDef`: add a
 * member to `RouteId` and this object stops compiling until somebody places it.
 */
const EVERY_ROUTE: Record<RouteId, true> = {
  ULTRAS: true,
  JOURNALIST: true,
  OWNER: true,
  CREATOR: true,
  USSISHKIN_FOUNDER: true,
  TRAVELLER: true,
  DISTANCE_RETURN: true,
}

export const ROUTE_IDS = Object.keys(EVERY_ROUTE) as readonly RouteId[]

/**
 * הסולם של מאור — שש שורות, מהקשה לקל, במילים שלו (17.9.2026).
 *
 *   1  בעלי הקבוצה                                  → OWNER
 *   2  מייסד כדורסל                                 → USSISHKIN_FOUNDER
 *   3  מנהיג אוהדים                                 → ULTRAS
 *   4  עיתונאי · קשרים בינלאומיים · מעבר לגור בחו״ל  → JOURNALIST + TRAVELLER
 *   5  אוהד רגיל                                    → (אין מסלול)
 *   6  אוהד כורסא · אוהד שנעלם וחוזר                 → DISTANCE_RETURN
 *
 * **שלושה דברים שהטבלה הזאת עושה, ושלושתם סירובים.**
 *
 * **1 · `CREATOR` אינו ברשימה, ולכן אין לו דרגה.** It is still in the registry, it still
 * has its ladder and its apex, and `tierOf` answers `null` for it — which the card prints
 * out loud (`life.route.tier.unplaced`). A tier the owner did not give a route is a number
 * we made up, and a made-up number in a difficulty ordering is worse than a blank one:
 * blank asks a question, invented answers it wrongly and quietly.
 *
 * **2 · דרגה 5 היא היעדר מסלול, ולא סולם שביעי.** *"אוהד רגיל"* is the boy who took
 * nothing, and the engine already models him exactly: no `own:route:*` flag was ever
 * raised. So tier five carries an EMPTY `routes` array — no `RouteId` is invented for it,
 * no `StageDef` exists, nothing can be accepted and no flag can be raised. The row is
 * here so that Maor's six lines read as six lines in the source; `plainSupporter()` is the
 * runtime form of it, and it is a question about the absence of rows rather than about a
 * row. (The alternative — a seventh `RouteId` called `REGULAR` — would have to be
 * accepted, stored, offered and combined with the other six, which is a ladder for the one
 * rung whose whole content is that there is no ladder. That is the same mistake
 * `DISTANCE_RETURN` is kept out of `LIFE_ROUTES` to avoid, one floor down.)
 *
 * **3 · דרגה 4 מחזיקה שניים, ולא שני חצאים.** *"עיתונאי · קשרים בינלאומיים · מעבר לגור
 * בחו״ל"* is one line in Maor's list and two routes in this engine, so the row holds both
 * and neither is ranked above the other. Splitting it into 4a and 4b would be the same
 * invention as giving `CREATOR` a tier.
 *
 * The tier decides NOTHING at runtime: no threshold reads it, no offer is gated on it, and
 * `gapsFor` has never heard of it. It is the difficulty ordering the owner stated, carried
 * as data so a card and a delivery note can say the same thing, and so the day he places
 * `CREATOR` it is one row and no logic.
 */
export type RouteTier = {
  /** 1 is the hardest life to reach, 6 the shallowest — Maor's own order */
  tier: 1 | 2 | 3 | 4 | 5 | 6
  /** his own line for this rung, verbatim */
  nameHe: string
  /** the routes that sit on it — empty on tier 5, and that emptiness IS the model */
  routes: readonly RouteId[]
}

export const ROUTE_TIERS: readonly RouteTier[] = [
  { tier: 1, nameHe: 'בעלי הקבוצה', routes: ['OWNER'] },
  { tier: 2, nameHe: 'מייסד כדורסל', routes: ['USSISHKIN_FOUNDER'] },
  { tier: 3, nameHe: 'מנהיג אוהדים', routes: ['ULTRAS'] },
  { tier: 4, nameHe: 'עיתונאי · קשרים בינלאומיים · מעבר לגור בחו״ל', routes: ['JOURNALIST', 'TRAVELLER'] },
  // *"אוהד רגיל"* — מי שלא לקח כלום. אין כאן מסלול, ואסור שיהיה.
  { tier: 5, nameHe: 'אוהד רגיל', routes: [] },
  { tier: 6, nameHe: 'אוהד כורסא · אוהד שנעלם וחוזר', routes: ['DISTANCE_RETURN'] },
]

export const tierOf = (id: RouteId): RouteTier | null =>
  ROUTE_TIERS.find((row) => row.routes.includes(id)) ?? null

/**
 * מסלול בלי דרגה — היום זה `CREATOR` בלבד, ומחר זה כל מה שייכתב לפני שמאור יסדר אותו.
 *
 * Computed, never typed: a route added to the registry without a line in Maor's list turns
 * up here by itself, and the card says so rather than inventing a rung for it.
 */
export const UNPLACED_ROUTES: readonly RouteId[] = ROUTE_IDS.filter((id) => tierOf(id) === null)

/**
 * דרגה 5, כפי שהמנוע מחזיק אותה — שאלה על היעדר שורות.
 *
 * *"אוהד רגיל"* is not a state anybody enters; it is what is true while nothing else is.
 * So it is asked, not stored: no title on any of the six ladders and no distance taken.
 */
export const plainSupporter = (state: LifeState): boolean =>
  routesEverHeld(state).length === 0 && heldStage(state, 'DISTANCE_RETURN') === null

// ---------------------------------------------------------------------------------
// השילובים — מי יכול להיות שני דברים בבת אחת (17.9.2026)
// ---------------------------------------------------------------------------------

/**
 * *"יהיה מצבים שיהיה ניתן להיות כמה מסלולים יחד למשל — מייסד כדורסל + מנהיג אוהדים.
 * מנהיג אוהדים + אוהד שנעלם וחוזר."* (מאור, 17.9.2026)
 *
 * Until this table the engine had a conflict mechanism for exactly ONE pair — journalist
 * and owner, `CONFLICT_CHOICES` — and silence about the other twenty. Silence reads as
 * "everything combines", which is a decision nobody made, taken twenty times.
 *
 * So every unordered pair of the seven routes has a row here, and the vocabulary is four
 * words rather than a boolean, because Maor described three different things and a boolean
 * can hold at most two of them:
 *
 *  · **`free`** — both can be true of the same person and nothing is charged for it.
 *  · **`cost`** — both can be true and it costs something, in a scene, by name. The
 *    journalist/owner pair is the one that exists, and `conversationId` is where the price
 *    is paid. A `cost` pair is NEVER a locked door: *"שלוש דלתות, ואף אחת מהן היא לא
 *    'אסור לך'"*.
 *  · **`exclusive`** — the two cannot both be held, and `acceptEvents` refuses the second.
 *    **No pair carries this today.** Maor said such pairs exist; he has not named one, so
 *    the kind exists with no members, and inventing a member to fill it would be exactly
 *    the tier-for-`CREATOR` mistake in a more damaging place: an exclusion silently
 *    deletes half a life a player was walking towards.
 *  · **`undecided`** — nobody has said. This is the DEFAULT and it is the safe reading:
 *    the pair is not claimed to combine, `undecidedCombinations()` lists it for the
 *    delivery note, and no scene may treat it as settled. It deliberately does not BLOCK,
 *    because blocking is itself a decision and would silently remove branches the game
 *    can reach today. Not silently allowed, and not silently forbidden either: listed.
 *
 * `sourceHe` on every row names who decided, so a relation can never be quietly upgraded
 * from "nobody asked" to "Maor said" by a later edit.
 */
export type CombinationRelation = 'free' | 'cost' | 'exclusive' | 'undecided'

export type CombinationDef = {
  /** the two routes, written in registry order so the table reads as a triangle */
  pair: readonly [RouteId, RouteId]
  relation: CombinationRelation
  /** who decided this, in one line — an `undecided` row says that nobody has */
  sourceHe: string
  /** where the price of a `cost` pair is paid. Only a `cost` row may carry one. */
  conversationId?: string
}

/** the source line every pair that nobody has ruled on carries, so the reason is readable */
const NOBODY_SAID = 'איש לא הכריע על הצירוף הזה'

export const ROUTE_COMBINATIONS: readonly CombinationDef[] = [
  // --- OWNER ------------------------------------------------------------------------
  {
    pair: ['ULTRAS', 'OWNER'],
    relation: 'undecided',
    sourceHe: NOBODY_SAID,
  },
  {
    /**
     * הזוג היחיד שהיה קיים לפני הטבלה, ומשמעותו לא זזה.
     *
     * `conflictOfInterest` still asks the same question, the OWNER acceptance scene still
     * opens the same conversation, and the three doors are still three doors. What changed
     * is that it is now one row in a table of twenty-one instead of the only statement in
     * the file about two routes meeting.
     */
    pair: ['JOURNALIST', 'OWNER'],
    relation: 'cost',
    sourceHe: 'המפרט: בעלים שמסקר את קבוצתו — שלוש דלתות, ואף אחת מהן אינה איסור',
    conversationId: 'route-conflict-of-interest',
  },
  { pair: ['OWNER', 'CREATOR'], relation: 'undecided', sourceHe: NOBODY_SAID },
  { pair: ['OWNER', 'USSISHKIN_FOUNDER'], relation: 'undecided', sourceHe: NOBODY_SAID },
  { pair: ['OWNER', 'TRAVELLER'], relation: 'undecided', sourceHe: NOBODY_SAID },
  {
    pair: ['OWNER', 'DISTANCE_RETURN'],
    relation: 'free',
    sourceHe: 'המפרט: ארבעת אלה יכולים להיות נכונים על אותו אדם בו-זמנית',
  },
  // --- JOURNALIST -------------------------------------------------------------------
  { pair: ['ULTRAS', 'JOURNALIST'], relation: 'undecided', sourceHe: NOBODY_SAID },
  { pair: ['JOURNALIST', 'CREATOR'], relation: 'undecided', sourceHe: NOBODY_SAID },
  { pair: ['JOURNALIST', 'USSISHKIN_FOUNDER'], relation: 'undecided', sourceHe: NOBODY_SAID },
  { pair: ['JOURNALIST', 'TRAVELLER'], relation: 'undecided', sourceHe: NOBODY_SAID },
  {
    pair: ['JOURNALIST', 'DISTANCE_RETURN'],
    relation: 'free',
    sourceHe: 'המפרט: ארבעת אלה יכולים להיות נכונים על אותו אדם בו-זמנית',
  },
  // --- ULTRAS -----------------------------------------------------------------------
  { pair: ['ULTRAS', 'CREATOR'], relation: 'undecided', sourceHe: NOBODY_SAID },
  {
    /** *"מייסד כדורסל + מנהיג אוהדים"* — מאור, 17.9.2026 */
    pair: ['ULTRAS', 'USSISHKIN_FOUNDER'],
    relation: 'free',
    sourceHe: 'מאור, 17.9.2026: "מייסד כדורסל + מנהיג אוהדים"',
  },
  { pair: ['ULTRAS', 'TRAVELLER'], relation: 'undecided', sourceHe: NOBODY_SAID },
  {
    /** *"מנהיג אוהדים + אוהד שנעלם וחוזר"* — מאור, 17.9.2026 */
    pair: ['ULTRAS', 'DISTANCE_RETURN'],
    relation: 'free',
    sourceHe: 'מאור, 17.9.2026: "מנהיג אוהדים + אוהד שנעלם וחוזר"',
  },
  // --- CREATOR ----------------------------------------------------------------------
  { pair: ['CREATOR', 'USSISHKIN_FOUNDER'], relation: 'undecided', sourceHe: NOBODY_SAID },
  { pair: ['CREATOR', 'TRAVELLER'], relation: 'undecided', sourceHe: NOBODY_SAID },
  {
    pair: ['CREATOR', 'DISTANCE_RETURN'],
    relation: 'free',
    sourceHe: 'המפרט: ארבעת אלה יכולים להיות נכונים על אותו אדם בו-זמנית',
  },
  // --- USSISHKIN_FOUNDER ------------------------------------------------------------
  { pair: ['USSISHKIN_FOUNDER', 'TRAVELLER'], relation: 'undecided', sourceHe: NOBODY_SAID },
  { pair: ['USSISHKIN_FOUNDER', 'DISTANCE_RETURN'], relation: 'undecided', sourceHe: NOBODY_SAID },
  // --- TRAVELLER --------------------------------------------------------------------
  {
    pair: ['TRAVELLER', 'DISTANCE_RETURN'],
    relation: 'free',
    sourceHe: 'המפרט: ארבעת אלה יכולים להיות נכונים על אותו אדם בו-זמנית',
  },
]

const samePair = (row: CombinationDef, a: RouteId, b: RouteId): boolean =>
  (row.pair[0] === a && row.pair[1] === b) || (row.pair[0] === b && row.pair[1] === a)

/** the row for two routes, whichever way round they are asked */
export const combinationFor = (a: RouteId, b: RouteId): CombinationDef | null =>
  ROUTE_COMBINATIONS.find((row) => samePair(row, a, b)) ?? null

/**
 * מה היחס בין שני מסלולים — ו`undecided` היא התשובה כשאין שורה.
 *
 * A pair nobody wrote down answers `undecided` rather than throwing, because the safe
 * reading of silence is silence. `tests/life-tiers.test.ts` asserts every one of the
 * twenty-one pairs has a row, so the fallback is a definition and not a hiding place. A
 * route asked against itself answers `free`: a man is always compatible with himself.
 */
export function combinationOf(a: RouteId, b: RouteId): CombinationRelation {
  if (a === b) return 'free'
  return combinationFor(a, b)?.relation ?? 'undecided'
}

/**
 * האם השני נחסם על ידי הראשון — ורק `exclusive` חוסם.
 *
 * `undecided` does not block, on purpose, and the reason is worth keeping: blocking an
 * undecided pair would delete branches the game can walk today on the strength of nobody
 * having spoken, which is a decision made by silence — the exact thing this table exists
 * to stop. An undecided pair is reported, not enforced.
 */
export const blocksCombination = (a: RouteId, b: RouteId): boolean => combinationOf(a, b) === 'exclusive'

/** the conversation that charges for holding both, when the pair costs something */
export const combinationCostConversation = (a: RouteId, b: RouteId): string | null => {
  const row = combinationFor(a, b)
  return row?.relation === 'cost' ? (row.conversationId ?? null) : null
}

/** every pair nobody has ruled on — the list that belongs in a delivery note, not in a gate */
export const undecidedCombinations = (): readonly CombinationDef[] =>
  ROUTE_COMBINATIONS.filter((row) => row.relation === 'undecided')

/** the routes this one may be held alongside for free — derived, so the table is the source */
export const freePartnersOf = (id: RouteId): readonly RouteId[] =>
  ROUTE_IDS.filter((other) => other !== id && combinationOf(id, other) === 'free')

// ---------------------------------------------------------------------------------
// התרחקות וחזרה — a different SHAPE, and it is kept different on purpose
// ---------------------------------------------------------------------------------

/**
 * DISTANCE_RETURN — לא סף ולא מוניטין.
 *
 * It is not in `LIFE_ROUTES` and it must never be folded into it, however tempting a
 * seventh row looks. The spec gives it no capability, no audience, no proof count and
 * no ladder: *"בחירה מפורשת מגיל 18 → ארבע סצנות חיים בשנת התחלה+2,+5,+8,+10 → חזרה
 * שנבחרה ומשימת שירות ותפקיד חדש. אין תנאי סף של אהבה נמוכה."* Giving it a
 * `StageDef` would quietly attach thresholds to the one route whose entire point is
 * that it has none — the life he had while he was away is a life, not a failure state
 * with a climb back out of it.
 */
export const DISTANCE_RETURN = {
  id: 'DISTANCE_RETURN' as const,
  titleHe: 'התרחקות וחזרה',
  minAge: 18,
  /** ארבע סצנות חיים — years after the year the hiatus began */
  sceneOffsets: [2, 5, 8, 10] as const,
  /** a start later than this cannot complete the ten-year arc inside the life as written */
  latestStartForFullArc: 2016,
  /**
   * אלה יכולים להיות נכונים על אותו אדם בו-זמנית — וזה חמישה מ-17.9.2026, לא ארבעה.
   *
   * The spec's own four (`OWNER`, `JOURNALIST`, `CREATOR`, `TRAVELLER`) plus `ULTRAS`,
   * which Maor added by name: *"מנהיג אוהדים + אוהד שנעלם וחוזר"*. It is written out here
   * rather than computed so the route's own record still reads as a record, and
   * `tests/life-routes.test.ts` holds it against `ROUTE_COMBINATIONS` in both directions —
   * the same kind of deliberate second copy the spec tables get, for the same reason.
   * `USSISHKIN_FOUNDER` is absent because nobody has ruled on it, not because somebody
   * ruled against it; `undecidedCombinations()` is where that shows up.
   */
  coexistsWith: ['ULTRAS', 'JOURNALIST', 'OWNER', 'CREATOR', 'TRAVELLER'] as readonly RouteId[],
  rewardsHe: [
    'חדר וחיים שהתפתחו גם בלי יציע',
    'אלבום כפול: מה חיית ומה ראית מרחוק',
    'סצנת מפגש מחודשת ותפקיד חדש, בלי מחיקת הריחוק',
  ] as const,
  /** *"early_return: מותר בכל גישור; נשמר כסיפור התרחקות קצרה, לא הישג עשור."* */
  earlyReturnHe: 'חזרה מוקדמת נשמרת כסיפור של התרחקות קצרה, ולא כעשור',
}

/**
 * מה שלעולם לא מתחיל התרחקות — *"not_auto_triggered_by: missed_match ; low_attachment ;
 * user_offline_days."*
 *
 * This is the single most dangerous line in the whole route spec, because every one of
 * the three is a signal the engine already has and every one of them looks, to a
 * designer building a retention loop, like a perfect trigger. It is not. A man who
 * missed a Saturday missed a Saturday. A man who closed the tab closed a tab. Turning
 * either into "he drifted away from the club for a decade" is the game writing a life
 * the player did not live, out of telemetry.
 *
 * So the refusal is a function with a reason argument rather than a comment: any offer
 * of this route must name why it is being offered, and these three answers are refused
 * at the door. `tests/life-routes.test.ts` asserts all three.
 */
export const NEVER_TRIGGERS_DISTANCE = ['missed_match', 'low_attachment', 'user_offline_days'] as const

export type DistanceReason =
  | 'player_chose'
  | 'scene_offer'
  | (typeof NEVER_TRIGGERS_DISTANCE)[number]
  | string

export function mayOfferDistanceReturn(state: LifeState, reason: DistanceReason): boolean {
  if ((NEVER_TRIGGERS_DISTANCE as readonly string[]).includes(reason)) return false
  return state.age >= DISTANCE_RETURN.minAge
}

// ---------------------------------------------------------------------------------
// דגלים — what is written down when somebody says yes
// ---------------------------------------------------------------------------------

/**
 * `own:route:<ROUTE>:<stage>` — and the prefix is the whole point.
 *
 * `personFlags` in `events.ts` keeps `own:` across `day.entered` AND `year.entered`, so a
 * title accepted in one chapter is still held in the next decade. A route stage written
 * as an ordinary flag would be forgotten at the first chapter cut, which for a system
 * whose apexes are ten years above its entries would mean the ladder could never be
 * climbed by anybody. Do not change the prefix; `events.ts` is not ours to edit and the
 * prefix is the contract with it.
 */
export const stageFlag = (id: RouteId, stage: RouteStage): string => `own:route:${id}:${stage}`

/**
 * ההזמנה נפתחת כשיחה, והמזהים כתובים כאן במלואם — בכוונה.
 *
 * `lib/life/content/routes.ts` GENERATES the eighteen invitation conversations from the
 * registry, with a template-literal id. That is right for the content — eighteen copies
 * of one beat is eighteen places for the refusal to quietly stop being offered — and it
 * is exactly what made them invisible to the one guard that exists to catch this:
 * `tests/life-keys.test.ts` counts a conversation as reachable when its id appears as a
 * quoted literal in the source, and a template literal is not one. So all eighteen were
 * written, tested, registered in `DIALOGUE`, and reachable by nobody, for a week.
 *
 * This table is the fix and it is deliberately not clever. Every id is spelled out, so
 * the thing that OPENS the conversation names it the way a scene names a hotspot; the
 * `Record` types it against the registry, so a new route stops compiling until its three
 * offers exist; and `tests/life-routes.test.ts` asserts the table and `DIALOGUE` agree in
 * both directions. A generated key that nothing can name is the same defect as a figure
 * nothing places (rule 48) — it just fails silently instead of 404ing.
 *
 * `DISTANCE_RETURN` is absent on purpose: it is not in `LIFE_ROUTES`, it is *"בחירה
 * מפורשת מגיל 18"* rather than a threshold that invites, and it has no generated offer.
 */
export const OFFER_CONVERSATIONS: Record<Exclude<RouteId, 'DISTANCE_RETURN'>, Record<RouteStage, string>> = {
  ULTRAS: {
    entry: 'route-offer-ULTRAS-entry',
    practice: 'route-offer-ULTRAS-practice',
    apex: 'route-offer-ULTRAS-apex',
  },
  JOURNALIST: {
    entry: 'route-offer-JOURNALIST-entry',
    practice: 'route-offer-JOURNALIST-practice',
    apex: 'route-offer-JOURNALIST-apex',
  },
  OWNER: {
    entry: 'route-offer-OWNER-entry',
    practice: 'route-offer-OWNER-practice',
    apex: 'route-offer-OWNER-apex',
  },
  CREATOR: {
    entry: 'route-offer-CREATOR-entry',
    practice: 'route-offer-CREATOR-practice',
    apex: 'route-offer-CREATOR-apex',
  },
  USSISHKIN_FOUNDER: {
    entry: 'route-offer-USSISHKIN_FOUNDER-entry',
    practice: 'route-offer-USSISHKIN_FOUNDER-practice',
    apex: 'route-offer-USSISHKIN_FOUNDER-apex',
  },
  TRAVELLER: {
    entry: 'route-offer-TRAVELLER-entry',
    practice: 'route-offer-TRAVELLER-practice',
    apex: 'route-offer-TRAVELLER-apex',
  },
}

/** the conversation that makes this offer out loud, or null for the one route that has none */
export const offerConversationFor = (id: RouteId, stage: RouteStage): string | null =>
  id === 'DISTANCE_RETURN' ? null : OFFER_CONVERSATIONS[id][stage]

/**
 * `route:offered:…` — asked once per chapter, and NOT once per life.
 *
 * No `own:` prefix, which is the whole design: `personFlags` erases it at the chapter
 * cut, so a refusal is forgotten by the next chapter and the offer comes back. *"סירוב
 * אינו מוריד אהבה"* and `declineEvents` writes nothing — an offer that could only ever
 * be made once would turn "לא עכשיו" into "never", which is the opposite of what the
 * refusal is for.
 */
export const offeredFlag = (id: RouteId, stage: RouteStage): string => `route:offered:${id}:${stage}`

/** *"תפקיד שהושג נשמר בהיסטוריה גם אם עוזבים"* — standing down, without erasing it */
export const leftFlag = (id: RouteId): string => `own:route:${id}:left`

export const hasStage = (state: LifeState, id: RouteId, stage: RouteStage): boolean =>
  flagOn(state, stageFlag(id, stage))

/** the highest stage ever accepted on this route — history, whether or not he still holds it */
export function heldStage(state: LifeState, id: RouteId): RouteStage | null {
  let held: RouteStage | null = null
  for (const stage of ROUTE_STAGES) if (hasStage(state, id, stage)) held = stage
  return held
}

/** he holds it AND has not stood down; leaving never deletes the history above */
export const isActive = (state: LifeState, id: RouteId): boolean =>
  heldStage(state, id) !== null && !flagOn(state, leftFlag(id))

/** every route he has ever held a title on, in the registry's order */
export const routesEverHeld = (state: LifeState): readonly RouteId[] =>
  LIFE_ROUTES.filter((route) => heldStage(state, route.id) !== null).map((route) => route.id)

/**
 * האם הוא עומד במסלול הזה, בשלב הזה או מעליו — השאלה שתנאי שואל.
 *
 * This is the ACTIVE reading, and the distinction is the same one `heldStage` and
 * `isActive` have always drawn: a task that only exists for somebody who leads the
 * terrace should not appear for a man who stood down from it last year. The HISTORY
 * question has an answer already and it does not need a second predicate —
 * `{ flag: 'own:route:JOURNALIST:practice' }` asks it, because the stage flag is what
 * `heldStage` reads and it is never erased. Two predicates for one question is how a
 * content file ends up asking the wrong one.
 *
 * `minStage` defaults to `entry`, so `{ route: { id: 'ULTRAS' } }` means "he is on this
 * route at all", which is what an author writing that line means.
 */
export function routeAtLeast(state: LifeState, id: RouteId, minStage: RouteStage = 'entry'): boolean {
  if (flagOn(state, leftFlag(id))) return false
  const held = heldStage(state, id)
  if (!held) return false
  return ROUTE_STAGES.indexOf(held) >= ROUTE_STAGES.indexOf(minStage)
}

// ---------------------------------------------------------------------------------
// קריאת המצב — every counter read the way the reducer keeps it
// ---------------------------------------------------------------------------------

/**
 * The one place that knows `streetSmarts` is kept somewhere else. Everything else in
 * this file asks `capabilityOf` and never learns which block a number came out of, which
 * is what makes moving it into `SkillState` later a one-function change here.
 */
export function capabilityOf(state: LifeState, capability: RouteCapability): number {
  if (capability === PERSONALITY_BACKED_CAPABILITY) return state.personality.streetSmarts
  return state.skills[capability]
}

export const standingOf = (state: LifeState, audience: ReputationAudience): number =>
  state.reputation.standing[audience]

/** every recorded proof of one kind — the ledger, not a counter that could drift from it */
export const proofsOfKind = (state: LifeState, kind: string): readonly ProofRecord[] =>
  state.proofs.filter((proof) => proof.kind === kind)

/** how many DIFFERENT chapters a set of proofs was earned in */
export const chaptersSpanned = (proofs: readonly ProofRecord[]): number =>
  new Set(proofs.map((proof) => proof.chapter)).size

/** how many different SUBJECTS — a journalist with four pieces about one man has one topic */
export const subjectsSpanned = (proofs: readonly ProofRecord[]): number =>
  new Set(proofs.map((proof) => proof.subjectHe).filter((subject): subject is string => Boolean(subject))).size

/**
 * *"ללא חוב שהגיע זמנו ולא הוסדר"* — what that reads, and why it reads two things.
 *
 * `state.debt` is money owed and floors at zero (it is deliberately not negative money).
 * `owe:` flags are the other half: the coins a stand collected so somebody could get on
 * a bus, which `personFlags` keeps precisely because they outlive the day. A man with a
 * clear wallet and an unpaid `owe:` is a man who owes somebody, and OWNER's apex is the
 * one condition in the game that is entitled to notice.
 */
export function hasOverdueDebt(state: LifeState): boolean {
  if (state.debt > 0) return true
  return Object.keys(state.flags).some((flag) => flag.startsWith('owe:') && flagOn(state, flag))
}

/** how many named people stand at or above these axes — a crew, three sources, a partner */
export function peopleAtLeast(state: LifeState, trustMin: number, bondMin = 0): readonly CharacterId[] {
  return Object.keys(state.relationships).filter((who) => {
    const relationship = relationshipOf(state, who)
    return relationship.trust >= trustMin && relationship.bond >= bondMin
  })
}

// ---------------------------------------------------------------------------------
// חלון ההקמה
// ---------------------------------------------------------------------------------

/**
 * שנת ההקמה של הפועל אוסישקין היא 2007.
 *
 * Cited to the club's own history page (https://hapoelbc.com/history-2/), which the spec
 * links at line 576. That is the ONLY fact about the founding this file states, and rule
 * 11 is why: no participants are named here, no meeting dates, no places. The spec is
 * equally careful — *"אלה חלונות משחק מוצעים, לא טענה על שלוש ישיבות היסטוריות
 * מסוימות. תאריך היום המדויק, המשתתפים והמקומות ייקבעו ממקורות לפני כתיבת העובדות."*
 * The three founding commitments below are therefore GAME windows named after the kind
 * of work they are — people, operations, budget — and not after anything that happened.
 *
 * Rule 17 sits over the same ground from the other side: Maor Harel, who founded the
 * club, appears only where a source names him, and never as a slot a player can fill.
 * `FOUNDING_COMMITMENTS` is what the PLAYER can contribute alongside; it replaces nobody.
 */
export const FOUNDING_YEAR = 2007

/**
 * **ומכאן נובע דבר אחד על איך 2007 ייכתב, וכדאי לדעת אותו לפני ולא אחרי.**
 *
 * The apex asks for three proofs *"בפרקים שונים"* and the window is a single YEAR. Those
 * two are compatible only if that year is authored as more than one chapter — which is
 * what the spec already describes: *"בשנה הזאת ייכתבו שלוש סצנות ההקמה האישיות
 * FOUND-PEOPLE, FOUND-OPERATIONS, FOUND-BUDGET לפני סצנת ההשקה."* Three scenes, three
 * commitments, three chapter ids. Written as ONE chapter called `2007`, the founder apex
 * is unreachable by construction and would look perfectly healthy in the source, which is
 * the exact shape of defect rule 66 exists against. `tests/life-routes.test.ts` asserts
 * it the day the first 2007 chapter lands and says nothing until then.
 */
export const FOUNDING_COMMITMENTS = ['people', 'operations', 'budget'] as const
export type FoundingCommitment = (typeof FOUNDING_COMMITMENTS)[number]

export const foundingCommitmentFlag = (kind: FoundingCommitment): string => `own:founding:${kind}`

/**
 * The window is a single year and the game as built ends long before it — see the
 * delivery note's reachability table. That is not a reason to move the year: a window in
 * the future is a window, and a window moved to fit the chapters that exist would be the
 * game inventing a founding date. It opens when a chapter set in 2007 exists.
 */
export const foundingWindowOpen = (year: number): boolean => year === FOUNDING_YEAR

export const foundingWindowClosed = (year: number): boolean => year > FOUNDING_YEAR

/**
 * *"late_alternative: לאחר סגירת החלון: פעיל/מארגן/תומך במסגרת אותו מסלול; תואר מייסד
 * אינו זמין בדיעבד."*
 *
 * A player who arrives in 2010 is not locked out of the club and is not given the title
 * either. Both halves matter, and the second is the one a well-meaning patch would break
 * first: back-dating a founder is the exact shape of fabrication rule 11 forbids, with
 * the added insult of doing it to a real club's real history.
 */
export const LATE_ALTERNATIVE_HE = 'אחרי שהחלון נסגר אפשר להיות פעיל, מארגן ותומך באותו מסלול. תואר מייסד אינו ניתן בדיעבד.'

export const founderTitleAvailable = (state: LifeState): boolean =>
  !foundingWindowClosed(state.year) || hasStage(state, 'USSISHKIN_FOUNDER', 'apex')

// ---------------------------------------------------------------------------------
// מה חסר — the gaps, as things rather than as a number
// ---------------------------------------------------------------------------------

export type RouteGapKind =
  | 'ladder'
  | 'age'
  | 'capability'
  | 'alsoCapability'
  | 'audience'
  | 'proofs'
  | 'chapters'
  | 'evidence'
  | 'people'
  | 'subjects'
  | 'debt'
  | 'works'
  | 'journeys'
  | 'founding'
  | 'window'

export type RouteGap = {
  kind: RouteGapKind
  /** where he stands and what is wanted, for the card to say in WORDS */
  have: number
  want: number
  /** the capability or audience this gap is about, when it is about one */
  capability?: RouteCapability
  audience?: ReputationAudience
  /** named evidence still missing, when that is the gap */
  missingKinds?: readonly string[]
}

/**
 * What is still missing for this exact stage. An empty array means eligible.
 *
 * The order is the order a person would say it in — you are too young, you cannot do it
 * yet, nobody has heard, you have not done it enough times, in enough different years —
 * because `RouteCard` prints the FIRST gap large and the rest small, and "you are
 * nineteen" is a more useful sentence than "your organisation is fourteen".
 */
export function gapsFor(state: LifeState, id: RouteId, stage: RouteStage): readonly RouteGap[] {
  const route = routeById(id)
  const def = route?.stages.find((row) => row.stage === stage)
  if (!route || !def) return [{ kind: 'ladder', have: 0, want: 1 }]

  const gaps: RouteGap[] = []

  // 1 · the ladder. practice needs entry ACCEPTED, apex needs practice accepted — and it
  // is acceptance, not eligibility: a man who could have said yes and did not has not.
  const index = ROUTE_STAGES.indexOf(stage)
  const previous = index > 0 ? ROUTE_STAGES[index - 1] : undefined
  if (previous && !hasStage(state, id, previous)) gaps.push({ kind: 'ladder', have: 0, want: 1 })

  if (state.age < def.minAge) gaps.push({ kind: 'age', have: state.age, want: def.minAge })

  const capability = capabilityOf(state, def.capability)
  if (capability < def.capabilityMin) {
    gaps.push({ kind: 'capability', have: capability, want: def.capabilityMin, capability: def.capability })
  }

  const standing = standingOf(state, def.audience)
  if (standing < def.audienceMin) {
    gaps.push({ kind: 'audience', have: standing, want: def.audienceMin, audience: def.audience })
  }

  const proofs = proofsOfKind(state, route.proofKind)
  if (proofs.length < def.proofs) gaps.push({ kind: 'proofs', have: proofs.length, want: def.proofs })

  const span = chaptersSpanned(proofs)
  if (span < def.chapters) gaps.push({ kind: 'chapters', have: span, want: def.chapters })

  if (def.needsProofKinds) {
    // Named evidence, not a count. `verified_report` is a specific thing he did once.
    const missing = def.needsProofKinds.filter((kind) => proofsOfKind(state, kind).length === 0)
    if (missing.length > 0) {
      gaps.push({
        kind: 'evidence',
        have: def.needsProofKinds.length - missing.length,
        want: def.needsProofKinds.length,
        missingKinds: missing,
      })
    }
  }

  const extra = def.extra
  if (extra) {
    if (extra.alsoCapability) {
      const also = capabilityOf(state, extra.alsoCapability.capability)
      if (also < extra.alsoCapability.min) {
        gaps.push({
          kind: 'alsoCapability',
          have: also,
          want: extra.alsoCapability.min,
          capability: extra.alsoCapability.capability,
        })
      }
    }
    if (extra.people) {
      const standing = peopleAtLeast(state, extra.people.trustMin, extra.people.bondMin ?? 0).length
      if (standing < extra.people.count) {
        gaps.push({ kind: 'people', have: standing, want: extra.people.count })
      }
    }
    if (extra.distinctSubjects !== undefined) {
      const subjects = subjectsSpanned(proofs)
      if (subjects < extra.distinctSubjects) {
        gaps.push({ kind: 'subjects', have: subjects, want: extra.distinctSubjects })
      }
    }
    if (extra.noOverdueDebt && hasOverdueDebt(state)) {
      gaps.push({ kind: 'debt', have: 1, want: 0 })
    }
    if (extra.works !== undefined) {
      // a work is an original creation with provenance — the evidence ledger holds them
      const works = proofsOfKind(state, 'creative_work').length + proofsOfKind(state, 'creation_proof').length
      if (works < extra.works) gaps.push({ kind: 'works', have: works, want: extra.works })
    }
    if (extra.journeys) {
      const journeys = proofsOfKind(state, 'travel_proof')
      const abroad = journeys.filter((proof) => proof.noteHe === 'abroad').length
      const domestic = journeys.length - abroad
      if (journeys.length < extra.journeys.total) {
        gaps.push({ kind: 'journeys', have: journeys.length, want: extra.journeys.total })
      } else if (domestic < extra.journeys.domestic || abroad < extra.journeys.abroad) {
        // the count is there and the SHAPE is not — four trips to Jaffa is not four journeys
        gaps.push({ kind: 'journeys', have: abroad, want: extra.journeys.abroad })
      }
    }
    if (extra.foundingCommitments !== undefined) {
      if (!foundingWindowOpen(state.year)) gaps.push({ kind: 'window', have: state.year, want: FOUNDING_YEAR })
      const kept = FOUNDING_COMMITMENTS.filter((kind) => flagOn(state, foundingCommitmentFlag(kind))).length
      if (kept < extra.foundingCommitments) {
        gaps.push({ kind: 'founding', have: kept, want: extra.foundingCommitments })
      }
    }
  }

  return gaps
}

export const meetsStage = (state: LifeState, id: RouteId, stage: RouteStage): boolean =>
  gapsFor(state, id, stage).length === 0

/** the first stage he has NOT accepted, or null when he holds the apex */
export function nextStage(state: LifeState, id: RouteId): RouteStage | null {
  for (const stage of ROUTE_STAGES) if (!hasStage(state, id, stage)) return stage
  return null
}

// ---------------------------------------------------------------------------------
// ההזמנה
// ---------------------------------------------------------------------------------

export type RouteInvitation = {
  route: RouteDef
  stage: RouteStage
  /** the title on offer — a name somebody would call him, never a rank */
  titleHe: string
  /** what this stage hands over, in the spec's own order */
  rewardHe: string
  /** the scene-level sentence the apex needs a person to say out loud, when there is one */
  explicitChoiceHe?: string
}

/**
 * מה הוא זכאי לו עכשיו — ולא מה שקרה לו.
 *
 * Returns at most one stage per route, always the next unaccepted one, and returns
 * nothing at all for a route already at its apex. Calling this changes no state, raises
 * no flag and emits no event: an invitation that arrived by being READ would be the
 * promotion this whole design refuses.
 *
 * *"בדיקה נעשית בסיום פעולה רלוונטית ובכניסה לפרק, לא בכל תנועה"* — so the callers are
 * the end of a mission and the entry to a chapter, not the tick.
 */
export function eligibleFor(state: LifeState): readonly RouteInvitation[] {
  const invitations: RouteInvitation[] = []
  for (const route of LIFE_ROUTES) {
    const stage = nextStage(state, route.id)
    if (!stage) continue
    if (!meetsStage(state, route.id, stage)) continue
    const def = route.stages.find((row) => row.stage === stage)
    const index = ROUTE_STAGES.indexOf(stage)
    invitations.push({
      route,
      stage,
      titleHe: route.stageTitlesHe[stage],
      rewardHe: route.rewardsHe[index] ?? route.rewardsHe[0],
      ...(def?.extra?.explicitChoiceHe ? { explicitChoiceHe: def.extra.explicitChoiceHe } : {}),
    })
  }
  return invitations
}

/**
 * לקבל שלב — the explicit act, and the only thing in this file that writes.
 *
 * It refuses a stage he is not eligible for, which is what stops a scene from handing
 * out a title because a branch was reached: the invitation and the acceptance are
 * checked against the same function, so a content file cannot promote anybody by
 * accident. It also refuses a stage already held, so a replayed log does not stack.
 */
export function acceptEvents(state: LifeState, id: RouteId, stage: RouteStage): readonly LifeEvent[] {
  if (hasStage(state, id, stage)) return []
  /**
   * צירוף שנפסל — הבדיקה היחידה שהמטריצה אוכפת, ואין לה חברים היום.
   *
   * *"יהיה מצבים שיהיה ניתן להיות כמה מסלולים יחד"* also implies the other end: some pairs
   * exclude each other. `ROUTE_COMBINATIONS` holds `exclusive` as a word and **no pair
   * carries it**, because Maor named none — so this loop refuses nothing today and changes
   * no behaviour at all. It is here rather than in a scene for the same reason
   * `meetsStage` is: the day a pair is declared exclusive, the refusal has to be in the one
   * function both doors call, or the card and the conversation will disagree about whether
   * a man may take a title. A `cost` pair is deliberately NOT refused here — its price is a
   * conversation (`combinationCostConversation`), and *"אף אחת מהן היא לא 'אסור לך'"*.
   */
  const excluded = ROUTE_IDS.find(
    (other) => other !== id && heldStage(state, other) !== null && blocksCombination(id, other),
  )
  if (excluded) return []
  /**
   * התרחקות היא בחירה, ולכן היא נבדקת אחרת.
   *
   * It is not in `LIFE_ROUTES` and `meetsStage` would therefore refuse it forever, which
   * would make the one route the spec describes as *"בחירה מפורשת מגיל 18"* the only one
   * nobody can take — a dead branch that reads perfectly in the source. Its condition is
   * the age and the fact that a person said so, and there is no third thing: *"אין תנאי
   * סף של אהבה נמוכה."*
   */
  if (id === 'DISTANCE_RETURN') {
    if (state.age < DISTANCE_RETURN.minAge) return []
    return [{ t: 'flag.raised', flag: stageFlag(id, stage) }]
  }
  if (!meetsStage(state, id, stage)) return []
  return [{ t: 'flag.raised', flag: stageFlag(id, stage) }]
}

/**
 * הכי קרוב — which route to open the card on, when the player asked rather than the world.
 *
 * The offer arrives as a conversation, in the room a chapter opens in; this is the other
 * door, the deliberate one, and it needs to answer a question the offer never has to: of
 * seven routes, which ONE does he want to read about right now. The answer is the one he
 * is nearest to, in this order:
 *
 *  1. a stage he already qualifies for — that is not a gap, it is an offer he can take;
 *  2. otherwise the unheld stage with the FEWEST things missing, because "two of four"
 *     is a road and "you are nineteen, and four other things" is a wall;
 *  3. ties go to the registry's own order, which is the spec's order, so the answer is
 *     stable rather than whichever route the loop happened to reach first.
 *
 * Pure, like everything else in this file: opening the card writes nothing.
 */
export function nearestRoute(state: LifeState): { id: RouteId; stage: RouteStage } | null {
  let best: { id: RouteId; stage: RouteStage; missing: number } | null = null
  for (const route of LIFE_ROUTES) {
    const stage = nextStage(state, route.id)
    if (!stage) continue
    const missing = meetsStage(state, route.id, stage) ? 0 : gapsFor(state, route.id, stage).length
    if (!best || missing < best.missing) best = { id: route.id, stage, missing }
    if (best.missing === 0) break
  }
  return best ? { id: best.id, stage: best.stage } : null
}

/**
 * מתי בכלל מציעים לקרוא על זה — a menu row for a door that opens on "you are eight" is a
 * row that teaches the player the menu is decoration. Every stage of every route is
 * `minAge: 18` or above (`DISTANCE_RETURN` included), so the card has nothing to say to a
 * child; sixteen is where the first of them is close enough to be worth reading, and a man
 * who has ever held a title keeps the door whatever his age.
 */
export const ROUTES_VISIBLE_AGE = 16

export const routesWorthShowing = (state: LifeState): boolean =>
  state.age >= ROUTES_VISIBLE_AGE || routesEverHeld(state).length > 0

/** דחייה — an invitation that can be refused is the only kind worth offering */
export function declineEvents(id: RouteId, stage: RouteStage): readonly LifeEvent[] {
  // Deliberately NOT a flag that closes the door. *"סירוב אינו מוריד אהבה"*, and the
  // spec's turn-around algorithm expects a refused offer to be able to come back later.
  // Nothing is written at all; the offer simply did not happen.
  void id
  void stage
  return []
}

/** standing down from a role, which keeps the history and stops the practice */
export function leaveEvents(state: LifeState, id: RouteId): readonly LifeEvent[] {
  if (heldStage(state, id) === null) return []
  return [{ t: 'flag.raised', flag: leftFlag(id) }]
}

// ---------------------------------------------------------------------------------
// ניגוד עניינים — two roles that do not merge for free
// ---------------------------------------------------------------------------------

/**
 * *"בעלים ועיתונאי שמסקר את קבוצתו: בעת קבלת הבעלות בוחרים להפסיק את הסיקור, לעבור
 * לטור אישי מסומן, או להמשיך ולהיכנס לקוואסט גילוי ונזק לאמון."*
 *
 * Three doors, and none of them is "you may not". The spec is careful about that and so
 * is this: a man is allowed to own a club and keep writing about it, and what it costs
 * him is a disclosure quest and his readers' trust — not a locked branch. *"אפשר לשמור
 * היסטוריית עיתונאי בלי להחזיק תפקיד מערכת פעיל"*, which is why `heldStage` and
 * `isActive` are two different questions.
 *
 * The moment is the moment ownership is TAKEN, so this is asked by the OWNER acceptance
 * scene and by nothing else.
 *
 * **מ-17.9.2026 זהו זוג אחד בטבלה של עשרים ואחד**, `relation: 'cost'` ב-`ROUTE_COMBINATIONS`,
 * ומשמעותו לא זזה במילימטר. What changed is the surroundings: this used to be the only
 * statement in the file about two routes meeting, so its silence about the other twenty
 * read as "everything else combines" — a decision nobody made, taken twenty times.
 */
export const CONFLICT_CHOICES = ['stop_covering', 'personal_column', 'disclose_and_pay'] as const
export type ConflictChoice = (typeof CONFLICT_CHOICES)[number]

export const conflictFlag = (choice: ConflictChoice): string => `own:route:conflict:${choice}`

export function conflictOfInterest(state: LifeState): boolean {
  // He has ever been a journalist AND is now taking ownership. Ever, not currently: a
  // column he stopped writing last year is still a column his readers remember.
  return heldStage(state, 'JOURNALIST') !== null && heldStage(state, 'OWNER') !== null
}

export function conflictSettled(state: LifeState): boolean {
  return CONFLICT_CHOICES.some((choice) => flagOn(state, conflictFlag(choice)))
}

export function conflictEvents(choice: ConflictChoice): readonly LifeEvent[] {
  const events: LifeEvent[] = [{ t: 'flag.raised', flag: conflictFlag(choice) }]
  if (choice === 'stop_covering') {
    // The role stays in the history — `heldStage` still answers — and stops being active.
    events.push({ t: 'flag.raised', flag: leftFlag('JOURNALIST') })
  }
  if (choice === 'disclose_and_pay') {
    /**
     * הנזק, ולא עונש נוסף.
     *
     * A loss is the ONE direction reputation moves without waiting for a witness, and
     * the reason is in the spec: a breach that came out is known by definition. Nothing
     * else in this system may use `reputation.changed`, and the content vocabulary has
     * no verb for it at all — the only two ways a standing rises are `reputation.earned`
     * followed by `reputation.heard`.
     *
     * −8 is the spec's cap for a negative reputation event
     * (*"תקרת אירוע מוניטין חיובי +5 ושלילי −8"*), and this is the largest thing a
     * person can do to their own readers in one move.
     */
    events.push({
      t: 'reputation.changed',
      audience: 'public',
      delta: -8,
      why: 'הקוראים גילו שהוא מסקר קבוצה שהוא שותף בה',
    })
  }
  return events
}

// ---------------------------------------------------------------------------------
// מה אפשר להגיע אליו בחיים שנבנו — the honest answer, computed and not claimed
// ---------------------------------------------------------------------------------

/**
 * הגיל הגבוה ביותר שהמשחק מגיע אליו היום, מתוך `CHAPTERS` ולא מהקלדה.
 *
 * Rule 45 forbids typing a year into the life layer and rule 66 forbids shipping a
 * threshold nothing can reach. This function is where the two meet: it lets the card,
 * the tests and the delivery note all state the same thing — that most apexes are
 * age-gated above the last chapter that exists — without any of them writing a number
 * down. Build the 2007 chapter and every answer here moves by itself.
 */
export function reachableAgeCeiling(birthYear: number): number {
  const years = CHAPTERS.filter((chapter) => chapter.playable !== false).map((chapter) => chapter.year)
  const last = years.length > 0 ? Math.max(...years) : birthYear
  return last - birthYear
}

/** a stage whose minimum age is above the last chapter the game has — true today, not forever */
export function stageOutOfReach(stage: StageDef, birthYear: number): boolean {
  return stage.minAge > reachableAgeCeiling(birthYear)
}

/**
 * אותה שאלה, מהמצב — the form the shell can ask without holding a `StageDef`.
 *
 * `DISTANCE_RETURN` is not in `LIFE_ROUTES` and has no `StageDef` at all, so it answers
 * from its own `minAge`; a route or stage that does not resolve answers false rather than
 * throwing, because a card that cannot draw is worse than a card with one honest line
 * missing from it.
 */
export function stageOutOfReachFor(state: LifeState, id: RouteId, stage: RouteStage): boolean {
  if (id === 'DISTANCE_RETURN') return DISTANCE_RETURN.minAge > reachableAgeCeiling(state.identity.birthYear)
  const def = routeById(id)?.stages.find((row) => row.stage === stage)
  return def ? stageOutOfReach(def, state.identity.birthYear) : false
}
