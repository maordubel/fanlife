import {SHARED_GATES,type GateKey} from '@/lib/clubs/gates'
import {PLAY_GROUPS} from '@/lib/clubs/play-groups'
import {wallNumbers,type Beloved} from '@/lib/clubs/beloved'
import {clubHref} from '@/lib/clubs/club-href'
import type {UiLocale} from '@/lib/clubs/locale'

/**
 * THE WEEKLY's contents page (rule 124): every section and all thirteen gates one tap away — the menu that replaces
 * sideways sliders. Pure: the layout hands it what it already knows; the sheet only draws it.
 */
export type GateGroup='quick'|'deep'|'archive'
export type ContentsGate={n:number;key:GateKey;name:string;sub:string;group:GateGroup;href:string|null;beloved:boolean}
export type GateStateLite={key:string;allowed:boolean;playable:boolean}

export const groupOf=(key:GateKey):GateGroup=>(PLAY_GROUPS.find(g=>(g.keys as readonly string[]).includes(key))?.id??'archive') as GateGroup

/** The wall in number order (the club's own wall numbers: the beloved gate takes the terrace's number). A closed gate stays listed, without a link. */
export function contentsGates({clubId,locale,states,beloved,copy}:{clubId:string;locale:UiLocale;states:readonly GateStateLite[];beloved:Beloved|null;copy:Record<string,string>}):ContentsGate[]{
 const num=wallNumbers(beloved)
 return [...SHARED_GATES].map(g=>{
  const s=states.find(x=>x.key===g.key),open=!!(s?.allowed&&s.playable)
  return {n:num[g.key],key:g.key,name:copy[`gate.${g.key}`]??g.name,sub:copy[`blurb.${g.key}`]??'',group:groupOf(g.key),href:open?clubHref(clubId,g.key,locale):null,beloved:!!beloved&&beloved.feature===g.key}
 }).sort((a,b)=>a.n-b.n)
}
