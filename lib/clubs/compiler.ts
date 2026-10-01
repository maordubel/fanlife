import 'server-only'
import {createHash} from 'node:crypto'
import {missingSections,timelineReadiness,type ClubData,type Diagnostic,type Fact,type HistoricalEvent,type Locale,type Source} from './contract'
import type {RegistryClub} from '@/lib/master/registry'
import {clubTheme} from './theme'
import {UI_LOCALES} from './locale'
import {eventGames,sharedReadiness} from './gate-data'
import {compilePlayers} from './players'
import {eligibleArchive} from './archive'
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{}
const text=(v:unknown)=>typeof v==='string'?v.trim():''
const list=(v:unknown):unknown[]=>Array.isArray(v)?v:[]
const id=(v:unknown)=>text(v).normalize('NFKC').toLowerCase().replace(/\s+/g,'-')
const validId=(v:string)=>/^[a-z0-9][a-z0-9_-]{0,100}$/.test(v)
const date=(v:unknown):string|null=>{const s=text(v);return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s?s:null}
const confidence=(v:unknown)=>({A_PRIMARY:3,B_SECONDARY:2,C_UNVERIFIED:1}[text(v)]??Number(v))
const hint=(s:string)=>s.replace(/\d{4}-\d{2}-\d{2}|\d{1,2}[./]\d{1,2}[./]\d{2,4}|\b(?:18|19|20)\d{2}\b|\d{2,4}\s*\/\s*\d{2,4}/g,'').replace(/\s+/g,' ').trim()
const hash=(s:string)=>createHash('sha256').update(s).digest('hex').slice(0,16)
/** Deterministic validation, not a researcher or approval service. */
export function compilePack(raw:unknown,club:RegistryClub):{data:ClubData;diagnostics:Diagnostic[]} {
 const pack=object(raw),diagnostics:Diagnostic[]=[]
 const issue=(record:string,code:string,message:string)=>diagnostics.push({record,code,message})
 if(pack.schemaVersion!==1||id(pack.clubId)!==club.id||!Array.isArray(pack.sources)||!Array.isArray(pack.archive))throw new Error('PACK_IDENTITY_OR_SCHEMA_MISMATCH')
 const sources:Source[]=[],sourceIds=new Set<string>()
 for(const input of list(pack.sources)) {
  const s=object(input),key=id(s.id);let url:URL|undefined
  try{url=new URL(text(s.url))}catch{/* reported below */}
  if(!validId(key)||sourceIds.has(key)||!url||url.protocol!=='https:'||!text(s.title)||!text(s.publisher)){issue(key,'SOURCE_INVALID','Source needs a unique id, publisher, title and HTTPS URL.');continue}
  sourceIds.add(key);sources.push({id:key,title:text(s.title),url:url.href,publisher:text(s.publisher),access:s.access==='available'?'available':s.access==='blocked'?'blocked':'unknown',checkedAt:date(s.checkedAt)})
 }
 const archive:Fact<HistoricalEvent>[]=[],seen=new Set<string>(),duplicates=new Set<string>()
 for(const input of list(pack.archive)) {
  const f=object(input),value=object(f.value),key=id(f.id)
  if(!validId(key)){issue(key,'ID_INVALID','Invalid canonical identifier.');continue}
  if(seen.has(key)){duplicates.add(key);issue(key,'CONFLICT','Duplicate canonical id; all versions quarantined.');continue}seen.add(key)
  const refs=list(f.sources).map(id),level=confidence(f.confidence)
  if(!refs.length||refs.some(ref=>!sourceIds.has(ref))){issue(key,'SOURCE_MISSING','Every fact needs valid source references.');continue}
  if(!Number.isInteger(level)||level<0||level>3||value.sport!=='football'||!text(value.name)){issue(key,'FACT_INVALID','Invalid confidence, sport or title.');continue}
  const on=date(value.on),precision=value.precision==='day'?'day':value.precision==='year'?'year':'unknown'
  if(precision==='day'&&!on){issue(key,'DATE_INVALID','Exact dates must be real ISO calendar dates.');continue}
  const year=Number.isInteger(value.year)&&Number(value.year)>=1800&&Number(value.year)<=2100?Number(value.year):null
  if(precision==='year'&&!year){issue(key,'YEAR_INVALID','Year precision requires a documented year.');continue}
  const status=['draft','review','approved','rejected','deep_research'].includes(text(f.status))?text(f.status) as FactStatus:'draft'
  const fact:Fact<HistoricalEvent>={id:`${club.id}:${key}`,value:{id:`${club.id}:${key}`,name:text(value.name),on,precision,year:precision==='year'?year:on?Number(on.slice(0,4)):null,hint:hint(text(value.hint)),sport:'football',sensitive:value.sensitive!==false},sources:refs,confidence:level as 0|1|2|3,status,researchedAt:date(f.researchedAt),approvedAt:date(f.approvedAt),approvedBy:text(f.approvedBy)||null,notes:text(f.notes)}
  if(status==='approved'&&(!fact.approvedAt||!fact.approvedBy||!fact.researchedAt)){fact.status='review';issue(key,'APPROVAL_INCOMPLETE','Approval requires actor, research date and approval date.')}
  if(status==='approved'&&fact.approvedBy?.startsWith('automated:')) {
   const independent=new Set(refs.map(ref=>sources.find(s=>s.id===ref)!.publisher.toLowerCase()))
   if(independent.size<2||level!==3||fact.value.sensitive||f.parserCertainty!=='high'||f.conflictFree!==true){fact.status='review';issue(key,'HUMAN_REVIEW','Automated approval requires two publishers, high certainty, no conflict and non-sensitive facts.')}
  }
  archive.push(fact)
 }
 for(const f of archive)if(duplicates.has(f.id.slice(club.id.length+1)))f.status='deep_research'
 const dates=new Set<string>(),timeline:ClubData['timeline']=[]
 for(const f of archive) {
  if(f.status!=='approved'||f.confidence<2)continue
  if(f.sources.some(ref=>{const s=sources.find(s=>s.id===ref)!;return s.access!=='available'||!s.checkedAt})){issue(f.id,'SOURCE_UNAVAILABLE','Blocked or unchecked sources cannot supply gameplay.');continue}
  const v=f.value
  if(!v.on||v.precision!=='day'){issue(f.id,'EXACT_DATE_REQUIRED','This eligible archive record has no exact day; never invent one for chronology.');continue}
  if(/\b(?:18|19|20)\d{2}\b/.test(v.name)){issue(f.id,'ANSWER_IN_TITLE','Title exposes its date; excluded without rewriting history.');continue}
  if(dates.has(v.on)){issue(f.id,'SAME_DAY','Chronology uses one card per date.');continue}dates.add(v.on)
  timeline.push({...f,value:{id:hash(`${club.id}:${f.id}:${v.on}`),title:v.name,hint:v.hint,on:v.on}})
 }
 timeline.sort((a,b)=>a.value.on.localeCompare(b.value.on))
 const readiness=timelineReadiness(timeline.length),content=['en','he','el','hr'].includes(text(pack.contentLocale))?text(pack.contentLocale) as Locale:'en'
 const theme=clubTheme(club),games=eventGames(timeline,sources),players=compilePlayers(pack.players,club.id,sources,diagnostics)
 return {diagnostics,data:{schemaVersion:1,version:hash(JSON.stringify({pack,club,theme})),identity:{id:club.id,name:club.name,city:club.city,country:club.country,sport:'football'},locales:{ui:'en',content,supported:[...UI_LOCALES],direction:'ltr'},theme,...missingSections,players,...games,mysteries:[],archive,timeline,sources,readiness,gates:{timeline:readiness,...sharedReadiness({players,timeline,...games,archiveCount:eligibleArchive({archive,timeline,sources,players}).length})},life:{state:'unavailable',reason:'Authored LIFE content has not been migrated.'}}}
}
type FactStatus=Fact<HistoricalEvent>['status']
