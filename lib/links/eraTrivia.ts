import 'server-only'

import { ROUND_LENGTH, eligible } from '@/lib/game/trivia'

/**
 * An ERA round of gate 2 — `/trivia/general?era=<decade>` — offered only when the gate can
 * actually deal a full round of that decade (ROUND_LENGTH questions after its own filters).
 * One place asks, so the Cross Gate Router (`actions.ts`) and the LIFE recap (§11,
 * `lib/life/bridge.ts`) can never disagree about whether an era is servable.
 */
const depth = new Map<number, number>()

export function eraServable(decade: number): boolean {
  if (!Number.isInteger(decade) || decade % 10 !== 0) return false
  if (!depth.has(decade)) depth.set(decade, eligible({ topic: null, decade, hard: false }).length)
  return (depth.get(decade) ?? 0) >= ROUND_LENGTH
}

export function eraTriviaHref(year: number | null | undefined): string | null {
  if (typeof year !== 'number' || !Number.isFinite(year)) return null
  const decade = Math.floor(year / 10) * 10
  return eraServable(decade) ? `/trivia/general?era=${decade}` : null
}
