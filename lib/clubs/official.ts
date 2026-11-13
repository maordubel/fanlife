import type {Source} from './contract'
/**
 * Owner decision 13.11.2026 (rule archive-official-source): a source published by the competition's own league or
 * federation (the body that runs the competition — LNFP/FRMF, the Egyptian Pro League/EFA, the IFA, UEFA…) is authoritative
 * on its own. A record it states needs no second publisher; every other automated-approval condition still holds
 * (confidence 3, high parser certainty, no conflict, not sensitive). A pack marks such a source with `official`.
 */
export type OfficialBody='league'|'federation'
export const officialOf=(raw:unknown):OfficialBody|undefined=>raw==='league'||raw==='federation'?raw:undefined
/** two independent publishers, or one official body of the competition */
export function enoughPublishers(cited:readonly (Source|undefined)[]):boolean{
 return new Set(cited.map(s=>s?.publisher.toLowerCase())).size>=2||cited.some(s=>!!s?.official)
}
