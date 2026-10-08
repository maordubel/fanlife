import {describe,it,expect,vi,beforeEach} from 'vitest'
const request=vi.hoisted(()=>({host:'olympiacos.fanlife.dubelteam.com',paused:false,gates:[8]}))
vi.mock('next/headers',()=>({headers:()=>new Headers({host:request.host})}))
vi.mock('@/lib/master/store',()=>({readState:async()=>({clubs:['olympiacos','zrinjski-mostar','hapoel-tel-aviv'].map(id=>({id,status:request.paused?'paused':'live',gates:request.gates}))})}))
import {gradeGoalReplay} from '@/components/clubs/gates/goal/goal-actions'
import {clubGoals,goalDeal,goalPool} from '@/lib/clubs/goal'
import {loadClub} from '@/lib/clubs/resolver'
beforeEach(()=>{request.host='olympiacos.fanlife.dubelteam.com';request.paused=false;request.gates=[8]})
async function deal(id='olympiacos'){const d=(await loadClub(id))!.data,g=clubGoals(d)[0]!;return {d,g}}

describe('gate 8 server authority',()=>{
 it('grades a replay, reveals the report only after the whistle, and names each toucher\'s side',async()=>{
  const {d,g}=await deal()
  const pool=goalPool(d,g,1)
  const mine=g.steps.map((s,i)=>({actor:pool[i%pool.length]!,action:s.action,zone:s.zone}))
  const v=await gradeGoalReplay('olympiacos',d.version,g.id,1,mine)
  expect(v).not.toBeNull()
  expect(v!.max).toBe(g.steps.length*4)
  expect(v!.truth).toHaveLength(g.steps.length)
  expect(v!.truth.every(s=>['club','opponent','unnamed'].includes(s.side))).toBe(true)
  expect(v!.countRight).toBe(true)
  // every verb and zone right: the verdict is at least the verb + zone points
  expect(v!.points).toBeGreaterThanOrEqual(g.steps.length*3)
 },60000)
 it('the dealt items carry no answer (no steps, no narrative, no sides)',async()=>{
  const {d}=await deal()
  const items=goalDeal(d,3)
  expect(items.length).toBeGreaterThan(0)
  const json=JSON.stringify(items)
  expect(json).not.toContain('"steps"');expect(json).not.toContain('"narrative"');expect(json).not.toContain('"side"')
 },60000)
 it('refuses a stale version, an unknown goal, another tenant, a closed gate, a paused club and malformed touches',async()=>{
  const {d,g}=await deal()
  const ok=[{actor:'',action:'shot',zone:'C1'}]
  expect(await gradeGoalReplay('olympiacos','stale',g.id,1,ok)).toBeNull()
  expect(await gradeGoalReplay('olympiacos',d.version,'nope',1,ok)).toBeNull()
  expect(await gradeGoalReplay('olympiacos',d.version,g.id,1.5,ok)).toBeNull()
  expect(await gradeGoalReplay('olympiacos',d.version,g.id,1,[])).toBeNull()
  expect(await gradeGoalReplay('olympiacos',d.version,g.id,1,[{actor:'',action:'volley',zone:'C1'}])).toBeNull()
  expect(await gradeGoalReplay('olympiacos',d.version,g.id,1,[{actor:'Not In The Room',action:'shot',zone:'C1'}])).toBeNull()
  expect(await gradeGoalReplay('olympiacos',d.version,g.id,1,Array.from({length:6},()=>ok[0]))).toBeNull()
  expect(await gradeGoalReplay('zrinjski-mostar',d.version,g.id,1,ok)).toBeNull()
  request.gates=[2];expect(await gradeGoalReplay('olympiacos',d.version,g.id,1,ok)).toBeNull()
  request.gates=[8];request.paused=true;expect(await gradeGoalReplay('olympiacos',d.version,g.id,1,ok)).toBeNull()
 },60000)
})
