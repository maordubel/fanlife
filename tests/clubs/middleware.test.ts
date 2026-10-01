import {describe,it,expect} from 'vitest'
import {NextRequest} from 'next/server'
import {middleware} from '@/middleware'

const request=(path:string,host='olympiacos.localhost:3217',method='GET')=>new NextRequest(`http://${host}${path}`,{method,headers:{host}})

describe('club Timeline entry routing',()=>{
 it('sets document language from supported club-route locale and ignores forged headers',()=>{
  const r=request('/clubs/olympiacos?lang=he');r.headers.set('x-fan-life-locale','el')
  expect(middleware(r).headers.get('x-middleware-request-x-fan-life-locale')).toBe('he')
  expect(middleware(request('/clubs/olympiacos?lang=el')).headers.get('x-middleware-request-x-fan-life-locale')).toBe('en')
  expect(middleware(request('/life?lang=he')).headers.get('x-middleware-request-x-fan-life-locale')).toBe('en')
 })
 it('redirects both legacy entry points before the legacy layout, preserving the round and language',()=>{
  for(const path of ['/timeline','/timeline/order']){
   const response=middleware(request(`${path}?seed=42&r=1&lang=he`))
   expect(response.status).toBe(307)
   expect(response.headers.get('location')).toBe('http://olympiacos.localhost:3217/clubs/olympiacos/timeline?seed=42&r=1&lang=he')
  }
 })
 it('keeps native Hapoel, neutral portal and other gates on their existing routes',()=>{
  for(const host of ['hapoeltelaviv.localhost:3217','localhost:3217','unknown.localhost:3217'])expect(middleware(request('/timeline/order',host)).headers.get('location')).toBeNull()
  expect(middleware(request('/goal')).headers.get('location')).toBeNull()
 })
 it('routes migrated gate entry points to host-owned club data',()=>{
  for(const [path,gate] of [['/trivia','trivia'],['/memory','memory'],['/xi','xi'],['/archive','archive'],['/polls','polls'],['/blind-cow','blind-cow']]){expect(middleware(request(`${path}?lang=he`)).headers.get('location')).toBe(`http://olympiacos.localhost:3217/clubs/olympiacos/${gate}?lang=he`);expect(middleware(request(path!,'hapoeltelaviv.localhost:3217')).headers.get('location')).toBeNull();expect(middleware(request(path!,'olympiacos.localhost:3217','POST')).headers.get('location')).toBeNull()}
 })
 it('does not redirect legacy action payloads into the shared route',()=>{
  expect(middleware(request('/timeline/order','olympiacos.localhost:3217','POST')).headers.get('location')).toBeNull()
 })
})
