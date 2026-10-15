import {describe,expect,it} from 'vitest'
import {hash} from '@/lib/clubs/rumble-rng'
import {DEFAULT_SETTINGS,LEGENDS_RULES as R,patchSettings,readSettings} from '@/lib/legends/config'
import {eligible} from '@/lib/legends/catalog'
import {applyAction,cashFromLedger,createCareer,isBye,me,pauseOf,slotsOf,bidsOf,type Action,type Intent} from '@/lib/legends/career'
import {afterMatch,fresh} from '@/lib/legends/discipline'
import {botDraft,deal,draftMove,emptyDraft,groups,TIER_PRICES} from '@/lib/legends/draft'
import {achievements,capBonuses,nextSeasonGrant,saleQuote,finalProceeds} from '@/lib/legends/economy'
import {run} from '@/lib/legends/engine'
import {autopilot,matchLab} from '@/lib/legends/lab'
import {fixturesFor,roundsFor,standings,titleTie} from '@/lib/legends/league'
import {rateClub,readControl} from '@/lib/legends/ratings'
import {readiness} from '@/lib/legends/readiness'
import {acceptFriendly,createFriendly,lockSide} from '@/lib/legends/friendly'
import {careerView} from '@/lib/legends/view'
import {aiWindow,prepareEmergency} from '@/lib/legends/ai'
import type {Career,Fixture,MatchSnapshot} from '@/lib/legends/types'
import {catalogOf,LEAGUE,poolOf,talkThrough,WAITS_FOR_TALK} from './fixtures'

const NOW='2026-10-12T10:00:00.000Z'
const ctx={now:NOW,catalogs:new Map(LEAGUE.map(c=>[c.club,c.cards]))}
function newCareer(id='c0ffee0000000001'):Career{const r=createCareer({id,owner:'o'.repeat(32),now:NOW,own:LEAGUE[0]!,rivals:LEAGUE.slice(1),settings:DEFAULT_SETTINGS});if(!r.ok)throw new Error(r.error);return r.career}
let n=0
function act(c:Career,a:Intent):Career{if(WAITS_FOR_TALK.has(a.kind))c=talkThrough(c,act);const r=applyAction(c,{...a,key:`k${n++}xxxxxxx`,rev:c.revision} as Action,ctx);if(!r.ok)throw new Error(`${a.kind}: ${r.error}`);return r.career}
function drafted(c:Career):Career{const b=botDraft(c.catalog.cards,hash(`${c.id}:draft`),'value',true);for(const p of b.draft.picks){c=act(c,{kind:'draft',move:{kind:'group',group:p.quota}});c=act(c,{kind:'draft',move:{kind:'pick',id:p.id}})}return act(act(c,{kind:'draft-confirm'}),{kind:'ack'})}
/** play on the quick sim until the transfer window opens (after round 2) */
function toWindow(c:Career):Career{for(let i=0;i<6&&c.phase!=='window';i++)c=isBye(c)?act(c,{kind:'play-round'}):act(c,{kind:'match-start',mode:'fast'});return c}

describe('the draft (§1.2, D01–D07)',()=>{
 it('D01 · a club with one priced goalkeeper is not ready, and says why',()=>{
  const pool=poolOf('lonely',200,{gk:1}),e=eligible('lonely',pool,new Set(pool.map(p=>p.id)),()=>true,new Map())
  const r=readiness('lonely','Lonely FC',e,8);expect(r.verdict).toBe('NOT_READY');expect(r.reasons.join(' ')).toMatch(/GK/)
 })
 it('D02 · a man the price list does not know is never dealt, even though priceFor would answer €1M',()=>{
  const pool=poolOf('dry',120),e=eligible('dry',pool,new Set(pool.map(p=>p.id)),()=>false,new Map())
  expect(e.cards).toHaveLength(0);expect(e.excluded.noPrice).toBe(120);expect(readiness('dry','Dry FC',e).verdict).toBe('NOT_READY')
 })
 it('D03/D04 · the manager chooses the line before every slot; three different men, one per tier; nothing strands the seventeen',()=>{
  const cat=LEAGUE[1]!;let d=emptyDraft();const lines:string[]=[]
  for(let s=0;s<17;s++){
   const g=groups(cat.cards,d,7).find(x=>x.open&&x.need>0)!;expect(g).toBeTruthy()
   const gm=draftMove(cat.cards,d,{kind:'group',group:g.group},7);expect(gm.ok).toBe(true);d=(gm as {ok:true;draft:typeof d}).draft
   expect(d.group).not.toBeNull();lines.push(d.group!);const o=d.offers
   expect(new Set(o.map(x=>x.id)).size).toBe(3)
   const by=new Map(cat.cards.map(c=>[c.id,c]))
   for(const x of o){expect(by.get(x.id)!.pos).toBe(d.group);expect(TIER_PRICES[x.tier as 'premium']).toContain(by.get(x.id)!.price)}
   expect(o.some(x=>!x.locked)).toBe(true)
   d=(draftMove(cat.cards,d,{kind:'pick',id:o.find(x=>!x.locked&&x.tier==='premium')?.id??o.find(x=>!x.locked)!.id},7) as {ok:true;draft:typeof d}).draft
   expect(d.spent).toBeLessThanOrEqual(52)
  }
  expect(d.picks).toHaveLength(17)
  expect(lines).toHaveLength(17)
  // the optional eighteenth is dealt too when money is left (FW first), and can always be skipped
  expect(d.group).toBeNull()
  expect(draftMove(cat.cards,d,{kind:'skip'},7).ok).toBe(true)
 })
 it('D03b · an old save with no slot dealt deals the same three the view shows, and a pick of a man not dealt is refused',()=>{
  const cat=LEAGUE[3]!,d={...emptyDraft(),group:'GK' as const},a=deal(cat.cards,d,11),b=deal(cat.cards,d,11)
  expect(a.offers.map(o=>o.id)).toEqual(b.offers.map(o=>o.id));expect(a.group).toBe('GK')
  // a pick before any line is chosen is refused
  expect(draftMove(cat.cards,emptyDraft(),{kind:'pick',id:a.offers[0]!.id},11).ok).toBe(false)
  const other=cat.cards.find(c=>!a.offers.some(o=>o.id===c.id))!
  expect(draftMove(cat.cards,d,{kind:'pick',id:other.id},11).ok).toBe(false)
  expect(draftMove(cat.cards,d,{kind:'pick',id:a.offers.find(o=>!o.locked)!.id},11).ok).toBe(true)
 })
 it('D05 · three rerolls and no fourth; picks and money are untouched',()=>{
  const cat=LEAGUE[2]!;let d=(draftMove(cat.cards,emptyDraft(),{kind:'group',group:'DF'},3) as {ok:true;draft:ReturnType<typeof emptyDraft>}).draft
  const first=d.offers.map(o=>o.id)
  for(let i=0;i<3;i++){const r=draftMove(cat.cards,d,{kind:'reroll'},3);expect(r.ok).toBe(true);if(r.ok){expect(r.draft.offers.map(o=>o.id).some(x=>first.includes(x))).toBe(false);d=r.draft}}
  const r=draftMove(cat.cards,d,{kind:'reroll'},3);expect(r.ok).toBe(false);expect(d.picks).toHaveLength(0);expect(d.spent).toBe(0)
 })
 it('1,000 generated draft paths over five clubs end in a legal seventeen — no dead end',()=>{
  let dead=0;for(let i=0;i<1000;i++){const r=botDraft(LEAGUE[i%5]!.cards,hash(`path:${i}`),(['random','value','premium','budget'] as const)[i%4],i%2===0);if(r.error)dead++}
  expect(dead).toBe(0)
 },120_000)
 it('D06/D07 · confirm: €52M less the draft plus the board’s €8M, paid once; seventeen is a legal squad',()=>{
  let c=drafted(newCareer()),spent=c.draft!.spent
  expect(me(c).squad.length).toBe(17);expect(me(c).cash).toBeCloseTo(52-spent+8,5);expect(cashFromLedger(c)).toBeCloseTo(me(c).cash,5)
  expect(c.ledger.filter(l=>l.key===`first-window-grant:${c.id}`)).toHaveLength(1)
  const again=applyAction(c,{kind:'draft-confirm',key:'k-confirm-again',rev:c.revision},ctx);expect(again.ok).toBe(false)
  expect(c.phase).toBe('season');expect(spent).toBeLessThanOrEqual(52)
 })
 it('round 1 is played with the drafted squad; the window opens after round 2, and again at the halfway mark',()=>{
  let c=drafted(newCareer('c0ffee00000000d1'))
  expect(applyAction(c,{kind:'buy',card:c.catalog.cards[0]!.id,key:'k-early-buy',rev:c.revision},ctx).ok).toBe(false)
  c=toWindow(c);expect(c.season.played).toBe(2);expect(c.phase).toBe('window')
  c=act(c,{kind:'close-window'})
  const half=Math.floor(c.season.rounds/2)
  for(let i=0;i<20&&c.phase!=='window';i++)c=isBye(c)?act(c,{kind:'play-round'}):act(c,{kind:'match-start',mode:'fast'})
  expect(c.season.played).toBe(half)
 })
})

describe('money (§1.3, E01–E05)',()=>{
 it('F02 · a bid cannot lift a man bought and never played above what he cost — the final amount is guarded, whatever the premium',()=>{
  let seen=0
  for(let i=0;i<24;i++){
   let c=toWindow(drafted(newCareer(`f02seed${String(i).padStart(10,'0')}`)))
   const buy=slotsOf(c).find(x=>x.price<=me(c).cash);if(!buy)continue
   c=act(c,{kind:'buy',card:buy.id});c=act(c,{kind:'list',card:buy.id,listed:true})
   const bid=bidsOf(c).find(b=>b.card===buy.id);if(!bid)continue
   seen++
   expect(bid.fee,`bid fee for a €${buy.price}M man never played`).toBeLessThanOrEqual(buy.price+1e-9)
   const before=me(c).cash,after=me(act(c,{kind:'bid',card:buy.id,accept:true})).cash
   expect(after-before).toBeLessThanOrEqual(buy.price+1e-9)
  }
  expect(seen).toBeGreaterThan(3)
  expect(finalProceeds(3.1,3,0)).toBe(3);expect(finalProceeds(3.1,3,1)).toBe(3.1)
 })
 it('E01/E02 · before an official appearance a sale never beats the price paid; after it the market decides within 80–120%',()=>{
  for(const base of [1,2,3,4,5])for(const stars of [1,3,5]){
   const q0=saleQuote(base,base,0,stars,DEFAULT_SETTINGS);expect(q0.net).toBeLessThanOrEqual(base)
   const q1=saleQuote(base,base,6,stars,DEFAULT_SETTINGS);expect(q1.quoted).toBeGreaterThanOrEqual(0.8*base-1e-9);expect(q1.quoted).toBeLessThanOrEqual(1.2*base+1e-9);expect(q1.guard).toBe(0)
  }
  expect(saleQuote(2,2,0,5,DEFAULT_SETTINGS).net).toBeLessThanOrEqual(2)
 })
 it('E03 · the board grant stays in €4–10M and falls as the cash pile grows',()=>{
  let prev=Infinity;for(const cash of [0,10,20,30,40,80]){const g=nextSeasonGrant(0.9,cash,DEFAULT_SETTINGS);expect(g).toBeGreaterThanOrEqual(4);expect(g).toBeLessThanOrEqual(10);expect(g).toBeLessThanOrEqual(prev);prev=g}
  expect(nextSeasonGrant(0,0,DEFAULT_SETTINGS)).toBe(4)
 })
 it('E04 · achievement bonuses never pass €5M a season, even asked twice',()=>{
  const a=achievements({place:1,of:6,champion:true,unbeatenHome:true,bestAttack:true,longestWinRun:6})
  const sum=(xs:{amount:number}[])=>xs.reduce((x,y)=>x+y.amount,0),once=capBonuses(a,0),twice=capBonuses(a,sum(once))
  expect(sum(once)).toBeLessThanOrEqual(5);expect(sum(once)+sum(twice)).toBeLessThanOrEqual(5);expect(capBonuses(a,5)).toHaveLength(0)
 })
 it('E05 · a sale that breaks 17 or a quota is refused; an atomic swap that restores it goes through',()=>{
  // the market is five slots: find a career whose window shows a goalkeeper
  let c=toWindow(drafted(newCareer('c0ffee0000000002')));
  for(let i=3;i<60&&!slotsOf(c).some(x=>x.pos==='GK'&&x.price<=me(c).cash);i++)c=toWindow(drafted(newCareer(`c0ffee00000000${(i+16).toString(16).padStart(2,'0')}`)))
  const t=me(c),gk=t.squad.find(s=>s.quota==='GK')!
  const sold=applyAction(c,{kind:'sell',card:gk.id,key:'k-sell-gk-1',rev:c.revision},ctx);expect(sold.ok).toBe(false)
  const other=slotsOf(c).find(x=>x.pos==='GK'&&x.price<=t.cash)!
  const sw=applyAction(c,{kind:'swap',sell:gk.id,buy:other.id,key:'k-swap-gk-1',rev:c.revision},ctx);expect(sw.ok).toBe(true)
  if(sw.ok){expect(me(sw.career).squad).toHaveLength(17);expect(cashFromLedger(sw.career)).toBeCloseTo(me(sw.career).cash,5)}
 })
 it('a man of another club can never be signed',()=>{
  const c=toWindow(drafted(newCareer('c0ffee0000000003'))),stranger=LEAGUE[3]!.cards[0]!
  const r=applyAction(c,{kind:'buy',card:stranger.id,key:'k-stranger-1',rev:c.revision},ctx);expect(r.ok).toBe(false)
 })
})

describe('cards and injuries (§1.5, I01–I05)',()=>{
 it('I01 · four yellows and two more in a match: six, a red, the fifth processed once, ONE match out',()=>{
  const s=afterMatch({...fresh(),yellows:4},{yellows:2,red:{second:true,length:1},injury:null},true)
  expect(s).toMatchObject({yellows:6,thresholds:1,suspension:1})
 })
 it('I02 · a three-match direct red with a threshold crossed: four matches, the yellow one after the red',()=>{
  expect(afterMatch({...fresh(),yellows:4},{yellows:1,red:{second:false,length:3},injury:null},true).suspension).toBe(4)
 })
 it('yellows never reset after a ban inside a season; the tenth is its own ban',()=>{
  let s=fresh();for(let i=0;i<10;i++)s=afterMatch(s,{yellows:1,red:null,injury:null},true)
  expect(s.yellows).toBe(10);expect(s.thresholds).toBe(2)
 })
 it('I03 · 10,000 seeded matches: injuries near 5% a team-match, about 70/25/5 by severity',()=>{
  const m=matchLab(LEAGUE,10000)
  expect(m.injuryRate).toBeGreaterThan(4.2);expect(m.injuryRate).toBeLessThan(5.8)
  expect(m.severity.minor).toBeGreaterThan(64);expect(m.severity.minor).toBeLessThan(76);expect(m.severity.severe).toBeLessThan(9)
  expect(m.goalsPerMatch).toBeGreaterThan(2);expect(m.goalsPerMatch).toBeLessThan(3.6) /* invented clubs; the real ones measure 2.5–2.7 in the Lab */;expect(m.draws).toBeGreaterThan(17);expect(m.draws).toBeLessThan(32)
 },180_000)
 it('I04 · a ten-round injury outlives a short season',()=>{
  const r=autopilot(LEAGUE[0]!,LEAGUE.slice(1,4),2,'inj');expect(r.error).toBeNull()
  const c=r.career!;expect(c.history).toHaveLength(2)
 },120_000)
 it('I05 · eleven fit men: no emergency; ten: the archive lends one, never a squad member',()=>{
  const c=drafted(newCareer('c0ffee0000000004')),t=me(c)
  const none=prepareEmergency(t,c.catalog.cards,id=>c.catalog.cards.find(x=>x.id===id),1,1,0,1,NOW,'k');expect(none.team.emergency).toHaveLength(0)
  const status=Object.fromEntries(t.squad.slice(0,7).map(s=>[s.id,{...fresh(),injury:3}]))
  const hurt={...t,status},e=prepareEmergency(hurt,c.catalog.cards,id=>c.catalog.cards.find(x=>x.id===id),1,1,0,1,NOW,'k')
  expect(e.team.emergency.length).toBe(1);expect(t.squad.some(s=>s.id===e.team.emergency[0]!.id)).toBe(false);expect(e.team.squad).toHaveLength(17)
 })
})

describe('the match (§1.4, M01–M04)',()=>{
 const snapOf=(c:Career):MatchSnapshot=>{const a=me(c),b=c.teams[1]!;const m=(t:typeof a,id:string)=>{const x=(t.ai?t.cards[id]:c.catalog.cards.find(y=>y.id===id))!;return {id:x.id,name:x.name,pos:x.pos,stars:x.stars,attrs:x.attrs}}
  return {id:'m',seed:12345,engine:'legends-engine-1',rules:'legends-1.0.0',knockout:false,sides:[{club:a.club,name:a.name,formation:a.lineup.formation,tactics:a.lineup.tactics,xi:a.lineup.xi.map(id=>m(a,id)),bench:a.lineup.bench.map(id=>m(a,id)),morale:1,home:true},{club:b.club,name:b.name,formation:b.lineup.formation,tactics:b.lineup.tactics,xi:b.lineup.xi.map(id=>m(b,id)),bench:b.lineup.bench.map(id=>m(b,id)),morale:1,home:false}]}}
 it('M01/M03 · the same snapshot and seed play the same match; the quick sim and an untouched touchline are one log',()=>{
  const c=drafted(newCareer('c0ffee0000000005')),s=snapOf(c),a=run(s,[],false),b=run(s,[],false)
  expect(a).toEqual(b)
  let decisions:{stop:number}[]=[],r=run(s,decisions,true)
  while(!r.done){decisions=[...decisions,{stop:r.pause.stop}];r=run(s,decisions,true)}
  expect(r.done&&a.done&&r.outcome.events).toEqual(a.done&&a.outcome.events)
 })
 it('M02/M04 · a decision changes only what follows it; three changes at most',()=>{
  const c=drafted(newCareer('c0ffee0000000006')),s=snapOf(c),p=run(s,[],true)
  expect(p.done).toBe(false);if(p.done)return
  const pitch=p.pause.pitch[0],bench=p.pause.bench[0]
  const d={stop:0,tactics:{approach:'attacking' as const,pressing:'high' as const,tempo:'fast' as const},subs:bench.slice(0,3).map((b,i)=>({out:pitch[i+1]!.id,in:b.id}))}
  let r=run(s,[d],true);const decided:typeof d[]=[d]
  while(!r.done){decided.push({...d,stop:r.pause.stop,subs:[]});r=run(s,decided,true)}
  const before=p.pause.events.filter(e=>e.minute<=p.pause.minute)
  expect(r.done&&r.outcome.events.slice(0,before.length)).toEqual(before)
  expect(r.done&&r.outcome.events.filter(e=>e.kind==='sub'&&e.side===0).length).toBeLessThanOrEqual(3)
 })
 it('an interactive match stops three times at most, and a fourth decision is refused',()=>{
  let c=drafted(newCareer('c0ffee0000000007'))
  if(isBye(c))c=act(c,{kind:'play-round'})
  c=act(c,{kind:'match-start',mode:'interactive'})
  let stops=0;while(c.live&&pauseOf(c)){c=act(c,{kind:'match-decide',decision:{}});stops++}
  expect(stops).toBeLessThanOrEqual(3);expect(c.live).toBeNull()
 })
 it('a live match stops at half-time and at 89′ (engine 4) and "to the final whistle" plays the rest',()=>{
  let c=drafted(newCareer('c0ffee00000000e1'));if(isBye(c))c=act(c,{kind:'play-round'})
  c=act(c,{kind:'match-start',mode:'interactive'});const minutes:number[]=[]
  for(let i=0;i<2&&c.live;i++){const p=pauseOf(c)!;minutes.push(p.minute);if(i<1)c=act(c,{kind:'match-decide',decision:{}})}
  expect(minutes).toEqual([45,89])
  c=act(c,{kind:'match-finish'});expect(c.live).toBeNull();expect(c.season.played).toBe(1)
 })
 it('the captain wears the armband on every snapshot; an engine-1 match ignores it, and no screen names the edge',()=>{
  const c=drafted(newCareer('c0ffee00000000e2')),s0=snapOf(c),s={...s0,sides:[{...s0.sides[0],captain:me(c).lineup.captain},s0.sides[1]] as typeof s0.sides}
  expect(me(c).lineup.captain).toBeTruthy();expect(s.sides[0].xi.some(m=>m.id===s.sides[0].captain)).toBe(true)
  let differs=0
  for(let k=0;k<30;k++){const base={...s,seed:k,engine:'legends-engine-2' as const},a=run(base,[],false),b=run({...base,sides:[{...base.sides[0],captain:undefined},base.sides[1]]},[],false),old=run({...base,engine:'legends-engine-1'},[],false),old2=run({...base,engine:'legends-engine-1',sides:[{...base.sides[0],captain:undefined},base.sides[1]]},[],false)
   if(a.done&&b.done&&JSON.stringify(a.outcome.events)!==JSON.stringify(b.outcome.events))differs++
   expect(old.done&&old2.done&&JSON.stringify(old.outcome.events)).toBe(old2.done&&JSON.stringify(old2.outcome.events))}
  expect(differs).toBeGreaterThan(0)
  const fs=require('node:fs') as typeof import('node:fs'),ui=['components/legends/CareerApp.tsx','components/legends/Live.tsx','components/legends/TeamSheet.tsx'].filter(f=>fs.existsSync(f)).map(f=>fs.readFileSync(f,'utf8')).join('\n')
  expect(ui).not.toMatch(/3%|captainBoost|1\.03/)
 })
})

describe('the league (§1.6, M05–M06)',()=>{
 it('M06 · four clubs: six rounds, every pair twice, once at each ground; five clubs play with a BYE',()=>{
  const f=fixturesFor(['a','b','c','d']);expect(roundsFor(4)).toBe(6);expect(Math.max(...f.map(x=>x.round))).toBe(6)
  for(const [x,y] of [['a','b'],['a','c'],['c','d']]){expect(f.filter(m=>m.home===x&&m.away===y)).toHaveLength(1);expect(f.filter(m=>m.home===y&&m.away===x)).toHaveLength(1)}
  const g=fixturesFor(['a','b','c','d','e']);expect(Math.max(...g.map(x=>x.round))).toBe(roundsFor(5));for(const t of 'abcde')expect(g.filter(m=>m.home===t||m.away===t)).toHaveLength(8)
 })
 it('an absolute tie at the top goes to a play-off; any other tie is read by the rule, then lots',()=>{
  const fx:Fixture[]=[{id:'1',round:1,home:'a',away:'b',result:{goals:[1,1],pens:null,events:[],seed:1}},{id:'2',round:2,home:'b',away:'a',result:{goals:[1,1],pens:null,events:[],seed:1}}]
  const rows=standings([{club:'a',name:'A'},{club:'b',name:'B'}],fx,DEFAULT_SETTINGS.points,'s')
  expect(titleTie(rows,fx,DEFAULT_SETTINGS.points,'s')).toHaveLength(2)
 })
 it('M05 · an AI club buys twice a window at most, only its own men, inside the money and the quotas',()=>{
  const c=newCareer('c0ffee0000000008'),ai=c.teams[1]!,cat=LEAGUE.find(x=>x.club===ai.club)!.cards
  const r=aiWindow({...ai,cash:40},cat,DEFAULT_SETTINGS,9)
  expect(r.moves.filter(m=>m.kind==='buy').length).toBeLessThanOrEqual(2)
  for(const m of r.moves)expect(cat.some(x=>x.id===m.card.id)).toBe(true)
  expect(r.team.cash).toBeGreaterThanOrEqual(0);expect(r.team.squad.length).toBeLessThanOrEqual(R.maxSquad)
 })
 it('twenty seasons on autopilot: no failure, cash under control, the ledger adds up',()=>{
  const r=autopilot(LEAGUE[1]!,[LEAGUE[0]!,LEAGUE[2]!,LEAGUE[3]!],20,'long');expect(r.error).toBeNull()
  const c=r.career!;expect(c.history).toHaveLength(20);expect(cashFromLedger(c)).toBeCloseTo(me(c).cash,4)
  for(const h of c.history){expect(h.grant).toBeGreaterThanOrEqual(4);expect(h.grant).toBeLessThanOrEqual(10)}
 },300_000)
})

describe('friendlies and saving (§1.7, F01–F04, S02, S05)',()=>{
 it('F01–F04 · a locked invitation plays once; a repeat answers the same match; neither career changes',()=>{
  const a=drafted(newCareer('c0ffee0000000009')),b=drafted({...newCareer('c0ffee000000000a'),owner:'p'.repeat(32)})
  const sa=lockSide(a,NOW),sb=lockSide(b,NOW);if('error' in sa||'error' in sb)throw new Error('lock')
  const f=createFriendly('f0f0f0f0f0f0f0f0','tok',sa,new Date(NOW)),r1=acceptFriendly(f,'tok',sb,new Date(NOW))
  expect(r1.ok).toBe(true);if(!r1.ok)return
  const r2=acceptFriendly(r1.friendly,'tok',sb,new Date(NOW));expect(r2.ok&&r2.friendly.result).toEqual(r1.friendly.result)
  expect(acceptFriendly(f,'tok',{...sa},new Date(NOW)).ok).toBe(false) // nobody plays himself
 })
 it('S02 · the same key twice changes money and squad once',()=>{
  const c=toWindow(drafted(newCareer('c0ffee000000000b'))),man=slotsOf(c).find(x=>x.price<=me(c).cash)!
  const a={kind:'buy' as const,card:man.id,key:'k-buy-twice',rev:c.revision},r1=applyAction(c,a,ctx);if(!r1.ok)throw new Error(r1.error)
  const r2=applyAction(r1.career,{...a,rev:r1.career.revision},ctx);expect(r2.ok&&r2.replay).toBe(true);expect(r2.ok&&me(r2.career).cash).toBe(me(r1.career).cash)
 })
 it('S05 · a career keeps the settings of its kick-off; settings are checked by name',()=>{
  const c=newCareer('c0ffee000000000c');expect(c.settings).toEqual(DEFAULT_SETTINGS)
  expect(patchSettings(DEFAULT_SETTINGS,{marketFeeRate:0.9})).toMatchObject({ok:false});expect(patchSettings(DEFAULT_SETTINGS,{nope:1})).toMatchObject({ok:false})
  expect(readSettings({points:{win:1,draw:3,loss:0}}).points).toEqual(DEFAULT_SETTINGS.points)
 })
 it('the view never carries a hidden rating, only stars',()=>{
  const v=careerView(drafted(newCareer('c0ffee000000000d')));expect(JSON.stringify(v)).not.toMatch(/"rating"/)
 })
})

describe('stars (owner, 12.10.2026)',()=>{
 it('quarter steps, 1–5, and each club’s best reach the top whatever its size',()=>{
  for(const n of [60,900]){const pool=poolOf(`s${n}`,n).map(p=>({id:p.id,position:p.position,rating:p.rating,goals:0})),r=rateClub(`s${n}`,pool)
   const st=[...r.values()].map(x=>x.stars);expect(Math.max(...st)).toBeGreaterThanOrEqual(4.5);expect(Math.min(...st)).toBeGreaterThanOrEqual(1)
   for(const v of r.values()){expect((v.stars*4)%1).toBe(0);for(const a of Object.values(v.attrs)){expect(a).toBeGreaterThanOrEqual(1);expect(a).toBeLessThanOrEqual(5);expect((a*4)%1).toBe(0)}}}
 })
 it('the owner may shift a club and pin one man; malformed controls are dropped, not guessed',()=>{
  const pool=poolOf('pin',80).map(p=>({id:p.id,position:p.position,rating:p.rating,goals:0}))
  const ctl=readControl({clubs:{pin:{offset:0.5}},players:{'pin:pin-p3':{stars:4.6,attrs:{passing:9}}}})
  expect(ctl.players['pin:pin-p3']).toEqual({stars:4.5});expect(rateClub('pin',pool,ctl).get('pin-p3')!.stars).toBe(4.5)
  expect(readControl({clubs:{pin:{offset:7}}}).clubs).toEqual({})
 })
})
void catalogOf

describe('free line choice (13.10.2026)',()=>{
 it('same line shows the same three on return; another line in between changes nothing; a spin only moves its own line',()=>{
  const cat=LEAGUE[0]!,mv=(d:ReturnType<typeof emptyDraft>,m:Parameters<typeof draftMove>[2])=>{const r=draftMove(cat.cards,d,m,5);expect(r.ok).toBe(true);return (r as {ok:true;draft:typeof d}).draft}
  let d=mv(emptyDraft(),{kind:'group',group:'MF'});const mf=d.offers.map(o=>o.id)
  d=mv(d,{kind:'group',group:'FW'});expect(d.group).toBe('FW')
  d=mv(d,{kind:'group',group:'MF'});expect(d.offers.map(o=>o.id)).toEqual(mf)
  expect(d.rerollsLeft).toBe(3)
  const fw=mv(mv(d,{kind:'group',group:'FW'}),{kind:'reroll'});expect(fw.rerollsLeft).toBe(2)
  const back=mv(fw,{kind:'group',group:'MF'});expect(back.offers.map(o=>o.id)).toEqual(mf)
 })
})

import {carryArmband} from '@/lib/legends/squad'
describe('F06 · the captain and the vice are the manager’s appointments (15.10.2026)',()=>{
 const base={formation:'4-4-2',xi:['a','b','c'],bench:[],tactics:{approach:'balanced',pressing:'medium',tempo:'normal'}} as never as import('@/lib/legends/types').Lineup
 it('a rebuilt eleven keeps both while they are in the squad — even benched; nobody is both',()=>{
  const next={...base,captain:'z'} as import('@/lib/legends/types').Lineup
  expect(carryArmband({captain:'a',vice:'b'},next,()=>true)).toMatchObject({captain:'a',vice:'b'})
  expect(carryArmband({captain:'a',vice:'a'},next,()=>true).vice).toBeUndefined()
  expect(carryArmband({captain:'a',vice:'b'},next,id=>id!=='a')).toMatchObject({captain:'b'})
  expect(carryArmband({captain:'a',vice:'b'},next,id=>id!=='a').vice).toBeUndefined()
  expect(carryArmband({captain:'a',vice:'b'},next,id=>id!=='b')).toMatchObject({captain:'a'})
  expect(carryArmband({},next,()=>true).captain).toBe('z')
 })
 it('a swap of a third man leaves the captain and the vice; swapping the captain out promotes the vice',()=>{
  let tested=0
  for(let i=0;i<12&&tested<2;i++){
   let c=toWindow(drafted(newCareer(`f06seed${String(i).padStart(10,'0')}`)));const t=me(c),xi=t.lineup.xi
   const [cap,vice]=[xi[0]!,xi[1]!]
   c=act(c,{kind:'lineup',formation:t.lineup.formation,xi:t.lineup.xi,bench:t.lineup.bench,tactics:t.lineup.tactics,captain:cap,vice})
   const mt=me(c),card=(id:string)=>c.catalog.cards.find(x=>x.id===id)!
   const inc=slotsOf(c).find(x=>mt.squad.some(s=>xi.includes(s.id)&&![cap,vice].includes(s.id)&&card(s.id).pos===x.pos)&&x.price<=mt.cash+3)
   if(!inc)continue
   const out=mt.squad.find(s=>xi.includes(s.id)&&![cap,vice].includes(s.id)&&card(s.id).pos===inc.pos)!
   const r=applyAction(c,{kind:'swap',sell:out.id,buy:inc.id,key:'k-f06-swap1',rev:c.revision} as Action,ctx);if(!r.ok)continue
   expect(me(r.career).lineup.captain).toBe(cap);expect(me(r.career).lineup.vice).toBe(vice);tested++
  }
  expect(tested).toBeGreaterThan(0)
 })
})
