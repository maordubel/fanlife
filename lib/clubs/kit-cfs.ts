import 'server-only'
import aek from '@/content/manual/kit-cfs-aek-athens.json'
import celtic from '@/content/manual/kit-cfs-celtic.json'
import hta from '@/content/manual/kit-cfs-hapoel-tel-aviv.json'
import olympiacos from '@/content/manual/kit-cfs-olympiacos.json'
import pao from '@/content/manual/kit-cfs-panathinaikos.json'
import stPauli from '@/content/manual/kit-cfs-st-pauli.json'
import zrinjski from '@/content/manual/kit-cfs-zrinjski-mostar.json'
import shopAek from '@/content/manual/kit-shop-aek-athens.json'
import shopCeltic from '@/content/manual/kit-shop-celtic.json'
import shopHta from '@/content/manual/kit-shop-hapoel-tel-aviv.json'
import shopHpt from '@/content/manual/kit-shop-hapoel-petah-tikva.json'
import shopOlympiacos from '@/content/manual/kit-shop-olympiacos.json'
import shopPao from '@/content/manual/kit-shop-panathinaikos.json'
import shopStPauli from '@/content/manual/kit-shop-st-pauli.json'
import shopZrinjski from '@/content/manual/kit-shop-zrinjski-mostar.json'
import {variantOf} from '@/lib/clubs/kit-model'

/** Shirt photographs from Club Football Shirts' archive pages (owner's approval, chat 2026-10-10). Type and season are what the file name states. */
export type CfsKit={id:string;type:string;season:string;image:string;width:number;height:number;page?:string;/** a retailer's photograph: the shop and its product page, and the product title's own words */credit?:{publisher:string;url:string;page?:string};title?:string;maker?:string|null;longSleeve?:boolean;spans?:string|null;seasonAmbiguous?:boolean}
export type CfsSet={source:{publisher:string;url:string;archivePage:string};count:number;kits:CfsKit[]}
const CFS:Record<string,CfsSet>={'aek-athens':aek,celtic,'hapoel-tel-aviv':hta,olympiacos,panathinaikos:pao,'st-pauli':stPauli,'zrinjski-mostar':zrinjski} as unknown as Record<string,CfsSet>
const SHOP:Record<string,{kits:CfsKit[]}>={'aek-athens':shopAek,celtic:shopCeltic,'hapoel-tel-aviv':shopHta,'hapoel-petah-tikva':shopHpt,olympiacos:shopOlympiacos,panathinaikos:shopPao,'st-pauli':shopStPauli,'zrinjski-mostar':shopZrinjski} as unknown as Record<string,{kits:CfsKit[]}>
/** Club Football Shirts' archive photographs first (one publisher, one look), then the retailers' real shirts; a long-sleeved shirt never stands in for a short-sleeved one's card */
const SETS:Record<string,CfsSet>=Object.fromEntries([...new Set([...Object.keys(CFS),...Object.keys(SHOP)])].map((club)=>{
 const base=CFS[club],shop=(SHOP[club]?.kits??[])
 const kits=[...(base?.kits??[]),...shop]
 return [club,{source:base?.source??{publisher:'Retail shirt photographs',url:'',archivePage:''},count:kits.length,kits}]
}))
export const cfsFor=(club:string):CfsSet|null=>SETS[club]??null
/** the photograph of a season's shirt of one type, when the publisher's archive shows it */
export const cfsPhoto=(club:string,season:string,type:string):string|null=>{
  const same=(SETS[club]?.kits??[]).filter(k=>k.season===season&&variantOf(k.type)===variantOf(type))
  return (same.find(k=>!k.longSleeve)??same[0])?.image??null // a long-sleeved shirt stands in only when the season has no short-sleeved photograph
}
