import {RumbleGame} from '@/components/clubs/rumble/RumbleGame'
import {ratedPool,dealDraft} from '@/lib/clubs/rumble'
import {affordableSeed,shuffleSeed} from '@/lib/clubs/rumble-show'
import {rumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {forbiddenColor} from '@/lib/clubs/theme'
import {kitViews} from '@/lib/clubs/gate-content'
import type {GateView} from '../types'
export const view:GateView=({club,locale,round,gameKey})=>{
 const pool=ratedPool(club),deal=(s:number)=>dealDraft(pool,s),a=affordableSeed(deal,round.seed),b=affordableSeed(deal,shuffleSeed(a))
 return <RumbleGame key={gameKey} club={club.identity.id} version={club.version} locale={locale} main={{seed:a,draft:deal(a)}} shuffle={{seed:b,draft:deal(b)}} wardrobe={rumbleWardrobe(kitViews(club),hex=>forbiddenColor(club.theme,hex))} playerCount={pool.length} againHref={`?${new URLSearchParams({lang:locale,seed:String(round.seed+1)})}`}/>
}
