import {hash} from '@/lib/clubs/rumble-rng'
import {isFormation} from '@/lib/clubs/rumble-xi/formations'
import {ENGINE_VERSION,LEGENDS_RULES as R,RULE_VERSION,roundTenths,type LegendsSettings,type QuotaPos} from './config'
import {aiWindow,prepareEmergency} from './ai'
import {afterBye,afterMatch,available,fresh,newSeason,type MatchBook} from './discipline'
import {botDraft,confirmCheck,draftMove,emptyDraft,type DraftMove} from './draft'
import {abilitiesAt,achievements,capBonuses,nextSeasonGrant,saleQuote,seasonScore} from './economy'
import {checkDecision,run,type PauseState} from './engine'
import {fixturesFor,roundsFor,standings,titleTie} from './league'
import {bestLineup,fieldable,lineupError,quotaCount,squadError} from './squad'
import {DEFAULT_TACTICS,type Approach,type Card,type Career,type Catalog,type Decision,type Fixture,type LedgerEntry,type Live,type MatchOutcome,type MatchSnapshot,type Pressing,type Season,type SideSnapshot,type Tactics,type Team,type Tempo} from './types'

/**
 * A Legends career as a pure state machine (rulebook §1, §2.11). The server reads the stored career, applies ONE action here and
 * saves it with compare-and-swap; the browser only ever sends an intent with the revision it saw and a fresh key — a stale
 * revision is refused, a repeated key answers the state it already produced (S02). Nothing here reads a clock or a random
 * source: every draw comes from `hash(career id : season : what)`.
 *
 * Phases: draft → (board grant) → window → season ⇄ window (halfway) → [title play-off] → season end → window (next season) …
 */
export const me=(c:Career):Team=>c.teams[0]!
const maps=new WeakMap<Catalog,Map<string,Card>>()
export const catalogMap=(c:Career)=>{let m=maps.get(c.catalog);if(!m){m=new Map(c.catalog.cards.map(x=>[x.id,x]));maps.set(c.catalog,m)}return m}
export function cardOf(c:Career,t:Team,id:string):Card|undefined{
 return (t.ai?t.cards[id]:catalogMap(c).get(id))??t.emergency.find(e=>e.id===id)?.card
}
const teamBy=(c:Career)=>new Map(c.teams.map(t=>[t.club,t]))
export const windowOpen=(c:Career)=>c.status==='active'&&c.phase==='window'
const seasonSalt=(c:Career)=>`${c.id}:${c.season.ordinal}`
export const table=(c:Career)=>standings(c.teams.map(t=>({club:t.club,name:t.name})),c.season.fixtures,c.settings.points,seasonSalt(c))
export const nextFixture=(c:Career)=>c.season.fixtures.find(f=>f.round===c.season.played+1&&(f.home===c.clubId||f.away===c.clubId))??null
export const isBye=(c:Career)=>c.phase==='season'&&c.season.played<c.season.rounds&&!nextFixture(c)

function newSeasonOf(teams:readonly Team[],ordinal:number,salt:string):Season{
 const order=[...teams].map(t=>t.club).sort((a,b)=>hash(`${salt}:${ordinal}:${a}`)-hash(`${salt}:${ordinal}:${b}`))
 const fixtures=fixturesFor(order).map(f=>({...f,result:null}))
 return {ordinal,rounds:roundsFor(teams.length),played:0,fixtures,windows:{pre:true,mid:false},bonusAwarded:0,playoff:null,ended:false,ranks:[]}
}

/* ───────── creation (§1.1.3: a club opens only when a full legal draft is possible — the server checks readiness first) ───────── */
export type CreateInput={id:string;owner:string;now:string;own:Catalog;rivals:Catalog[];settings:LegendsSettings}
export function createCareer(i:CreateInput):{ok:true;career:Career}|{ok:false;error:string}{
 const teams:Team[]=[{club:i.own.club,name:i.own.clubName,ai:false,squad:[],cards:{},lineup:{formation:'4-3-3',xi:[],bench:[],tactics:{...DEFAULT_TACTICS}},cash:0,status:{},emergency:[],morale:1,usedEmergency:[]}]
 for(const cat of [...i.rivals].sort((a,b)=>hash(`${i.id}:${a.club}`)-hash(`${i.id}:${b.club}`))){
  if(teams.length>=R.maxLeagueClubs)break
  if(cat.club===i.own.club||teams.some(t=>t.club===cat.club))continue
  // the same draft, the same prices, the same quotas (§1.6.35) — a bot chooses
  const b=botDraft(cat.cards,hash(`${i.id}:ai:${cat.club}`),'value');if(b.error)continue
  const by=new Map(cat.cards.map(c=>[c.id,c])),cards:Record<string,Card>={}
  for(const p of b.draft.picks)cards[p.id]=by.get(p.id)!
  const squad=b.draft.picks.map(p=>({id:p.id,quota:p.quota,paid:p.price,apps:0,appsTotal:0,goals:0,joined:1}))
  const lu=bestLineup(Object.values(cards));if(!lu)continue
  teams.push({club:cat.club,name:cat.clubName,ai:true,squad,cards,lineup:lu,cash:roundTenths(R.initialDraftBudgetM-b.draft.spent+R.firstBoardGrantM),status:{},emergency:[],morale:1,usedEmergency:[]})
 }
 if(teams.length<R.minEligibleClubs)return {ok:false,error:`A league needs ${R.minEligibleClubs} ready clubs; ${teams.length} are ready.`}
 return {ok:true,career:{v:2,id:i.id,rules:RULE_VERSION,engine:ENGINE_VERSION,owner:i.owner,clubId:i.own.club,clubName:i.own.clubName,status:'active',settings:{...i.settings,points:{...i.settings.points}},catalog:i.own,teams,
  phase:'draft',draft:emptyDraft(),season:newSeasonOf(teams,1,i.id),live:null,cutscene:null,soldThisWindow:[],aiDone:[],ledger:[],reputation:{points:0,events:[]},history:[],keys:[],revision:1,createdAt:i.now,updatedAt:i.now}}
}

/* ───────── actions ───────── */
export type Action=({kind:'draft';move:DraftMove}|{kind:'draft-confirm'}|{kind:'ack'}|{kind:'buy';card:string}|{kind:'sell';card:string}|{kind:'swap';sell:string;buy:string}
 |{kind:'lineup';formation:string;xi:string[];bench:string[];tactics:Tactics}|{kind:'auto';formation?:string}|{kind:'close-window'}
 |{kind:'match-start';mode:'fast'|'interactive'}|{kind:'match-decide';decision:{tactics?:Tactics;subs?:{out:string;in:string}[]}}|{kind:'play-round'}|{kind:'next-season'})&{key:string;rev:number}
/** an action before the server stamps it with a key and a revision */
export type Intent=Action extends infer A?A extends Action?Omit<A,'key'|'rev'>:never:never
export type ActionResult={ok:true;career:Career;replay?:boolean;note?:string}|{ok:false;code:'stale'|'invalid'|'closed';error:string}
const APPROACH:readonly Approach[]=['defensive','balanced','attacking'],PRESS:readonly Pressing[]=['low','medium','high'],TEMPO:readonly Tempo[]=['slow','normal','fast']
const tacticsOf=(v:unknown):Tactics|null=>{const t=v as Tactics;return t&&APPROACH.includes(t.approach)&&PRESS.includes(t.pressing)&&TEMPO.includes(t.tempo)?{approach:t.approach,pressing:t.pressing,tempo:t.tempo}:null}
const ids=(v:unknown,max:number)=>Array.isArray(v)&&v.length<=max&&v.every(x=>typeof x==='string'&&x.length<=200)?v as string[]:null
export function parseAction(raw:unknown):Action|null{
 if(!raw||typeof raw!=='object')return null
 const a=raw as Record<string,unknown>
 if(typeof a.key!=='string'||!/^[A-Za-z0-9_-]{8,64}$/.test(a.key)||!Number.isSafeInteger(a.rev))return null
 const b={key:a.key,rev:a.rev as number},str=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=200
 switch(a.kind){
  case 'draft':{const m=a.move as Record<string,unknown>;if(!m)return null
   if(m.kind==='group'&&['GK','DF','MF','FW'].includes(m.group as string))return {...b,kind:'draft',move:{kind:'group',group:m.group as QuotaPos}}
   if(m.kind==='pick'&&str(m.id))return {...b,kind:'draft',move:{kind:'pick',id:m.id as string}}
   if(m.kind==='reroll'||m.kind==='skip')return {...b,kind:'draft',move:{kind:m.kind}}
   return null}
  case 'draft-confirm':case 'ack':case 'close-window':case 'play-round':case 'next-season':return {...b,kind:a.kind}
  case 'buy':case 'sell':return str(a.card)?{...b,kind:a.kind,card:a.card as string}:null
  case 'swap':return str(a.sell)&&str(a.buy)?{...b,kind:'swap',sell:a.sell as string,buy:a.buy as string}:null
  case 'lineup':{const xi=ids(a.xi,11),bench=ids(a.bench,7),t=tacticsOf(a.tactics);return typeof a.formation==='string'&&xi&&bench&&t?{...b,kind:'lineup',formation:a.formation,xi,bench,tactics:t}:null}
  case 'auto':return {...b,kind:'auto',...(typeof a.formation==='string'?{formation:a.formation}:{})}
  case 'match-start':return a.mode==='fast'||a.mode==='interactive'?{...b,kind:'match-start',mode:a.mode}:null
  case 'match-decide':{const d=(a.decision??{}) as Record<string,unknown>,t=d.tactics===undefined?undefined:tacticsOf(d.tactics)
   if(t===null)return null
   const subs=Array.isArray(d.subs)&&d.subs.length<=3&&d.subs.every(s=>s&&typeof s==='object'&&str((s as {out:unknown}).out)&&str((s as {in:unknown}).in))?(d.subs as {out:string;in:string}[]).map(s=>({out:s.out,in:s.in})):d.subs===undefined?undefined:null
   if(subs===null)return null
   return {...b,kind:'match-decide',decision:{...(t?{tactics:t}:{}),...(subs?{subs}:{})}}}
 }
 return null
}

/** the AI clubs' catalogs, handed in by the server when a window closes or an AI side needs an emergency man */
export type Ctx={now:string;catalogs:ReadonlyMap<string,readonly Card[]>}

export function applyAction(c:Career,a:Action,ctx:Ctx):ActionResult{
 if(c.keys.includes(a.key))return {ok:true,career:c,replay:true}
 if(a.rev!==c.revision)return {ok:false,code:'stale',error:'This career moved on in another tab. It has been reloaded.'}
 if(c.status!=='active')return {ok:false,code:'closed',error:'This career is archived. Restore it to play.'}
 const r=step(c,a,ctx);if(!r.ok)return r
 return {...r,career:{...r.career,revision:c.revision+1,updatedAt:ctx.now,keys:[...c.keys,a.key].slice(-60)}}
}
const bad=(error:string,code:'invalid'|'closed'='invalid'):ActionResult=>({ok:false,code,error})
const withMe=(c:Career,t:Team):Career=>({...c,teams:[t,...c.teams.slice(1)]})
const pay=(c:Career,e:Omit<LedgerEntry,'season'|'at'>,now:string):Career=>{const t=me(c);return {...withMe(c,{...t,cash:roundTenths(t.cash+e.amount)}),ledger:[...c.ledger,{...e,season:c.season.ordinal,at:now}]}}

function step(c:Career,a:Action,ctx:Ctx):ActionResult{
 const t=me(c),cat=c.catalog.cards
 switch(a.kind){
  case 'draft':{
   if(c.phase!=='draft'||!c.draft)return bad('The draft is over.','closed')
   const r=draftMove(cat,c.draft,a.move,hash(`${c.id}:draft`));if(!r.ok)return bad(r.error)
   return {ok:true,career:{...c,draft:r.draft}}
  }
  case 'draft-confirm':{
   if(c.phase!=='draft'||!c.draft)return bad('The draft is over.','closed')
   const err=confirmCheck(cat,c.draft);if(err)return bad(err)
   const by=catalogMap(c),squad=c.draft.picks.map(p=>({id:p.id,quota:p.quota,paid:p.price,apps:0,appsTotal:0,goals:0,joined:1}))
   const lu=bestLineup(squad.map(s=>by.get(s.id)!))!
   let next:Career={...withMe(c,{...t,squad,lineup:lu,cash:0}),draft:{...c.draft,confirmed:true},phase:'window',cutscene:'board-grant'}
   next=pay(next,{key:`draft-budget:${c.id}`,kind:'draft-budget',amount:R.initialDraftBudgetM},ctx.now)
   for(const p of c.draft.picks)next=pay(next,{key:`draft-buy:${c.id}:${p.id}`,kind:'draft-buy',amount:-p.price,card:p.id},ctx.now)
   // the board's one-off grant (§1.2.12): ledger key first-window-grant:<career>, so it can never be paid twice
   next=pay(next,{key:`first-window-grant:${c.id}`,kind:'board-grant',amount:R.firstBoardGrantM,note:'Season-ticket holders, sponsors and the board'},ctx.now)
   return {ok:true,career:next}
  }
  case 'ack':return {ok:true,career:{...c,cutscene:null}}
  case 'buy':{
   if(!windowOpen(c))return bad('The transfer window is shut.','closed')
   const card=catalogMap(c).get(a.card)
   if(!card)return bad(`That man never played for ${c.clubName}.`)
   if(t.squad.some(s=>s.id===card.id))return bad(`${card.name} is already in your squad.`)
   if(c.soldThisWindow.includes(card.id))return bad(`${card.name} left in this window — he can come back in the next one.`)
   if(t.squad.length>=R.maxSquad)return bad(`A squad holds ${R.maxSquad} at most. Sell first, or swap.`)
   if(card.price>t.cash+1e-9)return bad(`${card.name} costs €${card.price}M; you have €${t.cash}M.`)
   const squad=[...t.squad,{id:card.id,quota:card.pos,paid:card.price,apps:0,appsTotal:0,goals:0,joined:c.season.ordinal}]
   return {ok:true,career:pay(withMe(c,{...t,squad}),{key:`buy:${a.key}`,kind:'buy',amount:-card.price,card:card.id},ctx.now)}
  }
  case 'sell':{
   if(!windowOpen(c))return bad('The transfer window is shut.','closed')
   const s=t.squad.find(x=>x.id===a.card),card=s&&catalogMap(c).get(s.id);if(!s||!card)return bad('He is not in your squad.')
   const squad=t.squad.filter(x=>x.id!==s.id),err=squadError(squad)
   if(err)return bad(`${err} Swap him for someone instead.`)
   const q=saleQuote(card.price,s.paid,s.apps,card.stars,c.settings)
   const lineup=t.lineup.xi.includes(s.id)||t.lineup.bench.includes(s.id)?bestLineup(squad.map(x=>catalogMap(c).get(x.id)!).filter(x=>available(t.status[x.id])),t.lineup.formation,t.lineup.tactics)??t.lineup:t.lineup
   return {ok:true,career:{...pay(withMe(c,{...t,squad,lineup}),{key:`sell:${a.key}`,kind:'sell',amount:q.net,card:card.id,note:`€${q.quoted}M quoted · €${roundTenths(q.fee+q.guard)}M fees`},ctx.now),soldThisWindow:[...c.soldThisWindow,card.id]}}
  }
  case 'swap':{
   if(!windowOpen(c))return bad('The transfer window is shut.','closed')
   const out=t.squad.find(x=>x.id===a.sell),oc=out&&catalogMap(c).get(out.id),inc=catalogMap(c).get(a.buy)
   if(!out||!oc)return bad('He is not in your squad.')
   if(!inc)return bad(`That man never played for ${c.clubName}.`)
   if(t.squad.some(s=>s.id===inc.id))return bad(`${inc.name} is already in your squad.`)
   if(c.soldThisWindow.includes(inc.id))return bad(`${inc.name} left in this window.`)
   const q=saleQuote(oc.price,out.paid,out.apps,oc.stars,c.settings),cash=roundTenths(t.cash+q.net-inc.price)
   if(cash<-1e-9)return bad(`After the sale you would have €${roundTenths(t.cash+q.net)}M; ${inc.name} costs €${inc.price}M.`)
   const squad=[...t.squad.filter(x=>x.id!==out.id),{id:inc.id,quota:inc.pos,paid:inc.price,apps:0,appsTotal:0,goals:0,joined:c.season.ordinal}]
   const err=squadError(squad);if(err)return bad(err)
   const lineup=bestLineup(squad.map(x=>catalogMap(c).get(x.id)!).filter(x=>available(t.status[x.id])),t.lineup.formation,t.lineup.tactics)??t.lineup
   let next=pay(withMe(c,{...t,squad,lineup}),{key:`swap-sell:${a.key}`,kind:'sell',amount:q.net,card:oc.id,note:`swap · €${q.quoted}M quoted`},ctx.now)
   next=pay(next,{key:`swap-buy:${a.key}`,kind:'buy',amount:-inc.price,card:inc.id,note:'swap'},ctx.now)
   return {ok:true,career:{...next,soldThisWindow:[...c.soldThisWindow,oc.id]}}
  }
  case 'lineup':{
   if(c.phase==='draft')return bad('Finish the draft first.','closed')
   if(c.live)return bad('A match is being played — change it from the touchline.','closed')
   if(!isFormation(a.formation))return bad('Unknown formation.')
   const lu={formation:a.formation,xi:a.xi,bench:a.bench,tactics:a.tactics},err=lineupError(lu,fieldable(t,id=>cardOf(c,t,id)));if(err)return bad(err)
   return {ok:true,career:withMe(c,{...t,lineup:lu})}
  }
  case 'auto':{
   if(c.phase==='draft')return bad('Finish the draft first.','closed')
   if(c.live)return bad('A match is being played.','closed')
   const f=a.formation&&isFormation(a.formation)?a.formation:t.lineup.formation,lu=bestLineup(fieldable(t,id=>cardOf(c,t,id)),f,t.lineup.tactics)
   if(!lu)return bad('Not enough fit men for an eleven.')
   return {ok:true,career:withMe(c,{...t,lineup:lu})}
  }
  case 'close-window':{
   if(!windowOpen(c))return bad('No window is open.','closed')
   const err=squadError(t.squad);if(err)return bad(err)
   // the AI clubs do their business as the window shuts (two purchases each at most)
   const teams=c.teams.map((x,i)=>{if(!i||!x.ai)return x;const cat=ctx.catalogs.get(x.club);return cat?aiWindow(x,cat,c.settings,hash(`${seasonSalt(c)}:${c.season.played}:${x.club}`)).team:x})
   return {ok:true,career:{...c,teams,phase:'season',soldThisWindow:[],cutscene:null}}
  }
  case 'match-start':{
   if(c.phase!=='season'&&c.phase!=='playoff')return bad('There is no match to play now.','closed')
   if(c.live)return bad('This match has started.','closed')
   const fx=c.phase==='playoff'?c.season.playoff:nextFixture(c)
   if(!fx||fx.result)return bad('Your club has no match this round.','closed')
   const prep=prepareSide(c,t,ctx);if('error' in prep)return bad(prep.error)
   let next=prep.career
   const opp=teamBy(next).get(fx.home===c.clubId?fx.away:fx.home)!,oppPrep=prepareSide(next,opp,ctx);if('error' in oppPrep)return bad(oppPrep.error)
   next=oppPrep.career
   const snap=snapshotFor(next,fx,c.phase==='playoff')
   const live:Live={fixture:fx.id,mode:a.mode,snapshot:snap,decisions:[],startedAt:ctx.now}
   next={...next,live}
   if(a.mode==='fast')return commitMine(next,ctx,prep.note)
   const r=run(snap,[],true,mySide(next,fx));if(r.done)return commitMine(next,ctx,prep.note)
   return {ok:true,career:next,note:prep.note??undefined}
  }
  case 'match-decide':{
   if(!c.live||c.live.mode!=='interactive')return bad('No match is waiting for you.','closed')
   const fx=fixtureById(c,c.live.fixture)!,side=mySide(c,fx),r=run(c.live.snapshot,c.live.decisions,true,side)
   if(r.done)return commitMine(c,ctx,null)
   if(c.live.decisions.length>=R.maxInterventionWindows)return bad('Three stops a match — the rest plays out.')
   const d:Decision={stop:r.pause.stop,...a.decision},err=checkDecision(r.pause,side,d);if(err)return bad(err)
   const next={...c,live:{...c.live,decisions:[...c.live.decisions,d]}}
   const r2=run(next.live.snapshot,next.live.decisions,true,side)
   return r2.done?commitMine(next,ctx,null):{ok:true,career:next}
  }
  case 'play-round':{
   if(!isBye(c))return bad('Your club plays this round.','closed')
   return commitRound(c,null,ctx,null)
  }
  case 'next-season':{
   if(c.phase!=='season-end')return bad('The season is not over.','closed')
   const ord=c.season.ordinal+1,teams=c.teams.map(x=>({...x,morale:1,status:Object.fromEntries(Object.entries(x.status).map(([k,v])=>[k,newSeason(v,c.settings.yellowsResetEachSeason)])),squad:x.squad.map(s=>({...s}))}))
   return {ok:true,career:{...c,teams,season:newSeasonOf(teams,ord,c.id),phase:'window',cutscene:null,soldThisWindow:[]}}
  }
 }
}

/* ───────── matches ───────── */
const fixtureById=(c:Career,id:string)=>c.season.playoff?.id===id?c.season.playoff:c.season.fixtures.find(f=>f.id===id)
const mySide=(c:Career,f:Fixture):0|1=>f.home===c.clubId?0:1
export function pauseOf(c:Career):PauseState|null{
 if(!c.live)return null
 const fx=fixtureById(c,c.live.fixture);if(!fx)return null
 const r=run(c.live.snapshot,c.live.decisions,true,mySide(c,fx));return r.done?null:r.pause
}
/** emergency first, then a legal eleven: the manager's own (refused if it no longer stands), the AI's best */
function prepareSide(c:Career,t:Team,ctx:Ctx):{career:Career;note:string|null}|{error:string}{
 const catalog=t.ai?ctx.catalogs.get(t.club)??Object.values(t.cards):c.catalog.cards
 const e=prepareEmergency(t,catalog,id=>cardOf(c,t,id),c.season.played+1,hash(`${seasonSalt(c)}:${t.club}`),t.ai?0:c.settings.emergencyCostM,c.season.ordinal,ctx.now,`${c.id}:${c.season.ordinal}:${c.season.played+1}`)
 let team=e.team,repaired=false
 const men=fieldable(team,id=>cardOf(c,team,id))
 if(t.ai||team.emergency.length||lineupError(team.lineup,men)){
  const own=!t.ai&&!lineupError(team.lineup,men)
  if(!own){const lu=bestLineup(men,team.lineup.formation,team.lineup.tactics);if(!lu)return {error:'Not enough fit men for an eleven, even with the archive’s help.'};team={...team,lineup:lu};if(!t.ai)repaired=true}
 }
 const teams=c.teams.map(x=>x.club===t.club?team:x)
 return {career:{...c,teams,ledger:[...c.ledger,...e.ledger]},note:t.ai?null:[e.note,repaired?'Your eleven had an unavailable man — the best fit eleven was picked.':null].filter(Boolean).join(' ')||null}
}
function sideSnap(c:Career,t:Team,home:boolean|null):SideSnapshot{
 const m=(id:string)=>{const x=cardOf(c,t,id)!;return {id:x.id,name:x.name,pos:x.pos,stars:x.stars,attrs:x.attrs}}
 return {club:t.club,name:t.name,formation:t.lineup.formation,tactics:{...t.lineup.tactics},xi:t.lineup.xi.map(m),bench:t.lineup.bench.map(m),morale:t.morale,home}
}
function snapshotFor(c:Career,f:Fixture,knockout:boolean):MatchSnapshot{
 const by=teamBy(c),h=by.get(f.home)!,aw=by.get(f.away)!
 return {id:f.id,seed:hash(`${seasonSalt(c)}:${f.id}`),engine:ENGINE_VERSION,rules:RULE_VERSION,sides:[sideSnap(c,h,knockout?null:true),sideSnap(c,aw,knockout?null:false)],knockout,...(knockout?{decider:c.settings.playoffDrawDecider}:{})}
}
function commitMine(c:Career,ctx:Ctx,note:string|null):ActionResult{
 const live=c.live!,fx=fixtureById(c,live.fixture)!,r=run(live.snapshot,live.decisions,live.mode==='interactive',mySide(c,fx))
 if(!r.done)return {ok:true,career:c}
 return commitRound({...c,live:null},{fixture:fx.id,outcome:r.outcome,seed:live.snapshot.seed},ctx,note)
}
/** every other match of the round on the quick sim, then the books for everyone — one step, so a result is never half-applied */
function commitRound(c0:Career,mine:{fixture:string;outcome:MatchOutcome;seed:number}|null,ctx:Ctx,note:string|null):ActionResult{
 let c=c0
 if(c.phase==='playoff'){
  const fx=c.season.playoff!
  let out=mine
  if(!out){const snap=snapshotFor(c,fx,true),r=run(snap,[],false);if(!r.done)return bad('The play-off could not finish.');out={fixture:fx.id,outcome:r.outcome,seed:snap.seed}}
  c=book(c,fx,out.outcome)
  return finishSeason({...c,season:{...c.season,playoff:{...fx,result:{goals:out.outcome.goals,pens:out.outcome.pens,events:out.outcome.events,seed:out.seed}}}},ctx,note)
 }
 const round=c.season.played+1,playing=new Set<string>()
 const fixtures=[...c.season.fixtures]
 for(let i=0;i<fixtures.length;i++){
  const f=fixtures[i]!;if(f.round!==round||f.result)continue
  playing.add(f.home);playing.add(f.away)
  let outcome:MatchOutcome,seed:number
  if(mine&&mine.fixture===f.id){outcome=mine.outcome;seed=mine.seed}
  else{
   for(const club of [f.home,f.away]){const t=teamBy(c).get(club)!;const p=prepareSide(c,t,ctx);if('error' in p)return bad(`${t.name}: ${p.error}`);c=p.career}
   const snap=snapshotFor(c,f,false),r=run(snap,[],false);if(!r.done)return bad('A match could not finish.');outcome=r.outcome;seed=snap.seed
  }
  fixtures[i]={...f,result:{goals:outcome.goals,pens:null,events:outcome.events,seed}}
  c=book({...c,season:{...c.season,fixtures}},f,outcome)
 }
 // a club that sat this round out: a BYE (a setting decides whether it serves an absence)
 c={...c,teams:c.teams.map(t=>playing.has(t.club)?t:{...t,status:Object.fromEntries(Object.entries(t.status).map(([k,v])=>[k,afterBye(v,c.settings.byeCountsForAbsence)]))})}
 const played=round,season={...c.season,fixtures,played}
 c={...c,season}
 if(played>=season.rounds)return finishSeason(c,ctx,note)
 if(played===Math.floor(season.rounds/2)&&!season.windows.mid)return {ok:true,career:{...c,phase:'window',season:{...season,windows:{...season.windows,mid:true}},soldThisWindow:[]},note:note??undefined}
 return {ok:true,career:c,note:note??undefined}
}
/** cards, injuries, appearances, morale — for both clubs of one match */
function book(c:Career,f:Fixture,o:MatchOutcome):Career{
 const res=o.goals,pensWin=o.pens?(o.pens[0]>o.pens[1]?0:1):null
 const teams=c.teams.map(t=>{
  const side=t.club===f.home?0:t.club===f.away?1:-1;if(side<0)return t
  const s=side as 0|1,played=new Set(o.played[s]),status={...t.status}
  for(const e of t.squad){
   const b:MatchBook|null=played.has(e.id)||o.yellows[s][e.id]||o.reds[s][e.id]||o.injuries[s][e.id]?{yellows:o.yellows[s][e.id]??0,red:o.reds[s][e.id]??null,injury:o.injuries[s][e.id]??null}:null
   status[e.id]=afterMatch(status[e.id]??fresh(),b,true)
  }
  const squad=t.squad.map(e=>played.has(e.id)?{...e,apps:e.apps+1,appsTotal:e.appsTotal+1,goals:e.goals+(o.scorers[s][e.id]??0)}:e)
  const won=res[s]>res[s?0:1]||pensWin===s,lost=res[s]<res[s?0:1]||(pensWin!==null&&pensWin!==s)
  const morale=Math.max(R.moraleMin,Math.min(R.moraleMax,roundTenths((1+(t.morale-1)*0.85+(won?0.03:lost?-0.03:0))*100)/100))
  const emergency=t.emergency.map(e=>({...e,games:e.games+1})).filter(e=>e.games<R.emergencyMaxMatches)
  return {...t,status,squad,morale,emergency}
 })
 return {...c,teams}
}
function longestRun(form:readonly string[]){let best=0,cur=0;for(const x of form){cur=x==='W'?cur+1:0;best=Math.max(best,cur)}return best}
function finishSeason(c:Career,ctx:Ctx,note:string|null):ActionResult{
 const rows=table(c)
 if(!c.season.playoff){
  const tie=titleTie(rows,c.season.fixtures,c.settings.points,seasonSalt(c))
  if(tie.length===2){
   const fx:Fixture={id:`playoff-${c.season.ordinal}`,round:c.season.rounds+1,home:tie[0]!,away:tie[1]!,result:null}
   const next={...c,season:{...c.season,playoff:fx}}
   if(tie.includes(c.clubId))return {ok:true,career:{...next,phase:'playoff'},note:'Level on everything at the top — the title goes to a play-off.'}
   return commitRound({...next,phase:'playoff'},null,ctx,note)
  }
 }
 const po=c.season.playoff?.result,poWinner=po?(po.goals[0]>po.goals[1]||(po.pens&&po.pens[0]>po.pens[1])?c.season.playoff!.home:c.season.playoff!.away):null
 const ranked=poWinner?[rows.find(r=>r.club===poWinner)!,...rows.filter(r=>r.club!==poWinner)]:rows
 const n=ranked.length,place=ranked.findIndex(r=>r.club===c.clubId)+1,mine=ranked[place-1]!,champion=place===1
 // achievements (≤ €5M a season), reputation, then the board's grant on the cash that is there
 const home=c.season.fixtures.filter(f=>f.home===c.clubId&&f.result),unbeatenHome=home.length>0&&home.every(f=>f.result!.goals[0]>=f.result!.goals[1])
 const bestAttack=ranked.every(r=>r.gf<=mine.gf),run3=longestRun(mine.form)
 const awarded=capBonuses(achievements({place,of:n,champion,unbeatenHome,bestAttack,longestWinRun:run3}),c.season.bonusAwarded)
 let next=c
 for(const b of awarded){const key=`bonus:${c.id}:${c.season.ordinal}:${b.key}`;if(next.ledger.some(l=>l.key===key))continue;next=pay(next,{key,kind:'bonus',amount:b.amount,note:b.why},ctx.now)}
 const bonus=roundTenths(awarded.reduce((a,b)=>a+b.amount,0))
 const grant=nextSeasonGrant(seasonScore(place,n,champion),me(next).cash,next.settings),gk=`season-grant:${c.id}:${c.season.ordinal}`
 if(!next.ledger.some(l=>l.key===gk))next=pay(next,{key:gk,kind:'season-grant',amount:grant,note:`Board grant for season ${c.season.ordinal+1}`},ctx.now)
 // the AI clubs get the same board, so a league does not drift apart over seasons
 next={...next,teams:next.teams.map((t,i)=>{if(!i)return t;const p=ranked.findIndex(r=>r.club===t.club)+1;return {...t,cash:roundTenths(t.cash+nextSeasonGrant(seasonScore(p,n,p===1),t.cash,next.settings))}})}
 const rep:{key:string;why:string;points:number}[]=[{key:'wins',why:`${mine.w} wins`,points:mine.w*3+mine.d},...(champion?[{key:'title',why:'Champions',points:25}]:place===2?[{key:'second',why:'Runners-up',points:10}]:place<=Math.ceil(n/2)?[{key:'top-half',why:'Top half',points:5}]:[]),...(run3>=3?[{key:'run',why:`${run3} wins in a row`,points:3}]:[])]
 const events=rep.map(e=>({...e,key:`rep:${c.season.ordinal}:${e.key}`,season:c.season.ordinal})).filter(e=>!next.reputation.events.some(x=>x.key===e.key))
 const scorer=[...me(next).squad].sort((a,b)=>b.goals-a.goals)[0]
 const record={ordinal:c.season.ordinal,place,of:n,points:mine.pts,w:mine.w,d:mine.d,l:mine.l,gf:mine.gf,ga:mine.ga,champion,playoff:!!c.season.playoff,grant,bonus,cash:me(next).cash,squad:me(next).squad.map(s=>s.id),topScorer:scorer&&scorer.goals>0?{id:scorer.id,name:catalogMap(c).get(scorer.id)?.name??'—',goals:scorer.goals}:null}
 // goals were a season tally on the squad entry; the record keeps them, the new season counts from zero
 next={...next,teams:next.teams.map(t=>({...t,squad:t.squad.map(s=>({...s,goals:0}))}))}
 return {ok:true,career:{...next,phase:'season-end',cutscene:'season-end',season:{...next.season,ended:true,bonusAwarded:roundTenths(c.season.bonusAwarded+bonus),ranks:ranked.map(r=>r.club)},
  reputation:{points:next.reputation.points+events.reduce((a,e)=>a+e.points,0),events:[...next.reputation.events,...events]},history:[...next.history,record]},note:note??undefined}
}
export const abilities=(c:Career)=>abilitiesAt(c.reputation.points)
export const quotas=(t:Team)=>quotaCount(t.squad)
export const cashFromLedger=(c:Career)=>roundTenths(c.ledger.reduce((a,l)=>a+l.amount,0))
