import type {FinalResult} from '@/lib/fixtures/types'

/** FINAL WHISTLE job and watch records (spec §10). Stored one file each under `final-whistle/` in the durable store. */
export type JobState = 'candidate' | 'confirming' | 'ready' | 'rendering' | 'sending' | 'sent'
  | 'retryable_failed' | 'needs_review' | 'delivery_unknown' | 'superseded'

/** one successful look at the provider's final, kept so stability can be judged by time, not by count of calls */
export type Observation = {at: string; fingerprint: string}

export type Watch = {
  providerEventId: string
  clubId: string
  /** the provider's team id, kept once identified so it is never searched again */
  providerTeamId: string | null
  kickoff: string
  dateOnly: boolean
  /** first time any run saw a final for this event */
  firstFinalSeenAt: string | null
  observations: Observation[]
  lastResult: FinalResult | null
  /** the fingerprint that passed stability — a later, different one is a CORRECTION, never an overwrite */
  confirmedFingerprint: string | null
  state: 'waiting' | 'confirming' | 'ready' | 'needs_review' | 'done'
  /** why it waits or needs a person — shown in the admin, never guessed away */
  note: string | null
  /** every job made for this event, oldest first; a new one after a sent job is a CORRECTION */
  jobs?: string[]
}

export type Config = {
  enabled: boolean
  dryRun: boolean
  /** every club the provider can identify is watched, published or not (owner, 16.10.2026) — unless this is off */
  allClubs: boolean
  /** used only when `allClubs` is off */
  clubIds: string[]
  /** `morning`: a result is sent at 06:00 Athens the day after the match (yesterday's results, every morning). `live`: at the whistle. */
  delivery: 'morning' | 'live'
  /** events that kicked off before this are never sent (bootstrap: no history), unless a backfill is asked for */
  bootstrapAt: string | null
  /** configured / not configured only — never the secret itself */
  deliveryConfigured: boolean
  /** when a scheduled run last reported the delivery secret as set / missing */
  deliverySeenAt: string | null
}
export const DEFAULT_CONFIG: Config = {enabled: false, dryRun: true, allClubs: true, clubIds: [], delivery: 'morning', bootstrapAt: null, deliveryConfigured: false, deliverySeenAt: null}

export const DESTINATION_ID = 'owner-telegram'
export const MAX_ATTEMPTS = 5
export const LEASE_MS = 10 * 60_000

export type Delivered = {photo?: number; document?: number}
export type Job = {
  id: string
  destinationId: typeof DESTINATION_ID
  providerEventId: string
  clubId: string
  fingerprint: string
  kind: 'FINAL' | 'CORRECTED'
  state: JobState
  result: FinalResult
  /** a dry-run job renders and is checked but never leaves the building */
  dryRun: boolean
  /** a morning job is not claimed before this instant */
  notBefore?: string | null
  createdAt: string
  updatedAt: string
  attempts: number
  lease: {by: string; until: string} | null
  retryAfter: string | null
  delivered: Delivered
  sentAt: string | null
  /** what went wrong or what a person should know — never a secret */
  note: string | null
}
export type Destination = {chatId: string; linkedAt: string}
export type RunInfo = {at: string; clubs: number; watched: number; created: number; errors: string[]; /** clubs not reached this run (out of time); they go first next time */ deferred?: number}
