import type {FixtureTeam} from './types'

/**
 * Which provider team is which club. A club with no row here simply has no "next match" —
 * the rotation skips it, nothing is guessed. Add a row when a club is added to the portal.
 * A row is only used when the provider's team name matches one of `names` EXACTLY (after
 * normalisation) AND its country matches: "Olympiacos" the Greek club, not a namesake.
 */
export const FIXTURE_TEAMS: readonly FixtureTeam[] = [
  {clubId: 'hapoel-tel-aviv', search: 'Hapoel Tel Aviv', searchAlso: ['Hapoel Tel Aviv FC', 'Hapoel Tel-Aviv', 'Hapoel Tel-Aviv FC', 'Hapoel Tel Aviv Football'], names: ['hapoel tel aviv', 'hapoel tel aviv fc'], countries: ['israel']},
  {clubId: 'hapoel-petah-tikva', search: 'Hapoel Petah Tikva', names: ['hapoel petah tikva', 'hapoel petach tikva', 'hapoel petah tikvah'], countries: ['israel']},
  {clubId: 'olympiacos', search: 'Olympiacos', names: ['olympiacos', 'olympiacos fc', 'olympiakos', 'olympiakos piraeus', 'olympiacos piraeus'], countries: ['greece']},
  // 7.10.2026 — every club in the portal (owner: "all our clubs must appear"); exact names + country still decide
  {clubId: 'maccabi-haifa', search: 'Maccabi Haifa', names: ['maccabi haifa', 'maccabi haifa fc'], countries: ['israel']},
  {clubId: 'panathinaikos', search: 'Panathinaikos', names: ['panathinaikos', 'panathinaikos fc', 'panathinaikos athens'], countries: ['greece']},
  {clubId: 'aek-athens', search: 'AEK Athens', names: ['aek athens', 'aek athens fc', 'aek'], countries: ['greece']},
  {clubId: 'paok', search: 'PAOK', names: ['paok', 'paok fc', 'paok thessaloniki', 'paok salonika'], countries: ['greece']},
  {clubId: 'dinamo-zagreb', search: 'Dinamo Zagreb', names: ['dinamo zagreb', 'gnk dinamo zagreb'], countries: ['croatia']},
  {clubId: 'hajduk-split', search: 'Hajduk Split', names: ['hajduk split', 'hnk hajduk split'], countries: ['croatia']},
  {clubId: 'st-pauli', search: 'St. Pauli', names: ['st pauli', 'fc st pauli'], countries: ['germany']},
  {clubId: 'borussia-dortmund', search: 'Borussia Dortmund', names: ['borussia dortmund', 'dortmund', 'bv borussia 09 dortmund'], countries: ['germany']},
  {clubId: 'leicester-city', search: 'Leicester City', names: ['leicester city', 'leicester', 'leicester city fc'], countries: ['england']},
  {clubId: 'atalanta', search: 'Atalanta', names: ['atalanta', 'atalanta bc', 'atalanta bergamo'], countries: ['italy']},
  {clubId: 'celtic', search: 'Celtic', names: ['celtic', 'celtic fc', 'celtic glasgow'], countries: ['scotland']},
  {clubId: 'partizan-belgrade', search: 'Partizan Belgrade', names: ['partizan', 'partizan belgrade', 'fk partizan', 'partizan beograd'], countries: ['serbia']},
  {clubId: 'union-berlin', search: 'Union Berlin', names: ['union berlin', 'fc union berlin', '1 fc union berlin'], countries: ['germany']},
  {clubId: 'zrinjski-mostar', search: 'Zrinjski Mostar', names: ['zrinjski mostar', 'hsk zrinjski mostar', 'hsk zrinjski', 'zrinjski'], countries: ['bosnia and herzegovina', 'bosnia herzegovina', 'bosnia']},
]
