import 'server-only'
import {existsSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import {collectorStagingRoot} from '@/lib/research/paths'
import {reportedYears} from '@/lib/research/archive-readers'
import type {Source,Finding,Job} from '../types'
import type {Adapter} from './types'
type Row=Record<string,unknown>
const read=(dir:string,n:string):Row[]=>{const p=join(dir,`${n}.json`);if(!existsSync(p))return [];const v=JSON.parse(readFileSync(p,'utf8'));return Array.isArray(v)?v:[]}
const https=(u:unknown)=>{try{return typeof u==='string'&&new URL(u).protocol==='https:'}catch{return false}}
/**
 * Reads a staged research package (research-staging/<club>/, built by research:stage). Every finding stays unapproved.
 * Audit A06: each finding cites the sources of the record it was READ from — never "the first source" by default — and
 * package statistics (counts, versions, conflicts) are a REPORT, not historical claims, so they go to the gap list and
 * can never be approved as a fact.
 */
/** repository staging first, then the collector's export under the data dir — only those that hold a manifest */
export function stagingDirs(clubId:string){return [join(process.cwd(),'research-staging',clubId),join(collectorStagingRoot(),clubId)].filter(d=>existsSync(join(d,'manifest.json')))}
async function collect(job:Job){
 // two staging places, read as one: the package in the repository (staged by hand / research:stage) and the
 // archive collector's export in the control-room data dir. The repository manifest wins when both exist.
 const dirs=stagingDirs(job.clubId)
 if(!dirs.length)throw new Error('No staged research package for this club. Collect archive sources (Data tab) or import a package and run research:stage first.')
 const manifest=JSON.parse(readFileSync(join(dirs[0]!,'manifest.json'),'utf8')) as Row,now=new Date().toISOString()
 const all=(n:string)=>{const seen=new Set<string>();return dirs.flatMap(d=>read(d,n)).filter(r=>{const id=String(r.id??JSON.stringify(r));if(seen.has(id))return false;seen.add(id);return true})}
 const raw=all('sources'),identity=all('club-identity'),matches=all('matches'),backlog=all('backlog'),conflicts=all('conflicts'),people=all('archive-players')
 const sources:Source[]=raw.filter(s=>https(s.url)).map(s=>({id:`pkg-${s.id}`,title:String(s.title),url:String(s.url),excerpt:`${s.sourceFamilyId||s.publisher} · ${s.scope||'record_specific'} · images usable: ${s.imagesUsableInApp===true}${s.collected&&typeof s.collected==='object'?` · collector: ${(s.collected as Row).documents} documents read (${(s.collected as Row).state}), ${(s.collected as Row).parser?'parser '+(s.collected as Row).parser:'no parser yet — nothing extracted'}`:''}${typeof s.documentHash==='string'?` · document version ${s.documentHash}`:''}`,reviewed:false,retrievedAt:typeof s.retrievedAt==='string'?s.retrievedAt:now}))
 const known=new Set(sources.map(s=>s.id))
 const citesFor=(row:Row)=>(Array.isArray(row.sourceIds)?row.sourceIds:[]).map(id=>`pkg-${id}`).filter(id=>known.has(id))
 const linkOf=(row:Row):Finding['archiveLink']=>{
  const state=row.identityState
  if(state!=='linked'&&state!=='ambiguous'&&state!=='unresolved')return undefined
  return {state,canonicalId:state==='linked'&&typeof row.canonicalId==='string'?row.canonicalId:null}
 }
 const findings:Finding[]=[]
 for(const row of identity){
  const cites=(Array.isArray(row.sourceIds)?row.sourceIds:[]).map(id=>`pkg-${id}`).filter(id=>known.has(id))
  if(!cites.length)continue
  for(const [field,key] of [['candidateIdentity','nameEn'],['founded','foundedOn'],['founder','founder'],['wikidata','wikidataId'],['city','city']] as const){
   const v=row[key];if(v!==null&&v!==undefined&&v!=='')findings.push({field,value:String(v),sources:cites,approved:false})
  }
 }
 // people the parser read: each PLAYER is a finding the owner can approve (name as written + the page it came from).
 // Coaches stay in the report — no game uses them yet. Approving a player does not open anything: the owner builds
 // game data from approved rows, and the compiler still decides what is playable.
 for(const p of people){
  if(p.role!=='player'||typeof p.nameAsReported!=='string'||!p.nameAsReported.trim())continue
  const cites=citesFor(p)
  if(!cites.length)continue
  const seasons=typeof p.seasonsAsReported==='string'?p.seasonsAsReported:null
  const {from,to}=reportedYears(seasons)
  const seasonStats=Array.isArray(p.stats)?p.stats.filter(x=>typeof x?.season==='string'&&typeof x?.competition==='string'&&Number.isInteger(x?.appearances)&&(x.goals===null||Number.isInteger(x.goals))):undefined
  const positions=Array.isArray(p.positions)?p.positions.filter(x=>['GK','DF','MF','FW'].includes(x)):[]
  findings.push({field:'player',value:p.nameAsReported.trim(),sources:cites,approved:false,archiveLink:linkOf(p),record:{kind:'player',name:p.nameAsReported.trim(),sourceUrl:typeof p.sourceUrl==='string'?p.sourceUrl:undefined,seasons,positions,fromYear:from,toYear:to,seasonStats}})
 }
 // Collector rows carry a document citation and explicit candidate status. Older package result tables stay in the report.
 for(const m of matches){
  if(m.status!=='candidate'||m.identityState==='conflict'||typeof m.on!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(m.on)||
   typeof m.home!=='string'||typeof m.away!=='string'||typeof m.competition!=='string'||typeof m.homeGoals!=='number'||typeof m.awayGoals!=='number'||
   !Number.isInteger(m.homeGoals)||!Number.isInteger(m.awayGoals))continue
  const cites=citesFor(m)
  const lineup=Array.isArray(m.lineup)&&m.lineup.length===11&&m.lineup.every(p=>typeof p==='string')?m.lineup:undefined
  const scorers=Array.isArray(m.scorers)?m.scorers.filter(g=>typeof g?.name==='string'&&(typeof g?.minute==='string'||g?.minute===null)):undefined
  const {on,home,away,homeGoals,awayGoals,competition}=m
  if(cites.length)findings.push({field:'match',value:`${on} · ${home} ${homeGoals}–${awayGoals} ${away} · ${competition}`,sources:cites,approved:false,archiveLink:linkOf(m),
   archiveMatch:{on,home,away,homeGoals,awayGoals,competition,season:typeof m.season==='string'?m.season:undefined,lineup,scorers}})
 }
 const report=[
  `REPORT · package v${manifest.researchVersion} · snapshot ${manifest.snapshotAsOf} · ${manifest.approvedForProduction} approved for production`,
  `REPORT · ${matches.length} dated matches staged — a count of what was collected, not proof of a complete archive`,
  ...(people.length?[`REPORT · ${people.length} people read from sources (${people.filter(p=>p.role==='player').length} players offered for approval, ${people.filter(p=>p.role!=='player').length} coaches/staff kept as report) — names as written`]:[]),
  ...(conflicts.length?[`REPORT · ${conflicts.length} conflicts held open: ${conflicts.map(c=>c.topic||c.matchId).join('; ')}`]:[]),
 ]
 return {sources,findings,gaps:[...report,...backlog.map(b=>`${b.priority} · ${b.taskHe||b.task||''}`)]}
}
export const packageAdapter:Adapter={id:'package',label:'Staged research package',collect,needsQuery:false,capabilities:['identity','players','package-report'],available:(clubId)=>stagingDirs(clubId).length>0}
