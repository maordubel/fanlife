import {KitBuilder} from '@/components/clubs/gates/kit-builder/KitBuilder'
import {KitBuilderBoard} from '@/components/clubs/games/KitBuilderBoard'
import Link from 'next/link'
import {livery} from '@/lib/club-livery'
import {canRun,dealKitRun,eligibleKits,gameFrom,kitModeFrom,publicRun,runGames,KIT_ROUND,RULES} from '@/lib/clubs/kit-run'
import {buildableKits} from '@/lib/clubs/gate-content'
import type {GateView} from '../types'

const rotate=<T,>(a:T[],by:number)=>a.length?[...a.slice(by%a.length),...a.slice(0,by%a.length)]:a
const pick=(own:string,all:(string|null)[])=>{const rest=[...new Set(all.filter((x):x is string=>!!x&&x!==own))].sort().slice(0,3);return [own,...rest].sort((a,b)=>a.localeCompare(b))}

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
  const items=rotate(buildable,round.seed).map(k=>({id:k.id,design:k.design,colours:k.colours,seasonLabel:'',seasons:pick(k.season,buildable.map(x=>x.season)),makers:pick(k.maker!,buildable.map(x=>x.maker)),designs:pick(k.design!,buildable.map(x=>x.design))}))
  return <div data-testid="kit-recognition">
   <p className="mag-kicker">{copy['kb.game.recognition']}</p>
   <p className="mag-fine">{copy['kb.game.recognition.note']}{runnable.length>0&&<> <Link href={`?lang=${locale}&mode=${runnable[0]}`} data-testid="kb-to-builder">{copy['kb.game.back']}</Link></>}</p>
   <KitBuilderBoard key={gameKey} items={items} club={club.identity.id} version={club.version} locale={locale}/>
  </div>
 }
 if(!game)return <p data-testid="kit-builder">{copy['kb.none']??''}</p>
 const puzzles=canRun(list,game)?publicRun(dealKitRun(list,round.seed,round.cursor,KIT_ROUND,game)):[]
 const legacy=searchParams.seed!==undefined&&searchParams.kv!==RULES
 return <KitBuilder key={`${gameKey}:${game}`} club={club.identity.id} clubName={club.identity.name} version={club.version} locale={locale} contentLocale={club.locales.content} copy={copy} seed={round.seed} cursor={round.cursor} game={game} modes={{recognition:recognitionOk,practice:runnable.includes('practice'),assembly:runnable.includes('assembly')}} puzzles={puzzles} mode={kitModeFrom(searchParams.n)} monogram={livery(club.identity.id)?.initials??''} drawable={list.length} legacy={legacy}/>
}
