/**
 * LIFE · the hood — a CHALLENGE as it runs in the street (pure; steps with the hood sim, never moves him).
 *
 * `layFinds` hides, once when the story level is built, the first thing of every FIND way in one of a few places near
 * where it lay (RUSH's own search: stand at a place and press talk, and the camera comes down to his hands). Everything
 * else happens while the mission is open (`tickChallenge`): the clock, the watcher's look, the knocks, the two promises,
 * and the talk a SPEND or a BARGAIN opens when he gets there. `outcomeOf` says, at the end, slip or clean and why.
 */
import {STEP, type Input} from '@/lib/life/rush/sim'
import {rng, type Level, type Search} from '@/lib/life/rush/level'
import type {HoodRun} from '../../run'
import type {TalkScript} from '../../talk'
import type {PersonId, PlaceId} from '../../types'
import type {StoryLevel} from '../play'
import type {Mission} from '../types'
import {assist, challengeFor, CHALLENGES, type Challenge, type Clock} from './table'

export type ChallengeRun = {
  key: string; c: Challenge; age: number
  /** sim-seconds since he said yes, and the clock (null: none) */
  t: number; limit: number | null
  late: boolean; warned: boolean; seen: boolean; knocks: number
  /** the promise: which person's step is which, and whether each was kept in time */
  promise: {step: number; who: PersonId; by: number; kept: boolean | null}[]
  /** a spend / bargain talk was opened (once), and what he chose */
  asked: boolean; answer: string | null
  found: boolean
}

/** where a SNEAK's watcher stands: on the near edge of the place, looking up the street toward him */
export function watcherOf(level: Level, at: PlaceId): {x: number; z: number} {
  const p = level.hood!.places.find(q => q.id === at)!
  return {x: p.x, z: p.z + Math.min(5, p.r * 0.5)}
}
/** the watcher's look, sweeping: where it points at time t (radians, 0 = toward +z, up the street) */
export const lookAt = (t: number): number => Math.sin(t * Math.PI / 3) * 1.1
export const WATCH = {range: 9, fov: 1.25, close: 2.4, fast: 4.2} as const

export function seenBy(level: Level, at: PlaceId, x: number, z: number, speed: number, t: number, look = 1): boolean {
  const w = watcherOf(level, at), dx = x - w.x, dz = z - w.z, d = Math.hypot(dx, dz)
  if (d < WATCH.close * look) return true
  if (d > WATCH.range * look || speed < WATCH.fast) return false
  let a = Math.atan2(dx, dz) - lookAt(t); a = Math.atan2(Math.sin(a), Math.cos(a))
  return Math.abs(a) < WATCH.fov / 2
}

/** once, when the story level is built: every FIND way's first collect hides in one of a few places (one true) */
export function layFinds(level: Level, plans: StoryLevel['plans'], picks: StoryLevel['picks'], seed: number): void {
  const r = rng(seed ^ 0x5eed)
  for (const [key, plan] of Object.entries(plans)) {
    if (CHALLENGES[key]?.kind !== 'find') continue
    const first = plan.steps.findIndex(s => s.kind === 'collect')
    if (first < 0) continue
    const step = plan.job.from + first, st = level.steps[step]!
    const mine = (picks[key] ?? []).filter(i => level.pickups[i]!.step === step)
    if (!mine.length) continue
    // three places a pace or three apart around where it lay, on the walkable street and clear of people
    const spots = [[0, 0], [3.2, 2.2], [-3.2, 2.6], [2.6, -3]].map(([dx, dz]) => ({x: st.x + dx!, z: st.z + dz!}))
      .filter(p => level.areas.some(a => p.x > a.x0 + 0.8 && p.x < a.x1 - 0.8 && p.z > a.z0 + 0.8 && p.z < a.z1 - 0.8))
      .filter(p => level.hood!.people.every(q => Math.hypot(q.x - p.x, q.z - p.z) > 3.2))
    if (spots.length < 2) continue
    const truth = Math.floor(r() * spots.length)
    const at = level.searches.length
    spots.forEach((p, i) => level.searches.push({x: p.x, z: p.z, kind: 'shoes', secs: 0.9, face: 0, for: step} satisfies Search))
    for (const i of mine) { level.pickups[i]!.inside = at + truth; level.pickups[i]!.x = spots[truth]!.x; level.pickups[i]!.z = spots[truth]!.z }
  }
}
/** the search places of a FIND way and the true one (for its clue) */
export function findSpots(level: Level, step: number): {i: number; truth: boolean}[] {
  const truthAt = new Set(level.pickups.filter(p => p.step === step && p.inside !== undefined).map(p => p.inside!))
  return level.searches.map((q, i) => ({q, i})).filter(x => x.q.for === step).map(x => ({i: x.i, truth: truthAt.has(x.i)}))
}

export function startChallenge(run: HoodRun, m: Mission, approach: string, age: number): ChallengeRun | null {
  const c = challengeFor(m, approach)
  if (!c) return null
  const a = assist(age), j = run.level.hood!.jobs[0]!
  const clock: Clock | undefined = c.kind === 'timed' ? c.clock : c.kind === 'promise' ? undefined : c.clock
  const promise = c.kind === 'promise' ? c.who.map((who, k) => {
    const p = run.level.hood!.people.find(q => q.id === who)!
    let step = -1
    for (let s = j.from; s < j.from + j.steps; s++) { const st = run.level.steps[s]!; if (st.kind === 'talk' && Math.hypot(st.x - p.x, st.z - p.z) < 0.01) { step = s; break } }
    return {step, who, by: c.seconds[k]! * a.time, kept: null as boolean | null}
  }).filter(p => p.step >= 0) : []
  // a find way starts fresh: the places are unsearched again (a job done twice is searched twice)
  // and a child has fewer of them to go through (the decoys beyond his help are already looked in)
  if (c.kind === 'find') for (let s = j.from; s < j.from + j.steps; s++) { let decoys = 0; for (const f of findSpots(run.level, s)) run.sim.searched[f.i] = !f.truth && ++decoys > a.decoys }
  return {key: `${m.id}/${approach}`, c, age, t: 0, limit: clock ? clock.seconds * a.time : null, late: false, warned: false, seen: false, knocks: 0, promise, asked: false, answer: null, found: false}
}

export type ChallengeNote = {k: 'warn' | 'late' | 'seen' | 'knock' | 'spilt' | 'found' | 'kept' | 'broke'; who?: PersonId}

/** one step of the street with the mission open: what the challenge noticed, and a talk to open when he got there */
export function tickChallenge(ch: ChallengeRun, run: HoodRun, events: readonly {k: string; i?: number; state?: string}[], prevStep: number): {notes: ChallengeNote[]; talk: TalkScript | null} {
  const notes: ChallengeNote[] = []
  ch.t += STEP
  const sim = run.sim, level = run.level
  if (ch.limit !== null && !ch.late) {
    if (!ch.warned && ch.limit - ch.t < 20) { ch.warned = true; notes.push({k: 'warn'}) }
    if (ch.t >= ch.limit) { ch.late = true; notes.push({k: 'late'}) }
  }
  const c = ch.c, a = assist(ch.age)
  if (c.kind === 'sneak' && !ch.seen && seenBy(level, c.at, sim.x, sim.z, Math.hypot(sim.vx, sim.vz), sim.t, a.look)) { ch.seen = true; notes.push({k: 'seen'}) }
  if (c.kind === 'carry') for (const e of events) if (e.k === 'hit') { ch.knocks++; notes.push({k: ch.knocks >= c.knocks ? 'spilt' : 'knock'}) }
  if (c.kind === 'find') for (const e of events) if (e.k === 'pickup' && !ch.found) { ch.found = true; notes.push({k: 'found'}) }
  if (c.kind === 'promise') for (const p of ch.promise) if (p.kept === null && prevStep <= p.step && sim.step > p.step) { p.kept = ch.t <= p.by; notes.push({k: p.kept ? 'kept' : 'broke', who: p.who}) }
  let talk: TalkScript | null = null
  if ((c.kind === 'spend' || c.kind === 'bargain') && !ch.asked) {
    const place = level.hood!.places.find(q => q.id === c.at)!
    if (Math.hypot(place.x - sim.x, place.z - sim.z) < Math.min(place.r, 6)) { ch.asked = true; talk = c.kind === 'spend' ? spendTalk(ch) : bargainTalk(ch) }
  }
  return {notes, talk}
}

/** the SPEND talk: what the coins in his pocket go on. Prices print in the era's money (`{p0}`, `{p1}` fill at print time). */
export function spendTalk(ch: ChallengeRun): TalkScript {
  const c = ch.c as Extract<Challenge, {kind: 'spend'}>, k = `feel.spend.${ch.key.replace('/', '.')}`
  return {who: 'kiosk', start: 's', nodes: {s: {id: 's', who: 'kiosk', line: `${k}.line`, mood: 'warm', choices: c.offers.map(o => ({key: `${k}.${o.id}`, to: null, effect: `story:feel:spend:${o.id}` as const}))}}}
}
/**
 * The BARGAIN talk: the price, then his offer. Too low and the keeper laughs and asks again; a fair offer is taken and he
 * keeps the difference; paying the price keeps the keeper sweet. Always leavable, always ending.
 */
export function bargainTalk(ch: ChallengeRun): TalkScript {
  const who: PersonId = 'kiosk'
  return {who, start: 'p', nodes: {
    p: {id: 'p', who, line: 'feel.bargain.price', mood: 'neutral', choices: [{key: 'feel.bargain.cheek', to: 'no'}, {key: 'feel.bargain.fair', to: 'ok', effect: 'story:feel:bargain:fair'}, {key: 'feel.bargain.pay', to: 'thanks', effect: 'story:feel:bargain:pay'}]},
    no: {id: 'no', who, line: 'feel.bargain.no', mood: 'laugh', choices: [{key: 'feel.bargain.fair', to: 'ok', effect: 'story:feel:bargain:fair'}, {key: 'feel.bargain.pay', to: 'thanks', effect: 'story:feel:bargain:pay'}]},
    ok: {id: 'ok', who, line: 'feel.bargain.ok', mood: 'smile', next: null},
    thanks: {id: 'thanks', who, line: 'feel.bargain.thanks', mood: 'warm', next: null},
  }}
}

/** how it ended: a slip (and why) or clean */
export function outcomeOf(ch: ChallengeRun): {slip: boolean; why: ChallengeNote['k'] | null} {
  if (ch.late) return {slip: true, why: 'late'}
  if (ch.seen) return {slip: true, why: 'seen'}
  if (ch.c.kind === 'carry' && ch.knocks >= ch.c.knocks) return {slip: true, why: 'spilt'}
  if (ch.promise.some(p => p.kept === false)) return {slip: true, why: 'broke'}
  return {slip: false, why: null}
}

/**
 * The TEST's player, never the game's: what a careful player does with a challenge in front of him — he walks (no sprint)
 * inside a watcher's reach and while he carries, and presses talk at a place he means to search. The game never presses
 * anything for him; this only stands in for his thumb in the bots and the playthrough harness.
 */
export function carefulInput(ch: ChallengeRun | null, run: HoodRun, input: Input): Input {
  if (!ch) return input
  const sim = run.sim, c = ch.c
  if (c.kind === 'carry') return {...input, sprint: false}
  if (c.kind === 'sneak') { const w = watcherOf(run.level, c.at); if (Math.hypot(w.x - sim.x, w.z - sim.z) < WATCH.range + 4) return {...input, sprint: false} }
  // a knot singing a few strides off his way on a clock: he steps into it and stays till the song carries him
  if (ch.limit !== null) {
    const k = run.level.rings.findIndex((g, i) => !sim.ringDone[i] && Math.hypot(g.x - sim.x, g.z - sim.z) < 12)
    if (k >= 0) { const g = run.level.rings[k]!, d = Math.hypot(g.x - sim.x, g.z - sim.z); return d < g.r * 0.6 ? {x: 0, z: 0, sprint: false, act: false} : {x: (g.x - sim.x) / d, z: (g.z - sim.z) / d, sprint: input.sprint, act: false} }
  }
  return searchInput(run, input)
}
/** the test's thumb at a FIND: standing at a place to search, he presses talk and keeps still until it is gone through */
export function searchInput(run: HoodRun, input: Input): Input {
  const sim = run.sim
  if (sim.searchI >= 0) return {x: 0, z: 0, sprint: false, act: false}
  const i = run.level.searches.findIndex((q, k) => q.for === sim.step && !sim.searched[k] && Math.hypot(q.x - sim.x, q.z - sim.z) < 1.0)
  return i >= 0 ? {x: 0, z: 0, sprint: false, act: true} : input
}
