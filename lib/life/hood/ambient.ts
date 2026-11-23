/**
 * LIFE · the hood — a neighbourhood that notices you (pure).
 *
 * The street's small lives: a neighbour on a balcony, the kiosk owner lifting a hand, kids kicking a ball off a wall,
 * two old men at a board, a cat, friends meeting at the corner, supporters walking to the ground in twos and threes, a child
 * on somebody's shoulders, a mother with a child by the hand. Each is a SPOT: where it is (a function of time when it
 * walks), how near counts as noticing, and the short lines it may say (keys into `words.ts`: warm, club-agnostic, no fact).
 * Nothing here is done for the player: people greet him because he came near; the ball comes to his feet and goes back only
 * when he presses TALK/USE beside it (or, left alone, rolls home). Deterministic: no clock but its own, no random.
 */
import type {Level} from '@/lib/life/rush/level'

export type AmbKind = 'balcony' | 'kiosk' | 'cat' | 'table' | 'kids' | 'hug' | 'pair' | 'shoulders' | 'mother' | 'trio'
export type AmbSpot = {
  id: string; kind: AmbKind; x: number; z: number; /** the way it faces (yaw), standing */ face: number; /** head height of whoever speaks, for the caption */ y: number
  /** metres a second toward the ground (0 stands), wrapping inside `span` */ v: number; span: readonly [number, number]
  r: number; lines: readonly string[]; /** seconds before it speaks again */ every: number
}
export type AmbCaption = {id: number; spot: string; key: string; t0: number; until: number}
export type Ball = {x: number; z: number; state: 'play' | 'pass' | 'yours' | 'back'; homeX: number; wallX: number; z0: number; fx: number; fz: number; tx: number; tz: number; p: number; dur: number; t0: number; last: number; kicks: number}
export type AmbState = {spots: AmbSpot[]; t: number; noticed: Record<string, number>; said: Record<string, number>; count: Record<string, number>; captions: AmbCaption[]; n: number; ball: Ball | null; /** when the player last kicked the ball back */ kickAt: number}
export type AmbEvent = {k: 'caption'; spot: string; key: string} | {k: 'kick'} | {k: 'notice'; spot: string}

const CAPTION_S = 3.6
const wrap = (z: number, a: number, b: number) => { const n = b - a; return a + ((((z - a) % n) + n) % n) }

/** where a spot is now (the ones that walk go down the street and come round again) */
export function spotAt(s: AmbSpot, t: number): {x: number; z: number} {
  return s.v ? {x: s.x, z: wrap(s.z - s.v * t, s.span[0], s.span[1])} : {x: s.x, z: s.z}
}

export function hoodAmbient(level: Level, lite = false): AmbState {
  const hood = level.hood
  if (!hood) throw new Error('not a hood level')
  const W = level.walk, gate = level.goal.z, c2 = level.crossings[1] ?? -134
  const span = [gate + 22, 12] as const, still = [0, 0] as const
  const kiosk = hood.people.find(p => p.id === 'kiosk')
  const stand = (id: string, kind: AmbKind, x: number, z: number, face: number, y: number, r: number, lines: string[], every = 38): AmbSpot => ({id, kind, x, z, face, y, v: 0, span: still, r, lines, every})
  const walk = (id: string, kind: AmbKind, x: number, z: number, v: number, lines: string[]): AmbSpot => ({id, kind, x, z, face: Math.PI, y: 1.95, v, span, r: 5.5, lines, every: 26})
  const spots: AmbSpot[] = [
    stand('balcony', 'balcony', W - 0.55, -12, -Math.PI / 2, 5.2, 13, ['hood.amb.balcony.1', 'hood.amb.balcony.2']),
    stand('cat', 'cat', -(W - 0.75), -18, Math.PI / 2, 1.5, 5, []),
    stand('table', 'table', W - 1.5, -26, -Math.PI / 2, 1.75, 6.5, ['hood.amb.table.1', 'hood.amb.table.2', 'hood.amb.table.3'], 24),
    stand('kids', 'kids', -(W - 2.6), -34, -Math.PI / 2, 1.7, 7, ['hood.amb.kids.play'], 60),
    walk('pair', 'pair', W - 2.6, -4, 1.05, ['hood.amb.pair.1', 'hood.amb.pair.2']),
    walk('shoulders', 'shoulders', -(W - 2.5), -84, 0.95, ['hood.amb.shoulders.1', 'hood.amb.shoulders.2']),
    walk('mother', 'mother', W - 2.4, -124, 0.85, ['hood.amb.mother.1', 'hood.amb.mother.2']),
  ]
  if (kiosk) spots.push(stand('kiosk', 'kiosk', kiosk.x, kiosk.z, Math.PI / 2, 2.0, 9, ['hood.amb.kiosk.1', 'hood.amb.kiosk.2'], 45))
  if (!lite) { spots.push(stand('hug', 'hug', -(W - 1.8), c2 - 11, 0, 1.95, 13, ['hood.amb.hug.1', 'hood.amb.hug.2'])); spots.push(walk('trio', 'trio', -(W - 2.3), -176, 1.1, ['hood.amb.trio.1', 'hood.amb.trio.2'])) }
  const k = spots.find(s => s.kind === 'kids')!
  const ball: Ball = {x: k.x - 0.4, z: k.z, state: 'play', homeX: k.x - 0.4, wallX: -(W - 0.42), z0: k.z, fx: 0, fz: 0, tx: 0, tz: 0, p: 0, dur: 1, t0: 0, last: -6, kicks: 0}
  return {spots, t: 0, noticed: {}, said: {}, count: {}, captions: [], n: 0, ball, kickAt: -9}
}

function say(a: AmbState, spot: string, key: string, out: AmbEvent[]): void {
  a.captions = a.captions.filter(c => c.spot !== spot)
  a.captions.push({id: ++a.n, spot, key, t0: a.t, until: a.t + CAPTION_S}); a.said[spot] = a.t
  out.push({k: 'caption', spot, key})
}

/** is the ball at his feet, waiting to be kicked back? */
export const ballYours = (a: AmbState, me: {x: number; z: number}): boolean => !!a.ball && a.ball.state === 'yours' && Math.hypot(a.ball.x - me.x, a.ball.z - me.z) < 1.9

const PERIOD = 1.5
export function stepAmbient(a: AmbState, me: {x: number; z: number}, act: boolean, dt: number): AmbEvent[] {
  a.t += dt
  const out: AmbEvent[] = []
  if (a.captions.length && a.captions.some(c => c.until <= a.t)) a.captions = a.captions.filter(c => c.until > a.t)
  for (const s of a.spots) {
    const p = spotAt(s, a.t), d = Math.hypot(p.x - me.x, p.z - me.z)
    if (d < s.r) {
      if (a.noticed[s.id] === undefined) { a.noticed[s.id] = a.t; out.push({k: 'notice', spot: s.id}) }
      if (s.lines.length && a.t - (a.said[s.id] ?? -999) > s.every && a.captions.length < 2 && a.t - a.noticed[s.id]! > 0.7) { const n = a.count[s.id] ?? 0; a.count[s.id] = n + 1; say(a, s.id, s.lines[n % s.lines.length]!, out) }
    } else if (d > s.r * 2.4 && a.noticed[s.id] !== undefined && a.t - a.noticed[s.id]! > 20) delete a.noticed[s.id]
  }
  const b = a.ball
  if (b) {
    const dk = Math.hypot(b.homeX - me.x, b.z0 - me.z)
    if (b.state === 'play') {
      const u = (((a.t - b.t0) % PERIOD) + PERIOD) % PERIOD / PERIOD, tri = u < 0.5 ? u * 2 : 2 - u * 2
      b.x = b.homeX + (b.wallX - b.homeX) * tri; b.z = b.z0
      if (dk < 6.5 && dk > 1.6 && a.t - b.last > 14 && u < 0.08) {
        const dx = me.x - b.x, dz = me.z - b.z, d = Math.hypot(dx, dz) || 1
        b.state = 'pass'; b.fx = b.x; b.fz = b.z; b.tx = me.x - dx / d * 0.9; b.tz = me.z - dz / d * 0.9; b.p = 0; b.dur = Math.max(0.5, d / 5)
        say(a, 'kids', 'hood.amb.kids.pass', out)
      }
    } else if (b.state === 'pass' || b.state === 'back') {
      b.p = Math.min(1, b.p + dt / b.dur)
      const e = 1 - (1 - b.p) * (1 - b.p)
      b.x = b.fx + (b.tx - b.fx) * e; b.z = b.fz + (b.tz - b.fz) * e
      if (b.p >= 1) { if (b.state === 'pass') { b.state = 'yours'; b.t0 = a.t } else { b.state = 'play'; b.t0 = a.t; b.last = a.t } }
    } else {
      const d = Math.hypot(b.x - me.x, b.z - me.z)
      const home = (dur: number) => { b.state = 'back'; b.fx = b.x; b.fz = b.z; b.tx = b.homeX; b.tz = b.z0; b.p = 0; b.dur = dur }
      if (act && d < 1.9) { home(Math.max(0.45, Math.hypot(b.x - b.homeX, b.z - b.z0) / 7)); b.kicks++; a.kickAt = a.t; out.push({k: 'kick'}); say(a, 'kids', 'hood.amb.kids.nice', out) }
      else if (a.t - b.t0 > 9 || d > 10) { home(Math.max(1, Math.hypot(b.x - b.homeX, b.z - b.z0) / 2.4)); say(a, 'kids', 'hood.amb.kids.again', out) }
    }
  }
  return out
}

/** every words key the street may say (for the test that none is missing) */
export const ambientKeys = (a: AmbState): string[] => [...a.spots.flatMap(s => s.lines), 'hood.amb.kids.pass', 'hood.amb.kids.nice', 'hood.amb.kids.again']
