'use client'

import { Grain, Leak, Letterbox, YearRoll } from '@/components/life/FilmFx'
import { artUrl } from '@/lib/life/runtime/art'
import { t, type MessageKey } from '@/lib/i18n'

type DocCopy = { world: string; pogi: string }

/**
 * מעברונים דוקומנטריים — not a loading card, an edit in a life.
 *
 * Every big jump gets three beats: TIME → WORLD → PUGI. The copy deliberately avoids
 * scores/opponents/scorers; exact historical facts still belong to the archive layer.
 * What this card is allowed to say is what the passing years did to the person we play.
 */
// The documentary copy lives in messages/he.life.json (rule 10): life.chapterDoc.<n>.name
// is the chapter name this card is shown for, .world / .pogi its two beats.
const DOC_COUNT = 10
const DOC: Record<string, DocCopy> = Object.fromEntries(
  Array.from({ length: DOC_COUNT }, (_, i) => {
    const n = i + 1
    return [
      t(`life.chapterDoc.${n}.name` as MessageKey),
      { world: t(`life.chapterDoc.${n}.world` as MessageKey), pogi: t(`life.chapterDoc.${n}.pogi` as MessageKey) },
    ]
  }),
)

export function ChapterCard({
  titleHe,
  subHe,
  nameHe,
  art,
  fromYear,
}: {
  titleHe: string
  subHe: string | null
  nameHe?: string
  art: string
  fromYear?: number | null
}) {
  const year = /^\d{4}$/.test(titleHe) ? Number(titleHe) : null
  const elapsed = year !== null && fromYear !== null && fromYear !== undefined ? Math.max(0, year - fromYear) : 0
  const elapsedHe = elapsed <= 0 ? null : new Intl.NumberFormat('he', { style: 'unit', unit: 'year', unitDisplay: 'long' }).format(elapsed)
  const doc = DOC[nameHe ?? '']

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden bg-ink" data-life="chapter-card" data-documentary="1">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center motion-reduce:animate-none"
        style={{ backgroundImage: `url(${artUrl(art)})`, animation: 'plate-push 5200ms ease-out both' }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/20" />
      <div aria-hidden="true" className="absolute inset-y-0 start-0 w-[5px] bg-red/85" />
      <Leak index={((Math.abs(year ?? 1) % 3) + 1) as 1 | 2 | 3} />
      <Grain opacity={0.26} />
      <Letterbox />

      <div className="absolute inset-x-0 bottom-[17%] flex flex-col items-center px-gutter text-center">
        <div className="mb-3 inline-flex items-center gap-2 border border-sheet/15 bg-ink/65 px-2 py-1 font-mono text-[9px] tabular-nums tracking-[0.18em] text-sheet/65">
          <span className="text-red">{t('life.chapterDoc.label')}</span>
          {elapsedHe && <span>· <bdi>{elapsedHe}</bdi></span>}
        </div>

        <p className="animate-title-rise font-poster text-[72px] leading-none text-sheet sm:text-[96px]" style={{ textShadow: '0 2px 24px rgb(var(--ink) / .9)' }}>
          {year !== null ? <YearRoll from={fromYear ?? null} to={year} /> : <bdi>{titleHe}</bdi>}
        </p>
        <span className="mt-3 block h-[3px] w-16 origin-center animate-rule-draw bg-red" aria-hidden="true" />

        {nameHe && <p className="mt-3 font-display text-[20px] leading-tight text-sheet"><bdi>{nameHe}</bdi></p>}
        {subHe && <p className="mt-2 max-w-[34rem] font-sign text-[13px] leading-snug text-sheet/75"><bdi>{subHe}</bdi></p>}

        {doc && (
          <div className="mt-5 max-w-[36rem] border-t border-sheet/15 pt-4">
            <p className="font-body text-[12px] leading-relaxed text-sheet/80" style={{ animation: 'film-in 700ms 700ms ease-out both' }}>
              <span className="me-2 font-mono text-[9px] tabular-nums tracking-[0.14em] text-red">{t('life.chapterDoc.world')}</span>
              <bdi>{doc.world}</bdi>
            </p>
            <p className="mt-2 font-body text-[13px] leading-relaxed text-sheet/90" style={{ animation: 'film-in 700ms 1500ms ease-out both' }}>
              <span className="me-2 font-mono text-[9px] tabular-nums tracking-[0.14em] text-red">{t('life.chapterDoc.pogi')}</span>
              <bdi>{doc.pogi}</bdi>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
