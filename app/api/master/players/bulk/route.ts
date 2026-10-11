import {guard,json,fail} from '../_http'
import {bulkPreview,bulkCommit,MAX_BYTES} from '@/lib/players/bulk'
export const dynamic='force-dynamic'
export const maxDuration=60
/** POST {action:'preview'|'commit', csv, token?, idempotencyKey?, reason?, confirmQuota?, ownerException?} — owner session + same origin; a body over 1 MB is refused. */
export async function POST(r:Request){
 const g=guard(r,true);if(g.error)return g.error
 const text=await r.text();if(text.length>MAX_BYTES+4096)return json({error:'The file is larger than 1 MB.'},400)
 let b:Record<string,unknown>;try{b=JSON.parse(text||'{}')}catch{return json({error:'Invalid JSON.'},400)}
 if(typeof b.csv!=='string')return json({error:'csv is required.'},400)
 const who={actor:g.session!.actor,role:g.session!.role??'owner'}
 try{
  if(b.action==='preview')return json(await bulkPreview(b.csv))
  if(b.action==='commit')return json(await bulkCommit(b.csv,{token:String(b.token??''),idempotencyKey:String(b.idempotencyKey??''),reason:String(b.reason??''),confirmQuota:b.confirmQuota===true,ownerException:b.ownerException===true},who))
  return json({error:'Unknown action.'},400)
 }catch(e){return fail(e)}
}
