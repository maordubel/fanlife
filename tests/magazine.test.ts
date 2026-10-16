import {describe,expect,it} from 'vitest'
import {readFileSync,existsSync,readdirSync,statSync} from 'node:fs'
import {join} from 'node:path'
import native from './fixtures/worker-native-pages.json'
import {isYellow} from '@/lib/isYellow'

const root=process.cwd()
const read=(p:string)=>readFileSync(join(root,p),'utf8')
const pages=(dir:string):string[]=>readdirSync(join(root,dir)).flatMap(n=>{const p=`${dir}/${n}`;return statSync(join(root,p)).isDirectory()?pages(p):n==='page.tsx'?[p]:[]})

/** A thin route can return another app page; follow that actual call rather than exempting the route. */
function magazinePage(page:string,load:(p:string)=>string=read,seen=new Set<string>()):boolean {
 if(seen.has(page))return false
 const visited=new Set(seen).add(page)
 let source:string
 try{source=load(page)}catch{return false}
 if(/Shell|ClubSurface|FanPage/.test(source))return true
 for(const match of source.matchAll(/import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]@\/(app\/[^'"]+\/page)['"]/g)){
  const name=match[1]!,target=match[2]!+'.tsx'
  // Importing a dressed page without returning/rendering it does not dress this page.
  const called=new RegExp(`return\\s+(?:await\\s+)?${name}\\s*\\(`).test(source)
  const rendered=new RegExp(`<${name}(?:\\s|/|>)`).test(source)
  if((called||rendered)&&magazinePage(target,load,visited))return true
 }
 return false
}

describe('the magazine is the house style (rule 91)',()=>{
 it('every page is dressed as the magazine, or is a named Worker-native page',()=>{
  const allowed=new Set(native.pages)
  // FanPage (components/fanlife/FanPage.tsx) is the Shell plus the corner's header — the same dress
  const bad=pages('app').filter(p=>!magazinePage(p)&&!allowed.has(p))
  expect(bad,`new pages must wrap in Shell or ClubSurface: ${bad.join(', ')}`).toEqual([])
 })
 it('only follows a returned shared page, and still rejects undressed pages and cycles',()=>{
  const fixture:Record<string,string>={
   'app/shared/page.tsx':'export default function Page(){return <ClubSurface />}',
   'app/empty/page.tsx':'export default function Page(){return <main />}',
   'app/delegate/page.tsx':"import Shared from '@/app/shared/page'; export default function Page(){return Shared({})}",
   'app/unused/page.tsx':"import Shared from '@/app/shared/page'; export default function Page(){return <main />}",
   'app/undressed/page.tsx':"import Shared from '@/app/empty/page'; export default function Page(){return Shared({})}",
   'app/a/page.tsx':"import Other from '@/app/b/page'; export default function Page(){return Other({})}",
   'app/b/page.tsx':"import Other from '@/app/a/page'; export default function Page(){return Other({})}",
  }
  const load=(p:string)=>{if(!(p in fixture))throw new Error('missing page');return fixture[p]!}
  expect(magazinePage('app/delegate/page.tsx',load)).toBe(true)
  for(const p of ['app/empty/page.tsx','app/unused/page.tsx','app/undressed/page.tsx','app/a/page.tsx','app/missing/page.tsx'])expect(magazinePage(p,load),p).toBe(false)
 })
 it('the Worker-native list only shrinks: every entry still exists and still is not magazine',()=>{
  for(const p of native.pages){expect(existsSync(join(root,p)),p).toBe(true);expect(/Shell|ClubSurface/.test(read(p)),`${p} now uses the magazine — remove it from the list`).toBe(false)}
 })
 it('the shell carries the credit, the tab bar and the masthead',()=>{
  const s=read('components/master/Shell.tsx')
  expect(s).toContain('https://DubelTeam.com');expect(s).toContain('<TabBar');expect(read('components/master/TabBar.tsx')).toContain('mag-tabbar');expect(s).toContain('mag-top');expect(s).toContain('mag-foot')
 })
 it('the stylesheet defines the tokens, self-hosts the weekly faces and names yellow once, as a re-pointable token (rules 95, 124)',()=>{
  const css=read('app/magazine.css')
  for(const t of ['--mag-ink','--mag-paper','--mag-vermilion','--mag-navy','--mag-purple','--mag-green','--mag-orange','--mag-goal','--mag-shout'])expect(css).toContain(t)
  for(const f of ['shrikhand-latin-ext-400-normal','knewave-latin-ext-400-normal','ultra-latin-ext-400-normal','weekly-head-latin-ext','weekly-caps-latin-ext','weekly-body-latin-ext'])expect(existsSync(join(root,`public/fonts/${f}.woff2`)),f).toBe(true)
  // the weekly's one highlighter ink lives on ONE line; every other hex in the house stylesheet is not yellow
  const yellowLine=css.split('\n').filter(l=>/--mag-yellow:\s*#/.test(l))
  expect(yellowLine).toHaveLength(1)
  for(const [,hex] of css.split('\n').filter(l=>!/--mag-yellow:\s*#/.test(l)).join('\n').matchAll(/#([0-9a-f]{6})\b/gi)){const n=parseInt(hex!,16);expect(isYellow((n>>16)&255,(n>>8)&255,n&255),`#${hex} is yellow`).toBe(false)}
  // and a club whose rival owns yellow never prints it: the token is re-pointed (Hapoel Tel Aviv)
  expect(css).toMatch(/\[data-rival-no~='yellow'\]\s*\{[^}]*--mag-yellow:\s*var\(--mag-orange\)/)
 })
 it('a club is worn only through its livery variable',()=>{
  const css=read('app/magazine.css')
  expect(css).toContain('--club-primary');expect(css).toContain("data-livery='stripes'");expect(css).toContain("data-livery='sash'")
 })
})
