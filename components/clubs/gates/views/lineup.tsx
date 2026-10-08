import {ClubLineup} from '@/components/clubs/gates/lineup/ClubLineup'
import {kitViews,lineupMatches} from '@/lib/clubs/gate-content'
import {buildPool,coachBudget,matchYear} from '@/lib/clubs/lineup-model'
import {rumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {forbiddenColor} from '@/lib/clubs/theme'
import type {GateView} from '../types'
const rotate=<T,>(a:T[],by:number)=>a.length?[...a.slice(by%a.length),...a.slice(0,by%a.length)]:a

/** Gate 3 · deals the club's line-up matches (a `?m=` link pins one first) and mounts the Dressing Room. */
export const view:GateView=({club,locale,copy,round,gameKey,searchParams})=>{
 const all=lineupMatches(club),roster=(club.players||[]).map(p=>p.value)
 const pinned=searchParams.m?all.findIndex(x=>x.id===searchParams.m):-1
 const dealt=pinned>=0?rotate(all,pinned):rotate(all,round.seed)
 const items=dealt.map(m=>{
  const year=matchYear(m.on)
  return {id:m.id,title:m.name,competition:m.competition,on:m.on,year,score:m.score,coachBudget:coachBudget(m),
   pool:buildPool({matchId:m.id,starters:m.starters,decoys:m.decoys,roster,year}),
   sources:m.sources.flatMap(id=>{const s=club.sources.find(x=>x.id===id);return s?[{title:s.title,url:s.url}]:[]})}
 })
 return <ClubLineup key={gameKey} items={items} club={club.identity.id} clubName={club.identity.name} version={club.version} locale={locale} contentLocale={club.locales.content} copy={copy} wardrobe={rumbleWardrobe(kitViews(club),hex=>forbiddenColor(club.theme,hex))}/>
}
