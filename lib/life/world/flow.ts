import { beatFlag, type Beat } from '../content/beats'
import type { Era } from '../content/era'
import type { Condition } from './types'
import type { LifeState, LocationId } from '../types'
import { unmet } from './why'
import { actionsNow } from './actions'

/**
 * שהמשחק לא יחכה לשעון במקום השחקן — the flow layer.
 *
 * The rule is deliberately player-facing rather than technical: if the next meaningful
 * thing is waiting only for a clock, the player must be able to continue immediately
 * instead of walking in circles. If the chapter still declares an objective, the room
 * nudges toward the actions the world has already revealed. `lastResort.ts` remains an
 * invisible safety net, never the intended way a chapter advances.
 */

export type TimeGate = {
  beatId: string
  minute: number
  waitingHe?: string
  /**
   * WHERE the next thing happens (SMART FREE TIME §13) — a beat's own `at`, or the room an
   * era gate names (Rachel's key in the door is in the living room). Omitted: anywhere.
   */
  at?: LocationId | readonly LocationId[]
  freeTime?: FreeTimeMeta
}

/**
 * Optional, never required (§14): what the planner may not be able to read off the world.
 * `eventHe` names the event in the player's words; `arrivalBufferMinutes` overrides the
 * room's own buffer; `allowAutoTravel: false` keeps the walk in the player's hands (a walk
 * that IS the scene); `person: true` says the event is somebody arriving, so the wait lands
 * on the minute itself and the person is standing there.
 */
export type FreeTimeMeta = {
  eventHe?: string
  arrivalBufferMinutes?: number
  allowAutoTravel?: boolean
  person?: boolean
}

const needsOf = (state: LifeState, when?: Condition) => unmet(state, when)
const isTimeNeed = (need: string) => need.startsWith('אחרי ')

function waitsUntil(when: Condition | undefined, best = -1): number {
  if (!when) return best
  let out = best
  if (when.afterMinute !== undefined) out = Math.max(out, when.afterMinute)
  for (const part of when.all ?? []) out = Math.max(out, waitsUntil(part, best))
  for (const part of when.any ?? []) out = Math.max(out, waitsUntil(part, best))
  return out
}

/** The earliest beat blocked by time and by nothing else. */
export function nextTimeGate(state: LifeState, era: Era): TimeGate | null {
  let best: TimeGate | null = null
  for (const beat of (era.beats ?? []) as Beat[]) {
    if (state.flags[beatFlag(beat.id)]) continue
    const needs = needsOf(state, beat.when)
    if (needs.length === 0 || !needs.every(isTimeNeed)) continue
    const minute = waitsUntil(beat.when)
    if (minute < 0 || minute <= state.minute) continue
    if (!best || minute < best.minute) {
      best = {
        beatId: beat.id,
        minute,
        ...(beat.waitingHe ? { waitingHe: beat.waitingHe } : {}),
        ...(beat.at ? { at: beat.at } : {}),
        ...(beat.freeTime ? { freeTime: beat.freeTime } : {}),
      }
    }
  }
  /*
   * A chapter the scene class directs (1991) has no beats to wait on, and its day still
   * has hours in which the only next thing is a person arriving — Rachel at three, the
   * doors at seven. The era names those gates itself (`Era.timeGate`, delta 90), so the
   * same card, Help and action graph see them (§12 C).
   */
  const own = era.timeGate?.(state) ?? null
  if (own && own.minute > state.minute && (!best || own.minute < best.minute)) best = own
  return best
}

export type FlowInput = {
  state: LifeState
  era: Era
  /** authoritative: null means the chapter itself says it wants nothing more */
  objectiveHe: string | null
  quietFor: number
  busy: boolean
  /** physical targets/exits; zero with no time gate is a dead-end check, not a hint */
  reachable: number
}

/**
 * How many quiet game-minutes before the room NUDGES (a hint toast) — about a second and a
 * half of real play. It is no longer the trigger for any card: a pure time gate is DETECTED
 * at once (SMART FREE TIME §30), and when the free-time chip and its planner appear is a
 * real-time decision the shell makes (`FREE_TIME_TIMING` in `timeAdvance.ts`), because
 * "two to four seconds" is a promise about a person's patience, not about the world clock.
 */
export const QUIET_MINUTES = 1

export function shouldOfferPass(input: FlowInput): TimeGate | null {
  const move = flowMove(input)
  return move?.kind === 'pass' ? move.gate : null
}

export type FlowMove = { kind: 'pass'; gate: TimeGate } | { kind: 'nudge' }

/**
 * Flow has two sources of truth with different jobs:
 *
 * - the chapter objective says WHETHER the authored day still wants an action;
 * - `actionsNow` says WHAT already-revealed story/route/opportunity actions explain it.
 *
 * A pure time gate is checked BEFORE physical reachability. That ordering is the promise
 * "never wait for the clock": a room whose last hotspot disappeared is exactly the room
 * that must be allowed to cut forward when time is the only remaining condition. With no
 * time gate, `reachable === 0` still belongs to the dead-end watchdog.
 */
export function flowMove(input: FlowInput): FlowMove | null {
  if (input.busy) return null

  // detection is immediate; the shell paces the invitation in real seconds (§30)
  const gate = nextTimeGate(input.state, input.era)
  if (gate) return { kind: 'pass', gate }

  if (input.quietFor < QUIET_MINUTES) return null

  if (input.reachable === 0) return null
  if (!input.objectiveHe) return null

  // Resolve now even though the visual nudge is still composed by WorldScene. This makes
  // the flow decision depend on semantic actions, not on raw hotspot count, and gives QA
  // one canonical snapshot to inspect when an objective has no visible action behind it.
  void actionsNow(input.state, input.era)
  return { kind: 'nudge' }
}

/*
 * There used to be a fixed three-minute landing here: every skip landed three minutes before
 * the beat, wherever the beat was and however far away. It is gone (SMART FREE TIME §14):
 * where and when an advance lands is `world/timeAdvance.ts` — event − travel − buffer.
 */
