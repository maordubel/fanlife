'use client'
// FAN LIFE — hand-written (direct listing, 30.10.2026). Three steps: the shirt, the offer, a buyer-style preview.
// No closet requirement: the closet is a shortcut (choose a copy you already keep) and "also add to my closet" is off by default.

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

import { MarketSignIn } from '@/components/fanlife/market/MarketSignIn'
import { closetMine, photoStore, photoUrl } from '@/lib/collector/api'
import type { CollectorShirt, Condition, OwnerItem, Size } from '@/lib/collector/types'
import { CONDITIONS, SIZES } from '@/lib/collector/types'
import { conditionLabel, errorLabel, formatPrice, sizeLabel } from '@/lib/fanlife/collector/labels'
import { clubSearch, marketPublish, type LibraryClub } from '@/lib/fanlife/hub/api'
import { h, type HubKey } from '@/lib/fanlife/hub/copy'
import { EMPTY_DRAFT, ERROR_KEY, MAX_PHOTOS, issues, newKey, type ListingDraft, type Mode, type StepIssue } from '@/lib/fanlife/hub/listing'
import { countryFlag } from '@/lib/fanlife/hub/places'
import { worldShirt } from '@/lib/fanlife/world'

const VARIANTS = [['home', 'Home'], ['away', 'Away'], ['third', 'Third'], ['goalkeeper', 'Keeper'], ['training', 'Training'], ['special', 'Special']] as const
const MODES: readonly [Mode, HubKey][] = [['sell', 'listing.mode.sell'], ['swap', 'listing.mode.swap'], ['both', 'listing.mode.both']]
const TYPES = [['unknown', 'Not sure'], ['original_period', 'Original, from the period'], ['official_reissue', 'Official reissue'], ['replica', 'Replica'], ['fan_reproduction', 'Fan reproduction']] as const
const CLAIMS = [[null, 'No claim'], ['original', 'Original'], ['match_worn', 'Match-worn'], ['unsure', 'Not sure'], ['replica', 'Replica']] as const
const FIX: Record<StepIssue, HubKey> = { club: 'listing.fix.club', photo: 'listing.fix.photo', mode: 'listing.fix.mode', price: 'listing.fix.price', replica: 'listing.fix.replica' }
const COND_KEY: Record<Condition, HubKey> = { mint: 'listing.cond.new', excellent: 'listing.cond.excellent', good: 'listing.cond.good', worn: 'listing.cond.worn', damaged: 'listing.cond.damaged' }

type Shirt = CollectorShirt & { club?: string; clubName?: string }
type Done = { id: string }

export function ListingForm({ shirts }: { shirts: Readonly<Record<string, Shirt>> }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [d, setD] = useState<ListingDraft>(EMPTY_DRAFT)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<LibraryClub[]>([])
  const [closet, setClosetItems] = useState<OwnerItem[] | null>(null)
  const [pickCloset, setPickCloset] = useState(false)
  const [closetPhotos, setClosetPhotos] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [upBusy, setUpBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shown, setShown] = useState(false)
  const [done, setDone] = useState<Done | null>(null)
  const key = useRef(newKey())
  const run = useRef(0)
  const set = (patch: Partial<ListingDraft>) => setD((x) => ({ ...x, ...patch }))

  useEffect(() => {
    void closetMine().then((out) => {
      setSignedIn(out.ok ? true : out.error === 'auth_required' ? false : null)
      if (out.ok) setClosetItems(out.items.filter((i) => i.state === 'held'))
    })
  }, [])

  useEffect(() => {
    const mine = ++run.current
    const id = window.setTimeout(() => {
      void clubSearch(q.trim(), 6).then((out) => {
        if (mine === run.current && out.ok) setHits(out.clubs)
      })
    }, 140)
    return () => window.clearTimeout(id)
  }, [q])

  const missing = useMemo(() => issues(d, step, closetPhotos.length), [d, step, closetPhotos.length])
  const typed = q.trim()
  const exact = hits.some((c) => c.name.toLowerCase() === typed.toLowerCase())
  const clubLabel = d.archiveSlug ? (shirts[d.archiveSlug]?.clubName ?? d.archiveSlug) : d.clubName

  async function addPhotos(files: FileList | null) {
    if (!files || !files.length || upBusy) return
    setUpBusy(true)
    setError(null)
    let next = [...d.photos]
    for (const f of Array.from(files)) {
      if (next.length + closetPhotos.length >= MAX_PHOTOS) break
      const put = await photoStore('', '', f)
      if (put.ok) next = [...next, put.path]
      else setError(errorLabel(put.error))
    }
    set({ photos: next })
    setUpBusy(false)
  }

  function chooseCloset(i: OwnerItem) {
    const s = shirts[i.archiveSlug]
    setClosetPhotos(i.photos)
    setPickCloset(false)
    set({
      itemId: i.id, archiveSlug: i.archiveSlug, kitId: i.kitId, clubName: s?.clubName ?? '', size: i.size, condition: i.condition,
      itemType: i.itemType, authenticityClaim: i.authenticityClaim ?? null, description: i.description ?? '',
      playerName: i.playerName ?? '', playerNumber: i.playerNumber != null ? String(i.playerNumber) : '', season: s?.seasonLabel ?? '',
    })
  }

  function clearCloset() {
    setClosetPhotos([])
    setD({ ...EMPTY_DRAFT })
  }

  function next() {
    setShown(true)
    if (missing.length) return
    setShown(false)
    setStep((s) => (s === 1 ? 2 : 3))
  }

  async function publish() {
    if (busy) return
    setShown(true)
    if (issues(d, 3, closetPhotos.length).length) return
    setBusy(true)
    setError(null)
    const out = await marketPublish(key.current, d)
    setBusy(false)
    if (out.ok) {
      const w = out.item.world
      if (w) worldShirt(out.item.id, w)
      setDone({ id: out.listingId })
    } else setError(out.error in ERROR_KEY ? h(ERROR_KEY[out.error] as HubKey) : out.error === 'network' || out.error === 'setup' || out.error === 'off' ? errorLabel(out.error) : h('listing.err.generic'))
  }

  function another() {
    key.current = newKey()
    setD({ ...EMPTY_DRAFT })
    setClosetPhotos([])
    setQ('')
    setStep(1)
    setShown(false)
    setError(null)
    setDone(null)
  }

  if (signedIn === false) {
    return (
      <div className="fl-wiz-card ls-card">
        <h2 className="fl-wiz-title">{h('listing.title')}</h2>
        <p>{h('listing.signin')}</p>
        <div className="fl-wiz-row"><MarketSignIn next="/market/list/new" /></div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="fl-wiz-card ls-card" role="status">
        <h2 className="fl-wiz-title">{h('listing.done.title')}</h2>
        <p className="fl-wiz-club">{clubLabel}</p>
        <div className="fl-wiz-row">
          <Link href={`/market/item/${done.id}`} className="wk-btn red lg min-h-tap">{h('listing.done.view')}</Link>
          <Link href="/market/list" className="wk-btn lg min-h-tap">{h('listing.done.manage')}</Link>
          <button type="button" className="fl-wiz-back min-h-tap" onClick={another}>{h('listing.done.another')}</button>
        </div>
      </div>
    )
  }

  const priceText = d.mode === 'swap' ? null : d.openToOffers && !(Number(d.price) > 0) ? h('listing.price.offers') : formatPrice(Number(d.price), d.currency)

  return (
    <div className="fl-wiz-card ls-card">
      <header className="fl-wiz-head">
        <p><span aria-hidden="true">{step}/3</span> {h(step === 1 ? 'listing.s1' : step === 2 ? 'listing.s2' : 'listing.s3')}</p>
        <Link href="/market/list" className="wk-link">{h('mine.title')}</Link>
      </header>
      <h2 className="fl-wiz-title">{h('listing.title')}</h2>
      <p className="fl-wiz-honest">{h('listing.sub')}</p>

      {step === 1 ? (
        <div className="fl-wiz-body">
          {d.itemId ? (
            <p className="fl-wiz-club">{h('listing.closet.picked')}: {clubLabel}{' '}
              <button type="button" className="wk-link" onClick={clearCloset}>{h('listing.closet.clear')}</button></p>
          ) : (
            <>
              <button type="button" className="fl-wiz-back min-h-tap" onClick={() => setPickCloset((x) => !x)} aria-expanded={pickCloset}>{h('listing.closet.shortcut')}</button>
              {pickCloset ? (
                <ul className="fl-wiz-list">
                  {closet && closet.length ? closet.map((i) => (
                    <li key={i.id}><button type="button" className="min-h-tap" onClick={() => chooseCloset(i)}>
                      <b>{shirts[i.archiveSlug]?.clubName ?? i.archiveSlug}</b><span>{shirts[i.archiveSlug]?.seasonLabel ?? ''}</span></button></li>
                  )) : <li><small>{h('listing.closet.none')}</small></li>}
                </ul>
              ) : null}
              <label htmlFor="ls-club" className="fl-wiz-label">{h('listing.club.label')}</label>
              <input id="ls-club" value={q} onChange={(e) => setQ(e.target.value)} placeholder={h('listing.club.placeholder')} maxLength={60} autoComplete="off" className="fl-wiz-input" />
              {d.clubKey || d.clubName ? <p className="fl-wiz-club">{d.clubName}</p> : null}
              <ul className="fl-wiz-list">
                {hits.map((c) => (
                  <li key={c.key}><button type="button" className="min-h-tap" onClick={() => { set({ clubKey: c.key, clubName: c.name, country: c.country }); setQ('') }}>
                    <b>{c.name}</b><span>{c.country ? countryFlag(c.country) : ''}</span></button></li>
                ))}
                {typed.length >= 2 && !exact ? (
                  <li><button type="button" className="min-h-tap fl-wiz-new" onClick={() => { set({ clubKey: null, clubName: typed, country: null }); setQ('') }}>
                    <b>{h('listing.club.free', { name: typed })}</b><small>{h('listing.club.freeHint')}</small></button></li>
                ) : null}
              </ul>
              <label htmlFor="ls-season" className="fl-wiz-label">{h('listing.season.label')}</label>
              <input id="ls-season" value={d.season} onChange={(e) => set({ season: e.target.value })} placeholder={h('listing.season.placeholder')} maxLength={20} className="fl-wiz-input" />
              <p className="fl-wiz-honest">{h('listing.season.unsure')}: {h('listing.season.label')} — leave empty.</p>
              <p className="fl-wiz-label" id="ls-kit">{h('listing.kit.label')}</p>
              <div className="fl-wiz-chips" role="group" aria-labelledby="ls-kit">
                <button type="button" aria-pressed={d.variant === null} onClick={() => set({ variant: null })}>{h('listing.season.unsure')}</button>
                {VARIANTS.map(([v, label]) => <button key={v} type="button" aria-pressed={d.variant === v} onClick={() => set({ variant: v })}>{label}</button>)}
              </div>
              <label htmlFor="ls-maker" className="fl-wiz-label">{h('listing.maker.label')}</label>
              <input id="ls-maker" value={d.maker} onChange={(e) => set({ maker: e.target.value })} maxLength={30} className="fl-wiz-input" />
            </>
          )}

          <p className="fl-wiz-label" id="ls-size">{h('listing.size.label')}</p>
          <div className="fl-wiz-chips" role="group" aria-labelledby="ls-size">
            <button type="button" aria-pressed={d.size === null} onClick={() => set({ size: null })}>{h('listing.size.unknown')}</button>
            {SIZES.map((s: Size) => <button key={s} type="button" aria-pressed={d.size === s} onClick={() => set({ size: s })}>{sizeLabel(s)}</button>)}
          </div>
          <p className="fl-wiz-label" id="ls-cond">{h('listing.cond.label')}</p>
          <div className="fl-wiz-chips" role="group" aria-labelledby="ls-cond">
            <button type="button" aria-pressed={d.condition === null} onClick={() => set({ condition: null })}>{h('listing.cond.unknown')}</button>
            {CONDITIONS.map((c) => <button key={c} type="button" aria-pressed={d.condition === c} onClick={() => set({ condition: c })}>{h(COND_KEY[c])}</button>)}
          </div>

          <p className="fl-wiz-label">{h('listing.photos.label')}</p>
          <p className="fl-wiz-honest">{h('listing.photos.hint', { max: MAX_PHOTOS })}</p>
          <ul className="fl-wiz-chips ls-photos">
            {[...closetPhotos, ...d.photos].map((p, i) => (
              <li key={p}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(p)} alt="" width={84} height={84} className="ls-thumb" />
                {i === 0 ? <small>{h('listing.photos.first')}</small> : null}
                {d.photos.includes(p) ? <button type="button" aria-label={h('listing.photos.remove')} onClick={() => set({ photos: d.photos.filter((x) => x !== p) })}>✕</button> : null}
              </li>
            ))}
          </ul>
          {d.photos.length + closetPhotos.length < MAX_PHOTOS ? (
            <label className="fl-wiz-back min-h-tap ls-add">
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={upBusy} onChange={(e) => { void addPhotos(e.target.files); e.target.value = '' }} />
              {upBusy ? h('listing.photos.uploading') : h('listing.photos.add')}
            </label>
          ) : null}
        </div>
      ) : step === 2 ? (
        <div className="fl-wiz-body">
          <p className="fl-wiz-label" id="ls-mode">{h('listing.mode.label')}</p>
          <div className="fl-wiz-chips" role="group" aria-labelledby="ls-mode">
            {MODES.map(([m, k]) => <button key={m} type="button" aria-pressed={d.mode === m} onClick={() => set({ mode: m })}>{h(k)}</button>)}
          </div>
          {d.mode && d.mode !== 'swap' ? (
            <>
              <label htmlFor="ls-price" className="fl-wiz-label">{h('listing.price.label')}</label>
              <div className="fl-wiz-row ls-price">
                <input id="ls-price" inputMode="decimal" value={d.price} onChange={(e) => set({ price: e.target.value.replace(/[^0-9.]/g, '') })} className="fl-wiz-input" />
                <select aria-label={h('listing.price.label')} value={d.currency} onChange={(e) => set({ currency: e.target.value as ListingDraft['currency'] })} className="fl-wiz-input">
                  <option value="ILS">ILS</option><option value="EUR">EUR</option><option value="USD">USD</option>
                </select>
              </div>
              <label className="ls-check"><input type="checkbox" checked={d.openToOffers} onChange={(e) => set({ openToOffers: e.target.checked })} /> {h('listing.price.offers')}</label>
            </>
          ) : null}
          {d.mode && d.mode !== 'sell' ? (
            <>
              <label htmlFor="ls-want" className="fl-wiz-label">{h('listing.want.label')}</label>
              <input id="ls-want" value={d.lookingFor} onChange={(e) => set({ lookingFor: e.target.value })} placeholder={h('listing.want.placeholder')} maxLength={200} className="fl-wiz-input" />
            </>
          ) : null}
          <p className="fl-wiz-label" id="ls-del">{h('listing.delivery.label')}</p>
          <div className="fl-wiz-chips" role="group" aria-labelledby="ls-del">
            {([['local', 'listing.delivery.local'], ['ship', 'listing.delivery.ship'], ['both', 'listing.delivery.both']] as const).map(([v, k]) =>
              <button key={v} type="button" aria-pressed={d.delivery === v} onClick={() => set({ delivery: v })}>{h(k)}</button>)}
          </div>
          {d.delivery !== 'local' ? (
            <div className="fl-wiz-chips">
              {([['country', 'listing.scope.country'], ['world', 'listing.scope.world']] as const).map(([v, k]) =>
                <button key={v} type="button" aria-pressed={d.shipScope === v} onClick={() => set({ shipScope: v })}>{h(k)}</button>)}
            </div>
          ) : null}
          <details className="ls-more">
            <summary>{h('listing.more')}</summary>
            <p className="fl-wiz-label" id="ls-type">{h('listing.more.type')}</p>
            <div className="fl-wiz-chips" role="group" aria-labelledby="ls-type">
              {TYPES.map(([v, label]) => <button key={v} type="button" aria-pressed={d.itemType === v} onClick={() => set({ itemType: v })}>{label}</button>)}
            </div>
            <p className="fl-wiz-label" id="ls-claim">{h('listing.more.claim')}</p>
            <div className="fl-wiz-chips" role="group" aria-labelledby="ls-claim">
              {CLAIMS.map(([v, label]) => <button key={String(v)} type="button" aria-pressed={d.authenticityClaim === v} onClick={() => set({ authenticityClaim: v })}>{label}</button>)}
            </div>
            <p className="fl-wiz-honest">{h('listing.claim.note')}</p>
            <label htmlFor="ls-pn" className="fl-wiz-label">{h('listing.more.player')}</label>
            <input id="ls-pn" value={d.playerName} onChange={(e) => set({ playerName: e.target.value })} maxLength={40} className="fl-wiz-input" />
            <label htmlFor="ls-num" className="fl-wiz-label">{h('listing.more.number')}</label>
            <input id="ls-num" inputMode="numeric" value={d.playerNumber} onChange={(e) => set({ playerNumber: e.target.value.replace(/\D/g, '').slice(0, 2) })} className="fl-wiz-input" />
            <label htmlFor="ls-desc" className="fl-wiz-label">{h('listing.more.desc')}</label>
            <textarea id="ls-desc" value={d.description} onChange={(e) => set({ description: e.target.value })} maxLength={1500} rows={4} className="fl-wiz-input" />
          </details>
        </div>
      ) : (
        <div className="fl-wiz-body">
          <p className="fl-wiz-label">{h('listing.preview.title')}</p>
          <article className="ls-preview">
            {closetPhotos[0] || d.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl(closetPhotos[0] ?? d.photos[0]!)} alt="" className="ls-cover" />
            ) : null}
            <h3 className="fl-wiz-club">{clubLabel || h('listing.preview.unknown')}</h3>
            <p>{d.season || h('listing.preview.unknown')} · {d.variant ?? h('listing.preview.unknown')}{d.maker ? ` · ${d.maker}` : ''}</p>
            <p>{d.size ? sizeLabel(d.size) : h('listing.preview.unknown')} · {d.condition ? conditionLabel(d.condition) : h('listing.preview.unknown')}</p>
            <p><b>{d.mode ? h(MODES.find(([m]) => m === d.mode)![1]) : ''}</b>{priceText ? ` · ${priceText}` : ''}{d.lookingFor && d.mode !== 'sell' ? ` · ${d.lookingFor}` : ''}</p>
          </article>
          {!d.itemId ? (
            <label className="ls-check"><input type="checkbox" checked={d.addToCloset} onChange={(e) => set({ addToCloset: e.target.checked })} /> {h('listing.closet.add')}<small> — {h('listing.closet.addHint')}</small></label>
          ) : null}
          <p className="fl-wiz-honest">{h('listing.honest')}</p>
        </div>
      )}

      {shown && missing.length ? <ul className="fl-wiz-err" role="alert">{missing.map((m) => <li key={m}>{h(FIX[m])}</li>)}</ul> : null}
      {error ? <p className="fl-wiz-err" role="alert">{error}</p> : null}
      <div className="fl-wiz-row">
        {step > 1 ? <button type="button" className="fl-wiz-back min-h-tap" onClick={() => { setShown(false); setStep((s) => (s === 3 ? 2 : 1)) }}>{h('listing.back')}</button> : <span />}
        {step < 3 ? (
          <button type="button" className="fl-world-go min-h-tap" onClick={next}>{h('listing.next')}</button>
        ) : (
          <button type="button" className="fl-world-go min-h-tap" disabled={busy} onClick={() => void publish()}>{busy ? h('listing.publishing') : h('listing.publish')}</button>
        )}
      </div>
    </div>
  )
}
