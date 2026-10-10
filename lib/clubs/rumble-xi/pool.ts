import type {ClubData} from '../contract'
import {ratedPool,type Rated} from '../rumble'

/** the club's whole archive on its frozen price list: positioned men by family, the rest `free` (any outfield slot) — nobody left out */
export const xiPool=(data:ClubData):Rated[]=>ratedPool(data)
export const cost=(cards:readonly {price:number}[])=>cards.reduce((t,c)=>t+c.price,0)
