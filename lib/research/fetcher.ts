import {createHash} from 'node:crypto'
import type {SnapshotMeta,SourceProfile} from './contract'

/**
 * The only network edge of the research engine. Bytes in, metadata kept, nothing parsed here.
 *  - HTTPS on a profiled origin only, no credentials, redirects not followed across origins
 *  - robots.txt honoured (Disallow for our agent or *), cached per origin
 *  - one request at a time per host with the profile's minimum interval; Retry-After respected
 *  - conditional GET with the stored ETag / Last-Modified; 304 = unchanged, no body re-read
 *  - size cap and timeout per source; 401/403/404/451 are ANSWERS, never retried around (rule 11)
 */
export const USER_AGENT='FanLifeResearch/1.0 (+https://fanlife.dubelteam.com; no AI; respects robots.txt)'
export type FetchLike=(url:string,init:{headers:Record<string,string>;redirect:'manual';signal:AbortSignal})=>Promise<{status:number;headers:{get(n:string):string|null};arrayBuffer():Promise<ArrayBuffer>;text():Promise<string>}>
export type FetchOutcome=
 |{kind:'fetched';meta:SnapshotMeta;body:Buffer;/** listing headers some APIs return (WordPress: x-wp-total / x-wp-totalpages) */paging?:{total:number|null;totalPages:number|null}}
 |{kind:'unchanged';meta:Pick<SnapshotMeta,'url'|'fetchedAt'|'status'>}
 |{kind:'refused';status:number;reason:string}
 |{kind:'retry';afterMs:number;reason:string}
 |{kind:'error';reason:string}

const robotsCache=new Map<string,{text:string;at:number}>()
const lastHit=new Map<string,number>()
export function robotsDisallows(robots:string,path:string,agent='FanLifeResearch'):boolean{
 // Read the group for our agent if present, else `*`. Longest-match semantics are approximated by "any Disallow prefix".
 const groups:{agents:string[];rules:string[]}[]=[];let cur:{agents:string[];rules:string[]}|null=null
 for(const raw of robots.split(/\r?\n/)){const line=raw.replace(/#.*/,'').trim();if(!line)continue;const [k,...rest]=line.split(':');const key=k!.trim().toLowerCase(),val=rest.join(':').trim()
  if(key==='user-agent'){if(!cur||cur.rules.length){cur={agents:[],rules:[]};groups.push(cur)}cur.agents.push(val.toLowerCase())}
  else if(key==='disallow'&&cur){if(val)cur.rules.push(val)}}
 const mine=groups.find(g=>g.agents.some(a=>a!=='*'&&agent.toLowerCase().startsWith(a)))||groups.find(g=>g.agents.includes('*'))
 return !!mine?.rules.some(r=>path.startsWith(r))
}
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms))
export async function politeFetch(url:string,src:SourceProfile,prior:Pick<SnapshotMeta,'etag'|'lastModified'>|null,fetchImpl:FetchLike=fetch as unknown as FetchLike,now=()=>Date.now()):Promise<FetchOutcome>{
 let u:URL;try{u=new URL(url)}catch{return {kind:'error',reason:'Invalid URL'}}
 if(u.protocol!=='https:'||u.username||u.password||u.origin!==src.origin)return {kind:'refused',status:0,reason:'URL outside the profiled origin'}
 // robots.txt (cached for a day)
 let rb=robotsCache.get(u.origin)
 if(!rb||now()-rb.at>86400000){try{const r=await fetchImpl(`${u.origin}/robots.txt`,{headers:{'user-agent':USER_AGENT},redirect:'manual',signal:AbortSignal.timeout(src.rate.timeoutMs)});const t=r.status===200?await r.text():'';rb={text:t,at:now()}}catch{rb={text:'',at:now()}}robotsCache.set(u.origin,rb)}
 if(robotsDisallows(rb.text,u.pathname))return {kind:'refused',status:0,reason:'robots.txt disallows this path'}
 const wait=(lastHit.get(u.host)||0)+src.rate.minIntervalMs-now();if(wait>0)await sleep(wait);lastHit.set(u.host,now())
 const headers:Record<string,string>={'user-agent':USER_AGENT,accept:'text/html,application/json;q=0.9,*/*;q=0.5'}
 if(prior?.etag)headers['if-none-match']=prior.etag;if(prior?.lastModified)headers['if-modified-since']=prior.lastModified
 let r:Awaited<ReturnType<FetchLike>>
 try{r=await fetchImpl(url,{headers,redirect:'manual',signal:AbortSignal.timeout(src.rate.timeoutMs)})}catch(e){return {kind:'retry',afterMs:60000,reason:e instanceof Error?e.message:'network error'}}
 const fetchedAt=new Date(now()).toISOString()
 if(r.status===304)return {kind:'unchanged',meta:{url,fetchedAt,status:304}}
 if(r.status===429||r.status===503){const ra=Number(r.headers.get('retry-after'));return {kind:'retry',afterMs:Number.isFinite(ra)&&ra>0?ra*1000:300000,reason:`HTTP ${r.status}`}}
 if([401,403,404,410,451].includes(r.status))return {kind:'refused',status:r.status,reason:`HTTP ${r.status} — a refusal is an answer`}
 if(r.status>=300&&r.status<400)return {kind:'refused',status:r.status,reason:`Redirect to ${r.headers.get('location')||'?'} not followed`}
 if(r.status!==200)return {kind:'retry',afterMs:600000,reason:`HTTP ${r.status}`}
 const len=Number(r.headers.get('content-length'));if(Number.isFinite(len)&&len>src.rate.maxBytes)return {kind:'refused',status:200,reason:'Body larger than the source budget'}
 const body=Buffer.from(await r.arrayBuffer());if(body.length>src.rate.maxBytes)return {kind:'refused',status:200,reason:'Body larger than the source budget'}
 const int=(n:string)=>{const v=r.headers.get(n);if(v===null)return null;const x=Number(v);return Number.isInteger(x)&&x>=0?x:null}
 return {kind:'fetched',body,paging:{total:int('x-wp-total'),totalPages:int('x-wp-totalpages')},meta:{hash:createHash('sha256').update(body).digest('hex'),url,fetchedAt,status:200,contentType:r.headers.get('content-type'),bytes:body.length,etag:r.headers.get('etag'),lastModified:r.headers.get('last-modified')}}
}
/** test hook — clears the per-process robots and rate caches */
export function resetFetcherState(){robotsCache.clear();lastHit.clear()}
