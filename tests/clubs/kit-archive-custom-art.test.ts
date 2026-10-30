import {describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {kitArchiveImage,kitArt} from '@/lib/clubs/kit-sources'

describe('club archive artwork',()=>{
 it('uses the specific Celtic illustration if no photograph is available',()=>{
  const art=kitArt('celtic','cof-k-67','2024/25','home')
  expect(art?.illustrated).toBe(true)
  expect(kitArchiveImage(null,art)).toBe('/club-kits/celtic/svg/cof-k-67.svg')
 })
 it('keeps a real photo ahead of the illustration',()=>{
  const art=kitArt('celtic','cof-k-67','2024/25','home')
  expect(kitArchiveImage('/photo.jpg',art)).toBe('/photo.jpg')
 })
 it('keeps the catalogue picture for a shirt without specific artwork',()=>{
  const art=kitArt('celtic','cof-k-63','2023/24','home')
  expect(art?.illustrated).toBe(false)
  expect(kitArchiveImage(null,art)).toBe(art?.image)
  expect(kitArchiveImage(null,null)).toBeNull()
 })
})
