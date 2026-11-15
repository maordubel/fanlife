import {ClubPolls} from '@/components/clubs/gates/polls/ClubPolls'
import {clubPollRound} from '@/lib/clubs/polls'
import {clubWardrobe} from '@/lib/clubs/kit-wardrobe'
import {door} from '@/lib/features-server'
import type {GateView} from '../types'
import {englishPlayer} from '@/lib/clubs/rumble-xi/names'
export const view:GateView=async({club,locale,copy,round,gameKey})=>{
 const d=await door('peoplesChoice')
 return <ClubPolls duel={d.open} duelFirst={d.open&&!d.preview} key={gameKey} players={(club.players||[]).map(f=>englishPlayer(club.identity.id,f.value))} debates={clubPollRound(club,locale,round.seed,round.cursor)} club={club.identity.id} clubName={club.identity.name} version={club.version} seed={round.seed} cursor={round.cursor} locale={locale} contentLocale={club.locales.content} wardrobe={clubWardrobe(club)} copy={copy}/>
}
