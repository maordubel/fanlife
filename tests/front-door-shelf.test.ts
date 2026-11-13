import {describe,expect,it} from 'vitest'
import {FRESH_MS,SITE_HOST,STALE_MS,makeShelf,shelfKey,shelvable,warmList} from '../deploy/space/proxy.mjs'

const get=(url:string,headers:Record<string,string>={})=>({method:'GET',url,headers:{accept:'text/html',host:'x.run.app','x-fanlife-host':'fanlife.dubelteam.com',...headers}})
describe('the front door\'s page shelf (13.11.2026)',()=>{
 it('keeps public pages, per host, page, language and kind of answer',()=>{
  const home=shelfKey(get('/'))
  expect(home).toBeTruthy()
  expect(shelfKey(get('/?utm_source=tg&fbclid=1'))).toBe(home)                    // a campaign link is the same page
  expect(shelfKey(get('/clubs/celtic?lang=he'))).not.toBe(shelfKey(get('/clubs/celtic')))
  expect(shelfKey(get('/',{'x-fanlife-host':'celtic.fanlife.dubelteam.com'}))).not.toBe(home)
  expect(shelfKey(get('/',{rsc:'1',accept:'*/*'}))).not.toBe(home)                // the page and its flight data never mix
  expect(shelfKey(get('/',{rsc:'1',accept:'*/*','next-router-prefetch':'1'}))).not.toBe(shelfKey(get('/',{rsc:'1',accept:'*/*'})))
 })
 it('never keeps the desk, an API, a signed page, a file, a non-GET or the owner\'s own session',()=>{
  for(const p of ['/master/admin','/api/master/stories','/api/shop','/studio-cancel?job=x&sig=y','/final-whistle-render?job=1','/qa/stats','/brand/logo.png','/_next/data/x.json'])expect(shelfKey(get(p))).toBeNull()
  expect(shelfKey({...get('/'),method:'POST'})).toBeNull()
  expect(shelfKey(get('/',{cookie:'a=1; fan-life-admin=abc'}))).toBeNull()
  expect(shelfKey(get('/',{cookie:'fan-life-tester=abc'}))).toBeNull()
  expect(shelfKey(get('/',{authorization:'Bearer x'}))).toBeNull()
  expect(shelfKey(get('/',{accept:'application/json'}))).toBeNull()
  expect(shelfKey(get('/',{cookie:'_ga=1; fl_cache_20261112=1'}))).toBeTruthy()   // an ordinary visitor's cookies change nothing
 })
 it('shelves only a whole 200 page that set no cookie',()=>{
  expect(shelvable(200,{'content-type':'text/html; charset=utf-8'},1000)).toBe(true)
  expect(shelvable(200,{'content-type':'text/x-component'},1000)).toBe(true)
  expect(shelvable(404,{'content-type':'text/html'},1000)).toBe(false)
  expect(shelvable(200,{'content-type':'text/html','set-cookie':['a=1']},1000)).toBe(false)
  expect(shelvable(200,{'content-type':'application/json'},1000)).toBe(false)
  expect(shelvable(200,{'content-type':'text/html'},50*1024*1024)).toBe(false)
 })
 it('answers fresh for a minute, stale while it is renewed, and forgets after half a day',()=>{
  let t=0;const s=makeShelf(()=>t)
  s.put('k',200,{},Buffer.from('<html>page</html>'))
  expect(s.get('k')!.state).toBe('hit')
  t=FRESH_MS+1;expect(s.get('k')!.state).toBe('stale')
  t=STALE_MS+1;expect(s.get('k')).toBeNull();expect(s.size()).toBe(0)
  for(let i=0;i<450;i++)s.put('k'+i,200,{},Buffer.from('x'))
  expect(s.size()).toBe(400);expect(s.get('k0')).toBeNull();expect(s.get('k449')).toBeTruthy()
 })
 it('a new instance lays the table: the club links of the front page, once each, on the host visitors use',()=>{
  expect(warmList('<a href="/clubs/celtic?lang=en">x</a><a href="/clubs/celtic?lang=en">y</a><a href="/shop">s</a><a href="/market">m</a><a href="/master/admin">no</a><a href="https://x.test/clubs/zz">no</a><a href="/clubs/aek-athens/xi?lang=en">deep</a>')).toEqual(['/clubs/celtic?lang=en','/shop','/market'])
  expect(SITE_HOST).toMatch(/^[a-z0-9.-]+(:\d+)?$/)
  // the warm request and a visitor's request through the Worker share one shelf key
  const visitor={method:'GET',url:'/',headers:{accept:'text/html',host:'x.run.app','x-fanlife-host':SITE_HOST}}
  const own={method:'GET',url:'/',headers:{accept:'text/html',host:SITE_HOST}}
  expect(shelfKey(own)).toBe(shelfKey(visitor))
 })
})
