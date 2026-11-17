import {hash} from '@/lib/clubs/rumble-rng'
import {cardOf} from './career'
import {momentsOf} from './reel'
import {matchRatings,type Ratings,type RatingMan,type RatingPos} from './match-ratings'
import type {Career,Fixture} from './types'

/**
 * FORM (owner, 17.11.2026): every man's match ratings through the season, his average, his last five and his player-of-the-match
 * awards — counted from the stored results, exactly as the full-time screen showed them (the same moments, the same seed), so
 * the team sheet and the match never disagree. Nothing is stored: a season's form is read again from its results.
 */
export function fixtureRatings(c:Career,f:Fixture):Ratings|null{
 const res=f.result;if(!res?.sides)return null
 const teams=new Map(c.teams.map(t=>[t.club,t])),clubs=[f.home,f.away] as const
 const seed=hash(`legends-reel:${f.id}:${res.seed}`)
 const lineups=[0,1].map(side=>{
  const sd=res.sides![side]!,t=teams.get(clubs[side]!),men:RatingMan[]=sd.xi.map(m=>({id:m.id,pos:m.pos as RatingPos}))
  for(const e of res.events)if(e.kind==='sub'&&e.side===side&&e.player&&!men.some(m=>m.id===e.player)){const k=t?cardOf(c,t,e.player):undefined;men.push({id:e.player,pos:(k?.pos??'MF') as RatingPos,bench:true})}
  return men
 }) as [RatingMan[],RatingMan[]]
 const subs=res.events.filter(e=>e.kind==='sub'&&e.side!==null&&e.player&&e.other).map(e=>({minute:e.minute,side:e.side as 0|1,in:e.player!,out:e.other!}))
 return matchRatings({seed,lineups,moments:momentsOf(res.events,seed),subs,final:true})
}
export type ManForm={avg:number|null;games:number;last:number[];potm:number}
/** this season's form for every man of the manager's club */
export function seasonForm(c:Career):Map<string,ManForm>{
 const out=new Map<string,{sum:number;n:number;last:number[];potm:number}>()
 const mine=[...c.season.fixtures,...(c.season.playoff?[c.season.playoff]:[])].filter(f=>f.result&&(f.home===c.clubId||f.away===c.clubId)).sort((a,b)=>a.round-b.round)
 for(const f of mine){
  const r=fixtureRatings(c,f);if(!r)continue
  const side=f.home===c.clubId?0:1
  for(const m of r.men){if(m.side!==side||m.line.minutes<10)continue
   const o=out.get(m.id)??{sum:0,n:0,last:[],potm:0};o.sum+=m.rating;o.n++;o.last=[...o.last,m.rating].slice(-5);if(r.potm===m.id)o.potm++;out.set(m.id,o)}
 }
 return new Map([...out].map(([id,o])=>[id,{avg:o.n?Math.round(o.sum/o.n*100)/100:null,games:o.n,last:o.last,potm:o.potm}]))
}

/**
 * The league's ratings (17.11.2026, ideas from the owner's reference FM: player of the season, team of the season): every man's
 * average over the season's results, the player-of-the-match count, and the best eleven by average — 1 keeper, 4 defenders,
 * 3 midfielders, 3 forwards — among men who played enough (two-fifths of their club's matches, three at least).
 */
export type RatedLeader={id:string;name:string;club:string;clubName:string;pos:RatingPos;avg:number;games:number;potm:number;mine:boolean}
export type LeagueRatings={top:RatedLeader[];potm:RatedLeader[];team:RatedLeader[];player:RatedLeader|null}
export function leagueRatings(c:Career,names:(club:string,id:string)=>string):LeagueRatings{
 const fx=[...c.season.fixtures,...(c.season.playoff?[c.season.playoff]:[])].filter(f=>f.result),teams=new Map(c.teams.map(t=>[t.club,t.name]))
 const acc=new Map<string,{id:string;club:string;pos:RatingPos;sum:number;n:number;potm:number}>(),played=new Map<string,number>()
 for(const f of fx){
  const r=fixtureRatings(c,f);if(!r)continue
  const clubs=[f.home,f.away] as const;for(const k of clubs)played.set(k,(played.get(k)??0)+1)
  for(const m of r.men){if(m.line.minutes<10)continue
   const club=clubs[m.side]!,key=`${club}\u0000${m.id}`,o=acc.get(key)??{id:m.id,club,pos:m.pos,sum:0,n:0,potm:0}
   o.sum+=m.rating;o.n++;if(r.potm===m.id)o.potm++;acc.set(key,o)}
 }
 const all=[...acc.values()].map(o=>({id:o.id,name:names(o.club,o.id),club:o.club,clubName:teams.get(o.club)??o.club,pos:o.pos,avg:Math.round(o.sum/o.n*100)/100,games:o.n,potm:o.potm,mine:o.club===c.clubId}))
 const enough=all.filter(m=>m.games>=Math.max(3,Math.ceil((played.get(m.club)??0)*0.4))).sort((a,b)=>b.avg-a.avg||b.games-a.games||a.name.localeCompare(b.name))
 const team=(['GK','DF','MF','FW'] as const).flatMap(p=>enough.filter(m=>m.pos===p).slice(0,{GK:1,DF:4,MF:3,FW:3}[p]))
 return {top:enough.slice(0,10),potm:all.filter(m=>m.potm>0).sort((a,b)=>b.potm-a.potm||b.avg-a.avg).slice(0,10),team,player:enough[0]??null}
}
