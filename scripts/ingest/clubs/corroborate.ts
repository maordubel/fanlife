/**
 * THE ONLY FILE THAT KNOWS THESPORTSDB'S DAY FEED (second publisher for score/date agreement).
 * `eventsday.php?d=YYYY-MM-DD&s=Soccer` lists every football event of a day with teams and score.
 * A match is corroborated only when teams (exact normalised, rule 7) AND score both agree.
 */
import {sameClub} from '../../../lib/fixtures/names'
import type {Fetcher,ProviderMatch} from './types'
type J=Record<string,unknown>
const str=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():null
export const dayUrl=(key:string,day:string)=>`https://www.thesportsdb.com/api/v1/json/${encodeURIComponent(key)}/eventsday.php?d=${day}&s=Soccer`
export type Corroboration={publisher:string;title:string;url:string}
export function corroborates(json:unknown,m:ProviderMatch):Corroboration|null {
 const events=json&&typeof json==='object'&&Array.isArray((json as J).events)?(json as J).events as J[]:[]
 if(!m.score)return null
 for(const e of events){
  const h=str(e.strHomeTeam),a=str(e.strAwayTeam),hs=Number(e.intHomeScore),as=Number(e.intAwayScore),id=str(e.idEvent)
  if(!h||!a||!id||!Number.isFinite(hs)||!Number.isFinite(as))continue
  if(sameClub(h,m.home)&&sameClub(a,m.away)&&hs===m.score.home&&as===m.score.away)return {publisher:'TheSportsDB',title:`TheSportsDB: ${h} ${hs}-${as} ${a}, ${m.on}`,url:`https://www.thesportsdb.com/event/${id}`}
 }
 return null
}
export async function corroborate(fetchJson:Fetcher,m:ProviderMatch,key='123'):Promise<Corroboration|null>{
 try{return corroborates(await fetchJson(dayUrl(key,m.on)),m)}catch{return null}
}
