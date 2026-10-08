import {describe,expect,it} from 'vitest'
import {PAIR_TARGET,binaryBank,blackFileMode,clubsOf,dealBinary,dealPairs,exactDay,fileResult,gradeBinary,gradePair,orderOf,pairCapacity,pairableItems,publicBinary,publicPair,satisfyingPath,verifyBinary,type BinaryRow,type DatedItem,type Transition} from '@/lib/clubs/blackfile-engine'

const item=(n:number,on:string|null=null,extra:Partial<DatedItem>={}):DatedItem=>({id:`e${n}`,title:`Event ${n}`,on,...extra})
const days=(n:number)=>Array.from({length:n},(_,i)=>item(i,`20${String(10+i).padStart(2,'0')}-0${1+(i%9)}-1${i%9}`))
const T=(from:string,to:string,extra:Partial<Transition>={}):Transition=>({from,to,on:null,sources:['s1'],...extra})
const mask=(k:string,id:string)=>`k_${(id.split('').reduce((a,c)=>(a*33+c.charCodeAt(0))>>>0,5381)).toString(36)}_${k}`

describe('BF-R05 date pair',()=>{
 it('validates calendar days',()=>{
  expect(exactDay('2012-02-29')).toBe('2012-02-29')
  expect(exactDay('2013-02-29')).toBeNull()
  expect(exactDay('2013-13-01')).toBeNull()
  expect(exactDay('2013')).toBeNull()
  expect(exactDay(null)).toBeNull()
 })
 it('a same-day pair cannot choose an earlier item',()=>{
  const a=item(1,'2015-05-05'),b=item(2,'2015-05-05')
  expect(orderOf(a,b)).toBeNull()
  expect(orderOf(a,b,'interval')).toBeNull()
  expect(dealPairs([a,b],1)).toEqual([])
  expect(pairableItems([a,b]).length).toBe(1)
 })
 it('orders two distinct exact days',()=>{
  expect(orderOf(item(1,'2010-01-01'),item(2,'2011-01-01'))).toBe('a')
  expect(orderOf(item(1,'2012-01-01'),item(2,'2011-01-01'))).toBe('b')
 })
 it('year-only needs non-overlapping intervals and the interval mode',()=>{
  const y1=item(1,null,{year:2005}),y2=item(2,null,{year:2007}),y3=item(3,'2005-06-01',{year:2005})
  expect(orderOf(y1,y2)).toBeNull()
  expect(orderOf(y1,y2,'interval')).toBe('a')
  expect(orderOf(y1,y3,'interval')).toBeNull()
  expect(dealPairs([y1,y2],1)).toEqual([])
 })
 it('four pairs need eight distinct dated items; fewer items make fewer pairs',()=>{
  expect(PAIR_TARGET).toBe(4)
  expect(pairCapacity(days(8))).toBe(4)
  expect(pairCapacity(days(7))).toBe(3)
  expect(pairCapacity(days(2))).toBe(1)
  expect(pairCapacity(days(1))).toBe(0)
  expect(dealPairs(days(8),1).length).toBe(4)
  expect(dealPairs(days(5),1).length).toBe(2)
  expect(dealPairs(days(20),1).length).toBe(4)
 })
 it('no item twice in a file; no shared day inside a pair; the earlier side is truthful',()=>{
  for(let seed=1;seed<=60;seed+=1){
   const pairs=dealPairs(days(12),seed,seed%3)
   const ids=pairs.flatMap(p=>[p.a.id,p.b.id])
   expect(new Set(ids).size).toBe(ids.length)
   for(const p of pairs){
    expect(p.a.on).not.toBe(p.b.on)
    const truth=(p.a.on as string)<(p.b.on as string)?'a':'b'
    expect(p.earlier).toBe(truth)
   }
  }
 })
 it('duplicate days and duplicate ids enter the pool once',()=>{
  const dup=[item(1,'2010-01-01'),item(2,'2010-01-01'),item(1,'2011-01-01'),item(3,'2012-01-01')]
  expect(pairableItems(dup).map(i=>i.id)).toEqual(['e1','e3'])
 })
 it('is deterministic and rotates with the cursor',()=>{
  expect(dealPairs(days(16),5,0)).toEqual(dealPairs(days(16),5,0))
  expect(JSON.stringify(dealPairs(days(16),5,0))).not.toBe(JSON.stringify(dealPairs(days(16),5,1)))
 })
 it('grades by the pick and reports the gap',()=>{
  const p=dealPairs(days(8),2)[0]!
  const earlier=p.earlier==='a'?p.a:p.b,later=p.earlier==='a'?p.b:p.a
  const ok=gradePair(p,earlier.id)!,bad=gradePair(p,later.id)!
  expect(ok.correct).toBe(true);expect(bad.correct).toBe(false)
  expect(ok.earlier.id).toBe(earlier.id);expect(ok.days).toBeGreaterThan(0)
  expect(gradePair(p,'unknown')).toBeNull()
 })
})

describe('BF-R06 opaque payload',()=>{
 it('carries no date, no truth and no source for a pair',()=>{
  const pairs=dealPairs(days(8),3)
  for(const p of pairs){
   const json=JSON.stringify(publicPair(p,mask))
   expect(json).not.toMatch(/\d{4}-\d{2}-\d{2}/)
   expect(json).not.toMatch(/earlier|"on"|sources|year/)
   expect(json).not.toContain(p.a.id);expect(json).not.toContain(p.b.id)
  }
 })
 it('carries no path, answer or transition for a binary item',()=>{
  const row:BinaryRow={id:'b1',person:'P',from:'A',to:'B',proposition:'direct',career:[T('A','B',{on:'2001-02-03'})],claim:'crossed'}
  const json=JSON.stringify(publicBinary(row,mask))
  for(const leak of ['claim','crossed','did_not','career','sources','2001','negativeProof','b1'])expect(json).not.toContain(leak)
  expect(Object.keys(publicBinary(row,mask)).sort()).toEqual(['from','key','person','proposition','to'])
 })
})

describe('BF-R01..R04 binary proof',()=>{
 const direct:BinaryRow={id:'d',person:'P',from:'A',to:'B',proposition:'direct',career:[T('A','B')],claim:'crossed'}
 it('direct and ever are different propositions',()=>{
  const via:Transition[]=[T('A','Palermo'),T('Palermo','B')]
  const ever:BinaryRow={...direct,id:'e',proposition:'ever',career:via}
  expect(satisfyingPath({...direct,career:via})).toBeNull()
  expect(verifyBinary({...direct,career:via,claim:'crossed'})).toEqual({ok:false,blocker:'BINARY_CLAIM_MISMATCH'})
  const v=verifyBinary(ever)
  expect(v.ok).toBe(true)
  if(v.ok)expect(v.path.length).toBe(2)
 })
 it('an intervening club stays visible in the reveal',()=>{
  const ever:BinaryRow={id:'e',person:'P',from:'A',to:'B',proposition:'ever',career:[T('A','Palermo'),T('Palermo','B')],claim:'crossed'}
  const r=gradeBinary(ever,'crossed')!
  expect(r.correct).toBe(true)
  expect(r.clubs).toEqual(['A','Palermo','B'])
  expect(clubsOf(ever.career)).toEqual(['A','Palermo','B'])
 })
 it('a positive needs sourced transitions',()=>{
  expect(verifyBinary({...direct,career:[T('A','B',{sources:[]})]})).toEqual({ok:false,blocker:'BINARY_POSITIVE_UNSOURCED'})
  expect(verifyBinary({...direct,career:[T('A','B',{sources:['  ']})]}).ok).toBe(false)
  expect(verifyBinary(direct).ok).toBe(true)
 })
 it('absence of a row is never proof of a "did not"',()=>{
  const none:BinaryRow={id:'n',person:'P',from:'A',to:'B',proposition:'direct',career:[],claim:'did_not'}
  expect(verifyBinary(none)).toEqual({ok:false,blocker:'BLACKFILE_NEGATIVE_UNPROVEN'})
  const partial:BinaryRow={...none,career:[T('A','C')]}
  expect(verifyBinary(partial)).toEqual({ok:false,blocker:'BLACKFILE_NEGATIVE_UNPROVEN'})
 })
 it('a "did not" needs a stated complete record with sources',()=>{
  const proven:BinaryRow={id:'n',person:'P',from:'A',to:'B',proposition:'direct',career:[T('A','C'),T('C','B')],claim:'did_not',negativeProof:{kind:'complete-record',sources:['s9']}}
  const v=verifyBinary(proven)
  expect(v.ok).toBe(true)
  if(v.ok)expect(v.answer).toBe('did_not')
  expect(verifyBinary({...proven,negativeProof:{kind:'complete-record',sources:[]}}).ok).toBe(false)
  expect(verifyBinary({...proven,career:[T('A','C',{sources:[]}),T('C','B')]}).ok).toBe(false)
  const r=gradeBinary(proven,'did_not')!
  expect(r.correct).toBe(true);expect(r.clubs).toEqual(['A','C','B'])
 })
 it('a claim that contradicts the career is blocked either way',()=>{
  expect(verifyBinary({...direct,claim:'did_not',negativeProof:{kind:'complete-record',sources:['s']}})).toEqual({ok:false,blocker:'BINARY_CLAIM_MISMATCH'})
 })
 it('football only',()=>{
  expect(verifyBinary({...direct,sport:'basketball'})).toEqual({ok:false,blocker:'BINARY_NOT_FOOTBALL'})
  expect(verifyBinary({...direct,sport:'football'}).ok).toBe(true)
 })
 it('malformed rows are blocked, duplicates enter once',()=>{
  expect(verifyBinary({...direct,from:'A',to:'A'})).toEqual({ok:false,blocker:'BINARY_MALFORMED'})
  const {verified,blocked}=binaryBank([direct,direct,{...direct,id:'x',career:[]}])
  expect(verified.length).toBe(1);expect(blocked.length).toBe(1)
 })
 it('grades a wrong answer as wrong and an invalid answer as null',()=>{
  expect(gradeBinary(direct,'did_not')?.correct).toBe(false)
  expect(gradeBinary(direct,'maybe' as never)).toBeNull()
 })
 it('deals the whole verified bank, deterministically',()=>{
  const rows=Array.from({length:6},(_,i)=>({...direct,id:`d${i}`}))
  expect(dealBinary(rows,1).length).toBe(6)
  expect(dealBinary(rows,1)).toEqual(dealBinary(rows,1))
 })
})

describe('BF-R07/R08 counts and score',()=>{
 it('uses actual denominators with subtotals',()=>{
  const r=fileResult([{module:'binary',correct:true},{module:'binary',correct:false},{module:'order',correct:true},{module:'order',correct:true},{module:'order',correct:false}])
  expect(r).toEqual({correct:3,asked:5,binary:{correct:1,asked:2},order:{correct:2,asked:3}})
  expect(fileResult([])).toEqual({correct:0,asked:0,binary:{correct:0,asked:0},order:{correct:0,asked:0}})
 })
 it('mode matrix: locked / limited / full with exact counts',()=>{
  const direct:BinaryRow={id:'d',person:'P',from:'A',to:'B',proposition:'direct',career:[T('A','B')],claim:'crossed'}
  const none=blackFileMode([],days(1))
  expect(none.state).toBe('locked');expect(none.pairs).toBe(0);expect(none.blocker).toBe('BLACKFILE_BINARY_MISSING')
  const dates=blackFileMode([],days(8))
  expect(dates.state).toBe('limited');expect(dates.pairs).toBe(4);expect(dates.binary).toBe(0)
  expect(blackFileMode([],days(3)).pairs).toBe(1)
  expect(blackFileMode([],days(3)).itemsShort).toBe(5)
  expect(blackFileMode([direct],days(0)).state).toBe('limited')
  expect(blackFileMode([direct],days(8)).state).toBe('full')
  expect(blackFileMode([direct],days(6)).state).toBe('limited')
  const unproven=blackFileMode([{...direct,id:'u',claim:'did_not',career:[]}],days(8))
  expect(unproven.blocker).toBe('BLACKFILE_NEGATIVE_UNPROVEN')
  expect(unproven.state).toBe('limited')
 })
})
