import {TIERS} from './prices'

/**
 * The ladder for a club of N men. N ≥ 130: exactly 10 / 20 / 40 / 60 and the rest at €1M. N < 130: the same ladder in proportion, once,
 * by largest remainder (ties 5→4→3→2), with at least one €5M man; nobody is left at €1M then — the ladder is spread over everyone.
 */
export function quotaFor(n:number):{mode:'full'|'proportional';counts:Record<1|2|3|4|5,number>}{
 const counts={1:0,2:0,3:0,4:0,5:0} as Record<1|2|3|4|5,number>
 if(n>=130){for(const t of TIERS)counts[t.price]=t.target;counts[1]=n-130;return {mode:'full',counts}}
 const total=TIERS.reduce((t,x)=>t+x.target,0),raw=TIERS.map(t=>({price:t.price,exact:n*t.target/total}))
 for(const r of raw)counts[r.price]=Math.floor(r.exact)
 let left=n-raw.reduce((t,r)=>t+Math.floor(r.exact),0)
 const order=[...raw].sort((a,b)=>(b.exact-Math.floor(b.exact))-(a.exact-Math.floor(a.exact))||b.price-a.price)
 for(let i=0;left>0;i=(i+1)%order.length,left--)counts[order[i]!.price]+=1
 if(n>=1&&counts[5]===0){const donor=([2,3,4] as const).reduce((best,p)=>counts[p]>counts[best]?p:best,2 as 2|3|4);counts[donor]-=1;counts[5]+=1}
 return {mode:'proportional',counts}
}
