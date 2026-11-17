import type {Source} from './contract'
/**
 * Owner decisions 13.11.2026 and 14.11.2026 (rule archive-official-source): a source published by the competition's own
 * league or federation (LNFP/FRMF, the Egyptian Pro League/EFA, the IFA, UEFA…), by the competition itself, or by the
 * club's own official site is authoritative on its own. A pack marks such a source with `official`.
 *
 * 17.11.2026 (rule archive-single-source): every researched record goes into action. Any ONE checked, available source is now enough for an automated
 * approval; the official mark stays as provenance. What still holds: confidence 2 or 3, the reviewer's own declaration
 * that the parse was sure ('high' or 'medium') and that nothing conflicts, and not sensitive.
 */
export type OfficialBody='league'|'federation'|'competition'|'club'
const BODIES:readonly string[]=['league','federation','competition','club']
export const officialOf=(raw:unknown):OfficialBody|undefined=>typeof raw==='string'&&BODIES.includes(raw)?raw as OfficialBody:undefined
/** two independent publishers, or one official body — the cross-checked tier, kept for reports and confidence 3 */
export function crossChecked(cited:readonly (Source|undefined)[]):boolean{
 return new Set(cited.map(s=>s?.publisher.toLowerCase())).size>=2||cited.some(s=>!!s?.official)
}
/** at least one cited source that exists (17.11.2026) */
export function enoughPublishers(cited:readonly (Source|undefined)[]):boolean{
 return cited.some(s=>!!s)
}
/** the one automated-approval test every compiler reads (events, players, sections) */
export function automatedApprovalOK(f:{confidence?:unknown;parserCertainty?:unknown;conflictFree?:unknown},cited:readonly (Source|undefined)[],sensitive:boolean):boolean{
 const c=Number(f.confidence)
 return enoughPublishers(cited)&&(c===2||c===3)&&(f.parserCertainty==='high'||f.parserCertainty==='medium')&&f.conflictFree===true&&!sensitive
}
