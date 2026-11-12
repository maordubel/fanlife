import 'server-only'
import {randomUUID} from 'crypto'
import {StoryError,newJob,newSpecialJob,validateBrief,validateCasefile,validateClassified,validateShort,validateVlog,type Job,type VlogMatch} from './jobs'
import {clubNames,paletteFor,storyClubs} from './clubs'
import {createJob,listJobs} from './store'
import {catalogOf} from './catalog'
import {readClassified} from './classified'
import {validatePromo} from './promo'
import {filmTitle} from './social'

/**
 * Every way a job is queued, in one place: a clicked documentary, a director's pitch ("Make this film"), a CLASSIFIED
 * FILE and an I WAS THERE vlog. An idempotency key makes a double click one job, not two; every choice is checked
 * against the archive again on the server.
 */
async function existing(key:string):Promise<Job|null>{
 return (await listJobs(200)).find(j=>j.idempotencyKey===key)??null
}
export function idemKey(v:unknown):string{
 if(typeof v==='string'&&/^[A-Za-z0-9-]{8,64}$/.test(v))return v
 throw new StoryError('BRIEF','Missing idempotency key.')
}

/** `prepare` marks the new job before it is saved (the autopilot's pick), so the mark and the job are one write. */
export async function createFilm(raw:unknown,actor:string,key:string,prepare?:(j:Job)=>Job):Promise<{job:Job;created:boolean}>{
 const dup=await existing(key)
 if(dup)return {job:dup,created:false}
 const brief=validateBrief(await fromCatalog(raw),clubNames())
 const offer=(await storyClubs()).find(c=>c.id===brief.club_id)
 if(!offer)throw new StoryError('BRIEF','This club has no match records the studio can read yet. Choose a club from the list.')
 if(brief.kind!=='rivalry'&&!offer.seasons.some(s=>s.season===brief.season))throw new StoryError('BRIEF',`${offer.name} ${brief.season}: no match records the studio can read. Choose a season from the list.`)
 const made=newJob(randomUUID(),brief,paletteFor(brief.club_id),actor||'owner',key),job=prepare?prepare(made):made
 if(!await createJob(job))throw new StoryError('CONFLICT','Could not save the job.',409)
 return {job,created:true}
}

export async function createClassified(raw:unknown,actor:string,key:string):Promise<{job:Job;created:boolean}>{
 const dup=await existing(key)
 if(dup)return {job:dup,created:false}
 const files=await readClassified()
 if(!files)throw new StoryError('CLASSIFIED','The CLASSIFIED episodes cannot be read on this server.',503)
 const x=validateClassified(raw,files,actor||'owner')
 const busy=(await listJobs(200)).find(j=>j.kind==='classified'&&(j.spec as {file?:string})?.file===x.spec.file&&['queued','running','paused','cancel_requested'].includes(j.state))
 if(busy)throw new StoryError('STATE',`FILE ${x.spec.number} is already in production.`,409)
 const palette={club_id:'classified',club_name:'CLASSIFIED',primary:'#15130F',on_primary:'#FFFBF2',bans:[]}
 const job=newSpecialJob(randomUUID(),'classified',x,palette,actor||'owner',key)
 if(!await createJob(job))throw new StoryError('CONFLICT','Could not save the job.',409)
 return {job,created:true}
}

/** An animated Short on Google Flow (owner, 8.11.2026): one match → the script and the Flow pack, then the edit. */
export async function createShort(raw:unknown,actor:string,key:string):Promise<{job:Job;created:boolean}>{
 const dup=await existing(key)
 if(dup)return {job:dup,created:false}
 const b=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>
 const cat=await catalogOf(String(b.club_id||''))
 const find=(_club:string,id:string):VlogMatch|null=>{const m=cat?.matches.find(x=>x.id===id);return m?{id:m.id,date:m.date,season:m.season,competition:m.competition,home:m.home,away:m.away,score:m.score}:null}
 const x=validateShort(raw,clubNames(),find)
 const job=newSpecialJob(randomUUID(),'short',x,paletteFor(x.spec.club_id),actor||'owner',key)
 if(!await createJob(job))throw new StoryError('CONFLICT','Could not save the job.',409)
 return {job,created:true}
}

export async function createVlog(raw:unknown,actor:string,key:string):Promise<{job:Job;created:boolean}>{
 const dup=await existing(key)
 if(dup)return {job:dup,created:false}
 const b=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>
 const cat=await catalogOf(String(b.club_id||''))
 const find=(_club:string,id:string):VlogMatch|null=>{const m=cat?.matches.find(x=>x.id===id);return m?{id:m.id,date:m.date,season:m.season,competition:m.competition,home:m.home,away:m.away,score:m.score}:null}
 const x=validateVlog(raw,clubNames(),find)
 const job=newSpecialJob(randomUUID(),'vlog',x,paletteFor(x.spec.club_id),actor||'owner',key)
 if(!await createJob(job))throw new StoryError('CONFLICT','Could not save the job.',409)
 return {job,created:true}
}

/** A match, a tie or a rivalry names its matches; the season, the focus window and the span are read from the catalog,
 *  never typed — so a film is always about records the worker can research. */
export async function fromCatalog(raw:unknown):Promise<unknown>{
 if(!raw||typeof raw!=='object')return raw
 const b={...(raw as Record<string,unknown>)}
 const kind=b.kind
 if(kind!=='match'&&kind!=='tie'&&kind!=='rivalry')return b
 const c=await catalogOf(String(b.club_id||''))
 if(!c)throw new StoryError('BRIEF','This club has no readable archive yet.')
 if(kind==='rivalry'){
  const o=c.opponents.find(x=>x.name===b.opponent)
  if(!o||o.played<2)throw new StoryError('BRIEF','Choose an opponent from the list.')
  return {...b,season:`${o.first.slice(0,4)}–${o.last.slice(0,4)}`,focus_from:null,focus_to:null,story_words:o.derby?'derby':'',sides:[o.name]}
 }
 const ids=Array.isArray(b.match_ids)?b.match_ids.map(String):[]
 const rows=ids.map(id=>c.matches.find(m=>m.id===id))
 if(!ids.length||rows.some(m=>!m))throw new StoryError('BRIEF','Choose the match from the list.')
 const ms=rows as NonNullable<typeof rows[number]>[]
 const seasons=new Set(ms.map(m=>m.season))
 if(seasons.size>1)throw new StoryError('BRIEF','The matches of one film must be from one season.')
 const dates=ms.map(m=>m.date).sort()
 // the words a Drive pack about these matches would be named with (studio/drive_scan.py): sides, competition, years
 const story_words=[...new Set(ms.flatMap(m=>[m.competition??'',m.stage??'',m.date.slice(0,4)]))].join(' ').slice(0,300)
 const sides=[...new Set(ms.flatMap(m=>[m.home,m.away]))].slice(0,8)
 return {...b,season:ms[0]!.season,focus_from:dates[0],focus_to:dates[dates.length-1],story_words,sides}
}

/** A marketing film (owner, 8.11.2026): a feature, the channel, a finished film, or the owner's own words. */
export async function createPromo(raw:unknown,actor:string,key:string):Promise<{job:Job;created:boolean}>{
 const dup=await existing(key)
 if(dup)return {job:dup,created:false}
 const films=new Map((await listJobs(200)).filter(j=>j.kind!=='promo'&&(j.state==='ready'||j.upload?.state==='done')).map(j=>[j.id,{
  title:filmTitle(j),description:String((j.youtube as {description?:string}|null)?.description||j.brief.topic||'').slice(0,1800),
  url:j.upload?.videoId?`https://youtu.be/${j.upload.videoId}`:''}]))
 const x=validatePromo(raw,films)
 const palette={club_id:'promo',club_name:'FAN LIFE',primary:'#B02D10',on_primary:'#FFFBF2',bans:[]}
 const job=newSpecialJob(randomUUID(),'promo',x,palette,actor||'owner',key)
 if(!await createJob(job))throw new StoryError('CONFLICT','Could not save the job.',409)
 return {job,created:true}
}

/** A CLASSIFIED FILE written by the studio's writers' room (a new story, or a rewrite of an existing FILE). */
export async function createCasefile(raw:unknown,actor:string,key:string):Promise<{job:Job;created:boolean}>{
 const dup=await existing(key)
 if(dup)return {job:dup,created:false}
 const files=await readClassified()??[]
 const x=validateCasefile(raw,files)
 const palette={club_id:'classified',club_name:'CLASSIFIED',primary:'#15130F',on_primary:'#FFFBF2',bans:[]}
 const job=newSpecialJob(randomUUID(),'casefile',x,palette,actor||'owner',key)
 if(!await createJob(job))throw new StoryError('CONFLICT','Could not save the job.',409)
 return {job,created:true}
}
