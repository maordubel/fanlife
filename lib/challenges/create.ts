import { SITE_URL } from '@/lib/brand'

import {
  GATE_ROUTE,
  SCORING_VERSION,
  type Challenge,
  type ChallengeDraft,
  type ChallengeMode,
  type ChallengeParams,
  type ChallengeResult,
} from './contract'
import { bitsOf, dayNumber, entityHash, fingerprintOf, packJson } from './wire'

/**
 * CREATE — a draft from a gate becomes a challenge, and a challenge becomes a link.
 *
 * The link is `/c/<code>`, never the gate's own URL, for two reasons: the landing
 * (`app/c/[code]`) is where the Open Graph card lives, so the preview WhatsApp draws is
 * the challenge rather than the gate's generic page; and the landing is the one place a
 * server can re-check the run before forwarding (`resolve.ts`, `runs.ts`).
 */

/** Hash every entity the result names — the ids never travel (contract.ts). */
export function hashResult(result: ChallengeResult): ChallengeResult {
  switch (result.gate) {
    case 1:
      return {
        gate: 1,
        picks: result.picks.map(entityHash),
        captain: result.captain ? entityHash(result.captain) : null,
        twelfth: result.twelfth ? entityHash(result.twelfth) : null,
      }
    case 6:
      return { ...result, order: result.order.map(entityHash), perfect: result.perfect.map(entityHash) }
    case 9:
      return { gate: 9, picks: result.picks.map(entityHash) }
    default:
      return result
  }
}

function defaultMode(draft: ChallengeDraft): ChallengeMode {
  if (draft.mode) return draft.mode
  if (draft.gate === 1) return 'creation'
  if (draft.gate === 10 && draft.params?.day) return 'daily'
  return 'same-run'
}

export function createChallenge(
  draft: ChallengeDraft,
  opts: { now?: number; fingerprint?: string | null } = {},
): Challenge {
  const base: Omit<Challenge, 'id'> = {
    gate: draft.gate,
    mode: defaultMode(draft),
    ...(draft.seed !== undefined ? { seed: Math.trunc(draft.seed) } : {}),
    ...(draft.cursor !== undefined && draft.cursor > 0 ? { cursor: Math.trunc(draft.cursor) } : {}),
    params: { ...(draft.params ?? {}) },
    ...(opts.fingerprint ? { fingerprint: opts.fingerprint } : {}),
    issued: dayNumber(opts.now),
    scoringVersion: SCORING_VERSION[draft.gate],
    ...(draft.result ? { result: hashResult(draft.result) } : {}),
  }
  return { ...base, id: fingerprintOf([encodeChallenge({ ...base, id: '' })]) }
}

const MODE_CODE: Record<ChallengeMode, string> = {
  'same-run': 'r',
  daily: 'd',
  creation: 'c',
  opinion: 'o',
  duel: 'v',
  group: 'g',
}
export const MODE_OF: Readonly<Record<string, ChallengeMode>> = Object.fromEntries(
  Object.entries(MODE_CODE).map(([mode, code]) => [code, mode as ChallengeMode]),
)

function wireParams(params: ChallengeParams): Record<string, string | number> | undefined {
  const out: Record<string, string | number> = {}
  if (params.topic) out.t = params.topic
  if (params.era) out.e = params.era
  if (params.hard) out.hd = 1
  if (params.goalHash) out.gh = params.goalHash
  if (params.prompt) out.pr = params.prompt
  if (params.day) out.d = params.day
  if (params.sealed) out.q = params.sealed
  if (params.variant) out.tv = params.variant === 'thread' ? 't' : 'o'
  return Object.keys(out).length ? out : undefined
}

function wireResult(result: ChallengeResult): Record<string, unknown> {
  switch (result.gate) {
    case 1:
      return { p: result.picks, ...(result.captain ? { c: result.captain } : {}), ...(result.twelfth ? { t: result.twelfth } : {}) }
    case 2:
      return { k: bitsOf(result.marks), n: result.marks.length }
    case 3:
      return { k: bitsOf(result.found), n: result.found.length }
    case 6:
      return { mv: result.moves, ms: result.misses, o: result.order, pf: result.perfect }
    case 8:
      return { a: result.accuracy, z: result.routes }
    case 9:
      return { p: result.picks }
    case 10:
      return { h: result.hints, w: result.wrong, st: result.status === 'solved' ? 's' : result.status === 'gave_up' ? 'g' : 't' }
    case 13:
      return result.variant === 'order'
        ? { v: 'o', k: bitsOf(result.marks), n: result.marks.length }
        : { v: 't', st: result.steps, k: bitsOf(result.solved), n: result.solved.length }
  }
}

/** The URL segment. Deterministic: the same challenge is always the same code. */
export function encodeChallenge(challenge: Challenge): string {
  const p = wireParams(challenge.params)
  return packJson({
    v: 1,
    g: challenge.gate,
    m: MODE_CODE[challenge.mode],
    ...(challenge.seed !== undefined ? { s: challenge.seed } : {}),
    ...(challenge.cursor ? { r: challenge.cursor } : {}),
    ...(p ? { p } : {}),
    ...(challenge.fingerprint ? { f: challenge.fingerprint } : {}),
    i: challenge.issued,
    sv: challenge.scoringVersion,
    ...(challenge.result ? { x: wireResult(challenge.result) } : {}),
  })
}

export function challengePath(code: string): string {
  return `/c/${code}`
}

export function challengeLink(code: string): string {
  return `${SITE_URL}${challengePath(code)}`
}

/**
 * The gate URL a challenge plays on — only parameters the gate's own route reads, plus
 * `ch` (the challenge, so the gate can draw the comparison once the run is over) when the
 * landing decided the comparison is honest to draw.
 */
export function gateHref(challenge: Challenge, code: string | null): string {
  const q = new URLSearchParams()
  let path = GATE_ROUTE[challenge.gate]
  const p = challenge.params
  if (challenge.gate === 2) path = `/trivia/${p.topic ?? 'general'}`
  if (challenge.gate === 13 && p.variant === 'order') path = '/timeline/order'
  if (challenge.gate === 10 && challenge.mode === 'daily') q.set('mode', 'daily')
  if (challenge.seed !== undefined) q.set('seed', String(challenge.seed))
  if (challenge.cursor) q.set('r', String(challenge.cursor))
  if (p.era) q.set('era', String(p.era))
  if (p.hard) q.set('hard', '1')
  if (p.goalHash) q.set('gh', p.goalHash)
  if (p.prompt) q.set('prompt', p.prompt)
  if (code) q.set('ch', code)
  q.set('from', 'challenge')
  return `${path}?${q.toString()}`
}
