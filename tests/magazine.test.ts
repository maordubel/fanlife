import {describe,expect,it} from 'vitest'
import {readFileSync,existsSync,readdirSync,statSync} from 'node:fs'
import {join} from 'node:path'
import native from './fixtures/worker-native-pages.json'
import {isYellow} from '@/lib/isYellow'

const root=process.cwd()
const read=(p:string)=>readFileSync(join(root,p),'utf8')
const pages=(dir:string):string[]=>readdirSync(join(root,dir)).flatMap(n=>{const p=`${dir}/${n}`;return statSync(join(root,p)).isDirectory()?pages(p):n==='page.tsx'?[p]:[]})

describe('the magazine is the house style (rule 91)',()=>{
 it('every page is dressed as the magazine, or is a named Worker-native page',()=>{
  const allowed=new Set(native.pages)
  const bad=pages('app').filter(p=>!/Shell|ClubSurface/.test(read(p))&&!allowed.has(p))
  expect(bad,`new pages must wrap in Shell or ClubSurface: ${bad.join(', ')}`).toEqual([])
 })
 it('the Worker-native list only shrinks: every entry still exists and still is not magazine',()=>{
  for(const p of native.pages){expect(existsSync(join(root,p)),p).toBe(true);expect(/Shell|ClubSurface/.test(read(p)),`${p} now uses the magazine — remove it from the list`).toBe(false)}
 })
 it('the shell carries the credit, the tab bar and the masthead',()=>{
  const s=read('components/master/Shell.tsx')
  expect(s).toContain('https://DubelTeam.com');expect(s).toContain('mag-tabbar');expect(s).toContain('mag-top');expect(s).toContain('mag-foot')
 })
 it('the stylesheet defines the tokens, self-hosts the display face and never names a yellow',()=>{
  const css=read('app/magazine.css')
  for(const t of ['--mag-ink','--mag-paper','--mag-vermilion','--mag-navy','--mag-purple','--mag-green'])expect(css).toContain(t)
  expect(existsSync(join(root,'public/fonts/bowlby-one-latin-400-normal.woff2'))).toBe(true)
  for(const [,hex] of css.matchAll(/#([0-9a-f]{6})\b/gi)){const n=parseInt(hex!,16);expect(isYellow((n>>16)&255,(n>>8)&255,n&255),`#${hex} is yellow`).toBe(false)}
 })
 it('a club is worn only through its livery variable',()=>{
  const css=read('app/magazine.css')
  expect(css).toContain('--club-primary');expect(css).toContain("data-livery='stripes'");expect(css).toContain("data-livery='sash'")
 })
})
