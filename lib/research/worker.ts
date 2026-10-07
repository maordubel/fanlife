import {politeFetch,type FetchLike} from './fetcher'
import {lease,complete,readSnapshots,saveSnapshot,appendRun} from './store'
import {parserFor} from './parsers'
import type {ClubProfile,ResearchRun} from './contract'
import {randomUUID} from 'node:crypto'
/**
 * One worker pass: lease up to `max` jobs, fetch politely, keep snapshots, parse where a tested parser exists.
 * Ends on budget (never on "everything done" claims): the run record says fetched / unchanged / refused / retry /
 * needs-adapter honestly. Safe to run again — leases and hashes make it idempotent.
 */
export async function runWorker(profile:ClubProfile,{max=20,now=()=>new Date(),fetchImpl}:{max?:number;now?:()=>Date;fetchImpl?:FetchLike}={}){
 const counts={leased:0,fetched:0,unchanged:0,refused:0,retry:0,failed:0,parsed:0,needsAdapter:0,lostLease:0}
 const jobs=await lease(profile.clubId,max,now());counts.leased=jobs.length
 const snaps=await readSnapshots(profile.clubId)
 for(const j of jobs){
  const src=profile.sources.find(s=>s.providerId===j.providerId)
  if(!src){await complete(profile.clubId,j.id,j.lease!,{state:'blocked',error:'Source no longer in the profile'},now());counts.failed++;continue}
  const out=await politeFetch(j.url,src,snaps[j.url]||null,fetchImpl)
  let patch:Parameters<typeof complete>[3]
  if(out.kind==='fetched'){await saveSnapshot(profile.clubId,out.meta,out.body);counts.fetched++
   const parser=parserFor(j.providerId,j.kind)
   if(parser){const r=parser(out.body,{url:j.url,subjects:j.subjects});patch={state:'parsed',snapshot:out.meta.hash,error:r.diagnostics.join('; ')||null};counts.parsed++}
   else{patch={state:'needs-adapter',snapshot:out.meta.hash,error:'No tested parser for this source yet — snapshot kept for re-parse.'};counts.needsAdapter++}}
  else if(out.kind==='unchanged'){patch={state:'unchanged',error:null};counts.unchanged++}
  else if(out.kind==='refused'){patch={state:'blocked',error:out.reason};counts.refused++}
  else if(out.kind==='retry'){const exhausted=j.attempts>=3;patch={state:exhausted?'exhausted':'failed',nextAttemptAt:exhausted?null:new Date(now().getTime()+out.afterMs).toISOString(),error:out.reason};counts.retry++}
  else{patch={state:'failed',nextAttemptAt:new Date(now().getTime()+600000).toISOString(),error:out.reason};counts.failed++}
  if(!(await complete(profile.clubId,j.id,j.lease!,patch,now())))counts.lostLease++
 }
 const run:ResearchRun={id:randomUUID(),clubId:profile.clubId,createdAt:now().toISOString(),kind:'fetch',state:counts.failed||counts.refused?'partial':'completed',inputVersion:null,counts,issues:counts.refused+counts.failed,note:jobs.length?'Fetched within budget; parse only where a tested parser exists.':'Nothing due.'}
 await appendRun(profile.clubId,run);return run
}
