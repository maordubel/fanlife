import {describe,expect,it} from 'vitest'
import {existsSync,readFileSync} from 'node:fs'
import {LOGO_MAP} from '@/ecosystem/crests/index.mjs'
import {universeCrest} from '@/lib/crests/universe'

describe('Cloud Run bundle (12.11.2026)',()=>{
 const wf=readFileSync('.github/workflows/deploy-cloudrun.yml','utf8')
 it('copies public/ INTO the standalone public folder — `cp -a public $B/public` made public/public and the logo, plates, fonts and ads 404ed',()=>{
  expect(wf).toContain('cp -a public/. $B/public/')
  expect(wf).not.toMatch(/cp -a public \$B\/public\s*$/m)
 })
 it('builds the browser bundle with the public Supabase key, or the site falls back to the device-only preview',()=>{
  expect(wf).toMatch(/NEXT_PUBLIC_SUPABASE_ANON_KEY: \$\{\{ vars\.NEXT_PUBLIC_SUPABASE_ANON_KEY \|\| 'eyJ/)
 })
})

describe('the universe crests are served from FAN LIFE',()=>{
 it('every slug in the library has its file in public/universe-crests',()=>{
  const missing=[...new Set(Object.values(LOGO_MAP))].filter(s=>!existsSync(`public/universe-crests/${s}.png`))
  expect(missing).toEqual([])
 })
 it('resolves a name to the local path, and an unknown name to null',()=>{
  expect(universeCrest('Celtic FC')).toBe('/universe-crests/celtic-fc.png')
  expect(universeCrest('Nobody United of Nowhere')).toBeNull()
 })
})

describe('the Cloud Run front door (deploy/space/proxy.mjs)',()=>{
 const run=async(path:string,status:number,headers:Record<string,string>={})=>{
  const {fix}=await import('../deploy/space/proxy.mjs')
  return fix({method:'GET',url:path,headers},status,{'cache-control':'public, max-age=2592000'}) as Record<string,string|string[]|undefined>
 }
 it('never lets a missing file be cached',async()=>{
  expect((await run('/fonts/a.woff2',404))['cache-control']).toBe('no-store')
  expect((await run('/fonts/a.woff2',200))['cache-control']).toContain('max-age')
 })
 it('clears a returning browser\'s cache once, on a page, and never again',async()=>{
  const first=await run('/',200,{accept:'text/html'})
  expect(first['clear-site-data']).toBe('"cache"')
  expect(String(first['set-cookie'])).toContain('fl_cache_20261112=1')
  expect((await run('/',200,{accept:'text/html',cookie:'fl_cache_20261112=1'}))['clear-site-data']).toBeUndefined()
  expect((await run('/brand/x.png',200,{accept:'image/*'}))['clear-site-data']).toBeUndefined()
 })
})

describe('the Cloudflare Worker routes each app to its own Cloud Run service',()=>{
 it('fanlife and its club subdomains stay on fanlife; <name>.dubelteam.com goes to the service <name>',async()=>{
  const {originFor}=await import('../deploy/space/worker.js')
  expect(originFor('fanlife.dubelteam.com')).toBeNull()
  expect(originFor('celtic.fanlife.dubelteam.com')).toBeNull()
  expect(originFor('theworker.dubelteam.com')).toBe('https://theworker-1041793148354.europe-west1.run.app')
  expect(originFor('fuckyou.dubelteam.com')).toBe('https://fuckyou-1041793148354.europe-west1.run.app')
  expect(originFor('evil.example.com')).toBeNull()
 })
})
