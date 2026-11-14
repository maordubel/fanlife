import type {Metadata} from 'next'
import type {ReactNode} from 'react'
import Link from 'next/link'
import {Shell} from '@/components/master/Shell'
import {Plate} from '@/components/weekly/Plate'
import {ShopCard,isNew,leftText} from '@/components/shop/ShopStrip'
import {publicShop,type PublicSale} from '@/lib/shop/store'
import {subjectName} from '@/lib/shop/subjects'
import {REGISTRY} from '@/lib/master/registry'
import type {PublicProduct,Shelf} from '@/lib/shop/types'
import copy from '@/messages/en.shop.json'
import '../weekly/shop.css'
export const dynamic='force-dynamic'
export async function generateMetadata():Promise<Metadata>{const s=await publicShop().catch(()=>null);return {title:copy.title,description:copy.seoDesc,alternates:{canonical:'/shop'},robots:s?.open&&s.products.length?undefined:{index:false}}}

type Dept=Shelf|'new'|'gifts'|'sale'|'fav'
const SHELVES:Shelf[]=['wear','wall','gear','home','kids','small']
const DEPTS:Dept[]=['sale','new','fav','gifts',...SHELVES]
const BUDGETS=['u20','20-40','o40'] as const
type Budget=(typeof BUDGETS)[number]
const SORTS=['new','pop','low','high'] as const
type Sort=(typeof SORTS)[number]
const eurOf=(p:PublicProduct)=>p.eur??p.priceFrom/100
const inBudget=(p:PublicProduct,b:Budget)=>b==='u20'?eurOf(p)<20:b==='20-40'?eurOf(p)>=20&&eurOf(p)<=40:eurOf(p)>40
const sorted=(l:PublicProduct[],s:Sort)=>[...l].sort((a,b)=>s==='low'?a.priceFrom-b.priceFrom:s==='high'?b.priceFrom-a.priceFrom:s==='pop'?b.sold-a.sold||(b.since??'').localeCompare(a.since??''):(b.since??'').localeCompare(a.since??''))
const onePerDesign=(l:PublicProduct[])=>{const seen=new Set<string>();return l.filter(p=>!seen.has(p.design)&&(seen.add(p.design),true))}
/** the face of a design on a shelf: a shirt or a print reads best */
const face=(l:PublicProduct[])=>l.find(p=>p.shelf==='wear')??l.find(p=>p.shelf==='wall')??l[0]

/**
 * THE SHOP (owner, 12–14.11.2026: "selling, beautiful, organised — take ideas from club shops and souvenir shops, discounts and
 * sales promoters"). Built like a club megastore, dressed as the weekly's mail-order pages:
 *  · the ribbon (the sale and its countdown, free shipping, a code) → a short cover with one main button → three promises;
 *  · "shop by category" tiles with a real product picture, "shop by club" with the crest;
 *  · the sale (price already cut, no code), fan favourites / best sellers, the shelves, the gift finder by budget;
 *  · make your own, the shirt market, the questions people ask before ordering.
 * Any filter opens the browse view: one Filters panel (club, category, price, sort) and the chips that are on — links only,
 * the page works without script, the grid wraps (never a sideways rail), two cards a row on a phone, four on a desk.
 * The checkout is Printify's Pop-Up store.
 */
export default async function Shop({searchParams}:{searchParams:{club?:string;shelf?:string;design?:string;sort?:string;price?:string;view?:string}}){
 const shop=await publicShop(),all=shop.products,fav=new Set(shop.promoters.featured)
 const subjects=[...new Set(all.map(p=>p.subject))].sort((a,b)=>a==='fanlife'?1:b==='fanlife'?-1:subjectName(a).localeCompare(subjectName(b)))
 const name=(s:string)=>s==='fanlife'?copy.house:subjectName(s)
 const who=subjects.includes(searchParams.club||'')?searchParams.club!:null
 const dept=DEPTS.find(s=>s===searchParams.shelf)??null,budget=BUDGETS.find(b=>b===searchParams.price)??null
 const design=all.some(p=>p.design===searchParams.design)?searchParams.design!:null,sort=SORTS.find(s=>s===searchParams.sort)??null
 const browsing=!!(dept||budget||design||sort||searchParams.view==='all')
 const mine=who?all.filter(p=>p.subject===who):all
 const inDept=(p:PublicProduct,d:Dept)=>d==='new'?isNew(p):d==='gifts'?eurOf(p)<=25:d==='sale'?!!p.was:d==='fav'?fav.has(p.design)||p.sold>0:p.shelf===d
 const href=(q:Partial<Record<'club'|'shelf'|'design'|'sort'|'price'|'view',string|null>>)=>{const u=new URLSearchParams()
  const v={club:who,shelf:dept,design,sort,price:budget,view:null,...q};for(const [k,x] of Object.entries(v))if(x)u.set(k,x);const t=u.toString();return t?`/shop?${t}`:'/shop'}
 const perDesign=new Map<string,number>();for(const p of all)perDesign.set(p.design,(perDesign.get(p.design)||0)+1)
 const card=(p:PublicProduct)=><ShopCard key={p.id} p={p} siblings={design?0:(perDesign.get(p.design)||1)-1} clubLabel={!who&&p.subject!=='fanlife'?name(p.subject):undefined}/>
 const open=shop.open&&all.length>0
 const sale:PublicSale|null=[...shop.sales].sort((a,b)=>b.percent-a.percent)[0]??null
 const onSale=mine.filter(p=>p.was)
 // the ribbon: the sale first, then the owner's own line, free shipping, a checkout code, else the three promises
 const ribbon=sale&&onSale.length?{text:copy.ribbonSale.replace('{label}',sale.label).replace('{n}',String(sale.percent)).replace('{left}',leftText(sale.until)),href:href({shelf:'sale',design:null,price:null})}
  :shop.promoters.ribbon?{text:shop.promoters.ribbon,href:null}
  :shop.promoters.freeShipOver?{text:copy.ribbonShip.replace('{price}',`$${shop.promoters.freeShipOver}`),href:null}
  :shop.promo?.code?{text:`${shop.promo.label} · ${copy.ribbonCode.replace('{code}',shop.promo.code)}`,href:null}
  :{text:copy.ribbonDefault,href:null}
 const ld=all.length?{'@context':'https://schema.org','@type':'ItemList',itemListElement:mine.slice(0,30).map((p,i)=>({'@type':'ListItem',position:i+1,item:{'@type':'Product',name:p.title,image:p.image,description:p.description.slice(0,300),brand:{'@type':'Brand',name:'FAN LIFE'},offers:{'@type':'Offer',url:p.url,priceCurrency:p.currency,price:(p.priceFrom/100).toFixed(2),availability:'https://schema.org/InStock'}}}))}:null
 const market=<aside className="wks-market wk-redplate" aria-labelledby="wks-mk-h"><Plate art="swap" ink="red" className="wks-market-art"/>
  <div><p className="wk-k white">{copy.marketK}</p><h2 className="wk-head white" id="wks-mk-h">{copy.marketT}</h2><p className="wk-small white">{copy.marketSub}</p>
  <Link className="wk-btn paper min-h-tap" href={who?`/market?club=${who}`:'/market'}>{copy.marketCta} <span aria-hidden="true">→</span></Link></div></aside>
 const clubs=subjects.length>1&&<nav className="wks-clubs" aria-label={copy.byClub}><p className="wk-banner">{copy.byClub}</p><ul className="wks-clubgrid">
  <li><Link className="wks-clubtile min-h-tap" href={href({club:null,design:null})} aria-current={!who?'page':undefined} style={{['--club' as string]:'var(--mag-ink)'}}><span className="wks-roundel" aria-hidden="true">★</span><span><b>{copy.byClubAll}</b><small>{copy.items.replace('{n}',String(all.length))}</small></span></Link></li>
  {subjects.map(x=>{const c=REGISTRY.find(r=>r.id===x),n=all.filter(p=>p.subject===x).length
   return <li key={x}><Link className="wks-clubtile min-h-tap" href={href({club:x,design:null})} aria-current={who===x?'page':undefined} aria-label={copy.clubAria.replace('{club}',name(x)).replace('{n}',String(n))} style={{['--club' as string]:x==='fanlife'?'var(--mag-vermilion)':c?.primary??'var(--mag-ink)'}}>
    <span className="wks-roundel" aria-hidden="true">{x==='fanlife'?'FL':c?.initials??name(x).slice(0,2).toUpperCase()}</span>
    <span><b>{name(x)}</b><small>{copy.items.replace('{n}',String(n))}</small></span></Link></li>})}
 </ul></nav>

 // ── the browse view: one filters panel, the chips that are on, the grid ──
 if(open&&browsing){
  let list=design?all.filter(p=>p.design===design):mine
  if(dept)list=list.filter(p=>inDept(p,dept));if(budget)list=list.filter(p=>inBudget(p,budget))
  list=sorted(list,sort??(dept==='fav'?'pop':'new'))
  const title=design?(list[0]?.title.split(' · ')[0]??''):dept?copy.depts[dept]:budget?copy.budgets[budget]:copy.browseT
  const on=[who&&{k:'club',l:name(who)},dept&&{k:'shelf',l:copy.depts[dept]},budget&&{k:'price',l:copy.budgets[budget]},design&&{k:'design',l:title}].filter(Boolean) as {k:'club'|'shelf'|'price'|'design';l:string}[]
  const deptsHere=DEPTS.filter(d=>mine.some(p=>inDept(p,d)))
  const opt=(k:'club'|'shelf'|'price'|'sort',v:string|null,l:string,cur:boolean)=><Link key={`${k}-${v}`} className="wks-chip min-h-tap" href={href({[k]:cur?null:v,view:'all'})} aria-current={cur?'true':undefined}>{l}</Link>
  return <Shell locale="en"><main id="main" className="wks">
   <Link className="wks-ribbon" href={ribbon.href??'/shop'}>{ribbon.text}</Link>
   <header className="wks-browse-head"><p className="wk-banner"><Link href="/shop">{copy.title}</Link>{who?` · ${name(who)}`:''}</p><h1 className="wk-head wks-browse-h1">{title}</h1>
    {dept==='sale'&&sale?<p className="wk-small">{copy.saleSub} <b>{leftText(sale.until)}</b></p>:null}</header>
   <div className="wks-filterbar">
    <details className="wks-filter"><summary className="wk-btn paper min-h-tap">{copy.filters}{on.length?` · ${on.length}`:''}</summary>
     <div className="wks-filter-in">
      {subjects.length>1&&<fieldset><legend>{copy.filterClub}</legend><div className="wks-chips small">{subjects.map(x=>opt('club',x,name(x),who===x))}</div></fieldset>}
      <fieldset><legend>{copy.filterType}</legend><div className="wks-chips small">{deptsHere.map(d=>opt('shelf',d,copy.depts[d],dept===d))}</div></fieldset>
      <fieldset><legend>{copy.filterPrice}</legend><div className="wks-chips small">{BUDGETS.map(b=>opt('price',b,copy.budgets[b],budget===b))}</div></fieldset>
      <fieldset><legend>{copy.sort}</legend><div className="wks-chips small">{SORTS.map(o=><Link key={o} className="wks-chip min-h-tap" href={href({sort:o==='new'?null:o,view:'all'})} aria-current={(sort??'new')===o?'true':undefined}>{o==='new'?copy.sortNew:o==='pop'?copy.sortPop:o==='low'?copy.sortLow:copy.sortHigh}</Link>)}</div></fieldset>
     </div></details>
    <p className="wks-count">{copy.results.replace('{n}',String(list.length))}</p>
   </div>
   {on.length>0&&<nav className="wks-chips small wks-on" aria-label={copy.filters}>{on.map(o=><Link key={o.k} className="wks-chip on min-h-tap" href={href({[o.k]:null,view:'all'})} aria-label={copy.remove.replace('{what}',o.l)}>{o.l} <span aria-hidden="true">✕</span></Link>)}
    <Link className="wks-chip min-h-tap" href="/shop?view=all">{copy.clearAll}</Link></nav>}
   {list.length?<ul className="wks-grid">{list.map(card)}</ul>:<p className="wk-small">{copy.empty}</p>}
   {market}
   <p className="wk-small wks-note">{copy.note}</p>
  </main></Shell>
 }

 // ── the front of the shop ──
 const deptTiles=DEPTS.filter(d=>d!=='gifts'&&d!=='fav').map(d=>{const l=mine.filter(p=>inDept(p,d));return {d,n:l.length,img:face(sorted(l,'pop'))?.image}}).filter(t=>t.n>0&&t.img)
 const favs=onePerDesign([...mine.filter(p=>fav.has(p.design)).sort((a,b)=>shop.promoters.featured.indexOf(a.design)-shop.promoters.featured.indexOf(b.design)),...sorted(mine.filter(p=>p.sold>0),'pop')])
 const best=mine.some(p=>p.sold>0)
 const rows=(['new',...SHELVES] as Dept[]).map(id=>({id,list:onePerDesign(sorted(mine.filter(p=>inDept(p,id)),'new')),n:mine.filter(p=>inDept(p,id)).length})).filter(r=>r.list.length>0)
 const shelfSection=(id:Dept,list:PublicProduct[],n:number,head?:ReactNode)=><section key={id} id={`shelf-${id}`} className="wks-shelf" aria-labelledby={`wks-${id}-h`}>
  <div className="wks-shelf-head">{head??<div><p className="wk-banner">{copy.shelfSub[id as keyof typeof copy.shelfSub]}</p><h2 className="wk-head" id={`wks-${id}-h`}>{copy.depts[id]}</h2></div>}
   {n>4?<Link className="wks-more min-h-tap" href={href({shelf:id})}>{copy.seeAll.replace('{n}',String(n))} <span aria-hidden="true">→</span></Link>:null}</div>
  <ul className="wks-grid">{list.slice(0,4).map(card)}</ul></section>
 return <Shell locale="en"><main id="main" className="wks">
  {ld?<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(ld).replace(/</g,'\\u003c')}}/>:null}
  {open&&(ribbon.href?<Link className="wks-ribbon sale" href={ribbon.href}>{ribbon.text} <span aria-hidden="true">→</span></Link>:<p className="wks-ribbon">{ribbon.text}</p>)}
  <header className="wks-head wk-greenplate"><span className="wk-speed" aria-hidden="true"/><Plate art="scarf" ink="orange" className="wks-head-art"/>
   <div><p className="wk-banner">{open?(who?copy.clubShop.replace('{club}',name(who)):copy.kicker):copy.soonK}</p><h1 className="wk-logo wks-h1">{open?copy.h1:copy.soonT}</h1><p className="wk-small white wks-sub">{open?copy.sub:copy.soonSub}</p>
    {open&&<p className="wks-ctas"><Link className="wk-btn min-h-tap" href={onSale.length?href({shelf:'sale'}):href({view:'all'})}>{onSale.length?copy.ctaSale:copy.ctaAll} <span aria-hidden="true">→</span></Link>
     {mine.some(isNew)&&<Link className="wk-btn paper min-h-tap" href={href({shelf:'new'})}>{copy.ctaNew}</Link>}</p>}</div>
  </header>
  {open&&<>
   <ul className="wks-promises">{copy.trust.map((t,i)=><li key={t}><b>{t}</b><span>{copy.trustSub[i]}</span></li>)}</ul>
   {clubs}
   <section className="wks-depts" aria-labelledby="wks-dept-h"><div><p className="wk-banner">{copy.deptK}</p><h2 className="wk-head" id="wks-dept-h">{copy.deptT}</h2></div>
    <ul className="wks-deptgrid">{deptTiles.map(t=><li key={t.d}><Link className={`wks-dept min-h-tap${t.d==='sale'?' sale':''}`} href={href({shelf:t.d})}>
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img src={t.img} alt="" loading="lazy" width={300} height={300}/><span><b>{copy.depts[t.d]}</b><small>{copy.items.replace('{n}',String(t.n))}</small></span></Link></li>)}</ul></section>
   {onSale.length>0&&sale&&<section className="wks-sale wk-redplate" aria-labelledby="wks-sale-h"><span className="wk-speed" aria-hidden="true"/>
    <div className="wks-sale-head"><span className="wks-burst" aria-hidden="true">−{sale.percent}%</span>
     <div><p className="wk-banner">{copy.saleK} · {leftText(sale.until)}</p><h2 className="wk-head white" id="wks-sale-h">{sale.label}</h2><p className="wk-small white">{copy.saleSub}</p></div></div>
    <ul className="wks-grid">{onePerDesign(sorted(onSale,'pop')).slice(0,4).map(card)}</ul>
    {onSale.length>4&&<Link className="wk-btn paper min-h-tap wks-sale-all" href={href({shelf:'sale'})}>{copy.seeAll.replace('{n}',String(onSale.length))} <span aria-hidden="true">→</span></Link>}
   </section>}
   {shop.promo&&!onSale.length&&<aside className="wks-promo wk-redplate" aria-label={shop.promo.label}><span className="wk-speed" aria-hidden="true"/>
    <span className="wks-burst" aria-hidden="true">{copy.promoOff.replace('{n}',String(shop.promo.percent))}</span>
    <div><p className="wk-banner">{copy.promoK}</p><h2 className="wk-head white">{shop.promo.label}</h2><p className="wk-small white">{copy.promoOff.replace('{n}',String(shop.promo.percent))} {copy.promoAll}{shop.promo.until?` · ${copy.promoUntil.replace('{date}',new Date(shop.promo.until).toLocaleDateString('en-GB',{day:'numeric',month:'long'}))}`:''}{shop.promo.freeShipping?` ${copy.promoShip}`:''}</p>
     {shop.promo.code?<p className="wks-code">{copy.promoCode.replace('{code}',shop.promo.code)}</p>:null}</div></aside>}
   {favs.length>0&&shelfSection('fav',favs,favs.length,<div><p className="wk-banner">{best?copy.bestK:copy.favK}</p><h2 className="wk-head" id="wks-fav-h">{best?copy.bestT:copy.favT}</h2></div>)}
   {rows.map((r,i)=><div key={r.id} className="wks-stack">{shelfSection(r.id,r.list,r.n)}
    {i===1&&<section className="wks-budget wk-panel" aria-labelledby="wks-bud-h"><div><p className="wk-banner">{copy.budgetK}</p><h2 className="wk-head" id="wks-bud-h">{copy.budgetT}</h2><p className="wk-small">{copy.giftSub}</p></div>
     <ul className="wks-budgets">{BUDGETS.filter(b=>mine.some(p=>inBudget(p,b))).map(b=><li key={b}><Link className="wk-btn paper min-h-tap" href={href({price:b})}>{copy.budgets[b]} <small>{copy.items.replace('{n}',String(mine.filter(p=>inBudget(p,b)).length))}</small></Link></li>)}</ul></section>}
    {i===3&&market}</div>)}
   <aside className="wks-make wk-panel" aria-labelledby="wks-make-h"><div><p className="wk-banner">{copy.makeK}</p><h2 className="wk-head" id="wks-make-h">{copy.makeT}</h2><p className="wk-small">{copy.makeSub}</p></div>
    <Link className="wk-btn min-h-tap" href={who?`/shop/make?club=${who}`:'/shop/make'}>{copy.makeCta} <span aria-hidden="true">→</span></Link></aside>
   {rows.length<4&&market}
   <section className="wks-faq" aria-labelledby="wks-faq-h"><p className="wk-banner">{copy.faqK}</p><h2 className="wk-head" id="wks-faq-h">{copy.faqT}</h2>
    {copy.faq.map(([q,a])=><details key={q} className="wks-fold"><summary className="min-h-tap">{q}</summary><p className="wk-small">{a}</p></details>)}</section>
   <p className="wk-small wks-note">{copy.note}</p>
  </>}
  {!open&&market}
 </main></Shell>
}
