import {fits,type Pos,type Rated} from '../rumble'
import {dealXI} from './deal'
import {countFamily,FORMATION_IDS,slotsOf} from './formations'
import {XI_BUDGET,XI_OFFERS,type FormationId,type XIReadiness} from './types'

const FAMILIES:Pos[]=['GK','DF','MF','FW']
/** how many men could stand in a family's slots: his own, plus the free men for any outfield one */
const count=(pool:readonly Rated[],p:Pos)=>pool.filter(x=>fits(x,p)).length

/** the cheapest eleven a pool can field in a formation: slots are taken one by one, always the cheapest man still free (a free man can serve any outfield slot) */
export function cheapestXI(pool:readonly Rated[],f:FormationId):number|null{
 const taken=new Set<string>();let total=0
 // fixed positions first, then the flexible slots, so a free man is never wasted on a slot a positioned man could fill cheaper
 const slots=[...slotsOf(f)].sort((a,b)=>Number(a.family==='GK')-Number(b.family==='GK')||a.id.localeCompare(b.id))
 for(const s of slots){const c=pool.filter(x=>fits(x,s.family)&&!taken.has(x.id)).sort((a,b)=>Number(!!a.free)-Number(!!b.free)||a.price-b.price)[0];if(!c)return null;taken.add(c.id);total+=c.price}
 return total
}
/** How many cards each slot of a family can be offered: as many as the pool allows, up to three, never repeating a man across slots. */
export function offersByFamily(pool:readonly Rated[],f:FormationId,sameClub=false):Record<Pos,number>{
 const out={GK:0,DF:0,MF:0,FW:0} as Record<Pos,number>
 const outfield=slotsOf(f).filter(s=>s.family!=='GK').length,reserved=sameClub?1:0
 for(const p of FAMILIES){const n=countFamily(f,p);if(!n){out[p]=XI_OFFERS;continue}
  const own=pool.filter(x=>x.position===p&&!x.free).length-(sameClub?n:0),share=Math.max(0,pool.filter(x=>x.free).length-(sameClub?outfield:0))*(p==='GK'?0:n/outfield)
  out[p]=Math.max(0,Math.min(XI_OFFERS,Math.floor((own+share)/n)))}
 void reserved
 return out
}
export const offersFor=(pool:readonly Rated[],f:FormationId,sameClub=false)=>Math.min(...Object.values(offersByFamily(pool,f,sameClub)))

/**
 * Can this club HOST an eleven in this shape? Only if a real board can be dealt: three (or, in a small archive, fewer) men a slot, a
 * complete squad inside €35M, and one €5M man on the board who can really be bought. It tries the same deals a player would get.
 */
export function xiReadiness(pool:readonly Rated[],f:FormationId,tries=12):XIReadiness{
 const counts=Object.fromEntries(FAMILIES.map(p=>[p,count(pool,p)])) as Record<Pos,number>
 const need=Object.fromEntries(FAMILIES.map(p=>[p,countFamily(f,p)])) as Record<Pos,number>
 const by=offersByFamily(pool,f),reasons:string[]=[]
 for(const p of FAMILIES)if(need[p]&&counts[p]<need[p])reasons.push(`${p}: ${counts[p]} on file, ${need[p]} needed to field the shape`)
 const cheapest=cheapestXI(pool,f)
 if(!reasons.length&&(cheapest===null||cheapest>XI_BUDGET))reasons.push(`its cheapest eleven costs €${cheapest}M, over €${XI_BUDGET}M`)
 let guaranteedIcon=false
 if(!reasons.length){
  for(let s=1;s<=tries&&!guaranteedIcon;s++)guaranteedIcon=dealXI(pool,pool,f,s,true)!==null||dealXI(pool,pool,f,s,false)!==null
  if(!guaranteedIcon)reasons.push(`no board with a buyable €5M man can be dealt inside €${XI_BUDGET}M (${pool.filter(x=>x.price===5).length} at €5M on file)`)
 }
 const offers=Math.min(...FAMILIES.filter(p=>need[p]).map(p=>by[p]))
 return {ready:reasons.length===0,formation:f,offers,reasons,counts,need,guaranteedIcon,sameClub22:!reasons.length&&offersFor(pool,f,true)>=1&&dealXI(pool,pool,f,1,true)!==null,limited:offers<2,offersBy:by}
}
/** Can this club be the RIVAL (a committed eleven)? Eleven men that fit €35M. */
export function canRival(pool:readonly Rated[],f:FormationId):boolean{
 const c=cheapestXI(pool,f);return c!==null&&c<=XI_BUDGET
}
export const readyFormations=(pool:readonly Rated[])=>FORMATION_IDS.filter(f=>xiReadiness(pool,f).ready)
/** exactly why a club cannot be the rival in a shape */
export function rivalReason(pool:readonly Rated[],f:FormationId):string|null{
 for(const p of FAMILIES){const n=countFamily(f,p);if(n&&count(pool,p)<n)return `${n-count(pool,p)} more ${p} needed on file`}
 const c=cheapestXI(pool,f);return c===null||c>XI_BUDGET?`its cheapest eleven costs €${c}M, over €${XI_BUDGET}M`:null
}
