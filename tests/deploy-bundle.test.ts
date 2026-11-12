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

describe('the Cloudflare front door (deploy/space/worker.js)',()=>{
 const run=async(path:string,status:number,headers:Record<string,string>={})=>{
  const {default:w}=await import('../deploy/space/worker.js')
  const orig=globalThis.fetch
  globalThis.fetch=(async()=>new Response('x',{status,headers:{'cache-control':'public, max-age=2592000'}})) as typeof fetch
  try{return await w.fetch(new Request('https://fanlife.dubelteam.com'+path,{headers}),{})}finally{globalThis.fetch=orig}
 }
 it('never lets a missing file be cached',async()=>{
  expect((await run('/fonts/a.woff2',404)).headers.get('cache-control')).toBe('no-store')
  expect((await run('/fonts/a.woff2',200)).headers.get('cache-control')).toContain('max-age')
 })
 it('clears a returning browser\'s cache once, on a page, and never again',async()=>{
  const first=await run('/',200,{accept:'text/html'})
  expect(first.headers.get('clear-site-data')).toBe('"cache"')
  expect(first.headers.get('set-cookie')).toContain('fl_cache_20261112=1')
  expect((await run('/',200,{accept:'text/html',cookie:'fl_cache_20261112=1'})).headers.get('clear-site-data')).toBeNull()
  expect((await run('/brand/x.png',200,{accept:'image/*'})).headers.get('clear-site-data')).toBeNull()
 })
})
