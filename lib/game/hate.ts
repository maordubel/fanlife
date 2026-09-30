import 'server-only'

import { positionOf, takeFrom } from '@/lib/rotation/deck'

import { archive, rng, shuffle } from './archive'
import { NO_MERCY_ROUNDS, QUEUE_LENGTH, recordKind, type Enemy } from './hate-run'

/**
 * הקיר השחור — the deal.
 *
 * Ten names: one on the wall, eight to come for it in order, and a spare. The duels are
 * not dealt because they cannot be — who holds the wall in round 7 depends on round 6.
 * The QUEUE is deterministic, and the queue is what a `?seed=` (or a WALL code) must
 * reproduce for a shared wall to be the same wall.
 *
 * Maor's fifty-six are split three ways, and each part rotates on its own deck:
 *
 *  · **the top twelve** of his ranking feed ONLY the two בלי רחמים rounds (4 and 7) —
 *    two a wall, six walls before one repeats;
 *  · the rest are split at the middle of what is left, and the other eight places
 *    alternate between the two halves, so a wall is never eight household names in a
 *    row and never eight obscure ones.
 *
 * Keeping the three pools apart is what keeps the rotation promise (rule 72): a name
 * dealt into a no-mercy round this visit cannot turn up in an ordinary slot the next.
 *
 * The roster is cross-sport on purpose — rule 14 keeps FOOTBALL QUESTIONS clean; it was
 * never a rule about who the terrace hates. `sport` travels on every row.
 */

export type { Enemy } from './hate-run'

/*
 * The charge is the terrace's voice, and its credit — the enemies file's own source, the
 * ranking of 1.9.2026 under the owner-knowledge label (rule 18 §3, spec §0.2) — is printed
 * on /credits, read from the file by `lib/credits`. `chargeCredit()` retired on 22.9.2026
 * with the credit line it fed (spec §0.3).
 */

function roster(): Enemy[] {
  return archive.enemies.map((row) => {
    const record = recordKind(row.sourceTitle)
    return {
      slug: row.slug,
      nameHe: row.nameHe,
      latin: row.latin,
      category: row.category,
      sport: row.sport,
      eraHe: row.eraHe,
      chargeHe: row.chargeHe,
      // rule 18 §1: a row with no real citation prints the charge and the era, nothing
      // that reads as a fact — stripped here, on the server, so no screen can print it
      detailHe: record === 'none' ? '' : row.detailHe,
      keyFactHe: record === 'none' ? '' : row.keyFactHe,
      terraceRank: row.terraceRank,
      sourceTitle: row.sourceTitle,
      record,
    }
  })
}

export function rosterSize(): number {
  return archive.enemies.length
}

export const NO_MERCY_POOL = 12

/**
 * חלון של חיים (21.9.2026, `lib/mechanics/types.ts`) — Shachor's wall on the steps of
 * Ussishkin in THE WORKER LIFE: one sport (his is basketball — rule 6), only the names
 * that were already names before `before`, and none of the later record printed beside
 * them. A shorter wall where the window is thin; `over()` already ends it when the queue
 * does. Absent, the gate's wall is untouched.
 */
export type WallWindow = { before: number; sport?: 'football' | 'basketball' }

/** the first year a row's era names — `מכבי ת״א · 1969—` → 1969; the event day where there is one */
function eraStart(enemy: { eraHe: string }, happenedOn: string | null): number {
  const fromEra = /(\d{4})/.exec(enemy.eraHe)
  if (fromEra) return Number(fromEra[1])
  const fromDay = happenedOn ? Number(happenedOn.slice(0, 4)) : NaN
  return Number.isFinite(fromDay) ? fromDay : Number.POSITIVE_INFINITY
}

/** the names a window may put on the wall — the life asks how many before it deals */
export function wallPool(window: WallWindow): Enemy[] {
  const dayOf = new Map(archive.enemies.map((row) => [row.slug, (row as { happenedOn?: string | null }).happenedOn ?? null]))
  return roster()
    .filter((enemy) => (!window.sport || enemy.sport === window.sport) && eraStart(enemy, dayOf.get(enemy.slug) ?? null) < window.before)
    // the charge stays; the record printed beside it may be a later year's, and an era that
    // runs past the window is printed as still running ("1985–"), as it was that year
    .map((enemy) => ({ ...enemy, eraHe: eraUpTo(enemy.eraHe, window.before), detailHe: '', keyFactHe: '' }))
}

/** "1985–1996" seen from 1993 is "1985–": the end had not happened yet */
export function eraUpTo(eraHe: string, before: number): string {
  // the archive writes the span with an em dash ("1985—1996"); any dash is read, and kept
  return eraHe.replace(/(\d{4})(\s*[–—-]\s*)(\d{4})/, (all, from: string, dash: string, to: string) =>
    Number(to) >= before ? `${from}${dash.trim()}` : all,
  )
}

/** The ten names of this wall, in the order they go up, and which were dealt without mercy. */
export function dealQueue(seed: number, cursor = 0, window?: WallWindow): { enemies: Enemy[]; order: string[]; noMercy: string[] } {
  if (window) {
    const order = shuffle(wallPool(window), rng(seed + cursor * 7919)).slice(0, QUEUE_LENGTH)
    return { enemies: order, order: order.map((enemy) => enemy.slug), noMercy: [] }
  }
  const all = roster().sort((a, b) => a.terraceRank - b.terraceRank)
  const top = all.slice(0, NO_MERCY_POOL)
  const rest = all.slice(NO_MERCY_POOL)
  const midpoint = Math.ceil(rest.length / 2)
  const upper = rest.slice(0, midpoint)
  const lower = rest.slice(midpoint)

  const mercySlots = NO_MERCY_ROUNDS.length
  const ordinary = QUEUE_LENGTH - mercySlots
  const upperTake = Math.ceil(ordinary / 2)
  const lowerTake = ordinary - upperTake

  const deal = (pool: Enemy[], take: number, salt: number) => {
    const at = positionOf(seed + salt, cursor, pool.length, take)
    return takeFrom(shuffle(pool, rng(at.seed)), at.slot * take, take)
  }
  const mercy = deal(top, mercySlots, 0)
  const ups = deal(upper, upperTake, 7)
  const downs = deal(lower, lowerTake, 13)

  const order: Enemy[] = []
  for (let index = 0; index < QUEUE_LENGTH; index += 1) {
    // index 0 is the wall; index N is round N's challenger
    const mercyAt = (NO_MERCY_ROUNDS as readonly number[]).indexOf(index)
    const next =
      mercyAt >= 0
        ? mercy[mercyAt]
        : order.filter((enemy) => upper.includes(enemy)).length <= order.filter((enemy) => lower.includes(enemy)).length
          ? (ups.shift() ?? downs.shift())
          : (downs.shift() ?? ups.shift())
    if (next) order.push(next)
  }
  return {
    enemies: order,
    order: order.map((enemy) => enemy.slug),
    noMercy: mercy.map((enemy) => enemy.slug),
  }
}
