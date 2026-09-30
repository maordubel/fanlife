import Link from 'next/link'

import { Num } from '@/components/ui/Num'
import { t } from '@/lib/i18n'
import type { LivedChapter } from '@/app/tik/file/actions'

/**
 * דרכון הזיכרון, בפרופיל — LIFE Memory Passport (ONE RED WORLD §23.3).
 *
 * Only chapters this device's save COMPLETED arrive here (`fileExtras` is asked about those
 * and nothing else), each with the real archive moments its sourced anchor names. No
 * chapter ahead is named, no ending is described, no character's fate is told: a lived
 * chapter prints its year, its card date and the archive cards — provenance, not reward.
 */
export function LifePassport({ lived, loading }: { lived: readonly LivedChapter[]; loading: boolean }) {
  return (
    <section aria-labelledby="life-passport-title" data-personal="life-passport" className="mt-stack border-rule border-ink bg-ink p-3 text-paper md:p-4">
      <p dir="ltr" className="font-latin text-[9px] font-bold tracking-[0.24em] text-red">
        LIFE · MEMORY PASSPORT
      </p>
      <h2 id="life-passport-title" className="mt-1 font-display text-step-2 leading-none text-paper">
        {t('personal.life.title')}
      </h2>
      <p className="mt-2 max-w-prose font-body text-step--1 leading-relaxed text-sheet">{t('personal.life.lede')}</p>

      {loading ? null : lived.length === 0 ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 font-body text-[12.5px] text-sheet">
          {t('personal.life.empty')}
          <Link href="/life" className="inline-flex min-h-tap items-center font-extrabold text-paper underline decoration-red decoration-2 underline-offset-4">
            {t('personal.life.go')}
          </Link>
        </p>
      ) : (
        <ol className="mt-3 flex flex-col gap-3">
          {lived.map((chapter) => (
            <li key={chapter.chapterId} data-chapter={chapter.chapterId} className="border-t-hair border-sheet/30 pt-2">
              <p className="flex items-baseline gap-2">
                <span className="font-display text-[26px] leading-none text-red">
                  <Num>{String(chapter.year)}</Num>
                </span>
                <span className="font-body text-[12px] text-sheet">
                  <bdi>{chapter.dateHe}</bdi>
                </span>
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {chapter.cards.map((card) => (
                  <li key={card.id}>
                    <Link
                      href={`/archive?at=${encodeURIComponent(card.id)}`}
                      className="flex min-h-tap items-center border-hair border-sheet/50 px-2.5 font-sign text-[13px] font-bold text-paper hover:bg-paper hover:text-ink"
                    >
                      <bdi>{card.titleHe}</bdi>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
