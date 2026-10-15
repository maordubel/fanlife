import {clamp,LEGENDS_RULES as R,roundTenths,type LegendsSettings} from './config'

/**
 * Money (rulebook §1.3, §2.3, §2.4). Pure.
 *  · the base price is the frozen list's €1–5M and never moves
 *  · a sale is quoted at 80–120% of the base (demand: appearances and stars), less the market fee (a setting)
 *  · before his first official appearance since you signed him, a man's net sale can never beat what you paid for him — a
 *    dynamic fee takes the difference (round 9); after it, the market decides and a profit is possible, never promised
 *  · next season's board grant is €4–10M by results and FALLS as the cash pile grows; there is no cash ceiling
 */
const floorTenths=(x:number)=>Math.floor(x*10+1e-9)/10
export type SaleQuote={quoted:number;fee:number;guard:number;net:number;factor:number}
export function saleQuote(base:number,paid:number,appsSincePurchase:number,stars:number,s:Pick<LegendsSettings,'marketFeeRate'>):SaleQuote{
 const [lo,hi]=R.salePriceBaseRange
 const factor=clamp(0.86+0.03*Math.min(appsSincePurchase,8)+0.06*(stars-3),lo,hi)
 const quoted=clamp(roundTenths(base*factor),roundTenths(lo*base),roundTenths(hi*base))
 const fee=roundTenths(quoted*s.marketFeeRate)
 const guard=appsSincePurchase===0?Math.max(0,roundTenths(quoted-fee-paid)):0
 const net=floorTenths(Math.max(0,quoted-fee-guard))
 return {quoted,fee,guard,net:appsSincePurchase===0?Math.min(net,paid):net,factor}
}
/**
 * F02 (15.10.2026): THE rule for every way a man can leave — a direct sale, a bid that is accepted, a swap: before his first
 * official appearance since you signed him, what the manager receives can never beat what he paid. Applied to the FINAL amount,
 * after any premium a bidder adds, so no route can slip past it.
 */
export const finalProceeds=(amount:number,paid:number,appsSincePurchase:number)=>appsSincePurchase===0?roundTenths(Math.min(amount,paid)):roundTenths(amount)
/** 0–1 for the season, from the final place (and a title) */
export const seasonScore=(place:number,of:number,champion:boolean)=>clamp((of>1?(of-place)/(of-1):1)*0.85+(champion?0.15:0),0,1)
export function nextSeasonGrant(score01:number,cashBefore:number,s:Pick<LegendsSettings,'grantLiquidityM'>):number{
 const [lo,hi]=R.carryoverGrantRangeM,liq=clamp(cashBefore/s.grantLiquidityM,0,1)
 return clamp(roundTenths(lo+(hi-lo)*clamp(score01,0,1)*(1-liq)),lo,hi)
}
/** the season's achievement bonuses — each awarded once, and €5M in all at most */
export type Achievement={key:string;why:string;amount:number}
export function achievements(row:{place:number;of:number;champion:boolean;unbeatenHome:boolean;bestAttack:boolean;longestWinRun:number}):Achievement[]{
 const out:Achievement[]=[]
 if(row.champion)out.push({key:'champion',why:'Champions',amount:3})
 else if(row.place===2)out.push({key:'runner-up',why:'Runners-up',amount:1.5})
 if(!row.champion&&row.place<=Math.ceil(row.of/2)&&row.place!==2)out.push({key:'top-half',why:'A top-half finish',amount:1})
 if(row.unbeatenHome)out.push({key:'fortress',why:'Unbeaten at home',amount:0.5})
 if(row.bestAttack)out.push({key:'best-attack',why:'The league’s best attack',amount:0.5})
 if(row.longestWinRun>=3)out.push({key:'win-run',why:`${row.longestWinRun} wins in a row`,amount:0.5})
 return out
}
export function capBonuses(list:readonly Achievement[],already:number):Achievement[]{
 let left=Math.max(0,R.achievementsBonusPerSeasonCapM-already);const out:Achievement[]=[]
 for(const a of list){const amt=roundTenths(Math.min(a.amount,left));if(amt<=0)break;out.push({...a,amount:amt});left=roundTenths(left-amt)}
 return out
}
/** reputation — it opens management abilities, never match strength (§1.7.42) */
export const ABILITIES=[{at:30,id:'scouting',label:'Scouting report',hint:'See the next opponent’s eleven before kick-off.'},{at:80,id:'contacts',label:'Market contacts',hint:'Four special offers in a window instead of three.'},{at:160,id:'board',label:'Board trust',hint:'See the board’s grant forecast all season.'}] as const
export type AbilityId=typeof ABILITIES[number]['id']
export const abilitiesAt=(points:number):AbilityId[]=>ABILITIES.filter(a=>points>=a.at).map(a=>a.id)
