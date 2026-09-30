'use client'

import { useMemo, useState } from 'react'

import { ShareRow } from '@/components/share/ShareRow'
import { Num } from '@/components/ui/Num'
import { decadeShort, decadeText, gapsCard, isolate, slotText } from '@/lib/collector/cards'
import { busiestSeason, decadeCoverage, focusDecade, gapsOf, oldestShirt, type ItemLike } from '@/lib/collector/metrics'
import type { CollectorShirt } from '@/lib/collector/types'
import { t } from '@/lib/i18n'

/**
 * מה הארון אומר (מפרט §11, §48) — עשור אחר עשור מול מה שהארכיון עצמו מחזיק, רצועת העונות של
 * עשור אחד (✓ / —), החולצה הוותיקה, העונה העמוסה, ו"שתף את החורים שלי".
 *
 * המכנה הוא של הארכיון ולא עשר (`lib/collector/metrics.ts`), והמסך אומר את זה בשורה אחת —
 * מספר שהקורא לא יודע מול מה הוא נמדד הוא מספר שהוא לא יכול להאמין לו.
 */
export function ClosetMetrics({
  items,
  shirts,
  archive,
  shareRoute,
}: {
  items: readonly ItemLike[]
  shirts: Readonly<Record<string, CollectorShirt>>
  archive: readonly CollectorShirt[]
  /** where the gaps card's link lands — the collector's own closet, or the front door when it is private */
  shareRoute: string
}) {
  const rows = useMemo(() => decadeCoverage(items, archive, shirts), [items, archive, shirts])
  const [picked, setPicked] = useState<number | null>(null)
  const [sharing, setSharing] = useState(false)
  const focus = picked ?? focusDecade(rows)
  const row = rows.find((candidate) => candidate.decade === focus) ?? null
  const oldest = oldestShirt(items, shirts)
  const busiest = busiestSeason(items, archive, shirts)
  const empty = !rows.some((candidate) => candidate.have > 0)
  const gaps = row ? gapsOf(row) : []

  return (
    <section aria-labelledby="metrics-title" className="border-plate border-ink bg-sheet">
      <h2 id="metrics-title" className="bg-ink px-3 py-2 font-display text-step-1 leading-none text-paper">
        {t('collector.metrics.title')}
      </h2>

      {empty ? <p className="px-3 pt-3 font-body text-step--1 leading-relaxed text-muted">{t('collector.metrics.empty')}</p> : null}

      {/* oldest · busiest */}
      {oldest || busiest ? (
        <dl className="grid grid-cols-2 border-b-hair border-ink/30">
          {oldest ? (
            <div className="border-e-hair border-ink/30 px-3 py-2.5">
              <dt className="font-body text-[11px] tracking-wide text-muted">{t('collector.metrics.oldest')}</dt>
              <dd className="mt-0.5 font-poster text-[26px] leading-none text-red">
                <DateOf shirt={oldest} />
              </dd>
            </div>
          ) : null}
          {busiest ? (
            <div className="px-3 py-2.5">
              <dt className="font-body text-[11px] tracking-wide text-muted">{t('collector.metrics.busiest')}</dt>
              <dd className="mt-0.5 font-poster text-[26px] leading-none text-ink">
                <SlotDate slot={busiest} />
              </dd>
              <dd className="font-body text-[11px] text-muted">{t('collector.metrics.copies', { n: String(busiest.copies) })}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {/* every decade, against the archive's own count */}
      <div className="px-3 pt-3">
        <p className="font-body text-[11px] font-extrabold tracking-wide text-muted">{t('collector.metrics.decades')}</p>
        <ul className="mt-1.5 grid grid-cols-3 gap-1">
          {rows.map((candidate) => {
            const on = candidate.decade === focus
            return (
              <li key={candidate.decade}>
                <button
                  type="button"
                  onClick={() => {
                    setPicked(candidate.decade)
                    setSharing(false)
                  }}
                  aria-pressed={on}
                  aria-label={t('collector.metrics.pick', { decade: decadeText(candidate.decade) })}
                  className={`flex min-h-tap w-full flex-col items-stretch justify-center gap-1 border-rule px-1.5 py-1 ${
                    on ? 'border-ink bg-ink text-paper' : 'border-ink/30 bg-paper text-ink'
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-1">
                    <span className="font-body text-[11px] font-extrabold">
                      <Num>{`'${decadeShort(candidate.decade).slice(-2)}`}</Num>
                    </span>
                    <span className={`font-poster text-[17px] leading-none ${candidate.have > 0 ? (on ? 'text-paper' : 'text-red') : 'opacity-60'}`}>
                      <Num>{`${candidate.have}/${candidate.total}`}</Num>
                    </span>
                  </span>
                  <span aria-hidden="true" className="flex gap-px">
                    {candidate.slots.map((slot) => (
                      <span key={slot.year} className={`h-1.5 flex-1 ${slot.copies > 0 ? (on ? 'bg-paper' : 'bg-red') : on ? 'bg-paper/25' : 'bg-ink/15'}`} />
                    ))}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* the strip of one decade, season by season */}
      {row ? (
        <div className="px-3 pt-3">
          <div className="flex items-baseline justify-between gap-2 border-b-rule border-ink pb-1">
            <p className="font-display text-step-1 leading-none text-ink">{t('collector.metrics.strip', { decade: decadeText(row.decade) })}</p>
            <p className="font-poster text-[26px] leading-none text-red">
              <Num>{`${row.have}/${row.total}`}</Num>
            </p>
          </div>
          <ol className="mt-1">
            {row.slots.map((slot) => {
              const owned = slot.copies > 0
              return (
                <li
                  key={slot.year}
                  aria-label={owned ? t('collector.metrics.slotHave', { season: slotText(slot) }) : t('collector.metrics.slotMissing', { season: slotText(slot) })}
                  className="flex items-center justify-between gap-3 border-b-hair border-ink/20 py-1.5"
                >
                  <span className={`font-body text-step--1 font-bold ${owned ? 'text-ink' : 'text-muted'}`}>
                    <SlotDate slot={slot} />
                  </span>
                  <span aria-hidden="true" className={`w-6 text-center font-poster text-[20px] leading-none ${owned ? 'text-red' : 'text-muted'}`}>
                    {owned ? '✓' : '—'}
                  </span>
                </li>
              )
            })}
          </ol>
          {gaps.length === 0 ? <p className="mt-2 font-body text-step--1 font-bold text-red">{t('collector.metrics.complete')}</p> : null}
          <button
            type="button"
            onClick={() => setSharing((open) => !open)}
            aria-expanded={sharing}
            className="mt-2 flex min-h-tap w-full items-center justify-between border-rule border-ink bg-paper px-3 font-body text-step--1 font-extrabold text-ink"
          >
            <span>{t('collector.share.gaps')}</span>
            <span aria-hidden="true" className="font-poster text-[20px] leading-none text-red">
              {sharing ? '−' : '+'}
            </span>
          </button>
          {sharing ? (
            <ShareRow
              kind="gaps"
              params={{ missing: gaps.map((slot) => isolate(slotText(slot))).join(', ') }}
              headline={`${decadeText(row.decade)} · ${isolate(`${row.have}/${row.total}`)}`}
              route={shareRoute}
              card={gapsCard(decadeText(row.decade), `${row.have}/${row.total}`, gaps.map((slot) => slotText(slot)))}
            />
          ) : null}
        </div>
      ) : null}

      <div className="space-y-1 px-3 pb-3 pt-3">
        <p className="font-body text-[11px] leading-snug text-muted">{t('collector.metrics.denominator')}</p>
        <p className="font-body text-[11px] leading-snug text-muted">{t('collector.metrics.approxNote')}</p>
      </div>
    </section>
  )
}

/** `1994/95` isolated LTR; `1994 בערך` with only the figure isolated (rule 69 §7) */
function DateOf({ shirt }: { shirt: CollectorShirt }) {
  if (!shirt.seasonAmbiguous && shirt.seasonLabel) return <Num>{shirt.seasonLabel}</Num>
  return (
    <>
      <Num>{String(shirt.yearRaw ?? shirt.year)}</Num> {t('kits.archive.approx')}
    </>
  )
}

function SlotDate({ slot }: { slot: { seasonLabel: string | null; year: number } }) {
  if (slot.seasonLabel) return <Num>{slot.seasonLabel}</Num>
  return (
    <>
      <Num>{String(slot.year)}</Num> {t('kits.archive.approx')}
    </>
  )
}

