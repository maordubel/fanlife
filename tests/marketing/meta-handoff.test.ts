import {readFileSync} from 'node:fs'
import {describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {validMeta} from '@/lib/marketing/metaStore'

const token='EAAG'+'x'.repeat(60)
describe('Meta connection hand-over (GitHub secrets → the site store)',()=>{
 it('accepts only ids that are digits and a token-shaped token',()=>{
  expect(validMeta({page:'123456789',ig:'17841400000000000',token,on:true,version:'v23.0'})).toEqual({page:'123456789',ig:'17841400000000000',token,on:true,version:'v23.0'})
  expect(validMeta({page:'123456789',ig:'',token,on:'1'})?.on).toBe(true)
  expect(validMeta({page:'me',token,on:true})).toBeNull()
  expect(validMeta({page:'123456789',token:'short'})).toBeNull()
  expect(validMeta({page:'123456789',token:token+' x'})).toBeNull()
 })
 it('the route answers lights only, and the workflow never prints the token',()=>{
  const route=readFileSync('app/api/master/marketing/route.ts','utf8')
  expect(route).toMatch(/action==='meta_config'[\s\S]*json\(\{ok:true,token:how,lights:await metaLights\(\)\}\)/)
  const wf=readFileSync('.github/workflows/meta-handoff.yml','utf8')
  expect(wf).not.toMatch(/console\.log\([^)]*e\.TOKEN/)
  expect(wf).toContain('branches: [main]')
 })
 it('the studio publisher only ever speaks for the Page and Instagram account ids, never /me',()=>{
  const src=readFileSync('lib/stories/metaSocial.ts','utf8')
  expect(src).not.toMatch(/\/me\b/)
  expect(src).toContain("claimSocial(x,d.postId,WORKER,now)")
 })
})

import {pageTokenFor} from '@/lib/marketing/metaStore'
describe('the Page token is asked of Meta, never typed',()=>{
 const base={page:'123456789',ig:'',token,on:true,version:'v23.0'}
 it('a system-user token becomes the Page token, and the Instagram id is filled in',async()=>{
  const page='EAAP'+'y'.repeat(80)
  const f=(async(url:string)=>{expect(url).toContain('/v23.0/123456789?');return new Response(JSON.stringify({access_token:page,instagram_business_account:{id:'17841400000000001'}}))}) as unknown as typeof fetch
  const r=await pageTokenFor(base,f)
  expect(r.how).toBe('page token');expect(r.meta.token).toBe(page);expect(r.meta.ig).toBe('17841400000000001')
 })
 it('when Meta answers nothing usable, the token stays as given',async()=>{
  const f=(async()=>new Response(JSON.stringify({error:{message:'x'}}),{status:400})) as unknown as typeof fetch
  expect((await pageTokenFor(base,f)).meta.token).toBe(token)
 })
})
