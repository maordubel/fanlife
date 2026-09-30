import type { LotPhase } from '@/lib/collector/types'
import { t, type MessageKey } from '@/lib/i18n'

const LABEL: Record<LotPhase, MessageKey> = {
  pending: 'auction.phase.pending',
  upcoming: 'auction.phase.upcoming',
  live: 'auction.phase.live',
  closing: 'auction.phase.closing',
  awaiting_completion: 'auction.phase.awaiting_completion',
  completed: 'auction.phase.completed',
  ended: 'auction.phase.ended',
  cancelled: 'auction.phase.cancelled',
  rejected: 'auction.phase.rejected',
}

const TONE: Record<LotPhase, string> = {
  pending: 'border-ink bg-sheet text-ink',
  upcoming: 'border-paper bg-sign text-paper',
  live: 'border-red bg-red text-paper',
  closing: 'border-red bg-paper text-red',
  awaiting_completion: 'border-ink bg-ink text-paper',
  completed: 'border-ink bg-ink text-paper',
  ended: 'border-ink bg-sheet text-muted',
  cancelled: 'border-ink bg-sheet text-muted',
  rejected: 'border-ink bg-sheet text-muted',
}

export const phaseLabel = (phase: LotPhase) => t(LABEL[phase])

/** חותמת השלב — "חי עכשיו", "בקרוב", "נמכרה". מודפסת, לא תגית של אתר. */
export function PhaseStamp({ phase }: { phase: LotPhase }) {
  return (
    <span
      data-phase={phase}
      className={`inline-flex items-center gap-1.5 border-rule px-2 py-0.5 font-sign text-[13px] font-bold leading-tight ${TONE[phase]}`}
    >
      {phase === 'live' ? <span aria-hidden="true" className="inline-block h-2 w-2 bg-paper motion-safe:animate-pulse" /> : null}
      {phaseLabel(phase)}
    </span>
  )
}
