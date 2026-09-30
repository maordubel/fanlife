import {
  DAY,
  HASH,
  LIMITS,
  PROMPT,
  SCORING_VERSION,
  SEALED,
  TOPIC,
  isChallengeGate,
  type Challenge,
  type ChallengeGate,
  type ChallengeParams,
  type ChallengeResult,
} from './contract'
import { MODE_OF, encodeChallenge } from './create'
import { challengeState } from './expiry'
import { fingerprintOf, marksOf, unpackJson } from './wire'

/**
 * RESOLVE — a code from a URL becomes a challenge, or nothing. Client-safe.
 *
 * The same discipline as `lib/og/params.ts`: every field is a bounded number, a closed
 * word or an opaque hash, and anything else makes the WHOLE challenge null rather than a
 * half-read one — a result with one field dropped would compare something the challenger
 * never did (§33: no fake stats). The server half (the run's fingerprint, gate 10's seal)
 * is `runs.ts`.
 */

type Raw = Record<string, unknown>

const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)

function int(v: unknown, min: number, max: number): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null
}

function hashes(v: unknown, max: number, min = 0): string[] | null {
  if (!Array.isArray(v) || v.length > max || v.length < min) return null
  if (!v.every((h) => typeof h === 'string' && HASH.test(h))) return null
  return v as string[]
}

function ints(v: unknown, max: number, lo: number, hi: number, min = 0): number[] | null {
  if (!Array.isArray(v) || v.length > max || v.length < min) return null
  const out = v.map((n) => int(n, lo, hi))
  return out.every((n): n is number => n !== null) ? out : null
}

function bits(raw: Raw, max: number): boolean[] | null {
  const n = int(raw.n, 1, max)
  if (n === null || typeof raw.k !== 'string') return null
  return marksOf(raw.k, n)
}

function readParams(raw: unknown): ChallengeParams | null {
  if (raw === undefined) return {}
  if (!isObj(raw)) return null
  const out: ChallengeParams = {}
  for (const [key, value] of Object.entries(raw)) {
    switch (key) {
      case 't':
        if (typeof value !== 'string' || !TOPIC.test(value)) return null
        out.topic = value
        break
      case 'e': {
        const era = int(value, 1920, 2030)
        if (era === null || era % 10 !== 0) return null
        out.era = era
        break
      }
      case 'hd':
        if (value !== 1) return null
        out.hard = true
        break
      case 'gh':
        if (typeof value !== 'string' || !HASH.test(value)) return null
        out.goalHash = value
        break
      case 'pr':
        if (typeof value !== 'string' || !PROMPT.test(value)) return null
        out.prompt = value
        break
      case 'd':
        if (typeof value !== 'string' || !DAY.test(value)) return null
        out.day = value
        break
      case 'q':
        if (typeof value !== 'string' || !SEALED.test(value)) return null
        out.sealed = value
        break
      case 'tv':
        if (value !== 't' && value !== 'o') return null
        out.variant = value === 't' ? 'thread' : 'order'
        break
      default:
        return null
    }
  }
  return out
}

function readResult(gate: ChallengeGate, raw: unknown, params: ChallengeParams): ChallengeResult | null {
  if (!isObj(raw)) return null
  switch (gate) {
    case 1: {
      const picks = hashes(raw.p, LIMITS.xi, 1)
      const captain = raw.c === undefined ? null : typeof raw.c === 'string' && HASH.test(raw.c) ? raw.c : undefined
      const twelfth = raw.t === undefined ? null : typeof raw.t === 'string' && HASH.test(raw.t) ? raw.t : undefined
      if (!picks || captain === undefined || twelfth === undefined) return null
      return { gate: 1, picks, captain, twelfth }
    }
    case 2: {
      const marks = bits(raw, LIMITS.trivia)
      return marks ? { gate: 2, marks } : null
    }
    case 3: {
      const found = bits(raw, LIMITS.lineup)
      return found ? { gate: 3, found } : null
    }
    case 6: {
      const moves = int(raw.mv, 0, LIMITS.movesMax)
      const misses = int(raw.ms, 0, LIMITS.movesMax)
      const order = hashes(raw.o, LIMITS.memoryPairs)
      const perfect = hashes(raw.pf, LIMITS.memoryPairs)
      if (moves === null || misses === null || !order || !perfect) return null
      return { gate: 6, moves, misses, order, perfect }
    }
    case 8: {
      const accuracy = ints(raw.a, LIMITS.goals, 0, 100, 1)
      if (!accuracy || !Array.isArray(raw.z) || raw.z.length !== accuracy.length) return null
      const routes = raw.z.map((r) => ints(r, LIMITS.routeSteps, 0, LIMITS.zoneMax))
      if (!routes.every((r): r is number[] => r !== null)) return null
      return { gate: 8, accuracy, routes }
    }
    case 9: {
      const picks = hashes(raw.p, LIMITS.rumble, 1)
      return picks ? { gate: 9, picks } : null
    }
    case 10: {
      const hints = int(raw.h, 1, LIMITS.hints)
      const wrong = int(raw.w, 0, LIMITS.wrongMax)
      const status = raw.st === 's' ? 'solved' : raw.st === 'g' ? 'gave_up' : raw.st === 't' ? 'timeout' : null
      if (hints === null || wrong === null || !status) return null
      return { gate: 10, hints, wrong, status }
    }
    case 13: {
      if (raw.v === 'o' && params.variant === 'order') {
        const marks = bits(raw, LIMITS.timeline)
        return marks ? { gate: 13, variant: 'order', marks } : null
      }
      if (raw.v === 't' && params.variant === 'thread') {
        const solved = bits(raw, LIMITS.threadLevels)
        const steps = ints(raw.st, LIMITS.threadLevels, 0, LIMITS.stepsMax)
        if (!solved || !steps || steps.length !== solved.length) return null
        return { gate: 13, variant: 'thread', steps, solved }
      }
      return null
    }
  }
}

/** A code → a challenge, or null. Nothing half-read survives. */
export function decodeChallenge(code: string | null | undefined): Challenge | null {
  if (typeof code !== 'string') return null
  const raw = unpackJson(code)
  if (!isObj(raw) || raw.v !== 1) return null
  const allowed = new Set(['v', 'g', 'm', 's', 'r', 'p', 'f', 'i', 'sv', 'x'])
  if (Object.keys(raw).some((key) => !allowed.has(key))) return null
  if (!isChallengeGate(raw.g)) return null
  const gate = raw.g
  const mode = typeof raw.m === 'string' ? MODE_OF[raw.m] : undefined
  if (!mode) return null
  const seed = raw.s === undefined ? undefined : int(raw.s, 1, LIMITS.seedMax)
  const cursor = raw.r === undefined ? undefined : int(raw.r, 1, LIMITS.cursorMax)
  if (seed === null || cursor === null) return null
  const params = readParams(raw.p)
  if (!params) return null
  const fingerprint = raw.f === undefined ? undefined : typeof raw.f === 'string' && /^[0-9a-z]{6}$/.test(raw.f) ? raw.f : null
  if (fingerprint === null) return null
  const issued = int(raw.i, 19_000, 60_000)
  const scoringVersion = int(raw.sv, 1, 999)
  if (issued === null || scoringVersion === null) return null
  const result = raw.x === undefined ? undefined : readResult(gate, raw.x, params)
  if (result === null) return null
  // a round-based gate must name its round; gate 1 (prompt) and gate 10 (sealed / daily) do not
  if (gate !== 1 && gate !== 10 && seed === undefined) return null
  if (gate === 10 && !params.sealed && !params.day) return null
  if (gate === 13 && !params.variant) return null
  const challenge: Challenge = {
    id: '',
    gate,
    mode,
    ...(seed !== undefined ? { seed } : {}),
    ...(cursor !== undefined ? { cursor } : {}),
    params,
    ...(fingerprint ? { fingerprint } : {}),
    issued,
    scoringVersion,
    ...(result ? { result } : {}),
  }
  // the code must be the canonical encoding of what it decodes to — a re-ordered or
  // padded variant of a real link is not the same challenge
  if (encodeChallenge(challenge) !== code) return null
  return { ...challenge, id: fingerprintOf([code]) }
}

export type Resolution = {
  challenge: Challenge
  /** true only when the comparison is honest to draw: same scoring, not expired, same run */
  comparable: boolean
  reason: 'ok' | 'expired' | 'scoring' | 'drift' | 'no-result'
}

/**
 * The client-safe half of resolving: expiry and scoring. `runs.ts` adds the run check on
 * the server (`drift`) — the landing calls both.
 */
export function resolveChallenge(code: string | null | undefined, now: number = Date.now()): Resolution | null {
  const challenge = decodeChallenge(code)
  if (!challenge) return null
  if (!challenge.result) return { challenge, comparable: false, reason: 'no-result' }
  if (challenge.scoringVersion !== SCORING_VERSION[challenge.gate]) return { challenge, comparable: false, reason: 'scoring' }
  if (challengeState(challenge, now) === 'expired') return { challenge, comparable: false, reason: 'expired' }
  return { challenge, comparable: true, reason: 'ok' }
}
