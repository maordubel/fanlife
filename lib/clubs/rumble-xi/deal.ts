import type {Pos,Rated,RumbleCard} from '../rumble'
import {strip} from '../rumble'
import {countFamily,slotsOf} from './formations'
import {offersFor} from './readiness'
import {XI_BUDGET,type FormationId,type XIBoard} from './types'

const mulberry=(seed:number)=>()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296}
const shuffle=<T,>(a:readonly T[],r:()=>number)=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[x[i],x[j]]=[x[j]!,x[i]!]}return x}

/**
 * The opponent is COMMITTED from his own pool, the seed and the rules alone — never from what the player picks. Per slot: the strongest
 * of three seeded men that still leaves the remaining slots fillable inside €35M. (Slots of different families draw on disjoint
 * sets, and a family's slots never share a man, so "cheapest remaining men" is an exact floor — no search is needed.)
 */
export function dealRivalXI(pool:readonly Rated[],f:FormationId,seed:number):Rated[]|null{
 const r=mulberry(seed^0x9e3779b9),taken=new Set<string>(),out:Rated[]=[],slots=slotsOf(f)
 let money=XI_BUDGET
 for(let i=0;i<slots.length;i++){
  const pos=slots[i]!.family,left=pool.filter(x=>x.position===pos&&!taken.has(x.id)),options=shuffle(left,r).slice(0,3)
  if(!options.length)return null
  const floor=slots.slice(i+1).reduce((t,s,j,rest)=>{const free=pool.filter(x=>x.position===s.family&&!taken.has(x.id)).map(x=>x.price).sort((a,b)=>a-b);return t+(free[rest.slice(0,j).filter(q=>q.family===s.family).length]??1)},0)
  const fits=options.filter(o=>o.price+floor<=money).sort((a,b)=>b.rating-a.rating||a.price-b.price)
  const best=fits[0]??[...left].sort((a,b)=>a.price-b.price||b.rating-a.rating)[0]!
  taken.add(best.id);out.push(best);money-=best.price
 }
 return out
}

export const cheapestBoard=(draft:readonly (readonly RumbleCard[])[])=>draft.reduce((t,cards)=>t+(cards.length?Math.min(...cards.map(c=>c.price)):Infinity),0)

/**
 * The draft: per slot, `offers` cards of that slot's family, never repeating a man, never a man the rival fields (own-club rival).
 * Returns null when a slot cannot be offered — the caller reports the club as not ready instead of showing a broken board.
 */
export function dealDraftXI(pool:readonly Rated[],f:FormationId,seed:number,rival:readonly Rated[],same:boolean):RumbleCard[][]|null{
 const r=mulberry(seed),used=new Set(same?rival.map(c=>c.id):[])
 const offers=Math.min(3,offersFor(pool,f,same))
 if(offers<1)return null
 const out:RumbleCard[][]=[]
 for(const slot of slotsOf(f)){
  const cards=shuffle(pool.filter(x=>x.position===slot.family&&!used.has(x.id)),r).slice(0,offers)
  if(cards.length<offers)return null
  cards.forEach(c=>used.add(c.id));out.push(cards.map(strip))
 }
 return out
}

/** the first seed in the shuffle chain whose board a player can finish (cheapest eleven ≤ €35M) — bounded, deterministic */
export function dealXI(homePool:readonly Rated[],awayPool:readonly Rated[],f:FormationId,seed:number,same:boolean,tries=24):{seed:number;rival:Rated[];draft:RumbleCard[][]}|null{
 let s=seed
 for(let i=0;i<tries;i++){
  const rival=dealRivalXI(awayPool,f,s)
  if(rival){const draft=dealDraftXI(homePool,f,s,rival,same);if(draft&&cheapestBoard(draft)<=XI_BUDGET)return {seed:s,rival,draft}}
  s=(((s*48271)>>>0)%2147483646)+1
 }
 return null
}
export const slotFamilies=(f:FormationId):Pos[]=>slotsOf(f).map(s=>s.family)
export {countFamily}
