import {describe,expect,it} from 'vitest'
import {CORE_CLUB_IDS,loadClub} from '@/lib/clubs/resolver'
import {clubTimeline} from '@/lib/clubs/timeline'
import {FULL_PLACEMENTS,chronologyPool,chronologyShape,dateLeaks,payloadLeaks,roundScore,runKey} from '@/lib/clubs/chronology'
import {createTimelineEngine} from '@/lib/game/timeline-engine'
import {secondsFor} from '@/lib/game/timeline-run'

const card=(n:number,on:string)=>({id:`c${n}`,title:`Event ${n}`,hint:'',on})
const fact=(n:number,on:string,extra:Record<string,unknown>={})=>({id:`f${n}`,value:card(n,on),status:'approved',confidence:3,...extra})
const pool=(n:number)=>chronologyPool(Array.from({length:n},(_,i)=>fact(i,`20${String(10+i).padStart(2,'0')}-05-0${1+(i%9)}`)))

describe('TI-R01 pool',()=>{
 it('keeps approved, conflict-free exact dates, one card per date and one per id',()=>{
  const p=chronologyPool([fact(1,'2010-01-01'),fact(2,'2010-01-01'),fact(3,'2011-02-30'),fact(4,'2012-01-01',{status:'draft'}),fact(5,'2013-01-01',{confidence:1}),fact(6,'2014'),fact(7,'2015-03-03'),{...fact(8,'2016-03-03'),value:{...card(7,'2016-03-03')}},{...fact(9,'2017-03-03'),value:{...card(9,'2017-03-03'),title:'event 7'}}])
  expect(p.map(c=>c.id)).toEqual(['c1','c7','c9'])
 })
})

describe('TI-R02 run shape',()=>{
 it('3 records are an anchor and 2 placements, 11 are a full run',()=>{
  expect(chronologyShape(3)).toMatchObject({placements:2,category:'short',blocker:null,datesShort:8})
  expect(chronologyShape(11)).toMatchObject({placements:10,category:'full',datesShort:0})
  expect(chronologyShape(40)).toMatchObject({placements:FULL_PLACEMENTS,category:'full'})
  expect(chronologyShape(2)).toMatchObject({placements:1,category:'locked',blocker:'TIMELINE_EXACT_DATES_SHORT'})
  expect(chronologyShape(0).placements).toBe(0)
 })
 it('the engine deals 2 placements for 3 records, not 10',()=>{
  const g=createTimelineEngine(pool(3))
  expect(g.available).toBe(true)
  const deal=g.dealTimelineRun(7,0)
  expect(deal.queue.length).toBe(2)
  expect(g.gradeInsert(7,2,0,0)).toBeNull()
  expect(g.gradeInsert(7,1,0,0)).not.toBeNull()
 })
 it('the run key carries the category so a short score is never compared with a full one',()=>{
  expect(runKey('v1',3,0,chronologyShape(3))).not.toBe(runKey('v1',3,0,chronologyShape(11)))
  expect(runKey('v1',3,0,chronologyShape(11))).toContain('full10')
 })
})

describe('TI-R03/R04 insert authority and a truthful board',()=>{
 const g=createTimelineEngine(pool(11))
 const seed=11
 it('a wrong insert still lands in its true place and the board stays sorted',()=>{
  const deal=g.dealTimelineRun(seed,0)
  for(let placed=0;placed<deal.queue.length;placed+=1){
   const board=g.boardAfter(seed,placed,0)
   for(let slot=-1;slot<=placed+1;slot+=1){
    const v=g.gradeInsert(seed,placed,slot,0)!
    expect(v).not.toBeNull()
    const dates=v.board.map(c=>c.on)
    expect(dates).toEqual([...dates].sort())
    expect(v.board.length).toBe(board.length+1)
    expect(v.board[v.position]?.id).toBe(v.card.id)
    expect(v.correct).toBe(slot===v.position)
   }
  }
 })
 it('the timeout sentinel is a miss, never an invented position',()=>{
  const v=g.gradeInsert(seed,0,-1,0)!
  expect(v.correct).toBe(false)
  expect(v.board.map(c=>c.on)).toEqual([...v.board.map(c=>c.on)].sort())
 })
 it('invalid slots, indexes, seeds and cursors are rejected',()=>{
  for(const bad of [[seed,0,-2,0],[seed,0,3,0],[seed,10,0,0],[seed,-1,0,0],[seed,0.5,0,0],[0,0,0,0],[seed,0,0,-1],[NaN,0,0,0],[seed,0,NaN,0]] as number[][])expect(g.gradeInsert(bad[0]!,bad[1]!,bad[2]!,bad[3]!),JSON.stringify(bad)).toBeNull()
 })
})

describe('TI-R07 arcade',()=>{
 it('timer is 22/18/14 over four-question stages',()=>{
  expect([0,3,4,7,8,9].map(secondsFor)).toEqual([22,22,18,18,14,14])
 })
 it('score is round((120 + 90 × speed) × min(4, nextCombo))',()=>{
  expect(roundScore(1,1)).toBe(210)
  expect(roundScore(0,1)).toBe(120)
  expect(roundScore(0.5,2)).toBe(330)
  expect(roundScore(1,4)).toBe(840)
  expect(roundScore(1,9)).toBe(840)
  expect(roundScore(2,1)).toBe(210)
  expect(roundScore(-1,0)).toBe(120)
 })
})

describe('TI-R06 anti-leak',()=>{
 it('detects dates in ids, titles and hints',()=>{
  for(const t of ['2024-05-02','02.05.2024','2/5/24','May 2, 2024','Cup 1998','c-20240502'])expect(dateLeaks(t).length,t).toBeGreaterThan(0)
  for(const t of ['Cup final','h5x9k2','Seven goals','Round 16'])expect(dateLeaks(t),t).toEqual([])
 })
 it.each(CORE_CLUB_IDS)('%s: no date reaches the browser before the answer',async id=>{
  const data=(await loadClub(id))!.data,g=clubTimeline(data)
  for(const seed of [1,2,42,95,300])for(const cursor of [0,1]){
   const deal=g.dealTimelineRun(seed,cursor)
   const json=JSON.stringify({queue:deal.queue})
   expect(payloadLeaks({anchor:deal.anchor,queue:deal.queue}),`${id} ${seed}/${cursor}`).toEqual([])
   expect(json).not.toMatch(/"on"/)
   expect(Object.keys(deal.queue[0]??{}).sort()).toEqual(['hint','id','title'])
  }
 },60000)
})
