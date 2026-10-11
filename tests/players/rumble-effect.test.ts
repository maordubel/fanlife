import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {useDurableStore,memoryStore} from '@/lib/master/durable'
import {listPlayers,publish} from '@/lib/players/service'
import {setSnapshot} from '@/lib/players/effective'
import {EMPTY_SNAPSHOT} from '@/lib/players/types'
import {invalidateClub,loadClub} from '@/lib/clubs/resolver'
import {ratedPool,dealDraft,SELF} from '@/lib/clubs/rumble'
import {xiPool} from '@/lib/clubs/rumble-xi/pool'
import {dealXI} from '@/lib/clubs/rumble-xi/deal'
import {slotsOf} from '@/lib/clubs/rumble-xi/formations'
vi.setConfig({testTimeout:90000})
const who={actor:'tester',role:'owner'},CLUB='celtic'
beforeEach(()=>{useDurableStore(memoryStore());setSnapshot(EMPTY_SNAPSHOT);invalidateClub(CLUB)})
afterEach(()=>{useDurableStore(null);setSnapshot(EMPTY_SNAPSHOT)})
const subject=async()=>{for(let p=1;;p++){const l=await listPlayers({clubs:[CLUB],limit:200,page:p});const r=l.rows.find(x=>x.price===1&&!x.locked&&x.positions.length===1&&x.positions[0]==='MF');if(r)return r;if(p>=l.pages)throw Error('no subject')}}
describe('a published price and position reach the Royal Rumble games',()=>{
 it('the new price and slot are what both formats deal; the old position no longer is',async()=>{
  const r=await subject()
  await publish(CLUB,r.id,{reason:'move him forward and price him',confirmQuota:true,patch:{price:3,positions:['FW']},expectedRev:0},who)
  const d=(await loadClub(CLUB))!.data
  const five=ratedPool(d).find(c=>c.id===r.id)!,eleven=xiPool(d).find(c=>c.id===r.id)!
  for(const c of [five,eleven]){expect(c.price).toBe(3);expect(c.position).toBe('FW')}
  // dealt cards carry the published price, and only in forward slots
  let seen=0
  for(let s=1;s<=400;s++){
   const draft=dealDraft(ratedPool(d),s,SELF)
   draft.forEach((offers,i)=>{for(const c of offers)if(c.id===r.id){seen++;expect(c.price).toBe(3);expect(['FW'].includes(['GK','DF','MF','MF','FW'][i]!)).toBe(true)}})
   const x=dealXI(xiPool(d),xiPool(d),'4-3-3',s,true,CLUB)
   x?.draft.forEach((offers,i)=>{for(const c of offers)if(c.id===r.id){seen++;expect(c.price).toBe(3);expect(slotsOf('4-3-3')[i]!.family).toBe('FW')}})
  }
  expect(seen).toBeGreaterThan(0)
 })
 it('a man removed from the squad is dealt in neither format', async()=>{
  const r=await subject()
  await publish(CLUB,r.id,{reason:'archive mistake',confirmQuota:true,ownerException:true,patch:{removed:true},expectedRev:0},who)
  const d=(await loadClub(CLUB))!.data
  expect(ratedPool(d).some(c=>c.id===r.id)).toBe(false);expect(xiPool(d).some(c=>c.id===r.id)).toBe(false)
 })
})
