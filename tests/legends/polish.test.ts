import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'

/** 18.11.2026 — the owner's polish round: Continue respects the team sheet, the lever is clear, the club tab is split, the phone header is slim */
const app=readFileSync('components/legends/CareerApp.tsx','utf8'),draw=readFileSync('components/legends/BudgetDraw.tsx','utf8'),css=readFileSync('app/all-football/legends/polish.css','utf8')
describe('Legends polish',()=>{
 it('Continue stops at the team sheet when the assistant flags it (a blocker always, a risk until looked at once this round)',()=>{
  expect(app).toMatch(/const sheet=v\.advice\.find\(a=>a\.to==='squad'&&\(a\.severity==='blocker'\|\|\(a\.severity==='risk'&&!sheetSeen\)\)\)/)
  expect(app).toMatch(/sheet&&n&&tab!=='squad'\?\{sub:sheet\.id==='keeper-out'\?'Check the keeper first'/)
  expect(app.indexOf("sheet&&n&&tab!=='squad'")).toBeLessThan(app.indexOf(":n?{sub:`${n.playoff"))
 })
 it('the budget draw has its own class family (it used to share .lgm-bd with the match board), a visible lever and a button',()=>{
  expect(draw).not.toMatch(/className="lgm-bd/);expect(draw).toMatch(/className="lgm-slot"/)
  expect(draw).toMatch(/className="lgm-slot-pull min-h-tap"/);expect(draw).toMatch(/onPointerDown/)
  const setup=readFileSync('app/all-football/legends/setup.css','utf8');expect(setup).toMatch(/\.lgm-slot-lever \{/);expect(setup).not.toMatch(/\.lgm-bd-lever/)
 })
 it('the club tab shows one section at a time; the shut market says when it opens',()=>{
  expect(app).toMatch(/type ClubPart='manager'\|'honours'\|'friendlies'\|'guide'/);expect(app).toMatch(/data-testid="legends-market-shut"/)
 })
 it('the phone header is one slim bar, the table gives names the room, Continue steps above the ad strip',()=>{
  expect(css).toMatch(/\.lgm-head \.lgm-emblem \{ inline-size: 34px/);expect(css).toMatch(/tbody td:nth-of-type\(3\)/)
  expect(css).toMatch(/body:has\(\.promo\[data-up='true'\]:not\(\.promo-card\)\) \.lgm-continue/)
  expect(readFileSync('app/all-football/legends/styles.ts','utf8').trim().split('\n').pop()).toBe("import './polish.css'")
  expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
 })
})
