import type {Metadata} from 'next'
import Link from 'next/link'
import {Shell} from '@/components/master/Shell'
import {Plate} from '@/components/weekly/Plate'
import {ShopCard} from '@/components/shop/ShopStrip'
import {publicShop} from '@/lib/shop/store'
import {subjectName} from '@/lib/shop/subjects'
import {KINDS} from '@/lib/shop/types'
import copy from '@/messages/en.shop.json'
import '../weekly/shop.css'
export const dynamic='force-dynamic'
export async function generateMetadata():Promise<Metadata>{const s=await publicShop().catch(()=>null);return {title:copy.title,description:copy.seoDesc,alternates:{canonical:'/shop'},robots:s?.open&&s.products.length?undefined:{index:false}}}

/**
 * THE SHOP (owner, 12.11.2026) — the weekly's mail-order page. One hook, the shelves as wrapping chips (never a rail),
 * two cards a row on a phone, one Buy button a card (the checkout is Printify's Pop-Up store), and the door to the
 * supporters' shirt market under it: new prints here, the real shirts there — one counter, two shelves.
 */
export default async function Shop({searchParams}:{searchParams:{club?:string;kind?:string}}){
 const shop=await publicShop(),all=shop.products
 const subjects=[...new Set(all.map(p=>p.subject))].sort((a,b)=>a==='fanlife'?-1:b==='fanlife'?1:subjectName(a).localeCompare(subjectName(b)))
 const who=subjects.includes(searchParams.club||'')?searchParams.club!:null,mine=who?all.filter(p=>p.subject===who):all
 const kinds=KINDS.filter(k=>mine.some(p=>p.kind===k)),kind=kinds.find(k=>k===searchParams.kind)??null,list=kind?mine.filter(p=>p.kind===kind):mine
 const href=(c:string|null,k:string|null)=>{const q=new URLSearchParams();if(c)q.set('club',c);if(k)q.set('kind',k);const s=q.toString();return s?`/shop?${s}`:'/shop'}
 const market=<aside className="wks-market wk-redplate" aria-labelledby="wks-mk-h"><Plate art="swap" ink="red" className="wks-market-art"/>
  <div><p className="wk-k white">{copy.marketK}</p><h2 className="wk-head white" id="wks-mk-h">{copy.marketT}</h2><p className="wk-small white">{copy.marketSub}</p>
  <Link className="wk-btn paper min-h-tap" href={who?`/market?club=${who}`:'/market'}>{copy.marketCta} <span aria-hidden="true">→</span></Link></div></aside>
 return <Shell locale="en"><main id="main" className="wks">
  <header className="wks-head wk-greenplate"><span className="wk-speed" aria-hidden="true"/><Plate art="scarf" ink="orange" className="wks-head-art"/>
   <div><p className="wk-banner">{shop.open&&all.length?copy.kicker:copy.soonK}</p><h1 className="wk-logo wks-h1">{shop.open&&all.length?copy.h1:copy.soonT}</h1><p className="wk-small white">{shop.open&&all.length?copy.sub:copy.soonSub}</p></div>
  </header>
  {all.length>0&&<>
   {subjects.length>1&&<nav className="wks-chips" aria-label={copy.title}><Link className="wks-chip min-h-tap" href={href(null,null)} aria-current={!who?'page':undefined}>{copy.all}</Link>
    {subjects.map(s=><Link key={s} className="wks-chip min-h-tap" href={href(s,null)} aria-current={who===s?'page':undefined}>{s==='fanlife'?copy.house:subjectName(s)}</Link>)}</nav>}
   {kinds.length>1&&<nav className="wks-chips small" aria-label={copy.title}>{kinds.map(k=><Link key={k} className="wks-chip min-h-tap" href={href(who,kind===k?null:k)} aria-current={kind===k?'true':undefined}>{copy.kinds[k]}</Link>)}</nav>}
   {list.length?<ul className="wks-grid">{list.map(p=><ShopCard key={p.id} p={p}/>)}</ul>:<p className="wk-small">{copy.empty}</p>}
  </>}
  {market}
  {all.length>0&&<p className="wk-small wks-note">{copy.note}</p>}
 </main></Shell>
}
