'use server'

import { recommend, type NextAction, type ResultContext } from '@/lib/results/context'

/**
 * שער 1 — the Universal Exit's "עוד משהו טבעי" (ONE RED WORLD §5, §38).
 *
 * The poster sends the ResultContext it can build itself — the men it put the armband on,
 * brought up from the stand and cut last, as Player Master ids — and the server answers with
 * at most two doors, every href checked by `lib/links`. Nothing is graded here: gate 1 has no
 * right answer, so the context carries no score.
 */
const PLAYER = /^p_[0-9a-f]{6,}$/
const CHOICE = /^[\p{L}\p{N}\-:. ]{1,32}$/u

export async function nextAfterXI(input: { context: ResultContext }): Promise<{ context: ResultContext; next: NextAction[] }> {
  const raw = input?.context
  const ids = Array.isArray(raw?.playerIds)
    ? raw.playerIds.filter((id): id is string => typeof id === 'string' && PLAYER.test(id)).slice(0, 3)
    : []
  const choices: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw?.choices ?? {})) {
    if (typeof value === 'string' && CHOICE.test(key) && CHOICE.test(value)) choices[key] = value
  }
  const context: ResultContext = {
    gateId: 1,
    runId: typeof raw?.runId === 'string' ? raw.runId.slice(0, 32) : undefined,
    playerIds: [...new Set(ids)],
    choices,
  }
  return { context, next: recommend(context) }
}
