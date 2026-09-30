'use server'

import { gradeInsert, matchOfCard, type InsertVerdict } from '@/lib/game/timeline'
import { recommend, type NextAction, type ResultContext } from '@/lib/results/context'
import { closeRoute, routeAnchors, tryLink } from '@/lib/game/thread'
import type { CloseResult, LinkResult } from '@/lib/game/thread-run'

/**
 * Server authority for both games behind gate 13.
 *
 * **החוט האדום** — `linkThread` asks whether a card really connects to the last stop
 * (rule 4: the adjacency never travels to the client), `closeThread` re-checks the whole
 * route onto the end and scores it against the optimum.
 *
 * **סדר כרונולוגי** (`/timeline/order`) — the date of the card in hand is derived here
 * from the seed and never travels before it is earned.
 */
const ids = (path: unknown): string[] => (Array.isArray(path) ? path.slice(0, 12).map((id) => String(id).slice(0, 160)) : [])

export async function linkThread(ref: string, path: string[], candidate: string): Promise<LinkResult> {
  return tryLink(String(ref).slice(0, 40), ids(path), String(candidate).slice(0, 160))
}

export async function closeThread(ref: string, path: string[], integrityLeft: number): Promise<CloseResult> {
  return closeRoute(String(ref).slice(0, 40), ids(path), Number(integrityLeft) || 0)
}

export async function submitInsert(
  seed: number,
  placed: number,
  slot: number,
  cursor = 0,
): Promise<InsertVerdict | null> {
  // A round is addressed by seed AND cursor once rotation is on; grading has to
  // re-derive with both or it grades a different deal than the one on screen.
  return gradeInsert(seed, placed, slot, cursor)
}

/** Gate 10: the device's closed routes as their anchors. */
export async function describeRoutes(routeIds: string[]) {
  return routeAnchors(Array.isArray(routeIds) ? routeIds.slice(0, 500).map((id) => String(id).slice(0, 80)) : [])
}

/**
 * The Universal Exit after a timeline run (ONE RED WORLD §5, §22, §38). The screen sends
 * the ids of the cards it placed wrong (their dates are already on its board); the server
 * turns the ones that are matches into canonical ids and asks `recommend()` for at most
 * two doors — the lineup of that night, its archive card.
 */
export async function nextAfterOrder(missed: string[], runId: string, score: number): Promise<NextAction[]> {
  const matchIds = [...new Set(ids(missed).map((id) => matchOfCard(id)).filter((id): id is string => Boolean(id)))].slice(0, 3)
  const context: ResultContext = {
    gateId: 13,
    runId: typeof runId === 'string' ? runId.slice(0, 32) : undefined,
    score: Number.isFinite(score) ? Math.trunc(score) : undefined,
    matchIds,
  }
  return recommend(context)
}

/**
 * The Universal Exit after a Red Thread run (ONE RED WORLD §22, §38). The anchors of the
 * routes that closed are archive ids the graph already dealt; they become the context's
 * matches and men, and `recommend()` answers with at most two doors.
 */
export async function nextAfterThread(anchors: string[], runId: string, score: number): Promise<NextAction[]> {
  const known = [...new Set(ids(anchors))]
  const context: ResultContext = {
    gateId: 13,
    runId: typeof runId === 'string' ? runId.slice(0, 32) : undefined,
    score: Number.isFinite(score) ? Math.trunc(score) : undefined,
    matchIds: known.filter((id) => id.startsWith('m_')).slice(0, 2),
    playerIds: known.filter((id) => id.startsWith('p_')).slice(0, 2),
    archiveEntityIds: known.filter((id) => !id.startsWith('m_') && !id.startsWith('p_')).slice(0, 2),
  }
  return recommend(context)
}
