import 'server-only'
import {fileArea} from '@/lib/master/files'
import {isActive,type Sale} from './sales'
import {EMPTY_SHOP,isPublic,toPublic,type PublicProduct,type ShopDoc} from './types'

const area=fileArea('shop'),FILE='shop.json',secret=fileArea('shop-secret'),KEY='printify.json'
const clean=(d:Partial<ShopDoc>|null):ShopDoc=>({v:1,settings:{...EMPTY_SHOP.settings,...(d?.settings??{})},products:Array.isArray(d?.products)?d!.products:[],audit:(d?.audit??[]).slice(-80),...(d?.health?{health:d.health}:{})})
/** A store that refuses is an empty, closed shop — the shop never closes another screen (rule 105). */
/** Always a fresh read: the desk must see its own save at once (the store's read cache answered a stale copy, 12.11.2026); the public page has its own one-minute memory below. */
export async function readShop():Promise<ShopDoc>{try{const r=await area.read(FILE,true);return clean(r?JSON.parse(r.text) as Partial<ShopDoc>:null)}catch{return EMPTY_SHOP}}
export async function updateShop(by:string,what:string,fn:(d:ShopDoc)=>ShopDoc|void|Promise<ShopDoc|void>):Promise<ShopDoc>{
 kept=null
 return area.update<ShopDoc>(FILE,EMPTY_SHOP,async cur=>{const d=clean(structuredClone(cur)),next=(await fn(d))||d
  return {...next,audit:what?[...next.audit,{at:new Date().toISOString(),by,what:what.slice(0,160)}].slice(-80):next.audit}})
}
/** what /shop shows: nothing unless the owner opened the shop */
export type PublicSale={id:string;label:string;percent:number;until:string|null;scope:Sale['scope']}
type Public={open:boolean;popupUrl:string;promo:ShopDoc['settings']['promo'];products:PublicProduct[];sales:PublicSale[];promoters:{ribbon:string|null;freeShipOver:number|null;featured:string[]}}
let kept:{at:number;value:Public}|null=null
/** Read at most once a minute per server: every page's menu asks, and the answer changes only when the owner saves. */
export async function publicShop():Promise<Public>{
 if(kept&&Date.now()-kept.at<60e3)return kept.value
 const d=await readShop(),{usdToEur,eurGuide}=await import('./fx'),rate=d.settings.open?await usdToEur():null
 // a store-wide sale the owner runs in Printify: shown only while it is on, at the same percentage (the checkout applies it)
 const pr=d.settings.promo,on=!!pr&&pr.percent>0&&(!pr.until||Date.parse(pr.until)>Date.now()),promo=on?pr!:null
 const sales:PublicSale[]=(d.settings.sales??[]).filter(x=>isActive(x)).map(x=>({id:x.id,label:x.label,percent:x.percent,until:x.until,scope:x.scope})),pm=d.settings.promoters
 const value={open:d.settings.open,popupUrl:d.settings.popupUrl,promo,products:d.settings.open?d.products.filter(isPublic).map(toPublic).map(p=>{
  const now=promo?Math.round(p.priceFrom*(1-promo.percent/100)):p.priceFrom
  return {...p,...(promo?{was:p.was??p.priceFrom,priceFrom:now}:{}),...(p.sale&&!sales.some(x=>x.id===p.sale)?{sale:null}:{}),eur:p.currency==='USD'?eurGuide(now,rate):null}}):[],
  sales,promoters:{ribbon:pm?.ribbon||null,freeShipOver:pm?.freeShipOver??null,featured:pm?.featured??[]}}
 kept={at:Date.now(),value};return value
}
/** after the desk changes what the public sees: the next visitor reads fresh */
export const forgetPublicShop=()=>{kept=null}
/** The Printify token: the environment first, else the server-only file the owner saved from the desk. Never sent to a browser. */
export async function printifyToken():Promise<string|null>{
 if(process.env.PRINTIFY_API_TOKEN)return process.env.PRINTIFY_API_TOKEN
 try{const r=await secret.read(KEY,true);return r?(JSON.parse(r.text) as {token?:string}).token||null:null}catch{return null}
}
export async function saveToken(token:string){await secret.update<{token:string;at:string}>(KEY,{token:'',at:''},()=>({token,at:new Date().toISOString()}))}
