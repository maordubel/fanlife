import 'server-only'
import {REGISTRY,clubFromHost,PORTAL_HOST_ROOT,type RegistryClub} from '@/lib/master/registry'
import {compilePack as compilePackBase} from './compiler'
import type {ClubData,Diagnostic} from './contract'
import {clubMystery} from './mystery'
import {clubPolls} from './polls'
import {gateReadiness} from './gate-data'
import {waveCReadiness} from './gate-content'
import {mergeWave} from './waves'
import {GATE_THRESHOLDS as T} from './thresholds'
import {readDeskPack,deskPackIds} from '@/lib/master/deskPack'
import zrinjskiArchive from '@/club-packs/zrinjski-mostar/wave-existing-archive-2026-10-09.json'
import stPauliArchive from '@/club-packs/st-pauli/wave-existing-archive-2026-10-09.json'
import stPauliCof from '@/club-packs/st-pauli/wave-kits-cof-2026-10-09.json'
import htaCof from '@/club-packs/hapoel-tel-aviv/wave-kits-cof-2026-10-10.json'
import olympiacosCof from '@/club-packs/olympiacos/wave-kits-cof-2026-10-09.json'
import celticCof from '@/club-packs/celtic/wave-kits-cof-2026-10-09.json'
import panathinaikosCof from '@/club-packs/panathinaikos/wave-kits-cof-2026-10-09.json'
import zrinjskiCof from '@/club-packs/zrinjski-mostar/wave-kits-cof-2026-10-09.json'
import {withEuro} from './euro-wave'
import {withHistorical} from './history-wave'
import {withRosterWave} from './roster-wave'
import {readPrecompiled} from './precompiled'
import {withPlayerOverrides} from '@/lib/players/apply'
import {refreshSnapshot} from '@/lib/players/snapshot'
import {getSnapshot} from '@/lib/players/effective'
import {withForgedTrivia} from '@/lib/trivia/club'
const compilePackEuro=(pack:Record<string,unknown>,club:RegistryClub)=>{
 const history=withHistorical(pack,club.id),result=compilePackBase(withEuro(history.pack,club.id) as never,club)
 return {...result,diagnostics:[...result.diagnostics,...history.conflicts.map(c=>({record:`${club.id}:${c.incoming}`,code:'HISTORY_CONFLICT',message:`${c.reason}: ${c.on}; existing ${c.existing}. Incoming result withheld from matches and timeline.`}))]}
}
/** Existing archives only. New facts stay in review; prior approvals remain authoritative. */
/** The colours-of-football catalogue kits the club pack has no (season, type) for: status `review`, so they reach no gate until the owner approves them. */
const CATALOGUE_KITS:Record<string,unknown>={'st-pauli':stPauliCof,celtic:celticCof,panathinaikos:panathinaikosCof,'zrinjski-mostar':zrinjskiCof,olympiacos:olympiacosCof}
const withCatalogue=(pack:Record<string,unknown>,club:RegistryClub)=>mergeWave(pack,CATALOGUE_KITS[club.id] as never)
function compileExistingArchive(pack:Record<string,unknown>,club:RegistryClub){
 const wave=club.id==='st-pauli'?stPauliArchive:zrinjskiArchive
 return compilePackEuro(withCatalogue(mergeWave(pack,wave),club),club)
}
const providers:Record<string,()=>Promise<{data:ClubData;diagnostics:Diagnostic[]}>>={
 'hapoel-tel-aviv':async()=>{
  // The Worker's own data (Kit Master, archive, timeline), plus the catalogue's drawings of the shirts the Kit Master has no entry for; the owner-approved
  // catalogue kits ride on the same record shape, and `kitViews` folds a shirt both sources describe into one card.
  const base=(await import('./adapters/hapoel')).getHapoelData(),wave=htaCof as unknown as {sources:ClubData['sources'];kits:ClubData['kits']}
  const have=new Set(base.sources.map(x=>x.id)),kits=(wave.kits||[]).filter(k=>k.status==='approved'&&k.confidence>=2).map(k=>({...k,id:`hapoel-tel-aviv:${k.id}`}))
  return {data:{...base,kits:[...(base.kits||[]),...kits],sources:[...base.sources,...wave.sources.filter(x=>!have.has(x.id))]},diagnostics:[]}
 },
 'zrinjski-mostar':async()=>compileExistingArchive(mergeWave(mergeWave(mergeWave(mergeWave((await import('./adapters/zrinjski')).zrinjskiPack(),(await import('@/club-packs/zrinjski-mostar/wave-parity-2026-10-06.json')).default as never),mergeWave((await import('@/club-packs/zrinjski-mostar/wave-c-2026-10-06.json')).default as never,(await import('@/club-packs/zrinjski-mostar/wave-auto.json')).default as never)),(await import('@/club-packs/zrinjski-mostar/wave-kits-photos-2026-10-08.json')).default as never),(await import('@/club-packs/zrinjski-mostar/wave-uefa-2026-10-08.json')).default as never),REGISTRY.find(c=>c.id==='zrinjski-mostar')!),
 'hapoel-petah-tikva':async()=>compilePackEuro(mergeWave(mergeWave(mergeWave(mergeWave((await import('@/club-packs/hapoel-petah-tikva/core.json')).default,(await import('@/club-packs/hapoel-petah-tikva/wave-parity-2026-10-06.json')).default as never),mergeWave((await import('@/club-packs/hapoel-petah-tikva/wave-c-2026-10-06.json')).default as never,(await import('@/club-packs/hapoel-petah-tikva/wave-auto.json')).default as never)),(await import('@/club-packs/hapoel-petah-tikva/wave-kits-photos-2026-10-08.json')).default as never),(await import('@/club-packs/hapoel-petah-tikva/wave-uefa-2026-10-08.json')).default as never),REGISTRY.find(c=>c.id==='hapoel-petah-tikva')!),
 panathinaikos:async()=>compilePackEuro(withCatalogue(mergeWave(mergeWave(mergeWave(mergeWave((await import('@/club-packs/panathinaikos/core.json')).default,(await import('@/club-packs/panathinaikos/wave-parity-2026-10-06.json')).default as never),(await import('@/club-packs/panathinaikos/wave-kits-photos-2026-10-08.json')).default as never),(await import('@/club-packs/panathinaikos/wave-uefa-2026-10-08.json')).default as never),(await import('@/club-packs/panathinaikos/wave-four-clubs-2026-10-08.json')).default as never),REGISTRY.find(c=>c.id==='panathinaikos')!),REGISTRY.find(c=>c.id==='panathinaikos')!),
 'aek-athens':async()=>compilePackEuro(mergeWave(mergeWave((await import('@/club-packs/aek-athens/core.json')).default as never,(await import('@/club-packs/aek-athens/wave-deep-history-2026-10-08.json')).default as never),(await import('@/club-packs/aek-athens/wave-kits-aek-2026-10-09.json')).default as never),REGISTRY.find(c=>c.id==='aek-athens')!),
 'celtic':async()=>{const club=REGISTRY.find(c=>c.id==='celtic')!;return compilePackEuro(withCatalogue(mergeWave((await import('@/club-packs/celtic/core.json')).default as never,(await import('@/club-packs/celtic/wave-deep-history-2026-10-08.json')).default as never),club),club)},
 'st-pauli':async()=>compileExistingArchive(mergeWave((await import('@/club-packs/st-pauli/core.json')).default as never,(await import('@/club-packs/st-pauli/wave-deep-history-2026-10-08.json')).default as never),REGISTRY.find(c=>c.id==='st-pauli')!),
 olympiacos:async()=>compilePackEuro(withCatalogue(mergeWave(mergeWave(mergeWave((await import('@/club-packs/olympiacos/core.json')).default,(await import('@/club-packs/olympiacos/wave-parity-2026-10-06.json')).default as never),mergeWave((await import('@/club-packs/olympiacos/wave-c-2026-10-06.json')).default as never,(await import('@/club-packs/olympiacos/wave-auto.json')).default as never)),(await import('@/club-packs/olympiacos/wave-kits-photos-2026-10-08.json')).default as never),REGISTRY.find(c=>c.id==='olympiacos')!),REGISTRY.find(c=>c.id==='olympiacos')!),
}
/** Review-only clubs: material staged, nothing approved — loadable (gates show LOCKED), never in the playable set. */
export const REVIEW_CLUB_IDS:string[]=[]
export const CORE_CLUB_IDS=Object.keys(providers).filter(id=>!REVIEW_CLUB_IDS.includes(id))
const cache=new Map<string,{at:number;desk:boolean;rev:number;p:Promise<{data:ClubData;diagnostics:Diagnostic[]}|null>}>()
/** the archive as the repository holds it: provider + roster wave, BEFORE the owner's overrides and the readiness pass (the Player Control Center reads this to show base values and removed men) */
const baseCache=new Map<string,Promise<{data:ClubData;diagnostics:Diagnostic[]}|null>>()
export function loadClubBase(id:string):Promise<{data:ClubData;diagnostics:Diagnostic[]}|null>{
 if(!Object.hasOwn(providers,id))return Promise.resolve(null)
 let p=baseCache.get(id)
 // production reads the build's pre-compiled base (lib/clubs/precompiled.ts); anything missing or stale compiles as before
 if(!p){p=readPrecompiled(id).then(pre=>pre??providers[id]!().then(r=>r?{...r,data:withForgedTrivia(withRosterWave(id,r.data))}:r)).catch(e=>{baseCache.delete(id);throw e});baseCache.set(id,p)}
 return p
}
function freeze<T>(v:T):T {if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const item of Object.values(v))freeze(item)}return v}
function finish(result:{data:ClubData;diagnostics:Diagnostic[]}){result.data.gates.polls=gateReadiness(clubPolls(result.data,'en').length,T.polls.target,T.polls.minimum,T.polls.unit);result.data.gates['blind-cow']=gateReadiness(clubMystery(result.data).poolSize,T['blind-cow'].target,T['blind-cow'].minimum,T['blind-cow'].unit);for(const [k,r] of Object.entries(waveCReadiness(result.data)))(result.data.gates as Record<string,unknown>)[k]=r;return freeze(result)}
/** A club with no repository pack is played from its DESK PACK — built in the control room from the owner's approvals,
 * compiled by the same compiler. It can change at any time, so it is re-read after a minute (and at once after a build). */
const DESK_TTL_MS=60_000
async function deskProvider(id:string){const reg=REGISTRY.find(c=>c.id===id);if(!reg)return null;const pack=await readDeskPack(id).catch(()=>null);if(!pack)return null;const r=compilePackEuro(pack,reg);return {...r,data:withForgedTrivia(r.data)}}
/** Static packs are immutable within a deployment; content versions travel with each run. */
export async function loadClub(id:string):Promise<{data:ClubData;diagnostics:Diagnostic[]}|null> {
 const isStatic=Object.hasOwn(providers,id)
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
export const hasStaticPack=(id:string)=>Object.hasOwn(providers,id)
/** Host is authority. Neutral-portal path selection is available only in evaluation. */
export function resolveClubId(host:string|null,pathId?:string,_preview=false):string|null {
 const tenant=clubFromHost(host)
 if(tenant)return !pathId||pathId===tenant?tenant:null
 const h=host?.toLowerCase().split(':')[0]||''
 if((h.endsWith('.'+PORTAL_HOST_ROOT)&&h!=='www.'+PORTAL_HOST_ROOT)||(h.endsWith('.localhost')&&h!=='www.localhost'))return null
 /* the hub links to /clubs/<id>: the path resolves in the real product too (it 404'd every club once evaluation went off, 9.10.2026); gates are still gated by gateAccess */
 return pathId&&REGISTRY.some(c=>c.id===pathId)?pathId:null
}
