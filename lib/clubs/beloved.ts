import type {GateKey} from './gates'

/**
 * The club's BELOVED GATE — the terrace its supporters call their own (Hapoel Tel Aviv: Gate 5, Olympiacos: Gate 7,
 * Panathinaikos: Gate 13). The number is read from the club's sourced terrace line (world.json), never typed here.
 * The best, most personal game — designing your own shirt — hangs behind it, big, at the top of the wall (rule 101).
 */
export type Beloved={number:number|null;name:string;local?:string;feature:GateKey}
/** What gets the big plate, in order: the shirt you design, then the shirt shelf, then the living archive. */
export const FEATURE_ORDER:readonly GateKey[]=['kit-builder','kits','archive']
export function belovedOf(terrace:{name:string;local?:string}|undefined,open:readonly GateKey[]):Beloved|null {
 const feature=FEATURE_ORDER.find(k=>open.includes(k))
 if(!feature)return null
 const n=terrace?/\bgate\s+(\d{1,2})\b/i.exec(terrace.name):null
 return {number:n?Number(n[1]):null,name:terrace?.name??'',local:terrace?.local,feature}
}
