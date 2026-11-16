import 'server-only'
import {createHash,randomBytes} from 'node:crypto'
import type {PayKind} from './catalog'

/**
 * Our orders live in Postgres (public.worker_pay_orders, RLS on, no policies: only this server, with the service key, reads or
 * writes them). The buyer's door to his order is a secret token in his link; only its hash is kept.
 */
export type Order={id:string;kind:PayKind;recipe:Record<string,unknown>;amount_cents:number;currency:string;status:'open'|'paid'|'fulfilled'|'failed'|'refunded'|'expired'
 email:string|null;stripe_session:string|null;stripe_payment:string|null;token_hash:string;result:Record<string,unknown>|null;error:string|null;created_at:string;paid_at:string|null;fulfilled_at:string|null}
const base=()=>`${process.env.FAN_LIFE_STORE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/worker_pay_orders`
const head=(extra:Record<string,string>={})=>{const k=process.env.SUPABASE_SERVICE_ROLE_KEY!;return {apikey:k,Authorization:`Bearer ${k}`,'Content-Type':'application/json',...extra}}
export const hashOf=(t:string)=>createHash('sha256').update(t).digest('hex')
export const newToken=()=>randomBytes(24).toString('base64url')
export const newId=()=>`po_${randomBytes(9).toString('base64url')}`

export async function createOrder(o:Pick<Order,'id'|'kind'|'recipe'|'amount_cents'|'currency'|'token_hash'>&{email?:string|null}){
 const r=await fetch(base(),{method:'POST',headers:head({Prefer:'return=minimal'}),body:JSON.stringify({...o,status:'open',email:o.email??null})})
 if(!r.ok)throw new Error(`Orders: ${r.status} ${(await r.text()).slice(0,160)}`)
}
export async function getOrder(id:string):Promise<Order|null>{
 if(!/^po_[\w-]{6,20}$/.test(id))return null
 const r=await fetch(`${base()}?id=eq.${encodeURIComponent(id)}&select=*`,{headers:head(),cache:'no-store'});if(!r.ok)return null
 return ((await r.json()) as Order[])[0]??null
}
/** a change that only happens from the state it expects (a repeated webhook changes nothing): answers whether it happened */
export async function moveOrder(id:string,from:Order['status'][],patch:Partial<Order>):Promise<boolean>{
 const r=await fetch(`${base()}?id=eq.${encodeURIComponent(id)}&status=in.(${from.join(',')})`,{method:'PATCH',headers:head({Prefer:'return=representation'}),body:JSON.stringify(patch)})
 return r.ok&&((await r.json()) as unknown[]).length>0
}
/** the buyer's token opens his order and nothing else */
export const owns=(o:Order|null,token:string|null)=>!!o&&!!token&&o.token_hash===hashOf(token)
