import type {ClubData,ClubPlayer} from './contract'
import {norm} from '@/lib/fixtures/names'
/**
 * Royal Rumble for any club (gate 9). Five slots (GK · DF · MF · MF · FW), three cards each, a budget of 15.
 * STRENGTH is read only from what the club's own approved archive documents:
 *   · career span (fromYear–toYear) — longevity at the club,
 *   · goals credited to him in the club's approved matches (outfield players only).
 * Absence of data is NOT weakness: a missing span or no recorded goals ranks neutral (0.4), never 0
 * (the Worker's V3 principle). Ratings are percentile ranks inside the player's own position, spread
 * 9–99, so a goalkeeper is never measured on goals. Price (1–5) is the draft economy and follows rating.
 */
export type Pos='GK'|'DF'|'MF'|'FW'
export const SLOTS:readonly Pos[]=['GK','DF','MF','MF','FW']
export const BUDGET=15,OFFERS=3
export type RumbleCard={id:string;name:string;position:Pos;price:1|2|3|4|5;fromYear:number|null;toYear:number|null}
export type Rated=RumbleCard&{rating:number}
const mulberry=(seed:number)=>()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296}
const shuffle=<T,>(a:T[],r:()=>number)=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[x[i],x[j]]=[x[j]!,x[i]!]}return x}
const pct=(v:number|null,all:(number|null)[])=>{if(v===null)return 0.4;const known=all.filter((x):x is number=>x!==null);if(known.length<2)return 0.5;return known.filter(x=>x<v).length/(known.length-1)}
const first=(p:ClubPlayer):Pos|null=>p.positions[0]??null
/** goals per player (exact normalised name or alias; never fuzzy) from the club's approved matches */
export function goalsByPlayer(data:ClubData):Map<string,number>{
 const names=new Map<string,string>()
 for(const p of data.players||[])for(const n of [p.value.name,...p.value.aliases])names.set(norm(n),p.value.id)
 const out=new Map<string,number>()
 for(const m of data.matches||[]){const sc=(m.value as unknown as {scorers?:{name?:string}[]}).scorers
  for(const s of Array.isArray(sc)?sc:[]){const id=s.name?names.get(norm(s.name)):undefined;if(id)out.set(id,(out.get(id)||0)+1)}}
 return out
}
export function ratedPool(data:ClubData):Rated[]{
 const goals=goalsByPlayer(data),people=(data.players||[]).map(f=>f.value).filter(p=>first(p)!==null)
 const by=new Map<Pos,ClubPlayer[]>()
 for(const p of people)by.set(first(p)!,[...(by.get(first(p)!)||[]),p])
 const out:Rated[]=[]
 for(const [pos,ps] of by){
  const span=(p:ClubPlayer)=>p.fromYear!==null&&p.toYear!==null?p.toYear-p.fromYear+1:null
  const spans=ps.map(span),gs=ps.map(p=>goals.has(p.id)?goals.get(p.id)!:null)
  const scores=ps.map((p,i)=>pos==='GK'?pct(spans[i]!,spans):0.5*pct(spans[i]!,spans)+0.5*pct(gs[i]!,gs))
  const order=[...scores].sort((a,b)=>a-b)
  ps.forEach((p,i)=>{const rank=order.indexOf(scores[i]!)/Math.max(1,order.length-1),rating=Math.round(9+90*(0.7*rank+0.3*scores[i]!)),price=(rating>=80?5:rating>=62?4:rating>=45?3:rating>=28?2:1) as 1|2|3|4|5
   out.push({id:p.id,name:p.name,position:pos,price,rating,fromYear:p.fromYear,toYear:p.toYear})})
 }
 return out.sort((a,b)=>a.id.localeCompare(b.id))
}
export const strip=(r:Rated):RumbleCard=>({id:r.id,name:r.name,position:r.position,price:r.price,fromYear:r.fromYear,toYear:r.toYear})
/** how many of each position a club needs before the gate can deal (offers + an opponent who is not the same men) */
export function rumbleReadiness(pool:Rated[]){
 const n=(p:Pos)=>pool.filter(x=>x.position===p).length
 const need:Record<Pos,number>={GK:2,DF:2,MF:4,FW:2}
 const short=(Object.keys(need) as Pos[]).filter(p=>n(p)<need[p])
 return {playable:short.length===0,full:(Object.keys(need) as Pos[]).every(p=>n(p)>=(p==='MF'?6:3)),short:short.map(p=>`${need[p]-n(p)} more ${p}`)}
}
/**
 * The opponent is COMMITTED from the pool, the seed and the rules alone — never from what the player picks.
 * (Before 8.10.2026 the rival was built from "men the player did not take", so swapping one legal pick
 * silently changed the opponent's midfield. A fan could not trust a replay, and a link could not hand over the same match.)
 * It plays by the same budget: per slot the strongest of three seeded cards that still leaves the rest fillable.
 * The draft is then dealt from everyone the opponent did NOT field, so the two sides can never share a man.
 */
export function dealRival(pool:Rated[],seed:number):Rated[]|null{
 const r=mulberry(seed^0x9e3779b9),taken=new Set<string>(),rival:Rated[]=[]
 let money=BUDGET
 for(let i=0;i<SLOTS.length;i++){
  const pos=SLOTS[i]!,left=pool.filter(x=>x.position===pos&&!taken.has(x.id)),options=shuffle(left,r).slice(0,OFFERS)
  if(!options.length)return null
  const floor=SLOTS.slice(i+1).reduce((t,p,j,rest)=>{const free=pool.filter(x=>x.position===p&&!taken.has(x.id)).map(x=>x.price).sort((a,b)=>a-b);return t+(free[rest.slice(0,j).filter(q=>q===p).length]??1)},0)
  const fits=options.filter(o=>o.price+floor<=money).sort((a,b)=>b.rating-a.rating||a.price-b.price)
  const best=fits[0]??[...left].sort((a,b)=>a.price-b.price||b.rating-a.rating)[0]!
  taken.add(best.id);rival.push(best);money-=best.price
 }
 return rival
}
/** The deal: per slot, up to three cards of that position, never repeating a man across slots and never a man the opponent fields. Deterministic in the seed. */
export function dealDraft(pool:Rated[],seed:number):RumbleCard[][]{
 const r=mulberry(seed),used=new Set<string>((dealRival(pool,seed)||[]).map(c=>c.id))
 return SLOTS.map(pos=>{
  const cards=shuffle(pool.filter(x=>x.position===pos&&!used.has(x.id)),r).slice(0,OFFERS)
  cards.forEach(c=>used.add(c.id));return cards.map(strip)
 })
}
export type RumbleResult={you:{cards:Rated[];power:number;cost:number};rival:{cards:Rated[];power:number};verdict:'win'|'draw'|'loss';goals:[number,number]}
/** Plays the dealt draft against the committed opponent. The score reads only hidden ratings, so it stays on the server. */
export function play(pool:Rated[],seed:number,picks:string[]):RumbleResult|null{
 const draft=dealDraft(pool,seed)
 if(picks.length!==SLOTS.length||new Set(picks).size!==picks.length)return null
 const chosen:Rated[]=[]
 for(let i=0;i<SLOTS.length;i++){const offered=draft[i]!.find(c=>c.id===picks[i]);const full=offered&&pool.find(x=>x.id===offered.id);if(!full)return null;chosen.push(full)}
 const cost=chosen.reduce((s,c)=>s+c.price,0)
 if(cost>BUDGET)return null
 const rival=dealRival(pool,seed)
 if(!rival)return null
 const r=mulberry(seed^0x51ed270b)
 const you=chosen.reduce((s,c)=>s+c.rating,0),them=rival.reduce((s,c)=>s+c.rating,0),edge=you-them
 const goals:[number,number]=[Math.max(0,Math.round(2+edge/40+(r()-0.5))),Math.max(0,Math.round(2-edge/40+(r()-0.5)))]
 if(goals[0]===goals[1]&&Math.abs(edge)>=15)goals[edge>0?0:1]++
 return {you:{cards:chosen,power:you,cost},rival:{cards:rival,power:them},verdict:goals[0]>goals[1]?'win':goals[0]<goals[1]?'loss':'draw',goals}
}
