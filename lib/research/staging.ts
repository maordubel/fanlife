import path from 'node:path'
import {archiveStatus} from './archive'
import {readJson,writeJson} from './store'
import type {ArchiveSource} from './contract'

/**
 * Collector → staging. Writes the package files the existing `package` adapter reads, into the control-room data
 * dir (`<data>/research-staging/<club>/`), never into the repository and never over a package somebody staged by hand.
 * What it exports is a CATALOGUE (which listing was read, how far, what blocked it) plus a backlog of the work left.
 * Documents are not exported as facts: until a tested parser extracts something, matches/players/claims stay empty.
 * `approvedForProduction` is 0 and every source is unreviewed — the club file is where a person decides.
 */
export const stagingRoot=()=>path.resolve(process.env.FAN_LIFE_DATA_DIR||'.fan-life','research-staging')
export async function exportArchiveStaging(clubId:string,sources:ArchiveSource[],now=new Date()){
 const st=await archiveStatus(clubId,sources),dir=path.join(stagingRoot(),clubId),asOf=now.toISOString().slice(0,10)
 const rows=st.sources.flatMap(s=>{const src=sources.find(x=>x.providerId===s.providerId)!
  return s.listings.filter(l=>l.pagesRead>0||(l.collection==='html'&&s.documents>0)).map(l=>({
   id:`collector-${s.providerId}-${l.collection}`,title:`${s.publisher} — ${l.collection==='html'?'pages':l.collection} (${s.role})`,
   url:l.collection==='html'?new URL((src.seeds||['/'])[0]!,s.origin).href:new URL(`/wp-json/wp/v2/${l.collection}`,s.origin).href,
   providerId:s.providerId,publisher:s.publisher,sourceFamilyId:s.familyId,scope:s.role,access:'available',checkedAt:asOf,retrievedAt:now.toISOString(),
   collected:{documents:s.documents,observedTotalDocuments:l.observedTotalDocuments,state:l.state,parser:s.parser},
   usagePolicy:'factual_extraction_and_linking; no permission inferred for article text or images',imagesUsableInApp:false,reviewed:false}))})
 const backlog=st.sources.flatMap(s=>[
  ...(s.parser?[]:[{id:`parser-${s.providerId}`,priority:'P1',task:`Write and test the ${s.plannedParser||`${s.providerId} parser`} against stored fixtures (season, person, match pages) before anything is extracted from ${s.publisher}.`,taskHe:`לכתוב parser ל-${s.publisher} מול fixtures שמורים (עונה, אדם, משחק) לפני שמחלצים ממנו משהו.`,status:'queued',owner:null}]),
  ...s.endpoints.filter(e=>e.state==='blocked'||e.state==='not-json').map(e=>({id:`blocked-${s.providerId}-${e.endpoint}`,priority:'P2',task:`${s.publisher}: ${e.endpoint} answered ${e.status||e.state} (${e.reason}). Recorded as a gap — not bypassed.`,taskHe:`${s.publisher}: ${e.endpoint} חסום (${e.status||e.state}). נרשם כפער — לא עוקפים.`,status:'queued',owner:null})),
  ...s.listings.filter(l=>l.state==='partial_budget'||l.state==='new'||l.state==='retry-later').map(l=>({id:`continue-${s.providerId}-${l.collection}`,priority:'P3',task:`${s.publisher} ${l.collection}: ${l.pagesRead} page(s) read${l.observedTotalPages?` of ${l.observedTotalPages}`:''}; the scheduled task continues from the checkpoint.`,taskHe:`${s.publisher} ${l.collection}: נקראו ${l.pagesRead} עמודים; המשימה המתוזמנת ממשיכה מנקודת השמירה.`,status:'queued',owner:null})),
  ...s.knownLimits.map((t,i)=>({id:`limit-${s.providerId}-${i}`,priority:'P3',task:t,taskHe:t,status:'noted',owner:null}))])
 const coverage=st.sources.map(s=>({providerId:s.providerId,role:s.role,listings:s.listings,documents:s.documents,historicalRecordsExtracted:0,note:'Documents read is not historical coverage. Coverage by season/competition starts when a parser extracts records.'}))
 const prev=await readJson<Record<string,unknown>|null>(path.join(dir,'manifest.json'),null)
 const manifest={club:clubId,snapshotAsOf:asOf,researchVersion:((prev?.researchVersion as number)||0)+1,approvedForProduction:0,
  counts:{sources:rows.length,matches:0,'archive-players':0,conflicts:0},
  collection:{schemaVersion:1,runId:st.lastRun?.id||null,state:st.lastRun?.state||'nothing-to-do',historicalOnly:true,completeArchiveClaim:false,documents:st.documents,needsParser:st.needsParser}}
 await writeJson(path.join(dir,'manifest.json'),manifest);await writeJson(path.join(dir,'sources.json'),rows);await writeJson(path.join(dir,'backlog.json'),backlog)
 await writeJson(path.join(dir,'season-coverage.json'),coverage)
 for(const n of ['matches','archive-players','claims','evidence','conflicts'])await writeJson(path.join(dir,`${n}.json`),[])
 return {dir,manifest,sources:rows.length,backlog:backlog.length}
}
