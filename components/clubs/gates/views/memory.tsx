import {MemoryBoard} from '@/components/clubs/games/MemoryBoard'
import {clubMemory} from '@/lib/clubs/games'
import type {GateView} from '../types'
export const view:GateView=({club,locale,round,gameKey})=><MemoryBoard key={gameKey} round={clubMemory(club,round.seed,round.cursor)} club={club.identity.id} version={club.version} seed={round.seed} cursor={round.cursor} locale={locale} contentLocale={club.locales.content}/>
