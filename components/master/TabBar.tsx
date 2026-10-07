'use client'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import type {UiLocale} from '@/lib/clubs/locale'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'

const ICON={fill:'none',stroke:'currentColor',strokeWidth:2.5,'aria-hidden':true,width:22,height:22,viewBox:'0 0 24 24'} as const

/**
 * The phone's bottom bar: fixed to the glass on every magazine page and every club page (owner, 7.10.2026 —
 * "a fixed bottom menu, on all pages, on mobile"). Five doors, every one a real page or a real anchor.
 */
export function TabBar({locale='en'}:{locale?:UiLocale}) {
 const copy=locale==='he'?he:en,path=usePathname()||'/'
 const at=(p:string)=>p==='/'?path==='/':path===p||path.startsWith(p+'/')
 const tabs:[string,string,JSX.Element,boolean][]=[
  ['/',copy.home,<svg key="h" {...ICON}><path d="M3 11l9-7 9 7v9H3z"/></svg>,at('/')],
  ['/#clubs',copy.tabClubs,<svg key="c" {...ICON}><circle cx="12" cy="12" r="9"/><path d="M12 8l4 3-1.5 5h-5L8 11z"/></svg>,path.startsWith('/clubs')&&!path.endsWith('/life')],
  ['/#life',copy.tabLife,<svg key="l" {...ICON}><path d="M6 4h12v16l-6-4-6 4z"/></svg>,path.endsWith('/life')],
  ['/market',copy.tabMarket,<svg key="m" {...ICON}><path d="M8 3l-5 4 3 4 2-1v11h8V10l2 1 3-4-5-4c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3z"/></svg>,at('/market')],
  ['/me',copy.tabCorner,<svg key="u" {...ICON}><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>,at('/me')],
 ]
 return <nav className="mag-tabbar" aria-label={copy.primaryNav}>
  {tabs.map(([href,label,icon,on])=><Link key={href} href={href} aria-current={on?'page':undefined}>{icon}{label}</Link>)}
 </nav>
}
