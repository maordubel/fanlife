/**
 * LIFE · the hood — the PLAYTHROUGH HARNESS (feel audit, 24.11.2026). Pure: the hood sim and the story director, no browser.
 *
 * A "real player" plays the first minutes of a new life the way the HUD tells him to: he presses New, types his name, sits
 * through the opening, walks to whoever the HUD points at, reads every line, picks a way, does every step himself in the
 * street (RUSH's own bot does the walking: it reads the traffic, it sprints while it has the legs), answers the complication,
 * reads the cards, and takes whatever is offered next. Everything he experiences is logged as a BEAT with its time.
 *
 * Two clocks: sim-seconds (the street runs) and screen-seconds (reading a line, a card, the opening; the street is paused).
 * A gap is the time between two beats; dead time is walking with nothing happening. `feel: true` plays the same life
 * through the feel layer (`./`: cold open, the clock on the HUD, challenges, the inner voice, the week's rhythm).
 */
import {rng} from '@/lib/life/rush/level'
import {IDLE, STEP, botInput, type Input} from '@/lib/life/rush/sim'
import type {ArchiveRef} from '@/lib/life/universal/types'
import {startHood, stepHood, type HoodRun} from '../../run'
import {advance, choose, nodeOf, type TalkScript} from '../../talk'
import {hoodWord} from '../../words'
import type {HoodClub} from '../../level'
import {hoodLevel} from '../../level'
import type {PersonId} from '../../types'
import {applyEffect, beatsAfter, complicationTalk, finishStory, newPlay, openingBeat, stepDone, storyLevel, storyTalk, syncOffers, walkToTalk, wantsComplication, type Beat, type StoryLevel, type StoryPlay} from '../play'
import {nextMissions} from '../director'
import {storyWord} from '../words'
import {feelStart, feelStep, feelFinish, feelAfterCards, feelEffect, type FeelState, type FeelNote} from './session'
import {carefulInput, searchInput} from '../challenge/run'

/** how long a person takes to read a line, tap on, pick a choice, read a card (screen-seconds; the street is paused) */
const CARD: Record<string, number> = {chapter: 4, aftermath: 5, watch: 6, 'stage-end': 5, recap: 6, paper: 5}
export const READ = {perChar: 0.045, line: 0.9, choice: 1.4, title: 2, name: 6, introBeat: 3.8, card: CARD}

export type BeatKind = 'screen' | 'talk' | 'step' | 'pickup' | 'card' | 'accept' | 'finish' | 'complication' | 'voice' | 'challenge' | 'reveal' | 'arrive'
export type LogBeat = {t: number; sim: number; k: BeatKind; what: string; lines?: number; walked?: number}
export type MissionLog = {id: string; approach: string; kind: string; t0: number; t1: number; walked: number; lines: number; steps: number; slip: boolean}
export type FeelReport = {
  club: string; seconds: number
  /** from pressing New to the first moment his own thumb moves him (screen-seconds) */
  firstControl: number
  /** from pressing New to his first meaningful act: a mission taken */
  firstMission: number
  /** from pressing New to the first step of a mission done */
  firstStep: number
  beats: LogBeat[]; missions: MissionLog[]
  /** sim-seconds between beats while he is in the street */
  gaps: number[]; maxGap: number; over40: number; deadWalk: number
  /** the longest stretch with nothing at all, not even a line in his head */
  maxQuiet: number
  walked: number; talkLines: number; screenTime: number; simTime: number
  /** a line key he read more than once, and how many times */
  repeats: Record<string, number>
  /** chapters done, small jobs, the week's work, days slept, before the clock ran out */
  chapters: number; sides: number; standing: number; slept: number
  /** standing jobs and nights slept between two chapters, the worst case */
  worstWait: number
  notes: FeelNote[]
  /** the life never stood still with nothing to do (no frame cap hit, never an empty offer list) */
  stuck: boolean; empty: number
  play: StoryPlay
}

const say = (key: string): string => key.startsWith('story.') ? storyWord(key) : hoodWord(key)
const readOf = (key: string) => READ.line + say(key).length * READ.perChar

/** a talk played by the real player: he reads every line and takes `pick`'s choice */
function readTalk(s: TalkScript, pick: (n: number, keys: string[]) => number): {effects: string[]; lines: string[]; seconds: number} {
  const effects: string[] = [], lines: string[] = []
  let node = nodeOf(s, s.start), guard = 0, seconds = 0
  while (node && guard++ < 24) {
    lines.push(node.line); seconds += readOf(node.line)
    if (node.choices?.length) { const i = pick(node.choices.length, node.choices.map(c => c.key)); seconds += READ.choice; const c = choose(s, node.id, i); if (c.effect) effects.push(c.effect); node = c.node }
    else node = advance(s, node.id).node
  }
  return {effects, lines, seconds}
}

export type PlaythroughOpts = {club: HoodClub; nights?: Record<string, ArchiveRef>; seed?: number; seconds?: number; feel?: boolean; born?: number | null; name?: string; pick?: 'first' | 'random'; /** stop as soon as this is true of the story (e.g. childhood done) */ until?: (play: StoryPlay) => boolean; /** a careless player: runs everywhere, ignores watchers and knocks (the slips still end every mission) */ careless?: boolean}

export function playthrough(o: PlaythroughOpts): FeelReport {
  const seconds = o.seconds ?? 1800, seed = o.seed ?? 1, nights = o.nights ?? {}, r = rng(seed * 977 + 13)
  const sl: StoryLevel = storyLevel(hoodLevel(o.club, seed)), run: HoodRun = startHood(sl.level)
  let play: StoryPlay = newPlay()
  const beats: LogBeat[] = [], missions: MissionLog[] = [], notes: FeelNote[] = [], repeats: Record<string, number> = {}
  let screen = 0, sim = 0, walked = 0, sinceBeat = 0, lastBeatSim = 0, talkLines = 0
  let firstMission = -1, firstStep = -1, chapters = 0, sides = 0, standing = 0, slept = 0, waitRun = 0, worstWait = 0
  const at: {cur: MissionLog | null} = {cur: null}
  const now = () => screen + sim
  const gaps: number[] = []
  // a gap is measured between things he DOES or that happen TO him (a line in his head does not close a gap)
  const ACTION: ReadonlySet<BeatKind> = new Set(['talk', 'step', 'pickup', 'accept', 'finish', 'complication', 'challenge', 'arrive'])
  let lastAny = 0
  const quiet: number[] = []
  const beat = (k: BeatKind, what: string, extra: Partial<LogBeat> = {}) => {
    if (sim - lastAny > 0.05) quiet.push(sim - lastAny)
    lastAny = sim
    if (ACTION.has(k)) { if (sim - lastBeatSim > 0.05) gaps.push(sim - lastBeatSim); lastBeatSim = sim }
    beats.push({t: now(), sim, k, what, walked: Math.round(sinceBeat), ...extra}); sinceBeat = 0
  }
  const readLines = (lines: string[]) => { talkLines += lines.length; for (const l of lines) repeats[l] = (repeats[l] ?? 0) + 1 }
  const pick = (n: number, keys: string[]) => o.pick === 'random' ? Math.floor(r() * (keys.at(-1) === 'story.talk.later' ? n - 1 : n)) : 0

  /* the front matter: title, name, the opening */
  screen += READ.title; beat('screen', 'title')
  screen += READ.name; beat('screen', 'name')
  let fs: FeelState | null = null
  if (o.feel) {
    const st = feelStart({club: o.club, born: o.born ?? null, name: o.name ?? 'Sam', run, sl, play})
    fs = st.feel; play = st.play; screen += st.screen; for (const n of st.notes) { notes.push(n); beat(n.k, n.what) }
  } else {
    screen += 4 * READ.introBeat; beat('screen', 'intro')
    screen += 4; const ob = openingBeat(play.state); beat('card', `chapter:${ob.k === 'chapter' ? ob.next : ''}`)
  }
  syncOffers(run, sl, play)
  const firstControl = now()

  let target: PersonId | null = null, saidAt = -9, unstick = 0, last = {x: run.sim.x, z: run.sim.z}, frames = 0
  const cards = (list: Beat[]) => { for (const b of list) { screen += READ.card[b.k] ?? 4; beat('card', `${b.k}:${'mission' in b ? b.mission : 'next' in b ? b.next : b.stage}`) } }

  // a talk the feel layer opened itself (the cold open, the next offer at the high): he reads it where he stands
  const openTalk = (s: TalkScript) => {
    const t = readTalk(s, pick); screen += t.seconds; readLines(t.lines); beat('talk', `${s.who}:${t.lines[0]}`, {lines: t.lines.length})
    for (const fx of t.effects) {
      if (fs && fx.startsWith('story:feel:')) { const n = feelEffect(fs, {run, sl, play}, fx); play = n.play; for (const x of n.notes) { notes.push(x); beat(x.k, x.what) } continue }
      const out = applyEffect(run, sl, play, fx); play = out.play
      if (out.act?.k === 'accepted') onAccepted(out.act.mission.id, out.act.mission.kind, out.act.approach)
      if (out.act?.k === 'day') { slept++; waitRun++ }
    }
  }
  const onAccepted = (id: string, kind: string, approach: string) => {
    if (firstMission < 0) firstMission = now()
    at.cur = {id, approach, kind, t0: now(), t1: 0, walked: 0, lines: 0, steps: 0, slip: false}
    beat('accept', `${id}/${approach}`)
    if (fs) { const n = feelStep(fs, {run, sl, play, accepted: id}); play = n.play; for (const x of n.notes) { notes.push(x); beat(x.k, x.what) } }
  }
  if (fs?.pending) { const s = fs.pending; fs.pending = null; openTalk(s) }

  let stuck = false, empty = 0
  const cap = Math.ceil(seconds / STEP) + 1000
  while (now() < seconds && !o.until?.(play)) {
    if (++frames > cap) { stuck = true; break }
    let input: Input = IDLE
    if (!play.plan) {
      const offers = nextMissions(play.state)
      if (!offers.length) { empty++; break }
      if (!target) target = offers[0]!.mission.giver
      input = walkToTalk(run, target)
    } else input = fs && !o.careless ? carefulInput(fs.ch, run, botInput(run.level, run.sim)) : searchInput(run, botInput(run.level, run.sim))
    if (frames % 120 === 0) { const moved = Math.hypot(run.sim.x - last.x, run.sim.z - last.z); last = {x: run.sim.x, z: run.sim.z}; if (moved < 0.3) unstick = 120 }
    if (unstick > 0) { unstick--; input = {...IDLE, x: Math.sin(seed + frames / 400), z: 0.6} }
    const x0 = run.sim.x, z0 = run.sim.z
    const ev = stepHood(run, input)
    sim += STEP
    const d = Math.hypot(run.sim.x - x0, run.sim.z - z0); walked += d; sinceBeat += d; if (at.cur) at.cur.walked += d
    if (fs) { const n = feelStep(fs, {run, sl, play, ev}); play = n.play; for (const x of n.notes) { notes.push(x); beat(x.k, x.what) } if (n.talk) openTalk(n.talk) }
    for (const e of ev) {
      if (e.k === 'say' && !play.plan && e.who === target && run.sim.t - saidAt > 0.5) {
        saidAt = run.sim.t
        openTalk(storyTalk(play, e.who))
        target = null
      } else if (e.k === 'say' && play.plan && e.key.startsWith('story.s.')) {
        screen += readOf(e.key); readLines([e.key]); if (at.cur) at.cur.lines++
      } else if (e.k === 'step' && play.plan) { play = stepDone(play); if (at.cur) at.cur.steps++; if (firstStep < 0) firstStep = now(); beat('step', `${play.plan}#${e.next}`) }
      else if (e.k === 'pickup') beat('pickup', e.kind)
      else if (e.k === 'job' && e.state === 'done' && play.plan) {
        let pre = play
        if (fs) { const n = feelFinish(fs, {run, sl, play}); pre = n.play; for (const x of n.notes) { notes.push(x); beat(x.k, x.what) } if (at.cur) at.cur.slip = n.slip }
        const fin = finishStory(run, sl, pre)
        const m = fin.mission
        if (at.cur) { at.cur.t1 = now(); missions.push(at.cur); at.cur = null }
        if (m.kind === 'main') { chapters++; worstWait = Math.max(worstWait, waitRun); waitRun = 0 } else if (m.kind === 'side') sides++; else { standing++; waitRun++ }
        beat('finish', m.id)
        const night = m.kind === 'main' ? nights[m.id] ?? null : null
        const list = beatsAfter({mission: m, approach: fin.approach, events: fin.events, delta: fin.delta, state: fin.play.state, night, canWatch: !!night})
        play = fin.play
        if (fs) {
          const n = feelAfterCards(fs, {run, sl, play, cards: list, mission: m, delta: fin.delta, events: fin.events, night})
          play = n.play; cards(n.cards); for (const x of n.notes) { notes.push(x); beat(x.k, x.what) }
          if (n.talk) openTalk(n.talk)
        } else cards(list)
        target = null
      }
    }
    const cm = wantsComplication(run, play)
    if (cm) {
      const t = readTalk(complicationTalk(cm)!, () => 0); screen += t.seconds; readLines(t.lines)
      for (const fx of t.effects) play = applyEffect(run, sl, play, fx).play
      beat('complication', cm.id, {lines: t.lines.length})
    }
  }
  const street = gaps.filter(g => g > 0)
  return {
    club: o.club.id, seconds, firstControl, firstMission, firstStep, beats, missions, gaps: street, maxGap: Math.max(0, ...street), maxQuiet: Math.max(0, ...quiet), over40: street.filter(g => g > 40).length,
    deadWalk: street.reduce((s, g) => s + Math.max(0, g - 20), 0), walked, talkLines, screenTime: screen, simTime: sim, repeats: Object.fromEntries(Object.entries(repeats).filter(([, n]) => n > 1)),
    chapters, sides, standing, slept, worstWait: Math.max(worstWait, waitRun), notes, stuck, empty, play,
  }
}

/** the report as a few lines a person can read (the audit prints it) */
export function summary(x: FeelReport): string {
  const r = (n: number) => Math.round(n * 10) / 10
  const ms = x.missions.map(m => `${m.id}/${m.approach} ${r(m.t1 - m.t0)}s ${Math.round(m.walked)}m${m.slip ? ' slip' : ''}`).join(' · ')
  const rep = Object.entries(x.repeats).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${k}×${n}`).join(', ')
  return [
    `${x.club}: control ${r(x.firstControl)}s · first mission ${r(x.firstMission)}s · first step ${r(x.firstStep)}s`,
    `chapters ${x.chapters} · small ${x.sides} · week's work ${x.standing} · slept ${x.slept} · worst wait ${x.worstWait} between chapters`,
    `max gap ${r(x.maxGap)}s (quiet ${r(x.maxQuiet)}s) · gaps>40s ${x.over40} · dead walk ${r(x.deadWalk)}s · walked ${Math.round(x.walked)}m · lines ${x.talkLines} · screen ${r(x.screenTime)}s / street ${r(x.simTime)}s`,
    `repeats: ${rep || 'none'}`,
    `missions: ${ms}`,
  ].join('\n')
}
