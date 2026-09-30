import 'server-only'

import ussishkinFile from '@/content/manual/ussishkin.json'
import { archive, nameOf } from '@/lib/game/archive'

/**
 * ההיכל — everything the repo holds about Ussishkin Hall, assembled once.
 *
 * The wing used to read `archive.ussishkin` and print it as a wall of cards plus the
 * association archive. That is the RECORD, and the record was never the problem: 45
 * sourced facts, six declared gaps, four blocked sources. What was missing is that the
 * hall is a PLACE, and the repo already holds ten paintings of it — the corner with the
 * green roof, the floor from up in the stand, the derby night with the terrace full,
 * the empty room in the dark — sitting in `public/life/art` where only the 2D game can
 * reach them.
 *
 * So this module pulls the two halves together: the facts, the paintings, the three
 * documented matches played there, and the two lists the JSON envelope carries and no
 * screen has ever shown — `unknown` and `blocked`. Printing those is not a footnote.
 * A memorial that quietly omits what it could not find is decorating; one that prints
 * the gaps is a record.
 *
 * Rule 14 is held the same way it was: this file touches `ussishkin`, the association
 * tables and `basketballMatches`, and no football table at all.
 */

export type HallFact = {
  slug: string
  cat: 'building' | 'nights' | 'club' | 'players' | 'ussishkin-club'
  periodHe: string
  factHe: string
  sourceTitle: string
  sourceUrl: string
}

/** The slug of the hall in `venues.json`, so "played at Ussishkin" is a join, not a guess. */
export const HALL_SLUG = 'היכל-אוסישקין'

export const facts = archive.ussishkin as unknown as HallFact[]

export function factsIn(cat: HallFact['cat']): HallFact[] {
  return facts.filter((fact) => fact.cat === cat)
}

export function factOf(slug: string): HallFact | undefined {
  return facts.find((fact) => fact.slug === slug)
}

/**
 * מה שלא ידוע — the six gaps the file declares about itself, and the four sources that
 * refused to answer. Both arrays are part of the envelope, not the records, which is
 * why `archive.ts` (which loads records) never carried them.
 */
const envelope = ussishkinFile as { unknown?: string[]; blocked?: string[] }
export const openQuestions: string[] = envelope.unknown ?? []
export const blockedSources: string[] = envelope.blocked ?? []

/** The matches the archive can prove were played in the hall. Three, at the time of writing. */
export function nightsAtTheHall() {
  return archive.basketballMatches
    .filter((match) => match.venueSlug === HALL_SLUG)
    .map((match) => ({
      ...match,
      homeHe: nameOf.club(match.homeClubSlug),
      awayHe: nameOf.club(match.awayClubSlug),
    }))
    .sort((a, b) => (a.playedOn ?? '').localeCompare(b.playedOn ?? ''))
}

/** The association's own record: what happened, who held a seat, and the two ballots. */
export function whatTheFansBuilt() {
  const events = [...archive.associationEvents].sort((a, b) =>
    (a.happenedOn ?? '9999').localeCompare(b.happenedOn ?? '9999'),
  )
  const roles = [...archive.associationRoles]
  const elections = archive.elections.map((election) => ({
    election,
    runners: archive.electionCandidates
      .filter((row) => row.electionSlug === election.slug)
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)),
  }))
  return { events, roles, elections, milestones: archive.membershipMilestones }
}
