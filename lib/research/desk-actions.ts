import 'server-only'
import {audit,mutate} from '@/lib/master/store'
import {invalidateClub} from '@/lib/clubs/resolver'
import {checkDecision,rivalCandidates,stagedBatches,type Promotion,type StagedDecisions} from './staged/model'
import {readDecisions,readStagedInput,writeDecisions,isStagedClub,stagedClubIds} from './staged/pack'
import {readState} from '@/lib/master/store'

type By={actor?:string;role?:string}
const owner=(by:By)=>by.actor||'owner'

/**
 * The owner's clicks on the research desk. Each one is checked against the material as it is NOW (a changed batch is
 * refused, a rival must be one of the listed clubs), saved compare-and-swap, written to the audit log with before and
 * after, and the club recompiles on its next read. Nothing here publishes: opening a club stays `clubs/open-playable`.
 */
export async function deskDecide(b:Record<string,unknown>,by:By):Promise<{ok:true;decisions:StagedDecisions}>{
 const id=typeof b.clubId==='string'?b.clubId:''
 if(!isStagedClub(id))throw new Error('This club has no staged material.')
 const input=readStagedInput(id)!,batches=stagedBatches(input),cur=await readDecisions(id),now=new Date().toISOString()
 const op=String(b.op||'')
 let next:StagedDecisions,what:string,before:string,after:string
 if(op==='approve'){
  const err=checkDecision(batches,{kind:'batch',id:b.batchId,hash:b.hash},[]);if(err)throw new Error(err)
  const batch=batches.find(x=>x.id===b.batchId)!
  before=cur.batches.find(x=>x.id===batch.id)?'approved (older content)':'waiting';after='approved'
  next={...cur,updatedAt:now,batches:[...cur.batches.filter(x=>x.id!==batch.id),{id:batch.id,hash:batch.hash,at:now,by:owner(by)}]}
  what=`research-desk.approved`;await writeDecisions(next)
  await mutate(s=>{audit(s,what,id,`${batch.title} · ${batch.id} · ${batch.hash}`,{...by,before,after});return true})
 }else if(op==='undo'){
  const batch=batches.find(x=>x.id===b.batchId);if(!batch||!cur.batches.some(x=>x.id===batch.id))throw new Error('Nothing to undo for that batch.')
  next={...cur,updatedAt:now,batches:cur.batches.filter(x=>x.id!==batch.id)};await writeDecisions(next)
  await mutate(s=>{audit(s,'research-desk.undone',id,`${batch.title} · ${batch.id}`,{...by,before:'approved',after:'waiting'});return true})
 }else if(op==='rival'){
  const candidates=rivalCandidates(input,40),pick=b.rival===null?null:String(b.rival??'')
  const err=checkDecision(batches,{kind:'rival',rival:pick},candidates);if(err)throw new Error(err)
  const c=pick?candidates.find(x=>x.name===pick)!:null
  next={...cur,updatedAt:now,rival:c?{name:c.name,aliases:[],at:now,by:owner(by),sources:c.sources}:null};await writeDecisions(next)
  await mutate(s=>{audit(s,'research-desk.rival',id,c?`${c.name} (${c.meetings} meetings on record)`:'no rival',{...by,before:cur.rival?.name||'none',after:c?.name||'none'});return true})
 }else if(op==='retry-opening'){
  if(cur.promotion?.state!=='failed')throw new Error('The opening has not stopped — nothing to retry.')
  next={...cur,updatedAt:now,promotion:null};await writeDecisions(next)
  await mutate(s=>{audit(s,'research-desk.opening-retry',id,cur.promotion?.reason||'retry',{...by,before:'failed',after:'waiting'});return true})
 }else throw new Error('Unknown desk operation.')
 invalidateClub(id)
 return {ok:true,decisions:next}
}

/**
 * For the opening runner (.github/workflows/club-open.yml, scheduler secret): every staged club the owner has OPENED
 * (status live) with the decisions it was opened with. The runner turns each into a repository club and reports back.
 */
export async function deskExport(){
 const state=await readState(),ids=new Set(stagedClubIds())
 const clubs=await Promise.all(state.clubs.filter(c=>ids.has(c.id)&&c.status==='live').map(async c=>({id:c.id,name:c.name,gates:c.gates,decisions:await readDecisions(c.id)})))
 return {generatedAt:new Date().toISOString(),clubs:clubs.filter(c=>c.decisions.promotion?.state!=='merged')}
}
/** The runner's report on one opening. Only the scheduler's secret may write it; it changes nothing a fan sees. */
export async function deskPromotion(b:Record<string,unknown>){
 const id=typeof b.clubId==='string'?b.clubId:''
 if(!isStagedClub(id))throw new Error('This club has no staged material.')
 const state=['running','merged','failed'].includes(String(b.state))?String(b.state) as Promotion['state']:null
 if(!state)throw new Error('state must be running, merged or failed.')
 const cur=await readDecisions(id),now=new Date().toISOString()
 const promotion:Promotion={state,at:now,pr:Number.isInteger(b.pr)?Number(b.pr):null,reason:typeof b.reason==='string'?b.reason.slice(0,400):null}
 await writeDecisions({...cur,promotion})
 await mutate(s=>{audit(s,`research-desk.opening-${state}`,id,promotion.reason||(promotion.pr?`PR #${promotion.pr}`:state),{actor:'automation:club-open',role:'system',before:cur.promotion?.state||'none',after:state});return true})
 return {ok:true,promotion}
}
