'use client'

import { Num } from '@/components/ui/Num'
import { LIVES, RUN_LENGTH, multiplierFor, type Session } from '@/lib/game/session'
import { t } from '@/lib/i18n'

/**
 * לוח התוצאות — the bar that never leaves the top of a run.
 *
 * Three things, and they are the three things an arcade cabinet shows: what you have
 * left, what you have earned, and how hot you are. A score you cannot see while playing
 * is not a stake, and a combo you cannot see is not a reason to keep going.
 *
 * The clock is a bar rather than a number because a shrinking bar is read peripherally —
 * you feel the last three seconds without looking away from the question.
 */
export function HUD({
  session,
  secondsLeft,
  total,
}: {
  session: Session
  secondsLeft: number
  total: number
}) {
  const fraction = total > 0 ? Math.max(0, secondsLeft / total) : 0
  const urgent = fraction <= 0.28
  const multiplier = multiplierFor(session.combo)

  return (
    <div className="sticky top-0 z-20 -mx-gutter bg-sheet/95 px-gutter pb-2 pt-2 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        {/* lives — a filled lamp is on, an empty one is spent */}
        <ol className="flex items-center gap-1.5" aria-label={t('run.lives')}>
          {Array.from({ length: LIVES }, (_, index) => {
            const on = index < session.lives
            return (
              <li
                key={index}
                className={`h-3.5 w-3.5 border-hair border-ink transition-all duration-press ${
                  on ? 'bg-red' : 'bg-transparent opacity-40'
                }`}
              />
            )
          })}
        </ol>

        <p className="font-poster text-[26px] leading-none text-ink">
          <Num>{session.score}</Num>
        </p>

        <p
          className={`min-w-[46px] text-end font-poster text-[22px] leading-none transition-transform duration-press ${
            multiplier > 1 ? 'scale-110 text-red' : 'text-muted'
          }`}
          aria-label={t('run.combo')}
        >
          {t('run.multi', { n: String(multiplier) })}
        </p>
      </div>

      {/* the clock */}
      <div
        className="mt-2 h-1.5 w-full bg-ink/15"
        role="timer"
        aria-label={`${Math.ceil(secondsLeft)}`}
      >
        <div
          className={`h-full origin-[100%_50%] transition-[width] duration-100 ease-linear ${
            urgent ? 'animate-pulse bg-red' : 'bg-ink'
          }`}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>

      {/* the run strip — every answer so far, at a glance */}
      <ol className="mt-1.5 flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: RUN_LENGTH }, (_, index) => {
          const mark = session.history[index]
          return (
            <li
              key={index}
              className={`h-1 flex-1 ${
                mark === undefined ? 'bg-ink/15' : mark ? 'bg-red' : 'bg-ink/50'
              }`}
            />
          )
        })}
      </ol>
    </div>
  )
}
