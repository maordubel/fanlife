import {guard,json,fail} from '../../_http'
import {playerDetail,saveDraft,discardDraft,publish,revert,impactOf,quickEdit} from '@/lib/players/service'
import {mergePreview,mergePlayers,unmerge} from '@/lib/players/merge'
import {parsePatch} from '@/lib/players/validate'
export const dynamic='force-dynamic'
type Ctx={params:{club:string;id:string}}
const id=(c:Ctx)=>({club:decodeURIComponent(c.params.club),id:decodeURIComponent(c.params.id)})
export async function GET(r:Request,c:Ctx){const g=guard(r);if(g.error)return g.error;try{const d=await playerDetail(id(c).club,id(c).id);return d?json(d):json({error:'No such player at this club.'},404)}catch(e){return fail(e)}}
/** One POST, one `action`: preview · draft · discard · publish · quick (price/score from the table, publishes at once, no reason box) · revert. A body larger than 8 KB is refused. */
export async function POST(r:Request,c:Ctx){
 const g=guard(r,true);if(g.error)return g.error
 const text=await r.text();if(text.length>8192)return json({error:'Request too large.'},400)
 let b:Record<string,unknown>;try{b=JSON.parse(text||'{}')}catch{return json({error:'Invalid JSON.'},400)}
 const {club,id:pid}=id(c),who={actor:g.session!.actor,role:g.session!.role??'owner'}
 try{
  switch(b.action){
   case 'preview':{const p=parsePatch(b.patch);if(!p.ok)return json({error:p.error},400);const i=await impactOf(club,pid,p.patch);return i?json({impact:i}):json({error:'No such player at this club.'},404)}
   case 'draft':return json({draft:await saveDraft(club,pid,b.patch,Number(b.expectedRev??0),who)})
   case 'discard':await discardDraft(club,pid,who);return json({ok:true})
   case 'publish':return json(await publish(club,pid,{reason:String(b.reason??''),confirmQuota:b.confirmQuota===true,ownerException:b.ownerException===true,...(b.patch!==undefined?{patch:b.patch,expectedRev:Number(b.expectedRev??0)}:{})},who))
   case 'quick':return json(await quickEdit(club,pid,b.patch,{expectedRev:Number(b.expectedRev??0),confirmQuota:b.confirmQuota===true,confirmName:b.confirmName===true},who))
   case 'revert':return json(await revert(club,pid,String(b.eventId??''),String(b.reason??''),who))
   case 'merge-preview':return json({preview:await mergePreview(club,pid,String(b.dropId??''))})
   case 'merge':return json(await mergePlayers(club,pid,String(b.dropId??''),{reason:String(b.reason??''),price:b.price as 'keep'|'drop'|'higher'|undefined,confirmQuota:b.confirmQuota===true,ownerException:b.ownerException===true},who))
   case 'unmerge':return json(await unmerge(club,pid,String(b.reason??''),who))
   default:return json({error:'Unknown action.'},400)
  }
 }catch(e){return fail(e)}
}
