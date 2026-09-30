/**
 * הקיר השחור — gate 11, v3.
 *
 * Two names on the wall; you keep the one you cannot tear off, the other is torn down
 * and the next one is pasted up. Eight rounds. What was a king of the hill is now a
 * WALL: the brief (§21) bans the heroic vocabulary — no king, no "enemy number one", no
 * titles for the player — and asks for a wall, a case file, a survivor.
 *
 * What v3 adds, as rules (this file is pure and client-safe; `hate.ts` deals):
 *
 *  · **Wall damage** — the survivor's poster carries its streak as damage, 0–5, and one
 *    numbered mark per round survived.
 *  · **One revenge** — once a run you may bring back one of the last six torn down. The
 *    challenger he displaces is NOT lost (the prototype dropped him): he goes back to
 *    the head of the queue.
 *  · **בלי רחמים** — rounds 4 and 7 are dealt from the top twelve of Maor's ranking and
 *    flagged; the screen says so in a banner that blocks nothing.
 *  · **Wall DNA** — still here · first torn down · the revenge pick · the no-mercy pick,
 *    and a code `WALL-<seed36>-<hash5>` that names the wall and fingerprints the picks.
 *
 * Nothing is graded: a feeling cannot be wrong. The only comparison with the terrace is
 * one line — "היציע היה משאיר: X" — the highest-ranked name the wall showed.
 */

import { OWNER_KNOWLEDGE_LABEL } from '@/lib/credits/groups'

export type Enemy = {
  slug: string
  nameHe: string
  latin: string
  category: 'owner' | 'crossed' | 'rival' | 'official'
  sport: 'football' | 'basketball'
  eraHe: string
  chargeHe: string
  /** the sourced record — EMPTY where the row has no real citation (rule 18 §1) */
  detailHe: string
  /** the sourced one-liner — EMPTY where the row has no real citation (rule 18 §1) */
  keyFactHe: string
  terraceRank: number
  /** the row's own source title, printed with its record */
  sourceTitle: string
  /** 'cited' — a real source; 'maor' — the owner's own knowledge, under the neutral label; 'none' */
  record: 'cited' | 'maor' | 'none'
}

/** eight rounds on the wall */
export const DUEL_COUNT = 8
/** 1 on the wall + 8 challengers + 1 spare */
export const QUEUE_LENGTH = DUEL_COUNT + 2
/** the rounds (1-based, as the screen counts) that are dealt without mercy */
export const NO_MERCY_ROUNDS = [4, 7] as const
/** how far back the one revenge can reach */
export const REVENGE_WINDOW = 6
/** the survivor's damage caps here */
export const MAX_DAMAGE = 5
/** the stamp between rounds — a tap ends it */
export const STAMP_MS = 520

export type Pick = {
  round: number
  winner: string
  loser: string
  /** this round's challenger was dealt without mercy */
  noMercy: boolean
  /** this round's challenger was the revenge pick */
  revenge: boolean
}

export type Wall = {
  holder: string
  /** upcoming challengers — the head is the one on the wall now */
  queue: string[]
  picks: Pick[]
  /** everyone torn down, oldest first */
  out: string[]
  revengeUsed: boolean
  revengePick: string | null
  /** slugs dealt into a no-mercy slot */
  noMercy: string[]
}

export function startWall(order: readonly string[], noMercy: readonly string[] = []): Wall {
  return {
    holder: order[0] ?? '',
    queue: order.slice(1),
    picks: [],
    out: [],
    revengeUsed: false,
    revengePick: null,
    noMercy: [...noMercy],
  }
}

export function over(wall: Wall): boolean {
  return wall.picks.length >= DUEL_COUNT || wall.queue.length === 0
}

/** the duel on the wall now, or null when the run is over */
export function duelOf(wall: Wall): { round: number; holder: string; challenger: string; noMercy: boolean } | null {
  if (over(wall)) return null
  const challenger = wall.queue[0] as string
  return {
    round: wall.picks.length + 1,
    holder: wall.holder,
    challenger,
    noMercy: wall.noMercy.includes(challenger),
  }
}

/** keep `winner` on the wall; the other is torn down and the next one goes up */
export function choose(wall: Wall, winner: string): Wall {
  const duel = duelOf(wall)
  if (!duel || (winner !== duel.holder && winner !== duel.challenger)) return wall
  const loser = winner === duel.holder ? duel.challenger : duel.holder
  return {
    ...wall,
    holder: winner,
    queue: wall.queue.slice(1),
    out: [...wall.out, loser],
    picks: [
      ...wall.picks,
      { round: duel.round, winner, loser, noMercy: duel.noMercy, revenge: wall.revengePick === duel.challenger && wall.picks.every((pick) => !pick.revenge) },
    ],
  }
}

/** who the one revenge can bring back — the last six torn down, newest first */
export function revengeChoices(wall: Wall): string[] {
  if (wall.revengeUsed || over(wall)) return []
  return [...wall.out].reverse().filter((slug) => slug !== wall.holder).slice(0, REVENGE_WINDOW)
}

/**
 * Bring one back. He becomes the challenger NOW; the challenger he displaces goes back to
 * the head of the queue and gets his round next — nobody silently leaves the wall.
 */
export function revenge(wall: Wall, slug: string): Wall {
  if (!revengeChoices(wall).includes(slug)) return wall
  return {
    ...wall,
    queue: [slug, ...wall.queue],
    out: wall.out.filter((name) => name !== slug),
    revengeUsed: true,
    revengePick: slug,
  }
}

/** how long the survivor has held: consecutive rounds won at the end of the log */
export function streakOf(wall: Wall): number {
  let run = 0
  for (let at = wall.picks.length - 1; at >= 0 && wall.picks[at]?.winner === wall.holder; at -= 1) run += 1
  return run
}

/** 0..5 — how torn the survivor's poster is */
export function damageOf(streak: number): number {
  return Math.max(0, Math.min(MAX_DAMAGE, streak))
}

/* ------------------------------------------------------------------- the DNA */

/** FNV-1a, 32-bit — deterministic, dependency-free, the same on server and phone */
function fnv(text: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/** the wall's address — seed, and the cursor when there is one */
export function wallAddress(seed: number, cursor = 0): string {
  const base = Math.max(1, Math.floor(seed)).toString(36).toUpperCase()
  return cursor > 0 ? `${base}.${Math.floor(cursor).toString(36).toUpperCase()}` : base
}

/**
 * `WALL-<seed36>-<hash5>` — the first half is the wall (anyone can play it), the second
 * fingerprints the picks, so two people on the same wall compare codes and know at once
 * whether they kept the same names.
 */
export function wallCode(seed: number, cursor: number, picks: readonly Pick[], revengePick: string | null): string {
  const trail = picks.map((pick) => `${pick.winner}>${pick.loser}${pick.revenge ? '!' : ''}`).join('|')
  const print = (fnv(`${wallAddress(seed, cursor)}#${trail}#${revengePick ?? ''}`) % 36 ** 5).toString(36).toUpperCase()
  return `WALL-${wallAddress(seed, cursor)}-${print.padStart(5, '0')}`
}

/** a typed code → the wall it names, or null. Only the address half is needed to play. */
export function readWallCode(code: string): { seed: number; cursor: number } | null {
  const match = /^WALL-([0-9A-Z]+)(?:\.([0-9A-Z]+))?(?:-[0-9A-Z]{5})?$/.exec(code.trim().toUpperCase())
  if (!match) return null
  const seed = parseInt(match[1] as string, 36)
  const cursor = match[2] ? parseInt(match[2], 36) : 0
  if (!Number.isFinite(seed) || seed <= 0 || !Number.isFinite(cursor) || cursor < 0) return null
  return { seed, cursor }
}

export type WallVerdict = {
  survivor: Enemy
  streak: number
  firstOut: Enemy | null
  revengePick: Enemy | null
  noMercyPick: { winner: Enemy; loser: Enemy } | null
  /** the highest-ranked name the wall showed — "היציע היה משאיר: X" */
  terracePick: Enemy
  /** everyone torn down, in order */
  out: Enemy[]
  code: string
}

export function judgeWall(enemies: readonly Enemy[], wall: Wall, seed: number, cursor = 0): WallVerdict | null {
  const bySlug = new Map(enemies.map((enemy) => [enemy.slug, enemy]))
  const survivor = bySlug.get(wall.holder)
  if (!survivor || wall.picks.length === 0) return null
  const seen = [...new Set(wall.picks.flatMap((pick) => [pick.winner, pick.loser]))]
    .map((slug) => bySlug.get(slug))
    .filter((enemy): enemy is Enemy => enemy !== undefined)
  const terracePick = [...seen].sort((a, b) => a.terraceRank - b.terraceRank)[0] ?? survivor
  const mercy = wall.picks.find((pick) => pick.noMercy)
  const mercyWinner = mercy ? bySlug.get(mercy.winner) : undefined
  const mercyLoser = mercy ? bySlug.get(mercy.loser) : undefined
  return {
    survivor,
    streak: streakOf(wall),
    firstOut: bySlug.get(wall.picks[0]?.loser ?? '') ?? null,
    revengePick: wall.revengePick ? (bySlug.get(wall.revengePick) ?? null) : null,
    noMercyPick: mercyWinner && mercyLoser ? { winner: mercyWinner, loser: mercyLoser } : null,
    terracePick,
    out: wall.out.map((slug) => bySlug.get(slug)).filter((enemy): enemy is Enemy => enemy !== undefined),
    code: wallCode(seed, cursor, wall.picks, wall.revengePick),
  }
}

/* ------------------------------------------------------ rule 18, as a function */

const NO_CITATION = /לא אומת|לא נטען/

/**
 * The neutral label the owner's own knowledge is cited under (spec §0.2, 22.9.2026): it is
 * a source, and it is labelled as one, but his name is not presented as an archive source.
 * Defined once, beside the `/credits` groups that shelve it.
 */
export { OWNER_KNOWLEDGE_LABEL }

/**
 * Where a row's record comes from. A row whose "source" says it could not be verified
 * (`williams`, `vujcic`) has NO citation, so it prints the charge and the era and
 * nothing that reads as a fact. The owner's own knowledge (`gola`) is a source — cited
 * under `OWNER_KNOWLEDGE_LABEL`, never dressed as a press line (rule 18). The kind is
 * still called `'maor'` in code, which is not a credit anybody reads.
 */
export function recordKind(sourceTitle: string): Enemy['record'] {
  if (sourceTitle.startsWith(OWNER_KNOWLEDGE_LABEL)) return 'maor'
  if (sourceTitle.trim() === '' || NO_CITATION.test(sourceTitle)) return 'none'
  return 'cited'
}
