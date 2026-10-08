import {MysteryBoard} from '@/components/clubs/games/MysteryBoard'
import type {GateView} from '../types'
export const view:GateView=({club,locale})=><MysteryBoard key={`${club.identity.id}:${club.version}:${locale}`} players={(club.players||[]).map(f=>f.value)} club={club.identity.id} version={club.version} locale={locale} contentLocale={club.locales.content}/>
