import {describe,it,expect} from 'vitest'
import {MISSED_MAX,addMissed,clearMissed,emptyMissed,idsOf,parseMissed,settleMissed} from '@/lib/clubs/trivia-missed'

describe('Gate 2 · the device\'s missed ledger (TR-R11)',()=>{
 it('a miss queues the question newest first, once',()=>{
  let m=addMissed(emptyMissed(),'q_a','v1',1);m=addMissed(m,'q_b','v1',2);m=addMissed(m,'q_a','v1',3)
  expect(idsOf(m)).toEqual(['q_a','q_b']);expect(m.items[0]!.at).toBe(3)
 })
 it('a later right answer retires it; nothing is added on the player\'s behalf',()=>{
  const m=settleMissed(emptyMissed(),'q_a','v1',false,1);expect(idsOf(m)).toEqual(['q_a'])
  expect(idsOf(settleMissed(m,'q_a','v1',true,2))).toEqual([]);expect(settleMissed(m,'q_zzz','v1',true,3)).toBe(m)
  expect(idsOf(settleMissed(emptyMissed(),'q_x','v1',true,1))).toEqual([])
 })
 it('is capped',()=>{let m=emptyMissed();for(let i=0;i<MISSED_MAX+10;i++)m=addMissed(m,`q_${i}`,'v',i);expect(m.items).toHaveLength(MISSED_MAX);expect(m.items[0]!.id).toBe(`q_${MISSED_MAX+9}`)})
 it('clearing an id that is not there changes nothing',()=>{const m=addMissed(emptyMissed(),'q_a','v',1);expect(clearMissed(m,'q_b')).toBe(m)})
 it('reads only well-formed rows from storage and never throws',()=>{
  const good={id:'q_a',ver:'v',at:5}
  const m=parseMissed({v:1,items:[good,good,{id:1,ver:'v',at:1},{id:'q_b',ver:'v',at:Infinity},null,'x',{id:'x'.repeat(41),ver:'v',at:1},{id:'q_c',ver:'v',at:2}]})
  expect(idsOf(m)).toEqual(['q_a','q_c'])
  for(const junk of [null,undefined,5,'s',[],{},{items:'no'}])expect(idsOf(parseMissed(junk))).toEqual([])
 })
})
