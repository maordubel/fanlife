import {guard,json,fail} from '../_http'
import {people,decide,undecide,deskLinks} from '@/lib/people/registry'
import {publicStint} from '@/lib/people/model'
import {REGISTRY} from '@/lib/master/registry'
export const dynamic='force-dynamic'
/** The People Registry's review queue: two club records that share a written name and have no verdict yet. Owner session. */
export async function GET(r:Request){
 const g=guard(r);if(g.error)return g.error
 try{
  const reg=await people(),u=new URL(r.url),club=u.searchParams.get('club')
  const items=reg.queue.filter(q=>!club||q.a.club===club||q.b.club===club).slice(0,200).map(q=>({key:q.key,name:q.name,a:publicStint(q.a),b:publicStint(q.b)}))
  const decided=(await deskLinks()).sort((x,y)=>y.on.localeCompare(x.on)).slice(0,40)
  return json({counts:reg.counts,items,decided,clubs:Object.fromEntries(REGISTRY.map(c=>[c.id,c.name]))})
 }catch(e){return fail(e)}
}
/** {action:'same'|'different'|'undo', a, b} — the owner's verdict on two club records. */
export async function POST(r:Request){
 const g=guard(r,true);if(g.error)return g.error
 const text=await r.text();if(text.length>2048)return json({error:'Request too large.'},400)
 let b:Record<string,unknown>;try{b=JSON.parse(text||'{}')}catch{return json({error:'Invalid JSON.'},400)}
 const a=String(b.a??''),c=String(b.b??''),who={actor:g.session!.actor,role:g.session!.role??'owner'}
 try{
  if(b.action==='same'||b.action==='different')return json(await decide(a,c,b.action,who))
  if(b.action==='undo')return json(await undecide(a,c))
  return json({error:'Unknown action.'},400)
 }catch(e){return fail(e)}
}
