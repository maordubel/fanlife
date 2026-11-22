import type {OfficialBody} from '@/lib/clubs/official'
import {politeFetch,type FetchLike} from './fetcher'
import {plain,seasonLabel} from './archive-readers'
import {createHash} from 'node:crypto'

export type DailySource={id:string;url:string;title:string;publisher:string;checkedAt:string;access:'available';official?:OfficialBody}
export type DailyRecord={id:string;value:Record<string,unknown>;sources:string[];status:'approved';confidence:2|3;parserCertainty:'high';conflictFree:true;researchedAt:string;approvedAt:string;approvedBy:string}
export type DailyWave={schemaVersion:1;clubId:string;contentLocale:'en';sources:DailySource[];archive:DailyRecord[];matches:DailyRecord[];players:DailyRecord[];seasons:DailyRecord[];kits:DailyRecord[]}
export const digest=(v:string)=>createHash('sha256').update(v).digest('hex').slice(0,24)
export const blankWave=(clubId:string):DailyWave=>({schemaVersion:1,clubId,contentLocale:'en',sources:[],archive:[],matches:[],players:[],seasons:[],kits:[]})
export const dailySource=(url:string,title:string,publisher:string,day:string,official?:OfficialBody):DailySource=>({id:'daily-src-'+digest(url),url,title,publisher,checkedAt:day,access:'available',...(official?{official}:{})})
export const dailyFact=(kind:string,key:string,value:Record<string,unknown>,source:DailySource):DailyRecord=>({
 id:'daily-'+kind+'-'+digest(key),value:{...value,sport:'football',sensitive:false},sources:[source.id],status:'approved',confidence:source.official?3:2,parserCertainty:'high',conflictFree:true,researchedAt:source.checkedAt,approvedAt:source.checkedAt,approvedBy:'automated:daily-research-single-source'
})
export const exactName=(s:string)=>plain(s).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()
export const exactSeason=(s:string)=>{
 const m=/^(\d{4})\s*[-/–]\s*(\d{2}|\d{4})$/.exec(s.trim())
 return m?seasonLabel(m[1]!,m[2]!):null
}
export const safeDay=(s:unknown):s is string=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s
export const words=(v:unknown)=>typeof v==='string'?v.trim():''
export const names=(v:unknown):string[]=>Array.isArray(v)?v.filter((s):s is string=>typeof s==='string'&&!!s.trim()):[]

const CLUB_PAGES:Record<string,string>={
 'hapoel-tel-aviv':'Hapoel Tel Aviv F.C.','hapoel-petah-tikva':'Hapoel Petah Tikva F.C.','maccabi-haifa':'Maccabi Haifa F.C.',
 'zrinjski-mostar':'HŠK Zrinjski Mostar',olympiacos:'Olympiacos F.C.',panathinaikos:'Panathinaikos F.C.','aek-athens':'AEK Athens F.C.',paok:'PAOK FC',
 'dinamo-zagreb':'GNK Dinamo Zagreb','hajduk-split':'HNK Hajduk Split','st-pauli':'FC St. Pauli','borussia-dortmund':'Borussia Dortmund',
 'leicester-city':'Leicester City F.C.',atalanta:'Atalanta BC',celtic:'Celtic F.C.','partizan-belgrade':'FK Partizan',
 'union-berlin':'1. FC Union Berlin',fenerbahce:'Fenerbahçe S.K. (football)','raja-casablanca':'Raja CA','wydad-casablanca':'Wydad AC','al-ahly':'Al Ahly SC'
}
export const wikiTitle=(club:string)=>CLUB_PAGES[club]??null
/** Member links and the next page are taken from the public category page's own listing. */
export function wikiCategory(html:string,url:URL){
 const start=html.search(/\bid=["']mw-pages["']/)
 if(start<0)throw new Error('Wikipedia category member list was unavailable')
 const page=html.slice(start).split(/\bid=["'](?:catlinks|mw-normal-catlinks|printfooter)["']/)[0]!
 const members=new Set<string>()
 let next:string|null=null
 for(const m of page.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  const link=new URL(m[1]!.replace(/&amp;/gi,'&'),url)
  if(link.origin!==url.origin)continue
  if(decodeURIComponent(link.pathname)===decodeURIComponent(url.pathname)&&link.searchParams.has('pagefrom')&&/^next page$/i.test(plain(m[2]!))){link.hash='';next=link.href;continue}
  if(!link.pathname.startsWith('/wiki/')||link.search||link.hash)continue
  const name=decodeURIComponent(link.pathname.slice(6)).replaceAll('_',' ')
  if(name&&!name.includes(':')&&!name.includes('/'))members.add(name)
 }
 return {members:[...members],next}
}
export const KIT_PAGES:Record<string,string>={
 'hapoel-tel-aviv':'hapoel-tel-aviv','hapoel-petah-tikva':'hapoel-petah-tikva','maccabi-haifa':'maccabi-haifa','zrinjski-mostar':'hsk-zrinjski-mostar',
 olympiacos:'olympiacos',panathinaikos:'panathinaikos','aek-athens':'aek-athens',paok:'paok','dinamo-zagreb':'dinamo-zagreb',
 'hajduk-split':'hajduk-split','st-pauli':'fc-st-pauli','borussia-dortmund':'borussia-dortmund','leicester-city':'leicester-city',
 atalanta:'atalanta-bc',celtic:'celtic-fc','partizan-belgrade':'fk-partizan','union-berlin':'1-fc-union-berlin',fenerbahce:'fenerbahce',
 'raja-casablanca':'raja-casablanca','wydad-casablanca':'wydad-casablanca','al-ahly':'al-ahly'
}

export async function dailyFetch(url:URL,fetchImpl?:FetchLike){
 const out=await politeFetch(url.href,{providerId:'daily-public',familyId:url.hostname,origin:url.origin,adapterVersion:'v1',paths:{},capabilities:[],rate:{minIntervalMs:1500,maxBytes:5_242_880,timeoutMs:15000},scope:'factual club research'},null,fetchImpl)
 if(out.kind!=='fetched')throw new Error(`${url.hostname}: ${'reason' in out?out.reason:out.kind}`)
 return {text:out.body.toString('utf8'),type:out.meta.contentType}
}

export type Biography={name:string;aliases:string[];positions:string[];fromYear:number|null;toYear:number|null;career?:{apps:number;goals:number;basis:string}}
const POSITION:Record<string,string>={'goalkeeper':'GK','defender':'DF','right back':'DF','left back':'DF','centre back':'DF','center back':'DF','sweeper':'DF','full back':'DF','midfielder':'MF','central midfielder':'MF','defensive midfielder':'MF','attacking midfielder':'MF','forward':'FW','striker':'FW','centre forward':'FW','center forward':'FW','winger':'FW'}
function wikiField(text:string,key:string){
 const match=new RegExp('^\\s*\\|\\s*'+key+'\\s*=\\s*(.*)$','mi').exec(text)
 return plain((match?.[1]||'').replace(/<ref\b[^>]*\/>|<ref\b[^>]*>[\s\S]*?<\/ref>/gi,'').replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g,'$1'))
}
/** First-team senior stints only. The category is discovery; the player's own infobox must name the club. */
export function readBiography(title:string,wikitext:string,clubNames:readonly string[]):Biography|null {
 const start=/\{\{Infobox (?:football biography|footballer)\b/i.exec(wikitext)
 if(!start)return null
 let depth=0,end=0
 for(const m of wikitext.slice(start.index).matchAll(/\{\{|\}\}/g)){depth+=m[0]==='{{'?1:-1;if(!depth){end=start.index+m.index+2;break}}
 if(end<=start.index)return null
 const box=wikitext.slice(start.index,end),known=new Set(clubNames.map(exactName))
 const from:number[]=[],to:number[]=[],caps:number[]=[],goals:number[]=[]
 let matched=0,open=false
 for(let i=1;i<=40;i++){
  const team=wikiField(box,'clubs'+i).replace(/^→\s*/,'').replace(/\s*\(loan\)$/i,'')
  if(!team||!known.has(exactName(team))||/\b(?:academy|youth|reserves|U-?\d\d)\b/i.test(team))continue
  matched++
  const years=/^(\d{4})(?:\s*[-–]\s*(\d{4})?)?$/.exec(wikiField(box,'years'+i))
  if(years){from.push(Number(years[1]));if(years[2])to.push(Number(years[2]));else if(/[-–]/.test(years[0]))open=true;else to.push(Number(years[1]))}
  const games=wikiField(box,'caps'+i),scored=wikiField(box,'goals'+i)
  if(/^\d{1,4}$/.test(games))caps.push(Number(games))
  if(/^\d{1,4}$/.test(scored))goals.push(Number(scored))
 }
 if(!matched)return null
 const name=title.replace(/\s*\([^()]+\)$/,'').trim(),pos=POSITION[exactName(wikiField(box,'position'))]
 if(!name||name.length>100||/[:<>]/.test(name))return null
 return {name,aliases:title===name?[]:[title],positions:pos?[pos]:[],fromYear:from.length?Math.min(...from):null,toYear:!open&&to.length?Math.max(...to):null,
  ...(caps.length===matched&&goals.length===matched?{career:{apps:caps.reduce((a,b)=>a+b,0),goals:goals.reduce((a,b)=>a+b,0),basis:'English Wikipedia club stint table'}}:{})}
}

export function kitRecords(html:string,slug:string,clubNames:readonly string[],day:string){
 // Accept only the club catalogue and kit entries whose text explicitly names club, season and variant.
 const heading=plain(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1]||'').replace(/\s+Kit History$/i,'')
 const aliases=new Set([...clubNames,slug.replaceAll('-',' ')].map(exactName))
 if(!heading||!aliases.has(exactName(heading)))throw new Error('Kit catalogue club heading did not match')
 const rows=new Map<string,{source:DailySource;fact:DailyRecord}>(),variants=new Map<string,Set<string>>()
 for(const m of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  const raw=m[2]!,label=plain(raw.match(/\balt=["']([^"']+)["']/i)?.[1]||raw)
  const t=/^(.+?)\s+(\d{4})[-–/](\d{2}|\d{4})\s+(Home|Away|Third)\s+Kit$/i.exec(label)
  if(!t||!aliases.has(exactName(t[1]!)))continue
  const season=seasonLabel(t[2]!,t[3]!)
  if(!season||Number(season.slice(0,4))>Number(day.slice(0,4)))continue
  const u=new URL(m[1]!,'https://www.footballkitarchive.com')
  if(u.origin!=='https://www.footballkitarchive.com'||!u.pathname.startsWith('/'+slug+'-'+t[2]+'-')||!/^\/[a-z0-9-]+-kit(?:\/\d+)?\/$/.test(u.pathname))continue
  const type=t[4]!.toUpperCase(),key=season+'/'+type
  const links=variants.get(key)??new Set<string>();links.add(u.pathname);variants.set(key,links)
  const source=dailySource(`https://www.footballkitarchive.com/${slug}-kits/`,`${heading} Kit History`,'Football Kit Archive',day)
  rows.set(key,{source,fact:dailyFact('kit',key,{name:`${heading} ${season} ${t[4]} kit`,type,season,referenceUrl:u.href},source)})
 }
 return [...rows.entries()].filter(([k])=>variants.get(k)?.size===1).map(([,r])=>r)
}
