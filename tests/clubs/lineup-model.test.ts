import {describe,it,expect} from 'vitest'
import type {ClubPlayer} from '@/lib/clubs/contract'
import {BANDS,MAX_LOCKS,XI_SIZE,aimAfter,bandOf,buildPool,coachBudget,coachNote,counts,emptyBoard,isComplete,matchYear,menIn,picksOf,place,remove,shareText,sheetOf,toggleLock,wire,type Board} from '@/lib/clubs/lineup-model'

const names=Array.from({length:14},(_,i)=>`Player ${String.fromCharCode(65+i)}`)
const fill=(n:number,band:'DF'|'MF'='DF')=>names.slice(0,n).reduce<Board>((b,x)=>place(b,x,band),emptyBoard())
const p=(name:string,fromYear:number|null,toYear:number|null):ClubPlayer=>({id:name,name,positions:[],fromYear,toYear,aliases:[]})

describe('gate 3 board',()=>{
 it('places, moves and removes men without ever holding more than eleven',()=>{
  let b=place(emptyBoard(),'Player A','GK')
  expect(bandOf(b,'Player A')).toBe('GK')
  b=place(b,'Player A','MF')
  expect(b.men).toHaveLength(1);expect(bandOf(b,'Player A')).toBe('MF')
  expect(place(b,'Player A','MF')).toBe(b)
  const full=fill(11)
  expect(isComplete(full)).toBe(true)
  expect(place(full,'Player L','FW')).toBe(full)
  expect(place(full,names[0]!,'FW').men).toHaveLength(11)
  expect(remove(full,names[0]!).men).toHaveLength(10)
 })
 it('keeps standing order inside a band and lets a lock travel with the man',()=>{
  let b=place(place(emptyBoard(),'Player A','DF'),'Player B','DF')
  b=toggleLock(b,'Player A').board
  b=place(b,'Player A','FW')
  expect(menIn(b,'DF').map(m=>m.name)).toEqual(['Player B'])
  expect(b.locks).toEqual(['Player A'])
  expect(counts(b)).toEqual({GK:0,DF:1,MF:0,FW:1})
 })
 it('allows at most three locks, only on men who are on the board, and drops a lock with its man',()=>{
  let b=fill(5)
  expect(toggleLock(b,'Player Z')).toMatchObject({ok:false,reason:'absent'})
  for(const n of names.slice(0,MAX_LOCKS))b=toggleLock(b,n).board
  expect(b.locks).toHaveLength(MAX_LOCKS)
  const r=toggleLock(b,names[3]!)
  expect(r).toMatchObject({ok:false,reason:'full'});expect(r.board).toBe(b)
  expect(toggleLock(b,names[0]!).board.locks).toHaveLength(MAX_LOCKS-1)
  expect(remove(b,names[0]!).locks).not.toContain(names[0])
 })
 it('aims at the defence once the keeper stands, and nowhere else changes the aim',()=>{
  expect(aimAfter(emptyBoard(),'GK')).toBe('GK')
  expect(aimAfter(place(emptyBoard(),'Player A','GK'),'GK')).toBe('DF')
  expect(aimAfter(place(emptyBoard(),'Player A','GK'),'FW')).toBe('FW')
 })
 it('only ever sends exactly eleven distinct names that belong to the pool',()=>{
  const pool=names
  expect(wire(fill(10),pool)).toBeNull()
  expect(wire(fill(11),pool)).toEqual(picksOf(fill(11)))
  expect(wire(fill(11),names.slice(1))).toBeNull()
 })
})

describe('gate 3 dressing room pool',()=>{
 const roster=[p('Old Timer',1950,1960),p('Local Hero',2000,2008),p('Neighbour',2003,2005),p('Nobody',null,null),p('Newcomer',2020,2024),p('Another',1999,2002)]
 const base={matchId:'m1',starters:['S1','S2','S3'],decoys:['D1'],roster,year:2002 as number|null}
 it('is alphabetical, holds every starter once and never repeats a name',()=>{
  const pool=buildPool({...base,size:8})
  expect(pool).toHaveLength(8)
  expect(new Set(pool).size).toBe(pool.length)
  for(const s of base.starters)expect(pool).toContain(s)
  expect(pool).toEqual([...pool].sort((a,b)=>a.localeCompare(b)))
 })
 it('prefers the source decoys, then players documented in the match years, and never a name twice',()=>{
  const pool=buildPool({...base,size:7})
  expect(pool).toContain('D1')
  expect(pool).toContain('Local Hero');expect(pool).toContain('Neighbour');expect(pool).toContain('Another')
  expect(pool).not.toContain('Old Timer')
 })
 it('is the same room every time, and does not depend on the roster order',()=>{
  const a=buildPool({...base,size:9}),b=buildPool({...base,roster:[...roster].reverse(),size:9})
  expect(a).toEqual(b)
  expect(buildPool({...base,size:9})).toEqual(a)
 })
 it('tops up from the nearest eras when the years are unknown or sparse, and copes with no date at all',()=>{
  expect(buildPool({...base,year:null,size:9})).toHaveLength(9)
  expect(buildPool({...base,roster:[],decoys:[],size:6}).sort()).toEqual(['S1','S2','S3'])
 })
 it('reads only a documented year',()=>{
  expect(matchYear('2001-10-18')).toBe(2001);expect(matchYear('1998')).toBe(1998)
  expect(matchYear(null)).toBeNull();expect(matchYear('unknown')).toBeNull()
 })
})

describe('gate 3 coach',()=>{
 const m={starters:Array.from({length:11},(_,i)=>`S${i}`),bench:['B1','B2']}
 it('counts the starters still missing and never names anybody',()=>{
  const n=coachNote(m,['S0','S1','X'],0)!
  expect(n).toEqual({kind:'stillOut',n:9,of:11})
  expect(JSON.stringify(n)).not.toMatch(/S\d|B\d/)
 })
 it('counts substitutes only where the archive records the bench',()=>{
  expect(coachNote(m,['S0','B1','B2'],1)).toEqual({kind:'benchOn',n:2,of:3})
  expect(coachNote({...m,bench:[]},['S0'],1)).toBeNull()
  expect(coachBudget(m)).toBe(2);expect(coachBudget({bench:[]})).toBe(1)
 })
 it('refuses a note past the budget or a bad index',()=>{
  for(const i of [-1,2,0.5,NaN])expect(coachNote(m,['S0'],i)).toBeNull()
 })
})

describe('gate 3 result sheet',()=>{
 const board=['A','B','C'].reduce<Board>((b,n,i)=>place(b,n,BANDS[i]!),emptyBoard())
 it('marks each man, keeps the bands, counts the locks that were right',()=>{
  const locked=toggleLock(toggleLock(board,'A').board,'B').board
  const s=sheetOf(locked,{correct:2,wrong:['B'],missed:['Z']})
  expect(s.rows.map(r=>[r.name,r.band,r.mark,r.locked])).toEqual([['A','GK','right',true],['B','DF','wrong',true],['C','MF','right',false]])
  expect(s.locksUsed).toBe(2);expect(s.locksRight).toBe(1);expect(s.missed).toEqual(['Z'])
 })
 it('shares the player\'s own sheet and score, with no answer in it',()=>{
  const text=shareText({club:'Club',title:'Final',on:'2002-05-01',board,g:{correct:2,wrong:['B'],missed:['Z']},bandNames:{GK:'Keeper',DF:'Defence',MF:'Midfield',FW:'Attack'},url:'https://x.test/clubs/c/lineup'})
  expect(text).toContain('2/11');expect(text).toContain('Keeper: A');expect(text).not.toContain('Z')
  expect(XI_SIZE).toBe(11)
 })
})
