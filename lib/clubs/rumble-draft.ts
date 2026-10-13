import {confirmCheck,groupVerdicts,minToFinish,nextSlot,replay,spentOf,cashLeft,isComplete} from '@/lib/draft-core/engine'
import {rumbleFiveRules,rumbleXiRules} from '@/lib/draft-core/rules'
import {GROUPS,type DCard,type DraftAction,type DraftRules,type DraftState,type Group,type GroupVerdict,type Tier} from '@/lib/draft-core/types'
import {slotsOf} from './rumble-xi/formations'
import {budgetFor,type FormationId} from './rumble-xi/types'
import {strip,type Rated,type RumbleCard} from './rumble'

/** Gate 9 on Draft Core. Pure (no I/O): the server action builds the context, this turns a pool and a log into what the browser may see. */
export const cardOf=(r:Rated):DCard=>({id:r.id,pos:r.position,price:r.price,...(r.alt?{alt:r.alt}:{}),...(r.free?{free:true}:{})})
export const draftRules=(mode:'five'|'xi',seed:number,formation?:FormationId):DraftRules=>mode==='five'?rumbleFiveRules():rumbleXiRules(slotsOf(formation!),budgetFor(seed),formation!)

export type DraftView={
 rev:number;budget:number;cash:number;rerollsLeft:number;active:Group|null;complete:boolean
 picks:{slotId:string;group:Group;card:RumbleCard}[]
 offers:{card:RumbleCard;tier:Tier;locked:{kind:string;reason:string}|null}[]
 groups:GroupVerdict[]
 /** the place the next man of each group takes, so the screen can say where he will stand */
 next:Record<Group,string|null>
 /** the least the empty places still cost, so a fan can see how much he may spend now */
 keep:number|null
}
export function viewOf(rules:DraftRules,rated:readonly Rated[],cards:readonly DCard[],s:DraftState,seed:number):DraftView{
 const by=new Map(rated.map(r=>[r.id,strip(r)]))
 return {
  rev:s.rev,budget:rules.budgetM,cash:cashLeft(rules,s),rerollsLeft:s.rerollsLeft,active:s.active,complete:isComplete(rules,s),
  picks:s.picks.map(p=>({slotId:p.slotId,group:p.group,card:by.get(p.id)!})),
  offers:s.offers.map(o=>({card:by.get(o.id)!,tier:o.tier,locked:o.locked})),
  groups:groupVerdicts(rules,cards,s,seed),
  next:Object.fromEntries(GROUPS.map(g=>[g,nextSlot(rules,s,g)?.id??null])) as Record<Group,string|null>,
  keep:isComplete(rules,s)?0:minToFinish(rules,cards,s),
 }
}
/** a log arriving from a browser: only the three actions, bounded */
export function cleanLog(raw:unknown):DraftAction[]|null{
 if(!Array.isArray(raw)||raw.length>90)return null
 const out:DraftAction[]=[]
 for(const a of raw){
  if(!a||typeof a!=='object')return null
  const t=(a as {t?:unknown}).t
  if(t==='reroll')out.push({t:'reroll'})
  else if(t==='open'){const g=(a as {g?:unknown}).g;if(!GROUPS.includes(g as Group))return null;out.push({t:'open',g:g as Group})}
  else if(t==='pick'){const id=(a as {id?:unknown}).id;if(typeof id!=='string'||id.length>200)return null;out.push({t:'pick',id})}
  else return null
 }
 return out
}
/** replay a log; the confirmed squad in PLACE order, or the first refusal */
export function replayLog(rules:DraftRules,cards:readonly DCard[],seed:number,log:readonly DraftAction[]){
 return replay(rules,cards,seed,log)
}
export function confirmedFive(rules:DraftRules,cards:readonly DCard[],s:DraftState,rated:readonly Rated[]):Rated[]|null{
 if(confirmCheck(rules,cards,s))return null
 const by=new Map(rated.map(r=>[r.id,r])),out:Rated[]=[]
 for(const sl of rules.slots){const p=s.picks.find(x=>x.slotId===sl.id),r=p?by.get(p.id):undefined;if(!r)return null;out.push(r)}
 return out
}
export {spentOf}
