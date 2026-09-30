import { checklistFor } from '../checklist'
import { sceneAlive } from './placeLifecycle'
import type { Era } from '../content/era'
import { view as opportunityView } from '../opportunities'
import { eligibleFor, offeredFlag } from '../routes'
import type { LifeState, LocationId } from '../types'

/**
 * מה אפשר לעשות עכשיו — one semantic reading over systems that already exist.
 *
 * This is deliberately NOT another quest engine. The story remains in `checklist.ts`,
 * timed side opportunities remain in `opportunities.ts`, and life-route eligibility stays
 * in `routes.ts`. This file only gives flow/UI/tests one answer instead of asking three
 * registries independently.
 *
 * An action is visible only after its own system says the player can know about it. The
 * resolver therefore never spoils a hidden checklist step and never advertises a route
 * title that has already been offered in this chapter.
 */

export type LifeActionKind = 'story' | 'opportunity' | 'route'

export type LifeAction = {
  id: string
  kind: LifeActionKind
  titleHe: string
  /** story actions can be the spine; side/route actions are choices around it */
  primary: boolean
  /*
   * Read-only facts for the free-time planner (SMART FREE TIME §12, delta 90). Each is
   * `null` when the owning system does not know it — never a guess.
   */
  /** where it happens: the opportunity's room, or the room the chapter points the spine at */
  location: LocationId | null
  /** how long doing it takes, when its own system says */
  durationMinutes: number | null
  /** the minute it stops being possible, when it has one */
  availableUntil: number | null
  /** the player can know about it — every row here has already been revealed by its system */
  knownToPlayer: boolean
}

/** the chapter's pointer, never at a place that is gone (World Lifecycle, plan §9.5) */
function liveGoal(state: LifeState, era: Era): LocationId | null {
  const want = era.goal?.(state) ?? null
  return want && sceneAlive(state, want) ? want : null
}

export function actionsNow(state: LifeState, era: Era): readonly LifeAction[] {
  const actions: LifeAction[] = []

  const story = checklistFor(state).filter((item) => !item.done)
  story.forEach((item, index) => {
    actions.push({
      id: `story:${item.id}`,
      kind: 'story',
      titleHe: item.textHe,
      primary: index === 0,
      // the chapter's own pointer is about the spine's CURRENT step, never a later one
      location: index === 0 ? liveGoal(state, era) : null,
      durationMinutes: null,
      availableUntil: null,
      knownToPlayer: true,
    })
  })

  for (const opportunity of opportunityView(state, era.opportunities ?? [])) {
    if (opportunity.status !== 'open') continue
    actions.push({
      id: `opportunity:${opportunity.def.id}`,
      kind: 'opportunity',
      titleHe: opportunity.def.titleHe,
      primary: false,
      location: opportunity.def.location ?? null,
      durationMinutes: opportunity.def.costs?.minutes ?? null,
      availableUntil: opportunity.def.expires,
      knownToPlayer: true,
    })
  }

  for (const invitation of eligibleFor(state)) {
    if (state.flags[offeredFlag(invitation.route.id, invitation.stage)]) continue
    actions.push({
      id: `route:${invitation.route.id}:${invitation.stage}`,
      kind: 'route',
      titleHe: invitation.titleHe,
      primary: false,
      location: null,
      durationMinutes: null,
      availableUntil: null,
      knownToPlayer: true,
    })
  }

  return actions
}

export const primaryAction = (state: LifeState, era: Era): LifeAction | null =>
  actionsNow(state, era).find((action) => action.primary) ?? null

export const optionalActions = (state: LifeState, era: Era): readonly LifeAction[] =>
  actionsNow(state, era).filter((action) => !action.primary)
