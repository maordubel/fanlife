import {KitBuilder} from '@/components/clubs/gates/kit-builder/KitBuilder'
import {livery} from '@/lib/club-livery'
import {canRun,dealKitRun,eligibleKits,kitModeFrom,publicRun,KIT_ROUND} from '@/lib/clubs/kit-run'
import type {GateView} from '../types'

/** Gate 4 · Build the Kit — a hidden season's shirt, assembled from the parts this club's archive documents. */
export const view:GateView=({club,locale,copy,round,gameKey,searchParams})=>{
 const list=eligibleKits(club)
 const puzzles=canRun(list)?publicRun(dealKitRun(list,round.seed,round.cursor,KIT_ROUND)):[]
 return <KitBuilder key={gameKey} club={club.identity.id} clubName={club.identity.name} version={club.version} locale={locale} contentLocale={club.locales.content} copy={copy} seed={round.seed} cursor={round.cursor} puzzles={puzzles} mode={kitModeFrom(searchParams.n)} monogram={livery(club.identity.id)?.initials??''} drawable={list.length}/>
}
