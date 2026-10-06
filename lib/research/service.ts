import {randomUUID} from 'node:crypto'
import {loadBundle,loadProfile} from './bundle'
import {plan} from './planner'
import {appendRun,readJobs,readRunsFor,upsertJobs} from './store'
import type {ResearchRun} from './contract'
/** Plan research for one club from its profile and staged bundle. Records a run; enqueues only NEW jobs. */
export async function planClub(clubId:string){
 const profile=loadProfile(clubId)
 if(!profile)return {ok:false as const,reason:'No research profile for this club yet (research-profiles/<club>.json).'}
 const bundle=loadBundle(clubId)
 if(!bundle)return {ok:false as const,reason:'No staged research package for this club (research-staging/<club>/).'}
 const prior=await readJobs(clubId),now=new Date().toISOString()
 const result=plan(bundle,profile,prior,now),added=await upsertJobs(clubId,result.jobs)
 const run:ResearchRun={id:randomUUID(),clubId,createdAt:now,kind:'plan',state:'completed',inputVersion:result.report.inputVersion,counts:{desired:result.desiredJobs.length,added,known:result.report.stats.previousJobsRecognized??0,issues:result.issues.length},issues:result.issues.length,note:'Offline plan — no network, no approvals.'}
 await appendRun(clubId,run)
 return {ok:true as const,run,report:result.report,issues:result.issues.slice(0,50),issueKinds:result.issues.reduce((a:Record<string,number>,i)=>{a[i.kind]=(a[i.kind]||0)+1;return a},{})}
}
/** Runs and job-state counts for the admin; one club or every club with a profile. */
export async function readRuns(clubId?:string){
 const {readdirSync,existsSync}=await import('node:fs')
 const ids=clubId?[clubId]:existsSync('research-profiles')?readdirSync('research-profiles').filter(f=>f.endsWith('.json')).map(f=>f.slice(0,-5)):[]
 return Promise.all(ids.map(async id=>{const [runs,jobs]=await Promise.all([readRunsFor(id),readJobs(id)]);const states=jobs.reduce((a:Record<string,number>,j)=>{a[j.state]=(a[j.state]||0)+1;return a},{});return {clubId:id,hasProfile:!!loadProfile(id),runs:runs.slice(-10).reverse(),jobs:jobs.length,states}}))
}
