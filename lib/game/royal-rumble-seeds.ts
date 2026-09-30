/** One legal whole-board shuffle. Both offer seeds collapse to one stable match seed. */
export const ROYAL_RUMBLE_SHUFFLE_MASK = 0x5f3759df

export function alternateRoyalRumbleOfferSeed(seed: number): number {
  return ((seed >>> 0) ^ ROYAL_RUMBLE_SHUFFLE_MASK) >>> 0
}

export function royalRumbleMatchSeed(offerSeed: number): number {
  const first = offerSeed >>> 0
  const second = alternateRoyalRumbleOfferSeed(first)
  return Math.min(first, second) >>> 0
}

/**
 * The board a round plays — `(seed, cursor)` folded into the one number the whole engine
 * is pure in (ONE RED WORLD §18, P0.1).
 *
 * Until 28.9.2026 the route read `?r=` and threw it away: the wall's PlayLink walked the
 * device's cursor forward and `seed=X&r=0` and `seed=X&r=1` dealt the identical fifteen
 * cards. Every "again" was the same Rumble.
 *
 * Everything downstream — the draft, the one shuffle (its mask pair), the opponent, the
 * match, the server's validation, the Live room's seeds and the share link — reads the
 * draft's offer seed, so folding the cursor in HERE, once, is what moves all of them
 * together. A second fold anywhere else would let two of them disagree.
 *
 * **Cursor 0 is the seed itself**, the same rule `cycleSeed` keeps for lap 0: every link
 * shared before this existed carried no `r`, and it still deals the board it promised.
 * Every other cursor is an avalanche hash (murmur3's finaliser) of both numbers, so
 * neighbouring cursors land on unrelated boards rather than on `seed + 1`, `seed + 2` —
 * `pairedRoyalRumbleDrafts` already walks `seed + k·7919` looking for a usable pair, and
 * a linear step would walk straight into the next cursor's search.
 * Never 0: a zero seed reads as "no seed" on the URL (`readSeed`).
 */
export function royalRumbleRoundSeed(seed: number, cursor: number): number {
  const base = seed >>> 0
  const step = Number.isFinite(cursor) && cursor > 0 ? Math.floor(cursor) >>> 0 : 0
  if (step === 0) return base
  let h = (base ^ Math.imul(step, 0x9e3779b1)) >>> 0
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b) >>> 0
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35) >>> 0
  h = (h ^ (h >>> 16)) >>> 0
  return h === 0 ? 1 : h
}

/**
 * The link that hands over THIS round: the seed and cursor the route read, never the
 * derived offer seed — `royalRumbleRoundSeed` runs again on arrival, so the two numbers
 * are what reproduce the board. Cursor 0 prints no `r`, exactly as `roundQuery` does.
 */
export function royalRumbleShareHref(seed: number, cursor: number): string {
  const s = seed >>> 0
  const r = Number.isFinite(cursor) && cursor > 0 ? Math.floor(cursor) : 0
  return r > 0 ? `/royal-rumble?seed=${s}&r=${r}` : `/royal-rumble?seed=${s}`
}

/**
 * "השנים שחיית עד עכשיו" (ONE RED WORLD §18) — the themed draft's OWN seed namespace. The
 * route seed is salted and avalanched before it reaches the composer, so `seed=X` in the
 * themed mode and `seed=X` on the gate are unrelated boards, and nothing here can move
 * what `royalRumbleRoundSeed` deals. Never 0 (`readSeed`), never equal to its input.
 */
export const ROYAL_RUMBLE_LIVED_SALT = 0x4c1fe0d5

export function royalRumbleLivedSeed(seed: number, cursor = 0): number {
  const base = royalRumbleRoundSeed(seed, cursor)
  let h = (base ^ ROYAL_RUMBLE_LIVED_SALT) >>> 0
  h ^= h >>> 16
  h = Math.imul(h, 0x7feb352d) >>> 0
  h ^= h >>> 15
  h = Math.imul(h, 0x846ca68b) >>> 0
  h = (h ^ (h >>> 16)) >>> 0
  return h === 0 || h === base ? (h ^ 0x9e3779b1) >>> 0 || 1 : h
}
