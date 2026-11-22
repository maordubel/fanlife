import {core,sameClub} from '@/lib/fixtures/names'
import type {StoredObservation} from './archive'
import {dailyFact,dailySource,digest,exactName,exactSeason,names,safeDay,words,type DailyRecord,type DailySource,type DailyWave} from './daily-evidence'

type Raw=Record<string,unknown>
export type Addition={section:'matches'|'players'|'seasons'|'kits';fact:DailyRecord;source:DailySource;extraSources?:DailySource[]}
export const OBJECT=(v:unknown):Raw=>v&&typeof v==='object'&&!Array.isArray(v)?v as Raw:{}
const SCORE=/^(\d{1,2})\s*[-–:]\s*(\d{1,2})$/
const fullXI=(v:unknown)=>{const n=names(v);return n.length===11&&new Set(n.map(exactName)).size===11?n:undefined}
export const position=(v:unknown)=>names(v).filter(n=>['GK','DF','MF','FW'].includes(n))

function checkedMatch(row:Raw,day:string,clubNames:readonly string[]){
 const printable=/^(.+?)\s+(\d{1,2})\s*[-–:]\s*(\d{1,2})\s+(.+?)$/.exec(words(row.name))
 const on=words(row.on),home=words(row.home)||printable?.[1]||'',away=words(row.away)||printable?.[4]||'',competition=words(row.competition),season=exactSeason(words(row.season))
 const score=SCORE.exec(words(row.score)||(printable?`${printable[2]}-${printable[3]}`:''))
 const own=(s:string)=>clubNames.some(n=>sameClub(n,s))
 if(!safeDay(on)||on>day||!home||!away||!score||own(home)===own(away)||!competition||/\b(?:women|female|academy|youth|reserves|U-?(?:17|18|19|20|21|23))\b/i.test(home+' '+away+' '+competition))return null
 const lineup=fullXI(row.lineup)
 const scorers=(Array.isArray(row.scorers)?row.scorers:[]).flatMap(v=>{
  const g=OBJECT(v),name=words(g.name)||words(v),m=g.minute
  const minute=typeof m==='number'&&Number.isInteger(m)&&m>0&&m<=150?m:typeof m==='string'&&/^\d{1,3}(?:\+\d{1,2})?$/.test(m)?m:null
  return name?[{name,minute}]:[]
 })
 const hg=Number(score[1]),ag=Number(score[2]),goals=own(home)?hg:ag
 return {name:`${home} ${hg}–${ag} ${away}`,on,home,away,score:`${hg}-${ag}`,homeGoals:hg,awayGoals:ag,us:own(home)?'home':'away',competition,
  ...(season?{season}:{}),...(lineup?{lineup}:{}),...(scorers.length&&scorers.length<=goals?{scorers}:{}),...(words(row.venue)?{venue:words(row.venue)}:{})}
}
function matchKey(v:Raw){return [v.on,core(words(v.home)),core(words(v.away)),v.score].join('|')}
export function publishedMatch(row:Raw,day:string,source:DailySource,clubNames:readonly string[]):Addition|null {
 const valid=checkedMatch(row,day,clubNames)
 return valid?{section:'matches',fact:dailyFact('match',matchKey(valid),valid,source),source}:null
}
export function seasonFact(value:string,source:DailySource):Addition|null{
 const season=exactSeason(value)
 return season?{section:'seasons',source,fact:dailyFact('season',season,{name:`${season} season`,season},source)}:null
}

/** Historic readers are configured per club. Retired rows, editorial catalogue pages and unparsed bytes never enter this function. */
export function fromArchive(obs:StoredObservation[],sources:Map<string,{origin:string;publisher:string;parserId:string|null}>,clubNames:readonly string[],day:string):Addition[]{
 const out: Addition[]=[]
 for(const o of obs){
  const provider=sources.get(o.providerId),at=o.runId?.slice(0,10)
  if(!provider||!safeDay(at)||at>day||o.parserVersion!==provider.parserId||o.retired)continue
  let u:URL
  try{u=new URL(o.sourceUrl)}catch{continue}
  if(u.origin!==provider.origin||u.protocol!=='https:'||u.username||u.password)continue
  const official=o.providerId==='dfb-union'?'federation':o.providerId==='union-official'?'club':undefined
  const source=dailySource(u.href,o.nameAsReported||o.seasonAsReported||o.match?.competition||provider.publisher,provider.publisher,at,official)
  if(o.recordType==='match'&&o.match){
   const m=publishedMatch({...o.match,score:`${o.match.homeGoals}-${o.match.awayGoals}`},day,source,clubNames)
   if(m)out.push(m)
  }
  if(o.recordType==='season'&&o.seasonAsReported){const found=seasonFact(o.seasonAsReported,source);if(found)out.push(found)}
  // A squad table supplies a person and a season. Global career totals are only read from explicit senior stints.
  if(o.recordType==='player'&&o.nameAsReported&&o.stats?.length){
   const name=o.lookupNames?.[0]||o.nameAsReported,years=o.stats.map(s=>exactSeason(s.season)).filter((s):s is string=>!!s).map(s=>Number(s.slice(0,4)))
   const from=years.length?Math.min(...years):null,to=years.length?Math.max(...years)+1:null,positions=position(o.positions)
   const v={name,aliases:name===o.nameAsReported?[]:[o.nameAsReported],positions,fromYear:from,toYear:to,...(!positions.length?{archiveOnly:true}:{})}
   if(from!==null)out.push({section:'players',source,fact:dailyFact('player',o.id,v,source)})
  }
 }
 return out
}
export function fromScoreFeed(feed:Raw,day:string,clubNames:readonly string[]):Addition[]{
 const sources=new Map<string,DailySource>()
 for(const raw of Array.isArray(feed.sources)?feed.sources:[]){
  const s=OBJECT(raw),checkedAt=s.checkedAt,id=words(s.id),publisher=words(s.publisher)
  if(s.access!=='available'||!publisher||!id||!safeDay(checkedAt)||checkedAt>day)continue
  try{const u=new URL(words(s.url));if(u.protocol==='https:'&&!u.username&&!u.password)sources.set(id,dailySource(u.href,words(s.title)||publisher,publisher,checkedAt))}catch{/* invalid citation */}
 }
 const out:Addition[]=[]
 for(const section of ['matches','players'] as const)for(const raw of Array.isArray(feed[section])?feed[section]:[]){
  const f=OBJECT(raw),value=OBJECT(f.value)
  if(f.status!=='approved'||f.conflictFree!==true||!['high','medium'].includes(words(f.parserCertainty))||value.sensitive===true)continue
  const cites=names(f.sources).map(id=>sources.get(id)).filter((s):s is DailySource=>!!s)
  if(!cites.length||cites.length!==names(f.sources).length)continue
  const source=cites[0]!,extraSources=cites.slice(1)
  if(section==='matches'){const available=publishedMatch(value,day,source,clubNames);if(available)out.push({...available,extraSources});continue}
  const name=words(value.name),positions=position(value.positions)
  if(name&&positions.length)out.push({section,source,extraSources,fact:dailyFact('player',words(f.id)||name,{...value,id:undefined,name,positions},source)})
 }
 return out
}

export function extendDailyWave(previous:DailyWave,additions:Addition[]){
 const wave:DailyWave={...previous,sources:[...previous.sources],archive:[...previous.archive],matches:[...previous.matches],players:[...previous.players],seasons:[...previous.seasons],kits:[...previous.kits]}
 const sourceIds=new Set(wave.sources.map(s=>s.id)),added={matches:0,players:0,seasons:0,kits:0,lineups:0,scorers:0},held:string[]=[]
 const oldDay=new Map(wave.matches.map(f=>[words(f.value.on),f]))
 const byDay=new Map<string,Set<string>>()
 for(const a of additions)if(a.section==='matches'){const day=words(a.fact.value.on),keys=byDay.get(day)||new Set<string>();keys.add(matchKey(a.fact.value));byDay.set(day,keys)}
 const explicitSeasons=additions.flatMap(a=>a.section==='matches'&&words(a.fact.value.season)?[seasonFact(words(a.fact.value.season),a.source)].filter((s):s is Addition=>!!s):[])
 for(const {section,fact,source,extraSources} of [...additions,...explicitSeasons]){
  const v=fact.value
  if(section==='matches'){
   const day=words(v.on),old=oldDay.get(day)
   if((byDay.get(day)?.size||0)>1||(old&&matchKey(old.value)!==matchKey(v))){held.push(day);continue}
  }
  const existing=section==='matches'?oldDay.get(words(v.on)):wave[section].find(f=>f.id===fact.id)
  const sources=[source,...(extraSources||[])]
  if(existing){
   const detail:Raw={}
   if(section==='matches'){
    if(!fullXI(existing.value.lineup)&&fullXI(v.lineup)){detail.lineup=v.lineup;added.lineups++}
    if(!(Array.isArray(existing.value.scorers)&&existing.value.scorers.length)&&Array.isArray(v.scorers)&&v.scorers.length){detail.scorers=v.scorers;added.scorers++}
    if(!words(existing.value.season)&&words(v.season))detail.season=v.season
   }
   if(section==='players'&&exactName(words(v.name))===exactName(words(existing.value.name))){
    if(!position(existing.value.positions).length&&position(v.positions).length){detail.positions=v.positions;detail.archiveOnly=false}
    if(!existing.value.career&&v.career)detail.career=v.career
    for(const key of ['fromYear','toYear'])if(existing.value[key]==null&&typeof v[key]==='number')detail[key]=v[key]
   }
   if(section==='seasons'&&!existing.value.league&&v.league)detail.league=v.league
   if(section==='kits')for(const key of ['construction','wikiKit','manufacturer'])if(!existing.value[key]&&v[key])detail[key]=v[key]
   if(!Object.keys(detail).length)continue
   const updated={...existing,value:{...existing.value,...detail},sources:[...new Set([...existing.sources,...sources.map(s=>s.id)])]}
   wave[section][wave[section].indexOf(existing)]=updated
   if(section==='matches')oldDay.set(words(v.on),updated)
  }else{
   const stored={...fact,sources:[...new Set(sources.map(s=>s.id))]}
   wave[section].push(stored);added[section]++
   if(section==='matches'){
    oldDay.set(words(v.on),stored)
    if(fullXI(v.lineup))added.lineups++
    if(Array.isArray(v.scorers)&&v.scorers.length)added.scorers++
    wave.archive.push({...stored,id:fact.id+'-moment',value:{name:v.name,on:v.on,precision:'day',hint:v.competition,sport:'football',sensitive:false}})
   }
  }
  for(const s of sources)if(!sourceIds.has(s.id)){wave.sources.push(s);sourceIds.add(s.id)}
 }
 return {wave,added,held:[...new Set(held)].sort(),contentId:digest(JSON.stringify(wave))}
}
