import {NextRequest, NextResponse} from 'next/server'
import {cronAuthorized} from '@/lib/master/request'
import {prepare, type Due} from '@/lib/marketing/run'
export const dynamic='force-dynamic'
export const runtime='nodejs'
const json=(d:unknown,s=200)=>NextResponse.json(d,{status:s,headers:{'Cache-Control':'no-store'}})
/**
 * DUBEL TEAM social plan (docs/fanlife/51-marketing-telegram.md). The schedule (marketing-telegram.yml) holds the bot token;
 * this route only talks to the database: POST {action:'claim'} hands over the posts that are due (each claimed once),
 * POST {action:'report', id, outcome, error} records what Telegram answered. Both are server-only RPCs (service role).
 */
async function rpc(name:string,body:Record<string,unknown>){
 const url=(process.env.FAN_LIFE_STORE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,''),key=process.env.SUPABASE_SERVICE_ROLE_KEY||''
 if(!url||!key)return {ok:false as const,status:503,error:'Supabase is not connected on this deployment.'}
 const res=await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(20_000)})
 const text=await res.text()
 if(!res.ok)return {ok:false as const,status:502,error:`database answered ${res.status}: ${text.slice(0,200)}`}
 return {ok:true as const,data:text?JSON.parse(text):null}
}
export async function POST(r:NextRequest){
 if(!cronAuthorized(r))return json({error:'Not authorised.'},401)
 let b:Record<string,unknown>={};try{b=await r.json()}catch{/* empty */}
 if(b.action==='claim'){
  const got=await rpc('worker_marketing_claim',{p_limit:3})
  if(!got.ok)return json({error:got.error},got.status)
  const posts:Due[]=Array.isArray(got.data)?got.data:[]
  // each post's own kit, kind and slot, so the backup draws the same picture as the tick and composes live slots the same way
  const meta=posts.length?await rpc('worker_marketing_meta',{p_ids:posts.map(p=>p.id)}):null
  const by=(meta?.ok&&meta.data&&typeof meta.data==='object'?meta.data:{}) as Record<string,{kit?:unknown;kind?:string;send_at?:string}>
  const cache={},out:Due[]=[]
  for(const p of posts){const m=by[String(p.id)]||{};const ready=await prepare({...p,kit:m.kit??null,kind:m.kind,send_at:m.send_at},new Date(),cache).catch(()=>null);if(ready)out.push(ready)}
  return json({posts:out})
 }
 if(b.action==='report'){
  const id=Number(b.id),outcome=String(b.outcome||'')
  if(!Number.isSafeInteger(id)||!['sent','refused','unknown'].includes(outcome))return json({error:'id and outcome are required.'},400)
  const got=await rpc('worker_marketing_report',{p_id:id,p_outcome:outcome,p_error:typeof b.error==='string'?b.error.slice(0,300):null})
  return got.ok?json(got.data):json({error:got.error},got.status)
 }
 return json({error:'action must be claim or report.'},400)
}
