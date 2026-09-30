import { Num } from '@/components/ui/Num'
import type { Census } from '@/lib/club/census'
import { t } from '@/lib/i18n'

/**
 * לוחית המפקד — the number of men who wore the shirt, as a picture.
 *
 * An ink plate, the shell's halftone in cream and the total printed the way a gate number
 * is (two plates, a constant offset): the count is the hierarchy. Under it a bar per decade,
 * the busiest one vermilion — bars are the archive's own count of who was on the books in that
 * decade, scaled to the tallest, never to a round number. Nothing here is decoration that
 * could disagree with the data: the bars ARE `playerCensus()`.
 */
export function PlayerCensus({ census, compact = false }: { census: Census; compact?: boolean }) {
  const top = census.peak?.n ?? 1
  return (
    <section data-census="plate" aria-label={t('census.aria', { n: String(census.total) })} className="museum-stage relative overflow-hidden border-rule border-ink text-paper">
      <div className={`relative px-4 ${compact ? 'pb-3 pt-3' : 'pb-4 pt-5'}`}>
        <p className="font-body text-[11px] font-extrabold tracking-[0.14em] text-concrete">{t('census.kicker')}</p>
        <p className={`relative mt-1 font-poster leading-[0.85] ${compact ? 'text-[68px]' : 'text-[92px] sm:text-[120px]'}`} dir="ltr">
          <span aria-hidden="true" className="plate-shift absolute inset-0 text-sign">
            {census.total}
          </span>
          <span className="plate-top relative text-paper">
            <Num>{census.total}</Num>
          </span>
        </p>
        <p className="mt-1 font-display text-[19px] leading-tight text-paper sm:text-[22px]">{t('census.title')}</p>

        <ol data-census="bars" className="mt-4 flex h-[92px] items-end gap-[3px] border-b-hair border-paper/40" aria-label={t('census.bars')}>
          {census.decades.map((row) => {
            const peak = census.peak?.decade === row.decade
            return (
              <li key={row.decade} className="flex h-full min-w-0 flex-1 flex-col justify-end" data-decade={row.decade}>
                <span className={`mb-0.5 text-center font-mono text-[9px] tabular-nums leading-none ${peak ? 'text-paper' : 'text-concrete'}`} dir="ltr">
                  {row.n}
                </span>
                <span
                  className={`block w-full ${peak ? 'bg-red' : 'bg-paper/70'}`}
                  style={{ height: `${Math.max(4, Math.round((row.n / top) * 66))}px` }}
                />
              </li>
            )
          })}
        </ol>
        <ol className="mt-1 flex gap-[3px]" aria-hidden="true">
          {census.decades.map((row) => (
            <li key={row.decade} className="min-w-0 flex-1 text-center font-mono text-[8px] tabular-nums leading-none text-concrete" dir="ltr">
              {row.decade}
            </li>
          ))}
        </ol>
        <p className="mt-2 font-body text-[11px] leading-snug text-concrete">
          {t('census.note', { first: String(census.earliest ?? '—'), last: String(census.latest ?? '—') })}
          {census.undated > 0 && <> {t('census.undated', { n: String(census.undated) })}</>}
        </p>
      </div>
    </section>
  )
}
