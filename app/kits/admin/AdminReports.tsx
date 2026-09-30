'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { useAuctionApi } from '@/components/auction/AuctionApi'
import { ReasonDialog } from '@/components/auction/ReasonDialog'
import { CollectorTag } from '@/components/collector/CollectorTag'
import { EmptyState } from '@/components/ui/EmptyState'
import type { AdminReport } from '@/lib/collector/api'
import { auctionErrorLabel, bidTimeText, whenText } from '@/lib/collector/auction'
import { formatPrice } from '@/lib/collector/labels'
import type { CollectorError, Fail, Thread } from '@/lib/collector/types'
import { t, type MessageKey } from '@/lib/i18n'

const STATUSES = ['open', 'reviewed', 'actioned', 'dismissed', 'all'] as const
type Filter = (typeof STATUSES)[number]

const STATUS_LABEL: Record<Filter, MessageKey> = {
  open: 'admin.report.status.open',
  reviewed: 'admin.report.status.reviewed',
  actioned: 'admin.report.status.actioned',
  dismissed: 'admin.report.status.dismissed',
  all: 'admin.report.status.all',
}

const REASON_LABEL: Record<string, MessageKey> = {
  scam: 'admin.report.reason.scam',
  fake: 'admin.report.reason.fake',
  abuse: 'admin.report.reason.abuse',
  spam: 'admin.report.reason.spam',
  other: 'admin.report.reason.other',
}

type Pending =
  | { kind: 'resolve'; report: AdminReport; status: 'reviewed' | 'actioned' | 'dismissed' }
  | { kind: 'suspend' | 'unsuspend'; report: AdminReport; itemId: string }

/**
 * דיווחים (מפרט §65): לפתוח את השיחה שדווחה — קריאה של מידע פרטי, ולכן היא נרשמת ביומן —
 * להשעות פריט או להחזיר אותו, ולסגור את הדיווח עם סיבה.
 */
export function AdminReports() {
  const api = useAuctionApi()
  const [filter, setFilter] = useState<Filter>('open')
  const [reports, setReports] = useState<AdminReport[] | null>(null)
  const [error, setError] = useState<CollectorError | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [thread, setThread] = useState<{ reportId: string; thread: Thread } | null>(null)

  const load = useCallback(async () => {
    const result = await api.adminReports(filter === 'all' ? null : filter)
    if (result.ok) {
      setError(null)
      setReports(result.reports)
    } else setError(result.error)
  }, [api, filter])

  useEffect(() => {
    setReports(null)
    void load()
  }, [load])

  const run = async (action: () => Promise<{ ok: true } | Fail>, done: string) => {
    const result = await action()
    setPending(null)
    setMessage(result.ok ? done : auctionErrorLabel(result))
    if (result.ok) void load()
  }

  const openThread = async (report: AdminReport) => {
    if (!report.connectionId) return
    const result = await api.adminConnectionView(report.connectionId)
    if (result.ok) setThread({ reportId: report.id, thread: result })
    else setMessage(auctionErrorLabel(result))
  }

  return (
    <div className="flex flex-col gap-4" data-admin-reports="">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('admin.report.filter')}>
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={filter === status}
            onClick={() => setFilter(status)}
            className={`min-h-tap border-rule px-3 font-body text-step--1 font-bold ${filter === status ? 'border-sign bg-sign text-paper' : 'border-ink/40 bg-sheet text-ink'}`}
          >
            {t(STATUS_LABEL[status])}
          </button>
        ))}
      </div>
      {message ? (
        <p role="status" className="border-rule border-sign bg-sheet px-3 py-2 font-body text-step--1 font-extrabold text-sign">
          {message}
        </p>
      ) : null}
      {error ? <p role="alert" className="font-body text-step--1 font-extrabold text-red">{auctionErrorLabel({ error })}</p> : null}
      {!reports && !error ? <p className="font-sign text-step-1 text-muted">{t('auction.loading')}</p> : null}
      {reports && reports.length === 0 ? <EmptyState title={t('admin.report.empty')} body={t('admin.report.emptyBody')} /> : null}
      {reports?.map((report) => (
        <article key={report.id} className="border-plate border-ink bg-sheet" data-report={report.status}>
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b-rule border-ink p-4">
            <p className="font-display text-step-2 leading-tight text-ink">{t(REASON_LABEL[report.reason] ?? 'admin.report.reason.other')}</p>
            <p className="font-body text-step--1 font-bold text-muted">
              {t(STATUS_LABEL[report.status])} · {whenText(report.createdAt)}
            </p>
          </header>
          <div className="flex flex-col gap-2 p-4 font-body text-step--1 text-ink">
            {report.details ? (
              <p className="whitespace-pre-line leading-relaxed">
                <bdi>{report.details}</bdi>
              </p>
            ) : null}
            <p className="flex flex-wrap items-baseline gap-2">
              <span className="text-muted">{t('admin.report.by')}</span>
              {report.reporter ? <CollectorTag label={report.reporter} compact /> : <span>—</span>}
              <span className="text-muted">{t('admin.report.about')}</span>
              {report.reported ? <CollectorTag label={report.reported} compact /> : <span>—</span>}
            </p>
            {report.resolutionNote ? (
              <p className="text-muted">
                {t('admin.report.resolution')} <bdi>{report.resolutionNote}</bdi>
              </p>
            ) : null}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {report.connectionId ? (
                <button type="button" onClick={() => void openThread(report)} className="min-h-tap font-bold text-sign underline underline-offset-4">
                  {t('admin.report.openThread')}
                </button>
              ) : null}
              {report.lotId ? (
                <Link href={`/kits/auction/${report.lotId}`} prefetch={false} className="inline-flex min-h-tap items-center font-bold text-sign underline underline-offset-4">
                  {t('admin.report.openLot')}
                </Link>
              ) : null}
              {report.itemId ? (
                <>
                  <Link href={`/kits/market/item/${report.itemId}`} prefetch={false} className="inline-flex min-h-tap items-center font-bold text-sign underline underline-offset-4">
                    {t('admin.report.openItem')}
                  </Link>
                  <button type="button" onClick={() => setPending({ kind: 'suspend', report, itemId: report.itemId as string })} className="min-h-tap font-bold text-red underline underline-offset-4">
                    {t('admin.item.suspend')}
                  </button>
                  <button type="button" onClick={() => setPending({ kind: 'unsuspend', report, itemId: report.itemId as string })} className="min-h-tap font-bold text-ink underline underline-offset-4">
                    {t('admin.item.unsuspend')}
                  </button>
                </>
              ) : null}
            </div>
            {thread?.reportId === report.id ? <ThreadView thread={thread.thread} onClose={() => setThread(null)} /> : null}
          </div>
          {report.status === 'open' ? (
            <footer className="flex flex-wrap gap-2 border-t-rule border-ink p-4">
              {(['reviewed', 'actioned', 'dismissed'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setPending({ kind: 'resolve', report, status })}
                  className="min-h-tap border-rule border-ink bg-paper px-3 font-body text-step--1 font-extrabold text-ink"
                >
                  {t(STATUS_LABEL[status])}
                </button>
              ))}
            </footer>
          ) : null}
        </article>
      ))}
      {pending?.kind === 'resolve' ? (
        <ReasonDialog
          title={t('admin.report.resolveTitle', { status: t(STATUS_LABEL[pending.status]) })}
          confirm={t(STATUS_LABEL[pending.status])}
          onClose={() => setPending(null)}
          onConfirm={(note) => run(() => api.adminReportResolve(pending.report.id, pending.status, note), t('admin.report.resolved'))}
        />
      ) : null}
      {pending?.kind === 'suspend' ? (
        <ReasonDialog
          title={t('admin.item.suspendTitle')}
          body={t('admin.item.suspendBody')}
          confirm={t('admin.item.suspend')}
          onClose={() => setPending(null)}
          onConfirm={(note) => run(() => api.adminItemSuspend(pending.itemId, true, note), t('admin.item.suspended'))}
        />
      ) : null}
      {pending?.kind === 'unsuspend' ? (
        <ReasonDialog
          title={t('admin.item.unsuspendTitle')}
          body={t('admin.item.unsuspendBody')}
          confirm={t('admin.item.unsuspend')}
          reason="none"
          onClose={() => setPending(null)}
          onConfirm={() => run(() => api.adminItemSuspend(pending.itemId, false), t('admin.item.unsuspended'))}
        />
      ) : null}
    </div>
  )
}

const FROM_LABEL: Record<string, MessageKey> = {
  initiator: 'admin.thread.initiator',
  recipient: 'admin.thread.recipient',
  system: 'admin.thread.system',
}

function ThreadView({ thread, onClose }: { thread: Thread; onClose: () => void }) {
  const now = Date.now()
  return (
    <section className="mt-2 border-rule border-sign bg-paper p-3" aria-label={t('admin.report.thread')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-body text-step--1 font-extrabold text-sign">{t('admin.report.thread')}</p>
        <button type="button" onClick={onClose} className="min-h-tap px-2 font-body text-step--1 text-sign underline underline-offset-4">
          {t('admin.report.closeThread')}
        </button>
      </div>
      <p className="mt-1 flex flex-wrap items-baseline gap-2 font-body text-[12px] text-muted">
        {t('admin.thread.initiator')} <CollectorTag label={thread.initiator} compact /> · {t('admin.thread.recipient')} <CollectorTag label={thread.recipient} compact />
      </p>
      <p className="font-body text-[12px] text-muted">{t('admin.report.threadLogged')}</p>
      <ol className="mt-2 flex flex-col gap-1.5">
        {thread.messages.map((message) => (
          <li key={message.id} className="border-b-hair border-ink/20 pb-1.5 font-body text-step--1 text-ink">
            <span className="font-bold">{t(FROM_LABEL[message.from] ?? 'admin.thread.system')}</span>{' '}
            <span className="font-mono text-[11px] tabular-nums text-muted">{bidTimeText(message.createdAt, now)}</span>
            <p className="whitespace-pre-line">
              {message.kind === 'offer' && message.meta?.amount ? (
                formatPrice(message.meta.amount, message.meta.currency ?? 'ILS')
              ) : (
                <bdi>{message.body ?? ''}</bdi>
              )}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
