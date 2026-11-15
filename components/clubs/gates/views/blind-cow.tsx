import {ClubMystery} from '@/components/clubs/gates/blind-cow/ClubMystery'
import {clubWardrobe} from '@/lib/clubs/kit-wardrobe'
import {lobbyState,soloRun} from '@/lib/clubs/mystery-modes'
import {parseChallenge} from '@/lib/clubs/mystery-model'
import type {GateView} from '../types'
import {englishPlayer} from '@/lib/clubs/rumble-xi/names'
/** Gate 10 · Blind Cow. The server reads this device's runs (cookies) to open the lobby on Resume; the answer never leaves the server. */
export const view:GateView=({club,locale,copy,searchParams})=><ClubMystery key={`${club.identity.id}:${club.version}:${locale}`} players={(club.players||[]).map(f=>englishPlayer(club.identity.id,f.value))} club={club.identity.id} clubName={club.identity.name} version={club.version} locale={locale} contentLocale={club.locales.content} copy={copy} wardrobe={clubWardrobe(club)} lobby={lobbyState(club,soloRun(club))} challenge={parseChallenge(searchParams.duel)}/>
