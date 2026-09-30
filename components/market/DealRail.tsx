import { DEAL_STATIONS, dealStation, statusLabel, type DealStation } from '@/lib/collector/market'
import type { ConnectionStatus } from '@/lib/collector/types'
import { t, type MessageKey } from '@/lib/i18n'

const STATION: Record<DealStation, MessageKey> = {
  requested: 'market.station.requested',
  talking: 'market.station.talking',
  agreed: 'market.station.agreed',
  completed: 'market.station.completed',
}

/**
 * איפה העסקה — four stations punched into a ticket: בקשה → שיחה → סוכם → הושלם (spec §66). A
 * connection that ended without a deal does not pretend to be on the rail; it says how it ended.
 */
export function DealRail({ status }: { status: ConnectionStatus }) {
  const at = dealStation(status)
  return (
    <div className="border-rule border-ink bg-sheet px-3 py-2.5" data-deal-rail={status}>
      <p className="font-body text-[10.5px] font-extrabold tracking-widest text-sign">{t('market.thread.rail')}</p>
      {at < 0 ? (
        <p className="mt-1 font-sign text-step-1 leading-tight text-ink">{statusLabel(status)}</p>
      ) : (
        <ol className="mt-2 grid grid-cols-4 gap-1">
          {DEAL_STATIONS.map((station, index) => {
            const reached = index <= at
            return (
              <li key={station} className="flex flex-col items-center gap-1 text-center" aria-current={index === at ? 'step' : undefined}>
                <span
                  aria-hidden="true"
                  className={`block h-3 w-full border-hair ${reached ? (index === 3 ? 'border-red bg-red' : 'border-ink bg-ink') : 'border-dashed border-ink/50 bg-paper'}`}
                />
                <span className={`font-body text-[11px] leading-tight ${index === at ? 'font-extrabold text-ink' : reached ? 'text-ink' : 'text-muted'}`}>
                  {t(STATION[station])}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
