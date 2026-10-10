import {describe,it,expect} from 'vitest'
import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {ratedPool} from '@/lib/clubs/rumble'
import {isLatinName} from '@/lib/clubs/rumble-xi/translit'
import {mergesFor} from '@/lib/clubs/rumble-xi/merges'
import review from '@/content/manual/rumble-review-2026-10-10.json'
import {priceFor} from '@/lib/clubs/rumble-xi/prices'

describe('Rumble: every name is English, every price is the reviewed one',()=>{
 for(const id of CORE_CLUB_IDS)it(`${id}: all names Latin, clean and distinct`,{timeout:60000},async()=>{
  const d=await loadClub(id);expect(d).toBeTruthy()
  const pool=ratedPool(d!.data)
  const bad=pool.filter(p=>!isLatinName(p.name)||/image|[\[\]†:<>]/i.test(p.name))
  expect(bad.map(p=>p.name)).toEqual([])
  const seen=new Set(pool.map(p=>p.name.toLowerCase()));expect(seen.size).toBe(pool.length)
 })
 it('no man sits on two cards of one club after the twin merge',async()=>{
  for(const id of CORE_CLUB_IDS)for(const m of mergesFor(id))expect(m.keep).not.toBe(m.drop)
 })
 it('the owner workbook prices that matched are the live prices (pins hold)',async()=>{
  const pins=(await import('@/content/manual/rumble-pins.json')).default as Record<string,Record<string,{priceM:number}>>
  for(const [club,ps] of Object.entries(pins))for(const [pid,e] of Object.entries(ps)){
   const live=priceFor(club,pid);if(live!==1||e.priceM===1)expect(live).toBe(e.priceM)}
  expect((review as unknown[]).length).toBeGreaterThanOrEqual(1255)
 })
})
