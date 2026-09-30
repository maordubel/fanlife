/**
 * מי משיג את הכרטיסים — the one fact the whole life is hung on.
 *
 * The canon has two ends and they are the same act pointing opposite ways:
 *
 *   1983  somebody got the tickets and carried a five-year-old in.
 *   2026  that five-year-old gets the tickets and carries the man who carried him.
 *
 * Everything between those two afternoons is the game. Which means the reversal only
 * lands if 1983 is a thing the SAVE remembers, not a thing a closing scene asserts forty
 * years later — a 2026 chapter that simply prints "and this time you got them" is a
 * caption, not a payoff, and the player has no way to tell it from a sentence the writer
 * made up on the spot.
 *
 * So the prologue writes `own:tickets-1983` with a VALUE, and this module is the only
 * thing allowed to read it. A boolean could not answer the question 2026 asks, which is
 * not "were there tickets" but WHO HELD THEM.
 *
 * The `own:` prefix is load-bearing: `personFlags()` in `events.ts` erases every flag at
 * a year change except a named handful, and `own:` is one of them. A fact meant to
 * survive forty-three years of chapter cuts has to be spelled with a prefix that survives
 * one. `tests/life-tickets.test.ts` proves it does, by folding the years rather than by
 * trusting this paragraph.
 */

import type { LifeState } from './types'

/** Who carried the tickets in 1983. Written once, by the prologue, and never again. */
export const TICKETS_1983 = 'own:tickets-1983'

/** Whether the child came home with the torn half in his pocket. */
export const STUB_1983 = 'own:stub-1983'

/**
 * Who gets them at the other end. NOT YET WRITTEN BY ANY CHAPTER — the closing chapter
 * does not exist yet (`chapters.ts` ends on `2000-double`, `next: null`).
 *
 * It is declared here anyway, and that is the point of the file: the contract is written
 * down before the scene is, so whoever writes 2026 inherits the requirement instead of
 * inventing a variation on it. The test asserts the 1983 half survives; it does not
 * pretend the 2026 half is built.
 */
export const TICKETS_2026 = 'own:tickets-2026'

export type TicketHolder = 'kobi' | 'player' | null

function holder(state: LifeState, flag: string): TicketHolder {
  const value = state.flags[flag]
  return value === 'kobi' || value === 'player' ? value : null
}

/** Who held the tickets on 1.6.1983. `null` on a save written before this beat shipped. */
export function ticketsIn1983(state: LifeState): TicketHolder {
  return holder(state, TICKETS_1983)
}

/** Who holds them at the end. `null` until the closing chapter is written. */
export function ticketsIn2026(state: LifeState): TicketHolder {
  return holder(state, TICKETS_2026)
}

/** Did he keep the torn half? */
export function keptStub(state: LifeState): boolean {
  return state.flags[STUB_1983] === true
}

/**
 * The reversal, as a question rather than as a sentence.
 *
 * `true` only when both ends are on file AND they point opposite ways. A save where 1983
 * is missing (written before this shipped) answers `false` — it does not guess, because
 * an old save is not evidence that nobody carried him, only that the game was not
 * watching yet. Rule 11 applies to our own saves as much as to the archive.
 */
export function reversalComplete(state: LifeState): boolean {
  return ticketsIn1983(state) === 'kobi' && ticketsIn2026(state) === 'player'
}
