import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'

const page=readFileSync('app/clubs/[slug]/page.tsx','utf8'),win=readFileSync('components/shop/ShopWindow.tsx','utf8'),css=readFileSync('app/weekly/club.css','utf8')

describe('the club home, second pass (docs/rules/club-home-short.md)',()=>{
 it('says the three ways in under the masthead, on the short home only, before today\'s game',()=>{
  const at=page.indexOf('{short&&core&&open.length>0&&<ClubDoors')
  expect(at).toBeGreaterThan(-1)
  expect(at).toBeLessThan(page.indexOf('<div className="wkk-lead"'))
  for(const k of ["key:'solo'","key:'friends'","key:'archive'"])expect(page).toContain(k)
 })
 it('the friends door goes to a game made for two, never to a closed one',()=>{
  expect(page).toContain("open.includes('blind-cow' as GateKey)?clubHref(id,'blind-cow',locale):`/our-games?play=friends")
 })
 it('the club\'s shop window shows only that club\'s products and opens the shop on that club',()=>{
  expect(page).toContain('{short?<div className="wkk-shopwin"><Suspense fallback={null}><ShopWindow subject={id} mono/></Suspense></div>')
  expect(win).toContain('shop.products.filter(p=>inClub(p,subject))')
  expect(win).toContain("href={subject?`/shop?club=${subject}`:'/shop'}")
  expect(win).not.toContain("'q'+n")
 })
 it('prints the door pictures in the club\'s one ink, with logical properties only',()=>{
  const own=css.slice(css.indexOf('THE CLUB HOME, SECOND PASS'))+readFileSync('app/weekly/welcome.css','utf8')
  expect(own).toContain('filter: grayscale(1)')
  expect(own).not.toMatch(/#[0-9a-f]{3,6}\b|margin-(left|right)|padding-(left|right)/i)
 })
})
