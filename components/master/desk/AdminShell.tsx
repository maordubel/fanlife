import Link from 'next/link'
import type {ReactNode} from 'react'
import {LogoutButton} from '@/components/master/LogoutButton'
import {deskHref} from '@/lib/master/attention'
import {DeskSearch} from './DeskSearch'

/**
 * The Editor's Desk frame (rule 99; CRM 1 §3, owner roadmap 12.10.2026): the control room's own chrome — never the
 * public masthead, stop-press strip or bottom tab bar. Seven WORK areas, ordered by what the owner does, then the
 * TOOLS. Desktop: a ruled sidebar with search in the top bar. Phone: a compact bar, search one tap away, and the desk's
 * own bottom navigation (Desk · Clubs · Players · Games · More). The `fl mag` classes stay on the root so existing
 * panels keep their dress; everything new is scoped under `.desk`.
 */
import {SECTIONS,TOOLS,type Section} from '@/lib/master/crm/areas'
export {SECTIONS,TOOLS,type Section}

const ICON:Record<string,ReactNode>={
 overview:<path d="M4 5h16M4 12h10M4 19h7"/>,
 clubs:<><circle cx="12" cy="12" r="8"/><path d="M12 8l3.5 2.6-1.3 4.4h-4.4L8.5 10.6z"/></>,
 players:<><circle cx="12" cy="7.5" r="3.5"/><path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6"/></>,
 games:<><rect x="3" y="4" width="18" height="16"/><path d="M3 10h18M9 4v16M15 4v16"/></>,
 more:<><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></>,
}
const Icon=({k}:{k:string})=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">{ICON[k]}</svg>
/** areas that read a club scope keep it when you move between them; the rest are application-wide */
const SCOPED=new Set(['clubs','players','games','data','audience'])

export function AdminShell({section,club,clubName,owner,children,counts}:{section:Section;club:string|null;clubName:string|null;owner:boolean;children:ReactNode;counts?:{tasks:number;blocking:number}}){
 const keep=(s:string)=>SCOPED.has(s)?{club:club||undefined}:{}
 const onMore=section==='more'||TOOLS.some(t=>t.key===section)||section==='market'||section==='community'||section==='audience'
 return <div className="fl mag desk" lang="en" dir="ltr">
  <a className="desk-skip" href="#desk-main">Skip to the desk</a>
  <header className="desk-top">
   <Link href={deskHref('overview')} className="desk-brand" aria-label="FAN LIFE control room — the desk"><img src="/brand/fanlife/logo-96.png" alt="" width={32} height={32}/><span>FAN LIFE<small>The editor’s desk</small></span></Link>
   <DeskSearch club={club}/>
   <p className="desk-scope" aria-live="polite"><span>Scope</span><b>{club&&clubName?<bdi>{clubName}</bdi>:'All clubs'}</b>{club?<Link href={deskHref(section==='more'?'overview':section)} className="desk-scope-x" aria-label="Show all clubs">×</Link>:null}</p>
   <div className="desk-top-actions"><a className="desk-site" href="/" target="_blank" rel="noreferrer">View site ↗</a>{owner&&<span className="desk-hide-sm"><LogoutButton/></span>}</div>
  </header>
  <div className="desk-body">
   <nav className="desk-side" aria-label="Control room">
    <ol>{SECTIONS.map((s,i)=><li key={s.key}><Link href={deskHref(s.key,keep(s.key))} aria-current={section===s.key?'page':undefined}><span className="desk-no">{String(i+1).padStart(2,'0')}</span><span><b>{s.label}{s.key==='overview'&&counts&&counts.tasks>0?<em className="desk-count" data-hot={counts.blocking>0||undefined} aria-label={`${counts.tasks} open`}>{counts.tasks}</em>:null}</b><small>{s.hint}</small></span></Link></li>)}</ol>
    <p className="desk-side-label">Tools</p>
    <ul className="desk-tools">{TOOLS.map(t=><li key={t.key}><Link href={deskHref(t.key,keep(t.key))} aria-current={section===t.key?'page':undefined}><b>{t.label}</b><small>{t.hint}</small></Link></li>)}</ul>
    <p className="desk-side-foot"><Link href="/master/test-lab">Test lab ↗</Link><Link href="/master/core">Compiler diagnostics ↗</Link></p>
   </nav>
   <main id="desk-main" className="desk-main" tabIndex={-1}>{children}</main>
  </div>
  <nav className="desk-bottom" aria-label="Control room">
   {(['overview','clubs','players','games'] as const).map(k=><Link key={k} href={deskHref(k,keep(k))} aria-current={section===k?'page':undefined}><Icon k={k}/>{SECTIONS.find(s=>s.key===k)!.label}{k==='overview'&&counts&&counts.tasks>0?<em className="desk-count" data-hot={counts.blocking>0||undefined}>{counts.tasks}</em>:null}</Link>)}
   <Link href={deskHref('more')} aria-current={onMore?'page':undefined}><Icon k="more"/>More</Link>
  </nav>
 </div>
}

/** The phone's "More": the areas and tools that do not fit on the bar. */
export function MoreMenu({owner}:{owner:boolean}){
 const rows=[...SECTIONS.filter(s=>!['overview','clubs','players','games'].includes(s.key)),...TOOLS]
 return <section className="desk-panel" aria-labelledby="more-h"><h1 id="more-h" className="desk-h1">More</h1>
  <ul className="desk-list">
   {rows.map(r=><li key={r.key}><Link href={deskHref(r.key)}><b>{r.label}</b><small>{r.hint}</small></Link></li>)}
   <li><Link href="/master/test-lab"><b>Test lab ↗</b><small>Verification tools</small></Link></li>
   <li><Link href="/master/core"><b>Compiler diagnostics ↗</b><small>Club packs, evidence, codes</small></Link></li>
   <li><a href="/" target="_blank" rel="noreferrer"><b>View site ↗</b><small>The public FAN LIFE</small></a></li>
  </ul>
  {owner&&<div className="desk-signout"><LogoutButton/></div>}
 </section>
}
