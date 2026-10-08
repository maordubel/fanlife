/**
 * Gate 11 · The Black File — documented crossings and chronology, generic for every club (rulebook §13.3, BF-R01..R09).
 *
 * Two modules, one file:
 *   · BINARY  — "did he move directly from A to B?" / "did he ever join B after A?" with a real career behind it.
 *   · ORDER   — two dated events, which came first.
 * No speed, no lives (BF-R08): a factual file reports correct / asked, with a subtotal per module.
 *
 * Pure and client-safe. The deal masks every id before it leaves the server; the answer-bearing path and dates stay
 * server-side until grading (BF-R06).
 */

/* ------------------------------------------------------------------ dates */

export function exactDay(on: unknown): string | null {
  if (typeof on !== 'string') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(on)
  if (!m) return null
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3])
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? on : null
}

export type DatedItem = {
  id: string
  title: string
  /** an exact calendar day, or null when the record only knows a year */
  on: string | null
  year?: number | null
  sources?: string[]
}

type Interval = { lo: string; hi: string }

function intervalOf(item: DatedItem): Interval | null {
  const day = exactDay(item.on)
  if (day) return { lo: day, hi: day }
  const y = typeof item.year === 'number' ? item.year : null
  if (y !== null && y >= 1000 && y <= 2999) return { lo: `${y}-01-01`, hi: `${y}-12-31` }
  return null
}

/** BF-R05 — which of two comes first, or null when the records cannot prove it. */
export function orderOf(a: DatedItem, b: DatedItem, mode: 'exact' | 'interval' = 'exact'): 'a' | 'b' | null {
  if (mode === 'exact') {
    const x = exactDay(a.on), y = exactDay(b.on)
    if (!x || !y || x === y) return null
    return x < y ? 'a' : 'b'
  }
  const x = intervalOf(a), y = intervalOf(b)
  if (!x || !y) return null
  if (x.hi < y.lo) return 'a'
  if (y.hi < x.lo) return 'b'
  return null
}

/** items usable in a strict-order pair: an exact day, one item per day, one per id */
export function pairableItems(items: readonly DatedItem[]): DatedItem[] {
  const days = new Set<string>(), ids = new Set<string>()
  const out: DatedItem[] = []
  for (const item of items) {
    const day = exactDay(item.on)
    if (!day || !item.id || ids.has(item.id) || days.has(day)) continue
    ids.add(item.id)
    days.add(day)
    out.push(item)
  }
  return out
}

export const PAIR_TARGET = 4
export const PAIR_ITEMS_FOR_TARGET = PAIR_TARGET * 2

function stream(seed: number): () => number {
  let state = (Math.imul(Math.max(1, Math.floor(seed)) >>> 0, 2654435761) ^ 0xc2b2ae35) >>> 0 || 1
  return () => {
    state ^= state << 13
    state >>>= 0
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return (state % 1000003) / 1000003
  }
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const held = out[i] as T
    out[i] = out[j] as T
    out[j] = held
  }
  return out
}

export type Pair = { index: number; a: DatedItem; b: DatedItem; earlier: 'a' | 'b' }

/** how many pairs the pool can actually field: each item is used once, so n items make floor(n/2) pairs (max 4) */
export function pairCapacity(items: readonly DatedItem[]): number {
  return Math.min(PAIR_TARGET, Math.floor(pairableItems(items).length / 2))
}

/**
 * Up to four pairs, no item twice, never two items that share a day. The sides are shuffled so the earlier one is
 * not always on the left. Deterministic in (seed, cursor).
 */
export function dealPairs(items: readonly DatedItem[], seed: number, cursor = 0): Pair[] {
  const pool = pairableItems(items).sort((a, b) => a.id.localeCompare(b.id))
  const random = stream(seed * 977 + cursor * 31 + 5)
  const order = shuffled(pool, random)
  const out: Pair[] = []
  const used = new Set<string>()
  for (let i = 0; i < order.length && out.length < PAIR_TARGET; i += 1) {
    const a = order[i] as DatedItem
    if (used.has(a.id)) continue
    const b = order.slice(i + 1).find((c) => !used.has(c.id) && orderOf(a, c) !== null)
    if (!b) continue
    const earlier = orderOf(a, b) as 'a' | 'b'
    used.add(a.id)
    used.add(b.id)
    const flip = random() < 0.5
    out.push(flip ? { index: out.length, a: b, b: a, earlier: earlier === 'a' ? 'b' : 'a' } : { index: out.length, a, b, earlier })
  }
  return out
}

export type PairReveal = {
  earlier: DatedItem
  later: DatedItem
  /** whole days between the two */
  days: number
  correct: boolean
}

function dayNumber(on: string): number {
  const [y, m, d] = on.split('-').map(Number) as [number, number, number]
  return Math.round(Date.UTC(y, m - 1, d) / 86400000)
}

export function gradePair(pair: Pair, pickedId: string): PairReveal | null {
  if (pickedId !== pair.a.id && pickedId !== pair.b.id) return null
  const earlier = pair.earlier === 'a' ? pair.a : pair.b
  const later = pair.earlier === 'a' ? pair.b : pair.a
  return { earlier, later, days: dayNumber(later.on as string) - dayNumber(earlier.on as string), correct: pickedId === earlier.id }
}

/* ------------------------------------------------------------------ binary */

/** one documented move of a person between two clubs */
export type Transition = {
  from: string
  to: string
  on?: string | null
  year?: number | null
  loan?: boolean
  sources: string[]
}

export type Proposition = 'direct' | 'ever'

export type BinaryRow = {
  id: string
  person: string
  /** the club the question starts from, and the rival it asks about */
  from: string
  to: string
  /** BF-R01 — the two propositions are different questions and are worded differently */
  proposition: Proposition
  /** the documented career, oldest first */
  career: Transition[]
  /** the claimed answer, checked against the career */
  claim: 'crossed' | 'did_not'
  /** BF-R03 — what makes a "did not" provable. Absent rows are never a proof */
  negativeProof?: { kind: 'complete-record'; sources: string[]; note?: string }
  sport?: string
}

export type BinaryBlocker =
  | 'BLACKFILE_NEGATIVE_UNPROVEN'
  | 'BINARY_POSITIVE_UNSOURCED'
  | 'BINARY_CLAIM_MISMATCH'
  | 'BINARY_NOT_FOOTBALL'
  | 'BINARY_MALFORMED'

function sourced(t: Transition): boolean {
  return Array.isArray(t.sources) && t.sources.some((s) => typeof s === 'string' && s.trim() !== '')
}

/** the clubs a person was documented at, oldest first, starting from the first transition's origin */
export function clubsOf(career: readonly Transition[]): string[] {
  if (career.length === 0) return []
  const out = [career[0]!.from]
  for (const t of career) out.push(t.to)
  return out
}

/** the documented path that satisfies a proposition, or null when the career does not satisfy it */
export function satisfyingPath(row: Pick<BinaryRow, 'from' | 'to' | 'proposition' | 'career'>): Transition[] | null {
  const career = row.career
  if (row.proposition === 'direct') {
    const hit = career.find((t) => t.from === row.from && t.to === row.to)
    return hit ? [hit] : null
  }
  // ever: leaves `from`, and at any later point joins `to`; every club in between stays on the path
  for (let start = 0; start < career.length; start += 1) {
    if (career[start]!.from !== row.from) continue
    for (let end = start; end < career.length; end += 1) {
      if (career[end]!.to === row.to) return career.slice(start, end + 1)
    }
  }
  return null
}

export type Verified = { ok: true; answer: 'crossed' | 'did_not'; path: Transition[] } | { ok: false; blocker: BinaryBlocker }

/**
 * BF-R02 / BF-R03 — a "crossed" needs a sourced path satisfying the exact wording; a "did not" needs a stated
 * complete record. The ABSENCE of a row is never proof: an item with no career and no proof is unproven, not a no.
 */
export function verifyBinary(row: BinaryRow): Verified {
  if (!row || typeof row.id !== 'string' || !row.id || !row.from || !row.to || row.from === row.to || !Array.isArray(row.career)) return { ok: false, blocker: 'BINARY_MALFORMED' }
  if (row.sport !== undefined && row.sport !== 'football') return { ok: false, blocker: 'BINARY_NOT_FOOTBALL' }
  const path = satisfyingPath(row)
  if (row.claim === 'crossed') {
    if (!path) return { ok: false, blocker: 'BINARY_CLAIM_MISMATCH' }
    if (!path.every(sourced)) return { ok: false, blocker: 'BINARY_POSITIVE_UNSOURCED' }
    return { ok: true, answer: 'crossed', path }
  }
  if (path) return { ok: false, blocker: 'BINARY_CLAIM_MISMATCH' }
  const proof = row.negativeProof
  const proven = !!proof && proof.kind === 'complete-record' && Array.isArray(proof.sources) && proof.sources.some((s) => String(s).trim() !== '') && row.career.length > 0 && row.career.every(sourced)
  if (!proven) return { ok: false, blocker: 'BLACKFILE_NEGATIVE_UNPROVEN' }
  return { ok: true, answer: 'did_not', path: [...row.career] }
}

export function binaryBank(rows: readonly BinaryRow[]): { verified: BinaryRow[]; blocked: { id: string; blocker: BinaryBlocker }[] } {
  const verified: BinaryRow[] = []
  const blocked: { id: string; blocker: BinaryBlocker }[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const v = verifyBinary(row)
    if (v.ok && !seen.has(row.id)) {
      seen.add(row.id)
      verified.push(row)
    } else if (!v.ok) blocked.push({ id: String(row?.id ?? ''), blocker: v.blocker })
  }
  return { verified, blocked }
}

export function dealBinary(rows: readonly BinaryRow[], seed: number, cursor = 0): BinaryRow[] {
  const random = stream(seed * 613 + cursor * 17 + 3)
  return shuffled([...binaryBank(rows).verified].sort((a, b) => a.id.localeCompare(b.id)), random)
}

export type BinaryReveal = {
  correct: boolean
  answer: 'crossed' | 'did_not'
  /** every club on the documented path — an intermediate club is never erased for drama (BF-R01) */
  clubs: string[]
  transitions: Transition[]
  proposition: Proposition
}

export function gradeBinary(row: BinaryRow, said: 'crossed' | 'did_not'): BinaryReveal | null {
  const v = verifyBinary(row)
  if (!v.ok || (said !== 'crossed' && said !== 'did_not')) return null
  return { correct: said === v.answer, answer: v.answer, clubs: v.answer === 'crossed' ? clubsOf(v.path) : clubsOf(row.career), transitions: v.path, proposition: row.proposition }
}

/* ------------------------------------------------------------------ the public payload (BF-R06) */

/** opaque, answer-free id for one dealt item — the caller supplies the keyed hash */
export type Mask = (kind: 'binary' | 'pair', id: string) => string

export type PublicBinary = { key: string; person: string; from: string; to: string; proposition: Proposition }
export type PublicPair = { key: string; a: { key: string; title: string }; b: { key: string; title: string } }

export function publicBinary(row: BinaryRow, mask: Mask): PublicBinary {
  return { key: mask('binary', row.id), person: row.person, from: row.from, to: row.to, proposition: row.proposition }
}

export function publicPair(pair: Pair, mask: Mask): PublicPair {
  return { key: mask('pair', `${pair.a.id}|${pair.b.id}`), a: { key: mask('pair', pair.a.id), title: pair.a.title }, b: { key: mask('pair', pair.b.id), title: pair.b.title } }
}

/* ------------------------------------------------------------------ modes + results */

export type BlackFileMode = {
  state: 'locked' | 'limited' | 'full'
  binary: number
  pairs: number
  /** items the pool still lacks for a full four pairs */
  itemsShort: number
  blockers: BinaryBlocker[]
  /** the blocker code the control room shows when the binary module is empty */
  blocker: 'BLACKFILE_NEGATIVE_UNPROVEN' | 'BLACKFILE_BINARY_MISSING' | null
}

/** §2.4 — limited: one verifiable binary item OR one unambiguous dated pair; full: both modules, 4 pairs from 8 items. */
export function blackFileMode(rows: readonly BinaryRow[], items: readonly DatedItem[]): BlackFileMode {
  const bank = binaryBank(rows)
  const pairs = pairCapacity(items)
  const pairable = pairableItems(items).length
  const state = bank.verified.length >= 1 && pairs >= PAIR_TARGET ? 'full' : bank.verified.length >= 1 || pairs >= 1 ? 'limited' : 'locked'
  const blockers = [...new Set(bank.blocked.map((b) => b.blocker))]
  return {
    state,
    binary: bank.verified.length,
    pairs,
    itemsShort: Math.max(0, PAIR_ITEMS_FOR_TARGET - pairable),
    blockers,
    blocker: bank.verified.length > 0 ? null : blockers.includes('BLACKFILE_NEGATIVE_UNPROVEN') ? 'BLACKFILE_NEGATIVE_UNPROVEN' : 'BLACKFILE_BINARY_MISSING',
  }
}

export type FileResult = { correct: number; asked: number; binary: { correct: number; asked: number }; order: { correct: number; asked: number } }

/** BF-R07/R08 — denominators are what was actually dealt and asked, never a fixed eight/nine/ten */
export function fileResult(answers: readonly { module: 'binary' | 'order'; correct: boolean }[]): FileResult {
  const sub = (m: 'binary' | 'order') => {
    const mine = answers.filter((a) => a.module === m)
    return { correct: mine.filter((a) => a.correct).length, asked: mine.length }
  }
  const binary = sub('binary'), order = sub('order')
  return { correct: binary.correct + order.correct, asked: binary.asked + order.asked, binary, order }
}
