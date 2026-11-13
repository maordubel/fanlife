import {beforeAll,describe,expect,it} from 'vitest'
import {ownOrigin,servedOrigins} from '@/lib/origin'
import {sameOrigin} from '@/lib/stories/http'

/** Cloud Run behind Cloudflare (11.11.2026): request.url is the container's address, the browser's Origin is the site. */
const req=(origin:string|null,over:Record<string,string>={})=>new Request('http://0.0.0.0:8080/api/master/stories',{method:'POST',headers:{...(origin?{origin}:{}),host:'fanlife-abc-ew.a.run.app',...over}})
describe('origin checks behind a proxy',()=>{
 beforeAll(()=>{process.env.NEXT_PUBLIC_SITE_URL='https://fanlife.dubelteam.com'})
 it('accepts the public site, the forwarded host and the address as served',()=>{
  expect(ownOrigin(req('https://fanlife.dubelteam.com'))).toBe(true)
  expect(sameOrigin(req('https://fanlife.dubelteam.com',{'sec-fetch-site':'same-origin'}))).toBe(true)
  expect(ownOrigin(req('https://stage.example.test',{'x-forwarded-host':'stage.example.test','x-forwarded-proto':'https'}))).toBe(true)
  expect(servedOrigins(req(null)).has('http://0.0.0.0:8080')).toBe(true)
 })
 it('still refuses another site, a missing Origin and a cross-site fetch',()=>{
  expect(ownOrigin(req('https://evil.example'))).toBe(false)
  expect(sameOrigin(req(null))).toBe(false)
  expect(sameOrigin(req('https://fanlife.dubelteam.com',{'sec-fetch-site':'cross-site'}))).toBe(false)
 })
})
