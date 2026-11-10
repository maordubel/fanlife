import 'server-only'
import {REGISTRY,clubFromHost,PORTAL_HOST_ROOT,type RegistryClub} from '@/lib/master/registry'
import type {ClubData,Diagnostic} from './contract'
import {clubMystery} from './mystery'
import {clubPolls} from './polls'
import {gateReadiness} from './gate-data'
import {waveCReadiness} from './gate-content'
import {GATE_THRESHOLDS as T} from './thresholds'
import {readDeskPack,deskPackIds} from '@/lib/master/deskPack'
import {readPrecompiled} from './precompiled'
import {withPlayerOverrides} from '@/lib/players/apply'
import {refreshSnapshot} from '@/lib/players/snapshot'
import {getSnapshot} from '@/lib/players/effective'
/** Review-only clubs: material staged, nothing approved — loadable (gates show LOCKED), never in the playable set. */
export const REVIEW_CLUB_IDS:string[]=[]
/** The repository packs (lib/clubs/resolver-ids.ts). Kept apart so the heavy compile path (about 9 MB of wave JSON) is imported only when a pre-compiled club is missing. */
import {STATIC_CLUB_IDS} from './resolver-ids'
export {STATIC_CLUB_IDS}
const isStaticId=(id:string)=>STATIC_CLUB_IDS.includes(id)
const compilePath=()=>import('./providers')
export const CORE_CLUB_IDS=STATIC_CLUB_IDS.filter(id=>!REVIEW_CLUB_IDS.includes(id))
const cache=new Map<string,{at:number;desk:boolean;rev:number;p:Promise<{data:ClubData;diagnostics:Diagnostic[]}|null>}>()
/** the archive as the repository holds it: provider + roster wave, BEFORE the owner's overrides and the readiness pass (the Player Control Center reads this to show base values and removed men) */
const baseCache=new Map<string,Promise<{data:ClubData;diagnostics:Diagnostic[]}|null>>()
export function loadClubBase(id:string):Promise<{data:ClubData;diagnostics:Diagnostic[]}|null>{
 if(!isStaticId(id))return Promise.resolve(null)
 let p=baseCache.get(id)
 // production reads the build's pre-compiled base (lib/clubs/precompiled.ts); anything missing or stale compiles as before
 if(!p){p=readPrecompiled(id).then(pre=>pre??compilePath().then(m=>m.providers[id]!().then(r=>r?m.withBaseWaves(id,r):r))).catch(e=>{baseCache.delete(id);throw e});baseCache.set(id,p)}
 return p
}
function freeze<T>(v:T):T {if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const item of Object.values(v))freeze(item)}return v}
/** The readiness pass every loaded club gets (polls, Blind Cow and the wave-C gates are judged on the compiled data). Mutates; `finish` freezes after it. */
export function readinessPass(result:{data:ClubData;diagnostics:Diagnostic[]}){result.data.gates.polls=gateReadiness(clubPolls(result.data,'en').length,T.polls.target,T.polls.minimum,T.polls.unit);result.data.gates['blind-cow']=gateReadiness(clubMystery(result.data).poolSize,T['blind-cow'].target,T['blind-cow'].minimum,T['blind-cow'].unit);for(const [k,r] of Object.entries(waveCReadiness(result.data)))(result.data.gates as Record<string,unknown>)[k]=r;return result}
function finish(result:{data:ClubData;diagnostics:Diagnostic[]}){return freeze(readinessPass(result))}
/** A club with no repository pack is played from its DESK PACK — built in the control room from the owner's approvals,
 * compiled by the same compiler. It can change at any time, so it is re-read after a minute (and at once after a build). */
const DESK_TTL_MS=60_000
/** 10.11.2026 — and from its STAGED material (lib/research/staged): UEFA's approved ties plus every batch the owner approved on the research desk.
 * A desk player whose exact name the staged squad already holds is not added twice. Publication is untouched: a club still opens only by the owner's click. */
async function deskProvider(id:string){const reg=REGISTRY.find(c=>c.id===id);if(!reg)return null
 const [pack,staged]=await Promise.all([readDeskPack(id).catch(()=>null),import('@/lib/research/staged/pack').then(s=>s.stagedPack(id)).catch(()=>null)])
 if(!pack&&!staged)return null
 const m=await compilePath()
 let base:Record<string,unknown>=pack as unknown as Record<string,unknown>
 if(staged){const have=new Set(((staged.pack.players as {value:{name:string}}[])||[]).map(p=>p.value.name.normalize('NFKC').toLowerCase()));base=pack?m.mergeWave(staged.pack,{...pack,players:pack.players.filter(p=>!have.has(p.value.name.normalize('NFKC').toLowerCase()))} as never):staged.pack}
 const r=m.compilePackEuro(base,reg),diagnostics=[...r.diagnostics,...(staged?.conflicts||[]).map(c=>{const x=c as {incoming:string;on:string;reason:string;existing:string};return {record:`${id}:${x.incoming}`,code:'HISTORY_CONFLICT',message:`${x.reason}: ${x.on}; existing ${x.existing}. Incoming result withheld from matches and timeline.`}})]
 return {data:m.withMemoryPairs(m.withArchiveMysteries(m.withForgedTrivia(r.data))),diagnostics}}
/** Static packs are immutable within a deployment; content versions travel with each run. */
export async function loadClub(id:string):Promise<{data:ClubData;diagnostics:Diagnostic[]}|null> {
 const isStatic=isStaticId(id)
 if(!isStatic&&!REGISTRY.some(c=>c.id===id))return null
 // the owner's published overrides (Player Control Center): refreshed at most every few seconds; a new revision rebuilds this club
 if(isStatic)await refreshSnapshot().catch(()=>undefined)
 const rev=isStatic?getSnapshot().revision:0
 const hit=cache.get(id)
 if(hit&&hit.rev===rev&&(!hit.desk||Date.now()-hit.at<DESK_TTL_MS))return hit.p
 const p=(isStatic?loadClubBase(id):deskProvider(id)).then(r=>r?finish(isStatic?{...r,data:withPlayerOverrides(id,r.data)}:r):null).catch(e=>{cache.delete(id);throw e})
 cache.set(id,{at:Date.now(),desk:!isStatic,rev,p})
 return p
}
/** After a desk build: the next read compiles the new pack on this instance. */
export function invalidateClub(id:string){cache.delete(id)}
/** Every club the engine can load: repository packs plus clubs with a desk pack. */
export async function engineClubIds():Promise<string[]>{const desk=(await deskPackIds().catch(()=>[])).filter(id=>REGISTRY.some(c=>c.id===id)&&!CORE_CLUB_IDS.includes(id));return [...CORE_CLUB_IDS,...desk]}
export const hasStaticPack=(id:string)=>isStaticId(id)
/** Host is authority. Neutral-portal path selection is available only in evaluation. */
export function resolveClubId(host:string|null,pathId?:string,_preview=false):string|null {
 const tenant=clubFromHost(host)
 if(tenant)return !pathId||pathId===tenant?tenant:null
 const h=host?.toLowerCase().split(':')[0]||''
 if((h.endsWith('.'+PORTAL_HOST_ROOT)&&h!=='www.'+PORTAL_HOST_ROOT)||(h.endsWith('.localhost')&&h!=='www.localhost'))return null
 /* the hub links to /clubs/<id>: the path resolves in the real product too (it 404'd every club once evaluation went off, 9.10.2026); gates are still gated by gateAccess */
 return pathId&&REGISTRY.some(c=>c.id===pathId)?pathId:null
}
