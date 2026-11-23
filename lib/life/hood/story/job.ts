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

/** `HoodJob` with a story id: `types.ts` names one job today, and its owner widens `JobId` when story jobs are mounted */
export type StoryJob = Omit<HoodJob, 'id'> & {id: string; approach: string}
export type StoryJobPlan = {job: StoryJob; steps: Step[]; pickups: Pickup[]}

const BASE = {npc: null, cost: 0, hold: 0, group: 0, joins: false, leaves: false, reveals: false} as const

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
    steps.push({...BASE, kind: 'collect', x: place.x, z: place.z + side * 2.2, r: 1.1, key: objectiveKey(s), say: null} as Step)
    for (let k = 0; k < n; k++) pickups.push({x: place.x + (k - (n - 1) / 2) * 1.4, z: place.z + side * 2.2, kind: s.item, step: from + i})
  })
  const key = `story.m.${m.id}`
  return {job: {id: m.id, approach: approachId, giver: m.giver, from, steps: steps.length, titleKey: `${key}.title`, offerKey: `${key}.offer`, againKey: `${key}.again`, doneKey: `${key}.done`}, steps, pickups}
}
