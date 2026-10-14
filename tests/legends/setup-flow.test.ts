import {describe,expect,it} from 'vitest'
import {applyAction,createCareer,type Intent} from '@/lib/legends/career'
import {budgetOf,cashLeft} from '@/lib/legends/draft'
import {DEFAULT_SETTINGS,LEGENDS_RULES as R} from '@/lib/legends/config'
import {LEAGUE} from './fixtures'

const make=(limit?:number)=>{
 const [own,...rivals]=LEAGUE,r=createCareer({id:'setupflow1',owner:'o',now:'2026-10-14T00:00:00Z',own:own!,rivals,settings:DEFAULT_SETTINGS,...(limit?{limit}:{})})
 if(!r.ok)throw new Error(r.error);return r.career
}
let n=0
const act=(c:ReturnType<typeof make>,a:Intent)=>{const r=applyAction(c,{...a,key:`k${++n}abcdefgh`,rev:c.revision} as never,{now:'2026-10-14T00:00:00Z',catalogs:new Map()});return r}

describe('the opening budget draw (owner, 14.10.2026)',()=>{
 it('draws once, between €50M and the standard budget, and the draft spends against it',()=>{
  const c=make(),r=act(c,{kind:'budget-draw'})
  expect(r.ok).toBe(true);if(!r.ok)return
  const d=r.career.draft!
  expect(d.budget).toBeGreaterThanOrEqual(R.initialDraftBudgetM-2);expect(d.budget).toBeLessThanOrEqual(R.initialDraftBudgetM)
  expect(budgetOf(d)).toBe(d.budget);expect(cashLeft(d)).toBe(d.budget)
  expect(act(r.career,{kind:'budget-draw'}).ok).toBe(false)
 })
 it('is deterministic for a career id',()=>{
  const a=act(make(),{kind:'budget-draw'}),b=act(make(),{kind:'budget-draw'})
  expect(a.ok&&b.ok&&a.career.draft!.budget).toBe(b.ok&&b.career.draft!.budget)
 })
})
describe('the league the manager sets up',()=>{
 it('a limit sets how many clubs play; no limit keeps the standard cap',()=>{
  expect(make(4).teams.length).toBe(4)
  expect(make().teams.length).toBe(LEAGUE.length)
 })
})
