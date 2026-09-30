import { t, type MessageKey } from '@/lib/i18n'

import { tierFromShare, type ResultTier } from '@/lib/voice'

import { GOOD_SCORE, type ReplayJudgement, type TouchVerdict } from './judge'
import type { ReplayAction } from './vocab'

/**
 * הפספוס המרכזי — gate 8's key mismatch, in words (ONE RED WORLD §17).
 *
 * The result used to lead with a similarity percentage. The plan asks for a sentence a
 * supporter would say: "המסירה השנייה ברחה קצת". So out of the judgement's touch lines this
 * picks the ONE that cost the most — the lowest-scored line that was not already good — and
 * names it the way the move names it: the archive's verb for that touch, its place in the
 * move, and what went wrong (a man, a verb, a place, a touch left out, one added).
 *
 * Pure and client-safe: it reads a verdict the player already earned (the whistle has
 * blown), and every word comes from the catalogue. No miss → null, and the result says
 * "ככה זה קרה." instead.
 */

export type MismatchKind = 'near' | 'far' | 'who' | 'verb' | 'missing' | 'extra'

export type Mismatch = {
  kind: MismatchKind
  /** the archive's verb for the touch (the player's, for an invented one) */
  action: ReplayAction | null
  /** 1-based place in the archive's move; null for an invented touch */
  place: number | null
  /** the man the archive gives the touch to — for `who` only */
  name: string | null
}

/** Grammatical gender of each verb's noun (מסירה, כדרור …) — the ordinal and verb agree with it. */
const MASCULINE: ReadonlySet<ReplayAction> = new Set<ReplayAction>(['throughBall', 'dribble'])

function rank(line: TouchVerdict): number {
  // a touch left out of the move costs the whole touch; an invented one costs less than
  // one the player placed badly — the move still happened the way it happened
  if (line.kind === 'missing') return -1
  if (line.kind === 'extra') return 50
  return line.score
}

export function keyMismatch(judgement: Pick<ReplayJudgement, 'touches'> | null | undefined): Mismatch | null {
  const lines = (judgement?.touches ?? []).filter((line) => line.kind !== 'matched' || line.grade !== 'good')
  if (lines.length === 0) return null
  const worst = [...lines].sort((a, b) => rank(a) - rank(b) || (a.truthIndex ?? 99) - (b.truthIndex ?? 99))[0]!
  const place = worst.truthIndex === null ? null : worst.truthIndex + 1
  if (worst.kind === 'missing') return { kind: 'missing', action: worst.truthAction, place, name: null }
  if (worst.kind === 'extra') return { kind: 'extra', action: worst.userAction, place: null, name: null }
  if (worst.playerRight === false && worst.truthActorHe && worst.truthActorKind !== 'unnamed') {
    return { kind: 'who', action: worst.truthAction, place, name: worst.truthActorHe }
  }
  if (!worst.actionRight) return { kind: 'verb', action: worst.truthAction, place, name: null }
  return { kind: worst.grade === 'near' ? 'near' : 'far', action: worst.truthAction, place, name: null }
}

/** The sentence. `null` when there is no miss, or the verb/place cannot be named honestly. */
export function mismatchLine(miss: Mismatch | null): string | null {
  if (!miss) return null
  if (miss.kind === 'extra') return t('goalMiss.extra')
  if (!miss.action || miss.place === null || miss.place < 1 || miss.place > 5) return null
  const gender = MASCULINE.has(miss.action) ? 'm' : 'f'
  const vars = {
    noun: t(`goalMiss.noun.${miss.action}` as MessageKey),
    ord: t(`goalMiss.ord.${gender}.${miss.place}` as MessageKey),
    name: miss.name ?? '',
  }
  if (miss.kind === 'verb') return t('goalMiss.verb', vars)
  return t(`goalMiss.${miss.kind}.${gender}` as MessageKey, vars)
}

/**
 * How one rebuilt goal went, as the voice's tier: nothing missed and a good move is
 * "ככה זה קרה." (perfect); a good move with one thing off is "הרגע היה שם." (near); below
 * the good line the share of the move decides. The line never falls up (`TIER_FALLBACK`).
 */
export function goalTier(overall: number, miss: Mismatch | null): ResultTier {
  if (overall >= GOOD_SCORE) return miss ? 'near' : 'perfect'
  return tierFromShare(overall / 100)
}
