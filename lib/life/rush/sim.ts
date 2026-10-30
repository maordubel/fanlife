/**
 * LIFE · RUSH — the simulation. One fixed step, one input, no screen.
 *
 * The renderer draws what this file says; the bot test plays it at a thousand steps a second.
 * Nobody here is ever hurt (ADR-fanlife-0013): a car is a stumble and lost seconds, a steward is
 * "back to the start of the yard", a thrown object knocks the roll out of your arms. The clock is
 * the pressure, and in story mode the clock stops at zero instead of ending the mission.
 *
 * RUSH 2 adds the quest: a mission is a row of steps (meet him, collect it, stop for a mate, the gate),
 * played in an open place — side streets you may walk down, extras that buy seconds, a knot of people
 * singing, somebody walking with you who stops if you leave him behind, a bin that turns a steward's head.
 */
import {carAt, cluesShown, FAVOUR_BONUS, inArea, patrolAt, routeMetres, SURGE_DAMP, viaPoint, walkerAt, type FavourKind, type Level, type PickupKind, type SearchKind} from './level'
import {flatSight} from './flat'
import {MAX_EVIDENCE, type MissionOutcome, type MissionResult, type MissionScore, type MissionSpec} from './spec'

export const STEP = 1 / 60

export type Input = {x: number; z: number; sprint: boolean; act: boolean}
export const IDLE: Input = {x: 0, z: 0, sprint: false, act: false}

export type SimEvent =
  | {k: 'hit'; by: Knock}
  | {k: 'caught'}
  | {k: 'favour'; kind: FavourKind; bonus: number}
  | {k: 'surge'}
  | {k: 'wrong'}
  | {k: 'found'}
  | {k: 'grab'}
  | {k: 'drop'}
  | {k: 'voice'; key: string}
  | {k: 'throw'; x: number; z: number; land: number}
  | {k: 'end'; outcome: MissionOutcome}
  /** step `i` is done; `next` is the one that starts now (−1 = none left) */
  | {k: 'step'; i: number; next: number}
  /** somebody spoke to you: the words key of his line */
  | {k: 'talk'; key: string}
  | {k: 'pickup'; kind: PickupKind; extra: boolean; bonus: number; streak: number}
  | {k: 'chant'; bonus: number}
  | {k: 'noise'; x: number; z: number}
  | {k: 'missed'}
  | {k: 'escort'; state: 'wait' | 'ok' | 'come'}
  /** at the gate with a step still open */
  | {k: 'notyet'}
  /** close up: he starts going through a place, and what it gave (null = nothing there; `cancel` = he walked away) */
  | {k: 'search'; i: number; kind: SearchKind; state: 'start' | 'cancel' | 'empty' | 'found'; got: PickupKind | null}
  /** a board that talks under his feet at night (loud = he was running) */
  | {k: 'creak'; loud: boolean}

/** what can knock him: on the street, and at home (a toy underfoot, the cat, Mum in the hall) */
export type Knock = 'car' | 'throw' | 'police' | 'shove' | 'trip' | 'cat' | 'mum' | 'dad'
export type Throw = {x0: number; z0: number; x: number; z: number; t0: number; t1: number}
export type EscortState = {x: number; z: number; heading: number; speed: number; lost: boolean}

export type Sim = {
  t: number
  /** game seconds left on the clock the player sees */
  clock: number
  x: number; z: number; vx: number; vz: number; heading: number
  speed: number
  stamina: number
  stagger: number
  sprinting: boolean
  /** carry: whether the load is in his arms; steal: whether he has their banner */
  holding: boolean
  /** carry: how many rolls he holds */
  carried: number
  /** carry: where the load fell, and how much of it */
  dropped: {x: number; z: number; n: number} | null
  /** sneak: how much of him the nearest steward has seen (1 = caught) */
  seen: number
  seenBy: number
  /** seconds after being sent back in which nobody can catch him again (no loop of catches at one spot) */
  grace: number
  /** steal: going back with it */
  back: boolean
  checkpoint: {x: number; z: number}
  hits: number; caught: number; wrong: number
  throws: Throw[]
  said: string[]
  ended: MissionOutcome | null
  assist: boolean
  events: SimEvent[]
  /* the quest */
  step: number
  got: boolean[]
  ringT: number[]
  ringDone: boolean[]
  extras: number
  chants: number
  asked: number
  holdT: number
  noise: {x: number; z: number; t: number} | null
  esc: EscortState | null
  notyetAt: number
  missed: number
  /** game seconds the knocks cost (shown on the result card) */
  lost: number
  /** extras taken within STREAK.gap of each other: each one in a row is worth more */
  streak: number
  streakAt: number
  streakBest: number
  /** times the one walking with him fell behind */
  escLost: number
  /** the good turns done (RUSH 4), and the surges already announced */
  favoured: boolean[]
  surged: boolean[]
  /** the last time something at home knocked him (a toy, the cat, Mum): never twice in one stumble */
  bumpAt: number
  /** close up: the places already gone through, the one he is going through now (−1 none) and for how long */
  searched: boolean[]
  searchI: number
  searchT: number
  /** the loud board he is standing on (−1 none): a board talks once each time it is stepped on */
  creakOn: number
}

export function startSim(level: Level, assist = false): Sim {
  const carry = level.verb === 'carry'
  return {
    t: 0, clock: level.realSeconds * level.timeScale, x: level.start.x, z: level.start.z, vx: 0, vz: 0, heading: Math.PI, speed: 0,
    stamina: 1, stagger: 0, sprinting: false, holding: carry, carried: carry ? 1 : 0, dropped: null, seen: 0, seenBy: -1, grace: 0, back: false,
    checkpoint: {...level.start}, hits: 0, caught: 0, wrong: 0, throws: [], said: [], ended: null, assist, events: [],
    step: 0, got: level.pickups.map(() => false), ringT: level.rings.map(() => 0), ringDone: level.rings.map(() => false),
    extras: 0, chants: 0, asked: 0, holdT: 0, noise: null, esc: null, notyetAt: -9, missed: 0,
    lost: 0, streak: 0, streakAt: -99, streakBest: 0, escLost: 0,
    favoured: level.favours.map(() => false), surged: level.surges.map(() => false), bumpAt: -9,
    searched: level.searches.map(() => false), searchI: -1, searchT: 0, creakOn: -1,
  }
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

/** top speeds by verb, metres a second: walking pace · sprint · when the legs have gone */
const PACE: Record<Level['verb'], [number, number, number]> = {
  run: [6.2, 9.4, 4.6], carry: [4.6, 6.4, 3.4], sneak: [3.2, 6, 2.6], find: [4.5, 7, 3.6], drive: [19, 26, 19],
}
/** a penalty in GAME seconds: what each knock costs on the clock */
export const COST = {car: 9, throw: 8, police: 24, shove: 5, caught: 24, wrong: 12, missed: 20, trip: 3, cat: 3, mum: 4, dad: 4} as const
/** what an extra buys, in GAME seconds */
export const BONUS = {pickup: 5, chant: 8} as const
/** a run of extras: each one taken within `gap` seconds of the last adds `step` more, up to `max` in a row */
export const STREAK = {gap: 6, step: 2, max: 3} as const

/** every clock penalty goes through here, so the result card can say what the knocks cost */
function charge(s: Sim, n: number) { if (s.assist) return; s.clock -= n; s.lost += n; s.streak = 0 }
/** how long somebody looks where a bin was banged, and how far the bang carries */
const NOISE = {seconds: 3.5, reach: 22, arm: 1.8, again: 4} as const

function knock(s: Sim, level: Level, by: Knock, away: {x: number; z: number}) {
  s.stagger = by === 'police' ? 2.4 : by === 'shove' || by === 'mum' || by === 'dad' ? 0.5 : by === 'trip' || by === 'cat' ? 0.7 : 0.9
  s.hits++
  charge(s, COST[by])
  const d = Math.hypot(s.x - away.x, s.z - away.z) || 1
  s.vx = (s.x - away.x) / d * 6; s.vz = (s.z - away.z) / d * 6
  if (level.verb === 'carry' && s.holding && by !== 'shove') { s.holding = false; s.dropped = {x: s.x, z: s.z, n: s.carried}; s.carried = 0; s.events.push({k: 'drop'}) }
  s.events.push({k: 'hit', by})
}

function goalOf(level: Level, s: Sim): {x: number; z: number; r: number} {
  return s.back && level.home ? level.home : level.goal
}

/** where a steward is, and where he looks — his round, unless a bang turned his head */
export function patrolLook(level: Level, s: Pick<Sim, 't' | 'noise'>, i: number): {x: number; z: number; face: number} {
  const at = patrolAt(level.patrols[i]!, s.t)
  const n = s.noise
  if (n && s.t - n.t < NOISE.seconds && Math.hypot(n.x - at.x, n.z - at.z) < NOISE.reach) return {...at, face: Math.atan2(n.x - at.x, n.z - at.z)}
  return at
}

/** the point the current step sends him to (a collect step: the nearest thing still on the ground) */
export function stepTarget(level: Level, s: Sim): {x: number; z: number; r: number} | null {
  const st = level.steps[s.step]
  if (!st) return null
  if (st.kind === 'goal') return level.place === 'crowd' ? {x: st.x, z: st.z, r: st.r} : goalOf(level, s)
  if (st.kind === 'collect') {
    let best: {x: number; z: number; r: number} | null = null, bd = Infinity
    level.pickups.forEach((p, i) => { if (p.step !== s.step || s.got[i] || p.inside !== undefined) return; const d = routeMetres(level, s, p); if (d < bd) { bd = d; best = {x: p.x, z: p.z, r: 1.1} } })
    // what is hidden is never pointed at: the compass points at the nearest place it might be
    const hidden = level.pickups.some((p, i) => p.step === s.step && !s.got[i] && p.inside !== undefined)
    if (hidden) level.searches.forEach((q, i) => { if (q.for !== s.step || s.searched[i]) return; const d = routeMetres(level, s, q); if (d < bd) { bd = d; best = {x: q.x, z: q.z, r: 0.6} } })
    return best
  }
  return {x: st.x, z: st.z, r: st.r}
}

const stepDone = (level: Level, s: Sim, i: number) => level.steps[i]?.kind === 'collect' && level.pickups.every((p, k) => p.step !== i || s.got[k])

function advance(level: Level, s: Sim) {
  const st = level.steps[s.step]!
  if (st.joins && level.escort) s.esc = {x: st.x, z: st.z, heading: Math.PI, speed: 0, lost: false}
  if (st.reveals) s.asked++
  const i = s.step
  s.step++
  s.holdT = 0
  // an open world: what was collected before its step comes up does not have to be collected again
  while (s.step < level.steps.length - 1 && stepDone(level, s, s.step)) s.step++
  s.events.push({k: 'step', i, next: s.step < level.steps.length ? s.step : -1})
}

/** move a body by (dx, dz) inside the walkable world: along a wall when the way is shut */
function moveIn(level: Level, b: {x: number; z: number; vx?: number; vz?: number}, dx: number, dz: number) {
  const nx = clamp(b.x + dx, level.bounds.x0, level.bounds.x1), nz = clamp(b.z + dz, level.bounds.z0, level.bounds.z1)
  // already outside (a push put him there): any move is allowed, so he can never be walled in
  if (inArea(level, nx, nz) || !inArea(level, b.x, b.z)) { b.x = nx; b.z = nz; return }
  if (inArea(level, nx, b.z)) { b.x = nx; if (b.vz !== undefined) b.vz = 0; return }
  if (inArea(level, b.x, nz)) { b.z = nz; if (b.vx !== undefined) b.vx = 0; return }
  if (b.vx !== undefined) b.vx = 0
  if (b.vz !== undefined) b.vz = 0
}

/** something is his: a step's thing, or an extra that buys seconds (and a run of them buys more) */
function take(s: Sim, i: number, kind: PickupKind, extra: boolean) {
  s.got[i] = true
  let bonus = 0, streak = 0
  if (extra) {
    s.streak = s.t - s.streakAt <= STREAK.gap ? s.streak + 1 : 1
    s.streakAt = s.t; s.streakBest = Math.max(s.streakBest, s.streak)
    streak = s.streak
    bonus = BONUS.pickup + STREAK.step * Math.min(s.streak - 1, STREAK.max)
    s.extras++; s.clock += bonus
  }
  s.events.push({k: 'pickup', kind, extra, bonus, streak})
}

/** the place to go through within reach of where he stands, nearest first (−1 none) */
export function nearSearch(level: Level, s: Pick<Sim, 'x' | 'z' | 'searched'>): number {
  let best = -1, bd = SEARCH_REACH
  level.searches.forEach((q, i) => { if (s.searched[i]) return; const d = Math.hypot(q.x - s.x, q.z - s.z); if (d < bd) { bd = d; best = i } })
  return best
}
/** how near a place he has to stand to go through it */
export const SEARCH_REACH = 1.15

/** One step of the mission. Mutates and returns `s`; `s.events` holds what happened in this step only. */
export function stepSim(level: Level, s: Sim, input0: Input, dt = STEP): Sim {
  let input = input0
  s.events = []
  if (s.ended) return s
  s.t += dt
  const [walk, sprint, tired] = PACE[level.verb].map(v => v * level.pace) as [number, number, number]
  let ix = input.x, iz = input.z
  const il = Math.hypot(ix, iz)
  if (il > 1) { ix /= il; iz /= il }
  const moving = Math.hypot(ix, iz) > 0.2

  if (level.place === 'road') {
    // the car: forward is −z, up on the stick is the accelerator, down the brake; left and right steer
    s.sprinting = input.sprint && s.stagger <= 0
    // the stick is the pedal: how far up is how fast (a light touch is a crawl through a police check), down is the brake
    const want = s.stagger > 0 ? 0 : -iz > 0.1 ? (s.sprinting ? sprint : walk * Math.min(1, -iz * 1.25)) : 0
    // off the pedal the car rolls to a stop; the brake stops it hard
    const accel = want > s.speed ? 7 * level.grip : iz > 0.2 ? 12 * level.grip : 3
    s.speed += clamp(want - s.speed, -accel * dt, accel * dt)
    s.vz = -s.speed
    s.vx += (ix * 7 - s.vx) * Math.min(dt * 4, 1)
    s.heading = Math.PI + Math.atan2(s.vx, s.speed + 0.01) * 0.6
  } else {
    s.sprinting = input.sprint && s.stamina > 0.05 && moving && s.stagger <= 0
    const drain = level.verb === 'carry' && s.holding ? 0.42 : 0.3
    s.stamina = clamp(s.stamina + (s.sprinting ? -drain : 0.16) * dt, 0, 1)
    const top = (s.sprinting ? sprint : s.stamina < 0.25 ? tired : walk) * (s.stagger > 0 ? 0.35 : 1)
    // the grip is how fast he gets up to pace (wet ground is slower), never the pace itself
    s.vx += (ix * top - s.vx) * Math.min(dt * 7 * level.grip, 1)
    s.vz += (iz * top - s.vz) * Math.min(dt * 7 * level.grip, 1)
    s.speed = Math.hypot(s.vx, s.vz)
    if (s.speed > 0.4) { const want = Math.atan2(s.vx, s.vz); let d = want - s.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); s.heading += d * Math.min(dt * 10, 1) }
  }
  s.stagger = Math.max(0, s.stagger - dt)
  moveIn(level, s, s.vx * dt, s.vz * dt)

  // traffic: across a crossing, or in your lane
  for (const c of level.cars) {
    const p = carAt(c, s.t)
    const hx = level.place === 'road' ? 1.0 : 0.45, hz = level.place === 'road' ? 2.3 : 0.45
    const reachX = (c.axis === 'x' ? c.len : c.wid) / 2 + hx, reachZ = (c.axis === 'x' ? c.wid : c.len) / 2 + hz
    if (s.stagger <= 0 && Math.abs(p.x - s.x) < reachX && Math.abs(p.z - s.z) < reachZ) {
      if (level.place === 'road') {
        // you ran into the back of him: you drop behind at his pace. He ran into you: you are shunted ahead at his.
        const behind = s.z > p.z
        s.speed = c.v * (behind ? 0.6 : 1)
        s.z = behind ? p.z + reachZ + 0.05 : p.z - reachZ - 0.05
        s.stagger = 0.5; s.hits++
        charge(s, COST.car)
        s.events.push({k: 'hit', by: 'car'})
        continue
      }
      knock(s, level, 'car', p)
    }
  }

  // police checks: through the zone too fast and you are waved over
  for (const c of level.checks) if (s.z < c.z0 && s.z > c.z1 && s.speed > c.max && s.stagger <= 0) { s.speed = 0; knock(s, level, 'police', {x: s.x, z: s.z + 1}) }

  // people walking the same way: you brush past, it slows you
  for (const w of level.walkers) {
    const p = walkerAt(w, s.t), dx = s.x - p.x, dz = s.z - p.z, d2 = dx * dx + dz * dz
    if (d2 < 0.5) { const d = Math.sqrt(d2) || 0.01; if (inArea(level, s.x + dx / d * 0.05, s.z + dz / d * 0.05)) { s.x += dx / d * 0.05; s.z += dz / d * 0.05 } s.vx *= 0.9; s.vz *= 0.9 }
  }

  // a surge: for a while, on one stretch, the crowd pushes and every step is slower — never a wall
  level.surges.forEach((u, i) => {
    if (s.t < u.t0 || s.t > u.t1) return
    if (!s.surged[i] && s.z <= u.z0 + 10 && s.z >= u.z1 - 10) { s.surged[i] = true; s.events.push({k: 'surge'}) }
    if (s.z <= u.z0 && s.z >= u.z1) { const k = Math.pow(SURGE_DAMP, dt * 60); s.vx *= k; s.vz *= k }
  })
  // standing people are solid; the other lot shove
  for (const p of level.standers) {
    const dx = s.x - p.x, dz = s.z - p.z, d2 = dx * dx + dz * dz
    if (d2 < 0.36) {
      const d = Math.sqrt(d2) || 0.01
      const ox = p.x + dx / d * 0.6, oz = p.z + dz / d * 0.6
      if (inArea(level, ox, oz)) { s.x = ox; s.z = oz }
      if (p.role === 'rival' && s.stagger <= 0 && (level.verb === 'carry' || level.verb === 'sneak')) knock(s, level, 'shove', p)
    }
  }

  // at home: the cat and Mum are in the way — brush past at a walk, but sprint into them and down you go;
  // a toy is nothing underfoot at a walk and a fall at a sprint
  if (level.place === 'flat') {
    for (const p of level.patrols) {
      const at = patrolAt(p, s.t), dx = s.x - at.x, dz = s.z - at.z, d = Math.hypot(dx, dz), rr = p.role === 'cat' ? 0.5 : 0.62
      if (d >= rr) continue
      const k = d || 0.01, ox = at.x + dx / k * rr, oz = at.z + dz / k * rr
      if (inArea(level, ox, oz)) { s.x = ox; s.z = oz }
      if (s.sprinting && s.stagger <= 0 && s.t - s.bumpAt > 1.2) { s.bumpAt = s.t; knock(s, level, p.role === 'cat' ? 'cat' : p.role === 'dad' ? 'dad' : 'mum', at) }
    }
    for (const tr of level.trips) if (s.sprinting && s.stagger <= 0 && s.t - s.bumpAt > 1.2 && Math.hypot(tr.x - s.x, tr.z - s.z) < 0.55) {
      s.bumpAt = s.t
      // he goes over it, forwards: the push comes from behind him
      knock(s, level, 'trip', {x: s.x - Math.sin(s.heading), z: s.z - Math.cos(s.heading)})
    }
  }

  // thrown objects (ultras route): each thrower throws where you ARE, it lands a second later
  for (let i = 0; i < level.throwers.length; i++) {
    const th = level.throwers[i]!
    if (Math.abs(th.z - s.z) > 30) continue
    const k = Math.floor((s.t - th.offset) / th.every), tk = th.offset + k * th.every
    if (k >= 0 && tk > s.t - dt && tk <= s.t) {
      const land = s.t + 1.1
      s.throws.push({x0: th.x, z0: th.z, x: s.x + s.vx * 0.6, z: s.z + s.vz * 0.6, t0: s.t, t1: land})
      s.events.push({k: 'throw', x: s.x, z: s.z, land})
    }
  }
  s.throws = s.throws.filter(th => {
    if (s.t < th.t1) return true
    if (Math.hypot(th.x - s.x, th.z - s.z) < 1.1 && s.stagger <= 0) knock(s, level, 'throw', {x: th.x0, z: th.z0})
    return false
  })

  // carry: the load is picked up again by walking over it
  if (level.verb === 'carry' && !s.holding && s.dropped && Math.hypot(s.dropped.x - s.x, s.dropped.z - s.z) < 1.3) { s.holding = true; s.carried += s.dropped.n; s.dropped = null; s.events.push({k: 'grab'}) }

  // things on the ground: walk over them
  if (level.place !== 'road') level.pickups.forEach((p, i) => {
    if (s.got[i] || p.inside !== undefined || Math.hypot(p.x - s.x, p.z - s.z) > 1.1) return
    if (p.kind === 'roll' && level.verb === 'carry') { s.carried++; s.holding = true }
    take(s, i, p.kind, p.step === null)
  })
  // close up (a home): tap act by a place and keep still — he goes through it, and the camera comes down to his hands
  if (level.searches.length) {
    if (s.searchI >= 0) {
      const q = level.searches[s.searchI]!
      if (moving || Math.hypot(q.x - s.x, q.z - s.z) > 1.4 || s.stagger > 0) {
        s.events.push({k: 'search', i: s.searchI, kind: q.kind, state: 'cancel', got: null}); s.searchI = -1; s.searchT = 0
      } else {
        s.vx *= 0.7; s.vz *= 0.7
        s.searchT += dt
        if (s.searchT >= q.secs) {
          const i = s.searchI
          s.searched[i] = true; s.searchI = -1; s.searchT = 0
          const inside = level.pickups.map((p, k) => p.inside === i && !s.got[k] ? k : -1).filter(k => k >= 0)
          s.events.push({k: 'search', i, kind: q.kind, state: inside.length ? 'found' : 'empty', got: inside.length ? level.pickups[inside[0]!]!.kind : null})
          for (const k of inside) take(s, k, level.pickups[k]!.kind, level.pickups[k]!.step === null)
        }
      }
    } else if (input.act && !moving) {
      const i = nearSearch(level, s)
      if (i >= 0) { s.searchI = i; s.searchT = 0; s.events.push({k: 'search', i, kind: level.searches[i]!.kind, state: 'start', got: null}); input = {...input, act: false} }
    }
  }
  const cur = level.steps[s.step]
  if (cur?.kind === 'collect' && stepDone(level, s, s.step)) advance(level, s)

  // a knot of people singing: stand in it a moment and the song carries you
  level.rings.forEach((g, i) => {
    if (s.ringDone[i]) return
    if (Math.hypot(g.x - s.x, g.z - s.z) < g.r) { s.ringT[i]! += dt; if (s.ringT[i]! >= 1.6) { s.ringDone[i] = true; s.chants++; s.clock += BONUS.chant; s.events.push({k: 'chant', bonus: BONUS.chant}) } }
    else s.ringT[i] = 0
  })

  // the one who walks with you: he keeps up when he can, and stops when you leave him behind
  if (s.esc && level.escort) {
    const e = s.esc, esc = level.escort
    const dx = s.x - e.x, dz = s.z - e.z, d = Math.hypot(dx, dz)
    if (!e.lost && d > esc.leash) { e.lost = true; s.escLost++; s.events.push({k: 'escort', state: 'wait'}) }
    else if (e.lost && d < esc.leash * 0.6) { e.lost = false; s.events.push({k: 'escort', state: 'ok'}) }
    e.speed = 0
    if (!e.lost && d > 1.8) {
      e.speed = Math.min(esc.pace, (d - 1.4) * 2.4)
      moveIn(level, e, dx / d * e.speed * dt, dz / d * e.speed * dt)
      e.heading = Math.atan2(dx, dz)
      for (const p of level.standers) { const ex = e.x - p.x, ez = e.z - p.z, q = ex * ex + ez * ez; if (q < 0.36) { const k = Math.sqrt(q) || 0.01; const ox = p.x + ex / k * 0.6, oz = p.z + ez / k * 0.6; if (inArea(level, ox, oz)) { e.x = ox; e.z = oz } } }
    }
  }

  // sneak: the stewards see what is in front of them, nearer and faster is seen sooner
  const homeSneak = level.place === 'flat' && level.verb === 'sneak'
  if (level.place === 'yard' || homeSneak) {
    let worst = 0, by = -1
    // a board that talks: walked on, whoever is near hears a little; run on, the whole flat hears it
    if (homeSneak) {
      const on = level.creaks.findIndex(c => s.x >= c.x0 && s.x <= c.x1 && s.z >= c.z0 && s.z <= c.z1)
      if (on >= 0 && on !== s.creakOn && s.speed > 0.6) {
        const loud = s.sprinting
        s.events.push({k: 'creak', loud})
        level.patrols.forEach((p, i) => { if (!p.range) return; const at = patrolAt(p, s.t), d = Math.hypot(at.x - s.x, at.z - s.z); if (d < (loud ? 16 : 7.5) && s.grace <= 0) { s.seen = clamp(s.seen + (loud ? 0.75 : 0.32), 0, 1); s.seenBy = i } })
      }
      s.creakOn = on
    }
    level.patrols.forEach((p, i) => {
      if (!p.range) return
      const at = patrolLook(level, s, i), dx = s.x - at.x, dz = s.z - at.z, d = Math.hypot(dx, dz)
      if (homeSneak && !flatSight(at, s)) return
      const range = p.range * (s.assist ? 0.55 : 1) * (s.sprinting ? 1.35 : 1)
      if (d > range) return
      let a = Math.atan2(dx, dz) - at.face; a = Math.atan2(Math.sin(a), Math.cos(a))
      if (Math.abs(a) > p.fov / 2) return
      const look = (1 - d / range) * 2.2 + 0.9
      if (look > worst) { worst = look; by = i }
    })
    if (by >= 0 || !homeSneak) s.seenBy = by
    s.grace = Math.max(0, s.grace - dt)
    s.seen = clamp(s.seen + (worst > 0 && s.grace <= 0 ? worst * dt * 1.6 : -dt * 0.8), 0, 1)
    if (s.seen >= 1) {
      s.caught++; s.seen = 0; s.grace = 2.5
      charge(s, COST.caught)
      s.x = s.checkpoint.x; s.z = s.checkpoint.z; s.vx = s.vz = 0
      s.events.push({k: 'caught'})
    }
    // every patrol line passed unseen is a new place to be sent back to (a home: what he has found is kept, and so is where he found it)
    if (!homeSneak) for (const p of level.patrols) {
      const line = p.pts[0]![1]
      const passed = s.back ? s.z > line + 2 : s.z < line - 2
      if (passed && (s.back ? s.checkpoint.z < line + 2 : s.checkpoint.z > line - 2)) s.checkpoint = {x: s.x, z: s.back ? line + 2.5 : line - 2.5}
    }
  }

  // the steps that are not a place to reach
  const st = level.steps[s.step]
  let acted = false
  if (st?.kind === 'talk' && input.act && Math.hypot(st.x - s.x, st.z - s.z) < st.r) {
    acted = true
    charge(s, st.cost)
    if (st.say) s.events.push({k: 'talk', key: st.say})
    advance(level, s)
  } else if (st?.kind === 'reach' && Math.hypot(st.x - s.x, st.z - s.z) < st.r) {
    if (st.say) s.events.push({k: 'talk', key: st.say})
    advance(level, s)
  } else if (st?.kind === 'stop') {
    const inBay = Math.abs(s.x - st.x) < 2.8 && Math.abs(s.z - st.z) < st.r
    s.holdT = inBay && s.speed < 1.5 ? s.holdT + dt : 0
    if (s.holdT >= st.hold) { if (st.say) s.events.push({k: 'talk', key: st.say}); advance(level, s) }
    else if (s.z < st.z - st.r - 2) { s.missed++; charge(s, COST.missed); s.events.push({k: 'missed'}); advance(level, s) }
  }
  // a bang on a bin: every steward near turns his head to it
  if (input.act && !acted && level.noises.length && (!s.noise || s.t - s.noise.t > NOISE.again)) {
    const n = level.noises.find(q => Math.hypot(q.x - s.x, q.z - s.z) < NOISE.arm)
    if (n) { acted = true; s.noise = {x: n.x, z: n.z, t: s.t}; s.events.push({k: 'noise', x: n.x, z: n.z}) }
  }

  // a good turn: act next to it — never needed, always worth it
  if (input.act && !acted && level.favours.length) {
    const i = level.favours.findIndex((f, k) => !s.favoured[k] && Math.hypot(f.x - s.x, f.z - s.z) < 1.9)
    if (i >= 0) { acted = true; s.favoured[i] = true; s.clock += FAVOUR_BONUS; s.events.push({k: 'favour', kind: level.favours[i]!.kind, bonus: FAVOUR_BONUS}) }
  }

  // find: press next to the one you came for (asking around first is quicker, never required)
  if (level.place === 'crowd' && input.act && !acted) {
    const tg = level.targets[0]!
    if (Math.hypot(tg.x - s.x, tg.z - s.z) < 1.8) { s.events.push({k: 'found'}); s.step = level.steps.length; return end(s, 'good') }
    const near = level.standers.some(p => Math.hypot(p.x - s.x, p.z - s.z) < 1.6)
    if (near) { s.wrong++; charge(s, COST.wrong); s.events.push({k: 'wrong'}) }
  }

  // the inner voice: once each, as the goal comes closer
  const g = goalOf(level, s), dist = Math.hypot(g.x - s.x, g.z - s.z)
  for (const v of level.voice) if ((v.t !== undefined ? s.t >= v.t : dist < v.at) && !s.said.includes(v.key)) { s.said.push(v.key); s.events.push({k: 'voice', key: v.key}) }

  // the goal — only when it is the step that is open
  const atGoal = level.place === 'road' ? s.z <= g.z : Math.hypot(g.x - s.x, g.z - s.z) < g.r
  const last = level.steps[s.step]?.kind === 'goal'
  if (level.place !== 'crowd' && atGoal) {
    if (!last) {
      if (s.t - s.notyetAt > 4) { s.notyetAt = s.t; s.events.push({k: 'notyet'}) }
    } else if (level.home && !s.back) { s.back = true; s.holding = true; s.events.push({k: 'grab'}); s.checkpoint = {x: s.x, z: s.z} }
    else if (s.esc && (s.esc.lost || Math.hypot(s.esc.x - s.x, s.esc.z - s.z) > 4.5)) {
      if (s.t - s.notyetAt > 4) { s.notyetAt = s.t; s.events.push({k: 'escort', state: 'come'}) }
    } else if (level.verb !== 'carry' || s.holding) { s.step = level.steps.length; return end(s, 'good') }
  }

  s.clock -= dt * level.timeScale
  if (s.clock <= 0) {
    if (s.assist) s.clock = 0
    else return end(s, 'slip')
  }
  return s
}

function end(s: Sim, outcome: MissionOutcome): Sim {
  // story mode carries you through: arriving is 'ok', never 'good'
  s.ended = outcome === 'good' && s.assist ? 'ok' : outcome
  s.events.push({k: 'end', outcome: s.ended})
  return s
}

/** The result card's score: a slip has no stars; then one for arriving, one for a clean run, one for the extras (or the time) */
export function scoreOf(level: Level, s: Sim): MissionScore {
  const extrasOf = level.pickups.filter(p => p.step === null).length
  const outcome = s.ended ?? 'slip'
  const clean = s.hits === 0 && s.caught === 0 && s.wrong === 0 && s.missed === 0
  // the third star asks for what this mission is about: whoever walks with you never left behind,
  // or the extras and songs of an open street, or else time to spare
  const favours = s.favoured.filter(Boolean).length
  const third = favours > 0 || (level.escort ? s.escLost === 0 && (extrasOf ? s.extras / extrasOf >= 0.4 : true)
    : extrasOf ? s.extras / extrasOf >= 0.6 || s.chants >= 2 || s.streakBest >= 3
    : s.clock > level.realSeconds * level.timeScale * 0.25)
  const stars = (outcome === 'slip' ? 0 : outcome === 'ok' ? 1 : 1 + (clean ? 1 : 0) + (third ? 1 : 0)) as MissionScore['stars']
  return {stars, extras: s.extras, extrasOf, chants: s.chants, steps: Math.min(s.step, level.steps.length), lost: Math.round(s.lost), knocks: s.hits + s.caught + s.wrong + s.missed, streak: s.streakBest, favours}
}

/** What RUSH hands back to LIFE. */
export function resultOf(level: Level, s: Sim, opts: {skipped?: boolean} = {}): MissionResult {
  if (opts.skipped) return {outcome: 'ok', clockLeft: Math.round(s.clock), evidence: [], assisted: s.assist, skipped: true}
  const outcome = s.ended ?? 'slip'
  const evidence: string[] = [outcome === 'slip' ? 'late' : 'made-it']
  if (outcome !== 'slip' && s.hits === 0 && s.caught === 0 && s.wrong === 0) evidence.push('clean')
  const own = level.verb === 'drive' ? 'drove' : level.verb === 'carry' ? 'carried' : level.verb === 'sneak' ? (level.home ? 'banner' : 'unseen') : level.verb === 'find' ? 'found' : level.escort && level.escort.who !== 'friend' ? 'led' : 'ran'
  if (outcome !== 'slip' && (own !== 'unseen' || s.caught === 0)) evidence.push(own)
  return {outcome, clockLeft: Math.round(s.clock), evidence: evidence.slice(0, MAX_EVIDENCE), assisted: s.assist, skipped: false, score: scoreOf(level, s)}
}

/* ───────────── the bot: plays a level well, to prove it can be played ───────────── */

/**
 * Plays with the level's own knowledge (it reads the timetable of every car and steward). Not an
 * opponent and not story mode — it is the test that every seed of every mission is winnable. It does
 * every step in order, takes no extras, and keeps to the pace of whoever walks with it.
 */
export function botInput(level: Level, s: Sim): Input {
  if (level.verb === 'carry' && !s.holding && s.dropped) return steer(s, s.dropped.x, s.dropped.z, false, level)
  if (level.place === 'road') return driveBot(level, s)
  const st = level.steps[s.step]
  const g = level.place === 'crowd' && st?.kind === 'goal' ? level.targets[0]! : stepTarget(level, s) ?? goalOf(level, s)
  const d = Math.hypot(g.x - s.x, g.z - s.z)
  if (st?.kind === 'talk' && d < st.r * 0.7) return {...IDLE, act: true}
  if (level.place === 'crowd') {
    if (st?.kind === 'goal' && d < 1.5) return {...IDLE, act: true}
    return steer(s, g.x, g.z + 0.2, d > 6, level)
  }
  // whoever walks with you sets the pace: never leave him behind
  let scale = 1, sprint = s.stamina > 0.45
  if (s.esc && level.escort) {
    const ed = Math.hypot(s.esc.x - s.x, s.esc.z - s.z)
    if (s.esc.lost) return steer(s, s.esc.x, s.esc.z, false, level)
    if (ed > level.escort.leash * 0.55) return IDLE
    scale = Math.min(1, level.escort.pace / PACE[level.verb][0] * 0.95); sprint = false
  }
  // close up: going through a place — keep still until it is done; at the place — start
  if (level.place === 'flat') {
    if (s.searchI >= 0) return IDLE
    const q = level.searches.findIndex((x, i) => !s.searched[i] && x.x === g.x && x.z === g.z)
    if (q >= 0 && d < 0.55) return {...IDLE, act: true}
  }
  let next = viaPoint(level, s, g)
  if (level.place === 'yard') return sneakBot(level, s, next)
  if (level.place === 'flat' && level.verb === 'sneak') return homeSneakBot(level, s, next)
  // at home: never sprint (a toy, the cat, Mum), and step round whoever is in the way
  if (level.place === 'flat') return steer(s, next.x, next.z, false, level)
  // the knot of people at the gate parts down the middle: line up with it before going in
  if (level.place === 'street' && st?.kind === 'goal' && Math.abs(s.x) > 1.3 && s.z < level.goal.z + 19 && next === g) next = {x: 0, z: level.goal.z + 18}
  else if (level.place === 'street' && st?.kind === 'goal' && Math.abs(s.x) > 1.3 && next === g) next = {x: 0, z: level.goal.z + 18}
  // street: wait at the kerb if a car will be on the crossing when you are
  const pace = PACE[level.verb][0] * scale
  for (const cz of level.crossings) {
    const ahead = s.z - (cz + 5)
    if (ahead > 0 && ahead < 3 && next.z < cz - 3.9) {
      // walk the crossing in the head first: where will he be, and where will each car be, every quarter second
      const v = Math.max(2.5, pace * 0.92), tCross = (s.z - (cz - 4.6)) / v
      let busy = false
      for (let dt = 0; dt <= tCross + 0.3 && !busy; dt += 0.25) {
        const z = s.z - v * Math.max(0, dt - 0.15)
        busy = level.cars.some(c => c.axis === 'x' && Math.abs(c.lane - z) < c.wid / 2 + 0.9 && Math.abs(carAt(c, s.t + dt).x - s.x) < c.len / 2 + 1.6)
      }
      if (busy) return IDLE
    }
  }
  const out = steer(s, next.x, next.z, sprint, level)
  return {...out, x: out.x * scale, z: out.z * scale}
}

/** head for a point, walking round anybody standing in the way */
function steer(s: Sim, x: number, z: number, sprint: boolean, level?: Level): Input {
  let dx = x - s.x, dz = z - s.z
  const d = Math.hypot(dx, dz) || 1
  dx /= d; dz /= d
  const inWay = level ? [...level.standers, ...(level.place === 'flat' ? level.patrols.map(p => patrolAt(p, s.t + 0.4)) : [])] : []
  for (const p of inWay) {
    const px = p.x - s.x, pz = p.z - s.z, along = px * dx + pz * dz
    if (along < 0 || along > 2.4 || along > d) continue
    const side = px * dz - pz * dx
    if (Math.abs(side) > 0.95) continue
    // step to the side the person is not on
    const k = (0.95 - Math.abs(side)) * 1.6
    const sx = side >= 0 ? -dz : dz, sz = side >= 0 ? dx : -dx
    dx += sx * k; dz += sz * k
  }
  const n = Math.hypot(dx, dz) || 1
  return {x: dx / n, z: dz / n, sprint, act: false}
}

function sneakBot(level: Level, s: Sim, g: {x: number; z: number}): Input {
  const want = steer(s, g.x, g.z, false, level)
  // look one second ahead along the way it wants to go: if any steward would see it there, hold still — or back off if seen now
  const seenAt = (x: number, z: number, t: number) => level.patrols.some((p, i) => {
    const at = patrolLook(level, {t, noise: s.noise}, i), dx = x - at.x, dz = z - at.z, d = Math.hypot(dx, dz)
    if (d > p.range * 1.15) return false
    let a = Math.atan2(dx, dz) - at.face; a = Math.atan2(Math.sin(a), Math.cos(a))
    return Math.abs(a) < p.fov / 2 + 0.25
  })
  for (const k of [0.4, 0.8, 1.2]) if (seenAt(s.x + want.x * 3.2 * k, s.z + want.z * 3.2 * k, s.t + k)) {
    if (seenAt(s.x, s.z, s.t + 0.4)) return {...IDLE, z: s.back ? -1 : 1}
    return IDLE
  }
  return want
}

/** at home at night: wait while a look would land where it is going; if one has landed, step back out of it */
function homeSneakBot(level: Level, s: Sim, g: {x: number; z: number}): Input {
  const want = steer(s, g.x, g.z, false, level)
  const sees = (x: number, z: number, t: number) => level.patrols.some((p, i) => {
    if (!p.range) return false
    const at = patrolLook(level, {t, noise: s.noise}, i), dx = x - at.x, dz = z - at.z, d = Math.hypot(dx, dz)
    if (d > p.range * 1.1) return false
    let a = Math.atan2(dx, dz) - at.face; a = Math.atan2(Math.sin(a), Math.cos(a))
    return Math.abs(a) < p.fov / 2 + 0.3 && flatSight(at, {x, z})
  })
  const v = PACE.sneak[0] * level.pace
  const ahead = (dx: number, dz: number) => [0.3, 0.7, 1.1, 1.5].some(k => sees(s.x + dx * v * k, s.z + dz * v * k, s.t + k))
  if (!ahead(want.x, want.z)) return want
  if (!sees(s.x, s.z, s.t + 0.3)) return IDLE
  // a look has landed on him: whichever way is out of it soonest — on, if on is clear sooner than back
  const out = (dx: number, dz: number) => { for (let k = 0.15; k <= 2; k += 0.15) if (!sees(s.x + dx * v * k, s.z + dz * v * k, s.t + k)) return k; return 9 }
  return out(want.x, want.z) <= out(-want.x, -want.z) ? want : {x: -want.x, z: -want.z, sprint: false, act: false}
}

function driveBot(level: Level, s: Sim): Input {
  const lanes = [-4.2, 0, 4.2]
  const check = level.checks.find(c => s.z < c.z0 + 55 && s.z > c.z1)
  /** the pedal for a speed (the stick is the pedal: −1 full, 0 off) — and the brake when over it */
  const hold = (v: number): number => s.speed > v + 0.4 ? 0.5 : -Math.min(1, v / 19 / 1.25)
  const capped = (z: number) => check && s.speed > check.max - 1.6 ? 0.5 : check ? Math.max(z, -0.45) : z
  const gap = (lane: number) => {
    let best = 999
    for (const c of level.cars) { if (c.lane !== lane) continue; const p = carAt(c, s.t); const d = s.z - p.z; if (d > -7 && d < best) best = d < 5 ? -100 : d }
    return best
  }
  /** nothing coming up behind in this lane for a while */
  const clearBehind = (lane: number) => level.cars.every(c => { if (c.lane !== lane) return true; const p = carAt(c, s.t); return p.z < s.z - 7 || p.z > s.z + 30 })
  const SLOW = 8
  const st = level.steps[s.step]
  // a mate waits in the lay-by: get into the slow lane at its pace, turn in, stop, wait for him to get in
  if (st?.kind === 'stop' && s.z > st.z - st.r + 3 && s.z - st.z < 220) {
    const near = s.z - st.z
    if (Math.abs(s.x - st.x) < 2.8) return {x: clamp((st.x - s.x) * 0.8, -1, 1), z: near < 5 ? 1 : -0.3, sprint: false, act: false}
    const inRight = Math.abs(s.x - 4.2) < 1
    if (inRight || near < st.r + 4) {
      const z = gap(4.2) < 9 ? 0.6 : hold(SLOW)
      return {x: clamp(((near < st.r + 6 ? st.x : 4.2) - s.x) * 0.7, -1, 1), z: capped(z), sprint: false, act: false}
    }
    if (clearBehind(4.2) && gap(4.2) > 14) return {x: clamp((4.2 - s.x) * 0.6, -1, 1), z: capped(hold(Math.max(SLOW, s.speed - 1))), sprint: false, act: false}
  }
  // still in the lay-by after he got in: roll along it, then back out at the slow lane's pace when it is clear
  if (s.x > 5.4) {
    const prev = level.steps.slice(0, s.step).reverse().find(x => x.kind === 'stop')
    const end = prev ? prev.z - 18 : s.z - 1
    if (s.z > end || !clearBehind(4.2) || gap(4.2) < 12) return {x: clamp((7.8 - s.x) * 0.8, -1, 1), z: s.z > end ? hold(SLOW) : 1, sprint: false, act: false}
    return {x: -1, z: capped(hold(SLOW)), sprint: false, act: false}
  }
  const cur = lanes.reduce((a, b) => Math.abs(b - s.x) < Math.abs(a - s.x) ? b : a)
  const pick = lanes.reduce((a, b) => gap(b) - Math.abs(b - s.x) * 2 > gap(a) - Math.abs(a - s.x) * 2 ? b : a, cur)
  const ahead = gap(cur)
  // too close to the car in front and nowhere to go: ease off until a lane opens
  const brake = ahead < 9 + s.speed * 0.4 && gap(pick) < 20
  return {x: clamp((pick - s.x) * 0.6, -1, 1), z: brake ? 1 : capped(-1), sprint: !check && ahead > 40, act: false}
}

/** the clues on screen right now (find) */
export const cluesNow = (level: Level, s: Sim) => cluesShown(level, s.t, s.asked)

export type {MissionSpec}
