import {hash} from '../rumble-show'
import {XI_RULES_ID,type FormationId} from './types'

/** the seed one round is dealt from: the round's own number, who plays whom, the shape, the rules — so a link replays THIS match */
export const xiSeed=(seed:number,home:string,away:string,formation:FormationId):number=>(hash(`${XI_RULES_ID}|${seed}|${home}|${away}|${formation}`)%2147483646)+1
