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
