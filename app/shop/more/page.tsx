import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {SpreadshopEmbed} from '@/components/shop/Spreadshop'
import {publicShop} from '@/lib/shop/store'
import copy from '@/messages/en.shop.json'
import '../../weekly/shop.css'
export const dynamic='force-dynamic'
export const metadata:Metadata={title:`${copy.moreT} — ${copy.title}`,description:copy.moreSub,alternates:{canonical:'/shop/more'}}

/** MORE STYLES (14.11.2026): the second print partner's collection, drawn inside our page under the FAN LIFE masthead. */
export default async function More(){
 const shop=await publicShop();if(!shop.open||!shop.partner)notFound()
 return <Shell locale="en"><main id="main" className="wks">
  <nav className="wks-crumbs" aria-label={copy.title}><Link href="/shop">{copy.title}</Link> <span aria-hidden="true">›</span> <span>{shop.partner.label}</span></nav>
  <header className="wks-browse-head"><p className="wk-banner">{copy.moreK}</p><h1 className="wk-head wks-browse-h1">{shop.partner.label}</h1><p className="wk-small">{copy.moreSub}</p></header>
  <SpreadshopEmbed shop={shop.partner.shop} prefix={shop.partner.prefix} label={copy.moreOpen}/>
  <p className="wk-small wks-note">{copy.note}</p>
 </main></Shell>
}
