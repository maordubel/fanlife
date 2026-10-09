'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BackToAll, HubListings } from '@/components/fanlife/market/HubListings'
import { HubFilters } from '@/components/fanlife/market/HubFilters'
import { CirclesPanel } from '@/components/fanlife/market/CirclesPanel'
import { PipePanel } from '@/components/fanlife/market/PipePanel'
import { ForYouPanel } from '@/components/fanlife/market/ForYouPanel'
import { PressPhoto } from '@/components/master/Poster'
import { MarketCurtain } from './MarketCurtain'
import { MarketSignIn } from '@/components/fanlife/market/MarketSignIn'
import type { MatchesState } from '@/components/fanlife/market/MatchesPanel'
import { RequestSheet } from '@/components/fanlife/market/RequestSheet'
import { WantedBoard } from '@/components/fanlife/market/WantedBoard'
import { Kicker, Notice, buttonPlain, buttonPrimary } from '@/components/fanlife/market/HubParts'
import { matches as matchesCall } from '@/lib/collector/api'
import type { CollectorShirt } from '@/lib/collector/types'
import { errorLabel } from '@/lib/fanlife/collector/labels'
import {
  marketSearch, placeMine, searchDelete, searchList, searchNotifySet, searchSave, wantedList, wantPublicSet, wantsMine,
} from '@/lib/fanlife/hub/api'
import {
  EMPTY_FILTERS, activeCount, autoName, filtersFromQuery, filtersFromSearch, filtersToSearch, slugsFor, toQuery, viewFromSearch,
  type HubFilters as Filters, type HubView,
} from '@/lib/fanlife/hub/query'
import type { Cursor, HubFacets, HubItem, MyWant, Place, SavedSearch, WantedRow } from '@/lib/fanlife/hub/types'
import { h } from '@/lib/fanlife/hub/copy'
import { t } from '@/lib/fanlife/i18n'
import { portalConfigured } from '@/lib/portal/env'

type Shirt = CollectorShirt & { club?: string; clubName?: string }
type Feed<Row> = { state: 'loading' } | { state: 'off' } | { state: 'error'; message: string } | { state: 'ready'; rows: Row[]; next: Cursor | null; more?: boolean }

/**
 * THE SHIRT HUB (Wave 1). One screen, three tabs — Market, Wanted, For you — over the same collector database
 * The Worker uses. Filtering and paging happen in the database (`worker_market_search`, keyset cursor), so a
 * page is always a page of matches. The address bar carries the whole state: any search is a link.
 */
export function HubScreen({ shirts }: { shirts: Readonly<Record<string, Shirt>> }) {
  const [ready, setReady] = useState(false)
  const [q, setQ] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [view, setView] = useState<HubView>('market')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [market, setMarket] = useState<Feed<HubItem>>({ state: 'loading' })
  const [facets, setFacets] = useState<HubFacets | null>(null)
  const [wanted, setWanted] = useState<Feed<WantedRow>>({ state: 'loading' })
  const [match, setMatch] = useState<MatchesState>({ state: 'loading' })
  const [wants, setWants] = useState<MyWant[]>([])
  const [searches, setSearches] = useState<SavedSearch[]>([])
  const [sheet, setSheet] = useState<{ slug: string | null } | null>(null)
  const [saving, setSaving] = useState<{ name: string } | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [place, setPlace] = useState<Place | null>(null)
  const [pipeVersion, setPipeVersion] = useState(0)
  const run = useRef(0)
  const signedIn = match.state === 'ready' ? true : match.state === 'guest' ? false : null

  // the address is read once, on the client — a dynamic page still has no window on the server
  useEffect(() => {
    const search = window.location.search
    setView(viewFromSearch(search))
    setFilters(filtersFromSearch(search, shirts))
    setReady(true)
  }, [shirts])

  useEffect(() => {
    if (!ready) return
    try {
      window.history.replaceState(null, '', `${window.location.pathname}${filtersToSearch(filters, view)}`)
    } catch {
      // the address bar is a convenience
    }
  }, [ready, filters, view])

  const query = useMemo(() => toQuery(filters, shirts), [filters, shirts])
  const queryKey = JSON.stringify(query)

  // ---- the market, searched on the server
  useEffect(() => {
    if (!ready || view !== 'market') return
    if (!portalConfigured()) {
      setMarket({ state: 'off' })
      return
    }
    const mine = ++run.current
    setMarket((m) => (m.state === 'ready' ? m : { state: 'loading' }))
    const timer = window.setTimeout(() => {
      void marketSearch(query).then((out) => {
        if (mine !== run.current) return
        if (out.ok) {
          setMarket({ state: 'ready', rows: out.items, next: out.next })
          setFacets(out.facets)
        } else setMarket({ state: 'error', message: errorLabel(out.error) })
      })
    }, 120)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queryKey is the query
  }, [ready, view, queryKey])

  const moreMarket = useCallback(() => {
    if (market.state !== 'ready' || !market.next || market.more) return
    setMarket({ ...market, more: true })
    void marketSearch(query, market.next).then((out) => {
      setMarket((now) =>
        now.state !== 'ready' || !out.ok
          ? now
          : { state: 'ready', rows: [...now.rows, ...out.items.filter((i) => !now.rows.some((h) => h.id === i.id))], next: out.next },
      )
    })
  }, [market, query])

  // ---- the wanted board
  const wantedSlugs = useMemo(() => slugsFor(filters, shirts), [filters, shirts])
  const wantedKey = JSON.stringify(wantedSlugs)
  const loadWanted = useCallback(() => {
    if (!portalConfigured()) return setWanted({ state: 'off' })
    void wantedList(wantedSlugs).then((out) => setWanted(out.ok ? { state: 'ready', rows: out.wanted, next: out.next } : { state: 'error', message: errorLabel(out.error) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- wantedKey is wantedSlugs
  }, [wantedKey])
  useEffect(() => {
    if (ready && view === 'wanted') loadWanted()
  }, [ready, view, loadWanted])
  const moreWanted = () => {
    if (wanted.state !== 'ready' || !wanted.next || wanted.more) return
    setWanted({ ...wanted, more: true })
    void wantedList(wantedSlugs, wanted.next).then((out) =>
      setWanted((now) => (now.state !== 'ready' || !out.ok ? now : { state: 'ready', rows: [...now.rows, ...out.wanted.filter((w) => !now.rows.some((h) => h.id === w.id))], next: out.next })),
    )
  }

  // ---- the collector's own side
  const loadMine = useCallback(() => {
    void wantsMine().then((out) => { if (out.ok) { setWants(out.wants); setPipeVersion((v) => v + 1) } })
    void placeMine().then((out) => out.ok && setPlace(out))
    void searchList().then((out) => out.ok && setSearches(out.searches))
  }, [])
  useEffect(() => {
    if (!portalConfigured()) return setMatch({ state: 'off' })
    let live = true
    void matchesCall().then((out) => {
      if (!live) return
      if (out.ok) {
        setMatch({ state: 'ready', data: out })
        loadMine()
      } else if (out.error === 'auth_required') setMatch({ state: 'guest' })
      else if (out.error === 'off') setMatch({ state: 'off' })
      else setMatch({ state: 'error', message: errorLabel(out.error) })
    })
    return () => {
      live = false
    }
  }, [loadMine])

  const nextHref = `/market${filtersToSearch(filters, view)}`
  const signIn = <MarketSignIn next={nextHref} />
  const flash = (message: string) => {
    setNote(message)
    window.setTimeout(() => setNote((n) => (n === message ? null : n)), 5000)
  }
  const go = (next: HubView, patch?: Partial<Filters>) => {
    setView(next)
    if (patch) setFilters((f) => ({ ...f, ...patch }))
    window.scrollTo({ top: 0 })
  }
  const focus = filters.slug ? shirts[filters.slug] ?? null : null
  const narrowed = activeCount(filters) > 0

  const saveSearch = async () => {
    if (!saving) return
    const out = await searchSave(saving.name, query)
    if (out.ok) {
      setSaving(null)
      loadMine()
      flash(h('hub.searches.saved'))
    } else flash(errorLabel(out.error))
  }

  return (
    <div className="mt-stack" data-hub="root">
      <MarketCurtain label={h('hub.hero.kicker')} />
      <header className="fl-mk-hero">
        <div className="fl-mk-hero-text">
          <p className="fl-mk-kicker"><span>{h('hub.hero.kicker')}</span></p>
          <h1 className="fl-mk-title">{h('hub.hero.title')}</h1>
          <p className="fl-mk-sub">{h('hub.hero.sub')}</p>
        </div>
        <PressPhoto art="shirt-swap" className="fl-mk-hero-art" />
      </header>

      <div className="fl-mk-searchrow" role="search">
        <label className="fl-mk-search">
          <span aria-hidden="true" className="fl-mk-search-ico">⌕</span>
          <span className="sr-only">{h('hub.search.label')}</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={h('hub.search.placeholder')} enterKeyHint="search" />
        </label>
        <button type="button" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen} className="fl-mk-filterbtn">
          <span aria-hidden="true">⚲</span> {h('hub.filters.title')}{activeCount(filters) ? ` · ${activeCount(filters)}` : ''}
        </button>
      </div>

      <div role="tablist" aria-label={h('hub.tabs.title')} className="fl-mk-tabs">
        {([['market', 'hub.tabs.market'], ['wanted', 'hub.tabs.wanted'], ['foryou', 'hub.tabs.foryou'], ['circles', 'hub.tabs.circles']] as const).map(([id, key]) => (
          <button key={id} role="tab" type="button" aria-selected={view === id} onClick={() => go(id)}>
            {h(key)}
          </button>
        ))}
      </div>

      {note ? <p className="mt-2 border-hair border-ink bg-sheet px-3 py-2 font-body text-[13px] font-extrabold text-ink" role="status">{note}</p> : null}

      {view === 'market' ? (
        <section role="tabpanel" aria-label={h('hub.tabs.market')}>
          {focus ? <BackToAll shirt={focus} onClear={() => setFilters((f) => ({ ...f, slug: null }))} /> : null}
          <div className="fl-mk-chips" role="group" aria-label={h('hub.rail.deal')}>
            {([[null, 'hub.kind.all'], ['sale', 'hub.kind.sale'], ['trade', 'hub.kind.swap']] as const).map(([kind, key]) => (
              <button key={key} type="button" aria-pressed={filters.kind === kind} onClick={() => setFilters((f) => ({ ...f, slug: null, kind }))}>
                {h(key)}
              </button>
            ))}
          </div>
          <HubFilters filters={filters} onChange={setFilters} shirts={shirts} facets={facets} myCountry={place?.country ?? null} panelOpen={filtersOpen} />

          {narrowed && market.state === 'ready' ? (
            saving ? (
              <form className="mt-2 flex flex-wrap items-center gap-2 border-rule border-dashed border-ink bg-paper p-2" onSubmit={(e) => { e.preventDefault(); void saveSearch() }}>
                <label htmlFor="hub-save-name" className="sr-only">{h('hub.searches.nameLabel')}</label>
                <input id="hub-save-name" value={saving.name} maxLength={40} onChange={(e) => setSaving({ name: e.target.value })} className="min-h-tap min-w-0 flex-1 border-hair border-ink/40 bg-sheet px-2 font-body text-[14px] text-ink" />
                <button type="submit" className={buttonPrimary}>{h('hub.searches.save')}</button>
                <button type="button" onClick={() => setSaving(null)} className={buttonPlain}>{h('hub.cancel')}</button>
              </form>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {signedIn === false ? (
                  <>
                    <span className="font-body text-[12.5px] text-muted">{h('hub.searches.guestHint')}</span>
                    {signIn}
                  </>
                ) : (
                  <button type="button" onClick={() => setSaving({ name: autoName(filters, shirts) })} className={buttonPlain}>
                    🔔 {h('hub.searches.cta')}
                  </button>
                )}
              </div>
            )
          ) : null}

          {market.state === 'off' ? (
            <Notice title={t('market.off.title')} body={t('market.off.body')}>
              <Link href="/shirts" className={buttonPrimary}>{t('market.toArchive')}</Link>
            </Notice>
          ) : market.state === 'error' ? (
            <Notice title={t('market.error.title')} body={market.message} tone="red" />
          ) : market.state === 'loading' ? (
            <p className="mt-stack border-rule border-dashed border-ink/50 p-4 font-body text-step--1 text-muted" role="status">{t('market.loading')}</p>
          ) : market.rows.length === 0 ? (
            narrowed ? (
              <Notice title={h('hub.empty.title')} body={h('hub.empty.body')}>
                <button type="button" onClick={() => setSheet({ slug: filters.slug })} className={buttonPrimary}>{h('hub.actions.look')}</button>
              </Notice>
            ) : (
              <Notice title={t('market.empty.title')} body={t('market.empty.body')}>
                <Link href="/closet" className={buttonPrimary}>{t('market.toCloset')}</Link>
                <Link href="/shirts" className="min-h-tap inline-flex items-center px-2 font-body text-step--1 font-extrabold text-sign underline underline-offset-4">{t('market.toArchive')}</Link>
              </Notice>
            )
          ) : (
            <>
              <p className="fl-mk-count" data-hub="count">
                {facets ? h('hub.count', { n: String(facets.total) }) : null}
              </p>
              <HubListings items={market.rows} shirts={shirts} wants={wants} focused={Boolean(focus)} query={q} onFocus={(slug) => setFilters((f) => ({ ...f, slug }))} />
              {market.next ? (
                <button type="button" onClick={moreMarket} disabled={market.more} className="mt-stack flex min-h-tap w-full items-center justify-center border-rule border-dashed border-ink bg-paper font-body text-step--1 font-extrabold text-ink disabled:opacity-60">
                  {t('market.table.more')}
                </button>
              ) : null}
            </>
          )}
          <button type="button" className="fl-mk-wanted" onClick={() => go('wanted')}>
            <span className="fl-mk-wanted-pic" aria-hidden="true">⚑</span>
            <span><b>{h('hub.wantedStrip.title')}</b><small>{h('hub.wantedStrip.sub')}</small></span>
            <span aria-hidden="true" className="fl-mk-wanted-go">›</span>
          </button>
        </section>
      ) : null}

      {view === 'wanted' ? (
        <section role="tabpanel" aria-label={h('hub.tabs.wanted')}>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <Kicker>{h('hub.wanted.kicker')}</Kicker>
              <h2 className="font-sign text-step-1 leading-tight text-ink">{h('hub.wanted.title')}</h2>
            </div>
            <button type="button" onClick={() => setSheet({ slug: filters.slug })} className={buttonPrimary}>{h('hub.actions.look')}</button>
          </div>
          <p className="mt-1 max-w-prose font-body text-[12.5px] leading-snug text-muted">{h('hub.wanted.lede')}</p>
          <HubFilters filters={filters} onChange={setFilters} shirts={shirts} facets={null} showCopyRails={false} />
          {wanted.state === 'off' ? (
            <Notice title={t('market.off.title')} body={t('market.off.body')} />
          ) : wanted.state === 'error' ? (
            <Notice title={t('market.error.title')} body={wanted.message} tone="red" />
          ) : wanted.state === 'loading' ? (
            <p className="mt-stack font-body text-step--1 text-muted" role="status">{t('market.loading')}</p>
          ) : wanted.rows.length === 0 ? (
            <Notice title={h('hub.wanted.emptyTitle')} body={h('hub.wanted.emptyBody')}>
              <button type="button" onClick={() => setSheet({ slug: filters.slug })} className={buttonPrimary}>{h('hub.actions.look')}</button>
            </Notice>
          ) : (
            <>
              <WantedBoard
                rows={wanted.rows}
                shirts={shirts}
                signedIn={signedIn === true}
                onRemoveOwn={(id) => void wantPublicSet(id, false).then(() => { loadWanted(); loadMine(); flash(h('hub.wanted.withdrawn')) })}
              />
              {wanted.next ? (
                <button type="button" onClick={moreWanted} disabled={wanted.more} className="mt-stack flex min-h-tap w-full items-center justify-center border-rule border-dashed border-ink bg-paper font-body text-step--1 font-extrabold text-ink disabled:opacity-60">
                  {t('market.table.more')}
                </button>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {view === 'foryou' ? (
        <section role="tabpanel" aria-label={h('hub.tabs.foryou')}>
          <PipePanel signedIn={signedIn} signIn={signIn} shirts={shirts} wants={wants} onFocus={(slug) => { setFilters((f) => ({ ...f, slug })); go('market') }} version={pipeVersion} />
          <ForYouPanel
            matches={match}
            searches={searches}
            wants={wants}
            shirts={shirts}
            signIn={signIn}
            onRunSearch={(s) => { setFilters({ ...filtersFromQuery(s.query) }); go('market') }}
            onDeleteSearch={(id) => void searchDelete(id).then(loadMine)}
            onToggleAlert={(id, on) => void searchNotifySet(id, on).then(loadMine)}
            onTogglePublic={(id, on) => void wantPublicSet(id, on).then((o) => { if (o.ok) loadMine(); else flash(errorLabel(o.error)) })}
            onEditWant={(slug) => setSheet({ slug })}
            onNewRequest={() => setSheet({ slug: null })}
          />
        </section>
      ) : null}

      {view === 'circles' ? (
        <section role="tabpanel" aria-label={h('hub.tabs.circles')} className="mt-3">
          <CirclesPanel shirts={shirts} signedIn={signedIn} signIn={signIn} place={place} onPlace={setPlace} />
        </section>
      ) : null}

      <div className="fl-mk-sticky">
        <Link href="/closet" className="fl-mk-list">{h('hub.list.cta')}</Link>
      </div>

      {sheet && signedIn === false ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 sm:items-center" role="dialog" aria-modal="true" aria-label={h('hub.request.title')}>
          <div className="w-full max-w-lg border-plate border-ink bg-paper p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <h2 className="font-display text-step-1 leading-tight text-ink">{h('hub.request.title')}</h2>
            <p className="mt-2 font-body text-step--1 text-ink">{t('collector.signIn.body')}</p>
            <div className="mt-3 flex flex-wrap gap-2">{signIn}<button type="button" onClick={() => setSheet(null)} className={buttonPlain}>{h('hub.cancel')}</button></div>
          </div>
        </div>
      ) : sheet ? (
        <RequestSheet
          shirts={shirts}
          start={sheet.slug}
          existing={wants}
          onClose={() => setSheet(null)}
          onSaved={(isPublic) => {
            setSheet(null)
            loadMine()
            flash(isPublic ? h('hub.request.savedPublic') : h('hub.request.savedPrivate'))
            if (isPublic) { setView('wanted'); loadWanted() }
          }}
        />
      ) : null}
    </div>
  )
}
