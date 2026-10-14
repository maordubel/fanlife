/**
 * The duel engine — pure functions. The whole run is a seed, a filter and a string of sides; every view is a REPLAY of it.
 * That is what makes undo exact (drop the last side), resume safe (replay on today's pool) and the invariants cheap to test:
 *  · the winner stays on the side he was chosen on; the loser's slot takes the next unseen name (D7-01, D7-02);
 *  · a name that lost never returns while unseen names exist (it cannot: the queue is a permutation);
 *  · ten decisions per round, or n-1 when the pool is short (D7-05);
 *  · nothing is a public vote until `finalize` is asked for, and it is asked for once (D7-03, D7-11).
 */
import {BATCH,type DuelCandidate,type DuelFilter,type DuelState,type DuelView,type Side,type Unavailable} from './types'
import {digestOf,eligibleFor} from './pool'

// ----------------------------------------------------------------- the deterministic order
function rng(seed:number){let a=seed>>>0||1;return ()=>{a|=0;a=a+0x6d2b79f5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}}
const decadeOf=(c:DuelCandidate)=>{const y=c.yearFrom??c.yearTo;return y==null?-1:Math.floor(y/10)*10}
const cache=new Map<string,string[]>()
/**
 * Seeded shuffle, then dealt round-robin across decades so two neighbours are rarely from the same era (spec §4: variety).
 * Ids only; ties break on id so the same pool and seed always give the same order.
 */
export function orderOf(pool:readonly DuelCandidate[],seed:number):string[]{
 const key=`${seed}|${digestOf(pool)}`;const hit=cache.get(key);if(hit)return hit
 const r=rng(seed),a=[...pool].sort((x,y)=>x.id<y.id?-1:1)
 for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j]!,a[i]!]}
 const buckets=new Map<number,DuelCandidate[]>()
 for(const c of a){const d=decadeOf(c);(buckets.get(d)??buckets.set(d,[]).get(d)!).push(c)}
 const lists=[...buckets.entries()].sort((x,y)=>y[1].length-x[1].length||x[0]-y[0]).map(e=>e[1]),out:string[]=[]
 for(let i=0;out.length<a.length;i++)for(const l of lists)if(i<l.length)out.push(l[i]!.id)
 if(cache.size>40)cache.clear();cache.set(key,out);return out
}

// ----------------------------------------------------------------- start
export type StartInput={pool:readonly DuelCandidate[];seed:number;pollId:string;promptVersion:string;filter:DuelFilter;sessionId:string}
/** Begin a run on the eligible names for the period. Fewer than two names is not a duel — it is said, not padded. */
export function startDuel(i:StartInput):{ok:true;state:DuelState;eligible:DuelCandidate[]}|Unavailable{
 const eligible=eligibleFor(i.pool,i.filter)
 if(eligible.length<2)return {ok:false,code:'POOL_SHORT',have:eligible.length,need:2}
 return {ok:true,eligible,state:{v:1,sessionId:i.sessionId,seed:i.seed>>>0,pollId:i.pollId,promptVersion:i.promptVersion,digest:digestOf(eligible),filter:i.filter,moves:'',batches:0,varSpent:[],final:null}}
}

// ----------------------------------------------------------------- replay
const roundOf=(decisionIndex:number)=>Math.floor(decisionIndex/BATCH)
const capOf=(n:number,batches:number)=>Math.min(BATCH*(batches+1),n-1)
/** the view of a run on a pool. `pool` must be the ELIGIBLE pool the run was started on (see `resume`). */
export function viewOf(s:DuelState,pool:readonly DuelCandidate[]):DuelView{
 const by=new Map(pool.map(c=>[c.id,c])),order=orderOf(pool,s.seed),n=order.length
 let left:string|null=order[0]??null,right:string|null=order[1]??null,qi=2,holder:string|null=null,streak=0,side:Side|null=null,lastLoser:string|null=null
 for(const ch of s.moves){
  if(left===null||right===null)break
  const m:Side=ch==='L'?'L':'R',won=m==='L'?left:right,lost=m==='L'?right:left
  streak=holder===won?streak+1:1;holder=won;side=m;lastLoser=lost
  const next=order[qi]??null;if(next!==null)qi++
  if(m==='L')right=next;else left=next
 }
 const decided=s.moves.length,cap=capOf(n,s.batches),exhausted=decided>=n-1
 const status:DuelView['status']=s.final?'done':decided>=cap?'confirm':'battling'
 const lastIdx=decided-1,canUndo=decided>0&&!s.final&&!s.varSpent.includes(roundOf(lastIdx))
 return {status,left:left?by.get(left)??null:null,right:right?by.get(right)??null:null,winnerSide:side,holderId:holder,streak,decided,cap,index:Math.min(decided+1,cap),exhausted,unseen:Math.max(0,n-qi),lastLoserId:lastLoser,canUndo,poolSize:n}
}
/** exactly one decision per call, only while battling — a double tap or a second touchend cannot make two (spec §2 invariants) */
export function chooseSide(s:DuelState,pool:readonly DuelCandidate[],side:Side):DuelState{
 const v=viewOf(s,pool);if(v.status!=='battling'||!v.left||!v.right)return s
 return {...s,moves:s.moves+side}
}
/** the one VAR of a round: drop the last decision and nothing else; the public vote was never touched */
export function undoLast(s:DuelState,pool:readonly DuelCandidate[]):DuelState{
 const v=viewOf(s,pool);if(!v.canUndo)return s
 return {...s,moves:s.moves.slice(0,-1),varSpent:[...s.varSpent,roundOf(s.moves.length-1)]}
}
/** 'ten more': the holder stays on his side and unseen names come in; impossible once every eligible name has appeared */
export function nextBatch(s:DuelState,pool:readonly DuelCandidate[]):DuelState{
 const v=viewOf(s,pool);if(v.status!=='confirm'||v.exhausted)return s
 return {...s,batches:s.batches+1}
}
/** The pick the voter confirms: the holder of the last decision. Idempotent — a second call returns the same winner and writes nothing new. */
export function finalize(s:DuelState,pool:readonly DuelCandidate[]):{state:DuelState;winnerId:string|null;fresh:boolean}{
 if(s.final)return {state:s,winnerId:s.final.winnerId,fresh:false}
 const v=viewOf(s,pool);if(v.status!=='confirm'||!v.holderId)return {state:s,winnerId:null,fresh:false}
 return {state:{...s,final:{winnerId:v.holderId}},winnerId:v.holderId,fresh:true}
}

// ----------------------------------------------------------------- resume
export type ResumeResult={ok:true;state:DuelState;eligible:DuelCandidate[]}|{ok:false;code:'STALE'|'INVALID'|'POOL_SHORT'}
const isFilter=(f:unknown):f is DuelFilter=>{
 if(!f||typeof f!=='object')return false
 const o=f as Record<string,unknown>
 return o.kind==='all'||(o.kind==='since'&&Number.isInteger(o.year))||(o.kind==='decade'&&Number.isInteger(o.decade))
}
/**
 * A saved run is untrusted. It resumes only when it is a duel of THIS poll, under THIS prompt version, on the SAME eligible
 * names; otherwise it is stale and the screen says the pool was updated (D7-12). A tampered side string is invalid.
 */
export function resume(raw:unknown,pool:readonly DuelCandidate[],now:{pollId:string;promptVersion:string}):ResumeResult{
 if(!raw||typeof raw!=='object')return {ok:false,code:'INVALID'}
 const r=raw as Record<string,unknown>
 if(r.v!==1||typeof r.sessionId!=='string'||!/^[a-z0-9]{6,32}$/.test(r.sessionId)||!Number.isInteger(r.seed)||typeof r.moves!=='string'||!/^[LR]*$/.test(r.moves)||r.moves.length>2000||!isFilter(r.filter))return {ok:false,code:'INVALID'}
 if(r.pollId!==now.pollId||r.promptVersion!==now.promptVersion)return {ok:false,code:'STALE'}
 const eligible=eligibleFor(pool,r.filter)
 if(eligible.length<2)return {ok:false,code:'POOL_SHORT'}
 if(r.digest!==digestOf(eligible))return {ok:false,code:'STALE'}
 const batches=Number.isInteger(r.batches)&&(r.batches as number)>=0&&(r.batches as number)<=300?r.batches as number:0
 const varSpent=Array.isArray(r.varSpent)?r.varSpent.filter((x):x is number=>Number.isInteger(x)).slice(0,300):[]
 const state:DuelState={v:1,sessionId:r.sessionId,seed:r.seed as number,pollId:r.pollId as string,promptVersion:r.promptVersion as string,digest:r.digest as string,filter:r.filter,moves:r.moves,batches,varSpent,final:null}
 const cap=capOf(eligible.length,batches)
 if(state.moves.length>cap)return {ok:false,code:'INVALID'}
 const fin=r.final&&typeof r.final==='object'?(r.final as Record<string,unknown>).winnerId:null
 if(typeof fin==='string'&&eligible.some(c=>c.id===fin)){
  const v=viewOf({...state},eligible)
  if(v.status==='confirm'&&v.holderId===fin)state.final={winnerId:fin}
 }
 return {ok:true,state,eligible}
}
