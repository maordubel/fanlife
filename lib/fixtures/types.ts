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

/** a finished match with a recorded score (the provider's "last events"); the hub's Stop Press reads it as LAST */
export type Result = {
  clubId: string
  kickoff: string
  home: string
  away: string
  homeScore: number
  awayScore: number
  clubSide: 'home' | 'away'
  opponent: string
  competition: string | null
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
  /** the latest finished match per club, where the provider has one — absent on feeds cached before results existed */
  results?: Result[]
  diagnostics: FixtureDiagnostic[]
}

/**
 * FINAL WHISTLE (spec 16.10.2026). A result is only a FINAL when the provider says so in words — a score on its own,
 * or a kick-off in the past, is not an ending (the old FINISHED pattern also matched cancellations).
 * homeScore/awayScore keep ONE meaning: the match's main score, without the shoot-out's kicks. A 90-minute score is
 * never derived from an after-extra-time one.
 */
export type FinalStatus = 'FT' | 'AET' | 'PEN'
export type CompetitionKind = 'league' | 'cup' | 'friendly' | 'unknown'
export type FinalEvidence = {
  source: 'thesportsdb' | '365scores'
  providerEventId: string
  /** the provider's own status word, as received — the allowlist grows from what the dry run actually sees */
  rawStatus: string
  status: FinalStatus
  /** when WE observed it (UTC) */
  observedAt: string
  providerUpdatedAt: string | null
}
export type FinalResult = Result & {
  dateOnly: boolean
  finalStatus: FinalStatus
  regulationScore: { home: number; away: number } | null
  afterExtraTimeScore: { home: number; away: number } | null
  /** the shoot-out's kicks; null when the provider did not give them (a PEN without them is NEEDS REVIEW, never guessed) */
  penalties: { home: number; away: number } | null
  competitionKind: CompetitionKind
  evidence: FinalEvidence
}
