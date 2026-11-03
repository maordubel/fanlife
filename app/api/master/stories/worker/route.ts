import {cronAuthorized} from '@/lib/master/request'
import {StoryError,claim,finish,mediaPath,nextForWorker,report,type Finish,type Progress} from '@/lib/stories/jobs'
import {getJob,listJobs,updateJob} from '@/lib/stories/store'
import {signedDownload,signedUpload} from '@/lib/stories/media'
import {body,fail,json} from '@/lib/stories/http'
export const dynamic='force-dynamic'
export const runtime='nodejs'

/**
 * The production worker's only door (GitHub Actions, `Authorization: Bearer <CRON_SECRET>`).
 *   {op:'peek',worker}                          → the id of the film that would be taken next (no lease)
 *   {op:'claim',worker}                         → the next job, leased to this worker (or {job:null})
 *   {op:'progress',id,worker,stage,progress,…}  → {control: continue | pause | cancel}
 *   {op:'upload_urls',id,worker,names:[…]}      → signed upload urls inside jobs/<id>/ only
 *   {op:'art_urls',id,worker}                   → signed download urls for the owner's pictures named in the brief
 *   {op:'finish',id,worker,state,…}             → the finished job
 * A worker that lost its lease is refused, so two runners can never both finish one film.
 */
export async function POST(r:Request){
 if(!cronAuthorized(r))return json({error:'Not authorised.'},401)
 try{
  const b=await body(r,200_000) as Record<string,unknown>
  const worker=typeof b.worker==='string'&&/^[A-Za-z0-9._:-]{3,80}$/.test(b.worker)?b.worker:null
  if(!worker)throw new StoryError('WORKER','Missing worker id.')
  if(b.op==='peek'){
   const next=nextForWorker(await listJobs(200))
   return json({next:next?next.id:null})
  }
  if(b.op==='claim'){
   const next=nextForWorker(await listJobs(200))
   if(!next)return json({job:null})
   const job=await updateJob(next.id,j=>{if(nextForWorker([j])?.id!==j.id)throw new StoryError('TAKEN','Taken by another worker.',409);return claim(j,worker)})
   return json({job})
  }
  const id=String(b.id||'')
  if(b.op==='progress'){
   let control:'continue'|'pause'|'cancel'='continue'
   await updateJob(id,j=>{const x=report(j,worker,b as unknown as Progress);control=x.control;return x.job})
   return json({control})
  }
  if(b.op==='upload_urls'){
   const cur=await getJob(id)
   if(!cur||cur.job.lease?.worker!==worker)throw new StoryError('LEASE','This worker does not hold the job.',409)
   const names=Array.isArray(b.names)?b.names.slice(0,60).map(String):[]
   const urls:Record<string,string>={}
   for(const n of names)urls[n]=await signedUpload(mediaPath(id,n))
   return json({urls,prefix:`jobs/${id}/`})
  }
  if(b.op==='art_urls'){
   const cur=await getJob(id)
   if(!cur||cur.job.lease?.worker!==worker)throw new StoryError('LEASE','This worker does not hold the job.',409)
   const art=cur.job.brief.art??[]
   const signed=await signedDownload(art.map(a=>mediaPath(id,`art-${a.name}`)))
   const urls:Record<string,string>={}
   for(const a of art){const u=signed[mediaPath(id,`art-${a.name}`)];if(u)urls[a.name]=u}
   return json({urls})
  }
  if(b.op==='finish'){
   const job=await updateJob(id,j=>finish(j,worker,b as unknown as Finish))
   return json({job})
  }
  throw new StoryError('OP','Unknown operation.')
 }catch(e){return fail(e)}
}
