import 'server-only'
import {requestClub} from '@/lib/clubs/request'
import {FIVE,ratedPool,rivalFor,settle,dealRival,type Opponent,type Rated} from '@/lib/clubs/rumble'
import {opponentFor} from '@/lib/clubs/rumble-opponent'
import {stageMatch} from '@/lib/clubs/rumble-show'
import {loadSides} from '@/lib/clubs/rumble-xi/server'
import {canRival,xiReadiness} from '@/lib/clubs/rumble-xi/readiness'
import {rivalXI} from '@/lib/clubs/rumble-xi/deal'
import {settleXI} from '@/lib/clubs/rumble-xi/simulator'
import {stageXI} from '@/lib/clubs/rumble-xi/presentation'
import {isFormation} from '@/lib/clubs/rumble-xi/formations'
import {budgetFor,type FormationId} from '@/lib/clubs/rumble-xi/types'
import {botDraft} from '@/lib/draft-core/engine'
import type {DCard,DraftRules} from '@/lib/draft-core/types'
import {cardOf,cleanLog,confirmedFive,draftRules,replayLog,viewOf} from './rumble-draft'

export type DraftArgs={slug:string;version:string;mode:'five'|'xi';seed:number;formation?:string;rival?:string;vs?:string;duel?:string;log:unknown}
type Ctx={rules:DraftRules;rated:Rated[];cards:DCard[];finish:(five:Rated[])=>{verdict:'win'|'draw'|'loss';goals:[number,number];script:unknown;rivalClub:string}}

const okStr=(v:unknown,n=100)=>typeof v==='string'&&v.length<=n
/** everything a draft step needs, rebuilt from the page's own parameters — the browser never names a price, a rating or a rival */
export async function draftContext(a:DraftArgs):Promise<Ctx|null>{
 if(!okStr(a.slug)||!okStr(a.version)||!Number.isSafeInteger(a.seed)||(a.mode!=='five'&&a.mode!=='xi'))return null
 if(a.mode==='five'){
  if((a.vs!==undefined&&!okStr(a.vs))||(a.duel!==undefined&&!okStr(a.duel,2000)))return null
  const r=await requestClub(a.slug,9);if(!r||r.data.version!==a.version||!r.data.gates['royal-rumble']?.playable)return null
  const pool=ratedPool(r.data),opp:Opponent|null=await opponentFor(a.slug,pool,a.vs,a.duel);if(!opp)return null
  // the two sides never share a man: his five, committed from the seed alone, is not for sale
  const banned=new Set(opp.kind==='self'?(dealRival(pool,a.seed)??[]).map(c=>c.id):opp.kind==='locked'?opp.cards.map(c=>c.id):[])
  const rated=pool.filter(x=>!banned.has(x.id))
  const rival=rivalFor(pool,a.seed,opp,FIVE);if(!rival)return null
  return {rules:draftRules('five',a.seed),rated,cards:rated.map(cardOf),finish:five=>{
   const res=settle(five,rival,a.seed,five.reduce((t,c)=>t+c.price,0),opp.kind==='locked'?opp.club:undefined)
   return {verdict:res.verdict,goals:res.goals,script:stageMatch(res,a.seed),rivalClub:opp.kind==='locked'?opp.club??a.slug:opp.kind==='club'?a.vs!:a.slug}}}
 }
 const f=a.formation;if(!isFormation(f)||!okStr(a.rival))return null
 const sides=await loadSides(a.slug,a.rival!);if(!sides||sides.homeVersion!==a.version||!xiReadiness(sides.home,f).ready||!canRival(sides.away,f))return null
 const rival=rivalXI(sides.away,f,a.seed,a.slug);if(!rival)return null
 const banned=new Set(sides.same?rival.map(c=>c.id):[]),rated=sides.home.filter(x=>!banned.has(x.id)),club=sides.same?a.slug:a.rival!
 return {rules:draftRules('xi',a.seed,f as FormationId),rated,cards:rated.map(cardOf),finish:five=>{
  const res=settleXI(five,rival,f as FormationId,a.seed,club)
  return {verdict:res.verdict,goals:res.goals,script:stageXI(res,a.seed,f as FormationId),rivalClub:club}}}
}
/** one step of the draft: replay the browser's log, refuse the first illegal action, answer what the fan may see */
export async function draftStep(a:DraftArgs){
 const log=cleanLog(a.log);if(!log)return {ok:false as const,error:'Bad request.'}
 const ctx=await draftContext(a);if(!ctx)return {ok:false as const,error:'This round is not available.'}
 const r=replayLog(ctx.rules,ctx.cards,a.seed,log)
 if(!r.ok)return {ok:false as const,error:r.error,at:r.at}
 return {ok:true as const,view:viewOf(ctx.rules,ctx.rated,ctx.cards,r.state,a.seed)}
}
/** lock the squad in: the whole log is replayed and confirmed from scratch, then the match is decided and staged here */
export async function draftPlay(a:DraftArgs){
 const log=cleanLog(a.log);if(!log)return null
 const ctx=await draftContext(a);if(!ctx)return null
 const r=replayLog(ctx.rules,ctx.cards,a.seed,log);if(!r.ok)return null
 const five=confirmedFive(ctx.rules,ctx.cards,r.state,ctx.rated);if(!five)return null
 return ctx.finish(five)
}
/** can this club HOST this mode's draft? Bots of three temperaments must finish it — per shape and per budget for the eleven. */
export function draftReady(rules:DraftRules,rated:readonly Rated[],seed=1):{ready:boolean;reason:string|null}{
 const cards=rated.map(cardOf)
 for(const [i,style] of (['premium','budget','random'] as const).entries()){const b=botDraft(rules,cards,seed+i*977,style);if(b.error)return {ready:false,reason:b.error}}
 return {ready:true,reason:null}
}
export {budgetFor}
