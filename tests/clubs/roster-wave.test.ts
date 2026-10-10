import {describe,it,expect} from 'vitest'
import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {ratedPool} from '@/lib/clubs/rumble'
import {norm} from '@/lib/fixtures/names'

describe('roster wave (10.10.2026): researched men are in the archive and in the game',()=>{
 for(const id of CORE_CLUB_IDS)it(`${id}: every wave man is sourced, unreviewed (confidence 1), unique, and dealt`,{timeout:60000},async()=>{
  const d=(await loadClub(id))!.data,wave=d.players!.filter(p=>/-wv-|^p_wv-/.test(p.id))
  const src=new Set(d.sources.map(s=>s.id)),seen=new Set<string>(),pool=new Set(ratedPool(d).map(p=>p.id))
  for(const p of wave){
   expect(p.confidence,p.value.name).toBe(1)
   expect(p.sources.length).toBeGreaterThan(0);for(const s of p.sources)expect(src.has(s),`${p.value.name} source ${s}`).toBe(true)
   expect(seen.has(norm(p.value.name)),`${id} duplicate ${p.value.name}`).toBe(false);seen.add(norm(p.value.name))
   expect(pool.has(p.id),`${p.value.name} not dealt`).toBe(true)
   if(!p.value.positions.length)expect(p.value.fromYear===null||typeof p.value.fromYear==='number').toBe(true)}
  expect(wave.length).toBeGreaterThan(0)
 })
})
