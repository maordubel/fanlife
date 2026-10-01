import 'server-only'
import {randomBytes} from 'node:crypto'
import type {Filter} from './bank'
import type {RunStatus} from './types'
import {SCORING_VERSION} from './scoring'
export type SoloQuestion={id:string;version:number;targetPlayerId:string;clueIds:string[]}
export type RunState = {
  v: 1
  rid: string
  mode: 'solo' | 'daily'
  qid: string
  qv: number
  day?: string
  filter: Filter
  started: number
  finished: number | null
  shown: number
  wrong: number
  tried: string[]
  status: RunStatus
  caught: number | null
  sv: number
  /** the last solo questions dealt to this device, so the next one is new */
  recent: string[]
}

const RECENT = 40

export function newRun(
  mode: 'solo' | 'daily',
  q: SoloQuestion,
  now: number,
  opts: { filter?: Filter; day?: string; recent?: readonly string[] } = {},
): RunState {
  return {
    v: 1,
    rid: randomBytes(6).toString('hex'),
    mode,
    qid: q.id,
    qv: q.version,
    day: opts.day,
    filter: opts.filter ?? 'all',
    started: now,
    finished: null,
    shown: 1,
    wrong: 0,
    tried: [],
    status: 'playing',
    caught: null,
    sv: SCORING_VERSION,
    recent: [q.id, ...(opts.recent ?? []).filter((id) => id !== q.id)].slice(0, RECENT),
  }
}

export function giveUp(state: RunState, now: number): RunState {
  if (state.status !== 'playing') return state
  return { ...state, status: 'gave_up', finished: now }
}

export function createSoloEngine(deps:{questionById:(id:string)=>SoloQuestion|null;isPlayerId:(id:string)=>boolean}){
function reveal(state: RunState, have: number): RunState {
  const q = deps.questionById(state.qid)
  if (!q || state.status !== 'playing' || have !== state.shown || state.shown >= q.clueIds.length) return state
  return { ...state, shown: state.shown + 1 }
}

function guess(state: RunState, playerId: string, now: number): { state: RunState; correct: boolean | null } {
  const q = deps.questionById(state.qid)
  if (!q || state.status !== 'playing' || !deps.isPlayerId(playerId)) return { state, correct: null }
  if (playerId === q.targetPlayerId) {
    return { state: { ...state, status: 'solved', finished: now, caught: state.shown }, correct: true }
  }
  if (state.tried.includes(playerId)) return { state, correct: false }
  return { state: { ...state, wrong: state.wrong + 1, tried: [...state.tried, playerId].slice(-30) }, correct: false }
}

return {reveal,guess}
}
