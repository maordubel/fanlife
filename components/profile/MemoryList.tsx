import Link from 'next/link'

import { t } from '@/lib/i18n'
import type { MemoryReading } from '@/lib/profile/memories'

/**
 * זיכרונות — one Hebrew line each, no points, no count, no progress (ONE RED WORLD §26).
 *
 * A memory that happened prints its line; one that has not yet prints where it lives, in the
 * muted ink, and is a door to that gate. There is deliberately no "5 מתוך 12" anywhere on
 * this list: a total is exactly the single score rule 63B keeps forbidden.
 *
 * Phone: a rail you thumb sideways, what happened first. Desktop: a sheet of three columns.
 */
export function MemoryList({ memories }: { memories: readonly MemoryReading[] }) {
  const ordered = [...memories.filter((m) => m.reached), ...memories.filter((m) => !m.reached)]
  return (
    <section aria-labelledby="memories-title" data-personal="memories" className="mt-stack">
      <p dir="ltr" className="font-latin text-[9px] font-bold tracking-[0.24em] text-red">
        MEMORIES
      </p>
      <h2 id="memories-title" className="mt-1 font-display text-step-3 leading-none text-ink">
        {t('personal.memories.title')}
      </h2>
      <p className="mt-2 max-w-prose font-body text-step--1 leading-relaxed text-muted">{t('personal.memories.lede')}</p>

      {/* phone — a rail */}
      <ul className="-mx-4 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 md:hidden">
        {ordered.map((memory) => (
          <li key={memory.id} className="w-[72vw] max-w-[280px] shrink-0 snap-start">
            <Card memory={memory} />
          </li>
        ))}
      </ul>

      {/* desktop — a sheet */}
      <ul className="mt-3 hidden gap-2 md:grid md:grid-cols-2 xl:grid-cols-3">
        {ordered.map((memory) => (
          <li key={memory.id}>
            <Card memory={memory} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Card({ memory }: { memory: MemoryReading }) {
  const body = (
    <>
      <span
        className={`font-body text-[10px] font-extrabold tracking-[0.1em] ${memory.reached ? 'text-red' : 'text-muted'}`}
      >
        {memory.reached ? t('personal.memories.reached') : t('personal.memories.waiting')}
      </span>
      <span className={`mt-0.5 block font-display text-[21px] leading-tight ${memory.reached ? 'text-paper' : 'text-ink'}`}>
        {t(memory.titleKey)}
      </span>
      <span className={`mt-1 block font-body text-[12.5px] leading-snug ${memory.reached ? 'text-sheet' : 'text-muted'}`}>
        {t(memory.lineKey)}
      </span>
    </>
  )
  return (
    <Link
      href={memory.href}
      data-memory={memory.id}
      data-reached={memory.reached ? 'true' : 'false'}
      className={`flex h-full min-h-[112px] flex-col border-rule p-3 transition-transform duration-press ease-stamp active:scale-[.985] motion-reduce:transition-none ${
        memory.reached ? 'border-ink bg-ink' : 'border-ink/40 bg-sheet'
      }`}
    >
      {body}
    </Link>
  )
}
