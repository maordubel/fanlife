import type {ClubData,ClubPlayer} from './contract'
import {norm} from '@/lib/fixtures/names'
import {englishName,isMan} from '@/lib/clubs/rumble-xi/names'
import {derivedRating,workbookRating,type RatingBasis} from './ratings'
import {withFeatured} from './rumble-economy'
import {priceFor} from './rumble-xi/prices'
import {extraPositions} from './rumble-xi/positions'
import {mergesFor} from './rumble-xi/merges'
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
/**
 * A FORMAT is the shape of a draft: which slots, what budget, how many offers per slot. `five` is the game today; `eleven` is the
 * 11-v-11 version the owner announced (10.10.2026) — a 4-3-3 with a budget at the same average price. Every function below takes a
 * format and defaults to `five`, so the engine, the readiness test and the duel are already shaped for eleven; only the stage is not.
 */
export type Format={id:'five'|'eleven';slots:readonly Pos[];budget:number;offers:number}
export const FIVE:Format={id:'five',slots:['GK','DF','MF','MF','FW'],budget:15,offers:3}
export const ELEVEN:Format={id:'eleven',slots:['GK','DF','DF','DF','DF','MF','MF','MF','FW','FW','FW'],budget:33,offers:3}
export const SLOTS:readonly Pos[]=FIVE.slots
export const BUDGET=FIVE.budget,OFFERS=FIVE.offers
/** a goal's worth of rating: ratings sit in a narrow band (about 60–95), so the gap is stretched before it becomes goals */
export const POWER_SCALE=3.5
export type RumbleCard={id:string;name:string;position:Pos;/** a man whose position no source states: only ever signed by a scout, into any outfield slot */free?:boolean;/** classic: 1–5 whole; XI: €0.5M steps from 1 to 5 */price:number;fromYear:number|null;toYear:number|null}
export type Rated=RumbleCard&{rating:number;basis?:RatingBasis}
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
/**
 * The club's men with their HIDDEN ratings and no price yet (the price is the club's frozen list, `lib/clubs/rumble-xi/prices.ts`; the build
 * script that makes the list reads this). A man whose position no source names is `free`: he may be dealt into any OUTFIELD slot, rated
 * by the workbook or by his club's ordinary midfielder moved by his own record — never guessed into a position, never left out.
 * `extra` carries positions read from a named public source for men the archive and the workbook leave unplaced.
 */
export function rawPool(data:ClubData,opts:{extra?:Readonly<Record<string,Pos>>}={}):Rated[]{
 const goals=goalsByPlayer(data),club=data.identity?.id??''
 const posOf=(p:ClubPlayer):Pos|null=>first(p)??workbookRating(club,[p.name,...p.aliases])?.pos??opts.extra?.[p.id]??null
 const all=(data.players||[]).map(f=>f.value).filter(p=>isMan(p.name)),byId=new Map(all.map(p=>[p.id,p]))
 // one man, one card: a record that is the same man as another (rumble-merges.json) is folded into the one kept — his names, years and goals travel along
 const dropped=new Set<string>(),everyone:ClubPlayer[]=[]
 for(const m of mergesFor(club)){const d=byId.get(m.drop),k=byId.get(m.keep);if(d&&k&&!dropped.has(k.id))dropped.add(d.id)}
 for(const p of all){if(dropped.has(p.id))continue
  const mine=mergesFor(club).filter(m=>m.keep===p.id).map(m=>byId.get(m.drop)).filter((x):x is ClubPlayer=>!!x)
  if(!mine.length){everyone.push(p);continue}
  const names=[p.name,...mine.map(x=>x.name)].sort((a,b)=>a.length-b.length)
  for(const d of mine)goals.set(p.id,(goals.get(p.id)||0)+(goals.get(d.id)||0))
  everyone.push({...p,name:names[0]!,aliases:[...new Set([p.name,...mine.map(x=>x.name),...p.aliases,...mine.flatMap(x=>x.aliases)])],fromYear:p.fromYear??mine.find(x=>x.fromYear!==null)?.fromYear??null,toYear:p.toYear??mine.find(x=>x.toYear!==null)?.toYear??null})}
 const span=(p:ClubPlayer)=>p.fromYear!==null&&p.toYear!==null?p.toYear-p.fromYear+1:null
 const by=new Map<Pos|'free',ClubPlayer[]>()
 for(const p of everyone){const k=posOf(p)??'free';by.set(k,[...(by.get(k)||[]),p])}
 const out:Rated[]=[]
 for(const [pos,ps] of by){
  const spans=ps.map(span),gs=ps.map(p=>goals.has(p.id)?goals.get(p.id)!:null)
  const scores=ps.map((p,i)=>pos==='GK'?pct(spans[i]!,spans):0.5*pct(spans[i]!,spans)+0.5*pct(gs[i]!,gs))
  const given=ps.map(p=>workbookRating(club,[p.name,...p.aliases]))
  const base:Pos=pos==='free'?'MF':pos
  ps.forEach((p,i)=>{
   const rating=given[i]?.score??derivedRating(club,base,scores[i]!)
   out.push({id:p.id,name:englishName(club,p.id,p.name),position:base,price:1,rating,basis:given[i]?.basis??'derived',fromYear:p.fromYear,toYear:p.toYear,...(pos==='free'?{free:true}:{})})})
 }
 return out.sort((a,b)=>a.id.localeCompare(b.id))
}
/** the pool a game deals from: every man of the club, on the club's one frozen price list (the same price in five a side and in the eleven) */
export function ratedPool(data:ClubData,opts:{extra?:Readonly<Record<string,Pos>>}={}):Rated[]{
 const club=data.identity?.id??'',extra=opts.extra??extraPositions(club)
 return rawPool(data,{extra}).map(r=>({...r,price:priceFor(club,r.id)}))
}
/** can this man fill a slot of this position? a free man (no recorded position) fits any outfield slot */
export const fits=(x:{position:Pos;free?:boolean},pos:Pos)=>x.free?pos!=='GK':x.position===pos
export const strip=(r:Rated):RumbleCard=>({id:r.id,name:r.name,position:r.position,price:r.price,fromYear:r.fromYear,toYear:r.toYear,...(r.free?{free:true}:{})})
const count=(f:Format,p:Pos)=>f.slots.filter(x=>x===p).length
/** how many of each position a club needs before the gate can deal (offers + an opponent who is not the same men): twice the slots, and a full pool at three times */
export function rumbleReadiness(pool:Rated[],format:Format=FIVE){
 const n=(p:Pos)=>pool.filter(x=>fits(x,p)).length,all=['GK','DF','MF','FW'] as Pos[]
 const need=Object.fromEntries(all.map(p=>[p,2*count(format,p)])) as Record<Pos,number>
 const short=all.filter(p=>count(format,p)>0&&n(p)<need[p])
 return {playable:short.length===0,full:all.every(p=>count(format,p)===0||n(p)>=3*count(format,p)),short:short.map(p=>`${need[p]-n(p)} more ${p}`)}
}
/**
 * The opponent is COMMITTED from the pool, the seed and the rules alone — never from what the player picks.
 * (Before 8.10.2026 the rival was built from "men the player did not take", so swapping one legal pick
 * silently changed the opponent's midfield. A fan could not trust a replay, and a link could not hand over the same match.)
 * It plays by the same budget: per slot the strongest of three seeded cards that still leaves the rest fillable.
 * The draft is then dealt from everyone the opponent did NOT field, so the two sides can never share a man.
 * `pool` is the club the rival is drawn from — your own club's pool for the classic round, another club's for a head-to-head.
 */
export function dealRival(pool:Rated[],seed:number,format:Format=FIVE):Rated[]|null{
 const r=mulberry(seed^0x9e3779b9),taken=new Set<string>(),rival:Rated[]=[],slots=format.slots
 let money=format.budget
 for(let i=0;i<slots.length;i++){
  const pos=slots[i]!,left=pool.filter(x=>fits(x,pos)&&!taken.has(x.id)),options=shuffle(left,r).slice(0,format.offers)
  if(!options.length)return null
  const floor=slots.slice(i+1).reduce((t,p,j,rest)=>{const free=pool.filter(x=>fits(x,p)&&!taken.has(x.id)).map(x=>x.price).sort((a,b)=>a-b);return t+(free[rest.slice(0,j).filter(q=>q===p).length]??1)},0)
  const affordable=options.filter(o=>o.price+floor<=money).sort((a,b)=>b.rating-a.rating||a.price-b.price)
  const best=affordable[0]??[...left].sort((a,b)=>a.price-b.price||b.rating-a.rating)[0]!
  taken.add(best.id);rival.push(best);money-=best.price
 }
 return rival
}
/** Who the player faces: the classic AI rival from his own pool, an AI rival from ANOTHER club's pool, or a human's locked side (a duel link). */
export type Opponent={kind:'self'}|{kind:'club';pool:Rated[]}|{kind:'locked';cards:Rated[];club?:string}
export const SELF:Opponent={kind:'self'}
export function rivalFor(pool:Rated[],seed:number,vs:Opponent=SELF,format:Format=FIVE):Rated[]|null{
 if(vs.kind==='locked')return vs.cards
 return dealRival(vs.kind==='club'?vs.pool:pool,seed,format)
}
/** The deal: per slot, up to `offers` cards of that position, never repeating a man across slots and never a man the opponent fields (only possible when both sides draw on one pool). Deterministic in the seed. */
export function dealDraft(pool:Rated[],seed:number,vs:Opponent=SELF,format:Format=FIVE):RumbleCard[][]{
 const r=mulberry(seed),used=new Set<string>(vs.kind==='self'?(dealRival(pool,seed,format)||[]).map(c=>c.id):vs.kind==='locked'?vs.cards.map(c=>c.id):[]),rivalIds=new Set(used)
 const board=format.slots.map(pos=>{
  const cards=shuffle(pool.filter(x=>fits(x,pos)&&!used.has(x.id)),r).slice(0,format.offers)
  cards.forEach(c=>used.add(c.id));return cards
 })
 // the rulebook: at least one €5M man in every board, and one who can really be bought inside the budget
 const free=pool.filter(x=>!board.flat().some(c=>c.id===x.id)&&!rivalIds.has(x.id))
 const featured=withFeatured(board,free,(c,i)=>fits(c,format.slots[i]!),mulberry(seed^0x5bd1e995),format.budget)
 return (featured??board).map(cards=>cards.map(strip))
}
export type RumbleResult={you:{cards:Rated[];power:number;cost:number};rival:{cards:Rated[];power:number;club?:string};verdict:'win'|'draw'|'loss';goals:[number,number]}
/** The five a player would field are checked against the board the seed deals, the budget and the slots — shared by `play` and the duel-link validator. */
export function checkFive(pool:Rated[],ids:string[],format:Format=FIVE):Rated[]|null{
 if(ids.length!==format.slots.length||new Set(ids).size!==ids.length)return null
 const chosen=ids.map(id=>pool.find(x=>x.id===id)).map((c,i)=>c&&fits(c,format.slots[i]!)?c:null)
 if(chosen.some(c=>!c))return null
 const cards=chosen as Rated[]
 return cards.reduce((s,c)=>s+c.price,0)<=format.budget?cards:null
}
/** Plays the dealt draft against the committed opponent. The score reads only hidden ratings, so it stays on the server. */
export function play(pool:Rated[],seed:number,picks:string[],vs:Opponent=SELF,format:Format=FIVE):RumbleResult|null{
 const draft=dealDraft(pool,seed,vs,format)
 if(picks.length!==format.slots.length||new Set(picks).size!==picks.length)return null
 const chosen:Rated[]=[]
 for(let i=0;i<format.slots.length;i++){const offered=draft[i]!.find(c=>c.id===picks[i]);const full=offered&&pool.find(x=>x.id===offered.id);if(!full)return null;chosen.push(full)}
 const cost=chosen.reduce((s,c)=>s+c.price,0)
 if(cost>format.budget)return null
 const rival=rivalFor(pool,seed,vs,format)
 if(!rival)return null
 return settle(chosen,rival,seed,cost,vs.kind==='locked'?vs.club:undefined)
}
/** Two fives, one match. Deterministic in the seed; a pure function of the hidden ratings, so a head-to-head can be replayed from the two fives alone. */
export function settle(youCards:Rated[],rivalCards:Rated[],seed:number,cost:number,rivalClub?:string):RumbleResult{
 const r=mulberry(seed^0x51ed270b)
 const you=youCards.reduce((s,c)=>s+c.rating,0),them=rivalCards.reduce((s,c)=>s+c.rating,0),edge=(you-them)*POWER_SCALE/Math.max(1,youCards.length/5)
 const goals:[number,number]=[Math.max(0,Math.round(2+edge/40+(r()-0.5))),Math.max(0,Math.round(2-edge/40+(r()-0.5)))]
 if(goals[0]===goals[1]&&Math.abs(edge)>=15)goals[edge>0?0:1]++
 return {you:{cards:youCards,power:you,cost},rival:{cards:rivalCards,power:them,...(rivalClub?{club:rivalClub}:{})},verdict:goals[0]>goals[1]?'win':goals[0]<goals[1]?'loss':'draw',goals}
}
