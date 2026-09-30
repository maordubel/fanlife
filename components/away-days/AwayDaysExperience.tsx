'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { firePickFxAt } from '@/components/stage/PickFx'
import { SlideSheet } from '@/components/stage/SlideSheet'
import {
  NO_FILTERS,
  activeFilterCount,
  applyFilters,
  formatKm,
  legTo,
  visitNumberAt,
  visitsAt,
  type Filters,
  type JourneyData,
  type VenueLite,
} from '@/lib/away-days/journey'
import { isBeen, myJourney } from '@/lib/away-days/been'
import { creditLine, photoLabel, venuePhoto } from '@/lib/away-days/media'
import { CrossLinks } from '@/components/links/CrossLinks'
import { t } from '@/lib/i18n'
import type { CrossLink } from '@/lib/links/types'
import type { Camera, MapMarker } from './AwayDaysMap'
import { AwayDaysFilters } from './AwayDaysFilters'
import { MyJourney } from './MyJourney'
import { useBeen } from './useBeen'
import { VenuePhoto } from './VenuePhoto'
import { VenueSheet } from './VenueSheet'
import { VisitCard } from './VisitCard'

/**
 * AWAY DAYS — the journey and the explorer (spec §23, §27–§28, §31–§32).
 *
 * One phone screen: a one-line HUD (the two modes, the "how"), the globe as big as the
 * screen allows, and a dock. In the journey the dock is the stop — the match card, a
 * swipe or Next/Prev to travel — and the map is not a touch surface at all, so a swipe
 * on the card can never fight a drag on the globe (§31). In explore the globe is the
 * touch surface and the dock is the filters; a ground opens its sheet with every visit.
 *
 * The map module (d3-geo + the atlas) loads with `next/dynamic` on this route only.
 */

const AwayDaysMap = dynamic(() => import('./AwayDaysMap'), {
  ssr: false,
  loading: ({ error }) => (
    <div className="grid h-full w-full place-items-center bg-ink px-4 text-center font-body text-[12px] text-concrete" role="status">
      {error ? t('away.error') : t('away.loading')}
    </div>
  ),
})

type Mode = 'journey' | 'explore'
type LngLat = [number, number]
const at = (v: VenueLite): LngLat => [v.lng, v.lat]
const caps = (s: string | null, fallback: string) => (s ?? fallback).toLocaleUpperCase('en-US')

function zoomFor(km: number): number {
  if (km > 4000) return 1.35
  if (km > 1800) return 1.8
  if (km > 600) return 2.4
  return 3
}

export function AwayDaysExperience({
  data,
  links,
}: {
  data: JourneyData
  /** delta 89: each visit's doors into the other gates (the match's archive card, its scorers), by matchId */
  links?: Record<string, CrossLink[]>
}) {
  const total = data.visits.length
  const [mode, setMode] = useState<Mode>('journey')
  const [index, setIndex] = useState(-1) // -1 = Bloomfield, total = the end of the road
  const [arrived, setArrived] = useState(-1)
  const [details, setDetails] = useState(false)
  const [howTo, setHowTo] = useState(false)
  const [venueId, setVenueId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const card = useRef<HTMLDivElement>(null)
  // "הייתי שם" (spec §30) — device first, the account merged in when there is one
  const { ledger, toggle } = useBeen()
  const [mine, setMine] = useState(false)
  const mineSum = useMemo(() => myJourney(data, ledger), [data, ledger])
  const beenFor = (visitId: string) => ({ on: isBeen(ledger, visitId), onToggle: () => toggle(visitId) })
  const originPhoto = useMemo(() => venuePhoto(data.origin.id), [data.origin.id])

  const go = useCallback((next: number) => setIndex(Math.max(-1, Math.min(total, next))), [total])

  // delta 89 deep links (the page is static, so the query is read here, once):
  //   ?visit=<matchId> opens that stop in the journey · ?venue=<id> opens the ground's sheet
  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const visit = query.get('visit')
    const ground = query.get('venue')
    if (visit) {
      const i = data.visits.findIndex((v) => v.matchId === visit || v.id === visit)
      if (i >= 0) {
        setMode('journey')
        setIndex(i)
      }
    } else if (ground && data.venues[ground]) {
      setMode('explore')
      setVenueId(ground)
    }
  }, [data])
  const leg = useMemo(() => (index >= 0 && index < total ? legTo(data, index) : null), [data, index, total])

  // the camera
  const focus: Camera = useMemo(() => {
    if (mode === 'explore') return { lng: 24, lat: 45, zoom: 1.7 }
    if (index < 0) return { lng: data.origin.lng, lat: data.origin.lat, zoom: 1.6 }
    if (index >= total) return { lng: 38, lat: 38, zoom: 1.05 }
    const to = leg?.to ?? data.origin
    return { lng: to.lng, lat: to.lat, zoom: zoomFor(leg?.km ?? 0) }
  }, [mode, index, total, leg, data.origin])

  // the road, as the map draws it
  const route = useMemo(() => {
    if (mode === 'explore') return []
    const legs: [LngLat, LngLat][] = []
    const upTo = Math.min(index, total)
    for (let i = 0; i < upTo; i += 1) {
      const l = legTo(data, i)
      if (l && !l.sameGround) legs.push([at(l.from), at(l.to)])
    }
    return legs
  }, [data, index, total, mode])

  const shown = useMemo(() => applyFilters(data, filters), [data, filters])
  const grounds = useMemo(() => {
    const counts = new Map<string, number>()
    for (const v of shown) counts.set(v.venueId, (counts.get(v.venueId) ?? 0) + 1)
    return [...counts]
      .map(([id, count]) => ({ venue: data.venues[id], count }))
      .filter((g): g is { venue: VenueLite; count: number } => Boolean(g.venue))
  }, [shown, data.venues])
  const markers: MapMarker[] = useMemo(() => {
    const out: MapMarker[] = [{ venue: data.origin, state: 'origin', label: index < 0 && mode === 'journey' ? 'TEL AVIV' : undefined }]
    if (mode === 'explore') {
      const counts = new Map<string, number>()
      for (const v of shown) counts.set(v.venueId, (counts.get(v.venueId) ?? 0) + 1)
      for (const [id, count] of counts) {
        const venue = data.venues[id]
        if (venue) out.push({ venue, state: venueId === id ? 'active' : 'idle', count, label: venueId === id ? caps(venue.cityLatin, venue.cityHe) : undefined })
      }
      return out
    }
    const seen = new Set<string>()
    for (let i = 0; i < Math.min(index, total); i += 1) {
      const id = data.visits[i]?.venueId
      if (id) seen.add(id)
    }
    const current = index >= 0 && index < total ? data.visits[index]?.venueId : null
    for (const id of seen) {
      const venue = data.venues[id]
      if (venue && id !== current) out.push({ venue, state: 'past' })
    }
    if (current) {
      const venue = data.venues[current]
      if (venue) out.push({ venue, state: 'active', label: caps(venue.cityLatin, venue.cityHe) })
    }
    return out
  }, [data, index, total, mode, shown, venueId])

  const onArrive = useCallback(() => setArrived(index), [index])

  // the print hit when a stop opens
  useEffect(() => {
    if (mode !== 'journey' || arrived < 0 || arrived >= total || !card.current) return
    const visit = data.visits[arrived]
    const venue = visit ? data.venues[visit.venueId] : null
    if (venue) firePickFxAt(card.current, { label: venue.cityHe, tone: 'red', big: arrived === 0 || arrived === total - 1, haptic: 'tap' })
  }, [arrived, mode, data, total])

  // keyboard: in RTL the next stop is to the left
  useEffect(() => {
    if (mode !== 'journey') return
    const key = (event: KeyboardEvent) => {
      if (details || howTo || venueId || mine) return
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (event.key === 'ArrowLeft' || event.key === 'PageDown') {
        event.preventDefault()
        go(index + 1)
      } else if (event.key === 'ArrowRight' || event.key === 'PageUp') {
        event.preventDefault()
        go(index - 1)
      } else if (event.key === 'Home') go(-1)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [mode, index, go, details, howTo, venueId, mine])

  // swipe on the card only — never on the map (§31, gesture conflict)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const onDown = (e: React.PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY }
  }
  const onUp = (e: React.PointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 48 && Math.abs(dy) < 40) go(index + (dx > 0 ? 1 : -1))
    else if (dy < -48 && Math.abs(dx) < 40 && index >= 0 && index < total) setDetails(true)
  }

  const shownVisit = mode === 'journey' ? data.visits[Math.max(0, Math.min(total - 1, arrived))] : undefined
  const inTransit = mode === 'journey' && arrived !== index
  const caption = (() => {
    if (mode !== 'journey' || !leg) return null
    const visit = data.visits[index]
    if (!visit) return null
    const from = caps(leg.from.cityLatin, leg.from.cityHe)
    const to = caps(leg.to.cityLatin, leg.to.cityHe)
    return {
      line: leg.sameGround ? `${visit.year} · ${to}` : `${visit.year} · ${from} → ${to} · ${formatKm(leg.km)} KM`,
      ground: leg.to.nameHe,
      again: leg.sameGround || visitNumberAt(data, index) > 1 ? t('away.caption.again', { n: String(visitNumberAt(data, index)) }) : null,
    }
  })()

  if (total === 0) {
    return <p className="p-4 font-body text-[13px] text-muted">{t('away.empty')}</p>
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:grid md:flex-none md:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] md:gap-x-4 md:gap-y-2">
      {/* HUD — one line */}
      <div className="flex shrink-0 items-center gap-2 pb-1.5 md:col-span-2">
        <div role="tablist" aria-label={t('away.mode.aria')} className="flex shrink-0 border-hair border-ink">
          {(['journey', 'explore'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m)
                setVenueId(null)
              }}
              className={`min-h-tap px-3.5 font-sign text-[14px] transition-transform duration-press ease-stamp active:scale-[.97] motion-reduce:transition-none ${
                mode === m ? 'bg-ink text-paper' : 'bg-paper text-ink'
              }`}
            >
              {m === 'journey' ? t('away.mode.journey') : t('away.mode.explore')}
            </button>
          ))}
        </div>
        <p className="min-w-0 flex-1 truncate font-body text-[11px] leading-tight text-muted">
          {mode === 'journey'
            ? index < 0
              ? t('away.hud.start')
              : index >= total
                ? t('away.hud.end')
                : t('away.progress', { n: String(index + 1), total: String(total) })
            : t('away.explore.count', { n: String(shown.length), stops: String(new Set(shown.map((v) => v.venueId)).size) })}
        </p>
        <button
          type="button"
          onClick={() => setMine(true)}
          aria-label={t('away89.mine.aria', { n: String(mineSum.matches) })}
          className={`flex min-h-tap shrink-0 items-center gap-1 border-hair px-2 font-body text-[11.5px] font-extrabold ${
            mineSum.matches > 0 ? 'border-red bg-red text-paper' : 'border-ink/40 text-ink'
          }`}
        >
          {t('away89.mine.chip')}
          {mineSum.matches > 0 && <span className="font-mono text-[11px] tabular-nums">{mineSum.matches}</span>}
        </button>
        <button
          type="button"
          onClick={() => setHowTo(true)}
          className="min-h-tap shrink-0 border-hair border-ink/40 px-2.5 font-body text-[11.5px] font-extrabold text-ink"
        >
          {t('away.howTo')}
        </button>
      </div>

      {/* THE FIELD — the world */}
      <div className="relative min-h-0 flex-1 border-rule border-ink md:h-[min(640px,calc(100dvh-240px))] md:min-h-[440px]">
        <AwayDaysMap
          markers={markers}
          route={route}
          leg={mode === 'journey' && leg && !leg.sameGround ? [at(leg.from), at(leg.to)] : null}
          focus={focus}
          interactive={mode === 'explore'}
          onMarker={mode === 'explore' ? setVenueId : undefined}
          onArrive={onArrive}
        />
        {caption && (
          <div key={index} className="pointer-events-none absolute inset-x-2 top-2 flex justify-start">
            <div className="animate-fx-pop border-plate border-ink bg-ink px-2.5 py-1.5">
              <p dir="ltr" className="relative font-latin text-[11px] font-black tracking-[0.16em] text-sheet sm:text-[13px]">
                {caption.line}
              </p>
              <p className="mt-0.5 font-sign text-[12px] leading-tight text-concrete">
                {caption.ground}
                {caption.again ? ` · ${caption.again}` : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* THE DOCK */}
      <div className="shrink-0 pt-2 md:pt-0">
        {mode === 'journey' ? (
          <div className="flex flex-col gap-2">
            <div
              ref={card}
              onPointerDown={onDown}
              onPointerUp={onUp}
              onPointerCancel={() => (swipe.current = null)}
              className="touch-pan-y border-rule border-ink bg-sheet px-3 py-2.5"
              aria-live="polite"
            >
              {index < 0 ? (
                <div className="flex gap-3">
                {originPhoto?.tall && (
                  <div className="relative w-[64px] shrink-0 self-start overflow-hidden border-hair border-ink bg-ink sm:w-[72px]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- the ledger ships the bytes it measured (away-media.json) */}
                    <img
                      src={originPhoto.tall}
                      alt={t('away89.photo.alt', { venue: data.origin.nameHe, city: data.origin.cityHe })}
                      decoding="async"
                      className="block aspect-[3/4] w-full object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-latin text-[9px] font-bold tracking-[0.3em] text-sign" dir="ltr">
                    ON THE ROAD WITH HAPOEL
                  </p>
                  <p className="mt-1 font-display text-[20px] leading-tight text-ink">{t('away.start.title')}</p>
                  <p className="mt-1 font-body text-[12px] leading-snug text-muted">
                    {t('away.start.body', {
                      visits: String(data.counts.visits),
                      stops: String(data.counts.stops),
                      countries: String(data.counts.countries),
                    })}
                  </p>
                  {originPhoto && (
                    <p className="mt-1 truncate font-body text-[10px] leading-tight text-muted">
                      {t('away89.photo.inline', { venue: data.origin.nameHe, label: photoLabel(originPhoto), credit: creditLine(originPhoto) })}
                    </p>
                  )}
                </div>
                </div>
              ) : index >= total ? (
                <div>
                  <p className="font-display text-[20px] leading-tight text-ink">{t('away.end.title')}</p>
                  <p className="mt-1 font-body text-[12px] leading-snug text-muted">{t('away.end.body', { n: String(data.counts.research) })}</p>
                  <button
                    type="button"
                    onClick={() => setMine(true)}
                    className="mt-2 min-h-tap border-hair border-red px-3 font-body text-[12px] font-extrabold text-red"
                  >
                    {mineSum.matches > 0 ? t('away89.end.mine', { n: String(mineSum.matches) }) : t('away89.end.mineEmpty')}
                  </button>
                </div>
              ) : shownVisit ? (
                <div className={`transition-opacity duration-200 motion-reduce:transition-none ${inTransit ? 'opacity-40' : 'opacity-100'}`}>
                  <div key={shownVisit.id} className={inTransit ? '' : 'animate-fx-pop'}>
                    <VisitCard visit={shownVisit} data={data} compact showScorers={false} been={inTransit ? undefined : beenFor(shownVisit.id)} />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex gap-2">
              {index >= 0 && (
                <button
                  type="button"
                  onClick={() => go(index - 1)}
                  aria-label={t('away.prev')}
                  className="grid min-h-tap w-tap shrink-0 place-items-center border-hair border-ink/40 bg-paper font-display text-[20px] leading-none text-ink transition-transform duration-press ease-stamp active:scale-[.94] motion-reduce:transition-none"
                >
                  <span aria-hidden="true">→</span>
                </button>
              )}
              {index < total ? (
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  className="flex min-h-tap flex-1 items-center justify-center gap-2 bg-red px-3 font-body text-step--1 font-extrabold text-paper transition-transform duration-press ease-stamp active:scale-[.97] motion-reduce:transition-none"
                >
                  {index < 0 ? t('away.start.cta') : index === total - 1 ? t('away.next.last') : t('away.next')}
                  <span aria-hidden="true">←</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="flex min-h-tap flex-1 items-center justify-center bg-ink px-3 font-body text-step--1 font-extrabold text-paper transition-transform duration-press ease-stamp active:scale-[.97] motion-reduce:transition-none"
                >
                  {t('away.restart')}
                </button>
              )}
              {index >= 0 && index < total && (
                <button
                  type="button"
                  onClick={() => setDetails(true)}
                  className="min-h-tap shrink-0 border-hair border-ink/40 bg-paper px-3 font-body text-[12px] font-extrabold text-ink"
                >
                  {t('away.card.details')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="flex min-h-tap flex-1 items-center justify-center gap-2 bg-red px-3 font-body text-step--1 font-extrabold text-paper transition-transform duration-press ease-stamp active:scale-[.97] motion-reduce:transition-none"
            >
              {t('away.explore.filters')}
              {activeFilterCount(filters) > 0 && (
                <span className="bg-paper px-1.5 font-mono text-[12px] tabular-nums text-red">{activeFilterCount(filters)}</span>
              )}
            </button>
            <p className="min-w-0 flex-[1.3] font-body text-[11px] leading-snug text-muted">{t('away.explore.hint')}</p>
          </div>
        )}
        {mode === 'explore' && (
          // desktop only: the grounds as a list — the keyboard's way to every marker, and room the side column has
          <ul className="mt-2 hidden max-h-[min(560px,calc(100dvh-320px))] overflow-y-auto border-y border-ink/15 md:block">
            {grounds.map(({ venue, count }) => (
              <li key={venue.id}>
                <button
                  type="button"
                  onClick={() => setVenueId(venue.id)}
                  className={`flex min-h-tap w-full items-center justify-between gap-2 border-b border-ink/10 px-2 text-start font-body text-[12.5px] ${venueId === venue.id ? 'bg-ink text-paper' : 'text-ink'}`}
                >
                  <span className="min-w-0 truncate">
                    {venue.nameHe} <span className="text-muted">· {venue.cityHe}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[12px] tabular-nums">{count}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* sheets */}
      <SlideSheet
        open={details && index >= 0 && index < total}
        onClose={() => setDetails(false)}
        title={data.visits[index]?.opponentHe ?? ''}
        latin={data.visits[index]?.opponentLatin ?? undefined}
        size="auto"
      >
        {data.visits[index] && (
          <div>
            {(() => {
              const v = data.visits[index]!
              const venue = data.venues[v.venueId]
              const photo = venuePhoto(v.venueId)
              return photo && venue ? (
                <div className="mb-2.5">
                  <VenuePhoto media={photo} alt={t('away89.photo.alt', { venue: venue.nameHe, city: venue.cityHe })} />
                </div>
              ) : null
            })()}
            <VisitCard visit={data.visits[index]!} data={data} been={beenFor(data.visits[index]!.id)} />
            <CrossLinks links={links?.[data.visits[index]!.matchId]} from="away-days" className="mt-2.5" />
            {leg && !leg.sameGround && (
              <p className="mt-3 font-body text-[12px] text-muted">
                {t('away.sheet.leg', { from: leg.from.cityHe, to: leg.to.cityHe, km: formatKm(leg.km) })}
              </p>
            )}
            {visitsAt(data, data.visits[index]!.venueId).length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setDetails(false)
                  setVenueId(data.visits[index]!.venueId)
                }}
                className="mt-3 min-h-tap border-hair border-ink/40 px-3 font-body text-[12px] font-extrabold text-ink"
              >
                {t('away.card.moreAtVenue', { n: String(visitsAt(data, data.visits[index]!.venueId).length) })}
              </button>
            )}
          </div>
        )}
      </SlideSheet>

      <VenueSheet
        data={data}
        venueId={venueId}
        onClose={() => setVenueId(null)}
        been={{ isOn: (id) => isBeen(ledger, id), toggle }}
        onJourney={(id) => {
          const i = data.visits.findIndex((v) => v.id === id)
          setVenueId(null)
          setMode('journey')
          if (i >= 0) go(i)
        }}
      />

      <AwayDaysFilters
        data={data}
        open={filtersOpen}
        filters={filters}
        shown={shown.length}
        onChange={setFilters}
        onClose={() => setFiltersOpen(false)}
      />

      <SlideSheet open={howTo} onClose={() => setHowTo(false)} title={t('away.howTo')} latin="HOW IT WORKS" size="auto">
        <div className="space-y-2 font-body text-[13px] leading-relaxed text-ink">
          <p>{t('away.help.journey')}</p>
          <p>{t('away.help.explore')}</p>
          <p>{t('away89.help.been')}</p>
          <p className="text-muted">{t('away.help.accuracy', { n: String(data.counts.research) })}</p>
        </div>
      </SlideSheet>

      <MyJourney
        open={mine}
        onClose={() => setMine(false)}
        data={data}
        ledger={ledger}
        onVisit={(id) => {
          const i = data.visits.findIndex((v) => v.id === id)
          setMine(false)
          setVenueId(null)
          setMode('journey')
          if (i >= 0) go(i)
        }}
      />
    </div>
  )
}
