import {hash} from '@/lib/clubs/rumble-rng'
import {minCompletion} from './assign'
import {looseTrio,pickTrio} from './offers'
import {cardFits,GROUPS,type DCard,type DraftAction,type DraftRules,type DraftState,type Group,type GroupVerdict,type Offer,type StepResult} from './types'

/**
 * The slot draft. A state is the pure result of replaying an action log from `startState` — so the server never trusts a browser's
 * state, it replays the log and refuses the first action that is not legal. Everything here is deterministic in (rules, pool, seed).
 *  · before every slot the fan opens ANY group that still has a place to fill and can still be completed; no fixed order
 *  · three different men are dealt, one per price tier; the same group shows the same three until a pick or a reroll
 *  · a card is pickable only if the squad can still be finished inside the money left (minimum-cost assignment of the places left to
 *    men left, so a man who can stand in two groups is counted once) — otherwise it is shown locked, with the reason
 *  · three rerolls a draft; a reroll replaces the current three, those men do not come back in this slot, and it costs nothing when
 *    three other men cannot be shown
 */
export const emptySeen=():Record<Group,string[]>=>({GK:[],DF:[],MF:[],FW:[]})
export const startState=(rules:DraftRules):DraftState=>({picks:[],active:null,offers:[],seen:emptySeen(),rerollsLeft:rules.rerolls,rev:0})
export const spentOf=(s:DraftState)=>s.picks.reduce((t,p)=>t+p.priceM,0)
export const cashLeft=(r:DraftRules,s:DraftState)=>r.budgetM-spentOf(s)
export const remainingByGroup=(r:DraftRules,s:DraftState):Record<Group,number>=>{
 const out:Record<Group,number>={GK:0,DF:0,MF:0,FW:0};for(const sl of r.slots)out[sl.group]++;for(const p of s.picks)out[p.group]--;return out
}
export const isComplete=(r:DraftRules,s:DraftState)=>s.picks.length>=r.slots.length
/** the place the next man of a group takes: the first free place of that group, in the order the shape lists them */
export function nextSlot(r:DraftRules,s:DraftState,g:Group){const used=new Set(s.picks.map(p=>p.slotId));return r.slots.find(x=>x.group===g&&!used.has(x.id))??null}

const listOf=(rem:Record<Group,number>)=>GROUPS.flatMap(g=>Array<Group>(Math.max(0,rem[g])).fill(g))
const sigOf=(c:DCard)=>GROUPS.filter(g=>cardFits(c,g)).join('')

/** the judge of one state: can THIS man be signed into group g now? Memoised per (group, price, who he can stand for) — such men are interchangeable to the solver. */
function judge(rules:DraftRules,pool:readonly DCard[],s:DraftState){
 const picked=new Set(s.picks.map(p=>p.id)),cash=cashLeft(rules,s),rem=remainingByGroup(rules,s),left=pool.filter(c=>!picked.has(c.id)),memo=new Map<string,string|null>()
 return (c:DCard,g:Group):{kind:'locked_budget'|'locked_completion'|'locked_identity';reason:string}|null=>{
  if(picked.has(c.id)||!cardFits(c,g))return {kind:'locked_identity',reason:'That man cannot fill this place.'}
  if(rem[g]<=0)return {kind:'locked_completion',reason:`Every ${g} place is already filled.`}
  if(c.price>cash+1e-9)return {kind:'locked_budget',reason:`€${c.price}M — you have €${cash}M left.`}
  const key=`${g}:${c.price}:${sigOf(c)}`;let hit=memo.get(key)
  if(hit===undefined){
   const after={...rem,[g]:rem[g]-1} as Record<Group,number>,rest=left.filter(x=>x.id!==c.id),need=minCompletion(listOf(after),rest)
   // every group that still has places must keep enough men to SHOW three in its last place
   const shortOf=GROUPS.find(h=>after[h]>0&&rest.filter(x=>cardFits(x,h)).length<after[h]+2)
   hit=need===null||need+c.price>cash+1e-9||shortOf?`Sign him and your squad could not be finished inside €${cash}M.`:null;memo.set(key,hit)
  }
  return hit?{kind:'locked_completion',reason:hit}:null
 }
}

/** the three men for a group at this point — deterministic, so a view and a move always agree */
export function offersFor(rules:DraftRules,pool:readonly DCard[],s:DraftState,g:Group,seed:number):Offer[]|null{
 const picked=new Set(s.picks.map(p=>p.id)),seen=new Set(s.seen[g])
 const can=judge(rules,pool,s),fresh=pool.filter(c=>cardFits(c,g)&&!picked.has(c.id)&&!seen.has(c.id))
 const rem=remainingByGroup(rules,s),ok=(c:DCard)=>!can(c,g),tight=cashLeft(rules,s)-(minCompletion(listOf(rem),pool.filter(c=>!picked.has(c.id)))??0)<3
 const salt=`${rules.rulesId}:${seed}:${s.picks.length}:${g}:${s.seen[g].length}`,trio=pickTrio(fresh,ok,[],salt,tight)??looseTrio(fresh,ok,salt);if(!trio)return null
 const by=new Map(pool.map(c=>[c.id,c]))
 return trio.map(o=>({...o,locked:can(by.get(o.id)!,g)}))
}

/** every group's state: open to choose, or closed with the reason a fan reads */
export function groupVerdicts(rules:DraftRules,pool:readonly DCard[],s:DraftState,seed:number):GroupVerdict[]{
 const rem=remainingByGroup(rules,s)
 return GROUPS.map(group=>{
  const remaining=Math.max(0,rem[group])
  if(isComplete(rules,s))return {group,open:false,remaining,reason:'The squad is complete.'}
  if(remaining===0)return {group,open:false,remaining,reason:`Every ${group} place is filled.`}
  const o=offersFor(rules,pool,s,group,seed)
  if(!o)return {group,open:false,remaining,reason:'Not enough men in this group to show three different cards.'}
  if(o.every(x=>x.locked))return {group,open:false,remaining,reason:'No man of this group fits the money and the places left.'}
  return {group,open:true,remaining,reason:null}
 })
}

const bad=(error:string):StepResult=>({ok:false,error})
/** one action, judged. The returned state has `rev` + 1. */
export function step(rules:DraftRules,pool:readonly DCard[],s:DraftState,a:DraftAction,seed:number):StepResult{
 if(isComplete(rules,s))return bad('The squad is complete — lock it in.')
 switch(a.t){
  case 'open':{
   if(!GROUPS.includes(a.g))return bad('Unknown position group.')
   if(remainingByGroup(rules,s)[a.g]<=0)return bad(`Every ${a.g} place is filled.`)
   const o=offersFor(rules,pool,s,a.g,seed)
   if(!o)return bad('Not enough men in this group to show three different cards.')
   if(o.every(x=>x.locked))return bad('No man of this group fits the money and the places left.')
   return {ok:true,state:{...s,active:a.g,offers:o,rev:s.rev+1}}
  }
  case 'reroll':{
   if(!s.active||!s.offers.length)return bad('Open a group first.')
   if(s.rerollsLeft<=0)return bad('No rerolls left in this draft.')
   const seen={...s.seen,[s.active]:[...s.seen[s.active],...s.offers.map(o=>o.id)]},next={...s,seen},o=offersFor(rules,pool,next,s.active,seed)
   // fewer than three new men to show: say so, and keep the reroll
   if(!o||o.every(x=>x.locked))return bad('There are not three other men to show in this group — your reroll is kept.')
   return {ok:true,state:{...next,offers:o,rerollsLeft:s.rerollsLeft-1,rev:s.rev+1}}
  }
  case 'pick':{
   if(!s.active)return bad('Open a group first.')
   const o=s.offers.find(x=>x.id===a.id);if(!o)return bad('That man is not on the table.')
   const c=pool.find(x=>x.id===a.id);if(!c)return bad('That man is not of this club.')
   const why=judge(rules,pool,s)(c,s.active);if(why)return bad(why.reason)
   const place=nextSlot(rules,s,s.active);if(!place)return bad('No place left in this group.')
   return {ok:true,state:{...s,picks:[...s.picks,{slotId:place.id,group:s.active,id:c.id,priceM:c.price}],active:null,offers:[],seen:emptySeen(),rev:s.rev+1}}
  }
 }
}

/** replay a whole log from nothing — the server's only way to know a state */
export function replay(rules:DraftRules,pool:readonly DCard[],seed:number,log:readonly DraftAction[]):{ok:true;state:DraftState}|{ok:false;error:string;at:number}{
 let s=startState(rules)
 for(let i=0;i<log.length;i++){const r=step(rules,pool,s,log[i]!,seed);if(!r.ok)return {ok:false,error:r.error,at:i};s=r.state}
 return {ok:true,state:s}
}
/** the confirm check, from scratch: every place filled once, by a man who fits, inside the budget */
export function confirmCheck(rules:DraftRules,pool:readonly DCard[],s:DraftState):string|null{
 if(s.picks.length!==rules.slots.length)return `${rules.slots.length-s.picks.length} place(s) still empty.`
 const by=new Map(pool.map(c=>[c.id,c])),ids=s.picks.map(p=>p.id)
 if(new Set(ids).size!==ids.length)return 'A man is in the squad twice.'
 if(new Set(s.picks.map(p=>p.slotId)).size!==ids.length)return 'A place is filled twice.'
 for(const p of s.picks){const c=by.get(p.id),sl=rules.slots.find(x=>x.id===p.slotId);if(!c||!sl||sl.group!==p.group||!cardFits(c,p.group))return 'A man is in the wrong place.';if(c.price!==p.priceM)return 'A price changed.'}
 if(spentOf(s)>rules.budgetM+1e-9)return `The squad costs €${spentOf(s)}M — €${rules.budgetM}M at most.`
 return null
}

/** a bot through a whole draft — readiness and the lab. `style` is what it values. */
export function botDraft(rules:DraftRules,pool:readonly DCard[],seed:number,style:'value'|'random'|'premium'|'budget'='value'):{state:DraftState;log:DraftAction[];error:string|null}{
 let s=startState(rules);const log:DraftAction[]=[]
 for(let guard=0;guard<80&&!isComplete(rules,s);guard++){
  const open=groupVerdicts(rules,pool,s,seed).filter(g=>g.open)
  if(!open.length)return {state:s,log,error:`Dead end after ${s.picks.length} picks: no group can be opened.`}
  const g=open[hash(`${seed}:g:${guard}`)%open.length]!.group
  let r=step(rules,pool,s,{t:'open',g},seed);if(!r.ok)return {state:s,log,error:r.error}
  log.push({t:'open',g});s=r.state
  const ok=s.offers.filter(o=>!o.locked),by=new Map(pool.map(c=>[c.id,c]))
  const pick=style==='random'?ok[hash(`${seed}:p:${guard}`)%ok.length]!:style==='premium'?ok[0]!:style==='budget'?ok[ok.length-1]!:[...ok].sort((a,b)=>(by.get(b.id)!.price-by.get(a.id)!.price)||a.id.localeCompare(b.id))[0]!
  r=step(rules,pool,s,{t:'pick',id:pick.id},seed);if(!r.ok)return {state:s,log,error:r.error}
  log.push({t:'pick',id:pick.id});s=r.state
 }
 return {state:s,log,error:isComplete(rules,s)?confirmCheck(rules,pool,s):'The draft did not finish.'}
}

/** the least the places still empty can cost — what the fan reads as "keep at least €N for the rest" */
export function minToFinish(rules:DraftRules,pool:readonly DCard[],s:DraftState):number|null{
 const picked=new Set(s.picks.map(p=>p.id));return minCompletion(listOf(remainingByGroup(rules,s)),pool.filter(c=>!picked.has(c.id)))
}
