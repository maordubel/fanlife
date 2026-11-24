import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'

const page=readFileSync('app/clubs/[slug]/page.tsx','utf8'),css=readFileSync('app/weekly/club.css','utf8')

describe('the short club home (docs/rules/club-home-short.md)',()=>{
 it('is decided by the front-page switch, and marks the page',()=>{
  expect(page).toContain("door('frontDoors')")
  expect(page).toContain('const short=fd.open')
  expect(page).toContain('data-short={short||undefined}')
 })
 it('moves the long blocks off the home, each behind !short',()=>{
  for(const block of ['<div className="wkk-legends">','<ClubLifeCard href={life.href}','<WatchBanner copy={copy}','<section className="wkk-cardwrap"','<div className="wkk-share">','wkk-allgames min-h-tap','data-testid="club-build-kit"']){
   const at=page.indexOf(block);expect(at,block).toBeGreaterThan(-1)
   expect(page.slice(page.lastIndexOf('\n',at),at),block).toContain('!short&&')
  }
 })
 it('names what moved in the contents rows',()=>{
  expect(page).toContain('{short?<ContentsTiles mono title={copy.wkkInsideIssue}')
  expect(page).toContain("title:copy.clubTabPlay,sub:copy.wkkAllClubGames")
  expect(page).toContain("title:copy.wkhInWatch,sub:copy.watchKicker")
 })
 it('has a phone design and a desktop design of its own',()=>{
  const at=css.indexOf('THE SHORT CLUB HOME'),own=css.slice(at)
  expect(at).toBeGreaterThan(-1)
  expect(own).toMatch(/@media \(max-width: 900px\)[\s\S]*\.wkk-home\[data-short\] \.wkk-yourgate \{ display: none; \}/)
  expect(own).toMatch(/@media \(min-width: 901px\)[\s\S]*grid-auto-flow: row dense/)
  expect(own).not.toMatch(/#[0-9a-f]{3,6}\b|margin-(left|right)|padding-(left|right)/i)
 })
})
