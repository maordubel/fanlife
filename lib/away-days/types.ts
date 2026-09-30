/**
 * AWAY DAYS — the data contracts (spec §19–§21, §33; 24.9.2026).
 *
 * Match truth is the Match Master, venue identity is the venue registry
 * (`content/manual/venue-registry.json`), and `content/generated/away-days-master.json`
 * is an index over both: it copies no result a reader could not recompute from the master,
 * and it says, for every match it did not publish, exactly why.
 */

export type HistoricalName = { name: string; from?: string; to?: string }

export type VenueRecord = {
  id: string
  canonicalNameHe: string
  canonicalNameLatin: string | null
  aliases: string[]
  historicalNames: HistoricalName[]
  cityHe: string
  cityLatin: string | null
  countryHe: string
  /** ISO-3166 alpha-2 (GB for England and Scotland alike) */
  countryCode: string
  latitude: number
  longitude: number
  openedYear?: number | null
  closedYear?: number | null
  successorVenueId?: string | null
  sourceRefs: string[]
  confidence: number
  /** the `records` slug of venues.json that names the same ground, where one exists */
  legacySlug?: string
  note?: string
}

/** One row of `content/manual/match-venues.json` (spec §20). */
export type MatchVenueRow = {
  matchId: string
  venueId: string | null
  /** the PHYSICAL country — it alone decides whether a match is an away day */
  countryCode: string | null
  sourceRefs: string[]
  confidence: number
  /** what the venue source itself says about the match, cross-checked against the master */
  check: { playedOn: string | null; side: 'HOME' | 'AWAY' | null; for: number; against: number } | null
  status?: 'walkover' | 'venue-unknown' | 'domestic-opponent' | 'in-israel' | 'no-coordinates' | 'venue-conflict'
  reason?: string
  candidates?: string[]
}

export type DesignatedSide = 'HOME' | 'AWAY' | 'NEUTRAL' | null
export type Result = 'W' | 'D' | 'L'

export type VerifiedScorer = { nameHe: string; minute: number | null; penalty: boolean; ownGoal: boolean }

export type AwayVisit = {
  id: string
  matchId: string
  playedOn: string
  venueId: string
  designatedSide: DesignatedSide
  physicallyAbroad: true
  competitionHe: string
  stageHe: string | null
  opponentHe: string
  opponentLatin: string | null
  scoreFor: number
  scoreAgainst: number
  result: Result
  /** only when every Hapoel goal is a resolved, confidence ≥ 2 entry of the master */
  scorers: VerifiedScorer[] | null
  sourceRefs: string[]
}

export type AwayVenueStop = {
  venueId: string
  matchIds: string[]
  visitIds: string[]
  firstVisit: string
  lastVisit: string
  visitCount: number
}

export type AccuracyStatus = 'VERIFIED' | 'PARTIAL' | 'CONFLICT' | 'BLOCKED'

export type ResearchReason = {
  code:
    | 'not-played'
    | 'physical-venue-unknown'
    | 'likely-domestic'
    | 'venue-missing'
    | 'venue-conflict'
    | 'no-coordinates'
    | 'date-disputed'
    | 'date-unknown'
    | 'home-disputed'
    | 'opponent-unresolved'
    | 'score-unknown'
    | 'result-disputed'
    | 'open-conflict'
    | 'low-confidence'
    | 'check-date'
    | 'check-side'
    | 'check-score'
    | 'master-venue'
  detail: string
}

export type ResearchItem = {
  matchId: string
  playedOn: string | null
  status: Exclude<AccuracyStatus, 'VERIFIED'>
  competitionHe: string
  stageHe: string | null
  opponentHe: string | null
  score: { for: number; against: number } | null
  designatedSide: DesignatedSide
  venueId: string | null
  countryCode: string | null
  candidates: string[]
  missing: string[]
  reasons: ResearchReason[]
  sourceRefs: string[]
}

export type AwayDaysMaster = {
  schemaVersion: number
  generatedFrom: { matchMasterFingerprint: string; venuesFingerprint: string; matchVenuesFingerprint: string }
  origin: { venueId: string }
  counts: {
    candidates: number
    visits: number
    stops: number
    countries: number
    inIsrael: number
    researchQueue: number
    byStatus: Record<Exclude<AccuracyStatus, 'VERIFIED'>, number>
  }
  venues: VenueRecord[]
  /** chronological — playedOn, then matchId */
  visits: AwayVisit[]
  /** one per marker */
  stops: AwayVenueStop[]
  researchQueue: ResearchItem[]
}
