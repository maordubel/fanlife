import 'server-only'
import {SITE_URL} from '@/lib/brand'
import {decode} from '@/lib/shop/personal/sign'
import {printPng} from '@/lib/shop/personal/render'
import type {XIPrintSpec} from '@/lib/shop/personal/xi-poster'
import type {SouvenirSpec} from '@/lib/shop/personal/souvenirs'
import {CATALOG} from './catalog'
import {mailOpen,orderMail,sendMail} from './mail'
import {getOrder,moveOrder,type Order} from './orders'

/**
 * THE PAID FILE IS MADE ONCE, THEN HANDED OVER (17.11.2026, owner: "the email and the link must not go out before the file is
 * fully ready to download — reliable, as fast as can be; if it takes time, say so properly after the payment").
 *
 * Paid (webhook) → the order waits as `paid` with the email it owes → one maker draws the full sheet (printPng, seconds),
 * stores it in the private bucket `pay-files`, marks the order `fulfilled` and only then sends the email. The download is a
 * short-lived signed link to the stored file: instant, and the same bytes every time.
 * Three things start the maker, whichever comes first, and a lease lets only one of them work an order at a time:
 * the buyer's own order page (he lands there from Stripe), the webhook's nudge, and a minute cron for anyone who left.
 */
const store=()=>process.env.FAN_LIFE_STORE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY!
const auth=()=>({apikey:key(),Authorization:`Bearer ${key()}`})
export const BUCKET='pay-files'
const pathOf=(id:string)=>`${id}.png`
const LEASE_MS=3*60e3,MAX_TRIES=5
const orders=()=>`${store()}/rest/v1/worker_pay_orders`

type Owed={to:string;who:string|null;link:string}
type Result={owed?:Owed|null;making?:string|null;tries?:number;stored?:string|null;bytes?:number;mail?:string|null;ms?:number;file?:unknown}

export async function putFile(id:string,png:Buffer){
 const r=await fetch(`${store()}/storage/v1/object/${BUCKET}/${pathOf(id)}`,{method:'POST',headers:{...auth(),'Content-Type':'image/png','x-upsert':'true','cache-control':'private, max-age=0'},body:new Uint8Array(png)})
 if(!r.ok)throw new Error(`Store: ${r.status} ${(await r.text()).slice(0,120)}`)
 return pathOf(id)
}
/** a link to the stored file that works for five minutes and downloads under a friendly name */
export async function fileLink(id:string):Promise<string|null>{
 const r=await fetch(`${store()}/storage/v1/object/sign/${BUCKET}/${pathOf(id)}`,{method:'POST',headers:{...auth(),'Content-Type':'application/json'},body:JSON.stringify({expiresIn:300})})
 if(!r.ok)return null
 const j=await r.json() as {signedURL?:string};if(!j.signedURL)return null
 return `${store()}/storage/v1${j.signedURL}&download=${encodeURIComponent(`fanlife-print-${id}.png`)}`
}
export async function dropFiles(ids:string[]){
 if(!ids.length)return
 await fetch(`${store()}/storage/v1/object/${BUCKET}`,{method:'DELETE',headers:{...auth(),'Content-Type':'application/json'},body:JSON.stringify({prefixes:ids.map(pathOf)})})
}

/** takes the order for this maker if nobody holds it (or the holder has been gone three minutes) */
async function lease(o:Order):Promise<boolean>{
 const res=(o.result??{}) as Result,mine=new Date().toISOString(),stale=new Date(Date.now()-LEASE_MS).toISOString()
 if(res.making&&res.making>stale)return false
 const q=`id=eq.${encodeURIComponent(o.id)}&status=eq.paid&or=(result.is.null,result->>making.is.null,result->>making.lt.${encodeURIComponent(stale)})`
 const r=await fetch(`${orders()}?${q}`,{method:'PATCH',headers:{...auth(),'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({result:{...res,making:mine,tries:(res.tries??0)+1}})})
 return r.ok&&((await r.json()) as unknown[]).length>0
}

export type Made={state:'ready'|'making'|'waiting'|'failed'|'none'}
/** makes the paid file of one order if it is owed; safe to call any number of times from anywhere */
export async function makeFile(id:string):Promise<Made>{
 const o=await getOrder(id)
 if(!o||o.kind!=='print-file')return {state:'none'}
 if(o.status==='fulfilled')return {state:'ready'}
 if(o.status==='failed')return {state:'failed'}
 if(o.status!=='paid')return {state:'waiting'}
 if(!await lease(o))return {state:'making'}
 const res=((await getOrder(id))?.result??{}) as Result,t0=Date.now()
 try{
  const rec=o.recipe as {s?:string;sig?:string},spec=decode<XIPrintSpec|SouvenirSpec>(rec.s??null,rec.sig??null)
  if(!spec)throw new Error('the signed recipe no longer reads')
  const stored=await putFile(o.id,await printPng(spec)),now=new Date().toISOString()
  const done:Result={...res,making:null,stored,ms:Date.now()-t0,owed:res.owed??null}
  if(!await moveOrder(o.id,['paid'],{status:'fulfilled',fulfilled_at:now,error:null,result:done as Record<string,unknown>}))return {state:'ready'}
  // only now, with the file in place, the email goes out (once: Resend's idempotency key is the order)
  if(res.owed&&mailOpen()){
   try{const mid=await sendMail(res.owed.to,orderMail({kind:o.kind,id:o.id,price:money(o),link:res.owed.link,preview:previewOf(o),name:CATALOG[o.kind].name,who:res.owed.who,to:res.owed.to}),`mail-${o.id}`)
    await moveOrder(o.id,['fulfilled'],{result:{...done,owed:null,mail:mid} as Record<string,unknown>})}
   catch(e){await moveOrder(o.id,['fulfilled'],{error:`mail: ${String((e as Error).message).slice(0,280)}`})}
  }
  return {state:'ready'}
 }catch(e){
  const tries=res.tries??1,msg=String((e as Error).message).slice(0,280)
  await moveOrder(o.id,['paid'],tries>=MAX_TRIES?{status:'failed',error:`file: ${msg}`}:{error:`file (try ${tries}): ${msg}`,result:{...res,making:null} as Record<string,unknown>})
  return {state:tries>=MAX_TRIES?'failed':'making'}
 }
}
/** every owed file, oldest first (the minute cron and the webhook's nudge land here) */
export async function makeOwed(limit=3){
 const r=await fetch(`${orders()}?status=eq.paid&kind=eq.print-file&select=id&order=paid_at.asc&limit=${limit}`,{headers:auth(),cache:'no-store'})
 const ids=r.ok?((await r.json()) as {id:string}[]).map(x=>x.id):[]
 const out:Record<string,string>={}
 for(const id of ids)out[id]=(await makeFile(id)).state
 return out
}
/** files older than 120 days leave the store (the order still hands one over: it is drawn again on demand) */
export async function dropOld(){
 const before=new Date(Date.now()-120*864e5).toISOString()
 const r=await fetch(`${orders()}?status=eq.fulfilled&kind=eq.print-file&fulfilled_at=lt.${before}&result->>stored=not.is.null&select=id,result&limit=50`,{headers:auth(),cache:'no-store'})
 const old=r.ok?(await r.json()) as {id:string;result:Result}[]:[]
 await dropFiles(old.map(o=>o.id))
 for(const o of old)await moveOrder(o.id,['fulfilled'],{result:{...o.result,stored:null} as Record<string,unknown>})
 return old.length
}
export const money=(o:Pick<Order,'amount_cents'|'currency'>)=>new Intl.NumberFormat('en',{style:'currency',currency:o.currency.toUpperCase()}).format(o.amount_cents/100)
export const previewOf=(o:Pick<Order,'recipe'>)=>{const rec=o.recipe as {s?:string;sig?:string};return rec.s&&rec.sig?`${SITE_URL}/api/shop/personal/art?s=${rec.s}&sig=${rec.sig}`:null}
