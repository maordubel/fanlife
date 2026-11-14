import type {Metadata} from 'next'
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
 * THE SHOP, CLEAN (owner, 14.11.2026: "still crowded, messy and uninviting; hard to navigate and to shop — a huge upgrade").
 * One thing per row, like a club megastore's front page: the ribbon → a short cover with one button → shop by category
 * (picture tiles) → the clubs as one line of chips → the sale (when there is one) → best sellers / our picks → new in → one
 * big "shop everything" → the questions. Any category, club, price or sort opens the browse view: the categories always on
 * top, one Filters panel for the rest, the chips that are on, the grid. Cards are a picture, a name and a price — the whole
 * card opens the product on our site. Links only; nothing scrolls sideways; two cards a row on a phone, four on a desk.
 */
export default async function Shop({searchParams}:{searchParams:{club?:string;shelf?:string;design?:string;sort?:string;price?:string;view?:string}}){
 const shop=await publicShop(),all=shop.products,fav=new Set(shop.promoters.featured)
 const subjects=[...new Set(all.map(p=>p.subject))].sort((a,b)=>a==='fanlife'?-1:b==='fanlife'?1:subjectName(a).localeCompare(subjectName(b)))
 const name=(s:string)=>s==='fanlife'?copy.house:subjectName(s)
 const who=subjects.includes(searchParams.club||'')?searchParams.club!:null
 const dept=DEPTS.find(s=>s===searchParams.shelf)??null,budget=BUDGETS.find(b=>b===searchParams.price)??null
 const design=all.some(p=>p.design===searchParams.design)?searchParams.design!:null,sort=SORTS.find(s=>s===searchParams.sort)??null
 const browsing=!!(dept||budget||design||sort||who||searchParams.view==='all')
 const mine=who?all.filter(p=>p.subject===who):all
 const inDept=(p:PublicProduct,d:Dept)=>d==='new'?isNew(p):d==='gifts'?eurOf(p)<=25:d==='sale'?!!p.was:d==='fav'?fav.has(p.design)||p.sold>0:p.shelf===d||!!p.also?.includes(d as Shelf)
 const href=(q:Partial<Record<'club'|'shelf'|'design'|'sort'|'price'|'view',string|null>>)=>{const u=new URLSearchParams()
  const v={club:who,shelf:dept,design,sort,price:budget,view:null,...q};for(const [k,x] of Object.entries(v))if(x)u.set(k,x);const t=u.toString();return t?`/shop?${t}`:'/shop?view=all'}
 const card=(p:PublicProduct)=><ShopCard key={p.id} p={p} clubLabel={!who&&p.subject!=='fanlife'?name(p.subject):undefined}/>
 const open=shop.open&&all.length>0
 const sale:PublicSale|null=[...shop.sales].sort((a,b)=>b.percent-a.percent)[0]??null
 const onSale=mine.filter(p=>p.was)
 const ribbon=sale&&onSale.length?{text:copy.ribbonSale.replace('{label}',sale.label).replace('{n}',String(sale.percent)).replace('{left}',leftText(sale.until)),href:'/shop?shelf=sale'}
  :shop.promoters.ribbon?{text:shop.promoters.ribbon,href:null}
  :shop.promoters.freeShipOver?{text:copy.ribbonShip.replace('{price}',`$${shop.promoters.freeShipOver}`),href:null}
  :shop.promo?.code?{text:`${shop.promo.label} · ${copy.ribbonCode.replace('{code}',shop.promo.code)}`,href:null}
  :{text:copy.ribbonDefault,href:null}
 const ld=all.length?{'@context':'https://schema.org','@type':'ItemList',itemListElement:mine.slice(0,30).map((p,i)=>({'@type':'ListItem',position:i+1,item:{'@type':'Product',name:p.title,image:p.image,description:p.description.slice(0,300),brand:{'@type':'Brand',name:'FAN LIFE'},offers:{'@type':'Offer',url:`/shop/p/${encodeURIComponent(p.id)}`,priceCurrency:p.currency,price:(p.priceFrom/100).toFixed(2),availability:'https://schema.org/InStock'}}}))}:null
 const ribbonEl=ribbon.href?<Link className="wks-ribbon sale" href={ribbon.href}>{ribbon.text} <span aria-hidden="true">→</span></Link>:<p className="wks-ribbon">{ribbon.text}</p>
 // the categories: a picture each (the most bought, else the newest), only those that have something
 const cats=DEPTS.filter(d=>d!=='fav'&&d!=='gifts').map(d=>{const l=mine.filter(p=>inDept(p,d));return {d,n:l.length,img:face(sorted(l,'pop'))?.image}}).filter(t=>t.n>0&&t.img)
 const catTiles=(cur:Dept|null)=><nav className="wks2-cats" aria-label={copy.deptK}><ul style={{['--n' as string]:String(cats.length)}}>{cats.map(t=><li key={t.d}><Link className={`wks2-cat min-h-tap${t.d==='sale'?' sale':''}`} href={cur===t.d?href({shelf:null,view:'all'}):href({shelf:t.d,design:null})} aria-current={cur===t.d?'page':undefined}>
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src={t.img} alt="" loading="lazy" width={240} height={240}/><b>{copy.depts[t.d]}</b></Link></li>)}</ul></nav>
 const clubChips=subjects.length>1&&<nav className="wks2-clubs" aria-label={copy.byClub}><span className="wks2-label">{copy.byClub}</span><ul>
  <li><Link className="wks2-club min-h-tap" href={browsing?href({club:null}):'/shop?view=all'} aria-current={!who?'page':undefined}>{copy.byClubAll}</Link></li>
  {subjects.map(x=>{const c=REGISTRY.find(r=>r.id===x);return <li key={x}><Link className="wks2-club min-h-tap" href={href({club:who===x?null:x,design:null,view:'all'})} aria-current={who===x?'page':undefined} style={{['--club' as string]:x==='fanlife'?'var(--mag-vermilion)':c?.primary??'var(--mag-ink)'}}><i aria-hidden="true"/>{name(x)}</Link></li>})}</ul></nav>

 if(open&&browsing){
  let list=design?all.filter(p=>p.design===design):mine
  if(dept)list=list.filter(p=>inDept(p,dept));if(budget)list=list.filter(p=>inBudget(p,budget))
  list=sorted(list,sort??(dept==='fav'?'pop':'new'))
  const title=design?(list[0]?.title.split(' · ')[0]??''):dept?copy.depts[dept]:who?copy.clubShop.replace('{club}',name(who)):budget?copy.budgets[budget]:copy.browseT
  const on=[who&&{k:'club',l:name(who)},dept&&{k:'shelf',l:copy.depts[dept]},budget&&{k:'price',l:copy.budgets[budget]},design&&{k:'design',l:title}].filter(Boolean) as {k:'club'|'shelf'|'price'|'design';l:string}[]
  const opt=(k:'price'|'sort',v:string|null,l:string,cur:boolean)=><Link key={`${k}-${v}`} className="wks-chip min-h-tap" href={href({[k]:cur?null:v,view:'all'})} aria-current={cur?'true':undefined}>{l}</Link>
  return <Shell locale="en"><main id="main" className="wks wks2">
   {ribbonEl}
   <header className="wks2-browse"><nav className="wks-crumbs" aria-label={copy.title}><Link href="/shop">{copy.title}</Link>{on.length?<><span aria-hidden="true">›</span><span>{title}</span></>:null}</nav>
    <h1 className="wk-head wks2-h1">{title}</h1>{dept==='sale'&&sale?<p className="wk-small">{copy.saleSub} <b>{leftText(sale.until)}</b></p>:null}</header>
   <nav className="wks-chips small wks2-catchips" aria-label={copy.deptK}>{cats.map(t=><Link key={t.d} className="wks-chip min-h-tap" href={dept===t.d?href({shelf:null,view:'all'}):href({shelf:t.d,design:null})} aria-current={dept===t.d?'true':undefined}>{copy.depts[t.d]}</Link>)}</nav>
   <div className="wks-filterbar">
    <details className="wks-filter"><summary className="wk-btn paper min-h-tap">{copy.filters}</summary>
     <div className="wks-filter-in">
      {subjects.length>1&&<fieldset><legend>{copy.filterClub}</legend><div className="wks-chips small">{subjects.map(x=><Link key={x} className="wks-chip min-h-tap" href={href({club:who===x?null:x,view:'all'})} aria-current={who===x?'true':undefined}>{name(x)}</Link>)}</div></fieldset>}
      <fieldset><legend>{copy.filterPrice}</legend><div className="wks-chips small">{BUDGETS.map(b=>opt('price',b,copy.budgets[b],budget===b))}</div></fieldset>
      <fieldset><legend>{copy.sort}</legend><div className="wks-chips small">{SORTS.map(o=><Link key={o} className="wks-chip min-h-tap" href={href({sort:o==='new'?null:o,view:'all'})} aria-current={(sort??'new')===o?'true':undefined}>{o==='new'?copy.sortNew:o==='pop'?copy.sortPop:o==='low'?copy.sortLow:copy.sortHigh}</Link>)}</div></fieldset>
     </div></details>
    <p className="wks-count">{copy.results.replace('{n}',String(list.length))}</p>
   </div>
   {on.length>0&&<nav className="wks-chips small wks-on" aria-label={copy.filters}>{on.map(o=><Link key={o.k} className="wks-chip on min-h-tap" href={href({[o.k]:null,view:'all'})} aria-label={copy.remove.replace('{what}',o.l)}>{o.l} <span aria-hidden="true">✕</span></Link>)}
    <Link className="wks-chip min-h-tap" href="/shop?view=all">{copy.clearAll}</Link></nav>}
   {list.length?<ul className="wks-grid">{list.map(card)}</ul>:<p className="wk-small">{copy.empty}</p>}
   <p className="wk-small wks-note">{copy.note}</p>
  </main></Shell>
 }

 const picks=onePerDesign([...all.filter(p=>fav.has(p.design)).sort((a,b)=>shop.promoters.featured.indexOf(a.design)-shop.promoters.featured.indexOf(b.design)),...sorted(all,'pop').filter(p=>p.shelf==='wear'||p.shelf==='wall'),...sorted(all,'pop')]).slice(0,8)
 const best=all.some(p=>p.sold>0)
 const fresh=onePerDesign(sorted(all.filter(isNew),'new')).filter(p=>!picks.includes(p)).slice(0,4)
 return <Shell locale="en"><main id="main" className="wks wks2">
  {ld?<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(ld).replace(/</g,'\u003c')}}/>:null}
  {open&&ribbonEl}
  <header className="wks2-hero wk-greenplate"><span className="wk-speed" aria-hidden="true"/><Plate art="scarf" ink="orange" className="wks2-hero-art"/>
   <div><p className="wk-banner">{open?copy.kicker:copy.soonK}</p><h1 className="wk-logo wks2-hero-h1">{open?copy.h1:copy.soonT}</h1><p className="wk-small white">{open?copy.sub:copy.soonSub}</p>
    {open&&<Link className="wk-btn min-h-tap wks2-go" href="/shop?view=all">{copy.shopAll.replace('{n}',String(all.length))} <span aria-hidden="true">→</span></Link>}</div>
  </header>
  {open&&<>
   {catTiles(null)}
   {clubChips}
   {onSale.length>0&&sale&&<Link className="wks2-sale wk-redplate min-h-tap" href="/shop?shelf=sale"><span className="wks-burst" aria-hidden="true">−{sale.percent}%</span><span><b className="wk-head white">{sale.label}</b><small>{copy.saleSub} · {leftText(sale.until)}</small></span><span aria-hidden="true">→</span></Link>}
   <section className="wks-shelf" aria-labelledby="wks2-picks-h"><div className="wks-shelf-head"><div><p className="wk-banner">{best?copy.bestK:copy.favK}</p><h2 className="wk-head" id="wks2-picks-h">{best?copy.bestT:copy.picksT}</h2></div></div>
    <ul className="wks-grid">{picks.map(card)}</ul></section>
   {fresh.length>0&&<section className="wks-shelf" aria-labelledby="wks2-new-h"><div className="wks-shelf-head"><div><p className="wk-banner">{copy.shelfSub.new}</p><h2 className="wk-head" id="wks2-new-h">{copy.depts.new}</h2></div>
    <Link className="wks-more min-h-tap" href="/shop?shelf=new">{copy.seeAll.replace('{n}',String(all.filter(isNew).length))} <span aria-hidden="true">→</span></Link></div>
    <ul className="wks-grid">{fresh.map(card)}</ul></section>}
   <Link className="wk-btn min-h-tap wks2-all" href="/shop?view=all">{copy.shopAll.replace('{n}',String(all.length))} <span aria-hidden="true">→</span></Link>
   <section className="wks-faq" aria-labelledby="wks-faq-h"><p className="wk-banner">{copy.faqK}</p><h2 className="wk-head" id="wks-faq-h">{copy.faqT}</h2>
    {copy.faq.map(([q,a])=><details key={q} className="wks-fold"><summary className="min-h-tap">{q}</summary><p className="wk-small">{a}</p></details>)}</section>
   <p className="wk-small wks-note">{copy.note}</p>
  </>}
 </main></Shell>
}
