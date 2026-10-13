import {slotsOf} from '@/lib/clubs/rumble-xi/formations'
import {LEGENDS_RULES as R,QUOTA_POS,type QuotaPos} from './config'
import {abilities,cardOf,catalogMap,isBye,me,nextFixture,pauseOf,table,windowOpen} from './career'
import {available} from './discipline'
import {cashLeft,confirmCheck,deal,deficits,minCostToFinish,schedule} from './draft'
import {ABILITIES,saleQuote} from './economy'
import {run} from './engine'
import {captainOf,fieldable,lineupError,quotaCount} from './squad'
import {hash} from '@/lib/clubs/rumble-rng'
import type {Card,Career,Fixture,MatchEventRow,StatRow,Tactics} from './types'
import {seasonRows} from './stats'

/**
 * What the browser may see of a career. Stars and attributes are the game's own values and shown; nothing else about a man's
 * hidden rating leaves the server (the catalog never stored it). Every line of the match log is written here with names.
 */
export type CardView={id:string;name:string;pos:QuotaPos;alt?:QuotaPos[];price:number;stars:number;attrs:Record<string,number>;from:number|null;to:number|null;decades:number[]}
export type SquadView=CardView&{quota:QuotaPos;paid:number;apps:number;appsTotal:number;goals:number;yellows:number;suspension:number;injury:number;injuryKind:string|null;fit:boolean;sale:{net:number;quoted:number;fees:number}|null}
export type LogLine={minute:number;side:0|1|null;kind:MatchEventRow['kind'];text:string;mine:boolean}
export type ResultView={id:string;round:number;home:string;away:string;homeClub:string;awayClub:string;goals:[number,number];pens:[number,number]|null;log:LogLine[];mine:boolean;/** the highlights reel — attached on the server (`kits.ts`) to the manager's last result */reel?:import('@/lib/highlights/types').Reel}
export type CareerView={
 id:string;revision:number;status:Career['status'];phase:Career['phase'];cutscene:Career['cutscene'];clubId:string;clubName:string;
 season:number;rounds:number;played:number;cash:number;reputation:number;abilities:{id:string;label:string;hint:string;at:number;open:boolean}[];
 settings:Career['settings'];rules:{minSquad:number;maxSquad:number;minimums:Record<QuotaPos,number>;maxSubs:number;stops:number};
 draft:null|{slot:number;required:number;optional:number;picks:(CardView&{slot:number})[];spent:number;left:number;minToFinish:number;rerollsLeft:number;group:QuotaPos|null;upcoming:QuotaPos[];stuck:boolean;/** names of the same line that roll past the payline before the three land */strip:string[];offers:(CardView&{tier:string;locked:string|null})[];deficits:Record<QuotaPos,number>;canConfirm:string|null;optionalOpen:boolean};
 squad:SquadView[];quotas:Record<QuotaPos,number>;emergency:{id:string;name:string;pos:QuotaPos;games:number}[];
 lineup:{formation:string;xi:string[];bench:string[];tactics:Tactics;/** who wears the armband today */captain:string|null;/** the manager's own choices, as stored */captainPick:string|null;vice:string|null;error:string|null;slots:{id:string;fine:string;family:string;x:number;y:number}[]};
 window:null|{which:'pre'|'early'|'mid';offers:CardView[];sold:string[]};
 /** the round after which the next window opens, null when none is left this season */
 nextWindow:number|null;
 /** every other club of the league, its squad as a fan may see it: names, lines, stars, years — never a hidden rating */
 clubs:{club:string;name:string;formation:string;stars:number;squad:{id:string;name:string;pos:QuotaPos;stars:number;from:number|null;to:number|null;apps:number;goals:number;xi:boolean}[]}[];
 /** the shirt colours of every club of the league, attached on the server (`kits.ts`) — for the chips beside a name */
 colours?:Record<string,{shirt:string;second:string|null;pattern:string}>;
 next:null|{id:string;round:number;home:string;away:string;homeName:string;awayName:string;atHome:boolean;opponent:{name:string;formation:string;stars:number;xi:string[]|null};playoff:boolean};
 bye:boolean;live:null|{mode:string;minute:number;goals:[number,number];log:LogLine[];pitch:{slot:string;id:string;name:string}[];bench:{id:string;name:string;pos:QuotaPos}[];subsLeft:number;tactics:Tactics;stopsLeft:number;home:string;away:string;fixture:string;homeClub:string;awayClub:string;mine:0|1;
  /** the moments of the match so far as a reel, attached on the server (`kits.ts`); the screen plays the part since the last stop */reel?:import('@/lib/highlights/types').Reel;prevStop:number};
 last:ResultView|null;results:ResultView[];
 table:{club:string;name:string;p:number;w:number;d:number;l:number;gf:number;ga:number;gd:number;pts:number;form:string[];mine:boolean}[];tieNote:string;
 seasonEnd:null|{place:number;of:number;champion:boolean;playoff:boolean;grant:number;bonuses:{why:string;amount:number}[];reputation:{why:string;points:number}[];topScorer:{name:string;goals:number}|null};
 /** the first season's squad presentation is waiting for the manager's eleven */meet:boolean;
 /** every season's player numbers — the one being played first, then the finished ones, newest first */stats:{season:number;current:boolean;rows:StatRow[]}[];
 history:Career['history'];ledger:{kind:string;amount:number;note:string|null;name:string|null;season:number}[]
}
const cv=(c:Card):CardView=>({id:c.id,name:c.name,pos:c.pos,...(c.alt?{alt:c.alt}:{}),price:c.price,stars:c.stars,attrs:c.attrs,from:c.from,to:c.to,decades:c.decades})
function logOf(c:Career,events:readonly MatchEventRow[],f:Fixture,names:(side:0|1,id?:string)=>string):LogLine[]{
 const mine=f.home===c.clubId?0:f.away===c.clubId?1:-1
 return events.filter(e=>e.kind!=='chance'||e.minute%2===0).map(e=>{
  const s=e.side,n=(id?:string)=>s===null?'':names(s,id)
  const text=e.kind==='goal'?`Goal — ${n(e.player)}${e.other?` (assist ${n(e.other)})`:''}`:e.kind==='yellow'?`Yellow card — ${n(e.player)}`:e.kind==='red'?`Red card — ${n(e.player)}${e.detail==='second-yellow'?' (second yellow)':''}`
   :e.kind==='injury'?`Injury — ${n(e.player)} (${e.detail}, ${e.n} round${e.n===1?'':'s'})`:e.kind==='sub'?`Change — ${n(e.player)} on for ${n(e.other)}`:e.kind==='tactic'?`Tactics — ${e.detail?.replace(/·/g,' · ')}`
   :e.kind==='chance'?`Chance — ${n(e.player)} goes close`:e.kind==='half-time'?'Half-time':e.kind==='full-time'?'Full-time':e.kind==='extra-time'?'Extra time':e.kind==='penalties'?`Penalties ${e.detail}`:'Kick-off'
  return {minute:e.minute,side:s,kind:e.kind,text,mine:s!==null&&s===mine}
 })
}
export function careerView(c:Career):CareerView{
 const t=me(c),by=catalogMap(c),teams=new Map(c.teams.map(x=>[x.club,x]))
 const nameIn=(club:string,id?:string)=>{if(!id)return '—';const tm=teams.get(club);return (tm&&cardOf(c,tm,id)?.name)??'—'}
 const win=windowOpen(c)
 const squad:SquadView[]=t.squad.map(s=>{const card=by.get(s.id)!,st=t.status[s.id],q=win?saleQuote(card.price,s.paid,s.apps,card.stars,c.settings):null
  return {...cv(card),quota:s.quota,paid:s.paid,apps:s.apps,appsTotal:s.appsTotal,goals:s.goals,yellows:st?.yellows??0,suspension:st?.suspension??0,injury:st?.injury??0,injuryKind:st?.injuryKind??null,fit:available(st),sale:q?{net:q.net,quoted:q.quoted,fees:Math.round((q.fee+q.guard)*10)/10}:null}})
  .sort((a,b)=>QUOTA_POS.indexOf(a.quota)-QUOTA_POS.indexOf(b.quota)||b.stars-a.stars||a.name.localeCompare(b.name))
 const seed=hash(`${c.id}:draft`),d=c.draft&&c.phase==='draft'?deal(c.catalog.cards,c.draft,seed):null
 const draft=d?{slot:d.slot,required:R.initialDraftRequired,optional:R.initialDraftOptional,picks:d.picks.map(p=>({...cv(by.get(p.id)!),slot:p.slot})),spent:d.spent,left:cashLeft(d),minToFinish:minCostToFinish(c.catalog.cards,d),rerollsLeft:d.rerollsLeft,group:d.group,
  upcoming:schedule(d),stuck:!d.group&&d.picks.length<R.initialDraftRequired,
  strip:d.group?c.catalog.cards.filter(x=>x.pos===d.group&&!d.offers.some(o=>o.id===x.id)).sort((a,b)=>hash(`${seed}:${d.slot}:${a.id}`)-hash(`${seed}:${d.slot}:${b.id}`)).slice(0,16).map(x=>x.name):[],offers:d.offers.map(o=>({...cv(by.get(o.id)!),tier:o.tier,locked:o.locked})),deficits:deficits(d),canConfirm:confirmCheck(c.catalog.cards,{...d,optionalDone:true}),optionalOpen:d.picks.length>=R.initialDraftRequired&&!d.optionalDone}:null
 const fx=c.phase==='playoff'?c.season.playoff:nextFixture(c),ab=abilities(c)
 let next:CareerView['next']=null
 if(fx&&!fx.result&&(fx.home===c.clubId||fx.away===c.clubId)){
  const opp=teams.get(fx.home===c.clubId?fx.away:fx.home)!,stars=opp.lineup.xi.reduce((a,id)=>a+(cardOf(c,opp,id)?.stars??0),0)/Math.max(1,opp.lineup.xi.length)
  next={id:fx.id,round:fx.round,home:fx.home,away:fx.away,homeName:teams.get(fx.home)!.name,awayName:teams.get(fx.away)!.name,atHome:fx.home===c.clubId&&c.phase!=='playoff',playoff:c.phase==='playoff',
   opponent:{name:opp.name,formation:opp.lineup.formation,stars:Math.round(stars*4)/4,xi:ab.includes('scouting')?opp.lineup.xi.map(id=>cardOf(c,opp,id)?.name??'—'):null}}
 }
 const pause=pauseOf(c),liveFx=c.live?(c.season.playoff?.id===c.live.fixture?c.season.playoff:c.season.fixtures.find(f=>f.id===c.live!.fixture)):null
 const snapNames=(side:0|1,id?:string)=>{const s=c.live?.snapshot.sides[side];return [...(s?.xi??[]),...(s?.bench??[])].find(x=>x.id===id)?.name??'—'}
 const mySide=liveFx?.home===c.clubId?0:1
 const live=c.live&&pause&&liveFx?{mode:c.live.mode,minute:pause.minute,goals:pause.goals,log:logOf(c,pause.events,liveFx,snapNames),pitch:pause.pitch[mySide],bench:pause.bench[mySide],subsLeft:pause.subsLeft[mySide],tactics:pause.tactics[mySide],stopsLeft:R.maxInterventionWindows-c.live.decisions.length,home:c.live.snapshot.sides[0].name,away:c.live.snapshot.sides[1].name,fixture:c.live.fixture,homeClub:c.live.snapshot.sides[0].club,awayClub:c.live.snapshot.sides[1].club,mine:mySide as 0|1,prevStop:prevStopOf(c)}:null
 const results:ResultView[]=[...c.season.fixtures,...(c.season.playoff?[c.season.playoff]:[])].filter(f=>f.result).map(f=>({id:f.id,round:f.round,home:teams.get(f.home)!.name,away:teams.get(f.away)!.name,homeClub:f.home,awayClub:f.away,goals:f.result!.goals,pens:f.result!.pens,mine:f.home===c.clubId||f.away===c.clubId,
  log:logOf(c,f.result!.events,f,(s,id)=>nameIn(s?f.away:f.home,id))}))
 const last=[...results].filter(r=>r.mine).sort((a,b)=>b.round-a.round)[0]??null
 const rows=table(c),hist=c.history.at(-1)
 const seasonEnd=c.phase==='season-end'&&hist?{place:hist.place,of:hist.of,champion:hist.champion,playoff:hist.playoff,grant:hist.grant,
  bonuses:c.ledger.filter(l=>l.kind==='bonus'&&l.season===hist.ordinal).map(l=>({why:l.note??'Bonus',amount:l.amount})),
  reputation:c.reputation.events.filter(e=>e.season===hist.ordinal).map(e=>({why:e.why,points:e.points})),topScorer:hist.topScorer?{name:hist.topScorer.name,goals:hist.topScorer.goals}:null}:null
 // special offers (§1.3.13): the weakest line's best affordable man, a man of a decade the squad lacks, and the best stars-per-euro — three, four with Market contacts
 let wOffers:CardView[]=[]
 if(win){
  const own=new Set(t.squad.map(s=>s.id)),n=quotaCount(t.squad),avail=c.catalog.cards.filter(x=>!own.has(x.id)&&!c.soldThisWindow.includes(x.id))
  const weak=[...QUOTA_POS].sort((a,b)=>{const avg=(p:QuotaPos)=>{const xs=t.squad.filter(s=>s.quota===p).map(s=>by.get(s.id)!.stars).sort((x,y)=>y-x).slice(0,n[p]);return xs.reduce((u,v)=>u+v,0)/Math.max(1,xs.length)};return avg(a)-avg(b)})
  const decs=new Set(t.squad.flatMap(s=>by.get(s.id)!.decades)),picks:Card[]=[]
  const add=(x:Card|undefined)=>{if(x&&!picks.includes(x))picks.push(x)}
  add(avail.filter(x=>x.pos===weak[0]&&x.price<=t.cash).sort((a,b)=>b.stars-a.stars||a.price-b.price)[0])
  add(avail.filter(x=>x.decades.length&&x.decades.every(dd=>!decs.has(dd))&&x.price<=t.cash).sort((a,b)=>b.stars-a.stars)[0])
  add(avail.filter(x=>x.price<=t.cash).sort((a,b)=>b.stars/b.price-a.stars/a.price||b.stars-a.stars)[0])
  if(ab.includes('contacts'))add(avail.filter(x=>x.pos===weak[1]&&x.price<=t.cash).sort((a,b)=>b.stars-a.stars)[0])
  wOffers=picks.map(cv)
 }
 return {id:c.id,revision:c.revision,status:c.status,phase:c.phase,cutscene:c.cutscene,clubId:c.clubId,clubName:c.clubName,season:c.season.ordinal,rounds:c.season.rounds,played:c.season.played,cash:t.cash,reputation:c.reputation.points,
  abilities:ABILITIES.map(a=>({id:a.id,label:a.label,hint:a.hint,at:a.at,open:c.reputation.points>=a.at})),settings:c.settings,
  rules:{minSquad:R.minSquad,maxSquad:R.maxSquad,minimums:{...R.minimums},maxSubs:R.maxSubs,stops:R.maxInterventionWindows},draft,squad,quotas:quotaCount(t.squad),
  emergency:t.emergency.map(e=>({id:e.id,name:e.card.name,pos:e.card.pos,games:e.games})),
  lineup:{formation:t.lineup.formation,xi:t.lineup.xi,bench:t.lineup.bench,tactics:t.lineup.tactics,captain:captainOf(t.lineup,id=>cardOf(c,t,id))??null,captainPick:t.lineup.captain??null,vice:t.lineup.vice??null,error:c.phase==='draft'?null:lineupError(t.lineup,fieldable(t,id=>cardOf(c,t,id))),slots:slotsOf(t.lineup.formation).map(s=>({id:s.id,fine:s.fine,family:s.family,x:s.x,y:s.y}))},
  window:win?{which:c.season.played===0?'pre':c.season.played<Math.floor(c.season.rounds/2)?'early':'mid',offers:wOffers,sold:c.soldThisWindow}:null,nextWindow:nextWindowOf(c),clubs:clubsOf(c),next,bye:isBye(c),live,last,results,
  table:rows.map(r=>({club:r.club,name:r.name,p:r.p,w:r.w,d:r.d,l:r.l,gf:r.gf,ga:r.ga,gd:r.gd,pts:r.pts,form:r.form.slice(-5),mine:r.club===c.clubId})),
  tieNote:`Ties: points, goal difference, goals scored, head-to-head, then lots drawn at kick-off. A title level on everything but the lots goes to a play-off.`,
  seasonEnd,meet:c.meet==='pending'&&c.phase!=='draft',stats:statsOf(c),history:c.history,
  ledger:[...c.ledger].reverse().slice(0,40).map(l=>({kind:l.kind,amount:l.amount,note:l.note??null,name:l.card?by.get(l.card)?.name??null:null,season:l.season}))}
}
export const cardView=cv
/** the minute of the stop before the current one — the live screen plays the moments after it */
function prevStopOf(c:Career):number{
 if(!c.live||!c.live.decisions.length)return 0
 const fx=c.season.playoff?.id===c.live.fixture?c.season.playoff:c.season.fixtures.find(f=>f.id===c.live!.fixture),side=fx?.home===c.clubId?0:1
 const r=run(c.live.snapshot,c.live.decisions.slice(0,-1),true,side);return r.done?0:r.pause.minute
}
function nextWindowOf(c:Career):number|null{
 if(c.phase==='season-end'||c.phase==='playoff')return null
 const half=Math.floor(c.season.rounds/2),w=c.season.windows,early=R.earlyWindowAfterRound
 if(!w.early&&!w.mid&&half-early>=2&&c.season.played<early)return early
 if(!w.mid&&c.season.played<half)return half
 return null
}
function clubsOf(c:Career):CareerView['clubs']{
 return c.teams.slice(1).map(t=>{const xi=new Set(t.lineup.xi),men=t.squad.map(s=>{const k=cardOf(c,t,s.id);return k?{id:k.id,name:k.name,pos:s.quota,stars:k.stars,from:k.from,to:k.to,apps:s.apps,goals:s.goals,xi:xi.has(k.id)}:null}).filter((x):x is NonNullable<typeof x>=>!!x)
  .sort((a,b)=>QUOTA_POS.indexOf(a.pos)-QUOTA_POS.indexOf(b.pos)||b.stars-a.stars||a.name.localeCompare(b.name))
  const top=men.filter(m=>m.xi);return {club:t.club,name:t.name,formation:t.lineup.formation,stars:Math.round(top.reduce((a,m)=>a+m.stars,0)/Math.max(1,top.length)*4)/4,squad:men}})
}
/** the season being played (unless its record is already written) and every finished season that kept its numbers */
function statsOf(c:Career):CareerView['stats']{
 const done=c.history.filter(h=>h.stats).map(h=>({season:h.ordinal,current:false,rows:h.stats!}))
 const cur=c.season.ended&&done.some(d=>d.season===c.season.ordinal)?[]:[{season:c.season.ordinal,current:true,rows:seasonRows(c)}]
 return [...cur,...done.sort((a,b)=>b.season-a.season)]
}
