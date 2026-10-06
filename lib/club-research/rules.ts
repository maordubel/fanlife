/**
 * Club-research rules — the conclusions of the Panathinaikos package, as code any club's package runs through.
 * Pure (no server-only, no I/O) so the CLI, the research app and the tests share one definition.
 * Every rule answers "what must NOT be concluded from raw material": a count is not coverage, a name is not an
 * identity, a date in the page is not the date of the match, review is not approval.
 */
export type Rec=Record<string,any>
export const nameKey=(s:unknown)=>String(s??'').normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()
const iso=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v).toISOString().slice(0,10)===v?v:null
/** "1966/67", "1966/1967", "1966-67" → 1966. Anything else → null (never guessed). */
export function seasonStart(label:unknown):number|null{const m=/^(\d{4})\s*[\/-]\s*(\d{2}|\d{4})$/.exec(String(label??'').trim());if(!m)return null;const a=+m[1]!,b=m[2]!.length===2?Math.floor(a/100)*100+ +m[2]!:+m[2]!;return b===a+1||(m[2]!.length===2&&(a+1)%100===+m[2]!)?a:null}
/**
 * A date fits a season when it falls between 1 June of the first year and 31 August of the second. That window is
 * deliberately wider than "1 July": a cup final on 5 July 1967 belongs to 1966/67, a qualifier in July to the next
 * season — which one is the COMPETITION's call, so the check only rejects what no calendar can explain.
 */
export function dateFitsSeason(season:unknown,on:unknown):boolean|null{const y=seasonStart(season),d=iso(on);if(y===null||!d)return null;return d>=`${y}-06-01`&&d<=`${y+1}-08-31`}
export const isFuture=(on:unknown,asOf:string)=>{const d=iso(on);return !!d&&d>asOf}
export type ScoreView={displayed:{home:number;away:number}|null;shootout:{home:number;away:number}|null;aggregate:{home:number;away:number}|null;kind:'displayed_unqualified'|'shootout_recorded'|'drawn_by_lot'|'unparsed'}
/** Result layers stay separate: the 90-minute score, the shootout and a two-leg aggregate are different claims. */
export function separateResult(m:Rec):ScoreView{
 const pair=(v:any)=>v&&Number.isInteger(v.home)&&Number.isInteger(v.away)?{home:v.home as number,away:v.away as number}:null
 const so=pair(m.shootoutScoreAsReported),shown=pair(m.scoreAsReported),note=String(m.notesAsReported??m.scoreType??'')
 return {displayed:shown,shootout:so,aggregate:null,kind:/lot|draw(?:ing)? of lots|הגרלה/i.test(note)?'drawn_by_lot':so?'shootout_recorded':shown?'displayed_unqualified':'unparsed'}
}
/** A final played away from both clubs has no home side. The source's team ORDER is a display order, not a venue. */
export const isNeutralFinal=(m:Rec)=>!!m.neutralFinalPresentation||/\bfinal\b/i.test(String(m.stage??''))||/final/i.test(String(m.competitionStageAsReported??''))
export const homeAwayFor=(m:Rec)=>isNeutralFinal(m)?'neutral_unassigned' as const:m.homeAwayInterpretation&&!/not_assigned/.test(String(m.homeAwayInterpretation))?'source_stated' as const:'unassigned' as const
/** Two language versions or two domains of ONE institution are one voice. Approval needs two FAMILIES. */
export const sourceFamilies=(ids:string[],byId:Map<string,Rec>)=>new Set(ids.map(id=>String(byId.get(id)?.sourceFamilyId||byId.get(id)?.publisher||id)))
export const independentEnough=(ids:string[],byId:Map<string,Rec>)=>sourceFamilies(ids,byId).size>=2
export type LineupVerdict={status:'xi_candidate_needs_identity'|'blocked';reasons:string[];starters:number;distinct:number}
/** Eleven distinct names is structural completeness only: no personId, no proof it is the STARTING eleven. */
export function lineupVerdict(l:Rec):LineupVerdict{
 const names=(Array.isArray(l.startersAsReported)?l.startersAsReported:[]).map((s:Rec)=>nameKey(s.nameAsReported)).filter(Boolean),distinct=new Set(names).size,reasons:string[]=[]
 if(names.length!==11)reasons.push(`${names.length} names, not 11`)
 if(distinct!==names.length)reasons.push('duplicate names')
 if(l.coverageStatus&&l.coverageStatus!=='complete_listing')reasons.push(String(l.coverageStatus))
 return {status:reasons.length?'blocked':'xi_candidate_needs_identity',reasons,starters:names.length,distinct}
}
/** Goal claims from different documents may describe the same goal; they merge only on identical identity, never on a guess. */
export const goalKey=(g:Rec)=>[g.matchId,nameKey(g.scorerNameAsReported),g.minute??'?',g.stoppageMinute??0,g.creditedTeamId??'unresolved',g.typeAsReported??'?'].join('|')
export function groupGoals(claims:Rec[]){const by=new Map<string,Rec[]>();for(const g of claims){const k=goalKey(g);by.set(k,[...(by.get(k)||[]),g])}
 return {groups:by.size,duplicates:[...by.values()].filter(a=>new Set(a.flatMap(x=>x.sourceIds||[])).size>1&&a.length>1).length,sideUnresolved:claims.filter(g=>!g.creditedTeamId).length,ownGoals:claims.filter(g=>/own/i.test(String(g.typeAsReported))).length,disputed:claims.filter(g=>g.disputed).length}}
/** Identity needs a verified provider id. A name, a transliteration or an overlapping year is a lead, not a match. */
export function identityReport(records:Rec[],known:Set<string>,providerField='providerIds'){let matched=0;for(const r of records){const p=r[providerField];if(p&&typeof p==='object'&&Object.entries(p).some(([k,v])=>known.has(`${k}:${v}`)))matched++}return {total:records.length,matched,unmatched:records.length-matched}}
/** Approvals already given by a person survive a re-import; new material that disagrees is flagged, never swapped in. */
export function mergeStaging(prev:Rec[],next:Rec[]){const old=new Map(prev.map(r=>[r.id,r])),out:Rec[]=[];let inserts=0,updates=0,unchanged=0,keptApproved=0,disputed=0
 for(const n of next){const o=old.get(n.id);old.delete(n.id)
  if(!o){inserts++;out.push(n);continue}
  const same=JSON.stringify(o)===JSON.stringify(n);if(same){unchanged++;out.push(o);continue}
  if(o.status==='approved'||o.approvedBy){keptApproved++;if(JSON.stringify({...o,status:0,approvedAt:0,approvedBy:0})!==JSON.stringify({...n,status:0,approvedAt:0,approvedBy:0}))disputed++;out.push(o);continue}
  updates++;out.push(n)}
 for(const o of old.values())out.push(o)
 return {rows:out,inserts,updates,unchanged,keptApproved,disputed}}
