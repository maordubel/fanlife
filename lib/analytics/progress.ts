import { noteDailyProgress } from '@/lib/daily/progress'
import type { ProgressEvent } from '@/lib/profile/events'

import { finishVisit, track } from './meter'

/**
 * The progress ledger already hears every finished round (`emit`, rule "one abstraction").
 * So the measurement's `gate_finish` is not a second call in thirteen gates: `emit` hands
 * each event here, and a finished round, a wing's deed or a sealed ballot closes the visit.
 * A share is a `share_click` with its channel. Nothing of the event's content travels —
 * no pick, no name, no id: the gate, the channel, and at most the score as one integer.
 */
export function meterProgress(event: ProgressEvent): void {
  noteDailyProgress() // היום בהפועל: did this report finish one of today's three? (lib/daily)
  switch (event.type) {
    case 'gate_completed':
      finishVisit(event.gate, typeof event.score === 'number' ? event.score : undefined)
      return
    case 'deed':
      finishVisit(event.gate)
      return
    case 'ballot_sealed':
      finishVisit('/polls')
      return
    case 'shared':
      track('share_click', { detail: event.channel })
      return
    default:
      return
  }
}
