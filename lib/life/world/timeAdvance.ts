import { LATER_PREFIX, SHOWN_PREFIX } from '../consequence'
import { beatFlag, beatsAt, type Beat, type BeatAction } from '../content/beats'
import type { Era } from '../content/era'
import { GIGS } from '../gigs'
import { offersNow, startable, type Offer } from '../offers'
import { TIER_RANK, opportunityTier, resolveLifeOpportunities } from '../opportunityResolver'
import { placementsAt } from '../schedules'
import { albumTotals } from '../stickers'
import type { LifeState, LocationId } from '../types'
import { actionsNow } from './actions'
import { nextTimeGate, type TimeGate } from './flow'
import { ALL_SCENES, inEra, sceneIn, titleFor, type SceneDef } from './scenes'
import { travelPlan, type TravelPlan } from './travel'
import { meets, type Condition } from './types'

/**
 * זמן פנוי — the day between two things, planned the way a person plans it (delta 90).
 *
 * SMART FREE TIME spec, 25.9.2026. The old card knew WHEN the next beat was and nothing
 * else, and landed every skip three minutes before it wherever the player happened to be
 * standing — so a boy at the kiosk at 17:04 could be "helped" to 17:57, still at the
 * kiosk, with a bus leaving from the other end of town at six. This file answers the eight
 * questions of §2 in one pure reading:
 *
 *   WHAT am I waiting for (the time gate `flow.ts` already finds) · WHEN (its minute) ·
 *   WHERE (`at` — the beat's own room, or the room an era gate names) · HOW LONG to get
 *   there (`travel.ts`, the one walk-length in the game) · WHEN to leave (event − travel −
 *   buffer) · WHAT fits before (`offers.ts`, the opportunity windows, the album) · WHERE to
 *   land · WHAT must be true after (`verifyLanding`).
 *
 * It decides nothing and writes nothing. `WorldScene.advanceTime(planId)` recalculates the
 * plan at the moment of the tap (§19), refuses a stale one, and walks the clock itself
 * through the minutes the world cares about (§20); the shell only asks and draws.
 *
 * Two rules are not negotiable and are tested:
 *  · no decision teleport (§8) — an advance may skip a walk the player already knows how to
 *    make, never a choice. A gate that exists BECAUSE the player has not done something (the
 *    bus leaves without you) is a lapse, and letting it pass is offered as his decision, in
 *    words, never as the default;
 *  · no spoilers (§24) — a gate the chapter has not told the player about (no `waitingHe`,
 *    no `eventHe`) is "nothing urgent right now", with no place and no name.
 */

// ------------------------------------------------------------------------ shapes ---

export type FreeTimeMode = 'wait-here' | 'travel-and-wait' | 'wait-then-travel'

/** how a side action sits in the window (§17) */
export type FreeTimeTier = 'safe' | 'tight' | 'no-fit' | 'untimed'

/** how a row is started — through the systems that already own it (§26), never a new one */
export type FreeTimeStart =
  | { kind: 'talk'; act: string }
  | { kind: 'go'; to: LocationId }
  | { kind: 'sheet'; sheet: 'album' }

export type FreeTimeAction = {
  id: string
  titleHe: string
  subtitleHe?: string
  kind: 'work' | 'activity' | 'story' | 'social' | 'collection' | 'route' | 'world'
  location: LocationId | null
  durationMinutes: number | null
  travelMinutes: number
  totalMinutes: number | null
  fits: boolean
  marginMinutes: number | null
  tier: FreeTimeTier
  rewardHe?: string
  riskHe?: string
  start: FreeTimeStart
}

export type TimeAdvancePlan = {
  id: string
  /** the gate this plan was built from — a beat id, or an era gate's own id */
  beatId: string
  fromMinute: number
  eventMinute: number
  /** the authored "what is he waiting for" sentence, null when the player cannot know (§24) */
  waitingHe: string | null
  /** the event in a few words — "האוטובוס יוצא" — null when unknown */
  eventHe: string | null
  knownToPlayer: boolean
  currentLocation: LocationId
  targetLocation: LocationId | null
  /** the target as it is called this chapter */
  targetHe: string | null
  /** he is already where it happens (or it happens wherever he is) */
  alreadyThere: boolean
  /** the way there never leaves the flat — "אתה כבר בבית" */
  atHome: boolean
  travelMinutes: number
  arrivalBufferMinutes: number
  safeDepartureMinute: number
  safeStayUntilMinute: number
  plannedArrivalMinute: number
  /** the minute an "early" advance (go now) would land on — null when there is no walk */
  earlyArrivalMinute: number | null
  mode: FreeTimeMode
  /** leaving comfortably is no longer possible: if he goes, it is now (§37 "late") */
  late: boolean
  route: { reachable: boolean; locked: boolean; firstStepHe?: string; whyHe?: string } | null
  optionalActions: FreeTimeAction[]
  /**
   * why an advance would not be safe — each a stable code:
   * `route` (shut / unknown way), `guided` (somebody is taking him: the walk is theirs),
   * `no-auto` (the walk is the scene), `on-the-way` (an authored moment on the way),
   * `too-late` (arrival would be after the event), `lapse` (the event is what happens if he
   * does nothing — only his own explicit choice may let it pass)
   */
  blockers: string[]
  safe: boolean
  /** the event is what happens if he does nothing — the bus leaving without him */
  lapse: boolean
  /** the event closes the day */
  closesDay: boolean
  /** free minutes before he should start moving (never negative) */
  freeMinutes: number
}

/** the shell's pacing (§30) — real seconds, not world minutes */
export const FREE_TIME_TIMING = {
  /** the chip joins the HUD this long after a gate is detected and the room is quiet */
  chipAfterMs: 3000,
  /** the planner opens by itself only after this long of nothing meaningful */
  expandAfterMs: 10000,
  /** the transition: place and time, briefly */
  transitionMs: 2200,
} as const

// ------------------------------------------------------------------- the reading ---

const sceneById = new Map<LocationId, SceneDef>(ALL_SCENES.map((scene) => [scene.id, scene]))
const FLAT: ReadonlySet<LocationId> = new Set<LocationId>(['bedroom', 'home', 'kitchen'])

const list = (at: TimeGate['at']): LocationId[] => (!at ? [] : Array.isArray(at) ? [...(at as readonly LocationId[])] : [at as LocationId])

/** the arrival buffer of §14, by what the target IS — overridable per beat */
export function arrivalBuffer(target: LocationId | null, gate: TimeGate, here: LocationId): number {
  if (gate.freeTime?.arrivalBufferMinutes !== undefined) return Math.max(0, gate.freeTime.arrivalBufferMinutes)
  if (!target || target === here) return 0
  const ambience = sceneById.get(target)?.ambience
  // a stop, a gate, a queue — or the doors of a hall / a ground: in, and find a place
  if (ambience === 'station') return 8
  if (ambience === 'stadium' || ambience === 'hall') return 10
  return 5
}

/** the flags a condition insists are DOWN — `none`, `notFlag` */
function negatives(condition: Condition | undefined, out: string[] = []): string[] {
  if (!condition) return out
  if (condition.notFlag) out.push(condition.notFlag)
  for (const part of condition.none ?? []) {
    if (part.flag) out.push(part.flag)
    negatives(part, out)
  }
  for (const part of condition.all ?? []) negatives(part, out)
  return out
}

const raisedBy = (actions: readonly BeatAction[]): Set<string> =>
  new Set(actions.flatMap((action) => (action.a === 'flag' ? [action.flag] : [])))

/** a flag whose name says the choice was made BY DEFAULT — he stood still and it happened */
const BY_DEFAULT = /(:|-)(hesitated|missed|gone|late|left)$/

/**
 * A lapse (§8, §17): the beat fires only because something has NOT been done — the bus
 * leaves "none: on:bus" — or it writes down that nothing was chosen (`a3:hesitated`).
 * Its own guards are not a lapse: a flag the beat raises itself, or the `:done` of the
 * conversation it opens (`a3-late` waits for `a3:done`, which `a3-leaving` raises). Any other
 * forbidden flag is something the player could still do instead, so waiting through it is
 * HIS decision, never the default of a button (a heuristic over data; documented, tested).
 */
export function isLapse(beat: Beat | null): boolean {
  if (!beat) return false
  const own = raisedBy(beat.do)
  const talks = beat.do.some((action) => action.a === 'talk')
  if ([...own].some((flag) => BY_DEFAULT.test(flag))) return true
  return negatives(beat.when).some((flag) => !own.has(flag) && !flag.startsWith('beat:') && !(talks && flag.endsWith(':done')))
}

const closes = (beat: Beat | null) => Boolean(beat?.do.some((action) => action.a === 'ending'))

/** an authored scene plays at the minute — the landing leaves one minute to see the room */
const authored = (beat: Beat | null) =>
  Boolean(beat?.do.some((action) => ['talk', 'lines', 'card', 'cutscene', 'match', 'pano', 'travel', 'ending'].includes(action.a)))

/** "ממתין: האוטובוס יוצא" → "האוטובוס יוצא" */
export function eventWords(gate: TimeGate): string | null {
  if (gate.freeTime?.eventHe) return gate.freeTime.eventHe
  if (!gate.waitingHe) return null
  const text = gate.waitingHe.replace(/^ממתין:\s*/, '').trim()
  // an authored full sentence ("אמא חוזרת מהעבודה בשלוש. עד אז הבית שקט.") is its own words
  const first = text.split('.')[0]?.trim() ?? text
  return first || null
}

function pickTarget(state: LifeState, gate: TimeGate, known: boolean): { target: LocationId | null; travel: TravelPlan | null } {
  const here = state.location
  const targets = list(gate.at).filter((id) => sceneById.has(id))
  if (!targets.length || targets.includes(here)) return { target: targets.length ? here : null, travel: null }
  // §24: an event he does not know about is not a place to be sent to
  if (!known) return { target: null, travel: null }
  // §13: several rooms — the nearest reachable one; none reachable: the first, with its reason
  const plans = targets.map((id) => ({ id, plan: travelPlan(state, state.chapter, here, id) }))
  const open = plans.filter((row) => row.plan.reachable).sort((a, b) => a.plan.minutes - b.plan.minutes)
  const chosen = open[0] ?? plans[0]!
  return { target: chosen.id, travel: chosen.plan }
}

/** every minute in (from, to) at which the world has an opinion — schedules, windows, debts (§20) */
export function boundaries(state: LifeState, era: Era, from: number, to: number): number[] {
  const out = new Set<number>()
  const add = (minute: number) => {
    if (minute > from && minute < to) out.add(minute)
  }
  for (const entry of era.schedule) {
    add(entry.start)
    add(entry.end)
  }
  for (const def of era.opportunities ?? []) {
    add(def.start)
    add(def.expires)
  }
  for (const [flag, value] of Object.entries(state.flags)) {
    if (!flag.startsWith(LATER_PREFIX) || typeof value !== 'string' || state.flags[`${SHOWN_PREFIX}${flag}`]) continue
    const due = Number(value.slice(0, value.indexOf('|')))
    if (Number.isFinite(due)) add(due)
  }
  return [...out].sort((a, b) => a - b)
}

/** an authored moment in a room the walk would skip through — §8, never skipped */
function momentOnTheWay(state: LifeState, era: Era, travel: TravelPlan | null): boolean {
  if (!travel) return false
  for (const leg of travel.legs.slice(0, -1)) {
    const due = beatsAt(era.beats, 'enter', leg.to).some((beat) => !state.flags[beatFlag(beat.id)] && meets(state, beat.when))
    if (due) return true
  }
  return false
}

export type FreeTimeOptions = {
  /** a conversation, a beat, a match or a film is running: nothing is offered (§29) */
  busy?: boolean
}

/**
 * The plan, or null when the day is not waiting on the clock (§31 steps 1–3).
 */
export function freeTimePlan(state: LifeState, era: Era, options: FreeTimeOptions = {}): TimeAdvancePlan | null {
  if (options.busy || state.chapterDone) return null
  const gate = nextTimeGate(state, era)
  if (!gate || gate.minute <= state.minute) return null
  const beat = (era.beats ?? []).find((row) => row.id === gate.beatId) ?? null
  const here = state.location
  const now = state.minute
  const eventHe = eventWords(gate)
  const known = eventHe !== null
  const lapse = isLapse(beat)
  const { target, travel } = pickTarget(state, gate, known)
  const moving = Boolean(target && target !== here && travel)
  // a walk that never leaves the flat is not a journey: "you are already home" (§14: 0–3)
  const atHome = moving && Boolean(travel?.legs.length) && Boolean(travel?.legs.every((leg) => FLAT.has(leg.to) && FLAT.has(leg.from)))
  const buffer = atHome ? Math.max(0, gate.freeTime?.arrivalBufferMinutes ?? 0) : arrivalBuffer(moving ? target : null, gate, here)
  const eventMinute = gate.minute
  const blockers: string[] = []

  let travelMinutes = 0
  let safeDeparture: number
  let plannedArrival: number
  let earlyArrival: number | null = null
  let late = false
  let mode: FreeTimeMode = 'wait-here'
  let route: TimeAdvancePlan['route'] = null

  if (moving && travel) {
    travelMinutes = travel.minutes
    route = {
      reachable: travel.reachable,
      locked: travel.locked,
      ...(travel.firstStepHe ? { firstStepHe: travel.firstStepHe } : {}),
      ...(travel.whyHe ? { whyHe: travel.whyHe } : {}),
    }
    if (!travel.reachable) blockers.push('route')
    else if (travel.guided) blockers.push('guided')
    if (gate.freeTime?.allowAutoTravel === false) blockers.push('no-auto')
    if (momentOnTheWay(state, era, travel)) blockers.push('on-the-way')
    safeDeparture = eventMinute - travelMinutes - buffer
    if (safeDeparture <= now + 1) {
      // late: leave now, and arrive when the legs arrive (§37)
      late = true
      safeDeparture = now
      mode = 'travel-and-wait'
    } else {
      mode = 'wait-then-travel'
    }
    plannedArrival = safeDeparture + travelMinutes
    earlyArrival = now + travelMinutes
    if (plannedArrival > eventMinute) blockers.push('too-late')
  } else {
    // wait-here: a person arriving lands on the minute (she is standing there); an authored
    // scene lands one minute before it, so it plays in front of him and is not skipped (§35 I)
    const lead = gate.freeTime?.person ? 0 : authored(beat) ? 1 : 0
    plannedArrival = Math.max(now, eventMinute - lead)
    safeDeparture = plannedArrival
  }
  // a lapse blocks only WAITING through it; walking there in time is how he catches it
  if (lapse && !moving) blockers.push('lapse')

  const freeMinutes = Math.max(0, safeDeparture - now)
  const targetHe = target ? titleFor(sceneById.get(target) as SceneDef, state.chapter) : null

  const plan: TimeAdvancePlan = {
    id: planIdOf(gate, here, target),
    beatId: gate.beatId,
    fromMinute: now,
    eventMinute,
    waitingHe: gate.waitingHe ?? null,
    eventHe,
    knownToPlayer: known,
    currentLocation: here,
    targetLocation: target,
    targetHe,
    alreadyThere: !moving,
    atHome,
    travelMinutes,
    arrivalBufferMinutes: buffer,
    safeDepartureMinute: safeDeparture,
    safeStayUntilMinute: safeDeparture,
    plannedArrivalMinute: plannedArrival,
    earlyArrivalMinute: moving && !late && !atHome ? earlyArrival : null,
    mode,
    late,
    route,
    optionalActions: [],
    blockers,
    safe: blockers.length === 0,
    lapse,
    closesDay: closes(beat),
    freeMinutes,
  }
  plan.optionalActions = sideActions(state, era, plan)
  return plan
}

/** stable across the minutes of one wait — it changes only when the situation does (§19) */
export function planIdOf(gate: TimeGate, here: LocationId, target: LocationId | null): string {
  return `ft|${gate.beatId}|${gate.minute}|${here}|${target ?? '-'}`
}

/** the same plan, leaving now instead of on time (travel-and-wait) */
export const EARLY_SUFFIX = '|early'
/** the same plan, with the player's explicit "let it pass" on a lapse (§17) */
export const LET_PASS_SUFFIX = '|let-pass'

/** what `advanceTime(planId)` answers the shell — enough for the transition, nothing more */
export type AdvanceResult =
  | { ok: false; reason: string }
  | { ok: true; fromMinute: number; toMinute: number; fromHe: string; toHe: string; walked: boolean; stopped: boolean }

// --------------------------------------------------------------- side actions ---

const TIGHT_UNDER = 5

function tierOf(margin: number | null): FreeTimeTier {
  if (margin === null) return 'untimed'
  if (margin < 0) return 'no-fit'
  return margin < TIGHT_UNDER ? 'tight' : 'safe'
}

/** the offer's kind in the planner's vocabulary: work is work, everything else is an activity */
const actionKind = (offer: Offer): FreeTimeAction['kind'] => (offer.kind === 'work' || offer.kind === 'favour' ? 'work' : 'activity')

function rewardOf(offer: Offer): string | undefined {
  if (offer.kind === 'play') return 'בשביל הכיף'
  if (offer.status === 'open' && offer.payTop > 0) return offer.kind === 'wager' ? `אפשר לזכות עד ${offer.payTop} ₪` : `עד ${offer.payTop} ₪`
  if (offer.kind === 'favour') return 'טובה למישהו'
  return undefined
}

/**
 * What fits before he should move (§17, §26, §27). Read from the systems that own it —
 * today's offers (`offers.ts`, known places only), the opportunity windows (`actionsNow`),
 * the album — and measured with the same walk the advance would take. A row that does not
 * fit is shown only when missing the event is a real, authored consequence (a lapse): then
 * staying is a dramatic choice, and the row says what it costs.
 */
export function sideActions(state: LifeState, era: Era, plan: TimeAdvancePlan): FreeTimeAction[] {
  const here = state.location
  const now = state.minute
  // where he must be, and by when, for the plan to still work
  const mustBe = plan.targetLocation ?? (plan.alreadyThere && list(nextTimeGate(state, era)?.at).length ? here : null)
  const deadline = plan.plannedArrivalMinute
  const walk = (from: LocationId, to: LocationId) => (from === to ? 0 : travelPlan(state, state.chapter, from, to))
  const rows: FreeTimeAction[] = []

  /** the walk there and — when he must be somewhere after — the walk on; null: cannot get there */
  const measure = (location: LocationId | null): { go: number; back: number } | null => {
    if (!location) return { go: 0, back: 0 }
    const there = walk(here, location)
    if (there !== 0 && !there.reachable) return null
    const on = mustBe ? walk(location, mustBe) : 0
    if (on !== 0 && !on.reachable) return null
    return { go: there === 0 ? 0 : there.minutes, back: on === 0 ? 0 : on.minutes }
  }

  const push = (row: Omit<FreeTimeAction, 'travelMinutes' | 'totalMinutes' | 'fits' | 'marginMinutes' | 'tier'>) => {
    const m = measure(row.location)
    if (!m) return
    const total = row.durationMinutes === null ? null : m.go + row.durationMinutes
    // `deadline` already has the arrival buffer in it (event − buffer)
    const margin = total === null ? null : deadline - now - total - m.back
    const tier = tierOf(margin)
    if (tier === 'no-fit' && !plan.lapse) return
    rows.push({
      ...row,
      travelMinutes: m.go,
      totalMinutes: total,
      fits: tier === 'safe' || tier === 'tight' || tier === 'untimed',
      marginMinutes: margin,
      tier,
      ...(tier === 'no-fit' ? { riskHe: plan.eventHe ? `${plan.eventHe} — כנראה בלעדיך.` : 'זה לא ייגמר בזמן.' } : {}),
    })
  }

  for (const offer of offersNow(state)) {
    if (!startable(offer)) continue
    if (!hostThere(state, era, offer)) continue
    const reward = rewardOf(offer)
    push({
      id: offer.id,
      titleHe: offer.titleHe || offer.hostHe,
      subtitleHe: offer.here ? offer.hostHe : `${offer.hostHe} · ${offer.placeHe}`,
      kind: actionKind(offer),
      location: offer.where,
      durationMinutes: offer.minutes > 0 ? offer.minutes : null,
      ...(reward ? { rewardHe: reward } : {}),
      start: offer.here ? { kind: 'talk', act: offer.act } : { kind: 'go', to: offer.where },
    })
  }

  for (const action of actionsNow(state, era)) {
    if (action.kind !== 'opportunity' || !action.knownToPlayer || !action.location) continue
    // a window that closes before he could get there is not an option, it is a memory
    if (action.availableUntil !== null && action.availableUntil <= now) continue
    push({
      id: action.id,
      titleHe: action.titleHe,
      kind: 'social',
      location: action.location,
      durationMinutes: action.durationMinutes,
      start: action.location === here ? { kind: 'go', to: here } : { kind: 'go', to: action.location },
    })
  }

  // the album costs no afternoon: the world stops while it is open
  if (albumTotals(state).have > 0) {
    push({ id: 'collection:album', titleHe: 'האלבום', kind: 'collection', location: null, durationMinutes: null, start: { kind: 'sheet', sheet: 'album' } })
  }

  const order: Record<FreeTimeTier, number> = { safe: 0, tight: 1, untimed: 2, 'no-fit': 3 }
  /**
   * delta 91 — the opportunity resolver (MASTER §5, §51) ranks what fits: a situation a
   * person asked for (a mission, on a route he holds) before a job, a job before a game; a
   * mechanic he has just played three times steps back. It chooses only among these rows —
   * it never adds one — and a row it hides is a row the world should not press.
   */
  const resolved = resolveLifeOpportunities({ state, chapter: state.chapter, scene: here })
  const rank = (row: FreeTimeAction) => (row.kind === 'collection' || row.kind === 'social' ? TIER_RANK.optional : TIER_RANK[opportunityTier(resolved, row.id)])
  return rows
    .filter((row) => rank(row) < TIER_RANK.hidden)
    .sort((a, b) => order[a.tier] - order[b.tier] || rank(a) - rank(b) || Number(b.location === here) - Number(a.location === here) || (a.totalMinutes ?? 0) - (b.totalMinutes ?? 0))
    .slice(0, 4)
}

/**
 * The person who offers it is actually standing there now. `offers.ts` reads a room's
 * `when`; the timetable decides who is in it this hour — Rachel's kitchen job does not
 * exist at ten in the morning while she is at work.
 */
function hostThere(state: LifeState, era: Era, offer: Offer): boolean {
  const base = sceneById.get(offer.where)
  if (!base) return true
  const room = sceneIn(base, state.chapter)
  const byTalk = room.actors.filter((actor) => actor.talk === offer.act && inEra(actor, state.chapter))
  // a spot in the room that belongs to a person (`Gig.hostActor`): that person has to be there
  const owner = offer.gig ? GIGS.find((gig) => gig.id === offer.gig)?.hostActor : undefined
  const hosts = byTalk.length || !owner ? byTalk : room.actors.filter((actor) => actor.id.startsWith(owner) && inEra(actor, state.chapter))
  if (!hosts.length) return !owner // a hotspot, a counter, a door: always there — unless it is someone's

  const placed = placementsAt(state, era.schedule, offer.where)
  return hosts.some((actor) => {
    const slot = placed.get(actor.id)
    return slot ? slot.visible : true
  })
}

// ------------------------------------------------------------------- preflight ---

export type Preflight = { ok: true } | { ok: false; reason: string }

/**
 * §16: before the CTA is live. `early` asks about leaving now rather than on time.
 * A lapse is never auto-advanced by the default CTA; `letPass` is the player's explicit
 * "let it go" (§17 — a dramatic choice, in his words).
 */
export function preflight(plan: TimeAdvancePlan, { early = false, letPass = false } = {}): Preflight {
  if (plan.targetLocation && !plan.alreadyThere && !plan.route) return { ok: false, reason: 'route' }
  for (const blocker of plan.blockers) {
    if (blocker === 'lapse' && letPass) continue
    return { ok: false, reason: blocker }
  }
  if (plan.plannedArrivalMinute > plan.eventMinute) return { ok: false, reason: 'too-late' }
  if (early && plan.earlyArrivalMinute === null) return { ok: false, reason: 'no-walk' }
  return { ok: true }
}

// ---------------------------------------------------------------------- steps ---

export type AdvanceStep =
  | { kind: 'clock'; to: number; minutes: number; why: 'boundary' | 'depart' | 'land' }
  | { kind: 'travel'; to: LocationId; spawn: string; minutes: number; placeHe: string }

/**
 * The advance as the world will live it (§18, §20): the clock through every minute the world
 * has an opinion about, then the walk, then — for a wait — the landing. The executor
 * (`WorldScene.advanceTime`, the headless sim in the tests) stops at the first step after
 * which something authored is playing.
 */
export function advanceSteps(plan: TimeAdvancePlan, state: LifeState, era: Era, { early = false } = {}): AdvanceStep[] {
  const steps: AdvanceStep[] = []
  let clock = state.minute
  const walkTo = (to: number, why: 'depart' | 'land') => {
    for (const minute of boundaries(state, era, clock, to)) {
      steps.push({ kind: 'clock', to: minute, minutes: minute - clock, why: 'boundary' })
      clock = minute
    }
    if (to > clock) {
      steps.push({ kind: 'clock', to, minutes: to - clock, why })
      clock = to
    }
  }
  if (plan.alreadyThere || !plan.targetLocation) {
    walkTo(plan.plannedArrivalMinute, 'land')
    return steps
  }
  const travel = travelPlan(state, state.chapter, state.location, plan.targetLocation)
  const last = travel.legs.at(-1)
  if (!early) walkTo(plan.safeDepartureMinute, 'depart')
  steps.push({ kind: 'travel', to: plan.targetLocation, spawn: last?.spawn ?? 'start', minutes: travel.minutes, placeHe: plan.targetHe ?? plan.targetLocation })
  return steps
}

// -------------------------------------------------------------------- landing ---

export type LandingReport = {
  ok: boolean
  /** what the player has in front of him now, as a code the QA reads */
  has: 'event' | 'waiting' | 'action' | 'none'
  issues: string[]
}

/**
 * §32–§33: after an advance, one of these must be true within a breath — the event has
 * started (its beat fired / its person is here), the HUD still names what he waits for
 * (a gate ahead), or there is a revealed action to take. Anything else is a flow failure
 * the tests and the dev console catch.
 */
export function verifyLanding(
  state: LifeState,
  era: Era,
  plan: TimeAdvancePlan,
  { actorsHere = [], busy = false, early = false }: { actorsHere?: readonly string[]; busy?: boolean; early?: boolean } = {},
): LandingReport {
  const issues: string[] = []
  if (!early && plan.targetLocation && state.location !== plan.targetLocation) issues.push(`not-at-target:${state.location}`)
  if (state.minute > plan.eventMinute && !busy && !state.flags[beatFlag(plan.beatId)] && nextTimeGate(state, era)?.beatId === plan.beatId) {
    issues.push('overshot')
  }
  const fired = Boolean(state.flags[beatFlag(plan.beatId)]) || busy
  if (fired || state.chapterDone) return { ok: issues.length === 0, has: 'event', issues }
  const gate = nextTimeGate(state, era)
  if (gate) return { ok: issues.length === 0, has: 'waiting', issues }
  const main = actionsNow(state, era).find((action) => action.primary)
  if (main || actorsHere.length > 0 || era.objective(state, state.location, Boolean(state.flags['match:over']))) {
    return { ok: issues.length === 0, has: 'action', issues }
  }
  issues.push('dead-landing')
  return { ok: false, has: 'none', issues }
}
