import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import {clampIndex,decadeOf,decadesOf,gapBetween,planThread,stepFor,threadOf,validDay,yearKnots,type ThreadInput} from '@/lib/clubs/thread-model'
import {threadLinks,threadPage} from '@/components/clubs/gates/timeline-thread/data'

const row=(id:string,on:string|null,year:number|null,title=`Event ${id}`):ThreadInput=>({id,title,hint:'',on,year,sources:[]})

/** invented entries: exact days, year-only entries, an undated one, a duplicate and an impossible date */
const ROWS:ThreadInput[]=[
 row('b','1994-05-10',1994),row('a','1994-05-02',1994),row('y94',null,1994,'Year only 1994'),
 row('c','2001-01-01',2001),row('d','2001-01-01',2001),row('y01',null,2001,'Year only 2001'),
 row('e','2010-12-31',2010),row('f','2019-06-30',2019),row('g','2025-03-03',2025),
 row('dup','1994-05-02',1994),row('dup','1994-05-03',1994),
 row('bad','1999-02-31',1999),row('none',null,null),row('weird',null,1700),row('blank','2000-01-01',2000,'  '),
]
const thread=threadOf(ROWS)

describe('thread model · the thread',()=>{
 it('accepts only real calendar days',()=>{
  expect(validDay('2024-02-29')).toEqual({y:2024,m:2,d:29})
  expect(validDay('2023-02-29')).toBeNull()
  expect(validDay('1999-02-31')).toBeNull()
  expect(validDay('2001-13-01')).toBeNull()
  expect(validDay('2001-1-1')).toBeNull()
  expect(validDay(null)).toBeNull()
  expect(validDay('1500-01-01')).toBeNull()
 })
 it('keeps an entry once, drops what has neither a real day nor a plausible year',()=>{
  const ids=thread.map(e=>e.id)
  expect(new Set(ids).size).toBe(ids.length)
  expect(ids).not.toContain('bad')
  expect(ids).not.toContain('none')
  expect(ids).not.toContain('weird')
  expect(ids).not.toContain('blank')
  expect(ids.filter(i=>i==='dup')).toHaveLength(1)
 })
 it('orders by day, and puts year-only entries at the head of their year, labelled as such',()=>{
  const ids=thread.map(e=>e.id)
  expect(ids.indexOf('y94')).toBeLessThan(ids.indexOf('a'))
  expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'))
  expect(ids.indexOf('y01')).toBeLessThan(ids.indexOf('c'))
  for(const e of thread){
   expect(e.precision==='day').toBe(e.on!==null)
   if(e.on)expect(Number(e.on.slice(0,4))).toBe(e.year)
  }
  const years=thread.map(e=>e.year)
  expect([...years].sort((x,y)=>x-y)).toEqual(years)
 })
 it('breaks ties between the same day by id, so the order never depends on the input order',()=>{
  const reversed=threadOf([...ROWS].reverse())
  expect(reversed.map(e=>e.id)).toEqual(thread.map(e=>e.id))
 })
 it('never promotes a year-only entry to a day',()=>{
  const y=thread.find(e=>e.id==='y94')!
  expect(y.on).toBeNull()
  expect(y.precision).toBe('year')
 })
})

describe('thread model · decades and the plan',()=>{
 it('counts the decades, oldest first, split into exact and year-only',()=>{
  const rows=decadesOf(thread)
  expect(rows.map(r=>r.decade)).toEqual([1990,2000,2010,2020])
  expect(rows[0]).toMatchObject({count:4,exact:3,yearOnly:1})
  expect(rows.reduce((n,r)=>n+r.count,0)).toBe(thread.length)
  expect(decadeOf(1999)).toBe(1990)
 })
 it('starts at the beginning of the thread when nothing is asked',()=>{
  const plan=planThread(thread)!
  expect(plan.decade).toBe(1990)
  expect(plan.start).toBe(0)
  expect(plan.prev).toBeNull()
  expect(plan.next).toMatchObject({decade:2000})
  expect(plan.total).toBe(thread.length)
 })
 it('opens the decade of an entry the link names, at that entry',()=>{
  const plan=planThread(thread,{at:'f'})!
  expect(plan.decade).toBe(2010)
  expect(plan.events[plan.start]!.id).toBe('f')
  expect(plan.prev).toEqual({decade:2000,id:thread.filter(e=>decadeOf(e.year)===2000).pop()!.id})
  expect(plan.next).toEqual({decade:2020,id:'g'})
 })
 it('honours a decade the thread covers and ignores one it does not',()=>{
  expect(planThread(thread,{dec:2000})!.decade).toBe(2000)
  expect(planThread(thread,{dec:1980})!.decade).toBe(1990)
  expect(planThread(thread,{at:'nope',dec:null})!.decade).toBe(1990)
 })
 it('sends only the chosen decade to the browser',()=>{
  const plan=planThread(thread,{dec:2000})!
  expect(plan.events.every(e=>decadeOf(e.year)===2000)).toBe(true)
  expect(plan.events.length).toBeLessThan(thread.length)
 })
 it('plans nothing for an archive with no dated entry',()=>{
  expect(planThread([])).toBeNull()
  expect(planThread(threadOf([row('x',null,null)]))).toBeNull()
 })
 it('lets a link walk the whole thread through the decade edges, in order',()=>{
  const seen:string[]=[]
  let plan=planThread(thread)!
  for(let guard=0;guard<20;guard++){
   seen.push(...plan.events.map(e=>e.id))
   if(!plan.next)break
   plan=planThread(thread,{at:plan.next.id})!
  }
  expect(seen).toEqual(thread.map(e=>e.id))
 })
})

describe('thread model · gaps and knots',()=>{
 const at=(on:string)=>threadOf([row(on,on,null)])[0]!
 it('states a gap only between two entries dated to the day',()=>{
  const y=thread.find(e=>e.id==='y94')!,a=thread.find(e=>e.id==='a')!
  expect(gapBetween(y,a)).toBeNull()
  expect(gapBetween(a,y)).toBeNull()
  expect(gapBetween(null,a)).toBeNull()
  expect(gapBetween(a,undefined)).toBeNull()
 })
 it('measures days, months and years',()=>{
  expect(gapBetween(at('2001-01-01'),at('2001-01-01'))).toEqual({kind:'same'})
  expect(gapBetween(at('2001-01-01'),at('2001-01-02'))).toEqual({kind:'days',n:1})
  expect(gapBetween(at('2001-01-01'),at('2001-02-20'))).toEqual({kind:'days',n:50})
  expect(gapBetween(at('2001-01-01'),at('2001-09-01'))).toMatchObject({kind:'months'})
  expect(gapBetween(at('2001-01-01'),at('2010-01-01'))).toEqual({kind:'years',n:9})
 })
 it('never states a negative gap',()=>{
  expect(gapBetween(at('2005-01-01'),at('2001-01-01'))).toBeNull()
 })
 it('groups a window into year knots pointing at each year\'s first entry',()=>{
  const win=planThread(thread,{dec:1990})!.events
  const knots=yearKnots(win)
  expect(knots).toEqual([{year:1994,first:0,count:win.length}])
  const two=yearKnots(planThread(thread,{dec:2000})!.events)
  expect(two[0]).toMatchObject({year:2001,first:0})
 })
})

describe('thread model · stepping',()=>{
 it('mirrors the arrow keys in right-to-left reading',()=>{
  expect(stepFor('ArrowRight',false)).toBe(1)
  expect(stepFor('ArrowLeft',false)).toBe(-1)
  expect(stepFor('ArrowRight',true)).toBe(-1)
  expect(stepFor('ArrowLeft',true)).toBe(1)
  expect(stepFor('ArrowDown',true)).toBe(1)
  expect(stepFor('ArrowUp',false)).toBe(-1)
  expect(stepFor('x',false)).toBeNull()
 })
 it('keeps an index inside the window',()=>{
  expect(clampIndex(-3,5)).toBe(0)
  expect(clampIndex(9,5)).toBe(4)
  expect(clampIndex(2.9,5)).toBe(2)
  expect(clampIndex(3,0)).toBe(0)
 })
})

describe('thread model · the page data',()=>{
 const club={archive:[],timeline:[],sources:[{id:'s1',title:'Archive A',url:'https://example.test/a',publisher:'Pub',access:'available' as const,checkedAt:'2026-10-01'}]}
 it('sends only the sources the chosen decade cites',()=>{
  const evs=threadOf([{...row('p','1994-01-01',1994),sources:['s1','ghost']},{...row('q','2005-01-01',2005),sources:['s1']}])
  const one=threadPage(club,evs,{dec:'1990'})
  expect(Object.keys(one.sources)).toEqual(['s1'])
  expect(one.sources.s1).toEqual({title:'Archive A',publisher:'Pub',url:'https://example.test/a'})
  expect(threadPage(club,[],{}).plan).toBeNull()
 })
 it('ignores a malformed decade or entry in the link',()=>{
  const evs=threadOf([row('p','1994-01-01',1994),row('q','2005-01-01',2005)])
  expect(threadPage(club,evs,{dec:'abc'}).plan!.decade).toBe(1990)
  expect(threadPage(club,evs,{at:'zzz'}).plan!.decade).toBe(1990)
 })
 it('links a chronology card to its entry on the thread by fact id, or by day and title',()=>{
  const evs=threadOf([row('fact-1','1994-01-01',1994,'First'),row('other','2001-02-02',2001,'Second')])
  const timeline=[
   {id:'fact-1',value:{id:'hash1',title:'First',hint:'',on:'1994-01-01'}},
   {id:'tl-9',value:{id:'hash2',title:'Second',hint:'',on:'2001-02-02'}},
   {id:'tl-10',value:{id:'hash3',title:'Not on the thread',hint:'',on:'2010-10-10'}},
  ] as never
  expect(threadLinks({timeline},evs,['hash1','hash2','hash3','unknown'])).toEqual({hash1:'fact-1',hash2:'other'})
 })
})

describe('thread model · template, not a club',()=>{
 it('names no club and no rule of its own, and needs no server',()=>{
  for(const f of ['lib/clubs/thread-model.ts','components/clubs/gates/timeline-thread/ClubThread.tsx','components/clubs/gates/timeline-thread/data.ts','components/clubs/gates/timeline-thread/ModeTabs.tsx']){
   const src=readFileSync(f,'utf8')
   expect(src,f).not.toMatch(/hapoel|maccabi|olympiacos|panathin|zrinjski/i)
   expect(src,f).not.toMatch(/import [^\n]*server-only/)
  }
 })
})
