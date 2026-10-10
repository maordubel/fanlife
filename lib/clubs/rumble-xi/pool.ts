import type {ClubData} from '../contract'
import {ratedPool,type Rated} from '../rumble'
import {countFamily} from './formations'
import type {FormationId} from './types'

/**
 * ONE price table for every club, on the one rating scale the workbook uses (about 67–95), so a card costs the same wherever it
 * is drawn and a mid man of a small club can never look like another club's legend. It is game money — not a transfer value,
 * not an official rating. Steps of €0.5M, €1M to €5M.
 */
export function priceOf(rating:number):number{
 if(rating>=85)return 5
 if(rating>=82)return 4.5
 if(rating>=80)return 4
 if(rating>=78)return 3.5
 if(rating>=76)return 3
 if(rating>=74)return 2.5
 if(rating>=72)return 2
 if(rating>=70)return 1.5
 return 1
}
/** The club's men priced on the global table (the classic pool's rank prices are replaced; ratings are untouched). */
export const xiPool=(data:ClubData):Rated[]=>ratedPool(data).map(r=>({...r,price:priceOf(r.rating)}))
export const cost=(cards:readonly {price:number}[])=>Math.round(cards.reduce((t,c)=>t+c.price,0)*2)/2
