import 'server-only'
import {createHash} from 'node:crypto'
import {engineClubIds,loadClub} from '@/lib/clubs/resolver'
import {readState} from '@/lib/master/store'
import {evaluationMode} from '@/lib/master/mode'
import {gateAccess} from '@/lib/clubs/access'
import {sharedGate} from '@/lib/clubs/gates'
import {clubBank,modeCatalog,type Bank} from '@/lib/clubs/trivia-deck'
import {createTimelineEngine} from '@/lib/game/timeline-engine'
import {chronologyPool} from '@/lib/clubs/chronology'
import {dealMemory,memoryPool} from '@/lib/clubs/memory-deck'
import type {ClubData} from '@/lib/clubs/contract'
import type {MasterQuestion} from '@/lib/game/questions/types'
import type {MemoryCandidate} from '@/lib/game/memory-engine'
import type {DatedCard} from '@/lib/game/timeline-run'
import {nsKey,splitKey} from '@/lib/master/crm/refs'
import {ALL_FOOTBALL} from './registry'

/**
 * ALL FOOTBALL's derived pool (ADR-fanlife-0010). Read-only over what the club compiler already approved; nothing is
 * written back to any pack, and deleting this cache deletes nothing.
 *  - members: every engine club whose REAL control row lets fans into that gate (`gateAccess`, preview only in evaluation)
 *    and whose compiled data makes the gate playable;
 *  - ids are namespaced `<club>~<id>` — questions, pools, facts, cards and pairs — so a distractor always comes from the
 *    question's own club and an answer can never be another club's truth;
 *  - balance: `balanced` caps each club's share (a stable hash picks which), `chaos` takes every eligible record,
 *    `duel` two clubs only. A mode that cannot be fielded says so — nothing is padded;
 *  - the version is a hash of the members' `id:version`, the mode and the algorithm: a run started on one version is
 *    refused on another.
 */
export const ALGORITHM='all-football-v1'
export type Mode={kind:'balanced'}|{kind:'chaos'}|{kind:'duel';clubs:[string,string]}
export type PoolGate='trivia'|'timeline'|'memory'
export const CAPS:Record<PoolGate,number>={trivia:300,timeline:160,memory:90}
export const MIN_CLUBS=2
export type Member={id:string;name:string;version:string}
export type Pack={identity:ClubData['identity'];version:string;locales:ClubData['locales'];trivia:ClubData['trivia'];timeline:ClubData['timeline'];memory:MemoryCandidate[];sources:ClubData['sources']}
export type Aggregate={gate:PoolGate;mode:Mode;slug:string;members:Member[];version:string;pack:Pack;origin:Map<string,ClubData>;excluded:{id:string;name:string;reason:string}[]}

const GATE_NO:Record<PoolGate,number>={trivia:sharedGate('trivia')!.number,timeline:sharedGate('timeline')!.number,memory:sharedGate('memory')!.number}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex')
/** a stable pick that does not depend on file order and changes only when a record or the version does */
/**
 * Trivia's cap is STRATIFIED: an ALL FOOTBALL deck must climb like a club deck does, so each club's share is cut level by
 * level (Easy 25% · Medium 30% · Hard 25% · Expert 20%, by the forge's `level:` facet or the engine difficulty), and
 * inside a level it rotates through templates so no one shape (a date check, a league scoreline) fills a club's share.
 * A level a club cannot fill passes its seats to the next. Stable: the same hash order as `stableCap`.
 */
const LEVEL_SHARE=[0.25,0.30,0.25,0.20]
const levelIdx=(q:{difficulty:number;facets?:string[]})=>{const f=q.facets?.find(x=>x.startsWith('level:'));const n=f?Number(f.slice(6)):q.difficulty-1;return Math.max(0,Math.min(3,(Number.isFinite(n)?n:1)-1))}
export function stratifiedCap<T extends {id:string;difficulty:number;template:string;facets?:string[]}>(xs:readonly T[],cap:number,salt:string):T[]{
 if(xs.length<=cap)return [...xs]
 const lv:T[][]=[[],[],[],[]]
 for(const x of [...xs].map(x=>({x,h:hash(`${salt}|${x.id}`)})).sort((a,b)=>a.h.localeCompare(b.h)).map(v=>v.x))lv[levelIdx(x)]!.push(x)
 const out:T[]=[];let carry=0
 for(let i=0;i<4;i++){
  const want=(i===3?cap-out.length:Math.round(cap*LEVEL_SHARE[i]!)+carry),by=new Map<string,T[]>()
  for(const x of lv[i]!)by.set(x.template,[...(by.get(x.template)??[]),x])
  const lanes=[...by.values()],got:T[]=[]
  for(let r=0;got.length<want&&lanes.some(l=>l.length>r);r++)for(const l of lanes){if(got.length>=want)break;if(l[r])got.push(l[r]!)}
  out.push(...got);carry=Math.max(0,want-got.length)
 }
 if(out.length<cap){const have=new Set(out.map(x=>x.id));for(const l of lv)for(const x of l){if(out.length>=cap)break;if(!have.has(x.id))out.push(x)}}
 return out
}
const stableCap=<T>(xs:readonly T[],id:(x:T)=>string,cap:number,salt:string)=>xs.length<=cap?[...xs]:[...xs].map(x=>({x,h:hash(`${salt}|${id(x)}`)})).sort((a,b)=>a.h.localeCompare(b.h)).slice(0,cap).map(v=>v.x)

/** the slug the browser carries — the mode lives in it, so a cookie and a version are per mode */
export function slugOf(mode:Mode):string{return mode.kind==='balanced'?ALL_FOOTBALL.id:mode.kind==='chaos'?`${ALL_FOOTBALL.id}:chaos`:`${ALL_FOOTBALL.id}:duel:${mode.clubs.join(',')}`}
export function modeOf(slug:string):Mode|null{
 if(slug===ALL_FOOTBALL.id)return {kind:'balanced'}
 if(slug===`${ALL_FOOTBALL.id}:chaos`)return {kind:'chaos'}
 const m=/^all-football:duel:([a-z0-9-]{2,40}),([a-z0-9-]{2,40})$/.exec(slug)
 if(m&&m[1]!==m[2])return {kind:'duel',clubs:[m[1]!,m[2]!].sort() as [string,string]}
 return null
}
export function parseModeQuery(q:{mode?:string;a?:string;b?:string}):Mode{
 if(q.mode==='chaos')return {kind:'chaos'}
 if(q.mode==='duel'&&q.a&&q.b&&q.a!==q.b&&/^[a-z0-9-]{2,40}$/.test(q.a)&&/^[a-z0-9-]{2,40}$/.test(q.b))return {kind:'duel',clubs:[q.a,q.b].sort() as [string,string]}
 return {kind:'balanced'}
}

const playable=(d:ClubData,g:PoolGate)=>g==='trivia'?d.gates.trivia.playable:g==='timeline'?d.gates.timeline.playable:d.gates.memory.playable
/** the clubs fans could enter this gate at today, each with the reason a club is left out */
export async function membersFor(gate:PoolGate):Promise<{clubs:ClubData[];excluded:Aggregate['excluded']}>{
 const [ids,state]=await Promise.all([engineClubIds(),readState().catch(()=>null)])
 const preview=evaluationMode(),clubs:ClubData[]=[],excluded:Aggregate['excluded']=[]
 for(const id of [...ids].sort()){
  const control=state?.clubs.find(c=>c.id===id)
  const loaded=await loadClub(id).catch(()=>null)
  const name=loaded?.data.identity.name??control?.name??id
  const access=gateAccess(control?{status:control.status,gates:control.gates}:null,GATE_NO[gate],preview)
  if(!access.allowed){excluded.push({id,name,reason:`Gate not open to fans (${access.reason})`});continue}
  if(!loaded){excluded.push({id,name,reason:'No compiled pack'});continue}
  if(!playable(loaded.data,gate)){excluded.push({id,name,reason:'Not enough approved records for this gate'});continue}
  clubs.push(loaded.data)
 }
 return {clubs,excluded}
}

const HEBREW=/[֐-׿]/
/** a question that does not name its club gets the club's name in front — an aggregate round never asks "the club" */
export function attribute(prompt:string,clubName:string):string{
 if(HEBREW.test(prompt))return prompt
 const short=clubName.replace(/^(FC|AC|1\.\s*FC)\s+/i,'').split(/\s+/)[0]!.toLowerCase()
 return prompt.toLowerCase().includes(short)?prompt:`${clubName} · ${prompt}`
}
const nsQuestion=(club:ClubData,q:MasterQuestion):MasterQuestion=>{
 const i=q.key.indexOf(':'),id=club.identity.id
 return {...q,id:nsKey(id,q.id),key:i>=0?`${q.key.slice(0,i+1)}${nsKey(id,q.key.slice(i+1))}`:nsKey(id,q.key),pool:q.pool?nsKey(id,q.pool):undefined,factIds:q.factIds.map(f=>nsKey(id,f)),prompt:attribute(q.prompt,club.identity.name)}
}

const cache=new Map<string,Aggregate>()
/** the aggregate for one gate and mode; null when fewer than two clubs can play (aggregateRules, CRM 2 §6.4) */
export async function aggregateFor(gate:PoolGate,mode:Mode):Promise<Aggregate|null>{
 const all=await membersFor(gate)
 let clubs=all.clubs
 const excluded=[...all.excluded]
 if(mode.kind==='duel'){clubs=clubs.filter(c=>mode.clubs.includes(c.identity.id));if(clubs.length!==2)return null}
 if(clubs.length<MIN_CLUBS)return null
 const members=clubs.map(c=>({id:c.identity.id,name:c.identity.name,version:c.version}))
 const slug=slugOf(mode)
 const version=hash([ALGORITHM,gate,slug,...members.map(m=>`${m.id}:${m.version}`)].join('|')).slice(0,20)
 const key=`${gate}:${version}`
 const hit=cache.get(key);if(hit)return hit
 const cap=mode.kind==='chaos'?Infinity:CAPS[gate]
 const questions:MasterQuestion[]=[],pools:Record<string,string[]>={},timeline:ClubData['timeline']=[],memory:MemoryCandidate[]=[],sources:ClubData['sources']=[]
 const lanes:ClubData['timeline'][]=[]
 for(const c of clubs){
  const id=c.identity.id
  if(gate==='trivia'){
   // only what the club's own bank already accepted (sanitised, sourced, confidence ≥ 2)
   const bank=clubBank(c)
   for(const q of stratifiedCap(bank.questions,cap,version))questions.push(nsQuestion(c,q))
   for(const [p,v] of Object.entries(c.trivia.pools))pools[nsKey(id,p)]=v
  }
  if(gate==='timeline'){
   const cards=chronologyPool(c.timeline)
   const ids=new Set(stableCap(cards,x=>x.id,cap,version).map(x=>x.id))
   lanes.push(c.timeline.filter(f=>ids.has(f.value.id)).map(f=>({...f,id:nsKey(id,f.id),sources:f.sources.map(s=>nsKey(id,s)),value:{...f.value,id:nsKey(id,f.value.id),hint:f.value.hint?`${c.identity.name} · ${f.value.hint}`:c.identity.name}})))
  }
  if(gate==='memory'){
   const {pool}=memoryPool(c)
   const keep=new Set(stableCap(pool,x=>x.pair,cap,version).map(x=>x.pair))
   for(const m of c.memory)if(keep.has(m.pair))memory.push({...m,pair:nsKey(id,m.pair),fact:m.fact??null})
  }
  for(const s of c.sources)sources.push({...s,id:nsKey(id,s.id)})
 }
 // timeline: the clubs' cards interleaved, so the pool order (which the deal reads) is never one club's block
 for(let i=0;lanes.some(l=>i<l.length);i++)for(const l of lanes)if(l[i])timeline.push(l[i]!)
 const pack:Pack={identity:{id:ALL_FOOTBALL.id,name:ALL_FOOTBALL.name,city:'',country:'',sport:'football'},version,locales:{ui:'en',content:'en',supported:['en'],direction:'ltr'},trivia:{questions,pools},timeline,memory,sources}
 const agg:Aggregate={gate,mode,slug,members,version,pack,origin:new Map(clubs.map(c=>[c.identity.id,c])),excluded}
 if(cache.size>=12)cache.delete(cache.keys().next().value as string)
 cache.set(key,agg)
 return agg
}

/** the trivia bank of an aggregate — `clubBank` over the pack, so grading is the club engine's own */
export const aggregateBank=(a:Aggregate):Bank=>clubBank(a.pack as unknown as ClubData)
export const aggregateTimeline=(a:Aggregate)=>{const k=`tl:${a.version}`;let e=engines.get(k);if(!e){e=createTimelineEngine(chronologyPool(a.pack.timeline));engines.set(k,e)}return e}
const engines=new Map<string,ReturnType<typeof createTimelineEngine>>()
export const originOf=(key:string)=>splitKey(key)

/** per-gate readiness of the experience, the CRM workspace's first screen */
export type GateReport={gate:PoolGate;playable:boolean;members:Member[];excluded:Aggregate['excluded'];records:number;perClub:Record<string,number>;reason:string|null;version:string|null}
export async function gateReport(gate:PoolGate):Promise<GateReport>{
 const a=await aggregateFor(gate,{kind:'balanced'})
 if(!a){const m=await membersFor(gate);return {gate,playable:false,members:m.clubs.map(c=>({id:c.identity.id,name:c.identity.name,version:c.version})),excluded:m.excluded,records:0,perClub:{},reason:`Needs at least ${MIN_CLUBS} clubs open for this gate (${m.clubs.length} today).`,version:null}}
 const keys=gate==='trivia'?aggregateBank(a).questions.map(q=>q.id):gate==='timeline'?chronologyPool(a.pack.timeline).map(c=>c.id):memoryPool(a.pack as unknown as ClubData).pool.map(p=>p.pair)
 const perClub:Record<string,number>={};for(const k of keys){const o=splitKey(k);if(o)perClub[o.clubId]=(perClub[o.clubId]??0)+1}
 let playable=keys.length>0,reason:string|null=null
 if(gate==='trivia'){const cat=modeCatalog(aggregateBank(a),1,0);playable=cat.modes.some(m=>m.available);if(!playable)reason='No trivia mode can be dealt from the pool.'}
 if(gate==='timeline'&&keys.length<3){playable=false;reason='Fewer than three distinct exact dates.'}
 if(gate==='memory'){const d=dealMemory(a.pack as unknown as ClubData,{size:2,seed:1,cursor:0});if('blocked' in d){playable=false;reason='No memory board can be dealt from the pool.'}}
 return {gate,playable,members:a.members,excluded:a.excluded,records:keys.length,perClub,reason,version:a.version}
}
export type {DatedCard}
