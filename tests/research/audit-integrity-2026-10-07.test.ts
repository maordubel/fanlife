import {afterAll,beforeEach,describe,expect,it,vi} from 'vitest'
import {mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'

// F10: no test here may reach a resolver or the network — the system resolver is replaced, and asserted unused
const dnsLookup=vi.hoisted(()=>vi.fn(async()=>[{address:'10.1.2.3',family:4}]))
vi.mock('node:dns/promises',()=>({lookup:dnsLookup,default:{lookup:dnsLookup}}))

import {collectArchive,fingerprint,readObservations,activeObservations} from '@/lib/research/archive'
import {exportArchiveStaging} from '@/lib/research/staging'
import {validateArchiveSource} from '@/lib/research/profiles'
import {politeFetch,resetFetcherState,type FetchLike} from '@/lib/research/fetcher'
import {hostProblem,isPublicIp,resolvedProblem} from '@/lib/research/netguard'
import {canonicalJson,canonicalSet} from '@/lib/research/canonical'
import {hash as recordSetHash,dryRun} from '@/lib/club-research/report'
import type {ArchiveSource,SourceProfile} from '@/lib/research/contract'

const d=mkdtempSync(path.join(tmpdir(),'audit-1007-'));vi.stubEnv('FAN_LIFE_DATA_DIR',d);vi.stubEnv('RESEARCH_DATA_DIR','')
afterAll(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();rmSync(d,{recursive:true,force:true})})
beforeEach(()=>{resetFetcherState();dnsLookup.mockClear()})

const res=(status:number,body:unknown,headers:Record<string,string>={})=>({status,headers:{get:(n:string)=>({'content-type':'application/json',...headers} as Record<string,string>)[n.toLowerCase()]??null},arrayBuffer:async()=>new TextEncoder().encode(typeof body==='string'?body:JSON.stringify(body)).buffer as ArrayBuffer,text:async()=>typeof body==='string'?body:JSON.stringify(body)})

describe('F07 — a new document version retires the observations it no longer produces',()=>{
 const src:ArchiveSource={providerId:'aekpedia',familyId:'aekpedia-editorial',publisher:'AEKpedia',reader:'wordpress-rest',origin:'https://www.aekpedia.com',role:'mixed',locale:'el-GR',collections:['posts'],allowedPathPrefixes:['/wp-json/wp/v2/'],parserId:'aekpedia-football-v1',budget:{perPage:25,maxRequests:10,minDelayMs:1000,timeoutMs:5000,maxResponseBytes:5242880},retention:{rawBody:'metadata-only',downloadImages:false},knownLimits:[]}
 const site=(cats:number[],line:string):FetchLike=>async url=>{const u=new URL(url);if(u.pathname==='/robots.txt')return res(404,'')
  if(u.pathname.endsWith('/categories'))return res(200,[{id:11,slug:'players'},{id:8,slug:'coaches'}])
  if(u.searchParams.get('page')==='1')return res(200,[{id:7883,link:'https://www.aekpedia.com/x/',slug:'x',title:{rendered:'Person X'},content:{rendered:`<p><strong>${line}</strong></p>`},categories:cats}],{'x-wp-total':'1','x-wp-totalpages':'1'})
  return res(400,{code:'rest_post_invalid_page_number'})}
 it('replaces the active set for that document, keeps the retired row with its reason, and stages only the active one',async()=>{
  await collectArchive('club-f07',[src],{maxRequests:5,fetchImpl:site([11],'Person X (1976/77)')})
  let obs=await readObservations('club-f07')
  expect(Object.keys(obs)).toEqual(['obs:aekpedia:posts:7883:player'])
  expect(obs['obs:aekpedia:posts:7883:player']).toMatchObject({retired:null,contentHash:expect.any(String)})
  // the site re-files the page as a coach, with new text: the player reading is no longer produced
  resetFetcherState()
  await collectArchive('club-f07',[src],{maxRequests:5,fetchImpl:site([8],'Person X (1980/81)')})
  obs=await readObservations('club-f07')
  const old=obs['obs:aekpedia:posts:7883:player']!,now=obs['obs:aekpedia:posts:7883:coach']!
  expect(old.retired).toMatchObject({reason:expect.stringMatching(/document changed .* no longer produces this observation/)})
  expect(old.history?.at(-1)).toMatchObject({change:'retired'})
  expect(now).toMatchObject({retired:null,seasonsAsReported:'1980/81'})
  expect(now.contentHash).not.toBe(old.contentHash)
  expect(activeObservations(obs).map(o=>o.id)).toEqual(['obs:aekpedia:posts:7883:coach'])
  const out=await exportArchiveStaging('club-f07',[src])
  const people=JSON.parse(readFileSync(path.join(out.dir,'archive-players.json'),'utf8'))
  expect(people.map((p:{role:string})=>p.role)).toEqual(['coach'])
 })
})

describe('F10 — public sources only',()=>{
 it('validateArchiveSource refuses loopback, private, link-local, metadata, ULA and local names',()=>{
  const base={providerId:'x-src',familyId:'x-fam',publisher:'X',reader:'wordpress-rest',role:'mixed',locale:'en',collections:['posts']}
  for(const origin of ['https://127.0.0.1','https://localhost','https://10.0.0.1','https://172.16.4.4','https://192.168.1.1','https://169.254.169.254','https://metadata.google.internal','https://printer.local','https://0.0.0.0','https://100.64.0.1','https://2130706433','https://intranet']){
   const v=validateArchiveSource({...base,origin});expect(v.ok,origin).toBe(false);if(!v.ok)expect(v.errors.join(' '),origin).toMatch(/^origin|origin:/)
  }
  expect(validateArchiveSource({...base,origin:'https://www.aekpedia.com'}).ok).toBe(true)
 })
 it('classifies IPv4, IPv6 and mapped addresses',()=>{
  for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','::1','::','fd00::1','fc12::5','fe80::1','::ffff:127.0.0.1','::ffff:10.0.0.1','2001:db8::1','ff02::1'])expect(isPublicIp(ip),ip).toBe(false)
  for(const ip of ['8.8.8.8','151.101.1.69','2a00:1450:4001:80b::200e','::ffff:8.8.8.8'])expect(isPublicIp(ip),ip).toBe(true)
  expect(hostProblem('[::1]')).toMatch(/not a public address/)
 })
 const src:SourceProfile={providerId:'pao',familyId:'pao',origin:'https://www.pao.gr',adapterVersion:'t',paths:{},capabilities:[],rate:{minIntervalMs:0,maxBytes:100000,timeoutMs:1000},scope:'mixed'}
 it('re-checks the resolved address after DNS and sends nothing to a private one',async()=>{
  const fetchImpl=vi.fn<FetchLike>(async()=>res(200,'ok'))
  const priv=await politeFetch('https://www.pao.gr/x',src,null,fetchImpl,()=>0,async()=>[{address:'192.168.0.10',family:4}])
  expect(priv).toMatchObject({kind:'refused',reason:expect.stringMatching(/resolves to 192\.168\.0\.10/)})
  expect(fetchImpl).not.toHaveBeenCalled()
  const v6=await politeFetch('https://www.pao.gr/x',src,null,fetchImpl,()=>0,async()=>[{address:'93.184.216.34',family:4},{address:'fd00::7',family:6}])
  expect(v6.kind).toBe('refused');expect(fetchImpl).not.toHaveBeenCalled()
  const ok=await politeFetch('https://www.pao.gr/x',src,null,fetchImpl,()=>0,async()=>[{address:'93.184.216.34',family:4}])
  expect(ok.kind).toBe('fetched')
  expect(dnsLookup).not.toHaveBeenCalled()
 })
 it('uses the system resolver (mocked here) whenever the real network would be used',async()=>{
  const spy=vi.fn(async()=>{throw new Error('network must not be reached')});vi.stubGlobal('fetch',spy)
  const out=await politeFetch('https://www.pao.gr/x',src,null)
  expect(dnsLookup).toHaveBeenCalledWith('www.pao.gr',expect.objectContaining({all:true}))
  expect(out).toMatchObject({kind:'refused',reason:expect.stringMatching(/10\.1\.2\.3/)})
  expect(spy).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
 })
 it('refuses a redirect to another host or a non-public address, and names which',async()=>{
  const f=(loc:string):FetchLike=>async url=>new URL(url).pathname==='/robots.txt'?res(404,''):res(302,'',{location:loc})
  const pub=async()=>[{address:'93.184.216.34',family:4}]
  const meta=await politeFetch('https://www.pao.gr/x',src,null,f('http://169.254.169.254/latest/meta-data'),()=>0,pub)
  expect(meta).toMatchObject({kind:'refused',status:302,reason:expect.stringMatching(/another host/)})
  const other=await politeFetch('https://www.pao.gr/x',src,null,f('https://evil.example/'),()=>0,pub)
  expect(other).toMatchObject({kind:'refused',reason:expect.stringMatching(/another host \(evil\.example\)/)})
  expect(await resolvedProblem('localhost',pub)).toMatch(/local or internal|not a public domain/)
 })
})

describe('F16 — fingerprints hash canonical content, including seeds and parser version',()=>{
 const html:ArchiveSource={providerId:'site',familyId:'site',publisher:'Site',reader:'html',origin:'https://site.example',role:'mixed',locale:'en',seeds:['/a/','/b/'],allowedPathPrefixes:['/a/','/b/'],parserId:null,budget:{perPage:25,maxRequests:10,minDelayMs:1000,timeoutMs:5000,maxResponseBytes:5242880},retention:{rawBody:'metadata-only',downloadImages:false},knownLimits:[]}
 it('a new seed is a new listing; reordering seeds or prefixes is not',()=>{
  const fp=fingerprint(html,'html')
  expect(fingerprint({...html,seeds:['/a/','/b/','/b/c/']},'html')).not.toBe(fp)
  expect(fingerprint({...html,seeds:['/b/','/a/'],allowedPathPrefixes:['/b/','/a/']},'html')).toBe(fp)
  expect(fingerprint({...html,parserId:'aekpedia-football-v1'},'html')).not.toBe(fp)
 })
 it('canonical JSON sorts keys; a record set is order-insensitive',()=>{
  expect(canonicalJson({b:1,a:{d:2,c:[3,{f:1,e:0}]}})).toBe('{"a":{"c":[3,{"e":0,"f":1}],"d":2},"b":1}')
  expect(canonicalSet([{id:'1',x:1},{id:'2',x:2}])).toBe(canonicalSet([{x:2,id:'2'},{id:'1',x:1}]))
 })
 it('the dry-run fingerprint changes when a record changes under the same id',()=>{
  const a=[{id:'m1',playedOn:'1976-05-01',score:'2-1'},{id:'m2',playedOn:'1977-01-01'}]
  const corrected=[{id:'m1',playedOn:'1976-05-02',score:'2-1'},{id:'m2',playedOn:'1977-01-01'}]
  expect(recordSetHash(corrected,'matches')).not.toBe(recordSetHash(a,'matches'))
  expect(recordSetHash([...a].reverse(),'matches')).toBe(recordSetHash(a,'matches'))
  expect(recordSetHash(a,'lineups')).not.toBe(recordSetHash(a,'matches'))
  const r1=dryRun('x','2026-10-07',{matches:a}),r2=dryRun('x','2026-10-07',{matches:corrected})
  expect(r1.fingerprints.matches).not.toBe(r2.fingerprints.matches)
 })
})
