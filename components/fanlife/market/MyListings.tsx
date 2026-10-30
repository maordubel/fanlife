'use client'
// FAN LIFE — hand-written (direct listing, 30.10.2026). Everything I have on offer, closet or not. The server decides every state change.

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { MarketSignIn } from '@/components/fanlife/market/MarketSignIn'
import { photoUrl } from '@/lib/collector/api'
import type { CollectorShirt } from '@/lib/collector/types'
import { formatPrice } from '@/lib/fanlife/collector/labels'
import { listingSet, listingsMine } from '@/lib/fanlife/hub/api'
import { h, type HubKey } from '@/lib/fanlife/hub/copy'
import { statusOf, type ListingRow, type ListingStatus } from '@/lib/fanlife/hub/listing'

type Shirt = CollectorShirt & { club?: string; clubName?: string }
const STATUS: Record<ListingStatus, HubKey> = {
  live: 'mine.status.live', reserved: 'mine.status.reserved', paused: 'mine.status.paused', sold: 'mine.status.sold',
  swapped: 'mine.status.swapped', removed: 'mine.status.removed', held: 'mine.status.held',
}

export function MyListings({ shirts }: { shirts: Readonly<Record<string, Shirt>> }) {
  const [rows, setRows] = useState<ListingRow[] | null>(null)
  const [guest, setGuest] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    const out = await listingsMine()
    if (out.ok) setRows(out.listings)
    else if (out.error === 'auth_required') setGuest(true)
    else setError(true)
  }, [])
  useEffect(() => { void load() }, [load])

  async function act(id: string, action: Parameters<typeof listingSet>[1]) {
    setBusy(id)
    setError(false)
    const out = await listingSet(id, action)
    setBusy(null)
    setConfirm(null)
    if (out.ok) await load()
    else setError(true)
  }

  if (guest) return <div className="fl-wiz-card ls-card"><p>{h('mine.signin')}</p><MarketSignIn next="/market/list" /></div>
  const label = (r: ListingRow) => r.world?.club ?? shirts[r.archiveSlug ?? '']?.clubName ?? r.archiveSlug ?? ''

  return (
    <div className="ls-mine">
      <p className="fl-wiz-honest">{h('mine.sub')}</p>
      <Link href="/market/list/new" className="wk-btn red lg min-h-tap">{h('mine.new')}</Link>
      {error ? <p className="fl-wiz-err" role="alert">{h('mine.err')}</p> : null}
      {rows && !rows.length ? <p>{h('mine.empty')}</p> : null}
      <ul className="ls-rows">
        {(rows ?? []).map((r) => {
          const st = statusOf(r)
          const cover = r.photos[0]
          return (
            <li key={r.id} className="fl-wiz-card ls-row">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl(cover)} alt="" width={72} height={72} className="ls-thumb" />
              ) : null}
              <div>
                <b>{label(r)}</b>
                <p>{h(STATUS[st])}{r.inCloset ? ` · ${h('mine.closet.tag')}` : ''}</p>
                <p>
                  {r.forSale || r.paused ? h('mine.sale') : ''}{r.askingPrice ? ` ${formatPrice(r.askingPrice, r.currency)}` : ''}
                  {r.forTrade ? ` ${h('mine.swap')}` : ''}
                </p>
              </div>
              <div className="fl-wiz-chips">
                {st === 'live' || st === 'paused' || st === 'reserved' || st === 'held' ? <Link href={`/market/item/${r.id}`} className="wk-link">{h('mine.act.view')}</Link> : null}
                {st === 'live' ? <button type="button" disabled={busy === r.id} onClick={() => void act(r.id, 'pause')}>{h('mine.act.pause')}</button> : null}
                {st === 'paused' ? <button type="button" disabled={busy === r.id} onClick={() => void act(r.id, 'resume')}>{h('mine.act.resume')}</button> : null}
                {st === 'live' || st === 'paused' ? (
                  <>
                    {r.forSale || r.paused ? <button type="button" disabled={busy === r.id} onClick={() => void act(r.id, 'sold')}>{h('mine.act.sold')}</button> : null}
                    <button type="button" disabled={busy === r.id} onClick={() => void act(r.id, 'traded')}>{h('mine.act.swapped')}</button>
                  </>
                ) : null}
                {!r.inCloset && (st === 'live' || st === 'paused') ? <button type="button" disabled={busy === r.id} onClick={() => void act(r.id, 'closet_add')}>{h('mine.act.closet')}</button> : null}
                {st === 'live' || st === 'paused' || st === 'held' ? (
                  confirm === r.id ? (
                    <>
                      <span>{h('mine.confirm.remove')}</span>
                      <button type="button" onClick={() => void act(r.id, 'remove')}>{h('mine.confirm.yes')}</button>
                      <button type="button" onClick={() => setConfirm(null)}>{h('mine.confirm.no')}</button>
                    </>
                  ) : <button type="button" onClick={() => setConfirm(r.id)}>{h('mine.act.remove')}</button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
