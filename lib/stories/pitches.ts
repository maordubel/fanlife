/**
 * The directors' pitches (owner, 4.11.2026: "each director proposes the next film and the script he loves most, each
 * time a different club and a different event"). Pure: the store is lib/stories/pitchStore.ts, the writer is
 * scripts/football-stories/studio/pitch.py, run by .github/workflows/stories-pitch.yml (daily, and on request).
 *
 * A round is one pitch per director. Inside a round no two directors pitch the same club; across rounds a club+event
 * already pitched recently, or already filmed, is not pitched again (pitch.py chooses; `addRound` refuses a repeat as a
 * second line of defence). The owner answers each pitch with "Make this film" (a documentary job, three scripts, the
 * pitching director's first) or "Pass".
 */
import {KINDS,SEASON,SPAN,StoryError,type Brief,type Job,type Kind} from './jobs'
import {isDirector,type DirectorId} from './directors'

export type PitchState='open'|'made'|'passed'
export type Pitch={id:string;director:DirectorId;club_id:string;club_name:string;kind:Kind;season:string;match_ids:string[];opponent:string|null
 title:string;logline:string;cold_open:string;acts:string[];why:string;state:PitchState;job_id:string|null;decided_at:string|null;decided_by:string|null}
export type PitchRound={at:string;run:string|null;pitches:Pitch[]}
export type PitchDay={date:string;rounds:PitchRound[]}
export type PitchDesk={
 /** the owner's "Ask for new pitches": the listener starts the pitch run when it sees it */
 request:{at:string;by:string;dispatchedAt:string|null}|null
 /** what the last pitch run said: done (with how many), waiting for Google's free writer (until when), or failed */
 last:{at:string;state:'done'|'waiting'|'failed';saved:number;retryAt:string|null;note:string|null}|null
}
export const EMPTY_DESK:PitchDesk={request:null,last:null}

const cut=(x:unknown,n:number)=>String(x??'').replace(/\s+/g,' ').trim().slice(0,n)
const ID=/^[A-Za-z0-9:._-]{3,120}$/
/** The event a film or a pitch is about, as one key: the same match, tie, season or rivalry is the same event. */
export function eventKey(x:{club_id:string;kind?:string|null;season?:string|null;match_ids?:string[]|null;opponent?:string|null}):string{
 const kind=x.kind||'season'
 const what=kind==='rivalry'?String(x.opponent||'').toLowerCase():kind==='season'?String(x.season||''):[...(x.match_ids||[])].sort().join(',')
 return `${x.club_id}|${kind}|${what}`
}

export function cleanPitch(raw:unknown,clubs:Map<string,string>,date:string,i:number):Pitch{
 if(!raw||typeof raw!=='object')throw new StoryError('PITCH','A pitch must be an object.')
 const p=raw as Record<string,unknown>
 if(!isDirector(p.director))throw new StoryError('PITCH','Unknown director.')
 const club_id=String(p.club_id||''),club_name=clubs.get(club_id)
 if(!club_name)throw new StoryError('PITCH','Unknown club.')
 const kind=(KINDS as readonly string[]).includes(String(p.kind))?p.kind as Kind:null
 if(!kind)throw new StoryError('PITCH','Invalid kind.')
 const season=String(p.season||'')
 if(kind==='rivalry'?!SPAN.test(season)&&!SEASON.test(season):!SEASON.test(season))throw new StoryError('PITCH','Invalid season.')
 const match_ids=Array.isArray(p.match_ids)?p.match_ids.map(String):[]
 if(match_ids.some(x=>!ID.test(x))||match_ids.length>8)throw new StoryError('PITCH','Invalid match.')
 if(kind==='match'&&match_ids.length!==1)throw new StoryError('PITCH','A match pitch names one match.')
 if(kind==='tie'&&match_ids.length<2)throw new StoryError('PITCH','A tie pitch names two to eight matches.')
 const opponent=kind==='rivalry'?cut(p.opponent,80):null
 if(kind==='rivalry'&&!opponent)throw new StoryError('PITCH','A rivalry pitch names the opponent.')
 const title=cut(p.title,110),logline=cut(p.logline,320)
 if(!title||!logline)throw new StoryError('PITCH','A pitch needs a title and a logline.')
 const acts=(Array.isArray(p.acts)?p.acts:[]).map(a=>cut(a,320)).filter(Boolean).slice(0,3)
 if(!acts.length)throw new StoryError('PITCH','A pitch needs its acts.')
 return {id:`${date}-${p.director}-${i}`,director:p.director,club_id,club_name,kind,season,match_ids:kind==='match'||kind==='tie'?match_ids:[],opponent,
  title,logline,cold_open:cut(p.cold_open,600),acts,why:cut(p.why,420),state:'open',job_id:null,decided_at:null,decided_by:null}
}

/** A round into the day: one pitch per director, no two on one club, no event already pitched in the days given or
 *  already filmed. What is refused is said, never dropped silently. */
export function addRound(day:PitchDay|null,date:string,raw:unknown[],clubs:Map<string,string>,taken:Set<string>,run:string|null,now=new Date()):{day:PitchDay;saved:Pitch[];refused:string[]}{
 const d:PitchDay=day?structuredClone(day):{date,rounds:[]}
 const n0=d.rounds.reduce((s,r)=>s+r.pitches.length,0)
 const saved:Pitch[]=[],refused:string[]=[]
 const seenClub=new Set<string>(),seenDirector=new Set<string>()
 raw.slice(0,6).forEach((r,i)=>{
  try{
   const p=cleanPitch(r,clubs,date,n0+i)
   if(seenDirector.has(p.director))throw new StoryError('PITCH',`${p.director} pitched twice in one round`)
   if(seenClub.has(p.club_id))throw new StoryError('PITCH',`${p.club_name} is already another director's pitch this round`)
   if(taken.has(eventKey(p)))throw new StoryError('PITCH',`${p.club_name}: this event was already pitched or filmed`)
   seenDirector.add(p.director);seenClub.add(p.club_id);taken.add(eventKey(p));saved.push(p)
  }catch(e){refused.push(e instanceof Error?e.message:'refused')}
 })
 if(saved.length)d.rounds.push({at:now.toISOString(),run:run?cut(run,80):null,pitches:saved})
 return {day:d,saved,refused}
}

/** What pitch.py must not pitch again: every event filmed (any job), and every event pitched in the days it was given. */
export function takenEvents(days:PitchDay[],jobs:Pick<Job,'brief'|'kind'>[]):{pitched:{director:string;club_id:string;event:string;date:string;state:PitchState}[];films:{club_id:string;event:string;match_ids:string[]}[]}{
 const pitched=days.flatMap(d=>d.rounds.flatMap(r=>r.pitches.map(p=>({director:p.director,club_id:p.club_id,event:eventKey(p),date:d.date,state:p.state}))))
 const films=jobs.filter(j=>!j.kind||j.kind==='film').map(j=>({club_id:j.brief.club_id,event:eventKey(j.brief),match_ids:j.brief.match_ids??[]}))
 return {pitched,films}
}

export function findPitch(day:PitchDay,id:string):Pitch|null{
 for(const r of day.rounds)for(const p of r.pitches)if(p.id===id)return p
 return null
}
export function decidePitch(day:PitchDay,id:string,state:'made'|'passed',actor:string,jobId:string|null,now=new Date()):PitchDay{
 const d=structuredClone(day),p=findPitch(d,id)
 if(!p)throw new StoryError('NOT_FOUND','No such pitch.',404)
 if(p.state!=='open')throw new StoryError('STATE',p.state==='made'?'This film is already being made.':'This pitch was passed.',409)
 p.state=state;p.job_id=jobId;p.decided_at=now.toISOString();p.decided_by=cut(actor,80)
 return d
}

const LENGTH:Record<Kind,number>={match:5,tie:7,season:10,rivalry:10}
/** "Make this film": the documentary brief a pitch becomes — three scripts, the pitching director's first. The POST
 *  path then checks every match and opponent against the club's catalog again, exactly as a clicked film. */
export function pitchBrief(p:Pitch):Record<string,unknown>{
 return {club_id:p.club_id,kind:p.kind,season:p.season,match_ids:p.match_ids,opponent:p.opponent??undefined,duration:LENGTH[p.kind],
  // one click = the whole film (owner, 8.11.2026): the pitching director writes the one script and the studio goes straight
  // on to the picture, the Shorts and the upload pack — no second choice to make. The film is still private until approved.
  visual_style:'collage',tone:'auto',scripts:1,review:'auto',lead_director:p.director,drive:true,reel_to_telegram:false,privacy:'private',
  topic:`${p.title} — ${p.logline} Cold open: ${p.cold_open}`.slice(0,240)} satisfies Partial<Record<keyof Brief,unknown>>
}

/* ── the request and the last run ── */
const REDISPATCH_MS=40*60_000
export function requestPitches(desk:PitchDesk,actor:string,now=new Date()):PitchDesk{
 const r=desk.request
 if(r&&now.getTime()-Date.parse(r.at)<10*60_000)throw new StoryError('STATE','New pitches were asked for a few minutes ago — they are on their way.',409)
 return {...desk,request:{at:now.toISOString(),by:cut(actor,80)||'owner',dispatchedAt:null}}
}
/** Should the listener start the pitch run now? Once per request (again after 40 minutes if nothing came back), and
 *  not before Google's free writer is back when the last run was told to wait. */
export function shouldDispatch(desk:PitchDesk,now=new Date()):boolean{
 const r=desk.request
 if(!r)return false
 if(desk.last?.state==='waiting'&&desk.last.retryAt&&Date.parse(desk.last.retryAt)>now.getTime())return false
 return !r.dispatchedAt||now.getTime()-Date.parse(r.dispatchedAt)>REDISPATCH_MS
}
export function markDispatched(desk:PitchDesk,now=new Date()):PitchDesk{
 return desk.request?{...desk,request:{...desk.request,dispatchedAt:now.toISOString()}}:desk
}
/** The pitch run reports back. Done or failed closes the request; waiting keeps it, to be started again by itself. */
export function noteRun(desk:PitchDesk,s:{state:unknown;saved?:unknown;retryAt?:unknown;note?:unknown},now=new Date()):PitchDesk{
 const state=s.state==='waiting'||s.state==='failed'?s.state:'done'
 const t=Date.parse(String(s.retryAt||''))
 const retryAt=state==='waiting'?new Date(Number.isFinite(t)&&t>now.getTime()&&t<now.getTime()+36*3600_000?t:now.getTime()+20*60_000).toISOString():null
 // a run that waits is started again by the listener once the writer is back, whether the owner or the schedule asked
 return {request:state==='waiting'?{...(desk.request??{at:now.toISOString(),by:'schedule'}),dispatchedAt:null}:null,
  last:{at:now.toISOString(),state,saved:Math.max(0,Math.min(6,Number(s.saved)||0)),retryAt,note:s.note?cut(s.note,300):null}}
}
