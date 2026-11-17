import 'server-only'
import {createHash,createHmac,timingSafeEqual} from 'node:crypto'
import {printifyToken} from '@/lib/shop/store'
import {GOODS,type GoodsKind} from './catalog'

/**
 * The book's goods at Printify (owner, 17.11.2026). Same Printify account and token as FAN LIFE's shop, but a different
 * store: orders go only into the store titled "Broken Collective" (or BOOK_PRINTIFY_SHOP_ID), never into FAN LIFE's
 * stores. Each order names one of that store's two products (catalog GOODS) and the variant for the reader's colour and size.
 */
const BASE='https://api.printify.com/v1'
async function call<T>(token:string,what:string,path:string,body?:unknown,method=body===undefined?'GET':'POST'):Promise<T>{
 const r=await fetch(BASE+path,{method,cache:'no-store',signal:AbortSignal.timeout(45000),
  headers:{Authorization:`Bearer ${token}`,'User-Agent':'BrokenCollective/1.0','Content-Type':'application/json;charset=utf-8'},body:body===undefined?undefined:JSON.stringify(body)})
 const text=await r.text()
 if(!r.ok)throw new Error(`Printify ${what}: ${text.slice(0,260)} (HTTP ${r.status})`)
 return (text?JSON.parse(text):{}) as T
}

/** the book's store, and only it — a FAN LIFE store is never returned */
export async function bookShop(token:string):Promise<number|null>{
 const shops=await call<{id:number;title:string;sales_channel:string}[]>(token,'stores','/shops.json')
 const want=Number(process.env.BOOK_PRINTIFY_SHOP_ID)||null
 const s=want?shops.find(x=>x.id===want):shops.find(x=>/broken\s*collective|קולקטיב/i.test(x.title))
 return s&&!/fan\s*life/i.test(s.title)?s.id:null
}

/** pure: the product's variant for a colour and size, by Printify's "Colour / Size" title (tests/book-shop.test.ts) */
export function variantFor(variants:{id:number;title:string;is_enabled?:boolean;is_available?:boolean}[],colour:string,size:string):number|null{
 const norm=(x:string)=>x.trim().toUpperCase().replace(/^XXL$/,'2XL')
 const hit=variants.find(v=>{const [c,s]=v.title.split('/').map(x=>x.trim());return v.is_enabled!==false&&v.is_available!==false&&c?.toLowerCase()===colour.toLowerCase()&&(size==='One size'?true:norm(s??'')===norm(size))})
 return hit?.id??null
}
export type GoodsAddress={first_name:string;last_name:string;email?:string;phone?:string;country:string;region?:string;address1:string;address2?:string;city:string;zip:string}
/** one garment, printed on the fly, sent to production at once */
export async function orderGoods(o:{order:string;kind:GoodsKind;colour:string;size:string;address:GoodsAddress}):Promise<{id:string}>{
 const token=await printifyToken();if(!token)throw new Error('Printify is not connected.')
 const shop=await bookShop(token);if(!shop)throw new Error('The "Broken Collective" Printify store does not exist yet.')
 const g=GOODS[o.kind],p=await call<{variants:{id:number;title:string;is_enabled?:boolean;is_available?:boolean}[]}>(token,'product',`/shops/${shop}/products/${g.product}.json`)
 const variant=variantFor(p.variants,o.colour,o.size)
 if(!variant)throw new Error(`Printify: ${o.colour} / ${o.size} is not available`)
 await ensureWebhook(token,shop)
 const made=await call<{id:string}>(token,'order',`/shops/${shop}/orders.json`,{external_id:o.order,label:`BC ${o.order}`,
  line_items:[{product_id:g.product,variant_id:variant,quantity:1}],
  shipping_method:1,send_shipping_notification:false,address_to:o.address})
 await call(token,'production',`/shops/${shop}/orders/${made.id}/send_to_production.json`,{})
 return made
}

/** Printify signs webhooks with the secret we give it: X-Pfy-Signature: sha256=<hmac(body)>. The secret is derived from the token, so nothing is stored. */
const secretOf=(token:string)=>createHash('sha256').update(`book-webhook:${token}`).digest('hex').slice(0,40)
const HOOK=()=>`${process.env.NEXT_PUBLIC_SITE_URL||'https://fanlife.dubelteam.com'}/api/book/printify`
let hooked=false
async function ensureWebhook(token:string,shop:number){
 if(hooked)return
 const list=await call<{id:string;topic:string;url:string}[]>(token,'webhooks',`/shops/${shop}/webhooks.json`)
 for(const topic of ['order:shipment:created','order:updated'])
  if(!list.some(w=>w.topic===topic&&w.url===HOOK()))await call(token,'webhook',`/shops/${shop}/webhooks.json`,{topic,url:HOOK(),secret:secretOf(token)})
 hooked=true
}
export async function printifySigned(raw:string,header:string|null):Promise<boolean>{
 const token=await printifyToken();if(!token||!header)return false
 const want=createHmac('sha256',secretOf(token)).update(raw).digest('hex'),got=header.replace(/^sha256=/,'').trim()
 const a=Buffer.from(got),b=Buffer.from(want);return a.length===b.length&&timingSafeEqual(a,b)
}
