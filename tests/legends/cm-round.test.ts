import {describe,expect,it} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import React,{createElement} from 'react'
;(globalThis as {React?:typeof React}).React=React // the components are compiled with the classic JSX runtime here
import {DEFAULT_SETTINGS} from '@/lib/legends/config'
import {applyAction,createCareer,type Action,type Intent} from '@/lib/legends/career'
import {botDraft} from '@/lib/legends/draft'
import {hash} from '@/lib/clubs/rumble-rng'
import {careerView} from '@/lib/legends/view'
import type {Career} from '@/lib/legends/types'
import {SquadList} from '@/components/legends/SquadList'
import {FmSheet} from '@/components/legends/FmSheet'
import {LEAGUE,talkThrough,WAITS_FOR_TALK} from './fixtures'

/** 18.11.2026 — the CM 01/02 round: the squad list, the position map, the tale of the tape */
const NOW='2026-11-18T18:00:00.000Z',ctx={now:NOW,catalogs:new Map(LEAGUE.map(c=>[c.club,c.cards]))}
let n=0
const act=(c:Career,a:Intent):Career=>{if(WAITS_FOR_TALK.has(a.kind))c=talkThrough(c,act);const r=applyAction(c,{...a,key:`cm${n++}xxxxxxxxxx`,rev:c.revision} as Action,ctx);if(!r.ok)throw new Error(`${a.kind}: ${r.error}`);return r.career}
function seasonCareer(){const r=createCareer({id:'c'.repeat(16),owner:'o'.repeat(32),now:NOW,own:LEAGUE[0]!,rivals:LEAGUE.slice(1),settings:DEFAULT_SETTINGS});if(!r.ok)throw new Error(r.error)
 let c=r.career;const b=botDraft(c.catalog.cards,hash(`${c.id}:draft`),'value',true)
 for(const p of b.draft.picks){c=act(c,{kind:'draft',move:{kind:'group',group:p.quota}});c=act(c,{kind:'draft',move:{kind:'pick',id:p.id}})}
 return act(act(c,{kind:'draft-confirm'}),{kind:'ack'})}
describe('the CM 01/02 round',()=>{
 const v=careerView(seasonCareer())
 it('the squad list shows every man once, with his ability and status, sortable by every column',()=>{
  const html=renderToStaticMarkup(createElement(SquadList,{v,open:()=>{}}))
  expect((html.match(/<tr data-st=/g)??[]).length).toBe(v.squad.length)
  for(const h of ['Pos','Name','Abl','Rt','Apps','Gls'])expect(html).toContain(`>${h}<`)
  expect(html).toMatch(/aria-sort="ascending"/);expect(html).toMatch(/lgm-sql-key" data-band="(weak|fair|good|elite)"/)
 })
 it('the profile draws where he plays',()=>{
  const m=v.squad.find(x=>x.fm)!,html=renderToStaticMarkup(createElement(FmSheet,{fm:m.fm!,name:m.name,pos:m.pos,...(m.role?{role:m.role}:{})}))
  expect(html).toMatch(/class="lgm-fm-map"[^>]*aria-label="Plays as /);expect(html).toMatch(/class="lgm-fm-dot"/)
 })
 it('the tale of the tape only uses what the manager may see (no rival ratings in the view)',()=>{
  expect(v.next).not.toBeNull();expect(JSON.stringify(v.clubs)).not.toMatch(/"fm"|"attrs"/)
 })
})
describe('slips read on every panel',()=>{
 it('an error slip carries its own ink (it inherited ivory on the night ticket and vanished)',async()=>{
  const {readFileSync}=await import('node:fs');expect(readFileSync('app/all-football/legends/legends.css','utf8')).toMatch(/\.lgm-error \{[^}]*background: var\(--mag-card\); color: var\(--mag-ink\)/)
 })
})
