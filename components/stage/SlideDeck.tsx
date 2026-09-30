'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * SlideDeck — panels side by side, swiped instead of scrolled (delta 87).
 *
 * Where a gate has several blocks of the same weight (a report's three pages, a wing's
 * lanes, a menu of modes), they no longer stack down the page: they sit side by side and
 * the finger swipes between them. Native scroll-snap does the physics, so it feels like
 * the phone's own pager; a row of tabs on top says where you are and jumps.
 *
 * RTL: the first panel is on the right, like the page. Navigation goes through
 * `scrollIntoView`, which is direction-agnostic, and the live panel is read with an
 * IntersectionObserver, so no code here does scrollLeft arithmetic.
 */
export function SlideDeck({
  panels,
  className = '',
  index,
  onIndex,
  tabs = 'labels',
  tone = 'sheet',
}: {
  panels: ReadonlyArray<{ key: string; label: string; body: ReactNode }>
  className?: string
  index?: number
  onIndex?: (next: number) => void
  /** labels — a tab row; dots — just the position; none — nothing */
  tabs?: 'labels' | 'dots' | 'none'
  tone?: 'sheet' | 'ink'
}) {
  const rail = useRef<HTMLDivElement | null>(null)
  const refs = useRef<Array<HTMLElement | null>>([])
  const [live, setLive] = useState(index ?? 0)
  const night = tone === 'ink'

  useEffect(() => {
    const root = rail.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const i = refs.current.indexOf(entry.target as HTMLElement)
            if (i >= 0) {
              setLive(i)
              onIndex?.(i)
            }
          }
        }
      },
      { root, threshold: [0.6] },
    )
    refs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panels.length])

  useEffect(() => {
    if (index === undefined || index === live) return
    go(index)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  function go(i: number) {
    const el = refs.current[i]
    if (!el) return
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest', inline: 'start' })
    setLive(i)
    onIndex?.(i)
  }

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      {tabs === 'labels' && panels.length > 1 && (
        <div role="tablist" className="-mx-0.5 flex shrink-0 gap-1 overflow-x-auto px-0.5 pb-1.5">
          {panels.map((panel, i) => (
            <button
              key={panel.key}
              type="button"
              role="tab"
              aria-selected={live === i}
              onClick={() => go(i)}
              className={`min-h-tap shrink-0 border-hair px-3 font-body text-[12px] font-extrabold leading-none transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none ${
                live === i
                  ? 'border-red bg-red text-paper'
                  : night
                    ? 'border-concrete/40 bg-transparent text-paper'
                    : 'border-ink/40 bg-paper text-ink'
              }`}
            >
              {panel.label}
            </button>
          ))}
        </div>
      )}
      <div
        ref={rail}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {panels.map((panel, i) => (
          <section
            key={panel.key}
            ref={(el) => {
              refs.current[i] = el
            }}
            aria-label={panel.label}
            className="flex min-h-0 w-full shrink-0 snap-start snap-always flex-col overflow-y-auto overscroll-contain"
          >
            {panel.body}
          </section>
        ))}
      </div>
      {tabs === 'dots' && panels.length > 1 && (
        <div className="flex shrink-0 justify-center gap-1.5 pt-1.5" aria-hidden="true">
          {panels.map((panel, i) => (
            <span key={panel.key} className={`block h-[5px] ${live === i ? 'w-5 bg-red' : `w-2 ${night ? 'bg-concrete/50' : 'bg-ink/30'}`}`} />
          ))}
        </div>
      )}
    </div>
  )
}
