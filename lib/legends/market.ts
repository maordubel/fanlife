import {hash} from '@/lib/clubs/rumble-rng'
import {roundTenths} from './config'
import {saleQuote} from './economy'
import type {Card,Career} from './types'
import {eraWeight} from './era'

/**
 * The transfer market is five slots, not the whole archive (owner, 14.10.2026): each window shows at most FIVE men of the club's
 * history, drawn from a seed (career · season · round), the better-known names more likely. A listed man of the manager's own
 * draws a bid from another club of the league — the manager accepts or declines. Pure: no clock, no random source.
 */
export const BUY_SLOTS=5
export const windowKey=(c:Career)=>`${c.season.ordinal}:${c.season.played}`
const ln=(k:string)=>-Math.log(((hash(k)%100000)+1)/100001)

/** the men on sale this window — a weighted draw without replacement; weight = stars³ so a famous man comes up far more often, and a man whose years end before 1960 weighs about an eighth as much (lib/legends/era.ts) */
export function buySlots(c:Career,squadIds:string[],sold:string[]):Card[]{
 const own=new Set(squadIds),pool=c.catalog.cards.filter(x=>!own.has(x.id)&&!sold.includes(x.id))
 return pool.map(x=>({x,k:ln(`${c.id}:slots:${windowKey(c)}:${x.id}`)/(Math.max(1,x.stars)**3*(c.modernEra?eraWeight(x):1))}))
  .sort((a,b)=>a.k-b.k||a.x.id.localeCompare(b.x.id)).slice(0,BUY_SLOTS).map(e=>e.x)
}
export type Bid={card:string;club:string;clubName:string;fee:number;quoted:number}
/** a bid for each listed man: another club of the league, between 90% and 120% of what the sale would net */
export function bidsFor(c:Career,listed:string[],declined:string[],byId:(id:string)=>Card|undefined):Bid[]{
 const rivals=c.teams.slice(1)
 if(!rivals.length)return []
 const me=c.teams[0]!,out:Bid[]=[]
 for(const id of listed){
  const s=me.squad.find(x=>x.id===id),card=byId(id);if(!s||!card||declined.includes(id))continue
  const q=saleQuote(card.price,s.paid,s.apps,card.stars,c.settings)
  if(hash(`${c.id}:bid:${windowKey(c)}:${id}`)%100<15)continue // one listing in seven draws no bid this window
  const r=rivals[hash(`${c.id}:bidder:${windowKey(c)}:${id}`)%rivals.length]!
  const f=0.9+0.3*((hash(`${c.id}:bidfee:${windowKey(c)}:${id}`)%1000)/1000)
  out.push({card:id,club:r.club,clubName:r.name,quoted:q.net,fee:roundTenths(Math.max(0.1,q.net*f))})
 }
 return out
}
