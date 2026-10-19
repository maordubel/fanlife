import {describe,it,expect,vi,beforeEach} from 'vitest'
import {execFileSync} from 'node:child_process'
import reviewed from '@/research-data/goal-recovery-2026-10-19/reviewed.json'
import launch from '@/lib/master/launch-defaults.json'
import {withGoalWave} from '@/lib/clubs/goal-wave'
import {clubGoals,goalDeal,goalPool} from '@/lib/clubs/goal'
import {loadClub} from '@/lib/clubs/resolver'
import {REGISTRY} from '@/lib/master/registry'

const request=vi.hoisted(()=>({host:'celtic.fanlife.dubelteam.com',paused:false,gates:[8]}))
vi.mock('next/headers',()=>({headers:()=>new Headers({host:request.host})}))
vi.mock('@/lib/master/store',()=>({readState:async()=>({clubs:['hapoel-petah-tikva','panathinaikos','aek-athens','celtic','st-pauli','zrinjski-mostar'].map(id=>({id,status:request.paused?'paused':'live',gates:request.gates}))})}))
import {gradeGoalReplay} from '@/components/clubs/gates/goal/goal-actions'

const additions={'hapoel-petah-tikva':4,panathinaikos:4,'aek-athens':3,celtic:6,'st-pauli':4,'zrinjski-mostar':4}
beforeEach(()=>{request.host='celtic.fanlife.dubelteam.com';request.paused=false;request.gates=[8]})

describe('checked historical goal recovery',()=>{
 it('keeps the six published packs reproducible from the reviewed ledger, with held candidates excluded',()=>{
  expect(()=>execFileSync('python3',['scripts/club-research/build-goals-2026-10-19.py','--check'],{encoding:'utf8'})).not.toThrow()
  expect(reviewed.goals).toHaveLength(25)
  expect(reviewed.held).toHaveLength(6)
 })

 for(const [club,count] of Object.entries(additions))it(`${club}: opens the existing game and grades every new replay with server-held answers`,async()=>{
  const {data,diagnostics}=(await loadClub(club))!
  const goals=clubGoals(data),incoming=reviewed.goals.filter(g=>g.clubId===club)
  expect(incoming).toHaveLength(count)
  expect(data.gates.goal?.playable).toBe(true)
  expect((launch as Record<string,number[]>)[club]).toContain(8)
  expect(diagnostics.filter(d=>d.code==='ENTITY_INELIGIBLE'&&d.record.startsWith('goals:goal-'))).toEqual([])
  request.host=`${REGISTRY.find(c=>c.id===club)!.sub}.fanlife.dubelteam.com`
  for(const raw of incoming){
   const g=goals.find(g=>g.id===`${club}:${raw.id}`)!
   expect(g,raw.id).toBeDefined()
   expect(g.steps.length).toBeGreaterThanOrEqual(2)
   expect(g.steps.length).toBeLessThanOrEqual(5)
   expect(g.sources.every(id=>data.sources.some(s=>s.id===id&&s.checkedAt==='2026-10-19'&&s.access==='available'))).toBe(true)
   const pool=goalPool(data,g,7)
   expect(g.steps.every(s=>s.actor===null||pool.includes(s.actor))).toBe(true)
   const touches=g.steps.map(s=>({actor:s.actor??'',action:s.action,zone:s.zone}))
   const verdict=await gradeGoalReplay(club,data.version,g.id,7,touches)
   expect(verdict?.quality).toBe(1)
   expect(verdict?.countRight).toBe(true)
   expect(verdict?.sources.every(s=>s.url?.startsWith('https://'))).toBe(true)
  }
  const deal=JSON.stringify(goalDeal(data,7))
  for(const answerField of ['sequence','steps','narrative','side','position'])expect(deal).not.toContain(`"${answerField}"`)
 },60000)

 it('retains earlier approvals, never touches rosters, and merges idempotently',async()=>{
  const original={sources:[],goals:[{id:reviewed.goals[0]!.id,value:{name:'Prior owner approval'}}],players:[{id:'keeper',value:{name:'Existing player'}}]}
  const first=withGoalWave(original,reviewed.goals[0]!.clubId)
  expect(first.goals[0]).toEqual(original.goals[0])
  expect(first.players).toBe(original.players)
  expect(withGoalWave(first,reviewed.goals[0]!.clubId)).toEqual(first)
  for(const [id,count] of [['hapoel-tel-aviv',21],['olympiacos',6]] as const)expect(clubGoals((await loadClub(id))!.data)).toHaveLength(count)
  const zr=clubGoals((await loadClub('zrinjski-mostar'))!.data)
  expect(zr).toHaveLength(5)
  expect(zr.some(g=>g.id==='zrinjski-mostar:goal-2023-09-21-kozulj-winner-az')).toBe(true)
 },60000)

 it('preserves the source corrections: actual Madrid date, no invented minute, unnamed defender and separate shootout',async()=>{
  const pao=clubGoals((await loadClub('panathinaikos'))!.data)
  const real=pao.find(g=>g.opponent==='Real Madrid')!
  expect(real.on).toBe('2002-03-20')
  expect(real.steps[1]).toMatchObject({actor:null,side:'unnamed',action:'header'})
  const celtic=clubGoals((await loadClub('celtic'))!.data)
  for(const g of celtic.filter(g=>g.opponent==='Anderlecht'))expect(g.subtitle).toBe('2003-11-05')
  const zr=clubGoals((await loadClub('zrinjski-mostar'))!.data)
  expect(zr.find(g=>g.opponent==='Urartu')?.score).toBe('2-3 (aet)')
  const hpt=clubGoals((await loadClub('hapoel-petah-tikva'))!.data)
  expect(hpt.some(g=>g.id.endsWith('kakon-opening'))).toBe(false)
  expect(hpt.some(g=>g.on==='1997-05-16')).toBe(false)
 },60000)

 it('still refuses another tenant, stale versions, paused clubs and closed gates for newly opened clubs',async()=>{
  const {data}=(await loadClub('celtic'))!,g=clubGoals(data)[0]!
  const touches=g.steps.map(s=>({actor:s.actor??'',action:s.action,zone:s.zone}))
  expect(await gradeGoalReplay('celtic','stale',g.id,7,touches)).toBeNull()
  request.host='aek-athens.fanlife.dubelteam.com'
  expect(await gradeGoalReplay('celtic',data.version,g.id,7,touches)).toBeNull()
  request.host='celtic.fanlife.dubelteam.com';request.gates=[]
  expect(await gradeGoalReplay('celtic',data.version,g.id,7,touches)).toBeNull()
  request.gates=[8];request.paused=true
  expect(await gradeGoalReplay('celtic',data.version,g.id,7,touches)).toBeNull()
 },60000)
})
