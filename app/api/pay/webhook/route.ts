import {NextResponse} from 'next/server'
import {verify,payOpen,type Session} from '@/lib/pay/stripe'
import {getOrder,moveOrder} from '@/lib/pay/orders'
import {deliver} from '@/lib/pay/deliver'
import {SITE_URL} from '@/lib/brand'
import {handleBookEvent} from '@/lib/book/fulfil'

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
 // the book's own checkouts (Broken Collective, 17.11.2026) ride the same endpoint: metadata.book marks them
 if(obj.metadata?.book){await handleBookEvent(ev as Parameters<typeof handleBookEvent>[0]);return NextResponse.json({ok:true})}
 if(!id)return NextResponse.json({ok:true})
 if(ev.type==='checkout.session.completed'&&obj.payment_status==='paid'){
  const now=new Date().toISOString()
  const to=obj.customer_details?.email??null,t=obj.metadata?.t,o0=await getOrder(id)
  // a print file is owed, not handed over: the maker draws and stores it, and only then the email goes (17.11.2026)
  const owed=o0?.kind==='print-file'&&to&&t?{owed:{to,who:obj.customer_details?.name??null,link:`${SITE_URL}/order/${id}?t=${t}`}}:{}
  if(await moveOrder(id,['open','expired'],{status:'paid',paid_at:now,email:to,stripe_payment:typeof obj.payment_intent==='string'?obj.payment_intent:null,...(o0?.kind==='print-file'?{result:owed}:{})})){
   const o=await getOrder(id)
   if(o?.kind==='print-file'){
    // a nudge to the maker on its own request (it outlives this answer); the buyer's page and the minute cron are the others
    void fetch(`${SITE_URL}/api/pay/prepare?id=${encodeURIComponent(id)}`,{method:'POST'}).catch(()=>{})
    await new Promise(r=>setTimeout(r,300))
   }else if(o){try{const d=await deliver(o);await moveOrder(id,['paid'],{status:d.status,...(d.status==='fulfilled'?{fulfilled_at:now}:{}),result:d.result??null})}
    catch(e){await moveOrder(id,['paid'],{error:String((e as Error).message).slice(0,300)})}}
  }
 }else if(ev.type==='checkout.session.expired')await moveOrder(id,['open'],{status:'expired'})
 else if(ev.type==='charge.refunded')await moveOrder(id,['paid','fulfilled'],{status:'refunded'})
 return NextResponse.json({ok:true})
}
