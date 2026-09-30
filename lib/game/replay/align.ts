/**
 * יישור רצפים — the difference between "you got the move wrong" and "you got it a touch long".
 *
 * The old gate compared touch 1 to touch 1 and touch 2 to touch 2. That is not a
 * comparison of two MOVES, it is a comparison of two lists, and it fails on the single
 * most common thing a supporter does: remember one touch too many, or forget the one in
 * the middle. Under a positional compare, a player who rebuilt a four-touch move perfectly
 * except for an extra dribble at the front scored zero on everything after it — a right
 * answer graded as total ignorance because it arrived one slot late.
 *
 * So the two sequences are ALIGNED: Needleman–Wunsch, a linear gap, and a similarity
 * function the caller supplies. A touch may be matched to a touch, left unmatched (the
 * player invented it), or skipped (the player missed it), and the alignment that survives
 * is the one with the best total. Partial credit for the right touches in the right order
 * with a gap is exactly what the algorithm is for, and it has been for fifty years.
 *
 * Pure, generic and free of any football at all — which is what lets `tests/replay.test.ts`
 * hold it to arithmetic. `lib/life/runtime/walk.ts` is the same argument about geometry.
 */

export type AlignedPair<A, B> = {
  /** index into the left sequence, or null where the right sequence has no partner */
  left: number | null
  right: number | null
  /** the similarity the pair scored, or 0 for a gap */
  score: number
}

/**
 * What one unmatched touch costs.
 *
 * It has to be a real number: at 0 the algorithm would happily open a gap beside every
 * pair and pay nothing, and every alignment would be "you had none of them". At 100 it
 * could never open one, and an extra touch would shunt the whole move and we would be
 * back to a positional compare. Twenty is a fifth of a perfect pair — enough that a gap
 * is a decision, cheap enough that ONE gap is survivable, which is the tolerance the
 * brief asks for in words.
 */
export const GAP = 20

const FLOOR = -1e9

/**
 * Align two sequences and return every pair and gap, in order.
 *
 * `similarity` answers 0–100 for one pair. The total the algorithm maximises is the sum
 * of the matched similarities minus `GAP` for each unmatched item on either side.
 */
export function alignSequences<A, B>(
  left: readonly A[],
  right: readonly B[],
  similarity: (a: A, b: B) => number,
): AlignedPair<A, B>[] {
  const n = left.length
  const m = right.length

  const best: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(FLOOR))
  const from: (' ' | 'pair' | 'left' | 'right')[][] = Array.from({ length: n + 1 }, () =>
    Array<' ' | 'pair' | 'left' | 'right'>(m + 1).fill(' '),
  )

  best[0]![0] = 0
  for (let i = 1; i <= n; i += 1) {
    best[i]![0] = best[i - 1]![0]! - GAP
    from[i]![0] = 'left'
  }
  for (let j = 1; j <= m; j += 1) {
    best[0]![j] = best[0]![j - 1]! - GAP
    from[0]![j] = 'right'
  }

  const scores: number[][] = Array.from({ length: n }, () => Array<number>(m).fill(0))
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < m; j += 1) {
      scores[i]![j] = similarity(left[i] as A, right[j] as B)
    }
  }

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const paired = best[i - 1]![j - 1]! + scores[i - 1]![j - 1]!
      const skipLeft = best[i - 1]![j]! - GAP
      const skipRight = best[i]![j - 1]! - GAP
      const top = Math.max(paired, skipLeft, skipRight)
      best[i]![j] = top
      // ties prefer a PAIR: an alignment that can explain a touch should explain it
      // rather than call two gaps the same answer.
      from[i]![j] = top === paired ? 'pair' : top === skipLeft ? 'left' : 'right'
    }
  }

  const out: AlignedPair<A, B>[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    const step = from[i]![j]!
    if (step === 'pair') {
      out.push({ left: i - 1, right: j - 1, score: scores[i - 1]![j - 1]! })
      i -= 1
      j -= 1
    } else if (step === 'left') {
      out.push({ left: i - 1, right: null, score: 0 })
      i -= 1
    } else {
      out.push({ left: null, right: j - 1, score: 0 })
      j -= 1
    }
  }
  return out.reverse()
}
