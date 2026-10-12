/**
 * The shared reference contract (roadmap §3.2, ADR-fanlife-0010). An ADAPTER over the records that already exist —
 * never a second store. `Fact.status==='approved'` plus the gate's own eligibility stay the authority.
 */
export type EntityDomain='player'|'club'|'archive'|'kit'|'goal'|'match'|'market'|'task'|'gate'|'experience'|'career'
export type EntityRef={domain:EntityDomain;clubId?:string;id:string}
export type SourceLineage={sourceIds:string[];sourceVersion:string;approved:boolean;approvedAt?:string|null}
export type RoundManifest={id:string;gateKey:string;seed:number;cursor:number;poolVersion:string;algorithmVersion:string;refs:EntityRef[]}

/** `<club>~<id>`: the namespaced key an aggregate pool deals in */
export const SEP='~'
export const nsKey=(clubId:string,id:string)=>`${clubId}${SEP}${id}`
export function splitKey(key:string):{clubId:string;id:string}|null{const i=key.indexOf(SEP);if(i<=0||i===key.length-1)return null;return {clubId:key.slice(0,i),id:key.slice(i+1)}}
export const refKey=(r:EntityRef)=>`${r.domain}:${r.clubId??'-'}:${r.id}`
export function sameRef(a:EntityRef,b:EntityRef){return a.domain===b.domain&&(a.clubId??null)===(b.clubId??null)&&a.id===b.id}
