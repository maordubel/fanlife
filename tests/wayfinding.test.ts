import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import {SHARED_GATES} from '@/lib/clubs/gates'
import {placeFor,type Names} from '@/lib/wayfinding/map'

const names:Names={club:id=>id==='zz'?'Zed United':null}
describe('wayfinding: every page says where you are and what you can do (owner, 22.11.2026)',()=>{
 it('the front page, a game of LIFE and unknown addresses explain themselves: no folio',()=>{
  for(const p of ['/','/clubs/zz/life','/master/admin','/clubs/nobody','/shop/p/abc','/some/where'])expect(placeFor(p,names),p).toBeNull()
 })
 it('a top section leads back to the front page and says what it is',()=>{
  for(const p of ['/clubs','/our-games','/shop','/market','/me','/album','/sources']){const pl=placeFor(p,names)!
   expect(pl.trail[0],p).toEqual({label:'FAN LIFE',href:'/'});expect(pl.title.length,p).toBeGreaterThan(2);expect(pl.here.length,p).toBeGreaterThan(10)}
  expect(placeFor('/our-games?play=friends',names)!.key).toBe('games')
 })
 it('a club home sits under The clubs and points on to play, history, the terrace and the club shop',()=>{
  const p=placeFor('/clubs/zz',names)!
  expect(p.trail.map(c=>c.href)).toEqual(['/','/clubs']);expect(p.title).toBe('Zed United');expect(p.here).toContain('Zed United')
  expect(p.next.map(n=>n.href)).toEqual(['/clubs/zz/play','/clubs/zz/history','/clubs/zz/terrace','/shop?club=zz'])
  expect(p.can.length).toBeGreaterThan(1)
 })
 it('a gate is a game in play with its own frame and its own help: the folio stays off it',()=>{
  for(const g of SHARED_GATES)expect(placeFor(`/clubs/zz/${g.key}?seed=42`,names),g.key).toBeNull()
 })
 it('a club page sits under its club',()=>{
  for(const s of ['play','history','terrace','daily','meetings','kit-archive','away-days']){const p=placeFor(`/clubs/zz/${s}`,names)!
   expect(p.trail[p.trail.length-1],s).toEqual({label:'Zed United',href:'/clubs/zz'});expect(p.title.length,s).toBeGreaterThan(2)}
 })
 it('no placeholder is left unfilled in any line',()=>{
  for(const p of ['/clubs','/clubs/zz','/clubs/zz/play','/clubs/zz/history','/clubs/zz/kit-archive','/market/list','/all-football/legends','/players/pl_0000000000']){
   const pl=placeFor(p,names)!;expect(JSON.stringify(pl),p).not.toMatch(/\{\w+\}/)}
 })
 it('the folio is drawn once by the shell and once by a club layout, behind the switch; the short front page too',()=>{
  expect(readFileSync('components/master/Shell.tsx','utf8')).toContain('<FolioDoor/>')
  expect(readFileSync('app/clubs/[slug]/layout.tsx','utf8')).toContain('<FolioDoor/>')
  expect(readFileSync('components/wayfinding/FolioDoor.tsx','utf8')).toMatch(/door\('frontDoors'\)/)
  const hub=readFileSync('app/page.tsx','utf8')
  expect(hub).toMatch(/const short=fd\.open/);expect(hub.match(/\{!short&&/g)!.length).toBeGreaterThanOrEqual(9)
 })
})
