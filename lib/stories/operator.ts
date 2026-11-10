import 'server-only'
import {randomUUID} from 'node:crypto'
import {StoryError,ownerAct,type Job,type OwnerAction} from './jobs'
import {getJob,listJobs,updateJob} from './store'
import {removeFolder,signedDownload} from './media'
import {createCasefile,createClassified,createFilm,createPromo,createShort,createVlog} from './create'

/**
 * The studio operator (owner, 9.11.2026: "automatic, no login — I trust you"). The same run ticket the Flow operator
 * uses (flowOperator.ts → ticketOk) lets Claude queue and steer studio jobs from the site's own tab, so a showcase can be
 * produced end to end without the owner signing in. It is the studio API minus the dangerous parts: no delete, no
 * reading another surface's data, every action through ownerAct (the same rules the desk follows), every job created
 * through the same create* functions (the same archive checks), recorded as "Studio operator".
 */
export const OPERATOR='Studio operator'
export const OPERATOR_ACTIONS=new Set(['pause','resume','cancel','retry','retry_editorial','approve_script','choose_script','editorial_script','editorial_rewrite','editorial_combine','editorial_plan','editorial_back','upload_started','upload_done','upload_uncertain','upload_reset','social_schedule','social_cancel','reel_added'])
const KINDS=['film','classified','vlog','promo','short','casefile'] as const

export async function operatorCreate(b:{kind?:unknown;brief?:unknown;key?:unknown}){
 const kind=b.kind===undefined?'film':String(b.kind)
 if(!(KINDS as readonly string[]).includes(kind))throw new StoryError('BRIEF','Unknown kind of job.')
 const key=typeof b.key==='string'&&/^[A-Za-z0-9-]{8,64}$/.test(b.key)?b.key:randomUUID()
 const out=kind==='casefile'?await createCasefile(b.brief,OPERATOR,key):kind==='short'?await createShort(b.brief,OPERATOR,key):kind==='classified'?await createClassified(b.brief,OPERATOR,key):kind==='vlog'?await createVlog(b.brief,OPERATOR,key):kind==='promo'?await createPromo(b.brief,OPERATOR,key):await createFilm(b.brief,OPERATOR,key)
 return {job:out.job,created:out.created}
}

/** One line per job: enough to steer a production without downloading every job's log. */
export const jobLine=(j:Job)=>({id:j.id,kind:j.kind??'film',club:j.brief.club_id,topic:j.brief.topic,season:j.brief.season,state:j.state,stage:j.stage,
 progress:j.progress,message:j.message,error:j.error,upload:j.upload,options:(j.options??[]).map(o=>({n:o.n,title:o.title})),updatedAt:j.updatedAt,createdBy:j.createdBy})
export async function operatorJobs(){return {jobs:(await listJobs(200)).map(jobLine)}}

/** A job and signed links (one hour) to its files; the master's chunks only when asked (they are large). */
export async function operatorJob(b:{id?:unknown;master?:unknown}){
 const cur=await getJob(String(b.id||''))
 if(!cur)throw new StoryError('NOT_FOUND','No such job.',404)
 const j=cur.job,a=j.artefacts
 const paths=[a?.preview?.path,a?.contact?.path,a?.package?.path,a?.captions?.srt.path,a?.captions?.vtt.path,...(a?.thumbnails??[]).map(t=>t.path),...(a?.shorts??[]).map(x=>x.path),...(b.master===true?(a?.master?.chunks??[]).map(c=>c.path):[])].filter((p):p is string=>!!p)
 let urls:Record<string,string>={}
 if(paths.length)try{urls=await signedDownload([...new Set(paths)])}catch{urls={}}
 return {job:j,urls}
}

export async function operatorAct(b:{id?:unknown;action?:unknown}){
 const a=b.action as OwnerAction
 if(!a||typeof a!=='object'||!OPERATOR_ACTIONS.has((a as {action:string}).action))throw new StoryError('ACTION','Unknown action.')
 const id=String(b.id||'')
 const job=await updateJob(id,j=>ownerAct(j,a,OPERATOR))
 // Free plan, 1 GB: once YouTube has the film, the master's chunks leave the bucket (preview and package stay).
 if(a.action==='upload_done'&&job.artefacts?.master?.chunks.length){
  const names=job.artefacts.master.chunks.map(c=>c.path.split('/').pop()!).filter(Boolean)
  try{await removeFolder(job.id,names)}catch{/* the film is on YouTube either way */}
 }
 return {job:jobLine(job)}
}
