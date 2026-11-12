/**
 * The studio desk's information banners (owner, 4.11.2026: "an information banner on every tab — when it can be run
 * and when not"). Pure: every light is computed from what the studio really knows — the listener's heartbeat, the
 * writer-key check, the storage answer, the queue, the pitch desk, the social runner's lights, the episode files — and
 * a fact the studio could not read is "Not connected", never "no" and never zero (rule 128's honest states).
 */
import type {Health} from './health'
import {keysText} from './writerKeys'
import type {ClassifiedFile,Job} from './jobs'
import type {PitchDesk} from './pitches'
import type {SocialLights} from './social'
import type {PlanPost} from './marketing'

export const DESK_TABS=['ideas','docs','shorts','classified','vlog','marketing','directors','status'] as const
export type DeskTab=typeof DESK_TABS[number]
export const deskTab=(v:unknown):DeskTab=>(DESK_TABS as readonly string[]).includes(String(v))?v as DeskTab:'docs'

export type Light='yes'|'no'|'wait'|'unknown'
export type Need={label:string;light:Light;text:string}
export type Banner={tab:DeskTab;makes:string;needs:Need[];run:'yes'|'no'|'wait';headline:string;next:string}
export type Facts={now:number;health:Health|null;jobs:Job[]|null;classified?:ClassifiedFile[]|null;pitchDesk?:PitchDesk|null;lights?:SocialLights|null;plan?:PlanPost[]|null}

const ATHENS=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Athens',weekday:'short',hour:'2-digit',minute:'2-digit'})
export const athens=(t:string|number)=>`${ATHENS.format(new Date(t))} Athens`
const LIVE=['queued','running','paused','cancel_requested']

/* ── the shared lights ── */
export function workerNeed(h:Health|null):Need{
 if(!h)return {label:'Worker',light:'unknown',text:'Not connected — the studio could not read its status'}
 if(h.listener.ok)return {label:'Worker',light:'yes',text:'Listening — a job starts within about a minute'}
 return {label:'Worker',light:'no',text:h.listener.at?`Last seen ${athens(h.listener.at)}. It restarts by itself; GitHub → Actions → "Football Stories · listener" → Run workflow starts it now`:'Not started yet: GitHub → Actions → "Football Stories · listener" → Run workflow'}
}
export function storageNeed(h:Health|null):Need{
 if(!h)return {label:'Storage',light:'unknown',text:'Not connected'}
 return h.storage.ok?{label:'Storage',light:'yes',text:'Private film storage is ready'}:{label:'Storage',light:'no',text:h.storage.note||'Storage is not ready'}
}
/** When Google's free writer is spent or busy, the jobs waiting for it say until when — the truest clock there is. */
export function writerWaitUntil(jobs:Job[]|null,now:number):string|null{
 const t=(jobs??[]).filter(j=>j.state==='queued'&&j.notBefore&&Date.parse(j.notBefore)>now).map(j=>j.notBefore!).sort()
 return t[0]??null
}
export function writerNeed(h:Health|null,jobs:Job[]|null,now:number):Need{
 const w=h?.writer
 if(!h)return {label:'Writer (Gemini, free)',light:'unknown',text:'Not connected'}
 if(!w)return {label:'Writer (Gemini, free)',light:'unknown',text:'Not checked yet — the listener checks the key on its next round'}
 if(w.provider==='none')return {label:'Writer (Gemini, free)',light:'no',text:'No key: add GEMINI_API_KEY in GitHub → Settings → Secrets and variables → Actions'}
 const keys=keysText(w.keys)
 if(w.ok===false)return {label:'Writer (Gemini, free)',light:'no',text:keys?`No Gemini key can write — ${keys}. Fix one of them in GitHub → Settings → Secrets → Actions`:`Google refused the key${w.note?` (${w.note})`:''} — paste it again in GitHub → Settings → Secrets → Actions`}
 const until=writerWaitUntil(jobs,now)
 if(until)return {label:'Writer (Gemini, free)',light:'wait',text:`Google's free quota is busy or spent — back by ${athens(until)}. Waiting jobs start again by themselves`}
 return w.ok?{label:'Writer (Gemini, free)',light:'yes',text:keys?`${keys}${w.model?` · ${w.model}`:''}`:`Key works${w.model?` · ${w.model}`:''}`}:{label:'Writer (Gemini, free)',light:'unknown',text:w.note||'The key check could not run'}
}
export function queueText(jobs:Job[]|null):string{
 if(!jobs)return 'The queue could not be read.'
 const running=jobs.filter(j=>j.state==='running').length,queued=jobs.filter(j=>j.state==='queued').length
 if(!running&&!queued)return 'The queue is empty.'
 return `${running?`${running} in production`:''}${running&&queued?', ':''}${queued?`${queued} waiting`:''} — one job at a time.`
}
/** The worst light decides: any "no" stops it, any "wait" or "not connected" makes it wait, else it runs. */
function verdict(needs:Need[]):'yes'|'no'|'wait'{
 if(needs.some(n=>n.light==='no'))return 'no'
 if(needs.some(n=>n.light==='wait'||n.light==='unknown'))return 'wait'
 return 'yes'
}
const firstBad=(needs:Need[])=>needs.find(n=>n.light==='no')??needs.find(n=>n.light==='wait'||n.light==='unknown')

/* ── one banner per tab ── */
export function docsBanner(f:Facts):Banner{
 const needs=[workerNeed(f.health),writerNeed(f.health,f.jobs,f.now),storageNeed(f.health)]
 const run=verdict(needs),bad=firstBad(needs)
 return {tab:'docs',makes:'A documentary from the club’s archive — one match, a tie, a season or a rivalry — voiced, cut and checked, with Shorts and a YouTube package.',
  needs,run,headline:run==='yes'?`Ready. ${queueText(f.jobs)}`:`${run==='no'?'Cannot start now':'Will wait'}: ${bad!.label} — ${bad!.text}`,
  next:'Choose the club and the story. With three scripts the job stops after the writer: one script per director; pick one and the film makes itself.'}
}

export function classifiedBanner(f:Facts,pick:{file:string|null;approved:boolean}):Banner{
 const file=pick.file?f.classified?.find(x=>x.file===pick.file)??null:null
 const needs:Need[]=[workerNeed(f.health),storageNeed(f.health)]
 if(f.classified===null||f.classified===undefined)needs.push({label:'Episodes',light:'unknown',text:'Not connected — the episode files could not be read on this server'})
 else if(!file)needs.push({label:'Episode',light:'wait',text:'Choose a FILE below'})
 else{
  needs.push(file.episode?{label:'Script',light:'yes',text:`${file.script_version} · ${file.beats} beats · about ${file.minutes??'?'} min`}:{label:'Script',light:'no',text:`FILE ${file.number} has no episode script yet`})
  needs.push(file.panels.missing.length?{label:'Panels',light:file.panels.have?'wait':'no',text:`${file.panels.have} of ${file.panels.roles} roles have a panel in your Drive; missing: ${file.panels.missing.join(', ')} (held or stood in for)`}:{label:'Panels',light:'yes',text:`All ${file.panels.roles} roles have a panel in your Drive`})
  const busy=(f.jobs??[]).some(j=>j.kind==='classified'&&(j.spec as {file?:string}|null)?.file===file.file&&LIVE.includes(j.state))
  if(busy)needs.push({label:'Queue',light:'no',text:`FILE ${file.number} is already in production`})
  if(file.episode)needs.push(pick.approved?{label:'Your approval',light:'yes',text:`You approve ${file.script_version} — it is recorded on the job`}:{label:'Your approval',light:'no',text:'Read the script and tick “I have read and approve”: the narrator speaks only an approved script'})
 }
 // a panel gap is a warning, not a stop: produce.py holds or stands in for a missing panel and the report says so
 const hard=needs.filter(n=>!(n.label==='Panels'&&n.light==='wait'))
 const run=verdict(hard),bad=firstBad(hard)
 return {tab:'classified',makes:'A whole CLASSIFIED FILE from your panels and the approved script: narration, picture, mix, captions, QA, three Shorts, thumbnails and the YouTube package.',
  needs,run,headline:run==='yes'?`Ready to produce FILE ${file!.number}. ${queueText(f.jobs)}`:`${run==='no'?'Cannot produce now':'Not yet'}: ${bad!.label} — ${bad!.text}`,
  next:'It renders on GitHub (up to about 2½ hours). The DRAFT arrives on your Telegram and the episode in the job card. Nothing is uploaded to YouTube and nothing is published.'}
}

export function vlogBanner(f:Facts,form:{match:boolean;drive:boolean}):Banner{
 const needs=[workerNeed(f.health),writerNeed(f.health,f.jobs,f.now),storageNeed(f.health),
  form.match?{label:'Match',light:'yes' as Light,text:'Chosen from the archive'}:{label:'Match',light:'wait' as Light,text:'Choose the match below'},
  form.drive?{label:'Footage',light:'yes' as Light,text:'Drive link given (shared “anyone with the link”)'}:{label:'Footage',light:'wait' as Light,text:'Paste the Drive folder with your clips and photos'}]
 const run=verdict(needs),bad=firstBad(needs)
 return {tab:'vlog',makes:'I WAS THERE — your own footage of a night, watched and written by the free writer, cut as a film and a Reel in the series’ design.',
  needs,run,headline:run==='yes'?`Ready. ${queueText(f.jobs)}`:`${run==='no'?'Cannot start now':'Not yet'}: ${bad!.label} — ${bad!.text}`,
  next:'About an hour on GitHub (footage survey, the writer, the film and the reel). The reel and a Telegram-size film go to your chat; the full file is in the job card.'}
}

export const finished=(jobs:Job[]|null)=>(jobs??[]).filter(j=>!!j.artefacts?.master&&(j.state==='ready'||j.state==='needs_review'))
export function marketingBanner(f:Facts):Banner{
 const films=finished(f.jobs),l=f.lights
 const stale=l?f.now-Date.parse(l.at)>45*60_000:false
 const needs:Need[]=[
  films.length?{label:'Finished films',light:'yes',text:`${films.length} ready to post · ${films.reduce((n,j)=>n+(j.artefacts?.shorts?.length??0),0)} Shorts`}:{label:'Finished films',light:'no',text:'No finished film yet — make one in Documentary, CLASSIFIED or VLOG'},
  !l?{label:'Social runner',light:'unknown',text:'Not connected — it has not reported yet (GitHub → Actions → “Football Stories · social”)'}:stale?{label:'Social runner',light:'wait',text:`Last seen ${athens(l.at)} — it looks every 10 minutes`}:{label:'Social runner',light:'yes',text:`Looked ${athens(l.at)}`},
  !l?{label:'Automatic publishing',light:'unknown',text:'Not connected'}:l.autopublish?{label:'Automatic publishing',light:'yes',text:'On — connected platforms publish by themselves'}:{label:'Automatic publishing',light:'wait',text:'Off — every post arrives on your Telegram as a ready pack (variable STORIES_SOCIAL_AUTOPUBLISH = 1 turns it on)'},
  !l?{label:'Telegram packs',light:'unknown',text:'Not connected'}:l.telegram?{label:'Telegram packs',light:'yes',text:'Ready packs reach your chat'}:{label:'Telegram packs',light:'no',text:'TELEGRAM_BOT_TOKEN is missing in GitHub secrets'},
  f.plan===null||f.plan===undefined?{label:'Social plan',light:'unknown',text:'Not connected — the plan’s database could not be asked'}:{label:'Social plan',light:'yes',text:`${f.plan.length} FAN LIFE post(s) sent today`},
 ]
 const hard=needs.filter(n=>n.label==='Finished films'||n.label==='Telegram packs')
 const run=verdict(hard),bad=firstBad(hard)
 return {tab:'marketing',makes:'Posts of finished films on Facebook, Instagram, X and TikTok (caption, first comment, tags), the Telegram copy-paste packs, and the Shorts of every film.',
  needs,run,headline:run==='yes'?`${films.length} film(s) ready to post.`:`${run==='no'?'Nothing to post now':'Not yet'}: ${bad!.label} — ${bad!.text}`,
  next:'Open a film below: schedule it on the four platforms or send its pack to Telegram. Platforms without their keys always fall back to the Telegram pack.'}
}

export function directorsBanner(f:Facts):Banner{
 const d=f.pitchDesk,needs:Need[]=[writerNeed(f.health,f.jobs,f.now),workerNeed(f.health)]
 if(d===null||d===undefined)needs.push({label:'Pitch desk',light:'unknown',text:'Not connected — the pitch store could not be read'})
 else if(d.last?.state==='waiting'&&d.last.retryAt&&Date.parse(d.last.retryAt)>f.now)needs.push({label:'Pitch desk',light:'wait',text:`The directors wait for Google’s free writer until ${athens(d.last.retryAt)}; they pitch again by themselves`})
 else if(d.request)needs.push({label:'Pitch desk',light:'wait',text:d.request.dispatchedAt?`Asked ${athens(d.request.at)} — the round is being written (a few minutes)`:`Asked ${athens(d.request.at)} — the listener starts the round within about a minute`})
 else if(d.last?.state==='failed')needs.push({label:'Pitch desk',light:'no',text:`The last round failed${d.last.note?`: ${d.last.note}`:''}`})
 else needs.push({label:'Pitch desk',light:'yes',text:d.last?`Last round ${athens(d.last.at)} · ${d.last.saved} pitch(es)`:'No round yet'})
 // the listener only starts an ASKED round; the daily round runs on its own schedule
 const hard=needs.filter(n=>n.label!=='Worker'||!!d?.request)
 const run=verdict(hard),bad=firstBad(hard)
 return {tab:'directors',makes:'Every day each director pitches the next film he wants to make — another club and another event each time — with its cold open and three acts.',
  needs,run,headline:run==='yes'?'Ready. Ask for a new round any time; a round also comes by itself every morning (about 06:30 Athens).':`${run==='no'?'Cannot pitch now':'Waiting'}: ${bad!.label} — ${bad!.text}`,
  next:'“Make this film” queues a documentary with three scripts — the pitching director’s first. “Pass” sets it aside; that club and event are not pitched again for two weeks.'}
}

export function ideasBanner(f:Facts,ideas:{evidence:{level:string}}[]|null):Banner{
 const needs=[workerNeed(f.health),writerNeed(f.health,f.jobs,f.now),
  ideas===null?{label:'Ideas',light:'wait' as Light,text:'Reading what the studio holds'}:ideas.length?{label:'Ideas',light:'yes' as Light,text:`${ideas.length} nights with the most material · ${ideas.filter(i=>i.evidence.level==='rich').length} rich`}:{label:'Ideas',light:'no' as Light,text:'No recommendation file on this server (it is written with the catalog)'}]
 const run=verdict(needs),bad=firstBad(needs)
 return {tab:'ideas',makes:'The nights the studio can tell best: scored by what it holds — sources, scorers with minutes, the line-up, a goal described move by move, press, research dossiers, your Drive packs, the season’s kits — a big night breaking ties.',
  needs,run,headline:run==='yes'?'Pick a night. Documentary = three scripts to choose from; Animated Short = the script and its Google Flow pack.':`${run==='no'?'Cannot start now':'Not yet'}: ${bad!.label} — ${bad!.text}`,
  next:'A night already made says so on its card. The list is regenerated with the catalog whenever the archive grows.'}
}

export function shortsBanner(f:Facts):Banner{
 const needs=[workerNeed(f.health),writerNeed(f.health,f.jobs,f.now),storageNeed(f.health),
  {label:'Google Flow',light:'yes' as Light,text:'Made automatically by Claude on your computer (your AI Pro plan, about 900 credits a month · a 6-clip Short ≈ 108 credits)'}]
 const run=verdict(needs),bad=firstBad(needs)
 return {tab:'shorts',makes:'An animated Short (20–30 s, 9:16) of one real night: the story’s real players drawn in their real kits, acting it out — written from the record, made in Google Flow, voiced, captioned and mixed here.',
  needs,run,headline:run==='yes'?`Ready. ${queueText(f.jobs)}`:`${run==='no'?'Cannot start now':'Will wait'}: ${bad!.label} — ${bad!.text}`,
  next:'Fully automatic: the studio writes the Short; Claude makes it in Google Flow on your computer (about once an hour while the Claude app is open), uploads it and starts the edit; it arrives on your Telegram.'}
}

export function statusBanner(f:Facts):Banner{
 const needs=[workerNeed(f.health),writerNeed(f.health,f.jobs,f.now),storageNeed(f.health)]
 const run=verdict(needs),bad=firstBad(needs)
 return {tab:'status',makes:'The studio’s engine room: the worker, the free writer, storage, the queue and what went wrong lately.',
  needs,run,headline:run==='yes'?`All lights green. ${queueText(f.jobs)}`:`${bad!.label}: ${bad!.text}`,next:'A failed job says what happened in plain words below; “Retry” resumes from its last checkpoint.'}
}

/** A job's error code in plain words, for the Status tab. Unknown codes keep their own message. */
const PLAIN:Record<string,string>={
 REQUIRED_MEDIA:'A picture you selected could not be read or included. The film will not silently omit it. Check the file or Drive sharing, then Retry.',
 WRITER_QUOTA_DAY:'Google’s free writer used up today’s quota. The job waits and starts again by itself after midnight Pacific time.',
 WRITER_BUSY:'Google’s free writer was too busy. The job waits about 20 minutes and tries again by itself.',
 WRITER_KEY:'Google refused the writer key. Make a new free key in Google AI Studio and paste it as GEMINI_API_KEY in GitHub secrets.',
 WRITER_NO_CREDIT:'The Gemini key’s Google project has billing switched on and no credit left, so Google refuses every request. Make a new key in Google AI Studio in a project without billing (the free tier) and paste it as GEMINI_API_KEY in GitHub secrets, or top up the project. Then Retry.',
 WRITER_NOT_CONFIGURED:'No writer key. Add GEMINI_API_KEY in GitHub → Settings → Secrets and variables → Actions.',
 SCRIPT_INVALID:'The scripts did not pass the fact and length checks. Retry; a second pass usually passes.',
 SCRIPT_CHANGED:'The CLASSIFIED script changed after you approved it. Read the new draft and produce it again.',
 NOT_APPROVED:'The CLASSIFIED script was not approved in the studio.',
 PANELS:'Your CLASSIFIED panels could not be downloaded from Drive. Check the folder is shared “anyone with the link”, then Retry.',
 FOOTAGE:'The vlog footage could not be downloaded from Drive. Check the link is shared “anyone with the link”, then Retry.',
 NO_FOOTAGE:'The Drive folder holds no clip or photo the studio can read.',
 EPISODE_INVALID:'The writer could not write an episode that passes every check in four rounds. Add a few notes about the night and Retry.',
 RENDER_FAILED:'The render stopped. Retry resumes; if it fails again the log says where.',
 MEDIA_UPLOAD:'Storing the film failed half-way (network). Retry.',
 STUDIO_UNREACHABLE:'The worker could not reach the studio. Retry.',
 KIND:'The worker on GitHub is older than the studio. Wait for the next deploy, then Retry.',
 INTERNAL:'An unexpected fault. Retry; if it repeats, the log shows the cause.',
}
export const plainError=(code:string,message:string)=>PLAIN[code]??message
