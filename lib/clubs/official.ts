import type {Source} from './contract'
/**
 * Owner decisions 13.11.2026 and 14.11.2026 (rule archive-official-source): a source published by the competition's own
 * league or federation (LNFP/FRMF, the Egyptian Pro League/EFA, the IFA, UEFA…), by the competition itself, or by the
 * club's own official site is authoritative on its own. A record it states needs no second publisher; every other automated-approval condition still holds
 * (confidence 3, high parser certainty, no conflict, not sensitive). A pack marks such a source with `official`.
 */
export type OfficialBody='league'|'federation'|'competition'|'club'
const BODIES:readonly string[]=['league','federation','competition','club']
export const officialOf=(raw:unknown):OfficialBody|undefined=>typeof raw==='string'&&BODIES.includes(raw)?raw as OfficialBody:undefined
/** two independent publishers, or one official body (the league, the federation, the competition, the club itself) */
export function enoughPublishers(cited:readonly (Source|undefined)[]):boolean{
 return new Set(cited.map(s=>s?.publisher.toLowerCase())).size>=2||cited.some(s=>!!s?.official)
}
