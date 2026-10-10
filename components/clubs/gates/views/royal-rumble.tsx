import {RumbleGame} from '@/components/clubs/rumble/RumbleGame'
import {RumbleOpponentBar,type RumbleClub} from '@/components/clubs/rumble/RumbleOpponentBar'
import {ratedPool,dealDraft,SELF,type Opponent} from '@/lib/clubs/rumble'
import {affordableSeed,shuffleSeed} from '@/lib/clubs/rumble-show'
import {rumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {opponentFor} from '@/lib/clubs/rumble-opponent'
import {decodeDuel} from '@/lib/clubs/rumble-duel'
import {requestClub} from '@/lib/clubs/request'
import {CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {REGISTRY} from '@/lib/master/registry'
import {forbiddenColor} from '@/lib/clubs/theme'
import {kitViews} from '@/lib/clubs/gate-content'
import type {GateView} from '../types'
/**
 * Gate 9. The classic round, an AI rival from another club (`?vs=`), or a friend's five from a link (`?duel=`): the opponent is rebuilt
 * on the server from the URL, the board is dealt against HIM, and his club's shirts dress his side. Which clubs are on offer is whoever can field a five.
 */
export const view:GateView=async({club,locale,round,gameKey,searchParams})=>{
 const id=club.identity.id,pool=ratedPool(club)
 const duel=typeof searchParams.duel==='string'?searchParams.duel:null,vsParam=typeof searchParams.vs==='string'?searchParams.vs:null
 const token=duel?decodeDuel(duel):null
 const opponent:Opponent=(await opponentFor(id,pool,token?undefined:vsParam??undefined,token?duel??undefined:undefined))??SELF
 const valid=token&&opponent.kind==='locked'?token.c:opponent.kind==='club'?vsParam:null
 const clubs:RumbleClub[]=(await Promise.all(CORE_CLUB_IDS.map(async cid=>{const r=await requestClub(cid,9);return r&&r.data.gates['royal-rumble']?.playable?{id:cid,name:REGISTRY.find(c=>c.id===cid)?.name??cid}:null}))).filter((c):c is RumbleClub=>!!c).sort((a,b)=>a.name.localeCompare(b.name))
 const deal=(s:number)=>dealDraft(pool,s,opponent),a=affordableSeed(deal,round.seed),b=affordableSeed(deal,shuffleSeed(a))
 const own=rumbleWardrobe(kitViews(club),hex=>forbiddenColor(club.theme,hex))
 // the rival's side wears HIS club's home shirts (filtered by this page's colour policy), not ours
 let wardrobe=own
 if(valid&&valid!==id){const r=await requestClub(valid,9);if(r)wardrobe={home:own.home,away:rumbleWardrobe(kitViews(r.data),hex=>forbiddenColor(club.theme,hex)).home}}
 const again=new URLSearchParams({lang:locale,seed:String(round.seed+1)});if(token&&duel)again.set('duel',duel);else if(vsParam&&opponent.kind==='club')again.set('vs',vsParam)
 return <>
  <RumbleOpponentBar club={id} clubs={clubs} vs={opponent.kind==='club'?vsParam:null} duel={token&&opponent.kind==='locked'?duel:null} from={token&&opponent.kind==='locked'?token.c:null} locale={locale}/>
  <RumbleGame key={`${gameKey}:${valid??'self'}`} club={id} version={club.version} locale={locale} main={{seed:a,draft:deal(a)}} shuffle={{seed:b,draft:deal(b)}} wardrobe={wardrobe} playerCount={pool.length} vs={opponent.kind==='club'&&vsParam?vsParam:undefined} duel={token&&opponent.kind==='locked'&&duel?duel:undefined} againHref={`?${again}`}/>
 </>
}
