import {createHash} from 'node:crypto'
import {canonicalJson,canonicalSet} from '@/lib/research/canonical'
import {timelineReadiness} from '@/lib/clubs/contract'
import {seasonStart,dateFitsSeason,groupGoals,homeAwayFor,identityReport,independentEnough,isFuture,isNeutralFinal,lineupVerdict,separateResult,sourceFamilies,type Rec} from './rules'
export type Staging=Record<string,Rec[]>
const approvedCount=(s:Staging)=>Object.entries(s).reduce((n,[k,rows])=>k==='claims'||k==='evidence'?n:n+rows.filter(r=>r.status==='approved'||r.approvedBy).length,0)
/** bump when the fields a fingerprint covers change meaning */
export const FINGERPRINT_VERSION='dryrun-fp-2'
/**
 * A record set's fingerprint covers its CONTENT, not its ids (audit F16): canonical JSON of every record (sorted keys),
 * order-insensitive across the set, with the fingerprint version and the set's name. A corrected date or score under
 * the same id changes it; reordering rows does not.
 */
export const hash=(rows:Rec[],kind='')=>createHash('sha256').update(`${canonicalJson({v:FINGERPRINT_VERSION,kind})}\n${canonicalSet(rows)}`).digest('hex').slice(0,16)
/** Dry run: counts what an import WOULD do and what it refuses. Writes nothing. */
export function dryRun(club:string,asOf:string,s:Staging,known=new Set<string>()){
 const sources=new Map((s.sources||[]).map(r=>[r.id,r])),matches=s.matches||[],quarantined=s.quarantined||[]
 const futureDated=matches.filter(m=>isFuture(m.playedOn,asOf)).map(m=>m.id)
 const seasonMismatch=matches.filter(m=>dateFitsSeason(m.season,m.playedOn)===false).map(m=>m.id)
 const lineups=(s.lineups||[]).map(l=>({id:l.id,...lineupVerdict(l)}))
 const claimsOnly=(s['result-matrix']||[]).length+(s['early-tables']||[]).length+(s['cup-final-assertions']||[]).length+(s['euro-ties']||[]).length
 const sensitive=(s.claims||[]).filter(c=>c.sensitive).length
 const lone=[...sources.values()].filter(x=>x.imagesUsableInApp===true).length
 const families=Object.fromEntries([...sourceFamilies([...sources.keys()],sources)].map(f=>[f,[...sources.values()].filter(x=>x.sourceFamilyId===f).length]))
 const dualFamily=(s.honours||[]).filter(h=>independentEnough(h.sourceIds||[],sources)).length
 const seasonTokenIssues=[...(s['euro-ties']||[]).map(r=>[r.id,r.seasonAsReported]),...(s['cup-final-assertions']||[]).map(r=>[r.id,r.season]),...(s['uefa-campaigns']||[]).map(r=>[r.id,r.season]),...(s['coach-spells']||[]).map(r=>[r.id,r.season])].filter(([,t])=>seasonStart(t)===null).map(([id,token])=>({id,token}))
 const goals=groupGoals(s['goal-claims']||[]),approved=approvedCount(s)
 const exactDayEvents=(s.timeline||[]).filter(t=>t.precision==='day'&&t.on&&(t.status==='approved')).length
 return {club,snapshotAsOf:asOf,approvedForProduction:approved,
  sources:{total:sources.size,families,imagesUsableInApp:lone,sourcesWithHash:[...sources.values()].filter(x=>x.sha256).length},
  records:Object.fromEntries(Object.entries(s).map(([k,v])=>[k,v.length])),
  identity:{archivePlayers:identityReport(s['archive-players']||[],known),squad:identityReport(s['current-squad']||[],known),rule:'verified provider id only; names are leads'},
  matches:{total:matches.length,quarantined:quarantined.map(q=>({id:q.id,reason:q.reason,sourceDateClaim:q.sourceDateClaim})),futureDated,seasonMismatch,
   neutralFinals:matches.filter(isNeutralFinal).length,homeAway:{neutral:matches.filter(m=>homeAwayFor(m)==='neutral_unassigned').length,unassigned:matches.filter(m=>homeAwayFor(m)==='unassigned').length},
   resultKinds:matches.reduce((a:Rec,m)=>{const k=separateResult(m).kind;a[k]=(a[k]||0)+1;return a},{}),assertionsNotMatches:claimsOnly},
  lineups:{total:lineups.length,xiCandidatesNeedIdentity:lineups.filter(l=>l.status!=='blocked').length,blocked:lineups.filter(l=>l.status==='blocked').map(l=>({id:l.id,reasons:l.reasons}))},
  goals,conflicts:(s.conflicts||[]).map(c=>({id:c.id,matchId:c.matchId,topic:c.topic,status:c.status,rule:c.productRule||c.blockedUses})),
  honoursWithTwoFamilies:dualFamily,seasonTokenIssues,sensitiveClaims:sensitive,
  gates:{timeline:timelineReadiness(exactDayEvents).state,trivia:'LOCKED',xi:'LOCKED',lineup:'LOCKED',archive:'LOCKED',memory:'LOCKED',goal:'LOCKED',note:'review material is never playable; gates unlock only from approved, sourced, conflict-free facts'},
  fingerprints:Object.fromEntries(Object.entries(s).map(([k,v])=>[k,hash(v,k)]))}
}
export type DryRun=ReturnType<typeof dryRun>
export const reportMarkdown=(r:DryRun)=>`# Dry run — ${r.club} (as of ${r.snapshotAsOf})

- Approved for production: **${r.approvedForProduction}**
- Sources: ${r.sources.total} in ${Object.keys(r.sources.families).length} families · images usable in app: ${r.sources.imagesUsableInApp}
- Matches: ${r.matches.total} · future-dated: ${r.matches.futureDated.length} · season mismatch: ${r.matches.seasonMismatch.length} · quarantined: ${r.matches.quarantined.length}
- Neutral finals (no home advantage): ${r.matches.neutralFinals} · assertions kept out of matches: ${r.matches.assertionsNotMatches}
- Identity: ${r.identity.archivePlayers.matched}/${r.identity.archivePlayers.total} archive players matched to canonical ids
- Lineups: ${r.lineups.total} · XI candidates (still need identity): ${r.lineups.xiCandidatesNeedIdentity} · blocked: ${r.lineups.blocked.length}
- Goal claims: ${r.goals.sideUnresolved} with unresolved side · ${r.goals.ownGoals} own goals · ${r.goals.disputed} disputed
- Season tokens needing research (never silently fixed): ${r.seasonTokenIssues.map(i=>i.token).join(', ')||'none'}
- Conflicts held open: ${r.conflicts.length}
- Gates: ${Object.entries(r.gates).filter(([k])=>k!=='note').map(([k,v])=>`${k} ${v}`).join(' · ')}
`
