import {describe,expect,it} from 'vitest'
import {dealFile,gradeCrossingBy,gradeOrderBy,maskFor,publicFile,scopeOf} from '@/lib/clubs/blackfile-deal'
import {fixtureBinary,fixtureItems} from '@/lib/clubs/rivalry-fixture'

const src={binary:fixtureBinary(),items:fixtureItems(10)}
const lookup=(id:string)=>({title:`Source ${id}`,url:null,publisher:'Fixture'})
const scope=scopeOf('fx','v1',7,0)

describe('Black File server deal',()=>{
 const deal=dealFile(src,7,0),pub=publicFile(deal,scope)
 it('deals the whole verified bank (the unproven negative stays out) and four pairs, with the real total',()=>{
  expect(deal.binary.length).toBe(4)
  expect(deal.pairs.length).toBe(4)
  expect(pub.total).toBe(8)
  expect(pub.binary.length+pub.pairs.length).toBe(pub.total)
 })
 it('the public file carries no date, id, path or answer',()=>{
  const json=JSON.stringify(pub)
  for(const leak of ['fx-b','fx-e','claim','career','crossed','did_not','sources','negativeProof','earlier','"on"','2001-','Fixture source'])expect(json,leak).not.toContain(leak)
  expect(json).not.toMatch(/\d{4}-\d{2}-\d{2}/)
 })
 it('keys are scoped: the same item has another key in another run',()=>{
  const other=publicFile(dealFile(src,7,0),scopeOf('fx','v2',7,0))
  expect(other.pairs[0]?.key).not.toBe(pub.pairs[0]?.key)
  expect(maskFor(scope)('pair','x')).toBe(maskFor(scope)('pair','x'))
 })
 it('grades an order pick by key and reveals who/when/source',()=>{
  const p=deal.pairs[0]!,pp=pub.pairs[0]!
  const earlierKey=p.earlier==='a'?pp.a.key:pp.b.key,laterKey=p.earlier==='a'?pp.b.key:pp.a.key
  const ok=gradeOrderBy(deal,scope,pp.key,earlierKey,lookup)!
  expect(ok.correct).toBe(true);expect(ok.earlier.on<ok.later.on).toBe(true);expect(ok.days).toBeGreaterThan(0);expect(ok.earlier.sources.length).toBe(1)
  expect(gradeOrderBy(deal,scope,pp.key,laterKey,lookup)!.correct).toBe(false)
  expect(gradeOrderBy(deal,scope,'nope',earlierKey,lookup)).toBeNull()
  expect(gradeOrderBy(deal,scope,pp.key,'nope',lookup)).toBeNull()
  expect(gradeOrderBy(deal,scopeOf('fx','v1',8,0),pp.key,earlierKey,lookup)).toBeNull()
 })
 it('grades a crossing by key and reveals the whole path, intermediate clubs included',()=>{
  for(const pb of pub.binary){
   const row=deal.binary[pub.binary.indexOf(pb)]!
   const truth=gradeCrossingBy(deal,scope,pb.key,'crossed',lookup)!
   expect(truth.person).toBe(row.person)
   expect(truth.clubs.length).toBeGreaterThanOrEqual(2)
   expect(truth.sources.length).toBeGreaterThan(0)
   expect(gradeCrossingBy(deal,scope,pb.key,truth.answer==='crossed'?'did_not':'crossed',lookup)!.correct).toBe(false)
   expect(gradeCrossingBy(deal,scope,pb.key,truth.answer,lookup)!.correct).toBe(true)
  }
  expect(gradeCrossingBy(deal,scope,'nope','crossed',lookup)).toBeNull()
  expect(gradeCrossingBy(deal,scope,pub.binary[0]!.key,'maybe',lookup)).toBeNull()
  const via=deal.binary.findIndex(r=>r.id==='fx-b2')
  expect(gradeCrossingBy(deal,scope,pub.binary[via]!.key,'crossed',lookup)!.clubs).toEqual(['Fixture club A','Fixture club C','Fixture club B'])
 })
})
