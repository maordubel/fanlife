import {hash} from '@/lib/clubs/rumble-rng'
import {roundTenths} from './config'
import {finalProceeds,saleQuote} from './economy'
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

const poolOf=(c:Career,squadIds:string[],sold:string[])=>{const own=new Set(squadIds);return c.catalog.cards.filter(x=>!own.has(x.id)&&!sold.includes(x.id))}
/** a weighted draw without replacement; weight = stars³ so a famous man comes up far more often, and a man whose years end before 1960 weighs about an eighth as much (lib/legends/era.ts) */
const drawFrom=(c:Career,pool:readonly Card[],salt:string)=>pool.map(x=>({x,k:ln(`${c.id}:${salt}:${x.id}`)/(Math.max(1,x.stars)**3*(c.modernEra?eraWeight(x):1))}))
 .sort((a,b)=>a.k-b.k||a.x.id.localeCompare(b.x.id)).map(e=>e.x)
/** the draw for a window — what `openMarket` fixes once; also the fallback for a window opened before the snapshot existed */
export const buySlots=(c:Career,squadIds:string[],sold:string[]):Card[]=>drawFrom(c,poolOf(c,squadIds,sold),`slots:${windowKey(c)}`).slice(0,BUY_SLOTS)

/**
 * F08 (15.10.2026): FIVE CANDIDATES PER WINDOW, FIXED. The list is drawn once when the window opens and kept in the career
 * (`Career.market`); a signing marks his place as taken and nothing refills it — a window can never show more than five men.
 * When the draw offers nobody the manager can afford, the last place goes to an affordable man (if the club's history has one),
 * so the first screen is never a wall of "too dear". Fewer than five legal men → fewer shown, never repeated.
 */
export type MarketSnap={w:string;ids:string[];/** market contacts used in this window (F07) */scouted:number}
export function openMarket(c:Career,squadIds:string[],sold:string[],cash:number):MarketSnap{
 let five=buySlots(c,squadIds,sold)
 if(five.length&&!five.some(x=>x.price<=cash+1e-9)){
  const alt=drawFrom(c,poolOf(c,squadIds,sold).filter(x=>x.price<=cash+1e-9&&!five.some(f=>f.id===x.id)),`afford:${windowKey(c)}`)[0]
  if(alt)five=[...five.slice(0,BUY_SLOTS-1),alt]
 }
 return {w:windowKey(c),ids:five.map(x=>x.id),scouted:0}
}
export type ScoutResult={ok:true;snap:MarketSnap;added:Card;removed:Card}|{ok:false;error:string}
/** market contacts (reputation 80): once a window, ask for a man of one line — he takes the place of an unsigned candidate, never a sixth place */
export function scoutSwap(c:Career,snap:MarketSnap,pos:Card['pos'],squadIds:string[],sold:string[]):ScoutResult{
 if(snap.scouted>0)return {ok:false,error:'Your contacts have already been asked in this window.'}
 const by=new Map(c.catalog.cards.map(x=>[x.id,x])),own=new Set(squadIds)
 const open=snap.ids.map(id=>by.get(id)!).filter(x=>x&&!own.has(x.id)&&!sold.includes(x.id))
 if(!open.length)return {ok:false,error:'Every place on the list is already signed.'}
 const fresh=poolOf(c,squadIds,sold).filter(x=>x.pos===pos&&!snap.ids.includes(x.id))
 const added=drawFrom(c,fresh,`scout:${snap.w}:${pos}`)[0]
 if(!added)return {ok:false,error:`Your contacts know no other ${pos} of ${c.clubName} for this window — you can ask again.`}
 const removed=[...open].sort((a,b)=>Number(a.pos===pos)-Number(b.pos===pos)||a.stars-b.stars||a.id.localeCompare(b.id))[0]!
 return {ok:true,added,removed,snap:{...snap,ids:snap.ids.map(id=>id===removed.id?added.id:id),scouted:snap.scouted+1}}
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
  out.push({card:id,club:r.club,clubName:r.name,quoted:q.net,fee:finalProceeds(Math.max(0.1,q.net*f),s.paid,s.apps)})
 }
 return out
}
