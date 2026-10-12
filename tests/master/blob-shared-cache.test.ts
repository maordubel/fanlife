import {describe,it,expect,vi,beforeEach} from 'vitest'

// Blob quota (11.10.2026): the store hit the Hobby plan's operation limit because every page view on every cold instance read it.
// A page's read goes through the deployment-wide data cache; a save drops that copy; a read-before-write never uses it.
const ops:string[]=[],cache=new Map<string,unknown>(),dropped:string[]=[]
vi.mock('next/cache',()=>({
 unstable_cache:(fn:()=>Promise<unknown>,key:string[],o:{tags:string[]})=>async()=>{const k=key.join('|');if(!cache.has(k))cache.set(k,await fn());expect(o.tags[0]).toMatch(/^fan-blob/);return cache.get(k)},
 revalidateTag:(t:string)=>{dropped.push(t);for(const k of [...cache.keys()])if(t==='fan-blob:'+k.split('|')[1]||t==='fan-blob-list:'+k.split('|')[1]?.split('/')[0])cache.delete(k)},
}))
vi.mock('@vercel/blob',()=>{
 class BlobNotFoundError extends Error{}
 class BlobPreconditionFailedError extends Error{}
 let etag=1
 return {BlobNotFoundError,BlobPreconditionFailedError,
  get:async()=>{ops.push('get');return {statusCode:200,stream:new Response(`{"v":${etag}}`).body,blob:{etag:`"e${etag}"`}}},
  put:async()=>{ops.push('put');etag++;return {etag:`"e${etag}"`}},
  list:async()=>{ops.push('list');return {blobs:[{pathname:'fan-life/desk-packs/a.json'}],hasMore:false}}}
})

describe('public reads share one cached copy',()=>{
 beforeEach(()=>{ops.length=0;cache.clear();dropped.length=0;vi.resetModules();process.env.BLOB_READ_WRITE_TOKEN='vercel_blob_rw_x_y';delete (globalThis as {fanDurable?:unknown}).fanDurable})
 it('a hundred page reads cost one store request; a save drops the copy; a read-before-write always asks',async()=>{
  const {durable}=await import('@/lib/master/durable')
  const d=durable()!
  for(let i=0;i<100;i++)expect((await d.read('control.json',{shared:true}))!.text).toBe('{"v":1}')
  expect(ops).toEqual(['get'])
  await d.read('control.json') // a write path: never the shared copy
  expect(ops).toEqual(['get','get'])
  expect(await d.write('control.json','{"v":2}','"e1"')).toBe(true)
  expect(dropped).toContain('fan-blob:control.json')
  expect((await d.read('control.json',{shared:true}))!.text).toBe('{"v":2}')
 })
 it('a shared list is cached and dropped by a write under its prefix',async()=>{
  const {durable}=await import('@/lib/master/durable')
  const d=durable()!
  await d.list('desk-packs/',{shared:true});await d.list('desk-packs/',{shared:true})
  expect(ops.filter(o=>o==='list')).toHaveLength(1)
  await d.write('desk-packs/a.json','{}',null)
  expect(dropped).toContain('fan-blob-list:desk-packs')
 })
})
