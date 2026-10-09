import {afterEach,describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {dataRoot,onServerless} from '@/lib/dataRoot'
import {memoryStore,useDurableStore} from '@/lib/master/durable'
import {mutate,readState,storageInfo,readAuditArchive,auditArchiveMonths} from '@/lib/master/store'
import {AUDIT_KEEP} from '@/lib/master/audit-log'

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
 it('keeps trying through a burst of collisions instead of saying "busy" after five (owner, 9.10.2026)',async()=>{
  const store=memoryStore();useDurableStore(store)
  await mutate(()=>true)
  const realWrite=store.write.bind(store);let lost=0
  store.write=async(name,text,etag)=>{if(name==='control.json'&&lost<6){lost++;const cur=await store.read(name);await realWrite(name,cur!.text,cur!.etag);return false}return realWrite(name,text,etag)}
  await expect(mutate(s=>{s.clubs[0]!.gaps=['after the burst'];return true})).resolves.toBe(true)
  expect(lost).toBe(6)
  expect((await readState()).clubs[0]!.gaps).toEqual(['after the burst'])
 },20000)
 it('a rotation that loses the race does not archive the same entries twice (release review, reproduced)',async()=>{
  const store=memoryStore();useDurableStore(store)
  const old=Array.from({length:AUDIT_KEEP+3},(_,i)=>({at:`2026-01-01T00:00:${String(i%60).padStart(2,'0')}.${String(i).padStart(6,'0')}Z`,action:'seed',target:`t${i}`,detail:'',actor:'system',role:'system'}))
  await mutate(()=>true)
  const realWrite=store.write.bind(store);let raced=false
  store.write=async(name,text,etag)=>{if(!raced&&name==='control.json'){raced=true;const cur=await store.read(name);await realWrite(name,cur!.text.replace('"revision":','"revision":0,"_x":'),cur!.etag)}return realWrite(name,text,etag)}
  await mutate(s=>{(s as {audit:unknown[]}).audit=old;s.clubs[0]!.gaps=['c'];return true})
  expect(raced).toBe(true)
  const months=await auditArchiveMonths();const rows=(await Promise.all(months.map(readAuditArchive))).flat()
  const keys=rows.map(r=>JSON.stringify(r));expect(new Set(keys).size).toBe(keys.length);expect(rows.length).toBeGreaterThan(0)
 })
 it('a connected store that refuses: pages still read, the admin is told, a write is refused (owner, 7.10.2026)',async()=>{
  const store=memoryStore();store.read=async()=>{throw new Error('No blob credentials found.')};useDurableStore(store)
  const st=await readState();expect(st.clubs.length).toBeGreaterThan(0)
  const info=storageInfo();expect(info.durable).toBe(false);expect(info.error).toContain('credentials')
  await expect(mutate(()=>true)).rejects.toThrow()
 })
 it('the newer Blob connection (store id + OIDC, no read-write token) counts as connected',async()=>{
  const {blobConnected}=await import('@/lib/master/durable')
  delete process.env.BLOB_READ_WRITE_TOKEN;delete process.env.BLOB_STORE_ID;expect(blobConnected()).toBe(false)
  process.env.BLOB_STORE_ID='store_abc';expect(blobConnected()).toBe(true)
 })
})
