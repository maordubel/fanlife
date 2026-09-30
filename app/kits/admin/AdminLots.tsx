'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { useAuctionApi } from '@/components/auction/AuctionApi'
import { PhaseStamp } from '@/components/auction/PhaseStamp'
import { ReasonDialog } from '@/components/auction/ReasonDialog'
import { CollectorTag } from '@/components/collector/CollectorTag'
import { ItemFacts } from '@/components/collector/ItemFacts'
import { UserPhoto } from '@/components/collector/UserPhoto'
import { EmptyState } from '@/components/ui/EmptyState'
import { Num } from '@/components/ui/Num'
import {
  auctionErrorLabel,
  bidderLabel,
  DAY,
  fromLocalInput,
  HOUR,
  livePhase,
  toLocalInput,
  whenText,
  type AdminBid,
  type AdminLotWithBids,
} from '@/lib/collector/auction'
import { formatPrice, handleLabel } from '@/lib/collector/labels'
import type { CollectorError, Fail } from '@/lib/collector/types'
import { t } from '@/lib/i18n'

type Pending = { kind: 'approve' | 'reject' | 'cancel'; lot: AdminLotWithBids } | { kind: 'void'; lot: AdminLotWithBids; bid: AdminBid }

/**
 * לוטים — לאישור (מועד התחלה, או דחייה עם סיבה) ופעילים (ביטול עם סיבה, ביטול הצעה עם סיבה).
 * אחרי כל פעולה הרשימה נקראת מחדש מהמסד; שום דבר לא מתעדכן כאן "באופטימיות".
 */
export function AdminLots({ scope }: { scope: 'pending' | 'active' }) {
  const api = useAuctionApi()
  const [lots, setLots] = useState<AdminLotWithBids[] | null>(null)
  const [error, setError] = useState<CollectorError | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [startAt, setStartAt] = useState(() => toLocalInput(Math.ceil((Date.now() + DAY) / HOUR) * HOUR))

  const load = useCallback(async () => {
    const results = scope === 'pending' ? [await api.adminLots('pending_approval')] : await Promise.all([api.adminLots('scheduled'), api.adminLots('awaiting_completion')])
    const failed = results.find((result) => !result.ok) as Fail | undefined
    if (failed) {
      setError(failed.error)
      return
    }
    setError(null)
    setLots(results.flatMap((result) => (result.ok ? (result.lots as AdminLotWithBids[]) : [])))
  }, [api, scope])

  useEffect(() => {
    void load()
  }, [load])

  const run = async (action: () => Promise<{ ok: true } | Fail>, done: string) => {
    const result = await action()
    setPending(null)
    if (result.ok) {
      setMessage(done)
      void load()
    } else {
      setMessage(auctionErrorLabel(result))
    }
  }

  if (error) return <p role="alert" className="font-body text-step--1 font-extrabold text-red">{auctionErrorLabel({ error })}</p>
  if (!lots) return <p className="font-sign text-step-1 text-muted">{t('auction.loading')}</p>
  return (
    <div className="flex flex-col gap-5" data-admin-lots={scope}>
      {message ? (
        <p role="status" className="border-rule border-sign bg-sheet px-3 py-2 font-body text-step--1 font-extrabold text-sign">
          {message}
        </p>
      ) : null}
      {lots.length === 0 ? (
        <EmptyState title={scope === 'pending' ? t('admin.lots.emptyPending') : t('admin.lots.emptyActive')} body={t('admin.lots.emptyBody')} />
      ) : null}
      {lots.map((lot) => (
        <LotCard key={lot.id} lot={lot} scope={scope} onAct={setPending} />
      ))}
      {pending?.kind === 'approve' ? (
        <ReasonDialog
          title={t('admin.lot.approveTitle', { title: pending.lot.title })}
          body={t('admin.lot.approveBody', { hours: String(pending.lot.requestedHours) })}
          confirm={t('admin.lot.approve')}
          reason="optional"
          onClose={() => setPending(null)}
          onConfirm={(note) =>
            run(() => api.adminLotDecide(pending.lot.id, true, fromLocalInput(startAt), note || null), t('admin.lot.approved'))
          }
        >
          <label className="mt-3 block font-body text-step--1 font-extrabold text-ink">
            {t('admin.lot.startAt')}
            <input
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
              className="mt-1 block min-h-tap w-full border-rule border-ink bg-paper px-2 font-body text-step-0 text-ink"
            />
          </label>
        </ReasonDialog>
      ) : null}
      {pending?.kind === 'reject' ? (
        <ReasonDialog
          title={t('admin.lot.rejectTitle', { title: pending.lot.title })}
          body={t('admin.lot.rejectBody')}
          confirm={t('admin.lot.reject')}
          onClose={() => setPending(null)}
          onConfirm={(note) => run(() => api.adminLotDecide(pending.lot.id, false, null, note), t('admin.lot.rejected'))}
        />
      ) : null}
      {pending?.kind === 'cancel' ? (
        <ReasonDialog
          title={t('admin.lot.cancelTitle', { title: pending.lot.title })}
          body={t('admin.lot.cancelBody')}
          confirm={t('admin.lot.cancel')}
          onClose={() => setPending(null)}
          onConfirm={(note) => run(() => api.adminLotCancel(pending.lot.id, note), t('admin.lot.cancelled'))}
        />
      ) : null}
      {pending?.kind === 'void' ? (
        <ReasonDialog
          title={t('admin.bid.voidTitle', { amount: formatPrice(pending.bid.amount, pending.lot.currency) })}
          body={t('admin.bid.voidBody')}
          confirm={t('admin.bid.void')}
          onClose={() => setPending(null)}
          onConfirm={(note) => run(() => api.adminBidVoid(pending.bid.id, note), t('admin.bid.voided'))}
        />
      ) : null}
    </div>
  )
}

function LotCard({ lot, scope, onAct }: { lot: AdminLotWithBids; scope: 'pending' | 'active'; onAct: (pending: Pending) => void }) {
  const phase = livePhase(lot, Date.now())
  return (
    <article className="border-plate border-ink bg-sheet" data-admin-lot={lot.id}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b-rule border-ink p-4">
        <div className="min-w-0">
          <p className="font-display text-step-2 leading-tight text-ink">
            <bdi>{lot.title}</bdi>
          </p>
          <p className="mt-1 flex flex-wrap items-baseline gap-2 font-body text-step--1 text-muted">
            {t('admin.lot.by')} <CollectorTag label={lot.seller} />
          </p>
          <p className="font-body text-[12px] text-muted">{t('admin.lot.created', { when: whenText(lot.createdAt) })}</p>
        </div>
        <PhaseStamp phase={phase} />
      </header>
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div>
          {lot.item.photos.length ? (
            <ul className="grid grid-cols-3 gap-1.5">
              {lot.item.photos.slice(0, 6).map((path) => (
                <li key={path} className="aspect-square border-hair border-ink/40 bg-paper">
                  <UserPhoto path={path} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-body text-step--1 font-bold text-red">{t('admin.lot.noPhotos')}</p>
          )}
          <p className="mt-1 font-body text-[12px] text-muted">{t('auction.submit.photos', { n: String(lot.item.photos.length) })}</p>
        </div>
        <div className="flex flex-col gap-3">
          <ItemFacts item={lot.item} showPrice={false} />
          <p className="whitespace-pre-line font-body text-step--1 leading-relaxed text-ink">
            <bdi>{lot.description}</bdi>
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-body text-step--1 text-ink sm:grid-cols-4">
            <Fact label={t('admin.lot.start')} value={formatPrice(lot.startPrice, lot.currency)} />
            <Fact label={t('admin.lot.reserve')} value={lot.reservePrice === null ? '—' : formatPrice(lot.reservePrice, lot.currency)} />
            <Fact label={t('admin.lot.increment')} value={formatPrice(lot.minIncrement, lot.currency)} />
            <Fact label={t('admin.lot.hours')} value={String(lot.requestedHours)} />
            {scope === 'active' ? <Fact label={t('auction.price.now')} value={formatPrice(lot.currentPrice, lot.currency)} /> : null}
            {scope === 'active' && lot.endsAt ? <Fact label={t('admin.lot.ends')} value={whenText(lot.endsAt)} plain /> : null}
          </dl>
          {lot.decisionNote ? (
            <p className="font-body text-step--1 text-muted">
              {t('admin.lot.note')} <bdi>{lot.decisionNote}</bdi>
            </p>
          ) : null}
        </div>
      </div>
      {scope === 'active' ? <Bids lot={lot} onVoid={(bid) => onAct({ kind: 'void', lot, bid })} /> : null}
      <footer className="flex flex-wrap items-center gap-2 border-t-rule border-ink p-4">
        {scope === 'pending' ? (
          <>
            <button type="button" onClick={() => onAct({ kind: 'approve', lot })} className="min-h-tap border-rule border-ink bg-sign px-4 font-body text-step--1 font-extrabold text-paper">
              {t('admin.lot.approve')}
            </button>
            <button type="button" onClick={() => onAct({ kind: 'reject', lot })} className="min-h-tap border-rule border-ink bg-sheet px-4 font-body text-step--1 font-extrabold text-ink">
              {t('admin.lot.reject')}
            </button>
          </>
        ) : (
          <>
            <Link href={`/kits/auction/${lot.id}`} prefetch={false} className="inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-sign underline underline-offset-4">
              {t('admin.lot.open')}
            </Link>
            <button type="button" onClick={() => onAct({ kind: 'cancel', lot })} className="ms-auto min-h-tap border-rule border-red bg-sheet px-4 font-body text-step--1 font-extrabold text-red">
              {t('admin.lot.cancel')}
            </button>
          </>
        )}
      </footer>
    </article>
  )
}

function Fact({ label, value, plain = false }: { label: string; value: string; plain?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] font-bold text-muted">{label}</dt>
      <dd className="font-extrabold">{plain ? value : <Num>{value}</Num>}</dd>
    </div>
  )
}

function Bids({ lot, onVoid }: { lot: AdminLotWithBids; onVoid: (bid: AdminBid) => void }) {
  const bids = lot.bids ?? []
  return (
    <section className="border-t-hair border-ink/40 px-4 py-3" aria-label={t('auction.history.title')}>
      <p className="font-body text-step--1 font-extrabold text-ink">{t('auction.history.title')}</p>
      {bids.length === 0 ? (
        <p className="mt-1 font-body text-step--1 text-muted">{t('auction.history.empty')}</p>
      ) : (
        <ol className="mt-1">
          {bids.map((bid) => (
            <li key={bid.id} className={`flex flex-wrap items-center justify-between gap-2 border-b-hair border-ink/30 py-1.5 ${bid.status === 'voided' ? 'text-muted line-through' : 'text-ink'}`}>
              <span className="font-body text-step--1">
                <bdi className="font-bold">{bid.bidder ? handleLabel(bid.bidder) : bidderLabel({ bidder: 0, you: false })}</bdi>
                {bid.proxy ? <span className="ms-2 text-[11.5px] text-muted">{t('auction.history.proxy')}</span> : null}
              </span>
              <span className="flex items-center gap-3">
                <span className="font-poster text-[20px] leading-none">
                  <Num>{formatPrice(bid.amount, lot.currency)}</Num>
                </span>
                {bid.status === 'active' && !bid.proxy ? (
                  <button type="button" onClick={() => onVoid(bid)} className="min-h-tap px-2 font-body text-step--1 font-bold text-red underline underline-offset-4">
                    {t('admin.bid.void')}
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
