import type {ClubData} from '@/lib/clubs/contract'
import {overrideOf,hasOverrides,getSnapshot} from './effective'
const revisionOf=()=>getSnapshot().revision
/**
 * The owner's published overrides laid over a club's archive, once, where the club is loaded — so every game, page and report reads the same men.
 * A removed man leaves `players`; a set position list replaces the archive's (an empty list = explicitly unknown). Nothing else of the archive is touched.
 * Price and rating are read at the pool (lib/clubs/rumble.ts) from the same snapshot, so five-a-side and the eleven can never disagree.
 */
export function withPlayerOverrides(id:string,data:ClubData):ClubData{
 // a fresh top level and a fresh `gates` every time: the readiness pass writes into `gates`, and a base that an earlier load froze must stay untouched
 const copy={...data,gates:{...data.gates}}
 if(!data.players||!hasOverrides(id))return copy
 const players=data.players.filter(f=>!overrideOf(id,f.id)?.removed).map(f=>{const o=overrideOf(id,f.id);return o?.positions?{...f,value:{...f.value,positions:o.positions}}:f})
 return {...copy,players,version:`${data.version}+p${revisionOf()}`}
}
