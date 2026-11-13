import type {Metadata} from 'next'
import Link from 'next/link'
import {Shell} from '@/components/master/Shell'
import {Plate} from '@/components/weekly/Plate'
import {ShopCard,isNew} from '@/components/shop/ShopStrip'
import {publicShop} from '@/lib/shop/store'
import {subjectName} from '@/lib/shop/subjects'
import {REGISTRY} from '@/lib/master/registry'
import type {PublicProduct,Shelf} from '@/lib/shop/types'
import copy from '@/messages/en.shop.json'
import '../weekly/shop.css'
export const dynamic='force-dynamic'
export async function generateMetadata():Promise<Metadata>{const s=await publicShop().catch(()=>null);return {title:copy.title,description:copy.seoDesc,alternates:{canonical:'/shop'},robots:s?.open&&s.products.length?undefined:{index:false}}}

type ShelfId=Shelf|'new'|'gifts'
const SHELVES:ShelfId[]=['new','wall','wear','gear','gifts','home','kids','small']
const GIFT_EUR=25
const inShelf=(p:PublicProduct,id:ShelfId)=>id==='new'?isNew(p):id==='gifts'?(p.eur??p.priceFrom/100)<=GIFT_EUR:p.shelf===id
const SORTS=['new','low','high'] as const
const sorted=(l:PublicProduct[],s:(typeof SORTS)[number])=>[...l].sort((a,b)=>s==='low'?a.priceFrom-b.priceFrom:s==='high'?b.priceFrom-a.priceFrom:(b.since??'').localeCompare(a.since??''))

/**
 * THE SHOP (owner, 12–13.11.2026: "selling, beautiful, inviting, with every sales trick, smart groups"). The weekly's mail-order
 * pages: a hook with three honest promises; shop by club; then curated shelves of four (wall, wear, matchday gear, gifts under
 * €25, home, little supporters, small things — "new" leads while there is something new), each opening its full shelf; one
 * product per design on a shelf, with "also on N more" opening that design across every product. Filters are links (the page
 * works without script), the grid wraps (never a sideways rail), two cards a row on a phone, four on a desk. Products carry
 * structured data for search. The checkout is Printify's Pop-Up store.
 */
export default async function Shop({searchParams}:{searchParams:{club?:string;shelf?:string;design?:string;sort?:string}}){
 const shop=await publicShop(),all=shop.products
 const subjects=[...new Set(all.map(p=>p.subject))].sort((a,b)=>a==='fanlife'?-1:b==='fanlife'?1:subjectName(a).localeCompare(subjectName(b)))
 const who=subjects.includes(searchParams.club||'')?searchParams.club!:null
 const shelf=SHELVES.find(s=>s===searchParams.shelf)??null,design=all.some(p=>p.design===searchParams.design)?searchParams.design!:null
 const sort=SORTS.find(s=>s===searchParams.sort)??'new',mine=who?all.filter(p=>p.subject===who):all
 const name=(s:string)=>s==='fanlife'?copy.house:subjectName(s)
 const href=(q:{club?:string|null;shelf?:string|null;design?:string|null;sort?:string|null})=>{const u=new URLSearchParams();const v={club:who,shelf,design:null,sort:sort==='new'?null:sort,...q}
  for(const [k,x] of Object.entries(v))if(x)u.set(k,x);const t=u.toString();return t?`/shop?${t}`:'/shop'}
 const perDesign=new Map<string,number>();for(const p of all)perDesign.set(p.design,(perDesign.get(p.design)||0)+1)
 const onePerDesign=(l:PublicProduct[])=>{const seen=new Set<string>();return l.filter(p=>!seen.has(p.design)&&(seen.add(p.design),true))}
 const card=(p:PublicProduct,showClub=!who)=><ShopCard key={p.id} p={p} siblings={design?0:(perDesign.get(p.design)||1)-1} clubLabel={showClub&&p.subject!=='fanlife'?name(p.subject):undefined}/>
 const focused=design?all.filter(p=>p.design===design):shelf?mine.filter(p=>inShelf(p,shelf)):null
 const rows=SHELVES.map(id=>({id,list:onePerDesign(sorted(mine.filter(p=>inShelf(p,id)),'new'))})).filter(r=>r.list.length>0)
 const ld=all.length?{'@context':'https://schema.org','@type':'ItemList',itemListElement:(focused??mine).slice(0,30).map((p,i)=>({'@type':'ListItem',position:i+1,item:{'@type':'Product',name:p.title,image:p.image,description:p.description.slice(0,300),brand:{'@type':'Brand',name:'FAN LIFE'},offers:{'@type':'Offer',url:p.url,priceCurrency:p.currency,price:(p.priceFrom/100).toFixed(2),availability:'https://schema.org/InStock'}}}))}:null
 const market=<aside className="wks-market wk-redplate" aria-labelledby="wks-mk-h"><Plate art="swap" ink="red" className="wks-market-art"/>
  <div><p className="wk-k white">{copy.marketK}</p><h2 className="wk-head white" id="wks-mk-h">{copy.marketT}</h2><p className="wk-small white">{copy.marketSub}</p>
  <Link className="wk-btn paper min-h-tap" href={who?`/market?club=${who}`:'/market'}>{copy.marketCta} <span aria-hidden="true">→</span></Link></div></aside>
 const open=shop.open&&all.length>0
 return <Shell locale="en"><main id="main" className="wks">
  {ld?<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(ld).replace(/</g,'\\u003c')}}/>:null}
  <header className="wks-head wk-greenplate"><span className="wk-speed" aria-hidden="true"/><Plate art="scarf" ink="orange" className="wks-head-art"/>
   <div><p className="wk-banner">{open?(who?copy.clubShop.replace('{club}',name(who)):copy.kicker):copy.soonK}</p><h1 className="wk-logo wks-h1">{open?copy.h1:copy.soonT}</h1><p className="wk-small white">{open?copy.sub:copy.soonSub}</p>
    {open&&<ul className="wks-trust">{copy.trust.map(t=><li key={t}>{t}</li>)}</ul>}</div>
  </header>
  {open&&<>
   {subjects.length>1&&<nav className="wks-clubs" aria-label={copy.byClub}><p className="wk-banner">{copy.byClub}</p><ul className="wks-clubgrid">
    <li><Link className="wks-clubtile min-h-tap" href={href({club:null,design:null})} aria-current={!who?'page':undefined} style={{['--club' as string]:'var(--mag-ink)'}}><span className="wks-roundel" aria-hidden="true">FL</span><span><b>{copy.byClubAll}</b><small>{all.length}</small></span></Link></li>
    {subjects.filter(x=>x!=='fanlife').map(x=>{const c=REGISTRY.find(r=>r.id===x),n=all.filter(p=>p.subject===x).length
     return <li key={x}><Link className="wks-clubtile min-h-tap" href={href({club:x,design:null})} aria-current={who===x?'page':undefined} aria-label={copy.clubAria.replace('{club}',name(x)).replace('{n}',String(n))} style={{['--club' as string]:c?.primary??'var(--mag-ink)'}}>
      <span className="wks-roundel" aria-hidden="true">{c?.initials??name(x).slice(0,2).toUpperCase()}</span><span><b>{name(x)}</b><small>{n}</small></span></Link></li>})}
    {subjects.includes('fanlife')&&<li><Link className="wks-clubtile min-h-tap" href={href({club:'fanlife',design:null})} aria-current={who==='fanlife'?'page':undefined} style={{['--club' as string]:'var(--mag-vermilion)'}}><span className="wks-roundel" aria-hidden="true">★</span><span><b>{copy.house}</b><small>{all.filter(p=>p.subject==='fanlife').length}</small></span></Link></li>}
   </ul></nav>}
   {shop.promo&&<aside className="wks-promo wk-redplate" aria-label={shop.promo.label}><span className="wk-speed" aria-hidden="true"/>
    <span className="wks-burst" aria-hidden="true">{copy.promoOff.replace('{n}',String(shop.promo.percent))}</span>
    <div><p className="wk-banner">{copy.promoK}</p><h2 className="wk-head white">{shop.promo.label}</h2><p className="wk-small white">{copy.promoOff.replace('{n}',String(shop.promo.percent))} {copy.promoAll}{shop.promo.until?` · ${copy.promoUntil.replace('{date}',new Date(shop.promo.until).toLocaleDateString('en-GB',{day:'numeric',month:'long'}))}`:''}{shop.promo.freeShipping?` ${copy.promoShip}`:''}</p>
     {shop.promo.code?<p className="wks-code">{copy.promoCode.replace('{code}',shop.promo.code)}</p>:null}</div></aside>}
   {!focused&&<aside className="wks-make wk-panel" aria-labelledby="wks-make-h"><div><p className="wk-banner">{copy.makeK}</p><h2 className="wk-head" id="wks-make-h">{copy.makeT}</h2><p className="wk-small">{copy.makeSub}</p></div>
    <Link className="wk-btn min-h-tap" href={who?`/shop/make?club=${who}`:'/shop/make'}>{copy.makeCta} <span aria-hidden="true">→</span></Link></aside>}
   {focused?<section className="wks-shelf" aria-labelledby="wks-f-h">
     <div className="wks-shelf-head"><div><p className="wk-banner">{design?copy.designT:copy.shelfSub[shelf!]}</p><h2 className="wk-head" id="wks-f-h">{design?(focused[0]?.title.split(' · ')[0]??''):copy.shelves[shelf!]}</h2><p className="wk-small">{copy.results.replace('{n}',String(focused.length))}</p></div>
      <nav className="wks-chips small" aria-label={copy.sort}>{SORTS.map(o=><Link key={o} className="wks-chip min-h-tap" href={href({sort:o==='new'?null:o,design})} aria-current={sort===o?'true':undefined}>{o==='new'?copy.sortNew:o==='low'?copy.sortLow:copy.sortHigh}</Link>)}
       <Link className="wks-chip min-h-tap" href={href({shelf:null,design:null})}>{copy.shelfAll} ✕</Link></nav></div>
     {!design&&<nav className="wks-chips small" aria-label={copy.shelfAll}>{rows.map(r=><Link key={r.id} className="wks-chip min-h-tap" href={href({shelf:r.id})} aria-current={shelf===r.id?'true':undefined}>{copy.shelves[r.id]}</Link>)}</nav>}
     {focused.length?<ul className="wks-grid">{sorted(focused,sort).map(p=>card(p))}</ul>:<p className="wk-small">{copy.empty}</p>}
    </section>
   :<>
    {rows.length>2&&<nav className="wks-chips small" aria-label={copy.shelfAll}>{rows.map(r=><a key={r.id} className="wks-chip min-h-tap" href={`#shelf-${r.id}`}>{copy.shelves[r.id]}</a>)}</nav>}
    {rows.map((r,i)=><section key={r.id} id={`shelf-${r.id}`} className="wks-shelf" aria-labelledby={`wks-${r.id}-h`}>
     {r.id==='gifts'?<div className="wks-gift wk-panel"><p className="wk-banner">{copy.giftK}</p><h2 className="wk-head" id={`wks-${r.id}-h`}>{copy.giftT}</h2><p className="wk-small">{copy.giftSub}</p></div>
      :<div className="wks-shelf-head"><div><p className="wk-banner">{copy.shelfSub[r.id]}</p><h2 className="wk-head" id={`wks-${r.id}-h`}>{copy.shelves[r.id]}</h2></div>
       {r.list.length>4||mine.filter(p=>inShelf(p,r.id)).length>4?<Link className="wk-btn paper min-h-tap" href={href({shelf:r.id})}>{copy.seeAll.replace('{n}',String(mine.filter(p=>inShelf(p,r.id)).length))} <span aria-hidden="true">→</span></Link>:null}</div>}
     <ul className="wks-grid">{r.list.slice(0,4).map(p=>card(p))}</ul>
     {r.id==='gifts'&&mine.filter(p=>inShelf(p,'gifts')).length>4?<Link className="wk-btn min-h-tap wks-gift-cta" href={href({shelf:'gifts'})}>{copy.giftCta} <span aria-hidden="true">→</span></Link>:null}
     {i===1&&market}
    </section>)}
   </>}
  </>}
  {(!open||rows.length<2||focused)&&market}
  {open&&<p className="wk-small wks-note">{copy.note}</p>}
 </main></Shell>
}
