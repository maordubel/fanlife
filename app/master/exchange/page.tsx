import type { Metadata } from 'next'

import { Shell } from '@/components/master/Shell'
import { AdminGate } from '@/components/fanlife/admin/AdminGate'
import { fl } from '@/lib/fanlife/copy'

export const metadata: Metadata = { title: fl('exchange.title'), robots: { index: false, follow: false, nocache: true } }

/**
 * The shirt economy's admin console (lots to approve and schedule, reports, shops, audit) — The
 * Worker's /kits/admin, forked to English. Who may act is decided by the database
 * (`worker_admin_whoami`); a non-admin sees an ordinary 404.
 */
export default function ExchangeAdminPage() {
  return (
    <Shell locale="en">
      <main id="main" className="mag-section fl-corner">
        <hr className="mag-rule" />
        <div className="mag-head"><div><p className="mag-kicker">{fl('exchange.kicker')}</p><h1 className="mag-h2">{fl('exchange.title')}</h1><p className="mag-fine">{fl('exchange.sub')}</p></div></div>
        <div className="fl-worker" dir="ltr" lang="en"><AdminGate /></div>
      </main>
    </Shell>
  )
}
