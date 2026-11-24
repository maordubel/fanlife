import {NextResponse} from 'next/server'
import {adminOrCron} from '@/lib/master/admin'
import {sameOrigin} from '@/lib/master/request'
import {buildCampaign,inputFrom} from '@/lib/marketing/campaigns'
export const dynamic='force-dynamic'
const json=(d:unknown,s=200)=>NextResponse.json(d,{status:s,headers:{'Cache-Control':'no-store'}})

/** the database's own campaign RPCs (migration 20261124050000_worker_marketing_campaigns.sql), service role only */
async function rpc(name:string,body:Record<string,unknown>){
 const url=(process.env.FAN_LIFE_STORE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,''),key=process.env.SUPABASE_SERVICE_ROLE_KEY||''
 if(!url||!key)throw new Error('Supabase is not connected on this deployment.')
 const res=await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(20_000)})
 const text=await res.text()
 if(!res.ok)throw new Error(`The database answered ${res.status}: ${text.slice(0,200)}`)
 return text?JSON.parse(text):null
}

export async function GET(r:Request){
 const who=adminOrCron(r);if(!who)return json({error:'Sign in to the control room first.',login:'/master/login'},401)
 try{return json({campaigns:await rpc('worker_marketing_campaigns',{p_days:120})})}catch(e){return json({error:(e as Error).message},502)}
}

export async function POST(r:Request){
 const who=adminOrCron(r);if(!who)return json({error:'Sign in to the control room first.',login:'/master/login'},401)
 if(who.role!=='cron'){try{sameOrigin(r)}catch{return json({error:'Cross-site request refused.'},403)}}
 let b:Record<string,unknown>={};try{b=await r.json()}catch{/* empty */}
 try{
  if(b.action==='preview'||b.action==='launch'){
   const built=buildCampaign(inputFrom(b))
   if(b.action==='preview')return json({campaign:built.campaign,rows:built.rows.map(x=>({at:x.at,t:x.main.kit.t,label:x.main.label,hook:x.main.hook,held:!!x.held}))})
   const out=await rpc('worker_marketing_campaign_add',{p_rows:built.rows})
   return json({ok:true,campaign:built.campaign,...out})
  }
  if(b.action==='set'){
   const id=String(b.id||''),state=String(b.state||'')
   if(!/^[a-z0-9-]{3,80}$/.test(id)||!['pause','resume','stop'].includes(state))return json({error:'id and state (pause, resume, stop) are required.'},400)
   return json(await rpc('worker_marketing_campaign_set',{p_id:id,p_state:state}))
  }
  return json({error:'action must be preview, launch or set.'},400)
 }catch(e){return json({error:(e as Error).message},400)}
}
