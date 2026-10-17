import {describe,expect,it} from 'vitest'
import {isPinned,readCursor,readSeed} from '@/lib/rotation/deck'
describe('link numbers',()=>{
 it('refuse absurd values instead of seeding from them',()=>{
  expect(isPinned('1e300')).toBe(false)
  expect(readCursor('1e300')).toBe(0)
  expect(readSeed('1e300',()=>7)).toBe(7)
  expect(readSeed('42',()=>7)).toBe(42)
  expect(isPinned('95')).toBe(true)
 })
})
