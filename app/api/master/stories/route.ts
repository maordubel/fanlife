import {randomUUID} from 'crypto'
import {adminFromRequest} from '@/lib/master/admin'
import {StoryError,newJob,validateBrief} from '@/lib/stories/jobs'
import {clubNames,paletteFor,storyClubs} from '@/lib/stories/clubs'
import {createJob,listJobs} from '@/lib/stories/store'
import {readHealth} from '@/lib/stories/health'
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
  const brief=validateBrief(b.brief,clubNames())
  const offer=(await storyClubs()).find(c=>c.id===brief.club_id)
  if(!offer)throw new StoryError('BRIEF','This club has no match records the studio can read yet. Choose a club from the list.')
  if(!offer.seasons.some(s=>s.season===brief.season))throw new StoryError('BRIEF',`${offer.name} ${brief.season}: no match records the studio can read. Choose a season from the list.`)
  const job=newJob(randomUUID(),brief,paletteFor(brief.club_id),s.actor||'owner',key)
  if(!await createJob(job))throw new StoryError('CONFLICT','Could not save the job.',409)
  return json({job},201)
 }catch(e){return fail(e)}
}
