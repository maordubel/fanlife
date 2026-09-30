import type { Effect } from './content/script'
import type { LifeEvent } from './events'
import type { CharacterId, LifeState, LocationId } from './types'
import { meets, type Condition } from './world/types'

/**
 * ההזדמנויות — several things worth doing, one afternoon, and a clock.
 *
 * This is the system that makes the chapter a game rather than a corridor. An
 * opportunity is a WINDOW: it opens at a minute, it closes at a minute, it lives
 * somewhere, and it belongs to somebody. Several are open at once on purpose. The
 * player cannot do all of them, nobody tells them that, and nothing on screen ever
 * presents the afternoon as a menu of three buttons — the people are simply in the
 * world, in different places, and the clock decides.
 *
 * Missing one is not a failure state and produces no message saying so. It produces a
 * different Saturday, a different relationship, and a `regret` that nothing displays.
 *
 * Nothing here executes an effect. The engine says WHAT resolved; the caller — the
 * scene, or a conversation — applies it, exactly as with dialogue, so a window can never
 * move the player or change the scene behind the world's back.
 */

export type OpportunityCost = { minutes?: number; agorot?: number; energy?: number }

export type OpportunityOutcome = {
  id: string
  /** the first outcome whose condition holds is the one that resolves */
  when?: Condition
  effects: Effect[]
}

export type LifeOpportunity = {
  id: string
  /** what it is, in the player's language — used by the profile, never as a quest log */
  titleHe: string
  era: string
  start: number
  expires: number
  location?: LocationId
  characters?: CharacterId[]
  requirements?: Condition[]
  blockers?: Condition[]
  costs?: OpportunityCost
  /**
   * Which way of solving the chapter this belongs to — information, social, street,
   * resource. A player who only ever takes one family gets a recognisably different
   * profile from a player who mixes them, and the resolver reads it.
   */
  solutionFamilies?: string[]
  outcomes: OpportunityOutcome[]
  /** shown once, quietly, when the window opens — a hint of life, not an objective */
  noticeHe?: string
  /**
   * מה נשאר אחריה — one sentence about the WORLD when the window closes.
   *
   * Never "you missed it": the player is told that the ball is no longer in the alley,
   * that the step is empty, that the crate is gone from the doorway. Production
   * directive §13 — an expiry the player cannot perceive is hidden state, and hidden
   * state that costs you something is the thing that makes a game feel unfair. It is
   * also why this is a sentence and not a notification: nobody says the word "missed".
   */
  goneHe?: string
}

export type OpportunityView = {
  def: LifeOpportunity
  status: 'open' | 'taken' | 'missed' | 'pending' | 'expired'
  minutesLeft: number
}

function allow(state: LifeState, conditions: Condition[] | undefined, wanted: boolean): boolean {
  if (!conditions || conditions.length === 0) return true
  const holds = conditions.every((condition) => meets(state, condition))
  return holds === wanted
}

/** True when the window is open, the requirements hold and nothing blocks it. */
export function isAvailable(state: LifeState, def: LifeOpportunity): boolean {
  if (state.minute < def.start || state.minute >= def.expires) return false
  if (!allow(state, def.requirements, true)) return false
  if (def.blockers && def.blockers.some((condition) => meets(state, condition))) return false
  return true
}

export function statusOf(state: LifeState, def: LifeOpportunity): OpportunityView['status'] {
  const runtime = state.opportunities.find((entry) => entry.id === def.id)
  if (runtime?.status === 'taken') return 'taken'
  if (runtime?.status === 'missed') return 'missed'
  if (state.minute >= def.expires) return 'expired'
  if (state.minute < def.start) return 'pending'
  return isAvailable(state, def) ? 'open' : 'pending'
}

export function view(state: LifeState, defs: readonly LifeOpportunity[]): OpportunityView[] {
  return defs.map((def) => ({
    def,
    status: statusOf(state, def),
    minutesLeft: Math.max(0, def.expires - state.minute),
  }))
}

/**
 * הדופק — called once per game minute.
 *
 * Two jobs and no more: announce a window that has just become real, and close one that
 * the afternoon has taken away. Both produce events, so both are in the biography and
 * both are visible to the profile screen and to any later conversation.
 */
export function tickOpportunities(
  state: LifeState,
  defs: readonly LifeOpportunity[],
): { events: LifeEvent[]; opened: LifeOpportunity[]; closed: LifeOpportunity[] } {
  const events: LifeEvent[] = []
  const opened: LifeOpportunity[] = []
  const closed: LifeOpportunity[] = []

  for (const def of defs) {
    const runtime = state.opportunities.find((entry) => entry.id === def.id)
    if (runtime && runtime.status !== 'open') continue

    if (!runtime && isAvailable(state, def)) {
      events.push({ t: 'opportunity.offered', id: def.id })
      opened.push(def)
      continue
    }

    if (runtime && runtime.status === 'open' && state.minute >= def.expires) {
      events.push({ t: 'opportunity.missed', id: def.id })
      closed.push(def)
    }
  }

  return { events, opened, closed }
}

/**
 * Which outcome a taken opportunity produced. The first matching one wins, so ordering
 * is priority ordering — the same rule dialogue branches use, because a second rule for
 * the same idea is a second rule to get wrong.
 */
export function resolveOutcome(state: LifeState, def: LifeOpportunity): OpportunityOutcome | null {
  return def.outcomes.find((outcome) => meets(state, outcome.when)) ?? null
}

/** The events for taking it: the cost, the record, and nothing else. */
export function acceptEvents(def: LifeOpportunity): LifeEvent[] {
  const events: LifeEvent[] = [{ t: 'opportunity.accepted', id: def.id }]
  if (def.costs?.minutes) events.push({ t: 'clock.advanced', minutes: def.costs.minutes })
  if (def.costs?.agorot) events.push({ t: 'money.changed', agorot: -def.costs.agorot, why: def.id })
  if (def.costs?.energy) events.push({ t: 'energy.changed', delta: -def.costs.energy })
  return events
}

/** Everything the player let go of. The profile screen tells the truth about the day. */
export function missedIn(state: LifeState, defs: readonly LifeOpportunity[]): LifeOpportunity[] {
  return defs.filter((def) => state.opportunities.some((e) => e.id === def.id && e.status === 'missed'))
}

export function takenIn(state: LifeState, defs: readonly LifeOpportunity[]): LifeOpportunity[] {
  return defs.filter((def) => state.opportunities.some((e) => e.id === def.id && e.status === 'taken'))
}

/** Which families of solution this life has actually used. Feeds the Pure Love resolver. */
export function familiesUsed(state: LifeState, defs: readonly LifeOpportunity[]): string[] {
  const out = new Set<string>()
  for (const def of takenIn(state, defs)) for (const family of def.solutionFamilies ?? []) out.add(family)
  return [...out]
}
