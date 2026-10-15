import {describe,expect,it} from 'vitest'
import {hash} from '@/lib/clubs/rumble-rng'
import {DEFAULT_SETTINGS,LEGENDS_RULES as R} from '@/lib/legends/config'
import {applyAction,createCareer,isBye,me,slotsOf,type Action,type Intent} from '@/lib/legends/career'
import {botDraft} from '@/lib/legends/draft'
import {planDeal,type DealMan} from '@/lib/legends/dealplan'
import {careerView} from '@/lib/legends/view'
import type {Career} from '@/lib/legends/types'
import {LEAGUE,talkThrough,WAITS_FOR_TALK} from './fixtures'

const NOW='2026-10-15T10:00:00.000Z',ctx={now:NOW,catalogs:new Map(LEAGUE.map(c=>[c.club,c.cards]))}
let n=0
function act(c:Career,a:Intent):Career{if(WAITS_FOR_TALK.has(a.kind))c=talkThrough(c,act);const r=applyAction(c,{...a,key:`dp${n++}xxxxxxxx`,rev:c.revision} as Action,ctx);if(!r.ok)throw new Error(`${a.kind}: ${r.error}`);return r.career}
function window(id:string):Career{const r=createCareer({id,owner:'o'.repeat(32),now:NOW,own:LEAGUE[0]!,rivals:LEAGUE.slice(1),settings:DEFAULT_SETTINGS});if(!r.ok)throw new Error(r.error);let c=r.career
 const b=botDraft(c.catalog.cards,hash(`${c.id}:draft`),'value',true);for(const p of b.draft.picks){c=act(c,{kind:'draft',move:{kind:'group',group:p.quota}});c=act(c,{kind:'draft',move:{kind:'pick',id:p.id}})}
 c=act(act(c,{kind:'draft-confirm'}),{kind:'ack'})
 for(let i=0;i<6&&c.phase!=='window';i++)c=isBye(c)?act(c,{kind:'play-round'}):act(c,{kind:'match-start',mode:'fast'})
 return c}
const squadOf=(c:Career):DealMan[]=>careerView(c).squad.map(s=>({id:s.id,quota:s.quota,paid:s.paid,apps:s.apps,sale:s.sale}))

describe('U03 · the compare sheet prints the server’s own figures',()=>{
 it('a plain signing: cash after equals the cash the server leaves',()=>{
  let seen=0
  for(let i=0;i<12;i++){
   const c=window(`d3a${String(i).padStart(13,'0')}`),t=me(c);if(t.squad.length>=R.maxSquad)continue
   const man=slotsOf(c).find(x=>x.price<=t.cash);if(!man)continue
   const plan=planDeal({open:true,cash:t.cash,squad:squadOf(c),candidate:{id:man.id,pos:man.pos,price:man.price,name:man.name}})
   const after=me(act(c,{kind:'buy',card:man.id}))
   expect(plan.blocked).toBeNull();expect(plan.cashAfter).toBeCloseTo(after.cash,5);expect(plan.squadAfter).toBe(after.squad.length);seen++
  }
  expect(seen).toBeGreaterThan(2)
 })
 it('a swap: proceeds, cash and quotas equal what the server books',()=>{
  let seen=0
  for(let i=0;i<24&&seen<6;i++){
   const c=window(`d3b${String(i).padStart(13,'0')}`),t=me(c),v=careerView(c)
   for(const man of slotsOf(c)){
    const out=v.squad.find(s=>s.quota===man.pos&&s.sale);if(!out)continue
    const plan=planDeal({open:true,cash:t.cash,squad:squadOf(c),candidate:{id:man.id,pos:man.pos,price:man.price,name:man.name},out:out.id})
    const r=applyAction(c,{kind:'swap',sell:out.id,buy:man.id,key:`dpswap${i}xxxxxxx`,rev:c.revision} as Action,ctx)
    if(plan.blocked){expect(r.ok,`planner blocked (${plan.blocked.code}) but the server allowed it`).toBe(false);continue}
    expect(r.ok,`planner allowed it but the server refused: ${r.ok?'':r.error}`).toBe(true)
    if(r.ok){const a=me(r.career);expect(plan.cashAfter).toBeCloseTo(a.cash,5);expect(plan.squadAfter).toBe(a.squad.length)
     for(const q of ['GK','DF','MF','FW'] as const)expect(plan.quotasAfter[q]).toBe(a.squad.filter(s=>s.quota===q).length);seen++}
    break
   }
  }
  expect(seen).toBeGreaterThan(2)
 })
 it('closed window, cash short, and a missing man to swap out each say so',()=>{
  const c=window('d3c0000000000001'),t=me(c),man=slotsOf(c)[0]!,cand={id:man.id,pos:man.pos,price:man.price,name:man.name}
  expect(planDeal({open:false,cash:t.cash,squad:squadOf(c),candidate:cand}).blocked?.code).toBe('closed')
  expect(planDeal({open:true,cash:0,squad:squadOf(c).slice(0,10),candidate:cand}).blocked?.code).toBe('cash')
  const full=squadOf(c);while(full.length<R.maxSquad)full.push({...full[0]!,id:`x${full.length}`})
  expect(planDeal({open:true,cash:99,squad:full,candidate:cand}).blocked?.code).toBe('none-out')
 })
})
