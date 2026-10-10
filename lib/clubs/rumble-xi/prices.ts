import table from '@/content/generated/rumble-prices.json'
import type {Pos} from '../rumble'

/**
 * What a card costs. One table for every club (`content/generated/rumble-prices.json`, built by scripts/rumble/build-price-table.ts):
 * a man's price is where his rating stands among ALL the men of his family across the eight clubs, in half-million steps from €1M
 * to €5M — about one man in twelve costs the maximum, one in twelve the minimum. Game money, not a transfer value.
 */
export const QUANTILES=[0.07,0.18,0.31,0.45,0.6,0.74,0.86,0.95] as const
export const PRICE_VERSION=(table as {version:string}).version
const cuts=(table as {cuts:Record<string,number[]>}).cuts
export function priceOf(rating:number,family:Pos):number{
 const c=cuts[family]??cuts.MF!
 return 1+0.5*c.filter(x=>rating>=x).length
}

/** the cut points a table is made of: for each family, the ratings at the quantiles, made strictly increasing so every half-million step is real */
export function buildCuts(byFamily:Record<string,number[]>):Record<string,number[]>{
 const out:Record<string,number[]>={}
 for(const [fam,list] of Object.entries(byFamily)){const xs=[...list].sort((a,b)=>a-b),c:number[]=[];for(const q of QUANTILES){let v=xs[Math.floor(q*(xs.length-1))]!;if(c.length&&v<=c[c.length-1]!)v=c[c.length-1]!+1;c.push(v)};out[fam]=c}
 return out
}
