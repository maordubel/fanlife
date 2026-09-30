import{afterAll,beforeAll,describe,expect,it,vi}from'vitest'
import{mkdtemp,rm}from'node:fs/promises'
import{tmpdir}from'node:os'
import path from'node:path'
import{database,operate}from'@/lib/master/evaluation-db'
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222'
let dir:string
const rpc=(name:string,args:Record<string,unknown>={},id=alice)=>operate({kind:'rpc',name,args},id)
beforeAll(async()=>{dir=await mkdtemp(path.join(tmpdir(),'fan-life-db-'));vi.stubEnv('NEXT_PUBLIC_FAN_LIFE_EVALUATION','true');vi.stubEnv('FAN_LIFE_DATA_DIR',dir);await database()},120000)
afterAll(async()=>{await(await database()).close();delete(globalThis as typeof globalThis & {fanDB?:unknown}).fanDB;vi.unstubAllEnvs();await rm(dir,{recursive:true,force:true})})
describe('real local native database',()=>{
it('opens local identity and native admin without registration',async()=>{expect((await operate({kind:'auth'},alice)).data).toMatchObject({id:alice,is_anonymous:false});expect((await rpc('worker_admin_whoami')).data).toMatchObject({ok:true,admin:true})})
it('preserves profile writes and isolates rows between testers',async()=>{const created=await rpc('worker_profile_ensure');expect(created.error).toBeNull();expect(created.data).toEqual(expect.arrayContaining([expect.objectContaining({id:alice})]));expect((await rpc('worker_profile_ensure',{},bob)).error).toBeNull();expect((await operate({kind:'table',name:'worker_profile',patch:{display_name:'First supporter'},filters:[{key:'id',op:'eq',value:alice}],single:true},alice)).error).toBeNull();const isolated=await operate({kind:'table',name:'worker_profile',filters:[{key:'id',op:'eq',value:alice}]},bob);expect(isolated.error).toBeNull();expect(isolated.data).toEqual([])})
it('runs collection and admin reads while rejecting private helpers and injection',async()=>{expect((await rpc('worker_closet_mine')).data).toMatchObject({ok:true});expect((await rpc('worker_admin_overview')).data).toMatchObject({ok:true});expect((await rpc('worker_touch_profile',{p_user:bob})).error).not.toBeNull();expect((await rpc('worker_profile_ensure);drop table worker_profile')).error).not.toBeNull();expect((await operate({kind:'table',name:'auth.users'},alice)).error).not.toBeNull()})})
