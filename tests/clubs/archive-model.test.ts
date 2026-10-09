import {describe,expect,it} from 'vitest'
import type {Entry} from '@/lib/clubs/entities'
import {ROUND_DEPTH,addToTrail,buckets,dayIndex,decadesOf,digOrder,inDecade,isDayKey,localDayKey,lookOf,nearestDays,nextStep,related,roundDone,searchEntries,shiftDay} from '@/lib/clubs/archive-model'
import {mergeSaved,parseSaved,savedIds} from '@/lib/clubs/archive-mine'

const E=(id:string,o:Partial<Entry>={}):Entry=>({id,kind:'moment',title:id,on:null,year:null,hint:'',confidence:3,sources:['s'],note:null,legacy:false,player:null,names:[],refs:[],...o})
const day=(id:string,on:string,o:Partial<Entry>={}):Entry=>E(id,{on,year:Number(on.slice(0,4)),...o})
const player=(id:string,from:number|null,to:number|null,o:Partial<Entry>={}):Entry=>E(id,{kind:'player',title:id,player:{positions:['FW'],from,to,aliases:[]},...o})
const idx=(es:Entry[])=>new Map(es.map(e=>[e.id,e]))

describe('gate 12 · today follows the supporter, not the server',()=>{
 it('reads the calendar day from the device date parts (never UTC)',()=>{
  // 23:30 on 7 Oct local time is already 8 Oct in UTC+3 — the supporter lives the 7th
  expect(localDayKey(new Date(2026,9,7,23,30))).toBe('10-07')
  expect(localDayKey(new Date(2026,0,1,0,0,1))).toBe('01-01')
  expect(localDayKey(new Date(2024,1,29,12))).toBe('02-29')
 })
 it('lists only exact-day moments on a day — a year-only entry and a player can never claim one',()=>{
  const es=[day('a','1990-10-07'),day('b','2005-10-07'),E('c',{year:1990}),E('d'),player('p',1990,1999),day('e','2005-10-08')]
  const ix=dayIndex(es)
  expect(ix.get('10-07')!.map(e=>e.id)).toEqual(['a','b'])   // oldest first
  expect([...ix.keys()].sort()).toEqual(['10-07','10-08'])
 })
 it('does not invent a 29 February for non-leap years: the day only exists where an entry says so',()=>{
  const ix=dayIndex([day('a','2004-02-29')])
  expect(ix.get('02-29')).toHaveLength(1);expect(ix.get('02-28')).toBeUndefined();expect(ix.get('03-01')).toBeUndefined()
 })
 it('steps through the year and wraps, including the leap day',()=>{
  expect(shiftDay('12-31',1)).toBe('01-01');expect(shiftDay('01-01',-1)).toBe('12-31');expect(shiftDay('02-28',1)).toBe('02-29');expect(shiftDay('02-29',1)).toBe('03-01');expect(shiftDay('10-07',0)).toBe('10-07')
  expect(isDayKey('02-29')).toBe(true);expect(isDayKey('02-30')).toBe(false);expect(isDayKey('13-01')).toBe(false);expect(isDayKey(null)).toBe(false)
 })
 it('offers the nearest days with something on file when today has nothing, wrapping the year',()=>{
  const ix=dayIndex([day('a','2001-10-09'),day('b','2002-10-09'),day('c','2003-10-20'),day('d','2004-01-05')])
  expect(nearestDays(ix,'10-07',3)).toEqual([{key:'10-09',count:2},{key:'10-20',count:1},{key:'01-05',count:1}])
  expect(nearestDays(ix,'10-09',1)).toEqual([{key:'10-20',count:1}])   // never today itself
  expect(nearestDays(new Map(),'10-07')).toEqual([])
 })
})

describe('gate 12 · time',()=>{
 const es=[day('a','1928-05-04'),day('b','1999-12-31'),day('c','2000-01-01'),E('y',{year:1995}),E('u'),player('p1',1988,1996),player('p2',null,null),player('p3',1999,2001)]
 it('buckets moments by their year and players by every decade their documented span reaches',()=>{
  expect(decadesOf(player('p',1988,2001))).toEqual([1980,1990,2000]);expect(decadesOf(player('p',null,null))).toEqual([]);expect(decadesOf(player('p',1995,null))).toEqual([1990])
  expect(buckets(es)).toEqual([{decade:1920,count:1},{decade:1980,count:1},{decade:1990,count:4},{decade:2000,count:2},{decade:null,count:2}])
 })
 it('an undated entry lives in its own bucket, not in a guessed decade',()=>{
  expect(inDecade(es,null).map(e=>e.id).sort()).toEqual(['p2','u'])
 })
 it('lists moments newest first, then the players',()=>{
  expect(inDecade(es,1990).map(e=>e.id)).toEqual(['b','y','p1','p3'])
  expect(inDecade(es,1990,'player').map(e=>e.id)).toEqual(['p1','p3'])
  expect(buckets(es,'moment').find(b=>b.decade===1990)!.count).toBe(2)
 })
})

describe('gate 12 · search',()=>{
 const es=[day('a','2026-05-13',{title:'Velež 1–1 Zrinjski',hint:'Cup final second leg'}),E('b',{title:'League champions · seventh title',year:2022,hint:'Premier League'}),player('p',1990,1999,{title:'Goran Karačić',player:{positions:['MF'],from:1990,to:1999,aliases:['G. Karacic']}})]
 it('needs every word, folds case and diacritics, and finds a year or an ISO date',()=>{
  expect(searchEntries(es,'karacic').map(e=>e.id)).toEqual(['p'])
  expect(searchEntries(es,'CUP final').map(e=>e.id)).toEqual(['a'])
  expect(searchEntries(es,'2022').map(e=>e.id)).toEqual(['b'])
  expect(searchEntries(es,'2026-05').map(e=>e.id)).toEqual(['a'])
  expect(searchEntries(es,'cup seventh')).toEqual([])
  expect(searchEntries(es,'   ')).toHaveLength(3)   // an empty query matches all — the screen decides not to ask
 })
 it('filters by kind',()=>{
  expect(searchEntries(es,'goran','moment')).toEqual([]);expect(searchEntries(es,'g','player').map(e=>e.id)).toEqual(['p'])
 })
})

describe('gate 12 · dig box',()=>{
 const ids=Array.from({length:40},(_,i)=>`e${i}`)
 it('is a permutation: every card exactly once',()=>{
  const o=digOrder(ids,42,0);expect(o).toHaveLength(40);expect(new Set(o).size).toBe(40);expect([...o].sort()).toEqual([...ids].sort())
 })
 it('is deterministic for a (seed, cursor) and different for another',()=>{
  expect(digOrder(ids,42,0)).toEqual(digOrder([...ids].reverse(),42,0))   // input order does not matter
  expect(digOrder(ids,42,0)).not.toEqual(digOrder(ids,42,1));expect(digOrder(ids,42,0)).not.toEqual(digOrder(ids,43,0))
 })
 it('copes with an empty or single box',()=>{expect(digOrder([],1,0)).toEqual([]);expect(digOrder(['a'],1,3)).toEqual(['a'])})
})

describe('gate 12 · the rabbit hole and the exploration round',()=>{
 const p=player('p',1990,1999)
 const es=[day('m1','2001-05-13',{names:['p']}),day('m2','2002-05-13'),day('m3','2001-06-01'),E('m4',{year:2001}),p]
 const by=idx(es)
 it('relates only through stated links: named players, who names a player, the same day, the same year',()=>{
  const r=related(es,by,es[0]!)
  expect(r.named.map(e=>e.id)).toEqual(['p']);expect(r.sameDay.map(e=>e.id)).toEqual(['m2']);expect(r.sameYear.map(e=>e.id)).toEqual(['m3','m4'])
  expect(related(es,by,p).namedBy.map(e=>e.id)).toEqual(['m1'])
  expect(related(es,by,E('x')).sameDay).toEqual([])   // an undated entry has no day to share
 })
 it('a year-only entry has no same-day neighbours',()=>{expect(related(es,by,es[3]!).sameDay).toEqual([])})
 it('dig deeper always terminates: it never returns a visited entry, and runs out',()=>{
  const seen=new Set<string>(['m1']);let cur:Entry|null=es[0]!;let steps=0
  while(cur&&steps<20){seen.add(cur.id);cur=nextStep(es,by,cur,seen);steps++}
  expect(cur).toBeNull();expect(steps).toBeLessThan(20);expect(seen.size).toBeLessThanOrEqual(es.length)
 })
 it('counts distinct entries only — page views, repeats and a reload of the same entry do not finish a round',()=>{
  let t:string[]=[];for(const id of ['a','a','b','a','b'])t=addToTrail(t,id)
  expect(t).toEqual(['a','b']);expect(roundDone(t)).toBe(false)
  for(const id of ['c','d','e'])t=addToTrail(t,id)
  expect(t).toHaveLength(ROUND_DEPTH);expect(roundDone(t)).toBe(true);expect(roundDone(t.slice(0,4))).toBe(false)
 })
})

describe('gate 12 · the look of a card',()=>{
 it('picks a vocabulary, never a fact',()=>{
  expect(lookOf(player('p',1,2))).toBe('player');expect(lookOf(day('a','2020-01-01',{title:'Velež 1–1 Zrinjski'}))).toBe('programme')
  expect(lookOf(day('a','2020-01-01',{title:'Coach named'}))).toBe('card');expect(lookOf(E('a',{year:2020,title:'Title won'}))).toBe('clipping')
 })
})

describe('gate 12 · Mine (saved, device-local)',()=>{
 it('reads only well-formed rows, whatever the device holds',()=>{
  expect(parseSaved(null)).toEqual({});expect(parseSaved('not json')).toEqual({});expect(parseSaved('[1]')).toEqual({})
  expect(parseSaved(JSON.stringify({a:{b:true,at:'2026-10-08T10:00:00Z'},'bad id!':{b:true,at:'x'},c:{b:'yes',at:'2026-10-08'},d:{at:5}}))).toEqual({a:{b:true,at:'2026-10-08T10:00:00Z'},c:{b:false,at:'2026-10-08'}})
 })
 it('lists saved ids newest first and drops tombstones',()=>{
  expect(savedIds({a:{b:true,at:'2026-10-01'},b:{b:false,at:'2026-10-09'},c:{b:true,at:'2026-10-05'}})).toEqual(['c','a'])
 })
 it('merges two devices: the later change wins, and on a tie "saved" wins',()=>{
  const m=mergeSaved({a:{b:true,at:'2026-10-01'},b:{b:true,at:'2026-10-03'},c:{b:false,at:'2026-10-02'}},{a:{b:false,at:'2026-10-02'},b:{b:false,at:'2026-10-03'},c:{b:true,at:'2026-10-02'}})
  expect(m.a?.b).toBe(false);expect(m.b?.b).toBe(true);expect(m.c?.b).toBe(true)
 })
})
