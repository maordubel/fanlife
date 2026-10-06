import type {FixtureTeam} from './types'

/**
 * Which provider team is which club. A club with no row here simply has no "next match" —
 * the rotation skips it, nothing is guessed. Add a row when a club is added to the portal.
 * A row is only used when the provider's team name matches one of `names` EXACTLY (after
 * normalisation) AND its country matches: "Olympiacos" the Greek club, not a namesake.
 */
export const FIXTURE_TEAMS: readonly FixtureTeam[] = [
  {clubId: 'hapoel-tel-aviv', search: 'Hapoel Tel Aviv', names: ['hapoel tel aviv', 'hapoel tel aviv fc'], countries: ['israel']},
  {clubId: 'hapoel-petah-tikva', search: 'Hapoel Petah Tikva', names: ['hapoel petah tikva', 'hapoel petach tikva', 'hapoel petah tikvah'], countries: ['israel']},
  {clubId: 'olympiacos', search: 'Olympiacos', names: ['olympiacos', 'olympiacos fc', 'olympiakos', 'olympiakos piraeus', 'olympiacos piraeus'], countries: ['greece']},
  {clubId: 'zrinjski-mostar', search: 'Zrinjski Mostar', names: ['zrinjski mostar', 'hsk zrinjski mostar', 'hsk zrinjski', 'zrinjski'], countries: ['bosnia and herzegovina', 'bosnia herzegovina', 'bosnia']},
]
