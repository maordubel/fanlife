import {LineupBoard} from '@/components/clubs/games/LineupBoard'
import {lineupMatches,lineupPool} from '@/lib/clubs/gate-content'
import type {GateView} from '../types'
const rotate=<T,>(a:T[],by:number)=>a.length?[...a.slice(by%a.length),...a.slice(0,by%a.length)]:a
export const view:GateView=({club,locale,round,gameKey})=><LineupBoard key={gameKey} items={rotate(lineupMatches(club),round.seed).map(m=>({id:m.id,title:m.name,competition:m.competition,on:m.on,pool:lineupPool(club,m)}))} club={club.identity.id} version={club.version} locale={locale}/>
