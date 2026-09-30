'use client'

import { t } from '@/lib/i18n'
import { CHAPTERS } from '@/lib/life/content/chapters'
import { artUrl } from '@/lib/life/runtime/art'
import { Grain, Letterbox } from '@/components/life/FilmFx'

/**
 * הקודה — the frame closes.
 *
 * The film opened on the new ground in 2026 and a man who still goes there. When the life
 * as built runs out — the last playable chapter has ended and the registry has nothing
 * with rooms behind it — the game returns to that ground rather than to a card that
 * promises a chapter. The plaza at night, the shell lit from inside, and the list of the
 * years this life has actually lived: each playable chapter as a mark, the ones lived in
 * red. It is the one screen that admits what the game is today, and it is built to be
 * beautiful enough that the admission does not feel like an apology.
 *
 * The button hands the world back in the last room. Nothing is reset; the life waits for
 * its next chapter the way a save always has.
 */
export function CodaCard({ chapter, lived, onBack }: { chapter: string; lived: readonly string[]; onBack: () => void }) {
  const marks = CHAPTERS.filter((c) => c.playable)
  return (
    <div className="pointer-events-auto absolute inset-0 z-50 overflow-hidden bg-ink" data-life="coda">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center motion-safe:animate-[openingDrift_9s_ease-out_forwards]"
        style={{ backgroundImage: `url(${artUrl('introReturnHome')})` }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgb(var(--ink)) 22%, rgb(var(--ink) / .55) 55%, rgb(var(--ink) / .15) 100%)' }}
      />

      <Grain opacity={0.2} />
      <Letterbox height={0.08} ms={800} />
      <p
        aria-hidden="true"
        className="absolute top-[max(14px,env(safe-area-inset-top))] z-[3] font-poster text-[56px] leading-none text-sheet/90 sm:text-[72px]"
        style={{ insetInlineEnd: 16, textShadow: '0 2px 18px rgb(var(--ink) / .9)' }}
        dir="ltr"
      >
        {t('life.coda.kicker')}
      </p>

      <div className="absolute inset-x-0 bottom-0 z-[3] px-5 pb-[max(18px,env(safe-area-inset-bottom))]">
        <div className="h-[6px] w-16 bg-red" aria-hidden="true" />
        <h2 className="mt-3 font-display text-step-3 leading-tight text-sheet">
          <bdi>{t('life.coda.title')}</bdi>
        </h2>
        <p className="mt-2 max-w-md font-body text-[15px] leading-relaxed text-concrete">
          <bdi>{t('life.coda.body')}</bdi>
        </p>

        {/* the years this life has lived — one mark per playable chapter, red when lived */}
        <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2" data-life="coda-lived" aria-label={t('life.coda.lived')}>
          {marks.map((c) => {
            const on = lived.includes(c.id) || c.id === chapter
            return (
              <div key={c.id} className="flex flex-col items-center gap-1">
                <span
                  className={`block h-8 w-[3px] ${on ? 'bg-red' : 'bg-concrete/30'} motion-safe:animate-rule-draw`}
                  style={{ transformOrigin: 'bottom' }}
                  aria-hidden="true"
                />
                <span className={`font-mono text-[10px] tabular-nums ${on ? 'text-sheet' : 'text-concrete/50'}`} dir="ltr">
                  {c.year}
                </span>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onBack}
          data-life="coda-back"
          className="mt-6 flex min-h-tap w-full max-w-md items-center justify-center border-rule border-sheet bg-red px-4 transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
        >
          <span className="font-display text-[15px] text-sheet">{t('life.coda.back')}</span>
        </button>
      </div>
    </div>
  )
}
