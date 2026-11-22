import {politeFetch,type FetchLike} from './fetcher'
import {lease,complete,readSnapshots,readSnapshotBody,saveSnapshot,appendRun} from './store'
import {parserFor} from './parsers'
import type {ClubProfile,ResearchJob,ResearchRun} from './contract'
import type {ReportedMatch} from './archive-readers'
import {loadBundle} from './bundle'
import {randomUUID} from 'node:crypto'
/**
 * One worker pass: lease up to `max` jobs, fetch politely, keep snapshots, parse where a tested parser exists.
 * Ends on budget (never on "everything done" claims): the run record says fetched / unchanged / refused / retry /
 * needs-adapter honestly. Safe to run again — leases and hashes make it idempotent.
 */
export async function runWorker(profile:ClubProfile,{max=20,now=()=>new Date(),fetchImpl}:{max?:number;now?:()=>Date;fetchImpl?:FetchLike}={}){
 const counts={leased:0,fetched:0,unchanged:0,refused:0,retry:0,failed:0,parsed:0,needsAdapter:0,lostLease:0}
 const jobs=await lease(profile.clubId,max,now(),120000,j=>!!j.snapshot&&!!parserFor(j.providerId,j.kind));counts.leased=jobs.length
 const snaps=await readSnapshots(profile.clubId)
 const expected=new Map((profile.sources.some(s=>s.providerId==='pao-official')?loadBundle(profile.clubId)?.matches||[]:[]).map(m=>[m.id,m]))
 function parsed(job:ResearchJob,body:Buffer,snapshot:string):Partial<ResearchJob>{
  const parser=parserFor(job.providerId,job.kind)
  if(!parser){counts.needsAdapter++;return {state:'needs-adapter',snapshot,error:'No tested parser for this source yet — snapshot kept for re-parse.'}}
  const result=parser(body,{url:job.url,subjects:job.subjects})
  const observations=result.observations.filter(o=>{
   if(o.field!=='match')return false
   const match=o.value as ReportedMatch,target=expected.get(o.subject)
   return target?.sourceMatchUrl===job.url&&target.playedOn===match.on&&target.homeName===match.home&&target.awayName===match.away&&
    target.scoreAsReported?.home===match.homeGoals&&target.scoreAsReported?.away===match.awayGoals
  })
  if(observations.length){counts.parsed++;return {state:'parsed',snapshot,observations,error:null}}
  return {state:'fetched',snapshot,observations:[],error:result.diagnostics.join('; ')||'The scorecard disagreed with the planned match or its identity was unresolved.'}
 }
 for(const j of jobs){
  const src=profile.sources.find(s=>s.providerId===j.providerId)
  if(!src){await complete(profile.clubId,j.id,j.lease!,{state:'blocked',error:'Source no longer in the profile'},now());counts.failed++;continue}
  let patch:Parameters<typeof complete>[3]
  const reader=parserFor(j.providerId,j.kind),cached=reader?await readSnapshotBody(profile.clubId,j.snapshot):null
  if(cached){patch=parsed(j,cached,j.snapshot!)}
  else{
  const out=await politeFetch(j.url,src,reader?null:snaps[j.url]||null,fetchImpl)
  if(out.kind==='fetched'){await saveSnapshot(profile.clubId,out.meta,out.body);counts.fetched++;patch=parsed(j,out.body,out.meta.hash)}
  else if(out.kind==='unchanged'){patch={state:'unchanged',error:null};counts.unchanged++}
  else if(out.kind==='refused'){patch={state:'blocked',error:out.reason};counts.refused++}
  else if(out.kind==='retry'){const exhausted=j.attempts>=3;patch={state:exhausted?'exhausted':'failed',nextAttemptAt:exhausted?null:new Date(now().getTime()+out.afterMs).toISOString(),error:out.reason};counts.retry++}
  else{patch={state:'failed',nextAttemptAt:new Date(now().getTime()+600000).toISOString(),error:out.reason};counts.failed++}
  }
  if(!(await complete(profile.clubId,j.id,j.lease!,patch,now())))counts.lostLease++
 }
 const run:ResearchRun={id:randomUUID(),clubId:profile.clubId,createdAt:now().toISOString(),kind:'fetch',state:counts.failed||counts.refused?'partial':'completed',inputVersion:null,counts,issues:counts.refused+counts.failed,note:jobs.length?'Fetched within budget; parse only where a tested parser exists.':'Nothing due.'}
 await appendRun(profile.clubId,run);return run
}
