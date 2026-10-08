import {describe,it,expect} from 'vitest'
import type {MemoryCandidate} from '@/lib/game/memory-engine'
import {MEMORY_VALUE,KIND_CAP,type MemoryPairType} from '@/lib/game/memory-quality'
import {MAX_FACE_CHARS,SEARCH_BUDGET,blockerFor,boardAt,boardsOf,candidateIssue,deckReport,greedyDistinct,inTheme,isTheme,memoryModes,minRecognisable,normFace,orderPool,searchBoard,sizeModes,typeCap,usablePool,type Cand} from '@/lib/clubs/memory-solver'

let n=0
const cand=(o:{a:string;b:string;type?:MemoryPairType;year?:number|null;pair?:string}):MemoryCandidate=>({pair:o.pair??`p${++n}`,type:o.type??'trophy-season',a:o.a,b:o.b,kind:o.type??'trophy-season',object:'trophy',answer:'season',fact:null,year:o.year===undefined?2000:o.year})
const pool=(c:MemoryCandidate[]):Cand[]=>usablePool(c).pool
/** n distinct pairs of one type: faces never repeat */
const many=(type:MemoryPairType,count:number,year=2000):MemoryCandidate[]=>Array.from({length:count},(_,i)=>cand({a:`${type}-a${i}`,b:`${type}-b${i}`,type,year:year+i%7}))

describe('Gate 6 · ME-R01 a pair is a relation that can be understood from its two faces',()=>{
 it('refuses a candidate with an empty face, two identical faces, an unregistered type or a dated type with no year',()=>{
  expect(candidateIssue(cand({a:'',b:'1999'}))).toBe('relation')
  expect(candidateIssue(cand({a:'1999',b:' 1999 '}))).toBe('relation')
  expect(candidateIssue({...cand({a:'x',b:'y'}),type:'made-up' as MemoryPairType})).toBe('relation')
  expect(candidateIssue(cand({a:'Cup',b:'1999',year:null}))).toBe('relation')
  expect(candidateIssue(cand({a:'Cup',b:'1999'}))).toBeNull()
  expect(candidateIssue(cand({a:'Candidate',b:'210 votes',type:'candidate-votes',year:null}))).toBeNull()
 })
 it('keeps a face too long for a phone card out of the pool instead of shortening it',()=>{
  const long='x'.repeat(MAX_FACE_CHARS+1)
  expect(candidateIssue(cand({a:long,b:'2001'}))).toBe('faceLong')
  const {pool:p,stats}=usablePool([cand({a:long,b:'2001'}),cand({a:'ok',b:'2002'}),cand({a:'ok2',b:'2003',pair:'dup'}),cand({a:'ok3',b:'2004',pair:'dup'})])
  expect(p.map(c=>c.a)).toEqual(['ok','ok2']);expect(stats.excluded).toEqual({relation:0,faceLong:1,duplicateId:1});expect(stats.valid).toBe(2)
 })
 it('counts the types and the recognisable relations of a pool, and knows a date-only pool',()=>{
  const {stats}=usablePool([...many('trophy-season',2),...many('crest-years',3)])
  expect(stats.types).toEqual({'trophy-season':2,'crest-years':3});expect(stats.recognisable).toBe(2);expect(stats.dateOnly).toBe(false)
  expect(usablePool(many('moment-date',4)).stats.dateOnly).toBe(true)
 })
})

describe('Gate 6 · ME-R02 no two faces of a dealt board read alike',()=>{
 it('reads a face the way the eye does: case, spacing, accents and punctuation make no difference',()=>{
  expect(normFace('  Maccabi   Tel-Aviv ')).toBe(normFace('maccabi tel aviv'))
  expect(normFace('גביע המדינה')).toBe(normFace('גביע  המדינה.'))
  expect(normFace('1933/34')).not.toBe(normFace('1934/35'))
  expect(normFace('1982/83')).not.toBe(normFace('1982/83–1988/89'))
 })
 it('the validator names a board whose faces collide — across the two sides of different pairs as well',()=>{
  const same=[cand({a:'League',b:'1999'}),cand({a:'League',b:'2000'})]
  expect(deckReport(same,2).problems).toContain('ambiguous-face')
  const crossed=[cand({a:'League',b:'1999'}),cand({a:'Cup',b:'league'})]
  expect(deckReport(crossed,2).problems).toContain('ambiguous-face')
  expect(deckReport([cand({a:'League',b:'1999'}),cand({a:'Cup',b:'2000'})],2).problems).toEqual([])
 })
 it('the validator also names a wrong size, a repeated pair and a weak relation',()=>{
  const a=cand({a:'A',b:'1991',pair:'same'}),b=cand({a:'B',b:'1992',pair:'same'})
  expect(deckReport([a,b],2).problems).toContain('duplicate-pair')
  expect(deckReport([a],2).problems).toContain('size')
  expect(deckReport([a,cand({a:'',b:'1992'})],2).problems).toContain('weak-relation')
 })
 it('never deals two pairs that share a date: two events on one displayed date cannot both be on a board',()=>{
  const sameDay=['Derby won 2-0','Cup final lost','Friendly drawn','Title decider','Europe first leg','Europe second leg'].map(a=>cand({a,b:'2001-05-05',type:'moment-date'}))
  const diffDay=['One','Two','Three','Four','Five','Six'].map((a,i)=>cand({a,b:`2001-05-0${i+1}`,type:'moment-date'}))
  expect(boardsOf(pool(sameDay),2,1).boards).toHaveLength(0)
  const mixed=pool([...sameDay,...diffDay])
  for(const seed of [1,2,3]){for(const bd of boardsOf(mixed,6,seed).boards){const faces=bd.pairs.flatMap(c=>[normFace(c.a),normFace(c.b)]);expect(new Set(faces).size).toBe(12)}}
 })
 it('reports the ambiguity as MEMORY_AMBIGUOUS_FACE with the number that can actually stand together',()=>{
  const p=pool(['One','Two','Three','Four'].map(a=>cand({a,b:'2001-05-05',type:'moment-date'})))
  const b=blockerFor(p,2)
  expect(b.code).toBe('MEMORY_AMBIGUOUS_FACE');expect(b.need).toBe(2);expect(b.have).toBe(1)
 })
})

describe('Gate 6 · ME-R03 strength: three recognisable relations in a full wall, no more than three of a type',()=>{
 it('asks for three recognisable relations of six, two of four, none of two',()=>{expect([6,4,2].map(s=>minRecognisable(s as 6|4|2))).toEqual([3,2,0]);expect(typeCap(6)).toBe(KIND_CAP)})
 it('a pool of only archival relations can field a small wall but never a full one: MEMORY_RECOGNISABLE_SHORT',()=>{
  const p=pool([...many('maker-span',4),...many('crest-years',4),...many('candidate-votes',4)])
  expect(MEMORY_VALUE['maker-span']).toBe(1)
  expect(boardsOf(p,6,1).boards).toHaveLength(0)
  const b=blockerFor(p,6);expect(b).toMatchObject({code:'MEMORY_RECOGNISABLE_SHORT',need:3,have:0})
  expect(boardsOf(p,2,1).boards.length).toBeGreaterThan(0)
 })
 it('reports how many well-known relations fit on ONE wall, not how many the pool holds',()=>{
  // four recognisable pairs, all sharing one face: any wall can carry only one of them
  const shared=Array.from({length:4},(_,i)=>cand({a:'Shared',b:`${2000+i}`,type:'trophy-season',year:2000+i}))
  const p=pool([...shared,...many('maker-span',4),...many('crest-years',4)])
  expect(p.filter(c=>c.value>=2).length).toBe(4)
  const b=blockerFor(p,6);expect(b).toMatchObject({code:'MEMORY_RECOGNISABLE_SHORT',need:3,have:1})
 })
 it('every full board holds at least three recognisable relations and, when the pool allows, at most three of one type',()=>{
  const p=pool([...many('trophy-season',9),...many('goal-year',3),...many('tie-season',3),...many('crest-years',3),...many('maker-span',3)])
  for(const seed of [1,5,9,44]){
   const {boards}=boardsOf(p,6,seed);expect(boards.length).toBeGreaterThan(0)
   for(const bd of boards){const r=deckReport(bd.pairs,6);expect(r.recognisable).toBeGreaterThanOrEqual(3);expect(r.problems).toEqual([])}
   expect(boards[0]!.narrow).toBe(false);expect(deckReport(boards[0]!.pairs,6).maxOfOneType).toBeLessThanOrEqual(3)
  }
 })
 it('when the pool cannot vary the board it LABELS it narrow rather than calling it balanced',()=>{
  const p=pool(many('trophy-season',8))
  const {boards}=boardsOf(p,6,1);expect(boards).toHaveLength(1)
  expect(boards[0]!.narrow).toBe(true);expect(boards[0]!.label).toBe('narrow')
 })
 it('a wall of nothing but dated events is labelled DATE MEMORY, not variety',()=>{
  const {boards}=boardsOf(pool(many('moment-date',14)),6,3)
  expect(boards.length).toBeGreaterThan(0);for(const bd of boards)expect(bd.label).toBe('date')
 })
})

describe('Gate 6 · ME-R04 the deck is SOLVED, not greedily deduplicated',()=>{
 it('finds the two-pair wall a first-fit walk misses (the first pair collides with both others)',()=>{
  const p1=cand({a:'A',b:'B'}),p2=cand({a:'A',b:'C'}),p3=cand({a:'B',b:'D'})
  const ordered=pool([p1,p2,p3])
  expect(greedyDistinct(ordered)).toBe(1)
  const found=searchBoard(ordered,2,3,0)
  expect(found.deck?.map(c=>c.pair).sort()).toEqual([p2.pair,p3.pair].sort())
 })
 it('holds the face rule, the type cap and the recognisability floor TOGETHER',()=>{
  // the cheapest-to-reach pairs are archival and share faces; only a combination works
  const crest=[0,1,2,3].map(i=>cand({a:i<3?'Crest':`Crest ${i}`,b:`${1900+i*10}–${1909+i*10}`,type:'crest-years',year:1909+i*10}))
  const trophies=[0,1,2].map(i=>cand({a:`Trophy ${i}`,b:`19${50+i}/${51+i}`,type:'trophy-season',year:1951+i}))
  const found=searchBoard(pool([...crest,...trophies]),6,3,3)
  expect(found.deck).toBeNull()
  const five=searchBoard(pool([...crest,...trophies]),5,3,3)
  expect(five.deck).not.toBeNull();expect(five.deck!.filter(c=>c.value>=2).length).toBeGreaterThanOrEqual(3)
 })
 it('is bounded: a pool that cannot be solved stops at the node budget and says it ran out',()=>{
  const clash=Array.from({length:60},(_,i)=>cand({a:`face${i%7}`,b:`other${i%11}`,type:i%2?'trophy-season':'goal-year'}))
  const t0=Date.now(),r=searchBoard(pool(clash),6,3,0)
  expect(Date.now()-t0).toBeLessThan(5000);expect(r.nodes).toBeLessThanOrEqual(SEARCH_BUDGET+1)
  if(!r.deck)expect(typeof r.budgetHit).toBe('boolean')
 })
 it('refuses at the root, without searching, a pool whose type caps cannot reach the size',()=>{
  const r=searchBoard(pool(many('trophy-season',30)),6,3,0);expect(r.deck).toBeNull();expect(r.budgetHit).toBe(false);expect(r.nodes).toBe(0)
 })
 it('is deterministic in the seed and different between seeds',()=>{
  const p=pool([...many('trophy-season',12),...many('goal-year',12),...many('tie-season',12)])
  const a=boardsOf(p,6,7),b=boardsOf(p,6,7),c=boardsOf(p,6,8)
  expect(a.boards.map(x=>x.pairs.map(y=>y.pair))).toEqual(b.boards.map(x=>x.pairs.map(y=>y.pair)))
  expect(a.boards[0]!.pairs.map(y=>y.pair)).not.toEqual(c.boards[0]!.pairs.map(y=>y.pair))
 })
 it('boards of one lap are disjoint, and a cursor past the lap folds the lap number into the seed',()=>{
  const p=pool([...many('trophy-season',12),...many('goal-year',12),...many('tie-season',12)])
  const {boards}=boardsOf(p,6,3),ids=boards.flatMap(b=>b.pairs.map(c=>c.pair))
  expect(boards.length).toBeGreaterThanOrEqual(3);expect(new Set(ids).size).toBe(ids.length)
  const first=boardAt(p,6,3,0)!,wrapped=boardAt(p,6,3,boards.length)!
  expect(first.lap).toBe(0);expect(wrapped.lap).toBe(1);expect(wrapped.index).toBe(0);expect(wrapped.seed).not.toBe(first.seed)
  expect(boardAt(p,6,3,Number.NaN)!.index).toBe(0);expect(boardAt(p,6,3,-5)!.index).toBe(0)
 })
 it('counts the boards a pool can really field, not the candidate count divided by six',()=>{
  const dup=pool(Array.from({length:30},(_,i)=>cand({a:`Cup ${i%3}`,b:`199${i%4}`})))
  expect(dup.length).toBe(30);expect(boardsOf(dup,6,1).boards).toHaveLength(0);expect(blockerFor(dup,6).code).toBe('MEMORY_AMBIGUOUS_FACE')
 })
})

describe('Gate 6 · ME-R11 a theme deck holds only the facts of its theme, under the same validator',()=>{
 const p=pool([...many('trophy-season',10,1990),...many('goal-year',10,1990),...many('tie-season',4,2010),...many('moment-year',2,1980)])
 it('themes are decades and nothing else',()=>{expect(isTheme('d1990')).toBe(true);expect(['1990','d19','undated','d2090x','',null,3].some(isTheme)).toBe(false)})
 it('a themed pool contains only that decade, and every themed board is valid',()=>{
  const nineties=inTheme(p,'d1990');expect(nineties.length).toBeGreaterThan(0);expect(nineties.every(c=>c.theme==='d1990')).toBe(true)
  for(const bd of boardsOf(nineties,6,2).boards){expect(bd.pairs.every(c=>c.theme==='d1990')).toBe(true);expect(deckReport(bd.pairs,6).problems).toEqual([])}
 })
 it('a decade that cannot fill a wall offers a smaller labelled one, never borrows from another decade',()=>{
  const eighties=sizeModes(p,'d1980');expect(eighties.find(s=>s.size===6)!.available).toBe(false);expect(eighties.find(s=>s.size===2)!.available).toBe(true)
  const b=eighties.find(s=>s.size===6)!.blocker!;expect(b.code).toBe('MEMORY_THEME_SHORT');expect(b.have).toBe(2);expect(b.theme).toBe('d1980')
  for(const bd of boardsOf(inTheme(p,'d1980'),2,1).boards)expect(bd.pairs.every(c=>c.theme==='d1980')).toBe(true)
 })
 it('offers only the decades that can field at least two pairs, with the biggest wall each can field',()=>{
  const modes=memoryModes(p,usablePool([]).stats)
  const by=Object.fromEntries(modes.themes.map(t=>[t.theme,t.maxSize]))
  expect(by.d1990).toBe(6);expect(by.d2010).toBe(4);expect(by.d1980).toBe(2)
  expect(Object.keys(by).every(isTheme)).toBe(true)
 })
 it('the order a seed gives the pool is a permutation of it (nothing added, nothing lost)',()=>{
  const o=orderPool(p,5,6);expect(o).toHaveLength(p.length);expect(new Set(o.map(c=>c.pair))).toEqual(new Set(p.map(c=>c.pair)))
 })
})
