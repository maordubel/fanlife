import {hash} from '@/lib/clubs/rumble-rng'
import {seasonStats,type SeasonStats} from './stats'
import {ENGINE_VERSION,RULE_VERSION,type QuotaPos} from './config'
import type {Career,Fixture,SeasonRecord} from './types'

/**
 * The full history of a finished season (F04). `Career.history` keeps a one-line `SeasonRecord`; this keeps what that line was
 * made from — every fixture with its events and line-ups, the final table, the leaders and the squad — so a season can be opened
 * long after it is over, even by a man who was sold. Pure: it only reads the finished season. The career carries it as
 * `pendingArchive` until the server has written it to its own document (store.flushArchives) and read it back; only then is the
 * pending copy dropped, so no failure between the two writes loses a season.
 */
export const ARCHIVE_VERSION=1 as const
export type ArchiveRow={club:string;name:string;p:number;w:number;d:number;l:number;gf:number;ga:number;pts:number}
export type SeasonArchive={
 v:typeof ARCHIVE_VERSION;careerId:string;ordinal:number;rules:string;engine:string
 fixtures:Fixture[];playoff:Fixture|null;rounds:number
 /** the real final order, play-off winner first when there was one */table:ArchiveRow[];champion:{club:string;name:string}
 stats:SeasonStats;squad:{id:string;name:string;pos:QuotaPos;goals:number}[]
 /** the number the career's own `history` line carries, so the two never disagree */record:SeasonRecord
 /** `${club}:${id}` → name, for every man a log row names */names:Record<string,string>
 signature:string
}
/** the document's name inside the `legends` area — career id AND season, because fixture ids repeat between seasons */
export const archivePath=(careerId:string,ordinal:number)=>`season-history/${careerId}/${ordinal}.json`
const sign=(a:Omit<SeasonArchive,'signature'>)=>{const j=JSON.stringify(a);return `${hash(j).toString(16)}${hash(`s:${j}`).toString(16)}`.padStart(16,'0')}
export const archiveOk=(a:unknown,careerId?:string,ordinal?:number):a is SeasonArchive=>{
 const x=a as SeasonArchive|null
 if(!x||x.v!==ARCHIVE_VERSION||typeof x.careerId!=='string'||!Number.isInteger(x.ordinal)||!Array.isArray(x.fixtures)||typeof x.signature!=='string')return false
 if(careerId!==undefined&&x.careerId!==careerId)return false
 if(ordinal!==undefined&&x.ordinal!==ordinal)return false
 const {signature,...rest}=x;return sign(rest)===signature
}

type Ranked={club:string;name:string;p?:number;w:number;d:number;l:number;gf:number;ga:number;pts:number}
/** `c` is the career at the moment the season ends (fixtures played, squad tallies not yet reset); `ranked` the table as it stands */
export function buildArchive(c:Career,ranked:readonly Ranked[],record:SeasonRecord,nameIn:(club:string,id:string)=>string):SeasonArchive{
 const stats=seasonStats(c,(club,id)=>nameIn(club,id))
 const names:Record<string,string>={}
 const fx=[...c.season.fixtures,...(c.season.playoff?[c.season.playoff]:[])]
 for(const f of fx)if(f.result){
  for(const [i,side] of (f.result.sides??[]).entries()){const club=i===0?f.home:f.away;for(const p of side.xi)names[`${club}:${p.id}`]=p.name}
  for(const e of f.result.events){if(e.side===null)continue;const club=e.side===0?f.home:f.away
   for(const id of [e.player,e.other])if(id&&!names[`${club}:${id}`])names[`${club}:${id}`]=nameIn(club,id)}
 }
 const mine=c.teams.find(t=>t.club===c.clubId)!,goals=new Map(stats.scorers.map(s=>[`${s.club}:${s.id}`,s.value]))
 const squad=mine.squad.map(s=>({id:s.id,name:nameIn(mine.club,s.id),pos:s.quota,goals:goals.get(`${mine.club}:${s.id}`)??0}))
 const champ=ranked[0]!
 const body:Omit<SeasonArchive,'signature'>={v:ARCHIVE_VERSION,careerId:c.id,ordinal:c.season.ordinal,rules:RULE_VERSION,engine:ENGINE_VERSION,
  fixtures:c.season.fixtures,playoff:c.season.playoff,rounds:c.season.rounds,
  table:ranked.map(r=>({club:r.club,name:r.name,p:r.p??r.w+r.d+r.l,w:r.w,d:r.d,l:r.l,gf:r.gf,ga:r.ga,pts:r.pts})),champion:{club:champ.club,name:champ.name},
  stats,squad,record,names}
 return {...body,signature:sign(body)}
}
/** what the career page lists: one row per season, and whether more than the summary exists */
export type HistoryEntry={ordinal:number;detail:'full'|'pending'|'summary-only'}
export function historyDetail(c:Pick<Career,'history'|'pendingArchive'>,stored:ReadonlySet<number>):HistoryEntry[]{
 const pending=new Set((c.pendingArchive??[]).map(a=>a.ordinal))
 return c.history.map(h=>({ordinal:h.ordinal,detail:stored.has(h.ordinal)?'full':pending.has(h.ordinal)?'pending':'summary-only'}))
}
