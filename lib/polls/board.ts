import type { MessageKey } from '@/lib/i18n'

import type { Tally, TallyRow } from './ballot'

/**
 * לוח הספירה — the pure arithmetic behind it.
 *
 * Nothing here reads a store, a component or a browser API. It takes whatever
 * `BallotStore.tally()` handed back — which is `null` from every store this build ships,
 * because `LocalBallotStore` has one voter and says so (rule 11) — and turns it into one
 * of three honest shapes. The screen renders the shape; it never decides which one.
 *
 * **The one rule the whole file exists to enforce:** a bar or a percentage is a claim
 * about proportion, and a sample under a hundred does not support one. So the boundary
 * is not a style choice made in a component, it is a function with a name, tested with
 * fixture tallies rather than with seeded rows in the product — see `tests/polls.test.ts`
 * and the "no seeded vote" describe block that checks this file too.
 *
 * Classification (`boardDisplay`) is kept apart from row-shaping (`rankRows`,
 * `histogramBars`, `positionBars`) on purpose: the threshold at 100 is the same for
 * every question, but WHICH rows exist differs by kind — a name question only ever
 * lists names that got a vote, a shirt number has a fixed 1..99 axis, and a position has
 * a fixed eight. Mixing the two would have meant re-deriving that difference inside the
 * one function rule 11 needs to stay simple enough to trust.
 */

/** the fewest ballots a question needs before a percentage means anything (B3, rule 1) */
export const MIN_BALLOTS_FOR_PERCENT = 100

export type BoardDisplay =
  /** no votes yet, or the only vote on record is the one this device cast itself —
   *  never printed as 100%, because a sample of one is not a percentage (B3, rule 3) */
  | { kind: 'honest'; myPick: string | null }
  /** under a hundred: exact counts, no bar, no percent (B3, rule 2) */
  | { kind: 'raw'; total: number; remaining: number; myPick: string | null; myMajority: boolean | null }
  /** a hundred or more: percentages and bars are earned (B3, rule 1) */
  | { kind: 'percent'; total: number; myPick: string | null; myMajority: boolean | null }

/**
 * Classify one question's tally into the shape its card renders.
 *
 * `myPick` is always the pick THIS device already cast — the ballot is sealed before
 * the board is reachable, so every question has one. It is passed in rather than looked
 * up here because this file never touches a store; the caller already has it from the
 * one `store.read()` the screen already does.
 */
export function boardDisplay(tally: Tally | null, myPick: string | null): BoardDisplay {
  const total = tally?.total ?? 0
  const rows = tally?.rows ?? []

  // A single row that is your own pick is not a count of anybody but you — the
  // honesty plate, not a lonely 100%. A single row that is NOT your pick (someone else
  // voted once and you have not) is a real, if tiny, raw count and belongs below.
  const soleVoteIsMine = total === 1 && myPick !== null && rows[0]?.pick === myPick
  if (total === 0 || soleVoteIsMine) {
    return { kind: 'honest', myPick }
  }

  const leadPick = [...rows].sort((a, b) => b.votes - a.votes)[0]?.pick ?? null
  const myMajority = myPick === null || leadPick === null ? null : leadPick === myPick

  if (total < MIN_BALLOTS_FOR_PERCENT) {
    return { kind: 'raw', total, remaining: MIN_BALLOTS_FOR_PERCENT - total, myPick, myMajority }
  }
  return { kind: 'percent', total, myPick, myMajority }
}

export type BoardRow = TallyRow & { pct: number; top: boolean }

/**
 * Rank an arbitrary row set — sorted by votes, percentage computed against `total`, the
 * top three marked. The same function ranks a name list, a shirt-number histogram and a
 * position list alike; only the rows handed in differ.
 */
export function rankRows(rows: readonly TallyRow[], total: number): BoardRow[] {
  return [...rows]
    .sort((a, b) => b.votes - a.votes)
    .map((row, index) => ({
      ...row,
      pct: total > 0 ? Math.round((row.votes / total) * 100) : 0,
      top: index < 3,
    }))
}

/**
 * The shirt-number histogram's full domain — every column the picker offers, whether or
 * not a single ballot landed on it. A histogram that only draws the numbers people
 * picked would draw a different chart shape depending on turnout; the axis has to be
 * fixed by the question, not by the answers that happen to exist yet.
 */
export function histogramBars(
  tally: Tally | null,
  numbers: readonly number[],
): { n: number; votes: number }[] {
  const byNumber = new Map((tally?.rows ?? []).map((row) => [row.pick, row.votes] as const))
  return numbers.map((n) => ({ n, votes: byNumber.get(String(n)) ?? 0 }))
}

/**
 * The eight positions, in the pitch's own order rather than sorted by vote count, so a
 * position with zero picks still holds its place instead of vanishing from the domain —
 * `rankRows` sorts it afterwards for display, but the domain itself is fixed here.
 *
 * Keyed by CODE since 21.9.2026 (a ballot stores `CB`, not `בלם`); run the tally through
 * `mergeLegacyRows` first so a row cast as a Hebrew label lands on its code.
 */
export function positionBars(
  tally: Tally | null,
  positions: readonly { id: string; he: MessageKey }[],
): TallyRow[] {
  const byCode = new Map((tally?.rows ?? []).map((row) => [row.pick, row.votes] as const))
  return positions.map((position) => ({ pick: position.id, votes: byCode.get(position.id) ?? 0 }))
}

/**
 * One key per answer, whatever build cast it.
 *
 * `worker_poll_vote.pick` held display names and Hebrew labels until 21.9.2026 and holds ids and
 * codes after it. `canonical` maps a legacy pick to its id/code (`null` = leave it as it
 * is); rows that land on the same key are ADDED, because they are two ballots for one
 * answer — never de-duplicated, and never dropped when nothing resolves them. The total
 * does not change.
 */
export function mergeLegacyRows(tally: Tally | null, canonical: (pick: string) => string | null): Tally | null {
  if (tally === null) return null
  const merged = new Map<string, number>()
  for (const row of tally.rows) {
    const key = canonical(row.pick) ?? row.pick
    merged.set(key, (merged.get(key) ?? 0) + row.votes)
  }
  return { total: tally.total, rows: [...merged.entries()].map(([pick, votes]) => ({ pick, votes })) }
}
