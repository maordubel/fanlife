/**
 * ציר הזמן — the client half.
 *
 * `lib/game/timeline.ts` reads the archive and hashes ids, so it is `server-only` and
 * imports `node:crypto`. A client component that pulls even one VALUE out of it — the
 * run length, say — drags the whole module into the browser bundle and the build fails.
 * Types erase at compile time and are safe; constants are not.
 *
 * So the pure half lives here, the same split `hate.ts`/`hate-run.ts` and
 * `goal.ts`/`goal-zones.ts` already use. Nothing in this file knows what a fact is.
 */

export type BlindCard = { id: string; title: string; hint: string }
export type DatedCard = BlindCard & { on: string }

/** Ten placements to a run. The board ends eleven long, counting the opening anchor. */
export const TIMELINE_LENGTH = 10

/**
 * Seconds on the clock, tightening every four cards.
 *
 * The board grows as the run goes, so the LAST card is chosen from eleven gaps while
 * the first is chosen from two. The clock tightening on top of that is what makes the
 * back half of a run feel different from the front half rather than merely longer.
 */
const SECONDS = [22, 18, 14] as const

export function secondsFor(placed: number): number {
  return SECONDS[Math.min(SECONDS.length - 1, Math.floor(placed / 4))] ?? 14
}

/** dd.mm.yyyy — the form the rest of this app prints dates in. */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return day && month && year ? `${day}.${month}.${year}` : iso
}
