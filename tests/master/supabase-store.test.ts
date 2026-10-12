import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest'

// Owner, 12.10.2026: "approved, Supabase" — the store moves off Vercel Blob (Hobby operation cap) onto worker_fanlife_files.
// A fake PostgREST with the table's real semantics: eq filters, like prefix, ignore-duplicates on create, return=representation.
type Row={name:string;body:string;etag:string}
let rows:Map<string,Row>,tableExists=true,calls:string[]=[]
const blobFiles=new Map<string,{text:string;etag:string}>();let blobRefuses=false
vi.mock('@vercel/blob',()=>{
 class BlobNotFoundError extends Error{};class BlobPreconditionFailedError extends Error{}
 return {BlobNotFoundError,BlobPreconditionFailedError,
  get:async(p:string)=>{calls.push('blob:get');if(blobRefuses)throw new Error('Vercel Blob: Failed to fetch blob: 403 Forbidden');const f=blobFiles.get(p.replace('fan-life/',''));if(!f)throw new BlobNotFoundError();return {statusCode:200,stream:new Response(f.text).body,blob:{etag:f.etag}}},
  put:async()=>{throw new Error('blob writes are not expected')},list:async()=>({blobs:[],hasMore:false})}
})
function fakeFetch(url:string,init:RequestInit={}):Promise<Response>{
 const u=new URL(url),m=(init.method||'GET').toUpperCase();calls.push(`sb:${m}`)
 if(!tableExists)return Promise.resolve(new Response('{"code":"PGRST205","message":"Could not find the table"}',{status:404}))
 const eq=(k:string)=>u.searchParams.get(k)?.replace(/^eq\./,'')
 const json=(v:unknown,s=200)=>Promise.resolve(new Response(JSON.stringify(v),{status:s}))
 if(m==='GET'){
  const like=u.searchParams.get('name')?.startsWith('like.')?u.searchParams.get('name')!.slice(5).replace(/\*$/,''):null
  if(like!==null)return json([...rows.values()].filter(r=>r.name.startsWith(like)).map(r=>({name:r.name})))
  const r=rows.get(eq('name')!);return json(r?[{body:r.body,etag:r.etag}]:[])}
 const body=JSON.parse(String(init.body))
 if(m==='POST'){if(rows.has(body.name))return json([],201);rows.set(body.name,{name:body.name,body:body.body,etag:body.etag});return json([body],201)}
 if(m==='PATCH'){const r=rows.get(eq('name')!);if(!r||r.etag!==eq('etag'))return json([]);r.body=body.body;r.etag=body.etag;return json([r])}
 return json([],405)
}
describe('the Supabase store',()=>{
 const env={...process.env}
 beforeEach(()=>{rows=new Map();tableExists=true;calls=[];blobFiles.clear();blobRefuses=false;vi.resetModules();vi.stubGlobal('fetch',vi.fn(fakeFetch))
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://x.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='service_x';process.env.BLOB_READ_WRITE_TOKEN='vercel_blob_rw_x_y'
  const G=globalThis as Record<string,unknown>;for(const k of ['fanDurable','fanSbMissing','fanBlobQuiet'])delete G[k]})
 afterEach(()=>{process.env={...env};vi.unstubAllGlobals()})
 it('is chosen whenever Supabase is configured, and saves compare-and-swap',async()=>{
  const {durable}=await import('@/lib/master/durable');const d=durable()!
  expect(d.kind).toBe('supabase')
  expect(await d.write('control.json','{"v":1}',null)).toBe(true)
  expect(await d.write('control.json','{"v":9}',null)).toBe(false) // create-only loses to an existing file
  const a=(await d.read('control.json',{fresh:true}))!
  expect(a.text).toBe('{"v":1}')
  expect(await d.write('control.json','{"v":2}','"stale"')).toBe(false)
  expect(await d.write('control.json','{"v":2}',a.etag)).toBe(true)
  expect((await d.read('control.json',{fresh:true}))!.text).toBe('{"v":2}')
  await d.write('desk-packs/a.json','{}',null);await d.write('desk-packs/b.json','{}',null)
  expect(await d.list('desk-packs/',{fresh:true})).toEqual(['desk-packs/a.json','desk-packs/b.json'])
 })
 it('copies a file it has not got from Blob once, then never asks Blob again',async()=>{
  blobFiles.set('control.json',{text:'{"from":"blob"}',etag:'"b1"'})
  const {durable}=await import('@/lib/master/durable');const d=durable()!
  expect((await d.read('control.json',{fresh:true}))!.text).toBe('{"from":"blob"}')
  expect(rows.get('control.json')!.body).toBe('{"from":"blob"}')
  calls=[];await d.read('control.json',{fresh:true})
  expect(calls).toEqual(['sb:GET'])
 })
 it('a refusing Blob (its cap) is left alone for an hour, and the read carries on',async()=>{
  blobRefuses=true
  const {durable}=await import('@/lib/master/durable');const d=durable()!
  expect(await d.read('missing.json')).toBeNull()
  calls=[];expect(await d.read('other.json')).toBeNull()
  expect(calls.filter(c=>c.startsWith('blob'))).toEqual([])
 })
 it('without the table (SQL not run yet) it keeps working on Blob',async()=>{
  tableExists=false;blobFiles.set('control.json',{text:'{"blob":1}',etag:'"b1"'})
  vi.spyOn(console,'error').mockImplementation(()=>{})
  const {durable}=await import('@/lib/master/durable');const d=durable()!
  expect((await d.read('control.json',{fresh:true}))!.text).toBe('{"blob":1}')
 })
 it('the key never reaches anything but the Supabase host',async()=>{
  const {durable}=await import('@/lib/master/durable');await durable()!.read('x',{fresh:true})
  const f=vi.mocked(globalThis.fetch)
  for(const [url] of f.mock.calls)expect(new URL(String(url)).host).toBe('x.supabase.co')
 })
})

// Owner's reliability plan, 12.10.2026 (P0): "not found" ≠ "could not ask". A save must never be built on a seed while the real
// copy may still be in Blob.
describe('the migration guard',()=>{
 const env={...process.env}
 beforeEach(()=>{rows=new Map();tableExists=true;calls=[];blobFiles.clear();blobRefuses=false;vi.resetModules();vi.stubGlobal('fetch',vi.fn(fakeFetch))
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://x.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='service_x';process.env.BLOB_READ_WRITE_TOKEN='vercel_blob_rw_x_y'
  const G=globalThis as Record<string,unknown>;for(const k of ['fanDurable','fanSbMissing','fanBlobQuiet','fanMigration','fanBlobRetired','fanStoreError','fanFailAt','fanLastGood','fanLastGoodAt'])delete G[k]})
 afterEach(()=>{process.env={...env};vi.unstubAllGlobals()})
 it('a read-before-write throws while Blob refuses; a page read carries on with null',async()=>{
  blobRefuses=true;vi.spyOn(console,'error').mockImplementation(()=>{})
  const {durable,MigrationPending,migrationPending}=await import('@/lib/master/durable');const d=durable()!
  await expect(d.read('control.json',{fresh:true})).rejects.toBeInstanceOf(MigrationPending)
  expect(migrationPending()).toBe('control.json')
  expect(await d.read('control.json')).toBeNull()
  // still pending within the quiet hour, without asking Blob again
  calls=[];await expect(d.read('control.json',{fresh:true})).rejects.toBeInstanceOf(MigrationPending)
  expect(calls.filter(c=>c.startsWith('blob'))).toEqual([])
 })
 it('mutate never writes the seed over a copy Blob may still hold',async()=>{
  blobRefuses=true;vi.spyOn(console,'error').mockImplementation(()=>{})
  const {mutate,readState}=await import('@/lib/master/store')
  await expect(mutate(s=>{s.clubs[0].name='x';return true})).rejects.toThrow(/nothing was saved/)
  expect(rows.has('control.json')).toBe(false)
  expect((await readState()).clubs.length).toBeGreaterThan(0) // pages run on the published lineup
 })
 it('Blob confirming the file is absent is a real "not found"',async()=>{
  const {durable}=await import('@/lib/master/durable')
  expect(await durable()!.read('new-file.json',{fresh:true})).toBeNull()
 })
 it('when Blob answers again, the real copy moves across and the save goes on it',async()=>{
  blobRefuses=true;vi.spyOn(console,'error').mockImplementation(()=>{})
  const {durable,retryBlobNow,migrationPending}=await import('@/lib/master/durable');const d=durable()!
  await expect(d.read('control.json',{fresh:true})).rejects.toThrow()
  blobRefuses=false;blobFiles.set('control.json',{text:'{"real":1}',etag:'"b"'});retryBlobNow()
  expect((await d.read('control.json',{fresh:true}))!.text).toBe('{"real":1}')
  expect(migrationPending()).toBeNull()
 })
 it('the owner retiring Blob makes a missing file missing',async()=>{
  blobRefuses=true;vi.spyOn(console,'error').mockImplementation(()=>{})
  const {durable,retireBlob,MigrationPending}=await import('@/lib/master/durable');const d=durable()!
  await expect(d.read('control.json',{fresh:true})).rejects.toBeInstanceOf(MigrationPending)
  await retireBlob('owner')
  expect(rows.has('_store/blob-retired.json')).toBe(true)
  calls=[];expect(await d.read('control.json',{fresh:true})).toBeNull()
  expect(calls.filter(c=>c.startsWith('blob'))).toEqual([])
 })
})
