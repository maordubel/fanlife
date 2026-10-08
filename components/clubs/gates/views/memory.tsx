import {ClubMemory} from '@/components/clubs/gates/memory/ClubMemory'
import {planMemory} from '@/lib/clubs/memory-deck'
import type {GateView} from '../types'

/**
 * Gate 6 · the Memory Wall. The server solves the wall (`memory-solver.ts`: distinct faces, enough recognisable
 * relations, a type cap or an honest "narrow"/"date memory" label, a theme that holds only its own decade) and hands the
 * start card the sizes and years this club's archive can really open — plus a wall whose cards name nothing. The relation
 * and the source of each pair are fetched, per matched pair, from `memory-actions.ts`.
 */
export const view:GateView=({club,locale,copy,round,gameKey,searchParams})=>{
 const plan=planMemory(club,{seed:round.seed,cursor:round.cursor,size:searchParams.size,theme:searchParams.theme,peek:searchParams.peek!=='0'})
 const key=`${gameKey}:${plan.selected.size}:${plan.selected.theme??''}:${plan.deal?.index??-1}`
 return <ClubMemory key={key} plan={plan} club={club.identity.id} clubName={club.identity.name} version={club.version} seed={round.seed} cursor={round.cursor}
  locale={locale} contentLocale={club.locales.content} copy={copy} autostart={searchParams.go==='1'&&!!plan.deal}/>
}
