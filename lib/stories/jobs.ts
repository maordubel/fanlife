/**
 * FanLife: Football Stories — the production job contract (owner-only studio ⇄ GitHub Actions worker).
 *
 * A job is one film. The studio creates it (`queued`), the worker leases it (`running`), reports every stage, and finishes
 * it as `ready` (every automatic check passed), `needs_review` (something a person must look at) or `failed` (with a stable
 * error code and whether a retry is safe). Uploading to YouTube is a separate, explicit step with its own state, and a
 * video id is recorded only when YouTube itself has shown it.
 * Pure functions only: no I/O here, so every transition is tested on its own.
 */
import type {PromoSpec} from './promo'
import {SocialError,cancelSocial,scheduleSocial,type PostInput,type SocialPlan} from './social'
import {isDirector,type DirectorId} from './directors'
import {reviewEdits,type Review,type ReviewAction} from './editorial'
import type {Autopilot} from './autopilot'
export const STAGES=['research','script','voice','graphics','edit','mix','master','package','qa','done'] as const
export type Stage=typeof STAGES[number]
export type JobState='queued'|'running'|'paused'|'cancel_requested'|'cancelled'|'failed'|'needs_review'|'ready'
export type UploadState='none'|'in_progress'|'uncertain'|'done'
export type Privacy='private'|'unlisted'|'public'|'scheduled'
export const DURATIONS=[0.5,1,2,3,5,...Array.from({length:19},(_,i)=>i+7)] as const
export type ArtFile={name:string;illustrated:boolean;originalName?:string}
/** Studio v3 (owner, 4.11.2026: "less freedom, more choices; a film about one match; three scripts to choose from"). */
export const KINDS=['season','match','tie','rivalry'] as const
export type Kind=typeof KINDS[number]
export const TONES=['auto','triumph','heartbreak','underdog','rivalry','nostalgia','drama'] as const
export type Tone=typeof TONES[number]
export const STYLES=['collage','papercut','archive','night'] as const
export type Style=typeof STYLES[number]
/** One script per director (docs/fanlife/66 §5): `angle` carries the director's name, `director` his id. */
export type ScriptOption={n:number;angle:string;title:string;hook:string;hook_options?:{text:string;claim_ids:string[]}[];chapters:string[];words:number;opening:string;director?:DirectorId}
export type Brief={
 club_id:string;club_name:string;season:string;topic:string;duration:number
 visual_style:Style|'mixed';voice:'auto'|'elevenlabs'|'kokoro';review:'auto'|'script'|'editorial'
 /** what the film is about: a season (default), one match, a tie or run of matches, or every meeting with one opponent */
 kind?:Kind;match_ids?:string[];opponent?:string|null;tone?:Tone
 /** three scripts to choose from (default) or one; the owner's pick once they are written */
 scripts?:1|3;choice?:number|null
 /** the director whose pitch this film came from: his script is offered first (studio desk, Directors tab) */
 lead_director?:DirectorId|null
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
/** The files an animated Short is edited from, as Google Flow made them (studio/flowkit.py names the slots). */
/** A Reel or Short the owner made outside the pipeline, added to a finished film for the Social panel (10.11.2026). */
export const REEL_NAME=/^reel-[a-z0-9][a-z0-9-]{0,40}\.mp4$/
export const REEL_MAX_BYTES=45*1024*1024
export const FLOW_NAME=/^(clip-\d{1,2}\.mp4|still-\d{1,2}\.(jpg|png|webp))$/
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
 /** a queued film the worker leaves alone until then (Google's free quota was busy or spent) */
 notBefore?:string|null
 artefacts:{master?:{chunks:Artefact[];bytes:number;sha256:string};preview?:Artefact;thumbnails?:Artefact[];captions?:{srt:Artefact;vtt:Artefact};contact?:Artefact;package?:Artefact;shorts?:ShortArtefact[]}|null
 youtube:Record<string,unknown>|null;qa:{ok:boolean;checks:{name:string;ok:boolean;detail:string}[];cannot_prove?:string[];rights?:string[]}|null
 upload:{state:UploadState;videoId:string|null;visibility:Privacy|null;publishAt:string|null;at:string|null;by:string|null;note:string|null}
 cost:{writer?:string;voice?:string;renderMinutes?:number}
 /** the scripts written for the owner to choose from (studio v3) */
 options?:ScriptOption[]|null
 editorial?:Review
 editorialRequest?:ReviewAction
 /** posts of the finished film on Facebook, Instagram, X and TikTok (lib/stories/social.ts) */
 social?:SocialPlan|null
 /** what the worker makes (studio desk, 4.11.2026): a documentary (absent = 'film'), a CLASSIFIED FILE or an I WAS THERE
  *  vlog — and the kind's own validated request. `brief` still carries the summary every screen prints. */
 kind?:JobKind;spec?:ClassifiedSpec|VlogSpec|PromoSpec|ShortSpec|CasefileSpec|null
 /** an animated Short's Google Flow pack (studio/flowkit.py): what to make in Flow, and the edit plan for the clips */
 flow?:FlowPack|null
 /** set once the big files left the bucket: after the YouTube upload, or (`reason:'unuploaded'`) after seven days
  *  without one (lib/stories/trim.ts) */
 trim?:{at:string;bytes:number;files:number;reason?:'unuploaded'}|null
 /** the autopilot's ride for this film: pick → preview on Telegram → two hours to cancel → publish (lib/stories/autopilot.ts) */
 autopilot?:Autopilot|null
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
 if(b.lead_director!==undefined&&b.lead_director!==null&&!isDirector(b.lead_director))throw new StoryError('BRIEF','Unknown director.')
 const lead_director=isDirector(b.lead_director)?b.lead_director:null
 return {club_id,club_name,season,topic:str('topic',240),duration,visual_style:pick('visual_style',[...STYLES,'mixed'] as const,'collage'),
  kind,match_ids:kind==='match'||kind==='tie'?ids as string[]:[],opponent,drive_folder:driveFolder(b.drive_folder),story_words:str('story_words',300),sides:Array.isArray(b.sides)?b.sides.filter((x:unknown):x is string=>typeof x==='string').slice(0,8).map(x=>x.slice(0,60)):[],tone:pick('tone',TONES,'auto'),scripts,choice:null,lead_director,drive:b.drive!==false,reel_to_telegram:b.reel_to_telegram===true,voice:pick('voice',['auto','elevenlabs','kokoro'] as const,'auto'),review:pick('review',['auto','script','editorial'] as const,'auto'),privacy,publish_at,crowd:pick('crowd',['soft','off'] as const,'soft'),
  focus_from,focus_to,notes:lines.join('\n'),art:[],hold}
}

export function newJob(id:string,brief:Brief,palette:Palette,actor:string,idempotencyKey:string,now=new Date()):Job{
 const at=now.toISOString()
 const held=brief.hold===true
 return {version:1,id,createdAt:at,updatedAt:at,createdBy:actor,idempotencyKey,brief,palette,state:held?'paused':'queued',stage:null,progress:0,message:held?'Waiting for your pictures — add them, then press Resume':'Waiting for the production worker',attempts:0,lease:null,log:[{at,text:held?'Created, held for the owner\'s pictures':'Queued'}],error:null,artefacts:null,youtube:null,qa:null,upload:{state:'none',videoId:null,visibility:null,publishAt:null,at:null,by:null,note:null},cost:{}}
}

const LOG_KEEP=120
const pushLog=(j:Job,text:string,at:string)=>{j.log=[...j.log,{at,text:text.slice(0,400)}].slice(-LOG_KEEP)}

export type OwnerAction=ReviewAction|{action:'pause'|'resume'|'cancel'|'retry'|'retry_editorial'|'approve_script'}|{action:'choose_script';option:number}|{action:'upload_started'}|{action:'upload_done';videoId:string;visibility:Privacy;publishAt?:string|null}|{action:'upload_uncertain';note:string}|{action:'upload_reset'}|{action:'art_added';files:ArtFile[]}|{action:'social_schedule';posts:PostInput[]}|{action:'social_cancel';id:string}|{action:'flow_added';files:string[]}|{action:'flow_ready'}|{action:'reel_added';name:string;bytes:number;seconds:number;hook:string}
export const VIDEO_ID=/^[A-Za-z0-9_-]{11}$/

/** An owner's action → the next job, or a StoryError saying why it is not allowed now. */
export function ownerAct(job:Job,a:OwnerAction,actor:string,now=new Date()):Job{
 if(a.action==='social_schedule'||a.action==='social_cancel'){
  try{return a.action==='social_schedule'?scheduleSocial(job,a.posts,actor,now):cancelSocial(job,a.id,actor,now)}
  catch(e){if(e instanceof SocialError)throw new StoryError(e.code,e.message,e.status);throw e}
 }
 const j:Job=structuredClone(job),at=now.toISOString()
 const no=(m:string)=>{throw new StoryError('STATE',m,409)}
 const queueReview=(request:ReviewAction)=>{
  j.editorialRequest=request;j.state='queued';j.error=null;j.notBefore=null
  pushLog(j,`Editorial request saved by ${actor}`,at)
 }
 switch(a.action){
  case 'editorial_script':
  case 'editorial_rewrite':{
   const draft=j.editorial?.drafts.find(d=>d.option===a.option&&d.revision===a.revision)
   if(j.state!=='needs_review'||j.stage!=='script'||!draft)throw new StoryError('REVISION','This draft changed. Open the latest review.',409)
   const ids=new Set(draft.chapters.flatMap(c=>c.beats.map(b=>b.id)))
   if(a.action==='editorial_rewrite'){
    if(!ids.has(a.beat)||typeof a.instruction!=='string'||!a.instruction.trim()||a.instruction.length>600)throw new StoryError('REWRITE','Enter a short instruction for a paragraph.')
    queueReview(a)
   }else{
    try{
     const removed=a.removed??[]
     if(!Array.isArray(removed)||removed.some(id=>!ids.has(id)))throw new Error('Unknown paragraph')
     queueReview({...a,edits:reviewEdits(a.edits,ids,3000),removed:[...new Set(removed)]})
    }
    catch{throw new StoryError('EDITS','Each edit must refer to a paragraph in this draft and contain text.')}
   }
   break
  }
  case 'editorial_combine':{
   const ids=new Set(j.editorial?.drafts.map(d=>d.option))
   if(j.state!=='needs_review'||j.stage!=='script'||![a.opening,a.body,a.ending].every(n=>ids.has(n)))no('Choose from the available scripts.')
   queueReview(a);break
  }
  case 'editorial_plan':{
   const board=j.editorial
   if(j.state!=='needs_review'||j.stage!=='edit'||!board?.scenes||a.revision!==board.plan)throw new StoryError('REVISION','The scene board changed. Open the latest review.',409)
   const ids=new Set(board.scenes.map(s=>s.id))
   if(!Array.isArray(a.order)||a.order.length!==ids.size||new Set(a.order).size!==ids.size||a.order.some(id=>!ids.has(id)))throw new StoryError('SCENES','Scene order must include each scene once.')
   let images:Record<string,string>
   try{images=reviewEdits(a.images,ids,300)}catch{throw new StoryError('SCENES','Invalid picture selection.')}
   if(Object.entries(images).some(([id,key])=>!board.scenes!.find(s=>s.id===id)?.alternatives?.includes(key)))throw new StoryError('SCENES','Choose a picture offered for that scene.')
   if(a.approved===true&&board.issues?.length)throw new StoryError('SCENES','Resolve the review issues before production.')
   queueReview({...a,images,approved:a.approved===true});break
  }
  case 'editorial_back':
   if(j.state!=='needs_review'||j.stage!=='edit'||!j.editorial)no('There is no scene board to return from.')
   j.stage='script';j.editorial={drafts:j.editorial!.drafts,gaps:j.editorial!.gaps};delete j.editorialRequest;break
  case 'pause':if(!['queued','running'].includes(j.state))no('Only a queued or running job can be paused.');j.state='paused';pushLog(j,`Paused by ${actor}`,at);break
  case 'resume':if(j.state!=='paused')no('This job is not paused.');j.state='queued';j.lease=null;pushLog(j,`Resumed by ${actor} — continues from its last checkpoint`,at);break
  case 'cancel':if(j.state==='cancelled'||j.state==='cancel_requested')no('This job is already cancelled.');if(j.upload.state==='in_progress')no('An upload is in progress — record its result first.');j.state=j.state==='running'?'cancel_requested':'cancelled';j.lease=j.state==='cancelled'?null:j.lease;pushLog(j,`Cancelled by ${actor}`,at);break
  case 'retry':
  case 'retry_editorial':
   if(j.state!=='failed'&&j.state!=='cancelled'&&!(j.state==='queued'&&j.notBefore))no('Only a failed or cancelled job (or one waiting for the writer) can be retried.')
   {
    const scriptFailed=jobKind(j)==='film'&&j.state==='failed'&&j.error?.code==='SCRIPT_INVALID'
    if(a.action==='retry_editorial'&&!scriptFailed)no('Only a failed documentary script can be retried in the editing room.')
    if(scriptFailed){
     j.brief={...j.brief,review:'editorial',choice:null};j.options=null;delete j.editorial
     j.editorialRequest={action:'editorial_restart',attempt:j.attempts}
    }
    pushLog(j,scriptFailed?`Script retry in the editing room requested by ${actor}`:`Retry requested by ${actor} — resumes from its last checkpoint; paid steps already done are not repeated`,at)
   }
   j.state='queued';j.error=null;j.lease=null;j.notBefore=null
   break
  case 'approve_script':if(j.brief.review==='editorial'||j.state!=='needs_review'||j.stage!=='script')no('There is no script waiting for approval.');if(j.options?.length)no('Choose one of the scripts.');j.state='queued';j.brief={...j.brief,review:'auto'};pushLog(j,`Script approved by ${actor}`,at);break
  case 'choose_script':{if(j.brief.review==='editorial'||j.state!=='needs_review'||j.stage!=='script'||!j.options?.length)no('There are no scripts waiting for your choice.');const o=j.options!.find(x=>x.n===a.option);if(!o)throw new StoryError('CHOICE','Unknown script.');j.state='queued';j.brief={...j.brief,review:'auto',choice:o.n};pushLog(j,`Script ${o.n} chosen by ${actor}: "${o.title}"`,at);break}
  case 'upload_started':if(j.state!=='ready'&&j.state!=='needs_review')no('Only a finished film can be uploaded.');if(j.upload.state==='done')no('This film is already uploaded.');if(j.upload.state==='in_progress'||j.upload.state==='uncertain')no('An upload was started already — check YouTube Studio, then record the result or reset.');j.upload={...j.upload,state:'in_progress',at,by:actor};pushLog(j,`Upload started by ${actor}`,at);break
  case 'upload_done':if(!VIDEO_ID.test(a.videoId))throw new StoryError('UPLOAD','A YouTube video id has 11 characters.');if(!['private','unlisted','public','scheduled'].includes(a.visibility))throw new StoryError('UPLOAD','Unknown visibility.');if(j.upload.state==='done'&&j.upload.videoId!==a.videoId)no('A different video id is already recorded.');j.upload={state:'done',videoId:a.videoId,visibility:a.visibility,publishAt:a.publishAt??null,at,by:actor,note:null};pushLog(j,`YouTube shows video ${a.videoId} (${a.visibility})`,at);break
  case 'upload_uncertain':j.upload={...j.upload,state:'uncertain',note:a.note.slice(0,300),at};pushLog(j,`Upload result uncertain: ${a.note.slice(0,200)}`,at);break
  case 'flow_added':{
   if(!FLOW_KINDS.includes(jobKind(j))||!j.flow)no('Flow clips belong to an animated Short or promo whose Flow pack is ready.')
   if(j.lease)no('The worker is still stopping. Wait a moment.')
   if(!['needs_review','failed','paused'].includes(j.state))no('Add the Flow clips while the Short waits for them.')
   const want=new Set(flowFiles(j.flow!))
   const files=Array.isArray(a.files)?a.files:[]
   if(!files.length||files.some(f=>typeof f!=='string'||!FLOW_NAME.test(f)||!want.has(f)))throw new StoryError('ART','Each file goes into one of this Short\'s slots (clip-0.mp4, still-0.jpg …).')
   const keep=new Map((j.brief.art??[]).map(f=>[f.name,f]))
   for(const f of files)keep.set(f,{name:f,illustrated:true})
   j.brief={...j.brief,art:[...keep.values()]};pushLog(j,`${files.length} Flow file(s) added by ${actor}`,at)
   break}
  case 'flow_ready':{
   if(!FLOW_KINDS.includes(jobKind(j))||!j.flow)no('There is no Flow pack on this job.')
   if(j.lease)no('The worker is still stopping. Wait a moment.')
   if(!['needs_review','failed','paused'].includes(j.state))no('This Short is not waiting for its clips.')
   const have=new Set((j.brief.art??[]).map(f=>f.name)),left=flowFiles(j.flow!).filter(n=>!have.has(n))
   if(left.length)throw new StoryError('ART',`Upload the missing Flow files first: ${left.join(', ')}.`)
   j.state='queued';j.error=null;j.notBefore=null;j.message='Waiting for the production worker — editing the Short'
   pushLog(j,`Flow clips complete — editing requested by ${actor}`,at)
   break}
  case 'art_added':{
   if(['classified','vlog','promo','short','casefile'].includes(j.kind??''))no('Use this series\' own footage input. This picture uploader is for Football Stories documentaries.')
   const reviewingScenes=j.state==='needs_review'&&j.stage==='edit'&&j.brief.review==='editorial'
   if(!reviewingScenes&&!['queued','paused'].includes(j.state))no('Pictures can be added before the film starts or during scene review.')
   if(j.lease)no('The worker is still stopping. Wait for it to pause, then add your pictures.')
   const files=Array.isArray(a.files)?a.files:[]
   if(!files.length||files.some(f=>!f||typeof f.name!=='string'||!ART_NAME.test(f.name)))throw new StoryError('ART','Picture names: lower-case letters, digits, dots and dashes, ending .png, .jpg or .webp.')
   const keep=new Map((j.brief.art??[]).map(f=>[f.name,f]))
   for(const f of files)keep.set(f.name,{name:f.name,illustrated:f.illustrated===true,...(typeof f.originalName==='string'?{originalName:f.originalName.slice(0,200)}:{})})
   if(keep.size>30)throw new StoryError('ART','At most 30 pictures for one film.')
   j.brief={...j.brief,art:[...keep.values()]};pushLog(j,`${files.length} picture(s) added by ${actor}`,at)
   if(reviewingScenes)queueReview({action:'editorial_refresh'})
   break}
  case 'reel_added':{
   // the owner's own Reel/Short for a finished film: it joins artefacts.shorts, so the Social panel can schedule it
   const art=j.artefacts
   if(!art?.master||!['ready','needs_review'].includes(j.state)){no('Add your own Reel once the film is finished.');break}
   const name=String(a.name??''),bytes=Number(a.bytes),seconds=Number(a.seconds),hook=String(a.hook??'').trim().slice(0,120)
   if(!REEL_NAME.test(name))throw new StoryError('REEL','Invalid Reel file name.')
   if(!Number.isInteger(bytes)||bytes<1||bytes>REEL_MAX_BYTES)throw new StoryError('REEL','A Reel can be at most 45 MB.')
   if(!Number.isFinite(seconds)||seconds<3||seconds>180)throw new StoryError('REEL','A Reel must be between 3 seconds and 3 minutes long.')
   const shorts=[...(art.shorts??[])],path=mediaPath(j.id,name)
   if(shorts.some(x=>x.path===path))throw new StoryError('REEL','This Reel is already part of the film.',409)
   if(shorts.length>=12)throw new StoryError('REEL','At most 12 Shorts and Reels for one film.')
   shorts.push({path,bytes,seconds:Math.round(seconds*10)/10,hook,title:'Your Reel'})
   j.artefacts={...art,shorts};pushLog(j,`Reel added by ${actor} (${Math.round(seconds)} s)`,at)
   break}
  case 'upload_reset':if(j.upload.state==='done')no('A confirmed upload cannot be reset.');j.upload={state:'none',videoId:null,visibility:null,publishAt:null,at,by:actor,note:'Reset after checking YouTube Studio'};pushLog(j,`Upload state reset by ${actor} after checking YouTube Studio`,at);break
 }
 j.updatedAt=at;return j
}

export const LEASE_MS=6.5*3600_000
/** The job the worker should take next: the oldest queued one, or a running one whose lease ran out (the worker died). */
export function nextForWorker(jobs:Job[],now=new Date()):Job|null{
 const t=now.getTime()
 return jobs.filter(j=>(j.state==='queued'&&!(j.notBefore&&Date.parse(j.notBefore)>t))||(j.state==='running'&&j.lease!==null&&Date.parse(j.lease.until)<t)).sort((a,b)=>a.createdAt.localeCompare(b.createdAt))[0]??null
}
export function claim(job:Job,worker:string,now=new Date()):Job{
 const j=structuredClone(job),at=now.toISOString()
 j.state='running';j.attempts+=1;j.notBefore=null;j.lease={worker,until:new Date(now.getTime()+LEASE_MS).toISOString()};j.error=null
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
export type Finish={flow?:FlowPack;options?:ScriptOption[];editorial?:Review;state:'ready'|'needs_review'|'failed'|'waiting';retryAt?:string;error?:{code:string;message:string;retryable:boolean};artefacts?:Job['artefacts'];youtube?:Record<string,unknown>;qa?:Job['qa'];cost?:Job['cost'];stage?:Stage}
export function finish(job:Job,worker:string,f:Finish,now=new Date()):Job{
 if(!job.lease||job.lease.worker!==worker)throw new StoryError('LEASE','This worker does not hold the job.',409)
 const j=structuredClone(job),at=now.toISOString()
 j.lease=null;j.updatedAt=at
 if(f.stage)j.stage=f.stage
 if(f.state==='waiting'){
  // Google's free tier was busy or its daily quota spent: nothing is wrong with the film, it starts again by itself
  const t=Date.parse(String(f.retryAt||'')),ok=Number.isFinite(t)&&t>now.getTime()&&t<now.getTime()+36*3600_000
  j.state='queued';j.error=null;j.notBefore=new Date(ok?t:now.getTime()+20*60_000).toISOString()
  const hm=new Date(j.notBefore).toISOString().slice(11,16),studio=String(f.error?.code||'').startsWith('STUDIO_')
  j.message=studio?`The studio was not answering — starts again by itself at ${hm} UTC`:`Waiting for Google's free writer — starts again by itself at ${hm} UTC`
  pushLog(j,`${String(f.error?.message||(studio?'The studio did not answer':'The writer is busy')).slice(0,300)} — the film waits until ${hm} UTC and starts again by itself`,at)
  return j
 }
 j.state=f.state;j.notBefore=null
 if(f.editorial&&f.state==='needs_review'&&(f.stage==='script'||f.stage==='edit')){
  j.brief={...j.brief,review:'editorial'}
  j.editorial=f.editorial;delete j.editorialRequest
  j.message=f.stage==='script'?'Waiting for script approval':'Waiting for scene and picture approval'
  pushLog(j,j.message,at)
  return j
 }
 if(f.flow&&f.state==='needs_review'&&FLOW_KINDS.includes(jobKind(j))){
  j.flow=cleanFlow(f.flow);j.stage='graphics';j.progress=0.5
  j.message=`Waiting for ${j.flow.clips.length} Flow clip(s) and ${j.flow.stills.length} still(s) — ${j.flow.credits} credits`
  pushLog(j,j.message,at)
  return j
 }
 if(f.state==='failed'){j.error={code:String(f.error?.code||'FAILED').slice(0,60),message:String(f.error?.message||'').slice(0,600),retryable:!!f.error?.retryable};pushLog(j,`Failed: [${j.error.code}] ${j.error.message}`,at)}
 else{if(f.state==='needs_review'&&f.stage==='script'&&Array.isArray(f.options))j.options=leadFirst(f.options.slice(0,3).map(cleanOption),j.brief.lead_director);j.progress=f.stage==='script'?j.progress:1;j.artefacts=f.artefacts??j.artefacts;j.youtube=f.youtube??j.youtube;j.qa=f.qa??j.qa;j.cost={...j.cost,...(f.cost??{})};pushLog(j,f.state==='ready'?'Finished: every automatic check passed':'Finished: waiting for your review',at)}
 return j
}
const cut=(x:unknown,n:number)=>String(x??'').slice(0,n)
function cleanOption(o:ScriptOption):ScriptOption{const x:ScriptOption={n:Number(o.n)||0,angle:cut(o.angle,60),title:cut(o.title,110),hook:cut(o.hook,300),chapters:(Array.isArray(o.chapters)?o.chapters:[]).slice(0,10).map(c=>cut(c,80)),words:Number(o.words)||0,opening:cut(o.opening,600)};if(Array.isArray(o.hook_options))x.hook_options=o.hook_options.slice(0,3).filter(h=>h&&typeof h==='object').map(h=>({text:cut(h.text,600),claim_ids:(Array.isArray(h.claim_ids)?h.claim_ids:[]).slice(0,10).map(id=>cut(id,80))}));if(isDirector(o.director))x.director=o.director;return x}
/** The pitching director's script first, the others in the order they were written. `n` is never renumbered: it names
 *  the file the worker resumes from (script-option-<n>.json). */
export function leadFirst(opts:ScriptOption[],lead:DirectorId|null|undefined):ScriptOption[]{
 if(!lead)return opts
 return [...opts].sort((a,b)=>Number(b.director===lead)-Number(a.director===lead))
}
/** Storage paths a worker may write for a job: its own folder only, plain file names. */
export function mediaPath(jobId:string,name:string):string{
 if(!/^[a-z0-9-]{8,64}$/.test(jobId)||!/^[a-z0-9][a-z0-9._-]{0,80}$/.test(name)||name.includes('..'))throw new StoryError('PATH','Invalid media path.')
 return `jobs/${jobId}/${name}`
}

/* ── The studio desk's other productions (owner, 4.11.2026: "split the studio — documentary, CLASSIFIED, VLOG …") ──
 * One queue, one worker, one lease: a CLASSIFIED FILE and an I WAS THERE vlog are jobs like a film, so pause, cancel,
 * retry, the status lights and the Telegram delivery work the same. Each carries its own request in `spec`, checked
 * here; `brief` is a summary in the film's shape so every list and card prints it. */
export const JOB_KINDS=['film','classified','vlog','promo','short','casefile'] as const
export type JobKind=typeof JOB_KINDS[number]
export const jobKind=(j:Pick<Job,'kind'>):JobKind=>j.kind&&(JOB_KINDS as readonly string[]).includes(j.kind)?j.kind:'film'

/** A CLASSIFIED FILE as the desk sees it (lib/stories/classifiedIndex.ts reads the episodes and the panel map). */
export type ClassifiedFile={file:string;number:string;title:string;tone:string;year:number|null;episode:string|null
 script:string|null;script_version:string|null;approved_in_file:boolean;minutes:number|null;beats:number
 panels:{have:number;roles:number;missing:string[]};shorts:number;hook_options?:string[]
 scenes?:{id:string;chapter:string;text:string;panel:string;seconds:number;camera:string;sourceIds:number[]}[]
 pictures?:{id:string;name:string;thumbnail:string;label:string}[]
 sources?:{id:number;title:string;url:string}[]}
/** The owner's approval is part of the request (mirrors the workflow's "I approve the script" tick): who, when, and
 *  WHICH draft — the worker refuses to voice a script whose version changed after the click. */
export type ClassifiedSpec={file:string;number:string;title:string;episode:string;script_version:string
 approved:true;approved_by:string;approved_at:string;telegram:boolean;panel_overrides?:Record<string,string>}
export type VlogMatch={id:string;date:string;season:string;competition:string|null;home:string;away:string;score:string}
export type VlogSpec={club_id:string;club_name:string;match:VlogMatch;drive_link:string;notes:string;minutes:number;telegram:boolean}
export const VLOG_MINUTES=[2,3,4,5,6,8,10] as const

/** A Drive folder OR a single file the owner shared ("anyone with the link") → its canonical link. */
export function driveLink(v:unknown):string{
 if(typeof v!=='string'||!v.trim())throw new StoryError('BRIEF','Paste the Drive folder with the footage (drive.google.com/drive/folders/…).')
 const t=v.trim(),file=t.match(/\/file\/d\/([\w-]{10,})/)
 if(file)return `https://drive.google.com/file/d/${file[1]}/view`
 return `https://drive.google.com/drive/folders/${driveFolder(t)}`
}

export function validateClassified(v:unknown,files:ClassifiedFile[],actor:string,now=new Date()):{brief:Brief;spec:ClassifiedSpec}{
 if(!v||typeof v!=='object')throw new StoryError('BRIEF','Choose a FILE.')
 const b=v as Record<string,unknown>
 const f=files.find(x=>x.file===b.file)
 if(!f)throw new StoryError('BRIEF','Unknown FILE.')
 if(!f.episode||!f.script_version)throw new StoryError('BRIEF',`FILE ${f.number} has no episode script yet — it cannot be produced.`)
 if(b.approved!==true)throw new StoryError('APPROVAL',`Tick "I have read and approve this FILE's script" first: the narrator speaks only an approved script.`)
 if(b.script_version!==f.script_version)throw new StoryError('APPROVAL',`The script changed (now ${f.script_version}) — read it again and approve the new draft.`,409)
 if(f.panels.missing.length&&f.panels.have===0)throw new StoryError('BRIEF',`FILE ${f.number} has no panels in the Drive map yet.`)
 const spec:ClassifiedSpec={file:f.file,number:f.number,title:f.title,episode:f.episode,script_version:f.script_version,approved:true,
  approved_by:String(actor||'owner').slice(0,80),approved_at:now.toISOString(),telegram:b.telegram!==false}
 if(f.scenes?.length){
  if(b.scenes_approved!==true)throw new StoryError('APPROVAL','Review and approve the CLASSIFIED scene board first.')
  const ids=new Set(f.scenes.map(s=>s.id))
  const pictures=new Set(f.pictures?.map(p=>p.id))
  try{
   const selected=reviewEdits(b.panel_overrides??{},ids,120)
   if(Object.values(selected).some(id=>!pictures.has(id)))throw new Error('Unknown picture')
   spec.panel_overrides=selected
  }catch{throw new StoryError('SCENES','Choose pictures listed for this FILE.')}
 }
 const brief:Brief={club_id:'classified',club_name:'CLASSIFIED',season:`FILE ${f.number}`,topic:f.title,duration:f.minutes??5,visual_style:'mixed',
  voice:'kokoro',review:'auto',privacy:'private',publish_at:null,scripts:1,choice:null,drive:false,reel_to_telegram:spec.telegram,art:[],hold:false}
 return {brief,spec}
}

export function validateVlog(v:unknown,clubs:Map<string,string>,findMatch:(club:string,id:string)=>VlogMatch|null):{brief:Brief;spec:VlogSpec}{
 if(!v||typeof v!=='object')throw new StoryError('BRIEF','Choose the match.')
 const b=v as Record<string,unknown>
 const club_id=typeof b.club_id==='string'?b.club_id:''
 const club_name=clubs.get(club_id)
 if(!club_name)throw new StoryError('BRIEF','Unknown club.')
 const id=typeof b.match_id==='string'?b.match_id:''
 const match=/^[A-Za-z0-9:._-]{3,120}$/.test(id)?findMatch(club_id,id):null
 if(!match)throw new StoryError('BRIEF','Choose the match from the list.')
 const drive_link=driveLink(b.drive_folder)
 const notes=typeof b.notes==='string'?b.notes.replace(/\r/g,'').trim():''
 if(notes.length>4000)throw new StoryError('BRIEF','Notes: at most 4,000 characters.')
 const minutes=b.minutes===undefined?4:Number(b.minutes)
 if(!(VLOG_MINUTES as readonly number[]).includes(minutes))throw new StoryError('BRIEF','Length: 2, 3, 4, 5, 6, 8 or 10 minutes.')
 const spec:VlogSpec={club_id,club_name,match,drive_link,notes,minutes,telegram:b.telegram!==false}
 const brief:Brief={club_id,club_name,season:match.season,topic:`${match.home} ${match.score} ${match.away}`,duration:minutes,visual_style:'mixed',
  voice:'kokoro',review:'auto',privacy:'private',publish_at:null,kind:'match',match_ids:[match.id],scripts:1,choice:null,drive:false,
  drive_folder:null,reel_to_telegram:spec.telegram,notes:'',art:[],hold:false}
 return {brief,spec}
}

export function newSpecialJob(id:string,kind:'classified'|'vlog'|'promo'|'short'|'casefile',x:{brief:Brief;spec:ClassifiedSpec|VlogSpec|PromoSpec|ShortSpec|CasefileSpec},palette:Palette,actor:string,key:string,now=new Date()):Job{
 const j=newJob(id,{...x.brief,hold:false},palette,actor,key,now)
 j.kind=kind;j.spec=x.spec
 if(kind==='classified'){const s=x.spec as ClassifiedSpec;j.log=[{at:j.createdAt,text:`Queued — script ${s.script_version} approved by ${s.approved_by}`}]}
 return j
}

/* ── Animated Shorts on Google Flow (owner, 8.11.2026) ──────────────────────────────────────────────────────────────
 * One match → the Short's script and its Flow pack (first worker visit, finishes as needs_review / graphics with `flow`);
 * the owner makes the clips in Flow and uploads them into their slots (`flow_added`), then `flow_ready` queues the edit
 * (second visit). Flow has no API: nothing here can spend its credits. */
/** The kinds made in Google Flow: the animated Shorts and the marketing films. */
export const FLOW_KINDS:readonly JobKind[]=['short','promo']
export const SHORT_SECONDS=[20,30] as const
export type ShortSpec={club_id:string;club_name:string;match:VlogMatch;seconds:number;angle:string;telegram:boolean}
export type FlowStep={id:string;role:string;prompt:string;model:string;aspect:string;credits:number}
export type FlowClip={beat:number;file:string;prompt:string;model:string;aspect:string;credits:number;seconds?:number;ingredients?:string[]}
export type FlowPack={title:string;narration:string;hook_law?:string|null;characters:FlowStep[];clips:FlowClip[];stills:FlowClip[];credits:number;steps:string[];markdown?:string;description?:string;tags?:string[]
 story:{tag:string;beats:{say:string;clip?:number;still?:number;stamp?:string}[]}}
export const flowFiles=(p:Pick<FlowPack,'clips'|'stills'>):string[]=>[...p.clips,...p.stills].map(c=>c.file)
function cleanFlow(f:FlowPack):FlowPack{
 const step=(x:FlowStep)=>({id:cut(x.id,40),role:cut(x.role,120),prompt:cut(x.prompt,2400),model:cut(x.model,40),aspect:cut(x.aspect,8),credits:Number(x.credits)||0})
 const clip=(x:FlowClip)=>({beat:Number(x.beat)||0,file:cut(x.file,40),prompt:cut(x.prompt,2400),model:cut(x.model,40),aspect:cut(x.aspect,8),credits:Number(x.credits)||0,
  ...(x.seconds?{seconds:Number(x.seconds)}:{}),...(Array.isArray(x.ingredients)?{ingredients:x.ingredients.slice(0,4).map(i=>cut(i,40))}:{})})
 const clips=(Array.isArray(f.clips)?f.clips:[]).slice(0,10).map(clip).filter(c=>FLOW_NAME.test(c.file))
 const stills=(Array.isArray(f.stills)?f.stills:[]).slice(0,10).map(clip).filter(c=>FLOW_NAME.test(c.file))
 const beats=(Array.isArray(f.story?.beats)?f.story.beats:[]).slice(0,10).map(b=>({say:cut(b.say,600),...(Number.isInteger(b.clip)?{clip:b.clip}:{}),...(Number.isInteger(b.still)?{still:b.still}:{}),...(b.stamp?{stamp:cut(b.stamp,20)}:{})}))
 return {title:cut(f.title,110),narration:cut(f.narration,1600),hook_law:f.hook_law?cut(f.hook_law,40):null,characters:(Array.isArray(f.characters)?f.characters:[]).slice(0,4).map(step),
  clips,stills,credits:clips.reduce((n,c)=>n+c.credits,0),steps:(Array.isArray(f.steps)?f.steps:[]).slice(0,8).map(x=>cut(x,300)),markdown:cut(f.markdown,20000),
  description:cut(f.description,1800),tags:(Array.isArray(f.tags)?f.tags:[]).slice(0,12).map(x=>cut(x,40)),story:{tag:cut(f.story?.tag,40),beats}}
}
export function validateShort(v:unknown,clubs:Map<string,string>,findMatch:(club:string,id:string)=>VlogMatch|null):{brief:Brief;spec:ShortSpec}{
 if(!v||typeof v!=='object')throw new StoryError('BRIEF','Choose the match.')
 const b=v as Record<string,unknown>
 const club_id=typeof b.club_id==='string'?b.club_id:''
 const club_name=clubs.get(club_id)
 if(!club_name)throw new StoryError('BRIEF','Unknown club.')
 const id=typeof b.match_id==='string'?b.match_id:''
 const match=/^[A-Za-z0-9:._-]{3,120}$/.test(id)?findMatch(club_id,id):null
 if(!match)throw new StoryError('BRIEF','Choose the match from the list.')
 const seconds=b.seconds===undefined?30:Number(b.seconds)
 if(!(SHORT_SECONDS as readonly number[]).includes(seconds))throw new StoryError('BRIEF','Length: 20 or 30 seconds.')
 const angle=typeof b.angle==='string'?b.angle.replace(/\r/g,'').trim().slice(0,400):''
 const spec:ShortSpec={club_id,club_name,match,seconds,angle,telegram:b.telegram!==false}
 const brief:Brief={club_id,club_name,season:match.season,topic:`${match.home} ${match.score} ${match.away}`,duration:0.5,visual_style:'mixed',
  voice:'auto',review:'auto',privacy:'private',publish_at:null,kind:'match',match_ids:[match.id],scripts:1,choice:null,drive:false,
  drive_folder:null,reel_to_telegram:spec.telegram,notes:'',art:[],hold:false}
 return {brief,spec}
}

/* ── The CLASSIFIED writers' room (owner, 8.11.2026: "full automation") ─────────────────────────────────────────────
 * A story → the studio researches it (grounded), writes the FILE by docs/fanlife/classified/WRITERS-ROOM.md and commits
 * it; Claude makes its panels in Google Flow; the owner reads and approves it, and only then is it produced. */
export const CASE_TONES=['LAUGH','WAR','HEART'] as const
export type CasefileSpec={topic:string;tone:typeof CASE_TONES[number];notes:string;file:string|null}
export function validateCasefile(v:unknown,files:{file:string}[]):{brief:Brief;spec:CasefileSpec}{
 if(!v||typeof v!=='object')throw new StoryError('BRIEF','Write the story.')
 const b=v as Record<string,unknown>
 const clean=(x:unknown,n:number)=>typeof x==='string'?x.replace(/\r/g,'').trim().slice(0,n):''
 const file=typeof b.file==='string'&&b.file?b.file:null
 if(file&&!files.some(f=>f.file===file))throw new StoryError('BRIEF','Unknown FILE.')
 const topic=clean(b.topic,400)
 if(topic.length<12)throw new StoryError('BRIEF','Write the story in a sentence or two: who, where, when, what happened.')
 const tone=(CASE_TONES as readonly string[]).includes(String(b.tone))?b.tone as CasefileSpec['tone']:'LAUGH'
 const spec:CasefileSpec={topic,tone,notes:clean(b.notes,4000),file}
 const brief:Brief={club_id:'classified',club_name:'CLASSIFIED',season:file?file.toUpperCase():'NEW FILE',topic,duration:6,visual_style:'mixed',
  voice:'kokoro',review:'auto',privacy:'private',publish_at:null,scripts:1,choice:null,drive:false,reel_to_telegram:false,art:[],hold:false}
 return {brief,spec}
}
