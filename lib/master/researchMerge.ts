import {findingId,contentHash} from './store'
import type {AdapterResult} from './adapters/types'
import type {Club,Finding} from './types'

/**
 * Folding one research run into a club file — RESEARCH LAYER ONLY (audit F05/F06, 7.10.2026).
 *  - never touches publication state: status, gates and version-of-publication belong to the owner's clicks
 *  - findings are UPSERTED by their stable id with lineage (which adapters produced it, first/last run);
 *    pending findings from other adapters are kept; a pending finding this adapter produced before and no longer
 *    produces is marked `superseded` (with the run and the reason), never deleted
 *  - decided findings (approved / rejected / deferred) are never changed by research
 *  - a reviewed source whose content changed parks the new text in `incoming` (A13)
 * Pure: the caller holds the lock (`mutate`) and writes the audit line.
 */
export type MergeInfo={adapter:string;runId:string;at:string}
export type MergeReport={sources:number;changedReviewed:number;added:number;refreshed:number;superseded:number;restored:number}
const adapterOf=(f:Finding)=>f.lineage?.adapters??(f.adapter?[f.adapter]:[])

export function mergeResearch(c:Club,result:AdapterResult,info:MergeInfo):MergeReport{
 const rep:MergeReport={sources:result.sources.length,changedReviewed:0,added:0,refreshed:0,superseded:0,restored:0}
 // sources
 const byId=new Map(c.sources.map(x=>[x.id,x])),fresh:typeof c.sources=[]
 for(const x of result.sources){const h=contentHash(x.excerpt),had=byId.get(x.id)
  if(had?.reviewed){if((had.contentHash||contentHash(had.excerpt))!==h){had.incoming={excerpt:x.excerpt,retrievedAt:x.retrievedAt,contentHash:h};rep.changedReviewed++}continue}
  fresh.push({...x,contentHash:h})}
 const freshIds=new Set(fresh.map(x=>x.id));c.sources=[...c.sources.filter(x=>x.reviewed||!freshIds.has(x.id)),...fresh]
 // findings: upsert by stable id
 const produced=new Map<string,Finding>();for(const f of result.findings){const id=findingId(f);if(!produced.has(id))produced.set(id,{...f,id})}
 const existing=new Map(c.findings.map(f=>[f.id??findingId(f),f]))
 for(const [id,f] of produced){
  const had=existing.get(id)
  if(!had){c.findings.push({...f,approved:false,decision:undefined,adapter:info.adapter,lineage:{adapters:[info.adapter],firstRunId:info.runId,lastRunId:info.runId,lastSeenAt:info.at}});rep.added++;continue}
  if(had.decision)continue // research never re-opens a decision
  const adapters=[...new Set([...adapterOf(had),info.adapter])]
  had.lineage={adapters,firstRunId:had.lineage?.firstRunId??info.runId,lastRunId:info.runId,lastSeenAt:info.at}
  if(had.superseded){delete had.superseded;rep.restored++}else rep.refreshed++
 }
 // pending findings this adapter produced before and not now: superseded (kept, explained), unless another adapter still stands behind them
 for(const f of c.findings){
  if(f.decision||f.superseded||produced.has(f.id!))continue
  const by=adapterOf(f);if(!by.includes(info.adapter))continue
  const rest=by.filter(a=>a!==info.adapter)
  if(rest.length){f.lineage={...(f.lineage||{firstRunId:info.runId,lastRunId:info.runId,lastSeenAt:info.at}),adapters:rest};continue}
  f.superseded={at:info.at,runId:info.runId,adapter:info.adapter,reason:`The latest ${info.adapter} run no longer produces this finding (its source changed or the value moved).`};rep.superseded++
 }
 return rep
}
/** What a person still has to decide: pending, not superseded. */
export const isPending=(f:Finding)=>!f.decision&&!f.superseded
