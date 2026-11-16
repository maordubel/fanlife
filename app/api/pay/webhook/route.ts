import {NextResponse} from 'next/server'
import {verify,payOpen,type Session} from '@/lib/pay/stripe'
import {getOrder,moveOrder} from '@/lib/pay/orders'
import {deliver} from '@/lib/pay/deliver'
import {mailOpen,orderMail,sendMail} from '@/lib/pay/mail'
import {CATALOG} from '@/lib/pay/catalog'
import {SITE_URL} from '@/lib/brand'

export const runtime='nodejs'
export const dynamic='force-dynamic'
/**
 * POST /api/pay/webhook — Stripe's word on a payment. Only a signed, fresh event moves an order, and only from the state it
 * expects, so a repeated event changes nothing. Events: checkout.session.completed (paid → delivered), checkout.session.expired,
 * charge.refunded. Everything else is acknowledged and ignored.
 */
export async function POST(r:Request){
 if(!payOpen())return new NextResponse(null,{status:503})
 const raw=await r.text()
 if(!verify(raw,r.headers.get('stripe-signature')))return new NextResponse('bad signature',{status:400})
 const ev=JSON.parse(raw) as {type:string;data:{object:Session&{metadata?:Record<string,string>;payment_intent?:string|null}}}
 const obj=ev.data.object,id=obj.metadata?.order
 if(!id)return NextResponse.json({ok:true})
 if(ev.type==='checkout.session.completed'&&obj.payment_status==='paid'){
  const now=new Date().toISOString()
  if(await moveOrder(id,['open','expired'],{status:'paid',paid_at:now,email:obj.customer_details?.email??null,stripe_payment:typeof obj.payment_intent==='string'?obj.payment_intent:null})){
   const o=await getOrder(id)
   if(o){try{const d=await deliver(o);await moveOrder(id,['paid'],{status:d.status,...(d.status==='fulfilled'?{fulfilled_at:now}:{}),result:d.result??null})
     // the branded email with the way back to it (16.11.2026): the buyer's own link, sent once (Resend's idempotency key)
     const to=obj.customer_details?.email,t=obj.metadata?.t
     if(d.status==='fulfilled'&&to&&t&&mailOpen()){
      const rec=o.recipe as {s?:string;sig?:string},preview=rec.s&&rec.sig?`${SITE_URL}/api/shop/personal/art?s=${rec.s}&sig=${rec.sig}`:null
      const price=new Intl.NumberFormat('en',{style:'currency',currency:o.currency.toUpperCase()}).format(o.amount_cents/100)
      try{const mid=await sendMail(to,orderMail({kind:o.kind,id,price,link:`${SITE_URL}/order/${id}?t=${t}`,preview,name:CATALOG[o.kind].name}),`mail-${id}`);await moveOrder(id,['fulfilled'],{result:{...(d.result??{}),mail:mid}})}
      catch(e){await moveOrder(id,['fulfilled'],{error:`mail: ${String((e as Error).message).slice(0,280)}`})}}}
    catch(e){await moveOrder(id,['paid'],{error:String((e as Error).message).slice(0,300)})}}
  }
 }else if(ev.type==='checkout.session.expired')await moveOrder(id,['open'],{status:'expired'})
 else if(ev.type==='charge.refunded')await moveOrder(id,['paid','fulfilled'],{status:'refunded'})
 return NextResponse.json({ok:true})
}
