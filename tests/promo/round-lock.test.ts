import {describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {countdownOf,readRoundLock,COUNTDOWN_HOURS} from '@/lib/promo/roundLock'
const lock=(over={})=>({code:'gw-9',number:9,status:'open',lockAt:'2026-10-17T15:45:00Z',serverNow:0,...over})
const T=Date.parse('2026-10-17T15:45:00Z')
describe('countdownOf',()=>{
 it('starts exactly 12 hours before the lock',()=>{
  expect(countdownOf(lock(),T-COUNTDOWN_HOURS*3600_000-1)).toBeNull()
  const c=countdownOf(lock(),T-COUNTDOWN_HOURS*3600_000)
  expect(c?.closesAt).toBe('2026-10-17T15:45:00.000Z');expect(c?.startsAt).toBe('2026-10-17T03:45:00.000Z')
 })
 it('ends at the lock and ignores locked rounds',()=>{
  expect(countdownOf(lock(),T)).toBeNull();expect(countdownOf(lock({status:'locked'}),T-1000)).toBeNull();expect(countdownOf(null,T-1000)).toBeNull()
 })
})
describe('readRoundLock',()=>{
 it('reads DUBID functions in the game schema and never invents a time',async()=>{
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://x.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='k'
  const seen:string[]=[]
  const f=(async(u:string,i:RequestInit)=>{seen.push(`${u}|${(i.headers as Record<string,string>)['accept-profile']}`);return new Response(JSON.stringify(u.endsWith('current_gameweek')?'gw-9':{number:9,status:'open',lockAt:'2026-10-17T15:45:00Z',serverNow:5}))}) as unknown as typeof fetch
  expect((await readRoundLock(f))?.lockAt).toBe('2026-10-17T15:45:00Z');expect(seen.every(s=>s.endsWith('|game'))).toBe(true)
  expect(await readRoundLock((async()=>new Response('no',{status:500})) as unknown as typeof fetch)).toBeNull()
  expect(await readRoundLock((async()=>new Response(JSON.stringify('gw-9'))) as unknown as typeof fetch)).toBeNull()
 })
})
