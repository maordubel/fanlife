import {createClient} from '@supabase/supabase-js'
import {evaluationMode} from '@/lib/master/mode'
import {serverLocalClient} from '@/lib/master/evaluation-db'
import {portalConfigured} from '@/lib/portal/env'
import {INSIGHT_MAX,cleanHit,readAgent,type InsightCtx,type InsightHit} from '@/lib/analytics/insight'

/**
 * POST /api/insight — FAN LIFE INSIGHT's one door (17.11.2026).
 * The browser sends `{device, session, screen, hits[]}`; this adds what the browser should not be trusted with — the
 * country / region / city the edge resolved (Cloudflare: cf-ipcountry, and the Worker's x-fanlife-geo-* headers), the
 * device / OS / browser FAMILY read from the user-agent, the first language — and forwards it to
 * `worker_insight_record` with the public key. No IP and no user-agent string is forwarded or stored. Bots are dropped.
 */
export const runtime='nodejs'
export const dynamic='force-dynamic'
const MAX_BYTES=24_576
const none=()=>new Response(null,{status:204,headers:{'cache-control':'no-store'}})
const hits=new Map<string,{n:number;at:number}>()
function tooMany(req:Request){
 const ip=(req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')||'unknown').split(',')[0]!.trim(),now=Date.now()
 if(hits.size>5000)for(const [k,v] of hits)if(now-v.at>60_000)hits.delete(k)
 const h=hits.get(ip);if(!h||now-h.at>60_000){hits.set(ip,{n:1,at:now});return false}
 return ++h.n>150
}
const geo=(v:string|null,max=64)=>{const s=(v||'').trim();if(!s)return undefined;try{return decodeURIComponent(s).slice(0,max)}catch{return s.slice(0,max)}}

export async function POST(req:Request):Promise<Response>{
 if(!portalConfigured()||tooMany(req))return none()
 const agent=readAgent(req.headers.get('user-agent')||'')
 if(agent.bot)return none()
 let raw:{device?:unknown;session?:unknown;screen?:unknown;hits?:unknown}
 try{const t=await req.text();if(!t||t.length>MAX_BYTES)return none();raw=JSON.parse(t)}catch{return none()}
 const device=typeof raw.device==='string'&&/^[0-9a-f-]{8,64}$/.test(raw.device)?raw.device:null
 const session=typeof raw.session==='string'&&/^[0-9a-f]{16}$/.test(raw.session)?raw.session:null
 if(!device||!session||!Array.isArray(raw.hits))return none()
 const list=raw.hits.slice(0,INSIGHT_MAX).map(cleanHit).filter((h):h is InsightHit=>!!h)
 if(!list.length)return none()
 const country=(req.headers.get('cf-ipcountry')||req.headers.get('x-fanlife-geo-country')||'').toUpperCase()
 const lang=(req.headers.get('accept-language')||'').slice(0,2).toLowerCase()
 const ctx:InsightCtx={
  ...(/^[A-Z]{2}$/.test(country)&&country!=='XX'&&country!=='T1'?{country}:{}),
  region:geo(req.headers.get('x-fanlife-geo-region')),city:geo(req.headers.get('x-fanlife-geo-city')),
  device:agent.device,os:agent.os,browser:agent.browser,...(/^[a-z]{2}$/.test(lang)?{lang}:{}),
  ...(typeof raw.screen==='number'&&raw.screen>0&&raw.screen<10000?{screen:Math.round(raw.screen)}:{}),
 }
 try{
  const client=evaluationMode()?serverLocalClient():createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,{auth:{persistSession:false,autoRefreshToken:false}})
  await client.rpc('worker_insight_record',{p_device:device,p_session:session,p_ctx:ctx,p_hits:list})
 }catch{/* a lost hit is a smaller failure than a slow page */}
 return none()
}
export function GET():Response{return new Response(null,{status:405})}
