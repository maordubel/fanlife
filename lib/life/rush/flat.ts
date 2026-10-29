/**
 * LIFE · RUSH — the flat (place `flat`): a home, seen from above with its ceiling off, run through against the
 * kick-off. Four rooms and a corridor, doors between them, furniture you go round, a cat that crosses where you
 * are, a mother who does not want running in the house, toys on the floor that trip a boy who sprints over them.
 *
 * Pure and deterministic like every level: the same spec builds the same flat, and the people in it move as a
 * function of time. The layout is the one family flat every club's boy grows up in — nothing in it names a club.
 *
 * Coordinates: metres, x to the right, −z "up" the screen (the camera looks down from the +z side).
 * Every rectangle has x0 < x1 and z0 < z1.
 */
import type {Block, Level, Patrol, Pickup, Rect, Room, Step, Trip, Voice} from './level'
import type {MissionSpec} from './spec'

/** how much larger than a real flat it is drawn: a six-year-old's flat is big, and a run needs room to run */
const S = 1.3
const R = (x0: number, x1: number, z0: number, z1: number): Rect => ({x0: x0 * S, x1: x1 * S, z0: Math.min(z0, z1) * S, z1: Math.max(z0, z1) * S})
const P = (x: number, z: number) => ({x: x * S, z: z * S})

/** the rooms, the doors between them (a door rectangle overlaps both rooms), the furniture */
export const FLAT_ROOMS: readonly Room[] = [
  {id: 'living', rect: R(-8, 2, -3, 6), floor: 'wood'},
  {id: 'hall', rect: R(2.4, 4.6, -14, 6), floor: 'wood'},
  {id: 'kitchen', rect: R(5, 11, -7, 1), floor: 'tile'},
  {id: 'bedroom', rect: R(-6, 2, -14, -6), floor: 'carpet'},
]
export const FLAT_DOORS: readonly {rect: Rect; a: string; b: string; ax: number; az: number; bx: number; bz: number}[] = [
  {rect: R(1.7, 2.7, 0.2, 1.8), a: 'living', b: 'hall', ...pts(P(1.1, 1), P(3.5, 1))},
  {rect: R(4.3, 5.3, -3.8, -2.2), a: 'hall', b: 'kitchen', ...pts(P(3.5, -3), P(5.9, -3))},
  {rect: R(1.7, 2.7, -10.8, -9.2), a: 'bedroom', b: 'hall', ...pts(P(1.1, -10), P(3.5, -10))},
]
function pts(a: {x: number; z: number}, b: {x: number; z: number}) { return {ax: a.x, az: a.z, bx: b.x, bz: b.z} }

export const FLAT_BLOCKS: readonly Block[] = [
  // the living room: the sofa Dad sits on, the low table, the armchair, the sideboard with the radio
  {...R(-8, -6.8, -0.5, 3.5), kind: 'sofa', h: 0.9},
  {...R(-5.4, -4, 2.6, 4.4), kind: 'table-low', h: 0.45},
  {...R(-1.8, -0.4, 4.6, 6), kind: 'armchair', h: 0.9},
  {...R(-4.5, -1.5, -3, -2.3), kind: 'sideboard', h: 0.85},
  // the hall: shoes by the door
  {...R(3.9, 4.6, 4, 5.2), kind: 'shoes', h: 0.5},
  // the kitchen: the counter along the wall, the table, the fridge
  {...R(10.2, 11, -7, 1), kind: 'counter', h: 0.95},
  {...R(6.6, 8.4, -5.6, -3.8), kind: 'table', h: 0.78},
  {...R(5, 6, -7, -6), kind: 'fridge', h: 1.9},
  // his room: the bed, the wardrobe with the box on top, the desk
  {...R(-6, -3.6, -10.5, -6.8), kind: 'bed', h: 0.55},
  {...R(-6, -3, -14, -13.3), kind: 'wardrobe', h: 2.2},
  {...R(0, 2, -14, -12.6), kind: 'desk', h: 0.75},
]

/** where Dad sits, and the radio he is waiting for */
export const FLAT_SEAT = {...P(-7.2, 1.5), face: Math.PI / 2}
export const FLAT_RADIO = P(-3, -2.65)

/** which rooms a point is in: a room's own floor, or both rooms of the door it stands in */
export function flatRoomsAt(x: number, z: number): string[] {
  const out = FLAT_ROOMS.filter(r => x >= r.rect.x0 && x <= r.rect.x1 && z >= r.rect.z0 && z <= r.rect.z1).map(r => r.id)
  for (const d of FLAT_DOORS) if (x >= d.rect.x0 && x <= d.rect.x1 && z >= d.rect.z0 && z <= d.rect.z1) out.push(d.a, d.b)
  return [...new Set(out)]
}

/** the doors to go through, in order, from one point to another (breadth first over the rooms) */
function doorPath(from: string[], to: string[]): typeof FLAT_DOORS[number][] {
  if (from.some(r => to.includes(r))) return []
  const prev = new Map<string, {room: string; door: typeof FLAT_DOORS[number]} | null>()
  const q = [...from]
  from.forEach(r => prev.set(r, null))
  while (q.length) {
    const r = q.shift()!
    if (to.includes(r)) {
      const out: typeof FLAT_DOORS[number][] = []
      let cur = r
      while (prev.get(cur)) { const p = prev.get(cur)!; out.unshift(p.door); cur = p.room }
      return out
    }
    for (const d of FLAT_DOORS) {
      const n = d.a === r ? d.b : d.b === r ? d.a : null
      if (n && !prev.has(n)) { prev.set(n, {room: r, door: d}); q.push(n) }
    }
  }
  return []
}

/**
 * The next point to walk to from `a` towards `b`: through the next door by its two sides (in front of it, then
 * past it), so nobody walks into the frame of a door — the same rule for the planner and the bot.
 */
export function flatVia(a: {x: number; z: number}, b: {x: number; z: number}): {x: number; z: number} {
  const from = flatRoomsAt(a.x, a.z), to = flatRoomsAt(b.x, b.z)
  if (!from.length || !to.length) return b
  const path = doorPath(from, to)
  const d = path[0]
  if (!d) return b
  // which side of this door am I on: the side whose room I am in (in the door itself: the side nearer)
  const inA = from.includes(d.a) && !from.includes(d.b)
  const inB = from.includes(d.b) && !from.includes(d.a)
  const near = (x: number, z: number) => Math.hypot(a.x - x, a.z - z)
  const sideA = inA || (!inB && near(d.ax, d.az) <= near(d.bx, d.bz))
  const [fx, fz, tx, tz] = sideA ? [d.ax, d.az, d.bx, d.bz] : [d.bx, d.bz, d.ax, d.az]
  // already lined up with the door — on the line through it, at or past the point in front of it — go through
  const ux = tx - fx, uz = tz - fz, len = Math.hypot(ux, uz) || 1
  const along = ((a.x - fx) * ux + (a.z - fz) * uz) / len, across = Math.abs((a.x - fx) * uz - (a.z - fz) * ux) / len
  if ((along > -0.7 && across < 0.55) || (!inA && !inB)) return {x: tx, z: tz}
  return {x: fx, z: fz}
}

/** the floor you may stand on: each room and each door, kept off the walls by a body's width */
function floorAreas(): Rect[] {
  const m = 0.32
  return [
    ...FLAT_ROOMS.map(r => ({x0: r.rect.x0 + m, x1: r.rect.x1 - m, z0: r.rect.z0 + m, z1: r.rect.z1 - m})),
    // a door: across the wall, narrowed by the frame on each side
    ...FLAT_DOORS.map(d => {
      const across = d.rect.x1 - d.rect.x0 < d.rect.z1 - d.rect.z0
      return across ? {x0: d.rect.x0 - 0.4, x1: d.rect.x1 + 0.4, z0: d.rect.z0 + m, z1: d.rect.z1 - m} : {x0: d.rect.x0 + m, x1: d.rect.x1 - m, z0: d.rect.z0 - 0.4, z1: d.rect.z1 + 0.4}
    }),
  ]
}

const step = (o: Partial<Step> & Pick<Step, 'kind' | 'x' | 'z' | 'key'>): Step => ({r: 1.4, npc: null, say: null, cost: 0, hold: 0, group: 0, joins: false, leaves: false, reveals: false, ...o})

/**
 * The flat on the morning (afternoon) of a match: the scarf on top of the wardrobe in his room, the batteries in the
 * kitchen drawer (one has rolled under the table), and Dad on the sofa by a dead radio. Either order; then back to him.
 * The seed moves the small things — which toy lies where, which coin is under which cushion — never the rooms.
 */
export function flatLevel(spec: MissionSpec, r: () => number): Omit<Level, 'timeScale'> {
  const start = P(-2.6 + (r() - 0.5) * 0.6, 1.6)
  const pickups: Pickup[] = [
    {...P(-4.5, -12.6), kind: 'scarf', step: 0},
    {...P(9.6, -0.6 - r() * 1.2), kind: 'battery', step: 0},
    {...P(7.5 + (r() - 0.5) * 1.4, -6.35), kind: 'battery', step: 0},
    // extras: pocket money down the side of the armchair, a coin by the shoes, a sticker under his bed
    {...P(-2.4, 5.3), kind: 'coin', step: null},
    {...P(3.2, 4.6 - r() * 0.8), kind: 'coin', step: null},
    {...P(-3.1, -11.3), kind: 'sticker', step: null},
  ]
  const steps: Step[] = [
    step({kind: 'collect', x: 0, z: 0, key: 'obj.flat.both'}),
    step({kind: 'goal', x: FLAT_RADIO.x, z: FLAT_RADIO.z + 1.3 * S, r: 1.5, key: 'obj.flat.radio'}),
  ]
  // the toys: where a boy left them, on the way he will run
  const toyAt: [number, number][] = [[-1.2, -8.2], [-0.6, -12.4], [3.5, -6.5 + (r() - 0.5) * 2], [-0.4, -0.6], [3.6, 2.6]]
  const kinds: Trip['kind'][] = ['blocks', 'car', 'ball', 'blocks', 'car']
  const trips: Trip[] = toyAt.map(([x, z], i) => ({...P(x + (r() - 0.5) * 0.5, z), kind: kinds[i]!}))
  // the cat crosses the hall; Mum goes between the kitchen and the hall — slower when the difficulty is low
  const pace = [0.75, 1, 1.2][spec.difficulty]!
  const patrols: Patrol[] = [
    {pts: [[3.5 * S, 4.5 * S], [3.5 * S, -12.5 * S]], v: 1.5 * pace, range: 0, fov: 0, role: 'cat'},
    {pts: [[8.8 * S, -2.6 * S], [3.5 * S, -2.4 * S], [3.5 * S, -7.5 * S]], v: 1.1 * pace, range: 0, fov: 0, role: 'mum'},
  ]
  const voice: Voice[] = [{at: 0, t: 5, key: 'flat.1'}, {at: 0, t: 16, key: 'flat.2'}, {at: 0, t: 28, key: 'flat.3'}]
  const b = {x0: -8 * S, x1: 11 * S, z0: -14 * S, z1: 6 * S}
  return {
    place: 'flat', verb: spec.verb, seed: spec.seed, half: 6, walk: 6, start, goal: {x: steps[1]!.x, z: steps[1]!.z, r: 1.5}, home: null,
    bounds: b, areas: floorAreas(), crossings: [], cars: [], walkers: [], standers: [], patrols, targets: [], throwers: [], checks: [],
    voice, realSeconds: 60, length: 1, steps, pickups, rings: [], noises: [], escort: null, side: 0, kids: false, favours: [], surges: [], grip: 1,
    rooms: [...FLAT_ROOMS], blocks: [...FLAT_BLOCKS], trips, pace: 0.6,
  }
}
