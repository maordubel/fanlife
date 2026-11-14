'use client'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {useMarketAlerts} from '@/lib/fanlife/alerts'
import type {UiLocale} from '@/lib/clubs/locale'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
import {ArcLabel} from '@/components/weekly/ArcLabel'
import {CHANNEL} from '@/lib/stories/channel'

const ICON={fill:'none',stroke:'currentColor',strokeWidth:2.5,'aria-hidden':true,width:22,height:22,viewBox:'0 0 24 24'} as const

/**
 * The phone's bottom bar: fixed to the glass on every magazine page and every club page (owner, 7.10.2026 —
 * "a fixed bottom menu, on all pages, on mobile"). Five doors, every one a real page or a real anchor.
 */
export function TabBar({locale='en',shop=false}:{locale?:UiLocale;/** the shop sells something (Shell asks the server) */shop?:boolean}) {
 const copy=locale==='he'?he:en,path=usePathname()||'/',{unread}=useMarketAlerts()
 const at=(p:string)=>p==='/'?path==='/':path===p||path.startsWith(p+'/')
 type Tab={href:string;label:string;icon:JSX.Element;on:boolean;out?:boolean}
 const home:Tab={href:'/',label:copy.home,icon:<svg {...ICON}><path d="M3 11l9-7 9 7v9H3z"/></svg>,on:at('/')}
 const clubs:Tab={href:'/#clubs',label:copy.tabClubs,icon:<svg {...ICON}><circle cx="12" cy="12" r="9"/><path d="M12 8l4 3-1.5 5h-5L8 11z"/></svg>,on:path.startsWith('/clubs')&&!path.endsWith('/life')}
 const shopT:Tab={href:'/shop',label:copy.tabShop,icon:<svg {...ICON}><path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/></svg>,on:at('/shop')}
 const market:Tab={href:'/market',label:copy.tabMarket,icon:<svg {...ICON}><path d="M8 3l-5 4 3 4 2-1v11h8V10l2 1 3-4-5-4c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3z"/></svg>,on:at('/market')}
 const watch:Tab={href:`${CHANNEL.url}?utm_source=fanlife&utm_medium=tabbar`,label:copy.tabWatch,icon:<svg {...ICON}><rect x="2.5" y="5" width="19" height="14" rx="1"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>,on:false,out:true}
 const me:Tab={href:'/me',label:copy.tabCorner,icon:<svg {...ICON}><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>,on:at('/me')}
 // three a side round the raised OUR GAMES coin (owner, 14.11.2026: "order the bottom bar, add, make it prettier"):
 // where to go on the left (home, clubs, the shop), what is yours on the right (the market, the channel, me)
 const left=shop?[home,clubs,shopT]:[home,clubs,market],right=shop?[market,watch,me]:[watch,me]
 const games=at('/our-games')||path.endsWith('/life')
 const tab=(t:Tab)=>t.out
  ?<a key={t.href} className="mag-tab" href={t.href} target="_blank" rel="noopener">{t.icon}<span className="mag-tab-l">{t.label}</span></a>
  :<Link key={t.href} className="mag-tab" href={t.href} aria-current={t.on?'page':undefined} aria-label={t.href==='/market'&&unread>0?`${t.label} — ${unread}`:undefined}>
   {t.href==='/market'&&unread>0?<span className="mag-tab-ico">{t.icon}<b className="mag-tab-dot" data-market-badge="">{unread>9?'9+':unread}</b></span>:t.icon}<span className="mag-tab-l">{t.label}</span></Link>
 return <nav className="mag-tabbar" data-ourgames="" data-count={left.length+right.length+1} aria-label={copy.primaryNav}>
  {left.map(tab)}
  <Link href="/our-games" aria-current={games?'page':undefined}><svg {...ICON}><circle cx="12" cy="4.6" r="2.7"/><path d="M12 7.3v6M3.5 20v-4.2c0-1.4 1.1-2.5 2.5-2.5h12c1.4 0 2.5 1.1 2.5 2.5V20z"/><path d="M7 16.5h3M16 16.9h.01M18.3 16.9h.01"/></svg><span className="sr-only">{copy.tabOurGames}</span><ArcLabel id="tab-arc" text={copy.tabOurGames}/></Link>
  {right.map(tab)}
 </nav>
}
