/**
 * The contract a club's source adapter fulfils — the ingestion side of ClubContext.
 *
 * Every adapter, for any club, answers the same questions and obeys the same rules:
 *  · rule 6 — records are classified by sport before they enter; unknown/mixed enter nothing;
 *  · rule 11 — an unreadable field is null, an unusable row is reported with a reason,
 *    a blocked source is documented with WHOSE block it is;
 *  · rule 2 — each fact leaves with `sourceId` + `confidence`.
 * Hapoel Tel Aviv's adapters (`sources/vikipoel-*.ts`, `sources/redfans-*.ts`) already fit; a new
 * club implements this interface and nothing else in the pipeline changes.
 */
import type { ClubContext } from '@/lib/club/context'

export type Confidence = 1 | 2 | 3

export type Sourced<T> = { value: T | null; sourceId: string; confidence: Confidence }

export type SkippedRow = { source: string; row: string; reason: string }

export type AdapterResult<T> = { records: T[]; skipped: SkippedRow[]; blocked?: { source: string; whose: 'ours' | 'theirs' | 'unknown'; evidence: string } }

export interface ClubSourceAdapter {
  readonly club: ClubContext['id']
  readonly sourceId: string
  /** seasons, honours, squads, matches, players, kits… each returns records that carry provenance */
  matches(): Promise<AdapterResult<unknown>>
  players(): Promise<AdapterResult<unknown>>
  honours(): Promise<AdapterResult<unknown>>
  seasons(): Promise<AdapterResult<unknown>>
}
