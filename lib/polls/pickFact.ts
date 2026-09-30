import type { RosterEntry } from '@/lib/game/allTimeXI'
import type { ShirtBoard } from '@/lib/xi/board'
import type { KitSpec } from '@/lib/kit/spec'

/**
 * מה שהארכיון מחזיק על מי שבחרת — and, much more often, what it does not.
 *
 * Gate 7 is about opinion, so every screen in it is one bad idea away from asserting
 * something. The reference fills the moment after a pick with a terrace quote — *"ברור
 * שזה הוא"*, *"אין מצב"* — which is flavour text the brief itself marks as flavour. This
 * wing does not print it, and the reason is the same one rule 11 and rule 18 keep
 * making: a line in quotation marks about what supporters think is a claim about a count
 * nobody took, written as speech. It is the fabricated participation figure with the
 * digits taken out.
 *
 * What goes there instead is what the archive can actually say about the man whose name
 * was just tapped, and only that: the seasons the squad table puts him in, the position
 * a source states, and the shirt `lib/kit/playerKit.ts` has already joined to him. Every
 * one of those is a row with a source behind it, and the resolver hands over the source
 * so the screen can print it (rule 16).
 *
 * **And the silent case is the common one.** 265 of the 661 have no shirt and 20 have no
 * position at all (rules 64 §6 and 74). `null` fields are what this returns for them and
 * the screen prints one honest sentence — never a guess, never a filler quote.
 *
 * Nothing here reads a store or the archive: both inputs are payloads the route already
 * builds and both gates 1 and 7 already receive, so this is a join and not a second
 * player source (rule 1 — `lib/game/roster-facets.ts` remains the only one).
 */
export type PickFact = {
  /** the Player Master id, where the roster row carries one */
  id: string | null
  nameHe: string
  slug: string
  position: RosterEntry['position']
  positionFrom: RosterEntry['positionFrom']
  origin: RosterEntry['origin']
  fromYear: number | null
  toYear: number | null
  /** the season his shirt is drawn from, and the shirt itself — null for the 265 */
  seasonLabel: string | null
  spec: KitSpec | null
  /** where the shirt's look was read off, named on screen */
  sourceTitle: string | null
  /** what the club won that season, in the archive's own words */
  wonHe: readonly string[]
}

/**
 * The pick, resolved against the roster the screen already holds.
 *
 * A ballot stores the Player Master's `p_…` id since 21.9.2026, so the join is by id. A
 * slip that has not been migrated yet still holds the name `RosterSheet` wrote, and that
 * is matched EXACTLY — no folding and no fuzzy match (rule 7, rule 64 §2). Anything that
 * does not resolve answers `null` and the screen stays quiet, which is the honest failure.
 */
export function pickFact(
  pick: string | null | undefined,
  roster: readonly RosterEntry[],
  shirts: ShirtBoard | null,
): PickFact | null {
  if (pick === null || pick === undefined || pick === '') return null
  const entry = roster.find((row) => row.id === pick) ?? roster.find((row) => row.nameHe === pick)
  if (!entry) return null

  const given = shirts?.bySlug[entry.slug] ?? null
  const season = given ? (shirts?.seasons[given.seasonLabel] ?? null) : null

  return {
    id: entry.id ?? null,
    nameHe: entry.nameHe,
    slug: entry.slug,
    position: entry.position ?? null,
    positionFrom: entry.positionFrom ?? null,
    origin: entry.origin ?? null,
    fromYear: entry.fromYear ?? null,
    toYear: entry.toYear ?? null,
    seasonLabel: season?.seasonLabel ?? null,
    spec: season?.spec ?? null,
    sourceTitle: season?.sourceTitle ?? null,
    wonHe: season?.wonHe ?? [],
  }
}

/** Does this fact carry anything at all worth printing? */
export function factIsEmpty(fact: PickFact | null): boolean {
  if (fact === null) return true
  return fact.position === null && fact.fromYear === null && fact.spec === null
}

/** The span the squad table puts him in, as one LTR run — or null. */
export function spanOf(fact: PickFact): string | null {
  if (fact.fromYear === null) return null
  if (fact.toYear === null || fact.toYear === fact.fromYear) return String(fact.fromYear)
  return `${fact.fromYear}–${fact.toYear}`
}
