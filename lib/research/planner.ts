import {createHash} from 'node:crypto'
import {GATE_THRESHOLDS} from '@/lib/clubs/thresholds'
import type {ClubProfile,GateRequirement,PlanIssue,PlanReport,ResearchJob,SourceProfile} from './contract'
import {RESEARCH_SCHEMA} from './contract'

/**
 * Offline planner (ported from the research toolkit of 6 Oct 2026 and generalised to any club profile).
 * Pure: bundle + profile + prior jobs → report, NEW jobs, desired jobs, review issues. No network, no approvals.
 * Same inputs give the same output byte for byte; a job id is a hash of what it does, so re-planning never
 * enqueues the same fetch twice and one fetch serves every gate that needs it.
 */
type Row=Record<string,any>
export type Bundle={players:Row[];matches:Row[];lineups:Row[];goals:Row[];sources:Row[];timeline:Row[];honours:Row[];conflicts:Row[];quarantined:Row[]}
export function stable(v:unknown):unknown{if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v as Row).sort().map(k=>[k,stable((v as Row)[k])]));return v}
export const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex')
export const dateIsValid=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v
/** Distinct curated source families behind a record — two language versions of one publisher count once. */
export const familyCount=(refs:string[],sources:Row[])=>new Set(refs.map(id=>sources.find(s=>s.id===id)?.sourceFamilyId).filter(Boolean)).size
export function validXI(row:Row){const names:Row[]=row.startersAsReported||[];return row.coverageStatus==='complete_listing'&&names.length===11&&names.every(p=>typeof p.nameAsReported==='string'&&p.nameAsReported.trim())&&new Set(names.map(p=>String(p.nameAsReported).normalize('NFKC').trim().toLocaleLowerCase('und'))).size===11}
export function approved(row:Row,sources:Row[]){return row.status==='approved'&&!!row.productionId&&[2,3].includes(row.confidence)&&dateIsValid(row.researchedAt)&&dateIsValid(row.approvedAt)&&typeof row.approvedBy==='string'&&!!row.approvedBy.trim()&&Array.isArray(row.sourceIds)&&row.sourceIds.length>0&&row.sourceIds.every((id:string)=>sources.some(s=>s.id===id&&s.access==='available'&&dateIsValid(s.checkedAt)))&&(!row.approvedBy.startsWith('automated:')||(row.confidence===3&&row.parserCertainty==='high'&&row.conflictFree===true&&row.sensitive===false&&familyCount(row.sourceIds,sources)>=2))}
/** A URL may be fetched only on a profiled origin, on a declared path, over HTTPS, with no credentials. */
export function allowedPath(url:unknown,profile:Pick<ClubProfile,'sources'>,kind:'match-detail'='match-detail'):SourceProfile|null{try{const u=new URL(String(url));if(u.protocol!=='https:'||u.username||u.password)return null;return profile.sources.find(s=>s.origin===u.origin&&s.paths[kind]&&new RegExp(s.paths[kind]!).test(u.pathname))||null}catch{return null}}

/** Requirements come from the LIVE gate thresholds — the planner can never disagree with the game about a target. */
export function requirements():Record<string,GateRequirement>{return Object.fromEntries(Object.entries(GATE_THRESHOLDS).map(([gate,t])=>[gate,{gate,engineSupported:true,target:t.target,minimum:t.minimum,unit:t.unit}]))}

export function plan(bundle:Bundle,profile:ClubProfile,priorJobs:Pick<ResearchJob,'id'|'state'>[]=[],now='1970-01-01T00:00:00.000Z'){
 if(profile.sport!=='football')throw new Error('SPORT_SCOPE_UNSUPPORTED')
 if(!dateIsValid(profile.snapshotAsOf))throw new Error('SNAPSHOT_DATE_INVALID')
 for(const k of ['players','matches','lineups','goals','sources','timeline','honours','conflicts','quarantined'] as const)if(!Array.isArray(bundle[k]))throw new Error(`BUNDLE_ARRAY_REQUIRED:${k}`)
 const sourceIds=new Set(bundle.sources.map(s=>s.id));if(sourceIds.size!==bundle.sources.length)throw new Error('DUPLICATE_SOURCE_ID')
 const quarantine=new Set(bundle.quarantined.map(q=>q.id)),matches=new Map<string,Row>()
 for(const m of bundle.matches){if(matches.has(m.id))throw new Error('DUPLICATE_MATCH_ID');if(quarantine.has(m.id))throw new Error('QUARANTINE_IN_CANONICAL_CANDIDATES');if(m.sport!=='football')throw new Error('MATCH_SPORT_MISMATCH');if(!dateIsValid(m.playedOn)||m.playedOn>profile.snapshotAsOf)throw new Error('INVALID_MATCH_DATE');if(!m.sourceIds?.length||m.sourceIds.some((x:string)=>!sourceIds.has(x)))throw new Error('MATCH_SOURCE_MISSING');matches.set(m.id,m)}
 if(bundle.lineups.some(x=>!matches.has(x.matchId))||bundle.goals.some(x=>!matches.has(x.matchId)))throw new Error('DANGLING_MATCH_REFERENCE')
 const issues:PlanIssue[]=bundle.lineups.filter(x=>!validXI(x)).map(x=>({kind:'lineup_requires_review',recordId:x.id,matchId:x.matchId,reason:'Incomplete, duplicate or structurally ambiguous starter list'}))
 for(const c of bundle.conflicts)issues.push({kind:'conflict',recordId:c.id,matchId:c.matchId||null,reason:c.topic||c.rule||c.reason||'Competing field claims'})
 for(const q of bundle.quarantined)issues.push({kind:'quarantine',recordId:q.id,reason:q.reason})
 const detailed=new Set(bundle.lineups.filter(x=>x.listingType==='explicit_start11_and_substitutes').map(x=>x.matchId)),jobs=new Map<string,ResearchJob>()
 if(profile.desiredGates.some(k=>['lineup','goal','derby'].includes(k))){
  for(const m of [...matches.values()].sort((a,b)=>a.id.localeCompare(b.id))){
   if(detailed.has(m.id)||!m.sourceMatchUrl)continue
   const src=allowedPath(m.sourceMatchUrl,profile)
   if(!src){issues.push({kind:'detail_source_not_allowed',recordId:m.id});continue}
   const key={clubId:profile.clubId,task:'fetch_match_detail',url:m.sourceMatchUrl,adapterVersion:src.adapterVersion},id='job_'+hash(key).slice(0,24)
   const have=jobs.get(id)
   if(have){have.subjects.push(m.id);continue}
   jobs.set(id,{id,clubId:profile.clubId,task:'fetch_match_detail',kind:'match-detail',url:m.sourceMatchUrl,providerId:src.providerId,adapterVersion:src.adapterVersion,priority:profile.priorityMatchIds.includes(m.id)?100:30,requestedFields:['lineups','scorers','substitutions','cards','venue'],subjects:[m.id],state:'planned',attempts:0,nextAttemptAt:null,lease:null,leaseUntil:null,snapshot:null,error:null,updatedAt:now})
  }
 }
 const previous=new Map(priorJobs.map(j=>[j.id,j])),desired=[...jobs.values()].sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id)),fresh=desired.filter(j=>!previous.has(j.id))
 const approvedPlayers=bundle.players.filter(p=>approved(p,bundle.sources))
 const approvedDated=new Set(bundle.timeline.filter(e=>approved(e,bundle.sources)&&e.precision==='day'&&dateIsValid(e.on)&&!/\b(?:18|19|20)\d{2}\b/.test(e.titleHe||e.title||'')).map(e=>e.on))
 const req=requirements()
 const readiness=profile.desiredGates.map(gate=>{const r=req[gate];if(!r)throw new Error(`UNKNOWN_GATE:${gate}`);let n:number|null=null
  if(gate==='xi')n=approvedPlayers.length;if(gate==='timeline')n=approvedDated.size
  if(gate==='lineup')n=new Set(bundle.lineups.filter(l=>validXI(l)&&approved(l,bundle.sources)&&(l.startersAsReported as Row[]).every(p=>p.personId)).map(l=>`${l.matchId}|${l.teamNameAsReported}`)).size
  return {gate,engineSupported:r.engineSupported,approvedCandidateCount:n,target:r.target,minimum:r.minimum,status:(!r.engineSupported?'engine_pending':n===null?'compiler_required':n<r.minimum?'needs_approved_data':'compiler_required') as PlanReport['readiness'][number]['status']}})
 const stats={playerRecords:bundle.players.length,unresolvedPlayerIdentities:bundle.players.filter(p=>!p.productionId).length,datedMatchCandidates:matches.size,matchesWithAnyLineup:new Set(bundle.lineups.map(x=>x.matchId)).size,structurallyCompleteLineupListings:bundle.lineups.filter(validXI).length,partialOrMalformedLineupListings:bundle.lineups.filter(l=>!validXI(l)).length,matchesWithExplicitDetailLineups:detailed.size,goalAssertions:bundle.goals.length,sourceUrls:bundle.sources.length,sourceFamilies:new Set(bundle.sources.map(s=>s.sourceFamilyId).filter(Boolean)).size,conflicts:bundle.conflicts.length,quarantined:bundle.quarantined.length,totalDetailJobs:desired.length,newDetailJobs:fresh.length,previousJobsRecognized:desired.filter(j=>previous.has(j.id)).length,approvedPlayerCandidates:approvedPlayers.length,approvedExactDateCandidates:approvedDated.size,independentHistoricalUniverse:null}
 const inputVersion=hash({profile,bundle:Object.fromEntries(Object.entries(bundle).map(([k,rows])=>[k,[...(rows as Row[])].sort((a,b)=>String(a.id).localeCompare(String(b.id)))]))})
 const report:PlanReport={schemaVersion:RESEARCH_SCHEMA,clubId:profile.clubId,sport:'football',snapshotAsOf:profile.snapshotAsOf,inputVersion,mode:'offline_planning_only',stats,readiness,limits:['The FAN LIFE compiler decides gameplay readiness; this plan only says what to collect.','No identity, approval or fact is created by planning.','A fetched page with no tested parser is kept as a snapshot and reported as needs-adapter.']}
 return {report,jobs:fresh,desiredJobs:desired,issues:issues.sort((a,b)=>String(a.recordId).localeCompare(String(b.recordId)))}
}
