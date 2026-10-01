import {positionOf,takeFrom} from '@/lib/rotation/deck'
import type {Debate} from './debates'
export const DEBATE_ROUND=5
function mulberry32(seed: number): () => number {
  let value = seed >>> 0 || 1
  return () => {
    value = (value + 0x6d2b79f5) >>> 0
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** one shuffle of the bank = one deck */
export function debateDeck(seed: number, pool: readonly Debate[]): Debate[] {
  const random = mulberry32(seed)
  const out = [...pool]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const a = out[i] as Debate
    out[i] = out[j] as Debate
    out[j] = a
  }
  return out
}

export type DebateRound = {
  debates: Debate[]
  /** which slice of the lap, 0-based, and how many a lap holds — for "ויכוח 2 מתוך 5" */
  slot: number
  slices: number
  cycle: number
}

/** the prompts `(seed, cursor)` deals — reproducible, and a new slice for every cursor */
export function debateRound(seed: number, cursor: number, pool: readonly Debate[]): DebateRound {
  const at = positionOf(seed, cursor, pool.length, DEBATE_ROUND)
  const deck = debateDeck(at.seed, pool)
  return { debates: takeFrom(deck, at.slot * DEBATE_ROUND, DEBATE_ROUND), slot: at.slot, slices: at.slices, cycle: at.cycle }
}
