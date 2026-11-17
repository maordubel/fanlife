import 'server-only'
import {createHash,createHmac,timingSafeEqual} from 'node:crypto'
import {printifyToken} from '@/lib/shop/store'
import {PROVIDER_ORDER} from '@/lib/shop/kinds'
import {GOODS,type GoodsKind} from './catalog'

/**
 * The book's goods at Printify (owner, 17.11.2026). Same Printify account and token as FAN LIFE's shop, but a different
 * store: orders go only into the store titled "Broken Collective" (or BOOK_PRINTIFY_SHOP_ID), never into FAN LIFE's
 * pop-up store, and no product is created anywhere — each order prints the book's artwork on the fly
 * (line_items[].print_areas → image URL). The garment is found in the live catalogue by title, the provider by
 * FAN LIFE's quality-first order, and the answer is remembered for the life of the server.
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

type Pick={blueprint:number;provider:number;variants:Record<string,number>;positions:string[]}
const picked=new Map<GoodsKind,Pick>()
/** pure: the variant for each size in the wanted colour (tests/book-shop.test.ts) */
export function chooseVariants(kind:GoodsKind,variants:{id:number;title:string;options:Record<string,string>}[]):Record<string,number>{
 const g=GOODS[kind],out:Record<string,number>={}
 const colourOf=(v:{title:string;options:Record<string,string>})=>v.options.color??v.title.split('/')[0]?.trim()??''
 const sizeOf=(v:{title:string;options:Record<string,string>})=>v.options.size??v.title.split('/')[1]?.trim()??'One size'
 for(const c of variants.filter(v=>g.colour.test(colourOf(v))).sort((a,b)=>{const ca=colourOf(a),cb=colourOf(b),ord=(x:string)=>g.colour.source.indexOf(x.toLowerCase());return ord(ca)-ord(cb)})){
  const sz=g.sizes.length===1?'One size':sizeOf(c).toUpperCase().replace(/^XXL$/,'2XL')
  if(g.sizes.includes(sz)&&!(sz in out))out[sz]=c.id
 }
 return out
}
export async function pickGarment(token:string,kind:GoodsKind):Promise<Pick>{
 const have=picked.get(kind);if(have)return have
 const g=GOODS[kind],bps=await call<{id:number;title:string}[]>(token,'catalogue','/catalog/blueprints.json')
 const bp=g.find.map(re=>bps.find(b=>re.test(b.title)&&!(g.avoid?.test(b.title)))).find(Boolean)
 if(!bp)throw new Error(`Printify: no ${kind} in the catalogue`)
 const provs=await call<{id:number;title:string}[]>(token,'providers',`/catalog/blueprints/${bp.id}/print_providers.json`)
 const rank=(t:string)=>{const i=PROVIDER_ORDER.findIndex(re=>re.test(t));return i<0?99:i}
 for(const p of [...provs].sort((a,b)=>rank(a.title)-rank(b.title))){
  const v=await call<{variants:{id:number;title:string;options:Record<string,string>;placeholders:{position:string}[]}[]}>(token,'sizes',`/catalog/blueprints/${bp.id}/print_providers/${p.id}/variants.json`)
  const variants=chooseVariants(kind,v.variants),positions=[...new Set(v.variants.flatMap(x=>x.placeholders.map(ph=>ph.position)))]
  if(g.sizes.every(s=>s in variants)&&Object.keys(g.art).every(a=>positions.includes(a))){const pk={blueprint:bp.id,provider:p.id,variants,positions};picked.set(kind,pk);return pk}
 }
 throw new Error(`Printify: no provider prints the ${kind} in the book's colour and sizes`)
}

export type GoodsAddress={first_name:string;last_name:string;email?:string;phone?:string;country:string;region?:string;address1:string;address2?:string;city:string;zip:string}
/** one garment, printed on the fly, sent to production at once */
export async function orderGoods(o:{order:string;kind:GoodsKind;size:string;address:GoodsAddress}):Promise<{id:string}>{
 const token=await printifyToken();if(!token)throw new Error('Printify is not connected.')
 const shop=await bookShop(token);if(!shop)throw new Error('The "Broken Collective" Printify store does not exist yet.')
 const g=GOODS[o.kind],pk=await pickGarment(token,o.kind),variant=pk.variants[o.size]
 if(!variant)throw new Error(`Printify: size ${o.size} is not available`)
 await ensureWebhook(token,shop)
 const made=await call<{id:string}>(token,'order',`/shops/${shop}/orders.json`,{external_id:o.order,label:`BC ${o.order}`,
  line_items:[{print_provider_id:pk.provider,blueprint_id:pk.blueprint,variant_id:variant,print_areas:g.art,quantity:1}],
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
