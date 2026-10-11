import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest'

// Hub outage 11.10.2026: the store refused the deployment's OIDC token (403) and every page served the closed seed.
// The store must fall back to the read-write token, keep using what worked, and say what is configured.
const calls:{op:string;token?:string}[]=[]
vi.mock('@vercel/blob',()=>{
 class BlobNotFoundError extends Error{}
 class BlobPreconditionFailedError extends Error{}
 const refuse=(o:{token?:string})=>{if(!o.token)throw new Error('Vercel Blob: Failed to fetch blob: 403 Forbidden')}
 return {BlobNotFoundError,BlobPreconditionFailedError,
  get:async(_p:string,o:{token?:string})=>{calls.push({op:'get',token:o.token});refuse(o);return {statusCode:200,stream:new Response('{"ok":1}').body,blob:{etag:'"e1"'}}},
  put:async(_p:string,_t:string,o:{token?:string})=>{calls.push({op:'put',token:o.token});refuse(o);return {etag:'"e2"'}},
  list:async(o:{token?:string})=>{calls.push({op:'list',token:o.token});refuse(o);return {blobs:[],hasMore:false}}}
})

describe('Blob credentials fall back when one is refused',()=>{
 const env={...process.env}
 beforeEach(()=>{calls.length=0;vi.resetModules();process.env.BLOB_STORE_ID='store_x';process.env.BLOB_READ_WRITE_TOKEN='vercel_blob_rw_x_y';delete (globalThis as {fanDurable?:unknown}).fanDurable;delete (globalThis as {fanBlobAuth?:unknown}).fanBlobAuth})
 afterEach(()=>{process.env={...env}})
 it('a 403 on the default credential retries with the read-write token, and keeps using it',async()=>{
  const {durable,blobAuthReport}=await import('@/lib/master/durable')
  const d=durable()!
  expect(await d.read('control.json')).toEqual({text:'{"ok":1}',etag:'"e1"'})
  expect(calls.map(c=>!!c.token)).toEqual([false,true])
  expect(await d.write('x.json','{}','"e1"')).toBe(true)
  expect(calls.at(-1)!.token).toBeTruthy() // the credential that answered is tried first now
  const r=blobAuthReport()
  expect(r).toMatchObject({storeId:true,readWriteToken:true,answeredTo:'token'})
  expect(JSON.stringify(r)).not.toContain('vercel_blob_rw') // booleans, never a secret
 })
 it('with no read-write token the refusal reaches the caller as itself',async()=>{
  delete process.env.BLOB_READ_WRITE_TOKEN
  const {durable,blobAuthReport}=await import('@/lib/master/durable')
  await expect(durable()!.read('control.json')).rejects.toThrow(/403/)
  expect(blobAuthReport()).toMatchObject({readWriteToken:false,answeredTo:null,lastRefusal:expect.stringMatching(/^default: .*403/)})
 })
})
