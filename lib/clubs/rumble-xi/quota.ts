/**
 * The ladder for a club of N men — ECONOMY V2 (owner-approved 10.10.2026).
 * N ≥ 130: exactly ten at €5M; at least max(20, 8% N) at €4M; max(40, 20% N) at €3M; max(60, 35% N) at €2M; everyone else €1M.
 *   When the minimums exceed N they are cut from the lowest rung first.
 * N < 130: weights 10 / 10 / 22 / 32 / 26 % for €5 / 4 / 3 / 2 / 1 by largest remainder (ties to the dearer rung), at least one €5M.
 * The ladder is a rule for the club's list at the moment a version is published; a price is never recomputed on load.
 */
export type Rung=1|2|3|4|5
export function quotaFor(n:number):{mode:'full'|'proportional';counts:Record<Rung,number>}{
 const counts={1:0,2:0,3:0,4:0,5:0} as Record<Rung,number>
 if(n>=130){
  counts[5]=10;counts[4]=Math.max(20,Math.round(n*.08));counts[3]=Math.max(40,Math.round(n*.20));counts[2]=Math.max(60,Math.round(n*.35))
  let over=counts[5]+counts[4]+counts[3]+counts[2]-n
  for(const k of [2,3,4] as const){if(over<=0)break;const cut=Math.min(counts[k],over);counts[k]-=cut;over-=cut}
  counts[1]=n-counts[5]-counts[4]-counts[3]-counts[2];return {mode:'full',counts}}
 const weights:[Rung,number][]=[[5,.10],[4,.10],[3,.22],[2,.32],[1,.26]],parts=weights.map(([price,w])=>({price,x:n*w,whole:Math.floor(n*w)}))
 for(const p of parts)counts[p.price]=p.whole
 const left=n-parts.reduce((s,p)=>s+p.whole,0),order=[...parts].sort((a,b)=>(b.x-b.whole)-(a.x-a.whole)||b.price-a.price)
 for(let i=0;i<left;i++)counts[order[i]!.price]+=1
 if(n>=1&&counts[5]===0){const donor=([1,2,3,4] as const).find(k=>counts[k]>0);if(donor){counts[donor]-=1;counts[5]+=1}}
 return {mode:'proportional',counts}
}
