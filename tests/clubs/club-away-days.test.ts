import {describe,expect,it} from 'vitest'
import {clubAwayData,bySeason,countryName,hasClubAway} from '@/lib/away-days/club'

describe('club AWAY DAYS (Zrinjski, from UEFA)',()=>{
 const d=clubAwayData('zrinjski-mostar')!
 it('is built and only for clubs that have a build',()=>{expect(d).toBeTruthy();expect(hasClubAway('celtic')).toBe(false)})
 it('every visit has a ground with coordinates and a result that matches its score',()=>{
  const st=new Map(d.stadiums.map(s=>[s.id,s]))
  expect(d.visits.length).toBe(d.counts.matches)
  for(const v of d.visits){
   const s=st.get(v.venueId);expect(s).toBeTruthy();expect(Math.abs(s!.lat)).toBeLessThan(90);expect(Math.abs(s!.lng)).toBeLessThan(180)
   expect(v.result).toBe(v.scoreFor>v.scoreAgainst?'W':v.scoreFor<v.scoreAgainst?'L':'D')
  }
  expect(new Set(d.visits.map(v=>v.id)).size).toBe(d.visits.length)
 })
 it('away means the ground is outside the home country, whichever side was drawn at home',()=>{
  const st=new Map(d.stadiums.map(s=>[s.id,s]))
  for(const v of d.visits)expect(v.physicallyAbroad).toBe(st.get(v.venueId)!.countryCode!==d.homeCountry)
  expect(d.visits.filter(v=>v.physicallyAbroad).length).toBe(d.counts.abroad)
 })
 it('starts in 2000 and groups by season, newest first',()=>{
  expect(d.visits[0]!.playedOn.startsWith('2000')).toBe(true)
  const g=bySeason(d.visits);expect(g[0]!.season>g[g.length-1]!.season).toBe(true)
 })
 it('names countries in both languages',()=>{expect(countryName('ENG','en')).toBe('England');expect(countryName('SWE','he').length).toBeGreaterThan(2)})
})
