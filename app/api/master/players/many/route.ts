import {guard,json,fail} from '../_http'
import {quickMany} from '@/lib/players/many'
export const dynamic='force-dynamic'
export const maxDuration=60
/** POST {items:[{club,id,expectedRev}], change:{price:1..5}|{addPosition:'GK'|'DF'|'MF'|'FW'}, confirmQuota?} — admin session + same origin; a body over 64 KB is refused. */
export async function POST(r:Request){
 const g=guard(r,true);if(g.error)return g.error
 const text=await r.text();if(text.length>65536)return json({error:'Request too large.'},400)
 let b:Record<string,unknown>;try{b=JSON.parse(text||'{}')}catch{return json({error:'Invalid JSON.'},400)}
 const who={actor:g.session!.actor,role:g.session!.role??'owner'}
 try{return json(await quickMany(b.items as never,b.change,{confirmQuota:b.confirmQuota===true},who))}catch(e){return fail(e)}
}
