import {randomUUID} from 'crypto'
import {adminFromRequest} from '@/lib/master/admin'
import {StoryError,newJob,validateBrief} from '@/lib/stories/jobs'
import {clubNames,paletteFor,storyClubs} from '@/lib/stories/clubs'
import {createJob,listJobs} from '@/lib/stories/store'
import {readHealth} from '@/lib/stories/health'
import {catalogOf} from '@/lib/stories/catalog'
import {body,fail,json,limited,sameOrigin} from '@/lib/stories/http'
export const dynamic='force-dynamic'
export const runtime='nodejs'

/** GET: the owner's films (newest first), the clubs a film can be made about, and whether the studio can work now. */
export async function GET(r:Request){
 if(!adminFromRequest(r))return json({error:'Not authorised.'},401)
 try{const [jobs,clubs,health]=await Promise.all([listJobs(),storyClubs(),readHealth()]);return json({jobs,clubs,health})}catch(e){return fail(e)}
}
/** POST: queue a new film. An idempotency key makes a double click one job, not two. */
export async function POST(r:Request){
 const s=adminFromRequest(r)
 if(!s)return json({error:'Not authorised.'},401)
 if(!sameOrigin(r))return json({error:'Invalid request origin.'},403)
 if(limited('create',6,10*60_000))return json({error:'Too many films queued in a short time. Wait a few minutes.'},429)
 try{
  const b=await body(r) as {brief?:unknown;idempotencyKey?:unknown}
  const key=typeof b.idempotencyKey==='string'&&/^[A-Za-z0-9-]{8,64}$/.test(b.idempotencyKey)?b.idempotencyKey:null
  if(!key)throw new StoryError('BRIEF','Missing idempotency key.')
  const existing=(await listJobs(200)).find(j=>j.idempotencyKey===key)
  if(existing)return json({job:existing},200)
  const brief=validateBrief(await fromCatalog(b.brief),clubNames())
  const offer=(await storyClubs()).find(c=>c.id===brief.club_id)
  if(!offer)throw new StoryError('BRIEF','This club has no match records the studio can read yet. Choose a club from the list.')
  if(brief.kind!=='rivalry'&&!offer.seasons.some(s=>s.season===brief.season))throw new StoryError('BRIEF',`${offer.name} ${brief.season}: no match records the studio can read. Choose a season from the list.`)
  const job=newJob(randomUUID(),brief,paletteFor(brief.club_id),s.actor||'owner',key)
  if(!await createJob(job))throw new StoryError('CONFLICT','Could not save the job.',409)
  return json({job},201)
 }catch(e){return fail(e)}
}

/** A match, a tie or a rivalry names its matches; the season, the focus window and the span are read from the catalog,
 *  never typed — so a film is always about records the worker can research. */
async function fromCatalog(raw:unknown):Promise<unknown>{
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

