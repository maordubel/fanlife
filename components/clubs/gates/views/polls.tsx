import {PollsBoard} from '@/components/clubs/games/PollsBoard'
import {clubPollRound} from '@/lib/clubs/polls'
import type {GateView} from '../types'
export const view:GateView=({club,locale,round,gameKey})=><PollsBoard key={gameKey} polls={clubPollRound(club,locale,round.seed,round.cursor)} club={club.identity.id} version={club.version} seed={round.seed} cursor={round.cursor} locale={locale} contentLocale={club.locales.content}/>
