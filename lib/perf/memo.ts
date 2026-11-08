/**
 * A per-instance memo with a time limit (owner, 8.11.2026: the Vercel account was frozen on Active CPU).
 * Fluid compute keeps an instance warm across many requests, so a public page that rebuilds the same models for every
 * visitor pays the same CPU again and again. The key carries everything the answer depends on (club ids, statuses,
 * locale), so a change the owner makes in the control room is a new key at once — only identical requests share.
 * A failed computation is never kept.
 */
type Entry={at:number;value:Promise<unknown>}
const g=globalThis as typeof globalThis&{fanMemo?:Map<string,Entry>}
const table=()=>(g.fanMemo??=new Map())

export function memo<T>(key:string,ttlMs:number,fn:()=>Promise<T>):Promise<T>{
 const t=table(),now=Date.now(),hit=t.get(key)
 if(hit&&now-hit.at<ttlMs)return hit.value as Promise<T>
 const value=fn()
 t.set(key,{at:now,value})
 value.catch(()=>{if(t.get(key)?.value===value)t.delete(key)})
 if(t.size>400)for(const [k,e] of t)if(now-e.at>=ttlMs)t.delete(k)
 return value
}
