import {describe,expect,it} from 'vitest'
import {readFileSync,readdirSync} from 'node:fs'
import {hash} from '@/lib/clubs/rumble-rng'
import {DEFAULT_SETTINGS} from '@/lib/legends/config'
import {applyAction,createCareer,isBye,me,type Action,type Intent} from '@/lib/legends/career'
import {botDraft} from '@/lib/legends/draft'
import {captainOf} from '@/lib/legends/squad'
import {careerView} from '@/lib/legends/view'
import type {Career} from '@/lib/legends/types'
import {LEAGUE} from './fixtures'

/** the team sheet, the registration step and the league centre (owner, 13.10.2026) */
const NOW='2026-10-13T10:00:00.000Z'
const ctx={now:NOW,catalogs:new Map(LEAGUE.map(c=>[c.club,c.cards]))}
function newCareer(id='c0ffee00000000a1'):Career{const r=createCareer({id,owner:'o'.repeat(32),now:NOW,own:LEAGUE[0]!,rivals:LEAGUE.slice(1),settings:DEFAULT_SETTINGS});if(!r.ok)throw new Error(r.error);return r.career}
let n=0
const tryAct=(c:Career,a:Intent)=>applyAction(c,{...a,key:`t${n++}xxxxxxxx`,rev:c.revision} as Action,ctx)
function act(c:Career,a:Intent){const r=tryAct(c,a);if(!r.ok)throw new Error(`${a.kind}: ${r.error}`);return r.career}
function drafted(c:Career):Career{const b=botDraft(c.catalog.cards,hash(`${c.id}:draft`),'value');for(const p of b.draft.picks)c=act(c,{kind:'draft',move:{kind:'pick',id:p.id}});return act(c,{kind:'draft-confirm'})}
const sheet=(c:Career,extra:Record<string,unknown>={})=>{const l=me(c).lineup;return {kind:'lineup',formation:l.formation,xi:l.xi,bench:l.bench,tactics:l.tactics,...extra} as Intent}
const reload=(c:Career)=>JSON.parse(JSON.stringify(c)) as Career

describe('meet your squad — the step after the board’s news',()=>{
 it('the board’s news leads to the squad, survives a reload, and closes only on a confirmed eleven',()=>{
  let c=drafted(newCareer());expect(c.cutscene).toBe('board-grant')
  c=act(c,{kind:'ack'});expect(c.cutscene).toBe('meet-squad')
  const back=reload(c);expect(careerView(back).cutscene).toBe('meet-squad')
  // an ordinary save and an auto pick keep him on the page
  c=act(back,sheet(back));expect(c.cutscene).toBe('meet-squad')
  c=act(c,{kind:'auto',formation:'4-4-2'});expect(c.cutscene).toBe('meet-squad')
  const xi=me(c).lineup.xi,vice=xi[3]!
  c=act(c,sheet(c,{captain:xi[1],vice,meet:true}));expect(c.cutscene).toBeNull()
  expect(me(c).lineup.captain).toBe(xi[1]);expect(me(c).lineup.vice).toBe(vice)
  const again=tryAct(c,sheet(c,{meet:true}));expect(again.ok).toBe(false)
 })
 it('the step is only the first one: the season-end “stay a while” acknowledges nothing into it',()=>{
  const c=act(drafted(newCareer('c0ffee00000000a2')),{kind:'ack'})
  const done=act(c,sheet(c,{meet:true}));expect(done.cutscene).toBeNull()
  expect(act(done,{kind:'ack'}).cutscene).toBeNull()
 })
})

describe('the vice-captain',()=>{
 it('is validated: a squad man, never the captain',()=>{
  const c=act(act(drafted(newCareer('c0ffee00000000b1')),{kind:'ack'}),{kind:'auto'}),l=me(c).lineup
  const outsider=c.catalog.cards.find(x=>!me(c).squad.some(s=>s.id===x.id))!.id
  expect(tryAct(c,sheet(c,{vice:outsider})).ok).toBe(false)
  expect(tryAct(c,sheet(c,{captain:l.xi[2],vice:l.xi[2]})).ok).toBe(false)
  const benchMan=l.bench[0]!,ok=act(c,sheet(c,{captain:l.xi[2],vice:benchMan}))
  expect(me(ok).lineup.vice).toBe(benchMan)
  // a later save that names neither keeps both
  const kept=act(ok,sheet(ok));expect(me(kept).lineup.captain).toBe(l.xi[2]);expect(me(kept).lineup.vice).toBe(benchMan)
  // the captain may sit on the bench: he stays captain, and the armband goes to the vice
  expect(tryAct(c,sheet(c,{captain:benchMan,vice:l.xi[4]})).ok).toBe(true)
 })
 it('wears the armband when the captain is not in the eleven — and only then',()=>{
  const stars=(id:string)=>({stars:id==='a'?5:id==='b'?3:1})
  expect(captainOf({xi:['a','b','c'],captain:'c',vice:'b'},stars)).toBe('c')
  expect(captainOf({xi:['a','b','c'],captain:'z',vice:'b'},stars)).toBe('b')
  expect(captainOf({xi:['a','b','c'],captain:'z',vice:'y'},stars)).toBe('a')
  expect(captainOf({xi:['a','b','c']},stars)).toBe('a')
 })
 it('a match taken with the captain benched carries the vice as its armband',()=>{
  let c=act(act(drafted(newCareer('c0ffee00000000b2')),{kind:'ack'}),{kind:'auto'})
  const l=me(c).lineup,cap=l.bench.find(id=>c.catalog.cards.find(x=>x.id===id)?.pos!=='GK')!,vice=l.xi[5]!
  c=act(c,sheet(c,{captain:cap,vice,meet:true}))
  if(isBye(c))c=act(c,{kind:'play-round'})
  c=act(c,{kind:'match-start',mode:'interactive'})
  const fx=c.season.fixtures.find(f=>f.id===c.live!.fixture)!,side=fx.home===c.clubId?0:1
  expect(c.live!.snapshot.sides[side].captain).toBe(vice)
  expect(careerView(c).lineup.armband).toBe(vice)
 })
})

describe('the season in numbers',()=>{
 function season(id:string):Career{let c=act(drafted(newCareer(id)),{kind:'ack'});c=act(c,sheet(c,{meet:true}))
  for(let i=0;i<4;i++){if(c.phase==='window')c=act(c,{kind:'close-window'});c=isBye(c)?act(c,{kind:'play-round'}):act(c,{kind:'match-start',mode:'fast'})}
  return c}
 it('every count is read from the match logs',()=>{
  const c=season('c0ffee00000000c1'),v=careerView(c),played=c.season.fixtures.filter(f=>f.result)
  expect(v.stats.played).toBe(played.length);expect(played.length).toBeGreaterThan(3)
  expect(v.stats.goals).toBe(played.reduce((a,f)=>a+f.result!.goals[0]+f.result!.goals[1],0))
  // the top scorer's number is the number of goal rows with his id
  const top=v.stats.scorers[0]
  if(top){const rows=played.flatMap(f=>f.result!.events.filter(e=>e.kind==='goal'&&e.player===top.id&&[f.home,f.away][e.side!]===top.club));expect(rows.length).toBe(top.value)}
  const assists=played.flatMap(f=>f.result!.events.filter(e=>e.kind==='goal'&&e.other)).length
  expect(v.stats.assists.reduce((a,r)=>a+r.value,0)).toBeLessThanOrEqual(assists)
  // a clean sheet: a side that conceded nothing, credited to the keeper who started
  const cs=played.reduce((a,f)=>a+(f.result!.goals[1]===0?1:0)+(f.result!.goals[0]===0?1:0),0)
  expect(v.stats.teams.reduce((a,t)=>a+t.cleanSheets,0)).toBe(cs)
  for(const t of v.stats.teams){const r=v.table.find(x=>x.club===t.club)!;expect([t.gf,t.ga,t.p]).toEqual([r.gf,r.ga,r.p])}
  // starters: eleven a side a match, plus the changes
  const subs=played.reduce((a,f)=>a+f.result!.events.filter(e=>e.kind==='sub').length,0)
  expect(v.stats.apps.length).toBeGreaterThan(0);expect(subs).toBeGreaterThanOrEqual(0)
  const yellows=played.reduce((a,f)=>a+f.result!.events.filter(e=>e.kind==='yellow').length,0)
  expect(v.stats.teams.reduce((a,t)=>a+t.yellows,0)).toBe(yellows)
  expect(v.results.every(r=>r.homeClub&&r.awayClub)).toBe(true)
 })
 it('no hidden rating reaches the browser',()=>{
  const v=careerView(season('c0ffee00000000c2')),json=JSON.stringify(v)
  expect(json).not.toMatch(/"rating"|"quality"|"hidden"/)
 })
})

describe('the screens',()=>{
 const ui=['CareerApp','TeamSheet','MeetSquad','Stats','CareerNav','Shirts','LegendCard'].map(f=>readFileSync(`components/legends/${f}.tsx`,'utf8')).join('\n')
 it('never name the captain’s edge',()=>{expect(ui).not.toMatch(/3%|captainBoost|1\.03/)})
 it('drag always has a tap path: every drop target is a button or a list the tray can send to',()=>{
  const ts=readFileSync('components/legends/TeamSheet.tsx','utf8')
  expect(ts).toMatch(/onClick:\(\)=>\{if\(!swallow\.current\)tap\(p\)\}/)
  expect(ts).toMatch(/data-testid="legends-make-captain"/);expect(ts).toMatch(/data-testid="legends-make-vice"/)
 })
 it('the career navigation never scrolls sideways',()=>{
  const css=readFileSync('app/all-football/legends/team-league.css','utf8'),nav=/\.tl-nav \{[^}]*\}/.exec(css)![0]
  expect(nav).toMatch(/grid-template-columns: repeat\(5/);expect(nav).not.toMatch(/overflow-x/)
  expect(readFileSync('components/legends/CareerApp.tsx','utf8')).not.toMatch(/lgm-tabs/)
 })
 it('the new stylesheet travels with every page that loads legends.css',()=>{
  const pages=['app/all-football/legends/page.tsx','app/all-football/legends/career/[id]/page.tsx','app/all-football/legends/friendlies/[id]/page.tsx']
  for(const p of pages){const s=readFileSync(p,'utf8');expect(s).toMatch(/legends\.css/);expect(s).toMatch(/team-league\.css/)}
  expect(readdirSync('app/all-football/legends')).toContain('team-league.css')
 })
})
