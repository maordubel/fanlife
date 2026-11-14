/**
 * SALES AND PROMOTERS (owner, 14.11.2026: "an option for a discount and all kinds of sales promoters").
 * A sale is a real price cut: the shop lowers the product's price in Printify for the sale's time, so the checkout charges the
 * sale price with no code, and puts the old price back when the sale ends. One product carries at most one sale — the deepest
 * that covers it. A sale never sells below cost: the cut stops at the printer's cost plus a small floor.
 * Pure functions only; the server work is lib/shop/saleRun.ts.
 */
import {shelfOf,designKey,type ShopProduct,type Shelf} from './types'

export const SALE_SCOPES=['all','club','shelf','design'] as const
export type SaleScope={type:(typeof SALE_SCOPES)[number];value?:string}
export type Sale={id:string;label:string;percent:number;scope:SaleScope;starts:string|null;until:string|null;on:boolean;createdAt:string}
/** the store-wide promoters the owner sets in the desk */
export type Promoters={
 /** the line in the ribbon at the top of the shop; empty = the shop writes one itself */
 ribbon?:string
 /** free shipping above this order total (dollars), set the same in Printify → Promotions; null = no such offer */
 freeShipOver?:number|null
 /** designs the owner picks for the "fan favourites" shelf, by design key */
 featured?:string[]
}
export const MIN_PERCENT=5,MAX_PERCENT=60
/** the printer's cost plus this share is the lowest a sale may go */
export const FLOOR_SHARE=.1

export const isActive=(s:Sale,now=Date.now())=>s.on&&s.percent>0&&(!s.starts||Date.parse(s.starts)<=now)&&(!s.until||Date.parse(s.until)>now)
export const covers=(s:Sale,p:Pick<ShopProduct,'subject'|'kind'|'blueprint'|'art'>)=>{
 const v=s.scope.value
 switch(s.scope.type){
  case 'all':return true
  case 'club':return p.subject===v
  case 'shelf':return shelfOf(p.kind,p.blueprint?.title)===(v as Shelf)
  case 'design':return designKey(p as ShopProduct)===v
 }
}
/** the sale a product should carry now: the deepest active one that covers it */
export function saleFor(p:Pick<ShopProduct,'subject'|'kind'|'blueprint'|'art'>,sales:Sale[]|undefined,now=Date.now()):Sale|null{
 let best:Sale|null=null
 for(const s of sales??[])if(isActive(s,now)&&covers(s,p)&&(!best||s.percent>best.percent))best=s
 return best
}
/** a variant's sale price (cents): the cut, rounded to .99, never under cost + floor */
export function salePrice(regular:number,cost:number,percent:number){
 const cut=Math.ceil(regular*(1-percent/100)/100)*100-1,floor=Math.ceil(cost*(1+FLOOR_SHARE))
 return Math.min(regular,Math.max(cut,floor))
}
/** "2 days 4 hours" / "5 hours" / "less than an hour" — how long a sale still runs */
export function timeLeft(until:string|null,now=Date.now()):{days:number;hours:number}|null{
 if(!until)return null;const ms=Date.parse(until)-now;if(!(ms>0))return null
 return {days:Math.floor(ms/864e5),hours:Math.floor(ms%864e5/36e5)}
}
/** the end of a day picked in the desk (a date input): 23:59 Athens time, the owner's clock */
export const endOfDay=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date)?new Date(`${date}T23:59:00+02:00`).toISOString():null
export const startOfDay=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date)?new Date(`${date}T00:00:00+02:00`).toISOString():null
/** a sale from the desk's form, checked; null when it cannot be a sale */
export function saleFromForm(o:Record<string,unknown>,now=new Date()):Sale|null{
 const percent=Math.round(Number(o.percent)),type=SALE_SCOPES.find(t=>t===o.scope)??'all',value=typeof o.value==='string'?o.value.slice(0,40):undefined
 if(!(percent>=MIN_PERCENT&&percent<=MAX_PERCENT))return null
 if(type!=='all'&&!value)return null
 const starts=typeof o.starts==='string'&&o.starts?startOfDay(o.starts):null,until=typeof o.until==='string'&&o.until?endOfDay(o.until):null
 if(until&&Date.parse(until)<=now.getTime())return null
 return {id:typeof o.id==='string'&&/^s-[a-z0-9]{4,16}$/.test(o.id)?o.id:`s-${now.getTime().toString(36)}`,label:String(o.label||'').trim().replace(/\s+/g,' ').slice(0,48)||'Sale',
  percent,scope:type==='all'?{type}:{type,value},starts,until,on:true,createdAt:now.toISOString()}
}
