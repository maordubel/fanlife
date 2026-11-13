import type {Metadata} from 'next'
import Link from 'next/link'
import {Shell} from '@/components/master/Shell'
import {publicShop} from '@/lib/shop/store'
import {subjectName} from '@/lib/shop/subjects'
import type {PublicProduct} from '@/lib/shop/types'
import copy from '@/messages/en.shop.json'
import '../../weekly/shop.css'
export const dynamic='force-dynamic'
export const metadata:Metadata={title:`${copy.makeH1} — ${copy.title}`,description:copy.makeSub,alternates:{canonical:'/shop/make'}}

/**
 * MAKE YOUR OWN (owner, 13.11.2026: "design it yourself, with our graphic materials"). Step 1: every FAN LIFE design as a tile
 * (its name, how many products it is on, a wall or shirt mock-up as its face). Step 2 is the shop filtered to that design —
 * the supporter picks the product, the colour and the size at the Printify checkout. No new product is made per visitor.
 */
export default async function Make({searchParams}:{searchParams:{club?:string}}){
 const shop=await publicShop(),club=searchParams.club&&shop.products.some(p=>p.subject===searchParams.club)?searchParams.club:null
 const by=new Map<string,PublicProduct[]>();for(const p of shop.products)if(!club||p.subject===club){const l=by.get(p.design)??[];l.push(p);by.set(p.design,l)}
 const face=(l:PublicProduct[])=>l.find(p=>p.shelf==='wall')??l.find(p=>p.shelf==='wear')??l[0]!
 const designs=[...by.values()].sort((a,b)=>b.length-a.length)
 return <Shell locale="en"><main id="main" className="wks">
  <header className="wks-head wk-greenplate"><span className="wk-speed" aria-hidden="true"/>
   <div><p className="wk-banner">{club?subjectName(club):copy.kicker}</p><h1 className="wk-logo wks-h1">{copy.makeH1}</h1><p className="wk-small white">{copy.makeLead}</p></div></header>
  {designs.length?<ul className="wks-grid wks-designs">{designs.map(l=>{const f=face(l);return <li key={f.design} className="wks-card wk-panel">
   <Link className="wks-card-in" href={`/shop?design=${f.design}`}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <span className="wks-pics"><img className="wks-img" src={f.image} alt="" loading="lazy" width={600} height={600}/></span>
    <span className="wks-t"><b>{f.title.split(' · ')[0]}</b><span className="wks-what">{copy.makeOn.replace('{n}',String(l.length))}{f.subject!=='fanlife'?` · ${subjectName(f.subject)}`:''}</span></span>
    <span className="wk-btn wks-buy">{copy.makeOpen} <span aria-hidden="true">→</span></span></Link></li>})}</ul>
  :<p className="wk-small">{copy.empty}</p>}
  <p className="wk-small wks-note">{copy.note}</p>
 </main></Shell>
}
