import 'server-only'
import {randomBytes} from 'node:crypto'
import type {BookLang,Region,Ship} from './catalog'

/** public.worker_book_orders — RLS on, no policies: only this server, with the service key, reads or writes it. */
export type BookOrder={id:string;kind:'tip'|'paperback'|'tee'|'cap';variant:string|null;printify_order:string|null;lang:BookLang;region:Region|null;ship:Ship|null;amount_cents:number;currency:string
 status:'open'|'paid'|'printing'|'shipped'|'done'|'failed'|'refunded'|'expired'|'canceled';email:string|null;stripe_session:string|null;stripe_payment:string|null
 lulu_job:number|null;lulu_status:string|null;lulu_cost:string|null;tracking:Record<string,unknown>|null;error:string|null;fix:Record<string,string>|null;attempts:number;alerted_at:string|null;created_at:string;paid_at:string|null;shipped_at:string|null}
const base=()=>`${process.env.FAN_LIFE_STORE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/worker_book_orders`
const head=(extra:Record<string,string>={})=>{const k=process.env.SUPABASE_SERVICE_ROLE_KEY!;return {apikey:k,Authorization:`Bearer ${k}`,'Content-Type':'application/json',...extra}}
export const newBookId=()=>`bk_${randomBytes(9).toString('base64url')}`
export const isBookId=(id:unknown):id is string=>typeof id==='string'&&/^bk_[\w-]{6,20}$/.test(id)

export async function createBookOrder(o:Pick<BookOrder,'id'|'kind'|'lang'|'amount_cents'>&Partial<Pick<BookOrder,'region'|'ship'|'variant'>>){
 const r=await fetch(base(),{method:'POST',headers:head({Prefer:'return=minimal'}),body:JSON.stringify({region:null,ship:null,...o,currency:'eur',status:'open'})})
 if(!r.ok)throw new Error(`Book orders: ${r.status} ${(await r.text()).slice(0,160)}`)
}
export async function getBookOrder(by:{id?:string;lulu_job?:number;printify_order?:string}):Promise<BookOrder|null>{
 const q=by.id&&isBookId(by.id)?`id=eq.${encodeURIComponent(by.id)}`:by.lulu_job?`lulu_job=eq.${by.lulu_job}`:by.printify_order&&/^[\w-]{6,40}$/.test(by.printify_order)?`printify_order=eq.${by.printify_order}`:null
 if(!q)return null
 const r=await fetch(`${base()}?${q}&select=*`,{headers:head(),cache:'no-store'});if(!r.ok)return null
 return ((await r.json()) as BookOrder[])[0]??null
}
/** moves an order only from the state it expects (a repeated webhook changes nothing); answers whether it moved */
export async function moveBookOrder(id:string,from:BookOrder['status'][],patch:Partial<BookOrder>):Promise<boolean>{
 const r=await fetch(`${base()}?id=eq.${encodeURIComponent(id)}&status=in.(${from.join(',')})`,{method:'PATCH',headers:head({Prefer:'return=representation'}),body:JSON.stringify(patch)})
 return r.ok&&((await r.json()) as unknown[]).length>0
}

/** paid paperbacks and goods that have not reached their maker yet (the retry loop's list) */
export async function stuckBookOrders():Promise<BookOrder[]>{
 const r=await fetch(`${base()}?status=eq.paid&kind=in.(paperback,tee,cap)&lulu_job=is.null&printify_order=is.null&select=*&order=paid_at.asc&limit=20`,{headers:head(),cache:'no-store'})
 return r.ok?await r.json() as BookOrder[]:[]
}
export async function patchBookOrder(id:string,patch:Partial<BookOrder>){
 await fetch(`${base()}?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:head({Prefer:'return=minimal'}),body:JSON.stringify(patch)})
}
