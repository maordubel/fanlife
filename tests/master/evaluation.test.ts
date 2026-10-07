import{afterAll,beforeAll,describe,expect,it,vi}from'vitest'
import{mkdtemp,rm}from'node:fs/promises'
import{tmpdir}from'node:os'
import path from'node:path'
import{database,operate}from'@/lib/master/evaluation-db'
const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222'
let dir:string
const OWNER={admin:true},FAN={admin:false}
const rpc=(name:string,args:Record<string,unknown>={},id=alice,access=OWNER)=>operate({kind:'rpc',name,args},id,access)
beforeAll(async()=>{dir=await mkdtemp(path.join(tmpdir(),'fan-life-db-'));vi.stubEnv('NEXT_PUBLIC_FAN_LIFE_EVALUATION','true');vi.stubEnv('FAN_LIFE_DATA_DIR',dir);await database()},120000)
afterAll(async()=>{await(await database()).close();delete(globalThis as typeof globalThis & {fanDB?:unknown}).fanDB;vi.unstubAllEnvs();await rm(dir,{recursive:true,force:true})})
describe('real local native database',()=>{
it('opens local identity and native admin for the owner session',async()=>{expect((await operate({kind:'auth'},alice,OWNER)).data).toMatchObject({id:alice,is_anonymous:false});expect((await rpc('worker_admin_whoami')).data).toMatchObject({ok:true,admin:true})})
it('preserves profile writes and isolates rows between testers',async()=>{const created=await rpc('worker_profile_ensure');expect(created.error).toBeNull();expect(created.data).toEqual(expect.arrayContaining([expect.objectContaining({id:alice})]));expect((await rpc('worker_profile_ensure',{},bob)).error).toBeNull();expect((await operate({kind:'table',name:'worker_profile',patch:{display_name:'First supporter'},filters:[{key:'id',op:'eq',value:alice}],single:true},alice,OWNER)).error).toBeNull();const isolated=await operate({kind:'table',name:'worker_profile',filters:[{key:'id',op:'eq',value:alice}]},bob,OWNER);expect(isolated.error).toBeNull();expect(isolated.data).toEqual([])})
it('runs collection and admin reads while rejecting private helpers and injection',async()=>{expect((await rpc('worker_closet_mine')).data).toMatchObject({ok:true});expect((await rpc('worker_admin_overview')).data).toMatchObject({ok:true});expect((await rpc('worker_touch_profile',{p_user:bob})).error).not.toBeNull();expect((await rpc('worker_profile_ensure);drop table worker_profile')).error).not.toBeNull();expect((await operate({kind:'table',name:'auth.users'},alice,OWNER)).error).not.toBeNull()})
it('never makes a fan an administrator, and takes back a grant from the old open evaluation (audit F01)',async()=>{const carol='33333333-3333-4333-8333-333333333333'
 // a fan plays: identity and their own rows work, admin does not
 expect((await operate({kind:'auth'},carol,FAN)).data).toMatchObject({id:carol})
 const who=await rpc('worker_admin_whoami',{},carol,FAN);expect(who.error).toBeNull();expect((who.data as {admin?:boolean}).admin).toBeFalsy()
 expect((await rpc('worker_admin_overview',{},carol,FAN)).data).not.toMatchObject({ok:true})
 // the owner's session on the same browser is admin…
 expect((await rpc('worker_admin_whoami',{},carol,OWNER)).data).toMatchObject({ok:true,admin:true})
 // …and the grant does not outlive it: the next fan request revokes it
 expect(((await rpc('worker_admin_whoami',{},carol,FAN)).data as {admin?:boolean}).admin).toBeFalsy()
 expect((await(await database()).query('select 1 from worker_admin where user_id=$1',[carol])).rows).toHaveLength(0)})
})
