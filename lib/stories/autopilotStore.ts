import 'server-only'
import {durable} from '@/lib/master/durable'
import {SITE_URL} from '@/lib/brand'
import {StoryError,type Job} from './jobs'
import {getJob,listJobs,updateJob} from './store'
import {signedDownload} from './media'
import {createFilm} from './create'
import {decidePitch,findPitch,pitchBrief,requestPitches} from './pitches'
import {readPitchDays,readPitchDesk,updatePitchDay,updatePitchDesk} from './pitchStore'
import {filmTitle} from './social'
import {cancelLink} from './autopilotToken'
import {ACTOR,SETTING_OFF,TELEGRAM_MAX_BYTES,athens,autopilotActive,noticeSent,pendingNotices,pickPitch,pickedOn,pipelineBusy,
 previewDelivered,previewFailed,previewSent,previewText,startAutopilot,tickJob,youtubeResult,youtubeUploaded,type Effect,type Setting} from './autopilot'

/**
 * The autopilot's switch and its tick (lib/stories/autopilot.ts holds the rules). THE switch is one small file in the
 * control room's durable store, `studio/autopilot.json`, read here and nowhere else: absent or unreadable = OFF. The
 * owner turns it on and off in the studio desk (Directors → Autopilot); merging this changes nothing until he does.
 */
const NAME='studio/autopilot.json'
const base=()=>SITE_URL.replace(/\/$/,'')
export const deskUrl=()=>`${base()}/master/admin?section=studio&view=docs`

/** Soft: storage that cannot answer is OFF — the autopilot never runs on a guess. */
export async function readAutopilot():Promise<Setting>{
 const d=durable()
 if(!d||d.kind==='memory')return SETTING_OFF
 try{const r=await d.read(NAME,{fresh:true,soft:false});const s=r?JSON.parse(r.text) as Setting:null;return s&&s.on===true?{on:true,at:s.at??null,by:s.by??null}:s?{on:false,at:s.at??null,by:s.by??null}:SETTING_OFF}catch{return SETTING_OFF}
}
export async function setAutopilot(on:boolean,actor:string,now=new Date()):Promise<Setting>{
 const d=durable()
 if(!d||d.kind==='memory')throw new StoryError('STORE','Durable storage is not configured: the switch cannot be kept.',503)
 const next:Setting={on,at:now.toISOString(),by:String(actor||'owner').slice(0,80)}
 for(let i=0;i<5;i++){
  const cur=await d.read(NAME,{fresh:true,soft:false})
  if(await d.write(NAME,JSON.stringify(next),cur?.etag??null))return next
 }
 throw new StoryError('CONFLICT','The switch changed while saving; try again.',409)
}

type Lights={telegram:boolean;youtube:boolean}
export type Action=
 {type:'notice';id:string;key:string;text:string}
 |{type:'preview';id:string;caption:string;video:{url:string;name:string}|null;thumbnail:string|null}
 |{type:'publish_youtube';id:string;chunks:string[];meta:{title:string;description:string;tags:string[];contains_synthetic_media:boolean}}

const PICK_RETRY_MS=30*60_000
let emptyAt=0
/** PICK: once an Athens day, when nothing is in production or waiting. No open pitch → ask the directors (once a day). */
async function pick(jobs:Job[],now:Date):Promise<Job|null>{
 const day=athens(now).date
 if(pipelineBusy(jobs)||pickedOn(jobs,day))return null
 // nothing to pick a moment ago: look again in half an hour, not every seven minutes (the reads are the account's CPU)
 if(+now-emptyAt<PICK_RETRY_MS)return null
 const best=pickPitch(await readPitchDays(14),jobs,now)
 if(!best){
  emptyAt=+now
  const desk=await readPitchDesk()
  if(desk&&!desk.request&&(!desk.last||athens(new Date(desk.last.at)).date!==day))await updatePitchDesk(d=>d.request?d:requestPitches(d,ACTOR,now)).catch(()=>null)
  return null
 }
 // one key a day: a second tick, or a second runner, gets the same job back — never a second film
 const {job}=await createFilm(pitchBrief(best.pitch),ACTOR,`autopilot-${day}`,j=>startAutopilot(j,best,now))
 await updatePitchDay(best.date,d=>{const x=d&&findPitch(d,best.pitch.id);if(!d||!x)throw new StoryError('NOT_FOUND','No such pitch.',404);return x.state==='open'?decidePitch(d,best.pitch.id,'made',ACTOR,job.id,now):d}).catch(()=>null)
 return job
}

async function previewAction(j:Job):Promise<Action>{
 const a=j.artefacts,pv=a?.preview&&a.preview.bytes<=TELEGRAM_MAX_BYTES?a.preview:null,th=a?.thumbnails?.[0]
 const paths=[pv?.path,th?.path].filter((p):p is string=>!!p)
 let urls:Record<string,string>={}
 try{urls=await signedDownload(paths,3600)}catch{urls={}}
 return {type:'preview',id:j.id,caption:`🎬 AUTOPILOT preview · ${filmTitle(j)}`.slice(0,900),
  video:pv&&urls[pv.path]?{url:urls[pv.path]!,name:pv.path.split('/').pop()||'preview.mp4'}:null,thumbnail:th?urls[th.path]??null:null}
}
async function youtubeAction(j:Job):Promise<Action>{
 const chunks=j.artefacts?.master?.chunks??[],urls=await signedDownload(chunks.map(c=>c.path),3*3600)
 const y=(j.youtube??{}) as {description?:unknown;tags?:unknown;synthetic_media?:{altered_or_synthetic?:unknown}}
 return {type:'publish_youtube',id:j.id,chunks:chunks.map(c=>urls[c.path]??''),
  meta:{title:filmTitle(j).slice(0,100),description:String(y.description??'').slice(0,5000),tags:(Array.isArray(y.tags)?y.tags:[]).map(String).slice(0,25),contains_synthetic_media:y.synthetic_media?.altered_or_synthetic===true}}
}

/** One tick, asked for by the listener's runner: {op:'autopilot',worker,lights}. Everything it returns is for that runner. */
export async function autopilotTick(worker:string,lights:Lights,now=new Date()):Promise<{on:boolean;picked:string|null;actions:Action[]}>{
 const set=await readAutopilot()
 let jobs=await listJobs(200),picked:string|null=null
 if(set.on){try{const j=await pick(jobs,now);if(j){picked=j.id;jobs=[j,...jobs.filter(x=>x.id!==j.id)]}}catch(e){console.error('[stories] autopilot pick',e)}}
 const actions:Action[]=[],ctx={on:set.on,telegram:lights.telegram,youtube:lights.youtube,worker,now,desk:deskUrl()}
 const after:Job[]=[]
 for(const j of jobs){
  if(!autopilotActive(j)){after.push(j);continue}
  const fx:{effect:Effect}={effect:null}
  try{
   // decided on the copy in hand, then again on the fresh one inside the compare-and-swap: the effect is the saved one's
   const job=tickJob(j,ctx).job===j?j:await updateJob(j.id,x=>{const o=tickJob(x,ctx);fx.effect=o.effect;return o.job})
   after.push(job)
   if(fx.effect==='preview')actions.push(await previewAction(job))
   if(fx.effect==='publish_youtube')actions.push(await youtubeAction(job))
  }catch(e){console.error('[stories] autopilot tick',j.id,e);after.push(j)}
 }
 if(lights.telegram)for(const n of pendingNotices(after))actions.push({type:'notice',...n})
 return {on:set.on,picked,actions}
}

/** The runner's reports: {op:'autopilot_report',worker,id,event,…}. */
export async function autopilotReport(worker:string,b:Record<string,unknown>,now=new Date()):Promise<Record<string,unknown>>{
 const id=String(b.id||'')
 if(b.event==='notice_sent'){await updateJob(id,j=>noticeSent(j,b.key,now));return {ok:true}}
 if(b.event==='preview_sent'){
  // the stamp that starts the two hours; the text that carries the real time and the cancel link comes back
  const job=await updateJob(id,j=>previewSent(j,worker,now))
  const link=cancelLink(base(),process.env.CRON_SECRET||'',job)!
  let watch:string|null=null
  if(b.video!==true&&job.artefacts?.preview){try{watch=(await signedDownload([job.artefacts.preview.path],3*3600))[job.artefacts.preview.path]??null}catch{watch=null}}
  return {text:previewText(job,link,watch),cancel:link,publishAt:job.autopilot!.preview.publishAt}
 }
 if(b.event==='preview_delivered'){await updateJob(id,j=>previewDelivered(j,worker,now));return {ok:true}}
 if(b.event==='preview_failed'){await updateJob(id,j=>previewFailed(j,worker,b.error,now));return {ok:true}}
 if(b.event==='youtube_uploaded'){
  let go=false
  await updateJob(id,j=>{const o=youtubeUploaded(j,worker,String(b.videoId||''),now);go=o.go;return o.job})
  return {go}
 }
 if(b.event==='youtube_result'){await updateJob(id,j=>youtubeResult(j,worker,b,{desk:deskUrl()},now));return {ok:true}}
 throw new StoryError('OP','Unknown autopilot event.')
}

/** The cancel page's facts for one job (no login: the signed link is the key). */
export async function cancelView(id:string):Promise<{title:string;club:string;state:string;publishAt:string|null}|null>{
 const cur=await getJob(id)
 const a=cur?.job.autopilot
 return cur&&a?{title:filmTitle(cur.job),club:cur.job.brief.club_name,state:a.state,publishAt:a.preview.publishAt}:null
}
