/** TODAY'S FOOTBALL: one snapshot of every match of every watched club on one Athens calendar day, drawn as stories and posts. */
export const TEMPLATE_VERSION = 'matchday-1'
export const PER_PAGE = 4
/** a club's look at the provider older than this is looked at again before the snapshot is closed */
export const FRESH_MS = 30 * 60_000
/** a failed look is not repeated within this window (the same run must not hammer a refusing provider) */
export const ERROR_HOLD_MS = 2 * 60_000
export const MAX_ATTEMPTS = 5
export const LEASE_MS = 10 * 60_000
export const DESTINATION_ID = 'final-whistle-owner'

export type Config = {
  enabled: boolean
  /** a dry-run job is drawn and checked, never sent */
  dryRun: boolean
  allClubs: boolean
  clubIds: string[]
  /** off: a game whose two crests are not both on file is withheld as graphics and sent as text with an alert */
  allowMissingCrests: boolean
  sendEmptyDay: boolean
  sendPartial: boolean
  /** Athens wall-clock hour of delivery */
  sendHour: number
}
export const DEFAULT_CONFIG: Config = {enabled: false, dryRun: true, allClubs: true, clubIds: [], allowMissingCrests: false, sendEmptyDay: true, sendPartial: true, sendHour: 5}

export type FixtureStatus = 'scheduled' | 'live' | 'finished' | 'postponed'
export type Coverage = 'complete' | 'partial' | 'unavailable'

/** the data contract of the template (kit §6) */
export type TemplateFixture = {
  id: string
  home: {id: string; name: string}
  away: {id: string; name: string}
  kickoff: string | null
  localDate?: string
  competition: string | null
  status: FixtureStatus
  source: {url: string; observedAt: string}
}
export type SnapshotData = {
  sample: false
  day: string
  coverage: Coverage
  updatedAt: string
  fixtures: TemplateFixture[]
}
export type Snapshot = SnapshotData & {
  coverageByClub: Record<string, 'complete' | 'unconfirmed' | 'error'>
  missingClubIds: string[]
  /** matches left out on purpose (cancelled), with the provider's word */
  excluded: Array<{id: string; reason: string}>
  missingCrests: string[]
  hash: string
  templateVersion: string
}

/** what one club's look at the provider found for the day */
export type ClubDay = {
  clubId: string
  providerTeamId: string | null
  coverage: 'complete' | 'unconfirmed' | 'error'
  reason: string | null
  fetchedAt: string
  events: ProviderDayEvent[]
}
export type ProviderDayEvent = {
  id: string; home: string; away: string; homeId: string | null; awayId: string | null
  kickoff: string; dateOnly: boolean; competition: string | null; status: string
}

export type JobState = 'ready' | 'rendering' | 'sending' | 'sent' | 'retryable_failed' | 'needs_review' | 'delivery_unknown' | 'superseded'
export type JobMode = 'images' | 'text' | 'blocked'
export type Job = {
  id: string
  day: string
  revision: number
  kind: 'DAILY' | 'UPDATED'
  destinationId: typeof DESTINATION_ID
  state: JobState
  mode: JobMode
  snapshot: Snapshot
  /** the message ids already delivered, by part key ('header', 'story-01', 'post-01', 'caption', 'text', 'alert') */
  delivered: Record<string, number>
  dryRun: boolean
  notBefore: string
  createdAt: string
  updatedAt: string
  attempts: number
  lease: {by: string; until: string} | null
  retryAfter: string | null
  sentAt: string | null
  note: string | null
}
export type PrepareProgress = {day: string; clubs: number; looked: number; settled: number; done: boolean}
