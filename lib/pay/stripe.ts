import 'server-only'
import {createHmac,timingSafeEqual} from 'node:crypto'

/**
 * Stripe, spoken to directly (no SDK: two calls and a signature are all we need). Server only; the secret never reaches a page.
 * Off until both keys are set on the deployment — every door then answers "not open" and no page shows a pay button.
 */
export const payOpen=()=>!!(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_WEBHOOK_SECRET&&process.env.SUPABASE_SERVICE_ROLE_KEY)

/** Stripe's form encoding, nested keys included (line_items[0][price_data][currency]=eur) */
export function form(o:Record<string,unknown>,pre=''):string[]{
 const out:string[]=[]
 for(const [k,v] of Object.entries(o)){if(v===undefined||v===null)continue;const key=pre?`${pre}[${k}]`:k
  if(Array.isArray(v))v.forEach((x,i)=>out.push(...(x&&typeof x==='object'?form(x as Record<string,unknown>,`${key}[${i}]`):[`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(x))}`])))
  else if(typeof v==='object')out.push(...form(v as Record<string,unknown>,key))
  else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`)}
 return out
}
async function call<T>(path:string,body:Record<string,unknown>,idem?:string):Promise<T>{
 const r=await fetch(`https://api.stripe.com/v1/${path}`,{method:'POST',headers:{Authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`,'Content-Type':'application/x-www-form-urlencoded',...(idem?{'Idempotency-Key':idem}:{})},body:form(body).join('&')})
 const j=await r.json() as T&{error?:{message?:string}}
 if(!r.ok)throw new Error(`Stripe: ${j.error?.message||r.status}`)
 return j
}
export type Session={id:string;url:string|null;payment_status?:string;status?:string;payment_intent?:string|null;customer_details?:{email?:string|null;name?:string|null}|null;metadata?:Record<string,string>}
/** one Checkout Session for one order: the price written in, our order id in metadata, back to the order page after */
export const checkout=(o:{order:string;token:string;name:string;blurb:string;cents:number;currency:string;success:string;cancel:string;email?:string})=>call<Session>('checkout/sessions',{
 mode:'payment',success_url:o.success,cancel_url:o.cancel,client_reference_id:o.order,metadata:{order:o.order,t:o.token},payment_intent_data:{metadata:{order:o.order}},
 line_items:[{quantity:1,price_data:{currency:o.currency,unit_amount:o.cents,product_data:{name:o.name,description:o.blurb}}}],
 ...(o.email?{customer_email:o.email}:{}),automatic_tax:{enabled:false},allow_promotion_codes:true,expires_at:Math.floor(Date.now()/1000)+3600,
},`order-${o.order}`)

/** a webhook is Stripe's only if its signature checks (HMAC-SHA256 of "t.body") and it is fresh (5 minutes) */
export function verify(raw:string,header:string|null,secret=process.env.STRIPE_WEBHOOK_SECRET||'',now=Date.now()):boolean{
 if(!header||!secret)return false
 const parts=Object.fromEntries(header.split(',').map(p=>p.split('=') as [string,string])),t=Number(parts.t)
 if(!t||Math.abs(now/1000-t)>300)return false
 const want=createHmac('sha256',secret).update(`${t}.${raw}`).digest('hex')
 return header.split(',').filter(p=>p.startsWith('v1=')).some(p=>{const a=Buffer.from(p.slice(3)),b=Buffer.from(want);return a.length===b.length&&timingSafeEqual(a,b)})
}
/** the same authenticated call for other sellers on this account (the book, 17.11.2026) */
export const stripeCall=call
/** a read on the same account (the book's retry loop re-reads a paid session) */
export async function stripeGet<T>(path:string):Promise<T>{
 const r=await fetch(`https://api.stripe.com/v1/${path}`,{headers:{Authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`},cache:'no-store'})
 const j=await r.json() as T&{error?:{message?:string}}
 if(!r.ok)throw new Error(`Stripe: ${j.error?.message||r.status}`)
 return j
}
