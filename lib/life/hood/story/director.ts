/**
 * LIFE · the hood — the STORY DIRECTOR. Pure and deterministic: the same state and the same choices, the same life.
 *
 * What it guarantees (tests/life-story-director.test.ts walks seeded random lives for every core club):
 *   · `nextMissions` is NEVER empty — a chapter when one is ready, the small jobs around it, and the week's standing
 *     work when the next chapter waits for matchday or the written life has ended;
 *   · every mission keeps at least one approach open whatever the state, and main missions keep two;
 *   · whatever is chosen, the mission CONVERGES: it ends, its aftermath lands, the next one is offered;
 *   · the week walks to matchday (day 6) and starts again; a chapter moves the life on to its own age.
 * It never reads a club: the club arrives later, as a cast, a skin and (through `night.ts`) an archive night.
 */
import {CHILDHOOD, CHILDHOOD_SIDES, CHILDHOOD_SPINE, STANDING} from './childhood'
import {MATCHDAY, STAGES, type Approach, type Cond, type Effect, type Mission, type Offer, type StageId, type StoryEvent, type StoryState} from './types'

export const MISSIONS: readonly Mission[] = [...CHILDHOOD, ...CHILDHOOD_SIDES, ...STANDING]
/** the written life, slot after slot (a slot of two is a fork). Later stages join here as they are written. */
export const SPINE: readonly (readonly string[])[] = CHILDHOOD_SPINE
const BY_ID = new Map(MISSIONS.map(m => [m.id, m]))

export const missionById = (id: string): Mission | null => BY_ID.get(id) ?? null
export const doneFlag = (id: string) => `story:done:${id}`

export function newLife(): StoryState {
  return {v: 1, age: 6, week: 1, day: MATCHDAY, money: 0, rep: 0, flags: {}, bonds: {}, keeps: [], done: [], times: {}, open: null, route: 'family'}
}

export function holds(state: StoryState, c: Cond | undefined): boolean {
  if (!c) return true
  return (c.has ?? []).every(f => !!state.flags[f]) && (c.not ?? []).every(f => !state.flags[f]) && state.money >= (c.money ?? 0)
}

/** how many slots of the spine are behind him */
export function chapter(state: StoryState): number {
  let i = 0
  while (i < SPINE.length && SPINE[i]!.some(id => state.done.includes(id))) i++
  return i
}

/** the written life is finished: every slot of the spine is behind him (free roam and the standing work go on) */
export const isFinished = (state: StoryState): boolean => chapter(state) >= SPINE.length

export const stageOf = (age: number): StageId => (STAGES.find(s => age >= s.ages[0] && age <= s.ages[1]) ?? STAGES[STAGES.length - 1]!).id

const openApproaches = (state: StoryState, m: Mission): Approach[] => m.approaches.filter(a => holds(state, a.needs))
const offer = (state: StoryState, m: Mission, why: Offer['why']): Offer => ({mission: m, approaches: openApproaches(state, m), why})

/** the chapter(s) the spine points at now, whether or not today is their day */
export function ahead(state: StoryState): Mission[] {
  const slot = SPINE[chapter(state)]
  return slot ? slot.map(id => BY_ID.get(id)!) : []
}

/** days until the chapter ahead can be played (0: today) */
export function waits(state: StoryState): number {
  const next = ahead(state)
  if (!next.length || next.some(m => m.day === 'any')) return 0
  return (MATCHDAY - state.day + 7) % 7
}

/**
 * What is in front of him now. Never empty:
 *   a mission he already accepted → only that one;
 *   a chapter ready today → it (both sides of a fork), with the side jobs that are open;
 *   the chapter waits for matchday, or the written life is over → side jobs and the standing work of the week.
 */
export function nextMissions(state: StoryState): Offer[] {
  if (state.open) { const m = BY_ID.get(state.open.id); if (m) return [offer(state, m, 'open')] }
  const main = waits(state) === 0 ? ahead(state).map(m => offer(state, m, 'main')) : []
  const sides = MISSIONS.filter(m => m.kind === 'side' && !state.done.includes(m.id) && m.age <= state.age && holds(state, m.needs)).map(m => offer(state, m, 'side'))
  const standing = main.length ? [] : STANDING.map(m => offer(state, m, 'standing'))
  return [...main, ...sides, ...standing].filter(o => o.approaches.length > 0)
}

/** he said yes to a person and picked a way: the mission is open, nothing else is offered until it ends */
export function accept(state: StoryState, missionId: string, approachId: string): StoryState {
  if (state.open) throw new Error(`STORY_OPEN: ${state.open.id} is not finished`)
  const o = nextMissions(state).find(x => x.mission.id === missionId)
  if (!o) throw new Error(`STORY_NOT_OFFERED: ${missionId}`)
  if (!o.approaches.some(a => a.id === approachId)) throw new Error(`STORY_APPROACH: ${missionId}.${approachId}`)
  return {...state, open: {id: missionId, approach: approachId}}
}

/** he changed his mind before the end: the mission closes with nothing changed and is offered again */
export const walkAway = (state: StoryState): StoryState => ({...state, open: null})

function apply(state: StoryState, effects: readonly Effect[], events: StoryEvent[]): StoryState {
  const s = {...state, flags: {...state.flags}, bonds: {...state.bonds}, keeps: [...state.keeps]}
  for (const e of effects) {
    if ('flag' in e) s.flags[e.flag] = e.v ?? true
    else if ('bond' in e) s.bonds[e.bond] = (s.bonds[e.bond] ?? 0) + e.n
    else if ('money' in e) s.money = Math.max(0, s.money + e.money)
    else if ('rep' in e) s.rep = s.rep + e.rep
    else if (!s.keeps.includes(e.keep)) { s.keeps.push(e.keep); events.push({k: 'kept', id: e.keep}) }
  }
  return s
}

const tomorrow = (s: StoryState, events: StoryEvent[]): StoryState => {
  if (s.day < MATCHDAY) return {...s, day: s.day + 1}
  events.push({k: 'week', week: s.week + 1})
  return {...s, day: 0, week: s.week + 1}
}

/** the day ends with no job done (the front door): the week still walks to matchday */
export function endDay(state: StoryState): {state: StoryState; events: StoryEvent[]} {
  if (state.open) throw new Error(`STORY_OPEN: ${state.open.id} is not finished`)
  const events: StoryEvent[] = []
  return {state: tomorrow(state, events), events}
}

/**
 * The open mission ends. `choice` answers its complication (a main mission always has one; an unknown or missing
 * answer takes the first, so nothing can strand him). Approach, complication and aftermath land in that order.
 */
export function resolve(state: StoryState, choice?: string): {state: StoryState; events: StoryEvent[]} {
  if (!state.open) throw new Error('STORY_NOTHING_OPEN')
  const m = BY_ID.get(state.open.id)!
  const how = m.approaches.find(a => a.id === state.open!.approach) ?? m.approaches[0]!
  const events: StoryEvent[] = []
  const picked = m.complication ? m.complication.choices.find(c => c.id === choice) ?? m.complication.choices[0]! : null
  let s = apply({...state, open: null}, how.effects, events)
  if (picked) s = apply(s, picked.effects, events)
  s = apply(s, m.aftermath, events)
  s.flags[`story:how:${m.id}`] = how.id
  if (picked) s.flags[`story:met:${m.id}`] = picked.id
  if (m.kind === 'standing') s = {...s, times: {...s.times, [m.id]: (s.times[m.id] ?? 0) + 1}}
  else { s = {...s, done: [...s.done, m.id]}; s.flags[doneFlag(m.id)] = true }
  events.push({k: 'aftermath', mission: m.id, key: `story.m.${m.id}.aftermath`})
  if (m.kind === 'main') {
    if (m.template) events.push({k: 'watch', mission: m.id, template: m.template})
    const next = ahead(s)[0]
    if (next && next.age > s.age) { events.push({k: 'bridge', from: s.age, to: next.age}); s = {...s, age: next.age} }
    if (!next || stageOf(next.age) !== m.stage) events.push({k: 'stage-end', stage: m.stage})
  }
  return {state: tomorrow(s, events), events}
}

/** the steps of the open mission as he must do them: the approach's own, then the one every approach ends on */
export function stepsOf(m: Mission, approachId: string) {
  const how = m.approaches.find(a => a.id === approachId)
  if (!how) throw new Error(`STORY_APPROACH: ${m.id}.${approachId}`)
  return [...how.steps, m.converge]
}
