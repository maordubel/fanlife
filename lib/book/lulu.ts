import 'server-only'
import {createHmac,timingSafeEqual} from 'node:crypto'
import {BOOK_SKU,EDITIONS,editionsOf,type BookLang,type Edition} from './catalog'

/**
 * Lulu Print API (api.lulu.com/docs), spoken to directly: an OAuth client-credentials token, then JSON.
 * LULU_CLIENT_KEY / LULU_CLIENT_SECRET from developers.lulu.com; LULU_SANDBOX=1 points everything at the sandbox
 * (sandbox jobs are never printed — use it for the first test order). Off until both keys are set.
 */
export const luluOpen=()=>!!(process.env.LULU_CLIENT_KEY&&process.env.LULU_CLIENT_SECRET)
const BASE=()=>process.env.LULU_SANDBOX==='1'?'https://api.sandbox.lulu.com':'https://api.lulu.com'

let token:{v:string;until:number}|null=null
async function bearer():Promise<string>{
 if(token&&Date.now()<token.until)return token.v
 const basic=Buffer.from(`${process.env.LULU_CLIENT_KEY}:${process.env.LULU_CLIENT_SECRET}`).toString('base64')
 const r=await fetch(`${BASE()}/auth/realms/glasstree/protocol/openid-connect/token`,{method:'POST',cache:'no-store',
  headers:{Authorization:`Basic ${basic}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'})
 const j=await r.json() as {access_token?:string;expires_in?:number;error_description?:string}
 if(!r.ok||!j.access_token)throw new Error(`Lulu sign-in: ${j.error_description||r.status}`)
 token={v:j.access_token,until:Date.now()+((j.expires_in??3600)-120)*1000}
 return token.v
}
async function call<T>(what:string,path:string,body?:unknown,method=body===undefined?'GET':'POST'):Promise<T>{
 const r=await fetch(`${BASE()}${path}`,{method,cache:'no-store',signal:AbortSignal.timeout(30000),
  headers:{Authorization:`Bearer ${await bearer()}`,'Content-Type':'application/json','Cache-Control':'no-cache'},body:body===undefined?undefined:JSON.stringify(body)})
 const text=await r.text()
 if(!r.ok)throw new Error(`Lulu ${what}: ${text.slice(0,300)} (HTTP ${r.status})`)
 return (text?JSON.parse(text):{}) as T
}

export type Address={name:string;street1:string;street2?:string;city:string;state_code?:string;postcode:string;country_code:string;phone_number:string;email?:string}
export type Level='MAIL'|'PRIORITY_MAIL'|'GROUND'|'EXPEDITED'|'EXPRESS'
export type Job={id:number;status:{name:string;messages?:Record<string,unknown>};external_id?:string;line_items?:{tracking_id?:string|null;tracking_urls?:string[]|null;carrier_name?:string|null}[];costs?:{total_cost_incl_tax?:string;currency?:string}}

/** the body of one print job: one copy of each edition in the parcel, to one address (pure — tested) */
export function jobBody(o:{order:string;edition:Edition;address:Address;level:Level;contact:string}){
 return {external_id:o.order,contact_email:o.contact,shipping_level:o.level,
  shipping_address:{...o.address,name:o.address.name.slice(0,35),street1:o.address.street1.slice(0,30),...(o.address.street2?{street2:o.address.street2.slice(0,30)}:{})},
  line_items:editionsOf(o.edition).map((l,i)=>{const e=EDITIONS[l];return {external_id:`${o.order}-${i+1}`,title:e.title.slice(0,255),quantity:1,
   printable_normalization:{pod_package_id:BOOK_SKU,cover:{source_url:e.cover},interior:{source_url:e.interior}}}})}
}
export const createJob=(o:Parameters<typeof jobBody>[0])=>call<Job>('print job','/print-jobs/',jobBody(o))
export const getJob=(id:number)=>call<Job>('print job',`/print-jobs/${id}/`)

/** Lulu's own price for one copy to a region, post included (the shop's margin check) */
export const cost=(edition:Edition,level:Level,address:Omit<Address,'name'|'phone_number'>&{phone_number?:string})=>
 call<{total_cost_incl_tax:string;currency:string;shipping_cost?:{total_cost_incl_tax:string};line_item_costs?:{total_cost_incl_tax:string}[]}>('price','/print-job-cost-calculations/',{
  line_items:editionsOf(edition).map(l=>({page_count:EDITIONS[l].pages,pod_package_id:BOOK_SKU,quantity:1})),shipping_option:level,
  shipping_address:{phone_number:'+302100000000',...address}})

/** the cover Lulu expects for this page count (checks the spine width print/build.py drew) */
export const coverSize=(lang:BookLang)=>call<{width:string;height:string;unit:string}>('cover size','/cover-dimensions/',{pod_package_id:BOOK_SKU,interior_page_count:EDITIONS[lang].pages,unit:'pt'})

/** Lulu signs its webhooks with HMAC-SHA256 of the raw body, keyed with the API secret (header Lulu-HMAC-SHA256) */
export function luluSigned(raw:string,header:string|null,secret=process.env.LULU_CLIENT_SECRET||''):boolean{
 if(!header||!secret)return false
 const want=createHmac('sha256',secret).update(raw).digest('hex'),a=Buffer.from(header.trim()),b=Buffer.from(want)
 return a.length===b.length&&timingSafeEqual(a,b)
}

/** registers this server's /api/book/lulu for PRINT_JOB_STATUS_CHANGED once (Lulu keeps it; a second call finds it there) */
let luluHooked=false
export async function ensureLuluWebhook(){
 if(luluHooked)return
 const url=`${process.env.NEXT_PUBLIC_SITE_URL||'https://fanlife.dubelteam.com'}/api/book/lulu`
 const list=await call<{results?:{url:string;topics:string[];is_active?:boolean}[]}>('webhooks','/webhooks/')
 if(!(list.results??[]).some(w=>w.url===url&&w.is_active!==false))await call('webhook','/webhooks/',{url,topics:['PRINT_JOB_STATUS_CHANGED']})
 luluHooked=true
}
