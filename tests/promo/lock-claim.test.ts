import {beforeEach,describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {memoryStore,useDurableStore} from '@/lib/master/durable'
import {POST} from '@/app/api/master/dubid-lock/route'
const SECRET='s'.repeat(40),STAMP='gw-9@2026-10-17T15:45:00Z'
const call=(b:unknown)=>POST(new Request('http://x/api/master/dubid-lock',{method:'POST',headers:{authorization:`Bearer ${SECRET}`,'content-type':'application/json'},body:JSON.stringify(b)}) as never)
describe('DUBID reminder claim',()=>{
 beforeEach(()=>{process.env.CRON_SECRET=SECRET;useDurableStore(memoryStore())})
 it('the first claim wins, a second one is refused so nothing is sent twice',async()=>{
  expect((await call({stamp:STAMP})).status).toBe(200)
  expect((await call({stamp:STAMP})).status).toBe(409)
 })
 it('a released claim can be taken again',async()=>{
  await call({stamp:STAMP});expect((await call({stamp:STAMP,release:true})).status).toBe(200)
  expect((await call({stamp:STAMP})).status).toBe(200)
 })
 it('rejects a bad stamp and missing auth',async()=>{
  expect((await call({stamp:'x'})).status).toBe(400)
  const r=await POST(new Request('http://x',{method:'POST',body:'{}'}) as never);expect(r.status).toBe(401)
 })
})
