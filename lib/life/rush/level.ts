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
import type {MissionSpec, Verb} from './spec'

/* ───────────── seeded randomness ───────────── */

export function rng(seed: number): () => number {
  let a = (seed >>> 0) || 1
  return () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ───────────── what is on the level ───────────── */

export type Place = 'street' | 'road' | 'yard' | 'crowd'

/** how a person looks: indexes into the renderer's palettes, so the sim never carries a colour */
export type Look = {tone: number; hair: number; top: number; pants: number; kit: boolean; cap: boolean; scarf: boolean; beard: boolean; size: number}

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
export type Clue = 'cap' | 'scarf' | 'kit' | 'plain' | 'beard' | 'tall' | 'barrier' | 'light'
/** somebody in the other lot throwing what they hold (ultras route only): a throw every `every` seconds */
export type Thrower = {x: number; z: number; every: number; offset: number}
/** a stretch of road where the police want you slow */
export type Check = {z0: number; z1: number; max: number}
/** a line the supporter thinks, once, when the goal is this far away */
export type Voice = {at: number; key: string}

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
}

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

function look(r: () => number, o: Partial<Look> = {}): Look {
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

function finish(l: Omit<Level, 'timeScale'>, spec: MissionSpec): Level {
  return {...l, timeScale: spec.clock / l.realSeconds}
}

function street(spec: MissionSpec, r: () => number): Level {
  const carry = spec.verb === 'carry'
  const L = carry ? 220 : 300, half = 7, walk = 11, gateZ = -L
  const crossings = carry ? [-70, -150] : [-70, -150, -225]
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
    bounds: {x0: -walk + 0.5, x1: walk - 0.5, z0: gateZ + 1, z1: 20}, crossings, cars, walkers, standers, patrols: [], targets: [], throwers, checks: [],
    voice: carry ? [{at: 190, key: 'carry.1'}, {at: 120, key: 'carry.2'}, {at: 40, key: 'carry.3'}] : [{at: 250, key: 'run.1'}, {at: 175, key: 'run.2'}, {at: 110, key: 'run.3'}, {at: 45, key: 'run.4'}],
    realSeconds: Math.round((L + 14) / pace * SLACK[spec.difficulty]), length: L + 14 - 3,
  }, spec)
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
    bounds: {x0: -half + 1, x1: half - 1, z0: -L - 5, z1: 20}, crossings: [], cars, walkers: [], standers: [], patrols: [], targets: [], throwers: [], checks,
    voice: [{at: 1200, key: 'drive.1'}, {at: 800, key: 'drive.2'}, {at: 400, key: 'drive.3'}, {at: 90, key: 'drive.4'}],
    realSeconds: Math.round(L / 19 * SLACK[spec.difficulty]), length: L + 10,
  }, spec)
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
  }, spec)
}

const PERSON_CLUES: readonly Clue[][] = [['cap', 'scarf'], ['kit', 'beard'], ['plain', 'cap'], ['scarf', 'beard'], ['kit', 'tall'], ['plain', 'scarf']]
const matches = (l: Look, c: Clue): boolean => c === 'cap' ? l.cap : c === 'scarf' ? l.scarf : c === 'kit' ? l.kit : c === 'plain' ? !l.kit : c === 'beard' ? l.beard : c === 'tall' ? l.size > 1.04 : false

function crowd(spec: MissionSpec, r: () => number): Level {
  const W = 16, Z = -44, spot = spec.template === 'where-you-stood'
  const standers: Stander[] = []
  for (let i = 0; i < 80; i++) standers.push({x: (r() - 0.5) * (W * 2 - 3), z: 4 - r() * (-Z), face: Math.PI + (r() - 0.5) * 1.4, look: look(r), role: 'fan'})
  const targets: Target[] = []
  if (spot) {
    // the place he always stood: by a crush barrier, under the floodlight — the level marks it, the words describe it
    targets.push({x: Math.round((r() - 0.5) * 18), z: Z + 6 + Math.round(r() * 8), kind: 'spot', look: null, clues: ['barrier', 'light']})
  } else {
    const clues = PERSON_CLUES[Math.floor(r() * PERSON_CLUES.length)]!
    const want: Partial<Look> = {}
    for (const c of clues) Object.assign(want, c === 'cap' ? {cap: true} : c === 'scarf' ? {scarf: true} : c === 'kit' ? {kit: true} : c === 'plain' ? {kit: false} : c === 'beard' ? {beard: true} : {size: 1.08})
    const who = look(r, want)
    targets.push({x: Math.round((r() - 0.5) * 20), z: Z + 4 + Math.round(r() * 14), kind: 'person', look: who, clues: [...clues]})
    // exactly one person in the crowd answers every clue: anybody else who does loses one of them
    for (const s of standers) if (clues.every(c => matches(s.look, c))) {
      const c = clues[0]!
      s.look = {...s.look, ...(c === 'cap' ? {cap: false} : c === 'scarf' ? {scarf: false} : c === 'kit' ? {kit: false} : c === 'plain' ? {kit: true} : c === 'beard' ? {beard: false} : {size: 0.98})}
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
  }, spec)
}

export function buildLevel(spec: MissionSpec): Level {
  const r = rng(spec.seed ^ 0x9e3779b9)
  const p = placeOf(spec)
  return p === 'road' ? road(spec, r) : p === 'yard' ? yard(spec, r) : p === 'crowd' ? crowd(spec, r) : street(spec, r)
}

/** the clue a find mission gives after `n` seconds: one at the start, the next at 18 s, the last at 36 s */
export const cluesShown = (level: Level, seconds: number): Clue[] => (level.targets[0]?.clues ?? []).slice(0, seconds < 18 ? 1 : seconds < 36 ? 2 : 3)
export {matches as lookMatches}
