/**
 * FanLife: Football Stories — the production job contract (owner-only studio ⇄ GitHub Actions worker).
 *
 * A job is one film. The studio creates it (`queued`), the worker leases it (`running`), reports every stage, and finishes
 * it as `ready` (every automatic check passed), `needs_review` (something a person must look at) or `failed` (with a stable
 * error code and whether a retry is safe). Uploading to YouTube is a separate, explicit step with its own state, and a
 * video id is recorded only when YouTube itself has shown it.
 * Pure functions only: no I/O here, so every transition is tested on its own.
 */
export const STAGES=['research','script','voice','graphics','edit','mix','master','package','qa','done'] as const
export type Stage=typeof STAGES[number]
export type JobState='queued'|'running'|'paused'|'cancel_requested'|'cancelled'|'failed'|'needs_review'|'ready'
export type UploadState='none'|'in_progress'|'uncertain'|'done'
export type Privacy='private'|'unlisted'|'public'|'scheduled'
export const DURATIONS=[0.5,1,2,3,5,...Array.from({length:19},(_,i)=>i+7)] as const
export type ArtFile={name:string;illustrated:boolean}
/** Studio v3 (owner, 4.11.2026: "less freedom, more choices; a film about one match; three scripts to choose from"). */
export const KINDS=['season','match','tie','rivalry'] as const
export type Kind=typeof KINDS[number]
export const TONES=['auto','triumph','heartbreak','underdog','rivalry','nostalgia','drama'] as const
export type Tone=typeof TONES[number]
export const STYLES=['collage','papercut','archive','night'] as const
export type Style=typeof STYLES[number]
export type ScriptOption={n:number;angle:string;title:string;hook:string;chapters:string[];words:number;opening:string}
export type Brief={
 club_id:string;club_name:string;season:string;topic:string;duration:number
 visual_style:Style|'mixed';voice:'auto'|'elevenlabs'|'kokoro';review:'auto'|'script'
 /** what the film is about: a season (default), one match, a tie or run of matches, or every meeting with one opponent */
 kind?:Kind;match_ids?:string[];opponent?:string|null;tone?:Tone
 /** three scripts to choose from (default) or one; the owner's pick once they are written */
 scripts?:1|3;choice?:number|null
 /** pictures from the owner's Google Drive library for this club, and the Reel sent to the owner's Telegram */
 drive?:boolean;reel_to_telegram?:boolean
 /** a Drive folder the owner pasted for THIS film (its id), and the words a pack about it would be named with */
 drive_folder?:string|null;story_words?:string;sides?:string[]
 privacy:Privacy;publish_at:string|null
 /** Crowd reactions at the goals: soft (default) or none (owner, 3.11.2026). */
 crowd?:'soft'|'off'
 /** Optional: tell one tie or one run of matches instead of the whole season (dates inclusive, YYYY-MM-DD). */
 focus_from?:string|null;focus_to?:string|null
 /** Optional: quotes and press headlines the owner found, one per line with its https source — they become sourced claims. */
 notes?:string
 /** Optional: the owner's own pictures for this film (uploaded to the job's private folder before it starts). */
 art?:ArtFile[];hold?:boolean
}
export const ART_NAME=/^[a-z0-9][a-z0-9._-]{0,60}\.(png|jpe?g|webp)$/
const DAY=/^\d{4}-\d{2}-\d{2}$/
/** One line of owner notes: `quote | speaker | role | the exact words | https://…` or `press | outlet | YYYY-MM-DD | headline | https://…`. */
export function noteLine(line:string):{kind:'quote'|'press';parts:string[];url:string}|null{
 const parts=line.split('|').map(x=>x.trim())
 const kind=parts[0]?.toLowerCase()
 const url=parts[parts.length-1]||''
 if((kind!=='quote'&&kind!=='press')||parts.length!==5||!/^https:\/\/\S+$/.test(url)||parts.slice(1,4).some(x=>!x))return null
 if(kind==='press'&&parts[2]!=='-'&&!DAY.test(parts[2]??''))return null
 return {kind,parts:parts.slice(1,4),url}
}
export type Palette={club_id:string;club_name:string;primary:string;on_primary:string;bans:string[]}
export type Artefact={path:string;bytes:number;sha256?:string}
export type ShortArtefact=Artefact&{hook:string;seconds:number;title?:string}
export type Job={
 version:1;id:string;createdAt:string;updatedAt:string;createdBy:string;idempotencyKey:string
 brief:Brief;palette:Palette;state:JobState;stage:Stage|null;progress:number;message:string
 attempts:number;lease:{worker:string;until:string}|null
 log:{at:string;text:string}[];error:{code:string;message:string;retryable:boolean}|null
 artefacts:{master?:{chunks:Artefact[];bytes:number;sha256:string};preview?:Artefact;thumbnails?:Artefact[];captions?:{srt:Artefact;vtt:Artefact};contact?:Artefact;package?:Artefact;shorts?:ShortArtefact[]}|null
 youtube:Record<string,unknown>|null;qa:{ok:boolean;checks:{name:string;ok:boolean;detail:string}[];cannot_prove?:string[];rights?:string[]}|null
 upload:{state:UploadState;videoId:string|null;visibility:Privacy|null;publishAt:string|null;at:string|null;by:string|null;note:string|null}
 cost:{writer?:string;voice?:string;renderMinutes?:number}
 /** the scripts written for the owner to choose from (studio v3) */
 options?:ScriptOption[]|null
}
export const SEASON=/^\d{4}\/\d{2}$/
export const SPAN=/^\d{4}–\d{4}$/
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/
export class StoryError extends Error{constructor(public code:string,message:string,public status=400){super(message)}}

/** A Drive folder link or id → its id, or null; anything else is refused (studio/drive_scan.py lists it from the runner). */
export function driveFolder(v:unknown):string|null{
 if(v===undefined||v===null||v==='')return null
 if(typeof v!=='string')throw new StoryError('BRIEF','Invalid Drive folder.')
 const m=v.match(/folders\/([\w-]{10,})/)||v.match(/[?&]id=([\w-]{10,})/)||v.trim().match(/^([\w-]{10,})$/)
 if(!m)throw new StoryError('BRIEF','Paste the Drive folder link (drive.google.com/drive/folders/…).')
 return m[1]!
}
export function validateBrief(v:unknown,clubs:Map<string,string>):Brief{
 if(!v||typeof v!=='object'||Array.isArray(v))throw new StoryError('BRIEF','A production brief is required.')
 const b=v as Record<string,unknown>
 const str=(k:string,max:number,req=false)=>{const x=b[k];if(x===undefined||x===null){if(req)throw new StoryError('BRIEF',`Invalid ${k}.`);return ''};if(typeof x!=='string'||x.trim().length>max||(req&&!x.trim()))throw new StoryError('BRIEF',`Invalid ${k}.`);return x.trim()}
 const club_id=str('club_id',60,true);const club_name=clubs.get(club_id);if(!club_name)throw new StoryError('BRIEF','Unknown club.')
 const pick0=<T extends string>(k:string,opts:readonly T[],d:T):T=>{const x=b[k]===undefined||b[k]===null?d:b[k];if(!opts.includes(x as T))throw new StoryError('BRIEF',`Invalid ${k}.`);return x as T}
 const kind=pick0('kind',KINDS,'season')
 const season=str('season',9,true)
 if(kind==='rivalry'){if(!SPAN.test(season))throw new StoryError('BRIEF','A rivalry film spans years, like 1971–2026.')}
 else{if(!SEASON.test(season))throw new StoryError('BRIEF','Season must look like 1999/00.')
  if((+season.slice(0,4)+1)%100!==+season.slice(5))throw new StoryError('BRIEF','Season must be two consecutive years, like 1999/00.')}
 const ids=Array.isArray(b.match_ids)?b.match_ids:[]
 if(ids.some(x=>typeof x!=='string'||!/^[A-Za-z0-9:._-]{3,120}$/.test(x)))throw new StoryError('BRIEF','Invalid match.')
 if(kind==='match'&&ids.length!==1)throw new StoryError('BRIEF','Choose one match.')
 if(kind==='tie'&&(ids.length<2||ids.length>8))throw new StoryError('BRIEF','Choose two to eight matches.')
 const opponent=kind==='rivalry'?str('opponent',80,true):null
 const duration=Number(b.duration);if(!(DURATIONS as readonly number[]).includes(duration))throw new StoryError('BRIEF','Duration must be 30 seconds, 1, 2, 3, 5 or 7–25 minutes.')
 const pick=<T extends string>(k:string,opts:readonly T[],d:T):T=>{const x=b[k]===undefined?d:b[k];if(!opts.includes(x as T))throw new StoryError('BRIEF',`Invalid ${k}.`);return x as T}
 const privacy=pick('privacy',['private','unlisted','public','scheduled'] as const,'private')
 const publish_at=privacy==='scheduled'?str('publish_at',40,true):null
 if(publish_at!==null){if(!ISO.test(publish_at)||!Number.isFinite(Date.parse(publish_at)))throw new StoryError('BRIEF','Publish time must be a full date and time with its time zone.');if(Date.parse(publish_at)<Date.now()+3600_000)throw new StoryError('BRIEF','Schedule at least an hour ahead.')}
 const focus_from=str('focus_from',10)||null,focus_to=str('focus_to',10)||null
 for(const d of [focus_from,focus_to])if(d&&(!DAY.test(d)||!Number.isFinite(Date.parse(d))))throw new StoryError('BRIEF','Focus dates look like 2024-03-07.')
 if(focus_from&&focus_to&&focus_from>focus_to)throw new StoryError('BRIEF','The focus must start before it ends.')
 const notes=str('notes',6000)
 const lines=notes.split('\n').map(x=>x.trim()).filter(Boolean)
 if(lines.length>40)throw new StoryError('BRIEF','At most 40 quotes and headlines.')
 const bad=lines.findIndex(l=>!noteLine(l))
 if(bad>=0)throw new StoryError('BRIEF',`Quotes and headlines, line ${bad+1}: use "quote | speaker | role | exact words | https://source" or "press | outlet | YYYY-MM-DD | headline | https://source".`)
 const hold=b.hold===true
 const scripts=b.scripts===1?1:3
 return {club_id,club_name,season,topic:str('topic',240),duration,visual_style:pick('visual_style',[...STYLES,'mixed'] as const,'collage'),
  kind,match_ids:kind==='match'||kind==='tie'?ids as string[]:[],opponent,drive_folder:driveFolder(b.drive_folder),story_words:str('story_words',300),sides:Array.isArray(b.sides)?b.sides.filter((x:unknown):x is string=>typeof x==='string').slice(0,8).map(x=>x.slice(0,60)):[],tone:pick('tone',TONES,'auto'),scripts,choice:null,drive:b.drive!==false,reel_to_telegram:b.reel_to_telegram===true,voice:pick('voice',['auto','elevenlabs','kokoro'] as const,'auto'),review:pick('review',['auto','script'] as const,'auto'),privacy,publish_at,crowd:pick('crowd',['soft','off'] as const,'soft'),
  focus_from,focus_to,notes:lines.join('\n'),art:[],hold}
}

export function newJob(id:string,brief:Brief,palette:Palette,actor:string,idempotencyKey:string,now=new Date()):Job{
 const at=now.toISOString()
 const held=brief.hold===true
 return {version:1,id,createdAt:at,updatedAt:at,createdBy:actor,idempotencyKey,brief,palette,state:held?'paused':'queued',stage:null,progress:0,message:held?'Waiting for your pictures — add them, then press Resume':'Waiting for the production worker',attempts:0,lease:null,log:[{at,text:held?'Created, held for the owner\'s pictures':'Queued'}],error:null,artefacts:null,youtube:null,qa:null,upload:{state:'none',videoId:null,visibility:null,publishAt:null,at:null,by:null,note:null},cost:{}}
}

const LOG_KEEP=120
const pushLog=(j:Job,text:string,at:string)=>{j.log=[...j.log,{at,text:text.slice(0,400)}].slice(-LOG_KEEP)}

export type OwnerAction={action:'pause'|'resume'|'cancel'|'retry'|'approve_script'}|{action:'choose_script';option:number}|{action:'upload_started'}|{action:'upload_done';videoId:string;visibility:Privacy;publishAt?:string|null}|{action:'upload_uncertain';note:string}|{action:'upload_reset'}|{action:'art_added';files:ArtFile[]}
export const VIDEO_ID=/^[A-Za-z0-9_-]{11}$/

/** An owner's action → the next job, or a StoryError saying why it is not allowed now. */
export function ownerAct(job:Job,a:OwnerAction,actor:string,now=new Date()):Job{
 const j:Job=structuredClone(job),at=now.toISOString()
 const no=(m:string)=>{throw new StoryError('STATE',m,409)}
 switch(a.action){
  case 'pause':if(!['queued','running'].includes(j.state))no('Only a queued or running job can be paused.');j.state='paused';pushLog(j,`Paused by ${actor}`,at);break
  case 'resume':if(j.state!=='paused')no('This job is not paused.');j.state='queued';j.lease=null;pushLog(j,`Resumed by ${actor} — continues from its last checkpoint`,at);break
  case 'cancel':if(j.state==='cancelled'||j.state==='cancel_requested')no('This job is already cancelled.');if(j.upload.state==='in_progress')no('An upload is in progress — record its result first.');j.state=j.state==='running'?'cancel_requested':'cancelled';j.lease=j.state==='cancelled'?null:j.lease;pushLog(j,`Cancelled by ${actor}`,at);break
  case 'retry':if(j.state!=='failed'&&j.state!=='cancelled')no('Only a failed or cancelled job can be retried.');j.state='queued';j.error=null;j.lease=null;pushLog(j,`Retry requested by ${actor} — resumes from its last checkpoint; paid steps already done are not repeated`,at);break
  case 'approve_script':if(j.state!=='needs_review'||j.stage!=='script')no('There is no script waiting for approval.');if(j.options?.length)no('Choose one of the scripts.');j.state='queued';j.brief={...j.brief,review:'auto'};pushLog(j,`Script approved by ${actor}`,at);break
  case 'choose_script':{if(j.state!=='needs_review'||j.stage!=='script'||!j.options?.length)no('There are no scripts waiting for your choice.');const o=j.options!.find(x=>x.n===a.option);if(!o)throw new StoryError('CHOICE','Unknown script.');j.state='queued';j.brief={...j.brief,review:'auto',choice:o.n};pushLog(j,`Script ${o.n} chosen by ${actor}: "${o.title}"`,at);break}
  case 'upload_started':if(j.state!=='ready'&&j.state!=='needs_review')no('Only a finished film can be uploaded.');if(j.upload.state==='done')no('This film is already uploaded.');if(j.upload.state==='in_progress'||j.upload.state==='uncertain')no('An upload was started already — check YouTube Studio, then record the result or reset.');j.upload={...j.upload,state:'in_progress',at,by:actor};pushLog(j,`Upload started by ${actor}`,at);break
  case 'upload_done':if(!VIDEO_ID.test(a.videoId))throw new StoryError('UPLOAD','A YouTube video id has 11 characters.');if(!['private','unlisted','public','scheduled'].includes(a.visibility))throw new StoryError('UPLOAD','Unknown visibility.');if(j.upload.state==='done'&&j.upload.videoId!==a.videoId)no('A different video id is already recorded.');j.upload={state:'done',videoId:a.videoId,visibility:a.visibility,publishAt:a.publishAt??null,at,by:actor,note:null};pushLog(j,`YouTube shows video ${a.videoId} (${a.visibility})`,at);break
  case 'upload_uncertain':j.upload={...j.upload,state:'uncertain',note:a.note.slice(0,300),at};pushLog(j,`Upload result uncertain: ${a.note.slice(0,200)}`,at);break
  case 'art_added':{
   if(!['queued','paused'].includes(j.state))no('Pictures can be added before the film starts (pause it first).')
   const files=Array.isArray(a.files)?a.files:[]
   if(!files.length||files.some(f=>!f||typeof f.name!=='string'||!ART_NAME.test(f.name)))throw new StoryError('ART','Picture names: lower-case letters, digits, dots and dashes, ending .png, .jpg or .webp.')
   const keep=new Map((j.brief.art??[]).map(f=>[f.name,f]))
   for(const f of files)keep.set(f.name,{name:f.name,illustrated:f.illustrated===true})
   if(keep.size>30)throw new StoryError('ART','At most 30 pictures for one film.')
   j.brief={...j.brief,art:[...keep.values()]};pushLog(j,`${files.length} picture(s) added by ${actor}`,at);break}
  case 'upload_reset':if(j.upload.state==='done')no('A confirmed upload cannot be reset.');j.upload={state:'none',videoId:null,visibility:null,publishAt:null,at,by:actor,note:'Reset after checking YouTube Studio'};pushLog(j,`Upload state reset by ${actor} after checking YouTube Studio`,at);break
 }
 j.updatedAt=at;return j
}

export const LEASE_MS=6.5*3600_000
/** The job the worker should take next: the oldest queued one, or a running one whose lease ran out (the worker died). */
export function nextForWorker(jobs:Job[],now=new Date()):Job|null{
 const t=now.getTime()
 return jobs.filter(j=>j.state==='queued'||(j.state==='running'&&j.lease!==null&&Date.parse(j.lease.until)<t)).sort((a,b)=>a.createdAt.localeCompare(b.createdAt))[0]??null
}
export function claim(job:Job,worker:string,now=new Date()):Job{
 const j=structuredClone(job),at=now.toISOString()
 j.state='running';j.attempts+=1;j.lease={worker,until:new Date(now.getTime()+LEASE_MS).toISOString()};j.error=null
 pushLog(j,`Worker ${worker} took the job (attempt ${j.attempts})`,at);j.updatedAt=at;return j
}
export type Progress={stage:Stage;progress:number;message:string;log?:string[]}
/** A progress report from the worker → the job, and what the worker must do next. A stale lease is refused. */
export function report(job:Job,worker:string,p:Progress,now=new Date()):{job:Job;control:'continue'|'pause'|'cancel'}{
 if(!job.lease||job.lease.worker!==worker)throw new StoryError('LEASE','This worker does not hold the job.',409)
 if(!(STAGES as readonly string[]).includes(p.stage)||!(p.progress>=0&&p.progress<=1))throw new StoryError('PROGRESS','Invalid progress.')
 const j=structuredClone(job),at=now.toISOString()
 j.stage=p.stage;j.progress=Math.max(j.progress,p.progress);j.message=String(p.message||'').slice(0,240)
 for(const l of (p.log??[]).slice(-20))pushLog(j,String(l),at)
 j.lease={worker,until:new Date(now.getTime()+LEASE_MS).toISOString()};j.updatedAt=at
 const control=j.state==='cancel_requested'?'cancel':j.state==='paused'?'pause':'continue'
 if(control==='cancel'){j.state='cancelled';j.lease=null}
 if(control==='pause')j.lease=null
 return {job:j,control}
}
export type Finish={options?:ScriptOption[];state:'ready'|'needs_review'|'failed';error?:{code:string;message:string;retryable:boolean};artefacts?:Job['artefacts'];youtube?:Record<string,unknown>;qa?:Job['qa'];cost?:Job['cost'];stage?:Stage}
export function finish(job:Job,worker:string,f:Finish,now=new Date()):Job{
 if(!job.lease||job.lease.worker!==worker)throw new StoryError('LEASE','This worker does not hold the job.',409)
 const j=structuredClone(job),at=now.toISOString()
 j.state=f.state;j.lease=null;j.updatedAt=at
 if(f.stage)j.stage=f.stage
 if(f.state==='failed'){j.error={code:String(f.error?.code||'FAILED').slice(0,60),message:String(f.error?.message||'').slice(0,600),retryable:!!f.error?.retryable};pushLog(j,`Failed: [${j.error.code}] ${j.error.message}`,at)}
 else{if(f.state==='needs_review'&&f.stage==='script'&&Array.isArray(f.options))j.options=f.options.slice(0,3).map(cleanOption);j.progress=f.stage==='script'?j.progress:1;j.artefacts=f.artefacts??j.artefacts;j.youtube=f.youtube??j.youtube;j.qa=f.qa??j.qa;j.cost={...j.cost,...(f.cost??{})};pushLog(j,f.state==='ready'?'Finished: every automatic check passed':'Finished: waiting for your review',at)}
 return j
}
const cut=(x:unknown,n:number)=>String(x??'').slice(0,n)
function cleanOption(o:ScriptOption):ScriptOption{return {n:Number(o.n)||0,angle:cut(o.angle,60),title:cut(o.title,110),hook:cut(o.hook,300),chapters:(Array.isArray(o.chapters)?o.chapters:[]).slice(0,10).map(c=>cut(c,80)),words:Number(o.words)||0,opening:cut(o.opening,600)}}
/** Storage paths a worker may write for a job: its own folder only, plain file names. */
export function mediaPath(jobId:string,name:string):string{
 if(!/^[a-z0-9-]{8,64}$/.test(jobId)||!/^[a-z0-9][a-z0-9._-]{0,80}$/.test(name)||name.includes('..'))throw new StoryError('PATH','Invalid media path.')
 return `jobs/${jobId}/${name}`
}
