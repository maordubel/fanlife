import {RumbleGame} from '@/components/clubs/rumble/RumbleGame'
import {RumbleXIGame} from '@/components/clubs/rumble/RumbleXIGame'
import {RumbleOpponentBar,type RumbleClub} from '@/components/clubs/rumble/RumbleOpponentBar'
import {RumbleModeBar,RumbleXIEntry} from '@/components/clubs/rumble/RumbleModeBar'
import {ratedPool,dealDraft,SELF,type Opponent} from '@/lib/clubs/rumble'
import {affordableSeed,shuffleSeed} from '@/lib/clubs/rumble-show'
import {rumbleWardrobe,type RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {opponentFor} from '@/lib/clubs/rumble-opponent'
import {decodeDuel} from '@/lib/clubs/rumble-duel'
import {requestClub} from '@/lib/clubs/request'
import {CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {REGISTRY} from '@/lib/master/registry'
import {forbiddenColor} from '@/lib/clubs/theme'
import {kitViews} from '@/lib/clubs/gate-content'
import {gameCopy} from '@/lib/clubs/game-copy'
import {DEFAULT_FORMATION,isFormation} from '@/lib/clubs/rumble-xi/formations'
import {xiPool} from '@/lib/clubs/rumble-xi/pool'
import {dealXI} from '@/lib/clubs/rumble-xi/deal'
import {xiSeed} from '@/lib/clubs/rumble-xi/seed'
import {pickRandomRival,rivalChoices,formationReadiness,budgetOf} from '@/lib/clubs/rumble-xi/server'
import type {GateView,GateViewProps} from '../types'

const nameOf=(id:string)=>REGISTRY.find(c=>c.id===id)?.name??id
/** two sides in one colour read as one side: if the rival's shirt starts with our colour, he wears his other kit */
function apart(own:RumbleWardrobe,rival:RumbleWardrobe):RumbleWardrobe{
 const mine=own.home[own.home.length-1]?.colours[0],theirs=rival.home[rival.home.length-1]?.colours[0]
 const clash=!!mine&&mine===theirs&&rival.away.length>0
 return {home:own.home,away:clash?rival.away:(rival.home.length?rival.home:rival.away)}
}

/**
 * Gate 9. Five a side — the classic round, an AI rival from another club (`?vs=`), or a friend's five from a link (`?duel=`) — or the
 * full eleven (`?mode=xi`, €35M, a shape, any club as the rival). The opponent is rebuilt on the server from the URL, the board is
 * dealt against HIM, and his club's shirts dress his side. Which clubs are on offer is whoever can field the side.
 */
export const view:GateView=async props=>{
 if(props.searchParams.mode==='xi')return xiView(props)
 const {club,locale,round,gameKey,searchParams}=props
 const id=club.identity.id,pool=ratedPool(club)
 const duel=typeof searchParams.duel==='string'?searchParams.duel:null,vsParam=typeof searchParams.vs==='string'?searchParams.vs:null
 const token=duel?decodeDuel(duel):null
 const opponent:Opponent=(await opponentFor(id,pool,token?undefined:vsParam??undefined,token?duel??undefined:undefined))??SELF
 const valid=token&&opponent.kind==='locked'?token.c:opponent.kind==='club'?vsParam:null
 const clubs:RumbleClub[]=(await Promise.all(CORE_CLUB_IDS.map(async cid=>{const r=await requestClub(cid,9);return r&&r.data.gates['royal-rumble']?.playable?{id:cid,name:nameOf(cid)}:null}))).filter((c):c is RumbleClub=>!!c).sort((a,b)=>a.name.localeCompare(b.name))
 const deal=(s:number)=>dealDraft(pool,s,opponent),a=affordableSeed(deal,round.seed),b=affordableSeed(deal,shuffleSeed(a))
 const own=rumbleWardrobe(kitViews(club),hex=>forbiddenColor(club.theme,hex))
 // the rival's side wears HIS club's home shirts (filtered by this page's colour policy), not ours
 let wardrobe=own
 if(valid&&valid!==id){const r=await requestClub(valid,9);if(r)wardrobe=apart(own,rumbleWardrobe(kitViews(r.data),hex=>forbiddenColor(club.theme,hex)))}
 const again=new URLSearchParams({lang:locale,seed:String(round.seed+1)});if(token&&duel)again.set('duel',duel);else if(vsParam&&opponent.kind==='club')again.set('vs',vsParam)
 const rivalId=valid&&valid!==id?valid:id
 return <>
  <RumbleModeBar club={id} clubName={club.identity.name} locale={locale} mode="five"/>
  <RumbleOpponentBar club={id} clubs={clubs} vs={opponent.kind==='club'?vsParam:null} duel={token&&opponent.kind==='locked'?duel:null} from={token&&opponent.kind==='locked'?token.c:null} locale={locale}/>
  <RumbleGame key={`${gameKey}:${valid??'self'}`} club={id} version={club.version} locale={locale} main={{seed:a,draft:deal(a)}} shuffle={{seed:b,draft:deal(b)}} wardrobe={wardrobe} playerCount={pool.length} vs={opponent.kind==='club'&&vsParam?vsParam:undefined} duel={token&&opponent.kind==='locked'&&duel?duel:undefined} againHref={`?${again}`} faces={{us:{id,name:club.identity.name},them:{id:rivalId,name:nameOf(rivalId)}}}/>
 </>
}

async function xiView({club,locale,round,gameKey,searchParams}:GateViewProps){
 const id=club.identity.id,copy=gameCopy(locale),say=(k:string)=>(copy as Record<string,string>)[k]??k,fp=searchParams.f,f=isFormation(fp)?fp:DEFAULT_FORMATION
 const pool=xiPool(club),own=formationReadiness(pool),ready=own[f],rivals=await rivalChoices(f)
 const sp=typeof searchParams.vs==='string'?searchParams.vs:'same'
 const okIds=rivals.filter(r=>r.ok).map(r=>r.id)
 let rival=sp==='random'?pickRandomRival(rivals,id,round.seed):sp==='same'?'same':okIds.includes(sp)?sp:'same'
 if(rival==='same'&&!ready.sameClub22)rival=pickRandomRival(rivals,id,round.seed)
 const head=(vs:string)=><>
  <RumbleModeBar club={id} clubName={club.identity.name} locale={locale} mode="xi"/>
  <RumbleXIEntry club={id} clubName={club.identity.name} locale={locale} formation={f} vs={vs} rivals={rivals} own={own} sameOk={ready.sameClub22}/>
 </>
 const stop=(msg:string)=><>{head(sp)}<p role="alert" data-testid="rumble-xi-stop" style={{margin:'12px 0',fontWeight:700}}>{msg}</p></>
 if(!ready.ready)return stop(say('rr.xi.notReady').replace('{formation}',f).replace('{reason}',ready.reasons[0]??'—'))
 if(!rival)return stop(say('rr.xi.noRival'))
 const same=rival==='same',rivalId=same?id:rival
 const away=same?club:(await requestClub(rivalId,9))?.data
 if(!away)return stop(say('rr.xi.noRival'))
 const awayPool=same?pool:xiPool(away)
 const budget=budgetOf(pool,awayPool,f),base=xiSeed(round.seed,id,rivalId,f),main=dealXI(pool,awayPool,f,base,same,budget)
 const shuf=main?dealXI(pool,awayPool,f,shuffleSeed(main.seed),same,budget):null
 if(!main||!shuf)return stop(say('rr.xi.noRival'))
 const ownW=rumbleWardrobe(kitViews(club),hex=>forbiddenColor(club.theme,hex))
 const wardrobe=same?{home:ownW.home,away:ownW.away.length?ownW.away:ownW.home}:apart(ownW,rumbleWardrobe(kitViews(away),hex=>forbiddenColor(club.theme,hex)))
 const again=new URLSearchParams({lang:locale,mode:'xi',f,vs:same?'same':rivalId,seed:String(round.seed+1)})
 return <>
  {head(sp==='random'?'random':same?'same':rivalId)}
  <RumbleXIGame key={`${gameKey}:${f}:${rivalId}`} club={id} version={club.version} locale={locale} main={{seed:main.seed,draft:main.draft}} shuffle={{seed:shuf.seed,draft:shuf.draft}} formation={f} rival={same?'same':rivalId} wardrobe={wardrobe} faces={{us:{id,name:club.identity.name},them:{id:rivalId,name:same?club.identity.name:nameOf(rivalId)}}} againHref={`?${again}`} playerCount={pool.length} roundSeed={round.seed} budget={budget}/>
 </>
}
