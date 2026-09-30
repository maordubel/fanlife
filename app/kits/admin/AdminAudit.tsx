'use client'

import { useCallback, useEffect, useState } from 'react'

import { useAuctionApi } from '@/components/auction/AuctionApi'
import { EmptyState } from '@/components/ui/EmptyState'
import type { AuditEntry } from '@/lib/collector/api'
import { auctionErrorLabel, whenText } from '@/lib/collector/auction'
import { handleLabel } from '@/lib/collector/labels'
import type { CollectorError } from '@/lib/collector/types'
import { t, type MessageKey } from '@/lib/i18n'

const ENTITIES = [
  'all',
  'worker_auction_lot',
  'worker_auction_bid',
  'worker_collector_report',
  'worker_collector_item',
  'worker_collector_connection',
  'worker_merchant_offer',
  'worker_admin',
] as const
type Entity = (typeof ENTITIES)[number]

const ENTITY_LABEL: Record<Entity, MessageKey> = {
  all: 'admin.audit.entity.all',
  worker_auction_lot: 'admin.audit.entity.lot',
  worker_auction_bid: 'admin.audit.entity.bid',
  worker_collector_report: 'admin.audit.entity.report',
  worker_collector_item: 'admin.audit.entity.item',
  worker_collector_connection: 'admin.audit.entity.connection',
  worker_merchant_offer: 'admin.audit.entity.shop',
  worker_admin: 'admin.audit.entity.admin',
}

const ACTION_LABEL: Record<string, MessageKey> = {
  insert: 'admin.audit.action.insert',
  update: 'admin.audit.action.update',
  delete: 'admin.audit.action.delete',
  read: 'admin.audit.action.read',
  suspend: 'admin.audit.action.suspend',
  unsuspend: 'admin.audit.action.unsuspend',
}

/** היומן (מפרט §38, §65) — נכתב בטריגר על הטבלאות עצמן, כולל עדכון ידני מה-SQL Editor. */
export function AdminAudit() {
  const api = useAuctionApi()
  const [entity, setEntity] = useState<Entity>('all')
  const [entries, setEntries] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState<CollectorError | null>(null)
  const load = useCallback(async () => {
    const result = await api.adminAudit(150, entity === 'all' ? null : entity)
    if (result.ok) {
      setError(null)
      setEntries(result.entries)
    } else setError(result.error)
  }, [api, entity])
  useEffect(() => {
    setEntries(null)
    void load()
  }, [load])
  return (
    <div className="flex flex-col gap-4" data-admin-audit="">
      <label className="font-body text-step--1 font-extrabold text-ink">
        {t('admin.audit.filter')}
        <select value={entity} onChange={(event) => setEntity(event.target.value as Entity)} className="mt-1 block min-h-tap w-full max-w-xs border-rule border-ink bg-paper px-2 font-body text-step-0 font-normal text-ink">
          {ENTITIES.map((key) => (
            <option key={key} value={key}>
              {t(ENTITY_LABEL[key])}
            </option>
          ))}
        </select>
      </label>
      {error ? <p role="alert" className="font-body text-step--1 font-extrabold text-red">{auctionErrorLabel({ error })}</p> : null}
      {!entries && !error ? <p className="font-sign text-step-1 text-muted">{t('auction.loading')}</p> : null}
      {entries && entries.length === 0 ? <EmptyState title={t('admin.audit.empty')} body={t('admin.audit.emptyBody')} /> : null}
      {entries && entries.length > 0 ? (
        <ol className="flex flex-col">
          {entries.map((entry) => (
            <li key={entry.id} className="border-b-hair border-ink/30 py-2 font-body text-step--1 text-ink">
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="font-extrabold">{t(ACTION_LABEL[entry.action] ?? 'admin.audit.action.update')}</span>
                <span>{t(ENTITY_LABEL[(ENTITIES as readonly string[]).includes(entry.entity) ? (entry.entity as Entity) : 'all'])}</span>
                <span className="text-muted">{entry.actor ? <bdi>{handleLabel(entry.actor)}</bdi> : t('admin.audit.system')}</span>
                <span className="text-muted">{whenText(entry.at)}</span>
              </p>
              {entry.detail ? (
                <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all bg-sheet p-2 font-mono text-[11px] tabular-nums text-muted" dir="ltr">
                  {JSON.stringify(entry.detail)}
                </pre>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}
