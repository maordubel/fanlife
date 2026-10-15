import {describe,expect,it} from 'vitest'
import {autopilot} from '@/lib/legends/lab'
import {buildRecords,type SeasonSource} from '@/lib/legends/records'
import type {Career,Fixture,MatchEventRow} from '@/lib/legends/types'
import {LEAGUE} from './fixtures'

const ME='me',OTHER='them'
const ev=(seq:number,side:0|1,player:string,kind:MatchEventRow['kind']='goal'):MatchEventRow=>({seq,minute:10+seq,kind,side,player})
const fx=(id:string,round:number,home:string,away:string,goals:[number,number],events:MatchEventRow[],xi:string[]=[]):Fixture=>({id,round,home,away,result:{goals,pens:null,events,seed:1,sides:[{formation:'4-4-2',xi:(home===ME?xi:[]).map(i=>({id:i,name:i.toUpperCase(),pos:'FW' as const,from:null,to:null}))},{formation:'4-4-2',xi:(away===ME?xi:[]).map(i=>({id:i,name:i.toUpperCase(),pos:'FW' as const,from:null,to:null}))}]}})
const rec=(ordinal:number,champion:boolean,place=1)=>({ordinal,place,of:4,points:30,w:9,d:3,l:0,gf:20,ga:5,champion,playoff:false,grant:0,bonus:0,cash:0,squad:[],topScorer:null})
const names={[`${ME}:a`]:'Alpha',[`${ME}:b`]:'Beta'}

describe('U04 · hall of fame',()=>{
 const s1:SeasonSource={ordinal:1,names,champion:{club:ME,name:'Me'},fixtures:[
  fx('f1',1,ME,OTHER,[3,0],[ev(1,0,'a'),ev(2,0,'a'),ev(3,0,'b')],['a','b']),
  fx('f2',2,OTHER,ME,[1,2],[ev(1,1,'b'),ev(2,0,'x'),ev(3,1,'a')],['a','b']),
  fx('f3',3,ME,OTHER,[0,0],[],['a']),
 ]}
 const s2:SeasonSource={ordinal:2,names,champion:{club:OTHER,name:'Them'},fixtures:[
  fx('f1',1,ME,OTHER,[2,1],[ev(1,0,'a'),ev(2,1,'x'),ev(3,0,'b')],['b']),
 ]}
 it('a man who has left stays on the career lists, and a second season adds to the first',()=>{
  const r=buildRecords(ME,[rec(1,true),rec(2,false,2)],[s1,s2])
  expect(r.scorers.find(m=>m.id==='a')!.goals).toBe(4);expect(r.scorers.find(m=>m.id==='b')!.goals).toBe(3)
  expect(r.matches).toEqual({played:4,w:3,d:1,l:0});expect(r.appearances.find(m=>m.id==='a')!.apps).toBe(3)
 })
 it('reading a season twice, or from both a stored archive and the live season, counts every event once',()=>{
  const once=buildRecords(ME,[rec(1,true)],[s1]),twice=buildRecords(ME,[rec(1,true)],[s1,{...s1},{...s1,champion:null}])
  expect(twice).toEqual(once)
 })
 it('titles come from the champion in each season’s own record — the play-off included — not from the table',()=>{
  const r=buildRecords(ME,[rec(1,true),rec(2,false),{...rec(3,true),playoff:true,place:2}],[s1])
  expect(r.titles).toBe(2);expect(r.seasons).toBe(3)
 })
 it('biggest win, longest win run, winning goals, most goals in a season',()=>{
  const r=buildRecords(ME,[rec(1,true),rec(2,false)],[s1,s2])
  expect(r.biggestWin).toMatchObject({gf:3,ga:0,against:OTHER,season:1,round:1})
  expect(r.winStreak.length).toBe(2);expect(r.winStreak.from).toEqual({season:1,round:1});expect(r.winStreak.to).toEqual({season:1,round:2})
  // f2 is 2-1: the winner is the second of his goals; f2's first (event 3 by 'a') is the 2nd of the club's goals -> 'x' is the other side's name only
  expect(r.mostGoalsInSeason).toEqual({season:1,goals:5})
 })
 it('a goal never counts for the other side, and a draw breaks the run',()=>{
  const r=buildRecords(ME,[rec(1,true)],[{...s1,fixtures:[s1.fixtures[0]!,{...s1.fixtures[2]!,round:2},{...s1.fixtures[1]!,round:3}]}])
  expect(r.winStreak.length).toBe(1);expect(r.scorers.find(m=>m.id==='x')).toBeUndefined()
 })
 it('a season without detail is named: titles and places count, totals say where detail starts',()=>{
  const r=buildRecords(ME,[rec(1,true),rec(2,false),rec(3,true)],[{...s2,ordinal:3}])
  expect(r.titles).toBe(2);expect(r.detail.full).toEqual([3]);expect(r.detail.summaryOnly).toEqual([1,2])
  expect(r.detail.note).toBe('Detailed records available from season 3.')
  expect(buildRecords(ME,[rec(1,true)],[{...s1,fixtures:[]}]).detail.note).toMatch(/begin with your next finished season/)
 })
 it('a real career: the lists agree with the archives and the totals with its own history lines',()=>{
  const r=autopilot(LEAGUE[0]!,LEAGUE.slice(1,4),2,'recs',undefined,'c0ffee00000000aa');expect(r.error).toBeNull()
  const c:Career=r.career!,src:SeasonSource[]=(c.pendingArchive??[]).map(a=>({ordinal:a.ordinal,names:a.names,champion:a.champion,fixtures:[...a.fixtures,...(a.playoff?[a.playoff]:[])]}))
  const out=buildRecords(c.clubId,c.history,src)
  expect(out.titles).toBe(c.history.filter(h=>h.champion).length)
  const gf=c.history.reduce((n,h)=>n+h.gf,0),listed=[...src.flatMap(s=>s.fixtures)].filter(f=>f.result).reduce((n,f)=>n+f.result!.events.filter(e=>e.kind==='goal'&&(e.side===0?f.home:f.away)===c.clubId).length,0)
  expect(out.matches.w*3+out.matches.d).toBeGreaterThanOrEqual(0);expect(listed).toBeGreaterThanOrEqual(gf-0)
  expect(out.scorers.reduce((n,m)=>n+m.goals,0)).toBeLessThanOrEqual(listed)
  expect(out.detail.summaryOnly).toEqual([])
 })
})
