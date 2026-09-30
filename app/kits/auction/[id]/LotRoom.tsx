'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuctionApi } from '@/components/auction/AuctionApi'
import { LotView, type LotActions } from '@/components/auction/LotView'
import { useNow } from '@/components/auction/useNow'
import { EmptyState } from '@/components/ui/EmptyState'
import { livePhase, lotIcs, msToNext, pollEvery, type AuctionShirt } from '@/lib/collector/auction'
import { errorLabel } from '@/lib/collector/labels'
import type { CollectorError, Fail, LotState } from '@/lib/collector/types'
import { t } from '@/lib/i18n'

type Room = { status: 'loading' } | { status: 'failed'; error: CollectorError } | { status: 'ready'; state: LotState }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * החדר של לוט: קורא, מתעדכן, ושולח. כל שלוש שניות כשהלוט חי, כל חצי דקה כשהוא מחכה, אף פעם
 * כשהוא נגמר — ולא בכלל כשהלשונית מוסתרת. כשהשעון של המכשיר חוצה התחלה או סיום, קוראים מיד:
 * המסד סוגר לוט רק כשמסתכלים עליו (סגירה עצלה), ולכן המבט הזה הוא הסגירה.
 */
export function LotRoom({ lotId, shirts }: { lotId: string; shirts: Record<string, AuctionShirt> }) {
  const api = useAuctionApi()
  const now = useNow()
  const [room, setRoom] = useState<Room>({ status: 'loading' })
  const [signedIn, setSignedIn] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const was = useRef<LotState | null>(null)

  const apply = useCallback((state: LotState) => {
    const before = was.current
    if (before && before.lot.leading && !state.lot.leading && state.lot.yourMax !== null) setNotice(t('auction.notice.outbid'))
    if (before && before.lot.endsAt && state.lot.endsAt && Date.parse(state.lot.endsAt) > Date.parse(before.lot.endsAt) + 1000 && before.lot.bidCount !== state.lot.bidCount) {
      setNotice(t('auction.notice.extended'))
    }
    was.current = state
    setRoom({ status: 'ready', state })
  }, [])

  const load = useCallback(async () => {
    if (!UUID.test(lotId)) {
      setRoom({ status: 'failed', error: 'not_found' })
      return
    }
    const result = await api.auctionState(lotId)
    if (result.ok) apply({ lot: result.lot, item: result.item, bids: result.bids })
    else setRoom((current) => (current.status === 'ready' && result.error === 'network' ? current : { status: 'failed', error: result.error }))
  }, [api, apply, lotId])

  useEffect(() => {
    void load()
    void api.signedIn().then(setSignedIn)
  }, [api, load])

  // polling, by phase, paused while hidden
  const phase = room.status === 'ready' && now !== null ? livePhase(room.state.lot, now) : null
  useEffect(() => {
    if (phase === null) return
    const every = pollEvery(phase)
    if (every === null) return
    const timer = setInterval(() => {
      if (!document.hidden) void load()
    }, every)
    const onVisible = () => {
      if (!document.hidden) void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [phase, load])

  // the moment the clock crosses the start or the end, read again
  const remaining = room.status === 'ready' && now !== null ? msToNext(room.state.lot, now) : null
  const crossed = remaining === 0
  useEffect(() => {
    if (crossed) void load()
  }, [crossed, load])

  if (room.status === 'loading' || now === null) {
    return <p className="mt-stack font-sign text-step-1 text-muted">{t('auction.loading')}</p>
  }
  if (room.status === 'failed') {
    return (
      <div className="mt-stack">
        {room.error === 'off' ? (
          <EmptyState title={t('auction.off.title')} body={t('auction.off.body')} />
        ) : room.error === 'not_found' ? (
          <EmptyState title={t('auction.notFound.title')} body={t('auction.notFound.body')} />
        ) : (
          <EmptyState title={t('auction.failed.title')} body={errorLabel(room.error)} tone="red" />
        )}
        <Link href="/kits/auction" prefetch={false} className="mt-3 inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-sign underline underline-offset-4">
          {t('auction.back')}
        </Link>
      </div>
    )
  }

  const state = room.state
  const settle = (result: { ok: true; state?: unknown } | Fail): Fail | null => (result.ok ? null : result)
  const actions: LotActions = {
    bid: async (max) => {
      const result = await api.auctionBid(lotId, max)
      if (!result.ok) {
        if (result.error === 'auth_required') setSignedIn(false)
        return result
      }
      setNotice(result.leading ? t('auction.notice.leading') : t('auction.notice.notEnough'))
      if (result.state.ok) apply({ lot: result.state.lot, item: result.state.item, bids: result.state.bids })
      else void load()
      return null
    },
    watch: async (on) => {
      const result = await api.auctionWatch(lotId, on)
      if (result.ok) void load()
      return settle(result)
    },
    remind: () => {
      if (!state.lot.startsAt) return
      const ics = lotIcs(
        { id: state.lot.id, title: state.lot.title, startsAt: state.lot.startsAt, endsAt: state.lot.endsAt },
        `${window.location.origin}/kits/auction/${state.lot.id}`,
        Date.now(),
      )
      const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `the-worker-lot-${state.lot.id.slice(0, 8)}.ics`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice(t('auction.notice.reminded'))
    },
    complete: async () => {
      const result = await api.auctionComplete(lotId)
      if (result.ok) {
        setNotice(result.status === 'completed' ? t('auction.notice.completed') : t('auction.notice.halfDone'))
        void load()
      }
      return settle(result)
    },
    withdraw: async () => {
      const result = await api.auctionWithdraw(lotId)
      if (result.ok) {
        setNotice(t('auction.notice.withdrawn'))
        void load()
      }
      return settle(result)
    },
  }

  return (
    <>
      <Link href="/kits/auction" prefetch={false} className="mt-3 inline-flex min-h-tap items-center font-body text-step--1 font-bold text-sign underline underline-offset-4">
        {t('auction.back')}
      </Link>
      <LotView state={state} now={now} signedIn={signedIn} shirt={shirts[state.lot.archiveSlug]} actions={actions} notice={notice} />
    </>
  )
}
