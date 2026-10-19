import 'server-only'
import {REGISTRY,type RegistryClub} from '@/lib/master/registry'
import {compilePack as compilePackBase} from './compiler'
import type {ClubData,Diagnostic} from './contract'
import {mergeWave} from './waves'
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
import {withGoalWave} from './goal-wave'
import {withRosterWave} from './roster-wave'
import {withForgedTrivia} from '@/lib/trivia/club'
export const compilePackEuro=(pack:Record<string,unknown>,club:RegistryClub)=>{
 const history=withHistorical(pack,club.id),result=compilePackBase(withGoalWave(withEuro(history.pack,club.id),club.id) as never,club)
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
export const providers:Record<string,()=>Promise<{data:ClubData;diagnostics:Diagnostic[]}>>={
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
/** What `loadClubBase` adds on top of a provider's output: the roster wave, then the forged English trivia. */
export {withForgedTrivia}
export const withBaseWaves=(id:string,r:{data:ClubData;diagnostics:Diagnostic[]})=>({...r,data:withForgedTrivia(withRosterWave(id,r.data))})
