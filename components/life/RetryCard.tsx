'use client'

import { t } from '@/lib/i18n'

/**
 * החיים האחרים — the card that does not end the chapter.
 *
 * It is deliberately built like the ending card and then breaks one promise of it: there
 * is no red box, no life line and no "continue". The championship of 1986 is the day this
 * whole life is hung on, so a Saturday that ended without it gives the morning back.
 *
 * The middle panel is the joke, and it is framed like an archive card on purpose — a
 * straight face is what makes it funny. Four seconds of a life Pogi did not have, and then
 * a single button that says the same thing every time: back to the morning.
 */
export function RetryCard({
  titleHe,
  bodyHe,
  otherLifeHe,
  closeHe,
  onRetry,
}: {
  titleHe: string
  bodyHe: string
  otherLifeHe: string
  closeHe: string
  onRetry: () => void
}) {
  return (
    <div
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-ink/90 p-gutter"
      data-life="retry"
    >
      <div className="max-h-full w-full max-w-md animate-paste-in overflow-y-auto border-rule border-sheet bg-ink">
        <div className="px-5 pb-5 pt-6">
          <div className="h-[6px] w-16 bg-red" aria-hidden="true" />
          <h2 className="mt-3 font-display text-step-3 leading-tight text-sheet">
            <bdi>{titleHe}</bdi>
          </h2>
          <p className="mt-3 font-body text-[15px] leading-relaxed text-concrete">
            <bdi>{bodyHe}</bdi>
          </p>

          <div className="mt-4 border-rule border-concrete/40 bg-ink px-4 py-3" data-life="other-life">
            <p className="font-display text-[11px] uppercase tracking-[0.2em] text-red">
              <bdi>{t('life.retry.otherLife')}</bdi>
            </p>
            <p className="mt-2 font-body text-[14px] leading-relaxed text-sheet">
              <bdi>{otherLifeHe}</bdi>
            </p>
          </div>

          <p className="mt-4 border-t-hair border-concrete/30 pt-3 font-body text-[15px] leading-relaxed text-sheet">
            <bdi>{closeHe}</bdi>
          </p>

          <button
            type="button"
            onClick={onRetry}
            data-life="retry-again"
            className="mt-5 flex min-h-tap w-full items-center justify-center border-rule border-sheet bg-red px-4 transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
          >
            <span className="font-display text-[15px] text-sheet">{t('life.retry.again')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
