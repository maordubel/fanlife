import ratings from '@/content/manual/player-ratings.json'
import {norm} from '@/lib/fixtures/names'
/**
 * FAN LIFE's own in-game strength estimates (owner workbook, 10.10.2026) — NOT Football Manager, NOT FIFA/EA FC.
 * `individual` = a hand anchor from the man's known career (±9); `club-baseline` = the club's ordinary man at that position (±14);
 * `derived` = a squad member the workbook does not list, placed by the same club-and-position baseline and moved a little by what the
 * club's own archive records of him (career span, goals). A derived man never outranks an individually anchored star (cap 84).
 * Names are matched exactly through the normaliser, never fuzzily (rule 7); a name the workbook gives twice is not used.
 * Ratings stay on the server (rule 4): `Rated` carries them, `RumbleCard` does not.
 */
export type RatingBasis='individual'|'club-baseline'|'derived'
export type WorkbookRating={pos:'GK'|'DF'|'MF'|'FW'|null;score:number;basis:RatingBasis;confidence:'medium'|'low'|'derived';uncertainty:number|null}
type Row={name:string;pos:string|null;score:number;conf:'medium'|'low';unc:number|null;basis:'individual'|'club-baseline'}
const doc=ratings as unknown as {baselines:Record<string,Record<string,number>>;fallbackBaseline:Record<string,number>;clubs:Record<string,Row[]>}
const index=new Map<string,Map<string,Row|null>>()
function clubIndex(club:string){
 let m=index.get(club)
 if(!m){m=new Map();for(const r of doc.clubs[club]||[]){const k=norm(r.name);m.set(k,m.has(k)?null:r)}index.set(club,m)}
 return m
}
export function workbookRating(club:string,names:readonly string[]):WorkbookRating|null{
 const m=clubIndex(club),hits=new Set<Row>()
 for(const n of names){const r=m.get(norm(n));if(r)hits.add(r)}
 if(hits.size!==1)return null
 const r=[...hits][0]!
 return {pos:(['GK','DF','MF','FW'] as const).find(x=>x===r.pos)??null,score:r.score,basis:r.basis,confidence:r.conf,uncertainty:r.unc}
}
export const baselineFor=(club:string,pos:string):number=>doc.baselines[club]?.[pos]??doc.fallbackBaseline[pos]??77
/** the ordinary squad man, moved by his own record: percentile 0 → baseline −6, 1 → baseline +6, never above 84 */
export const derivedRating=(club:string,pos:string,percentile:number):number=>Math.min(84,Math.max(40,Math.round(baselineFor(club,pos)+12*(Math.min(1,Math.max(0,percentile))-0.5))))
export const ratingsCovered=(club:string)=>(doc.clubs[club]||[]).length
