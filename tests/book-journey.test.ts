import {describe,expect,it} from 'vitest'
import {arrival,dueLetter,stations,stepLetter,type JourneyOrder} from '@/lib/book/journey'
import {journeyPage,missingPage} from '@/lib/book/journeyPage'
import {bookMail} from '@/lib/book/mail'

const T0=Date.parse('2026-11-22T08:53:00Z'),DAY=86400000
const pb=(o:Partial<JourneyOrder>={}):JourneyOrder=>({kind:'paperback',status:'paid',lang:'he',region:'eu',ship:'standard',lulu_status:null,paid_at:new Date(T0).toISOString(),shipped_at:null,mails:{},...o})

describe('Broken Collective · the reader\'s journey (23.11.2026)',()=>{
 it('owes the letter of the step the order is at',()=>{
  expect(stepLetter(pb())).toBe('received')
  expect(stepLetter(pb({status:'printing',lulu_status:'PRODUCTION_READY'}))).toBe('printing')
  expect(stepLetter(pb({status:'printing',lulu_status:'IN_PRODUCTION'}))).toBe('press')
  expect(stepLetter(pb({kind:'tee',status:'printing'}))).toBe('making')
  expect(stepLetter(pb({kind:'tip',status:'done'}))).toBe('tip')
 })
 it('the live order of 22.11 (on the press, no letter recorded) is owed "the press is running"',()=>{
  expect(dueLetter(pb({status:'printing',lulu_status:'IN_PRODUCTION'}))).toBe('press')
 })
 it('sends each letter once, never an earlier one after a later one, and stops after five failures',()=>{
  const at='2026-11-22T10:00:00Z'
  expect(dueLetter(pb({mails:{received:{at,id:'r1'}}}))).toBeNull()
  expect(dueLetter(pb({status:'printing',lulu_status:'CREATED',mails:{press:{at,id:'p1'}}}))).toBeNull()
  expect(dueLetter(pb({status:'printing',lulu_status:'IN_PRODUCTION',mails:{press:{at,err:'x',n:2}}}))).toBe('press')
  expect(dueLetter(pb({status:'printing',lulu_status:'IN_PRODUCTION',mails:{press:{at,err:'x',n:5}}}))).toBeNull()
 })
 it('asks "has it arrived?" only after the post\'s window, and never months later',()=>{
  const shipped=pb({status:'shipped',shipped_at:new Date(T0).toISOString(),mails:{shipped:{at:'x',id:'s'}}})
  const w=arrival(shipped)!
  expect(Date.parse(w.to)-T0).toBe(20*DAY) // EU standard: 14 working days → 20 calendar days
  expect(dueLetter(shipped,T0+5*DAY)).toBeNull()
  expect(dueLetter(shipped,Date.parse(w.to)+4*DAY)).toBe('after')
  expect(dueLetter(shipped,T0+90*DAY)).toBeNull()
 })
 it('draws the thread: paperback has five stations and stands on the press',()=>{
  const s=stations(pb({status:'printing',lulu_status:'IN_PRODUCTION'}))
  expect(s.list.map(x=>x.key)).toEqual(['paid','printer','press','posted','hands']);expect(s.at).toBe(2)
  expect(stations(pb({kind:'cap',status:'shipped',shipped_at:new Date(T0).toISOString()}),T0+DAY).at).toBe(2)
 })
 it('renders the journey page in the reader\'s language, without personal details',()=>{
  const h=journeyPage({...pb({status:'printing',lulu_status:'IN_PRODUCTION'}),id:'bk_3lZ5i6q80ArT',variant:'both',tracking:null},T0+DAY)
  expect(h).toContain('dir="rtl"');expect(h).toContain('הדפוס רץ.');expect(h).toContain('aria-current="step"')
  expect(h).toContain('noindex');expect(h).toContain('Dubel Team');expect(h).not.toMatch(/#ff[de]|yellow/i)
  const e=journeyPage({...pb({lang:'en',status:'shipped',shipped_at:new Date(T0).toISOString(),lulu_status:'SHIPPED'}),id:'bk_abcdefgh',variant:'en',tracking:{urls:['https://track.example/1']}},T0+DAY)
  expect(e).toContain('dir="ltr"');expect(e).toContain('https://track.example/1');expect(e).toContain('Expected between')
  expect(missingPage('en')).toContain('could not find')
 })
 it('every letter links to the journey, the tip does not',()=>{
  expect(bookMail('press','he',{order:'bk_abcdefgh'}).html).toContain('/book/order/bk_abcdefgh')
  expect(bookMail('after','en',{order:'bk_abcdefgh'}).text).toContain('/book/order/bk_abcdefgh')
  expect(bookMail('tip','en',{order:'bk_abcdefgh'}).html).not.toContain('/book/order/')
 })
})
