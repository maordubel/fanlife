import {ClubPolls} from '@/components/clubs/gates/polls/ClubPolls'
import {clubPollRound} from '@/lib/clubs/polls'
import {rumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {forbiddenColor} from '@/lib/clubs/theme'
import {kitViews} from '@/lib/clubs/gate-content'
import type {GateView} from '../types'
export const view:GateView=({club,locale,copy,round,gameKey})=><ClubPolls key={gameKey} players={(club.players||[]).map(f=>f.value)} debates={clubPollRound(club,locale,round.seed,round.cursor)} club={club.identity.id} clubName={club.identity.name} version={club.version} seed={round.seed} cursor={round.cursor} locale={locale} contentLocale={club.locales.content} wardrobe={rumbleWardrobe(kitViews(club),hex=>forbiddenColor(club.theme,hex))} copy={copy}/>
