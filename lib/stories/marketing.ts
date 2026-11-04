import 'server-only'

/** What the social plan (docs/fanlife/61 · 51) has already sent today — the FAN LIFE feed posts the database recorded
 *  (public.worker_marketing_today, service role). Null = the database could not be asked: "not connected", never zero. */
export type PlanPost={at:string;label:string|null;hook:string|null;url:string}
export async function marketingToday():Promise<PlanPost[]|null>{
 const base=(process.env.FAN_LIFE_STORE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,''),key=process.env.SUPABASE_SERVICE_ROLE_KEY||''
 if(!base||!key)return null
 try{
  const r=await fetch(`${base}/rest/v1/rpc/worker_marketing_today`,{method:'POST',cache:'no-store',signal:AbortSignal.timeout(5000),headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'},body:'{}'})
  if(!r.ok)return null
  const rows=await r.json() as unknown
  return Array.isArray(rows)?rows.filter((p:PlanPost)=>typeof p?.url==='string').slice(0,40):null
 }catch{return null}
}
