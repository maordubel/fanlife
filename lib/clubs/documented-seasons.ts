import {createHash} from 'node:crypto'
import {exactSeason,words} from '@/lib/research/daily-evidence'
import type {ClubData,Entity,Fact} from './contract'

type SeasonFields={season?:unknown;league?:unknown}

/** An approved kit or fixture with an explicit season supplies a cited season entry.
 * A calendar date alone says nothing about the competition's season boundaries. */
export function withDocumentedSeasons(data:ClubData):ClubData {
 const existing=data.seasons||[],known=new Set(existing.map(row=>{
  const value=row.value as Entity&SeasonFields
  return exactSeason(words(value.season)||value.name)
 }))
 const available=new Set(data.sources.filter(source=>source.access==='available'&&source.checkedAt).map(source=>source.id))
 const discovered=new Map<string,Fact<Entity>>()
 for(const item of [...(data.matches||[]),...(data.kits||[])]){
  if(item.status!=='approved'||item.confidence<2)continue
  const value=item.value as Entity&SeasonFields
  const season=exactSeason(words(value.season)),sources=item.sources.filter(id=>available.has(id))
  if(!season||known.has(season)||discovered.has(season)||!sources.length)continue
  const id=`${data.identity.id}:documented-season-${season.replace('/','-')}`
  const league=words(value.league)
  discovered.set(season,{...item,id,sources,value:{id,name:`${season} season`,season,...(league?{league}:{})} as Entity})
 }
 if(!discovered.size)return data
 const added=[...discovered].sort(([a],[b])=>a.localeCompare(b)).map(([,row])=>row)
 const version=createHash('sha256').update(data.version).update(JSON.stringify(added)).digest('hex').slice(0,16)
 return {...data,version,seasons:[...existing,...added]}
}
