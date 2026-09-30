/**
 * מגירת הסקאוטינג — how the drawer orders 661 names once a slot has been chosen.
 *
 * The interaction this file exists for: **the position is picked first, the man second.**
 * That is the one change in gate 1 that makes the drawer worth having at all — a search
 * box over the whole roster answers "where is בוזגלו", which the sheet already did well;
 * a drawer that knows which slot is open can answer "who could stand here", which it
 * could not.
 *
 * Everything here is pure and client-safe. The filtering and the ranking stay where they
 * already live — `lib/game/roster-search.ts`, tuned once against Maor's "it has to find a
 * man by his family name" and deliberately not rewritten. This adds exactly two things on
 * top of that list: which bucket a man falls in against the open slot, and the order
 * inside each bucket.
 *
 * **No bucket is a verdict about a player.** `fit` means a source files him under a
 * position this slot accepts; `other` means it files him under one it does not; `unknown`
 * means no source files him at all — twenty-five men, and they are shown rather than
 * quietly dropped. See `lib/xi/roles.ts` for why the mapping only ever runs from the
 * formation to the archive and never back. Gate 1 grades nobody, and neither does this.
 */

import { positionsOf, type Searchable } from '@/lib/game/roster-search'
import { fitOf, type Fit, type SlotRole } from './roles'

/**
 * מיון — four orders, and none of them is a judgement of a player.
 *
 * `fit` keeps the order the search handed over (family-name rank, or alphabetical when
 * there is no query) and lets the bucketing do the work. The other three answer
 * questions a supporter building an all-time eleven actually asks out loud: by name, by
 * who was here first, by who was here last.
 */
export type ScoutOrder = 'fit' | 'name' | 'earliest' | 'latest'

export const SCOUT_ORDERS: readonly ScoutOrder[] = ['fit', 'name', 'earliest', 'latest']

export function isScoutOrder(value: string): value is ScoutOrder {
  return (SCOUT_ORDERS as readonly string[]).includes(value)
}

export type ScoutGroups = {
  fit: Searchable[]
  other: Searchable[]
  unknown: Searchable[]
}

export function fitFor(entry: Searchable, role: SlotRole): Fit {
  return fitOf(positionsOf(entry), role)
}

/**
 * Order one bucket.
 *
 * A man the archive cannot date sits at the END of a year order rather than at the
 * start: `null` is not year zero, and sorting him to the top of "earliest" would state
 * that he played before everybody else.
 */
function ordered(entries: Searchable[], order: ScoutOrder): Searchable[] {
  if (order === 'fit') return entries
  const list = [...entries]
  if (order === 'name') {
    list.sort((a, b) => a.familyHe.localeCompare(b.familyHe, 'he'))
    return list
  }
  const key = (entry: Searchable): number | null =>
    order === 'earliest' ? (entry.fromYear ?? null) : (entry.toYear ?? entry.fromYear ?? null)
  list.sort((a, b) => {
    const left = key(a)
    const right = key(b)
    if (left === null && right === null) return a.familyHe.localeCompare(b.familyHe, 'he')
    if (left === null) return 1
    if (right === null) return -1
    return order === 'earliest' ? left - right : right - left
  })
  return list
}

/**
 * Split a list against the open slot.
 *
 * `fitOnly` drops the men a source places somewhere this slot does not accept. It does
 * NOT drop the men no source places at all — hiding those would turn "the archive is
 * silent about him" into "he does not suit this position", which is a claim about a
 * person that nothing supports (rule 11).
 */
export function scoutGroups(
  entries: Searchable[],
  role: SlotRole,
  order: ScoutOrder,
  fitOnly: boolean,
): ScoutGroups {
  const groups: ScoutGroups = { fit: [], other: [], unknown: [] }
  for (const entry of entries) groups[fitFor(entry, role)].push(entry)
  return {
    fit: ordered(groups.fit, order),
    other: fitOnly ? [] : ordered(groups.other, order),
    unknown: ordered(groups.unknown, order),
  }
}

export function scoutTotal(groups: ScoutGroups): number {
  return groups.fit.length + groups.other.length + groups.unknown.length
}
