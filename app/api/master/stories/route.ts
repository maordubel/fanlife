import {adminFromRequest} from '@/lib/master/admin'
import {StoryError} from '@/lib/stories/jobs'
import {storyClubs} from '@/lib/stories/clubs'
import {listJobs,pendingDeletions} from '@/lib/stories/store'
import {readHealth} from '@/lib/stories/health'
import {createClassified,createFilm,createVlog,idemKey} from '@/lib/stories/create'
import {body,fail,json,limited,sameOrigin} from '@/lib/stories/http'
export const dynamic='force-dynamic'
export const runtime='nodejs'

/** GET: the owner's jobs (newest first — films, CLASSIFIED FILEs and vlogs), the clubs a film can be made about, and
 *  whether the studio can work now. The desk's slower facts (episodes, pitches, social lights) are /stories/desk. */
export async function GET(r:Request){
 if(!adminFromRequest(r))return json({error:'Not authorised.'},401)
 try{const [jobs,clubs,health,cleanup]=await Promise.all([listJobs(),storyClubs(),readHealth(),pendingDeletions(new Date(),false)]);return json({jobs,clubs,health,cleanupPending:cleanup.length})}catch(e){return fail(e)}
}
/** POST: queue a job — a documentary (`kind` absent or 'film'), a CLASSIFIED FILE or an I WAS THERE vlog. */
export async function POST(r:Request){
 const s=adminFromRequest(r)
 if(!s)return json({error:'Not authorised.'},401)
 if(!sameOrigin(r))return json({error:'Invalid request origin.'},403)
 if(limited('create',6,10*60_000))return json({error:'Too many jobs queued in a short time. Wait a few minutes.'},429)
 try{
  const b=await body(r) as {brief?:unknown;idempotencyKey?:unknown;kind?:unknown}
  const key=idemKey(b.idempotencyKey),actor=s.actor||'owner'
  const kind=b.kind===undefined||b.kind==='film'?'film':b.kind
  if(kind!=='film'&&kind!=='classified'&&kind!=='vlog')throw new StoryError('BRIEF','Unknown kind of job.')
  const out=kind==='classified'?await createClassified(b.brief,actor,key):kind==='vlog'?await createVlog(b.brief,actor,key):await createFilm(b.brief,actor,key)
  return json({job:out.job},out.created?201:200)
 }catch(e){return fail(e)}
}
