import {describe,it,expect} from 'vitest'
import {NO_TALLY,memoryTally,percentages,slotOf,syncVotes,type Vote} from '@/lib/clubs/polls-votes'
import {dealBallot,emptySlip,pending,setPick,standingOf,questionOf} from '@/lib/clubs/polls-model'
import type {ClubPlayer} from '@/lib/clubs/contract'

const P=(id:string,positions:ClubPlayer['positions']):ClubPlayer=>({id,name:id,aliases:[],positions,fromYear:2000,toYear:2005})
const players=[P('a',['GK']),P('b',['GK']),P('c',['MF']),P('d',['MF'])]
const ballot=dealBallot(players),ctx={club:'x',voter:'voter12345678'}
const vote=(over:Partial<Vote>={}):Vote=>({club:'x',qid:'keeper',pv:'p1',choice:'a',key:'k1',voter:'v1',...over})

describe('PO-R06 · one active vote per voter, line and version',()=>{
 it('A then B replaces A: the tally never holds both',async()=>{
  const s=memoryTally();expect(await s.submit(vote())).toEqual({ok:true,duplicate:false,replaced:false})
  expect(await s.submit(vote({choice:'b',key:'k2'}))).toEqual({ok:true,duplicate:false,replaced:true})
  const r=await s.read('x','keeper','p1');expect(r).toEqual({counts:{b:1},total:1})
 })
 it('two voters are two votes; a new prompt version is a new line',async()=>{
  const s=memoryTally();await s.submit(vote());await s.submit(vote({voter:'v2',key:'k2'}));await s.submit(vote({pv:'p2',key:'k3'}))
  expect((await s.read('x','keeper','p1'))!.total).toBe(2);expect((await s.read('x','keeper','p2'))!.total).toBe(1)
  expect(slotOf(vote())).not.toBe(slotOf(vote({pv:'p2'})))
 })
})

describe('PO-R08 · a retry cannot count twice; offline is not counted',()=>{
 it('the same key is accepted once, then reported as a duplicate',async()=>{
  const s=memoryTally();await s.submit(vote());expect(await s.submit(vote())).toEqual({ok:true,duplicate:true,replaced:false})
  expect((await s.read('x','keeper','p1'))!.total).toBe(1)
 })
 it('refuses an incomplete vote and an unreachable store without counting',async()=>{
  expect(await memoryTally().submit(vote({key:''}))).toEqual({ok:false,reason:'invalid'})
  const off=memoryTally({offline:()=>true});expect(await off.submit(vote())).toEqual({ok:false,reason:'unavailable'})
  expect((await off.read('x','keeper','p1'))!.total).toBe(0)
 })
 it('syncVotes sends pending picks with their stored keys and records what was accepted',async()=>{
  const q=questionOf(ballot,'keeper')!;let slip=setPick(emptySlip(),q,'a',ctx)
  const store=memoryTally(),r=await syncVotes(slip,ballot,'x',store)
  expect(r.counted).toEqual(['keeper']);expect(r.waiting).toEqual([]);expect(standingOf(r.slip,'keeper')).toBe('counted')
  expect([...store.votes.values()][0]!.key).toBe(slip.keys.keeper)
  const again=await syncVotes(r.slip,ballot,'x',store);expect(again.counted).toEqual([]);expect(store.votes.size).toBe(1)
 })
 it('an offline slip stays "on this device" and is sent with the SAME key on reconnect',async()=>{
  const q=questionOf(ballot,'keeper')!,slip=setPick(emptySlip(),q,'a',ctx);let down=true
  const store=memoryTally({offline:()=>down}),first=await syncVotes(slip,ballot,'x',store)
  expect(first.counted).toEqual([]);expect(first.waiting).toEqual(['keeper']);expect(standingOf(first.slip,'keeper')).toBe('device');expect(store.votes.size).toBe(0)
  down=false;const second=await syncVotes(first.slip,ballot,'x',store)
  expect(second.counted).toEqual(['keeper']);expect([...store.votes.values()][0]!.key).toBe(slip.keys.keeper)
 })
 it('changing the pick after it was counted makes the new pick pending and the old one is replaced',async()=>{
  const q=questionOf(ballot,'keeper')!,store=memoryTally();let slip=(await syncVotes(setPick(emptySlip(),q,'a',ctx),ballot,'x',store)).slip
  slip=setPick(slip,q,'b',ctx);expect(pending(slip,ballot).map(x=>x.id)).toEqual(['keeper'])
  slip=(await syncVotes(slip,ballot,'x',store)).slip
  expect((await store.read('x','keeper',q.version))).toEqual({counts:{b:1},total:1});expect(standingOf(slip,'keeper')).toBe('counted')
 })
 it('with no tally behind the gate nothing is ever counted',async()=>{
  const q=questionOf(ballot,'keeper')!,slip=setPick(emptySlip(),q,'a',ctx),r=await syncVotes(slip,ballot,'x',NO_TALLY)
  expect(NO_TALLY.available).toBe(false);expect(r.counted).toEqual([]);expect(r.slip).toBe(slip);expect(r.waiting).toEqual(['keeper'])
  expect(await NO_TALLY.read('x','keeper','p')).toBeNull()
 })
})

describe('PO-R07 · percentages name their denominator and never invent a crowd',()=>{
 it('zero votes: no percentage, no NaN, total 0',()=>{
  for(const t of [null,{counts:{},total:0}]){const r=percentages(t,['a','b']);expect(r.total).toBe(0);expect(r.rows.every(x=>x.pct===null&&x.count===0)).toBe(true)}
  expect(JSON.stringify(percentages(null,['a']))).not.toMatch(/NaN|Infinity/)
 })
 it('rows of one line add to exactly 100, whatever the rounding',()=>{
  for(const c of [{a:1,b:1,c:1},{a:1,b:2},{a:5,b:3,c:3,d:1},{a:1}] as Record<string,number>[]){
   const r=percentages({counts:c,total:0},Object.keys(c));expect(r.rows.reduce((n,x)=>n+x.pct!,0)).toBe(100)
   expect(r.total).toBe(Object.values(c).reduce((n,x)=>n+x,0))
  }
  expect(percentages({counts:{a:1,b:1,c:1},total:3},['a','b','c']).rows.map(x=>x.pct).sort()).toEqual([33,33,34])
 })
 it('uses accepted votes as the denominator — the stated total, not the roster size — and keeps unvoted choices at 0%',()=>{
  const r=percentages({counts:{a:3,b:1},total:4},['a','b','c']);expect(r.total).toBe(4)
  expect(r.rows.find(x=>x.id==='a')!.pct).toBe(75);expect(r.rows.find(x=>x.id==='c')!.pct).toBe(0)
 })
})
