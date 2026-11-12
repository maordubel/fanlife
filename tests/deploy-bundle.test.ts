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
  expect(originFor('dubelteam.com')).toBe('https://dubelteam-1041793148354.europe-west1.run.app')
  expect(originFor('www.dubelteam.com')).toBe('https://dubelteam-1041793148354.europe-west1.run.app')
  expect(originFor('evil.example.com')).toBeNull()
 })
})

describe('the static server for the Dubel Team sites (deploy/static/server.mjs)',()=>{
 const setup=async(cfg:object,files:Record<string,string>)=>{
  const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path')
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'site-'))
  fs.writeFileSync(path.join(dir,'site.json'),JSON.stringify(cfg))
  for(const [f,b] of Object.entries(files)){fs.mkdirSync(path.dirname(path.join(dir,'site',f)),{recursive:true});fs.writeFileSync(path.join(dir,'site',f),b)}
  const {load,makeServer}=await import('../deploy/static/server.mjs')
  const srv=makeServer(load(dir));await new Promise<void>(r=>srv.listen(0,'127.0.0.1',()=>r()))
  const port=(srv.address() as {port:number}).port
  return {get:(p:string)=>fetch(`http://127.0.0.1:${port}${p}`),close:()=>srv.close(),dir}
 }
 it('serves files, clean URLs and the single-page fallback, and never leaves the folder',async()=>{
  const s=await setup({root:'site',spa:true,rewrites:[{source:'^/admin/?$',destination:'/admin.html'}]},{'index.html':'INDEX','admin.html':'ADMIN','assets/a-1234abcd.js':'JS','about.html':'ABOUT'})
  try{
   expect(await (await s.get('/')).text()).toBe('INDEX')
   expect(await (await s.get('/admin')).text()).toBe('ADMIN')
   expect(await (await s.get('/about')).text()).toBe('ABOUT')
   expect(await (await s.get('/deep/route')).text()).toBe('INDEX')
   const js=await s.get('/assets/a-1234abcd.js');expect(js.headers.get('cache-control')).toContain('immutable')
   expect((await s.get('/missing.png')).status).toBe(404)
   expect(await (await s.get('/%2e%2e/%2e%2e/etc/passwd')).text()).toBe('INDEX')
  }finally{s.close()}
 })
 it('runs a Vercel-style /api handler behind a rewrite with named groups',async()=>{
  const s=await setup({root:'site',spa:true,rewrites:[{source:'^/s/(?<kind>[^/]+)/(?<id>[^/]+)(?:/.*)?$',destination:'/api/share?kind=:kind&id=:id'}],api:{share:'share.mjs'}},{'index.html':'I'})
  const fs=await import('node:fs'),path=await import('node:path')
  fs.writeFileSync(path.join(s.dir,'share.mjs'),"export default (req,res)=>res.status(200).json({k:req.query.kind,i:req.query.id})")
  try{expect(await (await s.get('/s/c/42/my-slug')).json()).toEqual({k:'c',i:'42'})}finally{s.close()}
 })
 it('answers a missing page with the site 404 page when it has one',async()=>{
  const s=await setup({root:'site',spa:false,notFound:'404.html'},{'index.html':'I','404.html':'GONE'})
  try{const r=await s.get('/nope');expect(r.status).toBe(404);expect(await r.text()).toBe('GONE')}finally{s.close()}
 })
})
