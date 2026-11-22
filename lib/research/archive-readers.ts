import type {ArchiveDocInput,ArchiveObservation,ArchiveParser} from './parsers'
import type {ArchiveRole} from './contract'

export type DocumentCategory='results'|'people'|'season'|'kits'|'club-history'|'fan-culture'|'media'|'reference'
export type ReportedMatch={on:string;home:string;away:string;homeGoals:number;awayGoals:number;competition:string;season?:string;lineup?:string[];scorers?:{name:string;minute:string|null}[]}
export type ReportedStat={season:string;competition:string;appearances:number;goals:number|null}

const segments=(url:string)=>new URL(url).pathname.split('/').filter(Boolean)
export const plain=(value:string)=>value.replace(/<[^>]+>/g,' ').replace(/&(nbsp|#160);/gi,' ').replace(/&(amp|#38);/gi,'&')
 .replace(/&(?:ndash|#8211|#x2013);/gi,'–').replace(/&(?:rsquo|#8217|#x2019);/gi,'’')
 .replace(/&#(\d{1,7});/g,(raw,n:string)=>Number(n)<=0x10ffff?String.fromCodePoint(Number(n)):raw).replace(/\s+/g,' ').trim()
export function seasonLabel(a:string,b:string){
 const y=Number(a),end=Number(b)
 if(y<1850||y>2100||(b.length===2?(y+1)%100!==end:y+1!==end))return null
 return `${a}/${String(y+1).slice(-2)}`
}
export function reportedYears(text:string|null){
 const years=(text?.match(/\b(?:18|19|20)\d{2}\b/g)||[]).map(Number)
 for(const match of (text||'').matchAll(/\b((?:18|19|20)\d{2})\s*[/–-]\s*(\d{2})\b/g))
  if(seasonLabel(match[1]!,match[2]!))years.push(Number(match[1])+1)
 return {from:years.length?Math.min(...years):null,to:years.length?Math.max(...years):null}
}
const exactSeason=(s:string)=>{
 const m=/^(\d{4})\s*[-/–]\s*(\d{2}|\d{4})$/.exec(s)
 return m?seasonLabel(m[1]!,m[2]!):null
}
function dayOn(s:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false
 const d=new Date(s+'T00:00:00Z')
 return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===s
}
export function paoMatchPage(html:string):ReportedMatch|null{
 const header=/<div\b[^>]*\bclass=["'][^"']*\bmatch-score\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i.exec(html)?.[1]
 if(!header)return null
 const field=(name:string)=>[...header.matchAll(/<span\b[^>]*class=["']([^"']+)["'][^>]*>([\s\S]*?)<\/span>/gi)]
  .filter(m=>m[1]!.split(/\s+/).includes(name)).map(m=>plain(m[2]!))
 const [home,away,...extras]=field('teamname'),[rawDate]=field('event-date'),[competition]=field('event-category')
 const date=/(\d{2})\/(\d{2})\/(\d{4})/.exec(rawDate||''),score=/^(\d{1,2})\s*-\s*(\d{1,2})$/.exec(field('results-mx')[0]||'')
 if(!home||!away||extras.length||!competition||!date||!score||!['PANATHINAIKOS','ΠΑΝΑΘΗΝΑΪΚΟΣ'].includes(home)&&!['PANATHINAIKOS','ΠΑΝΑΘΗΝΑΪΚΟΣ'].includes(away))return null
 const on=`${date[3]}-${date[2]}-${date[1]}`
 return dayOn(on)?{on,home,away,homeGoals:Number(score[1]),awayGoals:Number(score[2]),competition}:null
}
const INT=/^\d{1,3}$/
const tokens=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()
const looksLikePerson=(s:string)=>/^[\p{L}\p{M}][\p{L}\p{M} .,'’()-]{1,95}$/u.test(s)&&s.split(/\s+/).length>=2
function evidence(doc:ArchiveDocInput,parserVersion:string,recordType:ArchiveObservation['recordType'],locator:string){
 return {schemaVersion:1 as const,id:`obs:${doc.providerKey}:${recordType}`,recordType,providerRecordKey:doc.providerKey,sourceUrl:doc.url,parserVersion,locator,
  nameAsReported:null,seasonsAsReported:null,seasonAsReported:null,canonicalId:null,identityState:'unresolved' as const,status:'candidate' as const}
}
const result=(category:DocumentCategory,observations:ArchiveObservation[]=[],awaitsReader=false)=>({category,observations,diagnostics:[],awaitsReader})
const annex=/\b(?:pictures?|photos?|gallery|misc articles|supporters[’']? tales|programmes?|video|newspaper|report scan|match pics)\b/i

const celticId='celticwiki-football-v1'
const celticTeam=(s:string)=>/^(?:celtic|celtic (?:f\.?c\.?|glasgow)|glasgow celtic)$/i.test(s)
const sheetName=(s:string)=>/^[\p{L}\p{M}][\p{L}\p{M} .’'-]{1,75}$/u.test(s)
function celticTeamSheet(html:string,goals:number){
 const section=/<h[23][^>]*>\s*(?:Celtic Team|Teams)\s*<\/h[23]>([\s\S]*?)(?=<h[1-4]\b|$)/i.exec(html)?.[1]||''
 const paragraphs=[...section.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>m[1]!)
 const labelled=paragraphs.find(p=>/^Celtic Team\s*:/i.test(plain(p)))
 const first=labelled||paragraphs[0]||''
 const plainLines=first.split(/<br\s*\/?>/i).map(plain)
 const lines=plainLines.map(s=>s.replace(/^Celtic Team\s*:\s*-?\s*/i,'')).filter(s=>s&&!/^(?:Manager|Coach|Substitutes?|Reserves?|Scorers?|Referee|Attendance)\s*:/i.test(s))
 const names=lines.join(' ').replace(/\(captain\)/gi,'').split(/[,;]/).map(s=>s.trim()).filter(Boolean)
 const lineup=names.length===11&&names.every(sheetName)&&new Set(names.map(tokens)).size===11?names:undefined
 const timed=[...section.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].flatMap(([,row])=>{
  const m=/^(\d{1,3}(?:\+\d{1,2})?)[′’']\s+(.+?)\s+\d{1,2}[-–:]\d{1,2}$/.exec(plain(row||''))
  return m&&looksLikePerson(m[2]!)?[{name:m[2]!,minute:m[1]!}]:[]
 })
 const tally=labelled?plainLines.find(s=>/^Scorers?\s*:/i.test(s))?.replace(/^Scorers?\s*:\s*-?\s*/i,''):null
 const untimed=tally?.split(',').map(s=>/^(.*?)(?:\s*\((\d{1,2})\))?$/.exec(s.trim()))
 const counted=untimed?.every(m=>m&&sheetName(m[1]!)&&Number(m[2]||1)<=goals)?untimed.flatMap(m=>Array.from({length:Number(m![2]||1)},()=>({name:m![1]!,minute:null}))):[]
 const scorers=timed.length?timed:counted
 return {...(lineup?{lineup}:{}),...(scorers.length&&scorers.length===goals?{scorers}:{})}
}
export const celticWiki:ArchiveParser={id:celticId,needsTaxonomy:false,parse(doc){
 const title=plain(doc.title||''),parts=segments(doc.url)
 const top=parts[0],end=parts.at(-1)||''
 if(top==='the-photograph-library'||top==='media'||annex.test(title))return result('media')
 const match=/^(\d{4}-\d{2}-\d{2})\s*[:–]\s*(.+?)\s+(\d{1,2})\s*[-–:]\s*(\d{1,2})\s+([^,]+),\s*(.+)$/.exec(title)
 if(match&&end.startsWith(match[1]!)&&dayOn(match[1]!)&&celticTeam(match[2]!.trim())!==celticTeam(match[5]!.trim())){
  const [,on,home,hg,ag,away,competition]=match
  // Match supplements often share the result in their title, but have no team sheet of their own.
  if(!/(?:>\s*Match (?:Details|Facts)\s*<|>\s*Celtic Team\s*<)/i.test(doc.html)&&
   !(top==='celtic-games'&&/>\s*Teams\s*</i.test(doc.html)&&/Celtic Team\s*:/i.test(doc.html)))return result('reference')
  if(/[()[\]]|\b(?:abandoned|postponed|cancelled|reserves|women|youth)\b/i.test(competition!))return result('results',[],true)
  return result('results',[{...evidence(doc,celticId,'match','title.rendered; Match Details'),match:{on:on!,home:home!.trim(),away:away!.trim(),homeGoals:Number(hg),awayGoals:Number(ag),competition:competition!.trim(),...celticTeamSheet(doc.html,celticTeam(home!.trim())?Number(hg):Number(ag))}}])
 }
 if(top==='celtic-kit')return result('kits')
 if(top==='players'||top==='managers'){
  const category='people'
  const profile=/<(?:strong|b)[^>]*>\s*(?:Full name|Name)\s*:?\s*<\/(?:strong|b)>\s*:?[\s\u00a0]*([^<\r\n]+)/i.exec(doc.html)
  const name=plain(profile?.[1]??'')
  if(looksLikePerson(name))return result(category,[{...evidence(doc,celticId,top==='players'?'player':'coach','Full name field'),nameAsReported:name}])
  return result(category,[],parts.length>=3&&!/\b(?:index|list|all players|statistics)\b/i.test(title))
 }
 const season=top==='celtic-games'?exactSeason(title):null
 if(season)return result('season',[{...evidence(doc,celticId,'season','title.rendered'),seasonAsReported:season}])
 return result(top==='celtic-games'?'results':'club-history',[],top==='celtic-games'&&!!match)
}}

const rows=(html:string)=>[...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row=>[...row[1]!.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell=>plain(cell[1]!)))
const unionId='immerunioner-v1'
export const immerUnioner:ArchiveParser={id:unionId,needsTaxonomy:false,parse(doc){
 const url=new URL(doc.url),isPlayer=url.pathname==='/spieler.php',isCoach=url.pathname==='/trainerseite.php'
 const category:DocumentCategory=isPlayer||isCoach?'people':url.pathname==='/trikotliste.php'?'kits':'reference'
 if(!isPlayer&&!isCoach)return result(category)
 if(!/^\d+$/.test(url.searchParams.get('getid')||''))return result(category,[],true)
 const name=plain(doc.title||'').replace(/\s*\|\s*immerunioner\.de\s*$/i,'')
 if(!looksLikePerson(name)||!doc.title?.includes('|'))return result(category,[],true)
 const table=rows(doc.html),stats:ReportedStat[]=[]
 const header=table.findIndex(row=>row[0]==='Saison'&&row[1]==='Einsätze'&&row.includes('Tore'))
 if(isPlayer&&header>=0){
  const goalsColumn=table[header]!.indexOf('Tore')
  for(const row of table.slice(header+1)){
   const m=/^(.+?)\s+(\d{4})\/(\d{2})$/.exec(row[0]||''),apps=/^(\d{1,3})\s*\(\d{1,3}\)$/.exec(row[1]||'')
   const season=m?seasonLabel(m[2]!,m[3]!):null
   if(!season||!apps)continue
   const goals=INT.test(row[goalsColumn]||'')?Number(row[goalsColumn]):null
   stats.push({season,competition:m![1]!,appearances:Number(apps[1]),goals})
  }
 }
 const seasons=[...new Set(stats.map(s=>s.season))].sort()
 return result(category,[{...evidence(doc,unionId,isPlayer?'player':'coach',stats.length?'title; Saison / Einsätze / Tore table':'title; profile URL'),nameAsReported:name,seasonsAsReported:seasons.join(', ')||null,...(stats.length?{stats}:{})}])
}}

const partizanId='partizanopedia-v1'
const MONTHS=['januar','februar','mart','april','maj','jun','jul','avgust','septembar','oktobar','novembar','decembar']
function partizanMatches(doc:ArchiveDocInput,season:string){
 const out:ArchiveObservation[]=[]
 let competition=''
 const sections=doc.html.matchAll(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>\s*(?:<\/?br\s*\/?>\s*)*(?:<p\b[^>]*>([\s\S]*?)<\/p>)?/gi)
 for(const [,heading,paragraph] of sections){
  const title=plain(heading||'')
  if(/^Prvenstvo\s*:/i.test(title)){competition='Yugoslav league';continue}
  if(/^Kup\s*:/i.test(title)){competition='Yugoslav Cup';continue}
  if(/^[\p{L}\p{M}\s]+:$/u.test(title)){competition='';continue}
  const score=/^(.+?)\s+[-–]\s+(.+?)\s+(\d{1,2}):(\d{1,2})(?:\s+\(\d{1,2}:\d{1,2}\))?$/.exec(title)
  const date=/^(\d{1,2})\.\s+(\p{L}+)\s+(\d{4})\./u.exec(plain(paragraph||''))
  if(!competition||!score||!date||(score[1]==='Partizan')===(score[2]==='Partizan'))continue
  const month=MONTHS.indexOf(date[2]!.toLowerCase())+1
  const on=`${date[3]}-${String(month).padStart(2,'0')}-${date[1]!.padStart(2,'0')}`
  if(!dayOn(on))continue
  out.push({...evidence(doc,partizanId,'match','modal match heading and date'),id:`obs:${doc.providerKey}:match:${on}:${tokens(score[1]!)}:${tokens(score[2]!)}`,
   match:{on,home:score[1]!,away:score[2]!,homeGoals:Number(score[3]),awayGoals:Number(score[4]),competition,season}})
 }
 return out
}
export const partizanopedia:ArchiveParser={id:partizanId,needsTaxonomy:false,parse(doc){
 const last=segments(doc.url).at(-1)||'',title=plain(doc.title||'').replace(/\s+-\s+Partizanopedia$/i,'')
 const season=exactSeason(title)
 if(season)return result('season',[{...evidence(doc,partizanId,'season','title'),seasonAsReported:season},...partizanMatches(doc,season)])
 if(/^igraci[\p{L}0-9-]+\.html$/iu.test(last)){
  const table=rows(doc.html),out:ArchiveObservation[]=[]
  for(const [i,row] of table.entries()){
   const [name,years,apps,goals]=row
   if(!name||!looksLikePerson(name)||!years||!/(?:19|20)\d{2}/.test(years)||!INT.test(apps||'')||!INT.test(goals||''))continue
   out.push({...evidence(doc,partizanId,'player',`player table row ${i+1}`),id:`obs:${doc.providerKey}:player:${tokens(name)}:${years}`,nameAsReported:name,seasonsAsReported:years})
  }
  return result('people',out,out.length===0)
 }
 return result('reference')
}}

const unionOfficialId='union-official-seasons-v1'
export const unionOfficial:ArchiveParser={id:unionOfficialId,needsTaxonomy:false,parse(doc){
 const id=new URL(doc.url).searchParams.get('season')
 if(!id||!/^[-a-f0-9]{36}$/i.test(id))return result('results',[],true)
 const element=[...doc.html.matchAll(/<li\b[^>]+\bid=["']season-([-a-f0-9]+)["'][^>]*>([\s\S]*?)<\/li>/gi)].find(m=>m[1]===id)
 const season=exactSeason(plain(element?.[2]||''))
 return season?result('season',[{...evidence(doc,unionOfficialId,'season','selected season ID and label'),seasonAsReported:season}],true):result('results',[],true)
}}

const dfbId='dfb-club-results-v1'
const dfbCompetitions:Record<string,string>={bundesliga:'Bundesliga','2-bundesliga':'2. Bundesliga','dfb-pokal':'DFB-Pokal'}
export const dfbUnion:ArchiveParser={id:dfbId,needsTaxonomy:false,parse(doc){
 const out:ArchiveObservation[]=[]
 for(const row of doc.html.split(/class=["']c-MatchTable-row["']/i).slice(1)){
  const id=/\bid=["']match_(\d+)["']/.exec(row)?.[1]
  const date=/\b(\d{4}-\d{2}-\d{2})\b/.exec(row)?.[1]
  const side=(part:'home'|'away')=>{
   const box=row.split(`c-MatchTable-team--${part}`)[1]?.split('</div>')[0]||''
   return plain(/<a\b[^>]*>([\s\S]*?)<\/a>/i.exec(box)?.[1]||'')
  }
  const home=side('home'),away=side('away')
  const score=/c-MatchTable-score["'][^>]*>\s*<a\b[^>]*href=["'][^"']*\/data-center\/([a-z0-9-]+)\/(\d{4})-(\d{2}|\d{4})\/[^/"']+\/(\d+)["'][^>]*>\s*(\d{1,2})\s*:\s*(\d{1,2})\s*<\/a>/i.exec(row)
  if(!id||!date||!dayOn(date)||!home||!away||(home==='1. FC Union Berlin')===(away==='1. FC Union Berlin')||!score||score[4]!==id)continue
  const competition=dfbCompetitions[score[1]!],season=seasonLabel(score[2]!,score[3]!)
  if(!competition||!season)continue
  out.push({...evidence(doc,dfbId,'match',`#match_${id} · home/away and score link`),id:`obs:${doc.providerKey}:dfb:${id}`,
   match:{on:date,home,away,homeGoals:Number(score[5]),awayGoals:Number(score[6]),competition,season}})
 }
 return result('results',out,out.length===0)
}}

const nftId='national-football-teams-squad-v1'
const positions:Record<string,'GK'|'DF'|'MF'|'FW'>={
 'Goalkeeper':'GK','Defender':'DF','Left Back':'DF','Right Back':'DF','Centre Back':'DF','Sweeper':'DF','Midfielder':'MF',
 'Defensive Midfielder':'MF','Central Midfielder':'MF','Attacking Midfielder':'MF','Left Midfielder':'MF','Right Midfielder':'MF',
 'Forward':'FW','Centre Forward':'FW','Striker':'FW','Left Winger':'FW','Right Winger':'FW',
}
export const nationalFootballTeams:ArchiveParser={id:nftId,needsTaxonomy:false,parse(doc){
 const title=/^(.+?)\s+\((\d{4}\/\d{2})\)\s+\|\s+National Football Teams$/.exec(doc.title||'')
 const season=title?exactSeason(title[2]!):null
 if(!season)return result('people',[],true)
 const tables=[...doc.html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(([,body])=>rows(body!))
 const table=tables.find(t=>t.some(r=>r.join('|')==='|Name|Day of Birth|Land of Origin|Position|Season|M|G'))
 if(!table)return result('people',[],true)
 const out:ArchiveObservation[]=[]
 for(const [i,r] of table.entries()){
  const [,reported,,,position,s,appearances,goals]=r
  if(s!==season||!reported||!looksLikePerson(reported))continue
  const name=reported.replace(/\s*,\s*/g,', '),parts=name.split(', '),lookup=parts.length===2?[parts[1]+' '+parts[0]]:[]
  const stats=INT.test(appearances||'')?[{season,competition:'National Football Teams club table',appearances:Number(appearances),goals:INT.test(goals||'')?Number(goals):null}]:[]
  out.push({...evidence(doc,nftId,'player',`squad table row ${i+1}`),id:`obs:${doc.providerKey}:squad:${tokens(name)}`,
   nameAsReported:name,lookupNames:lookup,seasonsAsReported:season,positions:position&&positions[position]?[positions[position]]:[],stats})
 }
 return result('people',out,out.length===0)
}}

export function catalogueCategory(role:ArchiveRole):DocumentCategory{
 switch(role){
  case 'results':return 'results'
  case 'people':return 'people'
  case 'club-history':return 'club-history'
  case 'fan-culture':return 'fan-culture'
  case 'items':return 'kits'
  default:return 'reference'
 }
}
/** Editorial and museum sources contribute a catalogue record. Article and publication dates are never match evidence. */
export const editorialCatalogue:ArchiveParser={id:'editorial-catalogue-v1',needsTaxonomy:false,parse(doc){
 const title=doc.title||''
 const category=/^(?:Vor|Nach) dem Spiel\b/i.test(title)?'fan-culture':catalogueCategory(doc.role||'mixed')
 return result(category)
}}
