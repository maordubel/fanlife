import {hash} from '@/lib/clubs/rumble-rng'
import {LEGENDS_RULES as R,QUOTA_POS,type QuotaPos} from './config'
import type {Eligibility} from './catalog'
import {botDraft} from './draft'
import type {Card} from './types'

/**
 * Can a club open a Legends career (rulebook §1.1.3, D01–D03)? Not "are there seventeen names": a FULL LEGAL DRAFT must be
 * possible inside the budget and the price tiers. So the check runs the real draft machine — the same solver, the same offers —
 * with bots of four temperaments (value, random, always-premium, always-budget) over many seeds; one dead end blocks the club
 * and says where.
 */
export type ClubReadiness={club:string;name:string;verdict:'READY'|'NOT_READY';men:number;byPos:Record<QuotaPos,number>;tiers:Record<QuotaPos,{premium:number;mid:number;budget:number}>;excluded:Eligibility['excluded'];drafts:number;deadEnds:number;reasons:string[]}
export function readiness(club:string,name:string,e:Eligibility,runs=24):ClubReadiness{
 const cards=e.cards,byPos={GK:0,DF:0,MF:0,FW:0} as Record<QuotaPos,number>,tiers={} as ClubReadiness['tiers']
 for(const p of QUOTA_POS){const g=cards.filter(c=>c.pos===p);byPos[p]=g.length;tiers[p]={premium:g.filter(c=>c.price>=4).length,mid:g.filter(c=>c.price>=2&&c.price<=4).length,budget:g.filter(c=>c.price<=2).length}}
 const reasons:string[]=[]
 for(const p of QUOTA_POS){
  if(byPos[p]<R.minimums[p]+2)reasons.push(`Only ${byPos[p]} priced ${p} with a recorded position — the draft needs ${R.minimums[p]} and three cards to choose from.`)
  if(!tiers[p].premium)reasons.push(`No premium (€4–5M) ${p} on the price list.`)
  if(!tiers[p].budget)reasons.push(`No budget (€1–2M) ${p} on the price list.`)
 }
 let deadEnds=0,drafts=0
 if(!reasons.length){
  const styles=['value','random','premium','budget'] as const
  for(let i=0;i<runs;i++){const r=botDraft(cards,hash(`${club}:ready:${i}`),styles[i%4]);drafts++;if(r.error){deadEnds++;if(reasons.length<3)reasons.push(`A ${styles[i%4]} draft ends: ${r.error}`)}}
 }
 return {club,name,verdict:reasons.length?'NOT_READY':'READY',men:cards.length,byPos,tiers,excluded:e.excluded,drafts,deadEnds,reasons}
}
export const READY_COPY='A full draft of seventeen fits the €52M budget, the quotas and the price tiers, whatever a manager picks.'
export type {Card}
