import {createHash} from 'node:crypto'
import {QUOTA_POS,type QuotaPos} from './config'
import {rateClub,type RatingControl} from './ratings'
import type {Card,Catalog,Price} from './types'

/**
 * Eligibility (rulebook §1.1, §2.2) — who may be dealt into a Legends career. Pure: the server hands in the club's rated pool,
 * the ids its archive APPROVED, which men the frozen price list KNOWS (`hasPrice`, never `priceFor` alone: it answers €1M for a
 * stranger), and their recorded goals. A man with no recorded position is not dealt — a quota needs a verified position (§2.2).
 */
export type PoolRow={id:string;name:string;position:QuotaPos;alt?:QuotaPos[];free?:boolean;price:number;rating:number;fromYear:number|null;toYear:number|null}
export function decadesOf(from:number|null,to:number|null):number[]{
 if(from==null||to==null||from>to||from<1850||to>2100)return []
 const out:number[]=[];for(let d=Math.floor(from/10)*10;d<=Math.floor(to/10)*10;d+=10)out.push(d);return out
}
export type Eligibility={cards:Card[];excluded:{noPrice:number;noPosition:number;notApproved:number;badPrice:number}}
export function eligible(club:string,pool:readonly PoolRow[],approved:ReadonlySet<string>,priced:(id:string)=>boolean,goals:ReadonlyMap<string,number>,control?:RatingControl):Eligibility{
 const excluded={noPrice:0,noPosition:0,notApproved:0,badPrice:0},keep:PoolRow[]=[]
 for(const p of pool){
  if(!approved.has(p.id)){excluded.notApproved++;continue}
  if(p.free||!QUOTA_POS.includes(p.position)){excluded.noPosition++;continue}
  if(!priced(p.id)){excluded.noPrice++;continue}
  if(!Number.isInteger(p.price)||p.price<1||p.price>5){excluded.badPrice++;continue}
  keep.push(p)
 }
 const rated=rateClub(club,keep.map(p=>({id:p.id,position:p.position,rating:p.rating,goals:goals.get(p.id)??0})),control)
 const cards:Card[]=keep.map(p=>{const r=rated.get(p.id)!;return {id:p.id,name:p.name,pos:p.position,...(p.alt?.filter(a=>a!==p.position).length?{alt:p.alt.filter(a=>a!==p.position)}:{}),price:p.price as Price,stars:r.stars,attrs:r.attrs,from:p.fromYear,to:p.toYear,decades:decadesOf(p.fromYear,p.toYear)}}).sort((a,b)=>a.id.localeCompare(b.id))
 return {cards,excluded}
}
export function buildCatalog(club:string,clubName:string,cards:Card[],priceVersion:string):Catalog{
 const digest=createHash('sha256').update(JSON.stringify([club,priceVersion,cards.map(c=>[c.id,c.pos,c.price,c.stars,c.attrs])])).digest('hex').slice(0,16)
 return {club,clubName,digest,priceVersion,cards}
}
export const byId=(cards:readonly Card[])=>new Map(cards.map(c=>[c.id,c]))
/** the decade label a fan reads: "a 1980s man" = his recorded years at the club touch the 1980s */
export const decadeLabel=(d:number)=>`${d}s`
