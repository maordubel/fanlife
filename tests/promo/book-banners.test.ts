import {describe,expect,it} from 'vitest'
import {existsSync} from 'node:fs'
import {audienceAllows,cleanBanner,eligible,pageOf} from '@/lib/promo/rules'
import {SEED_BOOK,SEED_DOC} from '@/lib/promo/seed'
import {familyOf} from '@/lib/universe/attention'

const WED=Date.parse('2026-10-14T09:00:00Z') // Wed 12:00 Athens
const SUN=Date.parse('2026-11-15T10:00:00Z') // Sun 12:00 Athens
const SUN_LATE=Date.parse('2026-11-15T18:30:00Z') // Sun 20:30 Athens, after the premiere
const ids=(now:number,israel:boolean,page=pageOf(null,'/'))=>eligible(SEED_DOC,page,now,{israel}).map(b=>b.id).filter(id=>id.startsWith('book')||id.startsWith('kypseli')).sort()

describe('the book and the channel banners',()=>{
 it('Israeli visitors get only the Hebrew twins, everyone else only the English ones',()=>{
  expect(ids(WED,true)).toEqual(['book-he','kypseli-he'])
  expect(ids(WED,false)).toEqual(['book-en','kypseli-en'])
 })
 it('on every kind of page, and never on the control room',()=>{
  for(const p of [pageOf('hapoel-tel-aviv','/clubs/hapoel-tel-aviv'),pageOf('olympiacos','/clubs/olympiacos'),pageOf(null,'/market')])expect(ids(WED,false,p)).toEqual(['book-en','kypseli-en'])
  expect(ids(WED,false,pageOf(null,'/master/admin'))).toEqual([])
 })
 it('Sunday before 19:00 Athens adds the "new tape tonight" banner; after the premiere it is gone',()=>{
  expect(ids(SUN,false)).toContain('kypseli-sunday-en')
  expect(ids(SUN,true)).toContain('kypseli-sunday-he')
  expect(ids(SUN_LATE,false)).not.toContain('kypseli-sunday-en')
  expect(ids(WED,false)).not.toContain('kypseli-sunday-en')
 })
 it('twins and the Sunday variant are one family each, so a visit never shows the same product twice',()=>{
  for(const b of SEED_BOOK)expect(familyOf(b.id,b.href)).toBe(b.id.startsWith('book')?'book':'kypseli')
 })
 it('the "world" audience is everyone outside Israel, and survives the control room\'s write path',()=>{
  const b=cleanBanner({...SEED_BOOK[1],audience:'world'})
  expect(b.audience).toBe('world')
  expect(audienceAllows(b,{israel:false},pageOf(null,'/'))).toBe(true)
  expect(audienceAllows(b,{israel:true},pageOf(null,'/'))).toBe(false)
  expect(audienceAllows(b,{israel:false,greece:true},pageOf(null,'/'))).toBe(true)
 })
 it('every banner is valid, links over https and ships its art at 1× and 2×',()=>{
  for(const b of SEED_BOOK){
   expect(cleanBanner(b)).toEqual(b)
   expect(b.href.startsWith('https://')).toBe(true)
   expect(existsSync('public'+b.img1x)&&existsSync('public'+b.img2x)).toBe(true)
  }
 })
})
