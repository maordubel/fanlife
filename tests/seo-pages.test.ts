import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import {clubSubMetadata,GATE_DESCRIPTION} from '@/lib/seo/club'
import {SHARED_GATES} from '@/lib/clubs/gates'

const read=(p:string)=>readFileSync(p,'utf8')
const words=(p:string)=>read(p).replace(/\{[^}\n]*\}/g,' ').replace(/<[^>]+>/g,' ').split(/\s+/).filter(w=>/[a-z]/i.test(w)).length

/** SEO pass, 30.10.2026 — docs/fanlife/ADSENSE-APPROVAL.md §3 and the crawl that found the gaps. */
describe('SEO: the publisher pages and the club pages',()=>{
 it('about, privacy, terms and contact exist with a title, a description and their own canonical',()=>{
  for(const p of ['about','privacy','terms','contact']){
   const s=read(`app/${p}/page.tsx`)
   expect(s,p).toMatch(/title:'/)
   expect(s,p).toMatch(/description:'/)
   expect(s,p).toContain(`canonical:\`\${SITE_URL}/${p}\``)
   expect(words(`app/${p}/page.tsx`),p).toBeGreaterThan(300)
  }
 })
 it('the page frame links back to dubelteam.com/games.html and every footer names the four pages',()=>{
  expect(read('components/master/DocShell.tsx')).toContain('https://www.dubelteam.com/games.html')
  for(const f of ['components/master/Shell.tsx','app/clubs/[slug]/layout.tsx']){
   const s=read(f)
   for(const p of ['/about','/privacy','/terms','/contact'])expect(s,`${f} ${p}`).toContain(`href="${p}"`)
   expect(s,f).toContain('https://www.dubelteam.com/games.html')
  }
 })
 it('the four pages are FAN LIFE pages (English layout), and the sitemap lists them',()=>{
  expect(read('app/layout.tsx')).toMatch(/FAN_PATHS=\['\/about','\/privacy','\/terms','\/contact'/)
  const sm=read('app/sitemap.ts')
  for(const p of ['/about','/privacy','/terms','/contact'])expect(sm).toContain(`'${p}'`)
  expect(sm).toContain('clubPages(')
 })
 it('a page inside a club names the club, describes itself and points at the main address',()=>{
  const m=clubSubMetadata({id:'celtic',name:'Celtic',sub:'timeline'})
  expect(m.title).toBe('Timeline · Celtic')
  expect(String(m.description)).toContain('Celtic')
  expect(m.alternates?.canonical).toMatch(/\/clubs\/celtic\/timeline$/)
  for(const g of SHARED_GATES)expect(GATE_DESCRIPTION[g.key]?.('Celtic'),g.key).toContain('Celtic')
  for(const sub of ['[gate]','history','timeline','away-days','kit-archive','play','terrace'])expect(read(`app/clubs/[slug]/${sub}/page.tsx`),sub).toContain('clubSubMetadata(')
 })
})
