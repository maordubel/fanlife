/**
 * LIFE · the hood — the WHOLE LIFE, stage by stage: childhood (reused, unchanged), the teens, on your own, your turn.
 *
 * Each stage names its question and the shape its love takes (the stages THE WORKER's `pure-love.ts` reads a life
 * through: inherited, chosen, carried, handed on), its spine (slot after slot; a slot of several ids is a fork, and
 * the route forks of the teens and the twenties converge on the next shared slot), its one-off small jobs and the
 * week's standing work that keeps a mission in front of him whenever a chapter waits for matchday.
 *
 * Data only and club-agnostic. The director (`director.ts`) still plays childhood alone; adopting the whole life there
 * is two lines (`MISSIONS = LIFE_MISSIONS`, `SPINE = LIFE_SPINE`) plus the standing work by stage (`standingFor`) and
 * `STAGES[*].authored`, which belong to that file's owner. `tests/life-story-arc.test.ts` walks the whole life.
 */
import {CHILDHOOD, CHILDHOOD_SIDES, CHILDHOOD_SPINE, STANDING} from './childhood'
import {TEEN, TEEN_SIDES, TEEN_SPINE, TEEN_STANDING} from './teen'
import {YOUNG, YOUNG_SIDES, YOUNG_SPINE, YOUNG_STANDING} from './young'
import {ADULT, ADULT_SIDES, ADULT_SPINE, ADULT_STANDING} from './adult'
import type {Mission, RouteId, StageId, StoryState} from './types'

export type LoveShape = 'inherited' | 'chosen' | 'carried' | 'handed-on'

export type LifeStage = {
  id: StageId
  ages: [number, number]
  authored: true
  /** what this stage asks, as a word key (`arc-words.ts`) */
  question: string
  /** the stage's theme line, as a word key */
  theme: string
  love: LoveShape
  missions: readonly Mission[]
  spine: readonly (readonly string[])[]
  sides: readonly Mission[]
  standing: readonly Mission[]
  /** the fork in this stage where a route is chosen, if any */
  routeFork: string | null
}

export const LIFE_STAGES: readonly LifeStage[] = [
  {id: 'child', ages: [6, 12], authored: true, question: 'story.question.child', theme: 'story.theme.child', love: 'inherited', missions: CHILDHOOD, spine: CHILDHOOD_SPINE, sides: CHILDHOOD_SIDES, standing: STANDING, routeFork: null},
  {id: 'teen', ages: [13, 18], authored: true, question: 'story.question.teen', theme: 'story.theme.teen', love: 'chosen', missions: TEEN, spine: TEEN_SPINE, sides: TEEN_SIDES, standing: TEEN_STANDING, routeFork: 'teen-route'},
  {id: 'young', ages: [19, 30], authored: true, question: 'story.question.young', theme: 'story.theme.young', love: 'carried', missions: YOUNG, spine: YOUNG_SPINE, sides: YOUNG_SIDES, standing: YOUNG_STANDING, routeFork: 'young-route'},
  {id: 'adult', ages: [31, 48], authored: true, question: 'story.question.adult', theme: 'story.theme.adult', love: 'handed-on', missions: ADULT, spine: ADULT_SPINE, sides: ADULT_SIDES, standing: ADULT_STANDING, routeFork: null},
]

/** the written life, slot after slot, from six to forty-eight */
export const LIFE_SPINE: readonly (readonly string[])[] = LIFE_STAGES.flatMap(s => s.spine)
/** every mission of the life: chapters, small jobs and standing work */
export const LIFE_MISSIONS: readonly Mission[] = LIFE_STAGES.flatMap(s => [...s.missions, ...s.sides, ...s.standing])

export const stageById = (id: StageId): LifeStage => LIFE_STAGES.find(s => s.id === id)!
/** the stage a given age is lived in (past forty-eight: the last one) */
export const lifeStageOf = (age: number): LifeStage => LIFE_STAGES.find(s => age >= s.ages[0] && age <= s.ages[1]) ?? LIFE_STAGES[LIFE_STAGES.length - 1]!
/** the week's standing work at this age: what is always there when the next chapter waits */
export const standingFor = (age: number): readonly Mission[] => lifeStageOf(age).standing

/** the flag a route fork sets; a route is a lean, not a lock: approaches open on it, the spine stays shared */
export const routeFlag = (r: RouteId) => `story:route:${r}`
/** the route he leans into now: the last fork's lean, or the family route he was born into */
export const routeOf = (state: Pick<StoryState, 'flags'>): RouteId => {
  const v = state.flags['story:lean']
  return v === 'ultras' || v === 'away' || v === 'member' || v === 'far' || v === 'family' ? v : 'family'
}
