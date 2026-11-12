import {describe,expect,it} from 'vitest'
import {existsSync,readFileSync} from 'node:fs'
import {LOGO_MAP} from '@/ecosystem/crests/index.mjs'
import {universeCrest} from '@/lib/crests/universe'

describe('Cloud Run bundle (12.11.2026)',()=>{
 const wf=readFileSync('.github/workflows/deploy-cloudrun.yml','utf8')
 it('copies public/ INTO the standalone public folder — `cp -a public $B/public` made public/public and the logo, plates, fonts and ads 404ed',()=>{
  expect(wf).toContain('cp -a public/. $B/public/')
  expect(wf).not.toMatch(/cp -a public \$B\/public\s*$/m)
 })
 it('builds the browser bundle with the public Supabase key, or the site falls back to the device-only preview',()=>{
  expect(wf).toMatch(/NEXT_PUBLIC_SUPABASE_ANON_KEY: \$\{\{ vars\.NEXT_PUBLIC_SUPABASE_ANON_KEY \|\| 'eyJ/)
 })
})

describe('the universe crests are served from FAN LIFE',()=>{
 it('every slug in the library has its file in public/universe-crests',()=>{
  const missing=[...new Set(Object.values(LOGO_MAP))].filter(s=>!existsSync(`public/universe-crests/${s}.png`))
  expect(missing).toEqual([])
 })
 it('resolves a name to the local path, and an unknown name to null',()=>{
  expect(universeCrest('Celtic FC')).toBe('/universe-crests/celtic-fc.png')
  expect(universeCrest('Nobody United of Nowhere')).toBeNull()
 })
})
