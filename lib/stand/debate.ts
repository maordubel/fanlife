import { daySeed } from '@/lib/daily/rotation'
import type { Daily } from '@/lib/daily/types'
import { GATES } from '@/lib/gates'
import { debateRound } from '@/lib/polls/debates'

/**
 * The stand's debate of the day — ONE for everybody on a date (§8.2 "active debate").
 * Client-safe: the device needs the id to report its vote, the server needs it to count.
 *
 * When today's daily already chose a debate (the "אחד לבחור" slot), that IS the stand's
 * debate: one argument a day, not two. Otherwise the first prompt of a round pinned to the
 * date — the same door gate 7 itself deals, so the link opens on exactly that prompt.
 */
export type StandDebate = { id: string; promptHe: string; href: string }

export function standDebate(daily: Daily): StandDebate | null {
  const chosen = daily.items.find((item) => item.kind === 'debate' && item.done.by === 'debate')
  if (chosen && chosen.done.by === 'debate') {
    return { id: chosen.done.debateId, promptHe: chosen.subjectHe ?? '', href: chosen.href }
  }
  const base = GATES.find((gate) => gate.number === 7)?.href?.split('?')[0]
  if (!base) return null
  const seed = daySeed(daily.date, 'stand-debate')
  const debate = debateRound(seed, 0).debates[0]
  return debate ? { id: debate.id, promptHe: debate.promptHe, href: `${base}?tab=debate&seed=${seed}` } : null
}
