import {describe,it,expect} from 'vitest'
import {parseMatch,parseLineups,teamsIn,matchesUrl,lineupUrl} from '@/scripts/ingest/clubs/uefa'
import {corroborates} from '@/scripts/ingest/clubs/corroborate'
import {toWaveFact,buildWave} from '@/scripts/ingest/clubs/wave'
// Shapes copied from live match.uefa.com/v5 responses (2026-10-06).
const raw={id:'2036196',homeTeam:{id:'50057',internationalName:'Olympiacos',countryCode:'GRE'},awayTeam:{id:'1',internationalName:'Other FC',countryCode:'ENG'},competition:{id:'14',metaData:{name:'UEFA Europa League'}},kickOffTime:{date:'2024-02-15',dateTime:'2024-02-15T19:00:00Z'},score:{regular:{home:2,away:1},total:{home:2,away:1}},stadium:{name:'Karaiskakis'},playerEvents:{scorers:[{goalType:'SCORED',player:{internationalName:'A Scorer'},teamId:'50057',time:{minute:10,second:3}},{goalType:'OWN_GOAL',player:{internationalName:'B Own'},teamId:'1',time:{minute:50}},{goalType:'SCORED',player:{internationalName:'C Visitor'},teamId:'1',time:{minute:70}}]}}
const side=(n:number,p:string)=>({field:Array.from({length:n},(_,i)=>({player:{internationalName:`${p}${i}`}})),bench:[{player:{internationalName:`${p}-bench`}}]})
describe('UEFA adapter',()=>{
 it('parses a finished match; unreadable ones are dropped',()=>{
  const m=parseMatch(raw)!;expect(m.score).toEqual({home:2,away:1});expect(m.goals).toHaveLength(3);expect(m.venue).toBe('Karaiskakis');expect(m.competition).toBe('UEFA Europa League')
  expect(parseMatch({...raw,kickOffTime:{}})).toBeNull();expect(parseMatch({})).toBeNull()
  expect(matchesUrl(5)).toContain('teamId=5');expect(lineupUrl('7')).toContain('/matches/7/lineups')
 })
 it('lineups need exactly eleven distinct starters per side',()=>{
  expect(parseLineups({homeTeam:side(11,'h'),awayTeam:side(11,'a')})!.home).toHaveLength(11)
  expect(parseLineups({homeTeam:side(10,'h'),awayTeam:side(11,'a')})).toBeNull()
  expect(parseLineups({})).toBeNull()
 })
 it('discovers teams by id for exact-name matching',()=>{expect(teamsIn([raw])).toEqual([{id:'50057',name:'Olympiacos',country:'GRE'},{id:'1',name:'Other FC',country:'ENG'}])})
})
describe('wave building',()=>{
 const m={...parseMatch(raw)!,lineup:parseLineups({homeTeam:side(11,'h'),awayTeam:side(11,'a')})}
 const second=corroborates({events:[{idEvent:'9',strHomeTeam:'Olympiacos FC',strAwayTeam:'Other',intHomeScore:'2',intAwayScore:'1'}]},m)
 it('second publisher needs both teams and the score to agree',()=>{
  expect(second?.publisher).toBe('TheSportsDB')
  expect(corroborates({events:[{idEvent:'9',strHomeTeam:'Olympiacos',strAwayTeam:'Other FC',intHomeScore:'3',intAwayScore:'1'}]},m)).toBeNull()
 })
 it('two publishers approve; one publisher stays in review; club side is never guessed',()=>{
  const ok=toWaveFact(m,['Olympiacos'],{publisher:'TheSportsDB',title:'t',url:'https://www.thesportsdb.com/event/9'},'2026-10-06','olympiacos')!
  expect(ok.fact.status).toBe('approved');expect('lineup' in ok.fact.value).toBe(false);expect('scorers' in ok.fact.value).toBe(false);expect(ok.fact.value.primaryOnly.lineup).toHaveLength(11);expect(ok.fact.value.primaryOnly.scorers).toEqual([{name:'A Scorer',minute:10}]);expect(ok.fact.approvedBy).toMatch(/^automated:/)
  const one=toWaveFact(m,['Olympiacos'],null,'2026-10-06','olympiacos')!;expect(one.fact.status).toBe('review');expect(one.fact.confidence).toBe(2)
  expect(toWaveFact(m,['Somebody Else'],null,'2026-10-06','x')).toBeNull()
  expect(buildWave([{m,second:null}],['Olympiacos'],'olympiacos','2026-10-06').matches).toHaveLength(1)
 })
})
