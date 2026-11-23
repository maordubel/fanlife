import 'server-only'
import {client} from './build'
import {price} from './plan'
import {readShop,updateShop,forgetPublicShop} from './store'
import {saleFor,salePrice,saleBeat,saleWords,covers} from './sales'
import {isPublic} from './types'
import {SITE_URL} from '@/lib/brand'

/**
 * Brings every product's price in Printify to what the sales say now: a product in an active sale gets the cut, a product
 * whose sale ended (or was stopped) gets its regular price back. A few products per call, oldest first, so a request stays
 * short: the desk walks the rest with "Apply now", and the hourly check-up finishes whatever is left (and ends sales on time).
 */
export async function applySales(by:string,limit=8):Promise<{done:number;pending:number;errors:string[]}>{
 const doc=await readShop(),shop=doc.settings.shopId,errors:string[]=[];let done=0
 if(!shop)return {done,pending:0,errors:['No Printify store is chosen.']}
 const want=(p:(typeof doc.products)[number])=>saleFor(p,doc.settings.sales)
 const off=doc.products.filter(p=>p.status==='live'&&p.printify?.productId&&(p.printify.sale?.id??null)!==(want(p)?.id??null))
 if(!off.length)return {done,pending:0,errors}
 const api=await client()
 for(const p of off.slice(0,limit)){
  const s=want(p),margin=p.design?.margin??doc.settings.margin
  try{
   const live=await api.product(shop,p.printify!.productId),on=live.variants.filter(v=>v.is_enabled)
   if(!on.length)continue
   const priced=on.map(v=>{const reg=price(v.cost,margin);return {id:v.id,reg,price:s?salePrice(reg,v.cost,s.percent):reg,is_enabled:true}})
   await api.update(shop,p.printify!.productId,{variants:priced.map(({id,price,is_enabled})=>({id,price,is_enabled}))})
   if(p.printify!.publishedAt)await api.publish(shop,p.printify!.productId).catch(()=>{})
   const was=Math.min(...priced.map(v=>v.reg)),now=Math.min(...priced.map(v=>v.price))
   await updateShop(by,'',d=>{const x=d.products.find(y=>y.id===p.id);if(!x?.printify)return
    x.printify.priceFrom=now
    if(s&&now<was)x.printify.sale={id:s.id,percent:Math.round((1-now/was)*100),was};else if(s)x.printify.sale={id:s.id,percent:0,was};else delete x.printify.sale})
   done++
  }catch(e){errors.push(`${p.title}: ${(e as Error).message}`)}
 }
 forgetPublicShop()
 return {done,pending:Math.max(0,off.length-done),errors}
}
/** Pieces sold per product, from Printify's orders (cancelled ones left out). Best effort: an error leaves the counts as they were. */
export async function countSold(by:string):Promise<number>{
 const doc=await readShop(),shop=doc.settings.shopId;if(!shop)return 0
 const api=await client(),sold=new Map<string,number>()
 for(let page=1;page<=3;page++){
  const r=await api.orders(shop,page);for(const o of r.data??[]){if(/cancel/i.test(o.status||''))continue;for(const li of o.line_items??[])sold.set(li.product_id,(sold.get(li.product_id)||0)+(li.quantity||1))}
  if(!r.last_page||page>=r.last_page)break
 }
 let changed=0
 await updateShop(by,'',d=>{for(const p of d.products){const n=p.printify?sold.get(p.printify.productId)??0:0;if((p.sold??0)!==n){p.sold=n;changed++}}})
 if(changed)forgetPublicShop()
 return [...sold.values()].reduce((a,b)=>a+b,0)
}

/**
 * THE SALE ON THE SOCIAL MACHINE (owner, 23.11.2026: approved). Once an hour the checkup asks every sale which announcement
 * is due (lib/shop/sales.ts → saleBeat) and queues ONE post through the hub's own publisher — the same queue and the same
 * product card as a product post (worker_marketing_queue_shop), about a product the sale covers, a different one per beat.
 * The beat is marked only when the queue took the post, so a failed hour is tried again the next.
 */
export async function announceSales(by:string):Promise<{queued:string[];errors:string[]}>{
 const doc=await readShop(),queued:string[]=[],errors:string[]=[]
 if(!doc.settings.open)return {queued,errors}
 const {rpc}=await import('@/lib/marketing/run')
 for(const sale of doc.settings.sales??[]){
  const beat=saleBeat(sale);if(!beat)continue
  const pool=doc.products.filter(p=>isPublic(p)&&covers(sale,p)).sort((a,b)=>(b.sold??0)-(a.sold??0))
  const product=pool[(['soon','on','last'].indexOf(beat))%Math.max(1,pool.length)];if(!product){errors.push(`${sale.label}: no product on the shelf to show`);continue}
  let image:URL;try{image=new URL(product.printify!.images[0]!)}catch{errors.push(`${sale.label}: the product has no picture`);continue}
  if(image.protocol!=='https:'||image.port||image.username||image.password||!image.hostname.endsWith('.printify.com')){errors.push(`${sale.label}: a Printify product image is required`);continue}
  const words=saleWords(sale,beat,doc.settings.margin),url=new URL(beat==='soon'?'/shop':'/shop?shelf=sale',SITE_URL).href
  const post={app:'fanlife',label:'FAN LIFE Shop',hook:words.hook,body:words.body,url,tags:'#FANLIFE #Football',visual:'FAN LIFE product card with the current shop image.',kit:{t:'SHOP',data:{image:image.href,title:words.hook,product:product.id,sale:sale.id,beat},to:['facebook','instagram','x']}}
  const id=await rpc<number>('worker_marketing_queue_shop',{p_product:product.id,p_post:post}).catch(()=>null)
  if(!id){errors.push(`${sale.label}: the post could not be queued`);continue}
  await updateShop(by,`Sale “${sale.label}” announced (${beat})`,d=>{const x=(d.settings.sales??[]).find(y=>y.id===sale.id);if(x)x.told={...(x.told??{}),[beat]:new Date().toISOString()}})
  queued.push(`${sale.label}: ${beat}`);break
 }
 return {queued,errors}
}
