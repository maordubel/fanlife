import Link from 'next/link'
import {AdminGate} from '@/components/fanlife/admin/AdminGate'
import {AdminContributions} from '@/components/fanlife/admin/AdminContributions'
import {fl} from '@/lib/fanlife/copy'

/**
 * Market and Community inside the desk frame (CRM 1 §5.5–5.6, CRM 2 §4.7): ONE frame, the SAME consoles. Who may act is
 * still decided by the database (`worker_admin_whoami` + RLS) on top of the owner key — the desk adds navigation, never a
 * write path or a copy of seller records. A browser that is not a database admin sees the console's own 404.
 */
export function MarketDesk(){
 return <div className="desk-content">
  <header className="desk-head"><p className="desk-kicker">Market</p><h1 className="desk-h1">{fl('exchange.title')}</h1>
   <p className="desk-fine">{fl('exchange.sub')} Sellers appear by collector number only; contact details are never shown here.</p>
   <p className="desk-actions"><Link className="desk-btn ghost" href="/master/exchange">Open full screen ↗</Link><Link className="desk-btn ghost" href="/market" target="_blank">Public market ↗</Link></p></header>
  <div className="fl-worker crm-embed" dir="ltr" lang="en"><AdminGate/></div>
 </div>
}
export function CommunityDesk(){
 return <div className="desk-content">
  <header className="desk-head"><p className="desk-kicker">Community</p><h1 className="desk-h1">{fl('contrib.admin.title')}</h1>
   <p className="desk-fine">{fl('contrib.admin.sub')}</p>
   <p className="desk-actions"><Link className="desk-btn ghost" href="/master/contributions">Open full screen ↗</Link></p></header>
  <div className="fl-worker crm-embed" dir="ltr" lang="en"><AdminContributions/></div>
 </div>
}
