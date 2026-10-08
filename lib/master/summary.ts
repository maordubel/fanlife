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
import {stagingDirs} from './adapters/package'
import {loadClubProfile,profilesShipped} from '@/lib/research/profiles'
import {archiveStatus} from '@/lib/research/archive'
import {isPending} from './researchMerge'
import {PUBLISH_LABEL,progressText,publishState,type Progress,type PublishState} from './layers'
export {PUBLISH_LABEL,progressText,publishState,type Progress,type PublishState}

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
 research:{sources:number;reviewedSources:number;changedSources:number;findingsPending:number;findingsDecided:number;findingsSuperseded:number;lastJob:{status:string;at:string;adapter:string}|null;staging:StagingSummary}
 data:{gates:GateSummary[];dataPlayable:number;full:number;diagnostics:Record<DiagnosticClass,number>;topCodes:{code:string;n:number;class:DiagnosticClass}[];timelineEvents:number}|null
 publication:{openNow:number;preview:boolean;state:PublishState;label:string}
 activation:{allowed:boolean;reasons:string[]}
 next:string[]
 archive:ArchiveSummary
 pipeline:PipelineStep[]
}
/**
 * `health` separates "this club has no profile" from "the profile dataset is missing or unreadable on this server" —
 * the second is an error to fix (audit F03), never shown as zero data.
 * `listings`: how many listings exist and how many reached their last page; `observedTotal` is the sum of what the
 * sources themselves report, or null when any listing's size is unknown (audit F20: unknown stays unknown).
 */
export type ArchiveSummary={profile:boolean;health:'ok'|'no-profile'|'profiles-missing'|'profile-unreadable';error:string|null;sources:number;documents:number;needsParser:number;blocked:number;listings:{total:number;listed:number};observedTotal:number|null;lastRun:{state:string;at:string;requests:number}|null}
/** research → collect → parse → stage → review → pack → publish: where this club stands, and what moves it on */
export type PipelineStep={key:'profile'|'collect'|'parse'|'stage'|'review'|'pack'|'publish';label:string;state:'done'|'active'|'waiting'|'blocked';detail:string;auto:boolean;progress:Progress}

function staging(id:string):StagingSummary{
 const dir=stagingDirs(id)[0]||join(process.cwd(),'research-staging',id),m=join(dir,'manifest.json')
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
 const reg=REGISTRY.find(r=>r.id===c.id)
 // a repository pack, or a desk pack built from the owner's approvals (lib/master/deskPack.ts)
 const loaded=reg||CORE_CLUB_IDS.includes(c.id)?await loadClub(c.id).catch(()=>null):null
 const hasProvider=CORE_CLUB_IDS.includes(c.id)||REVIEW_CLUB_IDS.includes(c.id)||!!loaded
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
 else if(!engine.hasProvider)next.push('Approve the players research found, then build game data in the Launch view.')
 if(data){for(const g of data.gates.filter(g=>!g.full).slice(0,3))next.push(`Gate ${g.number} ${g.state==='LOCKED'?'locked':'partial'}: ${g.reason||'more eligible data'}`)}
 const st=staging(c.id)
 if(st.present&&!st.approvedForProduction)next.push('A staged research package is waiting for review.')
 const summary:ClubSummary={id:c.id,name:c.name,city:c.city,country:c.country,initials:c.initials,primary:c.primary,
  control:{status:c.status,version:c.version,gatesOn:[...c.gates].sort((a,b)=>a-b)},engine,
  research:{sources:c.sources.length,reviewedSources:c.sources.filter(s=>s.reviewed).length,changedSources:c.sources.filter(s=>s.incoming).length,findingsPending:c.findings.filter(isPending).length,findingsDecided:c.findings.filter(f=>f.decision).length,findingsSuperseded:c.findings.filter(f=>!f.decision&&f.superseded).length,lastJob:null,staging:st},
  data,publication:{openNow:data?data.gates.filter(g=>g.openNow).length:0,preview,state:'no-data',label:''},
  activation:{allowed:false,reasons:[]},next,archive:await archiveSummary(c.id),pipeline:[]}
 summary.activation=activationCheck(summary,c.gates)
 summary.publication.state=publishState(summary);summary.publication.label=PUBLISH_LABEL[summary.publication.state]
 if(summary.publication.state==='choose-gates')next.unshift(`${data!.dataPlayable} gate(s) have playable data — choose which to publish.`)
 if(summary.archive.error)next.unshift(summary.archive.error)
 summary.pipeline=pipeline(summary)
 if(summary.archive.profile&&summary.archive.needsParser)next.push(`${summary.archive.needsParser} collected documents wait for a tested parser — nothing is extracted from them yet.`)
 return summary
}

export async function allSummaries(state:State,preview=evaluationMode()):Promise<ClubSummary[]>{
 const rows=await Promise.all(state.clubs.map(async c=>{const s=await clubSummary(c,preview);const jobs=state.jobs.filter(j=>j.clubId===c.id);const j=jobs[jobs.length-1];if(j)s.research.lastJob={status:j.status,at:j.startedAt||j.createdAt,adapter:j.adapter||'wikipedia'};return s}))
 return rows.sort((a,b)=>a.name.localeCompare(b.name))
}

const NO_ARCHIVE={sources:0,documents:0,needsParser:0,blocked:0,listings:{total:0,listed:0},observedTotal:null,lastRun:null}
export async function archiveSummary(id:string,cwd=process.cwd()):Promise<ArchiveSummary>{
 let p:Awaited<ReturnType<typeof loadClubProfile>>
 try{p=await loadClubProfile(id,cwd)}catch(e){return {profile:false,health:'profile-unreadable',error:`Research profile for ${id} could not be read (${e instanceof Error?e.message:'error'}) — fix the file; this is not "no data".`,...NO_ARCHIVE}}
 if(!p){
  // the dataset itself is missing on this server (e.g. not shipped with the route): an error, not zero data
  if(!profilesShipped(cwd))return {profile:false,health:'profiles-missing',error:'The research-profiles folder is missing on this server — the deployment did not ship it. Research figures here are unknown, not zero.',...NO_ARCHIVE}
  return {profile:false,health:'no-profile',error:null,...NO_ARCHIVE}
 }
 const st=await archiveStatus(id,p.archive).catch(()=>null)
 const listings=st?st.sources.flatMap(s=>s.listings):[]
 // a listing's size is known when the source reported it (WordPress X-WP-Total) or an HTML crawl reached its end
 const known=listings.length>0&&listings.every(l=>l.observedTotalDocuments!==null&&(l.collection!=='html'||l.state==='listed'))
 return {profile:true,health:'ok',error:null,sources:p.archive.length+p.sources.length,documents:st?.documents||0,needsParser:st?.needsParser||0,blocked:st?st.sources.reduce((n,s)=>n+s.endpoints.filter(e=>e.state==='blocked'||e.state==='not-json').length,0):0,
  listings:{total:listings.length,listed:listings.filter(l=>l.state==='listed').length},observedTotal:known?listings.reduce((n,l)=>n+(l.observedTotalDocuments||0),0):null,
  lastRun:st?.lastRun?{state:st.lastRun.state,at:st.lastRun.finishedAt,requests:st.lastRun.counts.requests}:null}
}
/**
 * The seven steps, computed from the three layers. `auto` = the scheduled task moves it on by itself.
 * A step is DONE only when nothing remains in it (audit F20) — one processed document is progress, not done.
 */
export function pipeline(s:Pick<ClubSummary,'archive'|'research'|'engine'|'data'|'control'|'activation'|'publication'>):PipelineStep[]{
 const a=s.archive,r=s.research,st=(done:boolean,blocked=false,active=false)=>done?'done':blocked?'blocked':active?'active':'waiting'
 const P=(covered:number,total:number|null):Progress=>({covered,total,remaining:total===null?null:Math.max(0,total-covered)})
 const healthErr=a.health==='profiles-missing'||a.health==='profile-unreadable'
 // collect: covered = documents kept; the universe is what the sources report, unknown until every listing says
 const collectP=P(a.documents,a.observedTotal),allListed=a.listings.total>0&&a.listings.listed===a.listings.total,collectDone=a.documents>0&&allListed&&collectP.remaining===0
 const parsed=a.documents-a.needsParser,parseP=P(parsed,a.documents)
 const reviewTotal=r.sources+r.findingsPending+r.findingsDecided,reviewP=P(r.reviewedSources-r.changedSources+r.findingsDecided,reviewTotal)
 const packP=P(s.data?.dataPlayable||0,s.data?13:null)
 const pubP=P(s.publication.openNow,s.data?s.data.dataPlayable:null)
 return [
  {key:'profile',label:'Sources',state:st(a.profile&&a.sources>0,healthErr),detail:healthErr?a.error!:a.profile?`${a.sources} source(s) in the research profile`:'No research profile — add sources in the Data tab',auto:false,progress:P(a.sources,a.profile?a.sources:null)},
  {key:'collect',label:'Collect',state:st(collectDone,a.profile&&a.blocked>0&&a.documents===0,!!a.lastRun||a.documents>0),detail:a.lastRun||a.documents?`${progressText(collectP,' documents')} · ${a.listings.listed}/${a.listings.total} listings read to the end · last run ${a.lastRun?.state||'?'}${a.blocked?` · ${a.blocked} endpoint(s) refused (recorded, not bypassed)`:''}`:'Not collected yet',auto:true,progress:collectP},
  {key:'parse',label:'Extract',state:st((collectDone&&parseP.remaining===0)||(!a.profile&&!!s.data),a.documents>0&&parsed===0,parsed>0),detail:a.documents?(parsed?progressText(parseP,' documents parsed'):'No tested parser yet — a developer writes one against stored fixtures'):'Nothing collected to extract',auto:true,progress:parseP},
  {key:'stage',label:'Stage',state:st(r.staging.present&&(!a.profile||collectDone),false,r.staging.present||a.documents>0),detail:r.staging.present?`package from ${r.staging.snapshotAsOf||'?'} · ${r.staging.approvedForProduction??0} approved for production${a.profile&&!collectDone?' · built from a partial collection':''}`:'No staged package',auto:true,progress:P(r.staging.present?1:0,1)},
  {key:'review',label:'Review',state:st(reviewTotal>0&&reviewP.remaining===0,false,r.sources>0),detail:`${progressText(reviewP,' items decided')} · ${r.reviewedSources}/${r.sources} sources reviewed · ${r.findingsPending} findings to decide${r.changedSources?` · ${r.changedSources} changed`:''} — only the owner decides`,auto:false,progress:reviewP},
  {key:'pack',label:'Pack',state:st(s.engine.hasProvider&&!s.engine.reviewOnly&&!!s.data&&packP.remaining===0,!s.engine.inRegistry,s.engine.hasProvider),detail:s.data?`${progressText(packP,' gates playable')} from compiled data`:s.engine.inRegistry?'No compiled pack connected yet':'Not in the registry',auto:false,progress:packP},
  {key:'publish',label:'Publish',state:st(s.control.status==='live'&&s.publication.openNow>0&&pubP.remaining===0,false,s.activation.allowed||s.publication.openNow>0||s.publication.state==='choose-gates'),detail:`${s.publication.label}${s.data?` · ${s.control.gatesOn.length} switched on · ${s.publication.openNow} open now of ${s.data.dataPlayable} playable`:''}`,auto:false,progress:pubP},
 ]
}
