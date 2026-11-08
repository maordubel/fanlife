import 'server-only'
import {durable} from '@/lib/master/durable'
import {BUCKET} from './media'

/**
 * Is the studio able to make a film right now? Three facts the owner should never have to guess (4.11.2026):
 *   · the listener — `stories-watch.yml` asks for work every three minutes and reports here (throttled to one write in 4 min);
 *   · the script writer — the listener checks the key it holds (GEMINI_API_KEY, …) against the provider, not just its
 *     presence, because a key pasted wrong looks exactly like a key that works until a film fails at "Script";
 *   · storage — the private bucket the films are delivered to.
 * The listener file lives outside `stories/` so a heartbeat never touches the job list's cache.
 */
const NAME='studio/health.json'
const STALE_MS=10*60_000
const WRITE_EVERY_MS=4*60_000

export type Writer={provider:'gemini'|'anthropic'|'openai'|'none';ok:boolean|null;model?:string;note?:string}
export type Heartbeat={at:string;run?:string;writer:Writer}
export type Health={listener:{ok:boolean;at:string|null};writer:Writer|null;storage:{ok:boolean;note?:string}}

const PROVIDERS=new Set(['gemini','anthropic','openai','none'])
const clip=(s:unknown,n:number)=>typeof s==='string'?s.replace(/[^\w .,:;()'/+-]/g,'').slice(0,n):undefined

/** What a heartbeat may carry: nothing but a provider name, a yes/no, a model id and a short note. */
export function cleanHeartbeat(raw:unknown,run?:string):Heartbeat|null{
 if(!raw||typeof raw!=='object')return null
 const w=(raw as {writer?:Record<string,unknown>}).writer
 if(!w||typeof w!=='object'||!PROVIDERS.has(String(w.provider)))return null
 return {at:new Date().toISOString(),run:clip(run,80),writer:{provider:w.provider as Writer['provider'],ok:typeof w.ok==='boolean'?w.ok:null,model:clip(w.model,60),note:clip(w.note,160)}}
}

export async function noteHeartbeat(h:Heartbeat):Promise<void>{
 const d=durable()
 if(!d||d.kind==='memory')return
 const cur=await d.read(NAME,{fresh:true,soft:true}).catch(()=>null)
 let prev:Heartbeat|null=null
 try{prev=cur?JSON.parse(cur.text) as Heartbeat:null}catch{prev=null}
 const same=prev&&JSON.stringify(prev.writer)===JSON.stringify(h.writer)
 if(prev&&same&&Date.now()-Date.parse(prev.at)<WRITE_EVERY_MS)return
 await d.write(NAME,JSON.stringify(h),cur?.etag??null).catch(()=>false)
}

async function storageOk():Promise<{ok:boolean;note?:string}>{
 const url=(process.env.FAN_LIFE_STORE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'')
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY||''
 if(!url||!key)return {ok:false,note:'Supabase is not configured on the site.'}
 try{
  const r=await fetch(`${url}/storage/v1/bucket/${BUCKET}`,{headers:{apikey:key,Authorization:`Bearer ${key}`},cache:'no-store',signal:AbortSignal.timeout(8000)})
  return r.ok?{ok:true}:{ok:false,note:`The ${BUCKET} bucket answered ${r.status}.`}
 }catch{return {ok:false,note:'Storage did not answer.'}}
}

export async function readHealth(now=Date.now()):Promise<Health>{
 const d=durable()
 const raw=d&&d.kind!=='memory'?await d.read(NAME,{fresh:true,soft:true}).catch(()=>null):null
 let hb:Heartbeat|null=null
 try{hb=raw?JSON.parse(raw.text) as Heartbeat:null}catch{hb=null}
 const fresh=!!hb&&now-Date.parse(hb.at)<STALE_MS
 return {listener:{ok:fresh,at:hb?.at??null},writer:hb?.writer??null,storage:await storageOk()}
}
