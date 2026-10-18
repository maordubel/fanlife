import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {precompiledEnabled} from '@/lib/clubs/precompiled'

describe('pre-compiled club packs (performance, 11.10.2026)',()=>{
 it('are read in production only — never in development or under the test runner',()=>{
  expect(precompiledEnabled({NODE_ENV:'production'})).toBe(true)
  expect(precompiledEnabled({NODE_ENV:'development'})).toBe(false)
  expect(precompiledEnabled({NODE_ENV:'production',VITEST:'true'})).toBe(false)
  expect(precompiledEnabled({NODE_ENV:'production',FANLIFE_PRECOMPILED:'off'})).toBe(false)
  expect(precompiledEnabled(process.env)).toBe(false) // this very run compiles
 })
 it('the resolver falls back to compiling on any miss, and the build writes them first',()=>{
  const r=readFileSync('lib/clubs/resolver.ts','utf8')
  expect(r).toMatch(/readPrecompiled\(id\)\.then\(pre=>pre\?\?compilePath\(\)\.then\(m=>m\.providers\[id\]!\(\)/)
  const pkg=JSON.parse(readFileSync('package.json','utf8')) as {scripts:Record<string,string>}
  expect(pkg.scripts.build).toBe('npm run clubs:precompile && next build')
  expect(JSON.parse(readFileSync('vercel.json','utf8')).buildCommand).toBe('npm run build')
  const s=readFileSync('scripts/clubs/precompile.ts','utf8')
  expect(s).toMatch(/FANLIFE_PRECOMPILED='off'/) // never copies an older file
  expect(s.lastIndexOf('manifest.json')).toBeGreaterThan(s.lastIndexOf('`${id}.json`')) // manifest last
  expect(readFileSync('.gitignore','utf8')).toMatch(/^content\/compiled\/$/m)
 })
})
