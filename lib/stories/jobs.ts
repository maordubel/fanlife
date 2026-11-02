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
export type Brief={
 club_id:string;club_name:string;season:string;topic:string;duration:number
 visual_style:'collage'|'papercut'|'mixed';voice:'auto'|'elevenlabs'|'kokoro';review:'auto'|'script'
 privacy:Privacy;publish_at:string|null
}
export type Palette={club_id:string;club_name:string;primary:string;on_primary:string;bans:string[]}
export type Artefact={path:string;bytes:number;sha256?:string}
export type Job={
 version:1;id:string;createdAt:string;updatedAt:string;createdBy:string;idempotencyKey:string
 brief:Brief;palette:Palette;state:JobState;stage:Stage|null;progress:number;message:string
 attempts:number;lease:{worker:string;until:string}|null
 log:{at:string;text:string}[];error:{code:string;message:string;retryable:boolean}|null
 artefacts:{master?:{chunks:Artefact[];bytes:number;sha256:string};preview?:Artefact;thumbnails?:Artefact[];captions?:{srt:Artefact;vtt:Artefact};contact?:Artefact;package?:Artefact}|null
 youtube:Record<string,unknown>|null;qa:{ok:boolean;checks:{name:string;ok:boolean;detail:string}[];cannot_prove?:string[];rights?:string[]}|null
 upload:{state:UploadState;videoId:string|null;visibility:Privacy|null;publishAt:string|null;at:string|null;by:string|null;note:string|null}
 cost:{writer?:string;voice?:string;renderMinutes?:number}
}
export const SEASON=/^\d{4}\/\d{2}$/
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/
export class StoryError extends Error{constructor(public code:string,message:string,public status=400){super(message)}}

export function validateBrief(v:unknown,clubs:Map<string,string>):Brief{
 if(!v||typeof v!=='object'||Array.isArray(v))throw new StoryError('BRIEF','A production brief is required.')
 const b=v as Record<string,unknown>
 const str=(k:string,max:number,req=false)=>{const x=b[k];if(x===undefined||x===null)return '';if(typeof x!=='string'||x.trim().length>max||(req&&!x.trim()))throw new StoryError('BRIEF',`Invalid ${k}.`);return x.trim()}
 const club_id=str('club_id',60,true);const club_name=clubs.get(club_id);if(!club_name)throw new StoryError('BRIEF','Unknown club.')
 const season=str('season',7,true);if(!SEASON.test(season))throw new StoryError('BRIEF','Season must look like 1999/00.')
 if((+season.slice(0,4)+1)%100!==+season.slice(5))throw new StoryError('BRIEF','Season must be two consecutive years, like 1999/00.')
 const duration=Number(b.duration);if(!(DURATIONS as readonly number[]).includes(duration))throw new StoryError('BRIEF','Duration must be 30 seconds, 1, 2, 3, 5 or 7–25 minutes.')
 const pick=<T extends string>(k:string,opts:readonly T[],d:T):T=>{const x=b[k]===undefined?d:b[k];if(!opts.includes(x as T))throw new StoryError('BRIEF',`Invalid ${k}.`);return x as T}
 const privacy=pick('privacy',['private','unlisted','public','scheduled'] as const,'private')
 const publish_at=privacy==='scheduled'?str('publish_at',40,true):null
 if(publish_at!==null){if(!ISO.test(publish_at)||!Number.isFinite(Date.parse(publish_at)))throw new StoryError('BRIEF','Publish time must be a full date and time with its time zone.');if(Date.parse(publish_at)<Date.now()+3600_000)throw new StoryError('BRIEF','Schedule at least an hour ahead.')}
 return {club_id,club_name,season,topic:str('topic',240),duration,visual_style:pick('visual_style',['collage','papercut','mixed'] as const,'collage'),voice:pick('voice',['auto','elevenlabs','kokoro'] as const,'auto'),review:pick('review',['auto','script'] as const,'auto'),privacy,publish_at}
}

export function newJob(id:string,brief:Brief,palette:Palette,actor:string,idempotencyKey:string,now=new Date()):Job{
 const at=now.toISOString()
 return {version:1,id,createdAt:at,updatedAt:at,createdBy:actor,idempotencyKey,brief,palette,state:'queued',stage:null,progress:0,message:'Waiting for the production worker',attempts:0,lease:null,log:[{at,text:'Queued'}],error:null,artefacts:null,youtube:null,qa:null,upload:{state:'none',videoId:null,visibility:null,publishAt:null,at:null,by:null,note:null},cost:{}}
}

const LOG_KEEP=120
const pushLog=(j:Job,text:string,at:string)=>{j.log=[...j.log,{at,text:text.slice(0,400)}].slice(-LOG_KEEP)}

export type OwnerAction={action:'pause'|'resume'|'cancel'|'retry'|'approve_script'}|{action:'upload_started'}|{action:'upload_done';videoId:string;visibility:Privacy;publishAt?:string|null}|{action:'upload_uncertain';note:string}|{action:'upload_reset'}
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
  case 'approve_script':if(j.state!=='needs_review'||j.stage!=='script')no('There is no script waiting for approval.');j.state='queued';j.brief={...j.brief,review:'auto'};pushLog(j,`Script approved by ${actor}`,at);break
  case 'upload_started':if(j.state!=='ready'&&j.state!=='needs_review')no('Only a finished film can be uploaded.');if(j.upload.state==='done')no('This film is already uploaded.');if(j.upload.state==='in_progress'||j.upload.state==='uncertain')no('An upload was started already — check YouTube Studio, then record the result or reset.');j.upload={...j.upload,state:'in_progress',at,by:actor};pushLog(j,`Upload started by ${actor}`,at);break
  case 'upload_done':if(!VIDEO_ID.test(a.videoId))throw new StoryError('UPLOAD','A YouTube video id has 11 characters.');if(!['private','unlisted','public','scheduled'].includes(a.visibility))throw new StoryError('UPLOAD','Unknown visibility.');if(j.upload.state==='done'&&j.upload.videoId!==a.videoId)no('A different video id is already recorded.');j.upload={state:'done',videoId:a.videoId,visibility:a.visibility,publishAt:a.publishAt??null,at,by:actor,note:null};pushLog(j,`YouTube shows video ${a.videoId} (${a.visibility})`,at);break
  case 'upload_uncertain':j.upload={...j.upload,state:'uncertain',note:a.note.slice(0,300),at};pushLog(j,`Upload result uncertain: ${a.note.slice(0,200)}`,at);break
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
export type Finish={state:'ready'|'needs_review'|'failed';error?:{code:string;message:string;retryable:boolean};artefacts?:Job['artefacts'];youtube?:Record<string,unknown>;qa?:Job['qa'];cost?:Job['cost'];stage?:Stage}
export function finish(job:Job,worker:string,f:Finish,now=new Date()):Job{
 if(!job.lease||job.lease.worker!==worker)throw new StoryError('LEASE','This worker does not hold the job.',409)
 const j=structuredClone(job),at=now.toISOString()
 j.state=f.state;j.lease=null;j.updatedAt=at
 if(f.stage)j.stage=f.stage
 if(f.state==='failed'){j.error={code:String(f.error?.code||'FAILED').slice(0,60),message:String(f.error?.message||'').slice(0,600),retryable:!!f.error?.retryable};pushLog(j,`Failed: [${j.error.code}] ${j.error.message}`,at)}
 else{j.progress=f.stage==='script'?j.progress:1;j.artefacts=f.artefacts??j.artefacts;j.youtube=f.youtube??j.youtube;j.qa=f.qa??j.qa;j.cost={...j.cost,...(f.cost??{})};pushLog(j,f.state==='ready'?'Finished: every automatic check passed':'Finished: waiting for your review',at)}
 return j
}
/** Storage paths a worker may write for a job: its own folder only, plain file names. */
export function mediaPath(jobId:string,name:string):string{
 if(!/^[a-z0-9-]{8,64}$/.test(jobId)||!/^[a-z0-9][a-z0-9._-]{0,80}$/.test(name)||name.includes('..'))throw new StoryError('PATH','Invalid media path.')
 return `jobs/${jobId}/${name}`
}
