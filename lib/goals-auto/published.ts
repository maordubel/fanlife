import 'server-only'
import type {GoalSourceRecord} from '@/lib/game/replay/truth'
import {readTruth} from '@/lib/game/replay/truth'
import {replayHeld} from '@/lib/game/replay/holds'
import {MAX_TOUCHES} from '@/lib/game/goal-zones'
import {evaluate} from './gate'
import {allMatches} from '@/lib/archive/match-master'
import {isDurable,readDoc,updateDoc} from './storage'
import {DEFAULT_POLICY,PIPELINE_VERSION,WORKER_ROUTE_CLUB,type Candidate,type Policy} from './types'

/**
 * Published goals live beside the bundled seed, never inside it. `content/manual/goals.json` stays the canonical,
 * immutable base; this adds records the gate approved, each with provenance, and every one can be rolled back.
 * Reading is a cached snapshot (the game's render path is synchronous): `primePublishedGoals()` refreshes it from
 * the server entry points; anywhere it was never primed, the game simply sees the bundled goals (spec §3).
 */
export type PublishedRow={
 record:GoalSourceRecord;clubId:string;candidateId:string;/** the archive match this goal was scored in, when exactly one match of the day carries the club */matchId:string|null;state:'published'|'rolled_back'
 evidenceHashes:string[];extractorVersion:string;pipelineVersion:string;publishedAt:string;publishedBy:string;rolledBackAt?:string;rolledBackBy?:string;reason?:string
}
export type PublicationEvent={at:string;actor:string;kind:'publish'|'rollback'|'refused';goalId:string;detail:string}
type PublishedDoc={rows:PublishedRow[];events:PublicationEvent[]}
const EMPTY:PublishedDoc={rows:[],events:[]}
const TTL_MS=60_000
const g=globalThis as typeof globalThis&{goalsPublished?:{at:number;rows:PublishedRow[]}}

/** Defence in depth: a row is played only if it still passes everything a bundled goal passes. */
const playable=(r:PublishedRow)=>r.state==='published'&&r.record.sequence.length<=MAX_TOUCHES&&!replayHeld(r.record.goalId)&&readTruth(r.record).rejections.length===0

export async function primePublishedGoals(now=Date.now()):Promise<void>{
 if(g.goalsPublished&&now-g.goalsPublished.at<TTL_MS)return
 try{g.goalsPublished={at:now,rows:(await readDoc<PublishedDoc>('published',EMPTY)).value.rows}}
 catch{g.goalsPublished={at:now,rows:g.goalsPublished?.rows??[]}} // an outage keeps the last good snapshot; bundled goals always work
}
export const resetPublishedCache=()=>{g.goalsPublished=undefined}
/** The one match of that day the Worker club played; ambiguous or absent = null (no link is better than a wrong one). */
export function matchIdOnDate(playedOn:string):string|null{
 const hits=allMatches().filter(m=>m.playedOn.value===playedOn&&m.hapoelSide!=null&&!m.claims.some(c=>c.field==='playedOn'))
 return hits.length===1?hits[0]!.matchId:null
}
/** The match a published goal belongs to — what the archive card and the share links hang the goal on. */
export const publishedMatchOf=(goalId:string)=>(g.goalsPublished?.rows??[]).find(r=>r.state==='published'&&r.record.goalId===goalId)?.matchId??null
/** Changes whenever the set of published goals does, so cached indexes know to rebuild. */
export const publishedSignature=()=>(g.goalsPublished?.rows??[]).filter(r=>r.state==='published').map(r=>r.record.goalId).sort().join('|')

/** Synchronous view for the game: published, playable, and only for the club whose route is asking. */
export {WORKER_ROUTE_CLUB}
export const publishedGoalRecords=(clubId:string=WORKER_ROUTE_CLUB)=>(g.goalsPublished?.rows??[]).filter(r=>r.clubId===clubId&&playable(r)).map(r=>r.record)

export async function readPublished():Promise<PublishedDoc>{return (await readDoc<PublishedDoc>('published',EMPTY)).value}
export async function readPolicy():Promise<Policy>{return {...DEFAULT_POLICY,...(await readDoc<Policy>('policy',DEFAULT_POLICY)).value}}
export const savePolicy=(change:(p:Policy)=>Policy)=>updateDoc<Policy>('policy',DEFAULT_POLICY,change)

export type PublishResult={ok:true;goalId:string;already:boolean}|{ok:false;error:string;issues?:string[]}

/**
 * Atomic, idempotent, reversible. The gate is re-run HERE with the live policy and durability, so a stale
 * `auto_publishable` flag on a stored candidate can never publish anything. `manual` (an admin approving by hand)
 * skips only the three soft switches — never a hard check.
 */
export async function publishCandidate(c:Candidate,actor:string,opts:{manual?:boolean}={}):Promise<PublishResult>{
 const policy=await readPolicy(),res=evaluate(c,{policy,durable:isDurable()})
 // automatic: every switch must agree. manual: an admin may stand in for the policy switches only — never for a hard check.
 const allowed=opts.manual?res.status==='auto_publishable'||res.status==='ready_for_review':res.status==='auto_publishable'
 if(!res.record||!allowed||c.clubId!==WORKER_ROUTE_CLUB){
  await updateDoc<PublishedDoc>('published',EMPTY,d=>({...d,events:[...d.events,{at:new Date().toISOString(),actor,kind:'refused' as const,goalId:c.id,detail:res.issues.join(',')}].slice(-500)}))
  return {ok:false,error:'The gate refused this goal.',issues:res.issues}
 }
 if(!isDurable())return {ok:false,error:'No durable storage is connected; nothing is published.',issues:['STORAGE_NOT_DURABLE']}
 const record=res.record;let already=false
 await updateDoc<PublishedDoc>('published',EMPTY,d=>{
  const had=d.rows.find(r=>r.record.goalId===record.goalId)
  if(had?.state==='published'){already=true;return d}
  const row:PublishedRow={record,clubId:c.clubId,candidateId:c.id,matchId:matchIdOnDate(record.playedOn),state:'published',evidenceHashes:[...new Set(c.evidence.map(e=>e.bodyHash))],extractorVersion:c.extractorVersion,pipelineVersion:PIPELINE_VERSION,publishedAt:new Date().toISOString(),publishedBy:actor}
  return {rows:[...d.rows.filter(r=>r.record.goalId!==record.goalId),row],events:[...d.events,{at:row.publishedAt,actor,kind:'publish' as const,goalId:record.goalId,detail:opts.manual?'manual':'auto'}].slice(-500)}
 })
 resetPublishedCache()
 return {ok:true,goalId:record.goalId,already}
}

export async function rollbackGoal(goalId:string,actor:string,reason:string):Promise<{ok:boolean;error?:string}>{
 let found=false
 await updateDoc<PublishedDoc>('published',EMPTY,d=>{
  const at=new Date().toISOString()
  const rows=d.rows.map(r=>r.record.goalId===goalId&&r.state==='published'?(found=true,{...r,state:'rolled_back' as const,rolledBackAt:at,rolledBackBy:actor,reason}):r)
  return found?{rows,events:[...d.events,{at,actor,kind:'rollback' as const,goalId,detail:reason}].slice(-500)}:d
 })
 resetPublishedCache()
 return found?{ok:true}:{ok:false,error:'No published goal with that id.'}
}
