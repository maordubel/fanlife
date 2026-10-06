import 'server-only'
import {existsSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import {REGISTRY} from './registry'
import {evaluationMode} from './mode'
import type {Club,State} from './types'
import {CORE_CLUB_IDS,REVIEW_CLUB_IDS,loadClub} from '@/lib/clubs/resolver'
import {SHARED_GATES,gateAvailability,type GateKey} from '@/lib/clubs/gates'
import {gateAccess,type AccessReason} from '@/lib/clubs/access'
import type {Diagnostic,ReadinessState} from '@/lib/clubs/contract'

/**
 * The club file's read model — ONE summary that the gap board, the overview and every admin tab read (audit A03).
 * Three layers that must never be confused:
 *  1. research — what the control room has collected (sources, findings, jobs, staged packages)
 *  2. data     — what the COMPILED pack makes playable (the compiler is the only authority)
 *  3. publication — what is open right now for a visitor, under the shared access policy
 */
export type DiagnosticClass='blocker'|'review'|'info'
/** Codes that describe a record correctly kept out of one game (not an error in the data). */
const INFO=new Set(['EXACT_DATE_REQUIRED','SAME_DAY','ANSWER_IN_TITLE'])
const REVIEW=new Set(['HUMAN_REVIEW','APPROVAL_INCOMPLETE','ENTITY_INELIGIBLE','PLAYER_INELIGIBLE','MYSTERY_INELIGIBLE','CONFLICT','PLAYER_CONFLICT','SOURCE_UNAVAILABLE'])
export const classify=(code:string):DiagnosticClass=>INFO.has(code)?'info':REVIEW.has(code)?'review':'blocker'

export type GateSummary={key:GateKey;number:number;state:ReadinessState;eligible:number;target:number;dataPlayable:boolean;full:boolean;access:AccessReason;openNow:boolean;reason:string|null}
export type StagingSummary={present:boolean;snapshotAsOf:string|null;approvedForProduction:number|null;counts:Record<string,number>}
export type ClubSummary={
 id:string;name:string;city:string;country:string;initials:string;primary:string
 control:{status:Club['status'];version:number;gatesOn:number[]}
 engine:{inRegistry:boolean;hasProvider:boolean;reviewOnly:boolean}
 research:{sources:number;reviewedSources:number;changedSources:number;findingsPending:number;findingsDecided:number;lastJob:{status:string;at:string;adapter:string}|null;staging:StagingSummary}
 data:{gates:GateSummary[];dataPlayable:number;full:number;diagnostics:Record<DiagnosticClass,number>;topCodes:{code:string;n:number;class:DiagnosticClass}[];timelineEvents:number}|null
 publication:{openNow:number;preview:boolean}
 activation:{allowed:boolean;reasons:string[]}
 next:string[]
}

function staging(id:string):StagingSummary{
 const dir=join(process.cwd(),'research-staging',id),m=join(dir,'manifest.json')
 if(!existsSync(m))return {present:false,snapshotAsOf:null,approvedForProduction:null,counts:{}}
 try{const man=JSON.parse(readFileSync(m,'utf8')),counts:Record<string,number>={}
  for(const n of ['matches','lineups','goal-claims','archive-players','honours','sources']){const p=join(dir,`${n}.json`);if(existsSync(p)){const v=JSON.parse(readFileSync(p,'utf8'));counts[n]=Array.isArray(v)?v.length:0}}
  return {present:true,snapshotAsOf:man.snapshotAsOf??null,approvedForProduction:typeof man.approvedForProduction==='number'?man.approvedForProduction:null,counts}
 }catch{return {present:true,snapshotAsOf:null,approvedForProduction:null,counts:{}}}
}

/** A club may go live only when the engine can load it and every switched-on gate is playable from compiled data (A02). */
export function activationCheck(s:Pick<ClubSummary,'engine'|'data'>,gatesOn:readonly number[]):{allowed:boolean;reasons:string[]}{
 const reasons:string[]=[]
 if(!s.engine.inRegistry)reasons.push('Not in the club registry — the portal has no host or identity for it.')
 if(!s.engine.hasProvider)reasons.push('No compiled data provider — the engine cannot load this club yet.')
 if(s.engine.reviewOnly)reasons.push('Pack is review-only — nothing in it is approved for games.')
 if(!gatesOn.length)reasons.push('Switch on at least one gate.')
 if(s.data)for(const n of gatesOn){const g=s.data.gates.find(x=>x.number===n);if(!g?.dataPlayable)reasons.push(`Gate ${n} is switched on but its data is not playable (${g?.state||'unknown'}).`)}
 return {allowed:reasons.length===0,reasons}
}

export async function clubSummary(c:Club,preview=evaluationMode()):Promise<ClubSummary>{
 const reg=REGISTRY.find(r=>r.id===c.id),hasProvider=CORE_CLUB_IDS.includes(c.id)||REVIEW_CLUB_IDS.includes(c.id)
 const loaded=hasProvider?await loadClub(c.id).catch(()=>null):null
 let data:ClubSummary['data']=null
 if(loaded){
  const d=loaded.data,diagnostics:Diagnostic[]=loaded.diagnostics
  const gates=SHARED_GATES.map(g=>{const r=gateAvailability(d,g.key),acc=gateAccess(c,g.number,preview);return {key:g.key,number:g.number,state:r.state,eligible:r.eligible,target:r.target,dataPlayable:r.playable,full:r.state==='READY',access:acc.reason,openNow:acc.allowed&&r.playable,reason:r.reasons[0]||null}})
  const byCode=new Map<string,number>();for(const x of diagnostics)byCode.set(x.code,(byCode.get(x.code)||0)+1)
  const cls:Record<DiagnosticClass,number>={blocker:0,review:0,info:0};for(const [code,n] of byCode)cls[classify(code)]+=n
  data={gates,dataPlayable:gates.filter(g=>g.dataPlayable).length,full:gates.filter(g=>g.full).length,diagnostics:cls,topCodes:[...byCode].map(([code,n])=>({code,n,class:classify(code)})).sort((a,b)=>b.n-a.n).slice(0,6),timelineEvents:d.timeline.length}
 }
 const engine={inRegistry:!!reg,hasProvider,reviewOnly:REVIEW_CLUB_IDS.includes(c.id)}
 const next:string[]=[]
 if(!engine.inRegistry)next.push('Register the club (identity, host) before building a pack.')
 else if(!engine.hasProvider)next.push('Build a first pack: stage research, run the parity wave, connect the provider.')
 if(data){for(const g of data.gates.filter(g=>!g.full).slice(0,3))next.push(`Gate ${g.number} ${g.state==='LOCKED'?'locked':'partial'}: ${g.reason||'more eligible data'}`)}
 const st=staging(c.id)
 if(st.present&&!st.approvedForProduction)next.push('A staged research package is waiting for review.')
 const summary:ClubSummary={id:c.id,name:c.name,city:c.city,country:c.country,initials:c.initials,primary:c.primary,
  control:{status:c.status,version:c.version,gatesOn:[...c.gates].sort((a,b)=>a-b)},engine,
  research:{sources:c.sources.length,reviewedSources:c.sources.filter(s=>s.reviewed).length,changedSources:c.sources.filter(s=>s.incoming).length,findingsPending:c.findings.filter(f=>!f.decision).length,findingsDecided:c.findings.filter(f=>f.decision).length,lastJob:null,staging:st},
  data,publication:{openNow:data?data.gates.filter(g=>g.openNow).length:0,preview},
  activation:{allowed:false,reasons:[]},next}
 summary.activation=activationCheck(summary,c.gates)
 return summary
}

export async function allSummaries(state:State,preview=evaluationMode()):Promise<ClubSummary[]>{
 const rows=await Promise.all(state.clubs.map(async c=>{const s=await clubSummary(c,preview);const jobs=state.jobs.filter(j=>j.clubId===c.id);const j=jobs[jobs.length-1];if(j)s.research.lastJob={status:j.status,at:j.startedAt||j.createdAt,adapter:j.adapter||'wikipedia'};return s}))
 return rows.sort((a,b)=>a.name.localeCompare(b.name))
}
