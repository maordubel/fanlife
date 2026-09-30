'use client'

import { Num } from '@/components/ui/Num'
import { LIVES, RUN_LENGTH, multiplierFor, type Session } from '@/lib/game/session'
import { t } from '@/lib/i18n'

/**
 * לוח הריצה של שער 2 — the shared HUD's three things (lamps, score, combo) plus the two
 * Quick Pick adds: the stage's combo CAP printed beside the multiplier, and the crowd
 * heat — labelled, on the glass, as THIS RUN's heat. There is no crowd behind the bar;
 * it rises with your right answers and drops with your misses, and it says so.
 *
 * In practice there is no clock: the bar is replaced by ∞, and nothing ticks.
 */
export function RunHud({
  session,
  secondsLeft,
  total,
  cap,
  heat,
  practice,
  call,
}: {
  session: Session
  secondsLeft: number
  total: number
  cap: number
  heat: number
  practice: boolean
  /** a streak callout, shown for a beat */
  call: string | null
}) {
  const fraction = total > 0 ? Math.max(0, secondsLeft / total) : 0
  const urgent = !practice && fraction <= 0.28
  const multiplier = multiplierFor(session.combo, cap)

  return (
    <div className="sticky top-0 z-20 -mx-gutter bg-sheet/95 px-gutter pb-2 pt-2 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <ol className="flex items-center gap-1.5" aria-label={t('trivia.hud.lamps', { n: String(session.lives) })}>
          {Array.from({ length: LIVES }, (_, index) => (
            <li
              key={index}
              className={`h-3.5 w-3.5 border-hair border-ink transition-all duration-press ${
                index < session.lives ? 'bg-red' : 'bg-transparent opacity-40'
              }`}
            />
          ))}
        </ol>

        <p className="font-poster text-[26px] leading-none text-ink" aria-label={t('run.score')}>
          <Num>{session.score}</Num>
        </p>

        <p className="min-w-[64px] text-end" aria-label={t('trivia.hud.combo', { n: String(multiplier), cap: String(cap) })}>
          <bdi dir="ltr" className="inline-flex items-baseline gap-1">
            <span
              className={`font-poster text-[22px] leading-none transition-transform duration-press ${
                multiplier > 1 ? 'scale-110 text-red' : 'text-muted'
              }`}
            >
              {t('run.multi', { n: String(multiplier) })}
            </span>
            <span className="font-mono text-[10px] text-muted">/{cap}</span>
          </bdi>
        </p>
      </div>

      {practice ? (
        <p className="mt-1.5 text-center font-mono text-[11px] tracking-[0.2em] text-muted">
          {t('trivia.hud.practice')}
        </p>
      ) : (
        <div className="mt-2 h-1.5 w-full bg-ink/15" role="timer" aria-label={`${Math.ceil(secondsLeft)}`}>
          <div
            className={`h-full transition-[width] duration-100 ease-linear ${urgent ? 'animate-pulse bg-red' : 'bg-ink'}`}
            style={{ inlineSize: `${fraction * 100}%` }}
          />
        </div>
      )}

      <ol className="mt-1.5 flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: RUN_LENGTH }, (_, index) => {
          const mark = session.history[index]
          return (
            <li
              key={index}
              className={`h-1 flex-1 ${
                index === session.index ? 'bg-ink' : mark === undefined ? 'bg-ink/15' : mark ? 'bg-red' : 'bg-ink/50'
              }`}
            />
          )
        })}
      </ol>

      <div className="mt-1.5 flex items-center gap-2">
        <span className="shrink-0 font-body text-[11px] font-bold text-muted">{t('trivia.hud.heat')}</span>
        <div className="h-1 flex-1 bg-ink/15" aria-hidden="true">
          <div className="h-full bg-red transition-[inline-size] duration-stamp" style={{ inlineSize: `${heat}%` }} />
        </div>
        <span className="w-9 shrink-0 text-end font-mono text-[11px] tabular-nums text-ink">
          <Num>{`${heat}%`}</Num>
        </span>
        {call && (
          <span
            aria-hidden="true"
            className="shrink-0 animate-slam bg-ink px-1.5 py-0.5 font-body text-[11px] font-extrabold text-paper motion-reduce:animate-none"
          >
            {call}
          </span>
        )}
      </div>
    </div>
  )
}
