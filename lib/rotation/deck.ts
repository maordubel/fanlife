/**
 * מנוע הרוטציה — how a gate decides what you get this time.
 *
 * The problem this solves, measured before it was written: **every entry link in the
 * app was pinned to a constant seed.** `TopicWall` linked to `?seed=1`, the gate wall
 * linked to `?seed=1`, `/memory` linked to `?seed=7` and defaulted to 7, `/derby/file`
 * replayed to a hardcoded `?seed=12`. The result was that every player on earth got the
 * same twelve trivia questions in the same order, forever, and "שוב" replayed the round
 * you had just finished. A quiz that cannot surprise you twice is a quiz you play once.
 *
 * The fix is not `Math.random()`. A random deal repeats itself constantly — with 21
 * goals and 3 per run you see a repeat inside three plays — and it destroys the one
 * property this codebase insists on: **a round is reproducible from its seed**, which
 * is what makes grading re-derivable on the server and what makes a challenge link
 * actually challenge somebody with YOUR round.
 *
 * So a round is addressed by two numbers instead of one:
 *
 *   · **seed** — which shuffle of the pool you are playing. One shuffle = one *deck*.
 *   · **cursor** — how far into that deck you have walked.
 *
 * A deck is dealt in slices of the round length. Walk the cursor forward and you get
 * the NEXT slice — so nothing repeats until the pool is exhausted. When the cursor runs
 * past the end, the deck is reshuffled (the cycle number is folded into the seed) and
 * the walk begins again in a different order. Two numbers, no storage on the server, and
 * an unbounded non-repeating run that is still perfectly reproducible.
 *
 * **The one exception Maor named** is honoured by construction: a link that already
 * carries `?seed=…&r=…` is played exactly as written and never re-rolled, so a personal
 * duel is the same questions for both people.
 *
 * Client-safe on purpose — the device needs this arithmetic to build its next link, and
 * `lib/game/archive.ts` is `server-only`.
 */

/** The prime folded in per cycle. Any odd constant works; this one is not 1 or 7. */
const CYCLE_SALT = 7919

/** Seeds are kept inside a range where the PRNG behaves and the URL stays short. */
const SEED_MAX = 9_999_991

/**
 * A fresh deck number.
 *
 * `Math.random()` is right HERE and wrong inside a deal: choosing which shuffle you get
 * is exactly the place where unpredictability is the point, and the number is captured
 * into the URL the moment it is chosen, so the round it produces stays reproducible.
 */
export function mintSeed(): number {
  return 1 + Math.floor(Math.random() * SEED_MAX)
}

/** Fold the cycle into the deck number so each lap through the pool shuffles anew. */
export function cycleSeed(seed: number, cycle: number): number {
  if (cycle === 0) return seed
  return ((seed + cycle * CYCLE_SALT) % SEED_MAX) + 1
}

/** How many full rounds one lap of the pool yields. Never zero. */
export function slicesIn(poolSize: number, roundSize: number): number {
  if (roundSize <= 0) return 1
  return Math.max(1, Math.ceil(poolSize / roundSize))
}

export type Position = {
  /** which shuffle of the pool — already folded with the cycle */
  seed: number
  /** which slice of that shuffle, 0-based */
  slot: number
  /** which lap of the pool this is, 0-based. Printed as "סבב N" on the card. */
  cycle: number
  /** how many slices a lap holds */
  slices: number
}

/**
 * Resolve `(deck, cursor)` into a concrete place in a concrete shuffle.
 *
 * Pure arithmetic, no pool needed — which is why the client can compute the label
 * "שאלות 13–24" without ever loading the archive.
 */
export function positionOf(seed: number, cursor: number, poolSize: number, roundSize: number): Position {
  const slices = slicesIn(poolSize, roundSize)
  // A negative or NaN cursor is a hand-edited URL, not a crash.
  const safe = Number.isFinite(cursor) && cursor > 0 ? Math.floor(cursor) : 0
  const cycle = Math.floor(safe / slices)
  return { seed: cycleSeed(seed, cycle), slot: safe % slices, cycle, slices }
}

/**
 * Take `size` items starting at `from`, wrapping once if the deck is shorter.
 *
 * This, and not a second shuffle, is how the cursor moves: the deal's own PRNG stream
 * is untouched, so **at cursor 0 every mode deals byte-for-byte what it dealt before
 * this engine existed** — which is what let the rotation land under 1,285 existing
 * tests without rewriting a single expectation. Walking the cursor forward slides the
 * window along the same deck, so nothing repeats until the deck is used up; the
 * reshuffle happens one level up, in `positionOf`, by folding the lap number into the
 * seed.
 */
export function takeFrom<T>(deck: readonly T[], from: number, size: number): T[] {
  if (deck.length === 0) return []
  const start = ((from % deck.length) + deck.length) % deck.length
  const taken = deck.slice(start, start + size)
  if (taken.length >= size || deck.length <= size) return taken
  return [...taken, ...deck.slice(0, size - taken.length)]
}

/**
 * Rotate a whole deck so the walk begins `from` items in. Same idea as `takeFrom`, for
 * the callers that consume a deck lazily instead of slicing a fixed round out of it —
 * the trivia round-robin walks its pool template by template and needs the whole list.
 */
export function rotate<T>(deck: readonly T[], from: number): T[] {
  if (deck.length === 0) return []
  const start = ((from % deck.length) + deck.length) % deck.length
  return [...deck.slice(start), ...deck.slice(0, start)]
}

/**
 * The seed a screen should play when the URL did not name one.
 *
 * Server-side this runs per request, so a visitor who types the bare route still gets a
 * different round every time even with JavaScript switched off. The device's own
 * rotation (`lib/rotation/store.ts`) overrides it on the link when JS is running,
 * because only the device knows how far through the deck it already is.
 */
export function readSeed(raw: string | string[] | undefined, fallback: () => number = mintSeed): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback()
}

/** The cursor a screen should play. Absent means the start of the deck. */
export function readCursor(raw: string | string[] | undefined): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

/** True when the link pinned a round — a duel, a share, a bookmark. Never re-rolled. */
export function isPinned(raw: string | string[] | undefined): boolean {
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isFinite(value) && value > 0
}

/** `?seed=…&r=…` — the two numbers, in the order they are read. */
export function roundQuery(seed: number, cursor: number): string {
  return cursor > 0 ? `seed=${seed}&r=${cursor}` : `seed=${seed}`
}

/** Append the round to a route that may already carry a query. */
export function withRound(href: string, seed: number, cursor: number): string {
  const join = href.includes('?') ? '&' : '?'
  return `${href}${join}${roundQuery(seed, cursor)}`
}
