import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import {attention,deskHref} from '@/lib/master/attention'
import type {ClubSummary} from '@/lib/master/summary'

const club=(over:Partial<ClubSummary>={}):ClubSummary=>({id:'x-club',name:'X Club',city:'C',country:'K',initials:'XC',primary:'#000000',
 control:{status:'research',version:1,gatesOn:[]},engine:{inRegistry:true,hasProvider:true,reviewOnly:false},
 research:{sources:0,reviewedSources:0,changedSources:0,findingsPending:0,findingsDecided:0,findingsSuperseded:0,lastJob:null,staging:{present:false,snapshotAsOf:null,approvedForProduction:null,counts:{}}} as never,
 data:null,publication:{openNow:0,preview:true,state:'research' as never,label:'Research'},activation:{allowed:true,reasons:[]},next:[],
 archive:{profile:true,health:'ok',error:null,sources:0,documents:0,needsParser:0,blocked:0,listings:{total:0,listed:0},observedTotal:null,lastRun:null},pipeline:[],...over})
const ok={storage:{durable:true,kind:'vercel-blob'},measurement:'connected' as const,runnerPinned:null}

describe('the Editor’s Desk inbox (plan §4)',()=>{
 it('is empty when nothing waits, and never invents work',()=>{expect(attention([club()],[],ok)).toEqual([])})
 it('puts blockers first and sends each item to the screen that resolves it',()=>{
  const items=attention([club({research:{...club().research,findingsPending:3}}),club({id:'live',name:'Live FC',control:{status:'live',version:1,gatesOn:[2]},activation:{allowed:false,reasons:['Gate 2 is switched on but its data is not playable (LOCKED).']}})],[],{...ok,storage:{durable:false,kind:'temporary'}})
  expect(items.map(i=>i.id)).toEqual(['storage','activation:live','findings:x-club'])
  expect(items[1]!.href).toBe(deskHref('clubs',{club:'live',view:'readiness'}))
  expect(items[2]!.title).toBe('3 findings to decide')
 })
 it('unconnected measurement is an item, not zero visitors',()=>{expect(attention([],[],{...ok,measurement:'not-connected'}).map(i=>i.id)).toEqual(['measurement'])})
})
describe('the desk frame',()=>{
 it('the admin page never carries the public tab bar or masthead, and old ?tab= links still land',()=>{
  const page=readFileSync('app/master/admin/page.tsx','utf8'),shell=readFileSync('components/master/desk/AdminShell.tsx','utf8')
  expect(page).not.toMatch(/from '@\/components\/master\/Shell'/);expect(shell).not.toMatch(/TabBar/)
  for(const t of ['overview','club','data','display','updates','activity'])expect(page).toMatch(new RegExp(`${t}:\\{section:`))
 })
})
