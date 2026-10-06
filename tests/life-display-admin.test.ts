import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest'
import {NextRequest} from 'next/server'
import {mkdtemp,rm,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {DISPLAY_DEFAULTS,changedKeys,emptyDisplay,publicDisplay,publish,reset,revert,saveDraft,validateDisplay} from '@/lib/master/lifeDisplay'
import {gateAccess} from '@/lib/clubs/access'
import {activationCheck} from '@/lib/master/summary'

describe('LIFE display contract',()=>{
 it('rejects unknown keys, wrong types and out-of-range values, naming each key — never clamps',()=>{
  const r=validateDisplay({zoom:9,mirror:'yes',figure:'robot',colour:'red'},{partial:true})
  expect(r.ok).toBe(false)
  if(!r.ok)expect(r.errors).toEqual(expect.arrayContaining([{key:'zoom',problem:'out-of-range'},{key:'mirror',problem:'wrong-type'},{key:'figure',problem:'not-allowed'},{key:'colour',problem:'unknown-key'}]))
  expect(validateDisplay({zoom:1.2},{partial:true})).toEqual({ok:true,value:{zoom:1.2}})
  expect(validateDisplay({zoom:1.2}).ok).toBe(false)
  expect(validateDisplay(DISPLAY_DEFAULTS).ok).toBe(true)
 })
 it('draft → publish → revert → reset keeps one live version and one previous',()=>{
  let s=emptyDisplay()
  expect(()=>publish(s,'t0')).toThrow()
  expect(()=>revert(s,'t0')).toThrow()
  s=saveDraft(s,{zoom:1.4})
  expect(s.live.zoom).toBe(1)
  expect(publicDisplay(s)).toEqual({})
  s=publish(s,'t1')
  expect(s).toMatchObject({draft:null,revision:1,publishedAt:'t1'})
  expect(s.live.zoom).toBe(1.4);expect(s.previous?.zoom).toBe(1)
  s=revert(s,'t2')
  expect(s.live.zoom).toBe(1);expect(s.previous?.zoom).toBe(1.4)
  s=reset(saveDraft(s,{fov:30}),'t3')
  expect(s.live).toEqual(DISPLAY_DEFAULTS);expect(s.draft).toBeNull()
  expect(changedKeys({zoom:1},{zoom:2,fov:20})).toEqual(['fov','zoom'])
 })
 it('the public view is live only — no draft, no previous, nothing before a publish',()=>{
  expect(publicDisplay(undefined)).toEqual({})
  const s=saveDraft(publish(saveDraft(emptyDisplay(),{warmth:.5}),'t'),{warmth:-.5})
  const out=publicDisplay(s) as Record<string,unknown>
  expect(out.warmth).toBe(.5)
  expect(Object.keys(out)).not.toContain('draft')
  expect(Object.keys(out)).not.toContain('previous')
 })
})

describe('display.json route and admin actions',()=>{
 let dir:string
 beforeAll(async()=>{dir=await mkdtemp(path.join(tmpdir(),'fan-life-display-'));vi.stubEnv('FAN_LIFE_DATA_DIR',dir);vi.stubEnv('NEXT_PUBLIC_FAN_LIFE_EVALUATION','true')})
 afterAll(async()=>{vi.unstubAllEnvs();await rm(dir,{recursive:true,force:true})})
 const post=async(op:string,body:unknown={})=>{const {POST}=await import('@/app/api/master/[...action]/route');return POST(new NextRequest(`http://local/api/master/life-display/${op}`,{method:'POST',headers:{'content-type':'application/json',origin:'http://local'},body:JSON.stringify(body)}),{params:{action:['life-display',op]}} as never)}
 const live=async()=>{const {GET}=await import('@/app/life/voxel/display.json/route');return (await GET()).json()}
 it('serves nothing before a publish, the draft never, and the live version after',async()=>{
  expect(await live()).toEqual({})
  const bad=await post('save-draft',{patch:{zoom:99}})
  expect(bad.status).toBe(400)
  expect((await bad.json()).error).toContain('zoom (out-of-range)')
  expect((await post('save-draft',{patch:{zoom:1.3}})).status).toBe(200)
  expect(await live()).toEqual({})
  expect((await post('publish')).status).toBe(200)
  expect((await live()).zoom).toBe(1.3)
  const control=JSON.parse(await readFile(path.join(dir,'control.json'),'utf8'))
  expect(control.audit.map((a:{action:string})=>a.action)).toEqual(expect.arrayContaining(['life-display.save-draft','life-display.publish']))
  expect((await post('revert')).status).toBe(200)
  expect((await live()).zoom).toBe(1)
 })
})

describe('one access policy',()=>{
 it('paused closes everything, unpublished opens only in preview, live opens switched-on gates',()=>{
  expect(gateAccess(null,1,true).reason).toBe('unknown-club')
  expect(gateAccess({status:'paused',gates:[1]},1,true).allowed).toBe(false)
  expect(gateAccess({status:'review',gates:[]},1,false).reason).toBe('not-published')
  expect(gateAccess({status:'review',gates:[]},1,true).allowed).toBe(true)
  expect(gateAccess({status:'live',gates:[1]},2,true).reason).toBe('switched-off')
  expect(gateAccess({status:'live',gates:[1]},1,false).allowed).toBe(true)
 })
 it('activation is refused for a club the engine cannot load and for gates without playable data',()=>{
  const engine={inRegistry:true,hasProvider:true,reviewOnly:false}
  expect(activationCheck({engine:{...engine,hasProvider:false},data:null},[1]).allowed).toBe(false)
  expect(activationCheck({engine,data:null},[]).reasons.join(' ')).toContain('at least one gate')
  const data={gates:[{number:1,dataPlayable:true,state:'READY'},{number:2,dataPlayable:false,state:'LOCKED'}]} as never
  expect(activationCheck({engine,data},[1]).allowed).toBe(true)
  expect(activationCheck({engine,data},[1,2]).reasons.join(' ')).toContain('Gate 2')
 })
})

describe('control-room writes are same-origin only',()=>{
 it('accepts the host it is served on (a preview URL too) and refuses a foreign or missing origin',async()=>{
  const {sameOrigin}=await import('@/lib/master/request')
  const req=(origin?:string)=>new Request('http://internal:3000/api/master/x',{method:'POST',headers:{host:'preview-abc.vercel.app','x-forwarded-proto':'https',...(origin?{origin}:{})}})
  expect(()=>sameOrigin(req('https://preview-abc.vercel.app'))).not.toThrow()
  expect(()=>sameOrigin(req('https://evil.example'))).toThrow()
  expect(()=>sameOrigin(req())).toThrow()
  expect(()=>sameOrigin(new Request('http://x/api',{method:'POST',headers:{'sec-fetch-site':'same-origin'}}))).not.toThrow()
  expect(()=>sameOrigin(new Request('http://x/api',{method:'POST',headers:{'sec-fetch-site':'cross-site'}}))).toThrow()
 })
})
