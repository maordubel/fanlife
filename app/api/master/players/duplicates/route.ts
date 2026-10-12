import {guard,json,fail} from '../_http'
import {duplicateCandidates} from '@/lib/players/merge'
import {distinctPairs,forgetKeepBoth,keepBoth} from '@/lib/players/distinct'
export const dynamic='force-dynamic'
export async function GET(r:Request){const g=guard(r);if(g.error)return g.error;try{const c=new URL(r.url).searchParams.get('club');return json({...(await duplicateCandidates(c?c.split(',').slice(0,8):undefined)),kept:(await distinctPairs()).slice(0,50)})}catch(e){return fail(e)}}
/** "Two different men — keep both" (`keep-both`) and its undo (`forget`). The owner's session and a same-site request, like every write. */
export async function POST(r:Request){
 const g=guard(r,true);if(g.error)return g.error
 const text=await r.text();if(text.length>2048)return json({error:'Request too large.'},400)
 let b:Record<string,unknown>;try{b=JSON.parse(text||'{}')}catch{return json({error:'Invalid JSON.'},400)}
 const club=String(b.club??''),a=String(b.a??''),c=String(b.b??''),who={actor:g.session!.actor,role:g.session!.role??'owner'}
 try{
  if(b.action==='keep-both')return json(await keepBoth(club,a,c,who))
  if(b.action==='forget')return json(await forgetKeepBoth(club,a,c))
  return json({error:'Unknown action.'},400)
 }catch(e){return fail(e)}
}
