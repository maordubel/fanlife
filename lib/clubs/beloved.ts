import {SHARED_GATES,type GateKey} from './gates'

/**
 * The club's BELOVED GATE — the terrace its supporters call their own (Hapoel Tel Aviv: Gate 5, Olympiacos: Gate 7,
 * Panathinaikos: Gate 13). The number is read from the club's sourced terrace line (world.json), never typed here.
 * The best, most personal game — designing your own shirt — hangs behind it, big, at the top of the wall (rule 101).
 */
export type Beloved={number:number|null;name:string;local?:string;feature:GateKey}
/** What gets the big plate, in order: the shirt you design, then the shirt shelf, then the living archive. */
export const FEATURE_ORDER:readonly GateKey[]=['kit-builder','kits','archive']
export function belovedOf(terrace:{name:string;local?:string}|undefined,open:readonly GateKey[]):Beloved|null {
 const n=terrace?/\bgate\s+(\d{1,2})\b/i.exec(terrace.name):null,number=n?Number(n[1]):null
 // when the club's own number IS a shirt gate's number (Hapoel Tel Aviv: 5 = the shirt collection), that gate is the one
 const own=number===null?undefined:SHARED_GATES.find(g=>g.number===number&&(FEATURE_ORDER as readonly string[]).includes(g.key))?.key as GateKey|undefined
 const feature=own&&open.includes(own)?own:FEATURE_ORDER.find(k=>open.includes(k))
 if(!feature)return null
 return {number,name:terrace?.name??'',local:terrace?.local,feature}
}
/**
 * The wall's printed numbers for THIS club. The shared numbers are The Worker's (Bloomfield's); a club whose own terrace
 * is Gate 7 must not meet a second 7. So the featured game takes the club's number and the game that held it takes the
 * featured game's old one — still 1..13, each once. Display only: links, access and data go by gate KEY.
 */
export function wallNumbers(beloved:Beloved|null):Record<GateKey,number> {
 const out=Object.fromEntries(SHARED_GATES.map(g=>[g.key,g.number])) as Record<GateKey,number>
 if(!beloved||beloved.number===null)return out
 const holder=SHARED_GATES.find(g=>out[g.key]===beloved.number&&g.key!==beloved.feature)
 if(holder)out[holder.key]=out[beloved.feature]
 out[beloved.feature]=beloved.number
 return out
}
