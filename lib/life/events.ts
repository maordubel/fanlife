import { learnedOnArrival } from './world/areas'
import {
  blankArmy,
  blankGate,
  blankInstitution,
  blankRelationship,
  blankReputation,
  blankSkills,
  blankWork,
  clamp,
  RECENT_CAP,
  RELATIONSHIP_AXES,
  TRAIT_ROUTE,
  type KeptOutput,
  type ProofRecord,
  type WorkState,
  type ReputationAudience,
  type SkillId,
  type BondId,
  type CharacterId,
  type FlagId,
  type ItemId,
  type LifeState,
  type LocationId,
  type Memory,
  type PersonalityId,
  type PlayerIdentity,
  type RedBoxItem,
  type RedHeartId,
  type RelationshipAxis,
  type RelationshipMemory,
  type TraitId,
  type WellbeingId,
  type ArmyGauge,
  type ArmyRoute,
  type GateIdentity,
  type GateReason,
  type InstitutionGauge,
  type LacesResponse,
  type PresenceMode,
  type SinaiStance,
} from './types'

/**
 * יומן החיים — the append-only log a life is made of.
 *
 * The save file is not a snapshot of `LifeState`; it is the ORDERED LIST OF THINGS THAT
 * HAPPENED, and the state is what you get by folding it. That choice costs nothing today
 * and buys three things the brief asks for by name:
 *
 *  · **Migration without a rewrite.** Moving to Supabase later is inserting the same
 *    rows into a table. A snapshot save would have to be reverse-engineered into events.
 *  · **A biography, not a score.** "You went to Bloomfield alone at eight" is a row in
 *    this log. A `LifeState` with `independence: 34` has thrown that away.
 *  · **Forward compatibility.** An unknown event type from a newer build folds to a
 *    no-op instead of corrupting a save, which is what `apply`'s default branch is for.
 *
 * It also buys the whole of the systems pass for free. A save written before the Red
 * Heart existed contains `trait.shifted` rows; the reducer that reads them now moves a
 * Red Heart dimension as well. Nothing had to be migrated, because nothing was stored
 * that had to be converted — only things that happened, read by a reducer that now knows
 * more about what they mean.
 *
 * Every event is small, past-tense and self-describing. Nothing here computes; the
 * reducer is the only place a number changes, so there is exactly one story about how
 * a life got the way it is.
 */
export type LifeEvent =
  | { t: 'life.started'; identity: PlayerIdentity; year: number; weekday: number; minute: number; seed?: string }
  | { t: 'clock.advanced'; minutes: number }
  | { t: 'moved'; to: LocationId }
  | { t: 'money.changed'; agorot: number; why: string }
  | { t: 'energy.changed'; delta: number }
  | { t: 'item.gained'; item: ItemId; count?: number }
  | { t: 'item.lost'; item: ItemId; count?: number }
  | { t: 'bond.shifted'; who: BondId; delta: number }
  | { t: 'trait.shifted'; trait: TraitId; delta: number }
  | { t: 'flag.raised'; flag: FlagId }
  | { t: 'flag.set'; flag: FlagId; value: boolean | string | number }
  | { t: 'memory.kept'; memory: Memory }
  | { t: 'anchor.attended'; anchorId: string }
  | { t: 'anchor.missed'; anchorId: string }
  | { t: 'chapter.entered'; chapter: string }
  | { t: 'chapter.completed'; chapter: string }
  // --- version 2 --------------------------------------------------------------------
  | { t: 'rng.seeded'; seed: string }
  | { t: 'rng.consumed'; count: number }
  | { t: 'wellbeing.changed'; key: WellbeingId; delta: number }
  | { t: 'personality.shifted'; key: PersonalityId; delta: number }
  | { t: 'redheart.changed'; key: RedHeartId; delta: number }
  | { t: 'relationship.changed'; who: CharacterId; axis: RelationshipAxis; delta: number }
  | { t: 'relationship.memory_added'; memory: RelationshipMemory }
  | { t: 'opportunity.offered'; id: string }
  | { t: 'opportunity.accepted'; id: string }
  | { t: 'opportunity.missed'; id: string }
  | { t: 'encounter.triggered'; id: string }
  | { t: 'redbox.item_added'; item: RedBoxItem }
  | { t: 'dialogue.choice_made'; conversation: string; choice: string }
  // --- version 3, Stage B ------------------------------------------------------------
  /**
   * ארבע שנים עוברות — the calendar moves, and the life does not start again.
   *
   * Everything that is HIM stays: personality, the Red Heart, every relationship and every
   * memory, the Red Box, the seed — and, since 16.9.2026, THE WALLET (see `ARNAK` at
   * `savings.changed`). Everything that is the DAY resets: the clock, the weekday, the
   * energy, the afternoon's props, the flags of an afternoon that ended. Age is arithmetic
   * off the identity, as it always was. A save that folds this event is one biography four
   * years on, not two biographies stapled together (brief §52).
   */
  | { t: 'year.entered'; year: number; weekday: number; minute: number }
  /**
   * יום — a day inside a chapter (Stage A §5).
   *
   * `year.entered` is a four-year jump: it clears the afternoon and starts a life again in
   * a new age. Stage A needs something an order of magnitude smaller — eight days across
   * three years, each of which resets a clock and an energy level and keeps everything that
   * makes the boy who he is by the eighth. So this event resets the DAY and preserves the
   * biography: bonds, memories, personality, the Red Heart, the Red Box, the savings tin,
   * **the wallet**, the clothes he owns, and every flag that describes the person rather
   * than the afternoon (`life:`, `onboard:`, `own:`, `promise:`, `cutscene:`, `prologue:`).
   */
  | {
      t: 'day.entered'
      dayId: string
      year: number
      month?: number
      day?: number
      weekday: number
      minute: number
      /** how the HUD names this day — a Stage B chapter spans weeks and the anchor's date is one of them */
      dateHe?: string
    }
  /** the tin under the bed — never the pocket */
  | { t: 'savings.changed'; agorot: number; why: string }
  /**
   * פעילות — a gate game played inside the life, and how it went (21.9.2026).
   *
   * Everything it DID (money, time, a relationship) is its own row beside it, written by
   * `lib/life/activities.ts settleActivity`; this row is the biography: which game, which
   * archive row it was about, the score, the tier the person in the room reacted to, and an
   * opinion kept (`answer`). An older build folds it to nothing, like any row it has not met.
   */
  | {
      t: 'activity.completed'
      id: string
      mechanic: string
      chapter: string
      contentId: string | null
      answer: string | null
      /** 0..100 */
      score: number
      tier: string
      /** agorot paid, for the log — the money itself is the `money.changed` beside it */
      paid: number
    }
  // --- version 5, the routes pass (16.9.2026) -----------------------------------------
  /** מה שהוא לומד לעשות — a skill improves the moment the thing is done */
  | { t: 'skill.changed'; skill: SkillId; delta: number; why: string }
  /**
   * מוניטין שהורווח ועדיין לא נשמע.
   *
   * Two events, on purpose. A deed puts a CLAIM in `reputation.pending` against one
   * named audience, and nothing in the world changes yet: the spec's rule is that
   * `rep_*` may not move before the audience has seen or been told. `reputation.heard`
   * is what pays it. A night of work nobody witnessed makes him better at the work and
   * changes nothing about how the gate speaks to him — until somebody tells them.
   */
  | { t: 'reputation.earned'; proofId: string; audience: ReputationAudience; delta: number; why: string }
  /** somebody told them — the pending claim with this `proofId` is paid out, once */
  | { t: 'reputation.heard'; proofId: string }
  /**
   * A DIRECT move, and it exists for losses.
   *
   * A breach that came out is already known by definition — that is what "came out"
   * means — so it needs no second event to witness it. Using this for a GAIN would be
   * the way round the rule above, and `tests/life-routes.test.ts` asserts no content
   * file does.
   */
  | { t: 'reputation.changed'; audience: ReputationAudience; delta: number; why: string }
  /** חוב — what he owes. Floors at zero; never negative money */
  | { t: 'debt.changed'; agorot: number; why: string }
  /** ראיה — recorded once per `proofId` in a run, so a route's apex can be checked */
  | { t: 'proof.recorded'; proof: ProofRecord }
  /**
   * הישג — זיהוי של משהו שקרה, ברגע שהוא קרה.
   *
   * It is an event and not a screen's discovery, for two reasons: the card has to appear
   * at the second the thing became true, and a life replayed from its log has to produce
   * the same cards in the same order.
   *
   * It carries NO reward payload and NO number. The reward is a row in
   * `lib/life/achievements.ts`, and the deed itself already paid — the life spec is
   * explicit: *"אין תשלום כפול בנקודות על פעולה ואז על ההישג של אותה פעולה."*
   *
   * The reducer writes it into `own:ach:<id>`, which is why nothing on `LifeState` had to
   * grow: recognition survives `day.entered` and `year.entered` on the `own:` prefix for
   * free (rule 68), and **an achievement may never un-happen.** A predicate that becomes
   * false again — a debt taken out after `ACH_BALANCE` — must not withdraw it, and a flag
   * that is only ever written once is the cheapest way to make that structurally true.
   */
  | { t: 'achievement.earned'; id: string; chapter: string; year: number }
  /** something he owns and keeps owning: `shirt:1985` */
  | { t: 'clothing.gained'; item: string }
  // --- version 4, the decade (Stage B brief §4) ---------------------------------------
  /** he changed where he stands; the reason and the year are kept with it */
  | { t: 'gate.moved'; to: GateIdentity; reason: GateReason; year: number }
  | { t: 'army.route'; route: ArmyRoute }
  | { t: 'army.changed'; key: ArmyGauge; delta: number }
  /** a match the army cost him — kept on the army, beside the life's own missed list */
  | { t: 'army.missed'; anchorId: string }
  | { t: 'institution.sinai'; stance: SinaiStance }
  | { t: 'institution.changed'; key: InstitutionGauge; delta: number }
  /** HOW he was there — folds into attended/missed as well, so old readers agree */
  | { t: 'presence.recorded'; anchorId: string; mode: PresenceMode }
  | { t: 'laces.marked'; response: LacesResponse }
  // --- delta 91, Performed Missions (25.9.2026) — every row below folds to a no-op on an older build
  /**
   * משימה שבוצעה — the authored situation around an activity, done (`settleActivity`, one
   * settlement: base effects → mission → proof → output → callback flags). Idempotent on
   * `id` + `chapter`, so a log folded twice is one mission.
   */
  | { t: 'mission.completed'; id: string; chapter: string; year: number; tier: string; kind: string }
  /**
   * מה שנשאר ביד — a crafted thing, kept under its world key (`stand:banner`). Marks in 0..1,
   * capped and rounded BEFORE this row is written (`keepOutput` in `lib/life/callbacks.ts`);
   * the reducer trusts it. The latest under a key replaces the one before.
   */
  | { t: 'output.kept'; output: KeptOutput }
  /** עבודה — a change of profession, mode, responsibility or workplace; a patch, never a replace */
  | { t: 'work.changed'; patch: Partial<WorkState> }

/** A day is 24×60. The clock wraps rather than running past midnight into nonsense. */
export const MINUTES_IN_DAY = 24 * 60

/**
 * The seed a life gets before anybody has rolled anything.
 *
 * Deterministic on purpose: two folds of the same log must produce the same state, and a
 * test that starts a life must be able to predict it. A real new game overwrites this in
 * its first event (`rng.seeded`), which is what makes two playthroughs differ while
 * keeping each of them replayable.
 */
export const DEFAULT_SEED = 'worker-1986'

export function emptyState(identity: PlayerIdentity, year: number): LifeState {
  return {
    schemaVersion: 2,
    identity,
    year,
    age: year - identity.birthYear,
    weekday: 6,
    minute: 12 * 60 + 35,
    agorot: 0,
    energy: 100,
    resources: { money: 0, energy: 100, availableTime: 0 },
    location: 'prologue',
    wellbeing: {
      happiness: 55,
      stress: 10,
      loneliness: 20,
      belonging: 25,
      exhaustion: 0,
      regret: 0,
    },
    personality: {
      independence: 5,
      courage: 10,
      responsibility: 10,
      reliability: 20,
      empathy: 25,
      streetSmarts: 5,
      curiosity: 5,
      impulsiveness: 30,
      stubbornness: 25,
      sociability: 30,
      riskTolerance: 15,
      /**
       * כנות פותחת גבוה, ולא באמצע.
       *
       * Every other axis opens where a child of five plausibly sits and grows from
       * there. Honesty is the one that starts near the top and is SPENT: a five-year-old
       * has not learned that a story can be shaded, and every `TELL_LIE` in fifteen
       * years is a withdrawal. Opening it at 50 would have made the first lie free.
       */
      honesty: 80,
    },
    redHeart: {
      footballLove: 20,
      basketballLove: 5,
      troubleAffinity: 0,
      professionalFootball: 0,
      community: 10,
      terraceCulture: 5,
      travelDrive: 5,
      historyMemory: 5,
      familyTradition: 30,
      loyaltyReturn: 0,
    },
    bonds: { kobi: 50, rachel: 50, ofir: 0 },
    relationships: {
      kobi: { ...blankRelationship(50), sharedHistory: 60, familiarity: 90, trust: 55 },
      rachel: { ...blankRelationship(50), sharedHistory: 60, familiarity: 90, trust: 60 },
      ofir: { ...blankRelationship(0), familiarity: 45, distance: 20 },
      /**
       * אפי — the friend whose whole arc was written against a baseline he never had.
       *
       * Efi is `activeEras: ['1986+']`. He is on the schedule in 1986, in the alley in
       * 1984, and the hall opportunity remembers him as `came-to-the-hall`. He is a
       * childhood friend exactly the way Ofir is — and Ofir is seeded here and Efi was
       * not, so every read of him started from `blankRelationship(0)`: a stranger, trust
       * zero, distance forty.
       *
       * That omission was invisible until `budget-audit` counted what the content can
       * actually pay. Three separate chapters gate on his TRUST — 1997 `max: 45`, 1999
       * `max: 44`, 2000 `min: 45` — and the whole game contains exactly one line that
       * raises it, by three. So all three gates were permanently on the cold side: Efi
       * drifted away in every life ever played, including the one that did everything
       * right by him, and the warm halves of those three scenes — "אני זוכר אותך על הגב
       * שלי אחרי הגביע", "אני בא איתך. אל תגיד לשחור", the embrace at the title and the
       * `life:title:efi` milestone — could not be reached by anyone.
       *
       * Numbers written as 44 and 45 are the evidence: nobody calibrates a threshold
       * against a scale whose ceiling is three. They were written for a friend sitting
       * near fifty, and this is that friend.
       */
      efi: { ...blankRelationship(0), trust: 40, familiarity: 50, distance: 15 },
    },
    relationshipMemory: [],
    traits: {
      independence: 5,
      courage: 10,
      knowledge: 5,
      streetSmarts: 5,
      responsibility: 10,
      footballAffinity: 20,
      basketballAffinity: 5,
      cultureAffinity: 5,
    },
    inventory: {},
    flags: {},
    savings: 0,
    debt: 0,
    /**
     * הכישורים פותחים באפס, ולא כמו האישיות.
     *
     * A personality axis opens where a child of five plausibly sits, because he already
     * HAS a disposition. A skill is what he can do, and at five he can do none of these
     * things — he cannot organise a meeting, write an account anybody would print, close
     * a business cycle or make a thing somebody else uses. They are filled by the
     * fifteen years the game plays, which is also what makes the routes' thresholds mean
     * something: `organization >= 70` is a life, not a starting condition.
     *
     * `knowledge` is the exception in practice rather than in the seed: it opens at zero
     * here like the rest, and `TRAIT_ROUTE` then feeds it from every `trait: 'knowledge'`
     * line already written into Stage A and Stage B.
     */
    skills: blankSkills(),
    reputation: blankReputation(),
    proofs: [],
    clothing: [],
    memories: [],
    redBox: [],
    opportunities: [],
    encounters: {},
    rng: { seed: DEFAULT_SEED, cursor: 0 },
    attendedAnchors: [],
    missedAnchors: [],
    chapter: 'prologue',
    chapterDone: false,
    dateHe: null,
    gate: blankGate(),
    army: blankArmy(),
    institution: blankInstitution(),
    presence: {},
    laces: null,
    activities: {},
    work: blankWork(),
    recentMechanics: [],
    recentMissionKinds: [],
    missions: [],
    outputs: {},
  }
}

/** The presence modes that count as having been there — the rest fold to `missed`. */
export const PRESENT_MODES: ReadonlySet<PresenceMode> = new Set(['inside', 'late'])

// ---------------------------------------------------------------------------------

function withRelationship(
  state: LifeState,
  who: CharacterId,
  change: (current: ReturnType<typeof blankRelationship>) => ReturnType<typeof blankRelationship>,
): LifeState {
  const current = state.relationships[who] ?? blankRelationship(state.bonds[who] ?? 0)
  const next = change({ ...current })
  for (const axis of RELATIONSHIP_AXES) next[axis] = clamp(next[axis])
  return {
    ...state,
    relationships: { ...state.relationships, [who]: next },
    bonds: { ...state.bonds, [who]: next.bond },
  }
}

/**
 * One event, one state. Pure, total, and tolerant of an event it has never seen —
 * a save written by a newer build must open, not explode.
 */
/**
 * מה שנשאר מהאדם — the flags that are not about this afternoon.
 *
 * `life:` is a milestone of the whole life, `onboard:` is a thing the player learned to do
 * with their thumbs, `cutscene:` is a film they have already sat through, `prologue:` is
 * where they came in — and, since Stage A, `own:` is something they OWN and `promise:` is
 * something they said they would do. The last two are the reason a promise made on one day
 * can be broken on the next: a flag that a day transition deletes is a promise nobody can
 * remember.
 */
function personFlags(flags: Record<string, boolean | string | number>): Record<string, boolean | string | number> {
  const kept: Record<string, boolean | string | number> = {}
  for (const [flag, value] of Object.entries(flags)) {
    /**
     * מה שנשאר מיום ליום — the prefixes a year does not erase.
     *
     * A chapter cut clears the day: the errand, the homework, the hour you were told to be
     * home. It may not clear the LIFE, and on 6.9.2026 an audit of the Stage B brief
     * against the code found that it was doing exactly that. Who you went to the promotion
     * with (`went:withKobi`), and the coins a stand collected so you could get on a bus
     * (`owe:group`, `owe:shachor`), were ordinary day flags — so they were gone before any
     * later chapter could ever mention them, and a decade the brief asks to be one life
     * read as ten unconnected episodes.
     *
     * Two prefixes fix the class rather than the incidents: `went:` is who you were with,
     * and `owe:` is a debt, and neither of those is true only until midnight.
     */
    if (
      flag.startsWith('life:') ||
      flag.startsWith('onboard:') ||
      flag.startsWith('cutscene:') ||
      flag.startsWith('prologue:') ||
      flag.startsWith('own:') ||
      flag.startsWith('went:') ||
      flag.startsWith('owe:') ||
      flag.startsWith('promise:') ||
      /**
       * `album:` — the Supergoal album, and the one collection in this game that is
       * explicitly ABOUT outliving the afternoon it was filled in. A page half-stuck in
       * 1986 has to still be half-stuck in 1996, or the object means nothing.
       */
      flag.startsWith('album:') ||
      /**
       * `scarf:` — הצעיף שעובר (`content/threads.ts`), חוט של 1986 → 1998 → 2000. הקובץ ההוא
       * כתב מ-7.9.2026 *"הכל דגלים תחת `scarf:`, כלומר הם שורדים החלפת שנה כמו `own:shirt:`"*
       * — והקידומת לא הייתה כאן. כלומר שני הרגעים המאוחרים של החוט שמאור ביקש לא ירו מעולם:
       * `scarf:given` נמחק ב-`year.entered` הראשון אחרי 1986. `life:worldlines` מצא את זה
       * כ-`STALE_READ` ב-21.9.2026.
       */
      flag.startsWith('scarf:')
    )
      kept[flag] = value
  }
  return kept
}

/** the last `RECENT_CAP` of a list with `next` appended — newest last */
function recent(list: readonly string[], next: string): string[] {
  return [...list, next].slice(-RECENT_CAP)
}

/**
 * שמות ישנים של דגלים — the log keeps the old spelling forever; the reducer reads it as the
 * new one too. `life:a2:efi` was "answered Efi in the A2 alley"; from 27.9.2026 Efi is met in
 * A3 (or recovered in A4), and the life-level fact is `life:efi:met`.
 */
export const LEGACY_FLAG_ALIASES: Readonly<Record<string, string>> = {
  'life:a2:efi': 'life:efi:met',
  // delta 93: Kobi no longer gives five shekels for the shirt; an old save's five stay, and
  // the flag now reads as what it also always meant — he knows about the shirt
  'a4:kobi-gave': 'a4:kobi-knows',
}

export function apply(state: LifeState, event: LifeEvent): LifeState {
  switch (event.t) {
    case 'life.started': {
      const fresh = emptyState(event.identity, event.year)
      return {
        ...fresh,
        weekday: event.weekday,
        minute: event.minute,
        rng: event.seed ? { seed: event.seed, cursor: 0 } : fresh.rng,
      }
    }

    case 'clock.advanced': {
      const total = state.minute + Math.max(0, Math.round(event.minutes))
      return {
        ...state,
        minute: total % MINUTES_IN_DAY,
        weekday: (state.weekday + Math.floor(total / MINUTES_IN_DAY)) % 7,
      }
    }

    case 'moved': {
      // The one place the retired prologue id is folded forward. A save recorded before
      // the timeline was rebased still opens, and opens in the right room.
      const to = event.to === 'prologue-1972' ? 'prologue' : event.to
      /**
       * מי שהיה שם פעם אחת יודע את הדרך — 17.9.2026.
       *
       * `learnedOnArrival` נכתב ב-7.9.2026 יחד עם כל מנגנון הנסיעה המודרכת, ואיש לא קרא
       * לו: הרעיון היה ש"אחרי שאפי לקח אותו פעם אחת, פוגי יודע את הדרך", והחצי שהופך את
       * זה מרעיון לכלל הוא השורה הזאת. בלעדיה הידע נשאר תלוי בשיחה אחת בפרק אופציונלי
       * אחד, ו-1991 ו-1993 שולחים לאולם שאין אליו דלת.
       *
       * זה גם עונה על פרק שפשוט **מתחיל** באוסישקין (1993-galil, 1997-basket,
       * 1999-basket): להתעורר במקום זו הדרך הישירה ביותר ללמוד שהוא קיים. וזה נכון בלי
       * להיות נדיב — החדרים שנספרים כאזור הם שלושה, ואף אחד מהם אינו הרחוב של הילד.
       */
      const learned = learnedOnArrival(to)
      const flags = learned && !state.flags[learned] ? { ...state.flags, [learned]: true } : state.flags
      return { ...state, location: to, flags }
    }

    case 'money.changed': {
      // Money floors at zero. A child does not carry a debt, and a scene that tries to
      // charge more than the player has has a bug the clamp makes visible in a test.
      const agorot = Math.max(0, state.agorot + Math.round(event.agorot))
      return { ...state, agorot, resources: { ...state.resources, money: agorot } }
    }

    case 'energy.changed': {
      const energy = clamp(state.energy + event.delta)
      return {
        ...state,
        energy,
        resources: { ...state.resources, energy },
        // Running yourself down is the same event as getting tired. One number moves,
        // two systems read it, and nobody has to remember to write both.
        wellbeing:
          event.delta < 0
            ? { ...state.wellbeing, exhaustion: clamp(state.wellbeing.exhaustion - event.delta * 0.6) }
            : state.wellbeing,
      }
    }

    case 'item.gained': {
      const count = event.count ?? 1
      return {
        ...state,
        inventory: { ...state.inventory, [event.item]: (state.inventory[event.item] ?? 0) + count },
      }
    }

    case 'item.lost': {
      const count = event.count ?? 1
      const left = (state.inventory[event.item] ?? 0) - count
      const inventory = { ...state.inventory }
      if (left > 0) inventory[event.item] = left
      else delete inventory[event.item]
      return { ...state, inventory }
    }

    case 'bond.shifted':
      // The old surface. It still means what it always meant, and it now also carries
      // the two axes that move with a bond in real life: you know somebody better, and
      // you stand slightly closer to them.
      return withRelationship(state, event.who, (rel) => ({
        ...rel,
        bond: rel.bond + event.delta,
        familiarity: rel.familiarity + Math.abs(event.delta) * 0.4,
        distance: rel.distance - event.delta * 0.3,
      }))

    case 'trait.shifted': {
      const route = TRAIT_ROUTE[event.trait]
      const traits = { ...state.traits, [event.trait]: clamp(state.traits[event.trait] + event.delta) }
      const personality = route.personality
        ? { ...state.personality, [route.personality]: clamp(state.personality[route.personality] + event.delta) }
        : state.personality
      const redHeart = route.redHeart
        ? { ...state.redHeart, [route.redHeart]: clamp(state.redHeart[route.redHeart] + event.delta) }
        : state.redHeart
      // The third leg, added with the routes pass: `knowledge` is the one trait that is
      // also a skill, so fifteen years of asking questions arrive in the field
      // JOURNALIST's apex reads instead of finding it at zero.
      const skills = route.skill
        ? { ...state.skills, [route.skill]: clamp(state.skills[route.skill] + event.delta) }
        : state.skills
      return { ...state, traits, personality, redHeart, skills }
    }

    case 'skill.changed':
      return {
        ...state,
        skills: { ...state.skills, [event.skill]: clamp(state.skills[event.skill] + event.delta) },
      }

    /**
     * הורווח, ועוד לא נשמע.
     *
     * Idempotent on `proofId` in BOTH directions: a claim already pending is not queued
     * twice, and a claim already paid is not re-queued. The same deed pays one audience
     * once, which is the whole reason a proof carries an id at all.
     */
    case 'reputation.earned': {
      if (state.reputation.pending.some((row) => row.proofId === event.proofId)) return state
      if (state.proofs.some((row) => row.proofId === event.proofId && row.kind === 'paid')) return state
      return {
        ...state,
        reputation: {
          ...state.reputation,
          pending: [
            ...state.reputation.pending,
            { proofId: event.proofId, audience: event.audience, delta: event.delta, chapter: state.chapter },
          ],
        },
      }
    }

    case 'reputation.heard': {
      const claim = state.reputation.pending.find((row) => row.proofId === event.proofId)
      if (!claim) return state
      return {
        ...state,
        reputation: {
          standing: {
            ...state.reputation.standing,
            [claim.audience]: clamp(state.reputation.standing[claim.audience] + claim.delta),
          },
          pending: state.reputation.pending.filter((row) => row.proofId !== event.proofId),
        },
      }
    }

    case 'reputation.changed':
      return {
        ...state,
        reputation: {
          ...state.reputation,
          standing: {
            ...state.reputation.standing,
            [event.audience]: clamp(state.reputation.standing[event.audience] + event.delta),
          },
        },
      }

    case 'debt.changed':
      // Floors at zero like money. A scene that forgives more than is owed has a bug the
      // clamp makes visible in a test rather than a boy the game owes money to.
      return { ...state, debt: Math.max(0, state.debt + Math.round(event.agorot)) }

    case 'proof.recorded':
      // Once per run, by id. A replay for practice does not write to the same history.
      if (state.proofs.some((row) => row.proofId === event.proof.proofId)) return state
      return { ...state, proofs: [...state.proofs, event.proof] }

    case 'achievement.earned': {
      // Idempotent by id, like `proof.recorded` above. The prefix is spelled out here
      // rather than imported because `events.ts` may not depend on the achievements
      // layer; `tests/life-achievements.test.ts` pins `ACH_FLAG_PREFIX === 'own:ach:'`
      // so the two literals cannot drift apart.
      const flag = `own:ach:${event.id}`
      if (state.flags[flag] !== undefined) return state
      return { ...state, flags: { ...state.flags, [flag]: event.year } }
    }

    case 'flag.raised': {
      /**
       * A flag renamed by a later design, kept true in an old log (plan §16). The save is a
       * log, so this is the migration: a life that answered Efi in the A2 alley has MET him,
       * and is never asked to meet him again in A3.
       */
      const alias = LEGACY_FLAG_ALIASES[event.flag]
      return { ...state, flags: { ...state.flags, [event.flag]: true, ...(alias ? { [alias]: true } : {}) } }
    }

    case 'flag.set':
      return { ...state, flags: { ...state.flags, [event.flag]: event.value } }

    case 'memory.kept':
      // Idempotent on id: replaying a log must not stack the same ticket stub twice.
      return state.memories.some((memory) => memory.id === event.memory.id)
        ? state
        : { ...state, memories: [...state.memories, event.memory] }

    case 'anchor.attended':
      return state.attendedAnchors.includes(event.anchorId)
        ? state
        : {
            ...state,
            attendedAnchors: [...state.attendedAnchors, event.anchorId],
            missedAnchors: state.missedAnchors.filter((id) => id !== event.anchorId),
          }

    case 'anchor.missed':
      return state.attendedAnchors.includes(event.anchorId) || state.missedAnchors.includes(event.anchorId)
        ? state
        : { ...state, missedAnchors: [...state.missedAnchors, event.anchorId] }

    case 'chapter.entered':
      return { ...state, chapter: event.chapter, chapterDone: false, dateHe: null }

    /**
     * יום חדש בתוך אותו פרק — the small transition (Stage A §5).
     *
     * Everything `year.entered` keeps, this keeps; everything it resets, this resets —
     * except the two things a childhood is actually accumulated in. The tin under the bed
     * and the shirt in the drawer are not part of an afternoon and are not cleared by one,
     * which is the whole reason the summer of 1985 can be a day about saving.
     */
    case 'day.entered':
      return {
        ...state,
        dateHe: event.dateHe ?? null,
        stageADay: event.dayId,
        year: event.year,
        age: event.year - state.identity.birthYear,
        weekday: event.weekday,
        minute: event.minute,
        energy: 100,
        resources: { ...state.resources, energy: 100, availableTime: 0 },
        // הארנק ממשיך איתו — see ARNAK below. The pocket is NOT emptied by a new day.
        inventory: {},
        flags: personFlags(state.flags),
        opportunities: [],
        encounters: {},
        wellbeing: { ...state.wellbeing, exhaustion: 0 },
      }

    /**
     * הארנק — ARNAK. Maor, 16.9.2026, when asked what to do about the shirt in A4:
     *
     *   "כל הקטע בארנק זה שהכסף צריך להישמר ולהמשיך עם הדמות. והוא מחליט מתי ואיפה ועל
     *    מה להוציא. הארנק לא מתאפס בסיום משימה אלא ממשיך איתך."
     *
     * Until that sentence both `day.entered` and `year.entered` wrote `agorot: 0`, so
     * every pocket in the game was emptied at the end of every mission — and the comment
     * above `day.entered` said it "keeps the till", which was true of `savings` (the tin
     * under the bed) and false of the pocket right beside it. The two were one word apart
     * in the same object.
     *
     * What that cost, concretely: the boy in A4 needs thirty shekels for the shirt and
     * his whole afternoon yields about twenty-two, so the chapter was only winnable at
     * all by a player who took every single agora in it and bought nothing. One Supergoal
     * packet — which the game offers on the line directly under the shirt — locked the
     * chapter's title item forever, with nothing on screen to say so. Saving across a day
     * is what turns that from a trap into the decision the chapter is named after.
     *
     * `inventory` is still cleared, and deliberately: bottles for deposit and a loaf of
     * bread are an afternoon's props, not possessions. What he OWNS survives already, by
     * its own route — `own:` flags and `clothing` (rule 58), which is why a shirt bought
     * in 1985 is still in the wardrobe in 2000.
     */
    case 'savings.changed':
      return { ...state, savings: Math.max(0, state.savings + Math.round(event.agorot)) }

    case 'clothing.gained':
      return state.clothing.includes(event.item)
        ? state
        : { ...state, clothing: [...state.clothing, event.item] }

    case 'year.entered': {
      const kept = personFlags(state.flags)
      return {
        ...state,
        year: event.year,
        age: event.year - state.identity.birthYear,
        weekday: event.weekday,
        minute: event.minute,
        dateHe: null,
        energy: 100,
        resources: { ...state.resources, energy: 100, availableTime: 0 },
        // הארנק ממשיך איתו — see ARNAK below. Years pass; the pocket is still his.
        inventory: {},
        flags: kept,
        opportunities: [],
        encounters: {},
        wellbeing: { ...state.wellbeing, exhaustion: 0, stress: Math.round(state.wellbeing.stress * 0.5) },
      }
    }

    case 'chapter.completed':
      return { ...state, chapterDone: true }

    // --- version 2 ------------------------------------------------------------------

    case 'rng.seeded':
      return { ...state, rng: { seed: event.seed, cursor: 0 } }

    case 'rng.consumed':
      return { ...state, rng: { ...state.rng, cursor: state.rng.cursor + Math.max(0, event.count) } }

    case 'wellbeing.changed':
      return {
        ...state,
        wellbeing: { ...state.wellbeing, [event.key]: clamp(state.wellbeing[event.key] + event.delta) },
      }

    case 'personality.shifted':
      return {
        ...state,
        personality: { ...state.personality, [event.key]: clamp(state.personality[event.key] + event.delta) },
      }

    case 'redheart.changed':
      return {
        ...state,
        redHeart: { ...state.redHeart, [event.key]: clamp(state.redHeart[event.key] + event.delta) },
      }

    case 'relationship.changed':
      return withRelationship(state, event.who, (rel) => ({
        ...rel,
        [event.axis]: rel[event.axis] + event.delta,
      }))

    case 'relationship.memory_added': {
      const already = state.relationshipMemory.some(
        (entry) => entry.characterId === event.memory.characterId && entry.eventId === event.memory.eventId,
      )
      if (already) return state
      const withMemory = {
        ...state,
        relationshipMemory: [...state.relationshipMemory, event.memory],
      }
      // Anything worth remembering is, by definition, meaningful contact — and a major
      // one leaves a mark on how much history the two of you have.
      return withRelationship(withMemory, event.memory.characterId, (rel) => ({
        ...rel,
        sharedHistory: rel.sharedHistory + (event.memory.significance === 'major' ? 8 : 3),
        lastMeaningfulContact: event.memory.atMinute,
      }))
    }

    case 'opportunity.offered': {
      if (state.opportunities.some((entry) => entry.id === event.id)) return state
      return {
        ...state,
        opportunities: [...state.opportunities, { id: event.id, status: 'open', offeredAt: state.minute }],
      }
    }

    case 'opportunity.accepted':
    case 'opportunity.missed': {
      const status = event.t === 'opportunity.accepted' ? 'taken' : 'missed'
      const known = state.opportunities.some((entry) => entry.id === event.id)
      const opportunities = known
        ? state.opportunities.map((entry) =>
            entry.id === event.id && entry.status === 'open'
              ? { ...entry, status, resolvedAt: state.minute }
              : entry,
          )
        : [...state.opportunities, { id: event.id, status, offeredAt: state.minute, resolvedAt: state.minute }]
      return {
        ...state,
        opportunities: opportunities as LifeState['opportunities'],
        // A missed afternoon is a real feeling and the only place the game keeps it.
        wellbeing:
          status === 'missed' ? { ...state.wellbeing, regret: clamp(state.wellbeing.regret + 4) } : state.wellbeing,
      }
    }

    case 'encounter.triggered':
      return { ...state, encounters: { ...state.encounters, [event.id]: state.minute } }

    case 'redbox.item_added':
      return state.redBox.some((entry) => entry.id === event.item.id)
        ? state
        : { ...state, redBox: [...state.redBox, event.item] }

    // --- version 4, the decade -------------------------------------------------------

    case 'gate.moved': {
      if (state.gate.identity === event.to) return state
      return {
        ...state,
        gate: {
          identity: event.to,
          history: [...state.gate.history, { from: state.gate.identity, to: event.to, year: event.year, reason: event.reason }],
        },
      }
    }

    case 'army.route':
      return { ...state, army: { ...state.army, route: event.route } }

    case 'army.changed':
      return { ...state, army: { ...state.army, [event.key]: clamp(state.army[event.key] + event.delta) } }

    case 'army.missed':
      return state.army.missedAnchors.includes(event.anchorId)
        ? state
        : { ...state, army: { ...state.army, missedAnchors: [...state.army.missedAnchors, event.anchorId] } }

    case 'institution.sinai':
      return { ...state, institution: { ...state.institution, sinai: event.stance } }

    case 'institution.changed':
      return {
        ...state,
        institution: { ...state.institution, [event.key]: clamp(state.institution[event.key] + event.delta) },
      }

    case 'presence.recorded': {
      const withMode = { ...state, presence: { ...state.presence, [event.anchorId]: event.mode } }
      // The old two lists still get written, so a reader that only knows them still agrees
      // with one that knows the mode. Being there late is being there.
      return PRESENT_MODES.has(event.mode)
        ? apply(withMode, { t: 'anchor.attended', anchorId: event.anchorId })
        : apply(withMode, { t: 'anchor.missed', anchorId: event.anchorId })
    }

    case 'laces.marked':
      // A mark, once. The first answer he gave to 2.5.1998 is the one the decade keeps;
      // `unresolved` may be overwritten because it is the absence of an answer.
      return state.laces && state.laces !== 'unresolved' ? state : { ...state, laces: event.response }

    case 'activity.completed': {
      const before = state.activities[event.id] ?? { runs: 0, best: 0, lastChapter: '', lastTier: '', seen: [], answers: {} }
      const seenRows =
        event.contentId && event.paid > 0 && !before.seen.includes(event.contentId) ? [...before.seen, event.contentId] : before.seen
      // an opinion is kept under the row it answers (a poll question) or the chapter it was built in (an XI)
      const key = event.contentId ?? event.chapter
      const answers = event.answer ? { ...before.answers, [key]: event.answer } : before.answers
      // an answered question is answered, paid or not — the poll never asks it twice
      const seenAll = event.answer && event.contentId && !seenRows.includes(event.contentId) ? [...seenRows, event.contentId] : seenRows
      return {
        ...state,
        activities: {
          ...state.activities,
          [event.id]: {
            runs: before.runs + 1,
            best: Math.max(before.best, Math.round(event.score)),
            lastChapter: event.chapter,
            lastTier: event.tier,
            seen: seenAll,
            answers,
          },
        },
        // the fatigue window (MASTER §47) — derived from the same row, so an old log grows it on read
        recentMechanics: recent(state.recentMechanics ?? [], event.mechanic),
      }
    }

    // --- delta 91, Performed Missions ------------------------------------------------

    case 'mission.completed': {
      const missions = state.missions ?? []
      if (missions.some((row) => row.id === event.id && row.chapter === event.chapter)) return state
      return {
        ...state,
        missions: [...missions, { id: event.id, chapter: event.chapter, year: event.year, tier: event.tier, kind: event.kind }],
        recentMissionKinds: recent(state.recentMissionKinds ?? [], event.kind),
      }
    }

    case 'output.kept':
      return { ...state, outputs: { ...(state.outputs ?? {}), [event.output.outputId]: event.output } }

    case 'work.changed': {
      const patch: Partial<WorkState> = {}
      // an explicit `undefined` in a patch clears nothing; only a value moves a field
      if (event.patch.profession !== undefined) patch.profession = event.patch.profession
      if (event.patch.mode !== undefined) patch.mode = event.patch.mode
      if (event.patch.responsibility !== undefined) patch.responsibility = event.patch.responsibility
      if (event.patch.workplaceId !== undefined) patch.workplaceId = event.patch.workplaceId
      return { ...state, work: { ...(state.work ?? blankWork()), ...patch } }
    }

    case 'dialogue.choice_made':
      // Recorded so the log reads as a biography rather than a diff, and so telemetry
      // and the second-playthrough test can see what was actually chosen. It changes
      // nothing on its own — every consequence is its own event.
      return state

    default:
      // An event this build does not know about. Folding it to a no-op is the whole
      // reason the save is a log: a newer chapter cannot corrupt an older reader.
      return state
  }
}

export function fold(identity: PlayerIdentity, year: number, events: readonly LifeEvent[]): LifeState {
  return events.reduce<LifeState>(apply, emptyState(identity, year))
}
