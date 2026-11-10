import 'server-only'
import {claimSocial,dueSocial,filmLink,mediaPathOf,resultSocial,type SocialPost} from './social'
import {listJobs,updateJob} from './store'
import {signedDownload} from './media'
import type {Job} from './jobs'
import {metaEnv} from '@/lib/marketing/metaStore'

/**
 * The studio's Facebook and Instagram posts, published from THIS deployment on the plan's five-minute tick (owner,
 * 10.11.2026: "permanent automatic publishing"). GitHub's scheduled runner comes every few hours, so a Reel set for
 * 19:30 could go out at midnight. Same claim-once rule as the runner (`claimSocial`: a claimed post is never sent
 * twice, whoever claims it first). Meta fetches the file itself from a one-hour signed link, so no bytes pass through
 * this function; Instagram processes a Reel for a minute or two, so its container id waits on the post (`ig:<id>`)
 * and a later tick publishes it. Off unless the Page connection is on (Vercel's variables or the GitHub hand-over).
 */
export const WORKER='vercel-meta'
const PENDING=/^ig:(\d{5,40})$/
const MAX_WAIT_MS=40*60_000

type Cfg={page:string;ig:string;token:string;version:string}
async function cfg():Promise<Cfg|null>{
 const e=await metaEnv()
 const page=String(e.META_PAGE_ID||''),token=String(e.META_PAGE_TOKEN||''),ig=String(e.META_IG_USER_ID||'')
 if(String(e.META_AUTOPUBLISH||'').trim()!=='1'||!/^\d+$/.test(page)||token.length<41)return null
 return {page,ig:/^\d+$/.test(ig)?ig:'',token,version:/^v\d+\.\d+$/.test(String(e.META_GRAPH_VERSION||''))?String(e.META_GRAPH_VERSION):'v23.0'}
}
const clean=(s:unknown,token:string)=>String(s??'').split(token).join('[token]').replace(/\s+/g,' ').slice(0,300)
function graph(c:Cfg){
 return async(path:string,params:Record<string,string>={},method:'GET'|'POST'='POST')=>{
  const u=new URL(`https://graph.facebook.com/${c.version}/${path}`)
  const body=new URLSearchParams({...params,access_token:c.token})
  const r=method==='GET'?await fetch(`${u}?${body}`,{signal:AbortSignal.timeout(20_000),cache:'no-store'}):await fetch(u,{method:'POST',body,signal:AbortSignal.timeout(20_000),cache:'no-store'})
  const j=await r.json().catch(()=>({})) as Record<string,unknown>&{error?:{message?:string}}
  if(!r.ok||j.error)throw new Error(clean(j.error?.message||`Meta answered ${r.status}`,c.token))
  return j
 }
}
const hold=(job:Job,postId:string,result:string):Job=>{const j:Job=structuredClone(job);const p=(j.social?.posts??[]).find(x=>x.id===postId);if(p)p.result=result;j.updatedAt=new Date().toISOString();return j}

async function facebook(c:Cfg,job:Job,post:SocialPost,url:string|null){
 const api=graph(c),link=filmLink(job)
 let id:string,href:string
 if(post.media?.kind==='short'&&url){
  const start=await api(`${c.page}/video_reels`,{upload_phase:'start'}) as {video_id:string;upload_url?:string}
  const up=await fetch(start.upload_url||`https://rupload.facebook.com/video-upload/${c.version}/${start.video_id}`,{method:'POST',headers:{authorization:`OAuth ${c.token}`,file_url:url},signal:AbortSignal.timeout(25_000)})
  const uj=await up.json().catch(()=>({})) as {success?:boolean;error?:{message?:string}}
  if(!up.ok||uj.success===false||uj.error)throw new Error(clean(`upload refused: ${uj.error?.message||up.status}`,c.token))
  await api(`${c.page}/video_reels`,{upload_phase:'finish',video_id:start.video_id,video_state:'PUBLISHED',description:post.caption})
  id=start.video_id;href=`https://www.facebook.com/reel/${id}`
 }else if(link.film){id=String((await api(`${c.page}/feed`,{message:post.caption,link:link.url})).id);href=`https://www.facebook.com/${id}`}
 else if(url){const r=await api(`${c.page}/photos`,{url,message:post.caption}) as {post_id?:string;id?:string};id=String(r.post_id||r.id);href=`https://www.facebook.com/${id}`}
 else{id=String((await api(`${c.page}/feed`,{message:post.caption})).id);href=`https://www.facebook.com/${id}`}
 let note=''
 if(post.comment)await api(`${id}/comments`,{message:post.comment}).catch(()=>{note=' · the first comment was refused — add it by hand'})
 return {result:`${post.media?.kind==='short'?'reel':'post'} ${id}${note}`,url:href}
}

/** One pass: finish Instagram Reels that were processing, then take up to two due posts. Never throws. */
export async function runMetaSocial(now=new Date()):Promise<string[]>{
 const out:string[]=[]
 const c=await cfg().catch(()=>null)
 if(!c)return out
 const api=graph(c)
 let jobs:Job[]
 try{jobs=await listJobs(200)}catch{return out}
 // 1 · Instagram containers waiting to finish processing
 for(const j of jobs)for(const p of j.social?.posts??[]){
  const m=p.state==='sending'&&p.claimedBy===WORKER?PENDING.exec(p.result??''):null
  if(!m)continue
  try{
   const s=await api(m[1]!,{fields:'status_code,status'},'GET') as {status_code?:string;status?:string}
   if(s.status_code==='FINISHED'){
    const id=String((await api(`${c.ig}/media_publish`,{creation_id:m[1]!})).id)
    let note=''
    if(p.comment)await api(`${id}/comments`,{message:p.comment}).catch(()=>{note=' · the first comment was refused — add it by hand'})
    const link=await api(id,{fields:'permalink'},'GET').catch(()=>({})) as {permalink?:string}
    await updateJob(j.id,x=>resultSocial(x,p.id,WORKER,{state:'sent',result:`${p.media?.kind==='short'?'reel':'post'} ${id}${note}`,url:link.permalink||null},now))
    out.push(`instagram ${j.id.slice(0,8)} sent`)
   }else if(s.status_code==='ERROR'||s.status_code==='EXPIRED'||now.getTime()-Date.parse(p.claimedAt||p.dueAt)>MAX_WAIT_MS){
    await updateJob(j.id,x=>resultSocial(x,p.id,WORKER,{state:'failed',error:`Instagram could not process the file (${clean(s.status||s.status_code||'timed out',c.token)})`},now))
    out.push(`instagram ${j.id.slice(0,8)} failed`)
   }
  }catch(e){out.push(`instagram ${j.id.slice(0,8)} wait: ${clean((e as Error).message,c.token).slice(0,80)}`)}
 }
 // 2 · due posts (Facebook and Instagram only; X and TikTok stay with the GitHub runner)
 const due=dueSocial(jobs,now,20).filter(d=>d.platform==='facebook'||(d.platform==='instagram'&&!!c.ig)).slice(0,2)
 for(const d of due){
  let job:Job
  try{job=await updateJob(d.jobId,x=>claimSocial(x,d.postId,WORKER,now))}catch{continue}
  const post=job.social!.posts.find(p=>p.id===d.postId)!
  const path=mediaPathOf(job,post.media)
  try{
   const url=path?(await signedDownload([path],3600))[path]??null:null
   if(d.platform==='facebook'){
    const r=await facebook(c,job,post,url)
    await updateJob(job.id,x=>resultSocial(x,post.id,WORKER,{state:'sent',...r},now))
    out.push(`facebook ${job.id.slice(0,8)} sent`)
   }else{
    if(!url)throw new Error('Instagram needs a file and this post has none in storage')
    const params:Record<string,string>=post.media?.kind==='short'?{media_type:'REELS',video_url:url,caption:post.caption,share_to_feed:'true'}:{image_url:url,caption:post.caption}
    const creation=String((await api(`${c.ig}/media`,params)).id)
    await updateJob(job.id,x=>hold(x,post.id,`ig:${creation}`))
    out.push(`instagram ${job.id.slice(0,8)} processing`)
   }
  }catch(e){
   const why=clean((e as Error).message,c.token)
   await updateJob(job.id,x=>resultSocial(x,post.id,WORKER,{state:'failed',error:why},now)).catch(()=>null)
   out.push(`${d.platform} ${job.id.slice(0,8)} failed: ${why.slice(0,80)}`)
  }
 }
 return out
}
