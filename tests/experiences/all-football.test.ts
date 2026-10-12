import {describe,it,expect,vi,beforeEach} from 'vitest'
import {readFileSync} from 'node:fs'
const ctx=vi.hoisted(()=>({clubs:['olympiacos','panathinaikos','zrinjski-mostar','celtic','hapoel-tel-aviv'],gates:[2,6,13],status:'live' as 'live'|'paused',features:{allFootball:true,allFootballGates:['trivia','timeline','memory']},owner:false,values:new Map<string,string>()}))
vi.mock('next/headers',()=>({headers:()=>new Headers({host:'fanlife.localhost'}),cookies:()=>({get:(k:string)=>ctx.values.has(k)?{value:ctx.values.get(k)}:undefined,set:(k:string,v:string)=>ctx.values.set(k,v)})}))
vi.mock('@/lib/master/store',()=>({readState:async()=>({clubs:ctx.clubs.map(id=>({id,name:id,status:ctx.status,gates:ctx.gates})),features:ctx.features})}))
vi.mock('@/lib/master/admin',()=>({adminSession:()=>ctx.owner?{actor:'owner',role:'owner'}:null}))
import {aggregateFor,attribute,modeOf,parseModeQuery,slugOf,CAPS,gateReport,aggregateBank} from '@/lib/experiences/pool'
import {runLab} from '@/lib/experiences/lab'
import {splitKey} from '@/lib/master/crm/refs'
import {REGISTRY} from '@/lib/master/registry'
import {startTriviaRun,openTriviaQuestion,answerTriviaRun,placeCard} from '@/app/all-football/actions'
import type {RunView} from '@/lib/clubs/trivia-run-core'

beforeEach(()=>{ctx.status='live';ctx.gates=[2,6,13];ctx.features={allFootball:true,allFootballGates:['trivia','timeline','memory']};ctx.owner=false;ctx.values.clear()})

describe('ALL FOOTBALL is an experience, not a club (ADR-0009)',()=>{
 it('the club registry never lists it',()=>{expect(REGISTRY.some(r=>r.id.includes('all-football'))).toBe(false)})
 it('modes round-trip through the slug, and a forged slug is refused',()=>{
  for(const m of [{kind:'balanced'},{kind:'chaos'},{kind:'duel',clubs:['celtic','olympiacos']}] as const)expect(modeOf(slugOf(m as never))).toEqual(m)
  expect(modeOf('all-football:duel:celtic,celtic')).toBeNull();expect(modeOf('olympiacos')).toBeNull();expect(modeOf('all-football:duel:../x,y')).toBeNull()
  expect(parseModeQuery({mode:'duel',a:'olympiacos',b:'celtic'})).toEqual({kind:'duel',clubs:['celtic','olympiacos']})
  expect(parseModeQuery({mode:'duel',a:'x'})).toEqual({kind:'balanced'})
 })
 it('a question that does not name its club gets the club in front',()=>{
  expect(attribute('First cup win — 1960-11-06. Is this the documented date?','Panathinaikos')).toBe('Panathinaikos · First cup win — 1960-11-06. Is this the documented date?')
  expect(attribute('Olympiacos beat OFI 4-2 — 1992-05-27.','Olympiacos')).toBe('Olympiacos beat OFI 4-2 — 1992-05-27.')
  expect(attribute('FC St. Pauli 1-3 Wattenscheid','FC St. Pauli')).toBe('FC St. Pauli 1-3 Wattenscheid')
 })
})

describe('the derived pool (ADR-0010)',()=>{
 it('draws only from clubs whose gate is open to fans, namespaced, capped per club',async()=>{
  const a=(await aggregateFor('trivia',{kind:'balanced'}))!
  expect(a.members.length).toBeGreaterThanOrEqual(2)
  const per:Record<string,number>={}
  for(const q of aggregateBank(a).questions){const o=splitKey(q.id)!;expect(a.members.map(m=>m.id)).toContain(o.clubId);per[o.clubId]=(per[o.clubId]??0)+1;if(q.pool)expect(q.pool.startsWith(`${o.clubId}~`)).toBe(true)}
  for(const n of Object.values(per))expect(n).toBeLessThanOrEqual(CAPS.trivia)
 },120000)
 it('a paused club or a switched-off gate leaves the pool',async()=>{
  ctx.gates=[6,13]
  expect(await aggregateFor('trivia',{kind:'balanced'})).toBeNull()
  expect((await gateReport('trivia')).excluded.every(x=>/not open/.test(x.reason))).toBe(true)
 },120000)
 it('the version is stable for the same members and changes with the mode',async()=>{
  const a=(await aggregateFor('timeline',{kind:'balanced'}))!,b=(await aggregateFor('timeline',{kind:'balanced'}))!,c=(await aggregateFor('timeline',{kind:'chaos'}))!
  expect(a.version).toBe(b.version);expect(c.version).not.toBe(a.version)
 },120000)
 it('a duel holds exactly its two clubs',async()=>{
  const d=(await aggregateFor('memory',{kind:'duel',clubs:['celtic','olympiacos']}))!
  expect(d.members.map(m=>m.id)).toEqual(['celtic','olympiacos'])
 },120000)
 it('the Round Lab finds no broken round in any gate',async()=>{
  for(const g of ['trivia','timeline','memory'] as const){const r=await runLab(g,30);expect(r.failures,g).toEqual([]);expect(r.dealt).toBeGreaterThan(0)}
 },240000)
})

describe('the server actions use the same run core and fail closed',()=>{
 it('a run starts, grades on the server, and keeps its answers off the client',async()=>{
  const a=(await aggregateFor('trivia',{kind:'balanced'}))!
  const v=await startTriviaRun({slug:a.slug,version:a.version,seed:11,cursor:0}) as RunView
  expect(v.ok).toBe(true)
  expect(JSON.stringify(v)).not.toMatch(/"answer"|explanation/)
  const bank=aggregateBank(a),id=v.questions[0]!.id,orig=bank.byId.get(id)!
  await openTriviaQuestion(a.slug,a.version,v.meta.run,0)
  const r=await answerTriviaRun(a.slug,a.version,v.meta.run,0,orig.answer)
  expect(r,JSON.stringify(r).slice(0,200)).toMatchObject({ok:true,correct:true})
 },120000)
 it('switched off for fans → closed; the owner still previews',async()=>{
  const a=(await aggregateFor('trivia',{kind:'balanced'}))!
  ctx.features={allFootball:false,allFootballGates:['trivia','timeline','memory']}
  expect(await startTriviaRun({slug:a.slug,version:a.version,seed:1,cursor:0})).toEqual({ok:false,error:'GATE_CLOSED'})
  ctx.owner=true
  expect((await startTriviaRun({slug:a.slug,version:a.version,seed:1,cursor:0})).ok).toBe(true)
 },120000)
 it('a stale version or a forged slug answers nothing',async()=>{
  expect(await startTriviaRun({slug:'all-football',version:'stale',seed:1,cursor:0})).toEqual({ok:false,error:'GATE_CLOSED'})
  expect(await placeCard('olympiacos','x','c',1,0,0,0)).toBeNull()
 },120000)
 it('the pages never ask gateAccess about an invented club',()=>{
  for(const f of ['app/all-football/actions.ts','app/all-football/page.tsx','app/all-football/[gate]/page.tsx','lib/experiences/access.ts'])expect(readFileSync(f,'utf8')).not.toMatch(/gateAccess\(|requestClub\(/)
 })
})
