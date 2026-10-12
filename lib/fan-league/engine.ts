import {linesOf} from '@/lib/clubs/rumble-xi/simulator'
import {slotsOf} from '@/lib/clubs/rumble-xi/formations'
import {rng} from '@/lib/clubs/rumble-rng'
import type {Rated} from '@/lib/clubs/rumble'
import type {FormationId} from '@/lib/clubs/rumble-xi/types'
import type {Pos} from '@/lib/clubs/rumble-format'
import {ENGINE_ID,type Card,type GoalEvent,type MatchEvent,type MatchResult,type Tactic} from './types'

/**
 * One match, deterministic from its seed (appendix B §5.4). The lines (attack · midfield · defence) and the goal rates are the
 * Royal Rumble XI's own (`linesOf`) — one model of a team, not two. A season needs upsets, so the goal rate is flatter than the
 * one-off XI's (SCALE 26 against 16): a stronger eleven is clearly favoured and still loses some. A modest home edge, one tactic.
 * The SCORE IS DERIVED FROM THE EVENT LOG: goals are events, each with a minute, a scorer who stood in that eleven and maybe an
 * assist from a team-mate. A summary is read from the log, never written beside it.
 */
export type Side={xi:readonly Card[];formation:FormationId;tactic:Tactic}
const HOME=1.1,AWAY=0.94,BASE=1.35,SCALE=26
const TILT:Record<Tactic,{own:number;opp:number}>={balanced:{own:1,opp:1},attacking:{own:1.16,opp:1.12},defensive:{own:0.84,opp:0.82}}
const SCORE_W:Record<Pos,number>={GK:0,DF:1,MF:3,FW:6},ASSIST_W:Record<Pos,number>={GK:0.2,DF:2,MF:4,FW:3}
const poisson=(l:number,r:()=>number)=>{const L=Math.exp(-l);let k=0,p=1;do{k++;p*=r()}while(p>L&&k<12);return k-1}
function weighted<T>(xs:readonly T[],w:(x:T)=>number,r:()=>number):T|null{const ws=xs.map(w),t=ws.reduce((a,b)=>a+b,0);if(t<=0)return null;let x=r()*t;for(let i=0;i<xs.length;i++){x-=ws[i]!;if(x<0)return xs[i]!}return xs[xs.length-1]??null}
const asRated=(c:Card):Rated=>({id:c.id,name:c.name,position:c.position,price:c.price,rating:c.rating,fromYear:c.fromYear,toYear:c.toYear})

export function rates(home:Side,away:Side){
 const A=linesOf(home.xi.map(asRated),home.formation),B=linesOf(away.xi.map(asRated),away.formation),tilt=(A.midfield-B.midfield)/60
 const rate=(x:typeof A,y:typeof A,t:number)=>BASE*Math.exp(((x.attack-0.6*y.defence-0.4*y.midfield)+20*t)/SCALE),l={a:rate(A,B,tilt),b:rate(B,A,-tilt)}
 const th=TILT[home.tactic],ta=TILT[away.tactic]
 return {home:l.a*HOME*th.own*ta.opp,away:l.b*AWAY*ta.own*th.opp,lines:[A,B] as const}
}

export function simulate(home:Side,away:Side,seed:number):MatchResult{
 if(home.xi.length!==11||away.xi.length!==11)throw new Error('An eleven a side.')
 const r=rng((seed^0x2f6b1c3d)>>>0),l=rates(home,away)
 const n:[number,number]=[Math.min(7,poisson(l.home,r)),Math.min(7,poisson(l.away,r))]
 const fam=(s:Side,i:number):Pos=>slotsOf(s.formation)[i]?.family??s.xi[i]!.position
 const goals:Omit<GoalEvent,'seq'>[]=[]
 for(const side of [0,1] as const){
  const s=side?away:home,men=s.xi.map((c,i)=>({c,f:fam(s,i)}))
  for(let g=0;g<n[side];g++){
   const minute=1+Math.floor(r()*90)
   const scorer=weighted(men,m=>SCORE_W[m.f]*(m.c.rating/70)**2,r)!
   const assist=r()<0.7?weighted(men.filter(m=>m.c.id!==scorer.c.id),m=>ASSIST_W[m.f],r):null
   goals.push({minute,kind:'goal',side,scorer:scorer.c.id,assist:assist?.c.id??null})
  }
 }
 goals.sort((a,b)=>a.minute-b.minute||a.side-b.side)
 const events:MatchEvent[]=[{seq:0,minute:0,kind:'kickoff'}]
 const half=goals.filter(g=>g.minute<=45),second=goals.filter(g=>g.minute>45)
 for(const g of half)events.push({...g,seq:events.length})
 events.push({seq:events.length,minute:45,kind:'half-time'})
 for(const g of second)events.push({...g,seq:events.length})
 events.push({seq:events.length,minute:90,kind:'full-time'})
 return {engine:ENGINE_ID,seed,goals:scoreOf(events),events}
}
/** the score, counted from the log — the only place a score comes from */
export const scoreOf=(events:readonly MatchEvent[]):[number,number]=>{const s:[number,number]=[0,0];for(const e of events)if(e.kind==='goal')s[e.side]++;return s}
