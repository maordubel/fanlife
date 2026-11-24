/**
 * LIFE · the hood — the STORY: what a mission is, and what a life remembers (owner, 23.11.2026; rule life-story-watch).
 *
 * The loop every mission obeys (the quest language of the screenplay bible, sections 0–4, in the hood's own terms):
 *   roam → a PERSON gives a mission → 2–4 APPROACHES → one COMPLICATION → every approach CONVERGES on the same last
 *   step → an AFTERMATH that changes people, money, reputation and what is kept → the next mission is offered.
 * Data only, club-agnostic: no club, no date, no score, no real person. A date or a score reaches a mission only
 * through the Fitter's archive night (`night.ts`), printed as recorded.
 */
import type {PersonId, PlaceId} from '../types'
import type {PickupKind} from '@/lib/life/rush/level'

export type StageId = 'child' | 'teen' | 'young' | 'adult'
export type RouteId = 'family' | 'ultras' | 'away' | 'member' | 'far'

/** the life stages; `authored` says whether its arc is written yet (an unwritten stage is never faked) */
export const STAGES: readonly {id: StageId; ages: [number, number]; authored: boolean}[] = [
  {id: 'child', ages: [6, 12], authored: true},
  {id: 'teen', ages: [13, 18], authored: true},
  {id: 'young', ages: [19, 30], authored: true},
  {id: 'adult', ages: [31, 48], authored: true},
]
/** the routes a life can lean into from the teens on; childhood is the family route for everyone */
export const ROUTES: readonly RouteId[] = ['family', 'ultras', 'away', 'member', 'far']

/** what an outcome changes */
export type Effect =
  | {flag: string; v?: string | number | boolean}
  | {bond: string; n: number}
  | {money: number}
  | {rep: number}
  /** something he keeps for good: it goes in the Box */
  | {keep: string}

/** when an approach or a mission is open. Every listed flag must be set / unset; `money` is the least he must hold. */
export type Cond = {has?: string[]; not?: string[]; money?: number}

/** one thing to do in the street; the adapter turns it into a RUSH step at the person's or the place's own spot */
export type StoryStep =
  | {do: 'talk'; who: PersonId; say: string}
  | {do: 'collect'; at: PlaceId; item: PickupKind; n?: number}
  | {do: 'reach'; at: PlaceId}

export type Approach = {
  id: string
  /** open only when (nothing: always open). Every main mission keeps at least two approaches with no condition. */
  needs?: Cond
  steps: StoryStep[]
  /** what this way of doing it changes */
  effects: Effect[]
}

export type ComplicationChoice = {id: string; effects: Effect[]}
/** the thing that goes wrong once, whatever the approach: two or three answers, none of them a dead end */
export type Complication = {choices: ComplicationChoice[]}

export type MissionKind = 'main' | 'side' | 'standing'

export type Mission = {
  id: string
  kind: MissionKind
  stage: StageId
  /** how old he is when it is offered (a main mission moves the life to this age) */
  age: number
  giver: PersonId
  place: PlaceId
  /** a matchday mission waits for the end of the week; anything else is open on any day */
  day: 'any' | 'matchday'
  needs?: Cond
  approaches: Approach[]
  /** main missions always have one; a side job may have none */
  complication: Complication | null
  /** the one last step every approach ends on */
  converge: StoryStep
  /** what is true afterwards whatever he chose */
  aftermath: Effect[]
  /** the RUSH template whose Fitter row decides whether this chapter stands on a real archive night */
  template: string | null
  /** the Season One episode this mission carries into the hood */
  episode: string | null
  /** two missions with the same fork are offered together; doing one closes the other */
  fork?: string
}

export type OpenMission = {id: string; approach: string}

export type StoryState = {
  v: 1
  age: number
  /** weeks lived, and the day of this week: 0–5 build up, 6 is matchday */
  week: number
  day: number
  money: number
  rep: number
  flags: Record<string, string | number | boolean>
  bonds: Record<string, number>
  /** what is in the Box, oldest first */
  keeps: string[]
  /** main and side missions finished, in order */
  done: string[]
  /** how many times each standing job was done */
  times: Record<string, number>
  open: OpenMission | null
  route: RouteId
}

export type Offer = {mission: Mission; /** the approaches open to him now */ approaches: Approach[]; why: 'open' | 'main' | 'side' | 'standing'}

export type StoryEvent =
  | {k: 'aftermath'; mission: string; key: string}
  | {k: 'kept'; id: string}
  /** the life moved on a year or more: the studio's time-advance bridge plays here */
  | {k: 'bridge'; from: number; to: number}
  /** this chapter can stand on an archive night: the watch layer is asked after it */
  | {k: 'watch'; mission: string; template: string}
  | {k: 'week'; week: number}
  | {k: 'stage-end'; stage: StageId}

export const MATCHDAY = 6
