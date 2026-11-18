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

describe('publicOrigin — where a redirect sends the visitor (the Google sign-in, 18.11.2026)', () => {
  it('is the forwarded public host behind the proxy, never the container', async () => {
    const { publicOrigin } = await import('@/lib/origin')
    const r = new Request('http://localhost:3000/auth/callback?code=1', { headers: { host: 'fanlife.dubelteam.com', 'x-forwarded-host': 'fanlife.dubelteam.com', 'x-forwarded-proto': 'https' } })
    expect(publicOrigin(r)).toBe('https://fanlife.dubelteam.com')
  })
  it('falls back to the site, not localhost, when only the container address is known', async () => {
    const { publicOrigin } = await import('@/lib/origin')
    expect(publicOrigin(new Request('http://localhost:3000/auth/callback', { headers: { host: 'localhost:3000' } }))).toBe('https://fanlife.dubelteam.com')
  })
})
