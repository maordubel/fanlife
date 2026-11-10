import {adminFromRequest} from '@/lib/master/admin'
import {REEL_MAX_BYTES,REEL_NAME,StoryError,mediaPath} from '@/lib/stories/jobs'
import {finishedFilm} from '@/lib/stories/social'
import {getJob} from '@/lib/stories/store'
import {signedUpload} from '@/lib/stories/media'
import {body,fail,json,limited,sameOrigin} from '@/lib/stories/http'
export const dynamic='force-dynamic'
export const runtime='nodejs'

/**
 * The owner's own Reel or Short for a finished film (10.11.2026: "every production gets a Reel on Instagram and
 * Facebook"): one signed UPLOAD url into the job's private folder (`jobs/<id>/reel-<name>.mp4`). The browser puts the
 * file, then records it with the `reel_added` action, which checks it is really there — so the Social panel can schedule it.
 */
export async function POST(r:Request,{params}:{params:{id:string}}){
 if(!adminFromRequest(r))return json({error:'Not authorised.'},401)
 if(!sameOrigin(r))return json({error:'Invalid request origin.'},403)
 if(limited(`reel:${params.id}`,10,60_000))return json({error:'Too many uploads; wait a moment.'},429)
 try{
  const b=await body(r) as {name?:unknown;bytes?:unknown}
  const name=String(b.name??''),bytes=Number(b.bytes)
  if(!REEL_NAME.test(name))throw new StoryError('REEL','Invalid Reel file name.')
  if(!Number.isInteger(bytes)||bytes<1||bytes>REEL_MAX_BYTES)throw new StoryError('REEL','A Reel can be at most 45 MB.')
  const cur=await getJob(params.id)
  if(!cur)return json({error:'No such job.'},404)
  if(!finishedFilm(cur.job))throw new StoryError('REEL','Add your own Reel once the film is finished.',409)
  return json({url:await signedUpload(mediaPath(cur.job.id,name))})
 }catch(e){return fail(e)}
}
