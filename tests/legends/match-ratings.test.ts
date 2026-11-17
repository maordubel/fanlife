import {describe,expect,it} from 'vitest'
import {hash} from '@/lib/clubs/rumble-rng'
import {DEFAULT_SETTINGS} from '@/lib/legends/config'
import {applyAction,createCareer,isBye,me,type Action,type Intent} from '@/lib/legends/career'
import {botDraft} from '@/lib/legends/draft'
import {fixtureRatings,seasonForm} from '@/lib/legends/form'
import {matchRatings,ratingBand,ratingLine} from '@/lib/legends/match-ratings'
import {careerView} from '@/lib/legends/view'
import type {Career} from '@/lib/legends/types'
import {LEAGUE,talkThrough,WAITS_FOR_TALK} from './fixtures'

const NOW='2026-11-17T20:00:00.000Z',ctx={now:NOW,catalogs:new Map(LEAGUE.map(c=>[c.club,c.cards]))}
let n=0
const keyed=(c:Career,a:Intent):Action=>({...a,key:`mr${n++}xxxxxxxx`,rev:c.revision} as Action)
function act(c:Career,a:Intent):Career{if(WAITS_FOR_TALK.has(a.kind))c=talkThrough(c,act);const r=applyAction(c,keyed(c,a),ctx);if(!r.ok)throw new Error(`${a.kind}: ${r.error}`);return r.career}
function season(id:string,rounds=12):Career{
 const r=createCareer({id,owner:'o'.repeat(32),now:NOW,own:LEAGUE[0]!,rivals:LEAGUE.slice(1),settings:DEFAULT_SETTINGS});if(!r.ok)throw new Error(r.error)
 let c=r.career;const b=botDraft(c.catalog.cards,hash(`${c.id}:draft`),'value',true)
 for(const p of b.draft.picks){c=act(c,{kind:'draft',move:{kind:'group',group:p.quota}});c=act(c,{kind:'draft',move:{kind:'pick',id:p.id}})}
 c=act(act(c,{kind:'draft-confirm'}),{kind:'ack'})
 for(let i=0;i<rounds&&c.phase!=='season-end';i++){if(c.phase==='window')c=act(c,{kind:'close-window'});c=isBye(c)?act(c,{kind:'play-round'}):act(c,{kind:'match-start',mode:'fast'});if(c.live)c=act(c,{kind:'match-finish'})}
 return c
}
describe('match ratings (17.11.2026)',()=>{
 it('read like Football Manager: a 6.5–7.1 average, a player of the match every game, scorers above the rest',()=>{
  const c=season('cd'.repeat(8)),all:number[]=[];let games=0,potm=0,scorerAbove=0,scorers=0
  for(const f of c.season.fixtures.filter(x=>x.result)){
   const r=fixtureRatings(c,f)!;games++;if(r.potm)potm++
   expect(r.men.length).toBeGreaterThanOrEqual(22)
   const avg=r.men.reduce((a,m)=>a+m.rating,0)/r.men.length
   for(const m of r.men){all.push(m.rating);expect(m.rating).toBeGreaterThanOrEqual(3);expect(m.rating).toBeLessThanOrEqual(10);if(m.line.goals){scorers++;if(m.rating>avg)scorerAbove++}}
  }
  const mean=all.reduce((a,b)=>a+b,0)/all.length;console.log('mean',mean.toFixed(2),'8+',(all.filter(x=>x>=8).length/all.length).toFixed(3),'<5.6',(all.filter(x=>x<5.6).length/all.length).toFixed(3))
  expect(games).toBeGreaterThanOrEqual(15);expect(potm).toBe(games)
  expect(mean).toBeGreaterThan(6.3);expect(mean).toBeLessThan(7.2)
  expect(scorerAbove/scorers).toBeGreaterThan(0.85)
  const spread=all.filter(x=>x>=8).length/all.length;expect(spread).toBeGreaterThan(0.01);expect(spread).toBeLessThan(0.2)
 })
 it('season form reaches the team sheet: an average, the last five, awards',()=>{
  const c=season('ef'.repeat(8)),f=seasonForm(c),v=careerView(c)
  expect(f.size).toBeGreaterThanOrEqual(11)
  const withForm=v.squad.filter(s=>s.form);expect(withForm.length).toBeGreaterThan(10)
  for(const s of withForm){expect(s.form!.last.length).toBeLessThanOrEqual(5);expect(s.form!.avg).toBeGreaterThan(3)}
  expect(me(c).squad.length).toBeGreaterThan(0)
 })
 it('live: nothing after the picture counts, and a keeper earns his saves',()=>{
  const lineups=[[{id:'gk0',pos:'GK' as const},{id:'df0',pos:'DF' as const},{id:'fw0',pos:'FW' as const}],[{id:'gk1',pos:'GK' as const},{id:'df1',pos:'DF' as const},{id:'fw1',pos:'FW' as const}]] as const
  const moments=[{minute:10,side:1 as const,kind:'save' as const,player:'fw1',score:[0,0] as [number,number]},{minute:20,side:1 as const,kind:'save' as const,player:'fw1',score:[0,0] as [number,number]},{minute:70,side:0 as const,kind:'goal' as const,player:'fw0',score:[1,0] as [number,number]}]
  const early=matchRatings({seed:1,lineups:[[...lineups[0]],[...lineups[1]]],moments,upTo:30}),late=matchRatings({seed:1,lineups:[[...lineups[0]],[...lineups[1]]],moments,final:true})
  const r=(x:typeof early,id:string)=>x.men.find(m=>m.id===id)!
  expect(r(early,'fw0').line.goals).toBe(0);expect(r(late,'fw0').line.goals).toBe(1)
  expect(r(late,'gk0').line.saves).toBe(2);expect(r(late,'gk0').rating).toBeGreaterThan(r(late,'gk1').rating)
  expect(late.potm).toBe('fw0');expect(ratingBand(r(late,'fw0').rating)).toMatch(/good|great/);expect(ratingLine(r(late,'gk0'))).toMatch(/2 saves · clean sheet/)
 })
})
