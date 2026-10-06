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
import {readJobs} from '@/lib/research/store'

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

export async function runPipeline({maxRequestsPerClub=6,clubs}:{maxRequestsPerClub?:number;clubs?:string[]}={}){
 const steps:ClubStep[]=[]
 for(const clubId of clubs||profiledClubs()){
  const step:ClubStep={clubId}
  try{
   const profile=await loadClubProfile(clubId)
   if(profile?.archive.length){
    const before=manifestStamp(clubId),{run}=await collectClub(clubId,{maxRequests:maxRequestsPerClub})
    step.collected={state:run.state,requests:run.counts.requests,documents:run.counts.documentsRead};step.staged=true
    const after=manifestStamp(clubId),seen=lastStamp.get(clubId)
    // 3 — a package that changed (or was never brought in on this server) goes to the club file as unreviewed rows
    if(after&&(after!==before||seen!==after)){step.queued=await queuePackage(clubId);lastStamp.set(clubId,after)}
   }
   if(profile?.sources.length){const jobs=await readJobs(clubId);if(jobs.some(j=>j.state==='planned'||j.state==='failed')){const r=await runWorker(profile,{max:3});step.fetched=r.counts.fetched}}
  }catch(e){step.error=e instanceof Error?e.message:'failed'}
  steps.push(step)
 }
 // 5 — process what is queued (bounded: one adapter run per club at most per pass)
 const processed=[];for(let i=0;i<Math.max(1,steps.filter(s=>s.queued).length);i++){const r=await runResearch();processed.push(r);if(!('ran' in r)||!r.ran)break}
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
export async function recordPipeline(report:Awaited<ReturnType<typeof runPipeline>>,actor:string){
 return mutate(s=>{audit(s,'automation.pipeline','global',report.steps.map(x=>`${x.clubId}: ${x.error?`error (${x.error})`:x.collected?`${x.collected.state}, ${x.collected.requests} req, ${x.collected.documents} docs${x.queued?', package queued':''}`:'no archive sources'}`).join(' · ').slice(0,1500),{actor});return true})
}
