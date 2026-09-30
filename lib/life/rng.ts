import type { LifeState, SeededRandomState } from './types'

/**
 * המקריות — random, and reproducible, and never applied to history.
 *
 * Two requirements pull in opposite directions. A second playthrough has to feel
 * different, so encounters must vary. A bug report has to be reproducible, so the same
 * save must roll the same numbers. The answer is the oldest one there is: the randomness
 * is a pure function of a seed and a cursor, and both live in the save.
 *
 * That means QA can be handed a seed and see exactly what the player saw, and it means a
 * player who reloads cannot re-roll the same moment until they like the result — the
 * cursor advanced, and the cursor is in the log.
 *
 * `mulberry32` because it is eleven lines, has no dependency, passes the statistical
 * tests that matter for picking a card off a weighted list, and produces identical
 * numbers in Node and in every browser. Nothing here needs cryptography.
 */

function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

// The two constants are written in decimal, not hex. They are arithmetic, not colour —
// but a six-digit `0x` literal anywhere under `lib/life/` fails the palette guard, and a
// guard that has to learn about exceptions is a guard on its way to being switched off.
const MULBERRY_STEP = 1831565813
const GOLDEN_STEP = 2654435761

function mulberry32(a: number): number {
  let t = (a + MULBERRY_STEP) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** The nth number this seed produces. Pure: the same pair always gives the same value. */
export function rollAt(seed: string, cursor: number): number {
  return mulberry32((hashSeed(seed) + cursor * GOLDEN_STEP) >>> 0)
}

/**
 * A cursor you can advance without writing to the log on every peek.
 *
 * The engine dispatches ONE `rng.consumed` event when a decision is made, rather than one
 * per number — a weighted pick that reads four values is one advance of four, which keeps
 * the log readable and the save small.
 */
export class Roller {
  private used = 0

  constructor(private readonly rng: SeededRandomState) {}

  next(): number {
    const value = rollAt(this.rng.seed, this.rng.cursor + this.used)
    this.used += 1
    return value
  }

  /** `[low, high)` as an integer. */
  int(low: number, high: number): number {
    if (high <= low) return low
    return low + Math.floor(this.next() * (high - low))
  }

  chance(probability: number): boolean {
    return this.next() < probability
  }

  pick<T>(items: readonly T[]): T | null {
    if (items.length === 0) return null
    return items[Math.floor(this.next() * items.length)] ?? null
  }

  /** Weighted pick. A zero or negative weight is simply not in the hat. */
  weighted<T>(items: readonly T[], weightOf: (item: T) => number): T | null {
    const pool = items.filter((item) => weightOf(item) > 0)
    if (pool.length === 0) return null
    const total = pool.reduce((sum, item) => sum + weightOf(item), 0)
    let target = this.next() * total
    for (const item of pool) {
      target -= weightOf(item)
      if (target <= 0) return item
    }
    return pool[pool.length - 1] ?? null
  }

  /** How many numbers were taken — the count to put in the event. */
  get consumed(): number {
    return this.used
  }
}

export function rollerFor(state: LifeState): Roller {
  return new Roller(state.rng)
}

/**
 * A seed for a brand new life.
 *
 * Human-readable on purpose: it is printed in the debug panel and quoted in bug reports,
 * and "1986-fq7k2" is a thing somebody can type back. Uses `Math.random` exactly once
 * per life, at the only moment where non-determinism is correct.
 */
export function freshSeed(year: number): string {
  return `${year}-${Math.random().toString(36).slice(2, 8)}`
}
