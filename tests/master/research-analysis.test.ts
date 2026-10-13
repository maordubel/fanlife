import {describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {researchRows} from '@/lib/master/researchAnalysis'
import {lifeEntry} from '@/lib/clubs/life/entry'
import type {ClubSummary} from '@/lib/master/summary'

const gate=(number:number,eligible:number,target:number,dataPlayable:boolean,openNow=false)=>({key:'xi',number,state:'PARTIAL',eligible,target,dataPlayable,full:false,access:'ok',openNow,reason:null} as unknown as NonNullable<ClubSummary['data']>['gates'][number])
const base=(over:Partial<ClubSummary>):ClubSummary=>({id:'c',name:'C',city:'',country:'',initials:'C',primary:'',control:{status:'research',version:3,gatesOn:[]},engine:{inRegistry:true,hasProvider:true,reviewOnly:false},
 research:{sources:0,reviewedSources:0,changedSources:0,findingsPending:0,findingsDecided:0,findingsSuperseded:0,lastJob:null,staging:{present:false,snapshotAsOf:null,approvedForProduction:null,counts:{}}},
 data:null,publication:{openNow:0,preview:false,state:'no-data',label:''},activation:{allowed:false,reasons:[]},next:[],
 archive:{profile:true,health:'ok',error:null,sources:1,documents:0,needsParser:0,blocked:0,listings:{total:0,listed:0},observedTotal:null,lastRun:null},pipeline:[],...over} as ClubSummary)

describe('research analysis',()=>{
 it('counts progress against the known set of gates and names the gates that can open',()=>{
  const r=researchRows([base({data:{gates:[gate(1,10,10,true),gate(2,30,60,false)],dataPlayable:1,full:0,diagnostics:{blocker:0,review:0,info:0},topCodes:[],timelineEvents:0}})])[0]!
  expect(r.canOpen.map(g=>g.number)).toEqual([1]); expect(r.nearest?.number).toBe(2); expect(r.percent).toBeGreaterThan(0); expect(r.percent).toBeLessThan(100); expect(r.stage).toBe('ready')
 })
 it('offers a merge only when a staged package waits',()=>{
  const waiting=base({research:{...base({}).research,staging:{present:true,snapshotAsOf:'x',approvedForProduction:0,counts:{}}}})
  expect(researchRows([waiting])[0]!.canMerge).toBe(true); expect(researchRows([base({})])[0]!.canMerge).toBe(false)
 })
 it('a club with no data is 0%, never a guessed figure',()=>expect(researchRows([base({})])[0]!.percent).toBe(0))
})

describe('LIFE entry',()=>{
 it('is closed for an unpublished club outside preview, and a published club is not left in the workshop for being outside preview',async()=>{
  expect((await lifeEntry('celtic',{evaluation:false,status:'research'})).state).toBe('workshop')
  expect((await lifeEntry('celtic',{evaluation:false,paused:true,status:'live'})).state).toBe('workshop')
  expect((await lifeEntry('celtic',{evaluation:false,status:'live'})).state).toBe('universal')
 })
})
