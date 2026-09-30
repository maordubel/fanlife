'use server'

import { resolvePlayerId } from '@/lib/archive/player-master'
import { judge, judgePair, type CardVerdict, type PairVerdict, type Verdict } from '@/lib/game/blackfile'
import { gateHref } from '@/lib/links'
import { recommend, type NextAction, type ResultContext } from '@/lib/results/context'

/** Server authority. The truth of a card never travels to the client before it is earned. */
export async function submitCard(id: string, answer: Verdict): Promise<CardVerdict | null> {
  return judge(id, answer)
}

export async function submitPair(
  aId: string,
  bId: string,
  pickedId: string,
): Promise<PairVerdict | null> {
  return judgePair(aId, bId, pickedId)
}

/**
 * The Universal Exit after the wall (ONE RED WORLD §5, §20, §38). The survivor is resolved
 * to a Player Master id only through the master's own aliases (rule 7) — owners and
 * officials resolve to nothing, and nothing is offered for them. Gate 1 is excluded: "הוא
 * נכנס להרכב שלך?" is not a question the hate wall asks about the name it could not tear off.
 */
export async function nextAfterWall(survivorHe: string, runId: string): Promise<NextAction[]> {
  const id = typeof survivorHe === 'string' ? resolvePlayerId(survivorHe.slice(0, 80)) : null
  const context: ResultContext = { gateId: 11, runId: typeof runId === 'string' ? runId.slice(0, 32) : undefined, playerIds: id ? [id] : [] }
  const xi = gateHref(1)
  return recommend(context, { exclude: xi ? [xi] : [] })
}
