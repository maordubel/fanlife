import Link from 'next/link'
import {publicShop} from '@/lib/shop/store'
import type {PublicProduct} from '@/lib/shop/types'
import copy from '@/messages/en.shop.json'
import '@/app/weekly/shop.css'

const money=(c:number,cur:string)=>new Intl.NumberFormat('en',{style:'currency',currency:cur}).format(c/100)
/** One product as a sticker card: the mock-up, the name, the price, one Buy button that opens the Printify checkout. */
export function ShopCard({p}:{p:PublicProduct}){
 return <li className="wks-card wk-panel">
  <a className="wks-card-in" href={p.url} target="_blank" rel="noopener noreferrer" aria-label={copy.buyAria.replace('{title}',p.title)}>
   {/* eslint-disable-next-line @next/next/no-img-element */}
   <span className="wks-pics"><img className="wks-img" src={p.image} alt="" loading="lazy" width={600} height={600}/>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {p.back?<span className="wks-back"><img src={p.back} alt={copy.backAlt} loading="lazy" width={240} height={240}/><span>{copy.back}</span></span>:null}</span>
   <span className="wks-t"><b>{p.title}</b><span className="wk-k">{copy.from.replace('{price}',money(p.priceFrom,p.currency))}{p.eur?<span className="wks-eur">{copy.eur.replace('{eur}',String(p.eur))}</span>:null}</span></span>
   <span className="wk-btn wks-buy">{copy.buy} <span aria-hidden="true">↗</span></span>
  </a>
 </li>
}
/**
 * The shop's shelf inside another page (the shirt market, a club's home): up to `limit` products for the subject, FAN
 * LIFE's own filling the gaps. Renders NOTHING while the shop is closed or empty — a door never leads to an empty room.
 */
export async function ShopStrip({subject,limit=4,className=''}:{subject?:string;limit?:number;className?:string}){
 const shop=await publicShop().catch(()=>null);if(!shop?.open||!shop.products.length)return null
 const own=subject?shop.products.filter(p=>p.subject===subject):[],rest=shop.products.filter(p=>p.subject==='fanlife'&&!own.includes(p))
 const seen=new Set<string>(),pick=[...own,...(subject?rest:shop.products)].filter(p=>{const k=p.image;if(seen.has(k))return false;seen.add(k);return true}).slice(0,limit)
 if(!pick.length)return null
 return <section className={`wks-strip ${className}`} aria-labelledby="wks-strip-h">
  <div className="wks-strip-head"><div><p className="wk-banner">{copy.stripK}</p><h2 className="wk-head" id="wks-strip-h">{copy.stripT}</h2></div>
   <Link className="wk-btn paper min-h-tap" href={subject&&own.length?`/shop?club=${subject}`:'/shop'}>{copy.stripAll} <span aria-hidden="true">→</span></Link></div>
  <ul className="wks-grid">{pick.map(p=><ShopCard key={p.id} p={p}/>)}</ul>
 </section>
}
/** Is there anything to sell? Menus and doors ask this before they show a way in. */
export const shopIsOpen=async()=>{const s=await publicShop().catch(()=>null);return !!s?.open&&s.products.length>0}
/** The menu's way in: printed only while there is something to sell. */
export async function ShopNavLink({className}:{className?:string}){return (await shopIsOpen())?<Link className={className} href="/shop">{copy.navShop}</Link>:null}
