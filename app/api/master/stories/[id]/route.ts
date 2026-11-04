import {adminFromRequest} from '@/lib/master/admin'
import {StoryError,ownerAct,type Job,type OwnerAction} from '@/lib/stories/jobs'
import {getJob,updateJob} from '@/lib/stories/store'
import {removeFolder,signedDownload} from '@/lib/stories/media'
import {body,fail,json,limited,sameOrigin} from '@/lib/stories/http'
export const dynamic='force-dynamic'
export const runtime='nodejs'

/** Signed links (one hour) to a finished film's files, for the owner's eyes only. The master's chunks only on request. */
async function links(job:Job,master:boolean){
 const a=job.artefacts
 if(!a)return {}
 const paths=[a.preview?.path,a.contact?.path,a.package?.path,a.captions?.srt.path,a.captions?.vtt.path,...(a.thumbnails??[]).map(t=>t.path),...(a.shorts??[]).map(x=>x.path),...(master?(a.master?.chunks??[]).map(c=>c.path):[])].filter((p):p is string=>!!p)
 return signedDownload(paths)
}
export async function GET(r:Request,{params}:{params:{id:string}}){
 if(!adminFromRequest(r))return json({error:'Not authorised.'},401)
 try{
  const cur=await getJob(params.id)
  if(!cur)return json({error:'No such job.'},404)
  const master=new URL(r.url).searchParams.get('master')==='1'
  let urls:Record<string,string>={}
  try{urls=await links(cur.job,master)}catch{urls={}}
  return json({job:cur.job,urls})
 }catch(e){return fail(e)}
}
const ACTIONS=new Set(['pause','resume','cancel','retry','approve_script','choose_script','upload_started','upload_done','upload_uncertain','upload_reset','art_added','social_schedule','social_cancel'])
export async function POST(r:Request,{params}:{params:{id:string}}){
 const s=adminFromRequest(r)
 if(!s)return json({error:'Not authorised.'},401)
 if(!sameOrigin(r))return json({error:'Invalid request origin.'},403)
 if(limited(`act:${params.id}`,30,60_000))return json({error:'Too many actions; wait a moment.'},429)
 try{
  const a=await body(r,100_000) as OwnerAction
  if(!a||typeof a!=='object'||!ACTIONS.has((a as {action:string}).action))throw new StoryError('ACTION','Unknown action.')
  const job=await updateJob(params.id,j=>ownerAct(j,a,s.actor||'owner'))
  // Free plan, 1 GB: once YouTube has the film, the master's chunks leave the bucket (preview and package stay).
  if(a.action==='upload_done'&&job.artefacts?.master?.chunks.length){
   const names=job.artefacts.master.chunks.map(c=>c.path.split('/').pop()!).filter(Boolean)
   try{await removeFolder(job.id,names)}catch{/* the film is on YouTube either way; a later delete can retry */}
  }
  return json({job})
 }catch(e){return fail(e)}
}
