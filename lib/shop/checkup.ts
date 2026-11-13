import 'server-only'
import {PrintifyError} from './printify'
import {client,mockups,pressProduct} from './build'
import {readShop,updateShop,printifyToken} from './store'
import type {ShopProduct} from './types'

/**
 * THE SHOP'S HOURLY CHECK-UP (owner, 12.11.2026: "full automation — a healthy, stable, smart system").
 * Runs from GitHub Actions every hour and from the desk's "Check now". It repairs what it can and writes down what it could not:
 *  · Printify still answers, the token still works, the store is still the Pop-Up store;
 *  · every product on sale still exists in Printify — its listing address and mock-ups are re-read (they change when the store is renamed);
 *    a product deleted in Printify is hidden here, so the site never sells a dead link;
 *  · a press that died half-way ("building" for over 15 minutes) is marked for retry, and a press that failed on a passing error
 *    (Printify busy, no answer) is pressed again — at most two per run, so one run stays well inside the platform's time limit.
 * Nothing is ever shown or sold by this job: showing a product stays the owner's eye.
 */
export type {ShopHealthNote as ShopHealth} from './types'
import type {ShopHealthNote as ShopHealth} from './types'
const PASSING=/did not answer|slow down|HTTP 5\d\d|timed? ?out/i
const STUCK_MS=15*60e3,PER_RUN=40,RETRIES=2

export async function shopCheckup(by='autopilot'):Promise<ShopHealth>{
 const at=new Date().toISOString(),notes:string[]=[];let checked=0,repaired=0
 const save=async(ok:boolean)=>{const h:ShopHealth={at,ok,notes:notes.slice(0,12),checked,repaired};await updateShop(by,'',d=>{d.health=h});return h}
 const doc=await readShop(),shop=doc.settings.shopId
 if(!(await printifyToken()))return save((notes.push('Printify is not connected.'),false))
 if(!shop)return save((notes.push('No Printify store is chosen.'),false))
 const api=await client()
 // 1 · the token and the store
 try{const s=(await api.shops()).find(x=>x.id===shop)
  if(!s){notes.push('The chosen Printify store no longer exists — press Check again under Connect.');return save(false)}
  if(!/storefront|pop/i.test(s.sales_channel))notes.push(`“${s.title}” is not the Pop-Up store: customers cannot pay there.`)
  if(s.title!==doc.settings.shopTitle)await updateShop(by,'',d=>{d.settings.shopTitle=s.title})
 }catch(e){notes.push((e as Error).message);return save(false)}
 // 2 · stuck presses go back in the queue
 const now=Date.now()
 const stuck=doc.products.filter(p=>p.status==='building'&&now-Date.parse(p.updatedAt)>STUCK_MS).map(p=>p.id)
 if(stuck.length){await updateShop(by,'',d=>{for(const p of d.products)if(stuck.includes(p.id)){p.status='error';p.error='The press stopped half-way; it will be pressed again.'}});repaired+=stuck.length}
 // 3 · every product with a Printify id: still there? re-read its address and pictures (oldest checked first)
 const withId=[...doc.products].filter(p=>p.printify?.productId).sort((a,b)=>a.updatedAt.localeCompare(b.updatedAt)).slice(0,PER_RUN)
 for(const p of withId){
  try{const live=await api.product(shop,p.printify!.productId);checked++
   const url=live.external?.handle||p.printify!.url,mk=live.images.length?mockups(live.images,!!p.printify!.backImage):{images:p.printify!.images,backImage:p.printify!.backImage}
   if(url!==p.printify!.url||mk.images[0]!==p.printify!.images[0]){repaired++;await patch(by,p.id,x=>{x.printify={...x.printify!,url,images:mk.images,...(mk.backImage?{backImage:mk.backImage}:{})}})}
  }catch(e){
   if(e instanceof PrintifyError&&e.status===404){repaired++;notes.push(`“${p.title}” was deleted in Printify — hidden here.`)
    await patch(by,p.id,x=>{x.visible=false;x.status='error';x.error='Deleted in Printify. Press it again, or remove it.';delete x.printify})}
   else if(e instanceof PrintifyError&&e.status===401){notes.push(e.message);return save(false)}
   else notes.push(`${p.title}: ${(e as Error).message}`)
  }
 }
 // 4 · a press that failed on a passing error is pressed again (two per run)
 const again=(await readShop()).products.filter(p=>(p.status==='ready'||(p.status==='error'&&(!p.error||PASSING.test(p.error)||/half-way/.test(p.error))))&&(p.retries??0)<RETRIES).slice(0,2)
 for(const p of again){await patch(by,p.id,x=>{x.retries=(x.retries??0)+1});const out=await pressProduct(p.id,by);if(out.status==='live')repaired++;else notes.push(`${p.title}: ${out.error||'still not on sale'}`)}
 // 5 · the shop is open but shows nothing: say so
 const fresh=await readShop(),shown=fresh.products.filter(p=>p.visible&&p.status==='live').length
 if(fresh.settings.open&&!shown)notes.push('The shop is open but no product is shown.')
 return save(notes.length===0||notes.every(n=>/open but no product/.test(n)))
}
const patch=(by:string,id:string,fn:(p:ShopProduct)=>void)=>updateShop(by,'',d=>{const p=d.products.find(x=>x.id===id);if(p){fn(p);p.updatedAt=new Date().toISOString()}})
