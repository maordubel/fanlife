import {afterAll,beforeEach,describe,expect,it,vi} from 'vitest'
import {mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {collectArchive,readArchiveDocs,readCheckpoints} from '@/lib/research/archive'
import {exportArchiveStaging} from '@/lib/research/staging'
import {validateArchiveSource,loadClubProfile,saveArchiveSource,profiledClubs} from '@/lib/research/profiles'
import {resetFetcherState,type FetchLike} from '@/lib/research/fetcher'
import type {ArchiveSource} from '@/lib/research/contract'

const dir=mkdtempSync(path.join(tmpdir(),'fanlife-archive-'))
vi.stubEnv('FAN_LIFE_DATA_DIR',dir)
afterAll(()=>{vi.unstubAllEnvs();rmSync(dir,{recursive:true,force:true})})
beforeEach(()=>resetFetcherState())

const wp=(over:Partial<ArchiveSource>={}):ArchiveSource=>({providerId:'testwiki',familyId:'testwiki-editorial',publisher:'Test Wiki',reader:'wordpress-rest',origin:'https://wiki.example',role:'mixed',locale:'en',collections:['posts','pages'],allowedPathPrefixes:['/wp-json/wp/v2/'],parserId:'testwiki-v1',budget:{perPage:2,maxRequests:20,minDelayMs:0,timeoutMs:5000,maxResponseBytes:1_000_000},retention:{rawBody:'metadata-only',downloadImages:false},...over})
type Reply={status:number;body?:string;type?:string;headers?:Record<string,string>}
/** a tiny fake web: a function of the URL, recording every request */
function web(route:(u:URL)=>Reply){const calls:string[]=[];const f:FetchLike=async url=>{const u=new URL(url);if(u.pathname==='/robots.txt')return res({status:404});calls.push(u.pathname+u.search);return res(route(u))};return {f,calls}}
const res=(r:Reply)=>({status:r.status,headers:{get:(n:string)=>({'content-type':r.type||'application/json',...(r.headers||{})} as Record<string,string>)[n.toLowerCase()]??null},arrayBuffer:async()=>new TextEncoder().encode(r.body||'').buffer as ArrayBuffer,text:async()=>r.body||''})
const docs=(ids:number[],tag='')=>JSON.stringify(ids.map(id=>({id,link:`https://wiki.example/p/${id}/`,title:{rendered:`Title &amp; ${id}${tag}`},content:{rendered:`<p>body ${id}${tag}</p>`},date_gmt:'2025-01-01T00:00:00',modified_gmt:'2025-02-01T00:00:00'})))
const listing=(byCollection:Record<string,number[][]>,tag='')=>(u:URL):Reply=>{const c=u.pathname.split('/').pop()!,page=Number(u.searchParams.get('page')),pages=byCollection[c]||[];if(page>pages.length)return {status:400,body:'{"code":"rest_post_invalid_page_number"}'};const total=pages.flat().length;return {status:200,body:docs(pages[page-1]!,tag),headers:{'x-wp-total':String(total),'x-wp-totalpages':String(pages.length)}}}

describe('archive collector — WordPress REST',()=>{
 it('reads only the collections the profile names (Celtic Wiki = pages) and keys posts and pages apart',async()=>{
  const {f,calls}=web(listing({posts:[[7]],pages:[[7,8]]}))
  await collectArchive('club-a',[wp({collections:['pages']})],{maxRequests:5,fetchImpl:f})
  expect(calls.every(c=>c.startsWith('/wp-json/wp/v2/pages'))).toBe(true)
  await collectArchive('club-a',[wp()],{maxRequests:6,fetchImpl:f})
  const d=await readArchiveDocs('club-a')
  expect(Object.keys(d).sort()).toEqual(['testwiki:pages:7','testwiki:pages:8','testwiki:posts:7'])
  expect(d['testwiki:pages:7']!.title).toBe('Title & 7')
  // publication metadata is kept as such — a document has no event date
  expect(d['testwiki:posts:7']!.publishedAsReported).toBe('2025-01-01T00:00:00');expect(d['testwiki:posts:7']).not.toHaveProperty('playedOn')
 })
 it('ends a budget-limited pass as partial_budget and resumes from the checkpoint without duplicates',async()=>{
  const {f,calls}=web(listing({pages:[[1,2],[3,4],[5]]}))
  const r1=await collectArchive('club-b',[wp({collections:['pages']})],{maxRequests:1,fetchImpl:f})
  expect(r1.state).toBe('partial_budget');expect(r1.completeArchiveClaim).toBe(false);expect(r1.approvedForProduction).toBe(0)
  expect((await readCheckpoints('club-b'))['testwiki:pages']).toMatchObject({lastCommittedPage:1,nextPage:2,observedTotalDocuments:5,observedTotalPages:3})
  const r2=await collectArchive('club-b',[wp({collections:['pages']})],{maxRequests:5,fetchImpl:f})
  expect(r2.state).toBe('listed');expect(r2.counts.newDocuments).toBe(3)
  expect(calls.filter(c=>c.includes('page=1&')).length).toBe(1)
  expect(Object.keys(await readArchiveDocs('club-b'))).toHaveLength(5)
 })
 it('a failure mid-listing keeps the committed pages; the next run continues from the failed page',async()=>{
  let fail=true;const {f}=web(u=>u.searchParams.get('page')==='2'&&fail?{status:503,headers:{'retry-after':'1'}}:listing({pages:[[1,2],[3]]})(u))
  const r1=await collectArchive('club-c',[wp({collections:['pages']})],{maxRequests:5,fetchImpl:f})
  expect(r1.diagnostics.map(d=>d.code)).toContain('RETRY_LATER');expect((await readCheckpoints('club-c'))['testwiki:pages']).toMatchObject({lastCommittedPage:1,nextPage:2,state:'retry-later'})
  fail=false;const r2=await collectArchive('club-c',[wp({collections:['pages']})],{maxRequests:5,fetchImpl:f})
  expect(r2.counts.newDocuments).toBe(1);expect(Object.keys(await readArchiveDocs('club-c'))).toHaveLength(3)
 })
 it('a 403 and a login page are never an empty archive',async()=>{
  const blocked=web(()=>({status:403}))
  const r=await collectArchive('club-d',[wp({collections:['posts']})],{maxRequests:3,fetchImpl:blocked.f})
  expect(r.state).toBe('blocked');expect(r.counts.documentsRead).toBe(0);expect(r.diagnostics.map(d=>d.code)).toContain('SOURCE_BLOCKED')
  expect(blocked.calls).toHaveLength(1) // a refusal is an answer — not retried, not routed around
  const login=web(()=>({status:200,type:'text/html',body:'<html><form>Sign in</form></html>'}))
  const r2=await collectArchive('club-e',[wp({collections:['posts']})],{maxRequests:3,fetchImpl:login.f})
  expect(r2.diagnostics.map(d=>d.code)).toContain('SOURCE_NOT_JSON');expect(r2.counts.documentsRead).toBe(0)
  const odd=web(()=>({status:200,body:'{"items":[]}'}))
  const r3=await collectArchive('club-f',[wp({collections:['posts']})],{maxRequests:3,fetchImpl:odd.f})
  expect(r3.diagnostics.map(d=>d.code)).toContain('SOURCE_SCHEMA_CHANGED')
 })
 it('the same id with new content is marked changed, so a corrected result is not missed',async()=>{
  const a=web(listing({pages:[[1]]}));await collectArchive('club-g',[wp({collections:['pages']})],{maxRequests:2,fetchImpl:a.f})
  const b=web(listing({pages:[[1]]},' (corrected)'));const r=await collectArchive('club-g',[wp({collections:['pages']})],{maxRequests:2,fetchImpl:b.f})
  expect(r.counts.changedDocuments).toBe(1);expect((await readArchiveDocs('club-g'))['testwiki:pages:1']!.changed).toBe(true)
 })
 it('without a tested parser nothing is extracted and the run says so',async()=>{
  const {f}=web(listing({pages:[[1]]}));const r=await collectArchive('club-h',[wp({collections:['pages']})],{maxRequests:2,fetchImpl:f})
  expect(r.counts.recordsExtracted).toBe(0);expect(r.diagnostics.find(d=>d.code==='NEEDS_PARSER')?.message).toContain('nothing is extracted')
  expect(Object.values(await readArchiveDocs('club-h')).every(d=>d.parse==='needs-parser')).toBe(true)
 })
})

describe('archive collector — HTML',()=>{
 const src=(over:Partial<ArchiveSource>={}):ArchiveSource=>({...wp(),providerId:'fanarchive',reader:'html',collections:undefined,seeds:['/index.html'],follow:'^/[a-z]+\\.html$',allowedPathPrefixes:['/'],...over})
 it('follows only allowlisted links from approved index pages, on the same origin',async()=>{
  const {f,calls}=web(u=>u.pathname==='/index.html'?{status:200,type:'text/html',body:'<title>Index</title><a href="/season.html">s</a><a href="https://elsewhere.example/x.html">x</a><a href="/admin/login.php">l</a>'}:{status:200,type:'text/html',body:'<title>Season</title>'})
  const r=await collectArchive('club-i',[src()],{maxRequests:10,fetchImpl:f})
  expect(calls).toEqual(['/index.html','/season.html']);expect(r.state).toBe('listed')
  expect(Object.keys(await readArchiveDocs('club-i')).sort()).toEqual(['fanarchive:html:/index.html','fanarchive:html:/season.html'])
 })
})

describe('profiles, staging and the eight clubs',()=>{
 it('every repository profile validates, and the plan’s rules hold',()=>{
  for(const id of ['aek-athens','panathinaikos','st-pauli','hajduk-split','dinamo-zagreb','celtic','partizan-belgrade','union-berlin']){
   const p=JSON.parse(readFileSync(`research-profiles/${id}.json`,'utf8'))
   expect(p.archive.length,id).toBeGreaterThan(0)
   for(const a of p.archive){const v=validateArchiveSource(a);expect(v.ok,`${id}/${a.providerId}: ${v.ok?'':v.errors.join('; ')}`).toBe(true);expect(a.retention.downloadImages).toBe(false)}
  }
  const celtic=JSON.parse(readFileSync('research-profiles/celtic.json','utf8')).archive.find((a:ArchiveSource)=>a.providerId==='thecelticwiki')
  expect(celtic.collections).toEqual(['pages'])
  // ClubPulse answered 403 and has no public contract: it may be named as a limit, never configured as a source
  const origins=readdirSync('research-profiles').flatMap(f=>JSON.parse(readFileSync(`research-profiles/${f}`,'utf8')).archive.map((a:ArchiveSource)=>a.origin))
  expect(origins.join(' ')).not.toMatch(/clubpulse/i)
 })
 it('rejects an unsafe source with the field named',()=>{
  const v=validateArchiveSource({providerId:'X',familyId:'x',publisher:'x',reader:'wordpress-rest',origin:'http://x.example/path',role:'mixed',locale:'en',collections:[]})
  expect(v.ok).toBe(false);if(!v.ok)expect(v.errors.join(' ')).toMatch(/providerId.*origin.*collections/s)
 })
 it('a source added from the control room joins the repository profile and wins by providerId',async()=>{
  const v=validateArchiveSource({providerId:'aekpedia',familyId:'aekpedia-editorial',publisher:'AEKpedia (retuned)',reader:'wordpress-rest',origin:'https://www.aekpedia.com',role:'mixed',locale:'el-GR',collections:['posts'],budget:{maxRequests:5}})
  expect(v.ok).toBe(true);if(!v.ok)return
  await saveArchiveSource('aek-athens',v.value)
  const p=await loadClubProfile('aek-athens')
  expect(p!.archive.filter(a=>a.providerId==='aekpedia')).toHaveLength(1);expect(p!.archive.find(a=>a.providerId==='aekpedia')!.publisher).toBe('AEKpedia (retuned)')
  expect(p!.archive.some(a=>a.providerId==='aek-official-history')).toBe(true);expect(p!.origin).toEqual({repo:true,admin:true})
  await saveArchiveSource('brand-new-club',{...v.value,providerId:'newsource'});expect(await profiledClubs()).toContain('brand-new-club')
 })
 it('the staging export is a catalogue and a backlog — unreviewed, nothing approved, no invented records',async()=>{
  const {f}=web(listing({pages:[[1,2]]}));const s=wp({collections:['pages']})
  await collectArchive('club-j',[s],{maxRequests:2,fetchImpl:f})
  const out=await exportArchiveStaging('club-j',[s])
  const read=(n:string)=>JSON.parse(readFileSync(path.join(out.dir,`${n}.json`),'utf8'))
  expect(read('manifest')).toMatchObject({approvedForProduction:0,collection:{completeArchiveClaim:false,historicalOnly:true}})
  expect(read('sources').every((x:{reviewed:boolean;imagesUsableInApp:boolean})=>!x.reviewed&&!x.imagesUsableInApp)).toBe(true)
  for(const n of ['matches','archive-players','claims'])expect(read(n)).toEqual([])
  expect(read('backlog').some((b:{id:string})=>b.id==='parser-testwiki')).toBe(true)
  // the package adapter reads the collector's export, and everything it brings to the club file is unreviewed
  const {ADAPTERS}=await import('@/lib/master/adapters')
  const got=await ADAPTERS.package!.collect({id:'j',clubId:'club-j',query:'',status:'queued',attempts:0,createdAt:''} as never)
  expect(got.sources.length).toBe(1);expect(got.sources[0]!.reviewed).toBe(false);expect(got.sources[0]!.excerpt).toContain('no parser yet')
  expect(got.findings.every(f=>f.approved===false)).toBe(true);expect(got.gaps!.some(g=>g.startsWith('P1 ·'))).toBe(true)
 })
 it('research:stage no longer marks other clubs’ people as verified with a pao: prefix',()=>{
  const src=readFileSync('scripts/club-research/stage-package.ts','utf8')
  expect(src).not.toMatch(/`pao:\$\{/);expect(src).toContain('provider-ids/')
 })
})
