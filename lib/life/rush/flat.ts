/**
 * LIFE · RUSH — the flat (place `flat`): a home, seen from above with its ceiling off. Four rooms and a corridor,
 * doors between them, furniture you go round, a cat that crosses where you are, a mother who does not want running
 * in the house, toys on the floor that trip a boy who sprints over them.
 *
 * It is the set of the CLOSE-UP missions (rule 132): not a race through the rooms but a scene played in them. Each
 * home template is its own job with its own mechanic — search the flat for what is hidden in it (a drawer, a coat
 * pocket, under the bed: the camera comes down to his hands), get past a father who glances at the door, cross
 * the boards that talk at night, pack a bag while Mum lists her conditions — and its own people and hour.
 *
 * Pure and deterministic like every level: the same spec builds the same flat, and the people in it move as a
 * function of time. The layout is the one family flat every club's boy grows up in — nothing in it names a club.
 *
 * Coordinates: metres, x to the right, −z "up" the screen (the camera looks down from the +z side).
 * Every rectangle has x0 < x1 and z0 < z1.
 */
import type {Block, House, Level, Patrol, Pickup, PickupKind, Rect, Room, Search, SearchKind, Step, Trip, Voice} from './level'
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
  // each block is its model's own footprint (`scripts/life/rush/home.kx.js`) at the flat's scale, against its wall
  // the living room: the sofa Dad sits on, the low table, the armchair, the sideboard with the radio
  {...R(-8, -7.1, -0.6, 1.66), kind: 'sofa', h: 0.88},
  {...R(-6.2, -4.8, 2.6, 3.35), kind: 'table-low', h: 0.54},
  {...R(-1.6, -0.65, 5.15, 6), kind: 'armchair', h: 0.89},
  {...R(-4.52, -2.48, -3, -2.44), kind: 'sideboard', h: 0.84},
  // the hall: shoes by the door
  {...R(4, 4.6, 4, 5.2), kind: 'shoes', h: 0.5},
  // the kitchen: the counter with the drawer, the fridge beside it, the table
  {...R(10.35, 11, -2.5, 0.54), kind: 'counter', h: 0.94},
  {...R(10.29, 11, -3.36, -2.64), kind: 'fridge', h: 1.86},
  {...R(6.6, 8.2, -5.6, -4.5), kind: 'table', h: 0.79},
  // his room: the bed, the wardrobe with the box on top, the desk
  {...R(-6, -4.9, -10.4, -8.33), kind: 'bed', h: 0.6},
  {...R(-5, -2.56, -14, -13.33), kind: 'wardrobe', h: 2.2},
  {...R(0.3, 1.8, -14, -13.38), kind: 'desk', h: 0.77},
]

/** where Dad sits, and the radio he is waiting for */
export const FLAT_SEAT = {...P(-7.32, 0.75), face: Math.PI / 2}
export const FLAT_RADIO = P(-3.5, -2.72)

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

/** the home missions: each one a scene of its own in the same flat */
export const HOME_TEMPLATES = ['flat-run', 'tin-hunt', 'ticket-hunt', 'night-window', 'pack-bag'] as const
export type HomeTemplate = typeof HOME_TEMPLATES[number]
export const isHome = (t: string): t is HomeTemplate => (HOME_TEMPLATES as readonly string[]).includes(t)

const E = Math.PI / 2, N = Math.PI, W = -Math.PI / 2
/**
 * Where a boy stands to go through each place, and which way he faces it (unscaled). Every point is on the floor,
 * a body's width off the furniture — the bot test walks to every one of them.
 */
const SPOT: Record<SearchKind, [number, number, number]> = {
  drawer: [9.75, -1.0, E], fridge: [9.7, -3.0, E], table: [7.4, -3.95, N], bowl: [6.3, -5.05, E],
  sideboard: [-3.5, -1.95, N], cushion: [-6.55, 0.5, W], armchair: [-1.1, 4.55, 0],
  shoes: [3.45, 4.6, E], coat: [2.95, 2.8, W],
  bed: [-4.35, -9.4, W], wardrobe: [-3.8, -12.75, N], desk: [1.05, -12.8, N], toybox: [-4.9, -6.75, 0],
}
/** how long a place takes to go through: a drawer is quick, the box on top of the wardrobe needs the chair */
const SECS: Record<SearchKind, number> = {drawer: 1.6, fridge: 1.4, table: 1.4, bowl: 1.2, sideboard: 1.7, cushion: 1.5, armchair: 1.4, shoes: 1.4, coat: 1.3, bed: 1.9, wardrobe: 2.3, desk: 1.5, toybox: 1.6}

function place(kind: SearchKind, forStep: number | null): Search {
  const [x, z, face] = SPOT[kind]
  return {x: x * S, z: z * S, face, kind, secs: SECS[kind], for: forStep}
}

/** a scene being put together: the places, and what is hidden in which */
class Scene {
  searches: Search[] = []
  pickups: Pickup[] = []
  /** a place to look; returns its index */
  look(kind: SearchKind, forStep: number | null): number { this.searches.push(place(kind, forStep)); return this.searches.length - 1 }
  /** something hidden in one of `among` (picked by the seed), the others left as places it might have been */
  hide(kind: PickupKind, stepIx: number, among: SearchKind[], r: () => number): void {
    const ix = among.map(k => this.searches.findIndex(q => q.kind === k)).map((f, i) => f >= 0 ? f : this.look(among[i]!, stepIx))
    ix.forEach(k => { if (this.searches[k]!.for === null) this.searches[k]!.for = stepIx })
    const at = ix[Math.floor(r() * ix.length) % ix.length]!
    const q = this.searches[at]!
    this.pickups.push({x: q.x, z: q.z, kind, step: stepIx, inside: at})
  }
  /** an extra in a place nobody needs to look (pocket money down the side of the armchair) */
  tuck(kind: PickupKind, where: SearchKind): void {
    let at = this.searches.findIndex(q => q.kind === where)
    if (at < 0) at = this.look(where, null)
    const q = this.searches[at]!
    if (this.pickups.some(p => p.inside === at)) return
    this.pickups.push({x: q.x, z: q.z, kind, step: null, inside: at})
  }
}

const B = {x0: -8 * S, x1: 11 * S, z0: -14 * S, z1: 6 * S}
const toyAt = (r: () => number): Trip[] => {
  const at: [number, number][] = [[-1.2, -8.2], [-0.6, -11.4], [3.5, -6.5 + (r() - 0.5) * 2], [-0.4, -0.6], [3.6, 2.4]]
  const kinds: Trip['kind'][] = ['blocks', 'car', 'ball', 'blocks', 'car']
  return at.map(([x, z], i) => ({...P(x + (r() - 0.5) * 0.5, z), kind: kinds[i]!}))
}
const CAT = (pace: number): Patrol => ({pts: [[3.5 * S, 4.5 * S], [3.5 * S, -12.5 * S]], v: 1.5 * pace, range: 0, fov: 0, role: 'cat'})
const MUM_ROUND = (pace: number): Patrol => ({pts: [[8.8 * S, -2.6 * S], [3.5 * S, -2.4 * S], [3.5 * S, -7.5 * S]], v: 1.1 * pace, range: 0, fov: 0, role: 'mum'})
/** the front door, from the inside */
export const FLAT_FRONT = P(3.5, 5.3)
/** his window: the way out at night */
export const FLAT_WINDOW = P(-1.15, -12.85)

type Built = Omit<Level, 'timeScale'>
function home(spec: MissionSpec, o: {start: {x: number; z: number}; steps: Step[]; scene: Scene; patrols: Patrol[]; trips: Trip[]; voice: Voice[]; house: House; creaks?: Rect[]; pickups?: Pickup[]; verb?: Level['verb']}): Built {
  const last = o.steps[o.steps.length - 1]!
  return {
    place: 'flat', verb: o.verb ?? spec.verb, seed: spec.seed, half: 6, walk: 6, start: o.start, goal: {x: last.x, z: last.z, r: last.r}, home: null,
    bounds: {...B}, areas: floorAreas(), crossings: [], cars: [], walkers: [], standers: [], patrols: o.patrols, targets: [], throwers: [], checks: [],
    voice: o.voice, realSeconds: 60, length: 1, steps: o.steps, pickups: [...o.scene.pickups, ...(o.pickups ?? [])], rings: [], noises: [], escort: null, side: 0, kids: false,
    favours: [], surges: [], grip: 1, rooms: [...FLAT_ROOMS], blocks: [...FLAT_BLOCKS], trips: o.trips, pace: 0.6,
    searches: o.scene.searches, creaks: o.creaks ?? [], house: o.house,
  }
}

/**
 * E1 · before kick-off. The scarf in the box on top of his wardrobe, one battery in a kitchen drawer (which one, the
 * seed knows), the other rolled under the table; Dad on the sofa by a dead radio.
 */
function flatRun(spec: MissionSpec, r: () => number): Built {
  const start = P(-2.6 + (r() - 0.5) * 0.6, 1.6)
  const sc = new Scene()
  sc.hide('scarf', 0, ['wardrobe', 'toybox'], () => 0)
  sc.hide('battery', 0, ['drawer', 'sideboard'], r)
  sc.look('desk', null); sc.tuck('sticker', 'bed'); sc.tuck('coin', 'armchair')
  const pace = [0.75, 1, 1.2][spec.difficulty]!
  return home(spec, {
    start, scene: sc,
    pickups: [{...P(7.5 + (r() - 0.5) * 1.4, -6.35), kind: 'battery', step: 0}, {...P(3.2, 4.4 - r() * 0.8), kind: 'coin', step: null}],
    steps: [step({kind: 'collect', x: 0, z: 0, key: 'obj.flat.both'}), step({kind: 'goal', x: FLAT_RADIO.x, z: FLAT_RADIO.z + 1.3 * S, r: 1.5, key: 'obj.flat.radio'})],
    patrols: [CAT(pace), MUM_ROUND(pace)], trips: toyAt(r),
    voice: [{at: 0, t: 5, key: 'flat.1'}, {at: 0, t: 16, key: 'flat.2'}, {at: 0, t: 28, key: 'flat.3'}],
    house: {sofa: 'dad', night: false, tv: false, window: false},
  })
}

/**
 * E2 · the tin. His savings tin is not where he left it: Mum tidied. Under the bed, the wardrobe, the toybox or
 * the shoe rack in the hall. Then the front door — the kiosk shuts at six. A coin down the cushions is his to keep.
 */
function tinHunt(spec: MissionSpec, r: () => number): Built {
  const sc = new Scene()
  sc.hide('tin', 0, ['bed', 'wardrobe', 'toybox', 'shoes'], r)
  sc.tuck('coin', 'cushion'); sc.tuck('coin', 'armchair'); sc.look('desk', null)
  const pace = [0.75, 1, 1.2][spec.difficulty]!
  return home(spec, {
    start: P(-1.6, -8.6), scene: sc,
    steps: [step({kind: 'collect', x: 0, z: 0, key: 'obj.tin.find'}), step({kind: 'goal', x: FLAT_FRONT.x, z: FLAT_FRONT.z, r: 1.3, key: 'obj.tin.door'})],
    patrols: [CAT(pace), {pts: [[-6 * S, 4.5 * S], [-1.5 * S, 4.5 * S], [-1.5 * S, -1.5 * S]], v: 0.9 * pace, range: 0, fov: 0, role: 'mum'}],
    trips: toyAt(r),
    voice: [{at: 0, t: 4, key: 'tin.1'}, {at: 0, t: 18, key: 'tin.2'}, {at: 0, t: 32, key: 'tin.3'}],
    house: {sofa: null, night: false, tv: false, window: false},
  })
}

/**
 * E3 · the tickets. Dad has checked them eleven times and now he cannot find them; he walks the living room patting
 * his pockets. The envelope is in his jacket on the hook, in the sideboard, in the fruit bowl or down the sofa —
 * then into his hand, at the front door.
 */
function ticketHunt(spec: MissionSpec, r: () => number): Built {
  const sc = new Scene()
  sc.hide('ticket', 0, ['coat', 'sideboard', 'bowl', 'cushion'], r)
  sc.tuck('coin', 'armchair'); sc.look('drawer', null)
  return home(spec, {
    start: P(-3.4, 3.8), scene: sc,
    steps: [step({kind: 'collect', x: 0, z: 0, key: 'obj.ticket.find'}), step({kind: 'goal', x: FLAT_FRONT.x, z: FLAT_FRONT.z, r: 1.3, key: 'obj.ticket.dad'})],
    patrols: [{pts: [[-6.6 * S, 4.3 * S], [-2.4 * S, 4.6 * S], [-2.4 * S, -0.8 * S], [-5.8 * S, -1.4 * S]], v: 0.85, range: 0, fov: 0, role: 'dad'}, CAT([0.75, 1, 1.2][spec.difficulty]!)],
    trips: toyAt(r).slice(0, 3),
    voice: [{at: 0, t: 3, key: 'ticket.1'}, {at: 0, t: 14, key: 'ticket.2'}, {at: 0, t: 27, key: 'ticket.3'}],
    house: {sofa: null, night: false, tv: false, window: false},
  })
}

/**
 * E5 · grounded. Night, and Dad is at the match: Mum is on the sofa with the television, her head going to the open
 * door now and then. His shoes are by the front door at the far end of the hall; the cat is in it; two boards talk.
 * Then back to his room and out through his window.
 */
function nightWindow(spec: MissionSpec, r: () => number): Built {
  const sc = new Scene()
  sc.hide('shoes', 0, ['shoes'], r)
  sc.tuck('coin', 'coat')
  const d = spec.difficulty
  // Mum on the sofa with the television; the open living-room door is straight ahead of her
  const tv = {x: -3.5 * S, z: -2.4 * S}, door = {x: 2.2 * S, z: 1.0 * S}
  const mum: Patrol = {pts: [[FLAT_SEAT.x, FLAT_SEAT.z], [FLAT_SEAT.x, FLAT_SEAT.z]], v: 0, range: 15.5, fov: 0.55, role: 'mum',
    sweep: {a: Math.atan2(tv.x - FLAT_SEAT.x, tv.z - FLAT_SEAT.z), b: Math.atan2(door.x - FLAT_SEAT.x, door.z - FLAT_SEAT.z), period: [9.5, 8, 6.8][d]!, rest: [0.62, 0.55, 0.48][d]!}}
  return home(spec, {
    start: P(-1.4, -9.6), scene: sc, verb: 'sneak',
    steps: [step({kind: 'collect', x: 0, z: 0, key: 'obj.night.shoes'}), step({kind: 'goal', x: FLAT_WINDOW.x, z: FLAT_WINDOW.z, r: 1.0, key: 'obj.night.window'})],
    patrols: [mum, CAT([0.6, 0.8, 1][d]!)], trips: [],
    creaks: [R(2.4, 4.6, -6.3, -5.5), R(2.4, 4.6, 2.5, 3.2)],
    voice: [{at: 0, t: 2, key: 'night.1'}, {at: 0, t: 22, key: 'night.2'}, {at: 0, t: 45, key: 'night.3'}],
    house: {sofa: null, night: true, tv: true, window: true},
  })
}

/**
 * E6 · the away bag. Everything he needs is somewhere in the flat — the scarf, the money tin on his desk, the
 * sandwiches Mum made (in the fridge), the phonecard for the call he promised her — and Mum walks between the kitchen
 * and the hall saying her conditions. Then out of the front door.
 */
function packBag(spec: MissionSpec, r: () => number): Built {
  const sc = new Scene()
  sc.hide('scarf', 0, ['wardrobe', 'bed'], r)
  sc.hide('money', 0, ['desk', 'toybox'], r)
  sc.hide('sandwich', 0, ['fridge'], r)
  sc.hide('phonecard', 0, ['sideboard', 'drawer'], r)
  sc.tuck('coin', 'cushion')
  const pace = [0.75, 1, 1.2][spec.difficulty]!
  return home(spec, {
    start: P(-1.8, -10.6), scene: sc,
    steps: [step({kind: 'collect', x: 0, z: 0, key: 'obj.bag.pack'}), step({kind: 'goal', x: FLAT_FRONT.x, z: FLAT_FRONT.z, r: 1.3, key: 'obj.bag.door'})],
    patrols: [MUM_ROUND(pace), CAT(pace)], trips: toyAt(r).slice(1),
    voice: [{at: 0, t: 4, key: 'bag.1'}, {at: 0, t: 15, key: 'bag.2'}, {at: 0, t: 27, key: 'bag.3'}, {at: 0, t: 40, key: 'bag.4'}],
    house: {sofa: null, night: false, tv: false, window: false},
  })
}

/** The home mission for this spec. The seed moves the small things — which drawer, which toy where — never the rooms. */
export function flatLevel(spec: MissionSpec, r: () => number): Built {
  switch (spec.template as HomeTemplate) {
    case 'tin-hunt': return tinHunt(spec, r)
    case 'ticket-hunt': return ticketHunt(spec, r)
    case 'night-window': return nightWindow(spec, r)
    case 'pack-bag': return packBag(spec, r)
    default: return flatRun(spec, r)
  }
}

/**
 * Whether somebody at `a` can see a point `b` in the flat: the line between them crosses floor and doorways only,
 * never a wall (a quarter-metre step catches every wall, which is half a metre thick at the flat's scale).
 */
export function flatSight(a: {x: number; z: number}, b: {x: number; z: number}): boolean {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.25)
  for (let k = 1; k < n; k++) if (!onFlatFloor(a.x + (b.x - a.x) * k / n, a.z + (b.z - a.z) * k / n)) return false
  return true
}

/** whether a point is floor (a room or a doorway) — the allocation-free question a look asks every frame */
export function onFlatFloor(x: number, z: number): boolean {
  for (const r of FLAT_ROOMS) if (x >= r.rect.x0 && x <= r.rect.x1 && z >= r.rect.z0 && z <= r.rect.z1) return true
  for (const d of FLAT_DOORS) if (x >= d.rect.x0 && x <= d.rect.x1 && z >= d.rect.z0 && z <= d.rect.z1) return true
  return false
}
