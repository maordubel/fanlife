import Link from 'next/link'
import {SHARED_GATES} from '@/lib/clubs/gates'
import {cleanDays,gateTitleKey,loadStats,PERIODS,type FunnelRow} from '@/lib/analytics/stats'
import {t} from '@/lib/i18n'
import {evaluationMode} from '@/lib/master/mode'
import {deskHref} from '@/lib/master/attention'

/**
 * Audience (plan §7), owner-session only — no QA guard, no key in the URL. Every number says what it is:
 * a visitor-day is not a person, "finished / viewed" is not completion among starters, a share click is not a delivery.
 * An unconnected store is "Not connected", never zero.
 */
const pct=(n:number,d:number)=>d?`${Math.round(n/d*100)}%`:'—'
function label(gate:string,clubNames:Record<string,string>):{club:string|null;name:string}{
 const m=/^\/clubs\/([a-z0-9-]+)\/([a-z-]+)$/.exec(gate)
 if(m){const g=SHARED_GATES.find(x=>x.key===m[2]);return {club:m[1]!,name:`${clubNames[m[1]!]||m[1]} · ${g?.name||(m[2]==='life'?'LIFE':m[2]!)}`}}
 const key=gateTitleKey(gate);return {club:null,name:key?`The Worker · ${t(key)}`:gate==='/away-days'?'The Worker · Away days':gate==='/life'?'The Worker · LIFE':gate}
}
export async function AudienceDesk({days:rawDays,club,clubNames}:{days?:string;club:string|null;clubNames:Record<string,string>}){
 const days=cleanDays(rawDays),stats=await loadStats(days)
 const store=evaluationMode()?'the evaluation database on this server instance (temporary — restarts empty it)':'the Supabase event tables'
 const rows:(FunnelRow&{club:string|null;name:string})[]=stats.state==='ok'?stats.funnel.map(r=>({...r,...label(r.gate,clubNames)})).filter(r=>r.visitors||r.starters||r.finishers):[]
 const shown=club?rows.filter(r=>r.club===club):rows
 return <section className="desk-panel" aria-labelledby="aud-h">
  <p className="desk-kicker">Audience</p><h1 id="aud-h" className="desk-h1">Where supporters enter, play and stop</h1>
  <nav className="desk-chips" aria-label="Period">{PERIODS.map(p=><Link key={p} className="desk-chip" aria-current={p===days?'true':undefined} href={deskHref('audience',{days:String(p),club:club||undefined})}>{p===1?'Today':`${p} days`}</Link>)}</nav>
  {stats.state==='unconfigured'&&<div className="desk-state" data-state="unconnected"><b>Not connected.</b> No event store is configured for this deployment, so there are no numbers to show — this is not zero traffic.</div>}
  {stats.state==='error'&&<div className="desk-state" data-state="error"><b>Unavailable.</b> The event store did not answer. Nothing here means zero.</div>}
  {stats.state==='ok'&&<>
   <p className="desk-fine">Read from {store}. Club-scoped routes are recorded from 7 October 2026; older events carry no club.</p>
   {shown.length===0?<div className="desk-state" data-state="empty"><b>No records in this period{club?' for this club':''}.</b></div>:
   <div className="desk-table-wrap" role="region" aria-label="Funnel by gate" tabIndex={0}><table className="desk-table">
    <thead><tr><th scope="col">Gate</th><th scope="col">Visitor-days</th><th scope="col">Started</th><th scope="col">Finished</th><th scope="col">Finished / viewed</th><th scope="col">Most left at step</th><th scope="col">Shares</th></tr></thead>
    <tbody>{shown.map(r=><tr key={r.gate}><th scope="row"><bdi>{r.name}</bdi><small>{r.gate}</small></th><td data-label="Visitor-days">{r.visitors}</td><td data-label="Started">{r.starters}</td><td data-label="Finished">{r.finishers}</td><td data-label="Finished / viewed">{pct(r.finishers,r.visitors)}</td><td data-label="Most left at step">{r.topLeaveStep===null?'—':`${r.topLeaveStep} (${r.topLeaveCount})`}</td><td data-label="Shares">{r.shares}</td></tr>)}</tbody>
   </table></div>}
   <details className="desk-defs"><summary>What these numbers mean</summary><ul>
    <li><b>Visitor-day</b> — one device on one day (a daily salted hash). The same person on two days counts twice; there is no cross-day unique count.</li>
    <li><b>Finished / viewed</b> — finishers divided by visitor-days that opened the gate. It is not completion among starters.</li>
    <li><b>Shares</b> — share buttons pressed. A press is not proof a message was sent or opened.</li>
    <li>The daily series is limited to the last 14 days even when a longer period is selected.</li>
    <li>Supporters who send Global Privacy Control or Do Not Track are not counted.</li>
   </ul></details>
  </>}
  <section className="desk-sub" aria-labelledby="comm-h"><h2 id="comm-h">Community</h2><p className="desk-fine">Shirt listings, contacts and moderation keep their own access checks.</p><Link className="desk-btn" href="/master/exchange">Open shirt economy ↗</Link></section>
 </section>
}
