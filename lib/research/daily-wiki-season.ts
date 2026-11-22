import {sameClub} from '@/lib/fixtures/names'
import {dailyFact,exactSeason,safeDay,type DailySource} from './daily-evidence'
import {publishedMatch,type Addition} from './daily-project'

const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December']
function balanced(text:string,start:number):string{
 let level=0
 for(const token of text.slice(start).matchAll(/\{\{|\}\}/g)){
  level+=token[0]==='{{'?1:-1
  if(level===0)return text.slice(start,start+token.index+2)
 }
 return ''
}
function label(text:string){
 return text.replace(/<ref\b[^>]*\/>|<ref\b[^>]*>[\s\S]*?<\/ref>/gi,'').replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g,'$1').replace(/<[^>]*>/g,' ').replace(/'{2,}/g,'').trim()
}
function fields(block:string):Map<string,string>{
 const list=Array.from(block.matchAll(/^\s*\|\s*([a-z][a-z0-9 _]*)\s*=/gmi))
 return new Map(list.map((m,i)=>[m[1]!.trim().toLowerCase(),block.slice(m.index+m[0].length,list[i+1]?.index??-2).trim()]))
}
function localDate(value:string){
 const iso=/^\{\{(?:start date|date)\s*\|\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})(?:\|[^}]+)?\}\}$/i.exec(value)
 if(iso)return `${iso[1]}-${iso[2]!.padStart(2,'0')}-${iso[3]!.padStart(2,'0')}`
 const named=/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(label(value))
 if(!named)return label(value)
 const month=MONTHS.findIndex(m=>m.toLowerCase()===named[2]!.toLowerCase())+1
 return `${named[3]}-${String(month).padStart(2,'0')}-${named[1]!.padStart(2,'0')}`
}
function goals(text:string){
 return text.split('\n').flatMap(row=>{
  const m=/^\s*\*\s*\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\s+\{\{goal\s*\|\s*(\d{1,3}(?:\+\d{1,2})?)(?:\s*\|\s*pen\.?\s*)?\s*\}\}\s*$/i.exec(row)
  return m?[{name:m[1]!.replace(/\s*\([^()]+\)$/,'').trim(),minute:m[2]!}]:[]
 })
}
const category=/\b(?:cup|league|liga|ligue|serie|bundesliga|premiership|premier|division|trophy|championship|champions|europa|conference|championnat)\b/i
const GENERIC=/^(?:league|league matches|cup|competition|competitions|results|results and fixtures|matches|fixtures|league table|overview|group stage|knockout phase)$/i
const COLOURS:Record<string,string>={'ffffff':'white','000000':'black','ff0000':'red','0000ff':'blue','008000':'green','ffff00':'yellow'}
const hex=(s:string)=>/^[a-f\d]{6}$/i.test(s)?s.toLowerCase():null
function squad(text:string,season:string,source:DailySource):Addition[]{
 const section=/^={2,6}\s*(?:First[- ]team squad|First[- ]team players)\s*={2,6}\s*$/im.exec(text)
 if(!section)return []
 const body=text.slice(section.index+section[0].length).split(/^={2,6}\s*/m)[0]!,year=Number(season.slice(0,4))
 return [...body.matchAll(/\{\{Fs player\b([^\r\n]+)\}\}/gi)].flatMap(([,row])=>{
  const pos=/\|\s*pos\s*=\s*(GK|DF|MF|FW)\s*(?:\||$)/i.exec(row!)?.[1]?.toUpperCase()
  const nameRow=/\|\s*name\s*=\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/i.exec(row!)
  if(!pos||!nameRow)return []
  const page=nameRow[1]!.trim(),name=(nameRow[2]||page).trim()
  if(!name||name.length>100||/[:<>]/.test(page))return []
  return [{section:'players' as const,source,fact:dailyFact('player','wiki:'+page,{
   name,aliases:page===name?[]:[page],positions:[pos],fromYear:year,toYear:year+1
  },source)}]
 })
}
export function fromWikiSeason(text:string,expectedSeason:string,clubNames:readonly string[],source:DailySource):Addition[]{
 const start=/\{\{Infobox football club season\b/i.exec(text)
 if(!start)return []
 const box=fields(balanced(text,start.index)),str=(k:string)=>label(box.get(k)||'')
 const ours=(s:string)=>clubNames.some(n=>sameClub(n,s))
 if(!ours(str('club'))||/\b(?:women|youth|academy|reserves)\b/i.test(str('club')))return []
 const season=exactSeason(str('season'))
 if(season!==expectedSeason)return []
 const league=str('league')
 const additions:Addition[]=[{section:'seasons',source,fact:dailyFact('season',season,{name:`${season} season`,season,...(league?{league}:{})},source)},...squad(text,season,source)]
 for(const [i,type] of ['HOME','AWAY','THIRD'].entries()){
  const index=i+1,code=str('pattern_b'+index),pattern=/^_[a-z\d_-]+$/i.test(code)?code:null,body=hex(str('body'+index))
  const left=hex(str('leftarm'+index)),right=hex(str('rightarm'+index)),shorts=hex(str('shorts'+index)),socks=hex(str('socks'+index))
  if(!pattern&&!body)continue
  const colour=!code&&body&&left===body&&right===body?COLOURS[body]:undefined
  additions.push({section:'kits',source,fact:dailyFact('kit',season+'/'+type,{
   name:`${str('club')} ${season} ${type.toLowerCase()} kit`,season,type,referenceUrl:source.url,
   ...(colour?{construction:{colors:colour,design:'plain'}}:{}),wikiKit:{pattern,body,left,right,shorts,socks}
  },source)})
 }
 const headings=new Map<number,string>()
 for(const mark of text.matchAll(/^(={2,6})\s*([^=\r\n]+?)\s*\1\s*$|\{\{Football[ _]box(?:[ _]collapsible)?\b/gmi)){
  if(mark[1]){
   const level=mark[1].length
   for(const key of headings.keys())if(key>=level)headings.delete(key)
   headings.set(level,label(mark[2]!));continue
  }
  const raw=fields(balanced(text,mark.index)),get=(k:string)=>label(raw.get(k)||'')
  const home=get('team1'),away=get('team2'),on=localDate(raw.get('date')||'')
  if(!safeDay(on)||ours(home)===ours(away))continue
  const context=[...headings.values()].reverse()
  const competition=get('competition')||context.find(h=>category.test(h)&&!GENERIC.test(h))||(context.some(h=>/^league matches$/i.test(h))?league:'')
  if(!competition)continue
  const match=publishedMatch({home,away,on,score:get('score'),competition,season,venue:get('stadium'),scorers:goals(raw.get(ours(home)?'goals1':'goals2')||'')},source.checkedAt,source,clubNames)
  if(match)additions.push(match)
 }
 return additions
}
