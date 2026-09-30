import Link from 'next/link'

import { t } from '@/lib/i18n'
import type { DomainReading, MemoryMapReading, Size } from '@/lib/profile/memoryMap'

/**
 * מפת הזיכרון — drawn from a `MemoryMapReading` and nothing else (ONE RED WORLD §25).
 *
 * This component is handed words, sizes and hrefs. It never sees a count, so it cannot print
 * one: `lib/profile/memoryMap.ts` is the only translator, and `tests/personal-area.test.ts`
 * fails if this file imports the records it was built from. The only scale is the size of a
 * printed word — a poster, not a chart.
 *
 * Two layouts, not one that scales: the phone reads the seven grounds as a column of lines,
 * each word set at its size beside its name; the desktop sets them as one poster, the seven
 * words at their sizes across the sheet.
 */

const WORD_SIZE: Readonly<Record<Size, string>> = {
  xs: 'text-[13px] text-muted',
  sm: 'text-[18px] text-ink',
  md: 'text-[24px] text-ink',
  lg: 'text-[32px] text-red',
  xl: 'text-[42px] text-red',
}

const POSTER_SIZE: Readonly<Record<Size, string>> = {
  xs: 'text-[18px] text-muted',
  sm: 'text-[26px] text-ink',
  md: 'text-[36px] text-ink',
  lg: 'text-[50px] text-red',
  xl: 'text-[66px] text-red',
}

export function MemoryMap({ reading }: { reading: MemoryMapReading }) {
  const headline = t(reading.headlineKey, reading.headlineDomainKey ? { domain: t(reading.headlineDomainKey) } : undefined)
  return (
    <section aria-labelledby="memory-map-title" data-personal="memory-map" className="mt-stack">
      <p dir="ltr" className="font-latin text-[9px] font-bold tracking-[0.24em] text-red">
        MEMORY MAP
      </p>
      <h2 id="memory-map-title" className="mt-1 font-display text-step-3 leading-none text-ink">
        {t('personal.map.title')}
      </h2>
      <p className="mt-2 max-w-prose font-body text-step--1 leading-relaxed text-muted">{t('personal.map.lede')}</p>
      <p className="mt-2 font-sign text-step-0 text-ink">{headline}</p>

      {/* phone — a column of lines */}
      <ul className="mt-3 border-t-rule border-ink md:hidden">
        {reading.domains.map((domain) => (
          <PhoneRow key={domain.id} domain={domain} />
        ))}
      </ul>

      {/* desktop — one poster */}
      <div className="mt-4 hidden border-rule border-ink bg-sheet p-5 md:block">
        <ul className="flex flex-wrap items-baseline gap-x-8 gap-y-5">
          {reading.domains.map((domain) => (
            <li key={domain.id} data-level={domain.level} className="min-w-[9rem]">
              <Link href={domain.href} className="group block" aria-label={`${t(domain.nameKey)} · ${t(domain.wordKey)}`}>
                <span className="block font-body text-[11px] font-extrabold tracking-[0.08em] text-muted">{t(domain.nameKey)}</span>
                <span className={`block font-display leading-none group-hover:underline ${POSTER_SIZE[domain.size]}`}>
                  {t(domain.wordKey)}
                </span>
                <span className="mt-1 block font-body text-[11px] text-muted">{t(domain.fedByKey)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function PhoneRow({ domain }: { domain: DomainReading }) {
  return (
    <li data-level={domain.level} className="border-b-hair border-ink/30">
      <Link href={domain.href} className="flex min-h-tap items-center justify-between gap-3 py-2">
        <span className="min-w-0">
          <span className="block font-sign text-step-0 leading-tight text-ink">{t(domain.nameKey)}</span>
          <span className="block truncate font-body text-[11px] text-muted">{t(domain.fedByKey)}</span>
        </span>
        <span className={`shrink-0 font-display leading-none ${WORD_SIZE[domain.size]}`}>{t(domain.wordKey)}</span>
      </Link>
    </li>
  )
}
