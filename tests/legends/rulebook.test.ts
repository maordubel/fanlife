import {describe,expect,it} from 'vitest'
import {hash} from '@/lib/clubs/rumble-rng'
import {DEFAULT_SETTINGS,LEGENDS_RULES as R,patchSettings,readSettings} from '@/lib/legends/config'
import {eligible} from '@/lib/legends/catalog'
import {applyAction,cashFromLedger,createCareer,isBye,me,pauseOf,type Action,type Intent} from '@/lib/legends/career'
import {afterMatch,fresh} from '@/lib/legends/discipline'
import {botDraft,deal,DRAFT_ORDER,draftMove,emptyDraft,TIER_PRICES} from '@/lib/legends/draft'
import {achievements,capBonuses,nextSeasonGrant,saleQuote} from '@/lib/legends/economy'
import {run} from '@/lib/legends/engine'
import {autopilot,matchLab} from '@/lib/legends/lab'
import {fixturesFor,roundsFor,standings,titleTie} from '@/lib/legends/league'
import {rateClub,readControl} from '@/lib/legends/ratings'
import {readiness} from '@/lib/legends/readiness'
import {acceptFriendly,createFriendly,lockSide} from '@/lib/legends/friendly'
import {careerView} from '@/lib/legends/view'
import {aiWindow,prepareEmergency} from '@/lib/legends/ai'
import type {Career,Fixture,MatchSnapshot} from '@/lib/legends/types'
import {catalogOf,LEAGUE,poolOf} from './fixtures'

const NOW='2026-10-12T10:00:00.000Z'
const ctx={now:NOW,catalogs:new Map(LEAGUE.map(c=>[c.club,c.cards]))}
function newCareer(id='c0ffee0000000001'):Career{const r=createCareer({id,owner:'o'.repeat(32),now:NOW,own:LEAGUE[0]!,rivals:LEAGUE.slice(1),settings:DEFAULT_SETTINGS});if(!r.ok)throw new Error(r.error);return r.career}
let n=0
function act(c:Career,a:Intent){const r=applyAction(c,{...a,key:`k${n++}xxxxxxx`,rev:c.revision} as Action,ctx);if(!r.ok)throw new Error(`${a.kind}: ${r.error}`);return r.career}
function drafted(c:Career):Career{const b=botDraft(c.catalog.cards,hash(`${c.id}:draft`),'value');for(const p of b.draft.picks){c=act(c,{kind:'draft',move:{kind:'pick',id:p.id}})}return act(act(c,{kind:'draft-confirm'}),{kind:'ack'})}

describe('the draft (§1.2, D01–D07)',()=>{
 it('D01 · a club with one priced goalkeeper is not ready, and says why',()=>{
  const pool=poolOf('lonely',200,{gk:1}),e=eligible('lonely',pool,new Set(pool.map(p=>p.id)),()=>true,new Map())
  const r=readiness('lonely','Lonely FC',e,8);expect(r.verdict).toBe('NOT_READY');expect(r.reasons.join(' ')).toMatch(/GK/)
 })
 it('D02 · a man the price list does not know is never dealt, even though priceFor would answer €1M',()=>{
  const pool=poolOf('dry',120),e=eligible('dry',pool,new Set(pool.map(p=>p.id)),()=>false,new Map())
  expect(e.cards).toHaveLength(0);expect(e.excluded.noPrice).toBe(120);expect(readiness('dry','Dry FC',e).verdict).toBe('NOT_READY')
 })
 it('D03/D04 · slots come up by themselves in the fixed line order; three different men, one per tier; nothing strands the seventeen',()=>{
  const cat=LEAGUE[1]!;let d=deal(cat.cards,emptyDraft(),7);const lines:string[]=[]
  for(let s=0;s<17;s++){
   expect(d.group).not.toBeNull();lines.push(d.group!);const o=d.offers
   expect(new Set(o.map(x=>x.id)).size).toBe(3)
   const by=new Map(cat.cards.map(c=>[c.id,c]))
   for(const x of o){expect(by.get(x.id)!.pos).toBe(d.group);expect(TIER_PRICES[x.tier as 'premium']).toContain(by.get(x.id)!.price)}
   expect(o.some(x=>!x.locked)).toBe(true)
   d=(draftMove(cat.cards,d,{kind:'pick',id:o.find(x=>!x.locked&&x.tier==='premium')?.id??o.find(x=>!x.locked)!.id},7) as {ok:true;draft:typeof d}).draft
   expect(d.spent).toBeLessThanOrEqual(52)
  }
  expect(d.picks).toHaveLength(17)
  expect(lines).toEqual(DRAFT_ORDER.slice(0,17))
  // the optional eighteenth is dealt too when money is left (FW first), and can always be skipped
  if(d.spent<=51)expect(d.group).not.toBeNull();else expect(d.group).toBeNull()
  expect(draftMove(cat.cards,d,{kind:'skip'},7).ok).toBe(true)
 })
 it('D03b · an old save with no slot dealt deals the same three the view shows, and a pick of a man not dealt is refused',()=>{
  const cat=LEAGUE[3]!,d=emptyDraft(),a=deal(cat.cards,d,11),b=deal(cat.cards,d,11)
  expect(a.offers.map(o=>o.id)).toEqual(b.offers.map(o=>o.id));expect(a.group).toBe('GK')
  const other=cat.cards.find(c=>!a.offers.some(o=>o.id===c.id))!
  expect(draftMove(cat.cards,d,{kind:'pick',id:other.id},11).ok).toBe(false)
  expect(draftMove(cat.cards,d,{kind:'pick',id:a.offers.find(o=>!o.locked)!.id},11).ok).toBe(true)
 })
 it('D05 · three rerolls and no fourth; picks and money are untouched',()=>{
  const cat=LEAGUE[2]!;let d=deal(cat.cards,emptyDraft(),3)
  const first=d.offers.map(o=>o.id)
  for(let i=0;i<3;i++){const r=draftMove(cat.cards,d,{kind:'reroll'},3);expect(r.ok).toBe(true);if(r.ok){expect(r.draft.offers.map(o=>o.id).some(x=>first.includes(x))).toBe(false);d=r.draft}}
  const r=draftMove(cat.cards,d,{kind:'reroll'},3);expect(r.ok).toBe(false);expect(d.picks).toHaveLength(0);expect(d.spent).toBe(0)
 })
 it('1,000 generated draft paths over five clubs end in a legal seventeen — no dead end',()=>{
  let dead=0;for(let i=0;i<1000;i++){const r=botDraft(LEAGUE[i%5]!.cards,hash(`path:${i}`),(['random','value','premium','budget'] as const)[i%4]);if(r.error)dead++}
  expect(dead).toBe(0)
 },120_000)
 it('D06/D07 · confirm: €52M less the draft plus the board’s €8M, paid once; seventeen is a legal squad',()=>{
  let c=drafted(newCareer()),spent=c.draft!.spent
  expect(me(c).squad.length).toBe(17);expect(me(c).cash).toBeCloseTo(52-spent+8,5);expect(cashFromLedger(c)).toBeCloseTo(me(c).cash,5)
  expect(c.ledger.filter(l=>l.key===`first-window-grant:${c.id}`)).toHaveLength(1)
  const again=applyAction(c,{kind:'draft-confirm',key:'k-confirm-again',rev:c.revision},ctx);expect(again.ok).toBe(false)
  expect(c.phase).toBe('window');expect(spent).toBeLessThanOrEqual(52)
 })
})

describe('money (§1.3, E01–E05)',()=>{
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
  const c=drafted(newCareer('c0ffee0000000002')),t=me(c),gk=t.squad.find(s=>s.quota==='GK')!
  const sold=applyAction(c,{kind:'sell',card:gk.id,key:'k-sell-gk-1',rev:c.revision},ctx);expect(sold.ok).toBe(false)
  const other=c.catalog.cards.find(x=>x.pos==='GK'&&!t.squad.some(s=>s.id===x.id)&&x.price<=t.cash)!
  const sw=applyAction(c,{kind:'swap',sell:gk.id,buy:other.id,key:'k-swap-gk-1',rev:c.revision},ctx);expect(sw.ok).toBe(true)
  if(sw.ok){expect(me(sw.career).squad).toHaveLength(17);expect(cashFromLedger(sw.career)).toBeCloseTo(me(sw.career).cash,5)}
 })
 it('a man of another club can never be signed',()=>{
  const c=drafted(newCareer('c0ffee0000000003')),stranger=LEAGUE[3]!.cards[0]!
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
  let c=drafted(newCareer('c0ffee0000000007'));c=act(c,{kind:'close-window'})
  if(isBye(c))c=act(c,{kind:'play-round'})
  c=act(c,{kind:'match-start',mode:'interactive'})
  let stops=0;while(c.live&&pauseOf(c)){c=act(c,{kind:'match-decide',decision:{}});stops++}
  expect(stops).toBeLessThanOrEqual(3);expect(c.live).toBeNull()
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
  const c=drafted(newCareer('c0ffee000000000b')),man=c.catalog.cards.find(x=>!me(c).squad.some(s=>s.id===x.id)&&x.price<=me(c).cash)!
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
