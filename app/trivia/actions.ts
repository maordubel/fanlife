'use server'

import { dealPersonalRun, entitiesOfQuestions, gradeAnswer, hintFor, type Hint, type RunPlan } from '@/lib/game/trivia'
import { Q_TOPICS, type AnswerValue, type Verdict } from '@/lib/game/questions/types'
import { recommend, type NextAction, type ResultContext } from '@/lib/results/context'

/**
 * Server authority for gate 2 (rule 4). The client holds question ids and options, never
 * an answer; these three calls are the only way anything about the truth crosses over,
 * and each crosses only AFTER the player has committed (or paid, for a hint).
 */

const ID = /^q_[0-9a-f]{12}$/

function clean(answer: unknown): AnswerValue | null {
  if (typeof answer === 'string') return answer.slice(0, 200)
  if (Array.isArray(answer) && answer.length <= 6 && answer.every((value) => typeof value === 'string')) {
    return answer.map((value) => value.slice(0, 200))
  }
  return null
}

/** grade one answer, by question id — a personal run needs no seed rebuild */
export async function submitAnswer(id: string, answer: AnswerValue): Promise<Verdict | null> {
  const value = clean(answer)
  if (typeof id !== 'string' || !ID.test(id) || value === null) return null
  return gradeAnswer(id, value)
}

/** the paid hint — derived on the server from the same options the client was dealt */
export async function requestHint(id: string, seed: number): Promise<Hint | null> {
  if (typeof id !== 'string' || !ID.test(id) || !Number.isFinite(seed)) return null
  return hintFor(id, Math.trunc(seed))
}

/**
 * Revenge and Surprise are built from the DEVICE's ledger, which only the device has. It
 * sends ids — never answers — and gets twelve ids back, which the lobby turns into a
 * `?q=` link: the run is then as shareable as any seeded one.
 */
export async function planPersonal(
  kind: 'revenge' | 'surprise',
  ledger: { wrong: string[]; seen: string[] },
  seed: number,
): Promise<RunPlan> {
  const ids = (list: unknown, cap: number) =>
    Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string' && ID.test(id)).slice(0, cap) : []
  return dealPersonalRun(
    kind === 'revenge' ? 'revenge' : 'surprise',
    { wrong: ids(ledger?.wrong, 200), seen: ids(ledger?.seen, 2000) },
    Number.isFinite(seed) ? Math.trunc(seed) : 1,
  )
}

/**
 * The Universal Exit's "עוד משהו טבעי" for a finished run (ONE RED WORLD §5, §38).
 *
 * The screen sends the ResultContext it can build itself — gate, run, score, the topics it
 * went well and badly on — plus the ids of the questions that slipped. The server adds
 * what only it may know: the archive entities behind those questions (a question's facts
 * name them; the client never holds a fact), and asks `recommend()` for at most two doors,
 * every href checked by `lib/links`. Called after the whistle only, so nothing here can
 * help a run in progress.
 */
export async function nextAfterRun(input: {
  context: ResultContext
  wrong: string[]
}): Promise<{ context: ResultContext; next: NextAction[] }> {
  const topics = new Set<string>(Q_TOPICS)
  const slugs = (list: unknown) =>
    Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string' && topics.has(s)).slice(0, 7) : []
  const raw = input?.context
  const context: ResultContext = {
    gateId: 2,
    runId: typeof raw?.runId === 'string' ? raw.runId.slice(0, 64) : undefined,
    score: typeof raw?.score === 'number' && Number.isFinite(raw.score) ? Math.trunc(raw.score) : undefined,
    strengths: slugs(raw?.strengths),
    weakTopics: slugs(raw?.weakTopics),
  }
  const wrong = Array.isArray(input?.wrong) ? input.wrong.filter((id): id is string => typeof id === 'string' && ID.test(id)).slice(0, 12) : []
  const entityIds = entitiesOfQuestions(wrong)
  context.matchIds = entityIds.filter((id) => id.startsWith('m_')).slice(0, 3)
  context.playerIds = entityIds.filter((id) => id.startsWith('p_')).slice(0, 3)
  context.archiveEntityIds = entityIds.filter((id) => !id.startsWith('m_') && !id.startsWith('p_')).slice(0, 3)
  return { context, next: recommend(context) }
}
