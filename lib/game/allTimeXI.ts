import 'server-only'

import { pickablePlayers } from '@/lib/archive/player-master'
import { FORMATIONS, DEFAULT_FORMATION, type Formation } from './lineup'
import { facetsOfPlayer } from './roster-facets'
import { byInitial, fold, splitName, type Searchable } from './roster-search'

/**
 * הרכב כל הזמנים — the free-play builder.
 *
 * Not a quiz. There is no right answer, no clock and no score: you pick eleven men from
 * everyone who has ever worn the shirt, argue with yourself about the second centre
 * back, and post it. That is the oldest game football supporters play and it needed no
 * inventing — it needed the 637 names Maor supplied to be reachable in a way that does
 * not fight the player.
 *
 * Which is the whole engineering problem here. Six hundred and thirty-seven names in a
 * list is not a feature, it is a wall. So the roster ships pre-split into given and
 * family name and bucketed by the FAMILY initial, with a ranked search, and the payload
 * carries names only — the archive knows nothing else about most of them, and pretending
 * otherwise would be inventing.
 */

export type RosterEntry = Searchable

export type RosterIndex = {
  /** every name, sorted the way a Hebrew reader expects */
  all: RosterEntry[]
  /** family-name initial → the names under it, for the letter rail */
  letters: { letter: string; names: RosterEntry[] }[]
  total: number
  /** how many of the 637 the archive can actually place — printed, not hidden */
  withPosition: number
  withOrigin: number
}

/**
 * חלון של חיים (21.9.2026, `lib/mechanics/types.ts`) — the XI a boy builds with his father
 * in THE WORKER LIFE, and the poll the ticket office asks him, are drawn from the men who
 * had worn the shirt before `before`. A man the archive cannot date is left out rather than
 * guessed in. Absent, the roster is the gate's.
 */
export type RosterWindow = { before: number }

export function rosterIndex(window?: RosterWindow): RosterIndex {
  // THE PLAYER MASTER, since 21.9.2026 — one row per PERSON, `kind === 'player'` only.
  // It is still the merged set (curated records plus the all-time roster, sport-scoped),
  // but the six men the archive had filed under two spellings are one row each now, and
  // a referee, a singer and two men a match report names without a role are no longer
  // offered as footballers. The row carries the master's canonical slug and name, and its
  // `id` (`p_…`) — the key a saved pick should hold from here on.
  //
  // The split happens HERE, once, at build time. Doing it in the component meant 637
  // regex splits on every keystroke, which is most of why the sheet felt heavy.
  //
  // The facets are attached HERE for the same reason the split is: once, at build time.
  // They are what lets the sheet be narrowed by position, by origin and by decade —
  // and most of them are `null`, deliberately. See `lib/game/roster-facets.ts`: the
  // archive states a position for a few dozen men and for nobody else, and a guessed
  // position in a roster of 637 would make every one of them untrustworthy.
  const all: RosterEntry[] = pickablePlayers()
    .map((player) => {
      const found = facetsOfPlayer(player)
      return {
        id: player.id,
        slug: player.slug,
        nameHe: player.displayName,
        ...splitName(player.displayName),
        position: found.position,
        // Only where there is more than one: 653 single-element arrays in the payload
        // would be a second copy of `position` on every row (rule 59), sent to a phone.
        ...(found.positions ? { positions: found.positions } : {}),
        positionFrom: found.positionFrom,
        origin: found.origin,
        originFrom: found.originFrom,
        // The club's foreign-slot record, kept apart from nationality (players.md §3.1):
        // the filter, the row badge and gate 1's challenges read THIS.
        foreignSlot: player.foreignSlot.status,
        ...(player.aliases.he.length > 0 ? { aliasesHe: player.aliases.he } : {}),
        fromYear: found.fromYear,
        toYear: found.toYear,
      }
    })
    .filter((entry) => !window || (entry.fromYear !== null && entry.fromYear !== undefined && entry.fromYear < window.before))
    .sort((a, b) => fold(a.familyHe).localeCompare(fold(b.familyHe), 'he'))

  return {
    all,
    letters: byInitial(all),
    total: all.length,
    withPosition: all.filter((entry) => entry.position !== null).length,
    withOrigin: all.filter((entry) => entry.origin !== null).length,
  }
}

export function formationList(): Formation[] {
  return Object.values(FORMATIONS)
}

export { DEFAULT_FORMATION }
