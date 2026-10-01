import 'server-only'
import {positionOf,takeFrom} from '@/lib/rotation/deck'
import {rng,shuffle} from './random'
import {MEMORY_VALUE,pairStrength,themedOrder,themeOf} from './memory-quality'
import type {MemoryPairType, MemoryStrength} from './memory-quality'
import type {MemoryRound,MemoryCard,MemoryObject,MemoryWindow} from './memory'
export type MemoryCandidate = {
  pair: string
  type: MemoryPairType
  /** one archive sentence for the locked-pair plate — see `MemoryPair.factHe` */
  fact?: string | null
  a: string
  b: string
  kind: string
  /** the object the memory face draws */
  object: MemoryObject
  /** the object the answer face draws */
  answer: MemoryObject
  /**
   * the last year the fact touches — a span's end, a season's second year. THE WORKER LIFE's
   * window keeps a pair only when the whole of it had happened (`MemoryWindow`); null for a
   * row the archive does not date, which a window never deals.
   */
  year?: number | null
}

function distinctCount(candidates: readonly { a: string; b: string }[]): number {
  const seen = new Set<string>()
  let count = 0
  for (const candidate of candidates) {
    if (seen.has(candidate.a) || seen.has(candidate.b)) continue
    seen.add(candidate.a)
    seen.add(candidate.b)
    count += 1
  }
  return count
}


/** Original pair rotation and category/era ordering over compiled club candidates. */
export function dealMemoryCandidates(input:readonly MemoryCandidate[],seed:number,pairs=6,cursor=0,window?:MemoryWindow):MemoryRound {
 const candidates=[...input]
  // The pool is assembled BEFORE the deck is addressed, because the address needs its
  // size: `positionOf` decides which lap of the pool this is, and a lap of an unknown
  // pool is one slice long — which would re-seed the shuffle on every single visit and
  // let a pair from the previous board come back on the next one.
  //
  // And the size it needs is the size of the pool it can actually FIELD, not the raw
  // candidate count: the de-duplication below collapses every competition to one row, so
  // 65 candidates yield 29 usable pairs. Addressed over 65 the lap ran eleven boards long
  // over a pool that fills four, `takeFrom` wrapped, and every board from the fifth on
  // re-dealt a pair the same lap had already dealt — the one guarantee
  // `lib/rotation/deck.ts` exists to make. 17.9.2026.
  // a pair with no stated link is never dealt (`memory-quality.ts` — strength 0)
  const linked = candidates.filter((candidate) => pairStrength(candidate) > 0)
  candidates.length = 0
  candidates.push(...linked)
  if (window) {
    const kept = candidates.filter((candidate) => {
      const year = candidate.year
      return typeof year === 'number' && Number.isFinite(year) && year < window.before && (window.from === undefined || year >= window.from)
    })
    candidates.length = 0
    candidates.push(...kept)
  }
  const at = positionOf(seed, cursor, distinctCount(candidates), pairs)
  const random = rng(at.seed)

  // One pair per distinct face value, so two cards can never read identically — and
  // one competition per board, so "גביע המדינה" never appears twice wanting two
  // different years.
  const seen = new Set<string>()
  const distinct = shuffle(candidates, random).filter((candidate) => {
    if (seen.has(candidate.a) || seen.has(candidate.b)) return false
    seen.add(candidate.a)
    seen.add(candidate.b)
    return true
  })
  // Dealt round-robin across KINDS (v3, 21.9.2026): fifty European ties would otherwise
  // be two or three pairs of every board, and a wall of three "לילה אירופי" tabs is one
  // question asked three times. The order is still one fixed permutation of the pool, so
  // consecutive windows stay disjoint — the rotation promise is unchanged.
  //
  // v4 (29.9.2026): the deck is cut into boards that share a stretch of history — a decade,
  // in whole blocks of six, spread across kinds inside it — and only what no decade can fill a
  // board with is mixed. See `themedOrder`; it is still one fixed permutation of the pool.
  const spread = themedOrder(
    distinct.map((candidate) => ({ ...candidate, theme: themeOf(candidate.year), value: MEMORY_VALUE[candidate.type] })),
    pairs,
  )

  // The window slides AFTER the de-duplication, so a later board is still six distinct
  // faces rather than six rows that happen to sit next to each other in the raw pool.
  const chosen = takeFrom(spread, at.slot * pairs, pairs)

  const cards = shuffle(
    chosen.flatMap((candidate): MemoryCard[] => [
      {
        id: `${candidate.pair}:a`,
        pair: candidate.pair,
        face: candidate.a,
        kind: candidate.kind,
        object: candidate.object,
        side: 'memory',
      },
      {
        id: `${candidate.pair}:b`,
        pair: candidate.pair,
        face: candidate.b,
        kind: candidate.kind,
        object: candidate.answer,
        side: 'answer',
      },
    ]),
    random,
  )

  // The pairs are returned in the deal's own order, not the shuffle's: the shelf is a
  // fixed row of slots that fill up as you find them, so its order must not change
  // when the board is shuffled — and must be the same on every device dealt this seed.
  return {
    pairs: chosen.map((candidate) => ({
      id: candidate.pair,
      a: candidate.a,
      b: candidate.b,
      kind: candidate.kind,
      object: candidate.object,
      type: candidate.type,
      strength: pairStrength(candidate) as Exclude<MemoryStrength, 0>,
      theme: candidate.theme,
      factHe: candidate.fact ?? null,
    })),
    cards,
  }
}
