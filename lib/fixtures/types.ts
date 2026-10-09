export type FixtureTeam = {
  /** the club's id in lib/master/registry.ts */
  clubId: string
  /** what the provider is searched for; the answer must still match `names` exactly */
  search: string
  /** further search terms, tried in order when `search` does not identify the club exactly (never fuzzy: the answer must still match `names`) */
  searchAlso?: readonly string[]
  /** every normalised spelling the provider may use for this club (rule 7: aliases, never fuzzy) */
  names: readonly string[]
  /** normalised provider country names that identify the right club of that name */
  countries: readonly string[]
}

export type Fixture = {
  clubId: string
  /** ISO-8601 UTC. When the provider gave no kick-off time this is midnight UTC and `dateOnly` is true. */
  kickoff: string
  dateOnly: boolean
  home: string
  away: string
  clubSide: 'home' | 'away'
  opponent: string
  competition: string | null
  round: string | null
  venue: string | null
  status: 'scheduled' | 'postponed'
  providerEventId: string
}

export type FixtureDiagnostic = {
  clubId: string
  teamId: string | null
  /** why there is no fixture, or how it was chosen — shown by /api/fixtures so the feed can be checked by eye */
  note: string
  eventsNext: number
  leagueNext: number
}

export type FixtureFeed = {
  status: 'ok' | 'partial' | 'unavailable'
  source: 'thesportsdb'
  generatedAt: string
  fixtures: Fixture[]
  diagnostics: FixtureDiagnostic[]
}
