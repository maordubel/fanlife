import {randomUUID} from 'crypto'
import {adminFromRequest} from '@/lib/master/admin'
import {StoryError,newJob,validateBrief} from '@/lib/stories/jobs'
import {clubNames,paletteFor,storyClubs} from '@/lib/stories/clubs'
import {createJob,listJobs} from '@/lib/stories/store'
import {body,fail,json,limited,sameOrigin} from '@/lib/stories/http'
export const dynamic='force-dynamic'
export const runtime='nodejs'

/** GET: the owner's films (newest first) and the clubs a film can be made about. */
export async function GET(r:Request){
 if(!adminFromRequest(r))return json({error:'Not authorised.'},401)
 try{return json({jobs:await listJobs(),clubs:storyClubs()})}catch(e){return fail(e)}
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
  const job=newJob(randomUUID(),brief,paletteFor(brief.club_id),s.actor||'owner',key)
  if(!await createJob(job))throw new StoryError('CONFLICT','Could not save the job.',409)
  return json({job},201)
 }catch(e){return fail(e)}
}
