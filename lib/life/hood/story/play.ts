/**
 * LIFE · the hood — the STORY IN THE STREET: the director's missions played as hood jobs (rule life-story-watch).
 *
 * Pure glue between `director.ts` (what is in front of him) and `run.ts` (the street's rules):
 *   · `storyLevel` lays every approach of every mission into the level once (its steps and its things on the ground), so
 *     the picture is built once; whatever is not part of the open mission is kept off the street (`sim.got`);
 *   · `syncOffers` makes the director's offers the level's jobs, the first in focus (the renderer marks its giver);
 *   · `storyTalk` is what a person says: the giver's offer, then a choice between the approaches (always leavable);
 *   · `applyEffect` carries out what he chose in a talk: accept a way, answer the complication, call it a day, drop it;
 *   · `finishStory` lands the mission (approach, complication, aftermath) and says what changed;
 *   · `beatsAfter` is the order of the cards after a mission: the watch card (a night the Fitter dated), the aftermath,
 *     the time card when the life moves on a year or more.
 * Nothing is done for him: every step is still his own walk or his own talk.
 */
import type {Level, PickupKind} from '@/lib/life/rush/level'
import {botInput, type Input} from '@/lib/life/rush/sim'
import type {ArchiveRef} from '@/lib/life/universal/types'
import {acceptJob, offerJobs, type HoodRun} from '../run'
import type {TalkChoice, TalkNode, TalkScript} from '../talk'
import type {HoodJob, PersonId} from '../types'
import {accept as acceptMission, ahead, endDay, isFinished, missionById, MISSIONS, newLife, nextMissions, resolve, stageOf, walkAway, waits} from './director'
import {toHoodJob, walkableNear, type StoryJobPlan} from './job'
import {layFinds} from './challenge/run'
import type {Mission, Offer, StoryEvent, StoryState} from './types'

export const planKey = (mission: string, approach: string): string => `${mission}/${approach}`

/** the hood's level with every story plan in it, and where each plan's steps and things are */
export type StoryLevel = {level: Level; plans: Readonly<Record<string, StoryJobPlan>>; picks: Readonly<Record<string, readonly number[]>>; /** stickers lying about the street whatever the mission: THE ALBUM's own, found in free roam (things.ts) */ free: readonly number[]}

/** the story as it stands in this run: the director's state, the open plan, and the complication's answer once given */
export type StoryPlay = {state: StoryState; plan: string | null; choice: string | null; /** the complication was put to him since the last step */ asked: boolean}

export const newPlay = (state: StoryState = newLife()): StoryPlay => ({state, plan: null, choice: null, asked: false})

/** the offer's job: the mission's id, given by its giver, with the steps of its first open way (replaced when he picks one) */
const offerJob = (sl: StoryLevel, o: Offer): HoodJob => sl.plans[planKey(o.mission.id, o.approaches[0]!.id)]!.job

export function storyLevel(base: Level): StoryLevel {
  if (!base.hood) throw new Error('not a hood level')
  const level: Level = {...base, steps: [...base.steps], pickups: [...base.pickups], hood: {...base.hood, jobs: []}}
  const plans: Record<string, StoryJobPlan> = {}, picks: Record<string, number[]> = {}
  for (const m of MISSIONS) for (const a of m.approaches) {
    const plan = toHoodJob(level, m, a.id), at = level.pickups.length
    level.steps.push(...plan.steps); level.pickups.push(...plan.pickups)
    plans[planKey(m.id, a.id)] = plan; picks[planKey(m.id, a.id)] = plan.pickups.map((_, i) => at + i)
  }
  // stickers on the pavements, a few along the whole street: nobody sends him for them, he comes across them
  const free: number[] = [], gateZ = -(base.length - 14)
  ;[0.12, 0.27, 0.41, 0.58, 0.72, 0.9].forEach((f, k) => {
    const q = walkableNear(level, (k % 2 ? 1 : -1) * (base.half + 2.2 + (k % 3) * 0.7), Math.round(gateZ * f) + 3)
    free.push(level.pickups.length); level.pickups.push({x: q.x, z: q.z, kind: 'sticker', step: null})
  })
  // knots of people singing on the main street, between the crossings (RUSH's own rings): on a matchday walk, stand in
  // one a moment and the song carries him — the walk to the ground has something in it (feel pass)
  const gate = -(base.length - 14)
  for (const f of [0.3, 0.55, 0.8]) { const z = Math.round(gate * f); if (base.crossings.every(c => Math.abs(c - z) > 11)) level.rings = [...level.rings, {x: 0, z, r: 3.6}] }
  // the FIND ways hide their first thing in one of a few places (`challenge/run.ts`)
  layFinds(level, plans, picks, base.seed)
  const sl: StoryLevel = {level, plans, picks, free}
  // a new life's offers are in the level from the start: the picture always has somebody to mark
  level.hood!.jobs.push(...nextMissions(newLife()).map(o => offerJob(sl, o)))
  return sl
}

/** keep off the street everything that is not the open plan's (a thing is his only when a job asks for it) */
export function keepOff(run: HoodRun, sl: StoryLevel, play: StoryPlay): void {
  const mine = new Set([...(play.plan ? sl.picks[play.plan] ?? [] : []), ...sl.free])
  run.sim.got.forEach((_, i) => { if (!mine.has(i)) run.sim.got[i] = true })
}

/** the director's offers become the level's jobs (main first, then the small jobs, then the week's work) */
export function syncOffers(run: HoodRun, sl: StoryLevel, play: StoryPlay): Offer[] {
  const offers = nextMissions(play.state)
  if (!play.plan) offerJobs(run, offers.map(o => offerJob(sl, o)))
  keepOff(run, sl, play)
  return offers
}

/** the mission in focus: the open one, else the first offered */
export function focusOf(play: StoryPlay): Mission | null {
  if (play.plan) return missionById(play.plan.split('/')[0]!)
  return nextMissions(play.state)[0]?.mission ?? null
}

/* ───────────── the talks ───────────── */

const single = (who: PersonId, line: string): TalkScript => ({who, start: 'a', nodes: {a: {id: 'a', who, line, next: null}}})
const LATER: TalkChoice = {key: 'story.talk.later', to: 'later'}

/**
 * What `who` says when he talks to them and no step of the open mission is theirs. A giver with offers: the offer, then
 * the approaches (two always open) and "Not now"; more than one offer: a short menu first. Dad also lets him call it a day
 * while the chapter waits for matchday. During a mission its giver can be told to leave it for now. Every talk can be left.
 */
export function storyTalk(play: StoryPlay, who: PersonId): TalkScript {
  const later: TalkNode = {id: 'later', who, line: 'story.talk.later.line', next: null}
  if (play.plan) {
    const m = missionById(play.plan.split('/')[0]!)!
    if (m.giver !== who) return single(who, `story.idle.${who}`)
    return {who, start: 'a', nodes: {a: {id: 'a', who, line: `story.m.${m.id}.again`, choices: [{key: 'story.talk.carry-on', to: null}, {key: 'story.talk.drop', to: 'later', effect: 'story:drop'}]}, later}}
  }
  const mine = nextMissions(play.state).filter(o => o.mission.giver === who)
  const nodes: Record<string, TalkNode> = {later}
  for (const o of mine) {
    const k = `story.m.${o.mission.id}`
    nodes[`m:${o.mission.id}`] = {id: `m:${o.mission.id}`, who, line: `${k}.offer`, choices: [...o.approaches.map(a => ({key: `${k}.a.${a.id}`, to: null, effect: `story:accept:${o.mission.id}:${a.id}` as const})), LATER]}
  }
  const dayOff = who === 'dad' && waits(play.state) > 0
  if (dayOff) nodes.night = {id: 'night', who, line: 'story.end-day.line', next: null}
  if (!mine.length && !dayOff) return single(who, `story.idle.${who}`)
  if (mine.length === 1 && !dayOff) return {who, start: `m:${mine[0]!.mission.id}`, nodes}
  const menu: TalkChoice[] = [...mine.slice(0, 4).map(o => ({key: `story.m.${o.mission.id}.title`, to: `m:${o.mission.id}`})), ...(dayOff ? [{key: 'story.end-day', to: 'night', effect: 'story:end-day' as const}] : []), LATER]
  nodes.menu = {id: 'menu', who, line: 'story.talk.menu', choices: menu}
  // a chapter is never behind a menu (feel pass): its offer comes first, the small jobs behind "Something else?"
  const main = mine.find(o => o.why === 'main')
  if (main) { const n = nodes[`m:${main.mission.id}`]!; nodes[n.id] = {...n, choices: [...n.choices!.slice(0, -1), {key: 'story.talk.other', to: 'menu'}, LATER]}; return {who, start: n.id, nodes} }
  return {who, start: 'menu', nodes}
}

/** the complication, told as it happens: nobody in the street says it, he answers it (or leaves it, and it comes back) */
export function complicationTalk(m: Mission): TalkScript | null {
  if (!m.complication) return null
  const k = `story.m.${m.id}.c`
  return {who: m.giver, start: 'c', narration: true, nodes: {c: {id: 'c', who: m.giver, line: k, mood: 'surprised', choices: m.complication.choices.map(c => ({key: `${k}.${c.id}`, to: null, effect: `story:answer:${c.id}` as const}))}}}
}

/** the open mission wants its complication now: at least one of his steps is done, the last one is not, and it is unanswered */
export function wantsComplication(run: HoodRun, play: StoryPlay): Mission | null {
  if (!play.plan || play.choice || play.asked || run.job !== 'active') return null
  const m = missionById(play.plan.split('/')[0]!)
  const j = run.level.hood!.jobs[0]
  if (!m?.complication || !j) return null
  return run.sim.step > j.from && run.sim.step < j.from + j.steps ? m : null
}

/** a step of the open mission was done: the complication may be put to him again if he walked away from it */
export const stepDone = (play: StoryPlay): StoryPlay => (play.asked && !play.choice ? {...play, asked: false} : play)

export type StoryAct =
  | {k: 'accepted'; mission: Mission; approach: string}
  | {k: 'answered'; choice: string}
  | {k: 'day'; events: StoryEvent[]}
  | {k: 'dropped'; mission: Mission}

/** what a choice in a story talk does. Anything not a story effect changes nothing. */
export function applyEffect(run: HoodRun, sl: StoryLevel, play: StoryPlay, effect: string | null): {play: StoryPlay; act: StoryAct | null} {
  if (!effect?.startsWith('story:')) return {play, act: null}
  const [, what, a, b] = effect.split(':')
  if (what === 'accept' && a && b && !play.plan) {
    const key = planKey(a, b), plan = sl.plans[key], m = missionById(a)
    if (!plan || !m) return {play, act: null}
    const state = acceptMission(play.state, a, b)
    const next: StoryPlay = {state, plan: key, choice: null, asked: false}
    for (const i of sl.picks[key] ?? []) run.sim.got[i] = false
    acceptJob(run, a, plan.job)
    keepOff(run, sl, next)
    return {play: next, act: {k: 'accepted', mission: m, approach: b}}
  }
  if (what === 'answer' && a && play.plan) return {play: {...play, choice: a, asked: true}, act: {k: 'answered', choice: a}}
  if (what === 'end-day' && !play.plan) {
    const out = endDay(play.state), next = {...play, state: out.state}
    syncOffers(run, sl, next)
    return {play: next, act: {k: 'day', events: out.events}}
  }
  if (what === 'drop' && play.plan) {
    const m = missionById(play.plan.split('/')[0]!)!
    const next: StoryPlay = {state: walkAway(play.state), plan: null, choice: null, asked: false}
    run.job = 'idle'; run.board[m.id] = 'idle'; run.sim.step = run.level.steps.length
    syncOffers(run, sl, next)
    return {play: next, act: {k: 'dropped', mission: m}}
  }
  return {play, act: null}
}

/** what changed in him, for the aftermath card: bonds with people, money, the street's opinion, the Box */
export type StoryDelta = {bonds: {who: string; n: number}[]; money: number; rep: number; kept: string[]}

export function deltaOf(before: StoryState, after: StoryState): StoryDelta {
  const who = [...new Set([...Object.keys(before.bonds), ...Object.keys(after.bonds)])]
  return {
    bonds: who.map(w => ({who: w, n: (after.bonds[w] ?? 0) - (before.bonds[w] ?? 0)})).filter(x => x.n !== 0),
    money: after.money - before.money, rep: after.rep - before.rep, kept: after.keeps.filter(k => !before.keeps.includes(k)),
  }
}

/** the open mission ends (its last step is done): the director lands it and the next offers come up */
export function finishStory(run: HoodRun, sl: StoryLevel, play: StoryPlay): {play: StoryPlay; mission: Mission; approach: string; choice: string | null; events: StoryEvent[]; delta: StoryDelta} {
  if (!play.plan) throw new Error('STORY_NOTHING_OPEN')
  const [id, approach] = play.plan.split('/') as [string, string]
  const mission = missionById(id)!
  const out = resolve(play.state, play.choice ?? undefined)
  const choice = mission.complication ? (mission.complication.choices.find(c => c.id === play.choice) ?? mission.complication.choices[0]!).id : null
  const next = newPlay(out.state)
  syncOffers(run, sl, next)
  return {play: next, mission, approach, choice, events: out.events, delta: deltaOf(play.state, out.state)}
}

/* ───────────── the cards after a mission ───────────── */

export type Beat =
  | {k: 'watch'; mission: string; night: ArchiveRef}
  | {k: 'aftermath'; mission: string; night: ArchiveRef | null; delta: StoryDelta; approach: string}
  | {k: 'chapter'; from: number | null; to: number; next: string | null; stage: string}
  | {k: 'stage-end'; stage: string}
  /** the feel pass: the paper the morning after a dated matchday (the headline is the archive row's), his name in the caption */
  | {k: 'paper'; mission: string; night: ArchiveRef; age: number}
  /** the feel pass: the stage looked back on — his ways, the Box, the people, the Heart (`feel/voice.ts → recapOf`) */
  | {k: 'recap'; stage: string}

/**
 * The order of the cards: a mission on a dated night gets the watch card first (when something is on record to watch),
 * then the aftermath; a small job gets its aftermath; the week's work gets none (a banner says it). Then, if the life
 * moved on a year or more, the time card for the chapter ahead; at the end of a stage, its closing card.
 */
export function beatsAfter(o: {mission: Mission; approach: string; events: StoryEvent[]; delta: StoryDelta; state: StoryState; night: ArchiveRef | null; canWatch: boolean}): Beat[] {
  const out: Beat[] = []
  if (o.mission.kind === 'main' && o.night && o.canWatch) out.push({k: 'watch', mission: o.mission.id, night: o.night})
  if (o.mission.kind !== 'standing') out.push({k: 'aftermath', mission: o.mission.id, night: o.mission.kind === 'main' ? o.night : null, delta: o.delta, approach: o.approach})
  for (const e of o.events) {
    if (e.k === 'bridge') { const next = ahead(o.state)[0] ?? null; out.push({k: 'chapter', from: e.from, to: e.to, next: next?.id ?? null, stage: stageOf(e.to)}) }
    if (e.k === 'stage-end') out.push({k: 'stage-end', stage: e.stage})
  }
  return out
}

/** the card a new life opens on: the first chapter's title */
export function openingBeat(state: StoryState): Beat {
  const next = ahead(state)[0] ?? null
  return {k: 'chapter', from: null, to: state.age, next: next?.id ?? null, stage: stageOf(state.age)}
}

/** what he is carrying for the open mission, by kind */
export function carried(run: HoodRun, sl: StoryLevel, play: StoryPlay): {kind: PickupKind; n: number}[] {
  if (!play.plan) return []
  const n = new Map<PickupKind, number>()
  for (const i of sl.picks[play.plan] ?? []) if (run.sim.got[i]) { const k = run.level.pickups[i]!.kind; n.set(k, (n.get(k) ?? 0) + 1) }
  return [...n].map(([kind, c]) => ({kind, n: c}))
}

/** the givers to mark: the focus (the main mission when there is one) and the optional ones */
export function giversOf(play: StoryPlay): {main: PersonId | null; side: PersonId[]} {
  if (play.plan) return {main: null, side: []}
  const offers = nextMissions(play.state), main = offers[0]?.mission.giver ?? null
  return {main, side: [...new Set(offers.slice(1).map(o => o.mission.giver))].filter(g => g !== main)}
}

/* ───────────── the test's player ───────────── */

/**
 * Walks to a person the way RUSH's own bot walks to a talk step (it routes along the streets and waits at the kerb),
 * and presses talk when close. The real level and the real sim are only read.
 */
export function walkToTalk(run: HoodRun, who: PersonId): Input {
  const p = run.level.hood!.people.find(q => q.id === who)!
  const st = {kind: 'talk' as const, x: p.x, z: p.z, r: p.r, key: '', say: null, npc: null, cost: 0, hold: 0, group: 0, joins: false, leaves: false, reveals: false}
  return botInput({...run.level, steps: [st]}, {...run.sim, step: 0})
}

/** the story has nothing more written for him (free roam and the week's work go on) */
export const storyOver = (play: StoryPlay): boolean => isFinished(play.state)

/**
 * The QA stand only: the director walked on, without the street, until `missionId` is offered (first open way, first
 * answer each time). It never runs in the game; it lets a test or a screenshot start at a later chapter.
 */
export function fastForward(state: StoryState, missionId: string, cap = 200): StoryState {
  let s = state
  for (let i = 0; i < cap && !nextMissions(s).some(o => o.mission.id === missionId) && !isFinished(s); i++) {
    const offers = nextMissions(s), main = offers.find(o => o.why === 'main')
    if (!main && waits(s) > 0) { s = endDay(s).state; continue }
    const o = main ?? offers[0]!
    s = resolve(acceptMission(s, o.mission.id, o.approaches[0]!.id)).state
  }
  return s
}
