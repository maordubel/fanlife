import type {ClubPlayer} from '../contract'
import {choicesFor,type Question} from '../polls-model'
import type {DuelCandidate,DuelFilter} from './types'

/** A birth year is a year, nothing more. Bounds are sane, not clever; `now` is injected so a test never depends on the clock. */
export const MIN_BIRTH=1900
export function parseYear(raw:unknown,now=new Date().getFullYear()):number|null{
 const s=typeof raw==='string'?raw.trim():typeof raw==='number'?String(raw):''
 if(!/^\d{4}$/.test(s))return null
 const y=Number(s);return y>=MIN_BIRTH&&y<=now?y:null
}
/** the year of a dated record ("1987-05-14", "14 May 1987", 1987) or null — never guessed */
export function yearOfOn(on:unknown):number|null{
 if(typeof on==='number'&&Number.isInteger(on))return on>=1800&&on<=2200?on:null
 if(typeof on!=='string')return null
 const m=/(?:^|\D)(1[89]\d{2}|20\d{2})(?:\D|$)/.exec(on);return m?Number(m[1]):null
}
export const candidateOfPlayer=(p:ClubPlayer):DuelCandidate=>({id:p.id,kind:'player',title:p.name,yearFrom:p.fromYear,yearTo:p.toYear})
export const candidateOfEvent=(c:{id:string;name:string;from?:number|null;to?:number|null}):DuelCandidate=>({id:c.id,kind:'event',title:c.name,yearFrom:c.from??null,yearTo:c.to??c.from??null})
/** the players a ballot line may be answered by — `fits`/`choicesFor` already decide it (D7-08, D7-09); nobody is admitted to reach ten */
export const poolOfQuestion=(players:readonly ClubPlayer[],q:Question):DuelCandidate[]=>choicesFor(players,q).map(candidateOfPlayer)

/**
 * Was this name part of the club in a period that touches the filter? Unknown years are never turned into a claim:
 *  · since(Y): ended in or after Y, or — if the end is not recorded — began in or after Y (so he was there after Y).
 *  · decade(D): the recorded span overlaps [D, D+9]; a start with no end counts as that one year.
 */
export function inPeriod(c:Pick<DuelCandidate,'yearFrom'|'yearTo'>,f:DuelFilter):boolean{
 if(f.kind==='all')return true
 const from=c.yearFrom??null,to=c.yearTo??null
 if(f.kind==='since'){
  if(to!==null)return to>=f.year
  return from!==null&&from>=f.year
 }
 const lo=f.decade,hi=f.decade+9
 if(from===null&&to===null)return false
 const a=from??to!,b=to??from!
 return a<=hi&&b>=lo
}
export const eligibleFor=(pool:readonly DuelCandidate[],f:DuelFilter):DuelCandidate[]=>{
 const seen=new Set<string>(),out:DuelCandidate[]=[]
 for(const c of pool){if(seen.has(c.id)||!inPeriod(c,f))continue;seen.add(c.id);out.push(c)}
 return out
}
/** the decades that hold at least two names — the only ones worth offering (a decade with one man is not a duel) */
export function decadesOf(pool:readonly DuelCandidate[]):number[]{
 const n=new Map<number,number>()
 for(let d=1920;d<=new Date().getFullYear();d+=10){const k=eligibleFor(pool,{kind:'decade',decade:d}).length;if(k>=2)n.set(d,k)}
 return [...n.keys()]
}
const fnv=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(36)}
/** the digest of an eligible pool: a changed roster or choice set is a different run (D7-12) */
export const digestOf=(pool:readonly DuelCandidate[])=>fnv(pool.map(c=>c.id).sort().join(','))
