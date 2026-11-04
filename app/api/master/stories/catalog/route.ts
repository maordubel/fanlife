import {adminFromRequest} from '@/lib/master/admin'
import {catalogOf,findMatches} from '@/lib/stories/catalog'
import {json} from '@/lib/stories/http'
export const dynamic='force-dynamic'
export const runtime='nodejs'

/** GET ?club=&q=&season=&tag=&opponent=&order= → the matches a film can be about (filtered, at most 120), the club's
 *  seasons and its opponents. Owner only, like the rest of the studio. */
export async function GET(r:Request){
 if(!adminFromRequest(r))return json({error:'Not authorised.'},401)
 const u=new URL(r.url),p=(k:string)=>u.searchParams.get(k)?.slice(0,80)||undefined
 const c=await catalogOf(p('club')||'')
 if(!c)return json({error:'This club has no readable archive yet.'},404)
 const order=p('order')==='new'?'new':'big'
 const {matches,total}=findMatches(c,{q:p('q'),season:p('season'),tag:p('tag'),opponent:p('opponent'),order,limit:Number(p('limit'))||40})
 return json({club_id:c.club_id,seasons:Object.entries(c.seasons).map(([season,matches])=>({season,matches})),opponents:c.opponents.filter(o=>o.played>=2).slice(0,200),matches,total})
}
