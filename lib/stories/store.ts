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
 return rows.flatMap(r=>{try{return r?[JSON.parse(r.text) as Job]:[]}catch{return []}}).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,limit)
}

export async function getJob(id:string):Promise<{job:Job;etag:string}|null>{
 if(!/^[a-z0-9-]{8,64}$/.test(id))return null
 const r=await store().read(nameOf(id),{fresh:true,soft:false})
 if(!r)return null
 return {job:JSON.parse(r.text) as Job,etag:r.etag}
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
