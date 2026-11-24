/**
 * LIFE · the hood — the FEEL layer as one session (feel pass, 24.11.2026). Pure: the game (`HoodHost`) and the playthrough
 * harness call the same five functions, so what the audit measures is what the player gets.
 *
 *   feelStart      the cold open: two lines, his age on the chapter card, and Dad's offer already in his ear
 *   feelStep       every step of the street: the mission's challenge (clock, watcher, knocks, promises, a spend or a
 *                  bargain when he gets there), his inner voice, the era on a long walk, a new place, the ground's roar,
 *                  the bus that opens as he grows
 *   feelEffect     a feel choice in a talk (spend, bargain, the bus)
 *   feelFinish     the mission ends: slip or clean lands on the story (fail-forward, never a game-over)
 *   feelAfterCards the cards after a mission (the paper the morning after, the stage's recap) and the next offer, made
 *                  at the high: the giver calls him over instead of a menu
 * Nothing here moves him or does a step for him; it reads the street and answers what his own walk and talk did.
 */
import {STEP} from '@/lib/life/rush/sim'
import type {ArchiveRef} from '@/lib/life/universal/types'
import type {HoodRun} from '../../run'
import type {TalkScript} from '../../talk'
import type {PersonId, PlaceId} from '../../types'
import type {HoodClub} from '../../level'
import {applyEffects, missionById, nextMissions} from '../director'
import {storyTalk, type Beat, type StoryDelta, type StoryLevel, type StoryPlay} from '../play'
import {MATCHDAY, type Effect, type Mission, type StoryEvent} from '../types'
import {startChallenge, tickChallenge, outcomeOf, type ChallengeRun, type ChallengeNote, findSpots} from '../challenge/run'
import {CLEAN, SLIP, type Challenge} from '../challenge/table'
import {moneyOf, moneyWord, texture, yearAt} from './era'
import {acceptVoice, endVoice, nickOf} from './voice'
import {storyWord} from '../words'

export type FeelNoteKind = 'voice' | 'challenge' | 'reveal' | 'arrive' | 'card' | 'screen'
/** something the player notices: a words key and its fill, how it is shown, the sound it makes (cue names of `sound.ts`) */
export type FeelNote = {k: FeelNoteKind; what: string; vars?: Record<string, string>; show?: 'caption' | 'major' | 'minor'; sound?: string}

export type FeelState = {
  born: number | null; country: string | null; name: string
  ch: ChallengeRun | null; chFor: string | null
  said: Set<string>; seen: Set<string>
  /** a talk the layer wants opened as soon as the street is his again (the cold open, the next offer at the high) */
  pending: TalkScript | null
  textured: boolean; arrived: boolean; bused: boolean; prevStep: number; lastVoice: number
}

/** the cold open, in screen-seconds: two lines at 2.6 s and the chapter card */
export const COLD_OPEN = {lines: ['feel.open.1', 'feel.open.2'], ms: 2600, card: 4} as const

const note = (k: FeelNoteKind, what: string, o: Partial<FeelNote> = {}): FeelNote => ({k, what, ...o})

export function newFeel(o: {born?: number | null; country?: string | null; name?: string}): FeelState {
  return {born: o.born ?? null, country: o.country ?? null, name: o.name ?? '', ch: null, chFor: null, said: new Set(), seen: new Set(['home']), pending: null, textured: false, arrived: false, bused: false, prevStep: -1, lastVoice: -99}
}

/** the money for `units` in his year, as `{key, vars}` for the words table */
export function money(fs: FeelState, units: number, age: number): {key: string; vars: Record<string, string>} {
  const m = moneyOf(units, fs.country, yearAt(fs.born, age))
  return {key: m.key, vars: {n: String(m.n)}}
}

export function feelStart(o: {club: HoodClub; born: number | null; name: string; run: HoodRun; sl: StoryLevel; play: StoryPlay}): {feel: FeelState; play: StoryPlay; screen: number; notes: FeelNote[]} {
  const feel = newFeel({born: o.born, country: o.club.country ?? null, name: o.name})
  // the chapter card holds his age (the portrait moment); then Dad's offer is in his ear, no walk, no menu
  feel.pending = storyTalk(o.play, nextMissions(o.play.state)[0]?.mission.giver ?? 'dad')
  return {feel, play: o.play, screen: COLD_OPEN.lines.length * COLD_OPEN.ms / 1000 + COLD_OPEN.card, notes: [note('screen', 'cold-open'), note('card', 'chapter:first')]}
}

type Ctx = {run: HoodRun; sl: StoryLevel; play: StoryPlay}

function challengeNotes(ch: ChallengeRun, c: Challenge): FeelNote[] {
  if (c.kind === 'sneak') return [note('challenge', 'feel.watch.on', {show: 'minor'})]
  if (c.kind === 'carry') return [note('challenge', 'feel.carry.on', {show: 'minor'})]
  if (c.kind === 'find') return [note('challenge', 'feel.find.hint', {show: 'minor'})]
  return ch.limit !== null ? [note('challenge', 'feel.clock.label', {sound: 'clock-tick'})] : []
}
const NOTE_OF: Record<ChallengeNote['k'], {sound?: string; show: FeelNote['show']}> = {
  warn: {sound: 'clock-hot', show: 'caption'}, late: {sound: 'stamp-miss', show: 'caption'}, seen: {sound: 'caught', show: 'caption'}, knock: {show: 'minor'}, spilt: {sound: 'stamp-miss', show: 'caption'},
  found: {sound: 'secret', show: 'caption'}, kept: {sound: 'stamp-pass', show: 'caption'}, broke: {sound: 'stamp-miss', show: 'caption'},
}

/** the bus to the ground: a shortcut that opens as he grows (ten, and he has been inside), at the mate's corner */
const busTalk = (): TalkScript => ({who: 'mate', start: 'b', narration: true, nodes: {b: {id: 'b', who: 'mate', line: 'feel.bus.line', choices: [{key: 'feel.bus.take', to: null, effect: 'story:feel:bus'}, {key: 'feel.bus.run', to: null}]}}})

/**
 * The fills the feel words need, printed in his year's money: `{nick}`, `{name}`, `{money}` (the bus fare), `{p0}` /
 * `{p1}` (a spend's two prices). The game adds them to every words call; the harness reads the same.
 */
export function feelVars(fs: FeelState, play: StoryPlay): Record<string, string> {
  const age = play.state.age, say = (u: number) => { const m = moneyOf(u, fs.country, yearAt(fs.born, age)); return moneyWord(m.key, m.n) }
  const c = fs.ch?.c, offers = c?.kind === 'spend' ? c.offers : []
  return {nick: storyWord(nickOf(play.state)), name: fs.name, money: say(1), p0: say((offers[0]?.units ?? 0) + 1), p1: say((offers[1]?.units ?? 0) + 1)}
}

export function feelStep(fs: FeelState, o: Ctx & {ev?: readonly {k: string}[]; accepted?: string}): {play: StoryPlay; notes: FeelNote[]; talk: TalkScript | null} {
  const {run, play} = o, notes: FeelNote[] = []
  let talk: TalkScript | null = null
  if (!play.plan) { fs.ch = null; fs.chFor = null; fs.prevStep = run.sim.step; return {play, notes, talk} }
  const [id, approach] = play.plan.split('/') as [string, string]
  const m = missionById(id)!
  if (fs.chFor !== play.plan) {
    // a mission begins: its challenge, his voice, the mate's name for him
    fs.chFor = play.plan; fs.textured = false; fs.arrived = false; fs.bused = false; fs.prevStep = run.sim.step
    fs.ch = startChallenge(run, m, approach, play.state.age)
    // a matchday: the knots on the main street are singing again
    if (m.day === 'matchday') { run.sim.ringDone.fill(false); run.sim.ringT.fill(0) } else run.sim.ringDone.fill(true)
    if (fs.ch) notes.push(...challengeNotes(fs.ch, fs.ch.c))
    const v = acceptVoice(play.state, m, fs.said)
    if (v) { fs.said.add(v); fs.lastVoice = run.sim.t; notes.push(note('voice', v, {show: 'caption'})) }
    if (m.giver === 'mate' && play.state.flags['story:done:first-noise']) notes.push(note('voice', `feel.mate.nick.${1 + play.state.done.length % 3}`, {vars: {nick: nickOf(play.state)}, show: 'caption'}))
    return {play, notes, talk}
  }
  if (fs.ch) {
    const t = tickChallenge(fs.ch, run, (o.ev ?? []) as {k: string}[], fs.prevStep)
    for (const n of t.notes) notes.push(note('challenge', `feel.n.${n.k}`, {...NOTE_OF[n.k], vars: n.who ? {who: n.who} : undefined}))
    talk = t.talk
  }
  const sim = run.sim, st = run.level.steps[sim.step], j = run.level.hood!.jobs[0]
  // he stood in the song: it carries him (a few seconds back on a kick-off clock, and the Heart remembers it)
  if (sim.events.some(e => e.k === 'chant')) {
    if (fs.ch?.limit != null && !fs.ch.late) fs.ch.limit += 8
    notes.push(note('challenge', 'feel.n.chant', {show: 'caption', sound: 'stamp-new'}))
  }
  // the gate is reached and the next step is a talk back home: the match is played in between, and he comes home after it
  // (the time skip is the night itself; nobody walks a dead street at full time)
  if (fs.prevStep >= 0 && sim.step === fs.prevStep + 1 && st?.kind === 'talk') {
    const was = run.level.steps[fs.prevStep], ground = run.level.hood!.places.find(p => p.id === 'ground')!
    if (was?.kind === 'reach' && Math.hypot(was.x - ground.x, was.z - ground.z) < 6 && Math.hypot(st.x - sim.x, st.z - sim.z) > 120) {
      const start = run.level.start
      sim.x = start.x; sim.z = start.z; sim.vx = 0; sim.vz = 0; sim.heading = Math.PI
      notes.push(note('screen', 'feel.home.after', {show: 'major'}))
    }
  }
  // a long walk has the era in it: one texture line, once a mission, when nothing else has been said for a while
  if (st && !fs.textured && sim.t - fs.lastVoice > 12 && Math.hypot(st.x - sim.x, st.z - sim.z) > 90) {
    const year = yearAt(fs.born, play.state.age), pool = year === null ? [] : texture(year)
    if (pool.length) { fs.textured = true; fs.lastVoice = sim.t; const k = pool[(play.state.done.length + Math.floor(sim.t)) % pool.length]!; notes.push(note('voice', k, {show: 'caption'})) }
  }
  // the ground on a matchday: the roar arrives before the gate does
  const place = run.lastPlace
  if (place === 'ground' && m.day === 'matchday' && !fs.arrived) { fs.arrived = true; notes.push(note('arrive', 'feel.arrive', {show: 'caption', sound: 'objective'})) }
  if (place && !fs.seen.has(place)) { fs.seen.add(place); notes.push(note('reveal', 'feel.reveal', {vars: {place: `hood.place.${place}`}, show: 'minor'})) }
  // the bus: at the corner, the ground far off, ten or more, been inside before, a coin for the fare
  if (!talk && !fs.bused && st?.kind === 'reach' && play.state.age >= 10 && play.state.flags['story:been-inside'] && play.state.money >= 1 && j) {
    const ground = run.level.hood!.places.find(p => p.id === 'ground')!, corner = run.level.hood!.places.find(p => p.id === 'corner')!
    const toGround = Math.hypot(st.x - ground.x, st.z - ground.z) < 6 && Math.hypot(ground.x - sim.x, ground.z - sim.z) > 120
    if (toGround && Math.hypot(corner.x - sim.x, corner.z - sim.z) < 8) { fs.bused = true; talk = busTalk() }
  }
  fs.prevStep = sim.step
  return {play, notes, talk}
}

/** a feel choice made in a talk: the spend, the bargain, the bus */
export function feelEffect(fs: FeelState, o: Ctx, effect: string | null): {play: StoryPlay; notes: FeelNote[]} {
  if (!effect?.startsWith('story:feel:')) return {play: o.play, notes: []}
  const [, , what, arg] = effect.split(':')
  const ch = fs.ch, notes: FeelNote[] = []
  let fx: Effect[] = []
  if (what === 'spend' && ch?.c.kind === 'spend') { const off = ch.c.offers.find(x => x.id === arg); if (off) { fx = [...off.effects, {money: -Math.min(off.units, o.play.state.money)}]; ch.answer = off.id } }
  else if (what === 'bargain' && ch?.c.kind === 'bargain') { fx = arg === 'fair' ? [{money: 1}] : [{bond: 'kiosk', n: 1}]; ch.answer = arg ?? null }
  else if (what === 'bus') {
    const g = o.run.level.goal
    o.run.sim.x = 0; o.run.sim.z = g.z + 34; o.run.sim.vx = 0; o.run.sim.vz = 0
    fx = [{money: -1}, {flag: 'feel:bus'}]
    notes.push(note('voice', 'feel.bus.ride', {show: 'caption'}))
  }
  if (!fx.length) return {play: o.play, notes}
  return {play: {...o.play, state: applyEffects(o.play.state, fx).state}, notes}
}

/** the open mission's last step is done: the challenge's slip or clean finish lands before the director closes it */
export function feelFinish(fs: FeelState, o: Ctx): {play: StoryPlay; notes: FeelNote[]; slip: boolean} {
  const m = o.play.plan ? missionById(o.play.plan.split('/')[0]!) : null
  const ch = fs.ch
  fs.ch = null; fs.chFor = null
  if (!m) return {play: o.play, notes: [], slip: false}
  const out = ch ? outcomeOf(ch) : {slip: false, why: null}
  const fx: Effect[] = ch ? [...(out.slip ? SLIP : CLEAN)[ch.c.kind]] : []
  if (out.slip) fx.push({flag: `feel:slip:${m.id}`, v: out.why ?? true})
  const v = endVoice(m, out.slip)
  const notes: FeelNote[] = ch || m.kind === 'main' ? [note('voice', v, {show: 'caption', sound: out.slip ? undefined : 'stamp-pass'})] : []
  if (!fx.length) return {play: o.play, notes, slip: out.slip}
  return {play: {...o.play, state: applyEffects(o.play.state, fx).state}, notes, slip: out.slip}
}

export function feelAfterCards(fs: FeelState, o: Ctx & {cards: Beat[]; mission: Mission; delta: StoryDelta; events: StoryEvent[]; night: ArchiveRef | null}): {play: StoryPlay; cards: Beat[]; notes: FeelNote[]; talk: TalkScript | null} {
  const {play, mission: m} = o, notes: FeelNote[] = [], cards: Beat[] = []
  for (const b of o.cards) {
    if (b.k === 'stage-end') cards.push({k: 'recap', stage: b.stage})
    cards.push(b)
    // the morning after a dated matchday: the paper, its headline the archive row's own, his name in the caption
    if (b.k === 'aftermath' && m.kind === 'main' && m.day === 'matchday' && o.night) cards.push({k: 'paper', mission: m.id, night: o.night, age: play.state.age})
  }
  // the day moved on: if he ended it far up the road (the ground), the next one starts at the front door — nobody walks
  // a dead street back home between two chapters
  const sim = o.run.sim, start = o.run.level.start
  if (Math.hypot(sim.x - start.x, sim.z - start.z) > 120) { sim.x = start.x; sim.z = start.z; sim.vx = 0; sim.vz = 0; sim.heading = Math.PI; notes.push(note('screen', 'home-next-day')) }
  for (const k of o.delta.kept) notes.push(note('reveal', 'feel.kept', {vars: {what: `story.keep.${k}`}, show: 'major', sound: 'box-lid'}))
  if (m.id === 'first-noise') notes.push(note('voice', 'feel.mate.named', {vars: {nick: nickOf(play.state)}, show: 'major'}))
  if (o.events.some(e => e.k === 'midweek')) notes.push(note('voice', 'feel.v.midweek', {show: 'caption'}))
  if (play.state.day === MATCHDAY - 1) notes.push(note('voice', 'feel.v.eve', {show: 'caption'}))
  // the next thing is offered at the high: whoever has it calls him over (a chapter first; he can always say not now)
  const offers = nextMissions(play.state), next = offers.find(x => x.why === 'main') ?? offers[0]
  let talk: TalkScript | null = null
  if (next) { talk = storyTalk(play, next.mission.giver); notes.push(note('voice', 'feel.call', {vars: {who: next.mission.giver}, show: 'minor'})) }
  return {play, cards, notes, talk}
}

/** what the HUD shows of the open mission: the clock and its reason, the promises, the watcher, carrying, how warm a find is */
export type FeelHud = {clock: {key: string; left: number; hot: boolean; late: boolean} | null; promises: {who: PersonId; left: number; kept: boolean | null}[]; watch: boolean; carry: boolean; find: 'hot' | 'warm' | 'cold' | null}
export function feelHud(fs: FeelState, run: HoodRun): FeelHud {
  const ch = fs.ch
  if (!ch) return {clock: null, promises: [], watch: false, carry: false, find: null}
  const c = ch.c, reason = c.kind === 'timed' ? c.clock.reason : c.kind === 'promise' ? null : c.clock?.reason ?? null
  const clock = ch.limit !== null && reason ? {key: `feel.clock.${reason}`, left: Math.max(0, ch.limit - ch.t), hot: ch.limit - ch.t < 20, late: ch.late} : null
  let find: FeelHud['find'] = null
  if (c.kind === 'find' && !ch.found) {
    const spots = findSpots(run.level, run.sim.step).filter(f => !run.sim.searched[f.i])
    const d = Math.min(Infinity, ...spots.map(f => { const q = run.level.searches[f.i]!; return Math.hypot(q.x - run.sim.x, q.z - run.sim.z) }))
    find = !spots.length ? null : d < 2.5 ? 'hot' : d < 9 ? 'warm' : 'cold'
  }
  return {clock, promises: ch.promise.map(p => ({who: p.who, left: Math.max(0, p.by - ch.t), kept: p.kept})), watch: c.kind === 'sneak' && !ch.seen, carry: c.kind === 'carry', find}
}

/** the sim-seconds a mission's clock allows (for the harness and the tests) */
export const clockSeconds = (fs: FeelState): number | null => fs.ch?.limit ?? null
export const STEP_SECONDS = STEP
export type {PlaceId}
