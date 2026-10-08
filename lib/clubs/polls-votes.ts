/**
 * Gate 7 · counting, as pure rules (PO-R06, PO-R07, PO-R08). No React, no network, no storage.
 *
 *  · ONE ACTIVE VOTE per (voter, club, line, prompt version). Choosing B after A REPLACES A: the tally never holds both.
 *  · A retry carries the SAME key as the first send, so a reconnect cannot count a vote twice.
 *  · A percentage exists only for a line with at least one accepted vote, and it always names its denominator. Zero votes
 *    is "no count yet", never 0%, never NaN, never an invented crowd.
 *  · "Counted" means a store accepted exactly this key. A slip saved on the device is not a count.
 *
 * There is no club-wide table behind this gate yet (the shared project has none for FAN LIFE), so production runs with
 * `NO_TALLY` and the screen says so. The store contract below is what the table will implement; the in-memory store is
 * what the tests drive.
 */
import {pending,type Ballot,type Slip} from './polls-model'

export type Vote={club:string;qid:string;pv:string;choice:string;key:string;voter:string}
/** The identity of the thing being counted. The choice is NOT part of it — that is what makes A→B a replacement. */
export const slotOf=(v:Pick<Vote,'club'|'qid'|'pv'|'voter'>)=>`${v.club}|${v.qid}|${v.pv}|${v.voter}`

export type Accepted={ok:true;/** this key had already been counted */duplicate:boolean;/** a different earlier choice was replaced */replaced:boolean}
export type Refused={ok:false;reason:'unavailable'|'invalid'}
export type TallyCounts={/** accepted votes per choice id */counts:Record<string,number>;/** accepted votes on this line — the denominator */total:number}
export interface TallyStore{
 /** false = no table behind this gate: nothing is ever counted and the screen must say so */
 readonly available:boolean
 submit(v:Vote):Promise<Accepted|Refused>
 read(club:string,qid:string,pv:string):Promise<TallyCounts|null>
}
/** Production today: no store. `submit` never accepts, `read` never answers. */
export const NO_TALLY:TallyStore={available:false,async submit(){return {ok:false,reason:'unavailable'}},async read(){return null}}

/** An in-memory store with the exact semantics the SQL table must have (used by the tests and by anyone wiring a store). */
export function memoryTally(opts:{offline?:()=>boolean}={}):TallyStore&{votes:Map<string,Vote>;seen:Set<string>}{
 const votes=new Map<string,Vote>(),seen=new Set<string>()
 return {
  available:true,votes,seen,
  async submit(v){
   if(opts.offline?.())return {ok:false,reason:'unavailable'}
   if(!v.key||!v.choice||!v.qid||!v.voter)return {ok:false,reason:'invalid'}
   if(seen.has(v.key))return {ok:true,duplicate:true,replaced:false}
   const slot=slotOf(v),before=votes.get(slot)
   votes.set(slot,v);seen.add(v.key)
   return {ok:true,duplicate:false,replaced:!!before&&before.choice!==v.choice}
  },
  async read(club,qid,pv){
   const counts:Record<string,number>={};let total=0
   for(const v of votes.values())if(v.club===club&&v.qid===qid&&v.pv===pv){counts[v.choice]=(counts[v.choice]??0)+1;total++}
   return {counts,total}
  },
 }
}

export type Row={id:string;count:number;/** whole percent of THIS line's accepted votes; null while there are none */pct:number|null}
/**
 * Percentages from accepted votes only, largest-remainder rounded so the rows of one line always add to exactly 100.
 * `total` is the denominator the screen must print next to them. With no votes every pct is null (no division).
 */
export function percentages(t:TallyCounts|null,choices:readonly string[]):{total:number;rows:Row[]}{
 const counts=t?.counts??{},ids=[...new Set([...choices,...Object.keys(counts)])],sum=ids.reduce((n,id)=>n+(counts[id]??0),0)
 if(sum<=0)return {total:0,rows:ids.map(id=>({id,count:0,pct:null}))}
 const raw=ids.map(id=>{const exact=(counts[id]??0)*100/sum;return {id,count:counts[id]??0,exact,base:Math.floor(exact)}})
 let left=100-raw.reduce((n,r)=>n+r.base,0)
 for(const r of [...raw].sort((a,b)=>(b.exact-b.base)-(a.exact-a.base)||b.count-a.count||a.id.localeCompare(b.id))){if(left<=0)break;r.base++;left--}
 return {total:sum,rows:raw.map(r=>({id:r.id,count:r.count,pct:r.base}))}
}

export type SyncResult={slip:Slip;/** lines a store accepted just now */counted:string[];/** lines still only on this device */waiting:string[]}
/**
 * Offer every not-yet-counted pick to the store with its stored key. Accepted keys are recorded in `sent`; refused ones
 * stay exactly as they were, so the next attempt (reconnect, reload) sends the same key again. With no store nothing changes.
 */
export async function syncVotes(slip:Slip,ballot:Ballot,club:string,store:TallyStore):Promise<SyncResult>{
 if(!store.available||!slip.voter)return {slip,counted:[],waiting:pending(slip,ballot).map(q=>q.id)}
 let next=slip;const counted:string[]=[]
 for(const q of pending(slip,ballot)){
  const choice=slip.picks[q.id]!,key=slip.keys[q.id]!,r=await store.submit({club,qid:q.id,pv:q.version,choice,key,voter:slip.voter})
  if(r.ok){next={...next,sent:{...next.sent,[q.id]:key}};counted.push(q.id)}
 }
 return {slip:next,counted,waiting:pending(next,ballot).map(q=>q.id)}
}
