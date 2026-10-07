import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { Screen } from '@/components/ui/Screen'
import { cleanDays, gateTitleKey, loadStats, statsKeyOk } from '@/lib/analytics/stats'
import { gateNumberOf } from '@/lib/analytics/events'
import { t } from '@/lib/i18n'
import { adminSession } from '@/lib/master/admin'
import { loginPath } from '@/lib/master/admin-token'
import { qaAllowed } from '@/lib/qa'

import { DEMO } from './fixtures'
import { StatsBoard, type StatsRowView } from './StatsBoard'

/**
 * המספרים — how many come into each gate, how many start, how many finish, and where the
 * rest leave (delta 89; Maor: "כמה נכנסים לכל שער, איפה עוזבים").
 *
 * Behind the /qa gate like every harness, and then owner only: the control-room session (`requireAdmin`, audit F01 — open in `next dev`
 * with no owner key set), or `?key=` equal to the server env var `WORKER_STATS_KEY` —
 * checked on the server, in constant time. Everybody else is sent to the login page. The numbers come from `worker_events_funnel` / `_blind_cow`, which only
 * the service key may call (`lib/analytics/stats.ts`).
 */
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'stats', robots: { index: false, follow: false } }

export default async function StatsPage({ searchParams }: { searchParams: { key?: string; days?: string; demo?: string } }) {
  const keyed = statsKeyOk(searchParams.key)
  if (!qaAllowed() && !keyed) notFound()
  // owner only (audit F01): the admin session, or the existing WORKER_STATS_KEY link — never evaluation mode
  if (!keyed && !adminSession()) redirect(loginPath('/qa/stats'))
  const days = cleanDays(searchParams.days)
  const demo = qaAllowed() && searchParams.demo === '1'
  const stats = demo ? DEMO : await loadStats(days)

  const rows: StatsRowView[] =
    stats.state === 'ok'
      ? stats.funnel.map((row) => {
          const key = gateTitleKey(row.gate)
          return {
            ...row,
            number: gateNumberOf(row.gate),
            label: key ? t(key) : row.gate === '/away-days' ? t('away.title') : row.gate === '/life' ? t('connect.stats.life') : row.gate,
          }
        })
      : []

  return (
    <Screen title={t('connect.stats.title')} sub={t('connect.stats.sub')} stage>
      <StatsBoard
        state={stats.state}
        days={days}
        rows={rows}
        blindCow={stats.state === 'ok' ? stats.blindCow : null}
        demo={demo}
        query={{ key: keyed ? (searchParams.key as string) : null, demo }}
      />
    </Screen>
  )
}
