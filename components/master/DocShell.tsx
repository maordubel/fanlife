import Link from 'next/link'
import type {ReactNode} from 'react'
import {Shell} from '@/components/master/Shell'

/** The four pages Google asks every publisher for (docs/fanlife/ADSENSE-APPROVAL.md §3), set as one back page of THE WEEKLY. */
export const GAMES_URL = 'https://www.dubelteam.com/games.html'
export const CONTACT_EMAIL = 'archive@dubelteam.com'
export const LAST_REVIEWED = '30 October 2026'

export const DOC_LINKS = [
 {href:'/about',label:'About'},
 {href:'/privacy',label:'Privacy'},
 {href:'/terms',label:'Terms'},
 {href:'/contact',label:'Contact'},
] as const

export function DocShell({kicker,title,lede,children}:{kicker:string;title:string;lede:string;children:ReactNode}){
 return <Shell locale="en"><main id="main" className="wkh-doc">
  <header className="wkh-doc-head">
   <p className="wk-banner">{kicker}</p>
   <h1 className="wk-head wkh-title">{title}</h1>
   <p className="wkh-doc-lede">{lede}</p>
   <p className="wk-k wk-muted">Last reviewed {LAST_REVIEWED}</p>
  </header>
  <article className="wkh-doc-body">{children}</article>
  <nav className="wkh-doc-nav" aria-label="FAN LIFE pages">
   {DOC_LINKS.map(l=><Link key={l.href} href={l.href}>{l.label}</Link>)}
   <Link href="/sources">Sources &amp; credits</Link>
   <a href={GAMES_URL}>More games by Dubel Team ↗</a>
  </nav>
 </main></Shell>
}
