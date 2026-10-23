/**
 * LIFE — what you made stays in the world.
 *
 * The owner (23.10.2026): the script can say "the same crooked line", but nothing carried that product to the
 * 3D world, so the game never showed it. An artefact is the small record of one thing he made or changed — a car
 * he washed, a scarf he stitched, the crew's banner with its stroke, a poster he folded — kept in the append-only
 * log as a `made` event, folded into `state.made`, and handed to TOWN in the scene contract. TOWN builds the look
 * from the record; the record never holds pixels.
 *
 * The simulator never reads `made` (it is not part of its state key): an artefact is something to see, never a
 * condition — anything the story decides on stays a flag.
 */
import {handsFor, plan} from './hands'
import type {Artefact, LifeState} from './types'

export type {Artefact, ArtefactKind, ArtefactMark} from './types'

type Result = 'good' | 'ok' | 'slip'
const DONE: Record<Result, number> = {good: 1, ok: 0.7, slip: 0.4}

/**
 * The artefact a finished small game leaves, if its craft makes a thing: a wash leaves a car, a stitch a scarf, a
 * stencil the crew's banner (whose stencil always slips at the second letter — `hands.ts` writes that moment).
 * Pure: the same play, result, chapter and age always make the same record.
 */
export function artefactOf(playId: string, result: Result, chapter: string, age = 0): Artefact | null {
  const action = handsFor(playId)
  if (!action) return null
  const p = plan(action, playId, age), done = DONE[result]
  switch (action) {
    case 'wash': return {id: 'car', kind: 'car', variant: p.variant, zonesDone: done, marks: done < 1 ? [{type: 'streak'}] : [], madeIn: chapter}
    case 'stitch': return {id: 'scarf', kind: 'scarf', variant: p.variant, zonesDone: done, marks: [{type: 'patch'}], madeIn: chapter}
    case 'stencil': return {id: 'banner', kind: 'banner', variant: p.variant, zonesDone: done, marks: [{type: 'crooked-stroke', at: p.interrupt?.zone ?? 'l2'}], madeIn: chapter}
    default: return null
  }
}

/**
 * Everything TOWN should show, from what was made and from what the story already wrote down as flags: the crew's
 * decision about the stroke (fixed under paint, kept, or the mate's call), the poster folded into the box.
 * A flag-only life (an old save, or a road that skipped the game) still sees the banner the story speaks of.
 */
export function worldArtefacts(state: LifeState): Artefact[] {
  const made = {...(state.made ?? {})}
  const stroke = state.flags['life:banner:stroke']
  if (typeof stroke === 'string') {
    const b = made.banner ?? {id: 'banner', kind: 'banner' as const, variant: 'one coat', zonesDone: 1, marks: [{type: 'crooked-stroke' as const, at: 'l2'}], madeIn: 'R-TER'}
    const marks = b.marks.filter(m => m.type !== 'painted-over' && m.type !== 'own-star')
    if (stroke === 'fixed') marks.push({type: 'painted-over', at: 'l2'})
    if (stroke === 'handed') marks.push({type: 'own-star'})
    made.banner = {...b, variant: stroke, marks}
  }
  const poster = state.flags['life:master:F12:item']
  if (poster === 'box' || poster === 'wall') made.poster = {id: 'poster', kind: 'poster', variant: poster, zonesDone: 1, marks: poster === 'box' ? [{type: 'crease'}] : [], madeIn: 'F12'}
  return Object.values(made)
}
