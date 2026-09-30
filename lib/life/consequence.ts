/**
 * תוצאה — a thing you did has a price, and the game says so, now or later.
 *
 * The brief: "החמצת את האוטובוס" the moment it leaves, and "אולי כבר לא יחכו לך בשער" an
 * hour later, when the fact has had time to become a worry. The first is a red toast
 * with a kicker; the second is the same toast with a due minute, kept in the STATE as a
 * flag — `later:<id>` = `<due>|<text>` — so it survives a save, a reload, and a walk
 * through three rooms, and lands on the minute it was owed. `shown:later:<id>` marks it
 * delivered so a reload cannot deliver it twice.
 *
 * Nothing here decides consequences; content does, with `{ e: 'consequence' }`. This is
 * the bookkeeping, pure, so `tests/life-consequence.test.ts` can fold a save and ask
 * what is due.
 */
import type { LifeEvent } from './events'
import type { LifeState } from './types'

export const CONSEQUENCE_KICKER_HE = 'תוצאה'
export const LATER_PREFIX = 'later:'
export const SHOWN_PREFIX = 'shown:'

export type DueConsequence = { flag: string; text: string; due: number }

/** the events that book a delayed line: due at `state.minute + afterMinutes` */
export function scheduleLater(state: LifeState, id: string, text: string, afterMinutes: number): LifeEvent[] {
  const flag = `${LATER_PREFIX}${id}`
  if (state.flags[flag] !== undefined) return []
  return [{ t: 'flag.set', flag, value: `${state.minute + Math.max(1, Math.round(afterMinutes))}|${text}` }]
}

/** every booked line whose minute has come and which has not been shown */
export function dueConsequences(state: LifeState): DueConsequence[] {
  const out: DueConsequence[] = []
  for (const [flag, value] of Object.entries(state.flags)) {
    if (!flag.startsWith(LATER_PREFIX) || typeof value !== 'string') continue
    if (state.flags[`${SHOWN_PREFIX}${flag}`]) continue
    const bar = value.indexOf('|')
    if (bar < 0) continue
    const due = Number(value.slice(0, bar))
    const text = value.slice(bar + 1)
    if (!Number.isFinite(due) || !text) continue
    if (state.minute >= due) out.push({ flag, text, due })
  }
  return out.sort((a, b) => a.due - b.due)
}

/** the event that marks a delayed line delivered */
export const shownEvent = (flag: string): LifeEvent => ({ t: 'flag.raised', flag: `${SHOWN_PREFIX}${flag}` })
