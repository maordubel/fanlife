import {strip,type Rated,type RumbleResult} from '../rumble'
import {stageWith,type ShowPlayer,type ShowScript} from '../rumble-show'
import {slotsOf} from './formations'
import type {FormationId} from './types'

/** eleven men on the pitch: each card stands where his slot is, in the formation both sides play */
export function lineUpXI(cards:readonly Rated[],side:'us'|'them',f:FormationId):ShowPlayer[]{
 return slotsOf(f).map((slot,i)=>({...strip(cards[i]!),side,x:slot.x,y:slot.y,slot:slot.fine}))
}
/** The server tells the eleven-a-side match: scorers by line and hidden rating, a fuller night of events, and the football around them. */
export function stageXI(result:RumbleResult,seed:number,f:FormationId):ShowScript{
 return stageWith(result,seed,{us:lineUpXI(result.you.cards,'us',f),them:lineUpXI(result.rival.cards,'them',f),total:g=>Math.max(9,Math.min(15,g+8)),gap:4,format:'eleven',formation:f})
}
