import {APP_URL,ROLE,momentOf,type AppId,type Moment} from '@/ecosystem/sdk'

/**
 * UniverseProductRegistry — the one list of companion products the hub may point to. Config, not code paths:
 * a product is held out by `enabled:false` here, and a club can be held out per product. Nothing here calls another
 * product at run time; a link is built from the contract's URL and moment, so a dead product can never break a page.
 */
export type Product={id:AppId;name:string;enabled:boolean;/** clubs held out of this product's offers */heldOut:readonly string[];/** the one-line promise, English */line:string;cta:string}
export const PRODUCTS:readonly Product[]=[
 {id:'dubid',name:'DUBID',enabled:true,heldOut:[],line:'Fantasy football, one round at a time.',cta:'Pick your XI in DUBID'},
 {id:'offsides',name:'OFFSIDES',enabled:true,heldOut:[],line:'Play along with the match.',cta:'Open OFFSIDES'},
]
export const productOf=(id:AppId):Product|null=>PRODUCTS.find(p=>p.id===id)??null

export type Offer={product:AppId;name:string;line:string;cta:string;moment:Moment;href:string}
export function offerHref(to:AppId,clubId:string,moment:Moment):string{
 const u=new URL(APP_URL[to]+'/')
 u.searchParams.set('from','fanlife');u.searchParams.set('moment',moment);u.searchParams.set('club',clubId)
 return u.toString()
}
export const isCompanion=(id:AppId)=>ROLE[id]==='companion'
export const momentFor=(to:AppId):Moment|null=>momentOf('fanlife',to)
