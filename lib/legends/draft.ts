import {hash} from '@/lib/clubs/rumble-rng'
import {LEGENDS_RULES as R,QUOTA_POS,type QuotaPos} from './config'
import {TIER_PRICES as DRAFT_TIER_PRICES} from '@/lib/draft-core/types'
import type {Card,DraftState,Offer,Price} from './types'

/**
 * The opening draft (rulebook §1.2, §2.2). Pure and deterministic from the career's seed.
 *  · before EVERY slot the manager chooses the line — GK, DF, MF or FW — freely (owner spec, 13.10.2026: no fixed order). The engine
 *    only closes a line whose choice would make the seventeen or the money impossible, and says why. Choosing a line and changing
 *    your mind is free: the same line shows the same three until a man is signed or a spin is used
 *    Each slot is dealt on its own — three different men of that line: premium (€4–5M), mid (€2–4M), budget (€1–2M)
 *  · seventeen are required, an eighteenth is optional; quotas GK 2 · DF 6 · MF 6 · FW 3; €52M
 *  · every offer is checked by the SOLVER before it is shown: a card that would leave no way to finish seventeen and the quotas
 *    inside the money left is shown LOCKED with the reason, and a group with no pickable card cannot be chosen (§1.2.10)
 *  · three rerolls a draft: a reroll replaces the current three only, and the men it replaced do not come back in this slot
 * Because every man has ONE quota position, the cheapest completion is exact: the d cheapest of each short group, then the
 * cheapest of everyone left — no search is needed (§2.2's matching collapses to this when positions do not overlap).
 */
export const TIER_PRICES:Record<Offer['tier'],readonly Price[]>=DRAFT_TIER_PRICES as Record<Offer['tier'],readonly Price[]>
export const emptyDraft=():DraftState=>({slot:1,group:null,offers:[],shown:[],picks:[],rerollsLeft:R.rerollsPerDraft,spent:0,optionalDone:false,confirmed:false,recentDecades:[]})
const BUDGET=R.initialDraftBudgetM,REQ=R.initialDraftRequired
export const cashLeft=(d:DraftState)=>BUDGET-d.spent
export function deficits(d:DraftState):Record<QuotaPos,number>{
 const have:Record<QuotaPos,number>={GK:0,DF:0,MF:0,FW:0};for(const p of d.picks)have[p.quota]++
 return {GK:Math.max(0,R.minimums.GK-have.GK),DF:Math.max(0,R.minimums.DF-have.DF),MF:Math.max(0,R.minimums.MF-have.MF),FW:Math.max(0,R.minimums.FW-have.FW)}
}
const sumOf=(r:Record<QuotaPos,number>)=>QUOTA_POS.reduce((a,p)=>a+r[p],0)
/** can seventeen still be finished, with the quotas, inside `cash`, after taking `extra` men away from the pool? */
export function feasibleAfter(cards:readonly Card[],picked:ReadonlySet<string>,cash:number,need:Record<QuotaPos,number>,picksLeft:number):boolean{
 if(picksLeft<0||sumOf(need)>picksLeft)return false
 const rest=cards.filter(c=>!picked.has(c.id)),by:Record<QuotaPos,Card[]>={GK:[],DF:[],MF:[],FW:[]}
 for(const c of rest)by[c.pos].push(c)
 let cost=0;const used=new Set<string>()
 for(const p of QUOTA_POS){
  const g=by[p];
  // a future slot of a short group must still be able to SHOW a legal trio: one premium, one mid, one budget, all different
  if(need[p]>0&&!trioReserve(g,need[p]))return false
  const cheap=[...g].sort((a,b)=>a.price-b.price).slice(0,need[p]);if(cheap.length<need[p])return false
  for(const c of cheap){cost+=c.price;used.add(c.id)}
 }
 const free=picksLeft-sumOf(need)
 if(free>0){const cheap=rest.filter(c=>!used.has(c.id)).sort((a,b)=>a.price-b.price).slice(0,free);if(cheap.length<free)return false;for(const c of cheap)cost+=c.price}
 return cost<=cash+1e-9
}
/**
 * Will this group still be able to SHOW a legal trio for each of its `k` remaining required slots? One premium, one mid and one
 * budget man must be left, and enough men for the last slot to show three. The manager can never empty a tier early: the solver
 * locks the last man of a tier while slots of the group remain, so this reserve holds whatever he picks.
 */
export function trioReserve(group:readonly Card[],k:number):boolean{
 if(k<=0)return true
 const n=(ps:readonly number[])=>group.filter(c=>ps.includes(c.price)).length
 return n([5,4])>=1&&n([2,1])>=1&&n([4,3,2])>=1&&group.length>=k+2
}
/** three different men for a tier set, preferring the ones the solver allows, fresh decades, then a stable shuffle */
function pickTrio(pool:readonly Card[],ok:(c:Card)=>boolean,recent:readonly number[],salt:string,tight:boolean):Offer[]|null{
 const rk=new Map<string,number>(),rank=(c:Card)=>{let v=rk.get(c.id);if(v===undefined){v=(ok(c)?0:1e6)+(c.decades.some(d=>!recent.includes(d))?0:1e5)+(hash(`${salt}:${c.id}`)%1e5);rk.set(c.id,v)}return v}
 const tiers:Offer['tier'][][]=[['premium','mid','budget'],['premium','budget','mid'],['budget','premium','mid'],['mid','premium','budget']]
 for(const order of tiers){
  const taken=new Set<string>(),out:Partial<Record<Offer['tier'],Card>>={}
  for(const t of order){
   const cands=pool.filter(c=>!taken.has(c.id)&&TIER_PRICES[t].includes(c.price)).sort((a,b)=>t==='budget'&&tight?(Number(!ok(a))-Number(!ok(b)))||a.price-b.price||rank(a)-rank(b):rank(a)-rank(b))
   const c=cands[0];if(!c)break;taken.add(c.id);out[t]=c
  }
  if(out.premium&&out.mid&&out.budget)return (['premium','mid','budget'] as const).map(t=>({id:out[t]!.id,tier:t,locked:null}))
 }
 return null
}
export type GroupInfo={group:QuotaPos;open:boolean;reason:string|null;need:number}
function picksLeftAfterThis(d:DraftState){return Math.max(0,REQ-d.picks.length-1)}
/**
 * Whether a man can be picked depends only on his group and price: removing him from the pool changes the cheapest completion
 * exactly as removing any other man of the same group and price would. So the solver runs at most once per (group, price) for a
 * draft state, not once per card — a club of 1,200 men drafts as fast as a club of 200.
 */
const okMemo=new WeakMap<DraftState,Map<string,boolean>>()
function okToPick(cards:readonly Card[],d:DraftState,c:Card):boolean{
 let m=okMemo.get(d);if(!m){m=new Map();okMemo.set(d,m)}
 const k=`${c.pos}:${c.price}`,hit=m.get(k);if(hit!==undefined)return hit
 let ok:boolean
 if(d.picks.length>=REQ)ok=c.price<=cashLeft(d)+1e-9
 else{const picked=new Set([...d.picks.map(p=>p.id),c.id]),need=deficits(d);need[c.pos]=Math.max(0,need[c.pos]-1);ok=c.price<=cashLeft(d)+1e-9&&feasibleAfter(cards,picked,cashLeft(d)-c.price,need,picksLeftAfterThis(d))}
 m.set(k,ok);return ok
}
/** how many men of this line were already shown (and spun past) in this slot — a spin in another line changes nothing here */
const seenIn=(cards:readonly Card[],d:DraftState,group:QuotaPos)=>{const by=new Map(cards.map(c=>[c.id,c.pos]));return d.shown.filter(id=>by.get(id)===group).length}
export function offersFor(cards:readonly Card[],d:DraftState,group:QuotaPos,seed:number):Offer[]|null{
 const picked=new Set(d.picks.map(p=>p.id)),shown=new Set(d.shown)
 const fresh=cards.filter(c=>c.pos===group&&!picked.has(c.id)&&!shown.has(c.id))
 const ok=(c:Card)=>okToPick(cards,d,c),tight=cashLeft(d)-minCostToFinish(cards,d)<3
 const trio=pickTrio(fresh,ok,d.recentDecades,`${seed}:${d.slot}:${group}:${seenIn(cards,d,group)}`,tight);if(!trio)return null
 const by=new Map(cards.map(c=>[c.id,c]))
 return trio.map(o=>({...o,locked:ok(by.get(o.id)!)?null:lockReason(cards,d,by.get(o.id)!)}))
}
export function minCostToFinish(cards:readonly Card[],d:DraftState):number{
 const picked=new Set(d.picks.map(p=>p.id)),need=deficits(d),left=Math.max(0,REQ-d.picks.length)
 const rest=cards.filter(c=>!picked.has(c.id));let cost=0;const used=new Set<string>()
 for(const p of QUOTA_POS){for(const c of rest.filter(c=>c.pos===p).sort((a,b)=>a.price-b.price).slice(0,need[p])){cost+=c.price;used.add(c.id)}}
 for(const c of rest.filter(c=>!used.has(c.id)).sort((a,b)=>a.price-b.price).slice(0,Math.max(0,left-sumOf(need))))cost+=c.price
 return cost
}
function lockReason(cards:readonly Card[],d:DraftState,c:Card):string{
 if(c.price>cashLeft(d))return `€${c.price}M — you have €${cashLeft(d)}M left.`
 return `Sign him and your seventeen could not be finished inside €${cashLeft(d)}M with the quotas.`
}
export function groups(cards:readonly Card[],d:DraftState,seed:number):GroupInfo[]{
 const need=deficits(d),left=REQ-d.picks.length,mustFill=d.picks.length<REQ&&sumOf(need)>=left
 return QUOTA_POS.map(g=>{
  if(mustFill&&need[g]===0)return {group:g,open:false,reason:`Your ${left} remaining picks must fill the quotas first.`,need:need[g]}
  const o=offersFor(cards,d,g,seed)
  if(!o)return {group:g,open:false,reason:'Not enough men in this group to show three different cards.',need:need[g]}
  if(o.every(x=>x.locked))return {group:g,open:false,reason:'No man of this group fits the money and the quotas left.',need:need[g]}
  return {group:g,open:true,reason:null,need:need[g]}
 })
}

const draftDone=(d:DraftState)=>d.picks.length>=REQ+R.initialDraftOptional||(d.picks.length>=REQ&&d.optionalDone)
/** deal the chosen line if it is not dealt yet — deterministic, so the view and the move always see the same three */
export function deal(cards:readonly Card[],d:DraftState,seed:number):DraftState{
 if(d.confirmed||draftDone(d)||!d.group||d.offers.length)return d
 const o=offersFor(cards,d,d.group,seed);return o?{...d,offers:o}:{...d,group:null}
}
export type DraftMove={kind:'group';group:QuotaPos}|{kind:'pick';id:string}|{kind:'reroll'}|{kind:'skip'}
export type DraftResult={ok:true;draft:DraftState;picked?:Card}|{ok:false;error:string}
export function draftMove(cards:readonly Card[],d0:DraftState,m:DraftMove,seed:number):DraftResult{
 if(d0.confirmed)return {ok:false,error:'The draft is confirmed.'}
 if(draftDone(d0)&&m.kind!=='skip')return {ok:false,error:'Your squad is drafted — confirm it.'}
 const d=deal(cards,d0,seed)
 switch(m.kind){
  case 'group':{
   if(!QUOTA_POS.includes(m.group))return {ok:false,error:'That is not a line.'}
   if(d.picks.length>=REQ&&d.optionalDone)return {ok:false,error:'Your squad is drafted — confirm it.'}
   const info=groups(cards,d,seed).find(g=>g.group===m.group)!
   if(!info.open)return {ok:false,error:info.reason??'That line cannot be chosen now.'}
   if(d.group===m.group&&d.offers.length)return {ok:true,draft:d}
   const o=offersFor(cards,d,m.group,seed);if(!o)return {ok:false,error:'Not enough men in this line to show three different cards.'}
   return {ok:true,draft:{...d,group:m.group,offers:o}}
  }
  case 'reroll':{
   if(!d.group||!d.offers.length)return {ok:false,error:'No line can be dealt for this slot.'}
   if(d.rerollsLeft<=0)return {ok:false,error:'No rerolls left in this draft.'}
   const next={...d,shown:[...d.shown,...d.offers.map(o=>o.id)]},o=offersFor(cards,next,d.group,seed)
   // fewer than three new men: say so, and do not spend the reroll
   if(!o||o.every(x=>x.locked)||o.some(x=>next.shown.includes(x.id)))return {ok:false,error:'There are not three other men to show in this group — your reroll is kept.'}
   return {ok:true,draft:{...next,offers:o,rerollsLeft:d.rerollsLeft-1}}
  }
  case 'pick':{
   if(!d.group)return {ok:false,error:'Choose a line first.'}
   const o=d.offers.find(x=>x.id===m.id);if(!o)return {ok:false,error:'That man is not on the table.'}
   if(o.locked)return {ok:false,error:o.locked}
   const c=cards.find(x=>x.id===m.id)!
   if(!okToPick(cards,d,c))return {ok:false,error:lockReason(cards,d,c)}
   const recent=[...d.recentDecades,...c.decades].slice(-6)
   const next:DraftState={...d,slot:d.slot+1,group:null,offers:[],shown:[],picks:[...d.picks,{id:c.id,quota:c.pos,price:c.price,slot:d.slot}],spent:d.spent+c.price,recentDecades:recent,optionalDone:d.picks.length+1>REQ}
   return {ok:true,draft:next,picked:c}
  }
  case 'skip':{
   if(d.picks.length<REQ)return {ok:false,error:`Seventeen are required — ${REQ-d.picks.length} to go.`}
   return {ok:true,draft:{...d,group:null,offers:[],optionalDone:true}}
  }
 }
}
/** the confirm check, from scratch (§2.2: re-read everything, trust nothing the steps left behind) */
export function confirmCheck(cards:readonly Card[],d:DraftState):string|null{
 if(d.confirmed)return 'The draft is already confirmed.'
 const ids=d.picks.map(p=>p.id),by=new Map(cards.map(c=>[c.id,c]))
 if(ids.length<REQ)return `Seventeen are required — ${REQ-ids.length} to go.`
 if(ids.length>REQ+R.initialDraftOptional)return 'Eighteen at most in the draft.'
 if(new Set(ids).size!==ids.length)return 'A man is in the draft twice.'
 if(ids.some(id=>!by.has(id)))return 'A man in the draft is not of this club.'
 const spent=d.picks.reduce((a,p)=>a+by.get(p.id)!.price,0);if(spent>BUDGET)return `The draft costs €${spent}M — €${BUDGET}M at most.`
 const need=deficits(d);if(sumOf(need))return `Quotas not met: ${QUOTA_POS.filter(p=>need[p]).map(p=>`${need[p]} more ${p}`).join(', ')}.`
 return null
}

/** a bot through the whole draft — the AI clubs, the readiness check and the lab. `style` decides what it values. */
export function botDraft(cards:readonly Card[],seed:number,style:'value'|'random'|'premium'|'budget'='value'):{draft:DraftState;error:string|null}{
 let d=emptyDraft()
 for(let guard=0;guard<120&&d.picks.length<REQ;guard++){
  // the bot chooses its line like a manager: a line it still owes first (the fewest men left to pick from), else any open line
  const open=groups(cards,d,seed).filter(g=>g.open)
  if(!open.length)return {draft:d,error:`Dead end at slot ${d.slot}: no line can be dealt.`}
  const owed=open.filter(g=>g.need>0),from=owed.length?owed:open,g=from[hash(`${seed}:g:${d.slot}`)%from.length]!
  const m=draftMove(cards,d,{kind:'group',group:g.group},seed);if(!m.ok)return {draft:d,error:m.error};d=m.draft
  const ok=d.offers.filter(o=>!o.locked),by=new Map(cards.map(c=>[c.id,c]))
  const pick=style==='random'?ok[hash(`${seed}:p:${d.slot}`)%ok.length]!:style==='premium'?ok[0]!:style==='budget'?ok[ok.length-1]!:[...ok].sort((a,b)=>(by.get(b.id)!.stars-0.55*by.get(b.id)!.price)-(by.get(a.id)!.stars-0.55*by.get(a.id)!.price))[0]!
  const r=draftMove(cards,d,{kind:'pick',id:pick.id},seed);if(!r.ok)return {draft:d,error:r.error};d=r.draft
 }
 if(d.picks.length<REQ)return {draft:d,error:'The draft did not finish.'}
 return {draft:{...d,group:null,offers:[],optionalDone:true},error:confirmCheck(cards,{...d,optionalDone:true})}
}
