/**
 * LIFE · RUSH — the level a mission is played on, built from the spec alone.
 *
 * Pure and deterministic: the same `MissionSpec` always builds the same level, and every moving thing
 * (a car, a walker, a steward on his round) is a FUNCTION OF TIME, not a state that drifts. The
 * renderer and the simulation therefore always agree on where a car is, and the bot test can play
 * any seed without a screen.
 *
 * Four places, one per kind of verb:
 *  · `street` — run and carry: a city street to the ground, crossings with traffic, people walking the same way;
 *  · `road`   — drive: a long road with traffic in your lanes and police checks that want you slow;
 *  · `yard`   — sneak: the outside of the ground, a fence, stewards (or their lookouts) on their rounds;
 *  · `crowd`  — find: a terrace, a plaza or a pitch full of people, one of them the one you came for.
 *
 * Distances are metres, times seconds. Forward is −z.
 */
import type {KnownLook, MissionSpec, Verb} from './spec'
import {applyQuest} from './quest'

/* ───────────── seeded randomness ───────────── */

export function rng(seed: number): () => number {
  let a = (seed >>> 0) || 1
  return () => {
    a = (a + 1831565813) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ───────────── what is on the level ───────────── */

export type Place = 'street' | 'road' | 'yard' | 'crowd'

/** how a person looks: indexes into the renderer's palettes, so the sim never carries a colour */
export type Look = {tone: number; hair: number; top: number; pants: number; kit: boolean; cap: boolean; scarf: boolean; beard: boolean; size: number; /** a known person's own colours, over the palette */ hex?: KnownLook['hex']; grey?: boolean}

/** a car on a fixed line: across a crossing (`x`) or along the road (`z`) */
export type Car = {axis: 'x' | 'z'; lane: number; dir: 1 | -1; v: number; p0: number; span: readonly [number, number]; len: number; wid: number; police: boolean; colour: number}
/** somebody walking the same way, looping between two points */
export type Walker = {x: number; z0: number; v: number; span: readonly [number, number]; look: Look}
/** somebody standing: a fan at the gate, a face in the crowd */
export type Stander = {x: number; z: number; face: number; look: Look; role: 'fan' | 'rival'}
/** a steward (or a rival group's lookout) walking a round and looking where he walks */
export type Patrol = {pts: readonly (readonly [number, number])[]; v: number; range: number; fov: number; role: 'steward' | 'lookout'}
/** what a find mission is looking for */
export type Target = {x: number; z: number; kind: 'person' | 'spot'; look: Look | null; clues: Clue[]}
export type Clue = 'cap' | 'scarf' | 'kit' | 'plain' | 'beard' | 'tall' | 'grey' | 'black' | 'barrier' | 'light'
/** somebody in the other lot throwing what they hold (ultras route only): a throw every `every` seconds */
export type Thrower = {x: number; z: number; every: number; offset: number}
/** a stretch of road where the police want you slow */
export type Check = {z0: number; z1: number; max: number}
/** a line the supporter thinks, once, when the goal is this far away */
export type Voice = {at: number; key: string}

/* ───────────── the quest layer (RUSH 2): steps, things on the ground, places to stop ───────────── */

/** a walkable rectangle: the main street, a side street, a lay-by — the world is their union */
export type Rect = {x0: number; x1: number; z0: number; z1: number}
/**
 * One objective of a mission, in order. `reach` a place · `talk` to somebody (act next to him) ·
 * `collect` every pickup of this step · `stop` the car in a lay-by and wait · `goal` the mission's end.
 */
export type StepKind = 'reach' | 'talk' | 'collect' | 'stop' | 'goal'
export type Step = {
  kind: StepKind
  x: number; z: number; r: number
  /** words key of the objective line (`obj.*`) */
  key: string
  /** who stands there (talk, reach of a group, stop): drawn by the renderer, never in the crowd's lists */
  npc: Look | null
  /** words key of what he says when you talk to him (`npc.*`) */
  say: string | null
  /** game seconds the step costs (buying a ticket takes time) */
  cost: number
  /** seconds to hold still (stop) */
  hold: number
  /** how many people wait there (a group that joins the march) */
  group: number
  /** after this step the person walks with you (the escort) */
  joins: boolean
  /** after this step the person is gone (a mate gets in the car) */
  leaves: boolean
  /** talking to him gives one more clue (find) */
  reveals: boolean
}
export type PickupKind = 'sticker' | 'coin' | 'bottle' | 'roll' | 'bag' | 'scarf' | 'paint' | 'cloth' | 'tape'
/** something on the ground: required by a step, or an extra (`step: null`) that buys a few seconds */
export type Pickup = {x: number; z: number; kind: PickupKind; step: number | null}
/** a knot of supporters singing: stand in it a moment and the song carries you (an extra) */
export type Ring = {x: number; z: number; r: number}
/** a bin, a shutter: bang it (act) and every steward near turns his head to it */
export type Noise = {x: number; z: number}
/** somebody who walks with you: your father, your child, a visitor, an old man. Too far and he stops. */
export type Escort = {who: 'dad' | 'child' | 'visitor' | 'elder' | 'friend'; look: Look; pace: number; leash: number}

export type Level = {
  place: Place
  verb: Verb
  seed: number
  /** half the width of the road / the open ground */
  half: number
  /** from the middle to the wall */
  walk: number
  start: {x: number; z: number}
  goal: {x: number; z: number; r: number}
  /** steal: the thing is taken at `goal` and has to be brought back to `home` */
  home: {x: number; z: number; r: number} | null
  bounds: {x0: number; x1: number; z0: number; z1: number}
  crossings: number[]
  cars: Car[]
  walkers: Walker[]
  standers: Stander[]
  patrols: Patrol[]
  targets: Target[]
  throwers: Thrower[]
  checks: Check[]
  voice: Voice[]
  /** real seconds the mission is meant to take at the top; the clock the player sees runs `timeScale` times faster */
  realSeconds: number
  timeScale: number
  /** distance from start to goal, for the progress bar */
  length: number
  /** where he may walk (the union); empty = `bounds` */
  areas: Rect[]
  steps: Step[]
  pickups: Pickup[]
  rings: Ring[]
  noises: Noise[]
  escort: Escort | null
  /** how far a side street runs either side of the main street (0 = none) */
  side: number
  /** a playground of children (the find in a schoolyard): the renderer draws everyone smaller */
  kids: boolean
  /** an optional good turn off the route (RUSH 4): never a step, never on the planned route */
  favours: Favour[]
  /** a stretch of street where the crowd pushes for a while: slows, never blocks */
  surges: Surge[]
  /** how well the feet grip: 1 dry, less in rain (the time it takes to get up to pace, never the pace itself) */
  grip: number
}

export type FavourKind = 'lost-kid' | 'bag'
export type Favour = {x: number; z: number; kind: FavourKind}
/** between z0 (nearer the start) and z1 (nearer the goal), from t0 to t1 in sim seconds */
export type Surge = {z0: number; z1: number; t0: number; t1: number}
/** what a favour gives back, in GAME seconds */
export const FAVOUR_BONUS = 10
/** how much a surge holds you back (per step at 60 Hz, like brushing a walker) */
export const SURGE_DAMP = 0.94

/* ───────────── positions as functions of time ───────────── */

const wrap = (v: number, a: number, b: number) => { const w = b - a; return a + ((((v - a) % w) + w) % w) }

export function carAt(c: Car, t: number): {x: number; z: number} {
  const p = c.axis === 'x' ? wrap(c.p0 + c.dir * c.v * t, c.span[0], c.span[1]) : c.p0 - c.v * t
  return c.axis === 'x' ? {x: p, z: c.lane} : {x: c.lane, z: p}
}

export function walkerAt(w: Walker, t: number): {x: number; z: number} {
  return {x: w.x, z: wrap(w.z0 - w.v * t, w.span[0], w.span[1])}
}

/** where a patrol is and which way he faces: the round is walked out and back, at a steady pace */
export function patrolAt(p: Patrol, t: number): {x: number; z: number; face: number} {
  const legs: number[] = []
  let total = 0
  for (let i = 0; i < p.pts.length - 1; i++) { const d = Math.hypot(p.pts[i + 1]![0] - p.pts[i]![0], p.pts[i + 1]![1] - p.pts[i]![1]); legs.push(d); total += d }
  const loop = total * 2
  let s = wrap(t * p.v, 0, loop)
  const back = s > total
  if (back) s = loop - s
  let i = 0
  while (i < legs.length - 1 && s > legs[i]!) { s -= legs[i]!; i++ }
  const a = p.pts[i]!, b = p.pts[i + 1]!, k = legs[i]! ? s / legs[i]! : 0
  const dx = b[0] - a[0], dz = b[1] - a[1]
  return {x: a[0] + dx * k, z: a[1] + dz * k, face: back ? Math.atan2(-dx, -dz) : Math.atan2(dx, dz)}
}

/* ───────────── building ───────────── */

const PALETTE = {tone: 6, hair: 6, top: 6, pants: 5, car: 6}
/** a side street runs this far either side of the main street, and is this wide from its middle to the shop fronts */
export const SIDE = 46, SIDE_W = 7
/** the pavement of a side street on the near side (towards the start): where things lie and people wait */
export const sidePave = (cz: number) => cz + 5.4

export function look(r: () => number, o: Partial<Look> = {}): Look {
  return {
    tone: Math.floor(r() * PALETTE.tone), hair: Math.floor(r() * PALETTE.hair), top: Math.floor(r() * PALETTE.top), pants: Math.floor(r() * PALETTE.pants),
    kit: r() < 0.72, cap: r() < 0.2, scarf: r() < 0.62, beard: r() < 0.22, size: 0.93 + r() * 0.14, ...o,
  }
}

/** how long the mission is meant to take, by place and by how hard the age makes it */
const SLACK = [1.95, 1.65, 1.45] as const

function placeOf(spec: MissionSpec): Place {
  return spec.verb === 'drive' ? 'road' : spec.verb === 'sneak' ? 'yard' : spec.verb === 'find' ? 'crowd' : 'street'
}

type Base = Omit<Level, 'timeScale' | 'areas' | 'steps' | 'pickups' | 'rings' | 'noises' | 'escort' | 'side' | 'kids' | 'favours' | 'surges' | 'grip'> & Partial<Pick<Level, 'areas' | 'side'>>
function finish(l: Base): Level {
  return {areas: [], steps: [], pickups: [], rings: [], noises: [], escort: null, side: 0, kids: false, favours: [], surges: [], grip: 1, ...l, timeScale: 1}
}

function street(spec: MissionSpec, r: () => number): Level {
  const carry = spec.verb === 'carry'
  const L = carry ? 220 : 300, half = 7, walk = 11, gateZ = -L
  // the side streets move with the seed (their own stream, so nothing else in the level shifts):
  // the same mission, a different walk to the ground every time
  const jr = rng(spec.seed + 7919)
  const crossings = (carry ? [-70, -150] : [-70, -150, -225]).map(z => z + Math.round((jr() - 0.5) * 18))
  const traffic = spec.hazards.includes('traffic') || spec.hazards.includes('police')
  const cars: Car[] = []
  if (traffic) crossings.forEach((z, ci) => {
    const n = 2 + (spec.difficulty === 2 ? 1 : 0)
    for (let k = 0; k < n; k++) {
      const dir: 1 | -1 = k % 2 ? -1 : 1
      cars.push({axis: 'x', lane: z + (dir === 1 ? -2.4 : 2.4), dir, v: 8 + r() * 5 + spec.difficulty * 1.5, p0: -60 + r() * 120, span: [-70, 70], len: 4.4, wid: 1.9,
        police: spec.hazards.includes('police') && ci === 1 && k === 0, colour: Math.floor(r() * PALETTE.car)})
    }
  })
  const walkers: Walker[] = []
  if (spec.hazards.includes('crowd')) for (let i = 0; i < 70; i++) {
    const onWalk = r() < 0.6, side = r() < 0.5 ? -1 : 1
    walkers.push({x: onWalk ? side * (half + 1 + r() * (walk - half - 1.6)) : (r() - 0.5) * (half * 2 - 2), z0: 10 - r() * (L - 10), v: 1.3 + r() * 1.4, span: [gateZ + 16, 16], look: look(r)})
  }
  const standers: Stander[] = []
  // the knot at the gate parts down the middle: that is the way in
  for (let i = 0; i < 30; i++) { const side = r() < 0.5 ? -1 : 1; standers.push({x: side * (1.7 + r() * 7.3), z: gateZ + 6 + r() * 9, face: 0, look: look(r, {kit: r() < 0.85, scarf: r() < 0.8}), role: 'fan'}) }
  const throwers: Thrower[] = []
  if (spec.hazards.includes('strike')) for (let i = 0; i < 4; i++) throwers.push({x: (i % 2 ? 1 : -1) * (walk - 1), z: -40 - i * 42, every: 3.2 - spec.difficulty * 0.4, offset: r() * 3})
  if (spec.hazards.includes('strike') || spec.hazards.includes('shove')) for (const t of throwers) for (let k = 0; k < 3; k++) standers.push({x: t.x + (r() - 0.5) * 2, z: t.z + (r() - 0.5) * 3, face: 0, look: look(r, {kit: false, scarf: true}), role: 'rival'})
  const pace = carry ? 4.6 : 6.2
  return finish({
    place: 'street', verb: spec.verb, seed: spec.seed, half, walk, start: {x: 0, z: 14}, goal: {x: 0, z: gateZ + 3, r: 3.5}, home: null,
    bounds: {x0: -SIDE, x1: SIDE, z0: gateZ + 1, z1: 20},
    // open streets: the main road to the ground, and every crossing a side street you may walk down
    side: SIDE, areas: [{x0: -walk + 0.5, x1: walk - 0.5, z0: gateZ + 1, z1: 20}, ...crossings.map(z => ({x0: -SIDE, x1: SIDE, z0: z - SIDE_W, z1: z + SIDE_W}))], crossings, cars, walkers, standers, patrols: [], targets: [], throwers, checks: [],
    voice: carry ? [{at: 190, key: 'carry.1'}, {at: 120, key: 'carry.2'}, {at: 40, key: 'carry.3'}] : [{at: 250, key: 'run.1'}, {at: 175, key: 'run.2'}, {at: 110, key: 'run.3'}, {at: 45, key: 'run.4'}],
    realSeconds: Math.round((L + 14) / pace * SLACK[spec.difficulty]), length: L + 14 - 3,
  })
}

function road(spec: MissionSpec, r: () => number): Level {
  const L = 1400, half = 6.5, lanes = [-4.2, 0, 4.2]
  const cars: Car[] = []
  // each lane moves at its own pace, so traffic never drives through itself: slow on the right, quick on the left
  const laneV = [13, 10.5, 8]
  for (let i = 0; i < 46 + spec.difficulty * 8; i++) {
    const k = Math.floor(r() * 3)
    cars.push({axis: 'z', lane: lanes[k]!, dir: -1, v: laneV[k]!, p0: -30 - r() * (L - 40), span: [-L, 40], len: 4.4, wid: 1.9, police: false, colour: Math.floor(r() * PALETTE.car)})
  }
  // two cars never start in the same place in one lane
  cars.sort((a, b) => a.lane - b.lane || a.p0 - b.p0)
  for (let i = 1; i < cars.length; i++) if (cars[i]!.lane === cars[i - 1]!.lane && Math.abs(cars[i]!.p0 - cars[i - 1]!.p0) < 14) cars[i]!.p0 -= 14
  const checks: Check[] = spec.hazards.includes('police') ? [{z0: -420, z1: -470, max: 11.5}, {z0: -960, z1: -1010, max: 11.5}] : []
  for (const c of checks) for (const k of [-1, 1]) cars.push({axis: 'z', lane: k * (half + 1.6), dir: -1, v: 0, p0: (c.z0 + c.z1) / 2, span: [-L, 40], len: 4.6, wid: 2, police: true, colour: 0})
  return finish({
    place: 'road', verb: spec.verb, seed: spec.seed, half, walk: half + 4, start: {x: 0, z: 10}, goal: {x: 0, z: -L, r: half}, home: null,
    bounds: {x0: -half + 1, x1: half + 4, z0: -L - 5, z1: 20}, areas: [{x0: -half + 1, x1: half - 1, z0: -L - 5, z1: 20}], crossings: [], cars, walkers: [], standers: [], patrols: [], targets: [], throwers: [], checks,
    voice: [{at: 1200, key: 'drive.1'}, {at: 800, key: 'drive.2'}, {at: 400, key: 'drive.3'}, {at: 90, key: 'drive.4'}],
    realSeconds: Math.round(L / 19 * SLACK[spec.difficulty]), length: L + 10,
  })
}

function yard(spec: MissionSpec, r: () => number): Level {
  const steal = spec.hazards.includes('steal')
  const W = 20, Z = -62
  const lines = spec.difficulty === 0 ? [-16, -38] : spec.difficulty === 1 ? [-14, -30, -46] : [-12, -26, -40, -52]
  const patrols: Patrol[] = lines.map((z, i) => {
    const a = -W + 3 + r() * 4, b = W - 3 - r() * 4
    return {pts: i % 2 ? [[b, z], [a, z]] : [[a, z], [b, z]], v: 1.5 + r() * 0.7 + spec.difficulty * 0.2, range: 7 + spec.difficulty, fov: 1.25, role: steal ? 'lookout' : 'steward'}
  })
  const standers: Stander[] = []
  for (let i = 0; i < 18; i++) standers.push({x: (r() < 0.5 ? -1 : 1) * (W - 1 - r() * 2), z: -r() * 50, face: 0, look: look(r), role: steal ? 'rival' : 'fan'})
  const gx = Math.round((r() - 0.5) * 20)
  return finish({
    place: 'yard', verb: spec.verb, seed: spec.seed, half: W, walk: W, start: {x: 0, z: 10}, goal: {x: gx, z: Z + 3, r: 2}, home: steal ? {x: 0, z: 10, r: 4} : null,
    bounds: {x0: -W + 0.6, x1: W - 0.6, z0: Z + 1, z1: 14}, crossings: [], cars: [], walkers: [], standers, patrols, targets: [], throwers: [], checks: [],
    voice: steal ? [{at: 60, key: 'steal.1'}, {at: 20, key: 'steal.2'}] : [{at: 60, key: 'sneak.1'}, {at: 25, key: 'sneak.2'}],
    realSeconds: Math.round(((-Z + 10) * (steal ? 2 : 1)) / 1.6 * SLACK[spec.difficulty]), length: (-Z + 10) * (steal ? 2 : 1),
  })
}

/** dressed in black: a known man's own top, darker than anything the crowd is dealt (the crowd carries no colour of its own) */
const inBlack = (hex?: string): boolean => {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return false
  const v = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  return 0.2126 * v[0]! + 0.7152 * v[1]! + 0.0722 * v[2]! < 0.14
}
const PERSON_CLUES: readonly Clue[][] = [['cap', 'scarf'], ['kit', 'beard'], ['plain', 'cap'], ['scarf', 'beard'], ['kit', 'tall'], ['plain', 'scarf']]
const matches = (l: Look, c: Clue): boolean => c === 'cap' ? l.cap : c === 'scarf' ? l.scarf : c === 'kit' ? l.kit : c === 'plain' ? !l.kit : c === 'beard' ? l.beard : c === 'tall' ? l.size > 1.04 : c === 'grey' ? !!l.grey : c === 'black' ? inBlack(l.hex?.top) : false
/** the clue that is true of somebody the player already knows, most telling first: what you would shout across a crowd */
const KNOWN_ORDER: readonly Clue[] = ['grey', 'cap', 'beard', 'tall', 'scarf', 'black', 'kit', 'plain']
function knownClues(w: KnownLook): Clue[] {
  const has = (c: Clue) => c === 'grey' ? w.grey : c === 'cap' ? w.cap : c === 'beard' ? w.beard : c === 'tall' ? w.tall : c === 'scarf' ? w.scarf : c === 'black' ? !w.kit && inBlack(w.hex.top) : c === 'kit' ? w.kit : !w.kit
  return KNOWN_ORDER.filter(has).slice(0, 2)
}

function crowd(spec: MissionSpec, r: () => number): Level {
  const W = 16, Z = -44, spot = spec.template === 'where-you-stood'
  const standers: Stander[] = []
  for (let i = 0; i < 80; i++) standers.push({x: (r() - 0.5) * (W * 2 - 3), z: 4 - r() * (-Z), face: Math.PI + (r() - 0.5) * 1.4, look: look(r), role: 'fan'})
  const targets: Target[] = []
  if (spot) {
    // the place he always stood: by a crush barrier, under the floodlight — the level marks it, the words describe it
    targets.push({x: Math.round((r() - 0.5) * 18), z: Z + 6 + Math.round(r() * 8), kind: 'spot', look: null, clues: ['barrier', 'light']})
  } else {
    // the same draws are made either way, so a known face changes nothing else in the level
    const picked = PERSON_CLUES[Math.floor(r() * PERSON_CLUES.length)]!
    const known = spec.who ?? null, own = known ? knownClues(known) : []
    const clues = own.length === 2 ? own : picked
    const want: Partial<Look> = {}
    for (const c of clues) Object.assign(want, c === 'cap' ? {cap: true} : c === 'scarf' ? {scarf: true} : c === 'kit' ? {kit: true} : c === 'plain' ? {kit: false} : c === 'beard' ? {beard: true} : c === 'grey' ? {grey: true} : c === 'black' ? {} : {size: 1.08})
    const drawn = look(r, want)
    // somebody the player knows wears what he always wears: every trait and colour is his, not only the two clues
    const who: Look = known && own.length === 2 ? {...drawn, cap: known.cap, scarf: known.scarf, kit: known.kit, beard: known.beard, grey: known.grey, size: known.tall ? 1.08 : 0.99, hex: known.hex} : drawn
    targets.push({x: Math.round((r() - 0.5) * 20), z: Z + 4 + Math.round(r() * 14), kind: 'person', look: who, clues: [...clues]})
    // exactly one person in the crowd answers every clue: anybody else who does loses one of them
    for (const s of standers) if (clues.every(c => matches(s.look, c))) {
      const c = clues[0]!
      s.look = {...s.look, ...(c === 'cap' ? {cap: false} : c === 'scarf' ? {scarf: false} : c === 'kit' ? {kit: false} : c === 'plain' ? {kit: true} : c === 'beard' ? {beard: false} : c === 'grey' ? {grey: false} : c === 'black' ? {} : {size: 0.98})}
    }
  }
  // nobody stands on top of anybody, and the one you came for has room round him
  const t0 = targets[0]!
  const room = standers.filter((p, i) => Math.hypot(p.x - t0.x, p.z - t0.z) > 1.4 && standers.slice(0, i).every(q => Math.hypot(q.x - p.x, q.z - p.z) > 1.1))
  standers.length = 0; standers.push(...room)
  return finish({
    place: 'crowd', verb: spec.verb, seed: spec.seed, half: W, walk: W, start: {x: 0, z: 10}, goal: {x: targets[0]!.x, z: targets[0]!.z, r: 1.8}, home: null,
    bounds: {x0: -W + 0.6, x1: W - 0.6, z0: Z + 1, z1: 14}, crossings: [], cars: [], walkers: [], standers, patrols: [], targets, throwers: [], checks: [],
    voice: [],
    realSeconds: Math.round(70 * SLACK[spec.difficulty]), length: -Z + 10,
  })
}

export function buildLevel(spec: MissionSpec): Level {
  const r = rng(spec.seed ^ 2654435769)
  const p = placeOf(spec)
  const base = p === 'road' ? road(spec, r) : p === 'yard' ? yard(spec, r) : p === 'crowd' ? crowd(spec, r) : street(spec, r)
  if (!base.areas.length) base.areas = [{...base.bounds}]
  applyQuest(base, spec, rng(spec.seed ^ 2654435761))
  conditions(base, spec, rng(spec.seed + 104729))
  const plan = planRoute(base)
  // a surge on the way costs time it would be unfair to bill: the clock carries it
  const held = base.surges.reduce((n, u) => n + (u.t1 - u.t0) * 0.45, 0)
  base.realSeconds = Math.round((plan.seconds + held) * SLACK[spec.difficulty])
  base.length = Math.max(1, Math.round(plan.metres))
  base.timeScale = spec.clock / base.realSeconds
  return base
}

/**
 * The hour and the weather, read once and deterministically (their own random stream: nothing else in
 * the level moves). Night: the stewards see less and the street is emptier. Day: they see further. Rain:
 * the feet take longer to get up to pace and the stewards see a little less. Pace itself never changes,
 * so the planned clock stays fair. A street with a crowd gets a surge: somewhere ahead, for a while,
 * the crowd pushes.
 */
function conditions(l: Level, spec: MissionSpec, r: () => number): void {
  const night = spec.time === 'night', rain = spec.weather === 'rain'
  const sight = (night ? -1 : 1) + (rain ? -0.5 : 0)
  l.patrols = l.patrols.map(p => ({...p, range: Math.max(5, p.range + sight)}))
  if (night) l.walkers = l.walkers.filter((_, i) => i % 4 !== 3)
  if (rain) l.grip = 0.75
  if (l.place === 'street' && spec.hazards.includes('crowd')) {
    const n = spec.difficulty === 2 ? 2 : 1
    const far = l.goal.z + 30, near = -40
    for (let i = 0; i < n; i++) {
      const mid = near + (far - near) * ((i + 0.5) / n) + (r() - 0.5) * 20
      // when somebody walking at pace would be there, give or take
      const t0 = Math.max(4, Math.abs(mid - l.start.z) / PACE_PLAN[l.verb] * (0.6 + r() * 0.3))
      l.surges.push({z0: mid + 12, z1: mid - 12, t0, t1: t0 + 9 + r() * 4})
    }
  }
}

/* ───────────── getting about: one routing rule shared by the planner and the bot ───────────── */

export const inArea = (l: Pick<Level, 'areas'>, x: number, z: number): boolean => l.areas.some(a => x >= a.x0 && x <= a.x1 && z >= a.z0 && z <= a.z1)

/** the side street a point is in (its crossing), or null on the main street */
export function sideOf(l: Level, x: number, z: number): number | null {
  if (!l.side) return null
  for (const c of l.crossings) if (Math.abs(z - c) <= SIDE_W + 0.01 && Math.abs(x) > l.walk - 0.6) return c
  return null
}

/** the next point to walk to on the way from `a` to `b`: out of one side street onto the main street, then into the other */
export function viaPoint(l: Level, a: {x: number; z: number}, b: {x: number; z: number}): {x: number; z: number} {
  if (l.place !== 'street' || !l.side) return b
  const sa = sideOf(l, a.x, a.z), sb = sideOf(l, b.x, b.z)
  const sameSide = sa !== null && sa === sb && Math.sign(a.x) === Math.sign(b.x)
  if (sameSide) return b
  const edge = l.walk - 2.2
  if (sa !== null) return {x: Math.sign(a.x) * edge * 0.5, z: a.z}
  if (sb !== null) return Math.abs(a.x) > edge - 0.3 && Math.abs(a.z - b.z) < 0.8 ? b : {x: Math.sign(b.x) * edge, z: b.z}
  return b
}

/** walking distance through the via points */
export function routeMetres(l: Level, a: {x: number; z: number}, b: {x: number; z: number}): number {
  let p = a, m = 0
  for (let i = 0; i < 4; i++) { const n = viaPoint(l, p, b); m += Math.hypot(n.x - p.x, n.z - p.z); p = n; if (n === b) break }
  return m + Math.hypot(b.x - p.x, b.z - p.z)
}

/** the points a step sends him to, in the order a sensible player takes them */
export function stepPoints(l: Level, i: number, from: {x: number; z: number}): {x: number; z: number}[] {
  const st = l.steps[i]
  if (!st) return []
  if (st.kind !== 'collect') return [{x: st.x, z: st.z}]
  const left = l.pickups.filter(p => p.step === i).map(p => ({x: p.x, z: p.z}))
  const out: {x: number; z: number}[] = []
  let at = from
  while (left.length) { left.sort((p, q) => routeMetres(l, at, p) - routeMetres(l, at, q)); at = left.shift()!; out.push(at) }
  return out
}

const PACE_PLAN: Record<Verb, number> = {run: 6.2, carry: 4.6, sneak: 1.6, find: 4.5, drive: 19}

/** the whole mission walked once at a steady pace: metres and seconds (talks, stops and waits included) */
export function planRoute(l: Level): {metres: number; seconds: number} {
  let at = {...l.start}, metres = 0, seconds = 0, escort = false
  l.steps.forEach((st, i) => {
    const pace = Math.min(PACE_PLAN[l.verb], escort && l.escort ? l.escort.pace : 99)
    for (const p of stepPoints(l, i, at)) { const d = l.place === 'road' ? Math.abs(p.z - at.z) : routeMetres(l, at, p); metres += d; seconds += d / pace; at = p }
    if (st.kind === 'talk') seconds += 1.6
    if (st.kind === 'stop') seconds += st.hold + 7
    if (st.joins) escort = true
  })
  if (l.home) { const d = Math.hypot(l.home.x - l.goal.x, l.home.z - l.goal.z); metres += d; seconds += d / PACE_PLAN[l.verb] }
  // the find: a look around the terrace before the right face
  if (l.place === 'crowd') seconds += 58
  return {metres, seconds}
}

/**
 * The clues a find mission shows: one at the start, one more for every person you asked — and, for
 * whoever asks nobody, the next at 18 s and the last at 36 s (asking is quicker, never required).
 */
export const cluesShown = (level: Level, seconds: number, asked = 0): Clue[] => (level.targets[0]?.clues ?? []).slice(0, Math.max(1 + asked, seconds < 18 ? 1 : seconds < 36 ? 2 : 3))
export {matches as lookMatches}
