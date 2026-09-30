import { checklistFor, type ChecklistItem } from '../checklist'
import type { Era } from '../content/era'
import type { LifeState } from '../types'
import { actionsNow, type LifeAction } from './actions'
import { nextTimeGate, type TimeGate } from './flow'

/**
 * הגרף החי — the one reading of "what can the player meaningfully do next" (§24).
 *
 * Not a new system: it is `actionsNow` (the checklist spine, open opportunities, route
 * invitations — the same rows the "?" sheet lists) and `nextTimeGate` (the same gate the
 * flow layer cuts forward to), read once and named. Help, flow and the repeated-dialogue
 * resolver (`followUp.ts`) all read these two functions, so they cannot disagree about
 * what the main action is: if the sheet says "רשות מאמא", the friend in the yard is
 * answering the same row.
 *
 * `mainStep` is the checklist step id behind the primary action ("permission"), which is
 * the vocabulary a follow-up line is keyed on — a step id, never a sentence.
 */
export type LiveGraph = {
  main: LifeAction | null
  /** the checklist step id of `main`, when the main action is a story step */
  mainStep: string | null
  /** every step the player has discovered, ticked or not — what the "?" sheet shows */
  story: readonly ChecklistItem[]
  /** revealed side actions: open windows, route invitations */
  optional: readonly LifeAction[]
  /** the next beat that only the clock is holding back, if any */
  timeGate: TimeGate | null
}

const STORY_PREFIX = 'story:'

export function liveGraph(state: LifeState, era: Era): LiveGraph {
  const actions = actionsNow(state, era)
  const main = actions.find((action) => action.primary) ?? null
  return {
    main,
    mainStep: main && main.kind === 'story' && main.id.startsWith(STORY_PREFIX) ? main.id.slice(STORY_PREFIX.length) : null,
    story: checklistFor(state),
    optional: actions.filter((action) => !action.primary),
    timeGate: nextTimeGate(state, era),
  }
}
