import type {Fixture} from './types'

export type RotationItem = Fixture & {phase: 'live' | 'today' | 'soon' | 'later'}
const HOUR = 3600_000

/**
 * The home page shows one club's next match at a time. Order: a match under way first, then
 * today's, then by kick-off. A club with no confirmed fixture is not in the list at all —
 * it sits the rotation out. Ties break by club id, so the order never flickers.
 */
export function rotationOrder(fixtures: readonly Fixture[], now: Date): RotationItem[] {
  const t = now.getTime()
  const phase = (f: Fixture): RotationItem['phase'] => {
    const k = Date.parse(f.kickoff)
    if (!f.dateOnly && k <= t && t - k <= 2 * HOUR) return 'live'
    if (k - t <= 24 * HOUR && k >= t - 2 * HOUR) return 'today'
    if (k - t <= 72 * HOUR) return 'soon'
    return 'later'
  }
  const rank = {live: 0, today: 1, soon: 2, later: 3} as const
  return fixtures
    .filter(f => Number.isFinite(Date.parse(f.kickoff)))
    .map(f => ({...f, phase: phase(f)}))
    .sort((a, b) => rank[a.phase] - rank[b.phase] || Date.parse(a.kickoff) - Date.parse(b.kickoff) || a.clubId.localeCompare(b.clubId))
}

/** Dwell time on one card: a nearer match stays longer. */
export const dwellMs = (p: RotationItem['phase']) => (p === 'live' || p === 'today' ? 9000 : 6500)
