import 'server-only'

import { dailyQuestion, questionById } from '@/lib/game/blind-cow/bank'
import { dealRun, goalYears } from '@/lib/game/goal'
import { dealChallenge } from '@/lib/game/lineup'
import { buildRound } from '@/lib/game/memory'
import { royalRumbleRoundDrafts } from '@/lib/game/royal-rumble'
import { dealThreadRun } from '@/lib/game/thread'
import { dealTimelineRun } from '@/lib/game/timeline'
import { questionTopic, resolveTopic } from '@/lib/game/topics'
import { dealSeededRun } from '@/lib/game/trivia'

import type { Challenge, ChallengeDraft } from './contract'
import { createChallenge, encodeChallenge, gateHref } from './create'
import { resolveChallenge, type Resolution } from './resolve'
import { openQuestion } from './seal'
import { entityHash, fingerprintOf } from './wire'

/**
 * THE RUN, ON THE SERVER — what a challenge's seed actually deals, and whether it still
 * deals what it dealt when the link was made.
 *
 * Every deal here is the gate's OWN deal function with the gate's own arguments (the
 * page files read the same `seed`/`r`), so "the challenge reproduces the run" is not a
 * second implementation agreeing with itself (rule 77) — it is the same function called
 * twice, and `tests/challenges.test.ts` sweeps 500 seeds per gate to hold it.
 */

type Round = { seed: number; cursor: number }

function round(challenge: Pick<Challenge, 'seed' | 'cursor'>): Round | null {
  return challenge.seed === undefined ? null : { seed: challenge.seed, cursor: challenge.cursor ?? 0 }
}

/** A pinned goal travels as a hash (its id names the scorer); this turns it back. */
export function goalFromHash(hash: string | null | undefined): string | null {
  if (!hash) return null
  return goalYears().find((row) => entityHash(row.id) === hash)?.id ?? null
}

export function goalHashOf(goalId: string | null | undefined): string | undefined {
  return goalId ? entityHash(goalId) : undefined
}

/** The ids the gate deals for this challenge, in the order it deals them — or null. */
export function dealtIds(challenge: Pick<Challenge, 'gate' | 'seed' | 'cursor' | 'params'>): string[] | null {
  const p = challenge.params
  if (challenge.gate === 1) return null
  if (challenge.gate === 10) {
    if (p.sealed) {
      const sealed = openQuestion(p.sealed)
      const q = sealed ? questionById(sealed.q) : null
      return q && sealed ? [q.id, String(sealed.qv)] : null
    }
    const q = p.day ? dailyQuestion(p.day) : null
    return q ? [q.id, String(q.version)] : null
  }
  const at = round(challenge)
  if (!at) return null
  switch (challenge.gate) {
    case 2: {
      const topic = resolveTopic(p.topic ?? 'general')
      if (!topic) return null
      return dealSeededRun({ topic: questionTopic(topic), decade: p.era ?? null, hard: Boolean(p.hard) }, at.seed, at.cursor).ids
    }
    case 3: {
      const dealt = dealChallenge(at.seed, at.cursor)
      return dealt ? [dealt.matchId, ...dealt.bank.map((locker) => locker.id)] : null
    }
    case 6:
      return buildRound(at.seed, 6, at.cursor).cards.map((card) => card.id)
    case 8: {
      const pin = p.goalHash ? goalFromHash(p.goalHash) : null
      if (p.goalHash && !pin) return null
      return dealRun(at.seed, at.cursor, pin).map((goal) => goal.goalId)
    }
    case 9: {
      const { draft, shuffleDraft } = royalRumbleRoundDrafts(at.seed, at.cursor)
      return [draft, shuffleDraft].flatMap((d) => [String(d.seed), ...d.slots.flatMap((slot) => slot.offers.map((offer) => offer.player.slug))])
    }
    case 13:
      if (p.variant === 'order') {
        const deal = dealTimelineRun(at.seed, at.cursor)
        return [deal.anchor.id, ...deal.queue.map((card) => card.id)]
      }
      return dealThreadRun(at.seed, at.cursor)
    default:
      return null
  }
}

export function runFingerprint(challenge: Pick<Challenge, 'gate' | 'seed' | 'cursor' | 'params'>): string | null {
  const ids = dealtIds(challenge)
  return ids && ids.length > 0 ? fingerprintOf(ids) : null
}

/**
 * A draft → the code a link carries, with the run's fingerprint taken now. Null when the
 * draft names a run the gate does not deal (an unknown topic, a held goal, an unsealed
 * gate-10 draft) — the share row then falls back to the plain same-seed link.
 */
export function mintCode(draft: ChallengeDraft, now: number = Date.now()): string | null {
  const probe = createChallenge(draft, { now })
  if (draft.gate === 10 && !probe.params.sealed && !probe.params.day) return null
  const fingerprint = draft.gate === 1 ? null : runFingerprint(probe)
  if (draft.gate !== 1 && !fingerprint) return null
  const challenge = createChallenge(draft, { now, fingerprint })
  const code = encodeChallenge(challenge)
  // what goes out must come back: a draft the whitelist would refuse is not a link
  return resolveChallenge(code, now) ? code : null
}

export type Landing = Resolution & {
  /** where the landing forwards: the gate, with `ch` only when the comparison is honest */
  target: string
}

/** The landing's whole decision: is the link real, is the run still that run, where to. */
export function land(code: string, now: number = Date.now()): Landing | null {
  const resolved = resolveChallenge(code, now)
  if (!resolved) return null
  let { comparable, reason } = resolved
  const { challenge } = resolved
  if (comparable && challenge.fingerprint && runFingerprint(challenge) !== challenge.fingerprint) {
    comparable = false
    reason = 'drift'
  }
  return { challenge, comparable, reason, target: gateHref(challenge, comparable ? code : null) }
}
