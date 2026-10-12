import {ACCESS_TEXT} from '@/lib/clubs/access'
import type {GateSummary} from '@/lib/master/summary'

/** one square of the gate matrix: what the compiled data can play, and whether fans can enter now — never merged */
export type CellState='open'|'ready-off'|'partial'|'locked'|'no-pack'
export function cellOf(g:GateSummary|undefined):{state:CellState;label:string}{
 if(!g)return {state:'no-pack',label:'No compiled pack'}
 if(g.openNow)return {state:'open',label:`Open to fans · ${g.eligible}/${g.target}`}
 if(g.dataPlayable)return {state:g.full?'ready-off':'partial',label:`${g.full?'Full':'Short'} round playable · ${ACCESS_TEXT[g.access]}`}
 return {state:'locked',label:g.reason||`Locked · ${g.eligible}/${g.target}`}
}
