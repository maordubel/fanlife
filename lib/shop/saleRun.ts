import 'server-only'
import {client} from './build'
import {price} from './plan'
import {readShop,updateShop,forgetPublicShop} from './store'
import {saleFor,salePrice} from './sales'

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
