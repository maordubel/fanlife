import Link from 'next/link'

import { awayCounts } from '@/lib/away-days/data'
import { t } from '@/lib/i18n'

/**
 * AWAY DAYS — the strip at the foot of the wall (owner decision 23.9.2026; opened 24.9.2026).
 *
 * The way into the journey (spec §24): the teaser, the three numbers the generated master
 * holds today — countries, grounds, matches, all VERIFIED — and one call, "צאו למסע".
 * It keeps the destination board it was drawn as: the away end's navy (gate 11's ink — the
 * away end carries no vermilion field), the road running under the name as a dashed centre
 * line, the vermilion kerb. The "בקרוב" stamp is gone because the road is open, and the
 * strip is a link now, so it looks pressable (rule 19): the call sits on a red plate. The
 * departures column names five grounds that ARE on the public journey.
 */
export function AwayDaysStrip() {
  const { matches, stadiums, countries } = awayCounts()
  const numbers = [
    { value: countries, label: t('away.strip.countries') },
    { value: stadiums, label: t('away.strip.stadiums') },
    { value: matches, label: t('away.strip.matches') },
  ]
  return (
    <Link
      href="/away-days"
      aria-label={t('away.strip.aria', { matches: String(matches), stadiums: String(stadiums), countries: String(countries) })}
      className="group relative block min-h-tap overflow-hidden border-rule border-ink bg-sign transition-transform duration-press ease-stamp active:scale-[.99] motion-reduce:transition-none"
    >
      {/* the road — a dashed centre line running the length of the strip */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-[14px] h-[4px]"
        style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgb(var(--sheet)) 0 22px, transparent 22px 40px)' }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[6px] bg-red" />

      <div className="relative flex items-stretch gap-3 px-4 pb-8 pt-3" aria-hidden="true">
        <div className="min-w-0 flex-1">
          <p dir="ltr" className="text-end font-latin text-[9px] font-bold tracking-[0.3em] text-concrete">
            ON THE ROAD WITH HAPOEL
          </p>
          <p dir="ltr" className="relative mt-1 text-end font-latin text-[40px] font-black leading-[0.9] tracking-[-0.01em] sm:text-[56px]">
            <span className="plate-shift absolute inset-0 text-ink">AWAY DAYS</span>
            <span className="plate-top relative text-sheet">AWAY DAYS</span>
          </p>
          <p className="mt-3 font-display text-[16px] leading-tight text-sheet sm:text-[19px]">{t('away.title')}</p>
          <p className="mt-0.5 font-body text-[11.5px] leading-snug text-concrete">{t('away.lede')}</p>

          {/* the departures board — the journey's own numbers */}
          <div className="mt-3 flex items-end justify-between gap-3">
            <dl className="flex gap-4">
              {numbers.map((n) => (
                <div key={n.label} className="flex flex-col-reverse">
                  <dt className="font-body text-[10px] font-extrabold text-concrete">{n.label}</dt>
                  <dd className="font-poster text-[30px] leading-none tabular-nums text-sheet">{n.value}</dd>
                </div>
              ))}
            </dl>
            <span className="flex shrink-0 items-center gap-1.5 border-plate border-ink bg-red px-3 py-1.5 font-display text-[15px] leading-none text-paper transition-transform duration-press ease-stamp group-hover:-translate-y-0.5 motion-reduce:transition-none">
              {t('away.strip.cta')}
              <span className="font-body">←</span>
            </span>
          </div>
        </div>
        {/* the departures column — five grounds on the public journey, printed like a board */}
        <ul className="hidden shrink-0 flex-col justify-center gap-1 border-s-hair border-concrete/40 ps-3 sm:flex" dir="ltr">
          {['BANGKOK', 'TEHRAN', 'NICOSIA', 'LONDON', 'MISKOLC'].map((to) => (
            <li key={to} className="flex items-center gap-2 font-mono text-[11px] font-bold tabular-nums tracking-[0.12em] text-sheet">
              <span className="block h-[7px] w-[7px] bg-red" />
              {to}
            </li>
          ))}
        </ul>
      </div>
    </Link>
  )
}
