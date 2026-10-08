/**
 * Gate 11 · The wall — a preference bracket, generic for every club (rulebook §13.2, HW-R01..R07).
 *
 * Eight duels between two approved candidates; the winner stays up, the loser is torn down, the next one is pasted
 * up. Nothing here is graded: a feeling cannot be wrong (HW-R02). The terrace-pick line is ALWAYS "editor's pick"
 * and appears only where a curated rank was authored (HW-R06) — it is never presented as what fans chose.
 *
 * Pure and client-safe: the dealing is deterministic from (seed, cursor), the run is a value you fold over.
 */

export type WallCandidate = {
  id: string
  name: string
  /** one factual line, kept separate from any opinion (HW-R01) */
  note?: string
  /** curated editorial rank, 1 = highest. Absent where nobody authored one */
  rank?: number | null
}

/** eight duels */
export const DUEL_COUNT = 8
/** 1 on the wall + 8 challengers + 1 spare */
export const QUEUE_LENGTH = DUEL_COUNT + 2
/** HW-R01 — ten distinct approved candidates are needed to deal a run */
export const WALL_MIN_CANDIDATES = QUEUE_LENGTH
/** the rounds (1-based) dealt as special "no mercy" rounds */
export const NO_MERCY_ROUNDS = [4, 7] as const
/** how far back the one revenge can reach */
export const REVENGE_WINDOW = 6
/** HW-R03 — the survivor's damage caps here */
export const MAX_DAMAGE = 5
/** special rounds draw their challenger from the top of the curated ranking */
export const NO_MERCY_POOL = 12

export type WallBlocker = 'WALL_CANDIDATES_SHORT'

/** distinct by id AND by folded name, so the same candidate under two ids is still one */
export function distinctCandidates(rows: readonly WallCandidate[]): WallCandidate[] {
  const ids = new Set<string>()
  const names = new Set<string>()
  const out: WallCandidate[] = []
  for (const row of rows) {
    const id = String(row?.id ?? '').trim()
    const name = String(row?.name ?? '').trim()
    const folded = name.toLocaleLowerCase()
    if (!id || !name || ids.has(id) || names.has(folded)) continue
    ids.add(id)
    names.add(folded)
    out.push({ ...row, id, name })
  }
  return out
}

export function wallAvailability(rows: readonly WallCandidate[]): { playable: boolean; have: number; need: number; blocker: WallBlocker | null } {
  const have = distinctCandidates(rows).length
  return { playable: have >= WALL_MIN_CANDIDATES, have, need: WALL_MIN_CANDIDATES, blocker: have >= WALL_MIN_CANDIDATES ? null : 'WALL_CANDIDATES_SHORT' }
}

/** a seeded stream — the same wall for the same seed, on the server and on a phone */
function stream(seed: number): () => number {
  let state = (Math.imul(Math.max(1, Math.floor(seed)) >>> 0, 2654435761) ^ 0x85ebca6b) >>> 0 || 1
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

export type WallDeal = {
  /** 10 ids: [holder, challenger 1..8, spare] */
  order: string[]
  /** ids dealt into a no-mercy round */
  noMercy: string[]
  /** true when at least one candidate carries an authored rank, so special rounds are drawn from the curated top */
  curated: boolean
}

/**
 * Ten distinct candidates out of the pool. Rounds 4 and 7 take their challenger from the curated top twelve when a
 * ranking exists (HW-R05); without one they are still special rounds, but not "ranked" — nothing is invented.
 */
export function dealWall(rows: readonly WallCandidate[], seed: number, cursor = 0): WallDeal | null {
  const pool = distinctCandidates(rows).sort((a, b) => a.id.localeCompare(b.id))
  if (pool.length < WALL_MIN_CANDIDATES) return null
  const random = stream(seed * 131 + cursor * 7919 + 17)
  const curated = pool.some((c) => typeof c.rank === 'number' && Number.isFinite(c.rank))
  const order = shuffled(pool, random).slice(0, QUEUE_LENGTH).map((c) => c.id)
  const noMercy: string[] = []
  const ranked = curated ? [...pool].filter((c) => typeof c.rank === 'number').sort((a, b) => (a.rank as number) - (b.rank as number)).slice(0, NO_MERCY_POOL).map((c) => c.id) : []
  for (const round of NO_MERCY_ROUNDS) {
    const slot = round // order[0] is the holder, order[round] is round `round`'s challenger
    if (curated) {
      const taken = new Set(noMercy)
      const wanted = ranked.filter((id) => !taken.has(id))
      const choice = wanted.find((id) => order.indexOf(id) === slot) ?? wanted[Math.floor(random() * wanted.length)]
      if (choice !== undefined) {
        const at = order.indexOf(choice)
        if (at === -1) order[slot] = choice
        else if (at !== slot) {
          const held = order[slot] as string
          order[slot] = choice
          order[at] = held
        }
        noMercy.push(choice)
        continue
      }
    }
    noMercy.push(order[slot] as string)
  }
  return { order, noMercy: [...new Set(noMercy)], curated }
}

export type WallPick = {
  round: number
  winner: string
  loser: string
  noMercy: boolean
  /** this round's challenger was the revenge pick */
  revenge: boolean
}

export type Wall = {
  holder: string
  /** the head is the challenger on the wall now */
  queue: string[]
  picks: WallPick[]
  /** everyone torn down, oldest first */
  out: string[]
  revengeUsed: boolean
  revengePick: string | null
  noMercy: string[]
}

export function startWall(deal: { order: WallDeal['order']; noMercy: WallDeal['noMercy'] }): Wall {
  return { holder: deal.order[0] ?? '', queue: deal.order.slice(1), picks: [], out: [], revengeUsed: false, revengePick: null, noMercy: [...deal.noMercy] }
}

export function over(wall: Wall): boolean {
  return wall.picks.length >= DUEL_COUNT || wall.queue.length === 0
}

export function duelOf(wall: Wall): { round: number; holder: string; challenger: string; noMercy: boolean; revenge: boolean } | null {
  if (over(wall)) return null
  const challenger = wall.queue[0] as string
  return {
    round: wall.picks.length + 1,
    holder: wall.holder,
    challenger,
    noMercy: wall.noMercy.includes(challenger),
    revenge: wall.revengePick === challenger && wall.picks.every((p) => !p.revenge),
  }
}

/** HW-R02 — either side can win; the transition is applied exactly once per round. */
export function choose(wall: Wall, winner: string): Wall {
  const duel = duelOf(wall)
  if (!duel || (winner !== duel.holder && winner !== duel.challenger)) return wall
  const loser = winner === duel.holder ? duel.challenger : duel.holder
  return {
    ...wall,
    holder: winner,
    queue: wall.queue.slice(1),
    out: [...wall.out, loser],
    picks: [...wall.picks, { round: duel.round, winner, loser, noMercy: duel.noMercy, revenge: duel.revenge }],
  }
}

/** HW-R04 — who the one revenge can bring back: the last six torn down, newest first, before the run is over */
export function revengeChoices(wall: Wall): string[] {
  if (wall.revengeUsed || over(wall)) return []
  return [...wall.out].reverse().filter((id) => id !== wall.holder).slice(0, REVENGE_WINDOW)
}

/**
 * Bring one back. He becomes the challenger NOW; the challenger he displaces stays in the queue behind him — nobody
 * silently leaves the wall — and a second request does nothing (`revengeUsed`).
 */
export function revenge(wall: Wall, id: string): Wall {
  if (!revengeChoices(wall).includes(id)) return wall
  return { ...wall, queue: [id, ...wall.queue], out: wall.out.filter((o) => o !== id), revengeUsed: true, revengePick: id }
}

/** HW-R03 — consecutive rounds the current holder has won, at the end of the log */
export function streakOf(wall: Wall): number {
  let run = 0
  for (let at = wall.picks.length - 1; at >= 0 && wall.picks[at]?.winner === wall.holder; at -= 1) run += 1
  return run
}

/** 0..5 — how torn the survivor's poster is (theatre, not a claim about a real person) */
export function damageOf(streak: number): number {
  return Math.max(0, Math.min(MAX_DAMAGE, streak))
}

/* ------------------------------------------------------------------- the ending (HW-R07) */

function fnv(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

export function wallAddress(seed: number, cursor = 0): string {
  const base = Math.max(1, Math.floor(seed)).toString(36).toUpperCase()
  return cursor > 0 ? `${base}.${Math.floor(cursor).toString(36).toUpperCase()}` : base
}

/**
 * `WALL-<seed36>-<hash5>`: the first half names the wall, the second fingerprints the picks. A LOCAL code — it
 * compares two people's walls; it is not proof of a server-verified result (HW-R07).
 */
export function wallCode(seed: number, cursor: number, picks: readonly WallPick[], revengePick: string | null): string {
  const trail = picks.map((p) => `${p.winner}>${p.loser}${p.revenge ? '!' : ''}`).join('|')
  const print = (fnv(`${wallAddress(seed, cursor)}#${trail}#${revengePick ?? ''}`) % 36 ** 5).toString(36).toUpperCase()
  return `WALL-${wallAddress(seed, cursor)}-${print.padStart(5, '0')}`
}

export type Ending = {
  holder: WallCandidate
  streak: number
  /** the eight actual choices, in order */
  choices: { round: number; winner: WallCandidate; loser: WallCandidate; noMercy: boolean; revenge: boolean }[]
  revengeUsed: boolean
  revengePick: WallCandidate | null
  /** the highest-ranked name the wall showed — "editor's pick" — only where a rank was authored */
  editorsPick: WallCandidate | null
  code: string
  /** a local code is not a server-verified result */
  verified: false
}

export function endingOf(rows: readonly WallCandidate[], wall: Wall, seed: number, cursor = 0): Ending | null {
  const byId = new Map(rows.map((r) => [r.id, r]))
  const holder = byId.get(wall.holder)
  if (!holder || wall.picks.length === 0) return null
  const choices = wall.picks.flatMap((p) => {
    const winner = byId.get(p.winner)
    const loser = byId.get(p.loser)
    return winner && loser ? [{ round: p.round, winner, loser, noMercy: p.noMercy, revenge: p.revenge }] : []
  })
  const seen = [...new Set(wall.picks.flatMap((p) => [p.winner, p.loser]))].map((id) => byId.get(id)).filter((c): c is WallCandidate => c !== undefined)
  const ranked = seen.filter((c) => typeof c.rank === 'number').sort((a, b) => (a.rank as number) - (b.rank as number))
  return {
    holder,
    streak: streakOf(wall),
    choices,
    revengeUsed: wall.revengeUsed,
    revengePick: wall.revengePick ? (byId.get(wall.revengePick) ?? null) : null,
    editorsPick: ranked[0] ?? null,
    code: wallCode(seed, cursor, wall.picks, wall.revengePick),
    verified: false,
  }
}
