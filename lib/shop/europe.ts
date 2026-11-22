import {PROVIDER_ORDER} from './kinds'

/**
 * EUROPE FIRST (owner plan, 22.11.2026): the buyers are in Europe, and on 22.11.2026 a $16.99 T-shirt printed in the
 * United States cost $10.39 to send to Athens. A product therefore prints at a printer INSIDE the European Union whenever
 * one prints that blank; quality still orders the choice among them (PROVIDER_ORDER). A blank no EU printer makes falls
 * back to the next blank of the kind that one does, and only then to a printer abroad — which the desk names.
 * Pure: no I/O. The United Kingdom is outside the Union's customs border, so it is not "Europe" here.
 */
export const POLICY='eu1'
const EU:Record<string,string>={AT:'Austria',BE:'Belgium',BG:'Bulgaria',HR:'Croatia',CY:'Cyprus',CZ:'Czechia',DK:'Denmark',EE:'Estonia',FI:'Finland',FR:'France',DE:'Germany',GR:'Greece',HU:'Hungary',IE:'Ireland',IT:'Italy',LV:'Latvia',LT:'Lithuania',LU:'Luxembourg',MT:'Malta',NL:'Netherlands',PL:'Poland',PT:'Portugal',RO:'Romania',SK:'Slovakia',SI:'Slovenia',ES:'Spain',SE:'Sweden'}
const OTHER:Record<string,string>={US:'United States',GB:'United Kingdom',UK:'United Kingdom',CN:'China',CA:'Canada',AU:'Australia',IN:'India',JP:'Japan',MX:'Mexico',BR:'Brazil'}
const BY_NAME=new Map<string,string>([...Object.entries({...EU,...OTHER}).map(([c,n])=>[n.toLowerCase(),c==='UK'?'GB':c] as [string,string]),['czech republic','CZ'],['the netherlands','NL'],['usa','US'],['united states of america','US']])
export type Located={id:number;title:string;location?:{country?:string|null}|null}

/** a provider's country as a two-letter code, whatever form Printify wrote it in; null when it did not say */
export function countryOf(p:Located,book?:ReadonlyMap<number,string>):string|null{
 const raw=(p.location?.country??book?.get(p.id)??'').trim();if(!raw)return null
 const up=raw.toUpperCase();if(/^[A-Z]{2}$/.test(up))return up==='UK'?'GB':up
 return BY_NAME.get(raw.toLowerCase())??null
}
export const inEurope=(code:string|null):boolean=>!!code&&code in EU
export const countryName=(code:string|null):string|null=>code?EU[code]??OTHER[code]??code:null
const rank=(title:string)=>{const i=PROVIDER_ORDER.findIndex(re=>re.test(title));return i<0?PROVIDER_ORDER.length:i}

/** the printer for a blank: inside the Union first (by quality order), then the old quality order */
export function pickProvider<P extends Located>(list:P[],book?:ReadonlyMap<number,string>,europeFirst=true):P|null{
 if(europeFirst){const eu=list.filter(p=>inEurope(countryOf(p,book))).sort((a,b)=>rank(a.title)-rank(b.title));if(eu[0])return eu[0]}
 for(const re of PROVIDER_ORDER){const hit=list.find(p=>re.test(p.title));if(hit)return hit}
 return list[0]??null
}

export type ShipProfile={variant_ids?:number[];first_item?:{cost?:number;currency?:string};additional_items?:{cost?:number;currency?:string};countries?:string[]}
export type Ship={first:number;next:number;currency:string}
/** what a parcel to a buyer in the Union costs (cents): the dearest EU profile, so the page never promises less than is charged */
export function shipToEurope(profiles:ShipProfile[]|undefined|null):Ship|null{
 const list=(profiles??[]).filter(p=>typeof p.first_item?.cost==='number')
 const eu=list.filter(p=>(p.countries??[]).some(c=>c.toUpperCase() in EU))
 const use=eu.length?eu:list.filter(p=>(p.countries??[]).some(c=>/rest.of.the.world|^row$/i.test(c)))
 if(!use.length)return null
 const top=use.reduce((a,b)=>(b.first_item!.cost!>a.first_item!.cost!?b:a))
 return {first:top.first_item!.cost!,next:top.additional_items?.cost??top.first_item!.cost!,currency:top.first_item!.currency||'USD'}
}

export type MoveMatch={blueprintId:number;providerId:number;europe?:boolean;policy?:string}
/** is this product, as it is printed today, on another blank or printer than the European one its kind now has? */
export function shouldMove(p:{blueprintId:number;providerId:number;europe?:boolean},target:MoveMatch|undefined):boolean{
 if(!target||target.policy!==POLICY||!target.europe)return false
 return p.blueprintId!==target.blueprintId||p.providerId!==target.providerId
}
