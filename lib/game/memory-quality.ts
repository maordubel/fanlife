/**
 * איכות הצמדים — what makes a memory pair worth dealing (Gate 6, 29.9.2026).
 *
 * The mechanic is untouched: two faces, one memory. What this decides is WHICH pairs the deck
 * may hold and how a board of six is put together, and it decides it from evidence the archive
 * row already carries — never from a guess about what "goes together".
 *
 *  · **a pair has a TYPE**, one of the relationships the archive states (a trophy and the season
 *    it was won, a night and its year …). Only a relationship with a row behind it is a type;
 *    there is no "related" catch-all.
 *  · **a pair has a STRENGTH.** 3 — the pair is one event or one direct record (a trophy won in a
 *    season, a goal on its day, a European tie, a dated moment). 2 — a direct relation to a span
 *    or a count (a maker and the seasons it supplied, a crest and its years, a candidate and his
 *    vote). 1 — the two faces only share a decade. 0 — nothing states a link, or a face is empty,
 *    repeated or unreadable: **never dealt.** Nothing in the current pool is a 1 on its own; the
 *    rung exists so a future source can be admitted honestly instead of being called a 2.
 *  · **a board has a THEME** when it can: the decade its pairs belong to. Pairs are kept whole
 *    inside a decade in blocks of a board's size, so a board reads as one stretch of the club's
 *    history (at least four of six, and in practice all six); the pairs no decade can fill a
 *    board with are dealt together afterwards, spread across kinds. Nothing is asked of the
 *    player — the theme is not a chip, it is how the deck is cut.
 *
 * Pure and client-safe: it takes plain candidates, so the rules are testable without the archive.
 */

/** the relationships the archive states between the two faces of a pair */
export type MemoryPairType =
  | 'trophy-season'
  | 'goal-year'
  | 'moment-year'
  | 'tie-season'
  | 'crest-years'
  | 'maker-span'
  | 'candidate-votes'

export const MEMORY_PAIR_TYPES: readonly MemoryPairType[] = [
  'trophy-season',
  'goal-year',
  'moment-year',
  'tie-season',
  'crest-years',
  'maker-span',
  'candidate-votes',
]

export type MemoryStrength = 0 | 1 | 2 | 3

/** a type's own rung — the ceiling its evidence can reach */
export const TYPE_STRENGTH: Record<MemoryPairType, MemoryStrength> = {
  'trophy-season': 3,
  'goal-year': 3,
  'moment-year': 3,
  'tie-season': 3,
  'crest-years': 2,
  'maker-span': 2,
  'candidate-votes': 2,
}

/**
 * Deep QA 29.9.2026 §26 — how RECOGNISABLE a pair is to a supporter, apart from how strong its
 * evidence is. A trophy and its season, a night and its year: 3 (iconic). A tie and a goal:
 * 2 (recognisable). A crest's years, a maker's span, a candidate's votes: 1 (archival) — valid,
 * and kept, but never six of them on one board.
 */
export type MemoryValue = 1 | 2 | 3
export const MEMORY_VALUE: Record<MemoryPairType, MemoryValue> = {
  'trophy-season': 3,
  'moment-year': 3,
  'goal-year': 2,
  'tie-season': 2,
  'crest-years': 1,
  'maker-span': 1,
  'candidate-votes': 1,
}
/** a board of `size` keeps at least this many pairs with a value of 2 or more */
export const RECOGNISABLE_MIN = 3
const archivalCap = (size: number) => Math.max(0, size - RECOGNISABLE_MIN)

/** the fields a candidate must carry for its strength to be judged */
export type Judgeable = {
  type: MemoryPairType
  a: string
  b: string
  /** the last year the fact touches; null where the archive does not date the row */
  year?: number | null
  /** the archive entity the pair opens on, or null when the graph holds none */
  evidence?: boolean
}

/** the types whose relationship IS a date: without a readable year there is no relationship */
const DATED: ReadonlySet<MemoryPairType> = new Set<MemoryPairType>([
  'trophy-season',
  'goal-year',
  'moment-year',
  'tie-season',
  'crest-years',
  'maker-span',
])

/**
 * How strong is this pair, 0–3. Zero is a pair the deck refuses:
 *  · a face is empty, or both faces read the same;
 *  · a dated relationship with no readable year;
 *  · a type nobody registered.
 */
export function pairStrength(candidate: Judgeable): MemoryStrength {
  if (!MEMORY_PAIR_TYPES.includes(candidate.type)) return 0
  if (candidate.a.trim() === '' || candidate.b.trim() === '') return 0
  if (candidate.a.trim() === candidate.b.trim()) return 0
  if (DATED.has(candidate.type) && !(typeof candidate.year === 'number' && Number.isFinite(candidate.year) && candidate.year > 0)) {
    return 0
  }
  return TYPE_STRENGTH[candidate.type]
}

/** The theme a pair belongs to: its decade, or `undated` for a row the archive does not date. */
export function themeOf(year: number | null | undefined): string {
  return typeof year === 'number' && Number.isFinite(year) && year > 0 ? `d${Math.floor(year / 10) * 10}` : 'undated'
}

/** How many of a board's pairs share its most common theme. */
export function coherenceOf(themes: readonly string[]): number {
  const counts = new Map<string, number>()
  for (const theme of themes) counts.set(theme, (counts.get(theme) ?? 0) + 1)
  return Math.max(0, ...counts.values())
}

/**
 * Cut a deck into boards. `items` arrive in the deck's own order (already de-duplicated and
 * shuffled by the rotation's seed), each with its theme and its kind. Inside a theme they are
 * spread across kinds, then cut into blocks of `size`; a theme keeps only whole blocks. Whatever
 * is left over — a decade too thin to fill a board, and the undated — follows as one stream,
 * spread across kinds again. The result is one fixed permutation: the rotation slices it into
 * consecutive windows exactly as it sliced the old one, so two boards of a lap never share a pair.
 */
export function themedOrder<T extends { theme: string; kind: string; value?: number }>(items: readonly T[], size: number): T[] {
  const byTheme = new Map<string, T[]>()
  for (const item of items) byTheme.set(item.theme, [...(byTheme.get(item.theme) ?? []), item])

  const blocks: T[] = []
  const rest: T[] = []
  for (const [theme, group] of byTheme) {
    if (theme === 'undated') {
      rest.push(...group)
      continue
    }
    const cut = cutBlocks(group, size)
    blocks.push(...cut.blocks)
    rest.push(...cut.rest)
  }
  return limitArchival([...blocks, ...spreadKinds(rest)], size)
}

/**
 * The mixed stream is sliced into boards too: no window of `size` may hold more than the archival
 * cap. A surplus archival pair swaps with the next recognisable one further on (same decade first) — a permutation,
 * so the rotation's disjoint windows survive.
 */
function limitArchival<T extends { value?: number; theme?: string }>(items: readonly T[], size: number): T[] {
  const out = [...items]
  const cap = archivalCap(size)
  const archival = (item: T) => (item.value ?? 2) <= 1
  for (let start = 0; start < out.length; start += size) {
    const end = Math.min(out.length, start + size)
    if (end - start < size) break
    for (let i = start; i < end && out.slice(start, end).filter(archival).length > cap; i += 1) {
      if (!archival(out[i]!)) continue
      // prefer a partner from the SAME stretch of history, so the board keeps its decade
      let swap = out.findIndex((item, at) => at >= end && !archival(item) && item.theme === out[i]!.theme)
      if (swap < 0) swap = out.findIndex((item, at) => at >= end && !archival(item))
      if (swap < 0) break
      ;[out[i], out[swap]] = [out[swap]!, out[i]!]
    }
  }
  return out
}

/** No more than this many of one kind on a themed board — one question is not a memory board. */
export const KIND_CAP = 3

/**
 * Whole boards out of one theme, each with at most `KIND_CAP` of any kind. A board is drawn by
 * passing over the kinds in turn; when the theme can no longer fill a board under the cap, what
 * is left (the half-drawn board included) is handed back for the mixed stream.
 */
function cutBlocks<T extends { kind: string; value?: number }>(group: readonly T[], size: number): { blocks: T[]; rest: T[] } {
  const queues = new Map<string, T[]>()
  for (const item of group) queues.set(item.kind, [...(queues.get(item.kind) ?? []), item])
  const blocks: T[] = []
  for (;;) {
    const block: T[] = []
    for (let pass = 0; pass < KIND_CAP && block.length < size; pass += 1) {
      for (const queue of queues.values()) {
        const next = queue[0]
        if (!next || block.length >= size) continue
        // a kind is only asked once per pass, so `pass + 1` is the most a board can hold of it
        block.push(next)
        queue.shift()
      }
    }
    if (block.length < size) {
      const rest: T[] = [...block]
      for (const queue of queues.values()) rest.push(...queue)
      return { blocks, rest }
    }
    blocks.push(...block)
  }
}

/** Round-robin across kinds — a wall of one kind is one question asked six times. */
export function spreadKinds<T extends { kind: string }>(items: readonly T[]): T[] {
  const byKind = new Map<string, T[]>()
  for (const item of items) byKind.set(item.kind, [...(byKind.get(item.kind) ?? []), item])
  const out: T[] = []
  for (let depth = 0; out.length < items.length; depth += 1) {
    for (const list of byKind.values()) {
      const next = list[depth]
      if (next) out.push(next)
    }
  }
  return out
}
