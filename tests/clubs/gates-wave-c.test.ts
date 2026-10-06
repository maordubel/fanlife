import {clubGoals} from '@/lib/clubs/goal'
import {describe,it,expect} from 'vitest'
import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {lineupMatches,lineupPool,buildableKits,kitViews,rivalsOf,waveCReadiness} from '@/lib/clubs/gate-content'
import {SHARED_GATES,gateAvailability} from '@/lib/clubs/gates'
import type {ClubData} from '@/lib/clubs/contract'
const fact=(id:string,value:object)=>({id,value,sources:['s'],confidence:3 as const,status:'approved' as const,researchedAt:'2026-10-06',approvedAt:'2026-10-06',approvedBy:'t',notes:''})
const synth=(over:Partial<ClubData>)=>({players:Array.from({length:20},(_,i)=>fact(`p${i}`,{id:`p${i}`,name:`Player ${i}`,positions:[],fromYear:null,toYear:null,aliases:[]})),matches:null,kits:null,rivals:null,...over}) as unknown as ClubData
describe('wave C gates are computed, never asserted',()=>{
 it('every core club reports a readiness for all six gates, and gate 8 opens only on sourced touch sequences',async()=>{
  for(const id of CORE_CLUB_IDS){
   const d=(await loadClub(id))!.data
   for(const g of ['lineup','kit-builder','kits','derby','goal','royal-rumble'] as const)expect(d.gates[g],`${id}:${g}`).toBeTruthy()
   // gate 8 was locked for every club until a shared engine existed; it now opens exactly where a pack holds a sourced sequence
   const goals=clubGoals(d).length
   expect(d.gates.goal!.playable).toBe(goals>0)
   if(!goals)expect(d.gates.goal!.reasons.length).toBeGreaterThan(0)
   for(const g of SHARED_GATES)expect(gateAvailability(d,g.key).state).toBeTruthy()
  }
 },60000)
 it('lineup needs exactly eleven distinct starters and three other squad players',()=>{
  const ok=synth({matches:[fact('m1',{name:'A v B',on:'2000-01-01',competition:'Cup',score:'1-0',lineup:Array.from({length:11},(_,i)=>`Player ${i}`),bench:[]}),fact('m2',{name:'short',lineup:['x']})] as never})
  expect(lineupMatches(ok).map(m=>m.id)).toEqual(['m1'])
  const pool=lineupPool(ok,lineupMatches(ok)[0]!)
  expect(pool.length).toBe(20);expect(pool).toEqual([...pool].sort((a,b)=>a.localeCompare(b)))
  expect(waveCReadiness(ok).lineup!.playable).toBe(true)
  expect(waveCReadiness(synth({})).lineup!.playable).toBe(false)
 })
 it('kits need a season; a builder question also needs maker and design',()=>{
  const d=synth({kits:[fact('k1',{name:'k',season:'1994/95',manufacturer:'Pienne',construction:{design:'hoops',colors:'red/white'}}),fact('k2',{name:'k',season:'1995/96'})] as never})
  expect(kitViews(d)).toHaveLength(2);expect(buildableKits(d)).toHaveLength(1);expect(kitViews(d)[0]!.colours).toEqual(['red','white'])
 })
 it('derby needs a human-approved rival, never an inferred one',()=>{
  expect(waveCReadiness(synth({})).derby!.playable).toBe(false)
  const d=synth({rivals:[fact('r',{name:'Rival'})] as never});expect(rivalsOf(d)).toHaveLength(1);expect(waveCReadiness(d).derby!.playable).toBe(true)
 })
})
