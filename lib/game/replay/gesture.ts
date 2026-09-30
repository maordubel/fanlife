import { MAX_TOUCHES, PITCH, UNITS_PER_METRE } from '@/lib/game/goal-zones'
import { EMPTY_DRAFT, lengthMetres, type BuildState } from './draft'
import type { ReplayPoint, UserTouch } from './envelope'
import type { ReplayAction } from './vocab'

/**
 * המחווה — gate 8 played with the hands (delta 88, Maor 24.9.2026).
 *
 * *"נורא 'לחיצה' משעממת, שום תנועה"* — the builder asked four questions per touch from four
 * rows of buttons. The move is now made the way a supporter would show it on a table with
 * salt shakers: the men STAND on the grass, you drag the one who started it to where he
 * got the ball, then you drag the BALL — onto a team-mate (a pass, and he has it now),
 * into space (a ball in behind), into the net (the finish). Drag the man who has it and he
 * CARRIES it. The verb is read off the gesture, and one tap on the verb strip corrects it.
 *
 * This module is the gesture as data: which verb a drag means, and what the build becomes
 * after it. Pure, client-safe, and tested (`tests/goal-gesture.test.ts`). It never knows
 * the answer — the verdict still comes from `gradeGoal` on the server (rule 4 of the
 * trivia wing, in this gate's shape).
 *
 * **The ball has one place at a time**, and it is derived, never stored: at the feet of
 * the man in the draft when there is one, else where the last touch sent it, else nowhere
 * (the move has not started). That is continuity drawn as a rule of the board: touch N+1
 * starts where touch N ended unless you deliberately put him somewhere else.
 */

/** board units ↔ normalised */
const bx = (p: ReplayPoint) => p.x * PITCH.w
const by = (p: ReplayPoint) => p.y * PITCH.h

/** The goal mouth as a drop target: between the posts' surroundings, on or behind the line. */
export function inMouth(p: ReplayPoint): boolean {
  return by(p) <= PITCH.goalY + 4 && bx(p) >= 100 && bx(p) <= 200
}

/** The penalty area as drawn (68..232 × 12..79). */
export function inBox(p: ReplayPoint): boolean {
  return bx(p) >= 68 && bx(p) <= 232 && by(p) >= PITCH.goalY - 2 && by(p) <= 79
}

/** Out wide — outside the lines of the penalty area. */
export function isWide(p: ReplayPoint): boolean {
  return bx(p) < 68 || bx(p) > 232
}

/** Metres gained toward the goal (positive = forward). */
export function forwardMetres(from: ReplayPoint, to: ReplayPoint): number {
  return ((from.y - to.y) * PITCH.h) / UNITS_PER_METRE.y
}

/** Closer than this to where he stood is him keeping it, not a pass. */
export const CARRY_METRES = 9

export type VerbContext = {
  origin: ReplayPoint
  target: ReplayPoint
  /** a named team-mate the ball was dropped on */
  receiver?: string | null
  /** the verb of the touch before this one — a ball met after a cross is met with the head */
  previous?: ReplayAction | null
  /** the man on the ball plays for the other side (a keeper's parry) */
  opponent?: boolean
  /** the man himself was dragged — he carried it */
  carried?: boolean
}

/**
 * What a drag means. Every branch is a football reading a supporter would make at a glance,
 * and every one of them can be overruled by one tap on the verb strip.
 */
export function inferVerb(ctx: VerbContext): ReplayAction {
  const { origin, target, receiver = null, previous = null, opponent = false, carried = false } = ctx
  if (opponent) return 'save'
  if (inMouth(target)) return previous === 'cross' ? 'header' : 'shot'
  if (carried) return 'dribble'
  const metres = lengthMetres(origin, target)
  if (!receiver && metres < CARRY_METRES) return 'dribble'
  if (isWide(origin) && inBox(target)) return 'cross'
  const forward = forwardMetres(origin, target)
  if (!receiver && forward > 8) return 'throughBall'
  if (receiver && forward > 20) return 'throughBall'
  return 'pass'
}

/** Where the ball is now. */
export function ballAt(state: BuildState): ReplayPoint | null {
  if (state.draft.origin) return state.draft.origin
  const last = state.touches[state.touches.length - 1]
  return last ? last.target : null
}

/** Who has it at his feet — the man in the draft, once he is standing somewhere. */
export function holderOf(state: BuildState): string | null {
  return state.draft.actorHe && state.draft.origin ? state.draft.actorHe : null
}

/** Whether the ball is lying loose (sent into space / the net) waiting for the next man. */
export function ballLoose(state: BuildState): boolean {
  return !holderOf(state) && state.touches.length > 0
}

/** Whether the build can take one more touch (editing a touch is always allowed). */
export function roomForTouch(state: BuildState): boolean {
  return state.editing !== null || state.touches.length < MAX_TOUCHES
}

/**
 * He stands there with the ball: the actor and the origin, in one gesture. While a touch is
 * re-opened for editing the verb is kept — moving where a man stood is not a new decision
 * about what he did.
 */
export function standAt(state: BuildState, name: string, at: ReplayPoint): BuildState {
  if (!roomForTouch(state)) return state
  return {
    ...state,
    draft: {
      actorHe: name,
      action: state.editing !== null ? state.draft.action : null,
      origin: { ...at },
      target: null,
    },
  }
}

export type SendOptions = {
  /** the team-mate the ball was dropped on — he is on it next */
  receiver?: { name: string; at: ReplayPoint } | null
  /** the man on the ball plays for the other side */
  opponent?: boolean
  /** the man was dragged, not the ball */
  carried?: boolean
}

/**
 * The ball goes. Returns the new build and the touch that was committed, or null when there
 * is nobody on the ball (or no room). A verb already chosen (an edited touch, or one picked
 * on the strip before the drag) wins over the reading of the gesture.
 */
export function sendBall(
  state: BuildState,
  target: ReplayPoint,
  options: SendOptions = {},
): { state: BuildState; touch: UserTouch } | null {
  const { draft, editing, touches } = state
  if (!draft.actorHe || !draft.origin) return null
  if (!roomForTouch(state)) return null
  const receiver = options.receiver ?? null
  const previous = editing !== null ? touches[editing - 1]?.action ?? null : touches[touches.length - 1]?.action ?? null
  const action =
    draft.action ??
    inferVerb({
      origin: draft.origin,
      target,
      receiver: receiver?.name ?? null,
      previous,
      opponent: options.opponent,
      carried: options.carried,
    })
  const touch: UserTouch = { actorHe: draft.actorHe, action, origin: { ...draft.origin }, target: { ...target } }

  if (editing !== null) {
    return {
      touch,
      state: { touches: touches.map((item, index) => (index === editing ? touch : item)), draft: EMPTY_DRAFT, editing: null },
    }
  }

  const next = [...touches, touch]
  const full = next.length >= MAX_TOUCHES
  // who is on it now: the team-mate it was played to, or the same man if he kept it
  const draftNext =
    full || inMouth(target)
      ? EMPTY_DRAFT
      : receiver
        ? { actorHe: receiver.name, action: null, origin: { ...receiver.at }, target: null }
        : action === 'dribble'
          ? { actorHe: draft.actorHe, action: null, origin: { ...target }, target: null }
          : EMPTY_DRAFT
  return { touch, state: { touches: next, draft: draftNext, editing: null } }
}

/** One tap on the verb strip: the touch being edited, or else the last one committed. */
export function setVerb(state: BuildState, action: ReplayAction): BuildState {
  if (state.editing !== null || (state.draft.actorHe && state.draft.origin && state.touches.length === 0)) {
    return { ...state, draft: { ...state.draft, action } }
  }
  const index = state.touches.length - 1
  if (index < 0) return { ...state, draft: { ...state.draft, action } }
  return { ...state, touches: state.touches.map((touch, at) => (at === index ? { ...touch, action } : touch)) }
}

/** Which touch the verb strip is talking about (null: the one about to be made). */
export function verbFocus(state: BuildState): number | null {
  if (state.editing !== null) return state.editing
  if (state.touches.length === 0) return null
  return state.touches.length - 1
}

/** The verb the strip shows as chosen. */
export function focusedVerb(state: BuildState): ReplayAction | null {
  const focus = verbFocus(state)
  if (state.editing !== null) return state.draft.action
  if (focus === null) return state.draft.action
  return state.touches[focus]?.action ?? null
}

/** Re-open a committed touch: the man back where he stood, the ball back at his feet. */
export function reopen(state: BuildState, index: number): BuildState {
  const touch = state.touches[index]
  if (!touch) return state
  return { ...state, editing: index, draft: { actorHe: touch.actorHe, action: touch.action, origin: { ...touch.origin }, target: null } }
}

/**
 * The first slots the men stand on before anything is decided — spread over the half, the
 * other side's man (a keeper) on his line. They say nothing about the move: the same slots
 * for every goal, filled in the pool's own (shuffled) order.
 */
const SLOTS: ReplayPoint[] = [
  { x: 0.5, y: 0.86 },
  { x: 0.2, y: 0.74 },
  { x: 0.8, y: 0.74 },
  { x: 0.35, y: 0.6 },
  { x: 0.65, y: 0.6 },
  { x: 0.14, y: 0.46 },
  { x: 0.86, y: 0.46 },
  { x: 0.5, y: 0.46 },
]
const AWAY_SLOTS: ReplayPoint[] = [
  { x: 0.5, y: 0.075 },
  { x: 0.36, y: 0.16 },
  { x: 0.64, y: 0.16 },
]

export function openingSpots(pool: string[], opponents: string[]): Record<string, ReplayPoint> {
  const spots: Record<string, ReplayPoint> = {}
  let home = 0
  let away = 0
  for (const name of pool) {
    if (opponents.includes(name)) spots[name] = { ...(AWAY_SLOTS[away++ % AWAY_SLOTS.length] as ReplayPoint) }
    else spots[name] = { ...(SLOTS[home++ % SLOTS.length] as ReplayPoint) }
  }
  return spots
}

/** How close (board units) a dropped ball must land to a man for it to be played TO him. */
export const RECEIVE_RADIUS = 26

export function nearestMan(
  at: ReplayPoint,
  spots: Record<string, ReplayPoint>,
  exclude: string | null,
): string | null {
  let best: string | null = null
  let bestD = RECEIVE_RADIUS
  for (const [name, spot] of Object.entries(spots)) {
    if (name === exclude) continue
    const d = Math.hypot(bx(spot) - bx(at), by(spot) - by(at))
    if (d < bestD) {
      bestD = d
      best = name
    }
  }
  return best
}

/** Tension 0..1 — how many touches, and how close the ball is to the goal. */
export function tension(state: BuildState): number {
  const ball = ballAt(state)
  const near = ball ? Math.max(0, 1 - by(ball) / (PITCH.h * 0.8)) : 0
  return Math.min(1, state.touches.length * 0.14 + near * 0.6)
}
