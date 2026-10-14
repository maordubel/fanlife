import {describe,expect,it} from 'vitest'
import {applyAction,createCareer,me,slotsOf,bidsOf,type Intent} from '@/lib/legends/career'
import {DEFAULT_SETTINGS} from '@/lib/legends/config'
import {BUY_SLOTS} from '@/lib/legends/market'
import {LEAGUE} from './fixtures'

const career=()=>{const [own,...rivals]=LEAGUE,r=createCareer({id:'marketslots00001',owner:'o',now:'2026-10-14T00:00:00Z',own:own!,rivals,settings:DEFAULT_SETTINGS});if(!r.ok)throw new Error(r.error);return r.career}
const ctx={now:'2026-10-14T00:00:00Z',catalogs:new Map()}
let n=0
const act=(c:ReturnType<typeof career>,a:Intent)=>applyAction(c,{...a,key:`k${++n}abcdefgh`,rev:c.revision} as never,ctx)

describe('five slots and the transfer list (owner, 14.10.2026)',()=>{
 it('a window shows at most five men, the same five every time, none of them in the squad',()=>{
  const c=career(),a=slotsOf(c),b=slotsOf(c)
  expect(a.length).toBeLessThanOrEqual(BUY_SLOTS);expect(a.map(x=>x.id)).toEqual(b.map(x=>x.id))
  for(const x of a)expect(me(c).squad.some(s=>s.id===x.id)).toBe(false)
 })
 it('listing is allowed in any phase but the draft, and needs a squad man', ()=>{
  const c=career()
  expect(act(c,{kind:'list',card:'nobody',listed:true}).ok).toBe(false)
  expect(bidsOf(c)).toEqual([])
 })
})
