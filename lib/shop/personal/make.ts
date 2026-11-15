import 'server-only'
import {createHash} from 'node:crypto'
import {SITE_URL} from '@/lib/brand'
import {client,pressProduct} from '@/lib/shop/build'
import {readShop,updateShop} from '@/lib/shop/store'
import type {ShopProduct} from '@/lib/shop/types'
import {encode,signOf} from './sign'

/**
 * The common road of every personal print (the XI, the souvenirs): the signed recipe, the product id (the same recipe twice is
 * the same product), a few a visitor a day, the press at Printify, and the link on the store's own domain.
 */
export type Made={url:string;image:string;proof:string}|{error:string;status:number}
const made=new Map<string,{day:string;n:number}>()
export const DAY_LIMIT=6
export const today=()=>new Date().toLocaleDateString('en-GB',{timeZone:'Europe/Athens'}).replace(/\//g,'.')
export function recipe(spec:object){const s=encode(spec),sig=signOf(s);return {s,sig,path:`/api/shop/personal/art?s=${s}&sig=${sig}`}}
export const hashOf=(s:string,product:string)=>createHash('sha1').update(s.replace(/"d":"[^"]+"/,'')+product).digest('hex').slice(0,12)
const ownOf=(popupUrl:string)=>/^https:\/\/(?![^/]*printify\.me)[^/]+/i.exec(popupUrl||'')?.[0]??null
export const onOwn=(popupUrl:string,u:string)=>{const own=ownOf(popupUrl);return own?u.replace(/^https:\/\/[^/]+\.printify\.me/i,own):u}
/** a visitor's count for today: false when he has made enough */
export function allow(r:Request):boolean{
 const ip=(r.headers.get('x-forwarded-for')||'').split(',')[0]!.trim()||'?',d=today(),c=made.get(ip)
 if(c&&c.day===d&&c.n>=DAY_LIMIT)return false
 made.set(ip,{day:d,n:(c?.day===d?c.n:0)+1});return true
}
/** draws the print file, makes the product and presses it; answers its checkout link on the store's own domain */
export async function makePersonal(r:Request,o:{id:string;subject:string;kind:'framed'|'poster';png:()=>Promise<Buffer>;size:{w:number;h:number};proof:string;title:string;description:string}):Promise<Made>{
 const doc=await readShop(),proof=`${SITE_URL}${o.proof}`
 const have=doc.products.find(p=>p.id===o.id)
 if(have?.status==='live'&&have.printify?.url)return {url:onOwn(doc.settings.popupUrl,have.printify.url),image:have.printify.images[0]??proof,proof}
 if(!allow(r))return {error:'That is plenty of prints for today — come back tomorrow.',status:429}
 try{
  const api=await client(),up=await api.upload(`fanlife-${o.id.replace(/[^a-z0-9-]/gi,'-')}.png`,(await o.png()).toString('base64')),now=new Date().toISOString()
  const p:ShopProduct={id:o.id,subject:o.subject,kind:o.kind,art:{upload:{id:up.id,name:`${o.title}.png`,preview:proof,width:o.size.w,height:o.size.h}},
   title:o.title.slice(0,60),description:o.description,status:'draft',visible:false,personal:true,createdAt:now,updatedAt:now}
  await updateShop('supporter','',d=>{d.products=[...d.products.filter(x=>x.id!==o.id),p]})
  const done=await pressProduct(o.id,'supporter')
  if(done.status!=='live'||!done.printify?.url)return {error:'The printer did not answer in time — try again in a minute.',status:502}
  return {url:onOwn(doc.settings.popupUrl,done.printify.url),image:done.printify.images[0]??proof,proof}
 }catch(e){return {error:String((e as Error)?.message||e).slice(0,200),status:502}}
}
