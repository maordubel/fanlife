import 'server-only'
import {randomUUID} from 'node:crypto'
import {existsSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import {audit,mutate,readState} from './store'
import {runResearch} from './research'
import {stagingDirs} from './adapters/package'
import {loadClubProfile,profiledClubs} from '@/lib/research/profiles'
import {collectClub} from '@/lib/research/service'
import {runWorker} from '@/lib/research/worker'
import {readJobs,readJson,writeJson} from '@/lib/research/store'
import {durable} from './durable'
import {dataRoot} from '@/lib/dataRoot'

/**
 * The control room's autopilot — what the scheduled task runs, and what "Run the pipeline now" runs by hand.
 * It moves every club as far as a machine may, and stops exactly where a person must decide:
 *   1. collect   — a small, polite archive batch per club (resumes from checkpoints; refusals are recorded, not bypassed)
 *   2. stage     — re-export the collector's catalogue and backlog (approvedForProduction stays 0)
 *   3. bring in  — when the staged package changed, queue the package adapter so sources and findings reach the club
 *                  file as UNREVIEWED rows
 *   4. fetch     — match pages already planned for the club (3 at most)
 *   5. process   — run queued research jobs
 * It never approves a source or a finding, never builds or connects a pack, never changes a status or a gate.
 */
export const AUTOMATION_ACTOR='automation:scheduled-pipeline'
type ClubStep={clubId:string;collected?:{state:string;requests:number;documents:number};staged?:boolean;queued?:boolean;fetched?:number;error?:string}

const manifestStamp=(clubId:string)=>stagingDirs(clubId).map(d=>{const p=join(d,'manifest.json');return existsSync(p)?readFileSync(p,'utf8'):''}).join('|')
const lastStamp=new Map<string,string>()

/** A web request has ~60s on Vercel; the pipeline stops starting new work at the budget and says which clubs wait. */
export const PIPELINE_BUDGET_MS=40000
/**
 * Fair turns (audit A04, 8.10.2026): each pass starts with the club after the last one that got work, remembered
 * durably (Blob when connected, the data dir otherwise), so a slow first club cannot defer the same later club forever.
 */
const CURSOR='pipeline-cursor.json'
async function readCursor():Promise<string|null>{const d=durable();if(d){const r=await d.read(CURSOR).catch(()=>null);return r?(JSON.parse(r.text).last??null):null}return (await readJson<{last?:string}>(join(dataRoot(),CURSOR),{})).last??null}
async function writeCursor(last:string){const d=durable();if(d){for(let i=0;i<3;i++){const r=await d.read(CURSOR).catch(()=>null);if(await d.write(CURSOR,JSON.stringify({last,at:new Date().toISOString()}),r?.etag??null))return}return}await writeJson(join(dataRoot(),CURSOR),{last,at:new Date().toISOString()})}
export function rotateFrom<T extends string>(ids:T[],last:string|null):T[]{const i=last?ids.indexOf(last as T):-1;return i<0?ids:[...ids.slice(i+1),...ids.slice(0,i+1)]}
export async function runPipeline({maxRequestsPerClub=6,clubs,budgetMs=PIPELINE_BUDGET_MS}:{maxRequestsPerClub?:number;clubs?:string[];budgetMs?:number}={}){
 const steps:ClubStep[]=[],deadline=Date.now()+budgetMs
 const order=rotateFrom(clubs||await profiledClubs(),await readCursor().catch(()=>null))
 let lastWorked:string|null=null
 for(const clubId of order){
  const step:ClubStep={clubId}
  if(Date.now()>deadline){step.error='Deferred: this run used its time budget; the next run starts with this club.';steps.push(step);continue}
  lastWorked=clubId
  try{
   const profile=await loadClubProfile(clubId)
   if(profile?.archive.length){
    const before=manifestStamp(clubId),{run}=await collectClub(clubId,{maxRequests:maxRequestsPerClub,deadline})
    step.collected={state:run.state,requests:run.counts.requests,documents:run.counts.documentsRead};step.staged=true
    const after=manifestStamp(clubId),seen=lastStamp.get(clubId)
    // 3 — a package that changed (or was never brought in on this server) goes to the club file as unreviewed rows
    if(after&&(after!==before||seen!==after)){step.queued=await queuePackage(clubId);lastStamp.set(clubId,after)}
   }
   if(Date.now()<deadline&&profile?.sources.length){const jobs=await readJobs(clubId);if(jobs.some(j=>j.state==='planned'||j.state==='failed')){const r=await runWorker(profile,{max:3});step.fetched=r.counts.fetched}}
  }catch(e){step.error=e instanceof Error?e.message:'failed'}
  steps.push(step)
 }
 // 5 — process what is queued (bounded: one adapter run per club at most per pass)
 if(lastWorked)await writeCursor(lastWorked).catch(()=>undefined)
 // queued adapters make their own requests: start one only with time to finish it (A03)
 const processed=[];for(let i=0;Date.now()<deadline-15000&&i<Math.max(1,steps.filter(s=>s.queued).length);i++){const r=await runResearch();processed.push(r);if(!('ran' in r)||!r.ran)break}
 return {at:new Date().toISOString(),steps,processed:processed.length,stopsAt:'review — sources and findings wait for the owner; packs and publishing are never automatic'}
}

/** Queue the package adapter for a club unless research is already queued or running. Returns whether it queued. */
async function queuePackage(clubId:string){
 return mutate(s=>{
  if(!s.clubs.some(c=>c.id===clubId))return false
  if(s.jobs.some(j=>j.clubId===clubId&&(j.status==='queued'||j.status==='running')))return false
  const job={id:randomUUID(),clubId,query:'Staged research package (collector export)',adapter:'package',status:'queued' as const,attempts:0,createdAt:new Date().toISOString()}
  s.jobs.push(job);audit(s,'research.queued',clubId,`package adapter · job ${job.id.slice(0,8)} (staging changed)`,{actor:AUTOMATION_ACTOR});return true
 })
}

/** What the overview shows: when the autopilot last ran and what it did (kept in the audit, newest first). */
export async function lastPipelineRuns(n=5){const s=await readState();return [...s.audit].reverse().filter(a=>a.action==='automation.pipeline').slice(0,n)}
export async function recordPipeline(report:Awaited<ReturnType<typeof runPipeline>>,who:{actor:string;role?:string}){
 return mutate(s=>{audit(s,'automation.pipeline','global',report.steps.map(x=>`${x.clubId}: ${x.error?`error (${x.error})`:x.collected?`${x.collected.state}, ${x.collected.requests} req, ${x.collected.documents} docs${x.queued?', package queued':''}`:'no archive sources'}`).join(' · ').slice(0,1500),{actor:who.actor,role:who.role});return true})
}
