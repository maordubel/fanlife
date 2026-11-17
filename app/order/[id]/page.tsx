import type {Metadata} from 'next'
import Link from 'next/link'
import {Shell} from '@/components/master/Shell'
import {OrderLive} from '@/components/pay/OrderLive'
import {getOrder,owns} from '@/lib/pay/orders'
import {money,previewOf} from '@/lib/pay/files'
import {CATALOG} from '@/lib/pay/catalog'
import copy from '@/messages/en.pay.json'
import '../../weekly/shop.css'
import './order.css'

export const dynamic='force-dynamic'
export const metadata:Metadata={title:copy.title,robots:{index:false,follow:false}}
/**
 * THE BUYER'S ORDER PAGE (16.11.2026; live since 17.11.2026): Stripe sends him here after paying, with the secret of his order in
 * the link. The live part (components/pay/OrderLive) follows the order from "confirming" to "on the press" to "ready".
 */
export default async function OrderPage({params,searchParams}:{params:{id:string};searchParams:{t?:string}}){
 const t=searchParams.t??null,o=await getOrder(params.id).catch(()=>null),mine=owns(o,t)
 return <Shell locale="en"><main id="main" className="wks pol-page">
  {mine?<OrderLive id={o!.id} t={t!} status={o!.status} kind={o!.kind} name={CATALOG[o!.kind].name} price={money(o!)} email={o!.email} preview={previewOf(o!)}/>
   :<section className="pol"><div className="pol-body"><p className="pol-kicker">{copy.kicker}</p><h1 className="pol-h">{copy.title}</h1><p className="pol-p">{copy.missing}</p></div></section>}
  <p className="pol-back"><Link className="min-h-tap" href="/">{copy.back}</Link></p>
 </main></Shell>
}
