import {describe,it,expect,beforeEach} from 'vitest'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {plan,validXI,familyCount,approved,allowedPath,requirements,type Bundle} from '@/lib/research/planner'
import {robotsDisallows,politeFetch,resetFetcherState,type FetchLike} from '@/lib/research/fetcher'
import {lease,complete,upsertJobs,readJobs,readSnapshots} from '@/lib/research/store'
import {runWorker} from '@/lib/research/worker'
import {GATE_THRESHOLDS} from '@/lib/clubs/thresholds'
import type {ClubProfile,SourceProfile} from '@/lib/research/contract'

const src:SourceProfile={providerId:'pao-official',familyId:'club-a',origin:'https://www.pao.gr',adapterVersion:'v1',paths:{'match-detail':'^/en/match/[0-9]+/?$'},capabilities:['match-detail'],rate:{minIntervalMs:0,maxBytes:100000,timeoutMs:5000},scope:'test'}
const profile:ClubProfile={schemaVersion:1,clubId:'fixture-club',sport:'football',contentLocale:'en',snapshotAsOf:'2026-10-06',desiredGates:['xi','timeline','lineup'],priorityMatchIds:[],sources:[src]}
const bundle=():Bundle=>({players:[],matches:[{id:'match-a',sport:'football',season:'2023/2024',playedOn:'2024-05-25',homeName:'A',awayName:'B',sourceMatchUrl:'https://www.pao.gr/en/match/123/',scoreAsReported:{home:1,away:0},sourceIds:['a'],status:'review'}],lineups:[],goals:[],sources:[{id:'a',sourceFamilyId:'club-a',publisher:'A',access:'available',checkedAt:'2026-10-06'}],timeline:[],honours:[],conflicts:[],quarantined:[]})
const approvedRow=(extra:Record<string,unknown>={})=>({id:'row-a',productionId:'canonical-a',sourceIds:['a'],status:'approved',confidence:2,researchedAt:'2026-10-06',approvedAt:'2026-10-06',approvedBy:'human:test-fixture',...extra})

describe('research planner (no AI, offline)',()=>{
 it('is deterministic and never enqueues a job twice',()=>{
  expect(JSON.stringify(plan(bundle(),profile))).toBe(JSON.stringify(plan(bundle(),profile)))
  const first=plan(bundle(),profile);expect(first.jobs).toHaveLength(1)
  const second=plan(bundle(),profile,first.jobs);expect(second.jobs).toHaveLength(0);expect(second.report.stats.totalDetailJobs).toBe(1)
 })
 it('one fetch serves line-up and goal together',()=>expect(plan(bundle(),{...profile,desiredGates:['lineup','goal']}).jobs).toHaveLength(1))
 it('two language versions of one publisher are one family; automated approval needs two families',()=>{
  expect(familyCount(['a','b'],[{id:'a',sourceFamilyId:'same'},{id:'b',sourceFamilyId:'same'}])).toBe(1)
  const b=bundle();b.sources.push({...b.sources[0],id:'b',publisher:'A English'})
  const r=approvedRow({sourceIds:['a','b'],confidence:3,approvedBy:'automated:test',parserCertainty:'high',conflictFree:true,sensitive:false})
  expect(approved(r,b.sources)).toBe(false)
  b.sources[1]={...b.sources[1],sourceFamilyId:'independent'};expect(approved(r,b.sources)).toBe(true);expect(approved({...r,conflictFree:false},b.sources)).toBe(false)
 })
 it('a repeated name or a partial label is not an XI',()=>{
  expect(validXI({coverageStatus:'complete_listing',startersAsReported:Array.from({length:11},(_,i)=>({nameAsReported:i===10?'P0':`P${i}`}))})).toBe(false)
  expect(validXI({coverageStatus:'partial_or_malformed_listing',startersAsReported:Array.from({length:11},(_,i)=>({nameAsReported:`P${i}`}))})).toBe(false)
 })
 it('rejects quarantine, impossible and future dates, other sports and dangling references',()=>{
  const q=bundle();q.quarantined=[{...q.matches[0],reason:'date_outside_season'}];expect(()=>plan(q,profile)).toThrow(/QUARANTINE/)
  const d=bundle();d.matches[0]!.playedOn='2024-02-30';expect(()=>plan(d,profile)).toThrow(/INVALID_MATCH_DATE/)
  const f=bundle();f.matches[0]!.playedOn='2026-10-07';expect(()=>plan(f,profile)).toThrow(/INVALID_MATCH_DATE/)
  const s=bundle();s.matches[0]!.sport='basketball';expect(()=>plan(s,profile)).toThrow(/MATCH_SPORT_MISMATCH/)
  const l=bundle();l.lineups=[{id:'l',matchId:'missing'}];expect(()=>plan(l,profile)).toThrow(/DANGLING/)
 })
 it('year precision never becomes a 1 January timeline candidate; unresolved identities are not approved',()=>{
  const b=bundle();b.timeline=[approvedRow({precision:'year',year:1971,on:null,title:'Historic'})];b.players=[approvedRow({productionId:null,nameOriginal:'P'})]
  const r=plan(b,profile);expect(r.report.stats.approvedExactDateCandidates).toBe(0);expect(r.report.stats.approvedPlayerCandidates).toBe(0)
 })
 it('only profiled HTTPS paths without credentials produce fetch work',()=>{
  expect(allowedPath('https://www.pao.gr@evil.test/en/match/123/',profile)).toBeNull()
  expect(allowedPath('https://x:y@www.pao.gr/en/match/123/',profile)).toBeNull()
  const b=bundle();b.matches[0]!.sourceMatchUrl='https://evil.test/en/match/123/'
  const r=plan(b,profile);expect(r.jobs).toHaveLength(0);expect(r.issues[0]!.kind).toBe('detail_source_not_allowed')
 })
 it('reads gate targets from the live threshold table — it cannot disagree with the game',()=>{
  const req=requirements();for(const [k,t] of Object.entries(GATE_THRESHOLDS))expect([req[k]!.target,req[k]!.minimum]).toEqual([t.target,t.minimum])
 })
 it('reordering the input never changes job ids or the input version',()=>{
  const b=bundle();b.matches.push({...b.matches[0],id:'match-b',sourceMatchUrl:'https://www.pao.gr/en/match/124/'})
  const a=plan(b,profile);b.matches.reverse();const c=plan(b,profile);expect(a.jobs.map(j=>j.id)).toEqual(c.jobs.map(j=>j.id));expect(a.report.inputVersion).toBe(c.report.inputVersion)
 })
})

describe('polite fetcher',()=>{
 beforeEach(()=>resetFetcherState())
 const res=(status:number,body='',headers:Record<string,string>={})=>({status,headers:{get:(n:string)=>headers[n.toLowerCase()]??null},arrayBuffer:async()=>new TextEncoder().encode(body).buffer as ArrayBuffer,text:async()=>body})
 it('honours robots.txt for our agent and for *',()=>{
  expect(robotsDisallows('User-agent: *\nDisallow: /en/match/','/en/match/1/')).toBe(true)
  expect(robotsDisallows('User-agent: FanLifeResearch\nDisallow: /\n\nUser-agent: *\nDisallow:','/x')).toBe(true)
  expect(robotsDisallows('User-agent: *\nDisallow: /private','/en/match/1/')).toBe(false)
 })
 it('treats 403 as an answer, sends validators, and reads 304 as unchanged',async()=>{
  const calls:{url:string;headers:Record<string,string>}[]=[]
  const f:FetchLike=async(url,init)=>{calls.push({url,headers:init.headers});if(url.endsWith('robots.txt'))return res(404);if(url.includes('/403'))return res(403);return init.headers['if-none-match']?res(304):res(200,'<html>ok</html>',{etag:'"v1"'})}
  const s={...src,paths:{'match-detail':'.*'}}
  expect((await politeFetch('https://www.pao.gr/en/match/403',s,null,f)).kind).toBe('refused')
  const first=await politeFetch('https://www.pao.gr/en/match/1/',s,null,f);expect(first.kind).toBe('fetched')
  const again=await politeFetch('https://www.pao.gr/en/match/1/',s,{etag:'"v1"',lastModified:null},f);expect(again.kind).toBe('unchanged')
  expect(calls.at(-1)!.headers['if-none-match']).toBe('"v1"')
  expect((await politeFetch('https://evil.test/en/match/1/',s,null,f)).kind).toBe('refused')
 })
 it('backs off on 429 with Retry-After',async()=>{
  const f:FetchLike=async url=>url.endsWith('robots.txt')?res(404):res(429,'',{'retry-after':'30'})
  const r=await politeFetch('https://www.pao.gr/en/match/1/',src,null,f);expect(r).toMatchObject({kind:'retry',afterMs:30000})
 })
})

describe('research store and worker',()=>{
 beforeEach(()=>{process.env.FAN_LIFE_DATA_DIR=mkdtempSync(path.join(tmpdir(),'fl-research-'));resetFetcherState()})
 it('a lease is exclusive; a late completion with a stale token changes nothing',async()=>{
  const job=plan(bundle(),profile).jobs[0]!;await upsertJobs('fixture-club',[job])
  const t0=new Date('2026-10-06T10:00:00Z'),[a]=await lease('fixture-club',5,t0,1000)
  expect(await lease('fixture-club',5,t0,1000)).toHaveLength(0)
  const [b]=await lease('fixture-club',5,new Date('2026-10-06T10:00:02Z'),1000)
  expect(b!.lease).not.toBe(a!.lease)
  expect(await complete('fixture-club',job.id,a!.lease!,{state:'parsed'},t0)).toBe(false)
  expect(await complete('fixture-club',job.id,b!.lease!,{state:'unchanged'},t0)).toBe(true)
  expect((await readJobs('fixture-club'))[0]!.state).toBe('unchanged')
 })
 it('a fetched page without a tested parser ends as needs-adapter and keeps its snapshot',async()=>{
  await upsertJobs('fixture-club',plan(bundle(),profile).jobs)
  const f:FetchLike=async url=>url.endsWith('robots.txt')?{status:404,headers:{get:()=>null},arrayBuffer:async()=>new ArrayBuffer(0),text:async()=>''}:{status:200,headers:{get:(n:string)=>n==='etag'?'"x"':null},arrayBuffer:async()=>new TextEncoder().encode('<html/>').buffer as ArrayBuffer,text:async()=>'<html/>'}
  const run=await runWorker(profile,{fetchImpl:f});expect(run.counts).toMatchObject({fetched:1,needsAdapter:1})
  expect((await readJobs('fixture-club'))[0]!.state).toBe('needs-adapter')
  expect(Object.keys(await readSnapshots('fixture-club'))).toEqual(['https://www.pao.gr/en/match/123/'])
  expect((await runWorker(profile,{fetchImpl:f})).counts.leased).toBe(0)
 })
})
