'use server'

import { cookies } from 'next/headers'

import { dailyQuestion, questionById, todayInIsrael } from '@/lib/game/blind-cow/bank'
import { newRun, type RunState } from '@/lib/game/blind-cow/engine'
import { open, seal } from '@/lib/game/blind-cow/token'
import { isChallengeGate, type ChallengeDraft, type ChallengeParams, type ChallengeResult } from '@/lib/challenges/contract'
import { gateHref } from '@/lib/challenges/create'
import { land, mintCode } from '@/lib/challenges/runs'
import { openQuestion, sealQuestion } from '@/lib/challenges/seal'

/**
 * The two server steps a challenge needs (ONE RED WORLD §9, §44).
 *
 *   · **mint** — the share row asks for a code once the run is over. The server takes
 *     the run's fingerprint from the gate's own deal (`runs.ts`), and for gate 10 it
 *     reads the FINISHED run from the sealed cookie itself and seals the man — the
 *     browser never held him while playing and does not hand him over here.
 *   · **start** — gate 10 has no seed to put in a URL, so the landing asks the server to
 *     open the same man as a fresh solo run on this device (the same sealed cookie the
 *     gate resumes from). Every other gate is reproduced by its URL alone.
 */

const COOKIE = { solo: 'bc_solo', daily: 'bc_daily' } as const

function finishedRun(): RunState | null {
  for (const name of [COOKIE.solo, COOKIE.daily]) {
    const state = open<RunState>(cookies().get(name)?.value)
    if (state && state.v === 1 && state.status !== 'playing') return state
  }
  return null
}

export async function mintChallengeAction(draft: ChallengeDraft): Promise<string | null> {
  if (!draft || !isChallengeGate(draft.gate)) return null
  if (draft.gate !== 10) return mintCode(draft)
  // gate 10: the man and the count come from the server's own record of the run
  const run = finishedRun()
  if (!run) return null
  const params: ChallengeParams = run.mode === 'daily' && run.day ? { day: run.day } : { sealed: sealQuestion({ q: run.qid, qv: run.qv }) }
  const status = run.status === 'solved' ? 'solved' : run.status === 'timeout' ? 'timeout' : 'gave_up'
  const result: ChallengeResult = { gate: 10, hints: Math.max(1, Math.min(10, run.shown)), wrong: Math.min(99, run.wrong), status }
  return mintCode({ gate: 10, mode: run.mode === 'daily' ? 'daily' : 'same-run', params, result })
}

/**
 * Gate 10's landing: open the challenged man as a solo run and say where to go. A daily
 * opened ON its day is simply the daily; any other day, the same question as a solo run.
 */
export async function startBlindCowChallenge(code: string): Promise<string | null> {
  const landing = land(code)
  if (!landing || landing.challenge.gate !== 10) return null
  const { challenge } = landing
  const keep = landing.comparable ? code : null
  if (challenge.params.day && challenge.params.day === todayInIsrael()) return gateHref(challenge, keep)
  const sealed = challenge.params.sealed ? openQuestion(challenge.params.sealed) : null
  const q = sealed ? questionById(sealed.q) : challenge.params.day ? dailyQuestion(challenge.params.day) : null
  if (!q) return '/blind-cow'
  const previous = open<RunState>(cookies().get(COOKIE.solo)?.value)
  const state = newRun('solo', q, Date.now(), { filter: 'all', recent: previous?.recent ?? [] })
  cookies().set(COOKIE.solo, seal(state), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return gateHref({ ...challenge, mode: 'same-run' }, keep)
}
