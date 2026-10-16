import {createHash} from 'node:crypto'
import type {FinalResult} from '@/lib/fixtures/types'

/**
 * The identity of a RESULT, not of when we saw it: teams, main score, status and shoot-out. It leaves out observedAt,
 * the template version and the competition label on purpose — a re-seen identical result must be the same job, and a
 * cosmetic change must never re-send (spec §10).
 */
export function scoreFingerprint(r: Pick<FinalResult, 'home' | 'away' | 'homeScore' | 'awayScore' | 'finalStatus' | 'penalties'>): string {
  const n = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
  const body = [n(r.home), n(r.away), r.homeScore, r.awayScore, r.finalStatus, r.penalties ? [r.penalties.home, r.penalties.away] : null]
  return createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 20)
}
/** destination + provider + event + club + result: the one key a delivery is allowed to happen under */
export const jobId = (destinationId: string, providerEventId: string, clubId: string, fingerprint: string) =>
  createHash('sha256').update(JSON.stringify(['thesportsdb', destinationId, providerEventId, clubId, fingerprint])).digest('hex').slice(0, 24)
