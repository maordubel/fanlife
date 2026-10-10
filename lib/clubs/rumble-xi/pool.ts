import type {ClubData} from '../contract'
import {ratedPool,type Rated} from '../rumble'
import {derivedRating,workbookRating} from '../ratings'

import {priceOf} from './prices'
import {extraPositions} from './positions'

/** the club's dealable men with their hidden ratings, before pricing (the price table is built from these) */
export const xiPoolRaw=(data:ClubData):Rated[]=>ratedPool(data,{extra:extraPositions(data.identity.id)})
/** The club's men priced on the global table (the classic pool's rank prices are replaced; ratings are untouched). */
export const xiPool=(data:ClubData):Rated[]=>xiPoolRaw(data).map(r=>({...r,price:priceOf(r.rating,r.position)}))
export const cost=(cards:readonly {price:number}[])=>Math.round(cards.reduce((t,c)=>t+c.price,0)*2)/2

/**
 * Everyone in the club's archive the pool cannot deal because NO source names a position. They are not hidden and not guessed into a
 * position: a scout may sign them into any OUTFIELD slot, rated at what the workbook says of him or at his club's ordinary midfielder,
 * and the card says "position not recorded".
 */
export function xiFree(data:ClubData):Rated[]{
 const club=data.identity.id,dealt=new Set(xiPoolRaw(data).map(r=>r.id))
 return (data.players||[]).map(f=>f.value).filter(p=>!dealt.has(p.id)&&p.name).map(p=>{
  const wb=workbookRating(club,[p.name,...p.aliases]),rating=wb?.score??derivedRating(club,'MF',0.5)
  return {id:p.id,name:p.name,position:'MF' as const,free:true,price:priceOf(rating,'MF'),rating,basis:wb?.basis??'derived' as const,fromYear:p.fromYear,toYear:p.toYear}
 })
}
