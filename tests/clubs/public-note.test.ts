import {describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {publicNote} from '@/lib/clubs/public-note'
import {CORE_CLUB_IDS,loadClub} from '@/lib/clubs/resolver'
import {archiveProjection} from '@/lib/clubs/archive-door'

const PRIVATE=/owner|maor|harel|in chat|approv|מאשר|מאושר/i
describe('who approved what never reaches a reader (17.11.2026)',()=>{
 it('drops approval sentences and keeps the research',()=>{
  expect(publicNote('Approved by the owner in chat on 2026-10-09 (blanket approval of all staged values).')).toBeNull()
  expect(publicNote('Wikipedia only. Approved by the owner in chat on 2026-10-09 (blanket approval of all staged values).')).toBe('Wikipedia only.')
  expect(publicNote("Date, 3-1 and the late goal agree. Only ESPN gives an XI, so lineup omitted.")).toBe("Date, 3-1 and the late goal agree. Only ESPN gives an XI, so lineup omitted.")
  expect(publicNote('Opening 1958 from two sources; capacity conflicts (7,255 / 9,000) so left null.')).toBe('Opening 1958 from two sources; capacity conflicts (7,255 / 9,000) so left null.')
  expect(publicNote(null)).toBeNull()
 })
 for(const id of CORE_CLUB_IDS)it(`${id}: no archive note names an approval or a person`,{timeout:120000},async()=>{
  const r=(await loadClub(id))!,{entries}=archiveProjection(r.data)
  const bad=entries.filter(e=>e.note&&PRIVATE.test(e.note)).map(e=>`${e.id}: ${e.note}`)
  expect(bad.slice(0,5)).toEqual([])
 })
})
