import {afterEach,describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {dataRoot,onServerless} from '@/lib/dataRoot'
import {memoryStore,useDurableStore} from '@/lib/master/durable'
import {mutate,readState,storageInfo} from '@/lib/master/store'

const env={...process.env}
afterEach(()=>{process.env={...env};useDurableStore(undefined as unknown as null)})

describe('where the server writes (owner, 7.10.2026: ENOENT mkdir /var/task/.fan-life)',()=>{
 it('serverless never writes inside the deployment',()=>{
  delete process.env.FAN_LIFE_DATA_DIR;process.env.VERCEL='1'
  expect(onServerless()).toBe(true)
  expect(dataRoot()).toBe('/tmp/fan-life')
  delete process.env.VERCEL
  expect(dataRoot().endsWith('.fan-life')).toBe(true)
  process.env.FAN_LIFE_DATA_DIR='/x/y';expect(dataRoot()).toBe('/x/y')
 })
 it('without a store on serverless, the admin is told changes are temporary',()=>{
  delete process.env.FAN_LIFE_DATA_DIR;process.env.VERCEL='1';useDurableStore(null)
  const s=storageInfo();expect(s.durable).toBe(false);expect(s.kind).toBe('temporary')
 })
})

describe('durable control state',()=>{
 it('reads the seed, writes, and reads back through the store',async()=>{
  const store=memoryStore();useDurableStore(store)
  const before=await readState()
  const id=before.clubs[0]!.id
  await mutate(s=>{s.clubs.find(c=>c.id===id)!.gaps=['durable check'];return true})
  expect((await readState()).clubs.find(c=>c.id===id)!.gaps).toEqual(['durable check'])
  expect(storageInfo().durable).toBe(true)
 })
 it('a write that lost the race re-applies on the newer state instead of overwriting it',async()=>{
  const store=memoryStore();useDurableStore(store)
  await mutate(s=>{s.clubs[0]!.gaps=['a'];return true})
  // another instance writes between our read and our write
  const realWrite=store.write.bind(store);let raced=false
  store.write=async(name,text,etag)=>{if(!raced&&name==='control.json'){raced=true;const cur=await store.read(name);const other=JSON.parse(cur!.text);other.clubs[1].gaps=['from the other instance'];await realWrite(name,JSON.stringify(other),cur!.etag)}return realWrite(name,text,etag)}
  await mutate(s=>{s.clubs[0]!.gaps=['b'];return true})
  const after=await readState()
  expect(after.clubs[0]!.gaps).toEqual(['b'])
  expect(after.clubs[1]!.gaps).toEqual(['from the other instance'])
 })
})
