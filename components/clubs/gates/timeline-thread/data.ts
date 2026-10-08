import {eligibleArchive} from '@/lib/clubs/archive'
import type {ClubData} from '@/lib/clubs/contract'
import {planThread,threadOf,type ThreadEvent,type ThreadPlan} from '@/lib/clubs/thread-model'
import type {ThreadSource} from './ClubThread'

/** The club's thread: every eligible archive entry that carries a day or a year, oldest first. */
export function threadEvents(club:Pick<ClubData,'archive'|'timeline'|'sources'>&{players?:ClubData['players']}):ThreadEvent[]{
 return threadOf(eligibleArchive(club).map(f=>({id:f.id,title:String(f.value.title),hint:String(f.value.hint??''),on:f.value.on,year:f.value.year,sources:f.sources})))
}

/** What the page sends to the browser for one request: the chosen decade, and only the sources that decade cites. */
export function threadPage(club:Pick<ClubData,'archive'|'timeline'|'sources'>&{players?:ClubData['players']},events:readonly ThreadEvent[],q:{at?:string;dec?:string}):{plan:ThreadPlan|null;sources:Record<string,ThreadSource>}{
 const dec=q.dec!==undefined&&/^\d{4}$/.test(q.dec)?Number(q.dec):null
 const plan=planThread(events,{at:q.at??null,dec})
 const sources:Record<string,ThreadSource>={}
 for(const e of plan?.events??[])for(const id of e.sources){
  if(sources[id])continue
  const s=club.sources.find(x=>x.id===id);if(s)sources[id]={title:s.title,publisher:s.publisher,url:s.url}
 }
 return {plan,sources}
}

/** Chronology card id → thread entry id, for the cards of one deal, matched by fact id or by (day, title). */
export function threadLinks(club:Pick<ClubData,'timeline'>,events:readonly ThreadEvent[],cardIds:readonly string[]):Record<string,string>{
 const byValueId=new Map(club.timeline.map(f=>[f.value.id,f])),ids=new Set(events.map(e=>e.id))
 const byDayTitle=new Map(events.filter(e=>e.on).map(e=>[`${e.on}|${e.title}`,e.id]))
 const out:Record<string,string>={}
 for(const id of cardIds){
  const f=byValueId.get(id);if(!f)continue
  const hit=ids.has(f.id)?f.id:byDayTitle.get(`${f.value.on}|${f.value.title}`)
  if(hit)out[id]=hit
 }
 return out
}
