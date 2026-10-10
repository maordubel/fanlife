/**
 * Royal Rumble economy V2 — club-size-aware bands.
 * Exactly ten €5M cards for full clubs; broader €4M/€3M/€2M tiers.
 * Small clubs use one-time proportional allocation with €1M cards preserved.
 * These numbers are targets for an explicit migration, NEVER live repricing.
 */
export type PriceBand = 1|2|3|4|5
export type Quota = {mode:'full'|'proportional';counts:Record<PriceBand,number>}
export function quotaFor(n:number):Quota{
 if(!Number.isSafeInteger(n)||n<0)throw new Error('invalid club player count')
 const counts:Record<PriceBand,number>={1:0,2:0,3:0,4:0,5:0}
 if(n===0)return {mode:'proportional',counts}
 if(n>=130){
  counts[5]=10
  counts[4]=Math.max(20,Math.round(n*.08))
  counts[3]=Math.max(40,Math.round(n*.20))
  counts[2]=Math.max(60,Math.round(n*.35))
  // At N=130..small N the minima may exceed capacity: trim from €2, then €3, then €4.
  for(const k of [2,3,4] as const){
   const excess=Math.max(0,counts[5]+counts[4]+counts[3]+counts[2]-n)
   counts[k]=Math.max(0,counts[k]-excess)
  }
  counts[1]=n-counts[5]-counts[4]-counts[3]-counts[2]
  return {mode:'full',counts}
 }
 // Initial small-club targets, not re-applied automatically when N grows.
 const weighted:[PriceBand,number][]=[[5,.10],[4,.10],[3,.22],[2,.32],[1,.26]]
 const floor=weighted.map(([p,w])=>({p,exact:n*w,base:Math.floor(n*w)}))
 for(const x of floor)counts[x.p]=x.base
 let remaining=n-floor.reduce((s,x)=>s+x.base,0)
 floor.sort((a,b)=>(b.exact-b.base)-(a.exact-a.base)||b.p-a.p)
 for(let i=0;i<remaining;i++)counts[floor[i]!.p]++
 if(counts[5]===0){
  const donor=([1,2,3,4] as const).find(p=>counts[p]>0)
  if(donor!==undefined){counts[donor]--;counts[5]++}
 }
 return {mode:'proportional',counts}
}
