import 'server-only'
import {peopleFromRepo} from './registry'
/**
 * The person id of a club record, by the record id alone (record ids are unique across the universe: `p_…` for Hapoel Tel
 * Aviv, `<club>:…` or `p-…` elsewhere — checked in tests/people/registry.test.ts). The games carry it on every man they deal,
 * so a card, a ballot or a squad line can open the man's one profile. Repository verdicts only: synchronous, no store read.
 */
let map:Map<string,string>|null=null
export function personOfRecord(recordId:string):string|null{
 if(!map){map=new Map();for(const p of peopleFromRepo().people)for(const s of p.stints)map.set(s.eid,p.id)}
 return map.get(recordId)??null
}

/**
 * What the archive holds about the man behind a club record (22.11.2026, "a player's card carries what his archive card
 * says, with the doors to it"): his games and goals AT THAT CLUB as a named source states them, and how many of our clubs
 * he played for. Only recorded numbers: a missing count stays null and the card says nothing about it.
 */
export type RecordFacts={person:string;club:string;apps:number|null;goals:number|null;clubs:number}
let facts:Map<string,RecordFacts>|null=null
export function recordFacts(recordId:string):RecordFacts|null{
 if(!facts){facts=new Map();for(const p of peopleFromRepo().people){const clubs=new Set(p.stints.map(s=>s.club)).size
  for(const s of p.stints)facts.set(s.eid,{person:p.id,club:s.club,apps:s.apps,goals:s.goals,clubs})}}
 return facts.get(recordId)??null
}
