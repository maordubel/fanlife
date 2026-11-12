import 'server-only'
import {fileArea} from '@/lib/master/files'
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
type Public={open:boolean;popupUrl:string;products:PublicProduct[]}
let kept:{at:number;value:Public}|null=null
/** Read at most once a minute per server: every page's menu asks, and the answer changes only when the owner saves. */
export async function publicShop():Promise<Public>{
 if(kept&&Date.now()-kept.at<60e3)return kept.value
 const d=await readShop(),value={open:d.settings.open,popupUrl:d.settings.popupUrl,products:d.settings.open?d.products.filter(isPublic).map(toPublic):[]}
 kept={at:Date.now(),value};return value
}
/** The Printify token: the environment first, else the server-only file the owner saved from the desk. Never sent to a browser. */
export async function printifyToken():Promise<string|null>{
 if(process.env.PRINTIFY_API_TOKEN)return process.env.PRINTIFY_API_TOKEN
 try{const r=await secret.read(KEY,true);return r?(JSON.parse(r.text) as {token?:string}).token||null:null}catch{return null}
}
export async function saveToken(token:string){await secret.update<{token:string;at:string}>(KEY,{token:'',at:''},()=>({token,at:new Date().toISOString()}))}
