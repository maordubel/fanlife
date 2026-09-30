import type { GateNo } from '@/lib/voice/types'

/**
 * THE CHALLENGE LAYER — the contract (ONE RED WORLD §9, §44). Client-safe.
 *
 * A challenge is a run somebody played, handed to somebody else so they can play the
 * SAME run and then see how the two of them remembered it. It is fully described by its
 * URL — no table, no account, no server record in the MVP (the stand's optional record
 * comes later, §45) — which is also what makes it playable as a guest (§44, §50).
 *
 * Seven gates take a same-run challenge (§44): 10 · 2 · 8 · 6 · 3 · 13 · 9. Gate 1 takes a
 * PROMPT challenge (§10: "Deep link פותח same prompt, לא מעתיק את הבחירות") — the link
 * hands over the rule, never the eleven; the challenger's eleven travel only so the
 * comparison can be drawn once the recipient has picked their own.
 *
 * Three things never travel in a challenge, and `tests/challenges.test.ts` holds all three:
 *   · an answer — gate 10's man is SEALED on the server (`seal.ts`), a pinned goal is a
 *     hash, a lineup travels as ticks per slot and never as names;
 *   · text a card would print — every field is a number, a closed word or an opaque hash,
 *     parsed through a whitelist (`resolve.ts`), so a link cannot make a card say anything;
 *   · who sent it — there is no name, no device id, no account (§35).
 */

/** The gates a challenge can be made of: the seven of §44, and gate 1's prompt. */
export const CHALLENGE_GATES = [1, 2, 3, 6, 8, 9, 10, 13] as const
export type ChallengeGate = (typeof CHALLENGE_GATES)[number]

export function isChallengeGate(value: unknown): value is ChallengeGate {
  return typeof value === 'number' && (CHALLENGE_GATES as readonly number[]).includes(value)
}

/** §9's modes. The URL-only MVP makes the first four; `duel` and `group` stay the DB's. */
export type ChallengeMode = 'same-run' | 'daily' | 'creation' | 'opinion' | 'duel' | 'group'

/**
 * The run as the gate addresses it — only what the gate's own route already reads, plus
 * the two opaque fields a spoiler would otherwise need (`goalHash`, `sealed`).
 */
export type ChallengeParams = {
  /** gate 2 — the topic route segment (`europe`, `general` …) */
  topic?: string
  /** gate 2 — the decade chip, `1990` */
  era?: number
  /** gate 2 — Hard */
  hard?: boolean
  /** gate 8 — a pinned goal, as a hash of its id: the id names the scorer (§44 no spoiler) */
  goalHash?: string
  /** gate 1 — the manager's prompt (`lib/xi/challenge.ts`) */
  prompt?: string
  /** gate 10 — the daily's date, `2026-09-28` */
  day?: string
  /** gate 10 — the man, sealed on the server; unreadable without the key */
  sealed?: string
  /** gate 13 — which of the two boards: the red thread or the order */
  variant?: 'thread' | 'order'
}

/**
 * What the challenger did, as compactly as the comparison needs it and no more (§33:
 * "only what's needed"). Entity lists travel as short HASHES (`entityHash`), never as
 * ids or names: the comparison works in hash space and the gate maps a hash back to a
 * name from its own roster.
 */
export type ChallengeResult =
  | { gate: 1; picks: string[]; captain: string | null; twelfth: string | null }
  | { gate: 2; marks: boolean[] }
  | { gate: 3; found: boolean[] }
  | { gate: 6; moves: number; misses: number; order: string[]; perfect: string[] }
  | { gate: 8; accuracy: number[]; routes: number[][] }
  | { gate: 9; picks: string[] }
  | { gate: 10; hints: number; wrong: number; status: 'solved' | 'gave_up' | 'timeout' }
  | { gate: 13; variant: 'order'; marks: boolean[] }
  | { gate: 13; variant: 'thread'; steps: number[]; solved: boolean[] }

/** §9, as the URL carries it. `id` is derived from the rest, never minted. */
export type Challenge = {
  id: string
  gate: ChallengeGate
  mode: ChallengeMode
  seed?: number
  cursor?: number
  params: ChallengeParams
  /** the run's fingerprint, taken on the server when the link was made (`runs.ts`) */
  fingerprint?: string
  /** the day the link was made — days since 1970-01-01, UTC */
  issued: number
  scoringVersion: number
  /** the challenger's result, already hashed (`create.ts`) */
  result?: ChallengeResult
  /** §9 fields the URL MVP never fills — the stand work adds them */
  entityIds?: string[]
  creatorId?: string
  standId?: string
  expiresAt?: string
}

/** What a gate hands the share row: the round it played and what the player did. */
export type ChallengeDraft = {
  gate: ChallengeGate
  mode?: ChallengeMode
  seed?: number
  cursor?: number
  params?: ChallengeParams
  /** the result with REAL ids — `create.ts` hashes every entity before it travels */
  result?: ChallengeResult
}

/** The route each gate plays on — the target a landing forwards to. */
export const GATE_ROUTE: Readonly<Record<ChallengeGate, string>> = {
  1: '/xi',
  2: '/trivia',
  3: '/lineup',
  6: '/memory',
  8: '/goal',
  9: '/royal-rumble',
  10: '/blind-cow',
  13: '/timeline',
}

/**
 * The scoring each gate's comparison assumes. A change to how a gate counts is a new
 * number here, and a link made under the old number compares nothing (`resolve.ts`) —
 * two results counted two ways are not two results of one thing.
 */
export const SCORING_VERSION: Readonly<Record<ChallengeGate, number>> = {
  1: 1,
  2: 1,
  3: 1,
  6: 1,
  8: 1,
  9: 1,
  10: 1,
  13: 1,
}

/** Bounds, shared by the encoder and the whitelist. */
export const LIMITS = {
  seedMax: 9_999_991,
  cursorMax: 100_000,
  trivia: 12,
  lineup: 11,
  xi: 11,
  memoryPairs: 12,
  goals: 3,
  routeSteps: 16,
  zoneMax: 24,
  rumble: 5,
  hints: 10,
  wrongMax: 99,
  movesMax: 999,
  timeline: 10,
  threadLevels: 12,
  stepsMax: 99,
} as const

/** Opaque short hashes: 5 base36 characters. */
export const HASH = /^[0-9a-z]{5}$/
export const TOPIC = /^[a-z]{2,20}$/
export const DAY = /^\d{4}-\d{2}-\d{2}$/
export const SEALED = /^[A-Za-z0-9_-]{24,400}$/
export const PROMPT = /^[a-z0-9]{2,20}$/

/** Gate number as the voice knows it — every challenge gate is a real gate. */
export function voiceGate(gate: ChallengeGate): GateNo {
  return gate
}
