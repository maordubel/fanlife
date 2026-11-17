import {describe,expect,it} from 'vitest'
import {hash} from '@/lib/clubs/rumble-rng'
import {DEFAULT_SETTINGS,LEGENDS_RULES as R} from '@/lib/legends/config'
import {applyAction,createCareer,isBye,me,type Action,type Intent} from '@/lib/legends/career'
import {botDraft} from '@/lib/legends/draft'
import {careerView} from '@/lib/legends/view'
import type {Career} from '@/lib/legends/types'
import {LEAGUE,talkThrough,WAITS_FOR_TALK} from './fixtures'

/** 17.11.2026 — the owner's window "froze": every bid he pressed was refused (squad at its minimum) and the refusal sat behind the sheet */
const NOW='2026-11-17T20:00:00.000Z',ctx={now:NOW,catalogs:new Map(LEAGUE.map(c=>[c.club,c.cards]))}
let n=0
const keyed=(c:Career,a:Intent):Action=>({...a,key:`wb${n++}xxxxxxxx`,rev:c.revision} as Action)
function act(c:Career,a:Intent):Career{if(WAITS_FOR_TALK.has(a.kind))c=talkThrough(c,act);const r=applyAction(c,keyed(c,a),ctx);if(!r.ok)throw new Error(`${a.kind}: ${r.error}`);return r.career}
function toWindow(id:string):Career{
 const r=createCareer({id,owner:'o'.repeat(32),now:NOW,own:LEAGUE[0]!,rivals:LEAGUE.slice(1),settings:DEFAULT_SETTINGS});if(!r.ok)throw new Error(r.error)
 let c=r.career;const b=botDraft(c.catalog.cards,hash(`${c.id}:draft`),'value',true)
 for(const p of b.draft.picks){c=act(c,{kind:'draft',move:{kind:'group',group:p.quota}});c=act(c,{kind:'draft',move:{kind:'pick',id:p.id}})}
 c=act(act(c,{kind:'draft-confirm'}),{kind:'ack'})
 for(let i=0;i<10&&c.phase!=='window';i++){c=isBye(c)?act(c,{kind:'play-round'}):act(c,{kind:'match-start',mode:'fast'});if(c.live)c=act(c,{kind:'match-finish'})}
 return c
}
describe('transfer window bids',()=>{
 it('a bid that the squad minimum would refuse is marked blocked, with the reason, before it is pressed',()=>{
  let c=toWindow('ab'.repeat(8));expect(c.phase).toBe('window')
  for(const s of me(c).squad.slice(0,8))c=act(c,{kind:'list',card:s.id,listed:true})
  const v=careerView(c),bids=v.window!.bids;expect(bids.length).toBeGreaterThan(0)
  const atMin=me(c).squad.length<=R.minSquad
  for(const b of bids){
   const r=applyAction(c,keyed(c,{kind:'bid',card:b.card,accept:true}),ctx)
   expect(!!b.blocked).toBe(!r.ok)
   if(atMin)expect(b.blocked).toMatch(/Sign a man first/)
  }
 })
})

describe('best fit is football first (17.11.2026)',()=>{
 it('a keeper keeps goal even when an outfield man has more stars',async()=>{
  const {bestEleven}=await import('@/lib/legends/squad')
  const mk=(id:string,pos:'GK'|'DF'|'MF'|'FW',stars:number)=>({id,name:id,pos,price:1 as const,stars,attrs:{},from:null,to:null,decades:[]})
  const men=[mk('g1','GK',1),mk('g2','GK',1),...['d1','d2','d3','d4','d5'].map(i=>mk(i,'DF',2)),...['m1','m2','m3','m4','m5'].map(i=>mk(i,'MF',4.5)),...['f1','f2','f3'].map(i=>mk(i,'FW',3))]
  const r=bestEleven(men,'4-3-3')!
  expect(r.xi[0]).toMatch(/^g/)
  expect(r.xi.slice(1,5).every(id=>id.startsWith('d'))).toBe(true)
 })
})
