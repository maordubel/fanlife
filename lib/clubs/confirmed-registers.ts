import 'server-only'
import honours from '@/content/manual/club-honours-registers.json'
import kitRegisters from '@/content/manual/club-kit-registers.json'
import type {RegistryClub} from '@/lib/master/registry'
import {blankWave,dailyFact,dailySource,exactSeason,type DailyRecord} from '@/lib/research/daily-evidence'
import {integrateDailyWave} from './daily-wave'
import type {ClubData,Diagnostic} from './contract'
import {officialOf} from './official'

type Register={publisher:string;authority:string;url:string;titles:{name:string;editions:string[];publishedCount?:number}[]}
type KitRegister={publisher:string;title:string;url:string;kits:{season:string;type:string}[]}
const HONOURS:Record<string,Register[]>=honours.clubs
const KITS:Record<string,KitRegister[]>=kitRegisters.clubs

export const confirmedRegisterInputs=(id:string)=>({honours:HONOURS[id]||[],kits:KITS[id]||[]})

export function withConfirmedRegisters(base:{data:ClubData;diagnostics:Diagnostic[]},club:RegistryClub){
 const inputs=confirmedRegisterInputs(club.id)
 if(!inputs.honours.length&&!inputs.kits.length)return base
 const wave=blankWave(club.id),trophies:DailyRecord[]=[]
 const seasons=new Map<string,DailyRecord>(),kits=new Map<string,DailyRecord>()
 for(const input of inputs.honours){
  const source=dailySource(input.url,`${club.name} first-team honours`,input.publisher,honours.checkedAt,officialOf(input.authority))
  wave.sources.push(source)
  for(const award of input.titles){
   trophies.push(dailyFact('honour',award.name,{
    name:award.name,seasons:award.editions,documentedCount:award.editions.length,...(award.publishedCount!==undefined?{count:award.publishedCount}:{})
   },source))
   for(const edition of award.editions){
    const season=exactSeason(edition)
    if(!season)continue
    const old=seasons.get(season)
    if(old){if(!old.sources.includes(source.id))old.sources.push(source.id);continue}
    seasons.set(season,dailyFact('season',season,{name:`${season} season`,season},source))
   }
  }
 }
 for(const input of inputs.kits){
  const source=dailySource(input.url,`${club.name} — ${input.title}`,input.publisher,kitRegisters.checkedAt)
  wave.sources.push(source)
  for(const kit of input.kits){
   const key=`${kit.season}/${kit.type.toUpperCase()}`,existing=kits.get(key)
   if(existing){if(!existing.sources.includes(source.id))existing.sources.push(source.id);continue}
   kits.set(key,dailyFact('kit',key,{name:`${club.name} ${kit.season} ${kit.type} kit`,...kit,referenceUrl:input.url},source))
  }
 }
 return integrateDailyWave(base,club,{...wave,trophies,seasons:[...seasons.values()],kits:[...kits.values()]})
}
