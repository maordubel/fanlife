import {afterAll,describe,expect,it,vi} from 'vitest'
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import type {AdapterResult} from '@/lib/master/adapters/types'
import type {Job} from '@/lib/master/types'

// research adapters are replaced: each job's query names what the fake source returns
const fake=vi.hoisted(()=>({results:new Map<string,AdapterResult>()}))
vi.mock('@/lib/master/adapters',()=>{const mk=(id:string)=>({id,label:id,needsQuery:false,capabilities:[],collect:async(job:Job)=>fake.results.get(`${id}:${job.query}`)??{sources:[],findings:[]}})
 const A={wikipedia:mk('wikipedia'),package:mk('package')};return {ADAPTERS:A,ADAPTER_LIST:Object.values(A),adapterAvailable:()=>true,adapterFor:(id?:string)=>A[(id||'wikipedia') as 'wikipedia']}})

import {runResearch} from '@/lib/master/research'
import {mutate,readState,findingId} from '@/lib/master/store'
import {isPending} from '@/lib/master/researchMerge'
import {archiveSummary,pipeline,publishState,type ClubSummary,type GateSummary} from '@/lib/master/summary'
import {overviewCounts,progressText} from '@/lib/master/layers'
import {requestGate} from '@/lib/master/requestGate'
import {lightState} from '@/lib/master/lightState'
import nextConfig from '../../next.config.mjs'

const dir=mkdtempSync(path.join(tmpdir(),'audit-master-'));vi.stubEnv('FAN_LIFE_DATA_DIR',dir);vi.stubEnv('RESEARCH_DATA_DIR','')
afterAll(()=>{vi.unstubAllEnvs();rmSync(dir,{recursive:true,force:true})})
const ROOT=path.join(__dirname,'..','..')
const src=(id:string,excerpt=`text ${id}`)=>({id,title:id,url:`https://example.org/${id}`,excerpt,reviewed:false,retrievedAt:'2026-10-07T00:00:00Z'})
const fnd=(field:string,value:string,sources:string[])=>({field,value,sources,approved:false})
const queue=(clubId:string,adapter:'wikipedia'|'package',query:string)=>mutate(s=>{const job:Job={id:`${clubId}-${adapter}-${query}`,clubId,query,adapter:adapter==='wikipedia'?undefined:adapter,status:'queued',attempts:0,createdAt:new Date().toISOString()};s.jobs.push(job);return job})

describe('F05 / F06 / F15 — research never touches publication, keeps every source, runs the job it was given',()=>{
 it('runs the job by id (not the first in the global queue) and leaves status and gates alone',async()=>{
  const clubs=(await readState()).clubs,[a,b]=[clubs[0]!.id,clubs[1]!.id]
  await mutate(s=>{const c=s.clubs.find(c=>c.id===b)!;c.status='live';c.gates=[2,13];return true})
  fake.results.set('package:pkg-1',{sources:[src('s1')],findings:[fnd('founded','1911',['s1'])]})
  const first=await queue(a,'wikipedia','first-in-queue'),mine=await queue(b,'package','pkg-1')
  const r=await runResearch(mine.id)
  expect(r).toMatchObject({ran:true,status:'completed',jobId:mine.id,clubId:b})
  const s=await readState()
  expect(s.jobs.find(j=>j.id===first.id)!.status).toBe('queued') // the global first job did not run
  const club=s.clubs.find(c=>c.id===b)!
  expect(club.status).toBe('live');expect(club.gates).toEqual([2,13]) // F05: publication untouched
  expect(club.research).toMatchObject({state:'needs-review',lastRunId:mine.id,lastAdapter:'package'})
  // an unknown or finished id runs nothing
  expect(await runResearch('no-such-job')).toMatchObject({ran:false,reason:'Job not found.'})
  expect(await runResearch(mine.id)).toMatchObject({ran:false,reason:'Job is completed.'})
 })
 it('a non-live club researched does not move to review either',async()=>{
  const c=(await readState()).clubs.find(c=>c.status==='research'&&c.id!=='hapoel-tel-aviv')!
  fake.results.set('wikipedia:w0',{sources:[src('w0')],findings:[]})
  await runResearch((await queue(c.id,'wikipedia','w0')).id)
  expect((await readState()).clubs.find(x=>x.id===c.id)!.status).toBe('research')
 })
 it('upserts findings by id with lineage, keeps pending findings from every adapter, and marks superseded explicitly',async()=>{
  const id=(await readState()).clubs[2]!.id
  const f1=fnd('founded','1911',['w1']),f2=fnd('ground','Old Park',['w1']),f3=fnd('nickname','Reds',['p1'])
  fake.results.set('wikipedia:run1',{sources:[src('w1')],findings:[f1,f2]})
  fake.results.set('package:run2',{sources:[src('p1')],findings:[f3]})
  fake.results.set('wikipedia:run3',{sources:[src('w1','text w1 (edited)')],findings:[f1]})
  const j1=await queue(id,'wikipedia','run1');await runResearch(j1.id)
  const j2=await queue(id,'package','run2');await runResearch(j2.id)
  let c=(await readState()).clubs.find(x=>x.id===id)!
  expect(c.findings.filter(isPending).map(f=>f.field).sort()).toEqual(['founded','ground','nickname']) // the package run did not drop wikipedia's
  const j3=await queue(id,'wikipedia','run3');await runResearch(j3.id)
  c=(await readState()).clubs.find(x=>x.id===id)!
  const by=(field:string)=>c.findings.find(f=>f.field===field)!
  expect(by('founded')).toMatchObject({id:findingId(f1),lineage:{adapters:['wikipedia'],firstRunId:j1.id,lastRunId:j3.id}})
  expect(by('ground').superseded).toMatchObject({runId:j3.id,adapter:'wikipedia',reason:expect.stringMatching(/no longer produces/)})
  expect(by('nickname')).toMatchObject({lineage:{adapters:['package']}});expect(by('nickname').superseded).toBeUndefined()
  expect(c.findings.filter(isPending).map(f=>f.field).sort()).toEqual(['founded','nickname'])
  expect(c.findings).toHaveLength(3) // superseded is kept as history, not deleted
 })
 it('never re-opens a decision',async()=>{
  const id=(await readState()).clubs[3]!.id,f=fnd('colours','red',['d1'])
  fake.results.set('wikipedia:d1',{sources:[src('d1')],findings:[f]});await runResearch((await queue(id,'wikipedia','d1')).id)
  await mutate(s=>{const x=s.clubs.find(c=>c.id===id)!.findings[0]!;x.decision='rejected';x.reason='wrong club';return true})
  fake.results.set('wikipedia:d2',{sources:[src('d1')],findings:[]});await runResearch((await queue(id,'wikipedia','d2')).id)
  const x=(await readState()).clubs.find(c=>c.id===id)!.findings[0]!
  expect(x.decision).toBe('rejected');expect(x.superseded).toBeUndefined()
 })
 it('the API and both admin buttons pass the job id',()=>{
  const route=readFileSync(path.join(ROOT,'app/api/master/[...action]/route.ts'),'utf8')
  expect(route).toMatch(/a==='research\/run'\)return json\(await runResearch\(typeof b\.id==='string'/)
  for(const f of ['components/master/DataCenter.tsx','components/master/ClubFile.tsx']){
   const s=readFileSync(path.join(ROOT,f),'utf8');expect(s,f).not.toMatch(/'research\/run',\{\}/);expect(s,f).toMatch(/'research\/run',\{id:job\.id\}/)
  }
 })
})

describe('F03 — the API route ships the same research files as the admin page',()=>{
 const includes=(nextConfig as {experimental:{outputFileTracingIncludes:Record<string,string[]>}}).experimental.outputFileTracingIncludes
 // the same matcher and route normaliser Next uses when it applies outputFileTracingIncludes (collect-build-traces)
 const pm=require('next/dist/compiled/picomatch') as (g:string,o:object)=>(s:string)=>boolean
 const {normalizeAppPath}=require('next/dist/shared/lib/router/utils/app-paths') as {normalizeAppPath:(s:string)=>string}
 const shipped=(entry:string)=>[...new Set(Object.entries(includes).filter(([k])=>pm(k,{dot:true,contains:true})(normalizeAppPath(entry))).flatMap(([,v])=>v))].sort()
 it('a config key matches the catch-all API route, and it gets the profiles',()=>{
  const api=shipped('app/api/master/[...action]/route'),page=shipped('app/master/admin/page')
  expect(api).toContain('./research-profiles/**/*');expect(api).toContain('./research-staging/**/*');expect(api).toContain('./research-data/**/*')
  expect(api).toEqual(page) // page and API read the same dataset
 })
 it('a missing profile dataset is a health error, not zero data',async()=>{
  const bare=mkdtempSync(path.join(tmpdir(),'no-profiles-'))
  try{
   const s=await archiveSummary('aek-athens',bare)
   expect(s).toMatchObject({profile:false,health:'profiles-missing',error:expect.stringMatching(/missing on this server/)})
   const steps=pipeline({archive:s,research:{sources:0,reviewedSources:0,changedSources:0,findingsPending:0,findingsDecided:0,findingsSuperseded:0,lastJob:null,staging:{present:false,snapshotAsOf:null,approvedForProduction:null,counts:{}}},engine:{inRegistry:true,hasProvider:false,reviewOnly:false},data:null,control:{status:'research',version:1,gatesOn:[]},activation:{allowed:false,reasons:[]},publication:{openNow:0,preview:false,state:'no-data',label:'No playable data yet'}})
   expect(steps[0]).toMatchObject({key:'profile',state:'blocked'})
   mkdirSync(path.join(bare,'research-profiles'));writeFileSync(path.join(bare,'research-profiles','aek-athens.json'),'{not json')
   expect(await archiveSummary('aek-athens',bare)).toMatchObject({health:'profile-unreadable'})
   expect(await archiveSummary('nobody',bare)).toMatchObject({health:'no-profile',error:null})
  }finally{rmSync(bare,{recursive:true,force:true})}
  expect(await archiveSummary('aek-athens',ROOT)).toMatchObject({profile:true,health:'ok'})
 })
})

const gate=(number:number,dataPlayable:boolean):GateSummary=>({key:`g${number}` as GateSummary['key'],number,state:dataPlayable?'READY':'LOCKED',eligible:dataPlayable?10:0,target:10,dataPlayable,full:dataPlayable,access:'ok' as GateSummary['access'],openNow:false,reason:null})
type S=Parameters<typeof pipeline>[0]
const club=(over:{playable?:number;gatesOn?:number[];status?:ClubSummary['control']['status'];allowed?:boolean;documents?:number;needsParser?:number;observedTotal?:number|null;listed?:[number,number]}={}):S=>{
 const playable=over.playable??0,data={gates:Array.from({length:13},(_,i)=>gate(i+1,i<playable)),dataPlayable:playable,full:playable,diagnostics:{blocker:0,review:0,info:0},topCodes:[],timelineEvents:0}
 const base={data,control:{status:over.status??'research',version:1,gatesOn:over.gatesOn??[]},activation:{allowed:over.allowed??false,reasons:[]}}
 const state=publishState(base)
 return {...base,engine:{inRegistry:true,hasProvider:true,reviewOnly:false},publication:{openNow:over.status==='live'?(over.gatesOn??[]).length:0,preview:false,state,label:''},
  research:{sources:2,reviewedSources:1,changedSources:0,findingsPending:3,findingsDecided:1,findingsSuperseded:0,lastJob:null,staging:{present:true,snapshotAsOf:'2026-10-06',approvedForProduction:0,counts:{}}},
  archive:{profile:true,health:'ok',error:null,sources:1,documents:over.documents??1,needsParser:over.needsParser??0,blocked:0,listings:{total:(over.listed??[1,0])[0],listed:(over.listed??[1,0])[1]},observedTotal:over.observedTotal===undefined?null:over.observedTotal,lastRun:{state:'partial_budget',at:'2026-10-07T00:00:00Z',requests:3}}}
}

describe('F20 — data-ready, publish-configured and published are separate; steps report coverage',()=>{
 it('a full pack with no gate switched on is "choose gates", not zero ready',()=>{
  expect(publishState(club({playable:13}))).toBe('choose-gates')
  expect(publishState(club({playable:13,gatesOn:[1,2],allowed:true}))).toBe('ready-to-publish')
  expect(publishState(club({playable:2,gatesOn:[1,5]}))).toBe('gates-not-playable')
  expect(publishState(club({playable:0}))).toBe('no-data')
  expect(publishState(club({playable:13,gatesOn:[1],status:'live',allowed:true}))).toBe('published')
  const counts=overviewCounts([club({playable:13}),club({playable:13,gatesOn:[1,2],allowed:true}),club({playable:13,gatesOn:[1],status:'live',allowed:true}),club()])
  expect(counts).toEqual({dataReady:3,chooseGates:1,configured:2,readyToPublish:1,published:1,liveBlocked:0})
 })
 it('one processed document does not mark collect or extract done; an unknown universe stays unknown',()=>{
  const steps=Object.fromEntries(pipeline(club({documents:1,needsParser:0,observedTotal:null})).map(s=>[s.key,s]))
  expect(steps.collect!.state).not.toBe('done');expect(steps.collect!.progress).toEqual({covered:1,total:null,remaining:null})
  expect(steps.collect!.detail).toMatch(/total unknown/);expect(steps.collect!.detail).not.toMatch(/%/)
  expect(steps.parse!.state).not.toBe('done')
  const known=Object.fromEntries(pipeline(club({documents:40,needsParser:10,observedTotal:100})).map(s=>[s.key,s]))
  expect(known.collect!.progress).toEqual({covered:40,total:100,remaining:60});expect(known.parse!.progress).toEqual({covered:30,total:40,remaining:10})
  const all=Object.fromEntries(pipeline(club({documents:100,needsParser:0,observedTotal:100,listed:[1,1]})).map(s=>[s.key,s]))
  expect(all.collect!.state).toBe('done');expect(all.parse!.state).toBe('done')
  expect(progressText({covered:3,total:null,remaining:null})).toBe('3 so far · total unknown')
 })
 it('pack and review are DONE only when nothing remains',()=>{
  const p=Object.fromEntries(pipeline(club({playable:1})).map(s=>[s.key,s]))
  expect(p.pack!.state).toBe('active');expect(p.pack!.progress).toEqual({covered:1,total:13,remaining:12})
  expect(p.review!.state).not.toBe('done');expect(p.review!.progress.remaining).toBe(4)
 })
 it('the Admin overview shows the three layers separately (English copy)',()=>{
  const s=readFileSync(path.join(ROOT,'components/master/Admin.tsx'),'utf8')
  for(const label of ['DATA READY','CHOOSE GATES','READY TO PUBLISH','PUBLISHED'])expect(s).toContain(`<small>${label}</small>`)
  expect(s).toContain('overviewCounts(sums)')
 })
})

describe('F21 — light refresh, Activity reset per club, stale answers dropped',()=>{
 it('drops an answer that arrives after a newer request in the same scope',()=>{
  const g=requestGate(),first=g.start('summary'),second=g.start('summary')
  expect(first()).toBe(false);expect(second()).toBe(true)
  const club=g.watch('summary');expect(club()).toBe(true);g.start('summary');expect(club()).toBe(false)
  expect(g.start('state')()).toBe(true) // scopes are independent
 })
 it('the light state carries no evidence arrays',async()=>{
  const l=lightState(await readState())
  expect(l.clubs.every(c=>!('sources' in c)&&!('findings' in c))).toBe(true);expect(l.auditTail.length).toBeLessThanOrEqual(100)
 })
 it('Admin refreshes the light state, keys Activity by club, and guards late answers',()=>{
  const s=readFileSync(path.join(ROOT,'components/master/Admin.tsx'),'utf8'),route=readFileSync(path.join(ROOT,'app/api/master/[...action]/route.ts'),'utf8')
  expect(s).not.toMatch(/api\.get<State>\('state'\)/);expect(s).toContain("api.get<LightState>('state/light')")
  expect(route).toContain("a==='state/light'")
  expect(s).toMatch(/<Activity key=\{selected\}/)
  expect(s).toMatch(/if\(live\)setData/)
  expect(s).toMatch(/stateOk\(\)/)
 })
})
