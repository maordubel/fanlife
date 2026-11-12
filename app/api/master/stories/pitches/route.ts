import {adminFromRequest} from '@/lib/master/admin'
import {StoryError} from '@/lib/stories/jobs'
import {decidePitch,findPitch,pitchBrief,requestPitches} from '@/lib/stories/pitches'
import {readPitchDays,updatePitchDay,updatePitchDesk} from '@/lib/stories/pitchStore'
import {createFilm,idemKey} from '@/lib/stories/create'
import {setAutopilot} from '@/lib/stories/autopilotStore'
import {body,fail,json,limited,sameOrigin} from '@/lib/stories/http'
export const dynamic='force-dynamic'
export const runtime='nodejs'

/**
 * The owner's answers to the directors (studio desk → Directors):
 *   {action:'request'}                         → "Ask for new pitches": the listener starts the pitch run (stories-pitch.yml)
 *   {action:'make',date,id,idempotencyKey}     → a documentary job from the pitch: three scripts, the pitching director's first
 *   {action:'pass',date,id}                    → the pitch is set aside; its club and event are not pitched again soon
 *   {action:'autopilot',on}                    → THE switch of the autopilot (lib/stories/autopilotStore.ts), on or off
 */
export async function POST(r:Request){
 const s=adminFromRequest(r)
 if(!s)return json({error:'Not authorised.'},401)
 if(!sameOrigin(r))return json({error:'Invalid request origin.'},403)
 if(limited('pitches',20,60_000))return json({error:'Too many actions; wait a moment.'},429)
 const actor=s.actor||'owner'
 try{
  const b=await body(r) as {action?:unknown;date?:unknown;id?:unknown;idempotencyKey?:unknown;on?:unknown}
  if(b.action==='autopilot'){if(typeof b.on!=='boolean')throw new StoryError('ACTION','On or off.');return json({autopilot:await setAutopilot(b.on,actor)})}
  if(b.action==='request')return json({desk:await updatePitchDesk(d=>requestPitches(d,actor))})
  const date=String(b.date||''),id=String(b.id||'')
  if(b.action==='pass')return json({day:await updatePitchDay(date,d=>{if(!d)throw new StoryError('NOT_FOUND','No such pitch.',404);return decidePitch(d,id,'passed',actor,null)})})
  if(b.action==='make'){
   const day=(await readPitchDays(30)).find(d=>d.date===date)
   const p=day&&findPitch(day,id)
   if(!p)throw new StoryError('NOT_FOUND','No such pitch.',404)
   if(p.state!=='open')throw new StoryError('STATE',p.state==='made'?'This film is already being made.':'This pitch was passed.',409)
   const {job}=await createFilm(pitchBrief(p),actor,idemKey(b.idempotencyKey))
   const next=await updatePitchDay(date,d=>{const x=d&&findPitch(d,id);if(!d||!x)throw new StoryError('NOT_FOUND','No such pitch.',404);return x.state==='open'?decidePitch(d,id,'made',actor,job.id):d})
   return json({job,day:next},201)
  }
  throw new StoryError('ACTION','Unknown action.')
 }catch(e){return fail(e)}
}
