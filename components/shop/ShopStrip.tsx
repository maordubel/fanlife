import Link from 'next/link'
import {publicShop} from '@/lib/shop/store'
import type {PublicProduct} from '@/lib/shop/types'
import copy from '@/messages/en.shop.json'
import '@/app/weekly/shop.css'

const money=(c:number,cur:string)=>new Intl.NumberFormat('en',{style:'currency',currency:cur,maximumFractionDigits:c%100?2:0}).format(c/100)
const NEW_DAYS=21
import {timeLeft} from '@/lib/shop/sales'
/** how long a sale still runs, in the ribbon's words */
export function leftText(until:string|null){const t=timeLeft(until);if(!t)return copy.leftOpen
 return t.days>1?copy.leftDays.replace('{d}',String(t.days)).replace('{h}',String(t.hours)):t.days===1?copy.leftDay.replace('{h}',String(t.hours)):t.hours>2?copy.leftHours.replace('{h}',String(t.hours)):copy.leftSoon}
export const isNew=(p:PublicProduct)=>!!p.since&&Date.now()-Date.parse(p.since)<NEW_DAYS*864e5
/**
 * One product as a sticker card (13.11.2026, the selling storefront): the mock-up with the back in a corner when it prints
 * there, badges (new, front + back), the name, the price with its euro guide, one Buy button into the Printify checkout,
 * and — when the same design is on other products — a link to see them together.
 */
export function ShopCard({p,clubLabel}:{p:PublicProduct;siblings?:number;clubLabel?:string}){
 const badge=p.was?<span className="wks-badge sale">−{Math.round((1-p.priceFrom/p.was)*100)}%</span>:p.sold>=2?<span className="wks-badge hot">{copy.badgePopular}</span>:isNew(p)?<span className="wks-badge new">{copy.badgeNew}</span>:null
 return <li className="wks-card">
  <Link className="wks-card-in" href={`/shop/p/${encodeURIComponent(p.id)}`} aria-label={copy.pdpView.replace('{title}',p.title)}>
   <span className="wks-pics">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="wks-img" src={p.image} alt="" loading="lazy" width={600} height={600}/>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {p.back?<span className="wks-back"><img src={p.back} alt={copy.backAlt} loading="lazy" width={240} height={240}/><span>{copy.back}</span></span>:null}
    {badge||p.back?<span className="wks-badges">{badge}{p.back&&!badge?<span className="wks-badge">{copy.badgeBoth}</span>:null}</span>:null}
   </span>
   <span className="wks-t">{clubLabel?<span className="wks-club">{clubLabel}</span>:null}<b>{p.title.split(' · ')[0]}</b><span className="wks-what">{p.title.split(' · ')[1]??''}</span>
    <span className="wks-price">{p.was?<s className="wks-was" aria-label={copy.was.replace('{price}',money(p.was,p.currency))}>{money(p.was,p.currency)}</s>:null}{money(p.priceFrom,p.currency)}{p.eur?<span className="wks-eur">{copy.eur.replace('{eur}',String(p.eur))}</span>:null}</span></span>
  </Link>
 </li>
}
/**
 * The shop's shelf inside another page (the shirt market, a club's home): up to `limit` products for the subject, FAN
 * LIFE's own filling the gaps, one product per design. Renders NOTHING while the shop is closed or empty.
 */
export async function ShopStrip({subject,limit=4,className=''}:{subject?:string;limit?:number;className?:string}){
 const shop=await publicShop().catch(()=>null);if(!shop?.open||!shop.products.length)return null
 const own=subject?shop.products.filter(p=>p.subject===subject):[],rest=shop.products.filter(p=>p.subject==='fanlife'&&!own.includes(p))
 const seen=new Set<string>(),pick=[...own,...(subject?rest:shop.products)].filter(p=>{if(seen.has(p.design))return false;seen.add(p.design);return true}).slice(0,limit)
 if(!pick.length)return null
 return <section className={`wks-strip ${className}`} aria-labelledby="wks-strip-h">
  <div className="wks-strip-head"><div><p className="wk-banner">{copy.stripK}</p><h2 className="wk-head" id="wks-strip-h">{copy.stripT}</h2></div>
   <Link className="wk-btn paper min-h-tap" href={subject&&own.length?`/shop?club=${subject}`:'/shop'}>{copy.stripAll} <span aria-hidden="true">→</span></Link></div>
  <ul className="wks-grid">{pick.map(p=><ShopCard key={p.id} p={p}/>)}</ul>
 </section>
}
/** Is there anything to sell? Menus and doors ask this before they show a way in. */
export const shopIsOpen=async()=>{const s=await publicShop().catch(()=>null);return !!s?.open&&s.products.length>0}
/** Does the shop sell anything for this club? (a club's menu shows its shop only then) */
export const shopHas=async(subject:string)=>{const s=await publicShop().catch(()=>null);return !!s?.open&&s.products.some(p=>p.subject===subject)}
/** The menu's way in: printed only while there is something to sell. */
export async function ShopNavLink({className}:{className?:string}){return (await shopIsOpen())?<Link className={className} href="/shop">{copy.navShop}</Link>:null}
