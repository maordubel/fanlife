import {adminFromRequest} from '@/lib/master/admin'
import {readIdeas} from '@/lib/stories/catalog'
import {listJobs} from '@/lib/stories/store'
import {jobKind} from '@/lib/stories/jobs'
import {fail,json} from '@/lib/stories/http'
export const dynamic='force-dynamic'
export const runtime='nodejs'

/** GET → the matches the studio recommends (studio/evidence.py: the most it holds about a night first), each marked with
 *  what was already made of it — a documentary, an animated Short — so the desk never suggests the same night twice. */
export async function GET(r:Request){
 if(!adminFromRequest(r))return json({error:'Not authorised.'},401)
 try{
  const [ideas,jobs]=await Promise.all([readIdeas(),listJobs(200)])
  const made=new Map<string,string[]>()
  for(const j of jobs){
   if(['cancelled','failed'].includes(j.state))continue
   const k=jobKind(j),id=(j.brief.match_ids??[])[0]
   if(!id||(k!=='film'&&k!=='short'))continue
   made.set(id,[...(made.get(id)??[]),k==='film'?'documentary':'short'])
  }
  return json({ideas:ideas.map(i=>({...i,made:made.get(i.id)??[]}))})
 }catch(e){return fail(e)}
}
