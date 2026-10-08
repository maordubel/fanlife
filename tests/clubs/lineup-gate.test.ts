import {describe,it,expect,vi,beforeEach} from 'vitest'
const request=vi.hoisted(()=>({host:'olympiacos.fanlife.dubelteam.com',paused:false,gates:[3]}))
vi.mock('next/headers',()=>({headers:()=>new Headers({host:request.host})}))
vi.mock('@/lib/master/store',()=>({readState:async()=>({clubs:['olympiacos','zrinjski-mostar','hapoel-tel-aviv'].map(id=>({id,status:request.paused?'paused':'live',gates:request.gates}))})}))
import {gradeLineup} from '@/app/clubs/[slug]/[gate]/gate-actions'
import {askLineupCoach,gradeLineupSheet} from '@/components/clubs/gates/lineup/coach-action'
import {lineupMatches} from '@/lib/clubs/gate-content'
import {buildPool,coachBudget,matchYear} from '@/lib/clubs/lineup-model'
import {loadClub} from '@/lib/clubs/resolver'
beforeEach(()=>{request.host='olympiacos.fanlife.dubelteam.com';request.paused=false;request.gates=[3]})
async function deal(id='olympiacos'){const d=(await loadClub(id))!.data,m=lineupMatches(d)[0]!;return {d,m}}

describe('gate 3 server authority',()=>{
 it('the coach counts on the server, never names, and stops at the match budget',async()=>{
  const {d,m}=await deal()
  const mine=[...m.starters.slice(0,4),'Somebody Else']
  const first=await askLineupCoach('olympiacos',d.version,m.id,mine,0)
  expect(first).toEqual({kind:'stillOut',n:7,of:11})
  expect(JSON.stringify(first)).not.toContain(m.starters[5]!)
  const second=await askLineupCoach('olympiacos',d.version,m.id,mine,1)
  expect(coachBudget(m)).toBe(m.bench.length?2:1)
  expect(second===null).toBe(!m.bench.length)
  expect(await askLineupCoach('olympiacos',d.version,m.id,mine,2)).toBeNull()
 },60000)
 it('refuses a stale version, another tenant, a closed gate, a paused club and malformed input',async()=>{
  const {d,m}=await deal()
  expect(await askLineupCoach('olympiacos','stale',m.id,['A'],0)).toBeNull()
  expect(await askLineupCoach('olympiacos',d.version,'nope',['A'],0)).toBeNull()
  expect(await askLineupCoach('olympiacos',d.version,m.id,Array.from({length:12},()=>'A'),0)).toBeNull()
  expect(await askLineupCoach('olympiacos',d.version,m.id,['A'],NaN)).toBeNull()
  expect(await askLineupCoach('zrinjski-mostar',d.version,m.id,['A'],0)).toBeNull()
  request.gates=[2];expect(await askLineupCoach('olympiacos',d.version,m.id,['A'],0)).toBeNull()
  request.gates=[3];request.paused=true;expect(await askLineupCoach('olympiacos',d.version,m.id,['A'],0)).toBeNull()
 },60000)
 it('grades a pooled sheet: the pool always holds the eleven, and the grade reveals the rest',async()=>{
  const {d,m}=await deal()
  const pool=buildPool({matchId:m.id,starters:m.starters,decoys:m.decoys,roster:(d.players||[]).map(p=>p.value),year:2024})
  expect(m.starters.every(s=>pool.includes(s))).toBe(true)
  const decoy=pool.find(x=>!m.starters.includes(x))!
  const picks=[...m.starters.slice(0,10),decoy]
  const g=await gradeLineup('olympiacos',d.version,m.id,picks)
  expect(g).toMatchObject({correct:10,wrong:[decoy],missed:[m.starters[10]]})
 },60000)
 it('grades the sheet by names, claims no band accuracy, and refuses a malformed sheet whole',async()=>{
  const {d,m}=await deal()
  const pool=buildPool({matchId:m.id,starters:m.starters,decoys:m.decoys,roster:(d.players||[]).map(p=>p.value),year:matchYear(m.on)})
  const decoy=pool.find(x=>!m.starters.includes(x))!
  const rows=[...m.starters.slice(0,10),decoy].map(name=>({name,band:'DF'}))
  const g=await gradeLineupSheet('olympiacos',d.version,m.id,rows)
  expect(g).toMatchObject({correct:10,wrong:[decoy],missed:[m.starters[10]],bandGraded:false})
  // all eleven in a "wrong" band is still the same name grade: bands are not scored
  expect((await gradeLineupSheet('olympiacos',d.version,m.id,m.starters.map(name=>({name,band:'GK'}))))!.correct).toBe(11)
  const bad=(r:{name:string;band:string}[])=>gradeLineupSheet('olympiacos',d.version,m.id,r)
  expect(await bad(rows.slice(0,10))).toBeNull()
  expect(await bad([...rows.slice(0,10),rows[0]!])).toBeNull()
  expect(await bad([...rows.slice(0,10),{name:'Not In The Room',band:'DF'}])).toBeNull()
  expect(await bad([...rows.slice(0,10),{name:decoy,band:'WING'}])).toBeNull()
  expect(await bad([...rows,{name:'X',band:'DF'}])).toBeNull()
 },60000)
})
