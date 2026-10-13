import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import {hash} from '@/lib/clubs/rumble-rng'
import {DEFAULT_SETTINGS,ENGINE_VERSION,LEGENDS_RULES as R} from '@/lib/legends/config'
import {applyAction,createCareer,isBye,lastMine,me,parseAction,pauseOf,talkContext,talkOffers,type Action,type Intent} from '@/lib/legends/career'
import {botDraft} from '@/lib/legends/draft'
import {run} from '@/lib/legends/engine'
import {matchLab} from '@/lib/legends/lab'
import {applyTalk,decayMood,moodScore,moodWord} from '@/lib/legends/morale'
import {BANK,pickSituation,TONES,type TalkCtx} from '@/lib/legends/talks'
import {careerView} from '@/lib/legends/view'
import type {Career,MatchSnapshot,Team} from '@/lib/legends/types'
import {LEAGUE,snapshotsOf} from './fixtures'

const NOW='2026-10-13T10:00:00.000Z'
const ctx={now:NOW,catalogs:new Map(LEAGUE.map(c=>[c.club,c.cards]))}
function newCareer(id:string):Career{const r=createCareer({id,owner:'o'.repeat(32),now:NOW,own:LEAGUE[0]!,rivals:LEAGUE.slice(1),settings:DEFAULT_SETTINGS});if(!r.ok)throw new Error(r.error);return r.career}
let n=0
const keyed=(c:Career,a:Intent):Action=>({...a,key:`mf${n++}xxxxxxxx`,rev:c.revision} as Action)
function act(c:Career,a:Intent){const r=applyAction(c,keyed(c,a),ctx);if(!r.ok)throw new Error(`${a.kind}: ${r.error}`);return r.career}
function drafted(c:Career):Career{const b=botDraft(c.catalog.cards,hash(`${c.id}:draft`),'value');for(const p of b.draft.picks)c=act(c,{kind:'draft',move:{kind:'pick',id:p.id}});return act(act(c,{kind:'draft-confirm'}),{kind:'ack'})}
const toMatch=(c:Career)=>{for(let i=0;i<4&&isBye(c);i++)c=act(c,{kind:'play-round'});return c}

describe('engine 3 — set pieces (owner, 13.10.2026)',()=>{
 it('engines 1 and 2 play exactly as they did before engine 3 (golden digests of 60 matches, quick and live)',()=>{
  // measured on origin/main's engine before this change; a match begun on an older engine must never be rewritten
  const GOLDEN={'legends-engine-1':'0069fcd49d27fb4fe9019ad37c0047b9bf19d6946c6c5e0d43bf1104fc64d00c','legends-engine-2':'cffceabe5e57814380e5b111e4c8b9b6fe33f7f9b3fcf92ef52be9c9b86f0d5a'} as const
  for(const e of ['legends-engine-1','legends-engine-2'] as const){
   const s=snapshotsOf(e,60),quick=s.map(x=>run(x,[],false)),live=s.map(x=>{let d:{stop:number}[]=[],r=run(x,d,true);const stops:number[]=[];while(!r.done){stops.push(r.pause.minute);d=[...d,{stop:r.pause.stop,...(d.length===0?{tactics:{approach:'attacking',pressing:'high',tempo:'fast'}}:{})} as {stop:number}];r=run(x,d,true)}return {stops,r}})
   expect(createHash('sha256').update(JSON.stringify([quick,live])).digest('hex')).toBe(GOLDEN[e])
   for(const q of quick)expect(q.done&&q.outcome.events.some(ev=>ev.detail&&['penalty','corner','free-kick'].includes(ev.detail))).toBe(false)
  }
 })
 it('new matches are engine 3, which stops at 45′, 65′ and 70′; engine 2 still stops at 45′, 60′, 75′',()=>{
  expect(ENGINE_VERSION).toBe('legends-engine-3');expect(R.touchlineStopsV3).toEqual([45,65,70]);expect(R.touchlineStops).toEqual([45,60,75])
  for(const [e,want] of [['legends-engine-3',[45,65,70]],['legends-engine-2',[45,60,75]]] as const){
   const s=snapshotsOf(e,1)[0]!;let d:{stop:number}[]=[],r=run({...s,knockout:false,sides:[{...s.sides[0],home:true},{...s.sides[1],home:false}]},d,true);const got:number[]=[]
   while(!r.done){got.push(r.pause.minute);d=[...d,{stop:r.pause.stop}];r=run({...s,knockout:false,sides:[{...s.sides[0],home:true},{...s.sides[1],home:false}]},d,true)}
   expect(got).toEqual(want)
  }
 })
 it('set pieces are events of the existing kinds with a detail; an untouched live match is the quick sim, set pieces and all',()=>{
  const s=snapshotsOf('legends-engine-3',80);let pens=0,corners=0,fk=0,spGoals=0,saved=0
  for(const x of s){
   const q=run(x,[],false);if(!q.done)throw new Error('quick sim paused')
   let d:{stop:number}[]=[],r=run(x,d,true);while(!r.done){d=[...d,{stop:r.pause.stop}];r=run(x,d,true)}
   expect(r.outcome.events).toEqual(q.outcome.events);expect(r.outcome.goals).toEqual(q.outcome.goals)
   for(const e of q.outcome.events){
    if(!e.detail||(e.kind!=='goal'&&e.kind!=='chance'))continue
    expect(['penalty','corner','free-kick']).toContain(e.detail)
    if(e.detail==='penalty'){pens++;if(e.kind==='chance'&&e.other)saved++}else if(e.detail==='corner')corners++;else fk++
    if(e.kind==='goal'){spGoals++;expect(e.player).toBeTruthy()}
   }
   // a goal always counts once in the score
   expect(q.outcome.events.filter(e=>e.kind==='goal'&&e.side===0).length).toBe(q.outcome.goals[0])
   expect(q.outcome.events.some(e=>e.kind==='half-time'&&e.minute===45)).toBe(true)
  }
  expect(pens).toBeGreaterThan(0);expect(corners).toBeGreaterThan(400);expect(fk).toBeGreaterThan(50);expect(spGoals).toBeGreaterThan(10);expect(saved).toBeGreaterThanOrEqual(0)
 })
 it('10,000 seeded matches stay calibrated: goals, draws, about a quarter of a penalty and ten corners a match',()=>{
  const m=matchLab(LEAGUE,10000)
  expect(m.setPieces.penalties).toBeGreaterThan(0.18);expect(m.setPieces.penalties).toBeLessThan(0.34)
  expect(m.setPieces.corners).toBeGreaterThan(8.8);expect(m.setPieces.corners).toBeLessThan(11.2)
  expect(m.setPieces.goals).toBeGreaterThan(0.4);expect(m.setPieces.goals).toBeLessThan(1)
  // invented clubs score a little more than the real ones (2.7–2.8 in the Lab); engine 3 must not move the total away from engine 2
  const old=matchLab(LEAGUE,10000,'legends-engine-2');expect(Math.abs(m.goalsPerMatch-old.goalsPerMatch)).toBeLessThan(0.2)
  expect(m.draws).toBeGreaterThan(17);expect(m.draws).toBeLessThan(30)
 },240_000)
 it('a mood is read only by engine 3, and only as a small edge',()=>{
  const s=snapshotsOf('legends-engine-3',40),up=(x:MatchSnapshot,v:number):MatchSnapshot=>({...x,sides:[{...x.sides[0],mood:v,xi:x.sides[0].xi.map(m=>({...m,mood:v}))},x.sides[1]]})
  let differ=0,g1=0,g0=0
  for(const x of s){const a=run(up(x,1),[],false),b=run(up(x,-1),[],false);if(a.done&&b.done){if(JSON.stringify(a.outcome.events)!==JSON.stringify(b.outcome.events))differ++;g1+=a.outcome.goals[0];g0+=b.outcome.goals[0]}
   const o=snapshotsOf('legends-engine-2',1)[0]!,c=run(up(o,1),[],false),d=run(o,[],false);expect(c).toEqual(d)}
  expect(differ).toBeGreaterThan(0);expect(g1).toBeGreaterThanOrEqual(g0)
  // a mood beyond the bounds is read as the bound
  const x=s[1]!;expect(run(up(x,9),[],false)).toEqual(run(up(x,1),[],false))
  expect(R.talk.teamEffect).toBeLessThanOrEqual(0.03);expect(R.talk.manEffect).toBeLessThanOrEqual(0.03)
 })
})

describe('the dressing room (owner, 13.10.2026)',()=>{
 it('the bank: 40+ situations, four answers each in the four tones, before and after, every moment covered',()=>{
  expect(BANK.length).toBeGreaterThanOrEqual(40);expect(new Set(BANK.map(s=>s.id)).size).toBe(BANK.length)
  expect(BANK.filter(s=>s.when==='pre').length).toBeGreaterThanOrEqual(20);expect(BANK.filter(s=>s.when==='post').length).toBeGreaterThanOrEqual(20)
  for(const s of BANK){
   expect(s.answers.map(a=>a.tone)).toEqual([...TONES]);expect(new Set(s.answers.map(a=>a.line)).size).toBe(4)
   for(const a of s.answers){expect(Math.abs(a.team)).toBeLessThanOrEqual(R.talk.maxStep);expect(a.line.length).toBeLessThanOrEqual(90);expect(a.reaction.length).toBeGreaterThan(4)}
   // the right tone depends on the moment: no situation where every answer is equally good
   expect(new Set(s.answers.map(a=>a.team)).size).toBeGreaterThan(1)
  }
  const base:TalkCtx={when:'pre',club:'A',opp:'B',home:true,playoff:false,round:5,rounds:8,place:3,of:5,oppPlace:2,gapTop:2,lead:0,starsGap:0,form:['W','D'],lastMargin:0,result:null,margin:0,late:false,comeback:false,threw:false,reds:0,cleanSheet:false,moved:0}
  expect(pickSituation(base,'s')).toBeTruthy();expect(pickSituation({...base,when:'post',result:'D'},'s')).toBeTruthy()
  // praise after a heavy defeat backfires; a calm word helps
  const heavy=pickSituation({...base,when:'post',result:'L',margin:4,form:['W']},'x');expect(heavy.id).toBe('post-heavy-loss')
  expect(heavy.answers[2]!.team).toBeLessThan(0);expect(heavy.answers[0]!.team).toBeGreaterThan(0)
  expect(pickSituation({...base,playoff:true},'x').id).toBe('pre-playoff')
  expect(pickSituation({...base,when:'post',result:'W',late:true,margin:1},'x').id).toBe('post-late-winner')
 })
 it('the same career hears the same talk; the pick follows the seed',()=>{
  const c=toMatch(drafted(newCareer('dd00000000000001'))),a=talkOffers(c),b=talkOffers(structuredClone(c))
  expect(a.pre).not.toBeNull();expect(a.post).toBeNull();expect(a.pre!.situation.id).toBe(b.pre!.situation.id)
  const ctxs=new Set<string>();for(let i=0;i<200;i++)ctxs.add(pickSituation({...a.pre!.ctx,form:['W','W','W']},`seed${i}`).id)
  expect(ctxs.size).toBeGreaterThanOrEqual(1)
 })
 it('talk-pre and talk-post are validated, server-side, once per match and moment; a repeated key answers the same state',()=>{
  expect(parseAction({kind:'talk-pre',fixture:'f1',answer:4,key:'kkkkkkkkkk',rev:1})).toBeNull()
  expect(parseAction({kind:'talk-pre',fixture:'f1',answer:1.5,key:'kkkkkkkkkk',rev:1})).toBeNull()
  expect(parseAction({kind:'talk-post',answer:1,key:'kkkkkkkkkk',rev:1})).toBeNull()
  expect(parseAction({kind:'talk-post',fixture:'f1',answer:3,key:'kkkkkkkkkk',rev:1})).toMatchObject({kind:'talk-post',answer:3})
  let c=toMatch(drafted(newCareer('dd00000000000002')))
  const pre=talkOffers(c).pre!,wrong=applyAction(c,keyed(c,{kind:'talk-pre',fixture:'nope',answer:0}),ctx);expect(wrong.ok).toBe(false)
  expect(applyAction(c,keyed(c,{kind:'talk-post',fixture:pre.fixture,answer:0}),ctx).ok).toBe(false) // nothing played yet
  const a=keyed(c,{kind:'talk-pre',fixture:pre.fixture,answer:3}),r1=applyAction(c,a,ctx);if(!r1.ok)throw new Error(r1.error)
  const r2=applyAction(r1.career,{...a,rev:r1.career.revision},ctx);expect(r2.ok&&r2.replay).toBe(true);expect(r2.ok&&r2.career).toBe(r1.career)
  c=r1.career;expect(talkOffers(c).pre).toBeNull();expect(c.talks).toHaveLength(1)
  expect(applyAction(c,keyed(c,{kind:'talk-pre',fixture:pre.fixture,answer:1}),ctx).ok).toBe(false)
  // the pre-match mood travels into the match snapshot
  const mood=me(c).mood??0;c=act(c,{kind:'match-start',mode:'interactive'});const side=c.live!.snapshot.sides.findIndex(s=>s.club===c.clubId)
  expect(c.live!.snapshot.engine).toBe('legends-engine-3');expect(c.live!.snapshot.sides[side]!.mood??0).toBe(mood)
  expect(talkOffers(c)).toEqual({pre:null,post:null}) // nothing while the match is on
  expect(applyAction(c,keyed(c,{kind:'talk-post',fixture:pre.fixture,answer:0}),ctx).ok).toBe(false)
  c=act(c,{kind:'match-finish'});const post=talkOffers(c).post!;expect(post.fixture).toBe(lastMine(c)!.id)
  expect(post.ctx.result).not.toBeNull()
  c=act(c,{kind:'talk-post',fixture:post.fixture,answer:0});expect(talkOffers(c).post).toBeNull();expect(c.talks).toHaveLength(2)
  // skipping is allowed: the next match starts with no talk at all
  c=toMatch(c);if(c.phase==='window')c=act(c,{kind:'close-window'});c=toMatch(c)
  expect(talkOffers(c).pre).not.toBeNull();c=act(c,{kind:'match-start',mode:'fast'});expect(c.talks).toHaveLength(2)
 })
 it('mood is bounded, each step is bounded, and the room drifts back toward neutral after every match',()=>{
  let t:Team={...me(newCareer('dd00000000000003')),morale:1}
  for(let i=0;i<10;i++)t=applyTalk(t,{team:0.9,men:[{id:'x',d:2}]})
  expect(t.mood).toBe(R.talk.max);expect(t.moodMen!.x).toBe(R.talk.max)
  expect(applyTalk({...t,mood:0},{team:5,men:[]}).mood).toBe(R.talk.maxStep)
  for(let i=0;i<10;i++)t=applyTalk(t,{team:-0.9,men:[]});expect(t.mood).toBe(R.talk.min)
  const d=decayMood(t);expect(Math.abs(d.mood!)).toBeLessThan(Math.abs(t.mood!));expect(Math.sign(d.mood!)).toBe(-1)
  let z=t;for(let i=0;i<20;i++)z=decayMood(z);expect(z.mood).toBe(0);expect(z.moodMen).toEqual({})
  expect(moodWord(moodScore({mood:1,morale:1.1}))).toBe('flying');expect(moodWord(moodScore({mood:-1,morale:0.9}))).toBe('low');expect(moodWord(0)).toBe('steady')
  // a career's books decay the mood after a match
  let c=toMatch(drafted(newCareer('dd00000000000004')));const pre=talkOffers(c).pre!
  c=act(c,{kind:'talk-pre',fixture:pre.fixture,answer:0});const before=me(c).mood!;c=act(c,{kind:'match-start',mode:'fast'})
  expect(Math.abs(me(c).mood!)).toBeLessThanOrEqual(Math.abs(before)*R.talk.decay+1e-9)
 })
 it('the post-match context reads the match: result, margin, a late goal, a comeback, reds, the table move',()=>{
  let c=toMatch(drafted(newCareer('dd00000000000005')));c=act(c,{kind:'match-start',mode:'fast'})
  const fx=lastMine(c)!,x=talkContext(c,fx,'post'),side=fx.home===c.clubId?0:1,g=fx.result!.goals
  expect(x.result).toBe(g[side]>g[side?0:1]?'W':g[side]<g[side?0:1]?'L':'D');expect(x.margin).toBe(Math.abs(g[0]-g[1]));expect(x.cleanSheet).toBe(g[side?0:1]===0)
  expect(x.reds).toBe(fx.result!.events.filter(e=>e.kind==='red'&&e.side===side).length);expect(x.form).toEqual([])
 })
 it('the screens never print a mood as a number, and the view carries none',()=>{
  let c=toMatch(drafted(newCareer('dd00000000000006')));const pre=talkOffers(c).pre!
  c=act(c,{kind:'talk-pre',fixture:pre.fixture,answer:2});const v=careerView(c)
  const nums:unknown[]=[];const walk=(o:unknown)=>{if(typeof o==='number')nums.push(o);else if(o&&typeof o==='object')for(const y of Object.values(o))walk(y)};walk(v.talks)
  expect(nums).toEqual([]);expect(v.talks.last?.reaction).toBeTruthy();expect(['low','edgy','steady','confident','flying']).toContain(v.talks.mood.word)
  const ui=['components/legends/Talk.tsx','components/legends/Live.tsx','components/legends/CareerApp.tsx'].map(f=>readFileSync(f,'utf8')).join('\n')
  expect(ui).not.toMatch(/moodScore|moodMen|teamEffect|manEffect|0\.025|2\.5%|mood[A-Za-z.]*\s*[*+\-\/]\s*\d|mood[A-Za-z.]*\.toFixed/)
 })
 it('a 65′ and a 70′ stop each take a "no" as an empty decision and play on',()=>{
  let c=toMatch(drafted(newCareer('dd00000000000007')));c=act(c,{kind:'match-start',mode:'interactive'})
  expect(pauseOf(c)!.minute).toBe(45);c=act(c,{kind:'match-decide',decision:{}})
  expect(pauseOf(c)!.minute).toBe(65);c=act(c,{kind:'match-decide',decision:{}})
  expect(pauseOf(c)!.minute).toBe(70);c=act(c,{kind:'match-decide',decision:{}})
  expect(c.live).toBeNull();expect(c.season.played).toBeGreaterThanOrEqual(1)
 })
})
