import {GoalBoard} from '@/components/clubs/games/GoalBoard'
import {goalDeal} from '@/lib/clubs/goal'
import type {GateView} from '../types'
export const view:GateView=({club,locale,round,gameKey})=><GoalBoard key={gameKey} items={goalDeal(club,round.seed)} club={club.identity.id} version={club.version} seed={round.seed} locale={locale} contentLocale={club.locales.content}/>
