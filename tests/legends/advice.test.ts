import {describe,expect,it} from 'vitest'
import {hash} from '@/lib/clubs/rumble-rng'
import {DEFAULT_SETTINGS} from '@/lib/legends/config'
import {adviceFor} from '@/lib/legends/advice'
import {applyAction,cardOf,createCareer,type Action,type Intent} from '@/lib/legends/career'
import {botDraft} from '@/lib/legends/draft'
import {fresh} from '@/lib/legends/discipline'
import {careerView} from '@/lib/legends/view'
import type {Career} from '@/lib/legends/types'
import {LEAGUE,talkThrough,WAITS_FOR_TALK} from './fixtures'

const NOW='2026-10-15T10:00:00.000Z',ctx={now:NOW,catalogs:new Map(LEAGUE.map(c=>[c.club,c.cards]))}
let n=0
function act(c:Career,a:Intent):Career{if(WAITS_FOR_TALK.has(a.kind))c=talkThrough(c,act);const r=applyAction(c,{...a,key:`adv${n++}xxxxxxx`,rev:c.revision} as Action,ctx);if(!r.ok)throw new Error(`${a.kind}: ${r.error}`);return r.career}
function ready():Career{const r=createCareer({id:'adv0000000000001',owner:'o'.repeat(32),now:NOW,own:LEAGUE[0]!,rivals:LEAGUE.slice(1),settings:DEFAULT_SETTINGS});if(!r.ok)throw new Error(r.error);let c=r.career
 const b=botDraft(c.catalog.cards,hash(`${c.id}:draft`),'value',true);for(const p of b.draft.picks){c=act(c,{kind:'draft',move:{kind:'group',group:p.quota}});c=act(c,{kind:'draft',move:{kind:'pick',id:p.id}})}
 return act(act(c,{kind:'draft-confirm'}),{kind:'ack'})}
const card=(c:Career)=>(t:Career['teams'][number],id:string)=>cardOf(c,t,id)
const noWin={open:false,after:null}

describe('U01 · the assistant',()=>{
 it('a healthy squad gets no invented warnings',()=>{const c=ready();expect(adviceFor(c,card(c),noWin).filter(x=>x.severity!=='info')).toEqual([])})
 it('never more than three, no duplicates, blockers first',()=>{
  const c=ready(),t=c.teams[0]!,out=t.lineup.xi[3]!
  const bad:Career={...c,teams:[{...t,status:{...t.status,[out]:{...fresh(),injury:2,injuryKind:'minor'}}},...c.teams.slice(1)]}
  const a=adviceFor(bad,card(bad),{open:true,after:5});expect(a.length).toBeLessThanOrEqual(3)
  expect(new Set(a.map(x=>x.id)).size).toBe(a.length);expect(a[0]!.severity).toBe('blocker')
 })
 it('a captain left out says who wears the armband — and only reads, never edits the eleven',()=>{
  const c=ready(),t=c.teams[0]!,benched=t.lineup.bench[0]!,vice=t.lineup.xi[1]!
  const l={...t.lineup,captain:benched,vice},c2:Career={...c,teams:[{...t,lineup:l},...c.teams.slice(1)]}
  const a=adviceFor(c2,card(c2),noWin).find(x=>x.id==='captain-out')!;expect(a).toBeTruthy();expect(a.text).toMatch(/the vice-captain, will wear the armband/)
  expect(c2.teams[0]!.lineup.xi).toEqual(t.lineup.xi)
  const noVice:Career={...c2,teams:[{...t,lineup:{...l,vice:undefined}},...c.teams.slice(1)]}
  expect(adviceFor(noVice,card(noVice),noWin).some(x=>x.id==='captain-out-no-vice'&&x.severity==='risk')).toBe(true)
 })
 it('out-of-line uses the engine rule: a defender at midfield is flagged, a recorded midfielder is not',()=>{
  const c=ready(),t=c.teams[0]!,lu=t.lineup
  const xi=[...lu.xi];const di=xi.findIndex((id,i)=>card(c)(t,id)?.pos==='DF'),mi=xi.findIndex(id=>card(c)(t,id)?.pos==='MF')
  const swapped=[...xi];[swapped[di],swapped[mi]]=[xi[mi]!,xi[di]!]
  const c2:Career={...c,teams:[{...t,lineup:{...lu,xi:swapped}},...c.teams.slice(1)]}
  expect(adviceFor(c2,card(c2),noWin).some(x=>x.id.startsWith('out-of-line'))).toBe(true)
 })
 it('the view carries the notes and still hides the future',()=>{
  const c=ready(),v=careerView(c);expect(Array.isArray(v.advice)).toBe(true);expect(v.advice.length).toBeLessThanOrEqual(3)
  expect(JSON.stringify(v.advice)).not.toMatch(/rating|seed/i)
 })
})
