import {NextResponse} from 'next/server'
import {SITE_URL} from '@/lib/brand'
import {CATALOG,isPayKind} from '@/lib/pay/catalog'
import {checkout,payOpen} from '@/lib/pay/stripe'
import {createOrder,hashOf,moveOrder,newId,newToken} from '@/lib/pay/orders'
import {decode} from '@/lib/shop/personal/sign'
import copy from '@/messages/en.pay.json'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const json=(d:unknown,s=200)=>NextResponse.json(d,{status:s,headers:{'Cache-Control':'no-store'}})
/** which of our own products can be bought right now (a page shows a pay button only for these) */
export async function GET(){return json({open:payOpen(),items:payOpen()?Object.values(CATALOG).filter(i=>i.on).map(({kind,name,cents,currency})=>({kind,name,cents,currency})):[]})}
/**
 * POST /api/pay/checkout — {kind, s, sig, email, back?}: one of our own products for one signed recipe (the same recipe the
 * personal print's proof is drawn from — nothing the buyer types reaches the file unchecked). Opens an order and answers the
 * Stripe Checkout address. The order is paid only when Stripe's signed webhook says so.
 */
export async function POST(r:Request){
 if(!payOpen())return json({error:'Payments are not open yet.'},503)
 let b:Record<string,unknown>;try{b=await r.json()}catch{return json({error:'Bad request.'},400)}
 if(!isPayKind(b.kind)||!CATALOG[b.kind].on)return json({error:'That is not on sale.'},404)
 const s=typeof b.s==='string'?b.s:null,sig=typeof b.sig==='string'?b.sig:null
 if(!decode<object>(s,sig))return json({error:'That print could not be read — make it again.'},422)
 // the email is required (owner, 17.11.2026): it is where the file is sent, and Stripe shows it locked on the payment page
 const email=typeof b.email==='string'&&/^[^@\s]{1,64}@[^@\s]{1,190}\.[a-z]{2,}$/i.test(b.email.trim())?b.email.trim():null
 if(!email)return json({error:copy.emailRequired},422)
 const item=CATALOG[b.kind],id=newId(),token=newToken()
 const back=typeof b.back==='string'&&b.back.startsWith('/')&&!b.back.startsWith('//')?b.back:'/shop'
 try{
  await createOrder({id,kind:item.kind,recipe:{s,sig},amount_cents:item.cents,currency:item.currency,token_hash:hashOf(token),email})
  const ses=await checkout({order:id,token,name:item.name,blurb:item.blurb,cents:item.cents,currency:item.currency,success:`${SITE_URL}/order/${id}?t=${token}`,cancel:`${SITE_URL}${back}`,email})
  await moveOrder(id,['open'],{stripe_session:ses.id})
  return ses.url?json({url:ses.url}):json({error:'The payment page did not open — try again.'},502)
 }catch(e){return json({error:String((e as Error).message).slice(0,200)},502)}
}
