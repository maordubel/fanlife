/**
 * LIFE, universal — the player who tries everything.
 *
 * Walks a chapter the way the shell does, with the same functions, through EVERY order of rooms,
 * people and answers, and reports two things: whether the day can end, and whether there is any
 * state from which it no longer can. The second is the one that matters: "you cannot get stuck"
 * is a property of the whole graph, not of the path the author had in mind.
 */
import {afterPlay, apply, eventsOf, fold, openChapter, type Directive} from './engine'
import type {Chapter, Cond, Effect, LifeEvent, LifePack, LifeState} from './types'
import {beatFlag, beatFor, branchOf, choicesOf, sceneOf, talkOf, throughDoor} from './world'

export type SimResult = {chapter: string; states: number; endings: string[]; stuck: string[]; truncated: boolean}

/**
 * Every threshold a chapter reads off a gauge or a bond ("coins ≥ 8", "heart ≥ 15", "bond with mum ≥ 50").
 * The simulator tells two states apart by which side of each threshold the gauges are on, not by their exact
 * value: the exact value only ever matters through a comparison, and a hatch, four jobs and a bench would otherwise
 * make the same afternoon a million different ones.
 */
type Cuts = {coins: number[]; heart: number[]; energy: number[]; standing: number[]; bond: Map<string, number[]>; flags: Set<string>; has: Set<string>}
/** The side of a day (jobs, benches, the hatch) is done once and read by nothing but itself: it makes no state of its own. */
const SIDE_FLAG = /^(job|rest|shop):/
function cutsOf(chapter: Chapter): Cuts {
  const cuts: Cuts = {coins: [], heart: [], energy: [], standing: [], bond: new Map(), flags: new Set(), has: new Set()}
  const walk = (c: Cond | undefined) => {
    if (!c) return
    if ('flag' in c) cuts.flags.add(c.flag)
    else if ('not' in c) cuts.flags.add(c.not)
    else if ('is' in c) cuts.flags.add(c.is[0])
    else if ('has' in c) cuts.has.add(c.has)
    else if ('min' in c) cuts[c.min[0]].push(c.min[1])
    else if ('bond' in c) cuts.bond.set(c.bond[0], [...(cuts.bond.get(c.bond[0]) ?? []), c.bond[1]])
    else if ('all' in c) c.all.forEach(walk)
    else if ('any' in c) c.any.forEach(walk)
    else if ('none' in c) c.none.forEach(walk)
  }
  chapter.cast.forEach(p => walk(p.when)); chapter.spots.forEach(x => walk(x.when)); chapter.doors.forEach(d => { walk(d.when); walk(d.needs) })
  chapter.beats.forEach(b => walk(b.when)); chapter.objectives.forEach(o => walk(o.done))
  chapter.talks.forEach(t => t.branches.forEach(b => { walk(b.when); b.choices?.forEach(c => walk(c.when)) }))
  return cuts
}
const rank = (cuts: readonly number[], v: number) => cuts.reduce((n, c) => n + (v >= c ? 1 : 0), 0)
const keyOf = (cuts: Cuts) => (s: LifeState) => JSON.stringify([s.room, s.spawn, s.time, Object.entries(s.flags).filter(([k]) => !SIDE_FLAG.test(k)).sort(([a], [b]) => a < b ? -1 : 1), rank(cuts.coins, s.coins), rank(cuts.energy, s.energy), rank(cuts.standing, s.standing), s.wear, s.keeps.filter(k => !k.startsWith('shop-') || cuts.has.has(k)).sort(), rank(cuts.heart, s.heart), [...cuts.bond].sort(([a], [b]) => a < b ? -1 : 1).map(([who, at]) => [who, rank(at, s.bonds[who] ?? 50)])])

/** `left`: the player closed the box before the conversation had finished (what was already applied stays applied). */
type Outcome = {state: LifeState; ended: string | null; left?: boolean}

/** Every way one conversation can go from this state. */
function outcomes(chapter: Chapter, state: LifeState, talkId: string, depth = 0): Outcome[] {
  const talk = talkOf(chapter, talkId), branch = talk && branchOf(talk, state)
  if (!talk || !branch || depth > 12) return [{state, ended: null}]
  const after = (effects: readonly Effect[] | undefined, next: string | undefined, from: LifeState): Outcome[] => {
    const {events, directives} = eventsOf(effects, from)
    return run(chapter, events.reduce(apply, from), directives, next, depth)
  }
  const choices = choicesOf(branch, state)
  if (!choices.length) return after(branch.then, branch.next, state)
  return choices.flatMap(c => after(c.then, c.next ?? branch.next, state))
}

function run(chapter: Chapter, state: LifeState, directives: Directive[], next: string | undefined, depth: number): Outcome[] {
  let states: LifeState[] = [state]
  for (const d of directives) {
    if (d.d === 'end') return states.map(s => ({state: s, ended: d.ending}))
    if (d.d === 'goto') states = states.map(s => apply(s, {t: 'moved', room: d.room, spawn: d.spawn, time: d.time ?? s.time}))
    if (d.d === 'play') {
      // a mini-game never fails the day: it ends one of two ways, and the player who tries everything takes both
      const after: LifeState[] = []
      for (const s of states) {
        for (const result of ['good', 'slip'] as const) {
          const r = eventsOf(afterPlay(d, result), s)
          const inner = run(chapter, r.events.reduce(apply, s), r.directives, undefined, depth + 1)
          const ended = inner.find(o => o.ended)
          if (ended) return [ended]
          after.push(...inner.map(o => o.state))
        }
      }
      states = after
    }
  }
  // what was going to be said next is said once the screen has done its part — unless he closes the
  // box right there: leaving is always allowed, so every link of a chain is also a place to stop
  return next ? states.flatMap(s => [...outcomes(chapter, s, next, depth + 1), {state: s, ended: null, left: true}]) : states.map(s => ({state: s, ended: null}))
}

/** Entering a room plays the beat that waits there, and the beat after it. */
function settle(chapter: Chapter, state: LifeState, depth = 0): Outcome[] {
  if (!state.room || depth > 12) return [{state, ended: null}]
  const beat = beatFor(chapter, state, state.room)
  if (!beat) return [{state, ended: null}]
  return outcomes(chapter, state, beat.talk, depth + 1).flatMap(o => {
    // a beat counts as played only when it was heard to the end; one that was closed waits and plays again
    if (o.ended || o.left) return [o]
    const marked = apply(o.state, {t: 'flag', k: beatFlag(beat.id), v: true})
    return settle(chapter, marked, depth + 1)
  })
}

export function simulate(pack: LifePack, chapter: Chapter, seedEvents: readonly LifeEvent[] = [], cap = 40000): SimResult {
  const key = keyOf(cutsOf(chapter))
  const opened = [...seedEvents, ...openChapter(chapter)].reduce(apply, fold([]))
  const starts = settle(chapter, opened)
  const seen = new Map<string, LifeState>(), edges = new Map<string, Set<string>>(), ends = new Set<string>(), endings = new Set<string>()
  const queue: string[] = []
  const add = (from: string | null, o: Outcome) => {
    const k = o.ended ? `END:${o.ended}` : key(o.state)
    if (from) { if (!edges.has(from)) edges.set(from, new Set()); edges.get(from)!.add(k) }
    if (o.ended) { ends.add(k); endings.add(o.ended); return }
    if (!seen.has(k)) { seen.set(k, o.state); queue.push(k) }
  }
  starts.forEach(o => add(null, o))
  let truncated = false
  while (queue.length) {
    if (seen.size > cap) { truncated = true; break }
    const k = queue.shift()!, s = seen.get(k)!
    const scene = sceneOf(pack, chapter, s, s.room!)
    const then = (list: Outcome[]) => list.flatMap(o => o.ended ? [o] : settle(chapter, o.state)).forEach(o => add(k, o))
    // a beat that was closed early comes back by itself
    if (beatFor(chapter, s, s.room!)) settle(chapter, s).forEach(o => add(k, o))
    for (const a of scene.actors) if (a.talk) then(outcomes(chapter, s, a.talk))
    for (const sp of scene.spots) then(outcomes(chapter, s, sp.talk))
    for (const d of scene.doors) { const r = throughDoor(d, s); if (r.ok) settle(chapter, r.events.reduce(apply, s)).forEach(o => add(k, o)) }
  }
  // a state is alive when an ending can still be reached from it
  const alive = new Set<string>(ends)
  let grew = true
  while (grew) { grew = false; for (const [from, tos] of edges) if (!alive.has(from) && [...tos].some(t => alive.has(t))) { alive.add(from); grew = true } }
  const stuck = truncated ? [] : [...seen.keys()].filter(k => !alive.has(k)).slice(0, 5).map(k => { const s = seen.get(k)!; return `${s.room} · ${Object.keys(s.flags).filter(f => !f.startsWith('beat:')).join(',') || 'no flags'}` })
  return {chapter: chapter.id, states: seen.size, endings: [...endings].sort(), stuck, truncated}
}
