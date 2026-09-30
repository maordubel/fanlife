'use server'

import { coachNote, dealChallenge, gradeLineup, type LineupWindow } from '@/lib/game/lineup'
import type { CoachNote, LineupVerdict, Placement } from '@/lib/game/lineup-sheet'
import { lineupHref } from '@/lib/links'
import { recommend, type NextAction, type ResultContext } from '@/lib/results/context'

/**
 * The verified XI stays on the server; only the verdict crosses.
 *
 * The board sends what it holds — `{playerId, line, order}` per man, the four bands and
 * nothing else — and the grade is by LINE (players.md §2, Gate 3 V3). A round is
 * addressed by seed AND cursor, so grading re-derives the same deal the screen shows.
 */
export async function submitLineup(
  seed: number,
  placements: Placement[],
  cursor = 0,
  window?: LineupWindow,
): Promise<LineupVerdict | null> {
  // a round is an integer seed and an integer cursor; anything else is not a round
  if (!Number.isInteger(seed) || !Number.isInteger(cursor)) return null
  // `window` is THE WORKER LIFE's: the same grade, re-derived over the match the life dealt
  return gradeLineup(seed, placements, cursor, cleanWindow(window))
}

/** what a client may send as a window: a year and an opaque match id, nothing else */
function cleanWindow(window?: LineupWindow): LineupWindow | undefined {
  if (!window || !Number.isFinite(window.before)) return undefined
  const pin = typeof window.pin === 'string' && /^m_[0-9a-f]{6,}$/.test(window.pin) ? window.pin : null
  return { before: Math.round(window.before), pin }
}

/**
 * פתק מהמאמן — a count over the verified XI (starters still hanging up, bench men on the
 * board, men in the right band), so it is computed where the answer lives. A kind and a
 * number cross; never a name, never a band.
 */
export async function askCoach(
  seed: number,
  placements: Placement[],
  cursor = 0,
  index = 0,
  window?: LineupWindow,
): Promise<CoachNote | null> {
  if (!Number.isInteger(seed) || !Number.isInteger(cursor) || !Number.isInteger(index)) return null
  return coachNote(seed, placements, cursor, index, cleanWindow(window))
}

/**
 * The Universal Exit's "עוד משהו טבעי" for a finished sheet (ONE RED WORLD §5, §38, §12).
 *
 * The match is re-derived from the round the board played (seed + cursor), never taken from
 * the client; the men it missed arrive as ids and only `p_…` ids pass. The same match's
 * lineup is excluded — the gate's own "again" is the replay, not a door.
 */
const PLAYER = /^p_[0-9a-f]{6,}$/

export async function nextAfterLineup(
  seed: number,
  cursor: number,
  found: number,
  missed: string[],
  window?: LineupWindow,
): Promise<{ context: ResultContext; next: NextAction[] }> {
  if (!Number.isInteger(seed) || !Number.isInteger(cursor)) return { context: { gateId: 3 }, next: [] }
  const matchId = dealChallenge(seed, cursor, cleanWindow(window))?.intro.matchId ?? null
  const context: ResultContext = {
    gateId: 3,
    runId: `${seed}:${cursor}`,
    score: Number.isFinite(found) ? Math.trunc(found) : undefined,
    matchIds: matchId ? [matchId] : [],
    playerIds: Array.isArray(missed) ? missed.filter((id) => typeof id === 'string' && PLAYER.test(id)).slice(0, 3) : [],
  }
  const own = matchId ? lineupHref(matchId) : null
  return { context, next: recommend(context, { exclude: own ? [own] : [] }) }
}
