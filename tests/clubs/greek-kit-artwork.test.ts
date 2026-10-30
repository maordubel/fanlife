import {describe,expect,it,vi} from 'vitest'
import {readFileSync} from 'node:fs'
vi.mock('server-only',()=>({}))
import {kitArchiveImage,kitArt} from '@/lib/clubs/kit-sources'

describe('2025/26 home kit illustrations',()=>{
 it.each([
  ['olympiacos','cof-k-69','Stoiximan'],
  ['panathinaikos','cof-k-59','A Little Shelter'],
 ])('%s: exports the record with its embedded artwork', (club,id,sponsor)=>{
  const svg=readFileSync(`public/club-kits/${club}/svg/${id}.svg`,'utf8')
  expect(svg).toContain(`data-sponsor="${sponsor}"`)
  expect(svg).toContain('data:image/svg+xml;base64,')
  const art=kitArt(club,id,'2025/26','home')
  expect(art?.illustrated).toBe(true)
  expect(kitArchiveImage(null,art)).toBe(`/club-kits/${club}/svg/${id}.svg`)
 })
 it('gives Olympiacos the referenced broad red stripes',()=>{
  const svg=readFileSync('public/club-kits/olympiacos/svg/cof-k-69.svg','utf8')
  expect(svg).toContain('x="151" y="20" width="38"')
  expect(svg).toContain('M111 30Q79 38 56 61')
 })
})
