import Link from 'next/link'
import type {ReactNode} from 'react'
import {LogoutButton} from '@/components/master/LogoutButton'
import {deskHref} from '@/lib/master/attention'

/**
 * The Editor's Desk frame (plan §2, §3, §10): the control room's own chrome — never the public masthead, stop-press
 * strip or bottom tab bar. Desktop: a ruled sidebar. Phone: a compact top bar and the desk's own bottom navigation
 * (Overview · Clubs · Data · Audience · More). The `fl mag` classes stay on the root so the existing panels keep
 * their dress; everything new is scoped under `.desk`.
 */
export const SECTIONS=[
 {key:'overview',label:'Overview',hint:'What needs attention'},
 {key:'clubs',label:'Clubs',hint:'Each club’s state'},
 {key:'data',label:'Data',hint:'Sources and collection'},
 {key:'audience',label:'Audience',hint:'Who plays, where they stop'},
 {key:'operations',label:'Operations',hint:'Runs, storage, schedules'},
 {key:'settings',label:'Settings',hint:'What the app does'},
] as const
export type Section=typeof SECTIONS[number]['key']|'more'

const ICON:Record<string,ReactNode>={
 overview:<path d="M4 5h16M4 12h10M4 19h7"/>,
 clubs:<><circle cx="12" cy="12" r="8"/><path d="M12 8l3.5 2.6-1.3 4.4h-4.4L8.5 10.6z"/></>,
 data:<><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/></>,
 audience:<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>,
 more:<><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></>,
}
const Icon=({k}:{k:string})=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">{ICON[k]}</svg>

export function AdminShell({section,club,clubName,owner,children}:{section:Section;club:string|null;clubName:string|null;owner:boolean;children:ReactNode}){
 const keep=(s:string)=>s==='clubs'||s==='data'||s==='audience'?{club:club||undefined}:{}
 return <div className="fl mag desk" lang="en" dir="ltr">
  <a className="desk-skip" href="#desk-main">Skip to the desk</a>
  <header className="desk-top">
   <Link href={deskHref('overview')} className="desk-brand" aria-label="FAN LIFE control room — overview"><img src="/brand/fanlife/logo-96.png" alt="" width={32} height={32}/><span>FAN LIFE<small>The editor’s desk</small></span></Link>
   <p className="desk-scope" aria-live="polite"><span>Scope</span><b>{club&&clubName?<bdi>{clubName}</bdi>:'All clubs'}</b>{club?<Link href={deskHref(section==='more'?'overview':section)} className="desk-scope-x" aria-label="Show all clubs">×</Link>:null}</p>
   <div className="desk-top-actions"><a className="desk-site" href="/" target="_blank" rel="noreferrer">View site ↗</a>{owner&&<span className="desk-hide-sm"><LogoutButton/></span>}</div>
  </header>
  <div className="desk-body">
   <nav className="desk-side" aria-label="Control room">
    <ol>{SECTIONS.map((s,i)=><li key={s.key}><Link href={deskHref(s.key,keep(s.key))} aria-current={section===s.key?'page':undefined}><span className="desk-no">{String(i+1).padStart(2,'0')}</span><span><b>{s.label}</b><small>{s.hint}</small></span></Link></li>)}</ol>
    <p className="desk-side-foot"><Link href="/master/test-lab">Test lab ↗</Link><Link href="/master/core">Club data ↗</Link><Link href="/master/exchange">Shirt economy ↗</Link></p>
   </nav>
   <main id="desk-main" className="desk-main" tabIndex={-1}>{children}</main>
  </div>
  <nav className="desk-bottom" aria-label="Control room">
   {(['overview','clubs','data','audience'] as const).map(k=><Link key={k} href={deskHref(k,keep(k))} aria-current={section===k?'page':undefined}><Icon k={k}/>{SECTIONS.find(s=>s.key===k)!.label}</Link>)}
   <Link href={deskHref('more')} aria-current={section==='more'||section==='operations'||section==='settings'?'page':undefined}><Icon k="more"/>More</Link>
  </nav>
 </div>
}

/** The phone's "More": the sections and tools that do not fit on the bar. */
export function MoreMenu({owner}:{owner:boolean}){
 return <section className="desk-panel" aria-labelledby="more-h"><h1 id="more-h" className="desk-h1">More</h1>
  <ul className="desk-list">
   <li><Link href={deskHref('operations')}><b>Operations</b><small>Runs, storage, schedules, activity</small></Link></li>
   <li><Link href={deskHref('settings')}><b>Settings</b><small>LIFE display, access</small></Link></li>
   <li><Link href="/master/test-lab"><b>Test lab ↗</b><small>Verification tools</small></Link></li>
   <li><Link href="/master/core"><b>Club data ↗</b><small>Compiler diagnostics and evidence</small></Link></li>
   <li><Link href="/master/exchange"><b>Shirt economy ↗</b><small>Moderation and economy controls</small></Link></li>
   <li><a href="/" target="_blank" rel="noreferrer"><b>View site ↗</b><small>The public FAN LIFE</small></a></li>
  </ul>
  {owner&&<div className="desk-signout"><LogoutButton/></div>}
 </section>
}
