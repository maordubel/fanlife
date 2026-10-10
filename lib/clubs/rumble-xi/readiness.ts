import type {Pos,Rated} from '../rumble'
import {countFamily,FORMATION_IDS} from './formations'
import {XI_BUDGET,XI_OFFERS,matchBudget,type FormationId,type XIReadiness} from './types'

const FAMILIES:Pos[]=['GK','DF','MF','FW']
const count=(pool:readonly Rated[],p:Pos)=>pool.filter(x=>x.position===p).length

/** the cheapest eleven a pool can field in a formation, per family (each family is its own set, so the sum of cheapest is exact) */
export function cheapestXI(pool:readonly Rated[],f:FormationId):number|null{
 let total=0
 for(const p of FAMILIES){const n=countFamily(f,p);if(!n)continue;const prices=pool.filter(x=>x.position===p).map(x=>x.price).sort((a,b)=>a-b);if(prices.length<n)return null;total+=prices.slice(0,n).reduce((t,x)=>t+x,0)}
 return total
}
/** How many cards each slot of a family can be offered: as many as the pool allows, up to three, never repeating a man across slots. */
export function offersByFamily(pool:readonly Rated[],f:FormationId,sameClub=false):Record<Pos,number>{
 const out={GK:0,DF:0,MF:0,FW:0} as Record<Pos,number>
 for(const p of FAMILIES){const n=countFamily(f,p);out[p]=n?Math.max(0,Math.min(XI_OFFERS,Math.floor((count(pool,p)-(sameClub?n:0))/n))):XI_OFFERS}
 return out
}
export const offersFor=(pool:readonly Rated[],f:FormationId,sameClub=false)=>Math.min(...Object.values(offersByFamily(pool,f,sameClub)))
/**
 * Can this club HOST an XI round (be the club you draft from)? Needs at least two real choices in every slot, one eleven that fits
 * €35M, and — when you face your own club — a second, different eleven.
 */
export function xiReadiness(pool:readonly Rated[],f:FormationId,budget:number=matchBudget(cheapestXI(pool,f))):XIReadiness{
 const counts=Object.fromEntries(FAMILIES.map(p=>[p,count(pool,p)])) as Record<Pos,number>
 const need=Object.fromEntries(FAMILIES.map(p=>[p,countFamily(f,p)])) as Record<Pos,number>
 const by=offersByFamily(pool,f),cheapest=cheapestXI(pool,f),reasons:string[]=[]
 for(const p of FAMILIES)if(need[p]&&by[p]<1)reasons.push(`${p}: ${counts[p]} on file, ${need[p]} needed to field the shape`)
 const affordableXI=cheapest!==null&&cheapest<=budget
 if(!affordableXI&&reasons.length===0)reasons.push(`its cheapest eleven costs €${cheapest}M, over €${budget}M`)
 const offers=Math.min(...FAMILIES.filter(p=>need[p]).map(p=>by[p]))
 return {ready:reasons.length===0,formation:f,offers,reasons,counts,need,affordableXI,sameClub22:offersFor(pool,f,true)>=1,limited:offers<2,offersBy:by}
}
/** Can this club be the RIVAL (a committed eleven, no choices to offer)? Eleven men that fit €35M. */
export function canRival(pool:readonly Rated[],f:FormationId,budget:number=matchBudget(cheapestXI(pool,f))):boolean{
 for(const p of FAMILIES)if(count(pool,p)<countFamily(f,p))return false
 const c=cheapestXI(pool,f);return c!==null&&c<=budget
}
export const readyFormations=(pool:readonly Rated[])=>FORMATION_IDS.filter(f=>xiReadiness(pool,f).ready)
/** exactly why a club cannot be the rival in a shape */
export function rivalReason(pool:readonly Rated[],f:FormationId):string|null{
 for(const p of FAMILIES){const n=countFamily(f,p);if(n&&count(pool,p)<n)return `${n-count(pool,p)} more ${p} needed on file`}
 const c=cheapestXI(pool,f),b=matchBudget(c);return c!==null&&c>b?`its cheapest eleven costs €${c}M, over €${b}M`:null
}

/** the budget this match is played by: €35M, or the legends' budget when either side's cheapest eleven needs it */
export const budgetOf=(home:readonly Rated[],away:readonly Rated[],f:FormationId)=>matchBudget(cheapestXI(home,f),cheapestXI(away,f))
