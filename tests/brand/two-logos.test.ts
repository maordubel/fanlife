import {describe,expect,it} from 'vitest'
import {readFileSync,readdirSync,statSync} from 'node:fs'
import {join} from 'node:path'
import {editionOf,FANLIFE_LOGO,markFor,WORKER_BADGE} from '@/lib/brand/logos'

/** docs/rules/two-logos.md — THE WORKER's badge never reaches a FAN LIFE surface by a typed path */
const WORKER_ONLY:Record<string,string>={
 'lib/brand/logos.ts':'the one place both marks are named',
 'scripts/brand/og-cards.mjs':"THE WORKER's Hebrew gate cards (public/og/*), served on Hapoel's host",
}
const ROOTS=['app','components','lib','scripts'],EXT=/\.(tsx?|css|mjs|js|py)$/
const RAW=/(?<!legends)\/brand\/logo[-.]|public\/brand\/logo[-.]/
function* walk(d:string):Generator<string>{for(const n of readdirSync(d)){const p=join(d,n);if(n==='node_modules'||n.startsWith('.'))continue;if(statSync(p).isDirectory())yield* walk(p);else if(EXT.test(n))yield p}}

describe('two logos (rule two-logos)',()=>{
 it('no file types THE WORKER badge path outside the allow-list',()=>{
  const bad=ROOTS.flatMap(r=>[...walk(r)]).filter(f=>!(f in WORKER_ONLY)&&readFileSync(f,'utf8').split('\n').some(l=>RAW.test(l)))
  expect(bad,'use FANLIFE_LOGO / markFor from lib/brand/logos.ts').toEqual([])
 })
 it('FAN LIFE everywhere but Hapoel’s own host',()=>{
  expect(editionOf('fanlife.dubelteam.com')).toBe('fanlife')
  expect(editionOf(null)).toBe('fanlife')
  expect(markFor('fanlife.dubelteam.com')).toBe(FANLIFE_LOGO[512])
  expect(Object.values(FANLIFE_LOGO).every(p=>p.startsWith('/brand/fanlife/'))).toBe(true)
  expect(Object.values(WORKER_BADGE).every(p=>!p.includes('fanlife'))).toBe(true)
 })
 it('the album sticker press stamps the FAN LIFE roundel',()=>{
  const py=readFileSync('scripts/album/stickers.py','utf8')
  expect(py).toContain('brand/fanlife/logo-512.png')
 })
})
