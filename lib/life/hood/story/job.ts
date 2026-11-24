/**
 * LIFE · the hood — a story mission, handed to the hood as the job shape it already plays (`HoodJob`, `Step`, `Pickup`).
 *
 * The adapter invents no geometry: a talk step stands on the person, a reach step on the named place, a collect step
 * beside the place, all read from the level's own `hood` meta. The job's steps are APPENDED to the level's steps
 * (`from` points at the first), so the job already in the level keeps its own indexes.
 */
import type {Level, Pickup, Step} from '@/lib/life/rush/level'
import type {HoodJob} from '../types'
import {stepsOf} from './director'
import type {Mission, StoryStep} from './types'

/** `HoodJob` with its approach: the job id is the mission id, the approach says which steps it plays */
export type StoryJob = HoodJob & {approach: string}
export type StoryJobPlan = {job: StoryJob; steps: Step[]; pickups: Pickup[]}

const BASE = {npc: null, cost: 0, hold: 0, group: 0, joins: false, leaves: false, reveals: false} as const

/**
 * A thing put down beside a place has to lie where he can walk: inside the walkable union, off the kiosk's box and a
 * pace clear of anybody standing there. The nearest such point to where it was meant to lie (the level's own rects only).
 */
export function walkableNear(level: Level, x: number, z: number): {x: number; z: number} {
  const m = 0.7
  if (!level.areas?.length) return {x, z}
  const free = (px: number, pz: number) => !(level.blocks ?? []).some(b => px > b.x0 - 0.5 && px < b.x1 + 0.5 && pz > b.z0 - 0.5 && pz < b.z1 + 0.5) && !(level.hood?.people ?? []).some(q => Math.hypot(q.x - px, q.z - pz) < 1.2)
  let best = {x, z}, bd = Infinity
  for (const a of level.areas) {
    const cx = Math.max(a.x0 + m, Math.min(a.x1 - m, x)), cz = Math.max(a.z0 + m, Math.min(a.z1 - m, z))
    for (const [dx, dz] of [[0, 0], [1.3, 0], [-1.3, 0], [0, 1.3], [0, -1.3], [1.3, 1.3], [-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3]] as const) {
      const px = Math.max(a.x0 + m, Math.min(a.x1 - m, cx + dx)), pz = Math.max(a.z0 + m, Math.min(a.z1 - m, cz + dz))
      if (!free(px, pz)) continue
      const d = Math.hypot(px - x, pz - z)
      if (d < bd) { bd = d; best = {x: px, z: pz} }
    }
  }
  return best
}

export const objectiveKey = (s: StoryStep): string => s.do === 'talk' ? `story.o.talk.${s.who}` : s.do === 'reach' ? `story.o.reach.${s.at}` : `story.o.collect.${s.item}`

export function toHoodJob(level: Level, m: Mission, approachId: string): StoryJobPlan {
  const hood = level.hood
  if (!hood) throw new Error('not a hood level')
  const from = level.steps.length
  const steps: Step[] = [], pickups: Pickup[] = []
  stepsOf(m, approachId).forEach((s, i) => {
    if (s.do === 'talk') {
      const p = hood.people.find(x => x.id === s.who)
      if (!p) throw new Error(`STORY_PERSON: ${s.who}`)
      steps.push({...BASE, kind: 'talk', x: p.x, z: p.z, r: p.r, key: objectiveKey(s), say: s.say} as Step)
      return
    }
    const place = hood.places.find(x => x.id === s.at)
    if (!place) throw new Error(`STORY_PLACE: ${s.at}`)
    if (s.do === 'reach') { steps.push({...BASE, kind: 'reach', x: place.x, z: place.z, r: Math.min(place.r, 4), key: objectiveKey(s), say: null} as Step); return }
    // the things lie a step apart beside the place, on the side its own steps have not used yet
    const n = s.n ?? 1, side = i % 2 ? 1 : -1
    // the kiosk's things lie on the open pavement in front of its counter, never in the gap behind its keeper
    const ox = s.at === 'kiosk' ? 3.4 : 0
    const c = walkableNear(level, place.x + ox, place.z + side * 2.2)
    steps.push({...BASE, kind: 'collect', x: c.x, z: c.z, r: 1.1, key: objectiveKey(s), say: null} as Step)
    for (let k = 0; k < n; k++) { const q = walkableNear(level, c.x + (k - (n - 1) / 2) * 1.4, c.z); pickups.push({x: q.x, z: q.z, kind: s.item, step: from + i}) }
  })
  const key = `story.m.${m.id}`
  return {job: {id: m.id, approach: approachId, giver: m.giver, from, steps: steps.length, titleKey: `${key}.title`, offerKey: `${key}.offer`, againKey: `${key}.again`, doneKey: `${key}.done`}, steps, pickups}
}
