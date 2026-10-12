import {describe,expect,it} from 'vitest'
import {hash} from '@/lib/clubs/rumble-rng'
import {DEFAULT_SETTINGS} from '@/lib/legends/config'
import {applyAction,createCareer,isBye,type Action,type Intent} from '@/lib/legends/career'
import {botDraft} from '@/lib/legends/draft'
import {legendsReel} from '@/lib/legends/reel'
import {careerView} from '@/lib/legends/view'
import {sceneFor,storyOf,closingFor} from '@/lib/highlights/scenes'
import {clash,PALETTE,paletteFor} from '@/lib/highlights/kit'
import {highlightsAllow} from '@/lib/highlights/page'
import {CELEBRATIONS,type Moment,type PixelKit,type Reel,type ReelTeam} from '@/lib/highlights/types'
import type {Career} from '@/lib/legends/types'
import {LEAGUE} from '../legends/fixtures'

/* invented placeholder sides — no real people */
const kit=(shirt:string,second:string|null=null):PixelKit=>({shirt,second,pattern:second?'stripes':'plain',shorts:'#FFFFFF',socks:shirt})
const POS=['GK','DF','DF','DF','DF','MF','MF','MF','FW','FW','FW'] as const
const side=(p:string,k:PixelKit,n=11):ReelTeam=>({name:`${p} Town`,code:p.slice(0,3).toUpperCase(),kit:k,keeper:kit('#151515'),lineup:POS.slice(0,n).map((pos,i)=>({id:`${p}${i}`,no:i+1,name:`Player ${p}${i}`,pos,kit:pos==='GK'?kit('#151515'):k}))})
const reelOf=(moments:Moment[],n=11):Reel=>({id:'r',seed:7,teams:[side('aa',kit('#D7261E')),side('bb',kit('#1C2F93','#FFFFFF'))].map(t=>({...t,lineup:t.lineup.slice(0,n)})) as [ReelTeam,ReelTeam],moments,final:[1,0],pens:null,mine:0})

describe('the highlight scenes',()=>{
 it('the same moment always plays the same way',()=>{
  const r=reelOf([{minute:12,side:0,kind:'goal',player:'aa9',score:[1,0]}])
  expect(JSON.stringify(sceneFor(r,r.moments[0]!,0))).toBe(JSON.stringify(sceneFor(r,r.moments[0]!,0)))
 })
 it('many different scenes: a hundred goals with no shape show at least ten kinds of move',()=>{
  const r=reelOf([]),variants=new Set<string>()
  for(let i=0;i<100;i++){const m:Moment={minute:1+i%90,side:(i%2) as 0|1,kind:'goal',score:[1,0]};variants.add(sceneFor({...r,seed:hash(`v${i}`)},m,i).variant)}
  expect(variants.size).toBeGreaterThanOrEqual(10)
 })
 it('no man appears twice in a scene — eleven a side and five a side, every kind of moment',()=>{
  for(const n of [11,5])for(const kind of ['goal','save','miss','post','block','offside','yellow','red','injury'] as const)for(let i=0;i<30;i++){
   const r=reelOf([],n),sc=sceneFor({...r,seed:i},{minute:30,side:(i%2) as 0|1,kind,score:[0,0]},i),ids=sc.actors.filter(a=>a.team>=0).map(a=>`${a.team}:${a.no}`)
   expect(new Set(ids).size).toBe(ids.length)
  }
 })
 it('a man the record names but the reel cannot find runs unnamed — never under somebody else’s name',()=>{
  const r=reelOf([]),sc=sceneFor(r,{minute:5,side:0,kind:'goal',player:'ghost',score:[1,0]},0)
  const names=sc.actors.map(a=>a.name)
  expect(names).toContain('')
 })
 it('a bench man is named when he scores and never drawn as a stand-in',()=>{
  const r=reelOf([]);r.teams[0].lineup.push({id:'sub1',no:12,name:'Player sub',pos:'FW',kit:r.teams[0].kit,bench:true})
  for(let i=0;i<40;i++){const sc=sceneFor({...r,seed:i},{minute:70,side:0,kind:'save',player:'aa9',score:[0,0]},i);expect(sc.actors.some(a=>a.name==='Player sub')).toBe(false)}
  const sc=sceneFor(r,{minute:80,side:0,kind:'goal',player:'sub1',score:[1,0]},0);expect(sc.actors.some(a=>a.name==='Player sub'&&a.no===12)).toBe(true)
 })
 it('the story keeps every goal and red card, and the closing card follows the result',()=>{
  const ms:Moment[]=[...Array.from({length:14},(_,i)=>({minute:i*6+1,side:(i%2) as 0|1,kind:'save' as const,score:[0,0] as [number,number]})),{minute:50,side:0,kind:'goal',player:'aa9',score:[1,0]},{minute:60,side:1,kind:'red',player:'bb2',score:[1,0]}]
  const st=storyOf(reelOf(ms));expect(st.some(m=>m.kind==='goal')).toBe(true);expect(st.some(m=>m.kind==='red')).toBe(true);expect(st.length).toBeLessThanOrEqual(10)
  expect(closingFor(reelOf([]))).toBe('win');expect(closingFor({...reelOf([]),final:[0,3]})).toBe('game-over');expect(closingFor({...reelOf([]),champion:true})).toBe('champion')
 })
})

describe('a page’s paint (rule 95)',()=>{
 it('the hub shows every film and the yellow card; a page that bans green loses the green grass and the green keeper',()=>{
  const hub=highlightsAllow(undefined,{us:'#D7261E',them:'#1C2F93'});expect(hub.fx).toEqual([...CELEBRATIONS]);expect(hub.yellowCard).toBe(true)
  const green=(h:string)=>{const [r=0,g=0,b=0]=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));return g>r+30&&g>b+10}
  const p=highlightsAllow(green,{us:'#D7261E',them:'#0B7A3B'})
  expect(green(p.palette.grassA)).toBe(false);expect(p.keepers.some(green)).toBe(false);expect(p.primary.them).not.toBe('#0B7A3B')
  const yellow=(h:string)=>h.toUpperCase()===PALETTE.cardYellow.toUpperCase()||h.toUpperCase()==='#F2C21B'
  const y=highlightsAllow(yellow,{});expect(y.yellowCard).toBe(false);expect(y.fx).not.toContain('goal');expect(paletteFor(yellow).flagA).not.toBe(PALETTE.flagA)
 })
})

describe('LEGENDS MANAGER results as reels',()=>{
 const NOW='2026-10-12T10:00:00.000Z',ctx={now:NOW,catalogs:new Map(LEAGUE.map(c=>[c.club,c.cards]))}
 let n=0
 const act=(c:Career,a:Intent)=>{const r=applyAction(c,{...a,key:`h${n++}xxxxxxx`,rev:c.revision} as Action,ctx);if(!r.ok)throw new Error(`${a.kind}: ${r.error}`);return r.career}
 function played(id:string):Career{
  const r=createCareer({id,owner:'o'.repeat(32),now:NOW,own:LEAGUE[0]!,rivals:LEAGUE.slice(1),settings:DEFAULT_SETTINGS});if(!r.ok)throw new Error(r.error)
  let c=r.career;const b=botDraft(c.catalog.cards,hash(`${c.id}:draft`),'value');for(const p of b.draft.picks)c=act(c,{kind:'draft',move:{kind:'pick',id:p.id}})
  c=act(act(act(c,{kind:'draft-confirm'}),{kind:'ack'}),{kind:'close-window'})
  for(let i=0;i<3;i++){if(isBye(c))c=act(c,{kind:'play-round'});else c=act(c,{kind:'match-start',mode:'fast'})}
  return c
 }
 it('two elevens as they kicked off, every goal named from the log, the score counted from the goals',()=>{
  const c=played('c0ffee00000000a1'),v=careerView(c),f=c.season.fixtures.find(x=>x.id===v.last!.id)!
  const reel=legendsReel(c,f,{})!;expect(reel).not.toBeNull()
  for(const t of reel.teams){expect(t.lineup.filter(p=>!p.bench)).toHaveLength(11);expect(t.lineup.filter(p=>p.pos==='GK'&&!p.bench).length).toBeGreaterThanOrEqual(1)}
  const goals=reel.moments.filter(m=>m.kind==='goal');expect(goals).toHaveLength(f.result!.goals[0]+f.result!.goals[1])
  for(const g of goals)expect(reel.teams[g.side].lineup.some(p=>p.id===g.player)).toBe(true)
  expect(reel.final).toEqual(f.result!.goals);expect(reel.mine).toBe(f.home===c.clubId?0:1)
  expect(clash(reel.teams[0].keeper,reel.teams[1].kit)).toBe(false)
 },60_000)
})
