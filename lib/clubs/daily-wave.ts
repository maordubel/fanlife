import 'server-only'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {sameClub} from '@/lib/fixtures/names'
import {enClub} from '@/lib/trivia/names'
import {canonClub} from '@/lib/trivia/club-names'
import {compilePack} from './compiler'
import {eligibleArchive} from './archive'
import {eventGames,sharedReadiness} from './gate-data'
import {timelineReadiness,type ClubData,type Diagnostic,type Entity,type Fact} from './contract'
import type {RegistryClub} from '@/lib/master/registry'
import type {DailyWave} from '@/lib/research/daily-evidence'
import {exactName,exactSeason,words} from '@/lib/research/daily-evidence'

export const dailyWavePath=(clubId:string)=>join('research-data','daily-waves',clubId+'.json')
export function readDailyWave(clubId:string):DailyWave|null {
 if(!/^[a-z][a-z0-9-]+$/.test(clubId))return null
 try{return JSON.parse(readFileSync(dailyWavePath(clubId),'utf8')) as DailyWave}
 catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e}
}
type ClubResult={data:ClubData;diagnostics:Diagnostic[]}
type MatchValue=Entity&{on?:string;home?:string;away?:string;homeGoals?:number;awayGoals?:number;us?:string;score?:string;lineup?:unknown[];scorers?:unknown[];season?:string;venue?:string;competition?:string}
type Seasonal=Entity&{season?:string;type?:string}
const missing=(v:unknown)=>!v||(Array.isArray(v)&&!v.length)
function match(value:MatchValue){
 const title=/^(.+?)\s+(\d{1,2})\s*[-–:]\s*(\d{1,2})\s+(.+?)(?:\s*\([^()]+\))?$/.exec(value.name)
 return {home:value.home||title?.[1]||'',away:value.away||title?.[4]||'',score:value.score?.replace(/[–:\s]/g,c=>c.trim()?'-':'')||(title?`${title[2]}-${title[3]}`:'')}
}
function sameMatch(a:MatchValue,b:MatchValue){
 const aa=match(a),bb=match(b)
 const team=(name:string)=>canonClub(enClub(name)??name)
 return !!(aa.home&&aa.away&&aa.score&&bb.home&&bb.away&&aa.score===bb.score&&sameClub(team(aa.home),team(bb.home))&&sameClub(team(aa.away),team(bb.away)))
}
const seasonalKey=(v:Entity)=>{
 const s=v as Seasonal
 return `${exactSeason(s.season||s.name)||words(s.season)||s.name}|${words(s.type).toUpperCase()}`
}
const addSeasonal=(base:Fact<Entity>[]|null,incoming:Fact<Entity>[]|null)=>{
 if(!incoming?.length)return base
 const out=[...(base||[])],indices=new Map<string,number[]>()
 for(const [i,row] of out.entries()){
  const key=seasonalKey(row.value)
  indices.set(key,[...(indices.get(key)||[]),i])
 }
 for(const row of incoming){
  const key=seasonalKey(row.value),matches=indices.get(key)||[]
  if(!matches.length){indices.set(key,[out.length]);out.push(row);continue}
  if(matches.length!==1)continue
  const i=matches[0]!,prior=out[i]!,old=prior.value as Entity&Record<string,unknown>,fresh=row.value as Entity&Record<string,unknown>
  const fields=old.type||fresh.type?['referenceUrl']:['league','count','seasons','documentedCount']
  const added=Object.fromEntries(fields
   .filter(field=>old[field]==null&&fresh[field]!=null).map(field=>[field,fresh[field]]))
  if(Object.keys(added).length)out[i]={...prior,value:{...old,...added},sources:[...new Set([...prior.sources,...row.sources])]}
 }
 return out
}
export function integrateDailyWave(base:ClubResult,club:RegistryClub,wave:DailyWave|null):ClubResult{
 if(!wave?.sources.length)return base
 const checked=compilePack(wave,club),original=base.data,incoming=checked.data
 const diagnostics=[...base.diagnostics,...checked.diagnostics]
 const matches=[...(original.matches||[])],byDay=new Map<string,number[]>()
 for(const [i,m] of matches.entries()){const on=(m.value as MatchValue).on;if(on)byDay.set(on,[...(byDay.get(on)||[]),i])}
 const incomingDays=new Map<string,Fact<Entity>[]>()
 for(const f of incoming.matches||[]){const day=(f.value as MatchValue).on;if(day)incomingDays.set(day,[...(incomingDays.get(day)||[]),f])}
 const publicMatchIds=new Set<string>()
 for(const [day,rows] of incomingDays){
  const candidates=byDay.get(day)||[]
  if(rows.length!==1||candidates.length>1){
   diagnostics.push({record:day,code:'DAILY_MATCH_AMBIGUOUS',message:'Several matches share this date. Existing records are preserved.'});continue
  }
  const f=rows[0]!,v=f.value as MatchValue
  if(!candidates.length){byDay.set(day,[matches.length]);matches.push(f);publicMatchIds.add(f.id);continue}
  const i=candidates[0]!,prior=matches[i]!,old=prior.value as MatchValue
  if(!sameMatch(old,v)){diagnostics.push({record:f.id,code:'DAILY_MATCH_CONFLICT',message:'Different opponents, home/away order or score on the same day.'});continue}
  const additions:Record<string,unknown>={}
  if((old.lineup?.length||0)!==11&&v.lineup?.length===11)additions.lineup=v.lineup
  for(const key of ['scorers','venue','season','competition'] as const)if(missing(old[key])&&!missing(v[key]))additions[key]=v[key]
  for(const key of ['home','away','homeGoals','awayGoals','us'] as const)if(old[key]==null&&v[key]!=null)additions[key]=v[key]
  if(Object.keys(additions).length)matches[i]={...prior,value:{...old,...additions},sources:[...new Set([...prior.sources,...f.sources])]}
 }
 const players=[...(original.players||[])],nameKeys=new Map<string,Set<number>>()
 function remember(index:number){
  const p=players[index]!.value
  for(const n of [p.name,...p.aliases].map(exactName)){const ids=nameKeys.get(n)||new Set<number>();ids.add(index);nameKeys.set(n,ids)}
 }
 players.forEach((_,i)=>remember(i))
 for(const f of incoming.players||[]){
  const p=f.value,links=new Set([p.name,...p.aliases].flatMap(n=>[...(nameKeys.get(exactName(n))||[])]))
  if(!links.size){players.push(f);remember(players.length-1);continue}
  if(links.size!==1){diagnostics.push({record:f.id,code:'DAILY_PLAYER_AMBIGUOUS',message:'The reported name matches more than one existing player.'});continue}
  const i=[...links][0]!,prior=players[i]!,old=prior.value
  if((old.toYear!==null&&p.fromYear!==null&&p.fromYear>old.toYear)||(p.toYear!==null&&old.fromYear!==null&&old.fromYear>p.toYear)){
   diagnostics.push({record:f.id,code:'DAILY_PLAYER_PERIOD_CONFLICT',message:'The reported player period does not overlap the existing record.'});continue
  }
  const position=!old.positions.length&&p.positions.length>0,career=!old.career&&!!p.career,eligible=old.archiveOnly&&p.positions.length>0&&!p.archiveOnly
  if(position||career||eligible)players[i]={...prior,value:{...old,...(position?{positions:p.positions}:{}),...(career?{career:p.career}:{}),...(eligible?{archiveOnly:undefined}:{})},sources:[...new Set([...prior.sources,...f.sources])]}
 }
 const sources=[...original.sources,...incoming.sources.filter(s=>!original.sources.some(x=>x.id===s.id))]
 const archive=[...original.archive,...incoming.archive.filter(f=>publicMatchIds.has(f.id.replace(/-moment$/,'')))]
 const existingDays=new Set(original.timeline.map(e=>e.value.on))
 const addedTimeline=incoming.timeline.filter(e=>publicMatchIds.has(e.id.replace(/-moment$/,''))&&!existingDays.has(e.value.on))
 const timeline=[...original.timeline,...addedTimeline].sort((a,b)=>a.value.on.localeCompare(b.value.on))
 const readiness=timelineReadiness(timeline.length),extra=eventGames(addedTimeline,sources)
 const trivia={...original.trivia,questions:[...original.trivia.questions,...extra.trivia.questions]}
 const memory=[...original.memory,...extra.memory],version=createHash('sha256').update(original.version).update(JSON.stringify(wave)).digest('hex').slice(0,16)
 const data={...original,version,matches:matches.length?matches:original.matches,players:players.length?players:original.players,
  seasons:addSeasonal(original.seasons,incoming.seasons),kits:addSeasonal(original.kits,incoming.kits),trophies:addSeasonal(original.trophies,incoming.trophies),archive,timeline,trivia,memory,readiness,sources}
 return {diagnostics,data:{...data,gates:{...original.gates,timeline:readiness,...sharedReadiness({...data,archiveCount:eligibleArchive(data).length})}}}
}
export function withDailyWave(base:ClubResult,club:RegistryClub){
 return integrateDailyWave(base,club,readDailyWave(club.id))
}
