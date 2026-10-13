import {describe,it,expect,vi} from 'vitest'
vi.setConfig({testTimeout:300_000})
import {minCompletion} from '@/lib/draft-core/assign'
import {botDraft,confirmCheck,groupVerdicts,replay,startState,step} from '@/lib/draft-core/engine'
import {rumbleFiveRules,rumbleXiRules} from '@/lib/draft-core/rules'
import {slotsOf} from '@/lib/clubs/rumble-xi/formations'
import type {DCard,Group} from '@/lib/draft-core/types'

/** an invented club: no real people */
function club(n:number,seed=1):DCard[]{
 const out:DCard[]=[];let x=seed
 const r=()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296}
 for(let i=0;i<n;i++){
  const pos=(['GK','DF','DF','MF','MF','FW'] as Group[])[i%6]!,p=r()
  out.push({id:`m${i}`,pos,price:p<.06?5:p<.2?4:p<.45?3:p<.75?2:1,...(i%17===5?{alt:[pos==='DF'?'MF':'DF'] as Group[]}:{}),...(i%23===7?{free:true}:{})})
 }
 return out
}
describe('minCompletion',()=>{
 it('counts a man who can stand in two groups once',()=>{
  const cards:DCard[]=[{id:'a',pos:'DF',alt:['MF'],price:1},{id:'b',pos:'DF',price:3}]
  expect(minCompletion(['DF','MF'],cards)).toBe(4)
  expect(minCompletion(['DF','MF'],[cards[0]!])).toBeNull()
 })
 it('matches the brute-force minimum on random small instances',()=>{
  for(let t=0;t<200;t++){
   const cards=club(12,t+3).slice(0,9),slots=(['DF','MF','FW','MF'] as Group[])
   const fits=(c:DCard,g:Group)=>c.free?g!=='GK':c.pos===g||!!c.alt?.includes(g)
   let best=Infinity
   const go=(i:number,used:Set<string>,sum:number)=>{if(i===slots.length){best=Math.min(best,sum);return}for(const c of cards)if(!used.has(c.id)&&fits(c,slots[i]!)){used.add(c.id);go(i+1,used,sum+c.price);used.delete(c.id)}}
   go(0,new Set(),0)
   expect(minCompletion(slots,cards)).toBe(best===Infinity?null:best)
  }
 })
})
describe('the draft',()=>{
 const f=slotsOf('4-3-3'),xi=(b:number)=>rumbleXiRules(f.map(s=>({id:s.id,family:s.family})),b,'4-3-3')
 it('completes legally for 1000 randomised bots across modes, budgets and clubs',()=>{
  let finished=0
  for(let i=0;i<1000;i++){
   const pool=club(60+(i%7)*25,i+1),style=(['value','random','premium','budget'] as const)[i%4]!
   const rules=i%3===0?rumbleFiveRules():xi([33,34,35][i%3]!)
   const r=botDraft(rules,pool,i*7919+3,style)
   if(r.error)console.log(i,style,rules.mode,r.error)
   expect(r.error).toBeNull();finished++
   expect(confirmCheck(rules,pool,r.state)).toBeNull()
   expect(replay(rules,pool,i*7919+3,r.log).ok).toBe(true)
  }
  expect(finished).toBe(1000)
 })
 it('lets the fan open any group first and shows the same three until a pick or a reroll',()=>{
  const pool=club(120),rules=xi(35),s0=startState(rules)
  const v=groupVerdicts(rules,pool,s0,9);expect(v.every(g=>g.open)).toBe(true)
  const a=step(rules,pool,s0,{t:'open',g:'FW'},9);if(!a.ok)throw new Error(a.error)
  const back=step(rules,pool,a.state,{t:'open',g:'DF'},9);if(!back.ok)throw new Error(back.error)
  const again=step(rules,pool,back.state,{t:'open',g:'FW'},9);if(!again.ok)throw new Error(again.error)
  expect(again.state.offers).toEqual(a.state.offers)
  expect(new Set(a.state.offers.map(o=>o.id)).size).toBe(3)
 })
 it('rerolls replace only the current three, never bring them back, and stop at three',()=>{
  const pool=club(200),rules=xi(35);let s=startState(rules)
  let r=step(rules,pool,s,{t:'open',g:'MF'},4);if(!r.ok)throw new Error(r.error);s=r.state
  const seen=new Set(s.offers.map(o=>o.id))
  for(let i=0;i<3;i++){r=step(rules,pool,s,{t:'reroll'},4);if(!r.ok)throw new Error(r.error);s=r.state;for(const o of s.offers){expect(seen.has(o.id)).toBe(false);seen.add(o.id)}}
  expect(s.rerollsLeft).toBe(0)
  expect(step(rules,pool,s,{t:'reroll'},4).ok).toBe(false)
 })
 it('refuses a man who was not on the table, a closed group and a stale pick',()=>{
  const pool=club(120),rules=rumbleFiveRules();let s=startState(rules)
  expect(step(rules,pool,s,{t:'pick',id:'m1'},1).ok).toBe(false)
  let r=step(rules,pool,s,{t:'open',g:'GK'},1);if(!r.ok)throw new Error(r.error);s=r.state
  const ok=s.offers.find(o=>!o.locked)!;r=step(rules,pool,s,{t:'pick',id:ok.id},1);if(!r.ok)throw new Error(r.error);s=r.state
  expect(step(rules,pool,s,{t:'open',g:'GK'},1).ok).toBe(false)
  expect(step(rules,pool,s,{t:'pick',id:ok.id},1).ok).toBe(false)
 })
 it('never leaves a squad that cannot be finished: every pickable card keeps a completion inside the money',()=>{
  const pool=club(90,5),rules=xi(33);let s=startState(rules)
  for(let k=0;k<11;k++){
   const open=groupVerdicts(rules,pool,s,k).filter(g=>g.open);expect(open.length).toBeGreaterThan(0)
   const o=step(rules,pool,s,{t:'open',g:open[0]!.group},k);if(!o.ok)throw new Error(o.error)
   const dear=[...o.state.offers].filter(x=>!x.locked).sort((a,b)=>pool.find(c=>c.id===b.id)!.price-pool.find(c=>c.id===a.id)!.price)[0]!
   const p=step(rules,pool,o.state,{t:'pick',id:dear.id},k);if(!p.ok)throw new Error(p.error);s=p.state
  }
  expect(confirmCheck(rules,pool,s)).toBeNull()
 })
})
