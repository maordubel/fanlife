'use client'

import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from 'react'

import { PlayerCensus } from '@/components/club/PlayerCensus'
import { RecordRun } from '@/components/play/RecordRun'
import { SlideSheet } from '@/components/stage/SlideSheet'
import type { Census } from '@/lib/club/census'
import { firePickFx } from '@/components/stage/PickFx'
import { Num } from '@/components/ui/Num'
import { describeIds, digBox, openEntity, rabbit, searchArchive, seasonDeck } from '@/app/archive/actions'
import { reactionSetOf, REACTIONS, type ArchiveCard, type EntityDetail, type EntityType } from '@/lib/archive/graph-types'
import { readCompletedChapters } from '@/lib/life/memoryPassport'
import { voice, voiceAction } from '@/lib/voice'
import { haptic } from '@/lib/play/haptics'
import { emit, telemetry } from '@/lib/profile/events'
import { isOn, onIds } from '@/lib/profile/store'
import { t, type MessageKey } from '@/lib/i18n'
import { ArchiveBox } from './ArchiveBox'
import { ArchiveDrawer } from './ArchiveDrawer'
import { MineSheet, SearchSheet, TimeMachine } from './ArchiveSheets'
import { ArtifactMark, CardHeadline, LATIN, cardTitle, typeLabel } from './EntityCard'

/**
 * שער 12 — הארכיון החי, on one screen (brief §22, prototype v10).
 *
 * A dock above the tab bar — **היום · זמן · חפירה · חיפוש · שלי** — over one deck of
 * cards you swipe. Five Today chips deal the deck; the time machine deals a season; the
 * box is a table you dig through; search is ONE server search over the graph; Mine is a
 * parity set on the device (`archive.mine`, `toggleIn/isOn` semantics through `emit`),
 * so an un-save survives a sync.
 *
 * **Depth** is how far the visit went: a related item, the rabbit hole, the box, the
 * trail — each open from inside the archive is a step down. Five steps in one visit is a
 * finished round (`RecordRun "/archive"`, once per visit); every open is also filed into
 * the `archive` collection (the deed of the day, and gate 10's discovery count).
 */

export type TodayChip = 'today' | 'know' | 'shelf' | 'forgotten' | 'discover'
const CHIPS: readonly TodayChip[] = ['today', 'know', 'shelf', 'forgotten', 'discover']
type Layer = 'box' | 'time' | 'search' | 'mine' | null
type Via = 'deck' | 'related' | 'around' | 'box' | 'trail' | 'rabbit' | 'search' | 'mine' | 'at'
const DEEP: ReadonlySet<Via> = new Set<Via>(['related', 'around', 'box', 'trail', 'rabbit'])
const DEPTH_ROUND = 5
const TRAIL_MAX = 6

/** A quiet tint per era — tokens only, in fives (brand guard). */
function eraTint(decade: number | null): string {
  if (decade === null) return 'bg-sheet'
  if (decade < 1950) return 'bg-concrete/40'
  if (decade < 1980) return 'bg-concrete/20'
  if (decade < 1990) return 'bg-sign/10'
  if (decade < 2000) return 'bg-red/10'
  if (decade < 2010) return 'bg-sign/5'
  if (decade < 2020) return 'bg-red/5'
  return 'bg-sheet'
}

export function ArchiveApp({
  decks,
  todayHe,
  decades,
  seed,
  cursor,
  initial,
  atMissing,
  figures,
  report,
  song,
  shelf,
  census,
}: {
  decks: Record<TodayChip, ArchiveCard[]>
  todayHe: string
  decades: { decade: number; seasons: string[] }[]
  seed: number
  cursor: number
  initial: EntityDetail | null
  atMissing: boolean
  figures: string
  /** the report-an-error link — on a phone it lives in the drawer, where the facts are */
  report?: ReactNode
  /** §3 — the landing's one song line (`components/voice/SongLine.tsx`), chosen by the date */
  song?: ReactNode
  /** Gate 5's "full collection" (`/archive?show=kits`): every canonical kit, opened as the deck */
  shelf?: ArchiveCard[]
  /** how many men wore the shirt, counted from the Player Master — the plate the landing opens */
  census?: Census
}) {
  const [censusOpen, setCensusOpen] = useState(false)
  const firstChip = decks.today.length ? 'today' : 'know'
  const [chip, setChip] = useState<TodayChip | null>(shelf && shelf.length > 0 ? null : firstChip)
  const [deck, setDeck] = useState<ArchiveCard[]>(shelf && shelf.length > 0 ? shelf : decks[firstChip])
  // §21 — the default landing asks "מה חזר היום?" rather than showing a dock of systems
  const [context, setContext] = useState<string>(() =>
    shelf && shelf.length > 0
      ? t('archive.kits.context', { n: String(shelf.length) })
      : voice({ gate: 12, moment: 'intro', seed: `${seed}:${cursor}` }).title,
  )
  const [season, setSeason] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [more, setMore] = useState(false)

  const [detail, setDetail] = useState<EntityDetail | null>(initial)
  const [layer, setLayer] = useState<Layer>(null)
  const [trail, setTrail] = useState<{ id: string; title: string }[]>(initial ? [{ id: initial.card.id, title: cardTitle(initial.card) }] : [])
  const [depth, setDepth] = useState(0)
  const [rabbitEmpty, setRabbitEmpty] = useState(false)
  const [flash, setFlash] = useState<{ big: string; small?: string } | null>(null)

  const [mine, setMine] = useState<string[]>([])
  const [mineCards, setMineCards] = useState<ArchiveCard[]>([])
  const [reactions, setReactions] = useState<string[]>([])

  const [box, setBox] = useState<{ items: ArchiveCard[]; decade: number | null; round: number }>({ items: [], decade: null, round: 0 })
  const [busy, startBusy] = useTransition()

  // the device's own sets, read after mount — the server never knows them
  useEffect(() => {
    setMine(onIds('archive.mine'))
    setReactions(onIds('archive.react'))
  }, [])
  // the LIFE chapters this device finished — read once, never sent anywhere (§23.2)
  const [lived, setLived] = useState<string[]>([])
  useEffect(() => {
    void readCompletedChapters().then(setLived)
  }, [])

  // an entry through `?at=` still counts as having looked at it
  const filed = useRef(false)
  useEffect(() => {
    if (!initial || filed.current) return
    filed.current = true
    emit({ type: 'collected', set: 'archive', ids: [initial.card.id], gate: '/archive' })
  }, [initial])

  const flashTimer = useRef<number | null>(null)
  const say = useCallback((big: string, small?: string) => {
    setFlash({ big, small })
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), 1100)
  }, [])

  /* ------------------------------------------------------------ opening */

  const show = useCallback(
    (next: EntityDetail, via: Via) => {
      setDetail(next)
      setRabbitEmpty(false)
      setTrail((old) => {
        const without = old.filter((row) => row.id !== next.card.id)
        return [...without, { id: next.card.id, title: cardTitle(next.card) }].slice(-TRAIL_MAX)
      })
      if (DEEP.has(via)) setDepth((d) => d + 1)
      emit({ type: 'collected', set: 'archive', ids: [next.card.id], gate: '/archive' })
      telemetry('archive_item_opened', { type: next.card.type, via })
    },
    [],
  )

  const open = useCallback(
    (id: string, via: Via) => {
      haptic('tap')
      startBusy(async () => {
        const next = await openEntity(id)
        if (next) show(next, via)
      })
    },
    [show],
  )

  function dig() {
    if (!detail) return
    const from = detail.card.id
    startBusy(async () => {
      const next = await rabbit(from, seed, depth, trail.map((row) => row.id))
      telemetry('rabbit_hole_used', { found: next !== null })
      if (!next) {
        setRabbitEmpty(true)
        return
      }
      haptic('lock')
      say(voiceAction(12, 'rabbit') ?? '', cardTitle(next.card))
      show(next, 'rabbit')
    })
  }

  /* ------------------------------------------------------------ Mine and reactions */

  function toggleSave(card: ArchiveCard, event?: { clientX: number; clientY: number }) {
    const on = !isOn('archive.mine', card.id)
    emit({ type: 'archive_saved', entityId: card.id, on })
    setMine(onIds('archive.mine'))
    haptic(on ? 'lock' : 'tap')
    say(on ? t('archive.flash.saved') : t('archive.flash.unsaved'), cardTitle(card))
    // saving into Mine is a pick — the one print hit the whole ground shares
    if (on && event) firePickFx(event.clientX, event.clientY, { label: t('archive.card.saved'), tone: 'red', haptic: false })
  }

  function react(card: ArchiveCard, code: string) {
    const codes = REACTIONS[reactionSetOf(card.type)]
    const current = codes.find((c) => isOn('archive.react', `${c}:${card.id}`)) ?? null
    if (current) emit({ type: 'toggled', set: 'archive.react', id: `${current}:${card.id}`, on: false })
    if (current !== code) emit({ type: 'toggled', set: 'archive.react', id: `${code}:${card.id}`, on: true })
    setReactions(onIds('archive.react'))
    haptic('tap')
  }

  const reactionOf = (card: ArchiveCard) => REACTIONS[reactionSetOf(card.type)].find((c) => reactions.includes(`${c}:${card.id}`)) ?? null

  /* ------------------------------------------------------------ the deck */

  function pickChip(next: TodayChip) {
    setChip(next)
    setSeason(null)
    setDeck(decks[next])
    setIndex(0)
    setMore(false)
    setContext(next === 'today' ? (voiceAction(12, 'today') ?? '') : t(`archive.chip.${next}` as MessageKey))
  }

  function step(dir: 1 | -1) {
    if (deck.length === 0) return
    setIndex((i) => (i + dir + deck.length) % deck.length)
    setMore(false)
  }

  const swipe = useRef<{ x: number; y: number } | null>(null)
  const trailRef = useRef<HTMLOListElement | null>(null)
  useEffect(() => {
    const list = trailRef.current
    const last = list?.lastElementChild
    // the newest stop in view — horizontally only, so the page never jumps
    if (list && last instanceof HTMLElement) {
      const box = list.getBoundingClientRect()
      const item = last.getBoundingClientRect()
      list.scrollBy({ left: item.left - box.left - 4 })
    }
  }, [trail])
  const current = deck.length ? deck[index % deck.length] ?? null : null

  /* ------------------------------------------------------------ the dock */

  function openBox(decade: number | null = box.decade, round = box.round) {
    setLayer('box')
    startBusy(async () => {
      const items = await digBox(seed, decade, round)
      setBox({ items, decade, round })
    })
  }

  function openMine() {
    setLayer('mine')
    const ids = onIds('archive.mine')
    setMine(ids)
    startBusy(async () => setMineCards(await describeIds(ids)))
  }

  function pickSeason(label: string) {
    setLayer(null)
    startBusy(async () => {
      const cards = await seasonDeck(label)
      setChip(null)
      setSeason(label)
      setDeck(cards)
      setIndex(0)
      setContext(t('archive.context.season', { label }))
      say(label, t('archive.flash.season'))
    })
  }

  const runSearch = useCallback((q: string, type: EntityType | null) => searchArchive(q, type), [])

  const tint = eraTint(current?.decade ?? null)
  const dockButtons: { id: Exclude<Layer, null> | 'today'; key: MessageKey; latin: string }[] = [
    { id: 'today', key: 'archive.dock.today', latin: 'TODAY' },
    { id: 'time', key: 'archive.dock.time', latin: 'TIME' },
    { id: 'box', key: 'archive.dock.dig', latin: 'DIG' },
    { id: 'search', key: 'archive.dock.search', latin: 'SEARCH' },
    { id: 'mine', key: 'archive.dock.mine', latin: 'MINE' },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col md:mt-3 md:block md:flex-none">
      {depth >= DEPTH_ROUND && <RecordRun gate="/archive" score={depth} />}

      {/* context line: where the deck came from, and Mine at a glance */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b-rule border-ink pb-1.5">
        <div className="min-w-0">
          <p className="hidden font-latin text-[9px] font-bold tracking-[0.22em] text-sign md:block" dir="ltr">
            LIVING ARCHIVE
          </p>
          <p className="truncate font-sign text-[14px] leading-tight text-ink md:text-[15px]">
            {context}
            {chip === 'today' && <span className="font-body text-[12px] text-muted"> · {todayHe}</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={openMine}
          aria-label={t('archive.mine.count', { n: String(mine.length) })}
          className="flex min-h-tap shrink-0 items-center gap-1.5 border-rule border-ink bg-sheet px-3 font-body text-[13px] font-extrabold text-ink"
        >
          {t('archive.dock.mine')}
          <span className="bg-red px-1.5 font-mono text-[12px] tabular-nums text-paper">
            <Num>{mine.length}</Num>
          </span>
        </button>
      </div>

      {atMissing && <p className="mt-2 shrink-0 border-s-rule border-red ps-2 font-body text-[12.5px] text-ink">{t('archive.at.missing')}</p>}

      {/* the Today chips — the lane tabs, styled as the shared SlideDeck tab row */}
      <div className="-mx-gutter mt-2 flex shrink-0 gap-1.5 overflow-x-auto px-gutter pb-1" role="tablist" aria-label={t('archive.chip.aria')}>
        {CHIPS.map((row) => (
          <button
            key={row}
            type="button"
            role="tab"
            onClick={() => pickChip(row)}
            aria-selected={chip === row}
            aria-pressed={chip === row}
            className={`min-h-[40px] shrink-0 border-hair px-3 font-body text-[12px] font-extrabold leading-none transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none ${
              chip === row ? 'border-red bg-red text-paper' : 'border-ink/40 bg-paper text-ink'
            }`}
          >
            {row === 'today' ? voiceAction(12, 'today') : t(`archive.chip.${row}` as MessageKey)}
          </button>
        ))}
        {season && (
          <button type="button" onClick={() => setLayer('time')} aria-pressed className="min-h-[40px] shrink-0 border-hair border-sign bg-sign px-3 font-mono text-[12px] tabular-nums text-paper">
            <Num>{season}</Num>
          </button>
        )}
      </div>

      {/* the trail and the depth */}
      <div className="mt-1.5 flex shrink-0 items-center gap-2">
        <ol ref={trailRef} className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1" aria-label={t('archive.trail.aria')}>
          {trail.map((row, i) => (
            <li key={row.id} className="flex shrink-0 items-center gap-1">
              {i > 0 && <span aria-hidden="true" className="text-red">‹</span>}
              <button
                type="button"
                onClick={() => open(row.id, 'trail')}
                className="min-h-tap max-w-[9.5rem] truncate border-hair border-ink/40 bg-paper px-2 font-body text-[12px] text-ink"
              >
                {row.title}
              </button>
            </li>
          ))}
          {trail.length === 0 && <li className="font-body text-[11.5px] text-muted">{voiceAction(12, 'trail')}</li>}
        </ol>
        <p className="shrink-0 border-rule border-ink bg-ink px-2 py-1 font-body text-[11px] font-bold text-paper" aria-label={t('archive.depth.aria', { n: String(depth) })}>
          {t('archive.depth')} <span className="font-mono tabular-nums text-red"><Num>{depth}</Num></span>
        </p>
      </div>

      {/*
        the deck — ONE card, as big as the phone allows, on a fixed grid (delta 88).

        Maor, 24.9.2026: *"החלון הפנימי לא בגודל נוח, המידע שבתוך החלון הפנימי צף"*. The card
        used to sit at the top of a second framed window with its lines wherever they fell.
        Now the card IS the window and fills it: a head (mark · kind · the headline · the
        date), the facts in labelled rows, and the actions and the pager pinned to its
        foot — the same rows at every phone height, only the gap between them grows.
      */}
      <section
        aria-roledescription="carousel"
        aria-label={t('archive.deck.aria')}
        className="relative mt-2 flex min-h-0 flex-1 flex-col md:mx-auto md:block md:w-full md:max-w-[760px] md:flex-none"
      >
        {flash && (
          <div aria-live="polite" className="pointer-events-none absolute inset-x-3 top-3 z-10 animate-stamp-in border-plate border-ink bg-ink px-3 py-2 text-center motion-reduce:animate-none">
            <p className="font-display text-step-1 leading-tight text-paper">{flash.big}</p>
            {flash.small && <p className="truncate font-body text-[12px] text-concrete">{flash.small}</p>}
          </div>
        )}

        {current ? (
          <article
            key={current.id}
            aria-label={t('archive.deck.position', { n: String((index % deck.length) + 1), total: String(deck.length) })}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') step(1)
              if (event.key === 'ArrowRight') step(-1)
            }}
            onPointerDown={(event) => {
              swipe.current = { x: event.clientX, y: event.clientY }
            }}
            onPointerUp={(event) => {
              const start = swipe.current
              swipe.current = null
              if (!start) return
              const dx = event.clientX - start.x
              if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(event.clientY - start.y)) step(dx < 0 ? 1 : -1)
            }}
            className={`relative grid min-h-0 flex-1 touch-pan-y select-none grid-rows-[auto_minmax(0,1fr)_auto] border-plate border-ink animate-paste-in motion-reduce:animate-none ${tint}`}
          >
            {/* the head */}
            <header className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 border-b-rule border-ink bg-sheet px-3 pb-2.5 pt-3 [@media(max-height:700px)]:pb-1.5 [@media(max-height:700px)]:pt-2">
              <ArtifactMark card={current} className="h-14 w-14 md:h-16 md:w-16 [@media(max-height:700px)]:h-10 [@media(max-height:700px)]:w-10" />
              <div className="min-w-0">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="font-latin text-[9px] font-bold tracking-[0.22em] text-sign" dir="ltr">
                    {LATIN[current.type]}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-muted" aria-hidden="true">
                    <Num>{`${(index % deck.length) + 1}/${deck.length}`}</Num>
                  </span>
                </p>
                <h2 className="mt-0.5 line-clamp-3 font-display text-step-1 leading-tight text-ink md:text-step-2">
                  <CardHeadline card={current} />
                </h2>
              </div>
            </header>

            {/* the facts, one labelled row each */}
            <div className="min-h-0 overflow-y-auto overscroll-contain bg-sheet/80 px-3">
              <dl className="divide-y divide-ink/20 font-body text-[13.5px] text-ink">
                <FactRow label={t('archive.drawer.fact.type')}>
                  <span className="font-bold text-red">{typeLabel(current)}</span>
                </FactRow>
                <FactRow label={t('archive.drawer.fact.when')}>
                  <span className="font-mono tabular-nums"><Num>{current.when ?? '—'}</Num></span>
                </FactRow>
                {current.subHe && (
                  <FactRow label={t('archive.card.detail')}>
                    <button
                      type="button"
                      onClick={() => setMore((v) => !v)}
                      aria-expanded={more}
                      aria-label={more ? t('archive.card.less') : t('archive.card.more')}
                      className="block min-h-tap w-full py-1.5 text-start leading-snug"
                    >
                      <bdi className={more ? '' : 'line-clamp-2'}>{current.subHe}</bdi>
                    </button>
                  </FactRow>
                )}
                <FactRow label={t('archive.drawer.fact.links')}>
                  <span className="font-mono tabular-nums"><Num>{current.degree}</Num></span>
                </FactRow>
              </dl>
              {current.disputed && <p className="mt-2 border-s-rule border-red ps-2 font-body text-[12px] leading-snug text-ink">{t('archive.card.disputed')}</p>}
            </div>

            {/* the foot: the actions, then the pager */}
            <footer className="border-t-rule border-ink bg-sheet px-3 pb-2 pt-2">
              <div className="grid grid-cols-[auto_1.4fr_1fr_auto] items-stretch gap-1.5">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label={t('archive.deck.prev')}
                  className="flex min-h-tap min-w-tap items-center justify-center border-rule border-ink bg-paper font-poster text-[24px] leading-none text-ink"
                >
                  ›
                </button>
                <button
                  type="button"
                  onClick={() => open(current.id, 'deck')}
                  className="min-h-tap border-rule border-red bg-red px-1.5 font-body text-[14px] font-extrabold leading-tight text-paper"
                >
                  {t('archive.card.open')}
                </button>
                <button
                  type="button"
                  onClick={(event) => toggleSave(current, event)}
                  aria-pressed={mine.includes(current.id)}
                  className={`min-h-tap border-rule px-2 font-body text-[14px] font-extrabold ${
                    mine.includes(current.id) ? 'border-ink bg-ink text-paper' : 'border-ink bg-paper text-ink'
                  }`}
                >
                  {mine.includes(current.id) ? `✓ ${t('archive.card.saved')}` : t('archive.card.save')}
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label={t('archive.deck.next')}
                  className="flex min-h-tap min-w-tap items-center justify-center border-rule border-ink bg-paper font-poster text-[24px] leading-none text-ink"
                >
                  ‹
                </button>
              </div>
              <p className="sr-only">{t('archive.deck.swipe')}</p>
            </footer>
          </article>
        ) : (
          <p className="border-hair border-ink/40 bg-paper px-3 py-3 font-body text-[13.5px] leading-relaxed text-ink">
            {chip === 'today' ? voiceAction(12, 'empty') : season ? t('archive.time.empty') : t('archive.chip.empty')}
          </p>
        )}
      </section>

      {census && (
        <button
          type="button"
          data-archive="census-open"
          onClick={() => setCensusOpen(true)}
          className="museum-stage mt-1.5 flex min-h-tap shrink-0 items-center justify-between gap-3 border-rule border-ink px-3 text-paper"
        >
          <span className="font-poster text-[26px] leading-none" dir="ltr">
            <Num>{census.total}</Num>
          </span>
          <span className="min-w-0 flex-1 truncate text-start font-body text-[13px] font-extrabold">{t('census.title')}</span>
          <span aria-hidden="true">←</span>
        </button>
      )}
      {census && (
        <SlideSheet open={censusOpen} onClose={() => setCensusOpen(false)} title={t('census.kicker')} latin="EVERY NAME" size="auto">
          <PlayerCensus census={census} compact />
          <a href="/hapoel?door=players" className="mt-2 flex min-h-tap items-center justify-between border-rule border-ink bg-sheet px-3 font-body text-[14px] font-extrabold text-ink">
            <span>{t('census.allNames')}</span>
            <span aria-hidden="true" className="text-red">←</span>
          </a>
        </SlideSheet>
      )}

      <p className="mt-1.5 shrink-0 truncate border-t-hair border-ink/30 pt-1.5 font-body text-[10px] leading-relaxed text-muted [@media(max-height:700px)]:hidden md:mt-stack md:!block md:whitespace-normal md:pt-2 md:text-[11px]">
        {figures} <span className="font-mono text-[9px] tabular-nums"><Num>{`#${seed}·${cursor}`}</Num></span>
      </p>
      {song && <div className="shrink-0 truncate pt-0.5 [@media(max-height:700px)]:hidden md:!block md:whitespace-normal">{song}</div>}

      {/* room for the dock */}
      <div aria-hidden="true" className="hidden md:block md:h-[76px]" />

      {/* the dock — above the tab bar, below every dialog */}
      <nav
        aria-label={t('archive.dock.aria')}
        className="-mx-gutter mt-2 shrink-0 border-t-rule border-ink bg-sheet md:fixed md:inset-x-0 md:bottom-[calc(var(--tap)+1.25rem+3px+env(safe-area-inset-bottom))] md:z-40 md:mx-0 md:mt-0"
      >
        <ul className="mx-auto grid max-w-5xl grid-cols-5">
          {dockButtons.map((row) => {
            const active = row.id === 'today' ? layer === null && chip !== null : layer === row.id
            return (
              <li key={row.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (row.id === 'today') {
                      setLayer(null)
                      pickChip(chip ?? firstChip)
                    } else if (row.id === 'box') openBox()
                    else if (row.id === 'mine') openMine()
                    else setLayer(row.id)
                  }}
                  className={`flex min-h-tap w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5 ${
                    row.id === 'box' ? 'bg-red text-paper' : active ? 'bg-ink text-paper' : 'text-ink'
                  }`}
                >
                  <span className="font-body text-[13px] font-extrabold leading-none">{t(row.key)}</span>
                  <span className={`font-latin text-[7px] font-bold leading-none tracking-[0.2em] ${row.id === 'box' || active ? 'text-paper' : 'text-sign'}`} dir="ltr">
                    {row.latin}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {layer === 'box' && (
        <ArchiveBox
          items={box.items}
          decades={decades.map((row) => row.decade)}
          decade={box.decade}
          busy={busy}
          onDecade={(d) => openBox(d, 0)}
          onShuffle={() => {
            say(t('archive.flash.shuffled'))
            openBox(box.decade, box.round + 1)
          }}
          onOpen={(id) => open(id, 'box')}
          onSearch={() => setLayer('search')}
          onClose={() => setLayer(null)}
        />
      )}
      {layer === 'time' && <TimeMachine decades={decades} current={season} onPick={pickSeason} onClose={() => setLayer(null)} />}
      {layer === 'search' && <SearchSheet run={runSearch} onOpen={(id) => open(id, 'search')} onClose={() => setLayer(null)} />}
      {layer === 'mine' && <MineSheet cards={mineCards} loading={busy && mineCards.length === 0 && mine.length > 0} onOpen={(id) => open(id, 'mine')} onClose={() => setLayer(null)} />}

      {detail && (
        <ArchiveDrawer
          detail={detail}
          saved={mine.includes(detail.card.id)}
          reaction={reactionOf(detail.card)}
          busy={busy}
          rabbitEmpty={rabbitEmpty}
          onClose={() => setDetail(null)}
          onOpen={(id, via) => open(id, via)}
          onSave={() => toggleSave(detail.card)}
          onReact={(code) => react(detail.card, code)}
          onRabbit={dig}
          report={report}
          lived={lived}
          onSearch={() => {
            setDetail(null)
            setLayer('search')
          }}
        />
      )}
    </div>
  )
}

/** one labelled row of the card: the label in a fixed column, the value beside it */
function FactRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-h-[40px] grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2 [@media(max-height:700px)]:min-h-[34px] md:grid-cols-[6rem_minmax(0,1fr)]">
      <dt className="font-body text-[11px] font-extrabold text-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}
