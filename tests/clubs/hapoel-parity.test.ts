import {describe,it,expect,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {loadClub} from '@/lib/clubs/resolver'
import {SHARED_GATES,gateAvailability} from '@/lib/clubs/gates'
import {lineupMatches,lineupPool,buildableKits,kitViews,rivalsOf} from '@/lib/clubs/gate-content'
import {clubGoals,goalDeal,goalPool,judgeGoal,cleanTouches} from '@/lib/clubs/goal'
import {meetingsBetween,tallyOf} from '@/lib/fixtures/meetings'
import {playableLineups} from '@/lib/game/lineup'
import {eligibleGoalRecords} from '@/lib/game/goal'

/** Hapoel Tel Aviv is the model club: every gate The Worker plays must open in the hub from the same masters. */
describe('Hapoel Tel Aviv — Worker parity in the hub',()=>{
 it('opens all thirteen shared gates READY',async()=>{
  const d=(await loadClub('hapoel-tel-aviv'))!.data
  for(const g of SHARED_GATES)expect(gateAvailability(d,g.key).state,g.key).toBe('READY')
 })
 it('deals exactly the native playable line-ups, with the source\'s own decoys first',async()=>{
  const d=(await loadClub('hapoel-tel-aviv'))!.data,ms=lineupMatches(d)
  expect(ms.length).toBe(playableLineups().length)
  for(const m of ms){expect(new Set(m.starters).size).toBe(11);const pool=lineupPool(d,m);for(const s of m.starters)expect(pool).toContain(s);for(const x of m.decoys.slice(0,3))expect(pool).toContain(x)}
 })
 it('carries the Kit Master kits with sourced maker and design, never a guessed colour',async()=>{
  const d=(await loadClub('hapoel-tel-aviv'))!.data
  expect(kitViews(d).length).toBeGreaterThanOrEqual(30)
  for(const k of buildableKits(d)){expect(k.maker).toBeTruthy();expect(k.design).toBeTruthy();for(const c of k.colours)expect(['red','cream','black','grey']).toContain(c)}
 })
 it('rival is Maccabi Tel Aviv only (Worker rule 13) and the wall reads the full match archive',async()=>{
  const d=(await loadClub('hapoel-tel-aviv'))!.data,r=rivalsOf(d)
  expect(r.map(x=>x.value.name)).toEqual(['Maccabi Tel Aviv'])
  const ms=await meetingsBetween('hapoel-tel-aviv','Maccabi Tel Aviv',['מכבי תל אביב']),t=tallyOf(ms)
  expect(ms.length).toBeGreaterThan(150)
  expect(t.won+t.drawn+t.lost).toBe(t.played)
  for(const m of ms)expect(m.home.includes('מכבי תל אביב')||m.away.includes('מכבי תל אביב')).toBe(true)
 })
 it('goal gate deals every eligible native goal, hides the answer, and grades in the reporter\'s terms',async()=>{
  const d=(await loadClub('hapoel-tel-aviv'))!.data,goals=clubGoals(d)
  expect(goals.length).toBe(eligibleGoalRecords().length)
  const deal=goalDeal(d,7)
  for(const x of deal){expect(Object.keys(x).sort()).toEqual(['competition','id','on','opponent','pool','score','subtitle','title']);expect(x.pool).toEqual([...x.pool].sort((a,b)=>a.localeCompare(b)))}
  const g=goals[0]!,pool=goalPool(d,g,7)
  for(const s of g.steps)if(s.actor)expect(pool).toContain(s.actor)
  const perfect=judgeGoal(g,g.steps.map(s=>({actor:s.actor||'',action:s.action,zone:s.zone})))
  expect(perfect.points).toBe(perfect.max)
  expect(cleanTouches([{actor:'Not In Pool',action:'shot',zone:'C1'}],pool)).toBeNull()
  expect(cleanTouches([{actor:'',action:'teleport',zone:'C1'}],pool)).toBeNull()
  expect(cleanTouches([{actor:'',action:'shot',zone:'Z9'}],pool)).toBeNull()
 })
})
