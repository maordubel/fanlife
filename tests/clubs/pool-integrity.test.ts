import {describe,it,expect} from 'vitest'
import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {xiPool} from '@/lib/clubs/rumble-xi/pool'
import {hasPrice} from '@/lib/clubs/rumble-xi/prices'

// Player-pool audit (11.10.2026): every card a player can be dealt has an English name, sane years and a frozen price.
// Measured that day: 0 non-Latin names, 0 blank, 0 inverted spans, 0 unpriced across all eight core clubs.
describe('player pools',()=>{
 for(const id of CORE_CLUB_IDS)it(`${id}: English names, sane years, every card priced`,{timeout:60000},async()=>{
  const pool=xiPool((await loadClub(id))!.data)
  expect(pool.length).toBeGreaterThan(0)
  for(const c of pool){
   expect(c.name.trim().length,c.id).toBeGreaterThanOrEqual(3)
   expect(/[֐-׿Ͱ-ϿЀ-ӿ]/.test(c.name),`${id} ${c.name}`).toBe(false)
   if(c.fromYear!==null&&c.toYear!==null)expect(c.fromYear,`${id} ${c.name}`).toBeLessThanOrEqual(c.toYear)
   if(c.fromYear!==null)expect(c.fromYear,`${id} ${c.name}`).toBeLessThanOrEqual(new Date().getUTCFullYear())
   expect(hasPrice(id,c.id),`${id} ${c.name} has no frozen price`).toBe(true)
  }
 })
})
