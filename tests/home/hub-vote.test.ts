import {describe,expect,it} from 'vitest'
import {REGISTRY} from '@/lib/master/registry'
import {DEMO_VOTES,SEED_TOTAL,rank,seedVotes} from '@/lib/home/vote'
import {isOpenClub} from '@/lib/home/hub-open'
import en from '@/messages/clubs/en.json'

const ids=REGISTRY.map(c=>c.id)
describe('hub ballot seed',()=>{
 it('is exactly 33 votes and Maccabi Haifa leads, for the full ballot and for a smaller one',()=>{
  for(const set of [ids,ids.filter(i=>i!=='hapoel-tel-aviv'),['maccabi-haifa','olympiacos'],['olympiacos','celtic','maccabi-haifa','paok']]){
   const v=seedVotes(set)
   expect(Object.values(v).reduce((a,b)=>a+b,0)).toBe(SEED_TOTAL)
   expect(rank(v,set)[0]).toBe('maccabi-haifa')
   expect(Object.values(v).every(n=>Number.isInteger(n)&&n>=0)).toBe(true)
  }
 })
 it('is deterministic',()=>{expect(seedVotes(ids)).toEqual(seedVotes(ids))})
 it('keeps the demo label while the seed is in use',()=>{expect(DEMO_VOTES).toBe(true);expect(en.voteDemo.length).toBeGreaterThan(0)})
 it('a club is open only when a gate has a real address',()=>{
  expect(isOpenClub(undefined)).toBe(false)
  expect(isOpenClub({id:'x',name:'x',city:'x',gates:{xi:{key:'xi',href:null,state:'LOCKED'}}})).toBe(false)
  expect(isOpenClub({id:'x',name:'x',city:'x',gates:{xi:{key:'xi',href:'/clubs/x/xi',state:'OPEN'}}})).toBe(true)
 })
})
