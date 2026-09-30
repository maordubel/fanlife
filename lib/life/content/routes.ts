import {
  DISTANCE_RETURN,
  FOUNDING_COMMITMENTS,
  LIFE_ROUTES,
  PERSONALITY_BACKED_CAPABILITY,
  foundingCommitmentFlag,
  stageFlag,
  type RouteCapability,
  type RouteId,
} from '../routes'
import type { ReputationAudience } from '../types'
import type { Condition } from '../world/types'
import type { Beat } from './beats'
import { CHAPTERS } from './chapters'
import { DEFAULT_IDENTITY } from './chapter1986'
import type { Conversation, Effect } from './script'

/**
 * משימות ההוכחה וההזמנות — the words behind the seven routes.
 *
 * `lib/life/routes.ts` is the arithmetic; this is the fiction, and it is written to the
 * same line every content file in this game is written to (see the note at the top of
 * `script.ts`): it invents a job, a supplier, a night on a terrace, and it states no
 * date, no opponent, no result and no scorer. The founding chapter is the sharpest case
 * — *"תאריך היום המדויק, המשתתפים והמקומות ייקבעו ממקורות לפני כתיבת העובדות"* — so
 * nothing below names a year, a meeting or a person at the founding. The model holds the
 * one sourced fact (the year) and the fiction holds none of it.
 *
 * ------------------------------------------------------------------------------------
 * **שני דברים שהתוכן הזה עושה אחרת, ושניהם כללים ולא סגנון.**
 *
 * **1 · המוניטין ממתין, וזה נכתב בתוכן.** The spec: *"REP_* עולה רק כשהקהל המוגדר
 * ראה/קיבל דיווח מאומת על הפעולה. אם אין עדים, העלייה ממתינה באירוע ידיעה; הכישור עצמו
 * יכול להשתפר מיד."* So a mission that the audience watched pays out in the same breath
 * (`{ e: 'heard' }`) and names WHO watched in `witnessHe`; a mission nobody saw earns
 * its claim and stops there, and a later conversation is what pays it. `PROOF_BUSINESS`
 * and `PROOF_CREATE` are deliberately the two that wait, because a closed month of wages
 * and a song handed over are exactly the kind of work that is invisible until somebody
 * repeats it. The test asserts the two halves of this against each other: a mission that
 * pays itself out must name a witness, and a mission with no witness must not.
 *
 * **2 · `{chapter}` בתוך ה־proof_id.** A proof is idempotent on its id, and a route's
 * apex asks for four proofs *"בפרקים שונים"*. Both are true at once only if the id
 * carries the chapter: `leadership:{chapter}` cannot be farmed twice in one year and CAN
 * be earned again in the next, which is precisely the shape the requirement describes.
 * The runtime substitutes it (`dialogue.ts`); the content never writes a chapter id.
 */

// ---------------------------------------------------------------------------------
// משימות ההוכחה — the spec's own action table (lines 622–627), as data
// ---------------------------------------------------------------------------------

export type ProofMissionDef = {
  /** the spec's action id, kept verbatim so the table and the game can be read together */
  id: string
  conversationId: string
  routeId: RouteId
  /** the `kind` written onto the `ProofRecord` */
  kind: string
  /** דקות משחקיות — charged once, as the spec's cost column says */
  minutes: number
  energy: number
  capability: RouteCapability
  capabilityGain: number
  audience: ReputationAudience
  audienceGain: number
  titleHe: string
  /**
   * מי ראה — null means nobody did.
   *
   * Not a flavour field. It is the content's ANSWER to the rule above, and the test reads
   * it: a mission with a witness may pay its standing out on the spot, and a mission
   * without one may not, whatever a later author feels like adding.
   */
  witnessHe: string | null
}

/**
 * The six `PROOF_*` rows, with the spec's own numbers. `+5` on the capability is the
 * single per-chapter exception the spec grants a proof mission (*"כל משימת הוכחה PROOF_*
 * רשאית לקבל את חריג +5 היחיד לאותו כישור באותו פרק"*), and `+5` on the standing is the
 * cap for one positive reputation event.
 */
export const PROOF_MISSIONS: readonly ProofMissionDef[] = [
  {
    id: 'PROOF_LEAD',
    conversationId: 'route-proof-lead',
    routeId: 'ULTRAS',
    kind: 'leadership_proof',
    minutes: 60,
    energy: 15,
    capability: 'organization',
    capabilityGain: 5,
    audience: 'gate5',
    audienceGain: 5,
    titleHe: 'להוביל פעילות יציע ולסגור אותה',
    // The terrace is the audience and the terrace is standing there. Nothing waits.
    witnessHe: 'כל מי שעמד שם',
  },
  {
    id: 'PROOF_REPORT',
    conversationId: 'route-proof-report',
    routeId: 'JOURNALIST',
    kind: 'journalism_proof',
    minutes: 60,
    energy: 8,
    capability: 'communication',
    capabilityGain: 5,
    audience: 'public',
    audienceGain: 5,
    titleHe: 'להוציא כתבה מאומתת, ולתקן כשצריך',
    witnessHe: 'מי שקרא את זה',
  },
  {
    id: 'PROOF_BUSINESS',
    conversationId: 'route-proof-business',
    routeId: 'OWNER',
    kind: 'business_proof',
    minutes: 60,
    energy: 10,
    capability: 'business',
    capabilityGain: 5,
    audience: 'work',
    audienceGain: 5,
    titleHe: 'לסגור מחזור עסקי, כולל שכר וספקים',
    // Nobody watches a man pay his suppliers on time. That is the point of this one.
    witnessHe: null,
  },
  {
    id: 'PROOF_CREATE',
    conversationId: 'route-proof-create',
    routeId: 'CREATOR',
    kind: 'creation_proof',
    minutes: 60,
    energy: 10,
    capability: 'creativity',
    capabilityGain: 5,
    audience: 'public',
    audienceGain: 5,
    titleHe: 'למסור יצירה מקורית שנעשה בה שימוש',
    // A song handed over is not a song heard. It is heard the night somebody sings it.
    witnessHe: null,
  },
  {
    id: 'PROOF_FOUND',
    conversationId: 'route-proof-found',
    routeId: 'USSISHKIN_FOUNDER',
    kind: 'founding_proof',
    minutes: 60,
    energy: 12,
    capability: 'organization',
    capabilityGain: 5,
    audience: 'ussishkin',
    audienceGain: 5,
    titleHe: 'לסיים התחייבות הקמה בתוך החלון',
    witnessHe: 'האנשים שעובדים על זה איתך',
  },
  {
    id: 'PROOF_TRAVEL',
    conversationId: 'route-proof-travel',
    routeId: 'TRAVELLER',
    kind: 'travel_proof',
    minutes: 60,
    energy: 12,
    capability: PERSONALITY_BACKED_CAPABILITY,
    capabilityGain: 5,
    audience: 'gate7',
    audienceGain: 5,
    titleHe: 'להביא קבוצה ליעד, ולפתור תקלה בדרך',
    witnessHe: 'כל מי שנסע איתך',
  },
]

export const missionById = (id: string): ProofMissionDef | null =>
  PROOF_MISSIONS.find((row) => row.id === id) ?? null

/**
 * The same lookup, for the authored conversations below, which cannot carry on without
 * one. It throws rather than falling back: a mission id that does not resolve is a typo
 * in a content file, and a conversation that silently hands out nothing is exactly the
 * dead branch rule 66 exists against — better a red suite than a night on a terrace that
 * changes nobody.
 */
const mission = (id: string): ProofMissionDef => {
  const found = missionById(id)
  if (!found) throw new Error(`route content names a proof mission that does not exist: ${id}`)
  return found
}

/**
 * הראיות הקטנות — the named evidence the entry stages ask for by name.
 *
 * `JOURNALIST` entry wants `verified_report` AND `written_account`; `OWNER` entry wants
 * `balanced_budget` AND `adult_shift`; `CREATOR` entry wants a `creative_work`. Those are
 * not proof missions and they are not worth `+5`: they are ordinary afternoons out of
 * the spec's own action table, and a route entry that could be reached by four repeats of
 * one action would make the named evidence decorative. Their deltas are copied from the
 * table rows they come from (lines 606–619).
 */
export type SmallActionDef = {
  id: string
  conversationId: string
  kind: string
  minutes: number
  energy: number
  titleHe: string
  /** what is in front of him when he walks up to it — the room talking, never a quest board */
  openingHe: string
  /** the same thing, afterwards. A room that forgets what you did in it this afternoon is a menu. */
  doneHe: string
  effects: readonly Effect[]
}

/**
 * פעם אחת בפרק, ולא פעם אחת בחיים.
 *
 * `proof.recorded` is idempotent on `proofId` (`events.ts`) and the id carries the chapter,
 * so a second run of the same action in the same afternoon would pay no proof — but it WOULD
 * pay the skills, the money and the reputation again, which is a mill. A flag closes it.
 *
 * Deliberately with no prefix from the surviving list (`life:`, `own:`, `owe:`, …): `personFlags`
 * erases it at the chapter cut, which is exactly right. The evidence is permanent and the
 * afternoon is not — next year the papers on the shelf are a different pair of papers.
 */
export const smallActionFlag = (id: string): string => `small:${id}`

const proof = (kind: string, extra: Partial<Extract<Effect, { e: 'proof' }>> = {}): Effect => ({
  e: 'proof',
  kind,
  proofId: `${kind}:{chapter}`,
  ...extra,
})

/**
 * הספק שנדחה — סכום אחד, ודגל אחד, כי שני הצדדים של אותו חוב חייבים להסכים.
 * `owe:` שורד מעבר פרק (`personFlags`), וזה מה שמאפשר לשלם אותו בחודש אחר.
 */
const SUPPLIER_AGOROT = 4000
const SUPPLIER_DEBT_FLAG = 'owe:supplier'

export const SMALL_ACTIONS: readonly SmallActionDef[] = [
  {
    id: 'VERIFY_REPORT',
    conversationId: 'route-verify-report',
    kind: 'verified_report',
    minutes: 15,
    energy: 2,
    titleHe: 'לבדוק דיווח בשני מקורות',
    openingHe:
      'שני העיתונים על המדף לא כותבים אותו דבר. אחד אומר שהוא נמכר, השני אומר שהוא נשאר.',
    doneHe: 'שני העיתונים נשארו על המדף. אתה כבר יודע מי מהם צדק.',
    effects: [
      { e: 'skill', skill: 'knowledge', delta: 2, why: 'בדק מול שני מקורות' },
      { e: 'skill', skill: 'communication', delta: 1, why: 'ניסח את מה שיצא' },
      { e: 'personality', key: 'curiosity', delta: 1 },
      proof('verified_report'),
    ],
  },
  {
    id: 'WRITE_ACCOUNT',
    conversationId: 'route-write-account',
    kind: 'written_account',
    minutes: 20,
    energy: 2,
    titleHe: 'לכתוב תיאור אישי שמישהו יקרא',
    openingHe:
      'המחברת פתוחה מאתמול בלילה, באמצע משפט. אתה זוכר בדיוק מה רצית לכתוב שם.',
    doneHe: 'הדף מלא. מישהו כבר לקח אותו לקרוא.',
    effects: [
      { e: 'skill', skill: 'communication', delta: 2, why: 'כתב וזה נקרא' },
      { e: 'skill', skill: 'knowledge', delta: 1, why: 'כתב וזה נקרא' },
      // rep_public +2 — and somebody read it, which is what makes it payable at once
      proof('written_account', { audience: 'public', delta: 2 }),
      { e: 'heard', proofId: 'written_account:{chapter}' },
    ],
  },
  {
    id: 'CHECK_BUDGET',
    conversationId: 'route-check-budget',
    kind: 'balanced_budget',
    minutes: 15,
    energy: 0,
    titleHe: 'להכין תקציב שהסכומים בו מתאימים ליתרה',
    openingHe:
      'החשבונות על השולחן, והכסף שיש בבית. שני המספרים האלה לא דיברו זה עם זה כבר חודש.',
    doneHe: 'המספרים על השולחן מסתדרים. זה לקח רבע שעה ושום דבר בבית לא ישתנה מזה היום.',
    effects: [
      { e: 'skill', skill: 'business', delta: 2, why: 'סגר תקציב' },
      { e: 'skill', skill: 'organization', delta: 1, why: 'סגר תקציב' },
      proof('balanced_budget'),
    ],
  },
  {
    id: 'WORK_COMMITMENT',
    conversationId: 'route-work-commitment',
    kind: 'adult_shift',
    minutes: 45,
    energy: 10,
    titleHe: 'להשלים משמרת בוגרת שהובטחה',
    openingHe:
      'הבטחת משמרת. הדלת האחורית פתוחה, והשעות נרשמות על לוח שתלוי מאחוריה.',
    doneHe: 'השעות רשומות על הלוח, בכתב יד של מישהו אחר, ולידן השם שלך.',
    /**
     * ולמה המשמרת הזאת **אינה משלמת** — שכר שנכתב ביד הוא שכר שסוטה מהעשור.
     *
     * עד שהפעולה הזאת קיבלה חדר היא נשאה `{ e: 'money', agorot: 800 }`, ושני דברים נשברו
     * ברגע שאפשר היה באמת לקחת אותה:
     *
     * 1. **המספר לא ידע באיזה עשור הוא.** `WAGE` ב-`prices.ts` הוא 10 ₪ לשעה בשנות
     *    התשעים ו-18 בשנות האלפיים, ו-`gigPay` גוזר ממנו כל שכר במשחק בדיוק כדי שלא
     *    יוקלד פעמיים (*"a wage that is typed in nineteen places is nineteen chances to be
     *    wrong about a decade"*). 800 אגורות זה שכר של 1997 שמשולם גם ב-2000.
     * 2. **היא עקפה את הכלל של מאור** (6.9.2026): *"צריך להגביל את האפשרות להרוויח כסף,
     *    פעם אחת בכל משימה."* `workDoneFlag` אוכף עבודה בתשלום אחת לפרק על כל הג׳ובים —
     *    ומשמרת שמשלמת בלי להרים אותו היא ברז שני באותו אחר־צהריים.
     *
     * מי שרוצה כסף לוקח ג׳וב; מי שרוצה את מסלול הבעלים משלים משמרת שהבטיח. מה שהיא
     * משאירה אחריה הוא מה שהיא באמת עושה: שעות רשומות על לוח, ושם לידן.
     */
    effects: [
      { e: 'skill', skill: 'business', delta: 2, why: 'משמרת בוגרת' },
      // rep_work +3, and the man who signs the hours is standing right there
      proof('adult_shift', { audience: 'work', delta: 3 }),
      { e: 'heard', proofId: 'adult_shift:{chapter}' },
    ],
  },
  {
    id: 'MAKE_WORK',
    conversationId: 'route-make-work',
    kind: 'creative_work',
    minutes: 25,
    energy: 4,
    titleHe: 'להכין יצירה בתחום שכבר ניסית',
    openingHe:
      'מה שהתחלת מונח בפינה מאז הפעם הקודמת. זה לא ייגמר לבד.',
    doneHe: 'זה גמור ומונח בפינה. עכשיו זה כבר דבר, ולא כוונה.',
    effects: [
      { e: 'skill', skill: 'creativity', delta: 3, why: 'הכין משהו' },
      proof('creative_work'),
    ],
  },
  {
    id: 'ORGANIZE_GROUP',
    conversationId: 'route-organize-group',
    kind: 'group_delivered',
    minutes: 30,
    energy: 8,
    titleHe: 'לתכנן מפגש ולהביא את האנשים בזמן',
    openingHe:
      'אנשים אמרו שיבואו. אף אחד מהם לא יודע מתי, ואף אחד מהם לא ישאל.',
    doneHe: 'כולם כאן, ובזמן. אף אחד לא יגיד לך תודה על זה, וזה בסדר.',
    effects: [
      { e: 'skill', skill: 'organization', delta: 3, why: 'הביא אנשים בזמן' },
      { e: 'skill', skill: 'communication', delta: 1, why: 'הביא אנשים בזמן' },
      proof('group_delivered', { audience: 'gate5', delta: 3 }),
      { e: 'heard', proofId: 'group_delivered:{chapter}' },
    ],
  },
  {
    id: 'PLAN_JOURNEY',
    conversationId: 'route-plan-journey',
    kind: 'route_plan',
    minutes: 15,
    energy: 2,
    titleHe: 'לתכנן דרך מאושרת עם מידע בדוק',
    openingHe:
      'לוח היציאות, והמחירים לידו. אפשר להגיד למישהו איך מגיעים — או להגיד לו משהו שנשמע נכון.',
    doneHe: 'הדרך כתובה, עם שעות שבדקת ומחיר שראית בעיניים.',
    effects: [
      { e: 'personality', key: PERSONALITY_BACKED_CAPABILITY, delta: 2 },
      { e: 'skill', skill: 'organization', delta: 1, why: 'תכנן דרך' },
      proof('route_plan'),
    ],
  },
  {
    id: 'HELP_TEAM',
    conversationId: 'route-help-team',
    kind: 'community_help',
    minutes: 20,
    energy: 5,
    titleHe: 'לקחת משימת עזרה ולסיים אותה',
    openingHe:
      'יש משימה שאף אחד לא לקח, והיא תישאר כאן עד שמישהו ייקח אותה.',
    doneHe: 'לקחת אותה וגמרת אותה. זה ההבדל היחיד בין לקחת משימה לבין להתנדב.',
    effects: [
      { e: 'skill', skill: 'organization', delta: 2, why: 'עזר וסיים' },
      { e: 'personality', key: 'empathy', delta: 1 },
      proof('community_help', { audience: 'ussishkin', delta: 3 }),
      { e: 'heard', proofId: 'community_help:{chapter}' },
    ],
  },
]

/**
 * שם הראיה, במילים של מי שעשה אותה.
 *
 * `gapsFor` מחזיר `missingKinds` — `['verified_report', 'written_account']` — וכרטיס
 * המסלול הדפיס עליהם משפט אחד גנרי: *"חסר דבר אחד שעשית פעם אחת, וזה עוד לא קרה"*. זה
 * נכון ואינו אומר דבר. אדם שנמצא שני אחר־צהריים מכניסת העיתונאי קיבל את אותה שורה כמו
 * אדם שנמצא חמישה, ובאותן מילים.
 *
 * הטבלה **נגזרת** משתי הטבלאות שכבר מחזיקות את המשפט האנושי — `titleHe` של פעולה קטנה
 * ושל משימת הוכחה — ולא נכתבת שוב (כלל 59: שני שמות לאותו מושג הם שתי הזדמנויות לסטות).
 * ראיה שתיכתב מחר מקבלת את שמה בכרטיס באותו רגע, בלי שורה נוספת בשום מקום.
 */
const EVIDENCE_TITLES: Record<string, string> = {}
for (const action of SMALL_ACTIONS) EVIDENCE_TITLES[action.kind] = action.titleHe
for (const mission of PROOF_MISSIONS) EVIDENCE_TITLES[mission.kind] = mission.titleHe

/** the sentence for a proof kind, or null for one nothing in the game produces */
export const evidenceTitleHe = (kind: string): string | null => EVIDENCE_TITLES[kind] ?? null

// ---------------------------------------------------------------------------------
// השיחות
// ---------------------------------------------------------------------------------

/** the effects a proof mission hands over, built from its row so the two cannot drift */
function missionEffects(mission: ProofMissionDef): Effect[] {
  const capability: Effect =
    mission.capability === PERSONALITY_BACKED_CAPABILITY
      ? { e: 'personality', key: PERSONALITY_BACKED_CAPABILITY, delta: mission.capabilityGain }
      : { e: 'skill', skill: mission.capability, delta: mission.capabilityGain, why: mission.titleHe }
  const proofId = `${mission.kind}:{chapter}`
  const effects: Effect[] = [
    { e: 'time', minutes: mission.minutes },
    { e: 'energy', delta: -mission.energy },
    capability,
    { e: 'proof', kind: mission.kind, proofId, audience: mission.audience, delta: mission.audienceGain },
  ]
  // The whole rule, in one conditional: the standing moves only where somebody saw it.
  if (mission.witnessHe) effects.push({ e: 'heard', proofId })
  return effects
}

/**
 * אירוע הידיעה — the two conversations that PAY the two missions nobody watched, and the
 * reason they were dead content until 16.9.2026.
 *
 * `PROOF_BUSINESS` and `PROOF_CREATE` are the two rows with `witnessHe: null`, so their
 * standing goes into `reputation.pending` and waits. `route-word-gets-around` and
 * `route-work-in-use` are what the wait is FOR — and nothing in the world opened either
 * one: no scene row, no beat, no `goto`. Six route missions were reachable and the two
 * that needed a second scene had none, which meant `rep_work` and the public's opinion of
 * a creator could never move at all. The dead branch of rule 66, one layer up from a
 * number: a whole mechanism that reads perfectly in the source and never runs.
 *
 * **שלושה דברים היו שבורים, לא אחד**, and they are worth listing because each is a
 * different kind of mistake:
 *
 *  1. שום דבר לא פתח את השיחות. נפתר כאן, בביטים, ולא בשורת סצנה — `world/scenes.ts`
 *     שייך לעובד אחר בסבב הזה, אבל חשוב מזה: **ידיעה היא לא חפץ בחדר.** אין על מה ללחוץ.
 *     אתה נכנס לאיזה מקום ושומעים, וזה בדיוק מה שביט הוא.
 *  2. `route-word-gets-around` בדק `life:proof:business`, דגל שאף אחד לא מרים. גם אילו
 *     מישהו היה פותח את השיחה, היא הייתה נופלת לענף "שניים מדברים ליד הדלפק. לא עליך."
 *  3. **והמזהה נושא את הפרק.** `heard` פורע תביעה לפי `proofId`, ו-`proofId` הוא
 *     `business_proof:{chapter}` — כלומר שמיעה בפרק אחר מהחודש שנסגר לא פורעת כלום
 *     ורק אומרת לשחקן משפט לא נכון. לכן השער הוא דגל **רגיל**, בלי `life:` ובלי `own:`:
 *     `personFlags` מוחק אותו בהחלפת יום ושנה, ולכן הביט לא יכול לירות בפרק לא נכון.
 *     חוק הבטיחות הזה נאכף על ידי שם הדגל, לא על ידי זהירות של מי שיכתוב את הבא.
 */
export const HEARD_GATE = { business: 'proof:business', create: 'proof:create' } as const

/** the flag a hearing raises so it happens once per chapter and does not re-arm its beat */
const HEARD_DONE = { business: 'heard:business', create: 'heard:create' } as const

/**
 * הביטים שמביאים את הידיעה — one per mission, and where each one stands is the content.
 *
 * The month is closed at Rafi's counter, so the supplier says your name at that counter,
 * an hour later, with you still in the room: `trigger: 'clock'` inside the kiosk fires on
 * the tick after the mission's own hour is charged, and fires again on any later visit in
 * the same day if you walked out first. The work is handed over in the bedroom and can
 * only be heard where there are people, so that one waits at the ground and in the street
 * and fires when you get there — which is also why it is `enter` and not `clock`: it is
 * the arrival that carries it.
 *
 * Each beat raises its own `heard:` flag as its first action, because a beat whose `when`
 * is still true when it ends is deliberately re-armed by the runner (`WorldScene`), and a
 * supplier saying your name on a loop is worse than a supplier never saying it.
 */
export const HEARD_BEATS: readonly Beat[] = [
  {
    id: 'route-heard-business',
    at: 'kiosk',
    trigger: 'clock',
    when: { flag: HEARD_GATE.business, none: [{ flag: HEARD_DONE.business }] },
    do: [{ a: 'flag', flag: HEARD_DONE.business }, { a: 'talk', conversation: 'route-word-gets-around' }],
  },
  {
    id: 'route-heard-create',
    at: ['bloomfield-outside', 'street'],
    trigger: 'enter',
    delayMs: 900,
    when: { flag: HEARD_GATE.create, none: [{ flag: HEARD_DONE.create }] },
    do: [{ a: 'flag', flag: HEARD_DONE.create }, { a: 'talk', conversation: 'route-work-in-use' }],
  },
]

/**
 * באילו פרקים הביטים האלה בכלל תלויים — נגזר, ולא מועתק.
 *
 * `world/scenes.ts` spells out its own `ADULT_CHAPTERS` for the hotspots that START the
 * missions, and a second hand-written copy of that list here is the kind of duplicate
 * that goes out of date the first time a chapter is inserted. So the set is derived from
 * the two facts that actually decide it: the youngest `minAge` any route stage declares
 * (read off `LIFE_ROUTES`, never typed), and the birth year the master timeline gives
 * (rule 45 — `DEFAULT_IDENTITY`, never typed either). A proof earned before that age buys
 * nothing any route can hand over, so the hearing has nothing to pay.
 *
 * Attaching the two beats to EVERY era would also work — their flags only exist where a
 * mission was done — but it would inflate the ceilings `scripts/life/budget-audit.ts`
 * computes for chapters the conversations can never run in, and the whole value of that
 * instrument is that it measures a counter the way the reducer does.
 */
const ROUTE_MIN_AGE = Math.min(...LIFE_ROUTES.flatMap((route) => route.stages.map((stage) => stage.minAge)))

export const HEARD_CHAPTERS: readonly string[] = CHAPTERS.filter(
  (chapter) => chapter.playable !== false && chapter.year - DEFAULT_IDENTITY.birthYear >= ROUTE_MIN_AGE,
).map((chapter) => chapter.id)

const CONVERSATIONS: Conversation[] = [
  // ------------------------------------------------------------- ULTRAS -------------
  {
    id: 'route-proof-lead',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'הערב יש משהו לסדר. דגלים, מקומות, מי מביא מה, ומי נשאר עד שהכול יורד.' },
          { who: null, text: 'אף אחד לא ביקש ממך. פשוט אין מי שיעשה את זה, ואתה יודע איך.' },
        ],
        choices: [
          {
            id: 'lead',
            text: 'לקחת את זה על עצמך ולסגור עד הסוף',
            then: [
              ...missionEffects(mission('PROOF_LEAD')),
              { e: 'toast', text: 'בסוף הערב מישהו שאתה לא מכיר שואל אותך מתי הפעם הבאה.', tone: 'red' },
            ],
          },
          {
            id: 'half',
            text: 'לעזור שעה ולהתחפף',
            then: [
              { e: 'time', minutes: 20 },
              { e: 'skill', skill: 'organization', delta: 1, why: 'עזר קצת' },
              { e: 'toast', text: 'הדגלים עלו. מי שגלגל אותם אחר כך היה מישהו אחר.' },
            ],
          },
          { id: 'away', text: 'לא הערב', then: [] },
        ],
      },
    ],
  },
  // ----------------------------------------------------------- JOURNALIST -----------
  {
    id: 'route-proof-report',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'יש לך סיפור ביד וחצי ממנו הגיע ממישהו ששמע ממישהו.' },
          { who: null, text: 'אפשר להוציא אותו ככה. אפשר גם לשבת עוד ערב ולבדוק מי באמת אמר את זה.' },
        ],
        choices: [
          {
            id: 'verify',
            text: 'לבדוק, ואז לפרסם — ולתקן בגלוי אם יתברר שטעית',
            then: [
              ...missionEffects(mission('PROOF_REPORT')),
              { e: 'personality', key: 'honesty', delta: 2 },
              { e: 'toast', text: 'זה יצא בשמך, וגם התיקון יצא בשמך.', tone: 'red' },
            ],
          },
          {
            id: 'rumour',
            text: 'להוציא כמו שזה',
            then: [
              { e: 'time', minutes: 10 },
              { e: 'personality', key: 'impulsiveness', delta: 1 },
              /**
               * *"שמועה שהופרכה בפומבי: rep_public −4 פעם אחת על הטענה."*
               *
               * A LOSS is the only direction a standing moves without waiting, because a
               * claim that was publicly knocked down is known by definition. It is also
               * the only place in this whole file that writes to a standing directly, and
               * the content vocabulary has no verb for a gain at all — the two halves of
               * that asymmetry are the system.
               */
              { e: 'repLoss', audience: 'public', delta: -4, why: 'הדבר שפרסם הופרך' },
              { e: 'toast', text: 'שבוע אחר כך מישהו מראה לך למה זה לא היה נכון.' },
            ],
          },
          { id: 'drop', text: 'להשאיר את זה בצד', then: [] },
        ],
      },
    ],
  },
  // -------------------------------------------------------------- OWNER -------------
  {
    id: 'route-proof-business',
    nameHe: null,
    branches: [
      /**
       * ספק שנדחה הוא חוב, ועד עכשיו הוא היה חוב בלי דלת.
       *
       * הענף "לדחות את הספקים לשבוע הבא" רשם `debt` ארבעים שקל — הדבר היחיד בכל המשחק
       * שכתב לשדה הזה — ושום ענף בשום פרק לא יכול היה להחזיר אותם. זה **נועל** את פסגת
       * הבעלים לתמיד (`ללא חוב שהגיע זמנו ולא הוסדר`) ופוסל גם את "לא נשאר חייב", שדורש
       * ארנק נקי. *"חוב שאי אפשר לפרוע הוא לא חוב, הוא עונש."*
       *
       * השבוע הבא הוא הסצנה הזאת עצמה, בפרק אחר — אותו דלפק, אותו סוף חודש. הענף עומד
       * ראשון כי מי שיש לו חוב פתוח לא ניגש לשולחן הזה בשביל משהו אחר.
       */
      {
        when: { all: [{ flag: SUPPLIER_DEBT_FLAG }], minAgorot: SUPPLIER_AGOROT },
        lines: [
          { who: null, text: 'סוף חודש, והשורה הראשונה בגיליון היא מהחודש שעבר: הספק שדחית.' },
          { who: null, text: 'הוא לא התקשר ולא הזכיר. הוא רק רשם, ומי שרושם זוכר.' },
        ],
        choices: [
          {
            id: 'settle',
            text: 'לשלם לו את מה שנדחה, ראשון',
            then: [
              { e: 'money', agorot: -SUPPLIER_AGOROT, why: 'הספק מהחודש שעבר' },
              { e: 'flagValue', flag: SUPPLIER_DEBT_FLAG, value: false },
              { e: 'debt', agorot: -SUPPLIER_AGOROT, why: 'הספק שנדחה, נסגר' },
              { e: 'proof', kind: 'debt_settled', proofId: 'debt_settled:{chapter}:supplier', subjectHe: 'הספק שנדחה לשבוע הבא', noteHe: 'חודש אחרי, ראשון בשורה.' },
              { e: 'skill', skill: 'business', delta: 2, why: 'סגר מול ספק' },
              { e: 'time', minutes: 10 },
              { e: 'toast', text: 'הוא מחק את השורה בעיפרון ולא אמר כלום. בפעם הבאה הוא יספק בלי לשאול.' },
            ],
          },
          { id: 'not-yet', text: 'לא הערב', then: [] },
        ],
      },
      {
        lines: [
          { who: null, text: 'סוף חודש. שכר לשניים, שני ספקים שמחכים, וגיליון שצריך להיסגר הערב.' },
          { who: null, text: 'אף אחד לא יראה את זה. פשוט בראשון בבוקר או שיש כסף בקופה או שאין.' },
        ],
        choices: [
          {
            id: 'close',
            text: 'לשבת ולסגור את המחזור עד הסוף',
            then: [
              ...missionEffects(mission('PROOF_BUSINESS')),
              { e: 'flag', flag: HEARD_GATE.business },
              {
                e: 'toast',
                text: 'סגרת. אף אחד לא אמר כלום, כי זה בדיוק מה שאמור לקרות כשהכול בסדר.',
              },
            ],
          },
          {
            id: 'defer',
            text: 'לדחות את הספקים לשבוע הבא',
            then: [
              { e: 'time', minutes: 15 },
              // A deferred supplier is a debt, and OWNER's apex is the one condition in
              // the game entitled to remember it. The flag is what gives it a door: the
              // branch above pays it back at the same counter, one chapter later.
              { e: 'flag', flag: SUPPLIER_DEBT_FLAG },
              { e: 'debt', agorot: SUPPLIER_AGOROT, why: 'ספק שנדחה' },
              { e: 'toast', text: 'הם הסכימו. הם גם רשמו.' },
            ],
          },
          { id: 'later', text: 'מחר', then: [] },
        ],
      },
    ],
  },
  {
    /**
     * זה מה שמשלם את PROOF_BUSINESS, וזאת הסיבה שהוא קיים.
     *
     * The month was closed in an empty room; the standing did not move, because nothing
     * had happened to anybody else yet. It moves here, the week a supplier says your name
     * to somebody. This conversation is the spec's *"אירוע ידיעה"* with a face on it, and
     * it is the clearest demonstration in the game of why earning and hearing are two
     * events instead of one.
     */
    id: 'route-word-gets-around',
    nameHe: null,
    branches: [
      {
        when: { flag: HEARD_GATE.business },
        lines: [
          { who: null, text: 'הספק מדבר עם מישהו ליד הדלפק ואומר את השם שלך באמצע משפט על מי משלם בזמן.' },
          { who: null, text: 'הוא לא ידע שאתה שומע. זה לא היה בשבילך.' },
        ],
        then: [
          { e: 'heard', proofId: 'business_proof:{chapter}' },
          { e: 'toast', text: 'מה שעשית בחדר ריק הגיע לאוזניים.', tone: 'red' },
        ],
      },
      {
        lines: [{ who: null, text: 'שניים מדברים ליד הדלפק. לא עליך.' }],
      },
    ],
  },
  // ------------------------------------------------------------ CREATOR -------------
  {
    id: 'route-proof-create',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'הדבר שהכנת גמור. עכשיו צריך למסור אותו למישהו שיעשה בו שימוש, וזה החלק שקשה.' },
          { who: null, text: 'ברגע שהוא יוצא מהידיים שלך הוא כבר לא שלך, והוא גם כבר לא רק שלך.' },
        ],
        choices: [
          {
            id: 'hand',
            text: 'למסור, ולהגיד שמותר להשתמש בזה',
            then: [
              ...missionEffects(mission('PROOF_CREATE')),
              { e: 'flag', flag: 'own:creation:released' },
              { e: 'flag', flag: HEARD_GATE.create },
              { e: 'toast', text: 'הוא לקח את זה איתו. עוד לא קרה כלום.' },
            ],
          },
          {
            id: 'keep',
            text: 'להשאיר את זה אצלך',
            then: [
              { e: 'skill', skill: 'creativity', delta: 1, why: 'המשיך לעבוד על זה' },
              { e: 'toast', text: 'זה נשאר בקופסה, וזה בסדר גמור.' },
            ],
          },
        ],
      },
    ],
  },
  {
    /** and this is the night the thing is USED — the knowledge event for a creation */
    id: 'route-work-in-use',
    nameHe: null,
    branches: [
      {
        when: { flag: HEARD_GATE.create },
        lines: [
          { who: null, text: 'שמעת את זה מגיע מכיוון אחר לגמרי, בפה של אנשים שלא פגשת מעולם.' },
          { who: null, text: 'אף אחד שם לא יודע שזה שלך. זה בדיוק מה שביקשת שיקרה.' },
        ],
        then: [
          { e: 'heard', proofId: 'creation_proof:{chapter}' },
          { e: 'redheart', key: 'community', delta: 4 },
        ],
      },
      { lines: [{ who: null, text: 'רעש רגיל.' }] },
    ],
  },
  // --------------------------------------------------- USSISHKIN_FOUNDER ------------
  {
    /**
     * ההתחייבות — אנשים, תפעול, תקציב.
     *
     * Three commitments the PLAYER can take on, named after the kind of work they are.
     * Rule 11 and rule 17 both sit on this conversation: nothing here names a participant,
     * a meeting or a place, nobody real is replaced, and the window itself is the model's
     * business. What the fiction is allowed to say is that there was work and that he did
     * some of it.
     */
    id: 'route-proof-found',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'יש מה לעשות ואין מספיק ידיים. אנשים, תפעול, כסף — שלושה דברים שונים לגמרי.' },
          { who: null, text: 'אף אחד לא מחלק תפקידים. פשוט שואלים מי לוקח.' },
        ],
        /**
         * ...והתחייבות שכבר נלקחה **נעולה, ואומרת למה** (21.9.2026).
         *
         * הפסגה מבקשת **שלוש התחייבויות שונות** בתוך החלון, והשיחה הזאת עומדת עכשיו
         * פעם אחת בכל אחד משלושת פרקי 2007. בלי הנעילה, שחקן שבוחר "אנשים" שלוש
         * פעמים מקבל שלוש ראיות — וזו הספירה שהמנוע באמת סופר — ועומד מול פסגה
         * נעולה בלי לדעת למה, כי `foundingCommitments` נשאר 1.
         *
         * שלוש הזדמנויות, שלוש התחייבויות: הבחירה נשארת בחירה (באיזה סדר, ומה
         * לקחת ראשון), ומה שאי-אפשר עוד אומר את זה בקול במקום להיכשל בשקט.
         */
        choices: FOUNDING_COMMITMENTS.map((kind) => ({
          id: kind,
          text:
            kind === 'people'
              ? 'לקחת את האנשים — מי מגיע, מי מביא את מי'
              : kind === 'operations'
                ? 'לקחת את התפעול — אולם, ציוד, שעות'
                : 'לקחת את התקציב — מה נכנס, מה יוצא, ומה אין',
          when: { notFlag: foundingCommitmentFlag(kind) } as Condition,
          noteHe: 'כבר לקחת את זה.',
          then: [
            ...missionEffects(mission('PROOF_FOUND')),
            { e: 'flag', flag: foundingCommitmentFlag(kind) },
          ],
        })),
      },
    ],
  },
  // ----------------------------------------------------------- TRAVELLER ------------
  {
    id: 'route-proof-travel',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'האוטובוס עמד. שני אנשים בלי כסף חזרה, ואחד שצריך להגיע לדלת ואי אפשר עם המדרגות.' },
          { who: null, text: 'אתה זה שאמר לכולם לבוא. זה אומר שאתה גם זה שפותר.' },
        ],
        choices: [
          {
            id: 'solve',
            text: 'לפתור — כולם מגיעים, ואף אחד לא נשאר עם חוב שלא הסכים לו',
            then: [
              ...missionEffects(mission('PROOF_TRAVEL')),
              { e: 'personality', key: 'empathy', delta: 2 },
              { e: 'toast', text: 'הגעתם. מישהו אמר את זה בקול, וכולם שמעו.', tone: 'red' },
            ],
          },
          {
            id: 'leave',
            text: 'שיסתדרו',
            then: [
              { e: 'time', minutes: 10 },
              { e: 'repLoss', audience: 'gate7', delta: -4, why: 'השאיר נוסעים בדרך' },
              { e: 'toast', text: 'הגעת. לא כולם.' },
            ],
          },
        ],
      },
    ],
  },
]

/**
 * ההזמנות — one conversation per route, generated from the registry.
 *
 * *"הגעה לסף יוצרת הזמנה שניתן לדחות; אינה מבצעת החלטה"*, and *"אין קפיצה אוטומטית דרך
 * שלוש כותרות באותו טוסט"* — both of which are already true in the model, so what the
 * words have to do is make refusing a real option rather than a rude one. Nothing is lost
 * by saying no: the offer is not written down, `declineEvents` raises nothing, and the
 * same scene can ask again later.
 *
 * Generated rather than hand-written because the seven are the same beat seven times, and
 * seven copies of one beat is seven places for the refusal to quietly stop being offered.
 */
const invitations: Conversation[] = LIFE_ROUTES.flatMap((route) =>
  route.stages.map((stage, index) => ({
    id: `route-offer-${route.id}-${stage.stage}`,
    nameHe: null,
    branches: [
      {
        // the offer only exists for somebody who has not already taken it
        when: { notFlag: stageFlag(route.id, stage.stage) },
        lines: [
          { who: null, text: `מישהו אומר את זה בלי טקס: מה שאתה כבר עושה יש לו שם, ואפשר לקרוא לך ${route.stageTitlesHe[stage.stage]}.` },
          { who: null, text: `זה לא תואר שמקבלים. זה משהו שאומרים עליך, ואפשר גם לא.` },
          { who: null, text: route.rewardsHe[index] ?? route.rewardsHe[0] },
        ],
        choices: [
          {
            id: 'accept',
            text: 'לקחת את זה',
            then: [{ e: 'route', route: route.id, stage: stage.stage, act: 'accept' }],
          },
          {
            id: 'decline',
            text: 'לא עכשיו',
            // Deliberately empty. A refusal that cost something would be a refusal in name
            // only, and the spec is explicit that it takes nothing: *"סירוב אינו מוריד אהבה."*
            then: [{ e: 'route', route: route.id, stage: stage.stage, act: 'decline' }],
          },
        ],
      },
      {
        lines: [{ who: null, text: 'כבר סיכמתם את זה.' }],
      },
    ],
  })),
)

/**
 * ניגוד עניינים — ברגע שלוקחים את הבעלות.
 *
 * Three doors and no wall (`CONFLICT_CHOICES`). The third is not a punishment branch: it
 * is the one where he keeps doing both and pays for it in front of his readers, which the
 * spec asks for by name — *"להמשיך ולהיכנס לקוואסט גילוי ונזק לאמון"*.
 */
const conflict: Conversation = {
  id: 'route-conflict-of-interest',
  nameHe: null,
  branches: [
    {
      lines: [
        { who: null, text: 'אתה כותב על הקבוצה. מהיום אתה גם שותף בה. שני הדברים האלה לא יכולים לשבת בשקט אחד ליד השני.' },
        { who: null, text: 'אף אחד עוד לא שאל אותך. עדיף שתגיד את זה לפני שישאלו.' },
      ],
      choices: [
        {
          id: 'stop_covering',
          text: 'להפסיק לסקר את הקבוצה',
          then: [{ e: 'conflict', choice: 'stop_covering' }],
        },
        {
          id: 'personal_column',
          text: 'לעבור לטור אישי מסומן, בלי סיקור',
          then: [{ e: 'conflict', choice: 'personal_column' }],
        },
        {
          id: 'disclose_and_pay',
          text: 'להמשיך, ולכתוב בראש כל טור מי אתה',
          then: [
            { e: 'conflict', choice: 'disclose_and_pay' },
            { e: 'toast', text: 'חלק מהקוראים נשארו. חלק הפסיקו להאמין לך, וזה נשאר כתוב.' },
          ],
        },
      ],
    },
  ],
}

/**
 * התרחקות — the explicit choice, and the three things that may never make it for him.
 *
 * `mayOfferDistanceReturn` refuses `missed_match`, `low_attachment` and
 * `user_offline_days` at the model level; this is what the offer looks like when it comes
 * from where it is allowed to come from, which is a person, in a scene, saying a true
 * thing about his life. There is no *"תנאי סף של אהבה נמוכה"* anywhere near it.
 */
const distance: Conversation = {
  id: 'route-distance-offer',
  nameHe: null,
  branches: [
    {
      when: { notFlag: 'own:route:DISTANCE_RETURN:entry' },
      lines: [
        { who: null, text: 'יש חיים שלמים שאפשר לחיות בלי לעמוד שם כל שבת, ואתה יודע את זה כבר תקופה.' },
        { who: null, text: 'זה לא ויתור ולא ריב. זה פשוט מה שקורה כשדברים אחרים תופסים מקום.' },
        { who: null, text: DISTANCE_RETURN.earlyReturnHe },
      ],
      choices: [
        {
          id: 'accept',
          text: 'לבחור בזה, במפורש',
          then: [{ e: 'route', route: 'DISTANCE_RETURN', stage: 'entry', act: 'accept' }],
        },
        { id: 'decline', text: 'לא', then: [] },
      ],
    },
    { lines: [{ who: null, text: 'זה כבר קרה.' }] },
  ],
}

/**
 * הפעולות הקטנות — a thing in a room, and an afternoon you decide to spend on it.
 *
 * Two branches, in this order, and the order is the whole behaviour: the offer is first
 * and asks whether it has been done this chapter; the second has no `when` and is what the
 * room says afterwards. A hotspot that vanished once you used it would be the world
 * deleting a thing you can see — so the shelf stays on the wall and the papers on it have
 * been read.
 *
 * `nameHe: null` because none of the eight is a person. The player is looking at an object
 * and deciding something about his own afternoon, which is the difference between this and
 * the six `PROOF_*` missions, where somebody is standing there watching.
 */
const smallActions: Conversation[] = SMALL_ACTIONS.map((action) => ({
  id: action.conversationId,
  nameHe: null,
  branches: [
    {
      when: { notFlag: smallActionFlag(action.id) },
      lines: [{ who: null, text: action.openingHe }],
      choices: [
        {
          id: 'do',
          text: action.titleHe,
          then: [
            { e: 'time', minutes: action.minutes },
            { e: 'energy', delta: -action.energy },
            ...action.effects,
            { e: 'flag', flag: smallActionFlag(action.id) },
          ],
        },
        { id: 'skip', text: 'לא עכשיו', then: [] },
      ],
    },
    { lines: [{ who: null, text: action.doneHe }] },
  ],
}))

export const CONVERSATIONS_ROUTES: readonly Conversation[] = [
  ...CONVERSATIONS,
  ...invitations,
  ...smallActions,
  conflict,
  distance,
]
