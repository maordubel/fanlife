import {describe,expect,it} from 'vitest'
import {addDay,streakOf} from '@/lib/clubs/streak'
describe('per-club streak',()=>{
 it('counts consecutive days, alive until a day is missed',()=>{
  const d=['2026-10-16','2026-10-17','2026-10-18']
  expect(streakOf(d,'2026-10-18')).toBe(3)
  expect(streakOf(d,'2026-10-19')).toBe(3)
  expect(streakOf(d,'2026-10-20')).toBe(0)
 })
 it('is idempotent per day and crosses month ends',()=>{
  expect(addDay(['2026-10-19'],'2026-10-19')).toEqual(['2026-10-19'])
  expect(streakOf(['2026-09-30','2026-10-01'],'2026-10-01')).toBe(2)
 })
})
