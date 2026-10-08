import {afterEach,describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {buildDeskPack,readDeskPack,writeDeskPack,deskPackIds,usable} from '@/lib/master/deskPack'
import {compilePack} from '@/lib/clubs/compiler'
import {REGISTRY} from '@/lib/master/registry'
import {loadClub,invalidateClub,engineClubIds} from '@/lib/clubs/resolver'
import {gateAvailability} from '@/lib/clubs/gates'
import {packageAdapter} from '@/lib/master/adapters/package'
import type {Club,Finding,Source} from '@/lib/master/types'

/** Launch (8.10.2026): approved players → desk pack → the same compiler → a playable gate. Nothing without approval. */
const src=(id:string,reviewed=true):Source=>({id,title:`Source ${id}`,url:`https://example.org/${id}`,excerpt:'x',reviewed,retrievedAt:'2026-10-07T04:52:06.272Z'})
const player=(n:number,decision?:Finding['decision'],source='a'):Finding=>({id:`f-${n}`,field:'player',value:`Player ${n}`,sources:[source],approved:decision==='approved',decision,decidedAt:'2026-10-08T09:00:00.000Z',record:{kind:'player',name:`Player ${n}`,positions:[],fromYear:null,toYear:null}})
const club=(findings:Finding[],sources=[src('a')],id='aek-athens'):Pick<Club,'id'|'sources'|'findings'>=>({id,sources,findings})
afterEach(()=>{vi.unstubAllEnvs()})

describe('desk pack',()=>{
 it('uses only approved player rows whose sources the owner reviewed',()=>{
  const c=club([player(1,'approved'),player(2),player(3,'rejected'),player(4,'approved','b')],[src('a'),src('b',false)])
  expect(c.findings.filter(f=>usable(c,f)).map(f=>f.id)).toEqual(['f-1'])
  const p=buildDeskPack(c,'owner')
  expect(p.players.map(x=>x.value.name)).toEqual(['Player 1'])
  expect(p.players[0]).toMatchObject({status:'approved',approvedBy:'owner',confidence:2,approvedAt:'2026-10-08',researchedAt:'2026-10-07'})
 })
 it('compiles: 13 approved players open the All-time XI as a short round, nothing else',()=>{
  const c=club(Array.from({length:13},(_,i)=>player(i+1,'approved')))
  const reg=REGISTRY.find(r=>r.id==='aek-athens')!
  const {data}=compilePack(buildDeskPack(c,'owner'),reg)
  expect(data.players).toHaveLength(13)
  expect(data.gates.xi.playable).toBe(true)
  expect(data.gates.xi.state).toBe('PARTIAL')
  expect(data.gates.trivia.playable).toBe(false)
 })
 it('ten players are not enough for the XI',()=>{
  const {data}=compilePack(buildDeskPack(club(Array.from({length:10},(_,i)=>player(i+1,'approved'))),'owner'),REGISTRY.find(r=>r.id==='aek-athens')!)
  expect(data.gates.xi.playable).toBe(false)
 })
 it('is stored, listed and loaded by the engine for a club with no repository pack',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'fanlife-desk-'));vi.stubEnv('FAN_LIFE_DATA_DIR',dir)
  try{
   expect(await loadClub('dinamo-zagreb')).toBeNull()
   await writeDeskPack(buildDeskPack(club(Array.from({length:13},(_,i)=>player(i+1,'approved')),[src('a')],'dinamo-zagreb'),'owner'))
   invalidateClub('dinamo-zagreb')
   expect((await readDeskPack('dinamo-zagreb'))?.players).toHaveLength(13)
   expect(await deskPackIds()).toEqual(['dinamo-zagreb'])
   expect(await engineClubIds()).toContain('dinamo-zagreb')
   const loaded=await loadClub('dinamo-zagreb')
   expect(gateAvailability(loaded!.data,'xi').playable).toBe(true)
  }finally{invalidateClub('dinamo-zagreb');await rm(dir,{recursive:true,force:true})}
 })
})
describe('package adapter',()=>{
 it('offers each staged player as a finding with a record, coaches stay in the report',async()=>{
  const r=await packageAdapter.collect({id:'j',clubId:'aek-athens',query:'',status:'running',attempts:1,createdAt:''})
  const players=r.findings.filter(f=>f.field==='player')
  expect(players.length).toBeGreaterThan(0)
  for(const f of players){expect(f.approved).toBe(false);expect(f.record?.kind).toBe('player');expect(f.sources.length).toBeGreaterThan(0)}
  expect(r.gaps?.some(g=>/coaches\/staff kept as report/.test(g))).toBe(true)
 })
})
