import type {Metadata} from 'next'
import Link from 'next/link'
import {Shell} from '@/components/master/Shell'
import {getOrder,owns} from '@/lib/pay/orders'
import {CATALOG} from '@/lib/pay/catalog'
import copy from '@/messages/en.pay.json'
import '../../weekly/shop.css'

export const dynamic='force-dynamic'
export const metadata:Metadata={title:copy.title,robots:{index:false,follow:false}}
const money=(c:number,cur:string)=>new Intl.NumberFormat('en',{style:'currency',currency:cur.toUpperCase()}).format(c/100)
/**
 * THE BUYER'S ORDER PAGE (16.11.2026): Stripe sends him here after paying, with the secret of his order in the link. It says
 * where the order stands and, once ready, hands over what he bought. While the payment is being confirmed it reloads itself.
 */
export default async function OrderPage({params,searchParams}:{params:{id:string};searchParams:{t?:string}}){
 const t=searchParams.t??null,o=await getOrder(params.id).catch(()=>null),mine=owns(o,t)
 const item=mine?CATALOG[o!.kind]:null,waiting=mine&&(o!.status==='open'||o!.status==='paid')
 return <Shell locale="en"><main id="main" className="wks wks-order">
  {waiting?<meta httpEquiv="refresh" content="6"/>:null}
  <section className="wk-panel wks-order-card" aria-labelledby="ord-h">
   <p className="wks-kicker">{copy.kicker}</p>
   <h1 id="ord-h" className="wks-h1">{mine?item!.name:copy.title}</h1>
   {!mine?<p>{copy.missing}</p>:<>
    <p className="wks-fine">{copy.number.replace('{id}',o!.id)} · {money(o!.amount_cents,o!.currency)}</p>
    <p role="status" aria-live="polite">{copy[o!.status]}</p>
    {o!.status==='fulfilled'&&o!.kind==='print-file'?<p><a className="wk-btn wks-buy min-h-tap" href={`/api/pay/file/${o!.id}?t=${encodeURIComponent(t!)}`} download>{copy.download}</a></p>:null}
    <p className="wks-fine">{copy.keep}</p>
   </>}
   <p><Link className="min-h-tap" href="/">{copy.back}</Link></p>
  </section>
 </main></Shell>
}
