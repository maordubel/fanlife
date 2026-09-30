'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { Num } from '@/components/ui/Num'
import { firePickFxAt } from '@/components/stage/PickFx'
import { PlayerShirt } from '@/components/stage/PlayerShirt'
import { useDragSource } from '@/components/stage/useDrag'
import type { ShirtLook } from '@/lib/kit/playerShirt'
import { fold } from '@/lib/game/roster-search'
import { t } from '@/lib/i18n'

/**
 * רכבת החולצות — THE way a man is picked onto a pitch, in gate 1 and gate 3 alike (delta 88).
 *
 * Maor, 24.9.2026: gate 1's picking "לא נוחה", gate 3 "לא ניתן לבחור שחקנים בכלל", and
 * "תמצא פתרונות זהים לשער 1 ושער 3". So one component, docked under the pitch — NOT a modal:
 * the pitch stays visible and live above it, so the target stays in view, a drag up lands
 * on it, and a tap on another slot simply re-aims the rail.
 *
 *   · the header names the target (the slot's role, or the band) on an ink plate, with a
 *     search field — one line;
 *   · one line of chips: the caller's (e.g. "רק שוערים") and the eras that actually
 *     hold somebody;
 *   · the rail: every man as HIS SHIRT — the real photograph of his era where the archive
 *     has one (`lib/kit/playerShirt.ts`) — name and years under it, swiped sideways;
 *   · a TAP places him (the shirt flies into the slot, then the stamp), a drag UP lifts
 *     him off the rail onto any slot/band (`useDragSource` axis 'up': sideways is the
 *     rail's own scroll). Tap is the accessible path; the drag is the fun one.
 *
 * The caller owns the game state: it filters/orders `items` (the rail only applies the
 * search and era chips it draws) and answers `onPick` / `onDrop`.
 */

export type RailItem = {
  key: string
  family: string
  given?: string
  /** the spell's years, one LTR run */
  years?: string | null
  look: ShirtLook
  /** already on the pitch — shown dimmed, not removed */
  taken?: boolean
  /** decades he played in (opening years) — for the era chips */
  decades?: readonly number[]
  /** extra text the search matches (the full name) */
  search?: string
  /** a small mark beside the years — "זר", "✓" */
  badge?: ReactNode
}

export type RailChip = { key: string; label: string; pressed: boolean; onClick: () => void }

/** The shirt's caption — the season, "בערך" where it is a neighbouring season. */
export function shirtTitle(look: ShirtLook): string {
  if (look.seasonLabel === '') return t('pick.shirt.plain')
  return t(look.approx ? 'pick.shirt.approx' : 'pick.shirt.alt', { season: look.seasonLabel })
}

function eraLabel(decade: number): string {
  return t('pick.rail.era', { n: decade < 2000 ? String(decade % 100).padStart(2, '0') : String(decade) })
}

/** the roster's own folding (niqqud, geresh, spaces) — one search behaviour everywhere */
function folded(text: string): string {
  return fold(text).replace(/\s+/g, '')
}

/**
 * The flight: a copy of the tapped shirt travels from the rail into the slot (transform
 * only — rule 8 on grass), then the one pick stamp fires where it lands.
 */
export function flyShirt(from: Element | null, toSelector: string, label?: string): void {
  const land = () => firePickFxAt(document.querySelector(toSelector), { label })
  if (typeof window === 'undefined' || !from) return land()
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const a = from.getBoundingClientRect()
  // the slot re-renders on the pick; read it on the next frame
  window.requestAnimationFrame(() => {
    const target = document.querySelector(toSelector)
    if (reduce || !target || typeof from.animate !== 'function') return land()
    const b = target.getBoundingClientRect()
    const ghost = from.cloneNode(true) as HTMLElement
    ghost.setAttribute('aria-hidden', 'true')
    Object.assign(ghost.style, {
      position: 'fixed',
      top: `${a.top}px`,
      width: `${a.width}px`,
      height: `${a.height}px`,
      zIndex: '70',
      pointerEvents: 'none',
      margin: '0',
    })
    ghost.style.setProperty('left', `${a.left}px`)
    document.body.appendChild(ghost)
    const dx = b.left + b.width / 2 - (a.left + a.width / 2)
    const dy = b.top + b.height / 2 - (a.top + a.height / 2)
    const scale = Math.max(0.35, Math.min(1.2, b.width / Math.max(1, a.width)))
    const flight = ghost.animate(
      [
        { transform: 'translate3d(0,0,0) scale(1) rotate(0deg)' },
        { transform: `translate3d(${dx * 0.5}px, ${dy * 0.5 - 40}px, 0) scale(${(1 + scale) / 1.6}) rotate(-8deg)`, offset: 0.55 },
        { transform: `translate3d(${dx}px, ${dy}px, 0) scale(${scale}) rotate(0deg)` },
      ],
      { duration: 360, easing: 'cubic-bezier(.3,.7,.2,1)' },
    )
    flight.onfinish = () => {
      ghost.remove()
      land()
    }
    flight.oncancel = () => ghost.remove()
  })
}

export function PickRail({
  target,
  targetSub,
  items,
  onPick,
  onDrop,
  onClose,
  chips = [],
  extra,
  eras = true,
  searchable = true,
  era: eraProp,
  onEra,
}: {
  /** what is being picked for — the slot's role, the band */
  target: string
  targetSub?: string
  items: readonly RailItem[]
  /** a tap: the caller places him; `shirt` is the element the flight starts from */
  onPick: (key: string, shirt: Element | null) => void
  /** a drag released over `[data-drop=<zone>]` */
  onDrop?: (zone: string, key: string) => void
  onClose: () => void
  /** the caller's own filter chips, printed before the eras */
  chips?: readonly RailChip[]
  /** a trailing button in the header (e.g. the full list) */
  extra?: ReactNode
  eras?: boolean
  searchable?: boolean
  /** controlled era chip — the caller re-dresses the men for that decade (an XI version) */
  era?: number | null
  onEra?: (next: number | null) => void
}) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (searching) searchRef.current?.focus()
  }, [searching])
  const [eraState, setEraState] = useState<number | null>(null)
  const era = eraProp !== undefined ? eraProp : eraState
  const setEra = (next: number | null) => (onEra ? onEra(next) : setEraState(next))
  const railRef = useRef<HTMLUListElement | null>(null)

  // a new target (the next slot, another band) starts the rail from its first shirt
  useEffect(() => {
    railRef.current?.scrollTo({ left: 0 })
  }, [target])

  const decades = useMemo(() => {
    if (!eras) return []
    const set = new Set<number>()
    for (const item of items) for (const decade of item.decades ?? []) set.add(decade)
    return [...set].sort((a, b) => a - b)
  }, [eras, items])

  const shown = useMemo(() => {
    const q = folded(query.trim())
    const kept = items.filter((item) => {
      if (era !== null && !(item.decades ?? []).includes(era)) return false
      if (q === '') return true
      return folded(`${item.family} ${item.given ?? ''} ${item.search ?? ''}`).includes(q)
    })
    // the men already on the pitch go to the end of the rail — dimmed, never hidden
    return [...kept.filter((item) => !item.taken), ...kept.filter((item) => item.taken)]
  }, [items, era, query])

  /**
   * A pick moves that man to the end of the rail (dimmed), and the browser would follow
   * the focused button there — so the rail lets go of focus and returns to its first shirt.
   */
  const picked = (key: string, shirt: Element | null) => {
    onPick(key, shirt)
    window.requestAnimationFrame(() => {
      if (document.activeElement instanceof HTMLElement && railRef.current?.contains(document.activeElement)) {
        document.activeElement.blur()
      }
      railRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
    })
  }

  const allChips: RailChip[] = [
    ...chips,
    ...(decades.length > 1
      ? [
          { key: 'era-all', label: t('pick.rail.allEras'), pressed: era === null, onClick: () => setEra(null) },
          ...decades.map((decade) => ({
            key: `era-${decade}`,
            label: eraLabel(decade),
            pressed: era === decade,
            onClick: () => setEra(era === decade ? null : decade),
          })),
        ]
      : []),
  ]

  return (
    <section
      aria-label={t('pick.rail.aria', { target })}
      data-pick-rail=""
      className="relative shrink-0 animate-fx-sheet-up border-t-rule border-ink bg-sheet motion-reduce:animate-none"
    >
      {/* ONE line: the target, then either the chips or the search field, then the tools */}
      <div className="flex items-center gap-1 ps-2 pt-1">
        <p className="flex min-h-[36px] max-w-[34%] shrink-0 flex-col justify-center bg-ink px-2 text-paper">
          <span className="truncate font-display text-[14px] leading-tight">{target}</span>
          {targetSub && <span className="truncate font-mono text-[9.5px] leading-tight text-concrete">{targetSub}</span>}
        </p>
        {searching ? (
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('pick.rail.search')}
            aria-label={t('pick.rail.search')}
            inputMode="search"
            enterKeyHint="search"
            className="min-h-[36px] w-full min-w-0 flex-1 border-hair border-ink bg-paper px-2 font-body text-[16px] text-ink outline-none placeholder:text-muted focus-visible:border-rule"
          />
        ) : (
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
            {allChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onClick}
                aria-pressed={chip.pressed}
                className={`flex min-h-[36px] shrink-0 items-center border-hair px-2.5 font-body text-[11.5px] font-extrabold leading-none transition-transform duration-press ease-stamp active:scale-[.95] motion-reduce:transition-none ${
                  chip.pressed ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-paper text-ink'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
        {searchable && (
          <button
            type="button"
            onClick={() => {
              if (searching) setQuery('')
              setSearching(!searching)
            }}
            aria-pressed={searching}
            aria-label={t('pick.rail.search')}
            className={`grid min-h-tap w-tap shrink-0 place-items-center border-hair ${
              searching || query !== '' ? 'border-ink bg-ink text-paper' : 'border-ink/40 text-ink'
            }`}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M12.6 12.6 L17.5 17.5" />
            </svg>
          </button>
        )}
        {extra}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('stage.close')}
          className="grid min-h-tap w-tap shrink-0 place-items-center font-mono text-[22px] leading-none text-ink"
        >
          ×
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="grid h-[104px] place-items-center px-3 font-body text-[12px] text-muted [@media(max-height:700px)]:h-[86px]">
          {t('pick.rail.empty')}
        </p>
      ) : (
        <ul
          ref={railRef}
          aria-label={t('pick.rail.count', { n: String(shown.length) })}
          className="flex snap-x gap-1 overflow-x-auto overscroll-x-contain px-2 pb-1 [scrollbar-width:none]"
        >
          {shown.map((item) => (
            <RailShirt key={item.key} item={item} onPick={picked} onDrop={onDrop} />
          ))}
        </ul>
      )}
    </section>
  )
}

function RailShirt({
  item,
  onPick,
  onDrop,
}: {
  item: RailItem
  onPick: (key: string, shirt: Element | null) => void
  onDrop?: (zone: string, key: string) => void
}) {
  const shirtRef = useRef<HTMLSpanElement | null>(null)
  const drag = useDragSource({
    payload: `rail:${item.key}`,
    axis: 'up',
    disabled: item.taken === true || !onDrop,
    onDrop: (zone) => onDrop?.(zone, item.key),
  })
  const title = shirtTitle(item.look)
  return (
    <li className="shrink-0 snap-start">
      <button
        type="button"
        {...drag}
        disabled={item.taken}
        onClick={() => onPick(item.key, shirtRef.current)}
        aria-label={`${item.family} ${item.given ?? ''} — ${title}`}
        data-rail-item={item.key}
        className="group flex w-[86px] flex-col [@media(max-height:700px)]:w-[72px] items-center pb-0.5 pt-1 transition-transform duration-press ease-stamp active:scale-[.93] disabled:opacity-35 motion-reduce:transition-none"
      >
        <span ref={shirtRef} className="relative block">
          <PlayerShirt look={item.look} title={title} className="h-[70px] w-[70px] group-active:animate-fx-wobble [@media(max-height:700px)]:h-[54px] [@media(max-height:700px)]:w-[54px]" />
          {item.badge && !item.taken && <span className="absolute start-0 top-0">{item.badge}</span>}
        </span>
        <span className="mt-0.5 block w-full truncate border-t-[3px] border-red bg-ink px-1 py-[2px] text-center font-body text-[11px] font-extrabold leading-tight text-paper">
          {item.family}
        </span>
        <span className="mt-[2px] flex h-[13px] w-full items-center justify-center gap-1 overflow-hidden whitespace-nowrap">
          {item.taken ? (
            <span className="font-body text-[9.5px] font-extrabold text-red">{t('pick.rail.taken')}</span>
          ) : (
            <>
              {item.years && (
                <span className="font-mono text-[9.5px] tabular-nums leading-none text-muted">
                  <Num>{item.years}</Num>
                </span>
              )}
            </>
          )}
        </span>
      </button>
    </li>
  )
}
