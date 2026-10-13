import {sameOrigin} from '@/lib/master/request'
import {addSuggestion,cleanSuggestion,deviceKey} from '@/lib/home/suggestions'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const MAX_BYTES=1024
const reply=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}})

/** POST /api/suggest-club { text, site } — site is a honeypot: a real person leaves it empty. */
export async function POST(r:Request):Promise<Response>{
 try{sameOrigin(r)}catch{return reply(403,{ok:false,error:'origin'})}
 const raw=await r.text().catch(()=>'')
 if(!raw||raw.length>MAX_BYTES)return reply(400,{ok:false,error:'size'})
 let b:{text?:unknown;site?:unknown}
 try{b=JSON.parse(raw)}catch{return reply(400,{ok:false,error:'json'})}
 if(typeof b.site==='string'&&b.site)return reply(200,{ok:true}) // a bot: look successful, store nothing
 const text=cleanSuggestion(b.text)
 if(!text)return reply(400,{ok:false,error:'text'})
 const ip=(r.headers.get('x-forwarded-for')||'').split(',')[0]!.trim()||'-',ua=(r.headers.get('user-agent')||'').slice(0,120)
 try{
  const out=await addSuggestion(text,deviceKey(ip,ua))
  return out.ok?reply(200,{ok:true}):reply(429,out)
 }catch{return reply(503,{ok:false,error:'store'})}
}
