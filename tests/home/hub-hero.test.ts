import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
const hero=readFileSync('components/home/HubHero.tsx','utf8'),page=readFileSync('app/page.tsx','utf8')
describe('hub hero (H1)',()=>{
 it('never asks a new fan to pick from a modal; Daily appears only when the club can deal an edition',()=>{
  const code=hero.replace(/\/\*[\s\S]*?\*\//g,"")
  expect(code).toContain('data-hero="new"')
  // the only Daily door is behind the club's real edition flag, and never in the new-fan branch
  expect(code).toMatch(/c\.daily&&/)
  expect(code.split('data-hero="new"')[1]!.split('data-hero="returning"')[0]).not.toMatch(/daily/i)
  expect(page).toMatch(/buildEdition\(/)
 })
 it('prints "On this day" only for an exact-date moment',()=>{
  expect(page).toMatch(/m\.offset===0/)
 })
 it('has no sideways scroll',()=>{expect(hero).not.toMatch(/overflow-x|snap-x/)})
})
