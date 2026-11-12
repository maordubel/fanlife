/**
 * The studio's autopilot (owner, 12.11.2026 — docs/rules/studio-autopilot.md): "yes" to the system picking the day's
 * pitch, making the film and publishing it — "but I want to receive the film on Telegram and have a two-hour option to
 * cancel the publishing: I receive it at 10:00, and the publishing happens at 12:00."
 *
 * A state machine on the job (`job.autopilot`), behind ONE switch (lib/stories/autopilotStore.ts, default off):
 *   producing → (film ready, QA passed, 10:00 Athens) the preview goes to the owner's Telegram → window (two full hours
 *   from the moment the message was sent) → published | handoff, or cancelled_by_owner from the signed link, or stopped.
 * Pure: no I/O here, and nothing a browser cannot load (the desk reads its constants; the signed link is autopilotToken.ts). The listener (stories-watch.yml → studio/autopilot.py) ticks about every seven minutes, so every
 * transition is safe to run twice, is written to the job's log, and nothing is published when the switch is off, QA
 * failed, the preview was not delivered (no preview = no publish) or the owner cancelled.
 */
import {StoryError,jobKind,ownerAct,type Job} from './jobs'
import {eventKey,type Pitch,type PitchDay} from './pitches'
import {filmTitle} from './social'

/* ── the owner's numbers ── */
/** the preview is sent at the first listener tick at or after this hour, Europe/Athens */
export const PREVIEW_HOUR=10
/** …and never from this hour on: a film that becomes ready in the evening waits for the next morning, so the two
 *  hours to cancel never fall while the owner sleeps */
export const PREVIEW_LAST_HOUR=20
/** the cancel window: publish = the moment the message was sent + two hours */
export const WINDOW_MS=2*3600_000
/** the stamp is taken a moment BEFORE the message leaves; this keeps the window at two FULL hours from its arrival */
export const WINDOW_GRACE_MS=60_000
/** a preview being sent belongs to one runner for this long; after that another tick may try again */
export const PREVIEW_CLAIM_MS=20*60_000
export const PREVIEW_ATTEMPTS=3
/** a window whose end passed this long ago (the switch was off, the listener was down) is not published late */
export const PUBLISH_LATE_MS=6*3600_000
/** an upload to YouTube belongs to its runner for this long */
export const PUBLISH_CLAIM_MS=3*3600_000
/** Telegram's public Bot API takes a file of at most 50 MB from a bot */
export const TELEGRAM_MAX_BYTES=49*1024*1024
/** a pitch is "of the day" for this long (the pitch run's days are UTC days) */
export const PITCH_FRESH_MS=36*3600_000
export const ROTATION_CAP_DAYS=30
export const ACTOR='Autopilot'

export type AutopilotState='producing'|'window'|'publishing'|'published'|'handoff'|'cancelled_by_owner'|'stopped'
export type PublishMode='youtube'|'handoff'
export type Notice={key:string;text:string;at:string;sentAt:string|null}
export type Autopilot={
 state:AutopilotState
 /** why this pitch was picked: its score and every part of it */
 pick:{pitchId:string;date:string;director:string;logline:string;score:number;why:string[];at:string}
 preview:{claim:{worker:string;at:string}|null;attempts:number;sentAt:string|null;publishAt:string|null;deliveredAt:string|null;mode:PublishMode|null}
 cancel:{at:string}|null
 publish:{mode:PublishMode;at:string;worker:string|null}|null
 stop:{at:string;reason:string}|null
 /** short messages for the owner's Telegram, each sent once (the runner acknowledges by key) */
 notices:Notice[]
}
export type Setting={on:boolean;at:string|null;by:string|null}
export const SETTING_OFF:Setting={on:false,at:null,by:null}
const ACTIVE:readonly AutopilotState[]=['producing','window','publishing']
export const autopilotActive=(j:Pick<Job,'autopilot'>):boolean=>!!j.autopilot&&ACTIVE.includes(j.autopilot.state)

/* ── Europe/Athens (every schedule is Athens time; the window itself is real elapsed time) ── */
const FMT=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
export function athens(d:Date):{date:string;hour:number;hm:string}{
 const p=Object.fromEntries(FMT.formatToParts(d).map(x=>[x.type,x.value])) as Record<string,string>
 return {date:`${p.year}-${p.month}-${p.day}`,hour:Number(p.hour),hm:`${p.hour}:${p.minute}`}
}
/** May a preview leave now? From 10:00 Athens until the evening cut-off. */
export const previewHour=(now:Date):boolean=>{const h=athens(now).hour;return h>=PREVIEW_HOUR&&h<PREVIEW_LAST_HOUR}
/** The end of the window for a message stamped `sentAt`: two hours and the grace, on a whole minute. */
export function publishTime(sentAt:Date):Date{return new Date(Math.ceil((+sentAt+WINDOW_MS+WINDOW_GRACE_MS)/60_000)*60_000)}

/* ── PICK: the best pitch of the day, by a fixed sum of what the pitch and the job list already say ── */
export type Scored={pitch:Pitch;date:string;score:number;why:string[]}
const KIND_POINTS:Record<Pitch['kind'],number>={match:6,tie:5,rivalry:4,season:2}
const film=(j:Job)=>jobKind(j)==='film'
/** A film is being made, waits for the owner, or rides the autopilot: no second pick meanwhile. */
export function pipelineBusy(jobs:Job[]):boolean{
 return jobs.some(j=>autopilotActive(j)||film(j)&&['queued','running','paused','cancel_requested','needs_review'].includes(j.state))
}
export const pickedOn=(jobs:Job[],day:string):boolean=>jobs.some(j=>j.autopilot&&athens(new Date(j.autopilot.pick.at)).date===day)
/** Pictures the library is known to hold for a club: the last Drive scan a film of that club logged. */
export function knownArt(jobs:Job[]):Map<string,number>{
 const out=new Map<string,number>()
 for(const j of [...jobs].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)))for(const l of j.log){const m=/Drive: (\d+) pictures/.exec(l.text);if(m)out.set(j.brief.club_id,Number(m[1]))}
 return out
}
export function scorePitches(days:PitchDay[],jobs:Job[],now=new Date()):Scored[]{
 const since=new Date(+now-PITCH_FRESH_MS).toISOString().slice(0,10)
 const all=days.flatMap(d=>d.rounds.flatMap(r=>r.pitches.map(p=>({p,date:d.date}))))
 // never a pitch the owner passed — nor the same event pitched again by another director
 const passed=new Set(all.filter(x=>x.p.state==='passed').map(x=>eventKey(x.p)))
 const films=jobs.filter(film)
 const filmed=new Set(films.map(j=>eventKey(j.brief)))
 const last=new Map<string,number>()
 for(const j of films)if(j.state!=='cancelled')last.set(j.brief.club_id,Math.max(last.get(j.brief.club_id)??0,Date.parse(j.createdAt)))
 const art=knownArt(jobs)
 return all.filter(x=>x.p.state==='open'&&x.date>=since&&!passed.has(eventKey(x.p))&&!filmed.has(eventKey(x.p))).map(({p,date})=>{
  const t=last.get(p.club_id),days0=t===undefined?ROTATION_CAP_DAYS:Math.min(ROTATION_CAP_DAYS,Math.max(0,Math.floor((+now-t)/86_400_000)))
  const pictures=Math.min(10,art.get(p.club_id)??0)
  const told=(p.cold_open?4:0)+Math.min(3,p.acts.length)+(p.why?2:0)
  const why=[t===undefined?`${p.club_name} was never filmed (+${days0})`:`${p.club_name} was last filmed ${days0} day(s) ago (+${days0})`,
   pictures?`${art.get(p.club_id)} pictures known in the library (+${pictures})`:'no pictures known in the library yet (+0)',
   `${p.kind} story (+${KIND_POINTS[p.kind]})`,`cold open, acts and reason written (+${told})`]
  return {pitch:p,date,score:days0+pictures+KIND_POINTS[p.kind]+told,why}
 }).sort((a,b)=>b.score-a.score||b.date.localeCompare(a.date)||a.pitch.id.localeCompare(b.pitch.id))
}
export const pickPitch=(days:PitchDay[],jobs:Job[],now=new Date()):Scored|null=>scorePitches(days,jobs,now)[0]??null

/* ── the transitions ── */
const LOG_KEEP=120
const esc=(s:unknown)=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
function next(job:Job,now:Date,text:string,change:(a:Autopilot)=>void):Job{
 const j=structuredClone(job),at=now.toISOString()
 change(j.autopilot!)
 j.log=[...j.log,{at,text:`Autopilot: ${text}`.slice(0,400)}].slice(-LOG_KEEP);j.updatedAt=at
 return j
}
const note=(a:Autopilot,key:string,text:string,now:Date)=>{if(!a.notices.some(n=>n.key===key))a.notices=[...a.notices,{key,text:text.slice(0,3500),at:now.toISOString(),sentAt:null}].slice(-12)}
const head=(j:Job)=>`<b>${esc(filmTitle(j))}</b>\n${esc(j.brief.club_name)}`

/** A new film starts its ride (called once, when the job is created from the picked pitch). */
export function startAutopilot(job:Job,s:Scored,now=new Date()):Job{
 if(job.autopilot)return job
 const at=now.toISOString()
 const j=structuredClone(job)
 j.autopilot={state:'producing',pick:{pitchId:s.pitch.id,date:s.date,director:s.pitch.director,logline:s.pitch.logline,score:s.score,why:s.why,at},
  preview:{claim:null,attempts:0,sentAt:null,publishAt:null,deliveredAt:null,mode:null},cancel:null,publish:null,stop:null,notices:[]}
 j.log=[...j.log,{at,text:`Autopilot: picked "${s.pitch.title}" (score ${s.score}) — ${s.why.join('; ')}`.slice(0,400)}].slice(-LOG_KEEP)
 return j
}
function stop(job:Job,reason:string,now:Date,tell=true):Job{
 return next(job,now,`stopped — ${reason}. Nothing is published by itself`,a=>{
  a.state='stopped';a.stop={at:now.toISOString(),reason};a.preview.claim=null
  if(tell)note(a,'stopped',`⏹ <b>AUTOPILOT stopped</b>\n${head(job)}\n${esc(reason)}. Nothing is published by itself — the film is in the studio.`,now)
 })
}
const qaPassed=(j:Job)=>j.state==='ready'&&j.qa?.ok===true&&!!j.artefacts?.master

export type TickCtx={on:boolean;telegram:boolean;youtube:boolean;worker:string;now:Date;desk:string}
export type Effect=null|'preview'|'publish_youtube'
/**
 * One tick for one job: at most one transition, and what the runner must now do for it. Run twice with nothing changed
 * outside, the second run returns the same job and no effect.
 */
export function tickJob(job:Job,c:TickCtx):{job:Job;effect:Effect}{
 const a=job.autopilot,now=c.now,t=+now
 if(!a||!autopilotActive(job))return {job,effect:null}
 const same={job,effect:null as Effect}
 // what ends a ride whatever the switch says
 if(job.upload.state!=='none'&&a.state!=='publishing')return {job:stop(job,'the film was uploaded by hand',now,false),effect:null}
 if(['failed','cancelled','needs_review'].includes(job.state))return {job:stop(job,job.state==='failed'?`the production failed (${job.error?.code??'FAILED'})`:job.state==='cancelled'?'the production was cancelled':'the film waits for your review',now),effect:null}
 if(job.state==='ready'&&!qaPassed(job))return {job:stop(job,'the automatic checks did not pass',now),effect:null}
 // an upload whose runner never reported back: never tried again by itself — the owner looks at YouTube Studio first
 if(a.state==='publishing'){
  if(t-Date.parse(a.publish?.at??'')<PUBLISH_CLAIM_MS)return same
  return {job:next(job,now,'the upload did not report back — check YouTube Studio before uploading again',x=>{x.state='handoff';note(x,'handoff',`⚠️ <b>AUTOPILOT · your hand is needed</b>\n${head(job)}\nThe upload to YouTube did not report back. Check YouTube Studio before uploading again.\n<a href="${esc(c.desk)}">Open the studio</a>`,now)}),effect:null}
 }
 if(!c.on||job.state!=='ready')return same
 if(a.state==='producing'){
  const claim=a.preview.claim
  if(claim&&t-Date.parse(claim.at)<PREVIEW_CLAIM_MS)return same
  if(a.preview.attempts>=PREVIEW_ATTEMPTS)return {job:stop(job,'the preview could not be delivered on Telegram',now,false),effect:null}
  if(!c.telegram||!previewHour(now))return same
  return {job:next(job,now,`sending the preview to Telegram (attempt ${a.preview.attempts+1})`,x=>{x.preview={claim:{worker:c.worker,at:now.toISOString()},attempts:x.preview.attempts+1,sentAt:null,publishAt:null,deliveredAt:null,mode:c.youtube?'youtube':'handoff'}}),effect:'preview'}
 }
 if(a.state==='window'){
  // no preview = no publish: only a delivered message opens a window, and only its own end closes it
  if(!a.preview.deliveredAt||!a.preview.publishAt||a.cancel)return same
  const end=Date.parse(a.preview.publishAt)
  if(t<end)return same
  if(t>end+PUBLISH_LATE_MS)return {job:stop(job,'the publishing time passed while the autopilot was off or not listening',now),effect:null}
  if(c.youtube)return {job:next(job,now,'the two hours passed without a cancel — uploading to YouTube',x=>{x.state='publishing';x.publish={mode:'youtube',at:now.toISOString(),worker:c.worker}}),effect:'publish_youtube'}
  return {job:next(job,now,'the two hours passed without a cancel — the film is approved and waits for your upload in YouTube Studio',x=>{
   x.state='handoff';x.publish={mode:'handoff',at:now.toISOString(),worker:null}
   note(x,'handoff',`✅ <b>AUTOPILOT · approved, waiting for your upload</b>\n${head(job)}\nThe two hours passed and you did not cancel. YouTube keeps API uploads from this project private, so the last step is yours: open the studio, download the master and upload it in YouTube Studio, then record the video id.\n<a href="${esc(c.desk)}">Open the studio</a>`,now)
  }),effect:null}
 }
 return same
}

/** The runner's reports. Each is refused unless it comes from the runner holding the claim, and each is safe to repeat. */
export function previewSent(job:Job,worker:string,now=new Date()):Job{
 const p=job.autopilot?.preview
 if(!p||job.autopilot!.state!=='producing'||p.claim?.worker!==worker)throw new StoryError('CLAIM','This runner does not hold the preview.',409)
 if(p.sentAt)return job
 return next(job,now,`preview on its way — publishing planned for ${athens(publishTime(now)).hm} Athens`,a=>{a.preview.sentAt=now.toISOString();a.preview.publishAt=publishTime(now).toISOString()})
}
export function previewDelivered(job:Job,worker:string,now=new Date()):Job{
 const a=job.autopilot
 if(a?.state==='window'&&a.preview.deliveredAt)return job
 if(a?.state==='cancelled_by_owner')return job
 if(!a||a.state!=='producing'||a.preview.claim?.worker!==worker||!a.preview.sentAt||!a.preview.publishAt)throw new StoryError('CLAIM','This runner does not hold the preview.',409)
 return next(job,now,`preview delivered on Telegram — publishing at ${athens(new Date(a.preview.publishAt)).hm} Athens unless you cancel`,x=>{x.state='window';x.preview.deliveredAt=now.toISOString();x.preview.claim=null})
}
export function previewFailed(job:Job,worker:string,error:unknown,now=new Date()):Job{
 const a=job.autopilot
 if(!a||a.state!=='producing'||a.preview.claim?.worker!==worker)return job
 return next(job,now,`the preview was not delivered (${String(error||'unknown').replace(/\s+/g,' ').slice(0,160)}) — nothing is scheduled`,x=>{x.preview={...x.preview,claim:null,sentAt:null,publishAt:null,deliveredAt:null}})
}
/** The owner's one tap. Works until the film is published or handed over; a second tap changes nothing. */
export function cancelByOwner(job:Job,now=new Date()):Job{
 const a=job.autopilot
 if(!a)throw new StoryError('NOT_FOUND','This film is not on the autopilot.',404)
 if(a.state==='cancelled_by_owner')return job
 if(!autopilotActive(job))throw new StoryError('STATE',a.state==='published'?'This film is already published.':a.state==='handoff'?'The two hours have passed. Nothing is published by itself: the film waits for your own upload.':'The autopilot already stopped for this film.',409)
 return next(job,now,'publishing cancelled by the owner — the film stays in the studio, unpublished',x=>{
  x.state='cancelled_by_owner';x.cancel={at:now.toISOString()};x.preview.claim=null
  note(x,'cancelled',`🛑 <b>Publishing cancelled</b>\n${head(job)}\nNothing will be published. The film stays in the studio; you can still upload it yourself.`,now)
 })
}
/** The uploader reports: the film is on YouTube as private. `go` says whether it may now be made public. */
export function youtubeUploaded(job:Job,worker:string,videoId:string,now=new Date()):{job:Job;go:boolean}{
 const a=job.autopilot
 if(!a||a.publish?.mode!=='youtube'||a.publish.worker!==worker)throw new StoryError('CLAIM','This runner does not hold the upload.',409)
 const j=job.upload.videoId===videoId?job:ownerAct(job,{action:'upload_done',videoId,visibility:'private'},ACTOR,now)
 return {job:j,go:a.state==='publishing'&&!a.cancel}
}
/** …and what YouTube shows after the attempt to make it public (an unaudited API project is kept private). */
export function youtubeResult(job:Job,worker:string,r:{videoId?:unknown;privacy?:unknown;error?:unknown},c:{desk:string},now=new Date()):Job{
 const a=job.autopilot
 if(!a||a.publish?.mode!=='youtube'||a.publish.worker!==worker)throw new StoryError('CLAIM','This runner does not hold the upload.',409)
 if(a.state!=='publishing')return job
 const id=typeof r.videoId==='string'?r.videoId:job.upload.videoId
 if(id&&r.privacy==='public'){
  const up=ownerAct(job,{action:'upload_done',videoId:id,visibility:'public'},ACTOR,now)
  return next(up,now,`published on YouTube (${id})`,x=>{x.state='published';note(x,'published',`🚀 <b>AUTOPILOT · published</b>\n${head(job)}\nhttps://youtu.be/${esc(id)}`,now)})
 }
 const why=id?`YouTube has the film (${id}) but kept it private — set it to Public in YouTube Studio`:`the upload did not complete (${String(r.error||'unknown').replace(/\s+/g,' ').slice(0,160)}) — check YouTube Studio before uploading again`
 return next(job,now,why,x=>{x.state='handoff';note(x,'handoff',`⚠️ <b>AUTOPILOT · your hand is needed</b>\n${head(job)}\n${esc(why)}.\n<a href="${esc(c.desk)}">Open the studio</a>`,now)})
}
export function noticeSent(job:Job,key:unknown,now=new Date()):Job{
 const n=job.autopilot?.notices.find(x=>x.key===key)
 if(!n||n.sentAt)return job
 const j=structuredClone(job)
 j.autopilot!.notices=j.autopilot!.notices.map(x=>x.key===key?{...x,sentAt:now.toISOString()}:x)
 return j
}
export const pendingNotices=(jobs:Job[]):{id:string;key:string;text:string}[]=>jobs.flatMap(j=>(j.autopilot?.notices??[]).filter(n=>!n.sentAt).map(n=>({id:j.id,key:n.key,text:n.text})))

/* ── what the owner reads ── */
export function hookLine(job:Job):string{
 const o=job.options?.find(x=>x.n===job.brief.choice)??job.options?.[0]
 return (o?.hook||job.artefacts?.shorts?.[0]?.hook||job.autopilot?.pick.logline||'').replace(/\s+/g,' ').trim().slice(0,300)
}
/** The preview message (Telegram HTML): what it is, when it publishes — the real time — and the one link that stops it. */
export function previewText(job:Job,cancelUrl:string,watchUrl:string|null):string{
 const a=job.autopilot!,at=athens(new Date(a.preview.publishAt!)),hook=hookLine(job)
 const what=a.preview.mode==='youtube'?'it is uploaded to YouTube and made public':'it is approved and waits for your own upload in YouTube Studio (YouTube keeps API uploads from this project private, so that last step is yours)'
 return [`🎬 <b>AUTOPILOT · today's film</b>`,head(job),`About ${job.brief.duration<1?`${Math.round(job.brief.duration*60)} seconds`:`${job.brief.duration} minutes`}`,
  hook?`“${esc(hook)}”`:'',watchUrl?`<a href="${esc(watchUrl)}">Watch the preview</a> (the file is too large for Telegram)`:'','',
  `⏰ At <b>${at.hm}</b> Athens time (${at.date}), two hours from now, ${what}.`,`To stop it: <a href="${esc(cancelUrl)}">Cancel publishing</a>`,'',
  `Picked because: ${esc(a.pick.why.join('; '))}`].filter((x,i,all)=>x!==''||all[i-1]!=='').join('\n').slice(0,4000)
}
/** Is there anything for the autopilot's runner to do? (the peek asks; the jobs are the ones it already loaded) */
export function autopilotDue(jobs:Job[],on:boolean,now=new Date()):boolean{
 if(pendingNotices(jobs).length||jobs.some(autopilotActive))return true
 return on&&!pipelineBusy(jobs)&&!pickedOn(jobs,athens(now).date)
}
/** One line for the desk. */
export function autopilotLine(a:Autopilot):string{
 const hm=(s:string|null)=>s?athens(new Date(s)).hm:'—'
 return a.state==='producing'?(a.preview.claim?'Autopilot: sending the preview to your Telegram':`Autopilot: in production — the preview reaches your Telegram at ${PREVIEW_HOUR}:00 Athens`)
  :a.state==='window'?`Autopilot: preview delivered — publishing at ${hm(a.preview.publishAt)} Athens unless you cancel`
  :a.state==='publishing'?'Autopilot: uploading to YouTube'
  :a.state==='published'?'Autopilot: published'
  :a.state==='handoff'?'Autopilot: approved — waiting for your upload in YouTube Studio'
  :a.state==='cancelled_by_owner'?`Autopilot: you cancelled the publishing at ${hm(a.cancel?.at??null)} Athens`
  :`Autopilot: stopped — ${a.stop?.reason??'see the log'}`
}
