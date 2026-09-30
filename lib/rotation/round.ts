import { mintSeed, readCursor, readSeed } from './deck'

/**
 * הסבב שהמסך משחק — read once, in the route, from the query string.
 *
 * Two numbers and one fact about them:
 *
 *   · **`seed`** — which shuffle. Absent from the URL means *deal me a fresh one*, and
 *     the fresh one is minted HERE, on the server, per request. That alone is what
 *     makes the site stop repeating itself: before this, every route fell back to a
 *     hardcoded constant (`|| 1`, `|| 2`, `|| 7`, `|| 11`) and every entry link on the
 *     wall pinned that same constant, so the app served one round per gate to everybody,
 *     for ever. It also means a visitor with JavaScript switched off still gets a
 *     different round every time.
 *   · **`cursor`** — how far into that shuffle. Set by the device from its own record
 *     (`lib/profile/store.ts`), so "שוב" deals the NEXT slice rather than the one just
 *     played.
 *   · **`pinned`** — the URL named a seed, so this round was chosen by somebody: a
 *     challenge link, a share, a bookmark, the back button. **A pinned round is played
 *     exactly as written and never re-rolled**, which is the one exception Maor asked
 *     for by name — a personal duel has to be the same questions for both people.
 *
 * `?from=share` is already produced by `lib/share/copy.ts`; it is read nowhere and is
 * not read here either. Whether a round is pinned is decided by whether a seed is on
 * the URL, which is true for a shared link and for a bookmark alike — and both should
 * behave the same way.
 */
export type Round = {
  seed: number
  cursor: number
  pinned: boolean
}

export function roundFrom(params: {
  seed?: string | string[]
  r?: string | string[]
}): Round {
  const pinned = params.seed !== undefined && Number(params.seed) > 0
  return {
    seed: readSeed(params.seed, mintSeed),
    cursor: pinned ? readCursor(params.r) : 0,
    pinned,
  }
}
