import { hashSeed } from '@/lib/voice/hash'

/**
 * The daily's clock — pure arithmetic on an Israel date string. Client-safe.
 *
 * "חדש" אינו "אקראי" (§1.4): the same date always deals the same three things, for
 * everybody, on every device, and the generic rotation never repeats an item before its
 * pool is used up. That last promise is why a pool is walked as ONE fixed permutation
 * (shuffled once from a constant salt) cycled by day number, and not reshuffled per lap:
 * a per-lap shuffle can put the last item of one lap next to the same item opening the
 * next, and "any N consecutive days are N different things" is only true of a cycle.
 */

/** Days since 1970-01-01 for a `YYYY-MM-DD`, at UTC noon — no zone, no DST. */
export function dayNumber(isoDay: string): number {
  const [y, m, d] = isoDay.split('-').map(Number)
  return Math.floor(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12) / 86_400_000)
}

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

/** One fixed shuffle of a pool, from a constant salt. */
export function permutation<T>(pool: readonly T[], salt: string): T[] {
  const random = mulberry32(hashSeed(salt))
  const out = [...pool]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const a = out[i] as T
    out[i] = out[j] as T
    out[j] = a
  }
  return out
}

/** The pool's item for a day: position `day mod n` of the fixed permutation. */
export function cycleAt<T>(pool: readonly T[], day: number, salt: string): T | null {
  if (pool.length === 0) return null
  const deck = permutation(pool, salt)
  const at = ((day % deck.length) + deck.length) % deck.length
  return deck[at] ?? null
}

const SEED_MAX = 9_999_991

/** The pinned seed a daily link plays — the same round for everybody on that date. */
export function daySeed(isoDay: string, salt: string): number {
  return 1 + (hashSeed(`daily|${isoDay}|${salt}`) % SEED_MAX)
}
