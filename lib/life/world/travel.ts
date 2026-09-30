import type { LifeState, LocationId } from '../types'
import { canPlayerReach, type ReachVerdict } from './reach'
import type { Step } from './route'
import { ALL_SCENES, exitInEra, needsFor, sceneIn, titleFor, whenFor, type SceneDef } from './scenes'
import { meets } from './types'

/**
 * כמה זמן לוקחת הדרך — ONE answer, for the map, for free time, for the auto-walk and for QA.
 *
 * Until delta 90 the question had three answers. `WorldScene.places()` multiplied the
 * number of doors by four; `route.ts` counted doors and returned the first one; `reach.ts`
 * walked the doors again to say whether the way was known. None of them knew that the
 * stairs down to the street take a minute and the walk from the street into town takes a
 * quarter of an hour, so the old "skip" could land a boy at the kiosk three minutes before
 * a bus that left from the other end of the city (SMART FREE TIME spec §1, §15).
 *
 * This file is the only place in the game where a walk has a length. The map lists what
 * `placesFrom` says and charges what it says; `timeAdvance.ts` plans with `travelPlan`;
 * the tests read the same two functions. `route.ts` and `reach.ts` keep their own jobs
 * (the first door to point an arrow at; whether the boy KNOWS the way) — neither of them
 * says how long anything takes.
 *
 * The graph is the doors that are drawn THIS chapter (`exitInEra` + `whenFor`) on the room
 * as it stands this chapter (`sceneIn` — a rebuilt ground brings its own doors). A door
 * that `needs` something is still walked, and the place behind it comes back `locked`
 * with that door's name, because "the way is there and it is shut" is information.
 */

/**
 * The length of one walk between two rooms, in game minutes — the city, not the door count.
 *
 * Grouped by what the walk IS rather than by room pair, so a room added next year inherits
 * a sensible number: inside the flat is a doorway, the stairs are a minute or two, the
 * neighbourhood is a few minutes' walk, town is a real walk, and the grounds across the
 * city are a bus. Anything the table does not recognise costs what every door used to cost.
 */
const FLAT: ReadonlySet<LocationId> = new Set<LocationId>(['bedroom', 'home', 'kitchen'])
const NEIGHBOURHOOD: ReadonlySet<LocationId> = new Set<LocationId>(['kiosk', 'pitch', 'schoolyard', 'community-room', 'office'])
/** a ground or a hall that is a bus ride from the street, not a walk */
const ACROSS_TOWN: ReadonlySet<LocationId> = new Set<LocationId>(['ramat-gan', 'hatikva', 'hall-new', 'drive-in'])

/** a walk that is its own kind of distance, both ways */
const LONG_LEGS: Record<string, number> = {
  'street>allenby': 12,
  'street>route': 10,
  'route>allenby': 6,
  'route>bloomfield-outside': 12,
  'allenby>bloomfield-outside': 15,
  'allenby>ussishkin-outside': 10,
  'street>bus-station': 8,
  'bus-station>port-europe': 30,
  'street>port-europe': 30,
}

const pair = (a: LocationId, b: LocationId) => LONG_LEGS[`${a}>${b}`] ?? LONG_LEGS[`${b}>${a}`]

/** the fallback: what every door cost before this file existed */
export const MINUTES_PER_ROOM = 4

export function legMinutes(from: LocationId, to: LocationId): number {
  if (FLAT.has(from) && FLAT.has(to)) return 1
  const long = pair(from, to)
  if (long !== undefined) return long
  if ((FLAT.has(from) && to === 'street') || (FLAT.has(to) && from === 'street')) return 2
  if ((from === 'street' && NEIGHBOURHOOD.has(to)) || (to === 'street' && NEIGHBOURHOOD.has(from))) return 3
  if (ACROSS_TOWN.has(from) || ACROSS_TOWN.has(to)) return 25
  // a door inside one building or one ground — the corridor, the forecourt, the step
  const a = sceneById.get(from)
  const b = sceneById.get(to)
  if (a && b && sameBuilding(a, b)) return 2
  return MINUTES_PER_ROOM
}

/** two rooms of one place: the hall and its forecourt, the terrace and its tunnel, a classroom and its yard */
function sameBuilding(a: SceneDef, b: SceneDef): boolean {
  const stem = (id: string) => id.split('-')[0]
  if (stem(a.id) === stem(b.id)) return true
  const pairs = [
    ['classroom', 'schoolyard'],
    ['bloomfield-outside', 'gate5'],
    ['arena-out', 'arena-seats'],
    ['community-room', 'storeroom'],
    ['allenby', 'ticket-office'],
    ['allenby', 'workshop'],
    ['allenby', 'rehearsal'],
    ['allenby', 'newsroom'],
    ['port-europe', 'flat-abroad'],
    ['port-europe', 'arena-out'],
  ]
  return pairs.some(([x, y]) => (x === a.id && y === b.id) || (x === b.id && y === a.id))
}

const sceneById = new Map<LocationId, SceneDef>(ALL_SCENES.map((scene) => [scene.id, scene]))

/** the room as it stands in this chapter, or null for an id no room has */
function roomIn(id: LocationId, chapter: string): SceneDef | null {
  const base = sceneById.get(id)
  return base ? sceneIn(base, chapter) : null
}

export type TravelLeg = {
  from: LocationId
  to: LocationId
  exitId: string
  /** the spawn the door lands on — what `WorldScene.travel` needs */
  spawn: string
  labelHe: string
  minutes: number
  /** the door will not open in the state the player is in */
  locked: boolean
}

type Node = { id: LocationId; minutes: number; legs: TravelLeg[]; lockedHe: string | null }

/**
 * The quickest walk to every room the drawn doors reach from `from` — a small Dijkstra.
 * The graph is thirty-odd rooms, so a sorted queue is plenty.
 */
function walkAll(state: LifeState, chapter: string, from: LocationId): Map<LocationId, Node> {
  const best = new Map<LocationId, Node>()
  const start: Node = { id: from, minutes: 0, legs: [], lockedHe: null }
  best.set(from, start)
  const queue: Node[] = [start]
  const done = new Set<LocationId>()
  while (queue.length) {
    queue.sort((a, b) => a.minutes - b.minutes || a.legs.length - b.legs.length)
    const here = queue.shift() as Node
    if (done.has(here.id)) continue
    done.add(here.id)
    const room = roomIn(here.id, chapter)
    if (!room) continue
    for (const exit of room.exits) {
      if (!exitInEra(exit, chapter)) continue
      const to = exit.to as LocationId
      if (!sceneById.has(to) || done.has(to)) continue
      // a door that is not drawn this chapter is not a way anywhere
      if (!meets(state, whenFor(exit, chapter))) continue
      const locked = !meets(state, needsFor(exit, chapter))
      const minutes = here.minutes + legMinutes(here.id, to)
      const known = best.get(to)
      if (known && known.minutes <= minutes) continue
      const leg: TravelLeg = { from: here.id, to, exitId: exit.id, spawn: exit.spawn, labelHe: exit.labelHe ?? exit.id, minutes: legMinutes(here.id, to), locked }
      const node: Node = { id: to, minutes, legs: [...here.legs, leg], lockedHe: here.lockedHe ?? (locked ? exit.labelHe ?? exit.id : null) }
      best.set(to, node)
      queue.push(node)
    }
  }
  return best
}

export type TravelPlan = {
  /** he can walk there now, by himself or with the person taking him */
  reachable: boolean
  /** a door on the way is shut in this state */
  locked: boolean
  /** game minutes the walk costs — 0 when he is already there */
  minutes: number
  /** every door on the way, in order */
  legs: readonly TravelLeg[]
  /** the first door, in `route.ts`'s own shape, for an arrow or a sentence */
  steps: readonly Step[]
  /** what `reach.ts` says about the way — knowledge, a guide, a lock */
  reason: ReachVerdict
  /** somebody is taking him: the way is open only because he is not alone */
  guided: boolean
  /** one sentence for the player when he cannot go */
  whyHe: string | null
  /** the name painted on the first door */
  firstStepHe: string | null
  /** where he arrives, as the room is called this chapter */
  placeHe: string
}

/**
 * `travelPlan(state, chapter, from, to)` — the walk, its length, and whether it can be made.
 * Spec §15. The only function the map, free time, the auto-walk and QA may ask.
 */
export function travelPlan(state: LifeState, chapter: string, from: LocationId, to: LocationId): TravelPlan {
  const target = roomIn(to, chapter)
  const placeHe = target ? titleFor(sceneById.get(to) as SceneDef, chapter) : to
  if (from === to) {
    return { reachable: true, locked: false, minutes: 0, legs: [], steps: [], reason: 'AT_DESTINATION', guided: false, whyHe: null, firstStepHe: null, placeHe }
  }
  const node = walkAll(state, chapter, from).get(to)
  const reach = canPlayerReach(state, chapter, from, to)
  if (!node) {
    return {
      reachable: false,
      locked: false,
      minutes: 0,
      legs: [],
      steps: [],
      // a door that is not drawn because he does not know the way is knowledge, not geography
      reason: reach.reachable ? 'NO_ROUTE' : reach.reason,
      guided: false,
      whyHe: reach.whyHe ?? 'אין דרך לשם בפרק הזה.',
      firstStepHe: null,
      placeHe,
    }
  }
  const legs = node.legs
  const shut = legs.some((leg) => leg.locked)
  const first = legs[0] as TravelLeg
  const step: Step = { exitId: first.exitId, to: first.to, labelHe: first.labelHe, distance: legs.length, locked: first.locked }
  // a door drawn and shut, or a way he does not know and nobody is taking him on
  const reachable = !shut && reach.reachable
  return {
    reachable,
    locked: shut || reach.reason === 'DOOR_LOCKED',
    minutes: node.minutes,
    legs,
    steps: [step],
    reason: shut && reach.reason === 'ROUTE_OPEN' ? 'DOOR_LOCKED' : reach.reason,
    guided: reach.reason === 'GUIDED_ONLY',
    whyHe: reachable ? null : reach.whyHe ?? `${node.lockedHe ?? first.labelHe} — עדיין סגור.`,
    firstStepHe: first.labelHe,
    placeHe,
  }
}

export type PlaceFrom = {
  id: LocationId
  titleHe: string
  here: boolean
  minutes: number
  /** the shut door on the way, by its own label — null when the way is open */
  lockedHe: string | null
  /** the spawn the last door lands on */
  spawn: string
}

/**
 * The map's list: every room the drawn doors reach from here, with the walk's minutes and
 * the first shut door on the way. `WorldScene.places()` returns exactly this.
 */
export function placesFrom(state: LifeState, chapter: string, from: LocationId, spawnHere = 'start'): PlaceFrom[] {
  const out: PlaceFrom[] = []
  for (const node of walkAll(state, chapter, from).values()) {
    const base = sceneById.get(node.id)
    if (!base) continue
    out.push({
      id: node.id,
      titleHe: titleFor(base, chapter),
      here: node.id === from,
      minutes: node.minutes,
      lockedHe: node.lockedHe,
      spawn: node.legs.at(-1)?.spawn ?? spawnHere,
    })
  }
  return out
}
