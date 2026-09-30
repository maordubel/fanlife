'use client'

import { t } from '@/lib/i18n'

/**
 * לוח התוצאות — original, restrained, and honest about what it does not know.
 *
 * Cream on charcoal with one red rule, `radius: 0`, no shadow, tabular numerals. It is
 * built to read as a piece of THE WORKER rather than as a sports game's HUD, and it is
 * deliberately not modelled on any modern football title's overlay.
 *
 * **The blank.** `score` may be null, and when it is the board prints a dash rather than a
 * number. That is the whole point of the component: a reconstruction may only show what
 * the archive holds, and a scoreboard reading a score no source carries is a fabricated
 * fact in a nice typeface. A dash is not a gap in the design; it is the design.
 *
 * Hebrew is DOM, never WebGL — no bidi, no selection and no screen reader inside a canvas.
 */
export function PitchScoreboard({
  homeHe,
  awayHe,
  score,
  minuteHe,
}: {
  homeHe: string
  awayHe: string
  score: { home: number; away: number } | null
  minuteHe: string
}) {
  return (
    <div
      dir="rtl"
      data-life="pitch-board"
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-[max(8px,env(safe-area-inset-top))]"
    >
      <div className="flex items-stretch border-rule border-ink bg-ink/90 text-sheet">
        <span className="flex items-center px-3 py-1.5 font-display text-[13px] uppercase leading-none tracking-[0.14em]">
          {homeHe}
        </span>
        <span className="flex items-center gap-1 border-s-rule border-sheet/25 bg-red px-3 py-1.5 font-mono text-[15px] leading-none tabular-nums">
          <span>{score ? score.home : '–'}</span>
          <span aria-hidden="true">:</span>
          <span>{score ? score.away : '–'}</span>
        </span>
        <span className="flex items-center border-s-rule border-sheet/25 px-3 py-1.5 font-display text-[13px] uppercase leading-none tracking-[0.14em]">
          {awayHe}
        </span>
        <span className="flex min-w-[52px] items-center justify-center border-s-rule border-sheet/25 px-2 py-1.5 font-mono text-[13px] leading-none tabular-nums text-concrete">
          {minuteHe || t('life.pitch.kickoff')}
        </span>
      </div>
    </div>
  )
}
