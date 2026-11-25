import {KitBuilder} from '@/components/clubs/gates/kit-builder/KitBuilder'
import {KitBuilderBoard} from '@/components/clubs/games/KitBuilderBoard'
import Link from 'next/link'
import {rng,shuffle} from '@/lib/game/random'
import {livery} from '@/lib/club-livery'
import {canRun,dealKitRun,eligibleKits,gameFrom,kitModeFrom,publicRun,runGames,KIT_ROUND,RULES} from '@/lib/clubs/kit-run'
import {buildableKits} from '@/lib/clubs/gate-content'
import type {GateView} from '../types'

const pick=(own:string,all:(string|null)[],seed:number)=>{
 const random=rng(seed>>>0)
 const decoys=[...new Set(all.filter((value):value is string=>!!value&&value!==own))].sort()
 return shuffle([own,...shuffle(decoys,random).slice(0,3)],random)
}

/**
 * Gate 4 · Build the Kit. Three named games (rulebook §6): the five-part assembly (only for a kit whose archive row states
 * all ten parts — none does yet), the reduced-parts practice (every drawable kit, scored on the parts its row states), and
 * the older season/maker/design recognition board, kept whole under its own name.
 */
export const view:GateView=({club,locale,copy,round,gameKey,searchParams})=>{
 const list=eligibleKits(club),runnable=runGames(list),buildable=buildableKits(club)
 const recognitionOk=buildable.length>=3
 const asked=gameFrom(searchParams.mode)
 const game=asked&&(asked==='recognition'?recognitionOk:runnable.includes(asked))?asked:runnable[0]??(recognitionOk?'recognition':null)
 if(game==='recognition'){
  const deck=shuffle([...buildable].sort((a,b)=>a.id.localeCompare(b.id)),rng(round.seed))
  const start=round.cursor%deck.length
  const seasons=buildable.map(kit=>kit.season),makers=buildable.map(kit=>kit.maker),designs=buildable.map(kit=>kit.design)
  const items=[...deck.slice(start),...deck.slice(0,start)].slice(0,5).map((kit,index)=>{
   const seed=round.seed+round.cursor+index*7919
   return {id:kit.id,design:kit.design,colours:kit.colours,seasons:pick(kit.season,seasons,seed),makers:pick(kit.maker!,makers,seed+1),designs:pick(kit.design!,designs,seed+2)}
  })
  const next=new URLSearchParams({lang:locale,mode:'recognition',seed:String(round.seed),r:String((round.cursor+items.length)%deck.length)})
  return <div data-testid="kit-recognition">
   <p className="mag-kicker">{copy['kb.game.recognition']}</p>
   <p className="mag-fine">{copy['kb.game.recognition.note']}{runnable.length>0&&<> <Link href={`?lang=${locale}&mode=${runnable[0]}`} data-testid="kb-to-builder">{copy['kb.game.back']}</Link></>}</p>
   <KitBuilderBoard key={gameKey} items={items} nextHref={`?${next}`} club={club.identity.id} version={club.version} locale={locale}/>
  </div>
 }
 if(!game)return <p data-testid="kit-builder">{copy['kb.none']??''}</p>
 const puzzles=canRun(list,game)?publicRun(dealKitRun(list,round.seed,round.cursor,KIT_ROUND,game)):[]
 const legacy=searchParams.seed!==undefined&&searchParams.kv!==RULES
 return <KitBuilder key={`${gameKey}:${game}`} club={club.identity.id} clubName={club.identity.name} version={club.version} locale={locale} contentLocale={club.locales.content} copy={copy} seed={round.seed} cursor={round.cursor} game={game} modes={{recognition:recognitionOk,practice:runnable.includes('practice'),assembly:runnable.includes('assembly')}} puzzles={puzzles} mode={kitModeFrom(searchParams.n)} monogram={livery(club.identity.id)?.initials??''} drawable={list.length} legacy={legacy}/>
}
