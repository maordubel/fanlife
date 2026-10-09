import type { Metadata } from 'next'

import { Shell } from '@/components/master/Shell'
import { AdminContributions } from '@/components/fanlife/admin/AdminContributions'
import { fl } from '@/lib/fanlife/copy'
import { requireAdmin } from '@/lib/master/admin'

export const metadata: Metadata = { title: fl('contrib.admin.title'), robots: { index: false, follow: false, nocache: true } }
export const dynamic = 'force-dynamic'

/** Photos offered to the archive (no owner shown) and the club merge. The database decides who may act. */
export default function ContributionsAdminPage() {
  requireAdmin('/master/contributions')
  return (
    <Shell locale="en">
      <main id="main" className="mag-section fl-corner">
        <hr className="mag-rule" />
        <div className="mag-head"><div><p className="mag-kicker">{fl('exchange.kicker')}</p><h1 className="mag-h2">{fl('contrib.admin.title')}</h1><p className="mag-fine">{fl('contrib.admin.sub')}</p></div></div>
        <div className="fl-worker" dir="ltr" lang="en"><AdminContributions /></div>
      </main>
    </Shell>
  )
}
