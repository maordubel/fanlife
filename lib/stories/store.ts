import 'server-only'
import {durable} from '@/lib/master/durable'
import {StoryError,type Job} from './jobs'

/**
 * Jobs live in the control room's durable store (Supabase `worker_fanlife_files`), one file per job, written with
 * compare-and-swap: two writers (the studio and the worker) can never silently overwrite each other — the loser
 * re-reads and re-applies its change. Media files live in Supabase Storage (see media.ts), never in this file.
 */
const PREFIX='stories/jobs/'
const nameOf=(id:string)=>`${PREFIX}${id}.json`

function store(){
 const d=durable()
 if(!d||d.kind==='memory')throw new StoryError('STORE','Durable storage is not configured: the studio will not keep jobs in memory.',503)
 return d
}

export async function listJobs(limit=60):Promise<Job[]>{
 const d=store()
 const keys=(await d.list(PREFIX,{fresh:true,soft:false})).filter(k=>k.startsWith(PREFIX)&&k.endsWith('.json'))
 const rows=await Promise.all(keys.map(k=>d.read(k,{fresh:true,soft:false})))
 return rows.flatMap(r=>{try{const j=r?JSON.parse(r.text):null;return j&&!j.deleted?[j as Job]:[]}catch{return []}}).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,limit)
}

export async function getJob(id:string):Promise<{job:Job;etag:string}|null>{
 if(!/^[a-z0-9-]{8,64}$/.test(id))return null
 const r=await store().read(nameOf(id),{fresh:true,soft:false})
 if(!r)return null
 const job=JSON.parse(r.text)
 return job.deleted?null:{job:job as Job,etag:r.etag}
}

export async function createJob(job:Job):Promise<boolean>{
 return store().write(nameOf(job.id),JSON.stringify(job),null)
}

/** Read → change → write, retried on a lost race. `change` may throw a StoryError to refuse. */
export async function updateJob(id:string,change:(j:Job)=>Job):Promise<Job>{
 for(let i=0;i<5;i++){
  const cur=await getJob(id)
  if(!cur)throw new StoryError('NOT_FOUND','No such job.',404)
  const next=change(cur.job)
  if(await store().write(nameOf(id),JSON.stringify(next),cur.etag))return next
 }
 throw new StoryError('CONFLICT','The job changed while saving; try again.',409)
}

/** Minimal tombstones prevent stale workers or legacy-store migration from resurrecting deleted productions. */
type DeletedJob={id:string;deleted:true;cleanupAfter?:string;settleAfter?:string}
export async function deleteJob(id:string,now=new Date()):Promise<void>{
 if(!/^[a-z0-9-]{8,64}$/.test(id))throw new StoryError('NOT_FOUND','No such job.',404)
 const d=store()
 for(let i=0;i<5;i++){
  const row=await d.read(nameOf(id),{fresh:true,soft:false})
  if(!row)throw new StoryError('NOT_FOUND','No such job.',404)
  if(JSON.parse(row.text).deleted)return
  // Covers old six-hour workers and two-hour signed uploads. No title, script or user data survives.
  const marker:DeletedJob={id,deleted:true,cleanupAfter:now.toISOString(),settleAfter:new Date(+now+8*3600_000).toISOString()}
  if(await d.write(nameOf(id),JSON.stringify(marker),row.etag))return
 }
 throw new StoryError('CONFLICT','The job changed while deleting; try again.',409)
}
export async function pendingDeletions(now=new Date(),dueOnly=true):Promise<DeletedJob[]>{
 const d=store(),keys=await d.list(PREFIX,{fresh:true,soft:false})
 const rows=await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k.endsWith('.json')).map(k=>d.read(k,{fresh:true,soft:false})))
 return rows.flatMap(r=>{try{const j=r?JSON.parse(r.text):null;return j?.deleted&&j.cleanupAfter&&(!dueOnly||j.cleanupAfter<=now.toISOString())?[j as DeletedJob]:[]}catch{return []}})
}
/** Called only after both Storage and Actions cache deletion succeeds. Failures remain queued. */
export async function deletionCleaned(id:string,now=new Date()):Promise<void>{
 if(!/^[a-z0-9-]{8,64}$/.test(id))throw new StoryError('NOT_FOUND','No such deletion.',404)
 const d=store(),row=await d.read(nameOf(id),{fresh:true,soft:false})
 const marker:DeletedJob|undefined=row?JSON.parse(row.text):undefined
 if(!row||!marker?.deleted)throw new StoryError('NOT_FOUND','No such deletion.',404)
 const next:DeletedJob=marker.settleAfter&&marker.settleAfter>now.toISOString()
  ?{...marker,cleanupAfter:marker.settleAfter}:{id,deleted:true}
 if(!await d.write(nameOf(id),JSON.stringify(next),row.etag))throw new StoryError('CONFLICT','Cleanup changed; retry.',409)
}
