import {cronAuthorized} from '@/lib/master/request'
import {StoryError,claim,finish,jobKind,mediaPath,nextForWorker,report,type Finish,type Progress} from '@/lib/stories/jobs'
import {deletionCleaned,getJob,listJobs,pendingDeletions,updateJob} from '@/lib/stories/store'
import {purgeJobMedia,signedDownload,signedUpload,trimJobMedia} from '@/lib/stories/media'
import {trimDue,trimLog} from '@/lib/stories/trim'
import {body,fail,json} from '@/lib/stories/http'
import {cleanHeartbeat,noteHeartbeat} from '@/lib/stories/health'
import {claimSocial,cleanLights,composeAll,dueSocial,filmLink,filmTitle,mediaPathOf,resultSocial,type SocialResult} from '@/lib/stories/social'
import {noteLights} from '@/lib/stories/socialLights'
import {addRound,markDispatched,noteRun,shouldDispatch,takenEvents} from '@/lib/stories/pitches'
import {readPitchDays,readPitchDesk,updatePitchDay,updatePitchDesk} from '@/lib/stories/pitchStore'
import {clubNames} from '@/lib/stories/clubs'
import {classifiedUrls,libraryUrls} from '@/lib/stories/flowOperator'
export const dynamic='force-dynamic'
export const runtime='nodejs'

/**
 * The production worker's only door (GitHub Actions, `Authorization: Bearer <CRON_SECRET>`).
 *   {op:'trim',worker}                          → published films' big files leave the bucket (lib/stories/trim.ts)
 *   {op:'peek',worker,health?}                  → the id of the job that would be taken next and its kind (no lease), and
 *                                                 `pitch: true` once when the owner asked for new pitches; the listener
 *                                                 (stories-watch.yml) adds its heartbeat and the writer-key check
 *   {op:'pitch_history',worker,days?}           → what the directors must not pitch again: recent pitches + every film
 *   {op:'pitch_save',worker,pitches,status}     → a round of pitches (one per director) and how the run went
 *   {op:'claim',worker}                         → the next job, leased to this worker (or {job:null})
 *   {op:'progress',id,worker,stage,progress,…}  → {control: continue | pause | cancel}
 *   {op:'upload_urls',id,worker,names:[…]}      → signed upload urls inside jobs/<id>/ only
 *   {op:'art_urls',id,worker}                   → signed download urls for the owner's pictures named in the brief
 *   {op:'social_due',worker,lights}             → posts due on Facebook/Instagram/X/TikTok (records the yes/no lights)
 *   {op:'social_claim',id,post,worker}          → the post, its film and a signed url for its file — once per post
 *   {op:'social_result',id,post,worker,state,…} → sent | manual | failed, from the runner that claimed it
 *   {op:'social_pack',id,worker}                → every platform's composed post (read-only)
 *   {op:'finish',id,worker,state,…}             → the finished job
 *   {op:'classified_urls',worker,file,ids}      → signed download urls for panels Flow made
 *   {op:'library_flow',worker}                  → the Flow-made art-library pieces with signed download urls
 * A worker that lost its lease is refused, so two runners can never both finish one film.
 */
export async function POST(r:Request){
 if(!cronAuthorized(r))return json({error:'Not authorised.'},401)
 try{
  const b=await body(r,600_000) as Record<string,unknown>
  const worker=typeof b.worker==='string'&&/^[A-Za-z0-9._:-]{3,80}$/.test(b.worker)?b.worker:null
  if(!worker)throw new StoryError('WORKER','Missing worker id.')
  if(b.op==='cleanup_due')return json({ids:(await pendingDeletions()).slice(0,20).map(j=>j.id)})
  if(b.op==='cleanup_done'){
   const id=String(b.id||'')
   if(!(await pendingDeletions()).some(j=>j.id===id))throw new StoryError('NOT_FOUND','No pending deletion.',404)
   await purgeJobMedia(id)
   await deletionCleaned(id)
   return json({cleaned:true})
  }
  if(b.op==='trim'){
   const done:{id:string;bytes:number;files:number}[]=[],failed:string[]=[]
   for(const j of trimDue(await listJobs(200)).slice(0,5)){
    try{
     const t=await trimJobMedia(j.id),at=new Date().toISOString(),mark={at,...t}
     await updateJob(j.id,x=>({...x,trim:mark,log:[...x.log,{at,text:trimLog(mark)}].slice(-120)}))
     done.push({id:j.id,...t})
    }catch{failed.push(j.id)}
   }
   return json({trimmed:done,failed})
  }
  if(b.op==='checkpoint_allowed')return json({allowed:!!await getJob(String(b.id||''))})
  if(b.op==='peek'){
   const hb=cleanHeartbeat(b.health,worker)
   if(hb)await noteHeartbeat(hb)
   const jobs=await listJobs(200)
   const next=nextForWorker(jobs)
   let pitch=false
   try{const desk=await readPitchDesk();if(desk&&shouldDispatch(desk)){await updatePitchDesk(d=>markDispatched(d));pitch=true}}catch{pitch=false}
   return json({next:next?next.id:null,kind:next?jobKind(next):null,pitch})
  }
  // the pitch desk (scripts/football-stories/studio/pitch.py, .github/workflows/stories-pitch.yml)
  if(b.op==='pitch_history'){
   const n=Math.min(Math.max(Number(b.days)||14,1),60)
   const [days,jobs]=await Promise.all([readPitchDays(n),listJobs(200)])
   return json(takenEvents(days,jobs))
  }
  if(b.op==='pitch_save'){
   const raw=Array.isArray(b.pitches)?b.pitches:[]
   const st=(b.status&&typeof b.status==='object'?b.status:{}) as Record<string,unknown>
   let saved=0,refused:string[]=[]
   if(raw.length){
    const date=new Date().toISOString().slice(0,10)
    const [days,jobs]=await Promise.all([readPitchDays(14),listJobs(200)])
    const t=takenEvents(days.filter(d=>d.date!==date),jobs)
    await updatePitchDay(date,d=>{
     const taken=new Set([...t.pitched.map(x=>x.event),...t.films.map(x=>x.event),...(d?takenEvents([d],[]).pitched.map(x=>x.event):[])])
     const out=addRound(d,date,raw,clubNames(),taken,worker)
     saved=out.saved.length;refused=out.refused
     return out.day
    })
   }
   const desk=await updatePitchDesk(d=>noteRun(d,{state:st.state,retryAt:st.retryAt,note:st.note,saved}))
   return json({saved,refused,desk})
  }
  if(b.op==='claim'){
   // the job the workflow peeked (its checkpoints are the ones restored), when it is still the one to take
   const jobs=await listJobs(200),want=typeof b.id==='string'?b.id:null
   const next=want?nextForWorker(jobs.filter(j=>j.id===want)):nextForWorker(jobs)
   if(!next)return json({job:null})
   const requiresEditorial=next.brief.review==='editorial'||(next.kind==='classified'&&next.spec&&'panel_overrides' in next.spec)
   if(requiresEditorial&&b.editorial!==true)return json({job:null})
   const job=await updateJob(next.id,j=>{if(nextForWorker([j])?.id!==j.id)throw new StoryError('TAKEN','Taken by another worker.',409);return claim(j,worker)})
   return json({job})
  }
  const id=String(b.id||'')
  if(b.op==='classified_urls')return json(await classifiedUrls(b))
  if(b.op==='library_flow')return json(await libraryUrls())
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
  // the social runner (.github/workflows/stories-social.yml): due posts, one claim per post, one result per claim
  if(b.op==='social_due'){
   const l=cleanLights(b.lights)
   if(l)await noteLights(l).catch(()=>{})
   return json({posts:dueSocial(await listJobs(200))})
  }
  if(b.op==='social_claim'){
   const job=await updateJob(id,j=>claimSocial(j,b.post,worker))
   const post=job.social!.posts.find(p=>p.id===b.post)!
   const path=mediaPathOf(job,post.media)
   let url:string|null=null
   if(path){try{url=(await signedDownload([path],3600))[path]??null}catch{url=null}}
   const yt=(job.youtube??{}) as {synthetic_media?:{altered_or_synthetic?:boolean}}
   return json({post,film:{title:filmTitle(job),club:job.brief.club_name,season:job.brief.season,link:filmLink(job).url,synthetic:yt.synthetic_media?.altered_or_synthetic===true},
    media:post.media?{kind:post.media.kind,url,name:path?path.split('/').pop():null}:null})
  }
  if(b.op==='social_result'){
   const job=await updateJob(id,j=>resultSocial(j,b.post,worker,b as SocialResult))
   return json({post:job.social!.posts.find(p=>p.id===b.post)})
  }
  // read-only: every platform's ready post for a finished film (the Reel message on Telegram uses it)
  if(b.op==='social_pack'){
   const cur=await getJob(id)
   if(!cur)throw new StoryError('NOT_FOUND','No such job.',404)
   return json({title:filmTitle(cur.job),link:filmLink(cur.job).url,packs:composeAll(cur.job)})
  }
  if(b.op==='finish'){
   const job=await updateJob(id,j=>finish(j,worker,b as unknown as Finish))
   return json({job})
  }
  throw new StoryError('OP','Unknown operation.')
 }catch(e){return fail(e)}
}
