'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { useAuctionApi } from '@/components/auction/AuctionApi'
import { LotPoster } from '@/components/auction/LotPoster'
import { useNow } from '@/components/auction/useNow'
import { EmptyState } from '@/components/ui/EmptyState'
import { Num } from '@/components/ui/Num'
import { groupLots, POLL_IDLE_MS, type AuctionShirt } from '@/lib/collector/auction'
import { errorLabel } from '@/lib/collector/labels'
import type { CollectorError, LotBrief } from '@/lib/collector/types'
import { t } from '@/lib/i18n'

type Board = { status: 'loading' } | { status: 'failed'; error: CollectorError } | { status: 'ready'; open: LotBrief[]; recent: LotBrief[]; mine: LotBrief[] }

/**
 * הלוח — שלוש שורות של כרזות: חי עכשיו, בקרוב, נסגרו לאחרונה. נקרא מחדש כל חצי דקה כשהלשונית
 * פתוחה; השעונים על הכרזות זזים כל שנייה מהשעון של המכשיר (`livePhase`).
 */
export function AuctionBoard({ shirts }: { shirts: Record<string, AuctionShirt> }) {
  const api = useAuctionApi()
  const now = useNow()
  const [board, setBoard] = useState<Board>({ status: 'loading' })

  const load = useCallback(async () => {
    const [open, recent, signedIn] = await Promise.all([api.auctionList('open'), api.auctionList('recent'), api.signedIn()])
    if (!open.ok) {
      setBoard({ status: 'failed', error: open.error })
      return
    }
    const mine = signedIn ? await api.auctionList('mine') : null
    setBoard({ status: 'ready', open: open.lots, recent: recent.ok ? recent.lots : [], mine: mine && mine.ok ? mine.lots : [] })
  }, [api])

  useEffect(() => {
    void load()
    const timer = setInterval(() => {
      if (!document.hidden) void load()
    }, POLL_IDLE_MS)
    return () => clearInterval(timer)
  }, [load])

  return (
    <div className="mt-stack flex flex-col gap-8">
      <p className="max-w-prose font-body text-step-0 leading-relaxed text-ink">{t('auction.lede')}</p>
      <Board board={board} now={now} shirts={shirts} />
      <Programme />
    </div>
  )
}

function Board({ board, now, shirts }: { board: Board; now: number | null; shirts: Record<string, AuctionShirt> }) {
  if (board.status === 'loading' || now === null) {
    return <p className="font-sign text-step-1 text-muted" data-board="loading">{t('auction.loading')}</p>
  }
  if (board.status === 'failed') {
    return board.error === 'off' ? (
      <EmptyState title={t('auction.off.title')} body={t('auction.off.body')} />
    ) : (
      <EmptyState title={t('auction.failed.title')} body={errorLabel(board.error)} tone="red" />
    )
  }
  const groups = groupLots(board.open, board.recent, now)
  const mineIds = new Set(board.mine.map((lot) => lot.id))
  const mineElsewhere = board.mine.filter((lot) => !board.open.some((row) => row.id === lot.id))
  const nothing = groups.live.length + groups.upcoming.length + groups.recent.length === 0
  return (
    <div className="flex flex-col gap-10" data-board="ready">
      {nothing ? <EmptyState title={t('auction.empty.title')} body={t('auction.empty.body')} /> : null}
      <Row id="live" title={t('auction.row.live')} lots={groups.live} now={now} shirts={shirts} mine={mineIds} accent />
      <Row id="upcoming" title={t('auction.row.upcoming')} lots={groups.upcoming} now={now} shirts={shirts} mine={mineIds} />
      <Row id="recent" title={t('auction.row.recent')} lots={groups.recent} now={now} shirts={shirts} mine={mineIds} />
      <Row id="mine" title={t('auction.row.mine')} lots={mineElsewhere} now={now} shirts={shirts} mine={mineIds} />
    </div>
  )
}

function Row({
  id,
  title,
  lots,
  now,
  shirts,
  mine,
  accent = false,
}: {
  id: string
  title: string
  lots: LotBrief[]
  now: number
  shirts: Record<string, AuctionShirt>
  mine: Set<string>
  accent?: boolean
}) {
  if (lots.length === 0) return null
  return (
    <section aria-labelledby={`row-${id}`} data-row={id}>
      <div className="flex items-end justify-between gap-3 border-b-plate border-ink pb-1.5">
        <h2 id={`row-${id}`} className="flex items-center gap-2 font-display text-step-3 leading-none text-ink">
          {accent ? <span aria-hidden="true" className="inline-block h-3 w-3 bg-red motion-safe:animate-pulse" /> : null}
          {title}
        </h2>
        <p className="font-poster text-[26px] leading-none text-red">
          <Num>{String(lots.length)}</Num>
        </p>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {lots.map((lot) => (
          <li key={lot.id} className="relative">
            <LotPoster lot={lot} shirt={shirts[lot.archiveSlug]} now={now} />
            {mine.has(lot.id) ? (
              <span className="pointer-events-none absolute -top-2 start-3 bg-sign px-2 py-0.5 font-body text-[11px] font-extrabold text-paper">
                {t('auction.mine.tag')}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** איך זה עובד — ארבעה משפטים, כמו תוכניית משחק. */
function Programme() {
  const rows = [t('auction.how.1'), t('auction.how.2'), t('auction.how.3'), t('auction.how.4')]
  return (
    <section aria-labelledby="how" className="border-plate border-ink bg-sheet">
      <h2 id="how" className="bg-sign px-4 py-2 font-sign text-step-1 font-bold text-paper">
        {t('auction.how.title')}
      </h2>
      <ol className="grid grid-cols-1 md:grid-cols-4">
        {rows.map((row, index) => (
          <li key={row} className="flex gap-3 border-t-hair border-ink/40 p-4 md:border-s-hair md:border-t-0 md:first:border-s-0">
            <span className="font-poster text-[40px] leading-none text-red">
              <Num>{String(index + 1)}</Num>
            </span>
            <span className="font-body text-step--1 leading-relaxed text-ink">{row}</span>
          </li>
        ))}
      </ol>
      <div className="border-t-rule border-ink px-4 py-3">
        <Link href="/kits/closet" prefetch={false} className="inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-sign underline decoration-2 underline-offset-4">
          {t('auction.how.submit')}
        </Link>
      </div>
    </section>
  )
}
