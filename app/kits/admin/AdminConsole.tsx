'use client'

import { useEffect, useState } from 'react'

import { useAuctionApi } from '@/components/auction/AuctionApi'
import { Num } from '@/components/ui/Num'
import type { AdminOverview } from '@/lib/collector/api'
import { errorLabel } from '@/lib/collector/labels'
import type { CollectorError } from '@/lib/collector/types'
import { t, type MessageKey } from '@/lib/i18n'

import { AdminAudit } from './AdminAudit'
import { AdminLots } from './AdminLots'
import { AdminReports } from './AdminReports'
import { AdminShops } from './AdminShops'

export const ADMIN_TABS = ['overview', 'pending', 'active', 'reports', 'shops', 'audit'] as const
export type AdminTab = (typeof ADMIN_TABS)[number]

const TAB_LABEL: Record<AdminTab, MessageKey> = {
  overview: 'admin.tab.overview',
  pending: 'admin.tab.pending',
  active: 'admin.tab.active',
  reports: 'admin.tab.reports',
  shops: 'admin.tab.shops',
  audit: 'admin.tab.audit',
}

/**
 * הקונסולה — שש לשוניות, ובכל אחת פעולה רגישה אחת לפחות שמבקשת סיבה. הלשונית לא נשמרת בשום
 * מקום: מי שנכנס מתחיל בסקירה, כי שם רואים מה מחכה.
 */
export function AdminConsole() {
  const [tab, setTab] = useState<AdminTab>('overview')
  return (
    <div className="mt-stack">
      <div role="tablist" aria-label={t('admin.tabs')} className="flex flex-wrap gap-1.5 border-b-plate border-ink pb-2">
        {ADMIN_TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={`min-h-tap border-rule px-3 font-sign text-[15px] font-bold ${tab === id ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-sheet text-ink'}`}
          >
            {t(TAB_LABEL[id])}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-5">
        {tab === 'overview' ? <Overview onOpen={setTab} /> : null}
        {tab === 'pending' ? <AdminLots scope="pending" /> : null}
        {tab === 'active' ? <AdminLots scope="active" /> : null}
        {tab === 'reports' ? <AdminReports /> : null}
        {tab === 'shops' ? <AdminShops /> : null}
        {tab === 'audit' ? <AdminAudit /> : null}
      </div>
    </div>
  )
}

const STATS: { key: keyof AdminOverview; label: MessageKey; tab?: AdminTab; loud?: boolean }[] = [
  { key: 'pendingLots', label: 'admin.stat.pendingLots', tab: 'pending', loud: true },
  { key: 'openReports', label: 'admin.stat.openReports', tab: 'reports', loud: true },
  { key: 'liveLots', label: 'admin.stat.liveLots', tab: 'active' },
  { key: 'awaitingLots', label: 'admin.stat.awaitingLots', tab: 'active' },
  { key: 'collectors', label: 'admin.stat.collectors' },
  { key: 'items', label: 'admin.stat.items' },
  { key: 'listed', label: 'admin.stat.listed' },
  { key: 'completed', label: 'admin.stat.completed' },
  { key: 'merchantOffers', label: 'admin.stat.merchantOffers', tab: 'shops' },
]

function Overview({ onOpen }: { onOpen: (tab: AdminTab) => void }) {
  const api = useAuctionApi()
  const [data, setData] = useState<AdminOverview | null>(null)
  const [error, setError] = useState<CollectorError | null>(null)
  useEffect(() => {
    void api.adminOverview().then((result) => {
      if (result.ok) setData(result)
      else setError(result.error)
    })
  }, [api])
  if (error) return <p role="alert" className="font-body text-step--1 font-extrabold text-red">{errorLabel(error)}</p>
  if (!data) return <p className="font-sign text-step-1 text-muted">{t('auction.loading')}</p>
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-admin-overview="">
      {STATS.map((stat) => {
        const value = data[stat.key]
        const hot = stat.loud && value > 0
        const body = (
          <>
            <span className={`font-poster text-[44px] leading-none ${hot ? 'text-paper' : 'text-ink'}`}>
              <Num>{String(value)}</Num>
            </span>
            <span className={`mt-1 font-body text-step--1 font-bold leading-snug ${hot ? 'text-paper' : 'text-muted'}`}>{t(stat.label)}</span>
          </>
        )
        const frame = `flex h-full w-full flex-col items-start border-plate p-3 text-start ${hot ? 'border-red bg-red' : 'border-ink bg-sheet'}`
        return (
          <li key={stat.key}>
            {stat.tab ? (
              <button type="button" onClick={() => onOpen(stat.tab as AdminTab)} className={`min-h-tap ${frame}`}>
                {body}
              </button>
            ) : (
              <div className={frame}>{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
