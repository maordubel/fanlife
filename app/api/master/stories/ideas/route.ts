import {adminFromRequest} from '@/lib/master/admin'
import {catalogOf,readIdeas,type Catalog} from '@/lib/stories/catalog'
import {upcomingIdeas} from '@/lib/stories/upcoming'
import {getFixtureFeed} from '@/lib/fixtures/service'
import {REGISTRY} from '@/lib/master/registry'
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
  // the fixtures coming in the next three weeks, as films the archive can carry (owner, 10.11.2026)
  let upcoming:ReturnType<typeof upcomingIdeas>=[]
  try{
   const feed=await getFixtureFeed()
   const ids=[...new Set(feed.fixtures.map(f=>f.clubId))]
   const cats=new Map<string,Catalog>();for(const id of ids){const c=await catalogOf(id);if(c)cats.set(id,c)}
   upcoming=upcomingIdeas(feed.fixtures,cats,new Map(REGISTRY.map(c=>[c.id,c.name])))
  }catch{/* the fixture provider is down: the archive ideas still stand */}
  const recent=Date.now()-40*86_400_000
  const previews=new Set(jobs.filter(j=>!['cancelled','failed'].includes(j.state)&&j.brief.kind==='rivalry'&&Date.parse(j.createdAt)>recent).map(j=>`${j.brief.club_id}|${j.brief.opponent}`))
  return json({ideas:ideas.map(i=>({...i,made:made.get(i.id)??[]})),
   upcoming:upcoming.map(u=>({...u,previewMade:previews.has(`${u.club_id}|${u.opponent}`),bestMade:u.best?made.get(u.best.id)??[]:[]}))})
 }catch(e){return fail(e)}
}
