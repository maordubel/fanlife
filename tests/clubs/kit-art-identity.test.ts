import {describe, expect, it, vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {matchKitArt, type KitArtRow} from '@/lib/clubs/kit-sources'

const row = (id:string, extras:Partial<KitArtRow>={}):KitArtRow => ({id,season:'2013/14',type:'home',euro:false,image:`/${id}.png`,...extras})
describe('kit artwork identity',()=>{
 it('uses an exact record or an explicit unique alias before any season fallback',()=>{
  const rows=[row('league'),row('cup')]
  expect(matchKitArt(rows,'olympiacos','olympiacos:cup','2013/14','home')?.id).toBe('cup')
  expect(matchKitArt(rows,'olympiacos','other','2013/14','home',['olympiacos:league'])?.id).toBe('league')
 })
 it('does not guess between multiple candidates or conflicting aliases',()=>{
  const rows=[row('stoixima'),row('unicef')]
  expect(matchKitArt(rows,'olympiacos','other','2013/14','home')).toBeNull()
  expect(matchKitArt(rows,'olympiacos','other','2013/14','home',['stoixima','unicef'])).toBeNull()
 })
 it('only uses a fallback when a single non-European candidate exists',()=>{
  const rows=[row('league'),row('europe',{euro:true})]
  expect(matchKitArt(rows,'x','unknown','2013/14','home')?.id).toBe('league')
  expect(matchKitArt(rows,'x','unknown','2012/13','home')).toBeNull()
 })
})
