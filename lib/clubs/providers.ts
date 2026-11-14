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
import {withMemoryPairs} from './memory-pairs'
import {withArchiveMysteries} from './mystery-forge'
import {oneNightPerMatch} from './one-night'
import {correctPack,correctMatches} from './corrections'
import {withCareers,withSeasonHistory} from './careers'
export const compilePackEuro=(pack:Record<string,unknown>,club:RegistryClub)=>{
 const history=withHistorical(pack,club.id),night=oneNightPerMatch(withCareers(correctPack(withSeasonHistory(withGoalWave(withEuro(history.pack,club.id),club.id),club.id),club.id),club.id)),result=compilePackBase(night.pack as never,club)
 return {...result,diagnostics:[...result.diagnostics,...night.folded.map(f=>({record:`${club.id}:${f.kept}`,code:'SAME_MATCH_FOLDED',message:`${f.on}: ${f.folded.join(', ')} folded into ${f.kept} (same day, same score).`})),...history.conflicts.map(c=>({record:`${club.id}:${c.incoming}`,code:'HISTORY_CONFLICT',message:`${c.reason}: ${c.on}; existing ${c.existing}. Incoming result withheld from matches and timeline.`}))]}
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
  // 13.11.2026 — the checked corrections (content/manual/archive-corrections-*.json) apply to The Worker's rows too
  return {data:{...base,matches:base.matches?correctMatches('hapoel-tel-aviv',base.matches):base.matches,kits:[...(base.kits||[]),...kits],sources:[...base.sources,...wave.sources.filter(x=>!have.has(x.id))]},diagnostics:[]}
 },
 'zrinjski-mostar':async()=>compileExistingArchive(mergeWave(mergeWave(mergeWave(mergeWave((await import('./adapters/zrinjski')).zrinjskiPack(),(await import('@/club-packs/zrinjski-mostar/wave-parity-2026-10-06.json')).default as never),mergeWave((await import('@/club-packs/zrinjski-mostar/wave-c-2026-10-06.json')).default as never,(await import('@/club-packs/zrinjski-mostar/wave-auto.json')).default as never)),(await import('@/club-packs/zrinjski-mostar/wave-kits-photos-2026-10-08.json')).default as never),(await import('@/club-packs/zrinjski-mostar/wave-uefa-2026-10-08.json')).default as never),REGISTRY.find(c=>c.id==='zrinjski-mostar')!),
 'hapoel-petah-tikva':async()=>compilePackEuro(mergeWave(mergeWave(mergeWave(mergeWave((await import('@/club-packs/hapoel-petah-tikva/core.json')).default,(await import('@/club-packs/hapoel-petah-tikva/wave-parity-2026-10-06.json')).default as never),mergeWave((await import('@/club-packs/hapoel-petah-tikva/wave-c-2026-10-06.json')).default as never,(await import('@/club-packs/hapoel-petah-tikva/wave-auto.json')).default as never)),(await import('@/club-packs/hapoel-petah-tikva/wave-kits-photos-2026-10-08.json')).default as never),(await import('@/club-packs/hapoel-petah-tikva/wave-uefa-2026-10-08.json')).default as never),REGISTRY.find(c=>c.id==='hapoel-petah-tikva')!),
 panathinaikos:async()=>compilePackEuro(withCatalogue(mergeWave(mergeWave(mergeWave(mergeWave((await import('@/club-packs/panathinaikos/core.json')).default,(await import('@/club-packs/panathinaikos/wave-parity-2026-10-06.json')).default as never),(await import('@/club-packs/panathinaikos/wave-kits-photos-2026-10-08.json')).default as never),(await import('@/club-packs/panathinaikos/wave-uefa-2026-10-08.json')).default as never),(await import('@/club-packs/panathinaikos/wave-four-clubs-2026-10-08.json')).default as never),REGISTRY.find(c=>c.id==='panathinaikos')!),REGISTRY.find(c=>c.id==='panathinaikos')!),
 'aek-athens':async()=>compilePackEuro(mergeWave(mergeWave((await import('@/club-packs/aek-athens/core.json')).default as never,(await import('@/club-packs/aek-athens/wave-deep-history-2026-10-08.json')).default as never),(await import('@/club-packs/aek-athens/wave-kits-aek-2026-10-09.json')).default as never),REGISTRY.find(c=>c.id==='aek-athens')!),
 'celtic':async()=>{const club=REGISTRY.find(c=>c.id==='celtic')!;return compilePackEuro(withCatalogue(mergeWave((await import('@/club-packs/celtic/core.json')).default as never,(await import('@/club-packs/celtic/wave-deep-history-2026-10-08.json')).default as never),club),club)},
 'st-pauli':async()=>compileExistingArchive(mergeWave((await import('@/club-packs/st-pauli/core.json')).default as never,(await import('@/club-packs/st-pauli/wave-deep-history-2026-10-08.json')).default as never),REGISTRY.find(c=>c.id==='st-pauli')!),
 olympiacos:async()=>compilePackEuro(withCatalogue(mergeWave(mergeWave(mergeWave((await import('@/club-packs/olympiacos/core.json')).default,(await import('@/club-packs/olympiacos/wave-parity-2026-10-06.json')).default as never),mergeWave((await import('@/club-packs/olympiacos/wave-c-2026-10-06.json')).default as never,(await import('@/club-packs/olympiacos/wave-auto.json')).default as never)),(await import('@/club-packs/olympiacos/wave-kits-photos-2026-10-08.json')).default as never),REGISTRY.find(c=>c.id==='olympiacos')!),REGISTRY.find(c=>c.id==='olympiacos')!),
 // 12.11.2026 — plus each club's research wave (kits, two-publisher positions): scripts/club-research/integrate-caf-2026-11-12.py
 // 28.10.2026 — the owner's expanded research package for three clubs, imported by scripts/research/import-maghreb-2026-10-28.py
 'raja-casablanca':async()=>compilePackEuro(mergeWave(mergeWave((await import('@/club-packs/raja-casablanca/core.json')).default as never,(await import('@/club-packs/raja-casablanca/wave-research-2026-11-12.json')).default as never),(await import('@/club-packs/raja-casablanca/wave-history-2026-11-13.json')).default as never),REGISTRY.find(c=>c.id==='raja-casablanca')!),
 'wydad-casablanca':async()=>compilePackEuro(mergeWave(mergeWave((await import('@/club-packs/wydad-casablanca/core.json')).default as never,(await import('@/club-packs/wydad-casablanca/wave-research-2026-11-12.json')).default as never),(await import('@/club-packs/wydad-casablanca/wave-history-2026-11-13.json')).default as never),REGISTRY.find(c=>c.id==='wydad-casablanca')!),
 'al-ahly':async()=>compilePackEuro(mergeWave(mergeWave((await import('@/club-packs/al-ahly/core.json')).default as never,(await import('@/club-packs/al-ahly/wave-research-2026-11-12.json')).default as never),(await import('@/club-packs/al-ahly/wave-history-2026-11-13.json')).default as never),REGISTRY.find(c=>c.id==='al-ahly')!),
 // ↓ promoted from the research desk (scripts/clubs/promote.ts) — one line per club
 'atalanta':async()=>compilePackEuro(mergeWave((await import('@/club-packs/atalanta/core.json')).default as never,(await import('@/club-packs/atalanta/wave-research-2026-11-14.json')).default as never) as never,REGISTRY.find(c=>c.id==='atalanta')!),
 'maccabi-haifa':async()=>compilePackEuro(mergeWave((await import('@/club-packs/maccabi-haifa/core.json')).default as never,(await import('@/club-packs/maccabi-haifa/wave-research-2026-11-14.json')).default as never) as never,REGISTRY.find(c=>c.id==='maccabi-haifa')!),
}
/** What `loadClubBase` adds on top of a provider's output: the roster wave, then the forged English trivia. */
export {withForgedTrivia,withArchiveMysteries,mergeWave,withMemoryPairs}
export const withBaseWaves=(id:string,r:{data:ClubData;diagnostics:Diagnostic[]})=>({...r,data:withMemoryPairs(withArchiveMysteries(withForgedTrivia(withRosterWave(id,r.data))))})
