import {describe,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {hash} from '@/lib/clubs/rumble-rng'
import {DEFAULT_SETTINGS} from '@/lib/legends/config'
import {applyAction,createCareer,isBye,me,parseAction,type Action,type Intent} from '@/lib/legends/career'
import {botDraft} from '@/lib/legends/draft'
import {captainOf} from '@/lib/legends/squad'
import {boards,seasonRows} from '@/lib/legends/stats'
import {careerView} from '@/lib/legends/view'
import type {Career} from '@/lib/legends/types'
import {LEAGUE} from './fixtures'

/**
 * The squad page and the season numbers (owner, 13.10.2026): a captain AND a vice-captain chosen when the squad is
 * registered, a "meet your squad" screen that shows once, and leader boards counted from the match logs.
 */
const NOW='2026-10-13T10:00:00.000Z'
const ctx={now:NOW,catalogs:new Map(LEAGUE.map(c=>[c.club,c.cards]))}
let n=0
function act(c:Career,a:Intent){const r=applyAction(c,{...a,key:`t${n++}xxxxxxxx`,rev:c.revision} as Action,ctx);if(!r.ok)throw new Error(`${a.kind}: ${r.error}`);return r.career}
function tryAct(c:Career,a:Intent){return applyAction(c,{...a,key:`t${n++}xxxxxxxx`,rev:c.revision} as Action,ctx)}
function drafted(id='beefcafe00000001'):Career{
 const r=createCareer({id,owner:'o'.repeat(32),now:NOW,own:LEAGUE[0]!,rivals:LEAGUE.slice(1),settings:DEFAULT_SETTINGS});if(!r.ok)throw new Error(r.error)
 let c=r.career;const b=botDraft(c.catalog.cards,hash(`${c.id}:draft`),'value')
 for(const p of b.draft.picks)c=act(c,{kind:'draft',move:{kind:'pick',id:p.id}})
 return act(act(c,{kind:'draft-confirm'}),{kind:'ack'})
}
const lineupOf=(c:Career,extra:Record<string,unknown>={})=>{const l=me(c).lineup;return {kind:'lineup',formation:l.formation,xi:[...l.xi],bench:[...l.bench],tactics:l.tactics,...extra} as Intent}

describe('captain and vice-captain',()=>{
 it('the armband goes to the captain when he starts, else the vice when HE starts, else the most-starred man',()=>{
  const stars:Record<string,number>={a:2,b:3,c:5,d:1}
  const card=(id:string)=>({stars:stars[id]??0})
  expect(captainOf({xi:['a','b','c'],captain:'a',vice:'b'},card)).toBe('a')
  expect(captainOf({xi:['b','c','d'],captain:'a',vice:'b'},card)).toBe('b')
  expect(captainOf({xi:['c','d'],captain:'a',vice:'b'},card)).toBe('c')
  expect(captainOf({xi:['b','d'],vice:'b'},card)).toBe('b')
 })
 it('the lineup action stores both, refuses one man in both roles, and refuses a man from outside the squad',()=>{
  let c=drafted();const xi=me(c).lineup.xi,[a,b]=[xi[3]!,xi[4]!]
  c=act(c,lineupOf(c,{captain:a,vice:b}));expect(me(c).lineup.captain).toBe(a);expect(me(c).lineup.vice).toBe(b)
  expect(tryAct(c,lineupOf(c,{captain:a,vice:a})).ok).toBe(false)
  expect(tryAct(c,lineupOf(c,{vice:'not-a-man-of-ours'})).ok).toBe(false)
  // the captain drops to the bench: the vice wears the armband on the view and on the match snapshot
  const lu=me(c).lineup,i=lu.xi.indexOf(a),xi2=[...lu.xi],bench2=[...lu.bench];xi2[i]=bench2[0]!;bench2[0]=a
  c=act(c,{kind:'lineup',formation:lu.formation,xi:xi2,bench:bench2,tactics:lu.tactics,vice:b} as Intent)
  expect(me(c).lineup.captain).toBe(a);expect(careerView(c).lineup.captain).toBe(b);expect(careerView(c).lineup.captainPick).toBe(a)
  // back in the eleven, he has it again
  c=act(c,{kind:'lineup',formation:lu.formation,xi:lu.xi,bench:lu.bench,tactics:lu.tactics} as Intent);expect(careerView(c).lineup.captain).toBe(a)
 })
 it('parseAction keeps vice and meet, and drops anything else',()=>{
  const p=parseAction({kind:'lineup',key:'abcdefgh12',rev:3,formation:'4-3-3',xi:[],bench:[],tactics:{approach:'balanced',pressing:'medium',tempo:'normal'},captain:'x',vice:'y',meet:true})
  expect(p).toMatchObject({kind:'lineup',captain:'x',vice:'y',meet:true})
  expect(parseAction({kind:'lineup',key:'abcdefgh12',rev:3,formation:'4-3-3',xi:[],bench:[],tactics:{approach:'balanced',pressing:'medium',tempo:'normal'},vice:7})).toBeNull()
 })
 it('the "best fit eleven" keeps both titles',()=>{
  let c=drafted('beefcafe00000002');const xi=me(c).lineup.xi
  c=act(c,lineupOf(c,{captain:xi[1]!,vice:xi[2]!}));c=act(c,{kind:'auto'})
  const l=me(c).lineup;expect(l.vice).toBe(xi[2]);expect(l.captain).toBe(xi[1])
 })
})

describe('meet your squad',()=>{
 it('is waiting after the board, and is done once the eleven is confirmed with it — never again',()=>{
  let c=drafted('beefcafe00000003');expect(careerView(c).meet).toBe(true)
  c=act(c,lineupOf(c));expect(careerView(c).meet).toBe(true)
  c=act(c,lineupOf(c,{meet:true}));expect(careerView(c).meet).toBe(false);expect(c.meet).toBe('done')
 })
 it('an older career with no flag never shows it',()=>{
  const c=drafted('beefcafe00000004');delete (c as {meet?:unknown}).meet;expect(careerView(c).meet).toBe(false)
 })
})

describe('season numbers',()=>{
 function season(id:string){let c=drafted(id);for(let i=0;i<40&&c.phase!=='season-end';i++){if(c.phase==='window')c=act(c,{kind:'close-window'});else c=isBye(c)?act(c,{kind:'play-round'}):act(c,{kind:'match-start',mode:'fast'})}return c}
 it('every goal, assist and card in the logs is counted once, for the right club',()=>{
  const c=season('beefcafe00000005'),rows=seasonRows(c)
  const fx=c.season.fixtures.filter(f=>f.result),goals=fx.reduce((a,f)=>a+f.result!.events.filter(e=>e.kind==='goal').length,0)
  expect(rows.reduce((a,r)=>a+r.goals,0)).toBe(goals)
  expect(rows.reduce((a,r)=>a+r.yellows,0)).toBe(fx.reduce((a,f)=>a+f.result!.events.filter(e=>e.kind==='yellow').length,0))
  expect(rows.reduce((a,r)=>a+r.assists,0)).toBe(fx.reduce((a,f)=>a+f.result!.events.filter(e=>e.kind==='goal'&&e.other).length,0))
  // eleven starters a match, plus the men brought on
  const subs=fx.reduce((a,f)=>a+f.result!.events.filter(e=>e.kind==='sub').length,0)
  expect(rows.reduce((a,r)=>a+r.apps,0)).toBe(fx.length*22+subs)
  // a clean sheet per side that conceded nothing
  expect(rows.reduce((a,r)=>a+r.cleanSheets,0)).toBe(fx.reduce((a,f)=>a+(f.result!.goals[0]===0?1:0)+(f.result!.goals[1]===0?1:0),0))
  const clubs=new Set(c.teams.map(t=>t.club));expect(rows.every(r=>clubs.has(r.club))).toBe(true)
 })
 it('the finished season keeps its numbers in the record, and the view lists it',()=>{
  let c=season('beefcafe00000006');const rec=c.history.at(-1)!;expect(rec.stats?.length).toBeGreaterThan(0)
  expect(careerView(c).stats.map(s=>s.season)).toEqual([1])
  c=act(c,{kind:'next-season'});const v=careerView(c);expect(v.stats.map(s=>[s.season,s.current])).toEqual([[2,true],[1,false]])
 })
 it('a board is sorted, top five, zeros left out, and the club board holds only that club',()=>{
  const c=season('beefcafe00000007'),rows=seasonRows(c),b=boards(rows,c.clubId),mine=boards(rows,c.clubId,{club:c.clubId})
  for(const x of b){expect(x.rows.length).toBeLessThanOrEqual(5);expect(x.rows.every(r=>r.value>0)).toBe(true);for(let i=1;i<x.rows.length;i++)expect(x.rows[i-1]!.value).toBeGreaterThanOrEqual(x.rows[i]!.value)}
  for(const x of mine)expect(x.rows.every(r=>r.club===c.clubId&&r.mine)).toBe(true)
 })
 it('no screen prints a hidden rating or the armband edge',()=>{
  for(const f of ['components/legends/MeetSquad.tsx','components/legends/Stats.tsx','components/legends/TeamSheet.tsx']){const s=readFileSync(f,'utf8');expect(s).not.toMatch(/captainBoost|1\.03|hidden rating|\brating\b/)}
 })
})
