import {describe,it,expect,vi,beforeEach} from 'vitest'
const request=vi.hoisted(()=>({host:'hapoeltelaviv.localhost',paused:false,gates:[6],values:new Map<string,string>()}))
vi.mock('next/headers',()=>({headers:()=>new Headers({host:request.host}),cookies:()=>({get:(key:string)=>request.values.has(key)?{value:request.values.get(key)}:undefined,set:(key:string,value:string)=>request.values.set(key,value)})}))
vi.mock('@/lib/master/store',()=>({readState:async()=>({clubs:['olympiacos','zrinjski-mostar','hapoel-tel-aviv'].map(id=>({id,status:request.paused?'paused':'live',gates:request.gates}))})}))
import {revealMemoryPair} from '@/app/clubs/[slug]/[gate]/memory-actions'
import {loadClub} from '@/lib/clubs/resolver'
import {dealMemory} from '@/lib/clubs/memory-deck'
beforeEach(()=>{request.host='hapoeltelaviv.localhost';request.paused=false;request.gates=[6];request.values.clear()})
describe('reveal action (ME-R12)',()=>{
 const base=async()=>{
  const data=(await loadClub('hapoel-tel-aviv'))!.data,dealt=dealMemory(data,{size:2,theme:null,seed:3,cursor:0})
  if('blocked' in dealt)throw new Error('blocked '+dealt.blocked.code)
  const first=dealt.deal.cards[0]!,mate=dealt.deal.cards.findIndex((c,i)=>i>0&&c.pair===first.pair),other=dealt.deal.cards.findIndex(c=>c.pair!==first.pair)
  return {data,mate,other,input:{slug:data.identity.id,version:data.version,seed:3,cursor:0,size:2,theme:null as string|null,i:0,j:mate,lang:'en'}}
 }
 it('reveals the relation only for two positions that are mates',async()=>{
  const {input,other}=await base()
  const ok=await revealMemoryPair(input);expect(ok.ok).toBe(true)
  if(ok.ok){expect(typeof ok.reveal.type).toBe('string');expect(ok.reveal.key).toMatch(/^[0-9a-f]{14}$/)}
  expect(await revealMemoryPair({...input,j:other})).toEqual({ok:false,error:'NOT_A_PAIR'})
  expect(await revealMemoryPair({...input,j:0})).toEqual({ok:false,error:'NOT_A_PAIR'})
 },30000)
 it('refuses bad input, stale versions and closed or paused gates with a flat answer',async()=>{
  const {input}=await base()
  for(const bad of [{i:-1},{j:12},{i:1.5},{size:3},{theme:'bogus'},{cursor:-1},{seed:'x' as unknown as number}])expect(await revealMemoryPair({...input,...bad})).toEqual({ok:false,error:'BAD_INPUT'})
  expect(await revealMemoryPair({...input,version:'stale'})).toEqual({ok:false,error:'GATE_CLOSED'})
  request.gates=[2];expect(await revealMemoryPair(input)).toEqual({ok:false,error:'GATE_CLOSED'})
  request.gates=[6];request.paused=true;expect(await revealMemoryPair(input)).toEqual({ok:false,error:'GATE_CLOSED'})
  request.paused=false;request.host='zrinjski.localhost';expect((await revealMemoryPair({...input,slug:'hapoel-tel-aviv'})).ok).toBe(false)
 },30000)
})
