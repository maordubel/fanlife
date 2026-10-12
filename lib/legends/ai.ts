import {hash} from '@/lib/clubs/rumble-rng'
import {slotsOf} from '@/lib/clubs/rumble-xi/formations'
import {LEGENDS_RULES as R,QUOTA_POS,roundTenths,type LegendsSettings,type QuotaPos} from './config'
import {available} from './discipline'
import {saleQuote} from './economy'
import {bestLineup,fieldable,quotaCount} from './squad'
import type {Card,Emergency,LedgerEntry,Team} from './types'

/**
 * The computer managers (rulebook §1.6.35–36, §2.8) and the emergency man (§2.7). Pure.
 *  · an AI club looks for its WEAKEST line against its own formation and buys the best man of its OWN club it can afford there
 *  · two purchases a window at most; a sale to make room or money is allowed and never earns an extra purchase
 *  · it obeys the same squad size, quotas and money as the manager
 */
export type AiMove={kind:'buy'|'sell';card:Card;amount:number}
export function aiWindow(t:Team,catalog:readonly Card[],settings:LegendsSettings,seed:number):{team:Team;moves:AiMove[]}{
 let team={...t,squad:[...t.squad],cards:{...t.cards}},buys=0
 const moves:AiMove[]=[],own=()=>new Set(team.squad.map(s=>s.id)),card=(id:string)=>team.cards[id]
 const formation=team.lineup.formation,need=(p:QuotaPos)=>slotsOf(formation).filter(s=>s.family===p).length
 for(let guard=0;guard<6&&buys<R.maxAIPurchasesPerWindow;guard++){
  const lines=QUOTA_POS.map(p=>{const men=team.squad.filter(s=>s.quota===p).map(s=>card(s.id)!).filter(Boolean).sort((a,b)=>b.stars-a.stars),top=men.slice(0,Math.max(1,need(p)));return {p,avg:top.reduce((a,c)=>a+c.stars,0)/Math.max(1,top.length),worst:top[top.length-1]?.stars??0}})
  const weak=[...lines].sort((a,b)=>a.avg-b.avg||hash(`${seed}:${a.p}`)-hash(`${seed}:${b.p}`))[0]!
  const mine=own(),cand=catalog.filter(c=>c.pos===weak.p&&!mine.has(c.id)&&c.stars>weak.worst).sort((a,b)=>b.stars-a.stars||a.price-b.price||a.id.localeCompare(b.id))
  let target=cand.find(c=>c.price<=team.cash)
  if(!target&&cand.length){
   // make room or money: sell the weakest man of a line above its quota (a sale is not a purchase)
   const n=quotaCount(team.squad),spare=team.squad.filter(s=>n[s.quota]>R.minimums[s.quota]&&s.quota!==weak.p).map(s=>({s,c:card(s.id)!})).sort((a,b)=>a.c.stars-b.c.stars)[0]
   if(spare&&team.squad.length>R.minSquad){const q=saleQuote(spare.c.price,spare.s.paid,spare.s.apps,spare.c.stars,settings);team={...team,cash:roundTenths(team.cash+q.net),squad:team.squad.filter(x=>x.id!==spare.s.id)};moves.push({kind:'sell',card:spare.c,amount:q.net});target=cand.find(c=>c.price<=team.cash)}
  }
  if(!target)break
  if(team.squad.length>=R.maxSquad){
   const n=quotaCount(team.squad),spare=team.squad.filter(s=>n[s.quota]>R.minimums[s.quota]||s.quota===target!.pos).map(s=>({s,c:card(s.id)!})).sort((a,b)=>a.c.stars-b.c.stars)[0]
   if(!spare||spare.c.stars>=target.stars)break
   const q=saleQuote(spare.c.price,spare.s.paid,spare.s.apps,spare.c.stars,settings)
   team={...team,cash:roundTenths(team.cash+q.net),squad:team.squad.filter(x=>x.id!==spare.s.id)};moves.push({kind:'sell',card:spare.c,amount:q.net})
  }
  team={...team,cash:roundTenths(team.cash-target.price),squad:[...team.squad,{id:target.id,quota:target.pos,paid:target.price,apps:0,appsTotal:0,goals:0,joined:0}],cards:{...team.cards,[target.id]:target}}
  moves.push({kind:'buy',card:target,amount:target.price});buys++
 }
 const lu=bestLineup(fieldable(team,id=>team.cards[id]),team.lineup.formation,team.lineup.tactics);if(lu)team.lineup=lu
 return {team,moves}
}

/**
 * Before a match: when fewer than eleven fit men are left, the club's archive lends a man for the missing slot (round 9) —
 * automatically, never a squad member, never sold, up to three matches, then he goes and the need is looked at again.
 * With eleven fit men there is no emergency, even if they are all forwards.
 */
export function prepareEmergency(t:Team,catalog:readonly Card[],card:(id:string)=>Card|undefined,fixtureRound:number,seed:number,cost:number,season:number,now:string,keyBase:string):{team:Team;ledger:LedgerEntry[];note:string|null}{
 let emergency:Emergency[]=t.emergency.filter(e=>e.games<R.emergencyMaxMatches)
 const ledger:LedgerEntry[]=[],fit=t.squad.filter(s=>available(t.status[s.id])).map(s=>card(s.id)).filter((c):c is Card=>!!c)
 if(fit.length>=11)return {team:{...t,emergency:[]},ledger,note:t.emergency.length?'Your emergency man has gone back — eleven are fit again.':null}
 emergency=emergency.slice(0,11-fit.length)
 const own=new Set([...t.squad.map(s=>s.id),...emergency.map(e=>e.id),...t.usedEmergency])
 const have=[...fit,...emergency.map(e=>e.card)],gkMissing=!have.some(c=>c.pos==='GK')
 let cash=t.cash
 while(fit.length+emergency.length<11){
  const want:QuotaPos=gkMissing&&!emergency.some(e=>e.card.pos==='GK')?'GK':(['DF','MF','FW'] as QuotaPos[]).sort((a,b)=>have.filter(c=>c.pos===a).length-have.filter(c=>c.pos===b).length)[0]!
  const pool=catalog.filter(c=>c.pos===want&&!own.has(c.id)).sort((a,b)=>hash(`${seed}:${fixtureRound}:${a.id}`)-hash(`${seed}:${fixtureRound}:${b.id}`))
  const man=pool[0]??catalog.filter(c=>!own.has(c.id)&&c.pos!=='GK')[0];if(!man)break
  own.add(man.id);have.push(man);emergency.push({id:man.id,card:man,games:0,since:fixtureRound})
  if(cost>0){cash=roundTenths(cash-cost);ledger.push({key:`${keyBase}:emergency:${man.id}`,season,kind:'emergency',amount:-cost,card:man.id,at:now})}
 }
 return {team:{...t,emergency,cash,usedEmergency:[...new Set([...t.usedEmergency,...emergency.map(e=>e.id)])]},ledger,note:`Short of eleven fit men — the archive lends ${emergency.map(e=>e.card.name).join(', ')} (up to ${R.emergencyMaxMatches} matches).`}
}
