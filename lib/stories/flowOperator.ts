import 'server-only'
import {FLOW_KINDS,FLOW_NAME,StoryError,flowFiles,jobKind,mediaPath,ownerAct,type Job} from './jobs'
import {getJob,listJobs,updateJob} from './store'
import {signedDownload,signedUpload} from './media'

/**
 * The Flow operator (owner, 9.11.2026: "easy, convenient, automatic — no login"). Google Flow has no API, so Claude makes
 * the pictures and clips in Flow on the owner's computer once an hour (a scheduled task, docs/fanlife/70-flow-operator.md).
 * It never touches the studio's login: it reads this queue and hands the files to GitHub, and the intake workflow
 * (stories-flow-intake.yml, the worker's cron secret) puts them in place through these four ops.
 *   - a waiting animated Short or marketing film: its missing slots (clip-N.mp4, still-N.jpg) and their Flow prompts
 *   - a CLASSIFIED FILE: the panels its manifest names with no Drive picture and no stored picture yet, with prompts
 * CLASSIFIED panels live in the private bucket at classified/<file>/<panel>.png — never in the repository.
 */
export const FILE_ID=/^file\d{2}$/
export const PANEL_ID=/^f\d{2}-[a-z0-9-]{1,40}$/
export const panelPath=(file:string,id:string)=>`classified/${file}/${id}.png`
export type PanelNeed={file:string;title?:string;panels:{id:string;role?:string;prompt:string}[]}

const waiting=(j:Job)=>FLOW_KINDS.includes(jobKind(j))&&!!j.flow&&['needs_review','paused','failed'].includes(j.state)&&j.stage!=='done'&&!j.lease

export async function flowQueue(needs:PanelNeed[]){
 const jobs=(await listJobs(200)).filter(waiting).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).map(j=>{
  const have=new Set((j.brief.art??[]).map(a=>a.name)),f=j.flow!
  return {id:j.id,kind:jobKind(j),title:f.title,characters:f.characters,clips:f.clips,stills:f.stills,missing:flowFiles(f).filter(n=>!have.has(n))}
 })
 const classified=[]
 for(const n of needs.slice(0,20)){
  if(!FILE_ID.test(String(n.file)))continue
  const panels=(Array.isArray(n.panels)?n.panels:[]).filter(p=>PANEL_ID.test(String(p.id))&&typeof p.prompt==='string'&&p.prompt.length>10).slice(0,40)
  if(!panels.length)continue
  const stored=await signedDownload(panels.map(p=>panelPath(n.file,p.id)),60)
  const missing=panels.filter(p=>!stored[panelPath(n.file,p.id)]).map(p=>({id:p.id,role:String(p.role??'').slice(0,40),prompt:p.prompt.slice(0,2400)}))
  if(missing.length)classified.push({file:n.file,title:String(n.title??'').slice(0,140),missing})
 }
 return {jobs,classified}
}

export async function flowUrls(b:{id?:unknown;file?:unknown;names?:unknown}){
 const names=Array.isArray(b.names)?b.names.slice(0,40).map(String):[]
 if(!names.length)throw new StoryError('FLOW','Name the files.')
 const urls:Record<string,string>={}
 if(typeof b.file==='string'){
  if(!FILE_ID.test(b.file)||names.some(n=>!PANEL_ID.test(n)))throw new StoryError('FLOW','Unknown FILE or panel.')
  for(const n of names)urls[n]=await signedUpload(panelPath(b.file,n))
  return {urls}
 }
 const cur=await getJob(String(b.id||''))
 if(!cur||!waiting(cur.job))throw new StoryError('FLOW','This job is not waiting for Flow files.',409)
 const want=new Set(flowFiles(cur.job.flow!))
 if(names.some(n=>!FLOW_NAME.test(n)||!want.has(n)))throw new StoryError('FLOW','Each file goes into one of this job\'s slots.')
 for(const n of names)urls[n]=await signedUpload(mediaPath(cur.job.id,`art-${n}`))
 return {urls}
}

/** Record the files that arrived; when every slot is filled, queue the edit. Only files that really landed are named. */
export async function flowDone(b:{id?:unknown;files?:unknown}){
 const id=String(b.id||''),files=Array.isArray(b.files)?b.files.map(String):[]
 const cur=await getJob(id)
 if(!cur||!waiting(cur.job))throw new StoryError('FLOW','This job is not waiting for Flow files.',409)
 const landed=await signedDownload(files.map(f=>mediaPath(id,`art-${f}`)),60)
 const real=files.filter(f=>landed[mediaPath(id,`art-${f}`)])
 if(!real.length)throw new StoryError('FLOW','None of these files is in storage.')
 const job=await updateJob(id,j=>{
  let x=ownerAct(j,{action:'flow_added',files:real},'Flow operator')
  const have=new Set((x.brief.art??[]).map(a=>a.name))
  if(flowFiles(x.flow!).every(n=>have.has(n)))x=ownerAct(x,{action:'flow_ready'},'Flow operator')
  return x
 })
 return {state:job.state,added:real}
}

/** Signed download urls for the CLASSIFIED panels Flow made (the worker fetches the ones with no Drive picture). */
export async function classifiedUrls(b:{file?:unknown;ids?:unknown}){
 const file=String(b.file||''),ids=Array.isArray(b.ids)?b.ids.slice(0,60).map(String).filter(i=>PANEL_ID.test(i)):[]
 if(!FILE_ID.test(file))throw new StoryError('FLOW','Unknown FILE.')
 const s=await signedDownload(ids.map(i=>panelPath(file,i)))
 const urls:Record<string,string>={}
 for(const i of ids){const u=s[panelPath(file,i)];if(u)urls[i]=u}
 return {urls}
}
