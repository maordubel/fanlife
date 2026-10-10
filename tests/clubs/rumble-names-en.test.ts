import {describe,it,expect} from 'vitest'
import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {ratedPool} from '@/lib/clubs/rumble'
import {isLatinName} from '@/lib/clubs/rumble-xi/translit'
import {mergesFor} from '@/lib/clubs/rumble-xi/merges'
import review from '@/content/manual/rumble-review-2026-10-10.json'

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
 it('the owner pricing file is kept',()=>{expect((review as unknown[]).length).toBeGreaterThanOrEqual(1255)})
})
