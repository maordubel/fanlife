import type {Pos,Rated} from '../rumble'
import {countFamily,FORMATION_IDS} from './formations'
import {XI_BUDGET,XI_OFFERS,type FormationId,type XIReadiness} from './types'

const FAMILIES:Pos[]=['GK','DF','MF','FW']
const count=(pool:readonly Rated[],p:Pos)=>pool.filter(x=>x.position===p).length

/** the cheapest eleven a pool can field in a formation, per family (each family is its own set, so the sum of cheapest is exact) */
export function cheapestXI(pool:readonly Rated[],f:FormationId):number|null{
 let total=0
 for(const p of FAMILIES){const n=countFamily(f,p);if(!n)continue;const prices=pool.filter(x=>x.position===p).map(x=>x.price).sort((a,b)=>a-b);if(prices.length<n)return null;total+=prices.slice(0,n).reduce((t,x)=>t+x,0)}
 return total
}
/** How many cards a slot of this family can be offered: as many as the pool allows, up to three, never repeating a man across slots. */
export function offersFor(pool:readonly Rated[],f:FormationId,sameClub=false):number{
 let o=XI_OFFERS
 for(const p of FAMILIES){const n=countFamily(f,p);if(n)o=Math.min(o,Math.floor((count(pool,p)-(sameClub?n:0))/n))}
 return Math.max(0,o)
}
/**
 * Can this club HOST an XI round (be the club you draft from)? Needs at least two real choices in every slot, one eleven that fits
 * €35M, and — when you face your own club — a second, different eleven.
 */
export function xiReadiness(pool:readonly Rated[],f:FormationId):XIReadiness{
 const counts=Object.fromEntries(FAMILIES.map(p=>[p,count(pool,p)])) as Record<Pos,number>
 const need=Object.fromEntries(FAMILIES.map(p=>[p,countFamily(f,p)*2])) as Record<Pos,number>
 const offers=offersFor(pool,f),cheapest=cheapestXI(pool,f)
 const reasons:string[]=[]
 for(const p of FAMILIES){const n=countFamily(f,p);if(n&&counts[p]<n*2)reasons.push(`${p}: ${counts[p]} on file, ${n*2} needed for two real choices a slot`)}
 const affordableXI=cheapest!==null&&cheapest<=XI_BUDGET
 if(!affordableXI)reasons.push('no eleven fits €35M')
 const sameClub22=offersFor(pool,f,true)>=2
 return {ready:reasons.length===0&&offers>=2,formation:f,offers,reasons,counts,need,affordableXI,sameClub22}
}
/** Can this club be the RIVAL (a committed eleven, no choices to offer)? Eleven men that fit €35M. */
export function canRival(pool:readonly Rated[],f:FormationId):boolean{
 for(const p of FAMILIES)if(count(pool,p)<countFamily(f,p))return false
 const c=cheapestXI(pool,f);return c!==null&&c<=XI_BUDGET
}
export const readyFormations=(pool:readonly Rated[])=>FORMATION_IDS.filter(f=>xiReadiness(pool,f).ready)
/** exactly why a club cannot be the rival in a shape */
export function rivalReason(pool:readonly Rated[],f:FormationId):string|null{
 for(const p of FAMILIES){const n=countFamily(f,p);if(n&&count(pool,p)<n)return `${n-count(pool,p)} more ${p} needed on file`}
 const c=cheapestXI(pool,f);return c!==null&&c>XI_BUDGET?`its cheapest eleven costs €${c}M, over €${XI_BUDGET}M`:null
}
