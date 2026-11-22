import {existsSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import {REGISTRY} from '@/lib/master/registry'
import {nextResearchTurn,researchDay} from '@/lib/research/daily-rotation'
import {blankWave,dailyFact,dailySource,kitRecords,KIT_PAGES,readBiography,wikiCategory,wikiTitle} from '@/lib/research/daily-evidence'
import {extendDailyWave,fromScoreFeed,publishedMatch} from '@/lib/research/daily-project'
import {compilePack} from '@/lib/clubs/compiler'
import {integrateDailyWave} from '@/lib/clubs/daily-wave'
import {kitViews,lineupMatches} from '@/lib/clubs/gate-content'
import {fromWikiSeason} from '@/lib/research/daily-wiki-season'
import {olderResultPage} from '../../scripts/ingest/clubs/league-lineups'

const day='2026-11-22',club=REGISTRY.find(c=>c.id==='atalanta')!,clubNames=[club.name,'Atalanta BC']
const names=Array.from({length:11},(_,i)=>'Player '+(i+1))
const source=dailySource('https://example.org/archive/match','Season match report','Example archive',day)
const v={name:'Atalanta 2–1 Inter Milan',on:'2024-11-08',home:'Atalanta',away:'Inter Milan',score:'2-1',competition:'Serie A',season:'2024/25',lineup:names,scorers:['First Scorer','Second Scorer']}
const input=(values:Parameters<typeof publishedMatch>[0])=>publishedMatch(values,day,source,clubNames)!
const base=()=>compilePack(blankWave(club.id),club)

describe('daily club rotation',()=>{
 it('includes every registered club, with a configured match feed and shared football sources',()=>{
  expect(REGISTRY.length).toBeGreaterThan(9)
  for(const c of REGISTRY){
   expect(wikiTitle(c.id)).toBeTruthy()
   expect(KIT_PAGES[c.id]).toBeTruthy()
   expect(['club-packs','research-staging'].some(p=>existsSync(`${p}/${c.id}/ingest.json`))).toBe(true)
  }
  let turn:ReturnType<typeof nextResearchTurn>|null=null
  const seen=[]
  for(let i=0;i<REGISTRY.length+1;i++){
   turn=nextResearchTurn(new Date(Date.UTC(2026,10,22+i)).toISOString().slice(0,10),turn)
   seen.push(turn.clubId)
   expect(nextResearchTurn(turn.day,turn)).toEqual(turn)
  }
  expect(seen.slice(0,-1)).toEqual(REGISTRY.map(c=>c.id))
  expect(seen.at(-1)).toBe(seen[0])
 })
 it('uses the Athens date around midnight and rechecks the next scheduled club on the next date',()=>{
  expect(researchDay(new Date('2026-11-21T22:15:00Z'))).toBe(day)
  expect(nextResearchTurn(day,{day:'2026-11-21',clubId:'a'},['a','b'])).toEqual({day,clubId:'b'})
 })
})
describe('evidence and live product integration',()=>{
 it('gets a first-team footballer from explicit stints and keeps unknown statistics unknown',()=>{
  const wiki=`{{Infobox football biography
| position = [[Forward (association football)|Forward]]
| clubs1 = [[Atalanta BC|Atalanta]]
| years1 = 2022–
| caps1 = 42
| goals1 =
| clubs2 = Atalanta U-19
| years2 = 2018–2022
}}`
  expect(readBiography('John Smith (footballer)',wiki,clubNames)).toEqual({name:'John Smith',aliases:['John Smith (footballer)'],positions:['FW'],fromYear:2022,toYear:null})
  expect(readBiography('John Smith',wiki.replace('[[Atalanta BC|Atalanta]]','Other club'),clubNames)).toBeNull()
 })
 it('reads members from the public category without following the site’s excluded index route',()=>{
  const url=new URL('https://en.wikipedia.org/wiki/Category:Atalanta_BC_players')
  const html='<div id="mw-pages"><a href="/w/index.php?title=Category:Atalanta_BC_players&amp;pagefrom=Other">next page</a><li><a href="/wiki/John_Smith">John Smith</a></li><footer id="catlinks"><a href="/wiki/Other">Other</a></footer></div>'
  expect(wikiCategory(html,url)).toEqual({members:['John Smith'],next:null})
 })
 it('holds impossible dates, foreign teams and incomplete elevens',()=>{
  expect(publishedMatch({...v,on:'2024-02-30'},day,source,clubNames)).toBeNull()
  expect(publishedMatch({...v,on:'2026-11-23'},day,source,clubNames)).toBeNull()
  expect(publishedMatch({...v,home:'Club Esportiu'},day,source,clubNames)).toBeNull()
  expect(input({...v,lineup:Array(11).fill('Same Player')}).fact.value.lineup).toBeUndefined()
  expect(input(v).fact.value.scorers).toHaveLength(2)
 })
 it('reads a dated senior season box, attributes only the club’s named goals and keeps kit documentation',()=>{
  const wiki=`{{Infobox football club season
| club = Atalanta
| season = [[2025–26 in Italian football|2025–26]]
| league = [[Serie A]]
| pattern_b1 = _atalanta2526h
| shorts1 = 000000
}}
=== First-team squad ===
{{Fs player|no=9|nat=ITA|pos=FW|name=[[Gianluca Scamacca]]}}
=== Reserve team ===
{{Fs player|no=2|nat=ITA|pos=DF|name=[[Academy Player]]}}
=== Serie A ===
==== League matches ====
{{Football box collapsible
|date = 24 August 2025
|team1 = Atalanta
|score = 1–1
|team2 = [[Pisa SC|Pisa]]
|goals1 =
*[[Gianluca Scamacca|Scamacca]] {{goal|50}}
|goals2 =
*[[Isak Hien|Hien]] {{goal|26|o.g.}}
}}`
  const facts=fromWikiSeason(wiki,'2025/26',clubNames,source)
  expect(facts.map(f=>f.section)).toEqual(['seasons','players','kits','matches'])
  expect(facts[1]?.fact.value).toMatchObject({name:'Gianluca Scamacca',positions:['FW']})
  expect(facts[2]?.fact.value).toMatchObject({season:'2025/26',type:'HOME',wikiKit:{pattern:'_atalanta2526h'}})
  expect(facts[3]?.fact.value).toMatchObject({on:'2025-08-24',competition:'Serie A',scorers:[{name:'Gianluca Scamacca',minute:'50'}]})
  expect(fromWikiSeason(wiki,'2024/25',clubNames,source)).toEqual([])
 })
 it('compiles matches, elevens, scorers, seasons, kits and player records through the club data used by the features',()=>{
  const kit=kitRecords('<h1>Atalanta BC Kit History</h1><a href="/atalanta-bc-2024-25-home-kit/2000/">Atalanta BC 2024-25 Home Kit</a>','atalanta-bc',clubNames,day)[0]!
  const players=['Named Player','Reserve One','Reserve Two'].map(name=>({section:'players' as const,source,
   fact:dailyFact('player',name,{name,aliases:[],positions:['DF'],fromYear:2024,toYear:2025},source)}))
  const additions=[input(v),{section:'kits' as const,...kit},...players]
  const draft=extendDailyWave(blankWave(club.id),additions)
  const result=integrateDailyWave(base(),club,draft.wave)
  expect(result.diagnostics).toEqual([])
  expect(lineupMatches(result.data)[0]?.starters).toEqual(names)
  expect(kitViews(result.data)[0]?.season).toBe('2024/25')
  expect(result.data.matches?.[0]?.value).toMatchObject({scorers:[{name:'First Scorer'},{name:'Second Scorer'}]})
  expect(result.data.seasons?.[0]?.value).toMatchObject({season:'2024/25'})
  expect(result.data.players?.[0]?.value).toMatchObject({name:'Named Player',positions:['DF']})
  expect(result.data.timeline).toHaveLength(1)
  expect(result.data.archive).toHaveLength(1)
  expect(result.data.trivia.questions).toHaveLength(1)
  expect(extendDailyWave(draft.wave,additions).wave).toEqual(draft.wave)
 })
 it('does not overwrite the established match, eleven or identity when new research disagrees',()=>{
  const first=extendDailyWave(blankWave(club.id),[input(v)]).wave
  const corrected=input({...v,score:'3-1'})
  const changed=extendDailyWave(first,[corrected])
  expect(changed.held).toEqual([v.on])
  expect(changed.wave).toEqual(first)
  const original=integrateDailyWave(base(),club,first)
  const result=integrateDailyWave(original,club,extendDailyWave(blankWave(club.id),[corrected]).wave)
  expect(result.diagnostics.map(d=>d.code)).toContain('DAILY_MATCH_CONFLICT')
  expect(result.data.matches).toEqual(original.data.matches)
  expect(result.data.timeline).toEqual(original.data.timeline)
 })
 it('uses only approved checked score feeds and does not follow unrelated archive URLs',()=>{
  const row={id:'source',url:'https://example.org/events/1',publisher:'Archive',access:'available',checkedAt:day}
  const fact={value:v,status:'approved',sources:['source'],parserCertainty:'high',conflictFree:true}
  expect(fromScoreFeed({sources:[row],matches:[fact]},day,clubNames)).toHaveLength(1)
  expect(fromScoreFeed({sources:[row],matches:[{...fact,status:'review'}]},day,clubNames)).toEqual([])
  expect(fromScoreFeed({sources:[{...row,access:'blocked'}],matches:[fact]},day,clubNames)).toEqual([])
  expect(olderResultPage('/web/games/results/?start=20')).toBe('https://webws.365scores.com/web/games/results/?start=20')
  expect(olderResultPage('//unrelated.example/web/games/results/')).toBeNull()
 })
})
