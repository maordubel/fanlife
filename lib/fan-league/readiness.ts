import {FORMATION_IDS} from '@/lib/clubs/rumble-xi/formations'
import type {Pos} from '@/lib/clubs/rumble-format'
import {bestXI} from './catalog'
import {CORE_SIZE,type Catalog,type Decade} from './types'

/**
 * Is a club ready for FAN LEAGUE (CRM §10)? Read from its catalog only — never from being in the registry.
 *  BLOCK — no goalkeeper, fewer than eighteen men, or no decade that can field a legal eleven
 *  WARN  — playable, with something a fan would notice (men with no recorded years, thin decades completed from other years)
 *  PASS  — every check clean
 */
export type DecadeCover={decade:Decade;men:number;gk:number;canField:boolean;full:boolean}
export type Readiness={club:string;name:string;verdict:'PASS'|'WARN'|'BLOCK';men:number;byLine:Record<Pos,number>;noYears:number;free:number;decades:DecadeCover[];homeDecades:Decade[];reasons:string[];digest:string}
export function readinessOf(c:Catalog):Readiness{
 const byLine:Record<Pos,number>={GK:0,DF:0,MF:0,FW:0}
 for(const x of c.cards)byLine[x.position]++
 const noYears=c.cards.filter(x=>!x.decades.length).length,free=c.cards.filter(x=>x.free).length
 const all=[...new Set(c.cards.flatMap(x=>x.decades))].sort((a,b)=>a-b)
 const decades:DecadeCover[]=all.map(d=>{const men=c.cards.filter(x=>x.decades.includes(d));return {decade:d,men:men.length,gk:men.filter(x=>x.position==='GK').length,canField:men.length>=11&&FORMATION_IDS.some(f=>bestXI(men,f)!==null),full:men.length>=CORE_SIZE}})
 const homeDecades=decades.filter(d=>d.canField).map(d=>d.decade)
 const reasons:string[]=[]
 if(!byLine.GK)reasons.push('No goalkeeper on record.')
 if(c.cards.length<CORE_SIZE)reasons.push(`Only ${c.cards.length} approved men — a squad needs ${CORE_SIZE}.`)
 if(!homeDecades.length)reasons.push('No decade can field a legal eleven.')
 const block=reasons.length>0
 if(!block){
  if(noYears)reasons.push(`${noYears} men have no recorded years at the club — signable from the archive, in no decade rail.`)
  const thin=decades.filter(d=>d.canField&&!d.full).map(d=>`${d.decade}s`)
  if(thin.length)reasons.push(`Short decades (completed from other years at kick-off): ${thin.join(', ')}.`)
 }
 return {club:c.club,name:c.clubName,verdict:block?'BLOCK':reasons.length?'WARN':'PASS',men:c.cards.length,byLine,noYears,free,decades,homeDecades,reasons,digest:c.digest}
}
