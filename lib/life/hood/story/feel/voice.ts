/**
 * LIFE · the hood — HIM (feel pass, 24.11.2026): his inner voice, the name his mate gives him, the Heart he has for the
 * club, the lines that remember what he chose, and the recap at the end of a stage. Pure; reads the director's state.
 *
 * The Heart is THE WORKER's love meter in one visible number: it grows with what he has lived (matchdays, the Box, the
 * people), never with grinding; it is shown, never popped. Bonds stay small and per person (`state.bonds`).
 */
import {missionById} from '../director'
import type {Mission, StageId, StoryState} from '../types'
import {STORY_WORDS} from '../words'

/** the nickname: what the mate calls him after the first chapter, from how he did it */
export function nickOf(state: StoryState): string {
  const how = state.flags['story:how:first-noise']
  return `feel.nick.${typeof how === 'string' && `feel.nick.${how}` in STORY_WORDS ? how : 'none'}`
}

/** the Heart, 0–100: what he has lived, not what he has repeated */
export function heartOf(state: StoryState): number {
  const mains = state.done.map(id => missionById(id)).filter((m): m is Mission => !!m && m.kind === 'main')
  const matchdays = mains.filter(m => m.day === 'matchday').length
  const bonds = Object.values(state.bonds).reduce((s, n) => s + Math.max(0, n), 0)
  const lived = ['story:been-inside', 'story:knows-the-song', 'story:heard-her-story', 'story:passed-it-on', 'story:dad-knows', 'story:box-started'].filter(f => state.flags[f]).length
  return Math.max(0, Math.min(100, Math.round(8 + matchdays * 6 + mains.length * 2 + state.keeps.length * 3 + Math.min(20, bonds) + lived * 2)))
}

/** a line that remembers: said as he takes `mission`, when what it remembers is true */
export const CALLBACKS: readonly {mission: string; when: (s: StoryState) => boolean; key: string}[] = [
  {mission: 'the-way-in', when: s => s.flags['story:shirt'] === 'dads-old', key: 'feel.cb.dads-shirt'},
  {mission: 'the-way-in', when: s => s.flags['story:radio'] === 'next-door', key: 'feel.cb.radio-next-door'},
  {mission: 'her-seat', when: s => !!s.flags['story:knows-the-song'], key: 'feel.cb.song'},
  {mission: 'lead-the-way', when: s => !!s.flags['feel:seen'], key: 'feel.cb.seen'},
  {mission: 'no-ticket', when: s => !!s.flags['story:lost-half-ticket'], key: 'feel.cb.half-ticket'},
  {mission: 'no-ticket', when: s => !!s.flags['story:secret-window'], key: 'feel.cb.secret-window'},
  {mission: 'the-box', when: s => s.flags['story:square'] === 'empty', key: 'feel.cb.square-empty'},
  {mission: 'the-box', when: s => s.flags['story:square'] === 'full', key: 'feel.cb.square-full'},
  {mission: 'the-box', when: s => !!s.flags['story:owes-kiosk'], key: 'feel.cb.owes'},
]
/** the first chapter of a later stage remembers childhood */
const STAGE_CALLBACK: Partial<Record<StageId, {when: (s: StoryState) => boolean; key: string}[]>> = {
  teen: [{when: s => !!s.flags['story:box-started'], key: 'feel.cb.box'}],
  young: [{when: s => !!s.flags['story:took-a-hand'], key: 'feel.cb.took-a-hand'}],
  adult: [{when: () => true, key: 'feel.v.stage.adult.2'}],
}

/** what he says to himself as he takes a mission: a callback when one is due, else the mission's own line, else the stage's */
export function acceptVoice(state: StoryState, m: Mission, said: ReadonlySet<string>): string | null {
  const cb = CALLBACKS.find(c => c.mission === m.id && c.when(state) && !said.has(c.key))
  if (cb) return cb.key
  if (m.kind === 'main') {
    const first = !state.done.some(id => missionById(id)?.stage === m.stage && missionById(id)?.kind === 'main')
    const st = first ? STAGE_CALLBACK[m.stage]?.find(c => c.when(state) && !said.has(c.key)) : undefined
    if (st) return st.key
  }
  const own = `feel.v.${m.id}.accept`
  if (own in STORY_WORDS && (m.kind !== 'standing' || !said.has(own))) return own
  if (m.stage === 'child') return null
  for (let i = 1; i <= 3; i++) { const k = `feel.v.stage.${m.stage}.${i}`; if (!said.has(k)) return k }
  return null
}
/** what he says at the end: the mission's own clean / slip line, else the plain one */
export function endVoice(m: Mission, slip: boolean): string {
  const own = `feel.v.${m.id}.${slip ? 'slip' : 'clean'}`
  return own in STORY_WORDS ? own : `feel.v.${slip ? 'slip' : 'clean'}`
}

/** the recap at the end of a stage: the ways he chose, what went in the Box, who stood by him, his Heart */
export type Recap = {stage: StageId; age: number; ways: {mission: string; approach: string}[]; keeps: string[]; people: {who: string; n: number}[]; heart: number; slips: number}
export function recapOf(state: StoryState, stage: StageId): Recap {
  const ways = state.done.map(id => missionById(id)).filter((m): m is Mission => !!m && m.kind === 'main' && m.stage === stage)
    .map(m => ({mission: m.id, approach: String(state.flags[`story:how:${m.id}`] ?? '')}))
  const people = Object.entries(state.bonds).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([who, n]) => ({who, n}))
  const slips = Object.keys(state.flags).filter(k => k.startsWith('feel:slip:') && state.flags[k]).length
  return {stage, age: state.age, ways, keeps: [...state.keeps], people, heart: heartOf(state), slips}
}
