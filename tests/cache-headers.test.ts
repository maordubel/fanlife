import {describe,expect,it} from 'vitest'
import config from '../next.config.mjs'
describe('static art caching',()=>{
 it('caches the big art folders and never the service worker',async()=>{
  const h=await config.headers!()
  const sources=h.map(x=>x.source)
  expect(sources).toContain('/life/:path*');expect(sources).toContain('/kits/:path*')
  expect(sources.some(s=>s.includes('sw.js'))).toBe(false)
 })
})
