import path from 'node:path'
import {activeObservations,archiveStatus,readObservations} from './archive'
import {readJson,writeJson} from './store'
import type {ArchiveSource} from './contract'
import {collectorStagingRoot} from './paths'
import {researchLinker,researchTargets} from './archive-link'
import {createHash} from 'node:crypto'
import {canonicalJson} from './canonical'

/**
 * Collector → staging. Writes the package files the existing `package` adapter reads, into the research data
 * dir (`research-data/research-staging/<club>/` by default, see paths.ts), never into the repository and never over a package somebody staged by hand.
 * What it exports is a CATALOGUE (which listing was read, how far, what blocked it) plus a backlog of the work left.
 * Documents are not exported as facts: until a tested parser extracts something, matches/players/claims stay empty.
 * `approvedForProduction` is 0 and every source is unreviewed — the club file is where a person decides.
 */
export const stagingRoot=collectorStagingRoot
export async function exportArchiveStaging(clubId:string,sources:ArchiveSource[],now=new Date()){
 const st=await archiveStatus(clubId,sources),dir=path.join(stagingRoot(),clubId),asOf=now.toISOString().slice(0,10)
 const rows=st.sources.flatMap(s=>{const src=sources.find(x=>x.providerId===s.providerId)!
  return s.listings.filter(l=>l.pagesRead>0||(l.collection==='html'&&s.documents>0)).map(l=>({
   id:`collector-${s.providerId}-${l.collection}`,title:`${s.publisher} — ${l.collection==='html'?'pages':l.collection} (${s.role})`,
   url:l.collection==='html'?new URL((src.seeds||['/'])[0]!,s.origin).href:new URL(`/wp-json/wp/v2/${l.collection}`,s.origin).href,
   providerId:s.providerId,publisher:s.publisher,sourceFamilyId:s.familyId,scope:s.role,access:'available',checkedAt:asOf,retrievedAt:now.toISOString(),
   collected:{documents:s.documents,observedTotalDocuments:l.observedTotalDocuments,state:String(l.state),parser:s.parser},
   usagePolicy:'factual_extraction_and_linking; no permission inferred for article text or images',imagesUsableInApp:false,reviewed:false}))})
 const backlog=st.sources.flatMap(s=>[
  ...(s.parser?[]:[{id:`parser-${s.providerId}`,priority:'P1',task:`Write and test the ${s.plannedParser||`${s.providerId} parser`} against stored fixtures (season, person, match pages) before anything is extracted from ${s.publisher}.`,taskHe:`לכתוב parser ל-${s.publisher} מול fixtures שמורים (עונה, אדם, משחק) לפני שמחלצים ממנו משהו.`,status:'queued',owner:null}]),
  ...s.endpoints.filter(e=>e.state==='blocked'||e.state==='not-json').map(e=>({id:`blocked-${s.providerId}-${e.endpoint}`,priority:'P2',task:`${s.publisher}: ${e.endpoint} answered ${e.status||e.state} (${e.reason}). Recorded as a gap — not bypassed.`,taskHe:`${s.publisher}: ${e.endpoint} חסום (${e.status||e.state}). נרשם כפער — לא עוקפים.`,status:'queued',owner:null})),
  ...s.listings.filter(l=>l.state==='partial_budget'||l.state==='new'||l.state==='retry-later').map(l=>({id:`continue-${s.providerId}-${l.collection}`,priority:'P3',task:`${s.publisher} ${l.collection}: ${l.pagesRead} page(s) read${l.observedTotalPages?` of ${l.observedTotalPages}`:''}; the scheduled task continues from the checkpoint.`,taskHe:`${s.publisher} ${l.collection}: נקראו ${l.pagesRead} עמודים; המשימה המתוזמנת ממשיכה מנקודת השמירה.`,status:'queued',owner:null})),
  ...s.knownLimits.map((t,i)=>({id:`limit-${s.providerId}-${i}`,priority:'P3',task:t,taskHe:t,status:'noted',owner:null}))])
 const obs=activeObservations(await readObservations(clubId))
 const link=researchLinker(obs.length?researchTargets(clubId):[])
 const providers=new Map(sources.map(s=>[s.providerId,s]))
 const documentSources=new Map<string,(typeof rows)[number]&{documentHash?:string}>()
 const observations=obs.flatMap(o=>{
  const provider=providers.get(o.providerId)
  if(!provider)return []
  let url:URL
  try{url=new URL(o.sourceUrl)}catch{return []}
  if(url.origin!==provider.origin)return []
  const id=`document-${createHash('sha256').update(o.providerRecordKey).digest('hex').slice(0,24)}`
  const checkedAt=o.runId?.slice(0,10)||asOf
  if(!documentSources.has(id))documentSources.set(id,{
   id,title:o.nameAsReported||o.seasonAsReported||[o.match?.home,o.match?.away].filter(Boolean).join(' v ')||provider.publisher,
   url:url.href,providerId:o.providerId,publisher:provider.publisher,sourceFamilyId:provider.familyId,scope:provider.role,
   access:'available',checkedAt,retrievedAt:checkedAt,documentHash:o.contentHash,collected:{documents:1,observedTotalDocuments:1,state:'parsed',parser:o.parserVersion},
   usagePolicy:'factual_extraction_and_linking; no permission inferred for article text or images',imagesUsableInApp:false,reviewed:false})
  return [{...o,...link(o),sourceIds:[id]}]
 }).sort((a,b)=>a.id.localeCompare(b.id))
 rows.push(...documentSources.values())
 // people are CANDIDATES: the name as the source wrote it, the span it printed, the page it came from — identity unresolved
 const people=observations.filter(o=>o.recordType==='player'||o.recordType==='coach').map(o=>({id:o.id,role:o.recordType,nameAsReported:o.nameAsReported,seasonsAsReported:o.seasonsAsReported,providerRecordKey:o.providerRecordKey,sourceUrl:o.sourceUrl,sourceIds:o.sourceIds,parserVersion:o.parserVersion,canonicalId:o.canonicalId,identityState:o.identityState,stats:o.stats,positions:o.positions,status:'candidate'}))
 const seasons=observations.filter(o=>o.recordType==='season').map(o=>({season:o.seasonAsReported,providerId:o.providerId,sourceUrl:o.sourceUrl}))
 const matchRows=observations.flatMap(o=>o.match?[{...o.match,id:o.id,sourceIds:o.sourceIds,sourceUrl:o.sourceUrl,canonicalId:o.canonicalId,identityState:o.identityState,status:'candidate',locator:o.locator}]:[])
 const fixtures=new Map<string,typeof matchRows>()
 for(const m of matchRows){
  const key=canonicalJson([m.on,m.home.toLowerCase().trim(),m.away.toLowerCase().trim()])
  const rows=fixtures.get(key)
  if(rows)rows.push(m);else fixtures.set(key,[m])
 }
 const matches=[...fixtures.values()].flatMap(group=>{
  const disagreement=new Set(group.map(m=>`${m.homeGoals}-${m.awayGoals}`)).size>1
  if(disagreement)return group.map(m=>({...m,identityState:'conflict' as const,canonicalId:null}))
  const byCompetition=new Map<string,typeof matchRows[number]>()
  for(const row of group){
   const k=row.competition.toLowerCase().trim(),prior=byCompetition.get(k)
   if(!prior){byCompetition.set(k,row);continue}
   const agrees=<T,>(a:T|undefined,b:T|undefined)=>a&&b&&canonicalJson(a)!==canonicalJson(b)?undefined:a??b
   const conflict=prior.identityState==='conflict'||row.identityState==='conflict'
   byCompetition.set(k,{...prior,lineup:agrees(prior.lineup,row.lineup),scorers:agrees(prior.scorers,row.scorers),
    identityState:conflict?'conflict':prior.identityState,canonicalId:conflict?null:prior.canonicalId,sourceIds:[...new Set([...prior.sourceIds,...row.sourceIds])].sort()})
  }
  return [...byCompetition.values()]
 })
 const conflicts=matches.filter(m=>m.identityState==='conflict').map(m=>({id:m.id,matchId:m.id,topic:`${m.on} ${m.home} v ${m.away}: score differs from the club archive`}))
 const coverage=st.sources.map(s=>({providerId:s.providerId,role:s.role,listings:s.listings,documents:s.documents,historicalRecordsExtracted:obs.filter(o=>o.providerId===s.providerId).length,seasonReviews:seasons.filter(x=>x.providerId===s.providerId).map(x=>x.season).sort(),note:'Documents read is not historical coverage. Records extracted are candidates for review, not facts.'}))
 const prev=await readJson<Record<string,unknown>|null>(path.join(dir,'manifest.json'),null)
 const facts=observations.map(({runId:_runId,history:_history,...o})=>o)
 const contentHash=createHash('sha256').update(canonicalJson({facts,sources:rows.map(s=>[s.id,s.url]).sort()})).digest('hex')
 const manifest={club:clubId,snapshotAsOf:asOf,researchVersion:((prev?.researchVersion as number)||0)+(prev?.contentHash===contentHash?0:1),contentHash,approvedForProduction:0,
  counts:{sources:rows.length,matches:matches.length,'archive-players':people.length,conflicts:conflicts.length},
  collection:{schemaVersion:1,runId:st.lastRun?.id||null,state:st.lastRun?.state||'nothing-to-do',historicalOnly:true,completeArchiveClaim:false,documents:st.documents,needsParser:st.needsParser}}
 await writeJson(path.join(dir,'sources.json'),rows);await writeJson(path.join(dir,'backlog.json'),backlog)
 await writeJson(path.join(dir,'season-coverage.json'),coverage)
 await writeJson(path.join(dir,'archive-players.json'),people)
 await writeJson(path.join(dir,'matches.json'),matches)
 await writeJson(path.join(dir,'claims.json'),[])
 await writeJson(path.join(dir,'evidence.json'),observations)
 await writeJson(path.join(dir,'conflicts.json'),conflicts)
 await writeJson(path.join(dir,'manifest.json'),manifest)
 return {dir,manifest,sources:rows.length,backlog:backlog.length}
}
