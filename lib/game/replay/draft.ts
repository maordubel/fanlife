import { PITCH, UNITS_PER_METRE } from '@/lib/game/goal-zones'
import type { ReplayPoint, UserTouch } from './envelope'
import type { ReplayAction } from './vocab'

/**
 * הטיוטה — the touch being built, as data, with no screen attached.
 *
 * A touch is four decisions — who, what, from where, to where — and the builder, the step
 * bar and the caption on the pitch all ask the same question: which of the four is next?
 * Three components each answering it for themselves is how the caption ends up asking for
 * a player while the bar shows the action lit, so it is answered once, here, and tested.
 *
 * **Undo is a step, not a touch.** The prototype's undo walks back one decision at a time
 * (target → origin → action → player), and that is right: a player who put the man in the
 * wrong place wants the place back, not the whole touch. What the prototype could not do
 * is reach a touch that was already COMMITTED — and in this gate the second pitch tap
 * commits (rule 24), so without help the only way to move a finished touch's origin was
 * to clear it and build it again. So when the draft is empty, undo REOPENS the last touch
 * with its target cleared: the man, the verb and the place he stood are back in the draft,
 * and the next tap on the pitch sends the ball again. Tapping undo again walks on into
 * the origin, the verb, the man — the same one-step-at-a-time walk, through the commit.
 */

export type Draft = {
  actorHe: string | null
  action: ReplayAction | null
  origin: ReplayPoint | null
  target: ReplayPoint | null
}

export type DraftPhase = 'player' | 'action' | 'origin' | 'target'

export const PHASES: readonly DraftPhase[] = ['player', 'action', 'origin', 'target']

export const EMPTY_DRAFT: Draft = { actorHe: null, action: null, origin: null, target: null }

/** The whole builder: what is committed, what is being built, and which touch it replaces. */
export type BuildState = {
  touches: UserTouch[]
  draft: Draft
  /** the index being re-opened, or null when the draft is a new touch */
  editing: number | null
}

export const EMPTY_BUILD: BuildState = { touches: [], draft: EMPTY_DRAFT, editing: null }

/** Which decision is next. A draft with a man, a verb and a place is waiting for the ball. */
export function phaseOf(draft: Draft): DraftPhase {
  if (!draft.actorHe) return 'player'
  if (!draft.action) return 'action'
  if (!draft.origin) return 'origin'
  return 'target'
}

/** Which of the four decisions the draft already holds — the ✓ marks on the step bar. */
export function stepsDone(draft: Draft): Record<DraftPhase, boolean> {
  return {
    player: draft.actorHe !== null,
    action: draft.action !== null,
    origin: draft.origin !== null,
    target: draft.target !== null,
  }
}

export function draftIsEmpty(draft: Draft): boolean {
  return !draft.actorHe && !draft.action && !draft.origin && !draft.target
}

/** Whether undo has anything to walk back. */
export function canUndo(state: BuildState): boolean {
  return !draftIsEmpty(state.draft) || state.editing !== null || state.touches.length > 0
}

/**
 * One step back.
 *
 *   1. the draft's last decision, newest first: target, origin, action, player;
 *   2. an EMPTY draft that was editing a touch stops editing — that touch is left exactly
 *      as it was committed, which is what walking all the way back out of an edit means;
 *   3. an empty draft with nothing being edited reopens the LAST touch, target cleared.
 *
 * Pure: the same state in gives the same state out, and nothing else is touched.
 */
export function undoStep(state: BuildState): BuildState {
  const { draft } = state
  if (draft.target) return { ...state, draft: { ...draft, target: null } }
  if (draft.origin) return { ...state, draft: { ...draft, origin: null } }
  if (draft.action) return { ...state, draft: { ...draft, action: null } }
  if (draft.actorHe) return { ...state, draft: { ...draft, actorHe: null } }
  if (state.editing !== null) return { ...state, editing: null }
  const last = state.touches[state.touches.length - 1]
  if (!last) return state
  return {
    touches: state.touches.slice(0, -1),
    draft: { actorHe: last.actorHe, action: last.action, origin: { ...last.origin }, target: null },
    editing: null,
  }
}

export type LengthBucket = 'short' | 'medium' | 'long'

/**
 * How far the ball travelled, in METRES, off the player's own two taps.
 *
 * The board is a diagram with a different scale on each axis (`UNITS_PER_METRE`), so a
 * length measured in normalised units would call the same pass short across the pitch and
 * medium down it. Metres first, then the bucket.
 */
export function lengthMetres(from: ReplayPoint, to: ReplayPoint): number {
  const across = ((to.x - from.x) * PITCH.w) / UNITS_PER_METRE.x
  const deep = ((to.y - from.y) * PITCH.h) / UNITS_PER_METRE.y
  return Math.hypot(across, deep)
}

/** Under ten metres is short, twenty-five and over is long — a coach's reading, not ours. */
export const LENGTH_EDGES = { medium: 10, long: 25 } as const

export function lengthBucket(from: ReplayPoint, to: ReplayPoint): LengthBucket {
  const metres = lengthMetres(from, to)
  if (metres < LENGTH_EDGES.medium) return 'short'
  if (metres < LENGTH_EDGES.long) return 'medium'
  return 'long'
}
