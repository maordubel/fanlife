import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CHAPTERS } from '@/lib/life/content/chapters'
import { MESSAGES } from '@/lib/i18n'
import {
  PROOF_MISSIONS,
  SMALL_ACTIONS,
  CONVERSATIONS_ROUTES,
  smallActionFlag,
  evidenceTitleHe,
} from '@/lib/life/content/routes'
import { ALL_SCENES, exitInEra, inEra } from '@/lib/life/world/scenes'
import { apply, emptyState, type LifeEvent } from '@/lib/life/events'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import {
  CONFLICT_CHOICES,
  DISTANCE_RETURN,
  DISPOSITIONS,
  FOUNDING_COMMITMENTS,
  FOUNDING_YEAR,
  LIFE_ROUTES,
  NEVER_TRIGGERS_DISTANCE,
  PERSONALITY_BACKED_CAPABILITY,
  ROUTE_STAGES,
  OFFER_CONVERSATIONS,
  ROUTES_VISIBLE_AGE,
  acceptEvents,
  capabilityOf,
  nearestRoute,
  offerConversationFor,
  offeredFlag,
  routesWorthShowing,
  stageOutOfReachFor,
  conflictEvents,
  declineEvents,
  eligibleFor,
  foundingCommitmentFlag,
  founderTitleAvailable,
  foundingWindowOpen,
  freePartnersOf,
  gapsFor,
  hasStage,
  heldStage,
  isActive,
  leaveEvents,
  mayOfferDistanceReturn,
  meetsStage,
  nextStage,
  reachableAgeCeiling,
  routeById,
  stageFlag,
  stageOutOfReach,
  type RouteId,
  type RouteStage,
} from '@/lib/life/routes'
import { PERSONALITY_IDS, SKILL_IDS, type LifeState } from '@/lib/life/types'

/**
 * שבעת המסלולים — ומה שאסור להם לעשות.
 *
 * The spec's route tables are a set of numbers, and numbers are the easy part: they are
 * copied below and a drift fails. What this suite is actually for is the four REFUSALS
 * around them, because every one of the four is the kind of rule that survives exactly
 * as long as somebody remembers it:
 *
 *  · אין סף אופי. Not one route may read a disposition. Courage 20 reaches leadership
 *    through preparation and a partner; courage 80 walks up and asks; both arrive.
 *  · זכאות היא הזמנה. Meeting a threshold changes nothing until a person says yes, and
 *    never hands over two titles at once.
 *  · מוניטין הוא מה שקהל שמע. There is no verb in the content vocabulary that raises a
 *    standing — only `proof` then `heard` — and the one verb that touches a standing
 *    directly cannot go upward however it is called.
 *  · התרחקות היא בחירה. Three signals the engine already has may never start it.
 *
 * Rule 45 is observed throughout: not one year is typed here. `FOUNDING_YEAR` comes from
 * the model and every other year comes from `CHAPTERS`.
 */

const ROOT = join(__dirname, '..')
const source = (path: string) => readFileSync(join(ROOT, path), 'utf8')

const PLAYABLE = CHAPTERS.filter((chapter) => chapter.playable !== false)
const FIRST_YEAR = PLAYABLE[0]?.year ?? 0
const LAST_YEAR = Math.max(...PLAYABLE.map((chapter) => chapter.year))
/** he is five in the prologue, so a birth year is the first chapter's year less his age */
const BIRTH_YEAR = FIRST_YEAR - 6

const identity = { name: 'פוגי', sex: 'boy' as const, birthYear: BIRTH_YEAR }

/** a life at a given AGE — the year is derived, never written */
function lifeAged(age: number, over: Partial<LifeState> = {}): LifeState {
  const base = emptyState(identity, BIRTH_YEAR + age)
  return { ...base, ...over, flags: { ...base.flags, ...(over.flags ?? {}) } }
}

const run = (state: LifeState, events: readonly LifeEvent[]): LifeState =>
  events.reduce((current, event) => apply(current, event), state)

// ---------------------------------------------------------------------------------

describe('הטבלאות — every number is the spec s own', () => {
  /**
   * A second copy of the spec's tables, on purpose.
   *
   * The registry is the thing the game runs on and this is the thing the spec says; if
   * somebody tunes a threshold in a delta, exactly one of the two moves and the suite
   * says which. That is the only kind of duplication worth having.
   *
   * `[minAge, capabilityMin, audienceMin, proofs, chapters]`, in stage order.
   */
  const SPEC: Record<string, readonly (readonly number[])[]> = {
    ULTRAS: [
      [18, 12, 10, 0, 0],
      [18, 30, 25, 2, 2],
      [25, 70, 65, 4, 4],
    ],
    JOURNALIST: [
      [18, 12, 8, 0, 0],
      [18, 30, 25, 2, 2],
      [25, 70, 60, 4, 4],
    ],
    OWNER: [
      [18, 12, 8, 0, 0],
      [21, 35, 30, 2, 2],
      [30, 75, 65, 4, 4],
    ],
    CREATOR: [
      [18, 12, 8, 0, 0],
      [18, 30, 25, 2, 2],
      [25, 70, 60, 4, 4],
    ],
    USSISHKIN_FOUNDER: [
      [18, 12, 10, 0, 0],
      [18, 30, 25, 1, 1],
      [18, 45, 40, 3, 3],
    ],
    TRAVELLER: [
      [18, 12, 8, 0, 0],
      [18, 30, 25, 2, 2],
      [25, 70, 55, 4, 4],
    ],
  }

  it('carries the six ladders, three stages each', () => {
    expect(LIFE_ROUTES).toHaveLength(6)
    for (const route of LIFE_ROUTES) {
      expect(route.stages.map((stage) => stage.stage), route.id).toEqual([...ROUTE_STAGES])
      expect(route.rewardsHe, route.id).toHaveLength(3)
    }
  })

  it('matches the spec row by row', () => {
    for (const route of LIFE_ROUTES) {
      const rows = SPEC[route.id]
      expect(rows, `${route.id} is not in the spec table`).toBeTruthy()
      route.stages.forEach((stage, index) => {
        expect(
          [stage.minAge, stage.capabilityMin, stage.audienceMin, stage.proofs, stage.chapters],
          `${route.id}/${stage.stage}`,
        ).toEqual(rows?.[index])
      })
    }
  })

  it('gives each route the audience the spec names, and never shares one by accident', () => {
    const byRoute = Object.fromEntries(LIFE_ROUTES.map((route) => [route.id, route.audience]))
    expect(byRoute).toEqual({
      ULTRAS: 'gate5',
      JOURNALIST: 'public',
      OWNER: 'work',
      CREATOR: 'public',
      USSISHKIN_FOUNDER: 'ussishkin',
      TRAVELLER: 'gate7',
    })
    // JOURNALIST and CREATOR share `public` because the spec gives both of them the same
    // readership. `work` is deliberately not it: *"לא משתמשים ב-rep_public גם לתהילת
    // אוהדים וגם לאמון ספקים: אלה קהלים שונים."*
    expect(byRoute.OWNER).not.toBe(byRoute.JOURNALIST)
  })

  it('keeps every stage on one ladder — a route asks about one capability and one audience', () => {
    for (const route of LIFE_ROUTES) {
      for (const stage of route.stages) {
        expect(stage.capability, route.id).toBe(route.capability)
        expect(stage.audience, route.id).toBe(route.audience)
      }
    }
  })

  it('carries the apex clauses the spec spells out', () => {
    const apex = (id: RouteId) => routeById(id)?.stages.find((stage) => stage.stage === 'apex')?.extra
    expect(apex('ULTRAS')?.people).toEqual({ count: 3, trustMin: 55, bondMin: 35, labelHe: 'אנשי צוות' })
    expect(apex('JOURNALIST')?.people?.count).toBe(3)
    expect(apex('JOURNALIST')?.people?.trustMin).toBe(50)
    expect(apex('JOURNALIST')?.alsoCapability).toEqual({ capability: 'knowledge', min: 55 })
    expect(apex('JOURNALIST')?.distinctSubjects).toBe(2)
    expect(apex('OWNER')?.people?.trustMin).toBe(65)
    expect(apex('OWNER')?.noOverdueDebt).toBe(true)
    expect(apex('CREATOR')?.works).toBe(4)
    expect(apex('CREATOR')?.people?.trustMin).toBe(50)
    expect(apex('USSISHKIN_FOUNDER')?.foundingCommitments).toBe(3)
    expect(apex('TRAVELLER')?.journeys).toEqual({ total: 4, domestic: 2, abroad: 1 })
    // every apex ends on something a person says, not on a counter
    for (const route of LIFE_ROUTES) expect(apex(route.id)?.explicitChoiceHe, route.id).toBeTruthy()
  })

  it('asks the entry stages for the evidence the spec names by name', () => {
    const entry = (id: RouteId) => routeById(id)?.stages.find((stage) => stage.stage === 'entry')
    expect(entry('JOURNALIST')?.needsProofKinds).toEqual(['verified_report', 'written_account'])
    expect(entry('OWNER')?.needsProofKinds).toEqual(['balanced_budget', 'adult_shift'])
    expect(entry('CREATOR')?.needsProofKinds).toEqual(['creative_work'])
  })
})

// ---------------------------------------------------------------------------------

describe('אין סף אופי שמחליט מי רשאי לחיות חיים מסוימים', () => {
  /**
   * הכלל שהכי קל לאבד, ולכן הוא נבדק משלושה כיוונים.
   *
   * The spec repeats it three times and it would go the first time somebody wanted a
   * route to "feel" like it needs nerve. A leadership gate on courage does not model
   * leadership; it models one WAY of leading, and it deletes the other one — the quiet
   * organiser who prepares and brings a partner. *"שני אנשים עם יכולת ארגון 70 יכולים
   * להיות מנהיגים שונים."*
   */
  it('names no disposition anywhere in the registry', () => {
    const text = JSON.stringify(LIFE_ROUTES)
    for (const axis of DISPOSITIONS) {
      expect(text.includes(axis), `a route gates on ${axis}`).toBe(false)
    }
  })

  it('leaves exactly one personality key a route may name, and it is the one the spec calls a skill', () => {
    // *"11 תכונות | 10 תכונות ועוד street_smarts ככישור"* — the spec's own mapping table.
    // Every other axis in `PersonalityState` is a disposition and is out of bounds.
    const allowed = new Set<string>([PERSONALITY_BACKED_CAPABILITY])
    for (const id of PERSONALITY_IDS) {
      if (allowed.has(id)) continue
      expect(DISPOSITIONS, `${id} is neither a disposition nor the one allowed capability`).toContain(id)
    }
    expect(DISPOSITIONS).toHaveLength(PERSONALITY_IDS.length - 1)
  })

  it('reads a capability that is a skill, or the one exception', () => {
    const legal = new Set<string>([...SKILL_IDS, PERSONALITY_BACKED_CAPABILITY])
    for (const route of LIFE_ROUTES) {
      for (const stage of route.stages) {
        expect(legal.has(stage.capability), `${route.id}/${stage.stage}`).toBe(true)
        const also = stage.extra?.alsoCapability?.capability
        if (also) expect(legal.has(also), `${route.id}/${stage.stage} second capability`).toBe(true)
      }
    }
  })

  it('never reads a disposition out of the state either', () => {
    // The guard above reads the data; this one reads the CODE, because a gate could be
    // written into `gapsFor` without ever appearing in the registry.
    const code = source('lib/life/routes.ts')
    for (const axis of DISPOSITIONS) {
      expect(code.includes(`personality.${axis}`), `routes.ts reads personality.${axis}`).toBe(false)
    }
    // and the one that IS read is read in exactly one place, so moving it is one change
    const reads = code.split('state.personality.streetSmarts').length - 1
    expect(reads, 'the personality-backed capability is read in more than one place').toBe(1)
  })

  it('opens the same door to two opposite people', () => {
    /**
     * הבדיקה שמסבירה את הכלל טוב יותר מכל הערה.
     *
     * Two men, identical capability and identical standing, opposite dispositions. One is
     * brave, impulsive and loud; the other is careful, quiet and unsure. The spec says
     * both arrive. If a threshold on character ever creeps in, this is the test that says
     * so in one line.
     */
    const common = {
      skills: { knowledge: 0, communication: 0, organization: 40, business: 0, creativity: 0 },
      reputation: { standing: { gate5: 30, gate7: 0, ussishkin: 0, public: 0, work: 0, international: 0 }, pending: [] },
      proofs: [
        { kind: 'leadership_proof', proofId: 'a', chapter: 'x', year: BIRTH_YEAR + 18 },
        { kind: 'leadership_proof', proofId: 'b', chapter: 'y', year: BIRTH_YEAR + 19 },
      ],
      flags: { [stageFlag('ULTRAS', 'entry')]: true },
    }
    const base = lifeAged(19, common as Partial<LifeState>)
    const bold = {
      ...base,
      personality: { ...base.personality, courage: 90, impulsiveness: 90, sociability: 90, stubbornness: 80 },
    }
    const quiet = {
      ...base,
      personality: { ...base.personality, courage: 10, impulsiveness: 5, sociability: 10, stubbornness: 10 },
    }
    expect(meetsStage(bold, 'ULTRAS', 'practice')).toBe(true)
    expect(meetsStage(quiet, 'ULTRAS', 'practice')).toBe(true)
  })
})

// ---------------------------------------------------------------------------------

describe('זכאות היא הזמנה, לא קידום', () => {
  const ready = (over: Partial<LifeState> = {}) =>
    lifeAged(19, {
      skills: { knowledge: 0, communication: 0, organization: 40, business: 0, creativity: 0 },
      reputation: { standing: { gate5: 30, gate7: 0, ussishkin: 0, public: 0, work: 0, international: 0 }, pending: [] },
      ...over,
    } as Partial<LifeState>)

  it('answers what he qualifies for and changes nothing', () => {
    const state = ready()
    const before = JSON.stringify(state)
    const offers = eligibleFor(state)
    expect(offers.length).toBeGreaterThan(0)
    expect(JSON.stringify(state), 'reading the invitations changed the life').toBe(before)
    expect(hasStage(state, 'ULTRAS', 'entry')).toBe(false)
  })

  it('offers ONE stage per route, even to somebody who meets all three', () => {
    // *"אין קפיצה אוטומטית דרך שלוש כותרות באותו טוסט."* The man below clears every
    // number of every ULTRAS stage; he is offered the first one and nothing else.
    const state = lifeAged(40, {
      skills: { knowledge: 99, communication: 99, organization: 99, business: 99, creativity: 99 },
      reputation: {
        standing: { gate5: 99, gate7: 99, ussishkin: 99, public: 99, work: 99, international: 0 },
        pending: [],
      },
    } as Partial<LifeState>)
    const forUltras = eligibleFor(state).filter((offer) => offer.route.id === 'ULTRAS')
    expect(forUltras).toHaveLength(1)
    expect(forUltras[0]?.stage).toBe('entry')
  })

  it('requires the stage before it to have been ACCEPTED, not merely earned', () => {
    const state = ready()
    // every number for practice is there, and entry was never taken
    expect(meetsStage(state, 'ULTRAS', 'practice')).toBe(false)
    expect(gapsFor(state, 'ULTRAS', 'practice').some((gap) => gap.kind === 'ladder')).toBe(true)

    const accepted = run(state, acceptEvents(state, 'ULTRAS', 'entry'))
    expect(hasStage(accepted, 'ULTRAS', 'entry')).toBe(true)
    // and now the ladder gap is gone, leaving only the evidence he has not gathered
    expect(gapsFor(accepted, 'ULTRAS', 'practice').some((gap) => gap.kind === 'ladder')).toBe(false)
  })

  it('refuses to hand over a stage he is not eligible for', () => {
    const young = lifeAged(12, {
      skills: { knowledge: 99, communication: 99, organization: 99, business: 99, creativity: 99 },
      reputation: { standing: { gate5: 99, gate7: 99, ussishkin: 99, public: 99, work: 99, international: 0 }, pending: [] },
    } as Partial<LifeState>)
    expect(acceptEvents(young, 'ULTRAS', 'entry')).toEqual([])
    expect(gapsFor(young, 'ULTRAS', 'entry').some((gap) => gap.kind === 'age')).toBe(true)
  })

  it('writes nothing when an invitation is refused, so it can be offered again', () => {
    expect(declineEvents('ULTRAS', 'entry')).toEqual([])
    const state = ready()
    const after = run(state, declineEvents('ULTRAS', 'entry'))
    expect(nextStage(after, 'ULTRAS')).toBe('entry')
    expect(eligibleFor(after).some((offer) => offer.route.id === 'ULTRAS')).toBe(true)
  })

  it('never stacks a stage already held', () => {
    const state = run(ready(), acceptEvents(ready(), 'ULTRAS', 'entry'))
    expect(acceptEvents(state, 'ULTRAS', 'entry')).toEqual([])
  })

  it('keeps a role in the history after he stands down', () => {
    // *"תפקיד שהושג נשמר בהיסטוריה גם אם עוזבים."*
    const state = ready()
    const held = run(state, acceptEvents(state, 'ULTRAS', 'entry'))
    const left = run(held, leaveEvents(held, 'ULTRAS'))
    expect(heldStage(left, 'ULTRAS'), 'the history was erased').toBe('entry')
    expect(isActive(left, 'ULTRAS')).toBe(false)
    expect(isActive(held, 'ULTRAS')).toBe(true)
  })

  it('survives a day and a year, because a title is not an afternoon', () => {
    /**
     * `own:` is the contract with `personFlags` in `events.ts`, and it is the reason the
     * ladder can be climbed at all: the apexes sit ten years above the entries, so a
     * stage flag a chapter cut deleted would make every one of them unreachable by
     * anybody, forever, while looking perfectly healthy in the source.
     */
    const state = ready()
    const held = run(state, acceptEvents(state, 'ULTRAS', 'entry'))
    const later = CHAPTERS.find((chapter) => chapter.id === '1990')
    const next = run(held, [
      { t: 'day.entered', dayId: 'x', year: held.year, weekday: 6, minute: 600 },
      { t: 'year.entered', year: later?.year ?? held.year, weekday: later?.weekday ?? 6, minute: 600 },
    ])
    expect(hasStage(next, 'ULTRAS', 'entry')).toBe(true)
    expect(stageFlag('ULTRAS', 'entry').startsWith('own:')).toBe(true)
  })
})

// ---------------------------------------------------------------------------------

describe('מוניטין הוא מה שקהל שמע', () => {
  it('gives the content vocabulary no way at all to raise a standing', () => {
    /**
     * הכלל כמילה חסרה, ולא כהערה.
     *
     * There is no `{ e: 'rep' }` and no `{ e: 'reputation' }`. The only road up is
     * `proof` (which queues) then `heard` (which pays), and the only verb that touches a
     * standing directly is `repLoss`, whose sign the runtime forces. A content file
     * cannot award itself a reputation however it is written.
     */
    const script = source('lib/life/content/script.ts')
    expect(script.includes("e: 'repLoss'")).toBe(true)
    expect(/e: 'rep(utation)?'/.test(script), 'a content verb writes a standing directly').toBe(false)
    expect(script.includes("t: 'reputation.changed'"), 'content dispatches a reputation event').toBe(false)
  })

  it('never writes `reputation.changed` from a content file', () => {
    for (const path of ['lib/life/content/routes.ts', 'lib/life/content/script.ts']) {
      expect(source(path).includes('reputation.changed'), `${path} writes a standing directly`).toBe(false)
    }
  })

  it('forces the sign in the runtime, so `repLoss` cannot be a gain', () => {
    const runtime = source('lib/life/runtime/dialogue.ts')
    // the delta is negated and capped in the same expression; a positive input cannot survive it
    expect(/delta: -Math\.min\(NEGATIVE_REPUTATION_CAP, Math\.abs\(/.test(runtime)).toBe(true)
    expect(runtime.includes('POSITIVE_REPUTATION_CAP = 5')).toBe(true)
    expect(runtime.includes('NEGATIVE_REPUTATION_CAP = 8')).toBe(true)
  })

  it('handles every route verb in the runtime — a verb with no handler is a silent no-op', () => {
    /**
     * A content file can write any verb in the union; a verb the runner does not handle
     * falls to `default` and does NOTHING, quietly, on a branch that reads perfectly. The
     * union and the switch are asserted against each other so that cannot happen.
     */
    const runtime = source('lib/life/runtime/dialogue.ts')
    const routeEventsAt = runtime.indexOf('private routeEvents(')
    const block = runtime.slice(routeEventsAt)
    for (const verb of ['skill', 'proof', 'heard', 'repLoss', 'debt', 'route', 'conflict']) {
      expect(block.includes(`case '${verb}':`), `routeEvents does not handle ${verb}`).toBe(true)
    }
    // and an encounter may leave evidence but may never hand over a title. The slice stops
    // where `routeEvents` begins, because that method sits after it in the file and its
    // own cases would otherwise answer for the walk above it.
    const outcome = runtime.slice(runtime.indexOf('private finishOutcome('), routeEventsAt)
    expect(outcome.includes("case 'route':"), 'an encounter can promote somebody').toBe(false)
    expect(outcome.includes("case 'conflict':"), 'an encounter can settle a conflict of interest').toBe(false)
    expect(outcome.includes("case 'proof':")).toBe(true)
  })

  it('leaves a capability moving and a standing still, for work nobody saw', () => {
    const state = run(lifeAged(19), [
      { t: 'skill.changed', skill: 'business', delta: 5, why: 'סגר מחזור' },
      { t: 'reputation.earned', proofId: 'business_proof:x', audience: 'work', delta: 5, why: '' },
    ])
    expect(state.skills.business, 'the work was done').toBe(5)
    expect(state.reputation.standing.work, 'and nobody has heard').toBe(0)
    expect(state.reputation.pending).toHaveLength(1)

    const told = run(state, [{ t: 'reputation.heard', proofId: 'business_proof:x' }])
    expect(told.reputation.standing.work).toBe(5)
  })

  it('pays a mission out on the spot only when the content names who saw it', () => {
    /**
     * שני חצאים של כלל אחד, נבדקים זה מול זה.
     *
     * `witnessHe` is not flavour: it is the content's answer to "was there anybody
     * there". A mission that names a witness may pay itself out; a mission that names
     * none may not, whatever a later author feels like adding to its effect list.
     */
    for (const mission of PROOF_MISSIONS) {
      const conversation = CONVERSATIONS_ROUTES.find((row) => row.id === mission.conversationId)
      expect(conversation, `${mission.id} has no conversation`).toBeTruthy()
      const text = JSON.stringify(conversation)
      const paysItself = text.includes(`"e":"heard","proofId":"${mission.kind}:{chapter}"`)
      expect(paysItself, `${mission.id}: witness ${String(mission.witnessHe)}`).toBe(Boolean(mission.witnessHe))
    }
  })

  it('has at least one mission that waits, and a conversation that pays it', () => {
    // The demonstration the whole system exists for: a month closed in an empty room.
    const waiting = PROOF_MISSIONS.filter((mission) => mission.witnessHe === null)
    expect(waiting.length).toBeGreaterThan(0)
    const everything = JSON.stringify(CONVERSATIONS_ROUTES)
    for (const mission of waiting) {
      expect(
        everything.includes(`"e":"heard","proofId":"${mission.kind}:{chapter}"`),
        `${mission.id} is earned and can never be heard — a claim nobody can ever pay`,
      ).toBe(true)
    }
  })

  it('keeps every authored reputation gain inside the spec cap', () => {
    for (const mission of PROOF_MISSIONS) expect(mission.audienceGain, mission.id).toBeLessThanOrEqual(5)
    for (const action of SMALL_ACTIONS) {
      for (const effect of action.effects) {
        if (effect.e === 'proof' && effect.delta !== undefined) {
          expect(effect.delta, action.id).toBeLessThanOrEqual(5)
          expect(effect.delta, action.id).toBeGreaterThan(0)
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------------

describe('הראיות', () => {
  it('carries the chapter in every proof id, so one mission is once a year and not once a life', () => {
    const ids: string[] = []
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) {
        for (const item of value) walk(item)
        return
      }
      if (!value || typeof value !== 'object') return
      const node = value as Record<string, unknown>
      if (node.e === 'proof' && typeof node.proofId === 'string') ids.push(node.proofId)
      if (node.e === 'heard' && typeof node.proofId === 'string') ids.push(node.proofId)
      for (const child of Object.values(node)) walk(child)
    }
    walk(CONVERSATIONS_ROUTES)
    walk(SMALL_ACTIONS.map((action) => action.effects))
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) {
      expect(id.includes('{chapter}'), `${id} is a proof id that can only ever be earned once`).toBe(true)
    }
  })

  it('gives each route a proof kind of its own', () => {
    const kinds = LIFE_ROUTES.map((route) => route.proofKind)
    expect(new Set(kinds).size, 'two routes count the same evidence').toBe(kinds.length)
    expect(kinds).toEqual([
      'leadership_proof',
      'journalism_proof',
      'business_proof',
      'creation_proof',
      'founding_proof',
      'travel_proof',
    ])
  })

  it('has a mission for every route, with the spec s costs', () => {
    for (const route of LIFE_ROUTES) {
      const mission = PROOF_MISSIONS.find((row) => row.routeId === route.id)
      expect(mission, `${route.id} has no proof mission`).toBeTruthy()
      expect(mission?.kind).toBe(route.proofKind)
      expect(mission?.capability).toBe(route.capability)
      expect(mission?.audience).toBe(route.audience)
      // every PROOF_* row in the spec's action table costs sixty minutes
      expect(mission?.minutes, mission?.id).toBe(60)
      // and the single +5 exception the spec grants a proof mission
      expect(mission?.capabilityGain, mission?.id).toBe(5)
    }
  })

  it('counts chapters, not repetitions', () => {
    const twiceInOneYear = lifeAged(19, {
      proofs: [
        { kind: 'leadership_proof', proofId: 'a', chapter: 'one', year: BIRTH_YEAR + 19 },
        { kind: 'leadership_proof', proofId: 'b', chapter: 'one', year: BIRTH_YEAR + 19 },
      ],
      skills: { knowledge: 0, communication: 0, organization: 40, business: 0, creativity: 0 },
      reputation: { standing: { gate5: 30, gate7: 0, ussishkin: 0, public: 0, work: 0, international: 0 }, pending: [] },
      flags: { [stageFlag('ULTRAS', 'entry')]: true },
    } as Partial<LifeState>)
    // the count is met and the SPAN is not — two nights in one year is not two years
    expect(gapsFor(twiceInOneYear, 'ULTRAS', 'practice').map((gap) => gap.kind)).toEqual(['chapters'])
  })
})

// ---------------------------------------------------------------------------------

describe('התרחקות וחזרה', () => {
  it('is not a ladder and is not in the registry', () => {
    expect(LIFE_ROUTES.some((route) => (route.id as string) === 'DISTANCE_RETURN')).toBe(false)
    expect(DISTANCE_RETURN.sceneOffsets).toEqual([2, 5, 8, 10])
    /**
     * **הבדיקה הזאת שונתה כי ההחלטה השתנתה, ולא כי היא הפריעה (17.9.2026).**
     *
     * It asserted the spec's four — `OWNER`, `JOURNALIST`, `CREATOR`, `TRAVELLER` — and it
     * was right about them. Maor then added a fifth by name: *"מנהיג אוהדים + אוהד שנעלם
     * וחוזר."* `ULTRAS` is in the list because he put it there, and the list is now held
     * against `ROUTE_COMBINATIONS` rather than against a literal, so the two copies of this
     * fact cannot drift apart the way a literal and a table always eventually do.
     * `USSISHKIN_FOUNDER` is still absent, and the reason matters: nobody has ruled on it,
     * which is `undecided` and not `no` — `undecidedCombinations()` is where it is listed.
     */
    expect([...DISTANCE_RETURN.coexistsWith].sort()).toEqual([...freePartnersOf('DISTANCE_RETURN')].sort())
    expect(DISTANCE_RETURN.coexistsWith).toContain('ULTRAS')
    expect(DISTANCE_RETURN.minAge).toBe(18)
  })

  it('is never started by a missed match, a low attachment or a closed tab', () => {
    /**
     * הכלל המסוכן ביותר במפרט המסלולים, ולכן הוא פונקציה ולא הערה.
     *
     * Every one of the three is a signal the engine already has, and every one of them
     * looks like a perfect trigger to somebody building a retention loop. A man who
     * missed a Saturday missed a Saturday; a man who closed the tab closed a tab. Turning
     * either into a decade away from the club is the game writing a life out of telemetry.
     */
    const grown = lifeAged(20)
    for (const reason of NEVER_TRIGGERS_DISTANCE) {
      expect(mayOfferDistanceReturn(grown, reason), `${reason} started a hiatus`).toBe(false)
    }
    expect(mayOfferDistanceReturn(grown, 'player_chose')).toBe(true)
    expect(mayOfferDistanceReturn(lifeAged(12), 'player_chose'), 'a child was offered a decade away').toBe(false)
  })

  it('has no love threshold anywhere near it', () => {
    /**
     * *"אין תנאי סף של אהבה נמוכה."*
     *
     * The guard reads for a READ of the love, not for the word: `low_attachment` is in
     * `NEVER_TRIGGERS_DISTANCE` precisely because it is refused, and a guard that failed
     * on naming the thing it forbids would be turned off within a week (the same
     * reasoning that keeps season labels out of the year scan in `life.test.ts`).
     */
    const code = source('lib/life/routes.ts')
    const block = code.slice(code.indexOf('export const DISTANCE_RETURN'), code.indexOf('export const stageFlag'))
    for (const read of ['state.redHeart', 'redHeart.', 'footballLove', 'state.wellbeing']) {
      expect(block.includes(read), `the hiatus reads ${read}`).toBe(false)
    }
    // `low_attachment` is in the block, and only as something refused
    expect(NEVER_TRIGGERS_DISTANCE).toContain('low_attachment')

    // behaviourally: two men, opposite loves, same answer
    const cold = lifeAged(20, { redHeart: { ...lifeAged(20).redHeart, footballLove: 0 } })
    const warm = lifeAged(20, { redHeart: { ...lifeAged(20).redHeart, footballLove: 100 } })
    expect(mayOfferDistanceReturn(cold, 'player_chose')).toBe(true)
    expect(mayOfferDistanceReturn(warm, 'player_chose')).toBe(true)
  })

  it('can be chosen explicitly, which is the only way in', () => {
    const grown = lifeAged(20)
    const events = acceptEvents(grown, 'DISTANCE_RETURN', 'entry')
    expect(events.length, 'the one route the spec calls an explicit choice cannot be chosen').toBe(1)
    const after = run(grown, events)
    expect(hasStage(after, 'DISTANCE_RETURN', 'entry')).toBe(true)
  })

  it('is never offered by eligibility, because nothing about it is a threshold', () => {
    const grown = lifeAged(40, {
      skills: { knowledge: 99, communication: 99, organization: 99, business: 99, creativity: 99 },
      reputation: { standing: { gate5: 99, gate7: 99, ussishkin: 99, public: 99, work: 99, international: 0 }, pending: [] },
    } as Partial<LifeState>)
    expect(eligibleFor(grown).some((offer) => (offer.route.id as string) === 'DISTANCE_RETURN')).toBe(false)
  })
})

// ---------------------------------------------------------------------------------

describe('חלון ההקמה', () => {
  it('is 2007, and nothing else about the founding is stated', () => {
    // The one sourced fact, cited to the club's own history page in `routes.ts`.
    expect(FOUNDING_YEAR).toBe(2007)
    expect(foundingWindowOpen(FOUNDING_YEAR)).toBe(true)
    expect(foundingWindowOpen(FOUNDING_YEAR - 1)).toBe(false)
    expect(foundingWindowOpen(FOUNDING_YEAR + 1)).toBe(false)
  })

  it('invents nobody — the content names no participant, meeting or place', () => {
    /**
     * כלל 11 וכלל 17 על אותה שיחה.
     *
     * The spec is as careful as this repo is: *"אלה חלונות משחק מוצעים, לא טענה על שלוש
     * ישיבות היסטוריות מסוימות."* The three commitments are named after the kind of work
     * they are, and the founding conversation may not name a person or a date.
     */
    const found = CONVERSATIONS_ROUTES.find((row) => row.id === 'route-proof-found')
    const text = JSON.stringify(found)
    expect(/\b(19|20)\d{2}\b/.test(text), 'the founding content states a year').toBe(false)
    expect(text.includes('מאור'), 'the founding content names the club s founder').toBe(false)
    expect(FOUNDING_COMMITMENTS).toEqual(['people', 'operations', 'budget'])
    for (const kind of FOUNDING_COMMITMENTS) {
      expect(text.includes(foundingCommitmentFlag(kind)), `${kind} is not offered`).toBe(true)
    }
  })

  it('refuses the founder title once the window has closed, and keeps the rest of the route', () => {
    // *"תואר מייסד אינו זמין בדיעבד"* — and *"פעיל/מארגן/תומך"* stays open.
    const after = lifeAged(FOUNDING_YEAR + 3 - BIRTH_YEAR)
    expect(founderTitleAvailable(after)).toBe(false)
    const inside = lifeAged(FOUNDING_YEAR - BIRTH_YEAR)
    expect(founderTitleAvailable(inside)).toBe(true)
    // somebody who was there keeps it afterwards, which is the other half of the sentence
    const held = lifeAged(FOUNDING_YEAR + 3 - BIRTH_YEAR, {
      flags: { [stageFlag('USSISHKIN_FOUNDER', 'apex')]: true },
    })
    expect(founderTitleAvailable(held)).toBe(true)
  })

  it('will not give the apex outside the window, however much work was done', () => {
    const outside = lifeAged(30, {
      skills: { knowledge: 0, communication: 0, organization: 99, business: 0, creativity: 0 },
      reputation: { standing: { gate5: 0, gate7: 0, ussishkin: 99, public: 0, work: 0, international: 0 }, pending: [] },
      proofs: ['a', 'b', 'c'].map((id, index) => ({
        kind: 'founding_proof',
        proofId: id,
        chapter: `c${index}`,
        year: BIRTH_YEAR + 30,
      })),
      flags: {
        [stageFlag('USSISHKIN_FOUNDER', 'entry')]: true,
        [stageFlag('USSISHKIN_FOUNDER', 'practice')]: true,
        ...Object.fromEntries(FOUNDING_COMMITMENTS.map((kind) => [foundingCommitmentFlag(kind), true])),
      },
    } as Partial<LifeState>)
    expect(gapsFor(outside, 'USSISHKIN_FOUNDER', 'apex').map((gap) => gap.kind)).toContain('window')
  })
})

// ---------------------------------------------------------------------------------

describe('ניגוד עניינים', () => {
  it('offers three doors and no wall', () => {
    expect(CONFLICT_CHOICES).toEqual(['stop_covering', 'personal_column', 'disclose_and_pay'])
    const conversation = CONVERSATIONS_ROUTES.find((row) => row.id === 'route-conflict-of-interest')
    const choices = conversation?.branches[0]?.choices?.map((choice) => choice.id)
    expect(choices).toEqual([...CONFLICT_CHOICES])
  })

  it('keeps the journalist history when he stops covering', () => {
    // *"אפשר לשמור היסטוריית עיתונאי בלי להחזיק תפקיד מערכת פעיל."*
    const both = lifeAged(30, {
      flags: { [stageFlag('JOURNALIST', 'entry')]: true, [stageFlag('OWNER', 'entry')]: true },
    })
    const after = run(both, conflictEvents('stop_covering'))
    expect(heldStage(after, 'JOURNALIST')).toBe('entry')
    expect(isActive(after, 'JOURNALIST')).toBe(false)
  })

  it('charges the third door in the only direction a standing moves without a witness', () => {
    const state = run(lifeAged(30), [
      { t: 'reputation.earned', proofId: 'p', audience: 'public', delta: 5, why: '' },
      { t: 'reputation.heard', proofId: 'p' },
    ])
    const after = run(state, conflictEvents('disclose_and_pay'))
    expect(after.reputation.standing.public).toBeLessThan(state.reputation.standing.public)
    // and it is a LOSS, capped at the spec's −8, never a gain dressed as one
    const change = conflictEvents('disclose_and_pay').find((event) => event.t === 'reputation.changed')
    expect(change && 'delta' in change ? change.delta : 0).toBeLessThan(0)
    expect(change && 'delta' in change ? change.delta : 0).toBeGreaterThanOrEqual(-8)
  })
})

// ---------------------------------------------------------------------------------

describe('כלל 66 — מה שאי אפשר להגיע אליו נאמר, לא מוסתר', () => {
  /**
   * הבדיקה הזאת קיימת כדי ליפול ביום שייכתב הפרק הבא.
   *
   * The life as built ends long before most of these apexes open, and the honest way to
   * ship that is to STATE it rather than to quietly lower a number the spec wrote. So the
   * ceiling is derived from `CHAPTERS` and the out-of-reach set is asserted exactly: add
   * a chapter and this test goes red, and somebody decides on purpose which apex just
   * became live. That is the difference between a stale list and a dead branch.
   */
  it('derives the ceiling from the chapters that exist, never from a typed year', () => {
    expect(reachableAgeCeiling(BIRTH_YEAR)).toBe(LAST_YEAR - BIRTH_YEAR)
    expect(source('lib/life/routes.ts').includes('reachableAgeCeiling')).toBe(true)
  })

  it('names exactly which stages the written chapters cannot reach', () => {
    const outOfReach = LIFE_ROUTES.flatMap((route) =>
      route.stages.filter((stage) => stageOutOfReach(stage, BIRTH_YEAR)).map((stage) => `${route.id}/${stage.stage}`),
    )
    /**
     * חמש הפסגות היו כאן עד 21.9.2026, ואחת נשארה.
     *
     * `2002-europe` ו-`2006-home` הזיזו את תקרת הגיל מ-22 ל-28, וארבע הפסגות שננעלו
     * ב-25 נפתחו **בלי שנגענו ב-`routes.ts`** — `stageOutOfReach` קורא את רשימת
     * הפרקים. `OWNER/apex` הוא 30 והוא עדיין סגור, וזה נכון לתסריט: ענף הבעלות הוא
     * 2025. הרשימה נשארת מנויה בשמות ולא נספרת, כדי שהבאה תאמר מי היא (כלל 78).
     */
    /**
     * ...ומ-21.9.2026 הרשימה **ריקה**, וזה לא כישלון של השומר אלא מה שהוא בא לומר.
     *
     * 2007 ו-2009 נבנו, כלומר התקרה היא גיל 31, וגם `OWNER/apex` (30) נכנס פנימה.
     * השומר נשאר בדיוק כפי שהוא: ביום שמישהו יכתוב שלב עם `minAge` מעבר לפרק האחרון,
     * הוא יאדים ויאמר מי (כלל 78), ובדיקה שמוחקים אותה כשהיא ירוקה אינה כלי (כלל 73).
     */
    expect(outOfReach.sort()).toEqual([])
  })

  it('leaves every entry and practice stage inside the ages the game plays', () => {
    for (const route of LIFE_ROUTES) {
      for (const stage of route.stages) {
        if (stage.stage === 'apex') continue
        expect(stageOutOfReach(stage, BIRTH_YEAR), `${route.id}/${stage.stage}`).toBe(false)
      }
    }
  })

  it('will need the founding year written as more than one chapter, and says so in advance', () => {
    /**
     * הסתירה שתתגלה רק כשמישהו יכתוב את 2007, אלא אם היא נאמרת עכשיו.
     *
     * The founder apex wants three proofs in three DIFFERENT chapters and the window is a
     * single year. Both hold only if that year is authored as three chapters — the three
     * founding scenes the spec already names. As one chapter called `2007` the apex is
     * unreachable by construction and looks entirely healthy in the source.
     *
     * The assertion is vacuous today (no chapter is set in that year) and becomes the
     * whole point the moment one is. That is deliberate: a note in a delivery document is
     * read once, and this is read on every run.
     */
    const apex = routeById('USSISHKIN_FOUNDER')?.stages.find((stage) => stage.stage === 'apex')
    const inWindow = PLAYABLE.filter((chapter) => foundingWindowOpen(chapter.year))
    if (inWindow.length > 0) {
      expect(
        inWindow.length,
        'the founding year is one chapter, so three proofs in three chapters can never happen inside it',
      ).toBeGreaterThanOrEqual(apex?.chapters ?? 3)
    }
    expect(apex?.chapters).toBe(3)
  })

  /**
   * ...וחלון ההקמה **בתוך** הפרקים הכתובים מ-21.9.2026 — והשומר התהפך ונהיה חזק יותר.
   *
   * עד היום הוא אמר "2007 מעבר לפרק האחרון", כלומר שמרנו על עצמנו מלהזיז את תאריך
   * ההקמה כדי שיתאים למה שנבנה (כלל 11). זה עדיין הכלל, והתאריך לא זז — **העולם זז
   * אליו**: `2007-table`, `2007-registered` ו-`2007-key` נכתבו.
   *
   * ולכן השאלה עכשיו קשה יותר: הפסגה מבקשת שלוש ראיות ב**שלושה פרקים** בתוך החלון,
   * אז חייבים להיות שלושה פרקים בשנה הזאת. שניים אינם תקלת תוכן — הם פסגה בלתי-אפשרית
   * במבנה, וזה בדיוק מה שאיש לא היה מבחין בו.
   */
  /**
   * ...וכל אחד מהם נושא **בדיוק נקודת הוכחה אחת**, וזה לא קישוט.
   *
   * `route-proof-found` היא השיחה היחידה שמנפיקה `founding_proof`, והיא גם זו שמרימה
   * התחייבות. שלוש נקודות **באותו פרק** היו נראות כמו שלוש ראיות ונספרות כאחת, כי
   * `proofId` הוא `founding_proof:{chapter}` וספר הראיות אדיש לחזרה על אותו מזהה
   * (כלל 78) — כלומר השחקן היה עושה את העבודה ועומד מול פסגה נעולה.
   *
   * והנעילה על התחייבות שכבר נלקחה היא הצד השני של אותה שאלה: שלוש הזדמנויות ושלוש
   * התחייבויות, ומי שלקח "אנשים" פעם אחת רואה שהאפשרות כבויה ואומרת למה.
   */
  it('puts exactly one founding proof in each of the three chapters, and locks a commitment once taken', () => {
    const ids = ['2007-table', '2007-registered', '2007-key']
    for (const chapter of ids) {
      const spots = ALL_SCENES.flatMap((scene) =>
        scene.hotspots.filter((spot) => inEra(spot, chapter) && (spot as { act?: string }).act === 'route-proof-found'),
      )
      expect(spots.length, `${chapter} should carry exactly one founding proof`).toBe(1)
    }
    // ...ואין אף אחת בפרק שאינו בחלון
    for (const chapter of ['2006-home', '2009-up', '2000-double']) {
      const spots = ALL_SCENES.flatMap((scene) =>
        scene.hotspots.filter((spot) => inEra(spot, chapter) && (spot as { act?: string }).act === 'route-proof-found'),
      )
      expect(spots.length, `${chapter} is outside the window and must carry none`).toBe(0)
    }
    const choices = CONVERSATIONS_ROUTES.find((row) => row.id === 'route-proof-found')?.branches[0]?.choices ?? []
    expect(choices.length).toBe(3)
    for (const choice of choices) {
      expect(choice.when, `${choice.id} can be taken twice`).toBeTruthy()
      expect(choice.noteHe, `${choice.id} locks without saying why`).toBeTruthy()
    }
  })

  it('has three chapters inside the founding window, because the apex asks for three', () => {
    expect(FOUNDING_YEAR).toBe(2007)
    const inWindow = CHAPTERS.filter((chapter) => chapter.year === FOUNDING_YEAR && chapter.playable)
    expect(inWindow.map((chapter) => chapter.id)).toEqual(['2007-table', '2007-registered', '2007-key'])
    const apex = LIFE_ROUTES.find((route) => route.id === 'USSISHKIN_FOUNDER')?.stages.find((s) => s.stage === 'apex')
    expect(inWindow.length).toBeGreaterThanOrEqual(apex?.chapters ?? 3)
  })
})

// ---------------------------------------------------------------------------------

describe('התוכן — מה שאסור לו להגיד', () => {
  const ROUTE_WORDS: Record<string, string> = Object.fromEntries(
    Object.entries(MESSAGES).filter(([key]) => key.startsWith('life.route.')),
  )
  const contentText = JSON.stringify(CONVERSATIONS_ROUTES) + JSON.stringify(LIFE_ROUTES) + JSON.stringify(ROUTE_WORDS)

  it('carries no achievement language and no single score', () => {
    /**
     * `tests/life-story.test.ts` holds the same five words over the story layer, and rule
     * 63 says what happens to that guard when achievements are built: it SHRINKS to a ban
     * on a single score, because the spec itself demands *"אין ציון יחיד שמגדיר מי אוהד
     * ראוי"*. A route's stage is a name somebody calls you, and this is the screen that
     * would grow a percentage first.
     */
    for (const banned of ['הישג', 'ניקוד', 'תג ', 'רצף', '%']) {
      expect(contentText.includes(banned), `the route layer says "${banned}"`).toBe(false)
    }
  })

  it('prints no scoreline and states no year', () => {
    expect(/\d+\s*[:\-–]\s*\d+/.test(JSON.stringify(CONVERSATIONS_ROUTES)), 'a scoreline reached the routes').toBe(false)
    expect(/\b(19|20)\d{2}\b/.test(JSON.stringify(CONVERSATIONS_ROUTES)), 'the route content states a year').toBe(false)
  })

  it('draws no number for a capability or a standing on the card', () => {
    const card = source('components/life/RouteCard.tsx')
    // the two gap kinds that are a measurement are routed through the word ladder, and
    // the `have`/`want` of either never reaches a string
    expect(card.includes('nearnessKey(gap.have, gap.want)')).toBe(true)
    expect(/String\(gap\.have\)[^)]*\n?.*capability/.test(card)).toBe(false)
    expect(card.includes('%'), 'the route card prints a percentage').toBe(false)
  })

  it('gives every offer a way to say no', () => {
    const offers = CONVERSATIONS_ROUTES.filter((row) => row.id.startsWith('route-offer-'))
    expect(offers.length).toBe(LIFE_ROUTES.length * ROUTE_STAGES.length)
    for (const offer of offers) {
      const choices = offer.branches[0]?.choices ?? []
      expect(choices.some((choice) => choice.id === 'decline'), `${offer.id} cannot be refused`).toBe(true)
      // and refusing costs nothing at all — *"סירוב אינו מוריד אהבה"*
      const decline = choices.find((choice) => choice.id === 'decline')
      expect(decline?.then.every((effect) => effect.e === 'route'), `${offer.id} charges for a refusal`).toBe(true)
    }
  })

  it('keeps every word of the card in the catalogue, under its own namespace', () => {
    /**
     * These words were staged inside `lib/life/content/routes.ts` while the catalogue was
     * owned by another pass, with a shim called `routeWord` standing in for `t()`. Both
     * are gone (20.9.2026): every key is in `messages/he.life.json` with the same value it
     * was staged under, `RouteCard` reads it through `t()` like every other screen, and
     * what this test guards is no longer "the map is ready to paste" but the rule that
     * survived it — the card's chrome is in the catalogue, in its own namespace, finished.
     */
    for (const key of Object.keys(ROUTE_WORDS)) {
      expect(key.startsWith('life.route.'), `${key} is not in the life.route namespace`).toBe(true)
      expect(ROUTE_WORDS[key]?.trim().length, key).toBeGreaterThan(0)
      expect(/\{\s*\}/.test(ROUTE_WORDS[key] ?? ''), `${key} has an unfinished placeholder`).toBe(false)
    }
  })

  it('has a word for every gap kind the model can produce', () => {
    // A gap with no sentence renders as its own key, in Latin, in a Hebrew card — the
    // exact failure `tests/i18n.test.ts` exists to prevent, one namespace early.
    const kinds = [
      'ladder', 'age', 'capability', 'alsoCapability', 'audience', 'proofs', 'chapters',
      'evidence', 'people', 'subjects', 'debt', 'works', 'journeys', 'founding', 'window',
    ]
    for (const kind of kinds) expect(Object.keys(ROUTE_WORDS)).toContain(`life.route.gap.${kind}`)
    for (const stage of ROUTE_STAGES) expect(Object.keys(ROUTE_WORDS)).toContain(`life.route.stage.${stage}`)
  })
})

// ---------------------------------------------------------------------------------

describe('קריאת המצב', () => {
  it('reads the personality-backed capability where the reducer actually keeps it', () => {
    const state = run(lifeAged(19), [{ t: 'personality.shifted', key: 'streetSmarts', delta: 20 }])
    expect(capabilityOf(state, PERSONALITY_BACKED_CAPABILITY)).toBe(state.personality.streetSmarts)
    expect(capabilityOf(state, 'organization')).toBe(state.skills.organization)
  })

  it('treats an unsettled debt as a debt, whichever pocket recorded it', () => {
    const owing = run(lifeAged(30), [{ t: 'debt.changed', agorot: 4000, why: 'ספק' }])
    expect(gapsFor(owing, 'OWNER', 'apex').some((gap) => gap.kind === 'debt')).toBe(true)
    const owedFavour = lifeAged(30, { flags: { 'owe:group': true } })
    expect(gapsFor(owedFavour, 'OWNER', 'apex').some((gap) => gap.kind === 'debt')).toBe(true)
  })

  it('reports the first gap a person would lead with', () => {
    const child = lifeAged(10)
    expect(gapsFor(child, 'ULTRAS', 'entry')[0]?.kind, 'the card would open on the wrong sentence').toBe('age')
  })
})

// ---------------------------------------------------------------------------------

/**
 * ההזמנה — שתי הדלתות, ושתיהן מובילות לאותו מקום.
 *
 * The world opens the offer as a CONVERSATION at the top of a chapter; the player opens
 * the same thing deliberately from ☰ as a CARD. Two doors is a liability unless they are
 * held to one answer, which is what this block is for: both ask `eligibleFor`, both refuse
 * the same stage, and the conversation table is checked in BOTH directions so a generated
 * id can never again drift away from the thing that names it.
 */
describe('ההזמנות — הדלת של העולם והדלת של השחקן', () => {
  it('every route stage has an offer conversation, and every one of them exists', () => {
    for (const route of LIFE_ROUTES) {
      if (route.id === 'DISTANCE_RETURN') continue
      for (const stage of ROUTE_STAGES) {
        const id = offerConversationFor(route.id, stage)
        expect(id, `${route.id}:${stage} has no offer`).toBeTruthy()
        expect(DIALOGUE[id as string], `${id} is not registered in DIALOGUE`).toBeDefined()
      }
    }
  })

  it('names no offer that the content does not generate — the table cannot outgrow the fiction', () => {
    for (const [id, stages] of Object.entries(OFFER_CONVERSATIONS)) {
      for (const [stage, conversation] of Object.entries(stages)) {
        expect(conversation, `${id}:${stage}`).toBe(`route-offer-${id}-${stage}`)
      }
    }
  })

  it('the offered flag is forgotten at the chapter cut, so a refusal is not a locked door', () => {
    // No `own:`/`life:`/`promise:` prefix — `personFlags` erases exactly this shape.
    expect(offeredFlag('ULTRAS', 'entry').startsWith('own:')).toBe(false)
    expect(offeredFlag('ULTRAS', 'entry')).toBe('route:offered:ULTRAS:entry')
  })

  it('the card the player opens lands on the route he is nearest to', () => {
    const man = run(lifeAged(19), [
      { t: 'skill.changed', skill: 'organization', delta: 60, why: '' },
      { t: 'reputation.earned', proofId: 'n1', audience: 'gate5', delta: 5, why: '' },
      { t: 'reputation.heard', proofId: 'n1' },
    ])
    const near = nearestRoute(man)
    expect(near).not.toBeNull()
    // whatever it picks, it must be a stage he has not taken and the model still offers
    expect(ROUTE_STAGES).toContain(near?.stage)
    expect(hasStage(man, near!.id, near!.stage)).toBe(false)
  })

  it('offers no route card to a child, and keeps it forever once a title was held', () => {
    expect(routesWorthShowing(lifeAged(8))).toBe(false)
    expect(routesWorthShowing(lifeAged(ROUTES_VISIBLE_AGE))).toBe(true)
    const veteran = lifeAged(8, { flags: { [stageFlag('ULTRAS', 'entry')]: true } })
    expect(routesWorthShowing(veteran), 'a held title outlives the age gate').toBe(true)
  })

  it('says out loud when a stage needs a chapter that does not exist yet (rule 66)', () => {
    /**
     * התקרה היא **גיל 28** — הפרק האחרון הוא 2006 והוא נולד ב-1978 — ולכן פסגה שננעלה
     * ב-25 כבר אינה מעבר לה, ופסגה שננעלה ב-30 עדיין כן. **`stageOutOfReachFor` אינו
     * שואל על הגיל שהועבר לו אלא על מה שהמשחק יכול להגיע אליו בכלל**, וזה מה שגרם
     * לשורה הזאת ליפול כשנבנו שני פרקים: הסף לא זז, העולם גדל.
     *
     * `life.route.outOfReach` ממשיך לנקוב בזה על הכרטיס, ובניית 2025 תזיז גם את
     * האחרונה — בלי לגעת בשורה כאן.
     */
    expect(stageOutOfReachFor(lifeAged(22), 'ULTRAS', 'apex'), 'ULTRAS apex is 25, and 2006 exists').toBe(false)
    expect(stageOutOfReachFor(lifeAged(22), 'OWNER', 'apex'), 'OWNER apex is 30, and 2009 exists').toBe(false)
    expect(stageOutOfReachFor(lifeAged(22), 'ULTRAS', 'entry')).toBe(false)
    expect(stageOutOfReachFor(lifeAged(22), 'OWNER', 'practice'), 'OWNER practice is 21').toBe(false)
    /**
     * And the founder's apex is NOT out of reach by age — it is `minAge: 18`. What holds
     * it is the 2007 window, which is a `window` gap and a different sentence. Reporting
     * a window as an age would be the card telling a true-sounding lie about why.
     */
    expect(stageOutOfReachFor(lifeAged(22), 'USSISHKIN_FOUNDER', 'apex')).toBe(false)
    expect(gapsFor(lifeAged(22), 'USSISHKIN_FOUNDER', 'apex').some((gap) => gap.kind === 'window')).toBe(true)
  })
})

// ---------------------------------------------------------------------------------

/**
 * הפעולות הקטנות — ומה שהן היו עד היום.
 *
 * `SMALL_ACTIONS` מחזיק שמונה ראיות שתנאי הכניסה של שלושה מסלולים קוראים להן **בשם**:
 * `JOURNALIST.entry` מבקש `verified_report` וגם `written_account`, `OWNER.entry` מבקש
 * `balanced_budget` וגם `adult_shift`, ו-`CREATOR.entry` מבקש `creative_work`. שמונה
 * שיחות נכתבו, שמונה נכנסו ל-`CONVERSATIONS_ROUTES` — ואף חדר, שחקן, פעימה או תסריט
 * משחק לא פתח אחת מהן. כלומר שלושה שלבי כניסה לא היו קשים, הם היו **בלתי-אפשריים**.
 *
 * הבדיקות כאן קוראות את `ALL_SCENES` כמו שהריצה קוראת אותו, ולא מחפשות מחרוזת בקובץ:
 * מה שנספר הוא נקודת חמה שקיימת בפרק אמיתי, בחדר שאפשר להגיע אליו מנקודת הפתיחה של
 * אותו פרק. הן קיימות כדי שהמקרה הזה לא יחזור בשקט — לא עבור השמונה האלה ולא עבור
 * ראיה שתיכתב מחר.
 */
describe('הפעולות הקטנות — מה שנכתב ואפשר לעשות', () => {
  const ADULT = ['1996-army', '1997-basket', '1998-laces', '1999-basket', '1999-cup', '2000-title', '2000-double']

  /** every room reachable from where this chapter opens, doors only — the same walk a player takes */
  const roomsIn = (chapter: string): Set<string> => {
    const start = CHAPTERS.find((row) => row.id === chapter)?.start.location
    const seen = new Set<string>(start ? [start] : [])
    const queue = [...seen]
    while (queue.length) {
      // `queue.shift()` INSIDE the find callback drains the queue once per row examined —
      // the walk then ends after one room and every hotspot beyond it looks unreachable.
      const here = queue.shift()
      const scene = ALL_SCENES.find((row) => row.id === here)
      if (!scene) continue
      for (const exit of scene.exits) {
        if (!exitInEra(exit, chapter) || seen.has(exit.to)) continue
        seen.add(exit.to)
        queue.push(exit.to)
      }
    }
    return seen
  }

  /** which chapters can actually open this conversation from a hotspot in a room they can reach */
  const chaptersOffering = (conversationId: string): string[] =>
    ADULT.filter((chapter) => {
      const rooms = roomsIn(chapter)
      return ALL_SCENES.some(
        (scene) => rooms.has(scene.id) && scene.hotspots.some((spot) => spot.act === conversationId && inEra(spot, chapter)),
      )
    })

  it('puts every one of the eight in a room a chapter can walk into', () => {
    for (const action of SMALL_ACTIONS) {
      const chapters = chaptersOffering(action.conversationId)
      expect(chapters.length, `${action.id} is written and nothing in the world opens it`).toBeGreaterThan(0)
    }
  })

  /**
   * שני פרקים, ולא אחד — וזו אינה החמרה שרירותית.
   *
   * `JOURNALIST.practice` מבקש שתי הוכחות בשני פרקים שונים, ומזהה ההוכחה נושא את הפרק
   * (`kind:{chapter}`). ראיה שאפשר לאסוף רק בשנה אחת יכולה לשלם על שלב הכניסה ולעולם לא
   * על זה שאחריו — וזאת בדיוק הצורה של תקרה שנראית בריאה בקוד.
   */
  it('leaves each of them collectable in more than one chapter, because a proof id carries the year', () => {
    for (const action of SMALL_ACTIONS) {
      expect(chaptersOffering(action.conversationId).length, `${action.id} exists in one year only`).toBeGreaterThan(1)
    }
  })

  it('names each entry stage evidence a room can actually produce', () => {
    const reachableKinds = new Set(
      SMALL_ACTIONS.filter((action) => chaptersOffering(action.conversationId).length > 0).map((action) => action.kind),
    )
    for (const route of LIFE_ROUTES) {
      const entry = route.stages.find((stage) => stage.stage === 'entry')
      for (const kind of entry?.needsProofKinds ?? []) {
        expect(reachableKinds.has(kind), `${route.id} entry asks for ${kind} and no room produces it`).toBe(true)
      }
    }
  })

  /**
   * פעם אחת בפרק — ההבדל בין אחר-צהריים לבין טחנה.
   *
   * `proof.recorded` אדיש לחזרה על אותו `proofId`, אבל המיומנויות, הכסף והמוניטין אינם:
   * בלי הדגל, אותה נקודה חמה הייתה משלמת שוב ושוב באותו יום. הענף השני של השיחה הוא מה
   * שהחדר אומר אחר כך, וקיומו הוא מה שמאפשר לחפץ להישאר בעולם במקום להיעלם.
   */
  it('pays each of them once a chapter, and keeps saying something afterwards', () => {
    for (const action of SMALL_ACTIONS) {
      const conversation = CONVERSATIONS_ROUTES.find((row) => row.id === action.conversationId)
      expect(conversation, action.id).toBeTruthy()
      expect(conversation?.branches.length, `${action.id} has nothing to say once it is done`).toBe(2)

      const offer = conversation?.branches[0]
      expect(offer?.when, `${action.id} can be repeated all afternoon`).toEqual({
        notFlag: smallActionFlag(action.id),
      })
      const doIt = offer?.choices?.find((choice) => choice.id === 'do')
      expect(
        doIt?.then?.some((effect) => effect.e === 'flag' && effect.flag === smallActionFlag(action.id)),
        `${action.id} never closes its own window`,
      ).toBe(true)
      expect(offer?.choices?.some((choice) => choice.id === 'skip'), `${action.id} cannot be refused`).toBe(true)

      const after = conversation?.branches[1]
      expect(after?.when, `${action.id} guards the line that has to always answer`).toBeUndefined()
      expect(after?.lines[0]?.text.length ?? 0, `${action.id} says nothing afterwards`).toBeGreaterThan(10)
    }
  })

  /**
   * הדגל נמחק במעבר פרק, וזה לא פרט מימוש.
   *
   * `personFlags` שומר רק את הקידומות המנויות בו (`life:`, `own:`, `owe:`, `promise:`…).
   * דגל של פעולה קטנה מכוון להימחק: הראיה נשארת לתמיד, והאחר-צהריים לא. דגל ששרד היה
   * הופך את השמונה לפעם-אחת-בחיים והורג את שלב ה-practice של שלושה מסלולים.
   */
  it('uses a flag the chapter cut is meant to erase', () => {
    for (const action of SMALL_ACTIONS) {
      const flag = smallActionFlag(action.id)
      expect(flag.startsWith('small:'), action.id).toBe(true)
      for (const prefix of ['life:', 'own:', 'onboard:', 'cutscene:', 'prologue:', 'went:', 'owe:', 'promise:', 'album:']) {
        expect(flag.startsWith(prefix), `${action.id} would survive the chapter cut`).toBe(false)
      }
    }
  })

  it('stands every one of them on its own room floor', () => {
    for (const action of SMALL_ACTIONS) {
      for (const scene of ALL_SCENES) {
        for (const spot of scene.hotspots) {
          if (spot.act !== action.conversationId) continue
          const band = scene.band
          expect(spot.y, `${action.id} floats above ${scene.id}`).toBeGreaterThanOrEqual(band.far)
          expect(spot.y, `${action.id} stands below the floor of ${scene.id}`).toBeLessThanOrEqual(band.near)
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------------

/**
 * התקרה של מה שנבנה — הבדיקה שהופכת "אפשרי" ממילה להערכה.
 *
 * `npm run life:budget` שואל את השאלה הזאת על כסף: האם יש בכלל דרך להגיע לסכום שסצנה
 * מבקשת. אותה שאלה בדיוק לא נשאלה מעולם על שלבי המסלולים, ולכן שלושה שלבי כניסה יכלו
 * להיות בלתי-אפשריים במשך חודש בלי ששום דבר האדים: כל החוקים היו נכונים, והראיה
 * שהחוק מבקש פשוט לא נוצרה בשום מקום.
 *
 * התקרה נספרת רק ממה שהעולם באמת פותח — נקודות חמות בחדרים שאפשר ללכת אליהם, בפרקים
 * שקיימים. תוכן של פרק (מדבקה, שיחה, סוף) לא נספר, וזאת החמרה מכוונת: מה שנמדד כאן הוא
 * הרצפה, ואם הרצפה מספיקה אין צורך לסמוך על אף שורת עלילה.
 */
describe('תקרת המסלולים — מה שאפשר להגיע אליו בפרקים שנבנו', () => {
  const ADULT = ['1996-army', '1997-basket', '1998-laces', '1999-basket', '1999-cup', '2000-title', '2000-double']

  const roomsIn = (chapter: string): Set<string> => {
    const start = CHAPTERS.find((row) => row.id === chapter)?.start.location
    const seen = new Set<string>(start ? [start] : [])
    const queue = [...seen]
    while (queue.length) {
      const here = queue.shift()
      const scene = ALL_SCENES.find((row) => row.id === here)
      if (!scene) continue
      for (const exit of scene.exits) {
        if (!exitInEra(exit, chapter) || seen.has(exit.to)) continue
        seen.add(exit.to)
        queue.push(exit.to)
      }
    }
    return seen
  }

  const opens = (conversationId: string, chapter: string): boolean => {
    const rooms = roomsIn(chapter)
    return ALL_SCENES.some(
      (scene) => rooms.has(scene.id) && scene.hotspots.some((spot) => spot.act === conversationId && inEra(spot, chapter)),
    )
  }

  /** everything the placed rooms can add up to across the chapters that exist */
  const ceiling = () => {
    const capability: Record<string, number> = {}
    const audience: Record<string, number> = {}
    const kinds = new Set<string>()
    for (const chapter of ADULT) {
      for (const action of SMALL_ACTIONS) {
        if (!opens(action.conversationId, chapter)) continue
        kinds.add(action.kind)
        for (const effect of action.effects) {
          if (effect.e === 'skill') capability[effect.skill] = (capability[effect.skill] ?? 0) + effect.delta
          if (effect.e === 'personality') capability[effect.key] = (capability[effect.key] ?? 0) + effect.delta
          if (effect.e === 'proof' && effect.audience && effect.delta) {
            audience[effect.audience] = (audience[effect.audience] ?? 0) + effect.delta
          }
        }
      }
      for (const mission of PROOF_MISSIONS) {
        if (!opens(mission.conversationId, chapter)) continue
        kinds.add(mission.kind)
        const key = mission.capability === PERSONALITY_BACKED_CAPABILITY ? 'streetSmarts' : mission.capability
        capability[key] = (capability[key] ?? 0) + mission.capabilityGain
        audience[mission.audience] = (audience[mission.audience] ?? 0) + mission.audienceGain
      }
    }
    return { capability, audience, kinds }
  }

  const CEILING = ceiling()
  const capKey = (capability: string) => (capability === PERSONALITY_BACKED_CAPABILITY ? 'streetSmarts' : capability)

  it('reaches every entry stage without borrowing a single line of chapter fiction', () => {
    for (const route of LIFE_ROUTES) {
      const entry = route.stages.find((stage) => stage.stage === 'entry')
      if (!entry) continue
      const have = CEILING.capability[capKey(entry.capability)] ?? 0
      const standing = CEILING.audience[entry.audience] ?? 0
      expect(have, `${route.id} entry wants ${entry.capability} ${entry.capabilityMin}`).toBeGreaterThanOrEqual(entry.capabilityMin)
      expect(standing, `${route.id} entry wants ${entry.audience} ${entry.audienceMin}`).toBeGreaterThanOrEqual(entry.audienceMin)
      for (const kind of entry.needsProofKinds ?? []) {
        expect(CEILING.kinds.has(kind), `${route.id} entry wants ${kind} and nothing produces it`).toBe(true)
      }
    }
  })

  /**
   * ושלב האימון — חוץ מאחד, ושמו כתוב.
   *
   * `USSISHKIN_FOUNDER.practice` מבקש `founding_proof`, ו-`PROOF_FOUND` היא המשימה היחידה
   * מתוך השש שבכוונה אינה מונחת בשום חדר: חלון ההקמה הוא 2007, אחרי הפרק האחרון. זאת אינה
   * אותה חוסר-נגישות כמו של הפסגות (גיל) והיא נמדדת אחרת — ולכן היא רשומה כאן בשמה ולא
   * מוסתרת מאחורי הכללה. היום שייכתב פרק 2007 יפיל את השורה האחרונה בבדיקה הזאת.
   */
  it('reaches every practice stage too — except the founder, whose window is 2007', () => {
    const blocked: string[] = []
    for (const route of LIFE_ROUTES) {
      const practice = route.stages.find((stage) => stage.stage === 'practice')
      if (!practice) continue
      const have = CEILING.capability[capKey(practice.capability)] ?? 0
      const standing = CEILING.audience[practice.audience] ?? 0
      const proofReachable = practice.proofs === 0 || CEILING.kinds.has(route.proofKind)
      if (have < practice.capabilityMin || standing < practice.audienceMin || !proofReachable) blocked.push(route.id)
    }
    expect(blocked).toEqual(['USSISHKIN_FOUNDER'])
    expect(foundingWindowOpen(2000), 'the founding window is not open in the last chapter built').toBe(false)
  })

  /**
   * הפסגות עוצרות על הגיל, ולא על התוכן — וזה מה שמבדיל בין "עוד לא נבנה" ל"נבנה לא נכון".
   */
  it('leaves every apex short of its own numbers, which is what the age ceiling means', () => {
    for (const route of LIFE_ROUTES) {
      const apex = route.stages.find((stage) => stage.stage === 'apex')
      if (!apex) continue
      const have = CEILING.capability[capKey(apex.capability)] ?? 0
      const standing = CEILING.audience[apex.audience] ?? 0
      expect(
        have < apex.capabilityMin || standing < apex.audienceMin,
        `${route.id} apex is numerically reachable but gated by an age no chapter reaches — one of the two is wrong`,
      ).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------------

/**
 * הראיה החסרה, בשמה — ולמה זה היה חסר בכרטיס דווקא.
 *
 * `gapsFor` החזיר `missingKinds` מהיום שנכתב, ו-`RouteCard` זרק אותו והדפיס משפט אחד
 * גנרי. אדם ששני אחר־צהריים מכניסת העיתונאי קיבל בדיוק את אותה שורה כמו אדם שחמישה,
 * ובאותן מילים. הטבלה נגזרת מהתוכן שמייצר את הראיה ולא נכתבת שוב (כלל 59), וזה מה
 * ששומר עליה: ראיה ששלב מבקש בשם ואין לה משפט אנושי מפילה את הבדיקה.
 */
describe('שם הראיה', () => {
  it('has a sentence for every kind a stage asks for by name', () => {
    for (const route of LIFE_ROUTES) {
      for (const stage of route.stages) {
        for (const kind of stage.needsProofKinds ?? []) {
          expect(evidenceTitleHe(kind), `${route.id}.${stage.stage} asks for ${kind} and it has no name`).toBeTruthy()
        }
      }
    }
  })

  it('takes the sentence from the content that produces it, never from a second table', () => {
    for (const action of SMALL_ACTIONS) expect(evidenceTitleHe(action.kind)).toBe(action.titleHe)
    for (const mission of PROOF_MISSIONS) expect(evidenceTitleHe(mission.kind)).toBe(mission.titleHe)
  })

  it('says nothing about a kind the game does not produce', () => {
    expect(evidenceTitleHe('a_kind_no_scene_records')).toBeNull()
  })

  /**
   * ומה שהכרטיס עדיין לא אומר, במכוון: **איפה**. המדף בקיוסק והמחברת על המיטה נמצאים
   * בעולם ומוצאים אותם בהליכה — כרטיס שמציין חדר הופך מסלול לרשימת משימות.
   */
  it('names the act and not the room', () => {
    const rooms = ALL_SCENES.map((scene) => scene.titleHe)
    for (const action of SMALL_ACTIONS) {
      const title = evidenceTitleHe(action.kind) ?? ''
      for (const room of rooms) expect(title.includes(room), `${action.id} names a room`).toBe(false)
    }
  })
})
