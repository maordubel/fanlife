import {hash} from '@/lib/clubs/rumble-rng'
import {FORMATION_IDS,isFormation} from '@/lib/clubs/rumble-xi/formations'
import type {FormationId} from '@/lib/clubs/rumble-xi/types'
import {bestXI,coreSquad,validXI} from './catalog'
import {simulate} from './engine'
import {doubleRoundRobin,table} from './league'
import {readinessOf} from './readiness'
import {KITTY,LEAGUE_MAX,LEAGUE_MIN,RULES_ID,SELL_RATE,SQUAD_MAX,SQUAD_MIN,TACTICS,type Card,type Career,type Catalog,type Decade,type Tactic,type Team} from './types'

/**
 * The career as a pure state machine (appendix B §2–§5). The server reads the stored career, applies ONE action here and saves
 * it back with compare-and-swap; the browser only ever sends an intent. Every action carries the revision it was made against
 * (a stale one is refused, 409) and an idempotency key (a repeat answers the state it already produced).
 * Windows: before round 1, and after round ⌊R/2⌋ until the next round is played. Buying and selling are inside the club only.
 */
const half=(x:number)=>Math.round(x*2)/2
export const windowOpen=(c:Pick<Career,'status'|'played'|'rounds'>)=>c.status==='active'&&(c.played===0||c.played===Math.floor(c.rounds/2))
export const me=(c:Career):Team=>c.teams[0]!
export function cardsOf(c:Career,t:Team):Card[]{return t.ai?t.cards:c.catalog.cards}
/** what a sale brings back: 80%, rounded DOWN to the half-million — a sale never makes money */
export const sellPrice=(price:number)=>Math.floor(price*SELL_RATE*2)/2
const formationFor=(cards:readonly Card[],seed:number):{f:FormationId;xi:string[]}|null=>{
 const order=[...FORMATION_IDS].sort((a,b)=>hash(`${seed}:${a}`)-hash(`${seed}:${b}`))
 for(const f of order){const xi=bestXI(cards,f);if(xi)return {f,xi}}
 return null
}

export type CreateInput={id:string;owner:string;now:string;own:Catalog;homeDecade:Decade;rivals:{catalog:Catalog;decade:Decade}[]}
export function createCareer(i:CreateInput):{ok:true;career:Career}|{ok:false;error:string}{
 const rd=readinessOf(i.own)
 if(rd.verdict==='BLOCK')return {ok:false,error:`${i.own.clubName} is not ready: ${rd.reasons[0]}`}
 if(!rd.homeDecades.includes(i.homeDecade))return {ok:false,error:`${i.own.clubName} cannot field an eleven from the ${i.homeDecade}s.`}
 const core=coreSquad(i.own.cards,i.homeDecade),cardsBy=new Map(i.own.cards.map(c=>[c.id,c]))
 const mine=core.squad.map(id=>cardsBy.get(id)!),start=bestXI(mine,'4-3-3')?{f:'4-3-3' as FormationId,xi:bestXI(mine,'4-3-3')!}:formationFor(mine,hash(i.id))
 if(!start)return {ok:false,error:'The starting squad cannot field a legal eleven.'}
 const teams:Team[]=[{club:i.own.club,name:i.own.clubName,ai:false,decade:i.homeDecade,formation:start.f,tactic:'balanced',squad:core.squad,xi:start.xi,cards:[]}]
 for(const r of i.rivals){
  if(teams.length>=LEAGUE_MAX)break
  if(r.catalog.club===i.own.club||teams.some(t=>t.club===r.catalog.club))continue
  const sq=coreSquad(r.catalog.cards,r.decade),by=new Map(r.catalog.cards.map(c=>[c.id,c])),cards=sq.squad.map(id=>by.get(id)!)
  const fx=formationFor(cards,hash(`${i.id}:${r.catalog.club}`));if(!fx)continue
  teams.push({club:r.catalog.club,name:r.catalog.clubName,ai:true,decade:r.decade,formation:fx.f,tactic:'balanced',squad:sq.squad,xi:fx.xi,cards})
 }
 if(teams.length%2)teams.pop()
 if(teams.length<LEAGUE_MIN)return {ok:false,error:`A league needs ${LEAGUE_MIN} ready clubs; ${teams.length} are ready.`}
 const fixtures=doubleRoundRobin(teams.map(t=>t.club)).map(f=>({...f,result:null}))
 return {ok:true,career:{v:1,id:i.id,rules:RULES_ID,owner:i.owner,clubId:i.own.club,clubName:i.own.clubName,homeDecade:i.homeDecade,catalog:i.own,teams,fixtures,rounds:2*(teams.length-1),played:0,budget:KITTY,ledger:[],soldThisWindow:[],keys:[],revision:1,status:'active',createdAt:i.now,updatedAt:i.now}}
}

export type Action=({kind:'buy';card:string}|{kind:'sell';card:string}|{kind:'lineup';formation:string;xi:string[];tactic:string}|{kind:'auto';formation?:string}|{kind:'play'})&{key:string;rev:number}
export type ActionResult={ok:true;career:Career;replay?:boolean}|{ok:false;code:'stale'|'invalid'|'closed';error:string}

export function parseAction(raw:unknown):Action|null{
 if(!raw||typeof raw!=='object')return null
 const a=raw as Record<string,unknown>
 if(typeof a.key!=='string'||!/^[A-Za-z0-9_-]{8,64}$/.test(a.key)||!Number.isSafeInteger(a.rev))return null
 const base={key:a.key,rev:a.rev as number}
 if((a.kind==='buy'||a.kind==='sell')&&typeof a.card==='string'&&a.card.length<=200)return {...base,kind:a.kind,card:a.card}
 if(a.kind==='lineup'&&typeof a.formation==='string'&&typeof a.tactic==='string'&&Array.isArray(a.xi)&&a.xi.length<=11&&a.xi.every(x=>typeof x==='string'))return {...base,kind:'lineup',formation:a.formation,tactic:a.tactic,xi:a.xi as string[]}
 if(a.kind==='auto')return {...base,kind:'auto',...(typeof a.formation==='string'?{formation:a.formation}:{})}
 if(a.kind==='play')return {...base,kind:'play'}
 return null
}

export function applyAction(c:Career,a:Action,now:string):ActionResult{
 if(c.keys.includes(a.key))return {ok:true,career:c,replay:true}
 if(a.rev!==c.revision)return {ok:false,code:'stale',error:'This career moved on in another tab. It has been reloaded.'}
 const t=me(c),by=new Map(c.catalog.cards.map(x=>[x.id,x]))
 const done=(next:Career):ActionResult=>({ok:true,career:{...next,revision:c.revision+1,updatedAt:now,keys:[...c.keys,a.key].slice(-40)}})
 const withTeam=(patch:Partial<Team>):Team[]=>[{...t,...patch},...c.teams.slice(1)]
 const repair=(squad:string[],xi:string[]):{xi:string[];formation:FormationId}=>{
  const cards=squad.map(id=>by.get(id)!)
  if(!validXI(xi,squad,c.catalog.cards,t.formation))return {xi,formation:t.formation}
  const same=bestXI(cards,t.formation);if(same)return {xi:same,formation:t.formation}
  const other=formationFor(cards,hash(c.id));return other?{xi:other.xi,formation:other.f}:{xi:[],formation:t.formation}
 }
 if(c.status!=='active')return {ok:false,code:'closed',error:'This season is over.'}
 switch(a.kind){
  case 'buy':{
   if(!windowOpen(c))return {ok:false,code:'closed',error:'The transfer window is shut.'}
   const card=by.get(a.card)
   // the catalog IS the club: a man who is not in it cannot be signed, whatever the request says (FL-01)
   if(!card)return {ok:false,code:'invalid',error:`That man never played for ${c.clubName}.`}
   if(t.squad.includes(card.id))return {ok:false,code:'invalid',error:`${card.name} is already in your squad.`}
   if(t.squad.length>=SQUAD_MAX)return {ok:false,code:'invalid',error:`A squad holds ${SQUAD_MAX} at most. Sell first.`}
   if(c.soldThisWindow.includes(card.id))return {ok:false,code:'invalid',error:`${card.name} left in this window — he can come back in the next one.`}
   if(card.price>c.budget)return {ok:false,code:'invalid',error:`${card.name} costs €${card.price}M; you have €${c.budget}M.`}
   return done({...c,budget:half(c.budget-card.price),teams:withTeam({squad:[...t.squad,card.id]}),ledger:[...c.ledger,{key:a.key,kind:'buy',card:card.id,amount:card.price,round:c.played,at:now}]})
  }
  case 'sell':{
   if(!windowOpen(c))return {ok:false,code:'closed',error:'The transfer window is shut.'}
   const card=by.get(a.card)
   if(!card||!t.squad.includes(card.id))return {ok:false,code:'invalid',error:'He is not in your squad.'}
   if(t.squad.length<=SQUAD_MIN)return {ok:false,code:'invalid',error:`A squad needs ${SQUAD_MIN} at least. Sign first.`}
   if(card.position==='GK'&&t.squad.filter(id=>by.get(id)?.position==='GK').length<=1)return {ok:false,code:'invalid',error:'He is your only goalkeeper.'}
   const squad=t.squad.filter(id=>id!==card.id),fix=repair(squad,t.xi.includes(card.id)?[]:t.xi)
   if(!fix.xi.length)return {ok:false,code:'invalid',error:'Without him no legal eleven is left.'}
   const back=sellPrice(card.price)
   return done({...c,budget:half(c.budget+back),soldThisWindow:[...c.soldThisWindow,card.id],teams:withTeam({squad,xi:fix.xi,formation:fix.formation}),ledger:[...c.ledger,{key:a.key,kind:'sell',card:card.id,amount:back,round:c.played,at:now}]})
  }
  case 'lineup':{
   if(!isFormation(a.formation))return {ok:false,code:'invalid',error:'Unknown formation.'}
   if(!(TACTICS as readonly string[]).includes(a.tactic))return {ok:false,code:'invalid',error:'Unknown tactic.'}
   const err=validXI(a.xi,t.squad,c.catalog.cards,a.formation);if(err)return {ok:false,code:'invalid',error:err}
   return done({...c,teams:withTeam({formation:a.formation,tactic:a.tactic as Tactic,xi:[...a.xi]})})
  }
  case 'auto':{
   const f=a.formation&&isFormation(a.formation)?a.formation:t.formation,xi=bestXI(t.squad.map(id=>by.get(id)!),f)
   if(!xi)return {ok:false,code:'invalid',error:`Your squad cannot field a ${f}.`}
   return done({...c,teams:withTeam({formation:f,xi})})
  }
  case 'play':{
   const err=validXI(t.xi,t.squad,c.catalog.cards,t.formation);if(err)return {ok:false,code:'invalid',error:`Pick your eleven first: ${err}`}
   const round=c.played+1,teamBy=new Map(c.teams.map(x=>[x.club,x]))
   const side=(x:Team)=>{const cb=new Map(cardsOf(c,x).map(y=>[y.id,y]));return {xi:x.xi.map(id=>cb.get(id)!),formation:x.formation,tactic:x.tactic}}
   const fixtures=c.fixtures.map(f=>f.round!==round||f.result?f:{...f,result:simulate(side(teamBy.get(f.home)!),side(teamBy.get(f.away)!),hash(`${c.id}:${f.id}`))})
   const played=round
   return done({...c,fixtures,played,soldThisWindow:[],status:played>=c.rounds?'finished':'active'})
  }
 }
}

export const standings=(c:Career)=>table(c.teams.map(t=>({club:t.club,name:t.name})),c.fixtures)
export const nextFixture=(c:Career)=>c.fixtures.find(f=>f.round===c.played+1&&(f.home===c.clubId||f.away===c.clubId))??null
