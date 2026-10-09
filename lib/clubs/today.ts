import {chronologyPool} from './chronology'
import type {ClubData} from './contract'

/**
 * "Today at the club" — the dated moment the club's own archive holds nearest to today's calendar day.
 * Exact day-of-year match first ("on this day"); otherwise the nearest within WINDOW days, shown with its REAL date
 * (never pretended to be today's); otherwise nothing. Only exact-dated, approved, conflict-free timeline rows (TI-R01).
 */
export type Moment={id:string;title:string;on:string;yearsAgo:number;offset:number}
export const WINDOW=14
const DAY=86_400_000
export function momentFor(data:Pick<ClubData,'timeline'>,now:Date):Moment|null {
 const pool=chronologyPool(data.timeline),year=now.getUTCFullYear(),today=Date.UTC(year,now.getUTCMonth(),now.getUTCDate())
 let best:Moment|null=null
 for(const c of pool){
  const [y,m,d]=c.on.split('-').map(Number) as [number,number,number]
  if(y>=year)continue
  // the same calendar day this year (and the neighbouring years, for a window that crosses New Year)
  for(const dy of [-1,0,1]){
   const t=Date.UTC(year+dy,m-1,d),off=Math.round((t-today)/DAY)
   if(Math.abs(off)>WINDOW)continue
   const cand:Moment={id:c.id,title:String(c.title),on:c.on,yearsAgo:year-y,offset:off}
   // nearest first; at equal distance prefer the older story, then the id — deterministic for every visitor that day
   if(!best||Math.abs(off)<Math.abs(best.offset)||(Math.abs(off)===Math.abs(best.offset)&&(cand.yearsAgo>best.yearsAgo||(cand.yearsAgo===best.yearsAgo&&cand.id<best.id))))best=cand
  }
 }
 return best
}
