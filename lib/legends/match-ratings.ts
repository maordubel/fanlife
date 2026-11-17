import {hash} from '@/lib/clubs/rumble-rng'
import type {Moment} from '@/lib/highlights/types'

/**
 * MATCH RATINGS and the PLAYER OF THE MATCH (owner, 17.11.2026: "a match rating for every player that moves with how he plays,
 * and a man of the match every game"). The Championship Manager / Football Manager scale: 6.0 is a quiet afternoon, 7 a good one,
 * 8 a fine one, 9+ a night people remember, under 5.5 a man who should hear about it.
 *
 * Pure and client-safe. It reads ONLY what the viewer can see — the moments of the reel and who was on the pitch — so in a live
 * match the number moves with the picture (`upTo` = the last minute shown) and never knows a goal before the screen does.
 * A saved shot credits the keeper who was on the pitch for the other side; a goal debits that keeper and his defenders while
 * they were on; the result lifts or sinks everyone who played. A small steady "day" (seeded by the match and the man) keeps two
 * quiet midfielders from showing the same 6.4.
 */
export type RatingPos='GK'|'DF'|'MF'|'FW'
export type RatingMan={id:string;pos:RatingPos;bench?:boolean}
export type RatingSub={minute:number;side:0|1;in:string;out:string}
export type RatingInput={seed:number;lineups:[RatingMan[],RatingMan[]];moments:readonly Moment[];subs?:readonly RatingSub[];/** the last minute to count (live: the picture's minute); omitted = the whole match */upTo?:number;/** the match is over — the result counts */final?:boolean}
export type ManLine={goals:number;assists:number;shots:number;onTarget:number;saves:number;conceded:number;yellow:boolean;red:boolean;minutes:number}
export type ManRating={id:string;side:0|1;pos:RatingPos;rating:number;line:ManLine}
export type Ratings={men:ManRating[];/** the player of the match (at full time) — or the best so far, live; null before anyone has played twenty minutes */potm:string|null}

const GOAL:Record<RatingPos,number>={GK:1.4,DF:1.25,MF:1.05,FW:0.95}
const CONCEDE:Record<RatingPos,number>={GK:0.38,DF:0.22,MF:0.08,FW:0.03}
const CLEAN:Record<RatingPos,number>={GK:0.75,DF:0.5,MF:0.15,FW:0}
const TEAM_GOAL=0.1
/** where an ordinary 90 minutes lands — FM's league average sits near 6.8 */
const BASE=6.3
export const ratingClamp=(x:number)=>Math.round(Math.min(10,Math.max(3,x))*10)/10

export function matchRatings(inp:RatingInput):Ratings{
 const upTo=inp.upTo??999,end=Math.min(90,upTo),seen=inp.moments.filter(m=>m.minute<=upTo)
 // who was on, and when: a starter from 0, a man who came on from his minute; off at a change or a red card
 const span=new Map<string,{side:0|1;pos:RatingPos;from:number;to:number}>()
 inp.lineups.forEach((l,side)=>{for(const m of l)if(!m.bench)span.set(m.id,{side:side as 0|1,pos:m.pos,from:0,to:end})})
 for(const s of inp.subs??[]){if(s.minute>upTo)continue
  const out=span.get(s.out);if(out)out.to=Math.min(out.to,s.minute)
  const man=inp.lineups[s.side].find(x=>x.id===s.in);if(man&&!span.has(man.id))span.set(man.id,{side:s.side,pos:man.pos,from:s.minute,to:end})}
 for(const m of seen)if(m.kind==='red'&&m.player){const sp=span.get(m.player);if(sp)sp.to=Math.min(sp.to,m.minute)}
 const on=(id:string,minute:number)=>{const s=span.get(id);return !!s&&minute>=s.from&&minute<=s.to}
 const blank=():ManLine=>({goals:0,assists:0,shots:0,onTarget:0,saves:0,conceded:0,yellow:false,red:false,minutes:0})
 const lines=new Map([...span.keys()].map(id=>[id,blank()]))
 const delta=new Map([...span.keys()].map(id=>[id,0]))
 const add=(id:string|undefined,v:number)=>{if(id&&delta.has(id))delta.set(id,delta.get(id)!+v)}
 const line=(id:string|undefined)=>id?lines.get(id):undefined
 const keeperOf=(side:0|1,minute:number)=>[...span.entries()].find(([id,s])=>s.side===side&&s.pos==='GK'&&on(id,minute))?.[0]
 for(const m of seen){
  const p=line(m.player),other=(m.side?0:1) as 0|1
  if(m.kind==='goal'){
   const pen=m.shape==='penalty',sp=m.player?span.get(m.player):undefined
   if(p){p.goals++;p.shots++;p.onTarget++;add(m.player,pen?0.65:GOAL[sp?.pos??'FW'])}
   if(m.assist){const a=line(m.assist);if(a){a.assists++;add(m.assist,0.55)}}
   for(const [id,s] of span){if(!on(id,m.minute))continue
    if(s.side===m.side)add(id,TEAM_GOAL)
    else{add(id,-CONCEDE[s.pos]);if(s.pos==='GK'||s.pos==='DF')lines.get(id)!.conceded++}}
  }else if(m.kind==='save'){
   if(p){p.shots++;p.onTarget++;add(m.player,0.12)}
   const gk=m.keeper??keeperOf(other,m.minute);if(gk&&lines.has(gk)){lines.get(gk)!.saves++;add(gk,m.shape==='penalty'?0.95:0.3)}
  }else if(m.kind==='post'){if(p){p.shots++;add(m.player,0.08)}}
  else if(m.kind==='miss'){if(p){p.shots++;add(m.player,m.shape==='penalty'?-0.7:-0.06)}}
  else if(m.kind==='block'){
   if(p)p.shots++
   const df=[...span.entries()].filter(([id,s])=>s.side===other&&s.pos==='DF'&&on(id,m.minute)).map(([id])=>id)
   const who=m.by&&lines.has(m.by)?m.by:df.length?df[hash(`${inp.seed}:block:${m.minute}`)%df.length]:undefined
   add(who,0.18)
  }else if(m.kind==='yellow'){if(p){p.yellow=true;add(m.player,-0.3)}}
  else if(m.kind==='red'){if(p){p.red=true;add(m.player,-1.6)}}
 }
 // the scoreline as it stands, and the man's part in it
 const score:[number,number]=[0,0];for(const m of seen)if(m.kind==='goal')score[m.side]++
 const men:ManRating[]=[]
 for(const [id,s] of span){
  const l=lines.get(id)!,mins=Math.max(0,s.to-s.from);l.minutes=mins
  const k=Math.min(1,mins/60),day=(((hash(`${inp.seed}:day:${id}`)%61)-30)/100)*Math.min(1,mins/45)
  let r=BASE+delta.get(id)!+day
  // clean sheet: a keeper or a defender who held it for an hour
  if(mins>=60&&l.conceded===0)r+=CLEAN[s.pos]*Math.min(1,end/90)
  if(inp.final&&upTo>=90){const mine=score[s.side],theirs=score[s.side?0:1];r+=(mine>theirs?0.3:mine<theirs?-0.25:0.05)*k}
  // the top of the scale is earned (17.11.2026: a defender's two goals in a 5–0 read 10.0): above 8.3 every point counts half
  if(r>8.3)r=8.3+(r-8.3)*0.5
  if(l.goals>=3)r=Math.max(r,9);else if(l.goals===2)r=Math.max(r,8.1)
  men.push({id,side:s.side,pos:s.pos,rating:ratingClamp(r),line:l})
 }
 men.sort((a,b)=>b.rating-a.rating||b.line.goals-a.line.goals||b.line.assists-a.line.assists||a.id.localeCompare(b.id))
 const winner=score[0]===score[1]?null:score[0]>score[1]?0:1
 const eligible=men.filter(m=>m.line.minutes>=20)
 // the award leans to the side that won: a 7.6 in a 0–3 defeat is a brave night, the 7.5 who won it is the man of the match
 const best=[...eligible].sort((a,b)=>(b.rating+(b.side===winner?0.3:0))-(a.rating+(a.side===winner?0.3:0))||a.id.localeCompare(b.id))[0]
 return {men,potm:best?.id??null}
}
/** the colour band a rating sits in — the same five steps on every screen */
export const ratingBand=(r:number):'poor'|'low'|'ok'|'good'|'great'=>r>=8?'great':r>=7?'good':r>=6.3?'ok':r>=5.6?'low':'poor'
/** the one line under a name: "2 goals · 1 assist", "5 saves · clean sheet" */
export function ratingLine(m:ManRating,final=true):string{
 const l=m.line,out:string[]=[]
 if(l.goals)out.push(l.goals===1?'goal':l.goals===2?'2 goals':`${l.goals} goals · hat-trick`)
 if(l.assists)out.push(l.assists===1?'assist':`${l.assists} assists`)
 if(l.saves)out.push(l.saves===1?'1 save':`${l.saves} saves`)
 if(final&&(m.pos==='GK'||m.pos==='DF')&&l.conceded===0&&l.minutes>=60)out.push('clean sheet')
 if(!l.goals&&l.shots)out.push(l.shots===1?'1 shot':`${l.shots} shots`)
 if(l.red)out.push('sent off');else if(l.yellow)out.push('booked')
 return out.join(' · ')
}

/** the ratings of a highlights reel — what the live screen and full time read */
export function reelRatings(reel:{seed:number;teams:readonly [{lineup:readonly {id:string;pos:RatingPos;bench?:true}[]},{lineup:readonly {id:string;pos:RatingPos;bench?:true}[]}];moments:readonly Moment[];subs?:readonly RatingSub[]},opts:{upTo?:number;final?:boolean}={}):Ratings{
 return matchRatings({seed:reel.seed,lineups:[reel.teams[0].lineup.map(m=>({id:m.id,pos:m.pos,...(m.bench?{bench:true}:{})})),reel.teams[1].lineup.map(m=>({id:m.id,pos:m.pos,...(m.bench?{bench:true}:{})}))],moments:reel.moments,subs:reel.subs,...opts})
}
