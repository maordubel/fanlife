import 'server-only'
import {KIND_SPECS} from './kinds'
import {SHARP_KEEP,fitTitle,shortTitle} from './plan'
import {readShop,updateShop,forgetPublicShop} from './store'
import {designKey,qualityOf,type ShopDoctorNote,type ShopProduct} from './types'

/**
 * THE DAILY DOCTOR (owner, 14.11.2026: "the system fixes my mistakes by itself, once a day"). Runs from the hourly check-up,
 * once per Athens day. It mends what can be mended without a judgement call, and lists what needs the owner's eye:
 *  · a title over 60 characters or not in the "Design · Product" form → rewritten (and sent to Printify);
 *  · the same design twice on the same product, both shown → the older one hidden;
 *  · a draft left unpressed for a day, or a product printing soft → pressed again with quality-first sizes (one a day);
 *  · a picture with a paper ground on dark garments without "Remove background" → needs your eye;
 *  · a design named like a file ("IMG_2041", "1.3.1.2") → needs a name;
 *  · a design on fewer than three products → suggests where else it sells.
 * Nothing is deleted and nothing hidden is shown: those stay the owner's call.
 */
const FILE_LIKE=/^[\d._\s-]+$|\.(png|jpe?g|webp)$|^(img|dsc|pxl|screenshot|image)[\s_-]?\d/i
const DAY=(iso:string)=>new Date(iso).toLocaleDateString('en-CA',{timeZone:'Europe/Athens'})
export const dueToday=(last?:string)=>!last||DAY(last)!==DAY(new Date().toISOString())

export async function shopDoctor(by='autopilot',press?:(id:string)=>Promise<unknown>,sync?:(id:string)=>Promise<unknown>):Promise<ShopDoctorNote>{
 const doc=await readShop(),fixed:string[]=[],needs:string[]=[],now=new Date().toISOString(),names=doc.settings.designNames??{}
 const nameOf=(p:ShopProduct)=>names[designKey(p)]??p.title.split(' · ')[0]!
 // 1 · titles
 const retitle:string[]=[]
 for(const p of doc.products){const what=p.blueprint?shortTitle(p.blueprint.title):KIND_SPECS[p.kind].label,want=fitTitle(nameOf(p),what)
  if(p.title!==want&&(p.title.length>60||!p.title.includes(' · ')))retitle.push(p.id)}
 // 2 · the same design on the same product twice, both shown: keep the newer
 const seen=new Map<string,ShopProduct>(),hide:string[]=[]
 for(const p of [...doc.products].filter(x=>x.visible).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))){const k=`${designKey(p)}|${p.kind}|${p.blueprint?.id??''}`
  if(seen.has(k))hide.push(p.id);else seen.set(k,p)}
 if(retitle.length||hide.length)await updateShop(by,'Daily doctor',d=>{for(const p of d.products){
  if(retitle.includes(p.id)){const what=p.blueprint?shortTitle(p.blueprint.title):KIND_SPECS[p.kind].label;p.title=fitTitle(nameOf(p),what);p.updatedAt=now}
  if(hide.includes(p.id)){p.visible=false;p.updatedAt=now}}})
 if(retitle.length){fixed.push(`${retitle.length} product name(s) put in the “Design · Product” form`);for(const id of retitle.slice(0,5))try{await sync?.(id)}catch{/* the listing catches up at the next edit */}}
 if(hide.length)fixed.push(`${hide.length} duplicate(s) hidden (the same design on the same product twice) — the newer one stays`)
 // 3 · press again: drafts older than a day, soft prints (one a day)
 const stale=doc.products.filter(p=>p.status==='draft'&&Date.now()-Date.parse(p.createdAt)>864e5)
 const soft=doc.products.filter(p=>p.status==='live'&&p.printify&&qualityOf(p)<SHARP_KEEP)
 let pressed=0;for(const p of [...stale,...soft].slice(0,1)){if(!press)break;try{await press(p.id)}catch{/* stays listed for tomorrow */}pressed++}
 if(pressed)fixed.push(`${pressed} product(s) pressed again with quality-first sizes`)
 if(stale.length+soft.length>pressed)needs.push(`${stale.length+soft.length-pressed} more product(s) wait for a quality re-press — the doctor does one a day (or press them in Products)`)
 // 4 · what needs the owner's eye
 const designs=new Map<string,ShopProduct[]>();for(const p of doc.products){const k=designKey(p);designs.set(k,[...(designs.get(k)??[]),p])}
 for(const [k,l] of designs){const n=names[k]??l[0]!.title.split(' · ')[0]!
  if(FILE_LIKE.test(n.trim()))needs.push(`Name the design “${n}” (Products → Name) — a file name does not sell`)
  if(l.some(p=>p.design?.shades&&p.design.shades!=='light'&&!p.design.cutout&&'library' in p.art))needs.push(`“${n}” prints on dark colours with its paper ground — switch on Remove background`)
  const live=l.filter(p=>p.status==='live').length;if(live>0&&live<3)needs.push(`“${n}” is on ${live} product(s) only — add it to a shirt, a poster and a mug (Create → Starter pack)`)}
 const note:ShopDoctorNote={at:now,fixed,needs:needs.slice(0,12)}
 await updateShop(by,'',d=>{d.doctor=note});if(fixed.length)forgetPublicShop()
 return note
}
