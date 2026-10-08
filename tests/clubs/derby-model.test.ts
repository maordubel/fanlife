import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import {answerOf,canPlay,dealRound,decadeGroups,goalsOf,MIN_ROUND,recordOf,resultOf,roundQuery,scoreStep,shareText,summarise,tallyOf,wallOf,type MeetingLike,type WallMeeting} from '@/lib/clubs/derby-model'

const m=(on:string|null,year:number|null,home:string,away:string,hg:number,ag:number,us:'home'|'away'|null):MeetingLike=>({on,year,home,away,homeGoals:hg,awayGoals:ag,competition:'League',from:['archive'],us})

/** twelve invented fixtures between two invented clubs — the tests hold the rules, never a real rivalry */
const FIXTURES:MeetingLike[]=[
 m('1994-03-01',1994,'Reds','Blues',2,0,'home'),m('1995-04-02',1995,'Blues','Reds',1,1,'away'),m('1996-05-03',1996,'Reds','Blues',0,3,'home'),
 m('2001-02-04',2001,'Blues','Reds',0,4,'away'),m('2002-09-05',2002,'Reds','Blues',1,2,'home'),m('2003-10-06',2003,'Blues','Reds',2,2,'away'),
 m('2010-11-07',2010,'Reds','Blues',5,1,'home'),m('2011-12-08',2011,'Blues','Reds',3,0,'away'),m(null,1999,'Reds','Blues',1,0,'home'),
 m('2015-01-09',2015,'Blues','Reds',1,0,null),m(null,null,'Reds','Blues',2,2,'home'),m('2020-02-10',2020,'Reds','Blues',2,1,'home'),
]
const wall=wallOf(FIXTURES)
const byId=new Map(wall.map(x=>[x.id,x]))

describe('derby model · the wall',()=>{
 it('gives every meeting a stable, unique id that does not depend on list order',()=>{
  expect(new Set(wall.map(x=>x.id)).size).toBe(wall.length)
  const reversed=wallOf([...FIXTURES].reverse())
  expect(new Set(reversed.map(x=>x.id))).toEqual(new Set(wall.map(x=>x.id)))
 })
 it('keeps two meetings that look alike apart',()=>{
  const twin=wallOf([m('2000-01-01',2000,'A','B',1,1,'home'),m('2000-01-01',2000,'A','B',1,1,'home')])
  expect(new Set(twin.map(x=>x.id)).size).toBe(2)
 })
 it('reads the result from the club side only when the record states it',()=>{
  expect(goalsOf(wall.find(x=>x.on==='2001-02-04')!)).toEqual([4,0])
  expect(resultOf(wall.find(x=>x.on==='2001-02-04')!)).toBe('W')
  const unstated=wall.find(x=>x.us===null)!
  expect(goalsOf(unstated)).toBeNull()
  expect(resultOf(unstated)).toBeNull()
 })
 it('never counts a meeting whose side is unstated',()=>{
  const t=tallyOf(wall)
  expect(t.played).toBe(FIXTURES.filter(f=>f.us!==null).length)
  expect(t.won+t.drawn+t.lost).toBe(t.played)
 })
 it('groups by decade newest first and puts undated meetings last, never ordered',()=>{
  const g=decadeGroups(wall)
  const decades=g.map(x=>x.decade)
  expect(decades[decades.length-1]).toBeNull()
  const dated=decades.filter((d):d is number=>d!==null)
  expect([...dated].sort((a,b)=>b-a)).toEqual(dated)
  expect(g.reduce((n,x)=>n+x.items.length,0)).toBe(wall.length)
 })
})

describe('derby model · the record',()=>{
 const rec=recordOf(wall)
 it('reports honesty counters instead of hiding the gaps',()=>{
  expect(rec.unstated).toBe(1)
  expect(rec.undated).toBe(1)
 })
 it('finds the biggest win and the heaviest defeat from the club side',()=>{
  expect(goalsOf(rec.best!)).toEqual([5,1])
  expect(goalsOf(rec.worst!)).toEqual([0,3])
 })
 it('names the first and last documented meeting by date, ignoring the undated',()=>{
  expect(rec.first!.on).toBe('1994-03-01')
  expect(rec.last!.on).toBe('2020-02-10')
 })
 it('builds decade rows from stated, dated meetings only',()=>{
  const total=rec.decades.reduce((n,r)=>n+r.w+r.d+r.l,0)
  expect(total).toBe(rec.tally.played-rec.undated)
  expect([...rec.decades].map(r=>r.decade)).toEqual([...rec.decades].map(r=>r.decade).sort((a,b)=>a-b))
 })
 it('has no best or worst for a rivalry with no wins or no defeats',()=>{
  const draws=recordOf(wallOf([m('2000-01-01',2000,'A','B',1,1,'home'),m('2001-01-01',2001,'B','A',0,0,'away')]))
  expect(draws.best).toBeNull()
  expect(draws.worst).toBeNull()
 })
})

describe('derby model · the round',()=>{
 it('deals the same round for the same link, and a different one for the next',()=>{
  expect(dealRound(wall,7,0)).toEqual(dealRound(wall,7,0))
  expect(dealRound(wall,7,0)).not.toEqual(dealRound(wall,7,1))
  expect(dealRound(wall,7,0)).not.toEqual(dealRound(wall,8,0))
 })
 it('only asks about meetings whose side the archive states',()=>{
  for(const seed of [1,2,3,4,5,6,7,8,9,10]){
   for(const q of dealRound(wall,seed,0)){
    const ids=q.kind==='result'?[q.meeting]:[q.a,q.b]
    for(const id of ids)expect(byId.get(id)).toBeDefined()
    if(q.kind==='result')expect(byId.get(q.meeting)!.us).not.toBeNull()
   }
  }
 })
 it('uses a meeting once per round and never pads past what exists',()=>{
  for(const seed of [1,2,3,4,5,6]){
   const qs=dealRound(wall,seed,0),seen=new Set<string>()
   for(const q of qs){for(const id of (q.kind==='result'?[q.meeting]:[q.a,q.b])){expect(seen.has(id)).toBe(false);seen.add(id)}}
  }
  const few=wall.filter(x=>x.us!==null).slice(0,MIN_ROUND)
  expect(dealRound(few,1,0).length).toBe(MIN_ROUND)
 })
 it('refuses to deal a round from too few stated meetings',()=>{
  const few=wall.filter(x=>x.us!==null).slice(0,MIN_ROUND-1)
  expect(canPlay(few)).toBe(false)
  expect(dealRound(few,1,0)).toEqual([])
  expect(canPlay(wall)).toBe(true)
  expect(dealRound([],1,0)).toEqual([])
 })
 it('only asks "which came first" about meetings that can actually be ordered',()=>{
  for(let seed=1;seed<=40;seed++){
   for(const q of dealRound(wall,seed,0)){
    if(q.kind!=='earlier')continue
    const a=byId.get(q.a)!,b=byId.get(q.b)!
    const right=answerOf(q,byId)
    expect(right).not.toBeNull()
    const first=(a.on??String(a.year))<(b.on??String(b.year))?a:b
    expect(right).toBe(first.id)
   }
  }
 })
 it('grades a result question from the record',()=>{
  const q=dealRound(wall,3,0).find(x=>x.kind==='result')!
  expect(['W','D','L']).toContain(answerOf(q,byId))
 })
})

describe('derby model · scoring and sharing',()=>{
 it('scores a streak and resets it on a miss',()=>{
  expect(scoreStep(true,0).points).toBe(100)
  expect(scoreStep(true,2).points).toBe(150)
  expect(scoreStep(true,9).points).toBe(200)
  expect(scoreStep(false,3).points).toBe(0)
 })
 it('summarises a trail with the best streak',()=>{
  const s=summarise([true,true,false,true,true,true])
  expect(s).toMatchObject({correct:5,total:6,bestStreak:3})
  expect(s.score).toBe(100+125+0+100+125+150)
 })
 it('shares the verdict and the link, never a scoreline',()=>{
  const text=shareText({club:'Reds',rival:'Blues',summary:summarise([true,false,true]),url:'https://x.test/c/derby?seed=1&r=0',title:'Derby slip'})
  expect(text).toContain('■□■')
  expect(text).toContain('2/3')
  expect(text).toContain('seed=1&r=0')
  expect(text).not.toMatch(/\d[–-]\d/)
  expect(roundQuery(7,2)).toBe('seed=7&r=2')
 })
})

describe('derby model · template, not a club',()=>{
 it('names no club, rival or rule of its own',()=>{
  const src=readFileSync('lib/clubs/derby-model.ts','utf8')
  expect(src).not.toMatch(/hapoel|maccabi|olympiacos|panathin/i)
  expect(src).not.toMatch(/import [^\n]*server-only/)
 })
 it('is typed against plain meetings so a new club needs no new code',()=>{
  const x:WallMeeting=wall[0]!
  expect(Object.keys(x).sort()).toEqual(['ag','away','comp','from','hg','home','id','on','so','us','year'])
 })
})
