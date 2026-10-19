import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
const hero=readFileSync('components/home/HubHero.tsx','utf8'),page=readFileSync('app/page.tsx','utf8')
describe('hub hero (H1)',()=>{
 it('never asks a new fan to pick from a modal and offers no Daily button',()=>{
  expect(hero.replace(/\/\*[\s\S]*?\*\//g,"")).not.toMatch(/daily/i)
  expect(hero).toContain('data-hero="new"')
 })
 it('prints "On this day" only for an exact-date moment',()=>{
  expect(page).toMatch(/m\.offset===0/)
 })
 it('has no sideways scroll',()=>{expect(hero).not.toMatch(/overflow-x|snap-x/)})
})
