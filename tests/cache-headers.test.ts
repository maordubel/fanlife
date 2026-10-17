import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
describe('static art caching',()=>{
 it('caches the big art folders and never the service worker',()=>{
  const cfg=readFileSync('next.config.mjs','utf8')
  expect(cfg).toMatch(/async headers\(\)/)
  for(const d of ['life','kits','brand','legends'])expect(cfg).toContain(`'${d}'`)
  expect(cfg).not.toMatch(/sw\.js/)
 })
})
