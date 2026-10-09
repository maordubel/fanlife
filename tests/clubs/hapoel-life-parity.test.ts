import {describe,expect,it} from 'vitest'
import {readFileSync,readdirSync,statSync} from 'node:fs'
import {join} from 'node:path'

const read=(p:string)=>readFileSync(p,'utf8')
const walk=(d:string):string[]=>readdirSync(d).flatMap(n=>{const p=join(d,n);return statSync(p).isDirectory()?walk(p):[p]})

describe('Hapoel Tel Aviv LIFE is the same LIFE as every club',()=>{
 it('the entry rule names no club and has no door of its own',()=>{
  const s=read('lib/clubs/life/entry.ts')
  expect(s).not.toMatch(/hapoel/i);expect(s).not.toMatch(/native/);expect(s).not.toMatch(/['"]\/life['"]/)
 })
 it('the universal LIFE surface names no club and links to no hand-authored original',()=>{
  for(const f of ['app/clubs/[slug]/life/page.tsx','components/clubs/life/LifeGame.tsx','lib/clubs/life/pack.ts']){
   const s=read(f);expect(s,f).not.toMatch(/hapoel-tel-aviv/);expect(s,f).not.toMatch(/legacyHref/)
  }
 })
 it('configuration lives in the club pack, presentation never reads The Worker masters',()=>{
  const allowed=/^lib\/(clubs\/feeds\/|clubs\/adapters\/hapoel)/
  const masters=/@\/lib\/archive\/(match|player)-master|content\/generated\/(kit|match|player)-master/
  for(const f of walk('components/clubs').concat(walk('lib/life/universal'),walk('lib/clubs/life'))){
   if(!/\.(ts|tsx)$/.test(f)||allowed.test(f))continue
   expect(read(f),f).not.toMatch(masters)
  }
 })
})
