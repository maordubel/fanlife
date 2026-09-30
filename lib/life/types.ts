/**
 * THE WORKER LIFE — the shape of a life.
 *
 * This file is the contract between the simulation and everything that renders it.
 * It holds NO Hebrew, NO React and NO Phaser: the engine has to be runnable in a test
 * with nothing but Node, or the day comes when the only way to check whether Saturday
 * works is to play until Saturday.
 *
 * Two separations are load-bearing and both are in the brief:
 *
 *  · **Canon vs fiction.** Nothing here describes a historical fact. Facts arrive as a
 *    `HistoricalAnchor`, resolved server-side from the canonical archive, and the life
 *    layer only ever holds the anchor's ID. A championship is not a string in a
 *    dialogue file.
 *  · **State vs rendering.** `LifeState` is what is TRUE. The Phaser runtime draws it
 *    and sends events back; it never owns a number. That is what lets the same save
 *    survive a rewritten scene, and it is what will let 1990 be a different map over
 *    the same life.
 *
 * ---------------------------------------------------------------------------------
 * **VERSION 2 — the real game systems pass.**
 *
 * The first state was big enough for one Saturday and too small for forty years. This
 * one carries the domains the whole life needs: resources you spend, wellbeing you
 * cannot read off a bar, a personality that emerges from repetition, a Red Heart that
 * is the club rather than a fan level, relationships with more than one axis, a Red Box
 * of real objects, live opportunities, and a seeded random cursor so a QA run is
 * reproducible.
 *
 * It is **additive**. Every field the old state had is still here, still written by the
 * same events, so a save recorded before this pass folds into the new shape with no
 * migration step and no lost life: the save is a log, and a log read by a richer reducer
 * simply produces a richer state. `bonds` and `traits` survive as the legacy surface the
 * existing chapter writes through, and each of them now ALSO feeds the model that
 * replaced it — a line that says `trait: 'footballAffinity'` moves the Red Heart.
 */

import type { CraftOutput } from '../game/craft/types'

/**
 * Every place the game can put you. The list grows with the decades.
 *
 * `prologue-1972` is a fossil of the timeline that was rebased in rule 45 — the
 * prologue moved to 1983 and stopped being the father's youth — and it survived because
 * it is a PERSISTED id: it sits inside `moved` rows in saves people are playing. So it
 * is not renamed, it is RETIRED: `'prologue'` is the id the game writes now, the old one
 * stays in the union so an existing log still type-checks, and `apply` folds it forward
 * when the log is read. A persisted identifier is not a variable name (rule 35).
 */
export type LocationId =
  | 'prologue'
  /** @deprecated — folded to `prologue` on read; never written again */
  | 'prologue-1972'
  | 'bedroom'
  | 'home'
  | 'kitchen'
  | 'street'
  | 'kiosk'
  | 'pitch'
  | 'route'
  /**
   * אלנבי — the corner of Allenby, King George and Nahalat Binyamin: the middle of town,
   * and from 6.9.2026 the junction the whole map turns on. Home is south of it, Bloomfield
   * south-west, the hall on Ussishkin street north. A boy from this neighbourhood does not
   * walk to the Yarkon; he goes into town first, like everybody else.
   */
  | 'allenby'
  | 'bloomfield-outside'
  | 'bloomfield-tunnel'
  | 'bloomfield-inside'
  | 'ussishkin-outside'
  | 'ussishkin-hall'
  | 'ussishkin-end'
  | 'classroom'
  | 'schoolyard'
  // --- the decade (Stage B) ---
  /** under the stand at Bloomfield, where the younger crowd gathers from 1996 */
  | 'gate5'
  /**
   * משרד הכרטיסים — the concourse under the stand where a season ticket is renewed.
   *
   * A member of this union is a PERSISTED identifier (rule 35): it lands inside `moved`
   * rows in saved logs, so it is added and never renamed. Added 16.9.2026 with the
   * subscription system, which is the first thing in the game you have to go somewhere
   * and buy again every year.
   */
  | 'ticket-office'
  /** the new central bus station — a platform at dawn; a stand-in painting until its own */
  | 'bus-station'
  /** the national stadium, for the two cup finals — a stand-in painting until its own */
  | 'ramat-gan'
  /** the small ground in the Hatikva quarter, 13.5.2000 — a stand-in painting until its own */
  | 'hatikva'
  // --- 2000–2026 (21.9.2026) — the seventeen paintings Maor delivered, as rooms ---------
  // Persisted identifiers (rule 35): added, never renamed. `lib/life/world/rooms2000.ts`.
  /** the rented training hall of the new team, 2007 (U04, U05) */
  | 'hall-new'
  /** the Drive-In arena, 2015 (N05) */
  | 'drive-in'
  /** a rehearsal room, 2013 (N04) */
  | 'rehearsal'
  /** a small newsroom over the café on Allenby (J02, Q06) */
  | 'newsroom'
  /** the owner branch's office, 2025 (O01–O03) — fiction from its first line */
  | 'office'
  /** a community room: long table, cork board, a kettle (U01, U02, P03, Z03) */
  | 'community-room'
  /** the community equipment store behind it (Q03) */
  | 'storeroom'
  /** Liron's repair workshop behind the phone shop on Allenby, 2006 (H03) */
  | 'workshop'
  /** an arrival terminal in Europe (F02; E05) */
  | 'port-europe'
  /** outside a hall in Europe (F03, F04) */
  | 'arena-out'
  /** the seats of the same hall (F03) */
  | 'arena-seats'
  /** a rented flat abroad (X02, X03, X05, Q05) */
  | 'flat-abroad'
  // --- the city, 27.9.2026 — the backgrounds pack and the approved folder, as places ------
  // Persisted identifiers (rule 35). Rooms in `lib/life/world/city2027/`.
  /** Teddy, the away end, 2010 (the title decided on the road) */
  | 'teddy'
  /** Salzburg, the away section, August 2010 */
  | 'away-salzburg'
  /** Lisbon, Estádio da Luz, the away section, September 2010 */
  | 'away-lisbon'
  /** Lyon, Gerland, the away section, December 2010 */
  | 'away-lyon'
  /** Jaffa: Jerusalem Boulevard and the clock tower, 2000s–2020s */
  | 'jaffa'
  /** a Jaffa alley with a café — where people meet who do not want an office */
  | 'jaffa-alley'
  /** Jerusalem Boulevard before the shutters open */
  | 'jaffa-boulevard'
  /** the promenade, Tel Aviv–Jaffa, by the sea */
  | 'promenade'
  /** the big arena, from the seats, 2025 */
  | 'menora'
  /** inside Bloomfield, the stairs up to the gate-5 stand, 1990s–2015 */
  | 'gate5-stand'
  /** under the stand at Bloomfield, the vendors and the turnstiles, 1980s–1990s */
  | 'undercroft'
  /** a "Dan" bus shelter, 1980s–1990s */
  | 'bus-stop'


/**
 * מי — a character is a string, deliberately.
 *
 * The old union `'kobi' | 'rachel' | 'ofir'` meant every new person in 1996 was an edit
 * to a type the whole engine depends on. A character is now an ID registered in
 * `lib/life/characters.ts`; adding somebody is adding a row.
 */
export type CharacterId = string

/** Kept as a name for the same thing, so existing content reads unchanged. */
export type BondId = CharacterId

/**
 * The quiet numbers of the first pass. They are never printed on screen and the only
 * way a player learns one moved is that somebody behaved differently.
 *
 * They are now a WRITING SURFACE rather than the model: each one maps onto a
 * personality axis or a Red Heart dimension (see `TRAIT_ROUTE` below), so authored
 * content keeps its vocabulary while the systems underneath got real.
 */
export type TraitId =
  | 'independence'
  | 'courage'
  | 'knowledge'
  | 'streetSmarts'
  | 'responsibility'
  | 'footballAffinity'
  | 'basketballAffinity'
  | 'cultureAffinity'

/** Small, physical, period. No RPG loot. */
export type ItemId =
  | 'house-key'
  | 'coin'
  | 'newspaper'
  | 'football-card'
  | 'bottle'
  | 'folded-paper'
  | 'ticket-stub'
  | 'scarf'
  // --- 1990 ---
  | 'transistor'
  | 'promotion-table'
  | 'pocket-money'
  // --- 1991, and every one of them is a piece of paper or a piece of rubbish ---
  | 'school-note'
  | 'hall-ticket'
  | 'score-paper'
  | 'wrapper'
  | 'clipping'

/** A flag is a thing that happened once and can never un-happen. */
export type FlagId = string

/** What ends up in the red box. A memory is a save you can look at. */
export type Memory = {
  id: string
  /** the item it is made of, so the bedroom knows what to draw */
  item: ItemId
  /** minutes-since-midnight on the day it was kept */
  atMinute: number
  year: number
  /** canonical anchor this memory is attached to, if any — an ID, never a fact */
  anchorId: string | null
}

export type PlayerIdentity = {
  name: string
  /** the architecture supports both from day one; Stage A ships one figure */
  sex: 'boy' | 'girl'
  birthYear: number
}

// ---------------------------------------------------------------------------------
// RESOURCES — three things you spend, and every one of them is felt in 1986.
// ---------------------------------------------------------------------------------

export type ResourceState = {
  /** אגורות, so no float ever touches money */
  money: number
  /** 0..100; walking is free, running and playing are not */
  energy: number
  /** minutes left before the thing you are trying to reach stops mattering */
  availableTime: number
}

// ---------------------------------------------------------------------------------
// WELLBEING — never a bar on the HUD. It changes what people say to you.
// ---------------------------------------------------------------------------------

export type WellbeingState = {
  happiness: number
  stress: number
  loneliness: number
  belonging: number
  exhaustion: number
  regret: number
}

export type WellbeingId = keyof WellbeingState

export const WELLBEING_IDS: readonly WellbeingId[] = [
  'happiness',
  'stress',
  'loneliness',
  'belonging',
  'exhaustion',
  'regret',
]

// ---------------------------------------------------------------------------------
// PERSONALITY — no morality. High is not good. It emerges from repetition.
// ---------------------------------------------------------------------------------

export type PersonalityState = {
  independence: number
  courage: number
  responsibility: number
  reliability: number
  empathy: number
  streetSmarts: number
  curiosity: number
  impulsiveness: number
  stubbornness: number
  sociability: number
  riskTolerance: number
  /**
   * כנות — the twelfth axis, and the one the life spec asked for by name.
   *
   * It is NOT `reliability`. Reliability is whether you do what you said you would;
   * honesty is whether what you said was true, and the two come apart constantly — a
   * boy who always shows up and always shades the story is high on one and low on the
   * other, and 1990 is a chapter about exactly that difference. The spec's own action
   * table separates them the same way: `KEEP_PROMISE` pays responsibility, `TELL_LIE`
   * costs honesty, and `LIE_DISCOVERED` costs the other person's trust and nothing of
   * yours — because a lie nobody caught did not change what anyone thinks of you, it
   * changed what you are.
   */
  honesty: number
}

export type PersonalityId = keyof PersonalityState

export const PERSONALITY_IDS: readonly PersonalityId[] = [
  'independence',
  'courage',
  'responsibility',
  'reliability',
  'empathy',
  'streetSmarts',
  'curiosity',
  'impulsiveness',
  'stubbornness',
  'sociability',
  'riskTolerance',
  'honesty',
]

// ---------------------------------------------------------------------------------
// SKILLS — the difference between knowing and wanting, and it has a price.
//
// The spec (16.9.2026) names five, and they are deliberately NOT personality: an axis
// of personality says how you tend to act, a skill says what you are actually able to
// do. A boy can be endlessly curious and unable to write a paragraph anybody would
// print; those are `curiosity` 80 and `communication` 6, and a model with one number
// for both cannot tell the story the nineties chapters are about.
//
// They are what the seven routes gate on. `routes.ts` reads `skills.organization` for
// ULTRAS, `skills.communication` for JOURNALIST, `skills.business` for OWNER,
// `skills.creativity` for CREATOR, and nothing anywhere gates on a personality axis —
// because the spec is explicit that character does not decide who is allowed to live a
// particular life: *"אין סף אופי שמחליט מי רשאי לחיות חיים מסוימים"*. Courage 20 leads
// through preparation and a partner; courage 80 walks up and asks. Both arrive.
// ---------------------------------------------------------------------------------

export type SkillState = {
  knowledge: number
  communication: number
  organization: number
  business: number
  creativity: number
}

export type SkillId = keyof SkillState

export const SKILL_IDS: readonly SkillId[] = [
  'knowledge',
  'communication',
  'organization',
  'business',
  'creativity',
]

// ---------------------------------------------------------------------------------
// REPUTATION — five audiences, and a number that cannot move until somebody KNOWS.
//
// This is the one system in the game whose whole design is a refusal. A skill improves
// the moment you do the thing; a reputation does not, because reputation is not a
// property of you — it is a property of what a particular group of people has heard.
// The spec states it as a rule: *"REP_* עולה רק כשהקהל המוגדר ראה/קיבל דיווח מאומת על
// הפעולה. אם אין עדים, העלייה ממתינה באירוע ידיעה; הכישור עצמו יכול להשתפר מיד."*
//
// So earning and hearing are two events. `reputation.earned` puts a claim in `pending`
// with the audience it is owed to; `reputation.heard` is what pays it out. A night of
// work nobody saw makes you better at the work and changes nothing about how the gate
// speaks to you — until the morning somebody tells them.
//
// **Six audiences, not one number, and that is the whole point.** The spec is explicit
// that `rep_public` may not serve both terrace fame and a supplier's trust: *"אלה
// קהלים שונים."* A man the whole of gate 5 would follow can be a stranger at
// Ussishkin, and a journalist the city reads can be nobody in the away end.
//
// ---------------------------------------------------------------------------------
// **`international` הוא השישי, והוא נוסף ב-20.9.2026 בגלל שאלה שנשאלה ותשובה שניתנה.**
//
// תסריט ההמשך 2000–2026 כותב `אמון קהילה: {"international": 4}`, ושלושת הקהלים האחרים
// שבו התמפו לקיימים (`terrace→gate5`, `basketball→ussishkin`, `media→public`). הרביעי
// לא, והוא הושאר בחוץ ודווח במקום להיות מקופל לתוך `public` — כי לקפל קהל לתוך
// "הציבור" היא טענה על מי שמע, ולא תרגום.
//
// מאור ענה (20.9.2026): *"המטרה היא קהלים בינלאומיים שמזוהים עם ארגון ANTIFA, כמו
// סט פאולי."* זו תשובה שמחייבת קהל משלו ולא קיפול: יציע בהמבורג שמכיר אותך אינו
// "הציבור" הישראלי בשום מובן, והוא גם אינו שער 7 — **שער 7 הוא האוהדים שלנו בחוץ;
// זה אוהדים של מישהו אחר שעומדים אִתנו.** אלה שני דברים שהמשחק הזה מקפיד להפריד.
//
// כלל 18: מאור הוא מקור על מה שהיציע מרגיש וזוכר, וזה בדיוק סוג האמירה הזאת.
// ---------------------------------------------------------------------------------

export type ReputationAudience = 'gate7' | 'gate5' | 'ussishkin' | 'public' | 'work' | 'international'

export const REPUTATION_AUDIENCES: readonly ReputationAudience[] = [
  'gate7',
  'gate5',
  'ussishkin',
  'public',
  'work',
  'international',
]

/** מה שממתין שמישהו ידע — an earned claim that has not been witnessed yet. */
export type PendingReputation = {
  /** the action that earned it, so the same deed can never be paid twice */
  proofId: string
  audience: ReputationAudience
  delta: number
  /** the chapter it was earned in — a claim does not expire, but it is dated */
  chapter: string
}

export type ReputationState = {
  standing: Record<ReputationAudience, number>
  pending: PendingReputation[]
}

// ---------------------------------------------------------------------------------
// PROOF — evidence, recorded once, never twice.
//
// `proof_id` in the spec is an idempotency key with a story attached: the same deed is
// counted once in a run, a replay for practice does not write to the same history, and
// a route's "two proof missions in two different chapters" can be CHECKED rather than
// trusted. A proof is what makes a route's apex an argument instead of a claim.
// ---------------------------------------------------------------------------------

export type ProofRecord = {
  /** e.g. `leadership_proof`, `verified_report`, `paid_shift` — the spec's own vocabulary */
  kind: string
  /** unique per run; the same id never lands twice */
  proofId: string
  chapter: string
  year: number
  /** the subject, where one exists: a person, a work, a journey */
  subjectHe?: string
  /** where it happened, for the page that prints it */
  noteHe?: string
}

// ---------------------------------------------------------------------------------
// RED HEART — the permanent identity system. Not a fan level.
// ---------------------------------------------------------------------------------

export type RedHeartState = {
  footballLove: number
  basketballLove: number
  troubleAffinity: number
  professionalFootball: number
  community: number
  terraceCulture: number
  travelDrive: number
  historyMemory: number
  familyTradition: number
  loyaltyReturn: number
}

export type RedHeartId = keyof RedHeartState

export const RED_HEART_IDS: readonly RedHeartId[] = [
  'footballLove',
  'basketballLove',
  'troubleAffinity',
  'professionalFootball',
  'community',
  'terraceCulture',
  'travelDrive',
  'historyMemory',
  'familyTradition',
  'loyaltyReturn',
]

// ---------------------------------------------------------------------------------
// RELATIONSHIPS — one number was a lie. Somebody can be your whole world and not
// trust you at all, and 1986 needs to be able to say so.
// ---------------------------------------------------------------------------------

export type RelationshipState = {
  bond: number
  trust: number
  familiarity: number
  sharedHistory: number
  tension: number
  distance: number
  /** minutes-since-midnight of the last thing that mattered, within the chapter's day */
  lastMeaningfulContact?: number
}

export type RelationshipAxis = keyof Omit<RelationshipState, 'lastMeaningfulContact'>

export const RELATIONSHIP_AXES: readonly RelationshipAxis[] = [
  'bond',
  'trust',
  'familiarity',
  'sharedHistory',
  'tension',
  'distance',
]

/**
 * זיכרון של מישהו אחר — what a person remembers you doing.
 *
 * Not a scene flag. A flag says the world changed; this says *somebody* changed their
 * mind about you, and it is queryable by any later conversation in any later decade:
 * did the player lie to Kobi, keep a promise, walk away from Ofir.
 */
export type RelationshipMemory = {
  characterId: CharacterId
  eventId: string
  significance: 'minor' | 'notable' | 'major'
  year: number
  atMinute: number
}

// ---------------------------------------------------------------------------------
// RED BOX — the objects a life keeps.
// ---------------------------------------------------------------------------------

export type RedBoxRarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'unique_memory'

export type RedBoxItem = {
  id: string
  year: number
  atMinute: number
  sourceEventId: string
  titleHe: string
  noteHe?: string
  /** the item it is physically made of, so the box can draw it */
  item: ItemId
  rarity: RedBoxRarity
}

// ---------------------------------------------------------------------------------
// OPPORTUNITIES — several things worth doing, one afternoon.
// ---------------------------------------------------------------------------------

export type OpportunityStatus = 'open' | 'taken' | 'missed'

export type OpportunityRuntimeState = {
  id: string
  status: OpportunityStatus
  /** minute it was first offered to the player, for the log and the profile */
  offeredAt: number
  resolvedAt?: number
}

// ---------------------------------------------------------------------------------
// RANDOMNESS — reproducible, stored, and never applied to history.
// ---------------------------------------------------------------------------------

export type SeededRandomState = {
  seed: string
  cursor: number
}

export type HistoricalMemoryState = {
  attended: string[]
  missed: string[]
}

// ---------------------------------------------------------------------------------
// STAGE B — the decade's four persistent surfaces (brief §4). Typed, folded, migratable:
// a save written before they existed folds to their defaults, and a dialogue line reads
// them instead of a hundred flags.
// ---------------------------------------------------------------------------------

/**
 * שער 7 / שער 5 — where he stands when the people he loves split apart.
 *
 * `between` is a temporary state and never a consequence-free permanent answer;
 * `outside` is valid after fear or exhaustion and is not a game-over. The HISTORY is
 * stored, not only the identity, so a later decade can author a move into or out of
 * Gate 5 and the game can say when and why.
 */
export type GateIdentity = 'gate7' | 'gate5' | 'between' | 'outside'
export type GateReason = 'family' | 'friends' | 'closure' | 'culture' | 'conflict' | 'safety' | 'return'
export type GateHistoryEntry = { from: GateIdentity; to: GateIdentity; year: number; reason: GateReason }
export type GateState = { identity: GateIdentity; history: GateHistoryEntry[] }

/** הצבא — attendance now spends institutional trust. */
export type ArmyRoute = 'trusted' | 'negotiator' | 'rebellious' | 'punished' | 'detached'
export type ArmyState = {
  route: ArmyRoute
  commanderTrust: number
  leaveDebt: number
  fatigue: number
  missedAnchors: string[]
  coveredForOthers: number
}
export type ArmyGauge = 'commanderTrust' | 'leaveDebt' | 'fatigue' | 'coveredForOthers'

/** המוסד — distinct positions, never one loyalty number. */
export type SinaiStance = 'defending' | 'doubting' | 'broken' | 'reconciled-memory'
export type InstitutionState = {
  sinai: SinaiStance
  footballOwnershipTrust: number
  basketballOwnershipTrust: number
  protestEscalation: number
  legalUnderstanding: number
  ussishkinWound: number
  /** the prehistory of Hapoel Ussishkin — a seed, never a founding, in this stage */
  supporterOwnershipSeed: number
}
export type InstitutionGauge = Exclude<keyof InstitutionState, 'sinai'>

/** נוכחות — "missed" is a route, not empty content. */
export type PresenceMode =
  | 'inside'
  | 'late'
  | 'outside'
  | 'radio'
  | 'television'
  | 'army'
  | 'working'
  | 'heard-from-friend'
  /**
   * בדרך — heard it moving, out of somebody else's radio, on a road, before anybody
   * involved has stopped driving. Stage B §7 B4 asks for this as a real presence and not
   * as flavour: a boy on a coach north who learns the result an hour and a half from
   * anywhere was neither inside, nor late, nor at home by a radio.
   */
  | 'travelling'
  | 'archive-later'

/** השרוכים — a permanent character mark from 2.5.1998, never a bonus class. */
export type LacesResponse = 'witness' | 'protector' | 'organizer' | 'avenger' | 'withdrawn' | 'unresolved'

export function blankGate(): GateState {
  return { identity: 'gate7', history: [] }
}
export function blankArmy(): ArmyState {
  return { route: 'negotiator', commanderTrust: 50, leaveDebt: 0, fatigue: 0, missedAnchors: [], coveredForOthers: 0 }
}
export function blankInstitution(): InstitutionState {
  return {
    sinai: 'defending',
    footballOwnershipTrust: 50,
    basketballOwnershipTrust: 50,
    protestEscalation: 0,
    legalUnderstanding: 0,
    ussishkinWound: 0,
    supporterOwnershipSeed: 0,
  }
}

// ---------------------------------------------------------------------------------

export type LifeState = {
  /** the shape of this object, not the shape of the save file */
  readonly schemaVersion: 2

  readonly identity: PlayerIdentity
  year: number
  /** age in whole years at `year` */
  age: number
  /** 0 = Sunday … 6 = Saturday, the Israeli week */
  weekday: number
  /** minutes since midnight */
  minute: number

  /** אגורות — the same number `resources.money` carries, kept for the old surface */
  agorot: number
  /** 0..100 — the same number `resources.energy` carries */
  energy: number
  resources: ResourceState

  location: LocationId

  wellbeing: WellbeingState
  personality: PersonalityState
  redHeart: RedHeartState

  /** legacy single-number bonds; mirrors `relationships[id].bond` */
  bonds: Record<BondId, number>
  relationships: Record<CharacterId, RelationshipState>
  relationshipMemory: RelationshipMemory[]

  /** legacy traits; every one of them routes into personality or the Red Heart */
  traits: Record<TraitId, number>

  inventory: Partial<Record<ItemId, number>>
  flags: Record<FlagId, boolean | string | number>
  memories: Memory[]
  redBox: RedBoxItem[]

  opportunities: OpportunityRuntimeState[]
  /** encounter id → minute it last fired, so a pool can hold a cooldown */
  encounters: Record<string, number>
  rng: SeededRandomState

  /** canonical anchor IDs — never a match description */
  attendedAnchors: string[]
  missedAnchors: string[]

  /**
   * הכסף של הילד — savings, which are not pocket money (Stage A §5).
   *
   * The tin under the bed. It survives a day transition and it is what the first shirt
   * is bought with.
   *
   * **This doc block used to say `agorot` "is emptied by every year and every day".**
   * That stopped being true on 16.9.2026 (rule 68, and Maor's own sentence: *"הארנק לא
   * מתאפס בסיום משימה אלא ממשיך איתך"*). Both pockets now carry. The difference between
   * them survives the change and is the point: `agorot` is what is in a hand and every
   * `minAgorot` condition in the game can see it; `savings` is a second pocket no
   * condition can see at all, which is exactly why `goalA4` could once send a boy to a
   * counter that would refuse him.
   */
  savings: number
  /**
   * חוב — what he owes, in agorot, and it is not negative money.
   *
   * It is its own field because it behaves nothing like a pocket: a wallet at zero is a
   * boy with no money, a debt at zero is a boy who owes nobody, and folding the second
   * into the first as a negative would make "broke" and "in the clear" the same state.
   * The spec gates OWNER's apex on *"ללא חוב שהגיע זמנו ולא הוסדר"* — a question about
   * this number and about nothing else.
   *
   * Floors at zero, like money. A chapter that tries to forgive more than is owed has a
   * bug the clamp makes visible in a test.
   */
  debt: number
  /** what he OWNS — `shirt:1985` and whatever a later summer adds. Survives every day. */
  clothing: string[]
  /**
   * כישורים — what he can actually do. See `SkillState`.
   *
   * Additive: a save written before 16.9.2026 has no `skills` key at all, and folds into
   * the blank set the same way `redHeart` folded into a save from before the systems
   * pass. The log always recorded what happened; a richer reducer reads the same rows.
   */
  skills: SkillState
  /** מוניטין — five audiences, and a claim that waits until somebody knows. */
  reputation: ReputationState
  /** ראיות — every `proof_id` this run has recorded, once each */
  proofs: ProofRecord[]
  /** which of Stage A's eight days is being played, when one of them is */
  stageADay?: string

  /** the chapter the runtime should be showing */
  chapter: string
  /** true once the chapter's closing beat has played */
  chapterDone: boolean
  /** the day's date as the chapter names it ('16.11.1996', 'נובמבר 1996'); null = the anchor's date */
  dateHe: string | null

  // --- Stage B (version 4) — folded from their own events, defaulted for old saves ---
  gate: GateState
  army: ArmyState
  institution: InstitutionState
  /** anchor id → how he was present for it. Attended/missed still fold beside it. */
  presence: Record<string, PresenceMode>
  laces: LacesResponse | null
  /**
   * פעילויות — what the gate games played inside the life left behind (21.9.2026).
   *
   * Additive, like `skills` was: a save from before it folds to `{}`. Folded from
   * `activity.completed` rows, so the log still says what happened and this only counts it.
   */
  activities: Record<string, ActivityRecord>

  // --- Performed Missions (delta 91, 25.9.2026) — additive; an old save folds to blanks ---
  /**
   * עבודה כהקשר, לא כמערכת (MASTER §24). Four optional fields and nothing else: everything
   * else about work is DERIVED (`lib/life/work.ts`). A save from before folds to `{}` and
   * `resolveWorkProfile` infers the rest from routes and evidence.
   */
  work: WorkState
  /**
   * עייפות מכניקה (MASTER §47) — the last mechanics played and the last mission kinds done,
   * newest last, capped at `RECENT_CAP`. Folded from `activity.completed` / `mission.completed`
   * rows, so an old log grows them on read; never written directly.
   */
  recentMechanics: string[]
  recentMissionKinds: string[]
  /** משימות שבוצעו — one row per mission per chapter (`mission.completed`), idempotent */
  missions: MissionRecord[]
  /**
   * מה שנשאר ביד — a crafted thing the world shows again (MASTER §44): keyed by the
   * mission's `outputId` (`stand:banner`, `pugi:fan-shirt`); the latest kept wins.
   */
  outputs: Record<string, KeptOutput>
}

export type ProfessionId = 'media' | 'organization' | 'business' | 'creative' | 'technical' | 'international' | 'general'

export type WorkState = {
  profession?: ProfessionId
  mode?: 'regular' | 'freelance' | 'selfEmployed' | 'betweenJobs'
  responsibility?: 'help' | 'own' | 'coordinate' | 'lead'
  workplaceId?: string
}

export type MissionRecord = {
  id: string
  chapter: string
  year: number
  /** the tier the room reacted to */
  tier: string
  /** the mission's kind — `supporterCraft:banner`, `microAssign` — what fatigue reads */
  kind: string
}

/**
 * A kept output is small by construction: `data` is a normalised `CraftOutput` (0..1
 * coordinates, three decimals, capped marks and points — `lib/life/callbacks.ts` clamps it
 * before the event is written), never a picture and never a pointer trail.
 */
export type KeptOutput = {
  outputId: string
  missionId: string
  chapter: string
  year: number
  /** the engine's own measure of the target, 0..1 — the world picks a tier off it */
  measure: number
  data: CraftOutput
}

/** the fatigue window — "last 5–8" (MASTER §47) */
export const RECENT_CAP = 8

export function blankWork(): WorkState {
  return {}
}

/**
 * One activity across a whole life: how often, how well, what it was last, which archive
 * rows it has already paid for (`seen` — a lineup is money once), and the opinions it kept
 * (a poll question → the pick; a chapter → the XI built with Kobi). Survives every day and
 * every year, because it is a biography and not an afternoon.
 */
export type ActivityRecord = {
  runs: number
  /** best score, 0..100 */
  best: number
  lastChapter: string
  lastTier: string
  seen: string[]
  answers: Record<string, string>
}

export const BOND_IDS: readonly BondId[] = ['kobi', 'rachel', 'ofir', 'amit', 'efi', 'keren']

export const TRAIT_IDS: readonly TraitId[] = [
  'independence',
  'courage',
  'knowledge',
  'streetSmarts',
  'responsibility',
  'footballAffinity',
  'basketballAffinity',
  'cultureAffinity',
]

/**
 * The old vocabulary, routed into the new model.
 *
 * Content written before this pass says `trait: 'footballAffinity'`. That sentence is
 * still the right sentence — it is what the scene means — so instead of rewriting a
 * hundred lines of dialogue, the reducer reads this table and moves the Red Heart. New
 * content can address either surface; both end up in the same place.
 */
export const TRAIT_ROUTE: Record<
  TraitId,
  { personality?: PersonalityId; redHeart?: RedHeartId; skill?: SkillId }
> = {
  independence: { personality: 'independence' },
  courage: { personality: 'courage' },
  responsibility: { personality: 'responsibility' },
  streetSmarts: { personality: 'streetSmarts' },
  /**
   * `knowledge` הוא הכניסה היחידה שמזינה שני מודלים, וזה מכוון.
   *
   * It has routed to `personality.curiosity` since the systems pass, and a hundred lines
   * of authored dialogue say `trait: 'knowledge'` meaning "he wanted to find out". That
   * is still what those lines mean, so the personality leg does not move — an old save
   * folds to the identical curiosity it always folded to.
   *
   * What it gains is the second leg. The spec's `skills.knowledge` is what JOURNALIST's
   * apex reads (`knowledge>=55`), and a boy who spent fifteen years asking questions HAS
   * accumulated that; making him start the nineties at zero because the field is new
   * would be the `efi` bug again — a threshold calibrated against a scale nothing fills.
   * Routing both is what lets the existing content pay into the new system without one
   * line of dialogue being rewritten.
   *
   * No other trait routes to a skill. The other four are dispositions.
   */
  knowledge: { personality: 'curiosity', skill: 'knowledge' },
  footballAffinity: { redHeart: 'footballLove' },
  basketballAffinity: { redHeart: 'basketballLove' },
  cultureAffinity: { redHeart: 'terraceCulture' },
}

/** אפס בכל הכישורים — a life that has not learned to do anything yet. */
export function blankSkills(): SkillState {
  return { knowledge: 0, communication: 0, organization: 0, business: 0, creativity: 0 }
}

/**
 * מוניטין ריק — nobody has heard of him, and nothing is owed to him.
 *
 * Every audience opens at zero, unlike a relationship, which opens at a baseline for
 * people he was born knowing. There is no audience anybody is born known to.
 */
export function blankReputation(): ReputationState {
  return {
    standing: { gate7: 0, gate5: 0, ussishkin: 0, public: 0, work: 0, international: 0 },
    pending: [],
  }
}

/** Bonds and traits are 0..100 and clamp rather than throw. A life does not overflow. */
export function clamp(value: number, low = 0, high = 100): number {
  return Math.max(low, Math.min(high, value))
}

/** A relationship that has never happened yet: known to nobody, owed to nobody. */
export function blankRelationship(bond = 0): RelationshipState {
  return {
    bond,
    trust: bond > 0 ? Math.round(bond * 0.6) : 0,
    familiarity: bond > 0 ? Math.round(bond * 0.8) : 0,
    sharedHistory: 0,
    tension: 0,
    distance: bond > 0 ? 0 : 40,
  }
}

export function relationshipOf(state: LifeState, who: CharacterId): RelationshipState {
  return state.relationships[who] ?? blankRelationship(state.bonds[who] ?? 0)
}

export function bondOf(state: LifeState, who: CharacterId): number {
  return state.bonds[who] ?? 0
}

/** A flag can now hold a value; `hasFlag` is still the common question. */
export function flagOn(state: LifeState, flag: FlagId): boolean {
  const value = state.flags[flag]
  return value === true || (typeof value === 'number' && value > 0) || (typeof value === 'string' && value.length > 0)
}
