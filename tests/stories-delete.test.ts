import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest'
const {rows,write}=vi.hoisted(()=>{
 const rows=new Map<string,{text:string;etag:string}>()
 const write=vi.fn(async(name:string,text:string,etag:string|null)=>{
  const cur=rows.get(name)
  if((cur?.etag??null)!==etag)return false
  rows.set(name,{text,etag:String(Number(cur?.etag??0)+1)});return true
 })
 return {rows,write}
})
vi.mock('@/lib/master/durable',()=>({durable:()=>({kind:'supabase',read:async(n:string)=>rows.get(n)??null,write,list:async()=>[...rows.keys()]}),
 readPrefix:async(_d:unknown,p:string)=>[...rows.entries()].filter(([k])=>k.startsWith(p)).map(([name,r])=>({name,...(r as {text:string;etag:string})}))}))
vi.mock('@/lib/master/admin',()=>({adminFromRequest:(r:Request)=>r.headers.get('x-test-owner')==='yes'?{actor:'owner'}:null}))
import {DELETE} from '@/app/api/master/stories/[id]/route'
import {createJob,deleteJob,deletionCleaned,getJob,listJobs,pendingDeletions,updateJob} from '@/lib/stories/store'
import {purgeJobMedia,removeFolder} from '@/lib/stories/media'
import {newJob,validateBrief,ownerAct} from '@/lib/stories/jobs'
const id='job-0000001',at=new Date('2026-11-06T10:00:00Z')
const brief=validateBrief({club_id:'celtic',season:'1999/00',duration:5},new Map([['celtic','Celtic']]))
const job=()=>newJob(id,brief,{club_id:'celtic',club_name:'Celtic',primary:'#007744',on_primary:'#FFFFFF',bans:['red']},'owner','key-00000001')
beforeEach(()=>{rows.clear();write.mockClear();vi.stubEnv('FAN_LIFE_STORE_URL','https://storage.test');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test-key')})
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()})
describe('Permanent production deletion',()=>{
 it('removes job content, hides it from all queues and prevents recreation',async()=>{
  await createJob({...job(),state:'ready',message:'private script'})
  await deleteJob(id,at);await deleteJob(id,at)
  expect(await getJob(id)).toBeNull();expect(await listJobs()).toEqual([])
  expect(rows.get(`stories/jobs/${id}.json`)?.text).not.toContain('script')
  expect(await createJob(job())).toBe(false)
  await expect(updateJob(id,j=>({...j,state:'ready'}))).rejects.toThrow('No such job')
 })
 it('rejects a stale worker CAS after deletion wins the race',async()=>{
  await createJob(job());const before=await getJob(id)
  await deleteJob(id,at)
  expect(await write(`stories/jobs/${id}.json`,JSON.stringify({...job(),state:'ready'}),before!.etag)).toBe(false)
  expect(await getJob(id)).toBeNull()
 })
 it('retains retries and sweeps after old workers and signed upload tokens expire',async()=>{
  await createJob(job());await deleteJob(id,at)
  expect(await pendingDeletions(at)).toHaveLength(1)
  await deletionCleaned(id,at)
  expect(await pendingDeletions(at)).toEqual([])
  expect(await pendingDeletions(at,false)).toHaveLength(1)
  const final=new Date(+at+8*3600_000)
  expect(await pendingDeletions(final)).toHaveLength(1)
  await deletionCleaned(id,final)
  expect(await pendingDeletions(final)).toEqual([])
  expect(JSON.parse(rows.get(`stories/jobs/${id}.json`)!.text)).toEqual({id,deleted:true})
 })
 it('refuses cleanup of live jobs and invalid identifiers',async()=>{
  await createJob(job())
  await expect(deletionCleaned(id)).rejects.toThrow('No such deletion')
  await expect(deleteJob('../anything')).rejects.toThrow()
 })
 it('keeps other series out of documentary picture uploads',()=>{
  expect(()=>ownerAct({...job(),kind:'vlog',state:'paused'},{action:'art_added',files:[{name:'a.png',illustrated:false}]},'owner')).toThrow('own footage')
 })
})
describe('Production storage purge',()=>{
 it('paginates and includes nested orphan uploads before deleting',async()=>{
  const names=Array.from({length:100},(_,i)=>({name:`art-${i}.png`,id:String(i)}))
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json(names)).mockResolvedValueOnce(Response.json([{name:'nested',id:null}]))
   .mockResolvedValueOnce(Response.json([{name:'orphan.mp4',id:'x'}])).mockResolvedValue(new Response(''))
  vi.stubGlobal('fetch',fetcher);await purgeJobMedia(id)
  const bodies=fetcher.mock.calls.map(c=>JSON.parse(c[1].body))
  expect(bodies[1].offset).toBe(100);expect(bodies[2].prefix).toBe(`jobs/${id}/nested`)
  expect(bodies.slice(3).flatMap(b=>b.prefixes)).toHaveLength(101)
  expect(bodies[4].prefixes).toEqual([`jobs/${id}/nested/orphan.mp4`])
 })
 it('never reports success when storage refuses listing or deletion',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('',{status:503})))
  await expect(purgeJobMedia(id)).rejects.toThrow('listing failed')
  await expect(removeFolder(id,['master.000.part'])).rejects.toThrow('refused deletion')
 })
})

describe('Delete endpoint',()=>{
 const request=(owner=true,origin='https://studio.test')=>new Request(`https://studio.test/api/master/stories/${id}`,{method:'DELETE',headers:{origin,'x-test-owner':owner?'yes':'no'}})
 it('requires owner authentication and the Studio origin',async()=>{
  await createJob(job())
  expect((await DELETE(request(false),{params:{id}})).status).toBe(401)
  expect((await DELETE(request(true,'https://elsewhere.test'),{params:{id}})).status).toBe(403)
  expect(await getJob(id)).not.toBeNull()
 })
 it('removes finished jobs and truthfully queues storage failures',async()=>{
  await createJob({...job(),state:'ready'})
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('',{status:503})))
  const response=await DELETE(request(),{params:{id}})
  expect(response.status).toBe(202)
  expect(await response.json()).toEqual({deleted:true,mediaRemoved:false,cleanupPending:true})
  expect(await getJob(id)).toBeNull();expect(await pendingDeletions()).toHaveLength(1)
 })
})
