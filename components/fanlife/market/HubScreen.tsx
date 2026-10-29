'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BackToAll, HubListings } from '@/components/fanlife/market/HubListings'
import { HubFilters } from '@/components/fanlife/market/HubFilters'
import { CirclesPanel } from '@/components/fanlife/market/CirclesPanel'
import { PipePanel } from '@/components/fanlife/market/PipePanel'
import { ForYouPanel } from '@/components/fanlife/market/ForYouPanel'
import { MarketCurtain } from './MarketCurtain'
import { MarketSignIn } from '@/components/fanlife/market/MarketSignIn'
import type { MatchesState } from '@/components/fanlife/market/MatchesPanel'
import { WorldHaveSheet } from '@/components/fanlife/market/WorldHaveSheet'
import { RequestSheet } from '@/components/fanlife/market/RequestSheet'
import { WantedBoard } from '@/components/fanlife/market/WantedBoard'
import { Notice, buttonPlain, buttonPrimary } from '@/components/fanlife/market/HubParts'
import { matches as matchesCall } from '@/lib/collector/api'
import type { CollectorShirt } from '@/lib/collector/types'
import { errorLabel } from '@/lib/fanlife/collector/labels'
import {
  marketSearch, placeMine, searchDelete, searchList, searchNotifySet, searchSave, wantedList, wantPublicSet, wantsMine,
} from '@/lib/fanlife/hub/api'
import {
  EMPTY_FILTERS, activeCount, autoName, filtersFromQuery, filtersFromSearch, filtersToSearch, slugsFor, textFromSearch, toQuery, viewFromSearch,
  type HubFilters as Filters, type HubView,
} from '@/lib/fanlife/hub/query'
import type { Cursor, HubFacets, HubItem, MyWant, Place, SavedSearch, WantedRow } from '@/lib/fanlife/hub/types'
import { h } from '@/lib/fanlife/hub/copy'
import { fl } from '@/lib/fanlife/copy'
import { t } from '@/lib/fanlife/i18n'
import { portalConfigured } from '@/lib/portal/env'
import { adoptShirts } from '@/lib/fanlife/world'

type Shirt = CollectorShirt & { club?: string; clubName?: string }
type Feed<Row> = { state: 'loading' } | { state: 'off' } | { state: 'error'; message: string } | { state: 'ready'; rows: Row[]; next: Cursor | null; more?: boolean; moreFailed?: boolean }

/**
 * THE SHIRT HUB (Wave 1). One screen, three tabs — Market, Wanted, For you — over the same collector database
 * The Worker uses. Filtering and paging happen in the database (`worker_market_search`, keyset cursor), so a
 * page is always a page of matches. The address bar carries the whole state: any search is a link.
 */
export function HubScreen({ shirts }: { shirts: Readonly<Record<string, Shirt>> }) {
  adoptShirts(shirts)
  const [wizard, setWizard] = useState(false)
  const [ready, setReady] = useState(false)
  const [q, setQ] = useState('')
  const [qSent, setQSent] = useState('')
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
    const words = textFromSearch(search)
    if (words) {
      setQ(words)
      setQSent(words)
    }
    setReady(true)
  }, [shirts])

  useEffect(() => {
    if (!ready) return
    try {
      window.history.replaceState(null, '', `${window.location.pathname}${filtersToSearch(filters, view, view === 'market' ? qSent : '')}`)
    } catch {
      // the address bar is a convenience
    }
  }, [ready, filters, view, qSent])

  useEffect(() => {
    const id = window.setTimeout(() => setQSent(q.trim().length >= 2 ? q.trim() : ''), 300)
    return () => window.clearTimeout(id)
  }, [q])
  const query = useMemo(() => ({ ...toQuery(filters, shirts), ...(qSent ? { text: qSent } : {}) }), [filters, shirts, qSent])
  const queryKey = JSON.stringify(query)
  const queryRef = useRef(queryKey)
  queryRef.current = queryKey

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
    setMarket({ ...market, more: true, moreFailed: false })
    const asked = queryKey
    void marketSearch(query, market.next).then((out) => {
      setMarket((now) => {
        if (now.state !== 'ready' || asked !== queryRef.current) return now
        if (!out.ok) return { ...now, more: false, moreFailed: true }
        return { state: 'ready', rows: [...now.rows, ...out.items.filter((i) => !now.rows.some((h) => h.id === i.id))], next: out.next }
      })
    })
  }, [market, query, queryKey])

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

  const nextHref = `/market${filtersToSearch(filters, view, view === 'market' ? qSent : '')}`
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

  const withFilters = view === 'market' || view === 'wanted'

  return (
    <>
      <MarketCurtain label={h('hub.hero.kicker')} />
      <div className="wkc-l wkc-mk-l" data-hub="root">
        <div role="tablist" aria-label={h('hub.tabs.title')} className="wk-seg wkc-mk-tabs">
          {([['market', 'hub.tabs.market'], ['wanted', 'hub.tabs.wanted'], ['foryou', 'hub.tabs.foryou'], ['circles', 'hub.tabs.circles']] as const).map(([id, key]) => (
            <button key={id} role="tab" type="button" className="min-h-tap" aria-selected={view === id} onClick={() => go(id)}>
              {h(key)}
            </button>
          ))}
        </div>

        <div className="wkc-searchrow" role="search">
          <label className="wkc-search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 4.5a6 6 0 1 0 0 12a6 6 0 1 0 0-12M15 15l5 5" /></svg>
            <span className="sr-only">{h('hub.search.label')}</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={h('hub.search.placeholder')} enterKeyHint="search" />
          </label>
          {withFilters ? (
            <button type="button" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen} aria-haspopup="dialog" className="wk-btn min-h-tap wkc-fopen">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6 8v6l-4-2v-4z" /></svg>
              {h('hub.filters.title')}{activeCount(filters) ? <span className="wkc-fcount">{activeCount(filters)}</span> : null}
            </button>
          ) : null}
        </div>

        {note ? <p className="wk-cap white" role="status">{note}</p> : null}

        {view === 'market' ? (
          <>
            <div className="wk-seg wkc-scope" role="group" aria-label={h('hub.scope.title')}>
              {([['all', 'hub.scope.all', facets ? facets.total : null], ['game', 'hub.scope.game', facets?.scope?.game ?? null], ['world', 'hub.scope.world', facets?.scope?.world ?? null]] as const).map(([id, key, n]) => (
                <button key={id} type="button" className="min-h-tap" data-world={id === 'world' ? '' : undefined} aria-pressed={filters.scope === id} onClick={() => setFilters((f) => ({ ...f, scope: id, slug: null, club: null, decade: null, variant: null }))}>
                  {h(key)}
                  {n !== null ? <small>{n}</small> : null}
                </button>
              ))}
            </div>
            {focus ? <BackToAll shirt={focus} onClear={() => setFilters((f) => ({ ...f, slug: null }))} /> : null}
            <HubFilters filters={filters} onChange={setFilters} shirts={shirts} facets={facets} myCountry={place?.country ?? null} panelOpen={filtersOpen} onPanel={setFiltersOpen} />
            {narrowed && market.state === 'ready' ? (
              saving ? (
                <form className="wkc-savesearch" onSubmit={(e) => { e.preventDefault(); void saveSearch() }}>
                  <label htmlFor="hub-save-name" className="sr-only">{h('hub.searches.nameLabel')}</label>
                  <input id="hub-save-name" value={saving.name} maxLength={40} onChange={(e) => setSaving({ name: e.target.value })} />
                  <button type="submit" className="wk-btn min-h-tap">{h('hub.searches.save')}</button>
                  <button type="button" onClick={() => setSaving(null)} className="wk-btn paper min-h-tap">{h('hub.cancel')}</button>
                  {qSent ? <p className="wk-small wk-muted">{h('hub.searches.wordsNote')}</p> : null}
                </form>
              ) : (
                <div className="wkc-savesearch">
                  {signedIn === false ? (
                    <>
                      <span className="wk-small wk-muted">{h('hub.searches.guestHint')}</span>
                      {signIn}
                    </>
                  ) : (
                    <button type="button" onClick={() => setSaving({ name: autoName(filters, shirts) })} className="wk-btn paper min-h-tap">
                      🔔 {h('hub.searches.cta')}
                    </button>
                  )}
                </div>
              )
            ) : null}
          </>
        ) : null}

        {view === 'wanted' ? (
          <HubFilters filters={filters} onChange={setFilters} shirts={shirts} facets={null} showCopyRails={false} panelOpen={filtersOpen} onPanel={setFiltersOpen} />
        ) : null}
      </div>

      <div className="wkc-r wkc-mk-r">
      {view === 'market' ? (
        <section role="tabpanel" aria-label={h('hub.tabs.market')} className="wkc-sec">
          <div className="wkc-h2">
            <h2 className="wkc-h2-t orange">{fl('market.swaps')}</h2>
            {facets ? <span className="wk-k" data-hub="count">{h('hub.count', { n: String(facets.total) })}</span> : null}
          </div>
          <p className="wk-small wkc-note-p">{t('market.lede')}</p>
          <div className="wk-seg wkc-kind" role="group" aria-label={h('hub.rail.deal')}>
            {([[null, 'hub.kind.all'], ['sale', 'hub.kind.sale'], ['trade', 'hub.kind.swap']] as const).map(([kind, key]) => (
              <button key={key} type="button" className="min-h-tap" aria-pressed={filters.kind === kind} onClick={() => setFilters((f) => ({ ...f, slug: null, kind }))}>
                {h(key)}
              </button>
            ))}
          </div>

          {market.state === 'off' ? (
            <Notice title={t('market.off.title')} body={t('market.off.body')}>
              <Link href="/shirts" className={buttonPrimary}>{t('market.toArchive')}</Link>
            </Notice>
          ) : market.state === 'error' ? (
            <Notice title={t('market.error.title')} body={market.message} tone="red" />
          ) : market.state === 'loading' ? (
            <p className="wkc-loading" role="status">{t('market.loading')}</p>
          ) : market.rows.length === 0 ? (
            filters.scope === 'world' && !qSent && activeCount(filters) === 1 ? (
              <Notice title={h('hub.world.empty.title')} body={h('hub.world.empty.body')}>
                <button type="button" onClick={() => setWizard(true)} className={buttonPrimary}>{h('hub.world.list')}</button>
              </Notice>
            ) : narrowed || qSent ? (
              <Notice title={h('hub.empty.title')} body={qSent && !narrowed ? h('hub.search.empty', { q: qSent }) : h('hub.empty.body')}>
                <button type="button" onClick={() => setSheet({ slug: filters.slug })} className={buttonPrimary}>{h('hub.actions.look')}</button>
              </Notice>
            ) : (
              <Notice title={t('market.empty.title')} body={t('market.empty.body')}>
                <Link href="/closet" className={buttonPrimary}>{t('market.toCloset')}</Link>
                <Link href="/shirts" className="wk-link">{t('market.toArchive')}</Link>
              </Notice>
            )
          ) : (
            <>
              <HubListings items={market.rows} shirts={shirts} wants={wants} focused={Boolean(focus)} onFocus={(slug) => setFilters((f) => ({ ...f, slug }))} />
              {market.next ? (
                <>
                  {market.moreFailed ? <p className="wk-small" role="alert">{h('hub.more.failed')}</p> : null}
                  <button type="button" onClick={moreMarket} disabled={market.more} className="wk-seeall min-h-tap">
                    {t('market.table.more')} <span aria-hidden="true">{market.moreFailed ? '↻' : '↓'}</span>
                  </button>
                </>
              ) : null}
            </>
          )}
          <button type="button" className="wkc-wantedstrip min-h-tap" onClick={() => go('wanted')}>
            <span className="wk-burst orange wkc-wantedstrip-b" aria-hidden="true">{h('hub.wantedStrip.title')}</span>
            <span><b className="wk-head">{h('hub.wantedStrip.title')}</b><small className="wk-k">{h('hub.wantedStrip.sub')}</small></span>
            <span aria-hidden="true" className="wkc-wantedstrip-go">→</span>
          </button>
          {filters.scope !== 'game' ? (
            <button type="button" className="wk-coupon wkc-anyclub min-h-tap" onClick={() => setWizard(true)}>
              <span className="wk-scissors" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="6" cy="7" r="3" /><circle cx="6" cy="17" r="3" /><path d="M8.5 8.5L20 18M8.5 15.5L20 6" /></svg></span>
              <svg className="wkc-anyclub-globe" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>
              <b className="wk-head">{h('hub.world.list')}</b>
              <span aria-hidden="true">→</span>
            </button>
          ) : null}
          <Link href="/market/help" className="wkc-helpbox">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 4.5a6 6 0 1 0 0 12a6 6 0 1 0 0-12M15 15l5 5" /></svg>
            <span><b className="wk-head">{h('hub.help.title')}</b><small>{h('hub.help.lede')}</small><span className="wk-k cyan">{h('hub.help.ask')} →</span></span>
          </Link>
          <p className="wk-small wk-muted">{t('market.safety')}</p>
        </section>
      ) : null}

      {view === 'wanted' ? (
        <section role="tabpanel" aria-label={h('hub.tabs.wanted')} className="wkc-sec">
          <div className="wkc-h2">
            <div>
              <p className="wk-banner">{h('hub.wanted.kicker')}</p>
              <h2 className="wkc-h2-t orange">{h('hub.wanted.title')}</h2>
            </div>
            <button type="button" onClick={() => setSheet({ slug: filters.slug })} className="wk-btn red min-h-tap">{h('hub.actions.look')}</button>
          </div>
          <p className="wk-small wkc-note-p">{h('hub.wanted.lede')}</p>
          {wanted.state === 'off' ? (
            <Notice title={t('market.off.title')} body={t('market.off.body')} />
          ) : wanted.state === 'error' ? (
            <Notice title={t('market.error.title')} body={wanted.message} tone="red" />
          ) : wanted.state === 'loading' ? (
            <p className="wkc-loading" role="status">{t('market.loading')}</p>
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
                <button type="button" onClick={moreWanted} disabled={wanted.more} className="wk-seeall min-h-tap">
                  {t('market.table.more')} <span aria-hidden="true">↓</span>
                </button>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {view === 'foryou' ? (
        <section role="tabpanel" aria-label={h('hub.tabs.foryou')} className="wkc-sec">
          <PipePanel signedIn={signedIn} signIn={signIn} shirts={shirts} wants={wants} onFocus={(slug) => { setFilters((f) => ({ ...f, slug })); go('market') }} version={pipeVersion} />
          <ForYouPanel
            matches={match}
            searches={searches}
            wants={wants}
            shirts={shirts}
            signIn={signIn}
            onRunSearch={(s) => { setFilters({ ...filtersFromQuery(s.query) }); setQ(s.query.text ?? ''); go('market') }}
            onDeleteSearch={(id) => void searchDelete(id).then(loadMine)}
            onToggleAlert={(id, on) => void searchNotifySet(id, on).then(loadMine)}
            onTogglePublic={(id, on) => void wantPublicSet(id, on).then((o) => { if (o.ok) loadMine(); else flash(errorLabel(o.error)) })}
            onEditWant={(slug) => setSheet({ slug })}
            onNewRequest={() => setSheet({ slug: null })}
          />
        </section>
      ) : null}

      {view === 'circles' ? (
        <section role="tabpanel" aria-label={h('hub.tabs.circles')} className="wkc-sec">
          <CirclesPanel shirts={shirts} signedIn={signedIn} signIn={signIn} place={place} onPlace={setPlace} />
        </section>
      ) : null}

      <div className="wkc-listcta">
        <Link href="/closet" className="wk-btn red lg block">{h('hub.list.cta')}</Link>
      </div>
      </div>

      {wizard ? (
        <WorldHaveSheet
          signedIn={signedIn}
          signIn={signIn}
          onClose={() => setWizard(false)}
          onDone={() => { window.location.assign('/closet') }}
        />
      ) : null}

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
    </>
  )
}
