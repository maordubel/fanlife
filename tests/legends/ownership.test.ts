import {afterEach,describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {memoryStore,useDurableStore} from '@/lib/master/durable'
import {DEFAULT_SETTINGS,LEGENDS_RULES as R} from '@/lib/legends/config'
import {createCareer} from '@/lib/legends/career'
import {planClaim} from '@/lib/legends/ownership'
import {claimDeviceCareers,insertCareer,ownerIndex,readCareer,type IndexRow} from '@/lib/legends/store'
import {LEAGUE} from './fixtures'

const G='a'.repeat(32),A='b'.repeat(32)
const row=(id:string,status:IndexRow['status'],at:string):IndexRow=>({id,club:'x',clubName:'X',createdAt:at,status,season:1,phase:'draft',enteredAt:at})
const mk=(id:string,owner:string,status:'active'|'archived'='active')=>{const r=createCareer({id,owner,now:'2026-10-14T00:00:00Z',own:LEAGUE[0]!,rivals:LEAGUE.slice(1),settings:DEFAULT_SETTINGS});if(!r.ok)throw new Error(r.error);return {...r.career,status}}
afterEach(()=>{useDurableStore(undefined as unknown as null)})

describe('F05 plan',()=>{
 it('moves everything when there is room',()=>{
  const p=planClaim([row('1','active','2026-01-01'),row('2','archived','2026-01-02')],[],R.maxActiveCareers)
  expect(p.archived).toEqual([]);expect(p.move.map(m=>m.id).sort()).toEqual(['1','2'])
 })
 it('archives the least recently opened surplus, never drops it',()=>{
  const guest=[row('g1','active','2026-01-01'),row('g2','active','2026-02-01'),row('g3','active','2026-03-01')]
  const acc=[row('a1','active','2026-01-01'),row('a2','active','2026-01-01')]
  const p=planClaim(guest,acc,3)
  expect(p.move).toHaveLength(3);expect(p.archived.sort()).toEqual(['g1','g2'])
  expect(p.move.find(m=>m.id==='g3')!.status).toBe('active')
 })
 it('skips ids the account already holds',()=>{expect(planClaim([row('1','active','2026-01-01')],[row('1','active','2026-01-01')],3).move).toEqual([])})
})

describe('F05 claim (store)',()=>{
 it('moves guest saves under the account, caps actives, and a second run changes nothing',async()=>{
  useDurableStore({...memoryStore(),kind:'vercel-blob'} as never)
  const ids=['a000000000000001','a000000000000002']
  for(const id of ids)expect((await insertCareer(mk(id,G))).ok).toBe(true)
  for(const id of ['b000000000000001','b000000000000002'])expect((await insertCareer(mk(id,A))).ok).toBe(true)
  const r=await claimDeviceCareers(G,A)
  expect(r).toEqual({ok:true,moved:2,archived:1})
  const ai=await ownerIndex(A,true),gi=await ownerIndex(G,true)
  expect(gi.careers).toHaveLength(0)
  expect(ai.careers).toHaveLength(4);expect(ai.careers.filter(c=>c.status==='active')).toHaveLength(R.maxActiveCareers)
  for(const id of ids){const c=await readCareer(id,true);expect(c!.career.owner).toBe(A)}
  expect(await claimDeviceCareers(G,A)).toEqual({ok:true,moved:0,archived:0})
  expect((await ownerIndex(A,true)).careers).toHaveLength(4)
 })
 it('refuses a claim of an owner onto itself and never takes a career that is not the guest’s',async()=>{
  useDurableStore({...memoryStore(),kind:'vercel-blob'} as never)
  await insertCareer(mk('c000000000000001','c'.repeat(32)))
  expect((await claimDeviceCareers(G,G)).ok).toBe(false)
  expect(await claimDeviceCareers(G,A)).toEqual({ok:true,moved:0,archived:0})
  expect((await readCareer('c000000000000001',true))!.career.owner).toBe('c'.repeat(32))
 })
})
