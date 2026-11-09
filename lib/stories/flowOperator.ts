import 'server-only'
import {FLOW_KINDS,FLOW_NAME,StoryError,flowFiles,jobKind,mediaPath,ownerAct,type Job} from './jobs'
import {getJob,listJobs,updateJob} from './store'
import {listNames,signedDownload,signedUpload} from './media'
import {durable} from '@/lib/master/durable'
import {createHash,timingSafeEqual} from 'node:crypto'

/**
 * The Flow operator (owner, 9.11.2026: "easy, convenient, automatic — no login"). Google Flow has no API, so Claude makes
 * the pictures and clips in Flow on the owner's computer once an hour (a scheduled task, docs/fanlife/70-flow-operator.md).
 * It never touches the studio's login. Each run mints a two-hour ticket straight in the database (its sha256 in the file
 * stories/flow-ticket.json, written with the Supabase connector); the Flow tab then calls /api/master/stories/flow with
 * that ticket — queue, signed upload urls, done — and puts each file straight into the private bucket.
 *   - a waiting animated Short or marketing film: its missing slots (clip-N.mp4, still-N.jpg) and their Flow prompts
 *   - a CLASSIFIED FILE: the panels its manifest names with no Drive picture and no stored picture yet, with prompts
 * CLASSIFIED panels live in the private bucket at classified/<file>/<panel>.png — never in the repository.
 */
export const FILE_ID=/^file\d{2}$/
export const PANEL_ID=/^f\d{2}-[a-z0-9-]{1,40}$/
export const panelPath=(file:string,id:string)=>`classified/${file}/${id}.png`
export const LIB_STEM=/^(ppl|sup|obj|era|doc|ins|layer|sky|ground|city)-[a-z0-9-]{2,70}-fl\d-kr$/
export const LIB_DIR='library/flow'
export const libPath=(stem:string)=>`${LIB_DIR}/${stem}.png`
export type LibPiece={stem:string;aspect?:string;prompt:string}
export type PanelNeed={file:string;title?:string;panels:{id:string;role?:string;prompt:string}[]}

const waiting=(j:Job)=>FLOW_KINDS.includes(jobKind(j))&&!!j.flow&&['needs_review','paused','failed'].includes(j.state)&&j.stage!=='done'&&!j.lease

export async function flowQueue(needs:PanelNeed[],lib:LibPiece[]=[]){
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
 // the art library the VOX cinema picks from (studio/cinema/flow_library.json): the pieces not drawn yet
 const want=lib.filter(p=>LIB_STEM.test(String(p.stem))&&typeof p.prompt==='string'&&p.prompt.length>20).slice(0,400)
 const have=new Set(want.length?await listNames(LIB_DIR,2000):[])
 const library=want.filter(p=>!have.has(`${p.stem}.png`)).map(p=>({stem:p.stem,aspect:p.aspect==='16:9'?'16:9':'1:1',prompt:p.prompt.slice(0,2400)}))
 return {jobs,classified,library}
}

export async function flowUrls(b:{id?:unknown;file?:unknown;lib?:unknown;names?:unknown}){
 const names=Array.isArray(b.names)?b.names.slice(0,40).map(String):[]
 if(!names.length)throw new StoryError('FLOW','Name the files.')
 const urls:Record<string,string>={}
 if(b.lib===true){
  if(names.some(n=>!LIB_STEM.test(n)))throw new StoryError('FLOW','Unknown library piece.')
  for(const n of names)urls[n]=await signedUpload(libPath(n))
  return {urls}
 }
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

/** The ticket the operator minted for this run (sha256 + expiry, two hours at most). */
export const TICKET_FILE='stories/flow-ticket.json'
/** The studio operator's own ticket (a session producing films), so the hourly Flow run and a production session never
 *  overwrite each other's ticket. Same shape, same limits. */
export const OPERATOR_TICKET_FILE='stories/operator-ticket.json'
export async function ticketOk(ticket:unknown,now=Date.now(),file=TICKET_FILE):Promise<boolean>{
 if(typeof ticket!=='string'||!/^[A-Za-z0-9-]{32,128}$/.test(ticket))return false
 const d=durable();if(!d||d.kind==='memory')return false
 const r=await d.read(file,{fresh:true,soft:false}).catch(()=>null)
 if(!r)return false
 let t:{hash?:string;expires?:string}
 try{t=JSON.parse(r.text)}catch{return false}
 const exp=Date.parse(String(t.expires||''))
 if(!Number.isFinite(exp)||exp<now||exp>now+3*3600_000||!/^[0-9a-f]{64}$/.test(String(t.hash)))return false
 const a=Buffer.from(createHash('sha256').update(ticket).digest('hex')),b=Buffer.from(String(t.hash))
 return a.length===b.length&&timingSafeEqual(a,b)
}

/** CLASSIFIED panels with no Drive picture and a Flow prompt (written by the writers' room, comic/from_script.py). The
 *  operator sends the manifest's FILEs with the queue request (lib/ never reads scripts/). */
type Man={files:Record<string,{title?:string;panels?:{id:string;role?:string;drive_id?:string|null;prompt?:string}[]}>}
export function panelNeeds(m:Man):PanelNeed[]{
 return Object.entries(m.files||{}).map(([file,f])=>({file,title:f.title,panels:(f.panels||[]).filter(p=>!p.drive_id&&typeof p.prompt==='string'&&p.prompt.length>10).map(p=>({id:p.id,role:p.role,prompt:p.prompt!}))})).filter(n=>n.panels.length)
}

/** The Flow-made library pieces with signed download urls (the worker adds them to the cinema library). */
export async function libraryUrls(){
 const names=(await listNames(LIB_DIR,2000)).filter(n=>LIB_STEM.test(n.replace(/\.png$/,'')))
 const s=await signedDownload(names.map(n=>`${LIB_DIR}/${n}`),3600)
 return {pieces:names.flatMap(n=>{const u=s[`${LIB_DIR}/${n}`];return u?[{stem:n.replace(/\.png$/,''),url:u}]:[]})}
}
