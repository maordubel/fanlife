import {describe,expect,it,vi} from 'vitest'
import {parseTeam,parseEvents,chooseNext} from '@/lib/fixtures/provider'
import {rotationOrder} from '@/lib/fixtures/rotation'
import {sameClub,norm} from '@/lib/fixtures/names'
import {FIXTURE_TEAMS} from '@/lib/fixtures/teams'
import {REGISTRY} from '@/lib/master/registry'
import {livery} from '@/lib/club-livery'
import type {Fixture} from '@/lib/fixtures/types'

// Shapes follow TheSportsDB's documented v1 JSON. They are labelled fixtures — NOT recorded provider answers.
const team=FIXTURE_TEAMS.find(t=>t.clubId==='olympiacos')!
const ev=(o:Record<string,string>)=>({idEvent:'1',strSport:'Soccer',strHomeTeam:'Olympiacos',strAwayTeam:'Aston Villa',idHomeTeam:'T1',idAwayTeam:'T2',dateEvent:'2026-10-22',strTime:'19:45:00',strLeague:'UEFA Europa League',strStatus:'Not Started',...o})
const now=new Date('2026-10-06T10:00:00Z')

describe('fixture provider adapter',()=>{
 it('every team is a registry club',()=>{for(const t of FIXTURE_TEAMS)expect(REGISTRY.some(c=>c.id===t.clubId)).toBe(true)})
 it('identifies a team only when exactly one football team matches by name and country',()=>{
  const t=(o:Record<string,string>)=>({strSport:'Soccer',idTeam:'T1',strTeam:'Olympiacos',strCountry:'Greece',...o})
  expect(parseTeam({teams:[t({})]},team)?.teamId).toBe('T1')
  expect(parseTeam({teams:[t({}),t({idTeam:'T9'})]},team)).toBeNull()
  expect(parseTeam({teams:[t({strCountry:'Cyprus'})]},team)).toBeNull()
  expect(parseTeam({teams:[t({strSport:'Basketball'})]},team)).toBeNull()
  expect(parseTeam({teams:null},team)).toBeNull()
 })
 it('reads provider times as UTC and says when there is no time',()=>{
  const [a,b]=parseEvents({events:[ev({}),ev({idEvent:'2',strTime:'00:00:00'})]})
  expect(a!.kickoff).toBe('2026-10-22T19:45:00.000Z');expect(a!.dateOnly).toBe(false);expect(b!.dateOnly).toBe(true)
  expect(parseEvents({events:[ev({dateEvent:'soon'})]})).toEqual([])
 })
 it('picks the earliest unfinished match involving the team, from either side',()=>{
  const events=parseEvents({events:[ev({idEvent:'3',dateEvent:'2026-11-05'}),ev({idEvent:'2',dateEvent:'2026-10-15',strHomeTeam:'Aston Villa',strAwayTeam:'Olympiacos',idHomeTeam:'T2',idAwayTeam:'T1'}),ev({idEvent:'1',dateEvent:'2026-10-01',strStatus:'Match Finished'})]})
  const f=chooseNext('olympiacos','T1',events,now)!
  expect(f.providerEventId).toBe('2');expect(f.clubSide).toBe('away');expect(f.opponent).toBe('Aston Villa')
  expect(chooseNext('olympiacos','T7',events,now)).toBeNull()
 })
})

describe('rotation',()=>{
 const fx=(clubId:string,kickoff:string,dateOnly=false):Fixture=>({clubId,kickoff,dateOnly,home:'A',away:'B',clubSide:'home',opponent:'B',competition:null,round:null,venue:null,status:'scheduled',providerEventId:clubId})
 it('puts live, then today, then soon, then later; ties by club id; skips unreadable',()=>{
  const out=rotationOrder([fx('d','2026-12-01T18:00:00Z'),fx('c','2026-10-08T08:00:00Z'),fx('b','2026-10-06T09:00:00Z'),fx('a','2026-10-06T20:00:00Z'),fx('x','nope')],now)
  expect(out.map(f=>f.clubId)).toEqual(['b','a','c','d'])
  expect(out.map(f=>f.phase)).toEqual(['live','today','soon','later'])
 })
 it('a club with no fixture is simply absent',()=>{expect(rotationOrder([],now)).toEqual([])})
})

describe('names and liveries',()=>{
 it('legal-form tokens never decide identity, "Hapoel" and "Maccabi" do',()=>{
  expect(sameClub('HŠK Zrinjski Mostar','Zrinjski Mostar')).toBe(true)
  expect(sameClub('Hapoel Tel Aviv','Maccabi Tel Aviv')).toBe(false)
  expect(norm('Tel-Aviv')).toBe('tel aviv')
 })
 it('every registry club has one fixed livery',()=>{
  for(const c of REGISTRY){const l=livery(c.id);expect(l?.primary).toMatch(/^#[0-9a-f]{6}$/i)}
  expect(livery('olympiacos')!.pattern).toBe('stripes');expect(livery('zrinjski-mostar')!.pattern).toBe('sash')
 })
})

describe('meetings archive',()=>{
 vi.mock('server-only',()=>({}))
 it('only lists readable scorelines between the two named clubs',async()=>{
  const {meetingsBetween}=await import('@/lib/fixtures/meetings')
  const rows=await meetingsBetween('hapoel-tel-aviv','Nonexistent Opponent FC')
  expect(rows).toEqual([])
  const own=await meetingsBetween('olympiacos','Zrinjski Mostar')
  for(const m of own){expect(m.homeGoals).toBeGreaterThanOrEqual(0);expect(m.from.length).toBeGreaterThan(0)}
 })
})
