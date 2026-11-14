import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {ShopCard,isNew,leftText} from '@/components/shop/ShopStrip'
import {CheckoutButton} from '@/components/shop/Checkout'
import {publicShop} from '@/lib/shop/store'
import {subjectName} from '@/lib/shop/subjects'
import copy from '@/messages/en.shop.json'
import '../../../weekly/shop.css'
export const dynamic='force-dynamic'

const money=(c:number,cur:string)=>new Intl.NumberFormat('en',{style:'currency',currency:cur,maximumFractionDigits:c%100?2:0}).format(c/100)
export async function generateMetadata({params}:{params:{id:string}}):Promise<Metadata>{
 const s=await publicShop().catch(()=>null),p=s?.products.find(x=>x.id===params.id)
 if(!p)return {title:copy.title,robots:{index:false}}
 return {title:`${p.title} — ${copy.title}`,description:p.description.slice(0,160),alternates:{canonical:`/shop/p/${encodeURIComponent(p.id)}`},openGraph:{images:[p.image]}}
}

/**
 * ONE PRODUCT, ON OUR SITE (owner, 14.11.2026: "the first look at a product stays in our shop; Buy feels like we never left").
 * The gallery (front, back and every mock-up), the design's name and club, the price with its sale and euro guide, the honest
 * promises, the description; then the same design on other products and more from the club. Buy opens the FAN LIFE checkout
 * in its own window over this page (components/shop/Checkout.tsx). Structured data for search.
 */
export default async function Product({params}:{params:{id:string}}){
 const shop=await publicShop();if(!shop.open)notFound()
 const p=shop.products.find(x=>x.id===decodeURIComponent(params.id));if(!p)notFound()
 const [design,what]=[p.title.split(' · ')[0]!,p.title.split(' · ')[1]??''],club=p.subject==='fanlife'?copy.house:subjectName(p.subject)
 const pics=[...new Set([p.image,...(p.back?[p.back]:[]),...p.images])].slice(0,6)
 const same=shop.products.filter(x=>x.design===p.design&&x.id!==p.id),more=shop.products.filter(x=>x.subject===p.subject&&x.design!==p.design)
 const seen=new Set<string>(),moreOne=more.filter(x=>!seen.has(x.design)&&(seen.add(x.design),true)).slice(0,4)
 const sale=p.sale?shop.sales.find(x=>x.id===p.sale):null
 const ld={'@context':'https://schema.org','@type':'Product',name:p.title,image:pics,description:p.description.slice(0,500),brand:{'@type':'Brand',name:'FAN LIFE'},
  offers:{'@type':'Offer',url:p.url,priceCurrency:p.currency,price:(p.priceFrom/100).toFixed(2),availability:'https://schema.org/InStock'}}
 return <Shell locale="en"><main id="main" className="wks wks-pdp">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(ld).replace(/</g,'\\u003c')}}/>
  <nav className="wks-crumbs" aria-label={copy.title}><Link href="/shop">{copy.title}</Link> <span aria-hidden="true">›</span> <Link href={`/shop?club=${p.subject}`}>{club}</Link> <span aria-hidden="true">›</span> <span>{design}</span></nav>
  <div className="wks-pdp-grid">
   <section className="wks-gallery" aria-label={copy.pdpView.replace('{title}',p.title)}>
    {pics.map((src,i)=><figure key={src} className={i===0?'main':''}>
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img src={src} alt={i===0?p.title:''} width={900} height={900} loading={i===0?'eager':'lazy'}/>
     {p.back&&src===p.back?<figcaption>{copy.pdpBackSide}</figcaption>:i===0&&p.back?<figcaption>{copy.pdpFront}</figcaption>:null}</figure>)}
   </section>
   <section className="wks-buybox wk-panel" aria-labelledby="wks-pdp-h">
    <p className="wk-banner">{club}{what?` · ${what}`:''}</p>
    <h1 className="wk-head wks-pdp-h1" id="wks-pdp-h">{design}</h1>
    <p className="wks-badges static">{p.was?<span className="wks-badge sale">−{Math.round((1-p.priceFrom/p.was)*100)}%</span>:null}{isNew(p)?<span className="wks-badge new">{copy.badgeNew}</span>:null}{p.back?<span className="wks-badge">{copy.badgeBoth}</span>:null}</p>
    <p className="wks-pdp-price">{p.was?<s className="wks-was">{money(p.was,p.currency)}</s>:null}<b>{money(p.priceFrom,p.currency)}</b>{p.eur?<span className="wks-eur">{copy.eur.replace('{eur}',String(p.eur))}</span>:null}</p>
    {sale?<p className="wks-pdp-sale">{sale.label} · {leftText(sale.until)}</p>:null}
    <CheckoutButton url={p.url} copy={{buy:copy.pdpBuy,opening:copy.pdpOpening,k:copy.pdpOpenK,t:copy.pdpOpenT,sub:copy.pdpOpenSub,reopen:copy.pdpReopen,close:copy.pdpClose,blocked:copy.pdpBlocked,blockedCta:copy.pdpBlockedCta}}/>
    <p className="wk-small">{copy.pdpPick}</p>
    <ul className="wks-pdp-promise">{copy.pdpPromise.map(t=><li key={t}>{t}</li>)}</ul>
    <details className="wks-fold" open><summary className="min-h-tap">{copy.pdpDetails}</summary><p className="wk-small">{p.description}</p></details>
    {copy.faq.slice(0,3).map(([q,a])=><details key={q} className="wks-fold"><summary className="min-h-tap">{q}</summary><p className="wk-small">{a}</p></details>)}
   </section>
  </div>
  {same.length>0&&<section className="wks-shelf" aria-labelledby="wks-same-h"><div className="wks-shelf-head"><div><p className="wk-banner">{design}</p><h2 className="wk-head" id="wks-same-h">{copy.pdpSame}</h2></div></div>
   <ul className="wks-grid">{same.slice(0,8).map(x=><ShopCard key={x.id} p={x}/>)}</ul></section>}
  {moreOne.length>0&&<section className="wks-shelf" aria-labelledby="wks-more-h"><div className="wks-shelf-head"><h2 className="wk-head" id="wks-more-h">{copy.pdpMore.replace('{club}',club)}</h2>
   <Link className="wks-more min-h-tap" href={`/shop?club=${p.subject}`}>{copy.seeAll.replace('{n}',String(shop.products.filter(x=>x.subject===p.subject).length))} <span aria-hidden="true">→</span></Link></div>
   <ul className="wks-grid">{moreOne.map(x=><ShopCard key={x.id} p={x} siblings={shop.products.filter(y=>y.design===x.design).length-1}/>)}</ul></section>}
  <p className="wk-small wks-note">{copy.note}</p>
 </main></Shell>
}
