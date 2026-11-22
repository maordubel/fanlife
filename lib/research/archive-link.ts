import {existsSync,readFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import type {StoredObservation} from './archive'
import {reportedYears} from './archive-readers'

type Row=Record<string,unknown>
type Candidate={id:string;section:'players'|'matches'|'seasons';value:Row}
type Status={canonicalId:string|null;identityState:'linked'|'ambiguous'|'conflict'|'unresolved'}
const obj=(v:unknown):Row=>v&&typeof v==='object'&&!Array.isArray(v)?v as Row:{}
const str=(v:unknown)=>typeof v==='string'?v:''
const key=(name:string)=>name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ')
const array=(v:unknown):unknown[]=>Array.isArray(v)?v:[]
const HEADING=/^(.+?)\s+(\d{1,2})\s*[-–:]\s*(\d{1,2})\s+(.+?)$/
const teamKey=(name:string)=>key(name).replace(/\./g,'')
const team=(name:string)=>['celtic','celtic fc','glasgow celtic','celtic glasgow'].includes(teamKey(name))?'celtic':teamKey(name)
function matchOf(row:Row){
 const date=str(row.on), title=HEADING.exec(str(row.name))
 const home=str(row.home)||title?.[1]||'',away=str(row.away)||title?.[4]||''
 const score=Number.isInteger(row.homeGoals)&&Number.isInteger(row.awayGoals)?`${row.homeGoals}-${row.awayGoals}`:str(row.score)||(title?`${title[2]}-${title[3]}`:'')
 return date&&home&&away&&/^\d+-\d+$/.test(score)?{date,home:team(home),away:team(away),score}:null
}
function fromFile(file:string,clubId:string):Candidate[]{
 const pack=obj(JSON.parse(readFileSync(file,'utf8')))
 if((pack.clubId&&pack.clubId!==clubId)||(pack.club&&pack.club!==clubId))return []
 return (['players','matches','seasons'] as const).flatMap(section=>array(pack[section]).map(obj).flatMap(row=>
  row.status==='approved'&&typeof row.id==='string'?[{id:row.id,section,value:obj(row.value)}]:[]))
}

export function researchTargets(clubId:string,cwd=process.cwd()){
 if(!/^[a-z][a-z0-9-]{1,60}$/.test(clubId))throw new Error('Invalid club id')
 const directories=[join(cwd,'club-packs',clubId),join(cwd,'research-staging',clubId)]
 return directories.flatMap(dir=>existsSync(dir)?readdirSync(dir).filter(n=>n==='core.json'||/^wave-.*\.json$/.test(n)).sort().flatMap(n=>fromFile(join(dir,n),clubId)):[])
}

export function researchLinker(candidates:Candidate[]){
 const indexes={players:new Map<string,Candidate[]>(),matches:new Map<string,Candidate[]>(),seasons:new Map<string,Candidate[]>()}
 const matchKey=(date:string,home:string,away:string)=>JSON.stringify([date,home,away])
 for(const c of candidates){
  const m=c.section==='matches'?matchOf(c.value):null
  const keys=c.section==='players'?[c.value.name,...array(c.value.aliases)].map(str).map(key):
   c.section==='seasons'?[str(c.value.season)]:m?[matchKey(m.date,m.home,m.away)]:[]
  const index=indexes[c.section]
  for(const k of new Set(keys.filter(Boolean))){const rows=index.get(k);if(rows)rows.push(c);else index.set(k,[c])}
 }
 return (observation:StoredObservation):Status=>{
 let found:Candidate[]=[]
 if(observation.recordType==='player'&&observation.nameAsReported){
  const names=[observation.nameAsReported,...(observation.lookupNames||[])].map(key)
  const {from,to}=reportedYears(observation.seasonsAsReported)
  found=names.flatMap(name=>indexes.players.get(name)||[]).filter(c=>
   !(from!==null&&typeof c.value.toYear==='number'&&from>c.value.toYear)&&
   !(to!==null&&typeof c.value.fromYear==='number'&&to<c.value.fromYear))
 }else if(observation.recordType==='match'&&observation.match){
  const m=observation.match,score=`${m.homeGoals}-${m.awayGoals}`
  const same=indexes.matches.get(matchKey(m.on,team(m.home),team(m.away)))||[]
  found=same.filter(c=>matchOf(c.value)?.score===score)
  if(same.some(c=>matchOf(c.value)?.score!==score))return {canonicalId:null,identityState:'conflict'}
 }else if(observation.recordType==='season'&&observation.seasonAsReported){
  found=indexes.seasons.get(observation.seasonAsReported)||[]
 }
 const ids=[...new Set(found.map(c=>c.id))]
 return ids.length===1?{canonicalId:ids[0]!,identityState:'linked'}:{canonicalId:null,identityState:ids.length>1?'ambiguous':'unresolved'}
 }
}
