'use client'

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react'

import { useDialog } from '@/components/ui/useDialog'
import { Num } from '@/components/ui/Num'
import { ENTITY_TYPES, type ArchiveCard, type EntityType } from '@/lib/archive/graph-types'
import { t, type MessageKey } from '@/lib/i18n'
import { voiceAction } from '@/lib/voice'
import { CloseMark, EntityRow } from './EntityCard'

/**
 * The three sheets of the dock: the time machine (decade → season), the one search, and
 * Mine. Each is a `role="dialog"` above the tab bar (rule 33), Escape closes it
 * (`useDialog`), and none of them holds data of its own — they ask the server.
 */

function Sheet({
  label,
  latin,
  title,
  onClose,
  children,
  tall = false,
}: {
  label: string
  latin: string
  title: string
  onClose: () => void
  children: ReactNode
  tall?: boolean
}) {
  const ref = useDialog<HTMLDivElement>(onClose)
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-[60] flex flex-col justify-end bg-ink/70 outline-none"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={`flex w-full animate-sheet-in flex-col border-t-plate border-ink bg-sheet motion-reduce:animate-none sm:mx-auto sm:max-w-[560px] sm:border-x-rule ${tall ? 'h-[88dvh]' : 'max-h-[80dvh]'}`}
      >
        <div className="flex items-start justify-between gap-3 border-b-rule border-ink px-4 pb-2 pt-3">
          <div className="min-w-0">
            <p className="font-latin text-[9px] font-bold tracking-[0.22em] text-red" dir="ltr">
              {latin}
            </p>
            <h2 className="font-display text-step-2 leading-tight text-ink">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('archive.drawer.close')}
            className="flex min-h-tap min-w-tap shrink-0 items-center justify-center border-rule border-ink bg-paper font-poster text-[22px] leading-none text-ink"
          >
            <CloseMark className="stroke-ink" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">{children}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ the time machine */

export function TimeMachine({
  decades,
  current,
  onPick,
  onClose,
}: {
  decades: { decade: number; seasons: string[] }[]
  current: string | null
  onPick: (season: string) => void
  onClose: () => void
}) {
  const initial = current ? Math.floor(Number(current.slice(0, 4)) / 10) * 10 : (decades[decades.length - 1]?.decade ?? null)
  const [decade, setDecade] = useState<number | null>(initial)
  const seasons = decades.find((row) => row.decade === decade)?.seasons ?? []
  const label = (d: number) => t('archive.box.decade', { d: d >= 2000 ? String(d) : String(d % 100).padStart(2, '0') })

  return (
    <Sheet label={t('archive.time.aria')} latin="TIME MACHINE" title={t('archive.time.title')} onClose={onClose}>
      <p className="font-body text-[12px] font-extrabold text-muted">{t('archive.time.decade')}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {decades.map((row) => (
          <button
            key={row.decade}
            type="button"
            onClick={() => setDecade(row.decade)}
            aria-pressed={decade === row.decade}
            className={`min-h-tap border-rule px-3 font-body text-[13px] font-bold ${decade === row.decade ? 'border-red bg-red text-paper' : 'border-ink/40 bg-paper text-ink'}`}
          >
            {label(row.decade)}
          </button>
        ))}
      </div>
      <p className="mt-4 font-body text-[12px] font-extrabold text-muted">{t('archive.time.season')}</p>
      <div className="mt-1 grid grid-cols-3 gap-1.5 min-[420px]:grid-cols-4">
        {seasons.map((season) => (
          <button
            key={season}
            type="button"
            onClick={() => onPick(season)}
            aria-pressed={current === season}
            className={`min-h-tap border-rule font-mono text-[14px] tabular-nums ${current === season ? 'border-red bg-red text-paper' : 'border-ink bg-sheet text-ink'}`}
          >
            <Num>{season}</Num>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

/* ------------------------------------------------------------------ search */


export function SearchSheet({
  run,
  onOpen,
  onClose,
}: {
  run: (query: string, type: EntityType | null) => Promise<ArchiveCard[]>
  onOpen: (id: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<EntityType | null>(null)
  const [results, setResults] = useState<ArchiveCard[] | null>(null)
  const [pending, start] = useTransition()
  const input = useRef<HTMLInputElement | null>(null)
  const ask = useRef(0)

  useEffect(() => {
    input.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults(null)
      return
    }
    const id = ++ask.current
    const timer = window.setTimeout(() => {
      start(async () => {
        const found = await run(q, type)
        if (id === ask.current) setResults(found)
      })
    }, 220)
    return () => window.clearTimeout(timer)
  }, [query, type, run])

  return (
    <Sheet label={t('archive.search.aria')} latin="SEARCH THE ARCHIVE" title={t('archive.search.label')} onClose={onClose} tall>
      <label htmlFor="archive-q" className="sr-only">
        {t('archive.search.label')}
      </label>
      <input
        id="archive-q"
        ref={input}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('archive.search.placeholder')}
        className="min-h-tap w-full border-rule border-ink bg-paper px-3 font-body text-[16px] text-ink placeholder:text-muted"
        enterKeyHint="search"
        autoComplete="off"
      />
      <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1" role="group" aria-label={t('archive.chip.aria')}>
        {[null, ...ENTITY_TYPES].map((row) => (
          <button
            key={row ?? 'all'}
            type="button"
            onClick={() => setType(row)}
            aria-pressed={type === row}
            className={`min-h-tap shrink-0 border-rule px-3 font-body text-[12.5px] font-bold ${type === row ? 'border-red bg-red text-paper' : 'border-ink/40 bg-sheet text-ink'}`}
          >
            {row ? t(`graph.types.${row}` as MessageKey) : t('archive.search.all')}
          </button>
        ))}
      </div>

      {results === null ? (
        <>
          <p className="mt-3 font-body text-[12.5px] leading-snug text-muted">{t('archive.search.hint')}</p>
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={t('archive.search.suggest.aria')}>
            {t('archive.search.suggest').split('|').map((word) => (
              <button key={word} type="button" onClick={() => setQuery(word)} className="min-h-tap border-hair border-ink/40 bg-paper px-3 font-body text-[13px] text-ink">
                {word}
              </button>
            ))}
          </div>
        </>
      ) : results.length === 0 ? (
        <p className="mt-3 font-body text-[13px] text-muted" aria-live="polite">
          {pending ? t('archive.loading') : t('archive.search.none')}
        </p>
      ) : (
        <>
          <p className="mt-3 font-body text-[11.5px] font-bold text-muted" aria-live="polite">
            {t('archive.search.count', { n: String(results.length) })}
          </p>
          <ul className="mt-1 grid gap-1.5">
            {results.map((card) => (
              <li key={card.id}>
                <EntityRow card={card} onPick={() => onOpen(card.id)} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  )
}

/* ------------------------------------------------------------------ mine */

export function MineSheet({ cards, loading, onOpen, onClose }: { cards: ArchiveCard[]; loading: boolean; onOpen: (id: string) => void; onClose: () => void }) {
  return (
    <Sheet label={t('archive.mine.aria')} latin="MY ARCHIVE" title={voiceAction(12, 'mine') ?? ''} onClose={onClose} tall>
      <p className="font-body text-[12.5px] text-muted">{t('archive.mine.lede')}</p>
      {loading ? (
        <p className="mt-3 font-body text-[13px] text-muted">{t('archive.loading')}</p>
      ) : cards.length === 0 ? (
        <p className="mt-3 border-hair border-ink/40 bg-paper px-3 py-3 font-body text-[13.5px] leading-relaxed text-ink">{t('archive.mine.empty')}</p>
      ) : (
        <ul className="mt-2 grid gap-1.5">
          {cards.map((card) => (
            <li key={card.id}>
              <EntityRow card={card} onPick={() => onOpen(card.id)} />
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}
