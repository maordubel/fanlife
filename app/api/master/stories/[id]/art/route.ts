import {adminFromRequest} from '@/lib/master/admin'
import {ART_NAME,FLOW_NAME,StoryError,flowFiles,jobKind,mediaPath} from '@/lib/stories/jobs'
import {getJob} from '@/lib/stories/store'
import {signedUpload} from '@/lib/stories/media'
import {body,fail,json,limited,sameOrigin} from '@/lib/stories/http'
export const dynamic='force-dynamic'
export const runtime='nodejs'

/**
 * The owner's pictures for one film: signed UPLOAD urls into the job's private folder (`jobs/<id>/art-<name>`), only while
 * the film has not started (queued or paused). The browser puts the files, then records them with the `art_added` action,
 * so a picture that never arrived is never named in the brief.
 */
export async function POST(r:Request,{params}:{params:{id:string}}){
 if(!adminFromRequest(r))return json({error:'Not authorised.'},401)
 if(!sameOrigin(r))return json({error:'Invalid request origin.'},403)
 if(limited(`art:${params.id}`,10,60_000))return json({error:'Too many uploads; wait a moment.'},429)
 try{
  const b=await body(r) as {names?:unknown}
  const names=Array.isArray(b.names)?b.names.map(String):[]
  const cur=await getJob(params.id)
  if(!cur)return json({error:'No such job.'},404)
  if(jobKind(cur.job)==='short'){
   // an animated Short: the clips and stills Google Flow made, into the slots its Flow pack names
   const want=new Set(cur.job.flow?flowFiles(cur.job.flow):[])
   if(!names.length||names.some(n=>!FLOW_NAME.test(n)||!want.has(n)))throw new StoryError('ART','Each file goes into one of this Short\'s slots.')
   if(cur.job.lease)throw new StoryError('ART','The worker is still stopping. Wait a moment.',409)
   if(!['needs_review','failed','paused'].includes(cur.job.state))throw new StoryError('ART','Add the Flow clips while the Short waits for them.',409)
   const urls:Record<string,string>={}
   for(const n of names)urls[n]=await signedUpload(mediaPath(cur.job.id,`art-${n}`))
   return json({urls})
  }
  if(!names.length||names.length>30||names.some(n=>!ART_NAME.test(n)))throw new StoryError('ART','Picture names: lower-case letters, digits, dots and dashes, ending .png, .jpg or .webp (at most 30).')
  if(['classified','vlog'].includes(cur.job.kind??''))throw new StoryError('ART','Use this series\' own footage input. This picture uploader is for Football Stories documentaries.')
  const reviewing=cur.job.state==='needs_review'&&cur.job.stage==='edit'&&cur.job.brief.review==='editorial'
  if(!reviewing&&!['queued','paused'].includes(cur.job.state))throw new StoryError('ART','Pictures can be added before the film starts or during scene review.',409)
  if(cur.job.lease)throw new StoryError('ART','The worker is still stopping. Wait until it pauses, then upload your pictures.',409)
  if(new Set([...(cur.job.brief.art??[]).map(f=>f.name),...names]).size>30)throw new StoryError('ART','At most 30 uploaded pictures per film. Use a Drive folder for larger selections.')
  const urls:Record<string,string>={}
  for(const n of names)urls[n]=await signedUpload(mediaPath(cur.job.id,`art-${n}`))
  return json({urls})
 }catch(e){return fail(e)}
}
