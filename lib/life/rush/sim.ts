/**
 * LIFE · RUSH — the simulation. One fixed step, one input, no screen.
 *
 * The renderer draws what this file says; the bot test plays it at a thousand steps a second.
 * Nobody here is ever hurt (ADR-fanlife-0013): a car is a stumble and lost seconds, a steward is
 * "back to the start of the yard", a thrown object knocks the roll out of your arms. The clock is
 * the pressure, and in story mode the clock stops at zero instead of ending the mission.
 */
import {carAt, cluesShown, patrolAt, walkerAt, type Level} from './level'
import {MAX_EVIDENCE, type MissionOutcome, type MissionResult, type MissionSpec} from './spec'

export const STEP = 1 / 60

export type Input = {x: number; z: number; sprint: boolean; act: boolean}
export const IDLE: Input = {x: 0, z: 0, sprint: false, act: false}

export type SimEvent =
  | {k: 'hit'; by: 'car' | 'throw' | 'police' | 'shove'}
  | {k: 'caught'}
  | {k: 'wrong'}
  | {k: 'found'}
  | {k: 'grab'}
  | {k: 'drop'}
  | {k: 'voice'; key: string}
  | {k: 'throw'; x: number; z: number; land: number}
  | {k: 'end'; outcome: MissionOutcome}

export type Throw = {x0: number; z0: number; x: number; z: number; t0: number; t1: number}

export type Sim = {
  t: number
  /** game seconds left on the clock the player sees */
  clock: number
  x: number; z: number; vx: number; vz: number; heading: number
  speed: number
  stamina: number
  stagger: number
  sprinting: boolean
  /** carry: whether the roll is in his arms; steal: whether he has their banner */
  holding: boolean
  /** carry: where the roll fell */
  dropped: {x: number; z: number} | null
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
}

export function startSim(level: Level, assist = false): Sim {
  return {
    t: 0, clock: level.realSeconds * level.timeScale, x: level.start.x, z: level.start.z, vx: 0, vz: 0, heading: Math.PI, speed: 0,
    stamina: 1, stagger: 0, sprinting: false, holding: level.verb === 'carry', dropped: null, seen: 0, seenBy: -1, grace: 0, back: false,
    checkpoint: {...level.start}, hits: 0, caught: 0, wrong: 0, throws: [], said: [], ended: null, assist, events: [],
  }
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

/** top speeds by verb, metres a second: walking pace · sprint · when the legs have gone */
const PACE: Record<Level['verb'], [number, number, number]> = {
  run: [6.2, 9.4, 4.6], carry: [4.6, 6.4, 3.4], sneak: [3.2, 6, 2.6], find: [4.5, 7, 3.6], drive: [19, 26, 19],
}
/** a penalty in GAME seconds: what each knock costs on the clock */
const COST = {car: 9, throw: 8, police: 24, shove: 5, caught: 24, wrong: 12} as const

function knock(s: Sim, level: Level, by: 'car' | 'throw' | 'police' | 'shove', away: {x: number; z: number}) {
  s.stagger = by === 'police' ? 2.4 : by === 'shove' ? 0.5 : 0.9
  s.hits++
  if (!s.assist) s.clock -= COST[by]
  const d = Math.hypot(s.x - away.x, s.z - away.z) || 1
  s.vx = (s.x - away.x) / d * 6; s.vz = (s.z - away.z) / d * 6
  if (level.verb === 'carry' && s.holding && by !== 'shove') { s.holding = false; s.dropped = {x: s.x, z: s.z}; s.events.push({k: 'drop'}) }
  s.events.push({k: 'hit', by})
}

function goalOf(level: Level, s: Sim): {x: number; z: number; r: number} {
  return s.back && level.home ? level.home : level.goal
}

/** One step of the mission. Mutates and returns `s`; `s.events` holds what happened in this step only. */
export function stepSim(level: Level, s: Sim, input: Input, dt = STEP): Sim {
  s.events = []
  if (s.ended) return s
  s.t += dt
  const [walk, sprint, tired] = PACE[level.verb]
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
    const accel = want > s.speed ? 7 : iz > 0.2 ? 12 : 3
    s.speed += clamp(want - s.speed, -accel * dt, accel * dt)
    s.vz = -s.speed
    s.vx += (ix * 7 - s.vx) * Math.min(dt * 4, 1)
    s.heading = Math.PI + Math.atan2(s.vx, s.speed + 0.01) * 0.6
  } else {
    s.sprinting = input.sprint && s.stamina > 0.05 && moving && s.stagger <= 0
    const drain = level.verb === 'carry' && s.holding ? 0.42 : 0.3
    s.stamina = clamp(s.stamina + (s.sprinting ? -drain : 0.16) * dt, 0, 1)
    const top = (s.sprinting ? sprint : s.stamina < 0.25 ? tired : walk) * (s.stagger > 0 ? 0.35 : 1)
    s.vx += (ix * top - s.vx) * Math.min(dt * 7, 1)
    s.vz += (iz * top - s.vz) * Math.min(dt * 7, 1)
    s.speed = Math.hypot(s.vx, s.vz)
    if (s.speed > 0.4) { const want = Math.atan2(s.vx, s.vz); let d = want - s.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); s.heading += d * Math.min(dt * 10, 1) }
  }
  s.stagger = Math.max(0, s.stagger - dt)
  s.x = clamp(s.x + s.vx * dt, level.bounds.x0, level.bounds.x1)
  s.z = clamp(s.z + s.vz * dt, level.bounds.z0, level.bounds.z1)

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
        if (!s.assist) s.clock -= COST.car
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
    if (d2 < 0.5) { const d = Math.sqrt(d2) || 0.01; s.x += dx / d * 0.05; s.z += dz / d * 0.05; s.vx *= 0.9; s.vz *= 0.9 }
  }
  // standing people are solid; the other lot shove
  for (const p of level.standers) {
    const dx = s.x - p.x, dz = s.z - p.z, d2 = dx * dx + dz * dz
    if (d2 < 0.36) {
      const d = Math.sqrt(d2) || 0.01
      s.x = p.x + dx / d * 0.6; s.z = p.z + dz / d * 0.6
      if (p.role === 'rival' && s.stagger <= 0 && (level.verb === 'carry' || level.verb === 'sneak')) knock(s, level, 'shove', p)
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

  // carry: the roll is picked up again by walking over it
  if (level.verb === 'carry' && !s.holding && s.dropped && Math.hypot(s.dropped.x - s.x, s.dropped.z - s.z) < 1.3) { s.holding = true; s.dropped = null; s.events.push({k: 'grab'}) }

  // sneak: the stewards see what is in front of them, nearer and faster is seen sooner
  if (level.place === 'yard') {
    let worst = 0, by = -1
    level.patrols.forEach((p, i) => {
      const at = patrolAt(p, s.t), dx = s.x - at.x, dz = s.z - at.z, d = Math.hypot(dx, dz)
      const range = p.range * (s.assist ? 0.55 : 1) * (s.sprinting ? 1.35 : 1)
      if (d > range) return
      let a = Math.atan2(dx, dz) - at.face; a = Math.atan2(Math.sin(a), Math.cos(a))
      if (Math.abs(a) > p.fov / 2) return
      const look = (1 - d / range) * 2.2 + 0.9
      if (look > worst) { worst = look; by = i }
    })
    s.seenBy = by
    s.grace = Math.max(0, s.grace - dt)
    s.seen = clamp(s.seen + (worst > 0 && s.grace <= 0 ? worst * dt * 1.6 : -dt * 0.8), 0, 1)
    if (s.seen >= 1) {
      s.caught++; s.seen = 0; s.grace = 2.5
      if (!s.assist) s.clock -= COST.caught
      s.x = s.checkpoint.x; s.z = s.checkpoint.z; s.vx = s.vz = 0
      s.events.push({k: 'caught'})
    }
    // every patrol line passed unseen is a new place to be sent back to
    for (const p of level.patrols) {
      const line = p.pts[0]![1]
      const passed = s.back ? s.z > line + 2 : s.z < line - 2
      if (passed && (s.back ? s.checkpoint.z < line + 2 : s.checkpoint.z > line - 2)) s.checkpoint = {x: s.x, z: s.back ? line + 2.5 : line - 2.5}
    }
  }

  // find: press next to the one you came for
  if (level.place === 'crowd' && input.act) {
    const tg = level.targets[0]!
    if (Math.hypot(tg.x - s.x, tg.z - s.z) < 1.8) { s.events.push({k: 'found'}); return end(s, 'good') }
    const near = level.standers.some(p => Math.hypot(p.x - s.x, p.z - s.z) < 1.6)
    if (near) { s.wrong++; if (!s.assist) s.clock -= COST.wrong; s.events.push({k: 'wrong'}) }
  }

  // the inner voice: once each, as the goal comes closer
  const g = goalOf(level, s), dist = Math.hypot(g.x - s.x, g.z - s.z)
  for (const v of level.voice) if (dist < v.at && !s.said.includes(v.key)) { s.said.push(v.key); s.events.push({k: 'voice', key: v.key}) }

  // the goal
  if (level.place !== 'crowd' && (level.place === 'road' ? s.z <= g.z : Math.hypot(g.x - s.x, g.z - s.z) < g.r)) {
    if (level.home && !s.back) { s.back = true; s.holding = true; s.events.push({k: 'grab'}); s.checkpoint = {x: s.x, z: s.z} }
    else if (level.verb !== 'carry' || s.holding) return end(s, 'good')
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

/** What RUSH hands back to LIFE. */
export function resultOf(level: Level, s: Sim, opts: {skipped?: boolean} = {}): MissionResult {
  if (opts.skipped) return {outcome: 'ok', clockLeft: Math.round(s.clock), evidence: [], assisted: s.assist, skipped: true}
  const outcome = s.ended ?? 'slip'
  const evidence: string[] = [outcome === 'slip' ? 'late' : 'made-it']
  if (outcome !== 'slip' && s.hits === 0 && s.caught === 0 && s.wrong === 0) evidence.push('clean')
  const own = level.verb === 'drive' ? 'drove' : level.verb === 'carry' ? 'carried' : level.verb === 'sneak' ? (level.home ? 'banner' : 'unseen') : level.verb === 'find' ? 'found' : 'ran'
  if (outcome !== 'slip' && (own !== 'unseen' || s.caught === 0)) evidence.push(own)
  return {outcome, clockLeft: Math.round(s.clock), evidence: evidence.slice(0, MAX_EVIDENCE), assisted: s.assist, skipped: false}
}

/* ───────────── the bot: plays a level well, to prove it can be played ───────────── */

/**
 * Plays with the level's own knowledge (it reads the timetable of every car and steward). Not an
 * opponent and not story mode — it is the test that every seed of every mission is winnable.
 */
export function botInput(level: Level, s: Sim): Input {
  const g = level.place === 'crowd' ? level.targets[0]! : goalOf(level, s)
  if (level.verb === 'carry' && !s.holding && s.dropped) return steer(s, s.dropped.x, s.dropped.z, false, level)
  if (level.place === 'road') return driveBot(level, s)
  if (level.place === 'crowd') {
    const d = Math.hypot(g.x - s.x, g.z - s.z)
    return d < 1.5 ? {...IDLE, act: true} : steer(s, g.x, g.z + 0.2, d > 6, level)
  }
  if (level.place === 'yard') return sneakBot(level, s, g)
  // street: wait at the kerb if a car will be on the crossing when you are
  for (const cz of level.crossings) {
    const ahead = s.z - (cz + 5)
    if (ahead > 0 && ahead < 3) {
      const tCross = 12 / 6
      const busy = level.cars.some(c => c.lane > cz - 4 && c.lane < cz + 4 && [0, 0.5, 1, 1.5, 2, tCross + 0.4].some(dt => Math.abs(carAt(c, s.t + dt).x - s.x) < 5.5))
      if (busy) return IDLE
    }
  }
  return steer(s, g.x, g.z, s.stamina > 0.45, level)
}

/** head for a point, walking round anybody standing in the way */
function steer(s: Sim, x: number, z: number, sprint: boolean, level?: Level): Input {
  let dx = x - s.x, dz = z - s.z
  const d = Math.hypot(dx, dz) || 1
  dx /= d; dz /= d
  if (level) for (const p of level.standers) {
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
  const seenAt = (x: number, z: number, t: number) => level.patrols.some(p => {
    const at = patrolAt(p, t), dx = x - at.x, dz = z - at.z, d = Math.hypot(dx, dz)
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

function driveBot(level: Level, s: Sim): Input {
  const lanes = [-4.2, 0, 4.2]
  const inCheck = level.checks.some(c => s.z < c.z0 + 30 && s.z > c.z1)
  const gap = (lane: number) => {
    let best = 999
    for (const c of level.cars) { if (c.lane !== lane) continue; const p = carAt(c, s.t); const d = s.z - p.z; if (d > -7 && d < best) best = d < 5 ? -100 : d }
    return best
  }
  const cur = lanes.reduce((a, b) => Math.abs(b - s.x) < Math.abs(a - s.x) ? b : a)
  const pick = lanes.reduce((a, b) => gap(b) - Math.abs(b - s.x) * 2 > gap(a) - Math.abs(a - s.x) * 2 ? b : a, cur)
  const ahead = gap(cur)
  // too close to the car in front and nowhere to go: ease off until a lane opens
  const brake = ahead < 9 + s.speed * 0.4 && gap(pick) < 20
  return {x: clamp((pick - s.x) * 0.6, -1, 1), z: brake ? 1 : inCheck ? -0.45 : -1, sprint: !inCheck && ahead > 40, act: false}
}

/** the clues on screen right now (find) */
export const cluesNow = (level: Level, s: Sim) => cluesShown(level, s.t)

export type {MissionSpec}
